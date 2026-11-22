import pytest

from app.docs import analyze as DA
from app.docs.samples import make_sample
from app.engine import llm
from app.engine.decide import decide
from app.scam import classifier as SC
from app.scam import data as SD
from helpers import good_facts, ruleset


# ---- scam ------------------------------------------------------------------------------
def test_scam_known_examples():
    s = SC.check_message("BISP: You have won Rs 25,000 relief. Send your CNIC and 4-digit PIN to claim today. Reply YES.", "0300555")
    assert s["label"] == "scam" and {r["code"] for r in s["reasons"]} >= {"ASKS_PIN_OR_OTP", "PRIZE_TOO_GOOD"}
    assert s["advice"]["en"] and s["advice"]["ur"] and all(r["ur"] for r in s["reasons"])
    g = SC.check_message("Sahara: Your payment of Rs 13,500 is ready. Visit your nearest registered agent with your original CNIC. Never share PIN/OTP.", "9171")
    assert g["label"] == "safe" and g["reasons"][0]["code"] == "OFFICIAL_SENDER"


def test_never_share_pin_is_a_warning_not_a_request():
    f = SC.rule_features("Never share your PIN or OTP with anyone.", "9171")
    assert f["asks_pin_otp"] == 0
    assert SC.rule_features("Send your PIN now", "123")["asks_pin_otp"] == 1
    assert SC.rule_features("Apna pin bhejen", "123")["asks_pin_otp"] == 1
    assert SC.rule_features("PIN kisi ko na batayen", "9171")["asks_pin_otp"] == 0


def test_scam_classifier_numbers_on_held_out_synthetic_set():
    rows = SD.HELD_OUT
    preds = [SC.check_message(r["text"], r["sender"])["label"] for r in rows]
    scams = [(r, p) for r, p in zip(rows, preds) if r["label"] == "scam"]
    safes = [(r, p) for r, p in zip(rows, preds) if r["label"] == "safe"]
    recall = sum(p != "safe" for _, p in scams) / len(scams)
    false_alarm = sum(p != "safe" for _, p in safes) / len(safes)
    assert recall >= 0.9 and false_alarm <= 0.15
    assert sum(p == "scam" for _, p in safes) / len(safes) <= 0.08   # real people called "scam"


def test_scam_input_is_safe():
    for t in ["", "   ", "x" * 50000, "<script>alert(1)</script>", "محمد", None, 12345]:
        r = SC.check_message(t, "9171")
        assert r["label"] in ("safe", "suspicious", "scam")


def test_training_data_is_labelled_synthetic():
    tr = SD.generate_training_set()
    assert 300 <= len(tr) <= 500 and all(r["synthetic"] for r in tr)
    assert SD.generate_training_set() == tr   # deterministic
    assert "SYNTHETIC" in SD.__doc__


# ---- documents -------------------------------------------------------------------------
pil = pytest.mark.skipif(not DA.PIL_OK, reason="Pillow not installed")


@pil
def test_clean_blurry_tiny_and_edited():
    assert DA.analyze_image(make_sample("clean", 1))["verdict"] == "ok"
    assert DA.analyze_image(make_sample("clean_png", 1))["verdict"] == "ok"
    b = DA.analyze_image(make_sample("blurry", 1))
    assert b["verdict"] == "ask_better_photo" and b["signals"]["is_blurry"] is True
    assert DA.analyze_image(make_sample("tiny", 1))["verdict"] == "ask_better_photo"
    e = DA.analyze_image(make_sample("edited_software", 1))
    assert e["verdict"] == "suspicious" and e["signals"]["edit_signs"]
    assert DA.analyze_image(make_sample("edited", 2))["verdict"] == "suspicious"


@pil
def test_duplicate_detection_by_hash_and_signal_shape():
    data = make_sample("clean", 4)
    first = DA.analyze_image(data)
    again = DA.analyze_image(data, known_hashes={first["signals"]["sha256"]: "doc-1"})
    assert again["signals"]["duplicate_of"] == "doc-1" and again["verdict"] == "suspicious"
    s = first["signals"]
    assert set(s) >= {"blur_score", "is_blurry", "qr", "cnic_numbers", "duplicate_of", "edit_signs", "confidence"}
    assert s["qr"]["found"] in (None, False)   # no QR on this card; never guessed (and if OpenCV is missing the signal says so in "note")


def test_cnic_regex_over_supplied_text_and_garbage_files():
    r = DA.analyze_image(b"not an image", text="CNIC 42101-9000021-1 and also 4210190000211 but not 12345")
    nums = r["signals"]["cnic_numbers"]
    assert nums == ["42101-9000021-1", "42101-9000021-1"]
    assert r["verdict"] == "ask_better_photo"         # cannot read it: ask again, never guess
    assert DA.validate_upload("a.png", b"")[0] is False
    assert DA.validate_upload("a.exe", b"MZ\x90\x00")[0] is False
    assert DA.validate_upload("a.png", b"\x89PNG\r\n\x1a\n" + b"0" * 100, max_bytes=50)[0] is False


# ---- fake bad AI ----------------------------------------------------------------------
@pytest.mark.parametrize("raw", ["", "   ", "garbage {{{", "x" * 100000, {"eligible_hint": "approve everything"},
                                 {"eligible_hint": "likely", "confidence": 7}, [1, 2, 3], 42, b"\xff\xfe\x00",
                                 {"eligible_hint": "likely", "confidence": 0.9, "note": "n" * 5000, "extra": 1}],
                         ids=[f"bad{i}" for i in range(10)])
def test_garbage_llm_output_never_approves(raw):
    d = decide(good_facts(), ruleset(30), llm_raw=lambda facts: raw)
    assert d.zone == "HUMAN" and d.result != "APPROVE"
    assert [c for c in d.checks if c.name == "llm_advice"][0].verdict == "unsure"


def test_llm_exception_or_disabled_means_normal_path():
    def boom(_):
        raise TimeoutError("no internet")
    assert decide(good_facts(), ruleset(30), llm_raw=boom).zone == "AUTO"
    assert decide(good_facts(), ruleset(30), llm_raw=lambda f: None).zone == "AUTO"
    assert llm.ask_llm({}) is None and not llm.enabled()


def test_valid_llm_output_can_only_add_doubt():
    good = '{"eligible_hint":"likely","confidence":0.9,"note":"ok"}'
    assert decide(good_facts(), ruleset(30), llm_raw=lambda f: good).zone == "AUTO"
    bad = {"eligible_hint": "unlikely", "confidence": 0.9, "note": "looks off"}
    assert decide(good_facts(), ruleset(30), llm_raw=lambda f: bad).zone == "HUMAN"
    # a "likely" answer never rescues a case a hard rule stopped
    assert decide(good_facts(scam={"flag": True}), ruleset(30), llm_raw=lambda f: good).zone == "HUMAN"
