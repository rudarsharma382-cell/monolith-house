#!/usr/bin/env node

/**
 * High-Performance Video Frame Extraction Script for Canvas Scrubbing
 * 
 * Extracts frames at 30 FPS into WebP format (quality 85, zero-padded 4-digit naming)
 * for seamless interactive canvas scrubbing.
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

// Configuration
const DEFAULT_ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'frames');
const TARGET_FPS = 30;
const WEBP_QUALITY = 85;
const WEBP_COMPRESSION_LEVEL = 3; // 0-6: 3 gives 2.5x faster encoding with identical visual quality

// Target scene configurations and pattern matching
const SCENE_DEFINITIONS = [
  {
    id: 'scene_01_ambient',
    title: 'Modern Pavilion Ambient',
    pattern: /^Modern_pavilion_in_natural_lands/i,
  },
  {
    id: 'scene_02_approach',
    title: 'Lake Residence Approach',
    pattern: /^Camera_moving_toward_lake_residence/i,
  },
  {
    id: 'scene_03_ascent',
    title: 'Rock Face Ascent',
    pattern: /^Camera_ascending_along_rock_face/i,
  },
  {
    id: 'scene_04_living',
    title: 'Living Pavilion Tracking',
    pattern: /^Camera_tracking_through_living_p/i,
  },
  {
    id: 'scene_05_bedroom',
    title: 'Modern Bedroom Tracking',
    pattern: /^Camera_moving_through_modern_bed/i,
  },
  {
    id: 'scene_06_night_outro',
    title: 'Night Outro Residence Zoom',
    pattern: /^Camera_zooms_out_from_house/i,
  },
];

// CLI Arguments parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    assetsDir: DEFAULT_ASSETS_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    fps: TARGET_FPS,
    quality: WEBP_QUALITY,
    format: 'webp', // webp or jpg
    force: false,
    scene: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--assets' && args[i + 1]) {
      options.assetsDir = path.resolve(args[++i]);
    } else if (arg === '--out' && args[i + 1]) {
      options.outputDir = path.resolve(args[++i]);
    } else if (arg === '--fps' && args[i + 1]) {
      options.fps = parseInt(args[++i], 10);
    } else if (arg === '--quality' && args[i + 1]) {
      options.quality = parseInt(args[++i], 10);
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i].toLowerCase();
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--scene' && args[i + 1]) {
      options.scene = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Monolith House - Video Frame Extractor for Canvas Scrubbing

Usage:
  node scripts/extract_frames.js [options]

Options:
  --assets <path>   Source video directory (default: ./assets)
  --out <path>      Output frames directory (default: ./public/frames)
  --fps <number>    Target frame rate (default: 30)
  --quality <num>   WebP/JPEG quality 1-100 (default: 85)
  --format <fmt>    Output format: 'webp' or 'jpg' (default: webp)
  --force, -f       Force re-extraction even if frames exist
  --scene <id>      Extract only a specific scene (e.g. scene_01_ambient)
  --help, -h        Show this help message
`);
}

// Check FFmpeg and FFprobe availability
function checkFFmpeg() {
  try {
    const ffmpegRes = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
    if (ffmpegRes.error || ffmpegRes.status !== 0) {
      return { ok: false, error: 'FFmpeg command failed or not found in PATH' };
    }

    const firstLine = ffmpegRes.stdout.split('\n')[0] || '';
    const hasWebp = ffmpegRes.stdout.includes('--enable-libwebp');

    let hasFfprobe = true;
    try {
      const ffprobeRes = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
      if (ffprobeRes.error || ffprobeRes.status !== 0) hasFfprobe = false;
    } catch {
      hasFfprobe = false;
    }

    return {
      ok: true,
      version: firstLine.trim(),
      hasWebp,
      hasFfprobe,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Probe video metadata (duration, resolution)
function probeVideo(videoPath) {
  try {
    const res = spawnSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,duration,r_frame_rate:format=duration',
      '-of', 'json',
      videoPath,
    ], { encoding: 'utf8' });

    if (res.status === 0 && res.stdout) {
      const data = JSON.parse(res.stdout);
      const stream = data.streams && data.streams[0] ? data.streams[0] : {};
      const format = data.format || {};

      const duration = parseFloat(stream.duration || format.duration || '0');
      const width = stream.width || 1920;
      const height = stream.height || 1080;
      return { duration, width, height };
    }
  } catch {
    // fallback if ffprobe fails
  }
  return { duration: 0, width: 1920, height: 1080 };
}

// Render progress bar
function renderProgressBar(current, total, fps, speed, width = 28) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round(ratio * 100).toString().padStart(3, ' ');
  const curStr = current.toString().padStart(total.toString().length, ' ');
  const fpsStr = (fps || 0).toFixed(1).padStart(4, ' ');
  const spdStr = (speed || '0.0x').padStart(6, ' ');

  return `[${bar}] ${percent}% | ${curStr}/${total} frames | ${fpsStr} fps | ${spdStr}`;
}

// Format byte sizes
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Extract frames for a single scene
function extractSceneFrames(scene, options) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(options.outputDir, scene.id);
    fs.mkdirSync(outputDir, { recursive: true });

    // Check if already extracted
    const existingFrames = fs.readdirSync(outputDir).filter(f => f.endsWith(`.${options.format}`));
    if (existingFrames.length > 0 && !options.force) {
      console.log(`  ℹ  Frames already exist (${existingFrames.length} files). Use --force to re-extract.`);
      const stats = getDirectoryStats(outputDir, options.format);
      return resolve({
        sceneId: scene.id,
        skipped: true,
        frameCount: existingFrames.length,
        ...stats,
      });
    }

    // Clean existing frames if forcing
    if (options.force && existingFrames.length > 0) {
      for (const f of existingFrames) {
        fs.unlinkSync(path.join(outputDir, f));
      }
    }

    const { duration, width, height } = probeVideo(scene.videoPath);
    const expectedFrames = Math.max(1, Math.round(duration * options.fps));

    console.log(`  Target:     ${outputDir}`);
    console.log(`  Resolution: ${width}x${height} | Duration: ${duration.toFixed(2)}s | Expected: ~${expectedFrames} frames`);

    // Output pattern: zero-padded 4 digits (frame_%04d.webp)
    const outputPattern = path.join(outputDir, `frame_%04d.${options.format}`);

    const ffmpegArgs = [
      '-y',
      '-i', scene.videoPath,
      '-vf', `fps=${options.fps}`,
    ];

    if (options.format === 'webp') {
      ffmpegArgs.push(
        '-c:v', 'libwebp',
        '-quality', String(options.quality),
        '-compression_level', String(WEBP_COMPRESSION_LEVEL)
      );
    } else {
      // JPEG with high quality
      ffmpegArgs.push(
        '-c:v', 'mjpeg',
        '-qscale:v', '2'
      );
    }

    ffmpegArgs.push(
      '-progress', 'pipe:1',
      '-nostats',
      outputPattern
    );

    const child = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let currentFrame = 0;
    let currentFps = 0;
    let currentSpeed = '0.0x';
    let stdoutBuffer = '';

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop(); // keep last incomplete line

      for (const line of lines) {
        const [k, v] = line.trim().split('=');
        if (k === 'frame') {
          currentFrame = parseInt(v, 10) || currentFrame;
        } else if (k === 'fps') {
          currentFps = parseFloat(v) || currentFps;
        } else if (k === 'speed') {
          currentSpeed = v;
        } else if (k === 'progress' && (v === 'continue' || v === 'end')) {
          const progressLine = renderProgressBar(currentFrame, expectedFrames, currentFps, currentSpeed);
          process.stdout.write(`\r  ${progressLine}`);
        }
      }
    });

    let stderrBuffer = '';
    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on('error', (err) => {
      process.stdout.write('\n');
      reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
    });

    child.on('close', (code) => {
      process.stdout.write('\n');
      if (code !== 0) {
        return reject(new Error(`FFmpeg exited with error code ${code}.\n${stderrBuffer.slice(-500)}`));
      }

      const stats = getDirectoryStats(outputDir, options.format);
      resolve({
        sceneId: scene.id,
        skipped: false,
        duration,
        width,
        height,
        ...stats,
      });
    });
  });
}

function getDirectoryStats(dir, format) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(`.${format}`)).sort();
  let totalBytes = 0;
  for (const f of files) {
    const stat = fs.statSync(path.join(dir, f));
    totalBytes += stat.size;
  }
  const frameCount = files.length;
  const avgBytes = frameCount > 0 ? Math.round(totalBytes / frameCount) : 0;
  return {
    frameCount,
    firstFrame: files[0] || null,
    lastFrame: files[files.length - 1] || null,
    totalBytes,
    totalSizeFormatted: formatBytes(totalBytes),
    avgSizeFormatted: formatBytes(avgBytes),
  };
}

// Generate a manifest.json file for frontend canvas scrubber integration
function writeScrubberManifest(results, options) {
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    fps: options.fps,
    format: options.format,
    namingPattern: `frame_%04d.${options.format}`,
    totalScenes: results.length,
    totalFrames: results.reduce((sum, r) => sum + r.frameCount, 0),
    totalBytes: results.reduce((sum, r) => sum + (r.totalBytes || 0), 0),
    scenes: results.map((r, idx) => ({
      index: idx + 1,
      id: r.sceneId,
      title: r.title,
      folder: r.sceneId,
      frameCount: r.frameCount,
      startFrame: 1,
      endFrame: r.frameCount,
      framePattern: `${r.sceneId}/frame_%04d.${options.format}`,
      firstFrame: `${r.sceneId}/${r.firstFrame}`,
      lastFrame: `${r.sceneId}/${r.lastFrame}`,
      durationSeconds: r.duration,
      width: r.width,
      height: r.height,
      totalSize: r.totalSizeFormatted,
      avgFrameSize: r.avgSizeFormatted,
    })),
  };

  const manifestPath = path.join(options.outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n📋 Canvas Scrubber Manifest saved: ${path.relative(process.cwd(), manifestPath)}`);
}

// Main execution flow
async function main() {
  console.log('='.repeat(70));
  console.log('   MONOLITH HOUSE — HIGH-PERFORMANCE VIDEO FRAME EXTRACTOR');
  console.log('='.repeat(70));

  const options = parseArgs();

  // 1. Verify FFmpeg
  console.log('\n[1/4] Checking FFmpeg Environment...');
  const ffmpegInfo = checkFFmpeg();
  if (!ffmpegInfo.ok) {
    console.error(`\n❌ Error: FFmpeg is not installed or not accessible in PATH.`);
    console.error(`   Details: ${ffmpegInfo.error}`);
    console.error(`   Please ensure FFmpeg is installed and added to your system environment variables.`);
    process.exit(1);
  }
  console.log(`  ✓ FFmpeg detected: ${ffmpegInfo.version}`);
  console.log(`  ✓ WebP Encoder support: ${ffmpegInfo.hasWebp ? 'Available (libwebp)' : 'Standard'}`);
  console.log(`  ✓ FFprobe tool: ${ffmpegInfo.hasFfprobe ? 'Available' : 'Not found (fallback defaults enabled)'}`);

  // 2. Scan ./assets for target video clips
  console.log(`\n[2/4] Scanning assets directory: ${options.assetsDir}`);
  if (!fs.existsSync(options.assetsDir)) {
    console.error(`\n❌ Error: Assets directory does not exist: ${options.assetsDir}`);
    process.exit(1);
  }

  const assetFiles = fs.readdirSync(options.assetsDir);
  console.log(`  Found ${assetFiles.length} file(s) in assets/`);

  const matchedScenes = [];
  for (const sceneDef of SCENE_DEFINITIONS) {
    const matchedFile = assetFiles.find(file => sceneDef.pattern.test(file));
    if (!matchedFile) {
      console.error(`\n❌ Error: Could not find matching video for '${sceneDef.id}' (pattern: ${sceneDef.pattern})`);
      process.exit(1);
    }

    matchedScenes.push({
      ...sceneDef,
      fileName: matchedFile,
      videoPath: path.join(options.assetsDir, matchedFile),
    });
  }

  console.log(`  ✓ All ${matchedScenes.length} target video scenes successfully resolved:`);
  matchedScenes.forEach((s, idx) => {
    console.log(`    ${idx + 1}. [${s.id}] -> ${s.fileName}`);
  });

  // Filter if single scene requested
  const scenesToProcess = options.scene
    ? matchedScenes.filter(s => s.id === options.scene)
    : matchedScenes;

  if (scenesToProcess.length === 0) {
    console.error(`\n❌ Error: No scenes matched filter '--scene ${options.scene}'`);
    process.exit(1);
  }

  // 3. Frame Extraction
  console.log(`\n[3/4] Extracting frames (${options.fps} FPS, Format: ${options.format.toUpperCase()}, Quality: ${options.quality})...`);
  console.log(`  Destination: ${options.outputDir}\n`);

  fs.mkdirSync(options.outputDir, { recursive: true });

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < scenesToProcess.length; i++) {
    const scene = scenesToProcess[i];
    console.log(`── Scene [${i + 1}/${scenesToProcess.length}]: ${scene.id} (${scene.title}) ──`);
    console.log(`  Input:      ${scene.fileName}`);

    try {
      const result = await extractSceneFrames(scene, options);
      result.title = scene.title;
      results.push(result);
      console.log(`  ✓ Completed: ${result.frameCount} frames generated (${result.totalSizeFormatted}, avg: ${result.avgSizeFormatted}/frame)\n`);
    } catch (err) {
      console.error(`\n❌ Error extracting ${scene.id}: ${err.message}`);
      process.exit(1);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // 4. Output Summary & Manifest
  console.log(`[4/4] Generating Summary & Manifest...`);
  writeScrubberManifest(results, options);

  console.log('\n' + '='.repeat(70));
  console.log('   EXTRACTION SUMMARY & FRAME COUNTS');
  console.log('='.repeat(70));

  let grandTotalFrames = 0;
  let grandTotalBytes = 0;

  console.log('Scene ID               Frames    Total Size    Avg/Frame   Folder');
  console.log('─'.repeat(70));
  for (const r of results) {
    grandTotalFrames += r.frameCount;
    grandTotalBytes += r.totalBytes || 0;
    const idPad = r.sceneId.padEnd(22, ' ');
    const countPad = String(r.frameCount).padStart(6, ' ');
    const sizePad = (r.totalSizeFormatted || '0 B').padStart(12, ' ');
    const avgPad = (r.avgSizeFormatted || '0 B').padStart(11, ' ');
    console.log(`${idPad} ${countPad}  ${sizePad}  ${avgPad}   public/frames/${r.sceneId}/`);
  }
  console.log('─'.repeat(70));
  console.log(`GRAND TOTAL:           ${String(grandTotalFrames).padStart(6, ' ')}  ${formatBytes(grandTotalBytes).padStart(12, ' ')}                in ${elapsedSec}s`);
  console.log('='.repeat(70));
  console.log('🚀 Ready for high-performance canvas scrubbing!\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('\nFatal Error:', err);
    process.exit(1);
  });
}

module.exports = {
  SCENE_DEFINITIONS,
  checkFFmpeg,
  extractSceneFrames,
};
