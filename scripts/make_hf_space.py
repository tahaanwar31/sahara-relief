"""Builds the folder that is pushed to a Hugging Face Docker Space (free hosting, no card).

    python scripts/make_hf_space.py            # writes deploy/hf_space/  (git-ignored)

Why a separate folder: a Space needs a README.md with a small settings header, a port of 7860 and big files
(the 38 MB face model) stored with Git LFS. None of that belongs in the main repo. The folder holds only what the
image needs: service, shared, db, web source, the Dockerfile. No .env and no secrets: the secret settings (database
address, token secret) are typed into the Space's own "Secrets" page and never go into git.
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "deploy" / "hf_space"
SKIP = shutil.ignore_patterns(".venv", "node_modules", "dist", "__pycache__", "*.pyc", "tests", "storage", ".pytest_cache", ".vite", "*.log", "*.err", "_*.png")

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for d in ("service", "shared", "db"):
    shutil.copytree(ROOT / d, OUT / d, ignore=SKIP)
# the web app: source and public files only (the image builds it)
shutil.copytree(ROOT / "web", OUT / "web", ignore=shutil.ignore_patterns(".venv", "node_modules", "dist", "tests", "scripts", "*.log", "*.err", "_*.png"))
(OUT / "service" / "storage").mkdir(exist_ok=True)

docker = (ROOT / "Dockerfile").read_text(encoding="utf-8")
docker += """
# --- Hugging Face Spaces: listens on 7860, runs as a normal user, so the upload folder must be writable
ENV PORT=7860
RUN mkdir -p /app/service/storage && chmod -R a+rwX /app
"""
(OUT / "Dockerfile").write_text(docker, encoding="utf-8")
(OUT / ".dockerignore").write_text(".git\n.env\n*.log\n", encoding="utf-8")
(OUT / ".gitattributes").write_text("*.onnx filter=lfs diff=lfs merge=lfs -text\n*.joblib filter=lfs diff=lfs merge=lfs -text\n*.mp3 filter=lfs diff=lfs merge=lfs -text\n*.png filter=lfs diff=lfs merge=lfs -text\n", encoding="utf-8")
(OUT / "README.md").write_text("""---
title: Sahara Relief
emoji: 🤝
colorFrom: red
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# Sahara Relief (prototype)

A relief-payment claim platform for a woman who cannot read, and the helper beside her. Coder's Cup '26,
"The Last Mile: AI on Public Rails". Citizen, helper and admin screens, Urdu and English with recorded voice,
works offline.

**Prototype, not an official service. All people, ID numbers, households and payments are invented.**
Demo accounts are on the login page.
""", encoding="utf-8")

size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()) / 1e6
n = sum(1 for f in OUT.rglob("*") if f.is_file())
print(f"built {OUT}: {n} files, {size:.1f} MB")
big = [(round(f.stat().st_size / 1e6, 1), str(f.relative_to(OUT))) for f in OUT.rglob("*") if f.is_file() and f.stat().st_size > 9e6]
print("files over 9 MB (these go through LFS):", big)
