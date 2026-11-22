"""Policy search with sources: TF-IDF retrieval over the (invented) Sahara Relief policy clauses.

No language model is involved: the answer is the clause text and its id, so nothing can be made up.
The clauses are written for this prototype; they are not real BISP rules.
"""
from __future__ import annotations

from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer

CLAUSES = [
    ("P1", "Who can apply", "Any Pakistani citizen aged 18 or more with a valid, unexpired CNIC may apply once per quarter for their household."),
    ("P2", "Survey score", "A household is eligible when its survey score is at or below the cutoff in the active rule set (30 in version 1). Scores within 5 points of the cutoff are checked by a staff member."),
    ("P3", "Exclusions", "A household with a government employee, a registered vehicle, a tax filer, more than one foreign trip in five years, or a high phone bill is sent to a staff member. No household is rejected automatically on one flag."),
    ("P4", "Required papers", "The applicant's CNIC. Widows also need the husband's CNIC copy, a death certificate and a family registration certificate. For an education stipend, the child's B-form. Papers must be clearly readable."),
    ("P5", "Payment", "Rs 13,500 per quarter per eligible household (version 1), paid to the applicant's own CNIC-linked wallet or bank account. The account title must match the CNIC."),
    ("P6", "Payment account rules", "An account shared with other families, recently changed, or owned by a helper is held for a staff member to check."),
    ("P7", "Notifications", "Genuine messages come only from sender code 9171. No genuine message asks for a fee, PIN, OTP or CNIC photo. There is no fee to apply."),
    ("P8", "Consent", "Nothing is read about you until you agree. You can take your consent back at any time; pending payments stop and the withdrawal is recorded."),
    ("P9", "Helpers", "A registered helper can act for a family only while the family's consent is active and a session for that family is open."),
    ("P10", "Large payments", "Payments over Rs 20,000 need two different staff members to approve. No payment above Rs 29,000 is made in one release."),
    ("P11", "Mistakes in records", "Spelling variants of a name (Muhammad, Mohammad, Mohd) are treated as one name, but two records are never merged on the name alone. Possible duplicates go to a staff member."),
    ("P12", "Appeals", "If you are not approved you can appeal within 30 days. A person reviews every appeal."),
    ("P13", "When the system is unsure", "If the checks disagree or confidence is low, the case goes to a staff member with notes. The system never guesses on money."),
]


@lru_cache(maxsize=1)
def _index():
    texts = [f"{t} {c}" for _, t, c in CLAUSES]
    v = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
    return v, v.fit_transform(texts)


def search(q: str, k: int = 3) -> list[dict]:
    v, m = _index()
    s = (m @ v.transform([q]).T).toarray().ravel()
    order = s.argsort()[::-1][:k]
    return [{"id": CLAUSES[i][0], "title": CLAUSES[i][1], "text": CLAUSES[i][2], "score": round(float(s[i]), 3),
             "source": "Sahara Relief Programme policy (MOCK), clause " + CLAUSES[i][0]} for i in order if s[i] > 0.02]
