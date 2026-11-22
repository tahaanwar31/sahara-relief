"""Where shared files live. Works from the repo and from the Docker image."""
from __future__ import annotations

import os
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = SERVICE_DIR.parent


def shared_dir() -> Path:
    env = os.environ.get("SHARED_DIR")
    if env:
        return Path(env)
    for cand in (REPO_DIR / "shared", SERVICE_DIR / "shared", Path("/app/shared")):
        if (cand / "reasons.json").exists():
            return cand
    return REPO_DIR / "shared"


def storage_dir() -> Path:
    return Path(os.environ.get("STORAGE_DIR") or (SERVICE_DIR / "storage"))


def models_dir() -> Path:
    return Path(os.environ.get("MODELS_DIR") or (SERVICE_DIR / "models"))
