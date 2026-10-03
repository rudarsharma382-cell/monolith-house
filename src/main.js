import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CanvasEngine } from './canvas-engine.js';
import { mountMaterialPortfolio, mountMasonryGallery, mountOutroRating } from './components/mount-portfolio.jsx';

gsap.registerPlugin(ScrollTrigger);

// Mount React Components (3D FlipCard Portfolio, 16-Slices Masonry Gallery & Outro PeekRating)
mountMaterialPortfolio();
mountMasonryGallery(() => {
  const target = document.getElementById('act-06');
  if (target) {
    lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    setActiveNav('night');
  }
});
mountOutroRating();

// ============================================================================
// 1. LENIS SMOOTH SCROLL INITIALIZATION (Buttery Smooth & High-Velocity Safe)
// ============================================================================
const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 1.3,
  wheelMultiplier: 1.0,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

// GSAP smooth pacing without sudden stutter
gsap.ticker.lagSmoothing(500, 33);

// ============================================================================
// 2. HUD & TELEMETRY WITH ZERO-REDUNDANT-DOM-WRITE CACHING
// ============================================================================
const hudProgressBar = document.getElementById('hud-progress-bar');
const hudProgressPercent = document.getElementById('hud-progress-percent');

// Heliostat elements
const solarCompassNeedle = document.getElementById('solar-compass-needle');
const telemetryAzimuth = document.getElementById('telemetry-azimuth');
const telemetryAltitude = document.getElementById('telemetry-altitude');
const telemetryLux = document.getElementById('telemetry-lux');
const telemetryPhase = document.getElementById('telemetry-phase');

const textCache = new WeakMap();
function updateTelemetryText(el, text) {
  if (!el) return;
  if (textCache.get(el) === text) return;
  textCache.set(el, text);
  el.textContent = text;
}

// ============================================================================
// 3. CANVAS ENGINE & PRELOADER
// ============================================================================
const canvasElement = document.getElementById('scrub-canvas');
const engine = new CanvasEngine(canvasElement);

const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderPercent = document.getElementById('preloader-percent');
const preloaderStatus = document.getElementById('preloader-status');

const STORY_STRUCTURE = [
  { id: 'scene_01_ambient', title: 'ACT 01 // SANCTUARY', navKey: 'overview', elementId: 'act-01', type: 'scene', nextScene: 'scene_02_approach' },
  { id: 'scene_02_approach', title: 'ACT 02 // APPROACH', navKey: 'architecture', elementId: 'act-02', type: 'scene', nextScene: null },
  { id: 'interlude_01', title: 'INTERLUDE // EXCAVATION', navKey: 'tectonic', elementId: 'interlude-01', type: 'interlude', fromScene: 'scene_02_approach', toScene: 'scene_03_ascent' },
  { id: 'scene_03_ascent', title: 'ACT 03 // ASCENT', navKey: 'architecture', elementId: 'act-03', type: 'scene', nextScene: 'scene_04_living' },
  { id: 'scene_04_living', title: 'ACT 04 // LIVING', navKey: 'living', elementId: 'act-04', type: 'scene', nextScene: 'scene_05_bedroom' },
  { id: 'scene_05_bedroom', title: 'ACT 05 // RETREAT', navKey: 'living', elementId: 'act-05', type: 'scene', nextScene: null },
  { id: 'interlude_02', title: 'INTERLUDE // NOCTURNAL', navKey: 'night', elementId: 'interlude-02', type: 'interlude', fromScene: 'scene_05_bedroom', toScene: 'scene_06_night_outro' },
  { id: 'scene_06_night_outro', title: 'ACT 06 // DUSK TO NIGHT', navKey: 'night', elementId: 'act-06', type: 'scene', nextScene: null },
];

