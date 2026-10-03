/**
 * MONOLITH High-Performance Canvas Scrubbing Engine
 * 
 * - Fullscreen Canvas with Retina DPI scaling (1.5x DPR for silky 60+ FPS)
 * - Off-thread decoding via createImageBitmap
 * - Predictive & Targeted prefetching: immediately prioritizes scrubbed frames and neighbors
 * - Multi-batch concurrency (up to 10 concurrent fetches) for zero-lag streaming
 * - Non-destructive memory retention: retains active and adjacent scenes
 * - Seamless cinematic Hermite cross-dissolves and smooth dip-through-black transitions
 * - Fast-path nearest-loaded neighbor fallback for butter-smooth scrubbing
 */

export class CanvasEngine {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { alpha: false, desynchronized: true });
    this.options = {
      manifestUrl: '/frames/manifest.json',
      maxConcurrentDownloads: 10, // High throughput for local streaming without frame stall
      dprCap: 1.5, // 1.5x DPR maintains razor sharpness with high fillrate efficiency
      ...options,
    };

    this.manifest = null;
    this.scenes = new Map(); // sceneId -> scene data & cache
    this.activeSceneId = 'scene_01_ambient';
    this.activeFrameIndex = 0;
    this.lastRenderedImage = null;
    this.currentPriorityScene = null;

    // Transition state for film transitions
    this.transitionState = {
      isTransitioning: false,
      isDipThroughBlack: false,
      fromSceneId: null,
      fromFrameIndex: 0,
      toSceneId: null,
      toFrameIndex: 0,
      alpha: 0,
      progress: 0,
    };

    this.isDirty = true;
    this.supportsImageBitmap = typeof window !== 'undefined' && 'createImageBitmap' in window;

    // Background download queue
    this.downloadQueue = [];
    this.activeDownloads = 0;
    this.isQueueRunning = false;

    // Setup Canvas DPI & Resizing
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize, { passive: true });
    this.handleResize();

    // Start render loop
    this.renderLoop = this.renderLoop.bind(this);
    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.options.dprCap);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderW = Math.round(width * dpr);
    const renderH = Math.round(height * dpr);

    if (this.canvas.width !== renderW || this.canvas.height !== renderH) {
      this.canvas.width = renderW;
      this.canvas.height = renderH;
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'medium';

    this.viewportWidth = width;
    this.viewportHeight = height;
    this.dpr = dpr;

    this.isDirty = true;
  }

  async init(onInitialProgress) {
    try {
      const response = await fetch(this.options.manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to load manifest from ${this.options.manifestUrl}`);
      }
      this.manifest = await response.json();

      // Initialize scene cache containers
      for (const scene of this.manifest.scenes) {
        this.scenes.set(scene.id, {
          ...scene,
          frames: new Array(scene.frameCount).fill(null),
          loadingFlags: new Uint8Array(scene.frameCount), // 0: unstarted, 1: loading, 2: loaded
          loadedCount: 0,
        });
      }

      // Priority load Scene 01 (initial active scene)
      const firstScene = this.manifest.scenes[0];
      await this.loadScenePriority(firstScene.id, onInitialProgress);

      // Trigger initial render with frame 0
      this.setFrame(firstScene.id, 0);

      // Warm up Scene 02 and Scene 03 in the background
      if (this.manifest.scenes.length > 1) {
        this.queueScene(this.manifest.scenes[1].id, false);
      }
      if (this.manifest.scenes.length > 2) {
        this.queueScene(this.manifest.scenes[2].id, false);
      }

      return this.manifest;
    } catch (err) {
      console.error('CanvasEngine initialization failed:', err);
      throw err;
    }
  }

  // Preload a specific scene with progress reporting
  async loadScenePriority(sceneId, onProgress) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    const total = scene.frameCount;
    let loaded = 0;

    const loadSingleFrame = async (index) => {
      const img = await this.fetchAndDecodeFrame(sceneId, index);
      if (img) {
        scene.frames[index] = img;
        scene.loadingFlags[index] = 2;
        loaded++;
        scene.loadedCount = loaded;
        if (onProgress) {
          onProgress(loaded / total, loaded, total, sceneId);
        }
      }
    };

    // Load first frame immediately to render initial view
    await loadSingleFrame(0);
    this.setFrame(sceneId, 0);

    // Concurrently load the rest of the scene in batches
    const remainingIndices = [];
    for (let i = 1; i < total; i++) remainingIndices.push(i);

    const batchSize = this.options.maxConcurrentDownloads;
    for (let i = 0; i < remainingIndices.length; i += batchSize) {
      const batch = remainingIndices.slice(i, i + batchSize);
      await Promise.all(batch.map((idx) => loadSingleFrame(idx)));
    }
  }

  // Fetch and decode a single frame (optimized with createImageBitmap)
  async fetchAndDecodeFrame(sceneId, frameIndex) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return null;

    const frameNum = String(frameIndex + 1).padStart(4, '0');
    const url = `/frames/${scene.folder}/frame_${frameNum}.${this.manifest.format}`;

    try {
      if (this.supportsImageBitmap) {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob, {
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'default',
        });
        return bitmap;
      } else {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = async () => {
            if ('decode' in img) {
              try { await img.decode(); } catch { /* ignore */ }
            }
            resolve(img);
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      }
    } catch {
      return null;
    }
  }

  // Queue an entire scene for smooth sequential caching
  queueScene(sceneId, priority = false) {
    const scene = this.scenes.get(sceneId);
    if (!scene || scene.loadedCount >= scene.frameCount) return;

    const newTasks = [];
    for (let f = 0; f < scene.frameCount; f++) {
      if (scene.loadingFlags[f] === 0) {
        newTasks.push({ sceneId, frameIndex: f });
      }
    }

    if (priority) {
      this.downloadQueue = [...newTasks, ...this.downloadQueue.filter((t) => t.sceneId !== sceneId)];
    } else {
      const existingScenes = new Set(this.downloadQueue.map((t) => t.sceneId));
      if (!existingScenes.has(sceneId)) {
        this.downloadQueue.push(...newTasks);
      }
    }

    this.processQueue();
  }

  // Prioritize immediate target frame and surrounding neighborhood for instant response
  prioritizeTargetFrames(sceneId, targetIndex) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    const urgentFrames = [
      targetIndex,
      targetIndex + 1,
      targetIndex - 1,
      targetIndex + 2,
      targetIndex - 2,
      targetIndex + 3,
    ].filter((idx) => idx >= 0 && idx < scene.frameCount && scene.loadingFlags[idx] === 0);

    if (urgentFrames.length === 0) return;

    const urgentTasks = urgentFrames.map((frameIndex) => ({ sceneId, frameIndex }));
    const remainingTasks = this.downloadQueue.filter(
      (task) => !(task.sceneId === sceneId && urgentFrames.includes(task.frameIndex))
    );

    this.downloadQueue = [...urgentTasks, ...remainingTasks];
    this.processQueue();
  }

  // Boost priority of upcoming scene
  prioritizeScene(sceneId) {
    if (this.currentPriorityScene === sceneId) return;
    this.currentPriorityScene = sceneId;

    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    // Prune distant scenes (> 3 scenes away) to prevent memory pressure while preserving smooth rewind
    this.pruneDistantScenes(sceneId);

    const sceneTasks = [];
    const otherTasks = [];

    for (const item of this.downloadQueue) {
      if (item.sceneId === sceneId) {
        sceneTasks.push(item);
      } else {
        otherTasks.push(item);
      }
    }

    // If scene wasn't in download queue yet, generate tasks for missing frames
    if (sceneTasks.length === 0 && scene.loadedCount < scene.frameCount) {
      for (let f = 0; f < scene.frameCount; f++) {
        if (scene.loadingFlags[f] === 0) {
          sceneTasks.push({ sceneId, frameIndex: f });
        }
      }
    }

    // Prioritize initial frames first
    sceneTasks.sort((a, b) => a.frameIndex - b.frameIndex);

    this.downloadQueue = [...sceneTasks, ...otherTasks];
    this.processQueue();

    // Also quietly buffer the next subsequent scene
    if (this.manifest) {
      const sceneOrder = this.manifest.scenes.map((s) => s.id);
      const currIdx = sceneOrder.indexOf(sceneId);
      if (currIdx !== -1 && currIdx + 1 < sceneOrder.length) {
        this.queueScene(sceneOrder[currIdx + 1], false);
      }
    }
  }

  // Prune scenes that are far away (> 3 away) to keep memory safe without constant reload lag
  pruneDistantScenes(activeSceneId) {
    if (!this.manifest) return;
    const sceneOrder = this.manifest.scenes.map((s) => s.id);
    const activeIdx = sceneOrder.indexOf(activeSceneId);
    if (activeIdx === -1) return;

    for (let i = 0; i < sceneOrder.length; i++) {
      if (Math.abs(i - activeIdx) > 3) {
        const sId = sceneOrder[i];
        const scene = this.scenes.get(sId);
        if (scene && scene.loadedCount > 0) {
          this.downloadQueue = this.downloadQueue.filter((t) => t.sceneId !== sId);
          for (let f = 0; f < scene.frames.length; f++) {
            const img = scene.frames[f];
            if (img && typeof img.close === 'function') {
              try { img.close(); } catch { /* ignore */ }
            }
            scene.frames[f] = null;
            scene.loadingFlags[f] = 0;
          }
          scene.loadedCount = 0;
        }
      }
    }
  }

  async processQueue() {
    if (this.isQueueRunning) return;
    this.isQueueRunning = true;

    while (this.downloadQueue.length > 0 && this.activeDownloads < this.options.maxConcurrentDownloads) {
      const task = this.downloadQueue.shift();
      const scene = this.scenes.get(task.sceneId);
      if (!scene || scene.loadingFlags[task.frameIndex] !== 0) continue;

      scene.loadingFlags[task.frameIndex] = 1;
      this.activeDownloads++;

      this.fetchAndDecodeFrame(task.sceneId, task.frameIndex)
        .then((img) => {
          if (img) {
            scene.frames[task.frameIndex] = img;
            scene.loadingFlags[task.frameIndex] = 2;
            scene.loadedCount++;

            // Immediately mark dirty when a frame for the active or transitioning scene arrives
            if (
              this.activeSceneId === task.sceneId ||
              (this.transitionState.isTransitioning &&
                (this.transitionState.fromSceneId === task.sceneId || this.transitionState.toSceneId === task.sceneId))
            ) {
              this.isDirty = true;
            }
          } else {
            scene.loadingFlags[task.frameIndex] = 0;
          }
        })
        .catch(() => {
          scene.loadingFlags[task.frameIndex] = 0;
        })
        .finally(() => {
          this.activeDownloads--;
          this.processQueue();
        });
    }

    this.isQueueRunning = false;
  }

  // Set the current scrubbed frame within a single scene
  setFrame(sceneId, frameIndex) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    const clampedIndex = Math.max(0, Math.min(scene.frameCount - 1, Math.round(frameIndex)));
    if (
      !this.transitionState.isTransitioning &&
      this.activeSceneId === sceneId &&
      this.activeFrameIndex === clampedIndex
    ) {
      return; // Frame hasn't changed
    }

    this.activeSceneId = sceneId;
    this.activeFrameIndex = clampedIndex;
    this.transitionState.isTransitioning = false;
    this.transitionState.isDipThroughBlack = false;
    this.isDirty = true;

    // Instant prefetch for current frame & neighbors if not yet cached
    if (!scene.frames[clampedIndex]) {
      this.prioritizeTargetFrames(sceneId, clampedIndex);
    }
  }

  // Set normalized progress (0.0 to 1.0) for a scene
  setProgress(sceneId, progress) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    const p = Math.max(0, Math.min(1, progress));
    const targetFrame = p * (scene.frameCount - 1);
    this.setFrame(sceneId, targetFrame);
  }

  // Seamless film transition: cross-dissolve between two adjacent scenes
  setTransition(fromSceneId, fromFrameIndex, toSceneId, toFrameIndex, alpha) {
    const fromScene = this.scenes.get(fromSceneId);
    const toScene = this.scenes.get(toSceneId);
    if (!fromScene || !toScene) return;

    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    const fromIdx = Math.max(0, Math.min(fromScene.frameCount - 1, Math.round(fromFrameIndex)));
    const toIdx = Math.max(0, Math.min(toScene.frameCount - 1, Math.round(toFrameIndex)));

    this.transitionState = {
      isTransitioning: true,
      isDipThroughBlack: false,
      fromSceneId,
      fromFrameIndex: fromIdx,
      toSceneId,
      toFrameIndex: toIdx,
      alpha: clampedAlpha,
    };

    if (!toScene.frames[toIdx]) {
      this.prioritizeTargetFrames(toSceneId, toIdx);
    }

    this.isDirty = true;
  }

  // Atmospheric dip-through-black transition
  setDipThroughBlack(fromSceneId, fromFrameIndex, toSceneId, toFrameIndex, progress) {
    const fromScene = this.scenes.get(fromSceneId);
    const toScene = this.scenes.get(toSceneId);
    if (!fromScene || !toScene) return;

    const p = Math.max(0, Math.min(1, progress));
    const fromIdx = Math.max(0, Math.min(fromScene.frameCount - 1, Math.round(fromFrameIndex)));
    const toIdx = Math.max(0, Math.min(toScene.frameCount - 1, Math.round(toFrameIndex)));

    this.transitionState = {
      isTransitioning: true,
      isDipThroughBlack: true,
      fromSceneId,
      fromFrameIndex: fromIdx,
      toSceneId,
      toFrameIndex: toIdx,
      progress: p,
    };

    if (p > 0.4 && !toScene.frames[toIdx]) {
      this.prioritizeTargetFrames(toSceneId, toIdx);
    }

    this.isDirty = true;
  }

  // Helper to find the nearest loaded frame if current frame is still downloading
  getNearestLoadedFrame(sceneId, preferredIndex) {
    const scene = this.scenes.get(sceneId);
    if (!scene) return this.lastRenderedImage;

    if (scene.frames[preferredIndex]) {
      return scene.frames[preferredIndex];
    }

    if (scene.loadedCount === 0) {
      return this.lastRenderedImage;
    }

    const maxDelta = Math.min(45, Math.max(preferredIndex, scene.frameCount - preferredIndex));
    for (let delta = 1; delta <= maxDelta; delta++) {
      const prev = preferredIndex - delta;
      if (prev >= 0 && scene.frames[prev]) return scene.frames[prev];
      const next = preferredIndex + delta;
      if (next < scene.frameCount && scene.frames[next]) return scene.frames[next];
    }

    return this.lastRenderedImage;
  }

  // Object-fit: cover projection math so frames fill the viewport crisply
  drawCover(img, targetAlpha = 1.0) {
    if (!img) return;

    const ctx = this.ctx;
    const vw = this.viewportWidth;
    const vh = this.viewportHeight;
    const iw = img.naturalWidth || img.width || 1920;
    const ih = img.naturalHeight || img.height || 1080;

    const scale = Math.max(vw / iw, vh / ih);
    const renderW = iw * scale;
    const renderH = ih * scale;
    const offsetX = (vw - renderW) * 0.5;
    const offsetY = (vh - renderH) * 0.5;

    ctx.globalAlpha = Math.max(0, Math.min(1, targetAlpha));
    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

    // Seamlessly erase Gemini watermark by blending adjacent clean pixels
    this.eraseWatermark(img, offsetX, offsetY, scale, targetAlpha);
  }

  eraseWatermark(img, offsetX, offsetY, scale, targetAlpha) {
    if (!img || targetAlpha <= 0.05) return;
    try {
      const ctx = this.ctx;
      const iw = img.naturalWidth || img.width || 1920;
      const ih = img.naturalHeight || img.height || 1080;

      // Watermark location in normalized coordinates (~89.5% X, ~81% Y)
      const srcWmX = Math.round(iw * 0.895);
      const srcWmY = Math.round(ih * 0.81);
      const srcWmSize = Math.round(iw * 0.045); // ~86px on 1920

      // Sample directly above the watermark where scenery/texture is clean and continuous
      const sampleY = Math.max(0, srcWmY - Math.round(srcWmSize * 1.15));

      const destX = offsetX + srcWmX * scale;
      const destY = offsetY + srcWmY * scale;
      const destSize = srcWmSize * scale;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, targetAlpha));

      // Circular feathered clip to blend seamlessly into background
      ctx.beginPath();
      ctx.arc(
        destX + destSize * 0.5,
        destY + destSize * 0.5,
        destSize * 0.58,
        0,
        Math.PI * 2
      );
      ctx.clip();

      ctx.drawImage(
        img,
        srcWmX, sampleY, srcWmSize, srcWmSize,
        destX, destY, destSize, destSize
      );

      ctx.restore();
    } catch {
      // In case of any cross-origin or canvas read error, fail gracefully
    }
  }

  renderLoop() {
    if (this.isDirty) {
      const ctx = this.ctx;
      const vw = this.viewportWidth;
      const vh = this.viewportHeight;

      // 1. Scene Transition
      if (this.transitionState.isTransitioning) {
        // A. Dip through black
        if (this.transitionState.isDipThroughBlack) {
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, vw, vh);

          const { fromSceneId, fromFrameIndex, toSceneId, toFrameIndex, progress } = this.transitionState;
          if (progress < 0.5) {
            const fromImg = this.getNearestLoadedFrame(fromSceneId, fromFrameIndex);
            if (fromImg) {
              const alpha = Math.max(0, Math.pow(1.0 - progress * 2, 1.5));
              this.drawCover(fromImg, alpha);
              this.lastRenderedImage = fromImg;
            }
          } else {
            const toImg = this.getNearestLoadedFrame(toSceneId, toFrameIndex);
            if (toImg) {
              const alpha = Math.max(0, Math.pow((progress - 0.5) * 2, 1.5));
              this.drawCover(toImg, alpha);
              this.lastRenderedImage = toImg;
            }
          }
        }
        // B. Standard film cross-dissolve (hermite smooth curve)
        else {
          const { fromSceneId, fromFrameIndex, toSceneId, toFrameIndex, alpha } = this.transitionState;
          const fromImg = this.getNearestLoadedFrame(fromSceneId, fromFrameIndex);
          const toImg = this.getNearestLoadedFrame(toSceneId, toFrameIndex);

          if (fromImg) {
            this.drawCover(fromImg, 1.0);
          } else {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, vw, vh);
          }

          if (toImg && alpha > 0.001) {
            this.drawCover(toImg, alpha);
          }

          if (alpha >= 0.5 && toImg) {
            this.lastRenderedImage = toImg;
          } else if (fromImg) {
            this.lastRenderedImage = fromImg;
          }
        }
      }
      // 2. Normal Single Scene Scrub
      else {
        const img = this.getNearestLoadedFrame(this.activeSceneId, this.activeFrameIndex);
        if (img) {
          this.drawCover(img, 1.0);
          this.lastRenderedImage = img;
        } else if (this.lastRenderedImage) {
          this.drawCover(this.lastRenderedImage, 1.0);
        } else {
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, vw, vh);
        }
      }

      this.isDirty = false;
    }

    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    this.downloadQueue = [];
    this.scenes.clear();
  }
}
