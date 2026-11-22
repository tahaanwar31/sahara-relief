"""Joins the recorded screen video and the voice clips into one MP4, each clip starting when its scene started.
    FFMPEG=<ffmpeg.exe> python video/mix.py [offset_seconds]
Reads video/out/raw/*.webm, video/out/timeline.json, video/out/audio/*.mp3. Writes video/out/Sahara_Relief_Demo.mp4."""
import json, os, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
ffmpeg = os.environ["FFMPEG"]
offset = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0          # shifts all the voice later (+) or earlier (-)
vids = sorted((OUT / "raw").glob("*.webm"), key=lambda p: p.stat().st_mtime)
video = vids[-1]
tl = json.loads((OUT / "timeline.json").read_text(encoding="utf-8"))["clips"]
clips = [(c["key"], max(0.0, c["start"] + offset)) for c in tl if (OUT / "audio" / f'{c["key"]}.mp3').exists()]

cmd = [ffmpeg, "-y", "-i", str(video)]
for k, _ in clips:
    cmd += ["-i", str(OUT / "audio" / f"{k}.mp3")]
parts = [f"[{i + 1}:a]adelay={int(s * 1000)}|{int(s * 1000)},volume=1.0[a{i}]" for i, (k, s) in enumerate(clips)]
mix = "".join(f"[a{i}]" for i in range(len(clips))) + f"amix=inputs={len(clips)}:normalize=0:dropout_transition=0[aout]"
cmd += ["-filter_complex", ";".join(parts + [mix]), "-map", "0:v", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "25",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(OUT / "Sahara_Relief_Demo.mp4")]
print("video:", video.name, "clips:", len(clips))
r = subprocess.run(cmd, capture_output=True, text=True)
print("ok" if r.returncode == 0 else r.stderr[-800:])
