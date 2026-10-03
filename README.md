# MONOLITH — Alpine Architectural Experience

An Apple-style flagship interactive architectural showcase for **MONOLITH**, a subterranean alpine residence embedded into the Valser gneiss bedrock of Val Lumnezia, Switzerland.

Built with **Vite**, **HTML5 Canvas**, **GSAP + ScrollTrigger**, **Lenis**, and **Tailwind CSS**.

---

## Architecture & Visual System

1. **Canvas Engine (`src/canvas-engine.js`)**:
   - Single fullscreen `<canvas>` element pinned behind editorial content (`fixed inset-0 pointer-events-none -z-10`).
   - High-DPI retina display scaling (up to 2x DPR).
   - Responsive `object-fit: cover` aspect ratio math for distortion-free playback on mobile and ultra-wide screens.
   - Intelligent preloader: priority-loads Act 01 (`scene_01_ambient`), then progressively streams subsequent scenes in the background with concurrency control.
   - Smooth cross-dissolve scene transitions with zero black flashes or hard jump cuts.
   - Fallback to nearest loaded neighbor frame during high-velocity scrolling.

2. **Apple Aesthetic & Typography**:
   - Palette: Pure OLED blacks (`#000000`, `#050505`), warm architectural grays, frosted glass (`backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08]`), and muted amber accents (`#fbbf24`).
   - Fonts: **Inter**, **Space Grotesk**, and **JetBrains Mono** with tight title tracking and wide uppercase subtitle kerning (`tracking-[0.3em]`).
   - Floating HUD: Live UTC clock, GPS telemetry (`46°41'N 9°08'E • ELEV 1,480M`), active scene & frame counter, smooth scroll momentum meter, and jump navigation pills.
   - Interactive Floorplan Drawer: Technical elevation blueprint schematic (scale 1:200), engineering metrics, and materials schedule.
   - Procedural Alpine Audio: Client-side warm 55Hz alpine ambient drone via Web Audio API with mute toggle.

3. **Narrative Acts**:
   - **Act 01: The Sanctuary** (`scene_01_ambient` • 119 frames) — Living ambient loop & excavation metrics.
   - **Act 02: The Approach** (`scene_02_approach` • 240 frames) — Waterborne glide toward the rock face with cantilever specs.
   - **Act 03: The Ascent** (`scene_03_ascent` • 239 frames) — Climbing the native granite stairs into the monolith.
   - **Act 04: The Living Pavilion** (`scene_04_living` • 240 frames) — Board-formed concrete, geothermal heating, and acoustic baffling.
   - **Act 05: The Private Retreat** (`scene_05_bedroom` • 240 frames) — Dawn light alignment and cantilevered master suite.
   - **Act 06: Dusk to Night** (`scene_06_night_outro` • 240 frames) — 2700K cove light illumination & valley retreat.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- FFmpeg (only if re-extracting frames from raw videos)

### Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

### Frame Extraction (Optional)
To re-extract or re-encode video frames at 30 FPS into WebP:
```bash
npm run extract-frames
# or with python:
python scripts/extract_frames.py
```
