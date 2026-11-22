"""The card photo vs the registry record: each mismatch has its own reason; a clean match changes nothing."""
from app.docs import ocr
from app.engine.decide import decide
from app.engine.facts import make_facts


def _facts(card):
    card = {"face_found": None, "face_match": None, **card}
    return make_facts({
        "person": {"gender": "F", "cnic_valid": True, "cnic_expired": False, "deceased": False, "age": 40},
        "household": {"size_match": True, "pmt_score": 15.0, "members": 4, "flags": {k: False for k in ("gov_employee", "owns_vehicle", "tax_filer", "foreign_trips", "high_phone_bill")}},
        "payout": {"shared_with_other_households": False, "changed_within_days": None, "owner_is_helper": False},
        "doc": {"required_missing": False, "any_blurry": False, "any_edited": False, "min_confidence": 1.0, "missing_types": [], "blurry_types": []},
        "identity": {"band": "SAME", "score": 1.0, "duplicate": False}, "claim": {"amount": 13500, "ask_more_count": 0},
        "consent": {"active": True, "detail": "x"}, "scam": {"flag": False}, "card": card})


def test_match_still_approves():
    d = decide(_facts({"read": True, "number_match": True, "name_match": True}))
    assert (d.zone, d.result) == ("AUTO", "APPROVE")
    assert any(c.name == "card_vs_record" and c.verdict == "pass" for c in d.checks)


def test_each_mismatch_goes_to_a_person_with_its_own_reason():
    for card, code in (({"read": True, "number_match": False, "name_match": True}, "R_CARD_NUMBER_MISMATCH"),
                       ({"read": True, "number_match": True, "name_match": False}, "R_CARD_NAME_MISMATCH"),
                       ({"read": True, "number_match": False, "name_match": False}, "R_CARD_BOTH_MISMATCH")):
        d = decide(_facts(card))
        assert d.zone == "HUMAN" and d.reason_code == code, (card, d.reason_code)
        assert d.explain_citizen["en"] and d.explain_citizen["ur"]


def test_unreadable_card_asks_for_a_better_photo():
    d = decide(_facts({"read": False, "number_match": None, "name_match": None}))
    assert d.zone == "ASK_MORE" and d.reason_code == "R_CARD_UNREADABLE" and d.next_step.doc_type == "cnic_front"


def test_card_check_not_run_changes_nothing():
    d = decide(_facts({"read": None, "number_match": None, "name_match": None}))
    assert (d.zone, d.result) == ("AUTO", "APPROVE")


def test_compare_with_record_is_forgiving_about_format_not_about_content():
    card = {"read": True, "name": "ZAINAB  BIBI", "cnic_digits": "4130190000112"}
    rec = {"cnic": "4130190000112", "name_roman": "Zainab Bibi"}
    assert ocr.compare_with_record(card, rec) == {"read": True, "number_match": True, "name_match": True}
    assert ocr.compare_with_record({**card, "name": "ZainabBibi"}, rec)["name_match"] is True          # the reader dropped the space
    assert ocr.compare_with_record({**card, "name": "Zubaida Khatoon"}, rec)["name_match"] is False
    assert ocr.compare_with_record({**card, "cnic_digits": "4130190000999"}, rec)["number_match"] is False
    assert ocr.compare_with_record({"read": False}, rec)["number_match"] is None


def test_every_combination_of_mismatches_has_its_own_reason():
    want = {("face",): "R_CARD_FACE_MISMATCH", ("face", "name"): "R_CARD_FACE_NAME_MISMATCH", ("face", "number"): "R_CARD_FACE_NUMBER_MISMATCH",
            ("face", "name", "number"): "R_CARD_ALL_MISMATCH", ("name", "number"): "R_CARD_BOTH_MISMATCH"}
    for combo, code in want.items():
        card = {"read": True, "number_match": "number" not in combo, "name_match": "name" not in combo, "face_found": True, "face_match": "face" not in combo}
        d = decide(_facts(card))
        assert d.zone == "HUMAN" and d.reason_code == code, (combo, d.reason_code)
        assert d.explain_citizen["en"] and d.explain_citizen["ur"]
        chk = next(c for c in d.checks if c.name == "card_vs_record")
        assert chk.verdict == "fail" and all(w in chk.detail for w in combo)


def test_face_matches_alone_still_approves_and_no_face_on_card_asks_again():
    d = decide(_facts({"read": True, "number_match": True, "name_match": True, "face_found": True, "face_match": True}))
    assert (d.zone, d.result) == ("AUTO", "APPROVE")
    d = decide(_facts({"read": True, "number_match": True, "name_match": True, "face_found": False, "face_match": None}))
    assert d.zone == "ASK_MORE" and d.reason_code == "R_CARD_UNREADABLE"


def test_face_compare_never_guesses():
    from app.docs import face
    assert face.compare(b"not an image", None)["checked"] is False          # no record photo: the check does not run
    if face.available():
        assert face.compare(b"not an image", open(face.MODEL_DIR.parent.parent.parent / "db/seed/photos/4130190000112.jpg", "rb").read())["checked"] in (True, False)


def test_household_size_that_did_not_match_goes_to_a_person():
    f = _facts({"read": True, "number_match": True, "name_match": True})
    f["household"]["size_match"] = False
    d = decide(f)
    assert d.zone == "HUMAN" and d.reason_code == "R_HOUSEHOLD_MISMATCH"
    f["household"]["size_match"] = True
    assert decide(f).result == "APPROVE"


def test_the_card_side_is_recognised_so_a_wrong_side_is_not_accepted():
    from app.docs.samples import make_card_back, make_card_front
    if not ocr.available():
        return
    back, front = make_card_back(), make_card_front("Zainab Bibi", "Ghulam Mustafa Chandio", "41301-9000011-2")
    assert ocr.read_card_back(back)["read"] is True
    assert ocr.read_card_back(front) == {"available": True, "read": False, "side": "front"}     # a front sent as the back
    got = ocr.read_card_front(back)
    assert got["read"] is False and got["side"] == "back"                                       # a back sent as the front
    assert ocr.read_card_front(front)["read"] is True


def test_staff_ask_for_proof_message_is_bilingual_when_standard():
    """The standard 'send it again' words come in Urdu too (with a recorded voice); words the admin typed stay as typed."""
    from app.routers.cases import OfficerIn, _ask_text
    std = _ask_text(OfficerIn(decision="ask_more", note="Please upload the back of your ID card again.", doc_type="cnic_back"))
    assert std["std"] == "cnic_back" and std["ur"] != std["en"] and std["officer"] == "1"
    own = _ask_text(OfficerIn(decision="ask_more", note="Your photo is dark, retake it.", doc_type="cnic_front"))
    assert own["en"] == own["ur"] == "Your photo is dark, retake it." and "std" not in own
