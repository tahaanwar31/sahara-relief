"""Rule-set parameters and the cost maths.

approve_line = 1 - review / wrong_approve        (auto-approve only above this)
reject_line  = review / wrong_reject             (auto-reject only below this, and only if switched on)

The numbers are illustrative assumptions (Build Plan section 4), editable by an admin.
"""
from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class Costs(BaseModel):
    wrong_approve: float = Field(100, gt=0, le=1_000_000)
    wrong_reject: float = Field(20, gt=0, le=1_000_000)
    review: float = Field(3, gt=0, le=1_000_000)
    proof: float = Field(1, ge=0, le=1_000_000)

    @model_validator(mode="after")
    def _sane(self) -> "Costs":
        if self.review >= self.wrong_approve:
            raise ValueError("review cost must be smaller than the wrong-approval cost")
        return self


class RuleParams(BaseModel):
    programme: str = "Sahara Relief Programme (MOCK)"
    cutoff: float = Field(30, ge=0, le=100)
    borderline_band: float = Field(5, ge=0, le=50)
    amount: int = Field(13500, ge=0, le=10_000_000)
    payout_cap: int = Field(29000, ge=0, le=100_000_000)
    auto_reject_enabled: bool = False
    second_approver_over: int = Field(20000, ge=0, le=100_000_000)
    payout_change_days: int = Field(30, ge=0, le=3650)
    max_missing_fields: int = Field(3, ge=0, le=20)
    costs: Costs = Costs()

    model_config = {"extra": "ignore"}


def approve_line(c: Costs) -> float:
    return round(min(1.0, max(0.0, 1.0 - c.review / c.wrong_approve)), 6)


def reject_line(c: Costs) -> float:
    return round(min(1.0, max(0.0, c.review / c.wrong_reject)), 6)


def lines(c: Costs) -> tuple[float, float]:
    """(approve_line, reject_line); the reject line can never sit above the approve line."""
    a = approve_line(c)
    r = min(reject_line(c), a)
    return a, r
