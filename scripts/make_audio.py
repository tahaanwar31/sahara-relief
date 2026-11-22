"""Make the Urdu and English audio prompts ahead of time (needs internet once).

Why ahead of time: the free voice tool (edge-tts) only works online, and the citizen app must
speak even when the signal drops. We save mp3 files in web/public/audio/<lang>/<CODE>.mp3 and
the service worker caches them.

    python scripts/make_audio.py              # makes anything missing
    python scripts/make_audio.py --force      # remakes everything

Install once:  pip install edge-tts
Voices: ur-PK-UzmaNeural (Urdu, female) and en-US-JennyNeural (English).
"""
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REASONS = ROOT / "shared" / "reasons.json"
OUT = ROOT / "web" / "public" / "audio"
VOICES = {"ur": "ur-PK-UzmaNeural", "en": "en-US-JennyNeural"}

# Step prompts for the citizen flow. Keep them short and kind.
STEPS = {
    "step_1": {"en": "Welcome. I will help you claim your relief payment. Press the green button to start.",
               "ur": "خوش آمدید۔ میں آپ کی امدادی رقم کے دعوے میں مدد کروں گا۔ شروع کرنے کے لیے سبز بٹن دبائیں۔"},
    "step_2": {"en": "May we look at your details to check your claim? You can take your permission back at any time.",
               "ur": "کیا ہم آپ کے دعوے کی جانچ کے لیے آپ کی تفصیلات دیکھ سکتے ہیں؟ آپ کسی بھی وقت اپنی اجازت واپس لے سکتے ہیں۔"},
    "step_3": {"en": "Type your ID card number. We will find your record. Then check the details and press yes if it is you.",
               "ur": "اپنا شناختی کارڈ نمبر لکھیں۔ ہم آپ کا ریکارڈ ڈھونڈیں گے۔ پھر تفصیل دیکھیں اور اگر یہ آپ ہیں تو جی ہاں دبائیں۔"},
    "step_4": {"en": "How many people live in your household? Type the number and press check.",
               "ur": "آپ کے گھرانے میں کتنے افراد رہتے ہیں؟ تعداد لکھیں اور جانچیں دبائیں۔"},
    "step_5": {"en": "Please take a clear photo of each paper. Use good light.",
               "ur": "براہ کرم ہر کاغذ کی صاف تصویر لیں۔ اچھی روشنی استعمال کریں۔"},
    "step_6": {"en": "Please type your correct account number. Check it carefully before you press continue.",
               "ur": "براہ کرم اپنا درست اکاؤنٹ نمبر لکھیں۔ جاری رکھیں دبانے سے پہلے اسے غور سے دیکھ لیں۔"},
    "step_7": {"en": "Press send to finish your claim.",
               "ur": "اپنا دعویٰ مکمل کرنے کے لیے بھیجیں دبائیں۔"},
    "saved": {"en": "Your progress is saved. You can continue later.",
              "ur": "آپ کی پیش رفت محفوظ ہے۔ آپ بعد میں جاری رکھ سکتے ہیں۔"},
}


def prompts():
    reasons = json.loads(REASONS.read_text(encoding="utf-8"))
    for code, v in reasons["decision"].items():
        yield code, v
    for code, v in reasons["scam"].items():
        yield "SCAM_" + code, v
    for code, v in STEPS.items():
        yield code, v


def manifest():
    """The web app lists every prompt it can speak (keys, language, text, file). We make exactly those files."""
    import subprocess
    out = subprocess.run(["node", "scripts/audio_manifest.mjs"], cwd=ROOT / "web", capture_output=True, text=True, encoding="utf-8", check=True).stdout
    return json.loads(out)["prompts"]


async def main(force: bool):
    try:
        import edge_tts
    except ImportError:
        sys.exit("edge-tts is not installed. Run: pip install edge-tts (needs internet)")
    made = skipped = 0
    for p in manifest():
        target = ROOT / "web" / "public" / p["file"]
        if target.exists() and not force:
            skipped += 1
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        await edge_tts.Communicate(p["text"], VOICES[p["lang"]]).save(str(target))
        made += 1
    print(f"done: {made} made, {skipped} already there")


if __name__ == "__main__":
    asyncio.run(main("--force" in sys.argv))