async function bootstrap() {
  try {
    await engine.init((progress, loaded, total) => {
      const pct = Math.round(progress * 100);
      if (preloaderBar) preloaderBar.style.width = `${pct}%`;
      if (preloaderPercent) preloaderPercent.textContent = `${pct}%`;
      if (preloaderStatus) {
        preloaderStatus.textContent = `Streaming frames [scene_01_ambient]: ${loaded}/${total}`;
      }
    });

    // Dismiss preloader smoothly
    if (preloader) {
      preloaderStatus.textContent = 'Calibration complete. Entering Monolith.';
      preloaderBar.style.width = '100%';
      preloaderPercent.textContent = '100%';

      gsap.to(preloader, {
        opacity: 0,
        y: -30,
        duration: 0.8,
        ease: 'power3.inOut',
        delay: 0.15,
        onComplete: () => {
          preloader.style.display = 'none';
          setupScrollTriggers();
          ScrollTrigger.refresh();
        },
      });
    }
  } catch (err) {
    console.error('Failed to initialize canvas engine:', err);
    if (preloaderStatus) {
      preloaderStatus.textContent = 'Error loading environment. Retrying...';
    }
  }
}

// ============================================================================
// 4. GSAP SCROLLTRIGGER SETUP: 1:1 SYNC & GPU HARDWARE TRANSFORMS
// ============================================================================
function setupScrollTriggers() {
  STORY_STRUCTURE.forEach((item) => {
    const section = document.getElementById(item.elementId);
    if (!section) return;

    // A. Interlude Sections
    if (item.type === 'interlude') {
      const content = section.querySelector('.interlude-content');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          onEnter: () => {
            engine.prioritizeScene(item.toScene);
            setActiveNav(item.navKey);
          },
          onEnterBack: () => {
            engine.prioritizeScene(item.fromScene);
            setActiveNav(item.navKey);
          },
          onUpdate: (self) => {
            handleInterludePlayback(item, self.progress);
          },
        },
      });

      if (content) {
        tl.fromTo(
          content,
          { opacity: 0, y: 40, scale: 0.98, pointerEvents: 'none' },
          { opacity: 1, y: 0, scale: 1.0, pointerEvents: 'auto', duration: 0.22, ease: 'power2.out' },
          0.05
        );
        tl.to(
          content,
          { opacity: 0, y: -30, scale: 0.98, pointerEvents: 'none', duration: 0.18, ease: 'power2.in' },
          0.78
        );
      }
      return;
    }

    // B. Narrative Act Sections (Scenes 01 to 06)
    const sceneId = item.id;
    const introOverlay = section.querySelector('.act-intro-overlay');
    const editorialOverlay = section.querySelector('.act-editorial-overlay');
    const outroOverlay = section.querySelector('.act-outro-overlay');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onEnter: () => {
          engine.prioritizeScene(sceneId);
          setActiveNav(item.navKey);
        },
        onEnterBack: () => {
          engine.prioritizeScene(sceneId);
          setActiveNav(item.navKey);
        },
        onUpdate: (self) => {
          handleScenePlayback(item, self.progress);
        },
      },
    });

    // 1. Intro Overlay
    if (introOverlay) {
      tl.fromTo(
        introOverlay,
        { opacity: 0, y: 35, scale: 1.01, pointerEvents: 'none' },
        { opacity: 1, y: 0, scale: 1.0, pointerEvents: 'auto', duration: 0.16, ease: 'power2.out' },
        0
      );
      tl.to(
        introOverlay,
        { opacity: 0, y: -20, scale: 0.98, pointerEvents: 'none', duration: 0.10, ease: 'power2.in' },
        0.24
      );
    }

    // 2. Editorial Overlay
    if (editorialOverlay) {
      tl.fromTo(
        editorialOverlay,
        { opacity: 0, y: 35, scale: 1.01, pointerEvents: 'none' },
        { opacity: 1, y: 0, scale: 1.0, pointerEvents: 'auto', duration: 0.14, ease: 'power2.out' },
        0.32
      );
      tl.to(
        editorialOverlay,
        { opacity: 0, y: -20, scale: 0.98, pointerEvents: 'none', duration: 0.10, ease: 'power2.in' },
        0.75
      );
    }

    // 3. Act 06 Grand Outro Overlay
    if (outroOverlay) {
      tl.fromTo(
        outroOverlay,
        { opacity: 0, y: 40, scale: 1.01, pointerEvents: 'none' },
        { opacity: 1, y: 0, scale: 1.0, pointerEvents: 'auto', duration: 0.20, ease: 'power2.out' },
        0.42
      );
    }
  });

  // Materiality Section ScrollTrigger for Navbar highlighting
  const materialitySection = document.getElementById('section-materiality');
  if (materialitySection) {
    ScrollTrigger.create({
      trigger: materialitySection,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => setActiveNav('materiality'),
      onEnterBack: () => setActiveNav('materiality'),
    });
  }

  // Masonry 16-Slices Gallery ScrollTrigger (transitioning towards night scene)
  const masonrySection = document.getElementById('section-masonry');
  if (masonrySection) {
    ScrollTrigger.create({
      trigger: masonrySection,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => {
        setActiveNav('gallery');
        engine.prioritizeScene('scene_06_night_outro');
      },
      onEnterBack: () => {
        setActiveNav('gallery');
      },
    });
  }

  // Global Page Progress & Heliostat Solar Tracking
  let lastProgressInt = -1;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const p = Math.round(self.progress * 100);
      if (p !== lastProgressInt) {
        lastProgressInt = p;
        if (hudProgressBar) hudProgressBar.style.width = `${p}%`;
        if (hudProgressPercent) hudProgressPercent.textContent = `${p}%`;

        // Update Architectural Heliostat Solar Tracking in real-time
        updateHeliostat(self.progress);
      }
    },
  });
}

