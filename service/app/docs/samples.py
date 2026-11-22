"""Make SYNTHETIC CNIC-like sample images (never a real document) for tests and the evaluation.

Needs Pillow. Each image is a plain card with text-like blocks and a fake number.
"""
from __future__ import annotations

import io
import random

try:
    from PIL import Image, ImageDraw, ImageFilter

    PIL_OK = True
except Exception:  # pragma: no cover
    PIL_OK = False


def _card(seed: int, w: int = 1000, h: int = 640) -> "Image.Image":
    rnd = random.Random(seed)
    img = Image.new("RGB", (w, h), (236, 240, 232))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, w - 20, h - 20], outline=(30, 80, 50), width=6)
    d.text((40, 36), "SYNTHETIC SAMPLE - NOT A REAL ID", fill=(160, 20, 20))
    for i in range(14):  # text-like strokes
        y = 90 + i * 34
        x = 50
        while x < w - 120:
            ww = rnd.randint(14, 70)
            d.rectangle([x, y, x + ww, y + rnd.randint(6, 14)], fill=(rnd.randint(10, 60),) * 3)
            x += ww + rnd.randint(8, 24)
    d.text((60, h - 90), "42101-9000021-1", fill=(10, 10, 10))
    # a little fixed grain so every region has natural detail
    px = img.load()
    for _ in range(w * h // 12):
        x, y = rnd.randrange(w), rnd.randrange(h)
        r, g, b = px[x, y]
        n = rnd.randint(-8, 8)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return img


def _bytes(img: "Image.Image", fmt: str, **kw) -> bytes:
    buf = io.BytesIO()
    img.save(buf, fmt, **kw)
    return buf.getvalue()


def make_sample(kind: str, seed: int = 1) -> bytes:
    """kind: clean | blurry | edited | edited_software | tiny | clean_png | blurry_png"""
    img = _card(seed)
    if kind == "clean":
        return _bytes(img, "JPEG", quality=92)
    if kind == "clean_png":
        return _bytes(img, "PNG")
    if kind == "blurry":
        return _bytes(img.filter(ImageFilter.GaussianBlur(5)), "JPEG", quality=92)
    if kind == "blurry_png":
        return _bytes(img.filter(ImageFilter.GaussianBlur(5)), "PNG")
    if kind == "tiny":
        return _bytes(img.resize((120, 76)), "JPEG", quality=90)
    if kind in ("edited", "edited_software"):
        base = Image.open(io.BytesIO(_bytes(img, "JPEG", quality=65))).convert("RGB")  # earlier compression
        patch = _card(seed + 99).crop((100, 100, 420, 200))  # fresh, never compressed
        base.paste(patch, (380, 250))
        if kind == "edited_software":
            exif = Image.Exif()
            exif[305] = "Adobe Photoshop 25.0"
            return _bytes(base, "JPEG", quality=95, exif=exif)
        return _bytes(base, "JPEG", quality=95)
    raise ValueError(kind)


# ---------------------------------------------------------------- a readable card in the agreed Sahara layout (docs/CARD_FORMAT.md)
def _font(bold: bool, size: int):
    from PIL import ImageFont

    for name in (("arialbd.ttf" if bold else "arial.ttf"), ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default(size)


def make_card_back(address: str = "House 14, Street 3, Mohalla Chandio, Larkana, Sindh", cnic: str = "41301-9000011-2", seed: int = 1) -> bytes:
    """A made-up ID card BACK (addresses, issue date, barcode lines). Never a real document."""
    import numpy as np

    img = Image.new("RGB", (1000, 640), (226, 238, 226))
    d = ImageDraw.Draw(img)
    d.rectangle([14, 14, 986, 626], outline=(24, 90, 56), width=6)
    d.rectangle([14, 14, 986, 96], fill=(24, 90, 56))
    d.text((40, 32), "ISLAMIC REPUBLIC OF PAKISTAN", fill="white", font=_font(True, 34))
    d.text((40, 104), "SAMPLE FOR DEMO - NOT A REAL ID", fill=(170, 20, 20), font=_font(True, 20))
    d.text((40, 140), "Permanent Address", fill=(70, 90, 70), font=_font(False, 22))
    d.text((40, 172), address, fill=(15, 15, 15), font=_font(True, 28))
    d.text((40, 240), "Present Address", fill=(70, 90, 70), font=_font(False, 22))
    d.text((40, 272), address, fill=(15, 15, 15), font=_font(True, 28))
    d.text((40, 350), "Date of Issue: 01.01.2020", fill=(15, 15, 15), font=_font(False, 26))
    for i in range(40):
        d.rectangle([40 + i * 9, 470, 40 + i * 9 + (3 if i % 3 else 6), 580], fill=(20, 20, 20))
    d.text((420, 500), cnic, fill=(15, 15, 15), font=_font(False, 30))
    a = np.asarray(img.filter(ImageFilter.GaussianBlur(0.9))).astype(np.float32)
    a += np.random.default_rng(seed).normal(0, 14, a.shape)
    return _bytes(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), "JPEG", quality=85)


def make_card_front(name: str, father: str, cnic: str, dob: str = "01.01.1978", expiry: str = "31.12.2030", gender: str = "F", seed: int = 1,
                    photo: bytes | None = None) -> bytes:
    """A made-up ID card front that the card reader can read. `cnic` like 41301-9000011-2. Never a real document."""
    import numpy as np

    img = Image.new("RGB", (1000, 640), (226, 238, 226))
    d = ImageDraw.Draw(img)
    d.rectangle([14, 14, 986, 626], outline=(24, 90, 56), width=6)
    d.rectangle([14, 14, 986, 96], fill=(24, 90, 56))
    d.text((40, 32), "ISLAMIC REPUBLIC OF PAKISTAN", fill="white", font=_font(True, 34))
    d.text((640, 60), "National Identity Card", fill=(230, 245, 230), font=_font(False, 24))
    d.text((40, 104), "SAMPLE FOR DEMO - NOT A REAL ID", fill=(170, 20, 20), font=_font(True, 20))
    y = 150
    for k, v in (("Name", name), ("Father Name", father), ("Gender", gender), ("Date of Birth", dob), ("Date of Expiry", expiry)):
        d.text((250, y), k, fill=(70, 90, 70), font=_font(False, 20))
        d.text((250, y + 24), v, fill=(15, 15, 15), font=_font(True, 32))
        y += 78
    d.text((250, y + 6), "Identity Number", fill=(70, 90, 70), font=_font(False, 20))
    d.text((250, y + 30), cnic, fill=(15, 15, 15), font=_font(True, 34))
    if photo:   # the holder's photo, cropped to the card's photo box (185 x 220)
        ph = Image.open(io.BytesIO(photo)).convert("RGB")
        w0, h0 = ph.size
        cw = min(w0, int(h0 * 185 / 220))
        ph = ph.crop(((w0 - cw) // 2, 0, (w0 + cw) // 2, int(cw * 220 / 185))).resize((185, 220))
        img.paste(ph, (40, 150))
        d.rectangle([40, 150, 225, 370], outline=(60, 80, 60), width=3)
    else:       # no photo given: a grey placeholder
        d.rectangle([40, 150, 225, 370], fill=(190, 200, 190), outline=(60, 80, 60), width=3)
        d.ellipse([85, 180, 180, 275], fill=(150, 160, 150))
        d.rectangle([65, 290, 200, 370], fill=(150, 160, 150))
    a = np.asarray(img.filter(ImageFilter.GaussianBlur(0.9))).astype(np.float32)
    a += np.random.default_rng(seed).normal(0, 14, a.shape)   # even phone-photo noise, so the edit check sees one uniform picture
    return _bytes(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), "JPEG", quality=85)
