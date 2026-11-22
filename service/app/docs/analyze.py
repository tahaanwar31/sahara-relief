"""Document photo checks. These produce SIGNALS, not a final verdict.

Checks: blur (variance of a Laplacian filter, computed with numpy), error-level analysis (ELA)
and metadata for JPEGs (needs Pillow), SHA-256 and a small perceptual hash for duplicate
detection, 13-digit CNIC numbers found in supplied text, optional QR (needs OpenCV).

HONEST LIMITS: no OCR is installed, so CNIC numbers are only read from text the caller
supplies. ELA and metadata checks are simple heuristics tested on a handful of synthetic
images; they raise a "have a person look" flag, never a rejection. Low confidence means
"ask for another photo". Nothing is guessed.
"""
from __future__ import annotations

import hashlib
import io
import re
import struct
import zlib
from typing import Any

import numpy as np

from ..identity.normalize import CNIC_IN_TEXT, format_cnic, validate_cnic

try:
    from PIL import ExifTags, Image, ImageChops

    PIL_OK = True
except Exception:  # pragma: no cover
    PIL_OK = False

try:  # optional
    import cv2  # type: ignore

    CV2_OK = True
except Exception:
    CV2_OK = False

MAX_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 40_000_000
BLUR_VAR_THRESHOLD = 60.0     # Laplacian variance below this (at 800 px wide) = blurry
EDIT_SOFTWARE = re.compile(r"(photoshop|gimp|canva|picsart|snapseed|lightroom|paint\.net|pixlr|facetune|editor)", re.I)
ALLOWED_KINDS = {"png", "jpeg"}


