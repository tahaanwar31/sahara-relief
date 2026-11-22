"""Makes one English voice clip per line of video/narration.json and records how long each is.
    python video/make_voice.py          (needs internet once; uses the free edge-tts voices)
Writes video/out/audio/<key>.mp3 and video/out/durations.json."""
import asyncio, json, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
cfg = json.loads((HERE / "narration.json").read_text(encoding="utf-8"))


def ffmpeg_exe() -> str:
    import os
    p = os.environ.get("FFMPEG")
    if p and Path(p).exists():
        return p
    sys.exit("set FFMPEG to the ffmpeg.exe path")


def duration(path: Path) -> float:
    r = subprocess.run([ffmpeg_exe(), "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr)
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


async def main():
    import edge_tts
    durs = {}
    for key, text in cfg["clips"].items():
        f = OUT / f"{key}.mp3"
        if not f.exists():
            await edge_tts.Communicate(text, cfg["voice"], rate=cfg["rate"]).save(str(f))
        durs[key] = round(duration(f), 2)
        print(f"{key:<14} {durs[key]:>6.1f}s", flush=True)
    (HERE / "out" / "durations.json").write_text(json.dumps(durs, indent=1), encoding="utf-8")
    print("total narration:", round(sum(durs.values())), "seconds")


asyncio.run(main())
