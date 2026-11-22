import pytest

from app.engine import jsonlogic as J


def test_basic_operators():
    f = {"household": {"pmt_score": 40, "flags": {"gov_employee": True}}, "person": {"age": 30}}
    assert J.fires({">": [{"var": "household.pmt_score"}, 30]}, f)
    assert not J.fires({"<=": [{"var": "household.pmt_score"}, 30]}, f)
    assert J.fires({"and": [{"==": [{"var": "household.flags.gov_employee"}, True]}, {"<": [{"var": "person.age"}, 65]}]}, f)
    assert J.fires({"or": [{"==": [1, 2]}, {"!=": [1, 2]}]}, f)
    assert J.fires({"!": [{"==": [1, 2]}]}, f)
    assert J.fires({"in": [{"var": "person.age"}, [30, 31]]}, f)
    assert J.fires({"<": [1, {"var": "person.age"}, 99]}, f)


def test_missing_and_none_never_pass_a_comparison():
    f = {"household": {"pmt_score": None}}
    assert not J.fires({"<=": [{"var": "household.pmt_score"}, 30]}, f)
    assert not J.fires({">": [{"var": "household.pmt_score"}, 30]}, f)
    assert J.fires({"missing": ["household.pmt_score"]}, f)
    assert not J.fires({"missing": ["person.age"]}, {"person": {"age": 5}})


@pytest.mark.parametrize("bad", [
    {"eval": ["x"]}, {"var": "os.system"}, {"==": [1]}, {"and": []}, {"a": 1, "b": 2}, {"var": 5},
    {"in": [1]}, {"!": [1, 2]}, {"missing": []}, {"<": [1]},
])
def test_strict_validation_refuses(bad):
    with pytest.raises(J.RuleError):
        J.validate(bad)


def test_depth_and_size_limits():
    e = {"==": [1, 1]}
    for _ in range(12):
        e = {"and": [e]}
    with pytest.raises(J.RuleError):
        J.validate(e)
    with pytest.raises(J.RuleError):
        J.validate({"or": [{"==": [1, 1]}] * 300})


def test_no_code_execution_through_strings():
    assert J.evaluate({"==": ["__import__('os')", 1]}, {}) is False
