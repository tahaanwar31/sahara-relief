"""Scam message classifier: TF-IDF character n-grams + rule features -> logistic regression.

HONEST LIMITS: trained on ~480 SYNTHETIC messages written for this prototype (English,
Roman Urdu, Urdu script). It shows the machinery; it is not proof of accuracy on real SMS.
It only WARNS (safe / suspicious / scam). It never blocks and never deletes.
"""
from __future__ import annotations

import re
from functools import lru_cache

import numpy as np
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from ..engine.reasons import scam_reasons
from . import data as D

MODEL_VERSION = "scam-tfidf-lr-synth-v1"
MAX_TEXT = 2000
LABELS = ["safe", "suspicious", "scam"]

# ---- rule features ------------------------------------------------------------------
_NEG = re.compile(r"(\bnever\b|\bdon'?t\b|\bdo not\b|\bdont\b|\bnot\b|\bnobody\b|\bno one\b|\bna\b|\bnahi\b|\bnahin\b|\bmat\b|\bkabhi\b|نہ|نہیں|کبھی|مت|کوئی نہیں)", re.I)
_VERB = re.compile(r"(send|share|give|reply|enter|tell|provide|submit|type|forward|write|bhej|bata|batao|batayen|dein|den\b|dijiye|likh|"
                   r"daal|karen|بھیج|بتا|دیں|شیئر|لکھ|ڈال)", re.I)
_PINOTP = re.compile(r"(\bpin\b|\botp\b|password|passcode|verification code|6[- ]?digit code|\bcode\b|پن|او ٹی پی|پاس ورڈ|کوڈ)", re.I)
_CNIC = re.compile(r"(cnic|id card|identity card|shanakhti|shanakhati|national id|شناختی)", re.I)
_FEE = re.compile(r"((processing|registration|clearance|release|delivery|verification|courier|tax|admin)\s*(fee|fees|charges?)|"
                  r"\bfees?\b|charges\b|\bjama\s*kar|\bpay\s+rs|deposit\s+rs|send\s+rs|easypaisa\s+to|jazzcash\s+to|فیس|چارجز|جمع کر)", re.I)
_NOFEE = re.compile(r"(no fee|free of charge|\bis free\b|this is free|koi fee|fees nahi|fee nahi|bilkul muft|muft\b|مفت|کوئی فیس نہیں|فیس نہیں|"
                    r"no charge|no fees|nobody will ask)", re.I)
_URGENT = re.compile(r"(urgent|immediately|right now|within \d+ ?(hours|hrs)|\b\d+ ?(hours|ghant)|today only|last chance|expires today|"
                     r"will be blocked|be blocked|block ho|band ho|disabled|suspended|final warning|foran|fori|abhi\b|jaldi|warna|"
                     r"فوراً|فوری|ابھی|بلاک|ورنہ|منجمد)", re.I)
_PRIZE = re.compile(r"(\bwon\b|winner|congrat|lottery|prize|lucky|mubarak|inaam|inam|jeeta|nikli|nikal|free money|"
                    r"claim (your|today|now)|مبارک|انعام|لاٹری|نکل)", re.I)
_URL = re.compile(r"(https?://[^\s]+|www\.[^\s]+|\b[a-z0-9\-]+\.(xyz|top|click|info|help|cc|ly|link|site|online|tk)\b[^\s]*|"
                  r"\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl)/[^\s]*)", re.I)
_PHONE = re.compile(r"\b0?3\d{2}[- ]?\d{7}\b")


def _asks(keyword_re: re.Pattern, text: str) -> bool:
    """True if the text ASKS for the thing: a verb near the keyword that is not negated.

    "Never share your PIN" and "PIN kisi ko na batayen" are warnings, not requests.
    """
    for m in keyword_re.finditer(text):
        before = text[max(0, m.start() - 45): m.start()]
        if _NEG.search(before[-25:]):
            continue
        lo, hi = max(0, m.start() - 45), m.end() + 45
        for v in _VERB.finditer(text[lo:hi]):
            vs = lo + v.start()
            if not _NEG.search(text[max(0, vs - 18): vs]):
                return True
    return False


def has_unofficial_link(text: str) -> bool:
    for m in _URL.finditer(text):
        u = m.group(0).lower()
        if not any(d in u for d in D.OFFICIAL_DOMAINS):
            return True
    return False


RULE_NAMES = ["asks_fee", "asks_pin_otp", "asks_cnic", "urgent", "suspicious_link", "prize", "sender_not_official",
              "official_sender", "unknown_phone"]


def rule_features(text: str, sender: str | None) -> dict[str, int]:
    t = text[:MAX_TEXT]
    s = (sender or "").strip()
    official = s == D.OFFICIAL_SENDER
    f = {
        "asks_fee": int(bool(_FEE.search(t)) and not _NOFEE.search(t)),
        "asks_pin_otp": int(_asks(_PINOTP, t)),
        "asks_cnic": int(_asks(_CNIC, t) or bool(re.search(r"photo of (both sides of )?(your )?cnic|cnic ki (photo|tasveer)", t, re.I))),
        "urgent": int(bool(_URGENT.search(t))),
        "suspicious_link": int(has_unofficial_link(t)),
        "prize": int(bool(_PRIZE.search(t))),
        "sender_not_official": int(bool(s) and not official),
        "official_sender": int(official),
        "unknown_phone": int(bool(_PHONE.search(t))),
    }
    return f