// Heliostat real-time solar tracking calculation based on Lumnezia coordinates
function updateHeliostat(globalProgress) {
  const p = Math.max(0, Math.min(1, globalProgress));

  // Dawn (76° ENE) -> Midday (180° S) -> Dusk (270° W) -> Night (294° WNW)
  const azimuth = Math.round(76 + p * 218);
  if (solarCompassNeedle) {
    solarCompassNeedle.style.transform = `rotate(${azimuth}deg)`;
  }

  let compassDir = 'ENE';
  if (azimuth >= 90 && azimuth < 135) compassDir = 'ESE';
  else if (azimuth >= 135 && azimuth < 180) compassDir = 'SSE';
  else if (azimuth >= 180 && azimuth < 225) compassDir = 'SSW';
  else if (azimuth >= 225 && azimuth < 270) compassDir = 'WSW';
  else if (azimuth >= 270) compassDir = 'WNW';

  updateTelemetryText(telemetryAzimuth, `${azimuth}° ${compassDir}`);

  // Altitude & Lux
  if (p < 0.25) {
    updateTelemetryText(telemetryAltitude, `+16.4° DAWN`);
    updateTelemetryText(telemetryLux, `34,000 LUX`);
    updateTelemetryText(telemetryPhase, `DAWN HORIZON GLAZE`);
  } else if (p < 0.55) {
    updateTelemetryText(telemetryAltitude, `+48.2° ZENITH`);
    updateTelemetryText(telemetryLux, `64,000 LUX`);
    updateTelemetryText(telemetryPhase, `FULL DIRECT DIURNAL`);
  } else if (p < 0.82) {
    updateTelemetryText(telemetryAltitude, `+06.8° LOW`);
    updateTelemetryText(telemetryLux, `4,800 LUX`);
    updateTelemetryText(telemetryPhase, `ALPINE CREST OCCLUSION`);
  } else {
    updateTelemetryText(telemetryAltitude, `-08.4° NIGHT`);
    updateTelemetryText(telemetryLux, `2700K COVE`);
    updateTelemetryText(telemetryPhase, `NOCTURNAL EQUILIBRIUM`);
  }
}

// ============================================================================
// 5. SCENE PLAYBACK & CINEMATIC TRANSITIONS
// ============================================================================
let lastPrioritizedScene = null;

function handleScenePlayback(item, progress) {
  const sceneId = item.id;
  const nextSceneId = item.nextScene;
  const sceneData = engine.scenes.get(sceneId);
  const totalFrames = sceneData ? sceneData.frameCount : 240;

  // Preload upcoming scene early when passing mid-point
  if (nextSceneId && progress > 0.40) {
    if (lastPrioritizedScene !== nextSceneId) {
      lastPrioritizedScene = nextSceneId;
      engine.prioritizeScene(nextSceneId);
    }
  }

  // Cross-dissolve for direct scene-to-scene cuts
  if (nextSceneId && progress >= 0.82) {
    const tp = (progress - 0.82) / 0.18;
    const smoothAlpha = tp * tp * (3 - 2 * tp);
    engine.setTransition(sceneId, totalFrames - 1, nextSceneId, 0, smoothAlpha);
  } else {
    // Normal single scene scrub
    const scrubProgress = nextSceneId ? Math.min(1, progress / 0.82) : progress;
    const targetFrame = Math.round(scrubProgress * (totalFrames - 1));
    engine.setFrame(sceneId, targetFrame);
  }
}

