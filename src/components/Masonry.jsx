'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './Masonry.css';

const useMedia = (queries, values, defaultValue) => {
  const get = () => {
    if (typeof window === 'undefined') return defaultValue;
    return values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue;
  };

  const [value, setValue] = useState(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
  }, [queries]);

  return value;
};

const useMeasure = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
};

const preloadImages = async (urls) => {
  await Promise.all(
    urls.map(
      src =>
        new Promise(resolve => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
};

const Masonry = ({
  items,
  ease = 'power3.out',
  duration = 0.6,
  className = '',
}) => {
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)'],
    [4, 3, 2, 2],
    1
  );

  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    preloadImages(items.map(i => i.img)).then(() => setImagesReady(true));
  }, [items]);

  const [grid, totalHeight] = useMemo(() => {
    if (!width) return [[], 0];

    const colHeights = new Array(columns).fill(0);
    const columnWidth = width / columns;

    const mapped = items.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * col;
      const height = child.height / 2;
      const y = colHeights[col];

      colHeights[col] += height;

      return { ...child, x, y, w: columnWidth, h: height, col };
    });

    const maxH = Math.max(...colHeights, 0);
    return [mapped, maxH];
  }, [columns, items, width]);

  // Position wrappers in masonry grid
  useLayoutEffect(() => {
    if (!imagesReady || !grid.length) return;

    grid.forEach((item) => {
      const selector = `[data-key="${item.id}"]`;
      if (!hasMounted.current) {
        gsap.set(selector, {
          x: item.x,
          y: item.y,
          width: item.w,
          height: item.h,
        });
      } else {
        gsap.to(selector, {
          x: item.x,
          y: item.y,
          width: item.w,
          height: item.h,
          duration: duration,
          ease: ease,
          overwrite: 'auto',
        });
      }
    });

    hasMounted.current = true;
  }, [grid, imagesReady, duration, ease]);

  // Scroll Entrance Animation: triggered as cards scroll into the viewport
  useEffect(() => {
    if (!imagesReady || !containerRef.current) return;

    const wrappers = containerRef.current.querySelectorAll('.item-wrapper');
    if (!wrappers.length) return;

    const animatedKeys = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const key = el.getAttribute('data-key');
            if (key && !animatedKeys.has(key)) {
              animatedKeys.add(key);
              const cardInner = el.querySelector('.item-card');
              const col = parseInt(el.getAttribute('data-col') || '0', 10);

              if (cardInner) {
                gsap.fromTo(
                  cardInner,
                  {
                    opacity: 0,
                    y: 70,
                    scale: 0.94,
                  },
                  {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.85,
                    delay: (col % 4) * 0.08,
                    ease: 'power3.out',
                    overwrite: 'auto',
                  }
                );
              }
              observer.unobserve(el);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08,
      }
    );

    wrappers.forEach((wrapper) => {
      const key = wrapper.getAttribute('data-key');
      if (!animatedKeys.has(key)) {
        observer.observe(wrapper);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [imagesReady, grid]);

  const handleItemClick = (e, item) => {
    if (item.url && item.url !== '#' && !item.url.startsWith('#')) {
      window.open(item.url, '_blank', 'noopener');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`list ${className}`}
      style={{ minHeight: totalHeight ? `${totalHeight}px` : '600px' }}
    >
      {grid.map(item => {
        return (
          <div
            key={item.id}
            data-key={item.id}
            data-col={item.col}
            className="item-wrapper"
            onClick={e => handleItemClick(e, item)}
          >
            <div className="item-card">
              <div className="item-img" style={{ backgroundImage: `url(${item.img})` }}>
                {/* Architectural Editorial Caption: Short title only, no tags, no ellipsis */}
                {item.title && (
                  <div className="item-caption">
                    <span className="item-caption-title">{item.title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Masonry;
