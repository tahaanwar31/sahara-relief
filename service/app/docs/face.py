"""Face check: the photo printed on the ID card against the photo in the government (mock NADRA) record.

Two small pretrained models from the OpenCV model zoo run on the CPU, no internet needed after install:
  * YuNet  finds the face in a picture (face_detection_yunet_2023mar.onnx, 0.2 MB)
  * SFace  turns an aligned face into 128 numbers (face_recognition_sface_2021dec.onnx, 37 MB)
Two faces are "the same person" when the cosine similarity of their numbers is at least MATCH_AT.

MATCH_AT = 0.50. The model's own paper suggests 0.363, but on our 3 test faces that let one pair of DIFFERENT people through (0.41),
while the same person on a card-sized, noisy print scored 0.78. We chose the stricter line: a wrong "no match" only sends the claim to a person,
a wrong "match" would wave a stranger through. This line was checked on a handful of AI-generated faces, not on a real population.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    import cv2
    import numpy as np

    CV_OK = True
except Exception:  # pragma: no cover
    cv2 = None  # type: ignore
    np = None  # type: ignore
    CV_OK = False

MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "face"
DETECTOR = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
RECOGNIZER = MODEL_DIR / "face_recognition_sface_2021dec.onnx"
MATCH_AT = 0.50

_det: Any = None
_rec: Any = None


def available() -> bool:
    return CV_OK and DETECTOR.exists() and RECOGNIZER.exists() and hasattr(cv2, "FaceDetectorYN") and hasattr(cv2, "FaceRecognizerSF")


def _load() -> None:
    global _det, _rec
    if _det is None:
        _det = cv2.FaceDetectorYN.create(str(DETECTOR), "", (320, 320), 0.8, 0.3, 5000)
        _rec = cv2.FaceRecognizerSF.create(str(RECOGNIZER), "")


def _embed(data: bytes, maxside: int = 640) -> Any:
    """128 numbers for the biggest face in the picture, or None if no face is found."""
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return None
    h, w = img.shape[:2]
    s = min(1.0, maxside / max(h, w))
    if s < 1:
        img = cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]
    _load()
    _det.setInputSize((w, h))
    _, faces = _det.detect(img)
    if faces is None or len(faces) == 0:
        return None
    best = max(faces, key=lambda f: f[2] * f[3])      # the biggest face
    return _rec.feature(_rec.alignCrop(img, best))


def compare(card_photo: bytes, registry_photo: bytes | None) -> dict:
    """{'checked', 'face_found', 'match', 'score'}.  Never raises.
    checked=False means this check did not run (no models, or no photo in the record): nothing is guessed."""
    if not available() or not registry_photo:
        return {"checked": False, "face_found": None, "match": None, "score": None}
    try:
        reg = _embed(registry_photo)
        if reg is None:                       # the record's own photo is unusable: do not blame the person
            return {"checked": False, "face_found": None, "match": None, "score": None}
        got = _embed(card_photo)
        if got is None:
            return {"checked": True, "face_found": False, "match": None, "score": None}
        score = float(_rec.match(reg, got, cv2.FaceRecognizerSF_FR_COSINE))
        return {"checked": True, "face_found": True, "match": score >= MATCH_AT, "score": round(score, 3)}
    except Exception:
        return {"checked": False, "face_found": None, "match": None, "score": None}