// ============================================================================
// 6. INTERLUDE PLAYBACK: DIP-THROUGH-BLACK CINEMATIC TRANSITION
// ============================================================================
function handleInterludePlayback(item, progress) {
  const fromSceneData = engine.scenes.get(item.fromScene);
  const fromLastFrame = fromSceneData ? fromSceneData.frameCount - 1 : 239;

  if (progress > 0.12 && lastPrioritizedScene !== item.toScene) {
    lastPrioritizedScene = item.toScene;
    engine.prioritizeScene(item.toScene);
  }

  // Atmospheric Dip Through Black
  engine.setDipThroughBlack(item.fromScene, fromLastFrame, item.toScene, 0, progress);
}

// ============================================================================
// 7. APPLE-STYLE FLOATING PILL NAVBAR & INTERACTIVE CARD TABS
// ============================================================================
const navPillItems = document.querySelectorAll('.nav-pill-item');
const navLogoBtn = document.getElementById('nav-logo-btn');
const navFloorplanBtn = document.getElementById('nav-floorplan-btn');

function setActiveNav(navKey) {
  if (!navKey) return;
  navPillItems.forEach((btn) => {
    if (btn.dataset.nav === navKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

navPillItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    if (targetId) {
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        lenis.scrollTo(targetEl, { offset: 0, duration: 1.4 });
        setActiveNav(btn.dataset.nav);
      }
    }
  });
});

if (navFloorplanBtn) {
  navFloorplanBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openDrawer();
  });
}

if (navLogoBtn) {
  navLogoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(0, { offset: 0, duration: 1.5 });
    setActiveNav('overview');
  });
}

// Replay button (returns to Dawn)
const btnReplay = document.getElementById('btn-replay');
if (btnReplay) {
  btnReplay.addEventListener('click', () => {
    lenis.scrollTo(0, { duration: 1.8 });
  });
}

const btnReturnDawn = document.getElementById('btn-return-dawn');
if (btnReturnDawn) {
  btnReturnDawn.addEventListener('click', () => {
    lenis.scrollTo(0, { duration: 1.8 });
    setActiveNav('overview');
  });
}

// Scroll to top button in bottom-right telemetry card
const btnScrollTop = document.getElementById('btn-scroll-top');
if (btnScrollTop) {
  btnScrollTop.addEventListener('click', () => {
    lenis.scrollTo(0, { duration: 1.5 });
  });
}

// Interactive Swiss Modernist Tabs on Heliostat Card
const tabBtnHeliostat = document.getElementById('tab-btn-heliostat');
const tabBtnAcoustics = document.getElementById('tab-btn-acoustics');
const tabBtnStructure = document.getElementById('tab-btn-structure');

const tabContentHeliostat = document.getElementById('tab-content-heliostat');
const tabContentAcoustics = document.getElementById('tab-content-acoustics');
const tabContentStructure = document.getElementById('tab-content-structure');

function switchCardTab(activeTab) {
  const tabs = [
    { btn: tabBtnHeliostat, content: tabContentHeliostat },
    { btn: tabBtnAcoustics, content: tabContentAcoustics },
    { btn: tabBtnStructure, content: tabContentStructure },
  ];

  tabs.forEach((t) => {
    if (!t.btn || !t.content) return;
    if (t.btn.id === activeTab) {
      t.btn.classList.add('bg-white/15', 'text-white');
      t.btn.classList.remove('text-neutral-400');
      t.content.classList.remove('hidden');
    } else {
      t.btn.classList.remove('bg-white/15', 'text-white');
      t.btn.classList.add('text-neutral-400');
      t.content.classList.add('hidden');
    }
  });
}

