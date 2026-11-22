import pytest

from app.identity.match import match_records
from app.identity.normalize import name_tokens, parse_date, parse_relation, validate_cnic

A = {"name": "Muhammad Aslam", "father": "Abdul Rehman", "cnic": "4210112345671", "dob": "1978-03-02",
     "district": "Karachi East"}


@pytest.mark.parametrize("variant", ["Mohammad", "Muhammed", "Mohd", "Mohamed", "MUHAMMAD", "muhammad"])
def test_muhammad_variants_normalise_to_one_form(variant):
    assert name_tokens(f"{variant} Aslam")["key"] == "muhammad aslam"


def test_titles_and_spelling_variants():
    assert name_tokens("Syed Ali Raza")["key"] == name_tokens("Sayyid Ali Raza")["key"] == "ali raza"
    assert name_tokens("Zainab Bibi")["key"] == name_tokens("Zeinab Begum")["key"]
    assert name_tokens("Hussain")["key"] == name_tokens("Hussein")["key"]


def test_relation_parsing():
    r = parse_relation("W/O Late Ghulam Mustafa Chandio")
    assert r["relation"] == "W/O" and r["late"] and r["name"] == "Ghulam Mustafa Chandio"
    assert parse_relation("S/O Nazir")["relation"] == "S/O"


def test_dates_many_formats():
    assert parse_date("1978-03-02")["candidates"][0] == "1978-03-02"
    assert parse_date("02/03/1978")["candidates"][0] == "1978-03-02"
    assert parse_date("2 March 1978")["candidates"][0] == "1978-03-02"
    assert parse_date("March 2, 1978")["candidates"][0] == "1978-03-02"
    assert parse_date("1978")["precision"] == "year"
    assert parse_date("13/02/1978")["candidates"] == ["1978-02-13"]
    assert parse_date("nonsense")["precision"] is None


def test_cnic_validation_and_gender_digit():
    assert validate_cnic("42101-9000021-1", gender="M")["valid"]
    assert not validate_cnic("42101-9000021-1", gender="F")["valid"]       # odd last digit for a woman
    assert not validate_cnic("123")["valid"]
    assert not validate_cnic("0000000000000")["valid"]


def test_example_from_contract_is_same_person_on_strong_ids():
    b = {"name": "Mohd Aslam", "father": "Abd ur Rehman", "cnic": None, "dob": "02/03/1978", "district": "Karachi East"}
    r = match_records(A, b)
    assert r["band"] == "SAME" and r["score"] > 0.85
    fields = {e["field"]: e["agree"] for e in r["evidence"]}
    assert fields["cnic"] == "missing" and fields["name"] == "yes"


def test_never_same_on_name_alone():
    r = match_records({"name": "Muhammad Aslam"}, {"name": "Mohammad Aslam"})
    assert r["band"] == "MAYBE" and r["reason_code"] == "R_NAME_AMBIGUOUS"
    assert r["score"] < 0.7


def test_different_cnic_same_everything_else_is_maybe_not_same():
    a = {"name": "Shazia Kanwal", "father": "W/O Ahmed Nawaz", "cnic": "37405-9000141-2", "dob": "1987", "district": "Rawalpindi"}
    b = dict(a, cnic="37405-9000142-6")
    r = match_records(a, b)
    assert r["band"] == "MAYBE"


def test_disagreement_on_dob_or_father_blocks_same():
    b = dict(A, dob="1990-05-05")
    assert match_records(A, b)["band"] != "SAME"
    b = dict(A, father="Rashid Mehmood")
    assert match_records(A, b)["band"] != "SAME"


def test_different_people_with_similar_names():
    r = match_records({"name": "Muhammad Ahmed Qureshi"}, {"name": "Muhammad Ahmed Khan"})
    assert r["band"] != "SAME"
    r = match_records({"name": "Ali Raza", "cnic": "3520290000513"}, {"name": "Sakina Bano", "cnic": "4310190000418"})
    assert r["band"] == "DIFFERENT"


def test_missing_field_is_neutral():
    full = match_records(A, dict(A))
    partial = match_records(A, {"name": "Muhammad Aslam", "cnic": "4210112345671"})
    assert full["band"] == "SAME" and partial["band"] == "SAME"


@pytest.mark.parametrize("a,b", [
    ({}, {}), (None, None), ({"name": ""}, {"name": ""}), ({"name": "x" * 10000}, {"name": "y" * 10000}),
    ({"name": "<script>alert(1)</script>"}, {"name": "<script>alert(1)</script>"}),
    ({"name": "محمد اسلم"}, {"name": "Muhammad Aslam"}), ({"name": "محمد اسلم"}, {"name": "محمد اسلم"}),
    ({"name": 123, "cnic": [1, 2], "dob": {"x": 1}}, {"name": None, "father": 5.5}),
    ({"name": "\x00\x01\x02", "dob": "9999-99-99"}, {"name": "A", "cnic": "abc"}),
])
def test_fuzz_never_crashes_and_never_echoes_raw_html(a, b):
    r = match_records(a, b)
    assert r["band"] in ("SAME", "MAYBE", "DIFFERENT") and 0 <= r["score"] <= 1
    for e in r["evidence"]:
        for k in ("a", "b"):
            assert e[k] is None or "<script" not in e[k]


def test_empty_is_not_same():
    assert match_records({}, {})["band"] == "MAYBE"
    assert match_records({"name": ""}, {"name": ""})["band"] == "MAYBE"


def test_urdu_script_against_roman_is_only_close():
    r = match_records({"name": "محمد اسلم", "cnic": "4210190000211"}, {"name": "Muhammad Aslam", "cnic": "4210190000211"})
    assert r["band"] == "SAME"  # strong id agrees, the name is only 'close' across scripts
    assert [e for e in r["evidence"] if e["field"] == "name"][0]["agree"] in ("close", "yes")
