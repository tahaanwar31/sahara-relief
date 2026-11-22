"""A very small json-logic subset, written for this project.

Allowed operators: var, ==, !=, <, <=, >, >=, and, or, !, in, missing.
An expression that evaluates to a truthy value means the rule FIRES.

Design choices (plain words):
- Strict validation: unknown operators, wrong argument counts, too much depth,
  or unknown variable names are refused BEFORE a rule can be saved.
- Safe evaluation: no eval(), no attribute access, no function calls. A comparison
  with a missing value (None) is simply False, so a missing score never "passes".
"""
from __future__ import annotations

from typing import Any

MAX_DEPTH = 8
MAX_NODES = 200

# The facts variables that rule authors may use (CONTRACT section 6, plus a few
# documented additions: consent.*, scam.flag, identity.duplicate, params.*).
ALLOWED_VARS: frozenset[str] = frozenset(
    {
        "person.gender", "person.cnic_valid", "person.cnic_expired", "person.deceased", "person.age",
        "household.pmt_score", "household.members",
        "household.flags.gov_employee", "household.flags.owns_vehicle", "household.flags.tax_filer",
        "household.flags.foreign_trips", "household.flags.high_phone_bill",
        "payout.shared_with_other_households", "payout.changed_within_days", "payout.owner_is_helper",
        "doc.required_missing", "doc.any_blurry", "doc.any_edited", "doc.min_confidence",
        "identity.band", "identity.score", "identity.duplicate",
        "claim.amount",
        # additions (see service/ISSUES.md)
        "consent.active", "scam.flag",
        "params.cutoff", "params.borderline_band", "params.amount", "params.payout_cap",
        "params.second_approver_over",
    }
)

OPERATORS = {"var", "==", "!=", "<", "<=", ">", ">=", "and", "or", "!", "in", "missing"}


class RuleError(ValueError):
    """Raised when an expression is not valid."""


def _is_literal(x: Any) -> bool:
    return x is None or isinstance(x, (bool, int, float, str))


def validate(expr: Any, allowed_vars: frozenset[str] = ALLOWED_VARS) -> None:
    """Raise RuleError if the expression is not a valid rule. Returns None if fine."""
    counter = [0]

    def walk(node: Any, depth: int) -> None:
        counter[0] += 1
        if counter[0] > MAX_NODES:
            raise RuleError("expression is too large")
        if depth > MAX_DEPTH:
            raise RuleError("expression is nested too deeply")
        if _is_literal(node):
            return
        if isinstance(node, list):
            if len(node) > 50:
                raise RuleError("list is too long")
            for item in node:
                walk(item, depth + 1)
            return
        if not isinstance(node, dict) or len(node) != 1:
            raise RuleError("an operator object must have exactly one key")
        op, args = next(iter(node.items()))
        if op not in OPERATORS:
            raise RuleError(f"unknown operator: {str(op)[:40]!r}")
        if op == "var":
            name = args[0] if isinstance(args, list) and args else args
            if not isinstance(name, str):
                raise RuleError("var needs a variable name")
            if name not in allowed_vars:
                raise RuleError(f"unknown variable: {name[:60]!r}")
            if isinstance(args, list) and len(args) > 2:
                raise RuleError("var takes a name and an optional default")
            return
        if op == "missing":
            names = args if isinstance(args, list) else [args]
            if not names or not all(isinstance(n, str) for n in names):
                raise RuleError("missing needs variable names")
            for n in names:
                if n not in allowed_vars:
                    raise RuleError(f"unknown variable: {n[:60]!r}")
            return
        arglist = args if isinstance(args, list) else [args]
        if op == "!":
            if len(arglist) != 1:
                raise RuleError("! takes exactly one argument")
        elif op == "in":
            if len(arglist) != 2:
                raise RuleError("in takes exactly two arguments")
        elif op in ("==", "!=", "<=>"):
            if len(arglist) != 2:
                raise RuleError(f"{op} takes exactly two arguments")
        elif op in ("<", "<=", ">", ">="):
            if len(arglist) not in (2, 3):
                raise RuleError(f"{op} takes two or three arguments")
        elif op in ("and", "or"):
            if len(arglist) < 1:
                raise RuleError(f"{op} needs at least one argument")
        for a in arglist:
            walk(a, depth + 1)

    walk(expr, 0)


def truthy(x: Any) -> bool:
    """json-logic truthiness: empty list/string, 0, None and False are falsy."""
    if isinstance(x, (list, str)):
        return len(x) > 0
    return bool(x)


def get_var(facts: dict, path: str, default: Any = None) -> Any:
    cur: Any = facts
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return default
    return cur


def _num(x: Any) -> float | None:
    if isinstance(x, bool):
        return float(x)
    if isinstance(x, (int, float)):
        return float(x)
    return None


def _equal(a: Any, b: Any) -> bool:
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) == bool(b) if isinstance(a, bool) and isinstance(b, bool) else (a == b)
    na, nb = _num(a), _num(b)
    if na is not None and nb is not None:
        return na == nb
    return str(a) == str(b)


def _compare(op: str, a: Any, b: Any) -> bool:
    na, nb = _num(a), _num(b)
    if na is None or nb is None:
        # strings compare as strings, anything else (None...) is False
        if isinstance(a, str) and isinstance(b, str):
            na, nb = a, b  # type: ignore[assignment]
        else:
            return False
    if op == "<":
        return na < nb  # type: ignore[operator]
    if op == "<=":
        return na <= nb  # type: ignore[operator]
    if op == ">":
        return na > nb  # type: ignore[operator]
    return na >= nb  # type: ignore[operator]


def evaluate(expr: Any, facts: dict) -> Any:
    """Evaluate an already validated expression. Never raises for odd data."""
    if _is_literal(expr):
        return expr
    if isinstance(expr, list):
        return [evaluate(e, facts) for e in expr]
    op, args = next(iter(expr.items()))
    if op == "var":
        if isinstance(args, list):
            return get_var(facts, args[0], args[1] if len(args) > 1 else None)
        return get_var(facts, args)
    if op == "missing":
        names = args if isinstance(args, list) else [args]
        return [n for n in names if get_var(facts, n) is None]
    arglist = args if isinstance(args, list) else [args]
    if op == "and":
        last: Any = True
        for a in arglist:
            last = evaluate(a, facts)
            if not truthy(last):
                return last
        return last
    if op == "or":
        last = False
        for a in arglist:
            last = evaluate(a, facts)
            if truthy(last):
                return last
        return last
    vals = [evaluate(a, facts) for a in arglist]
    if op == "!":
        return not truthy(vals[0])
    if op == "==":
        return _equal(vals[0], vals[1])
    if op == "!=":
        return not _equal(vals[0], vals[1])
    if op == "in":
        needle, hay = vals
        if isinstance(hay, list):
            return any(_equal(needle, h) for h in hay)
        if isinstance(hay, str) and isinstance(needle, str):
            return needle in hay
        return False
    if op in ("<", "<=", ">", ">="):
        if len(vals) == 2:
            return _compare(op, vals[0], vals[1])
        return _compare(op, vals[0], vals[1]) and _compare(op, vals[1], vals[2])
    raise RuleError(f"unknown operator {op}")  # unreachable after validate()


def fires(expr: Any, facts: dict) -> bool:
    """True if the rule expression fires for these facts. Invalid expression -> RuleError."""
    validate(expr)
    return truthy(evaluate(expr, facts))