if (tabBtnHeliostat) tabBtnHeliostat.addEventListener('click', () => switchCardTab('tab-btn-heliostat'));
if (tabBtnAcoustics) tabBtnAcoustics.addEventListener('click', () => switchCardTab('tab-btn-acoustics'));
if (tabBtnStructure) tabBtnStructure.addEventListener('click', () => switchCardTab('tab-btn-structure'));

// ============================================================================
// 8. INTERACTIVE TECHNICAL SPEC DRAWER
// ============================================================================
const specDrawerToggle = document.getElementById('spec-drawer-toggle');
const specDrawer = document.getElementById('spec-drawer');
const specDrawerPanel = document.getElementById('spec-drawer-panel');
const specDrawerBackdrop = document.getElementById('spec-drawer-backdrop');
const specDrawerClose = document.getElementById('spec-drawer-close');
const specDrawerBottomClose = document.getElementById('spec-drawer-bottom-close');
const btnOpenSpecOutro = document.getElementById('btn-open-spec-outro');

let isDrawerOpen = false;

function openDrawer() {
  isDrawerOpen = true;
  specDrawer.classList.remove('pointer-events-none');
  specDrawerPanel.classList.remove('translate-x-full', 'pointer-events-none');
  specDrawerBackdrop.classList.remove('opacity-0', 'pointer-events-none');
  specDrawerBackdrop.classList.add('opacity-100');
  lenis.stop();
}

function closeDrawer() {
  isDrawerOpen = false;
  specDrawerPanel.classList.add('translate-x-full', 'pointer-events-none');
  specDrawerBackdrop.classList.add('opacity-0', 'pointer-events-none');
  specDrawerBackdrop.classList.remove('opacity-100');
  setTimeout(() => {
    if (!isDrawerOpen) specDrawer.classList.add('pointer-events-none');
  }, 500);
  lenis.start();
}

if (specDrawerToggle) specDrawerToggle.addEventListener('click', openDrawer);
if (btnOpenSpecOutro) btnOpenSpecOutro.addEventListener('click', openDrawer);
if (specDrawerClose) specDrawerClose.addEventListener('click', closeDrawer);
if (specDrawerBottomClose) specDrawerBottomClose.addEventListener('click', closeDrawer);
if (specDrawerBackdrop) specDrawerBackdrop.addEventListener('click', closeDrawer);

// ============================================================================
// 9. BESPOKE PRIVATE INQUIRY MODAL
// ============================================================================
const btnInquireToggle = document.getElementById('btn-inquire-toggle');
const inquiryModal = document.getElementById('inquiry-modal');
const inquiryModalBackdrop = document.getElementById('inquiry-modal-backdrop');
const inquiryModalPanel = document.getElementById('inquiry-modal-panel');
const inquiryModalClose = document.getElementById('inquiry-modal-close');
const inquirySubmitBtn = document.getElementById('inquiry-submit-btn');
const inquirySuccessMsg = document.getElementById('inquiry-success-msg');

let isInquiryOpen = false;

function openInquiryModal() {
  isInquiryOpen = true;
  inquiryModal.classList.remove('pointer-events-none');
  inquiryModalBackdrop.classList.remove('opacity-0', 'pointer-events-none');
  inquiryModalBackdrop.classList.add('opacity-100');
  inquiryModalPanel.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
  inquiryModalPanel.classList.add('opacity-100', 'scale-100');
  lenis.stop();
}

function closeInquiryModal() {
  isInquiryOpen = false;
  inquiryModalPanel.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
  inquiryModalPanel.classList.remove('opacity-100', 'scale-100');
  inquiryModalBackdrop.classList.add('opacity-0', 'pointer-events-none');
  inquiryModalBackdrop.classList.remove('opacity-100');
  setTimeout(() => {
    if (!isInquiryOpen) inquiryModal.classList.add('pointer-events-none');
  }, 500);
  lenis.start();
}

if (btnInquireToggle) btnInquireToggle.addEventListener('click', openInquiryModal);
if (inquiryModalClose) inquiryModalClose.addEventListener('click', closeInquiryModal);
if (inquiryModalBackdrop) inquiryModalBackdrop.addEventListener('click', closeInquiryModal);