def sniff_kind(data: bytes) -> str | None:
    """Look at the first bytes, not the file name."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if data[:5] == b"%PDF-":
        return "pdf"
    return None


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# --- minimal PNG decoder (fallback when Pillow is missing) --------------------------
def _decode_png_gray(data: bytes) -> np.ndarray | None:
    try:
        pos, chunks, idat = 8, {}, b""
        while pos < len(data):
            ln, typ = struct.unpack(">I4s", data[pos:pos + 8])
            body = data[pos + 8: pos + 8 + ln]
            if typ == b"IDAT":
                idat += body
            else:
                chunks[typ] = body
            pos += 12 + ln
        w, h, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", chunks[b"IHDR"])
        if depth != 8 or interlace != 0 or ctype not in (0, 2, 6) or w * h > MAX_PIXELS:
            return None
        bpp = {0: 1, 2: 3, 6: 4}[ctype]
        raw = zlib.decompress(idat)
        stride = w * bpp
        out = np.zeros((h, stride), dtype=np.int32)
        prev = np.zeros(stride, dtype=np.int32)
        p = 0
        for y in range(h):
            f = raw[p]
            line = np.frombuffer(raw[p + 1: p + 1 + stride], dtype=np.uint8).astype(np.int32)
            p += 1 + stride
            cur = np.zeros(stride, dtype=np.int32)
            if f == 0:
                cur = line
            elif f == 2:
                cur = (line + prev) & 255
            else:  # filters 1, 3, 4 need left neighbours: do it per byte
                for i in range(stride):
                    a = cur[i - bpp] if i >= bpp else 0
                    b = prev[i]
                    c = prev[i - bpp] if i >= bpp else 0
                    if f == 1:
                        pr = a
                    elif f == 3:
                        pr = (a + b) // 2
                    else:
                        pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                        pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                    cur[i] = (line[i] + pr) & 255
            out[y] = cur
            prev = cur
        img = out.reshape(h, w, bpp)
        gray = img[:, :, 0] if bpp == 1 else (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2])
        return gray.astype(np.float32)
    except Exception:
        return None


def laplacian_variance(gray: np.ndarray) -> float:
    g = gray.astype(np.float32)
    if g.shape[0] < 3 or g.shape[1] < 3:
        return 0.0
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    return float(lap.var())


def _resize_gray(gray: np.ndarray, width: int = 800) -> np.ndarray:
    """Shrink big photos by block averaging so blur numbers do not depend on the camera size."""
    h, w = gray.shape
    k = max(1, w // width)
    if k == 1:
        return gray
    return gray[: (h // k) * k, : (w // k) * k].reshape(h // k, k, w // k, k).mean(axis=(1, 3))


def ahash(gray: np.ndarray) -> str:
    h, w = gray.shape
    ys = np.linspace(0, h - 1, 8).astype(int)
    xs = np.linspace(0, w - 1, 8).astype(int)
    small = gray[np.ix_(ys, xs)]
    bits = (small > small.mean()).flatten()
    return "".join("1" if b else "0" for b in bits)


def hamming(a: str, b: str) -> int:
    return sum(x != y for x, y in zip(a, b)) + abs(len(a) - len(b))


def _ela_signal(img: "Image.Image") -> dict:
    """Re-save as JPEG at quality 90 and look at how unevenly the error is spread over blocks."""
    rgb = img.convert("RGB")
    buf = io.BytesIO()
    rgb.save(buf, "JPEG", quality=90)
    buf.seek(0)
    re_img = Image.open(buf).convert("RGB")
    diff = np.asarray(ImageChops.difference(rgb, re_img).convert("L"), dtype=np.float32)
    h, w = diff.shape
    bs = 16
    hh, ww = (h // bs) * bs, (w // bs) * bs
    if hh < bs * 4 or ww < bs * 4:
        return {"ela_unevenness": None, "ela_flag": False}
    blocks = diff[:hh, :ww].reshape(hh // bs, bs, ww // bs, bs).mean(axis=(1, 3)).flatten()
    mean = float(blocks.mean())
    cv = float(blocks.std() / (mean + 1e-6))  # how uneven the re-compression error is over the picture
    return {"ela_unevenness": round(cv, 3), "ela_flag": bool(cv > 1.05 and mean > 0.05)}


def analyze_image(data: bytes, doc_type: str | None = None, text: str | None = None,
                  known_hashes: dict[str, Any] | None = None, known_ahashes: dict[str, Any] | None = None) -> dict:
    """Analyse one uploaded image. known_hashes maps sha256 -> id of an earlier document (other cases)."""
    notes: list[str] = []
    kind = sniff_kind(data)
    sha = sha256_hex(data)
    signals: dict[str, Any] = {
        "blur_score": None, "is_blurry": None,
        "qr": {"found": None, "payload": None, "valid": None},
        "cnic_numbers": [], "duplicate_of": None, "edit_signs": [], "confidence": 0.0,
        "sha256": sha, "kind": kind, "notes": notes,
    }
    # exact duplicate by hash
    if known_hashes and sha in known_hashes:
        signals["duplicate_of"] = str(known_hashes[sha])

    # numbers found in text the caller supplied (no OCR is available here)
    if text:
        found = []
        for m in CNIC_IN_TEXT.finditer(text[:20000]):
            digits = re.sub(r"\D", "", m.group(1))
            v = validate_cnic(digits)
            found.append({"cnic": format_cnic(digits), "format_valid": v["valid"], "problems": v["problems"]})
        signals["cnic_numbers"] = [f["cnic"] for f in found]   # plain strings (web contract)
        signals["cnic_checks"] = found
    else:
        notes.append("no OCR available: CNIC numbers are only read from supplied text")

    gray: np.ndarray | None = None
    img = None
    if kind in ("png", "jpeg") and PIL_OK:
        try:
            Image.MAX_IMAGE_PIXELS = MAX_PIXELS
            img = Image.open(io.BytesIO(data))
            if img.width * img.height > MAX_PIXELS:
                raise ValueError("image too large")
            img.load()
            gray = np.asarray(img.convert("L"), dtype=np.float32)
        except Exception:
            notes.append("image could not be decoded")
            img = None
    elif kind == "png":
        gray = _decode_png_gray(data)
        if gray is None:
            notes.append("png decoder fallback could not read this file")
    elif kind == "jpeg":
        notes.append("unavailable: Pillow is not installed, JPEG cannot be decoded")
    elif kind == "pdf":
        notes.append("PDF is stored but not analysed")
    else:
        notes.append("unknown file type")

    if gray is None:
        return _finish(signals, 0.0, unavailable=True, doc_type=doc_type)

    h, w = gray.shape
    signals["width"], signals["height"] = int(w), int(h)
    small = _resize_gray(gray, 800)
    lv = laplacian_variance(small)
    signals["laplacian_variance"] = round(lv, 2)
    signals["blur_score"] = round(float(1.0 - min(1.0, lv / (BLUR_VAR_THRESHOLD * 4))), 3)
    signals["is_blurry"] = bool(lv < BLUR_VAR_THRESHOLD)
    ah = ahash(small)
    signals["ahash"] = ah
    if known_ahashes and not signals["duplicate_of"]:
        for other_hash, other_id in known_ahashes.items():
            if hamming(ah, other_hash) <= 3:
                signals["duplicate_of"] = str(other_id)
                notes.append("near-duplicate image (same picture, different file)")
                break

    edit_signs: list[str] = []
    if img is not None and kind == "jpeg" and min(h, w) < 300:
        notes.append("image too small for error-level analysis")
    elif img is not None and kind == "jpeg":
        try:
            ela = _ela_signal(img)
            signals.update(ela)
            if ela["ela_flag"]:
                edit_signs.append("uneven_compression_error")
        except Exception:
            notes.append("ELA could not run")
        try:
            exif = img.getexif()
            sw = str(exif.get(305, "") or "")  # 305 = Software tag
            if sw and EDIT_SOFTWARE.search(sw):
                edit_signs.append(f"editing_software:{sw[:40]}")
            signals["exif_software"] = sw[:60] or None
        except Exception:
            pass
    elif kind == "png":
        notes.append("ELA is only meaningful for JPEG photos")
        if img is not None:
            sw = str((img.info or {}).get("Software", ""))
            if sw and EDIT_SOFTWARE.search(sw):
                edit_signs.append(f"editing_software:{sw[:40]}")
    signals["edit_signs"] = edit_signs

    # optional QR
    if CV2_OK and gray is not None:
        try:
            arr = np.clip(gray, 0, 255).astype(np.uint8)
            payload, pts, _ = cv2.QRCodeDetector().detectAndDecode(arr)
            signals["qr"] = {"found": bool(pts is not None and len(payload) > 0), "payload": payload or None, "valid": None}
        except Exception:
            signals["qr"]["note"] = "qr detector failed"
    else:
        signals["qr"]["note"] = "QR detection needs OpenCV, which is not installed"

    res_factor = min(1.0, min(h, w) / 500.0)
    sharp = 1.0 - signals["blur_score"]
    conf = round(max(0.0, min(1.0, res_factor * (0.25 + 0.75 * sharp))), 3)
    return _finish(signals, conf, doc_type=doc_type)


def _finish(signals: dict, conf: float, unavailable: bool = False, doc_type: str | None = None) -> dict:
    signals["confidence"] = conf
    if unavailable:
        verdict = "ask_better_photo"
    elif signals["duplicate_of"] or signals["edit_signs"]:
        verdict = "suspicious"
    elif signals["is_blurry"] or conf < 0.5:
        verdict = "ask_better_photo"
    else:
        verdict = "ok"
    return {"signals": signals, "verdict": verdict}


def validate_upload(filename: str | None, data: bytes, max_bytes: int = MAX_BYTES) -> tuple[bool, str, str | None]:
    """Return (ok, reason, kind). Size and type are checked by content, not by the file name."""
    if not data:
        return False, "empty file", None
    if len(data) > max_bytes:
        return False, f"file is larger than {max_bytes // (1024 * 1024)} MB", None
    kind = sniff_kind(data)
    if kind not in ("png", "jpeg", "pdf"):
        return False, "only PNG, JPEG or PDF files are accepted", kind
    return True, "ok", kind
