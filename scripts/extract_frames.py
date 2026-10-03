#!/usr/bin/env python3
"""
Monolith House - Video Frame Extractor for Canvas Scrubbing
Extracts frames from video clips in ./assets at 30 FPS into WebP/JPG format
with zero-padded 4-digit naming for high-performance canvas scrubbing.
"""

import os
import sys
import json
import shutil
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ASSETS_DIR = ROOT_DIR / "assets"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "public" / "frames"

SCENE_DEFINITIONS = [
    {
        "id": "scene_01_ambient",
        "title": "Modern Pavilion Ambient",
        "prefix": "Modern_pavilion_in_natural_lands",
    },
    {
        "id": "scene_02_approach",
        "title": "Lake Residence Approach",
        "prefix": "Camera_moving_toward_lake_residence",
    },
    {
        "id": "scene_03_ascent",
        "title": "Rock Face Ascent",
        "prefix": "Camera_ascending_along_rock_face",
    },
    {
        "id": "scene_04_living",
        "title": "Living Pavilion Tracking",
        "prefix": "Camera_tracking_through_living_p",
    },
    {
        "id": "scene_05_bedroom",
        "title": "Modern Bedroom Tracking",
        "prefix": "Camera_moving_through_modern_bed",
    },
    {
        "id": "scene_06_night_outro",
        "title": "Night Outro Residence Zoom",
        "prefix": "Camera_zooms_out_from_house",
    },
]