if (inquirySubmitBtn) {
  inquirySubmitBtn.addEventListener('click', () => {
    inquirySubmitBtn.textContent = 'Transmitting Dossier Request...';
    setTimeout(() => {
      inquirySubmitBtn.textContent = 'Request Confirmed';
      inquirySubmitBtn.classList.remove('from-amber-400', 'to-amber-500');
      inquirySubmitBtn.classList.add('bg-emerald-500', 'text-white');
      if (inquirySuccessMsg) inquirySuccessMsg.classList.remove('hidden');
      setTimeout(() => {
        closeInquiryModal();
      }, 2000);
    }, 800);
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isDrawerOpen) closeDrawer();
    if (isInquiryOpen) closeInquiryModal();
  }
});

// ============================================================================
// 10. BESPOKE AUDIO SOUNDTRACK (song.m4a) WITH EQUALIZER ANIMATION
// ============================================================================
const audioToggle = document.getElementById('audio-toggle');
const audioBars = document.querySelectorAll('.audio-bar-1, .audio-bar-2, .audio-bar-3');

// User soundtrack loaded from assets/public
const monolithAudio = new Audio('/song.m4a');
monolithAudio.loop = true;
monolithAudio.preload = 'auto';

let isAudioPlaying = false;
let fadeInterval = null;

function setAudioVisualState(playing) {
  audioBars.forEach((bar) => {
    if (playing) {
      bar.classList.add('playing');
      bar.classList.remove('bg-neutral-400');
      bar.classList.add('bg-amber-400');
    } else {
      bar.classList.remove('playing');
      bar.classList.remove('bg-amber-400');
      bar.classList.add('bg-neutral-400');
    }
  });
  if (audioToggle) {
    audioToggle.setAttribute('title', playing ? 'Mute MONOLITH Soundtrack' : 'Play MONOLITH Soundtrack');
    audioToggle.setAttribute('aria-label', playing ? 'Mute Soundtrack' : 'Play Soundtrack');
  }
}

function fadeInAudio(targetVolume = 0.7, duration = 600) {
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  const currentVol = monolithAudio.volume || 0;
  const stepTime = 30;
  const remainingDelta = Math.max(0.01, targetVolume - currentVol);
  const steps = Math.max(1, duration / stepTime);
  const stepDelta = remainingDelta / steps;

  const playPromise = monolithAudio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        isAudioPlaying = true;
        setAudioVisualState(true);
        fadeInterval = setInterval(() => {
          if (monolithAudio.volume + stepDelta >= targetVolume) {
            monolithAudio.volume = targetVolume;
            clearInterval(fadeInterval);
            fadeInterval = null;
          } else {
            monolithAudio.volume = Math.min(1, monolithAudio.volume + stepDelta);
          }
        }, stepTime);
      })
      .catch((err) => {
        console.warn('Audio playback failed or blocked:', err);
        isAudioPlaying = false;
        setAudioVisualState(false);
      });
  }
}

function fadeOutAudio(duration = 500) {
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  const currentVol = monolithAudio.volume;
  if (currentVol <= 0.02) {
    monolithAudio.volume = 0;
    monolithAudio.pause();
    isAudioPlaying = false;
    setAudioVisualState(false);
    return;
  }
  const stepTime = 30;
  const steps = Math.max(1, duration / stepTime);
  const stepDelta = currentVol / steps;

  fadeInterval = setInterval(() => {
    if (monolithAudio.volume - stepDelta <= 0.02) {
      monolithAudio.volume = 0;
      monolithAudio.pause();
      clearInterval(fadeInterval);
      fadeInterval = null;
      isAudioPlaying = false;
      setAudioVisualState(false);
    } else {
      monolithAudio.volume = Math.max(0, monolithAudio.volume - stepDelta);
    }
  }, stepTime);
}

function toggleAudio() {
  if (monolithAudio.paused || !isAudioPlaying) {
    fadeInAudio();
  } else {
    fadeOutAudio();
  }
}

// Ensure visual state resets if audio pauses externally
monolithAudio.addEventListener('pause', () => {
  if (!fadeInterval && monolithAudio.volume === 0) {
    isAudioPlaying = false;
    setAudioVisualState(false);
  }
});

if (audioToggle) {
  audioToggle.addEventListener('click', toggleAudio);
}

// Start everything
bootstrap();
