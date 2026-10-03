import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import './FlipCard.css';

/**
 * FlipCard - 3D Physics-based Flip & Tilt Component
 * Inspired by React Bits (DavidHDev/react-bits)
 */
export default function FlipCard({
  children,
  front = null,
  back = null,
  width = 340,
  height = 460,
  radius = 24,
  background = '#0c0d0e',
  color = '#f5f5f5',
  glare = true,
  glareOpacity = 0.35,
  tilt = true,
  tiltMax = 12,
  hoverScale = 1.04,
  perspective = 1000,
  stiffness = 170,
  damping = 20,
  flipOnClick = true,
  draggable = true,
  axis = 'y',
  dragDistance = 0,
  flipped = null,
  defaultFlipped = false,
  onFlipChange,
  className = '',
  style = {},
  ...props
}) {
  const isControlled = flipped !== null && flipped !== undefined;
  const [internalFlipped, setInternalFlipped] = useState(defaultFlipped);
  const currentFlipped = isControlled ? flipped : internalFlipped;

  const cardRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, initialAngle: 0 });
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);

  // Motion values
  const rawRotation = useMotionValue(currentFlipped ? 180 : 0);
  const springRotation = useSpring(rawRotation, { stiffness, damping });

  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const springTiltX = useSpring(rawTiltX, { stiffness: 280, damping: 25 });
  const springTiltY = useSpring(rawTiltY, { stiffness: 280, damping: 25 });

  const rawScale = useMotionValue(1);
  const springScale = useSpring(rawScale, { stiffness: 300, damping: 22 });

  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareAlpha = useMotionValue(0);

  // Synchronize target rotation when flipped state changes externally/internally
  useEffect(() => {
    if (!isDraggingRef.current) {
      rawRotation.set(currentFlipped ? 180 : 0);
    }
  }, [currentFlipped, rawRotation]);

  const setFlipState = useCallback(
    (nextState) => {
      if (!isControlled) {
        setInternalFlipped(nextState);
      }
      if (onFlipChange && nextState !== currentFlipped) {
        onFlipChange(nextState);
      }
      rawRotation.set(nextState ? 180 : 0);
    },
    [isControlled, onFlipChange, currentFlipped, rawRotation]
  );

  // Pointer interactions
  const handlePointerDown = (e) => {
    if (!draggable && !flipOnClick) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialAngle: rawRotation.get(),
    };
    rawScale.set(hoverScale);
  };

  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalised coordinates (-1 to 1)
    const normX = Math.max(-1, Math.min(1, (x / rect.width) * 2 - 1));
    const normY = Math.max(-1, Math.min(1, (y / rect.height) * 2 - 1));

    if (isDraggingRef.current && draggable) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const moveDistance = Math.hypot(deltaX, deltaY);

      if (moveDistance > 6) {
        hasMovedRef.current = true;
      }

      const travel =
        dragDistance > 0
          ? dragDistance
          : axis === 'y'
          ? rect.width * 0.95
          : rect.height * 0.95;

      const delta = axis === 'y' ? deltaX : -deltaY;
      const angleDelta = (delta / travel) * 180;
      rawRotation.set(dragStartRef.current.initialAngle + angleDelta);
    } else if (tilt) {
      rawTiltX.set(-normY * tiltMax);
      rawTiltY.set(normX * tiltMax);
    }

    if (glare) {
      glareX.set((x / rect.width) * 100);
      glareY.set((y / rect.height) * 100);
      glareAlpha.set(glareOpacity);
    }
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const currentAngle = rawRotation.get();

      if (hasMovedRef.current) {
        // Snap to nearest face (0 or 180 deg)
        // Modulo 360 normalized
        const normalized = ((currentAngle % 360) + 360) % 360;
        const shouldBeBack = normalized > 90 && normalized < 270;
        setFlipState(shouldBeBack);
      } else if (flipOnClick) {
        // Simple click without drag
        setFlipState(!currentFlipped);
      } else {
        setFlipState(currentFlipped);
      }
    }
    rawScale.set(1);
    rawTiltX.set(0);
    rawTiltY.set(0);
    glareAlpha.set(0);
  };

  const handlePointerEnter = () => {
    rawScale.set(hoverScale);
    if (glare) glareAlpha.set(glareOpacity);
  };

  const handlePointerLeave = () => {
    if (isDraggingRef.current) {
      handlePointerUp();
    } else {
      rawScale.set(1);
      rawTiltX.set(0);
      rawTiltY.set(0);
      glareAlpha.set(0);
    }
  };

  // Transform composition
  const transform = useTransform(
    [springRotation, springTiltX, springTiltY],
    ([rot, tx, ty]) => {
      if (axis === 'y') {
        return `rotateX(${tx}deg) rotateY(${rot + ty}deg)`;
      } else {
        return `rotateX(${rot + tx}deg) rotateY(${ty}deg)`;
      }
    }
  );

  const glareBackground = useTransform([glareX, glareY], ([x, y]) => {
    return `radial-gradient(circle at ${x}% ${y}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.08) 35%, transparent 65%)`;
  });

  // Extract front and back content
  let frontContent = front;
  let backContent = back;

  if (Array.isArray(children)) {
    if (!frontContent && children[0]) frontContent = children[0];
    if (!backContent && children[1]) backContent = children[1];
  } else if (children && !frontContent) {
    frontContent = children;
  }

  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    perspective: `${perspective}px`,
    borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
    color,
    ...style,
  };

  return (
    <div
      ref={cardRef}
      className={`flip-card-container pointer-events-auto ${className}`}
      style={containerStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      <motion.div
        className="flip-card-wrapper"
        style={{
          transform,
          scale: springScale,
          borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
        }}
      >
        {/* Front Face */}
        <div
          className="flip-card-face flip-card-front"
          style={{
            background,
            borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
          }}
        >
          {frontContent}
        </div>

        {/* Back Face */}
        <div
          className="flip-card-face flip-card-back"
          style={{
            background,
            borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
          }}
        >
          {backContent}
        </div>

        {/* Interactive Glare Overlay */}
        {glare && (
          <motion.div
            className="flip-card-glare"
            style={{
              opacity: glareAlpha,
              background: glareBackground,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