def format_bytes(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    else:
        return f"{num_bytes / (1024 * 1024):.1f} MB"

def check_ffmpeg():
    if not shutil.which("ffmpeg"):
        return False, "FFmpeg executable not found in PATH"
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        first_line = res.stdout.splitlines()[0] if res.stdout else "FFmpeg available"
        return True, first_line
    except Exception as e:
        return False, str(e)

def probe_video(video_path: Path):
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration,r_frame_rate:format=duration",
            "-of", "json",
            str(video_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        stream = data.get("streams", [{}])[0] if data.get("streams") else {}
        fmt = data.get("format", {})
        dur = float(stream.get("duration") or fmt.get("duration") or 0.0)
        w = int(stream.get("width") or 1920)
        h = int(stream.get("height") or 1080)
        return dur, w, h
    except Exception:
        return 0.0, 1920, 1080

def extract_scene(scene: dict, output_base: Path, fps: int = 30, quality: int = 85, fmt: str = "webp", force: bool = False):
    out_dir = output_base / scene["id"]
    out_dir.mkdir(parents=True, exist_ok=True)

    existing = sorted(list(out_dir.glob(f"*.{fmt}")))
    if existing and not force:
        print(f"  ℹ  Frames already exist ({len(existing)} files). Use --force to re-extract.")
        total_sz = sum(f.stat().st_size for f in existing)
        avg_sz = total_sz // len(existing) if existing else 0
        return {
            "scene_id": scene["id"],
            "title": scene["title"],
            "folder": scene["id"],
            "frame_count": len(existing),
            "total_bytes": total_sz,
            "total_size": format_bytes(total_sz),
            "avg_size": format_bytes(avg_sz),
            "first_frame": existing[0].name if existing else None,
            "last_frame": existing[-1].name if existing else None,
            "skipped": True,
        }

    if force and existing:
        for f in existing:
            f.unlink()

    video_path = scene["path"]
    duration, width, height = probe_video(video_path)
    expected_frames = max(1, round(duration * fps))

    print(f"  Target:     {out_dir}")
    print(f"  Resolution: {width}x{height} | Duration: {duration:.2f}s | Expected: ~{expected_frames} frames")

    output_pattern = str(out_dir / f"frame_%04d.{fmt}")
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vf", f"fps={fps}",
    ]
    if fmt == "webp":
        cmd.extend([
            "-c:v", "libwebp",
            "-quality", str(quality),
            "-compression_level", "3"
        ])
    else:
        cmd.extend([
            "-c:v", "mjpeg",
            "-qscale:v", "2"
        ])

    cmd.extend([
        "-progress", "pipe:1",
        "-nostats",
        output_pattern
    ])

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    cur_frame = 0
    cur_fps = 0.0
    cur_spd = "0.0x"

    while True:
        line = proc.stdout.readline()
        if not line and proc.poll() is not None:
            break
        line = line.strip()
        if not line:
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            if k == "frame":
                cur_frame = int(v) if v.isdigit() else cur_frame
            elif k == "fps":
                try:
                    cur_fps = float(v)
                except ValueError:
                    pass
            elif k == "speed":
                cur_spd = v
            elif k == "progress" and v in ("continue", "end"):
                pct = min(100, int((cur_frame / expected_frames) * 100)) if expected_frames > 0 else 0
                bar_len = 28
                filled = int(bar_len * (pct / 100.0))
                bar = "█" * filled + "░" * (bar_len - filled)
                sys.stdout.write(f"\r  [{bar}] {pct:>3}% | {cur_frame:>3}/{expected_frames} frames | {cur_fps:>4.1f} fps | {cur_spd:>6}")
                sys.stdout.flush()

    sys.stdout.write("\n")
    proc.wait()

    if proc.returncode != 0:
        err_out = proc.stderr.read()
        raise RuntimeError(f"FFmpeg failed with code {proc.returncode}:\n{err_out[-500:]}")

    generated = sorted(list(out_dir.glob(f"*.{fmt}")))
    total_sz = sum(f.stat().st_size for f in generated)
    avg_sz = total_sz // len(generated) if generated else 0

    return {
        "scene_id": scene["id"],
        "title": scene["title"],
        "folder": scene["id"],
        "duration": duration,
        "width": width,
        "height": height,
        "frame_count": len(generated),
        "total_bytes": total_sz,
        "total_size": format_bytes(total_sz),
        "avg_size": format_bytes(avg_sz),
        "first_frame": generated[0].name if generated else None,
        "last_frame": generated[-1].name if generated else None,
        "skipped": False,
    }

def main():
    parser = argparse.ArgumentParser(description="Monolith House Frame Extractor")
    parser.add_argument("--assets", default=str(DEFAULT_ASSETS_DIR), help="Input assets directory")
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT_DIR), help="Output directory")
    parser.add_argument("--fps", type=int, default=30, help="Frames per second (default: 30)")
    parser.add_argument("--quality", type=int, default=85, help="WebP/JPG quality (default: 85)")
    parser.add_argument("--format", choices=["webp", "jpg"], default="webp", help="Output format")
    parser.add_argument("--force", "-f", action="store_true", help="Force re-extraction")
    parser.add_argument("--scene", help="Extract only specific scene ID")
    args = parser.parse_args()

    print("=" * 70)
    print("   MONOLITH HOUSE — HIGH-PERFORMANCE VIDEO FRAME EXTRACTOR")
    print("=" * 70)

    ok, info = check_ffmpeg()
    if not ok:
        print(f"❌ Error: {info}")
        sys.exit(1)
    print(f"\n[1/4] FFmpeg Environment: {info}")

    assets_path = Path(args.assets)
    out_path = Path(args.out)

    if not assets_path.exists():
        print(f"❌ Error: Assets directory does not exist: {assets_path}")
        sys.exit(1)

    print(f"\n[2/4] Scanning assets directory: {assets_path}")
    files = [f.name for f in assets_path.iterdir() if f.is_file()]
    matched = []

    for sdef in SCENE_DEFINITIONS:
        match = next((f for f in files if f.startswith(sdef["prefix"])), None)
        if not match:
            print(f"❌ Error: Could not find matching video for {sdef['id']} (prefix {sdef['prefix']})")
            sys.exit(1)
        matched.append({
            **sdef,
            "filename": match,
            "path": assets_path / match,
        })

    print(f"  ✓ Resolved all {len(matched)} target scene videos.")
    for idx, s in enumerate(matched, 1):
        print(f"    {idx}. [{s['id']}] -> {s['filename']}")

    to_process = [s for s in matched if s["id"] == args.scene] if args.scene else matched

    print(f"\n[3/4] Extracting frames ({args.fps} FPS, {args.format.upper()} @ Q{args.quality})...")
    print(f"  Destination: {out_path}\n")

    results = []
    for idx, scene in enumerate(to_process, 1):
        print(f"── Scene [{idx}/{len(to_process)}]: {scene['id']} ({scene['title']}) ──")
        print(f"  Input:      {scene['filename']}")
        res = extract_scene(scene, out_path, fps=args.fps, quality=args.quality, fmt=args.format, force=args.force)
        results.append(res)
        print(f"  ✓ Completed: {res['frame_count']} frames generated ({res['total_size']}, avg: {res['avg_size']}/frame)\n")

    # Write Manifest
    manifest = {
        "version": "1.0.0",
        "generatedAt": datetime.now().isoformat(),
        "fps": args.fps,
        "format": args.format,
        "namingPattern": f"frame_%04d.{args.format}",
        "totalScenes": len(results),
        "totalFrames": sum(r["frame_count"] for r in results),
        "totalBytes": sum(r["total_bytes"] for r in results),
        "scenes": [
            {
                "index": i + 1,
                "id": r["scene_id"],
                "title": r["title"],
                "folder": r["folder"],
                "frameCount": r["frame_count"],
                "startFrame": 1,
                "endFrame": r["frame_count"],
                "framePattern": f"{r['folder']}/frame_%04d.{args.format}",
                "firstFrame": f"{r['folder']}/{r['first_frame']}",
                "lastFrame": f"{r['folder']}/{r['last_frame']}",
                "totalSize": r["total_size"],
                "avgFrameSize": r["avg_size"],
            }
            for i, r in enumerate(results)
        ]
    }

    manifest_file = out_path / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("=" * 70)
    print("   EXTRACTION SUMMARY & FRAME COUNTS")
    print("=" * 70)
    print("Scene ID               Frames    Total Size    Avg/Frame   Folder")
    print("─" * 70)
    tot_f = 0
    tot_b = 0
    for r in results:
        tot_f += r["frame_count"]
        tot_b += r["total_bytes"]
        print(f"{r['scene_id']:<22} {r['frame_count']:>6}  {r['total_size']:>12}  {r['avg_size']:>11}   public/frames/{r['folder']}/")
    print("─" * 70)
    print(f"GRAND TOTAL:           {tot_f:>6}  {format_bytes(tot_b):>12}                Manifest saved")
    print("=" * 70)

if __name__ == "__main__":
    main()