def _prep(text: str) -> str:
    t = text[:MAX_TEXT].lower()
    t = _URL.sub(" xurlx ", t)
    t = re.sub(r"\d+", "0", t)
    return t


class ScamModel:
    def __init__(self, seed: int = 7) -> None:
        self.vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=2, max_features=30000)
        self.clf = LogisticRegression(C=8.0, max_iter=2000, random_state=seed)
        self.trained_on = 0

    def _matrix(self, texts: list[str], senders: list[str | None], fit: bool = False):
        prepped = [_prep(t) for t in texts]
        X_text = self.vec.fit_transform(prepped) if fit else self.vec.transform(prepped)
        rules = np.array([[rule_features(t, s)[n] for n in RULE_NAMES] for t, s in zip(texts, senders)], dtype=float)
        return hstack([X_text, csr_matrix(rules * 1.5)]).tocsr()

    def fit(self, rows: list[dict]) -> "ScamModel":
        X = self._matrix([r["text"] for r in rows], [r.get("sender") for r in rows], fit=True)
        self.clf.fit(X, [r["label"] for r in rows])
        self.trained_on = len(rows)
        return self

    def proba(self, texts: list[str], senders: list[str | None]) -> np.ndarray:
        X = self._matrix(texts, senders)
        p = self.clf.predict_proba(X)
        order = [list(self.clf.classes_).index(c) for c in LABELS]
        return p[:, order]


@lru_cache(maxsize=1)
def get_model() -> ScamModel:
    return ScamModel().fit(D.generate_training_set())


SCAM_AT = 0.62
SUSPICIOUS_AT = 0.30

ADVICE = {
    "scam": {
        "en": "Do not reply, do not click, do not send money, PIN, OTP or ID number. Delete it or show it to a staff member.",
        "ur": "جواب نہ دیں، لنک پر کلک نہ کریں، رقم، پن، او ٹی پی یا شناختی نمبر نہ بھیجیں۔ اسے ڈیلیٹ کریں یا عملے کو دکھائیں۔",
    },
    "suspicious": {
        "en": "Be careful. Do not share personal details. Check with the official helpline or a staff member first.",
        "ur": "احتیاط کریں۔ ذاتی تفصیلات نہ بتائیں۔ پہلے سرکاری ہیلپ لائن یا عملے سے پوچھ لیں۔",
    },
    "safe": {
        "en": "Nothing suspicious found. Still, nobody official will ever ask for your PIN or OTP.",
        "ur": "کوئی مشکوک بات نہیں ملی۔ پھر بھی کوئی سرکاری شخص آپ سے پن یا او ٹی پی نہیں مانگے گا۔",
    },
}

_CODE_FOR = {"asks_fee": "ASKS_FEE", "asks_pin_otp": "ASKS_PIN_OR_OTP", "asks_cnic": "ASKS_CNIC", "urgent": "URGENT_LANGUAGE",
             "suspicious_link": "SUSPICIOUS_LINK", "prize": "PRIZE_TOO_GOOD"}


def check_message(text: object, sender: object = None) -> dict:
    """Classify one message. Always returns a result; never raises on odd input."""
    t = text if isinstance(text, str) else ("" if text is None else str(text))
    s = sender if isinstance(sender, str) else ("" if sender is None else str(sender))
    t, s = t[:MAX_TEXT], s[:60]
    if not t.strip():
        return {"label": "safe", "score": 0.0, "reasons": [], "advice": ADVICE["safe"], "model_version": MODEL_VERSION,
                "note": "empty message"}
    m = get_model()
    p = m.proba([t], [s])[0]
    score = float(p[2] + 0.5 * p[1])
    f = rule_features(t, s)
    hard_flags = f["asks_pin_otp"] or f["asks_cnic"] or (f["asks_fee"] and (f["prize"] or f["suspicious_link"]))
    if hard_flags and score < SUSPICIOUS_AT + 0.05:
        score = SUSPICIOUS_AT + 0.05  # a direct ask for PIN/OTP/CNIC is never "safe"
    label = "scam" if score >= SCAM_AT else "suspicious" if score >= SUSPICIOUS_AT else "safe"
    reasons = []
    cat = scam_reasons()
    for name, code in _CODE_FOR.items():
        if f[name]:
            reasons.append({"code": code, "en": cat[code]["en"], "ur": cat[code]["ur"]})
    if f["sender_not_official"] and label != "safe":
        reasons.append({"code": "SENDER_NOT_OFFICIAL", "en": cat["SENDER_NOT_OFFICIAL"]["en"], "ur": cat["SENDER_NOT_OFFICIAL"]["ur"]})
    if label == "safe" and f["official_sender"]:
        reasons.append({"code": "OFFICIAL_SENDER", "en": cat["OFFICIAL_SENDER"]["en"], "ur": cat["OFFICIAL_SENDER"]["ur"]})
    return {"label": label, "score": round(min(1.0, score), 4), "reasons": reasons, "advice": ADVICE[label],
            "model_version": MODEL_VERSION}
