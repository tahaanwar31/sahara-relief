<div class="pagebreak"></div>

# PART 3. RULES AND ACCESS

## 14. The three roles and what each may do

### 14.1 Summary table

| | Person (eligible for relief) | Helper | Admin |
|---|---|---|---|
| **Who in real life** | A woman claiming (or a shopkeeper) | A community worker | Programme staff: reviews cases, sets rules, checks the diary |
| **Own profile** | Read and update | Read and update | Read, add, edit all |
| **Person identity records** (`people`) | Own only | Only the open family, only with consent | Only own-office cases, only with consent; otherwise the masked view only |
| **Household survey records** | Own | Open family | Own-office with consent; read all through the households policy |
| **Claims (`cases`)** | Own: create, edit while draft | Open family: create, edit while draft | Own office with consent: read and decide |
| **Documents** | Add and read own | Add and read for the open family | Read for visible claims |
| **Decisions** | Read own | Read for the open family | Read, and add their own |
| **Give consent** | Yes (own) | **Only with her three details** (ID number, date of birth, household size) | No |
| **Take back consent** | Yes (own) | Yes, for the open family | No |
| **Approve / reject / hold** | No | **No** | **Yes** (not own case, not one they helped with) |
| **Edit rules** | No | No | **Yes**, as a draft |
| **Make rules live** | No | No | **Yes** |
| **Digital Twin** | No | No | Yes |
| **API keys** | No | No | Create, edit, revoke |
| **Audit diary** | Own lines only | Own lines | All |
| **Change the diary** | **Nobody** | **Nobody** | **Nobody** |
| **Scam checker and reports** | Yes | Yes | Read reports |

### 14.2 Rules that apply to everyone

1. **The database decides, not the screen.** Even if someone changes the web page, the database refuses actions the role is not allowed. All 27 tables have row-lock rules switched on.
2. **A user cannot change their own role.** Only an admin adds or removes roles, and never their own.
3. **A person cannot decide their own case, or one they helped with.**
4. **Consent is checked on every read.** Without active consent, an admin or helper sees nothing.
5. **The diary is read only for everyone.** Update, delete and truncate are refused by triggers.

### 14.3 One role per login

Each user has exactly one role (one row in `user_roles`): **citizen** (shown in the app as **Person**), **helper** or **admin**. Three roles keep the system easy to understand. The admin does the work of a case reviewer, a rule manager and a diary checker. The safety rules stop one admin from doing everything on one case: nobody approves their own case or one they helped with, large payments need a second admin, and rule changes start as a new draft.

## 15. How a decision is made

### 15.1 The order of thought

Every claim goes through the same steps, in the same order:

1. **Consent.** If there is no active consent, **stop**. Nothing else is read.
2. **Hard rules** (always on, written in code) and the **rules of the active rule set**. A high score **never** beats a rule.
3. **Checks run:** permission, ID card, name match, household score, exclusions, papers, payout account, scam signals.
4. The **probability model** gives `p_eligible` (a number from 0 to 1). It is **one input among several**.
5. **Disagreeing checks** send the case to a person.
6. **The zone is chosen** (below).
7. The decision is written with its **reason code, rule version, model version, all checks, a full trace and a hash of the inputs**.

### 15.2 The hard rules

| Rule | What it checks | Where the case goes | Reason code |
|---|---|---|---|
| NO_CONSENT | No active consent | HUMAN (hold) | `R_CONSENT_MISSING` |
| CNIC_INVALID | The ID number is not valid | ASK_MORE | `R_CNIC_INVALID` |
| CNIC_EXPIRED | The ID card has expired | HOLD | `R_CNIC_EXPIRED` |
| DECEASED | A deceased flag | HOLD | `R_DECEASED` |
| DUPLICATE_IDENTITY | The person may be in the records twice | HOLD | `R_DUPLICATE_IDENTITY` |
| PAYOUT_OVER_CAP | Amount above the payout cap (Rs 29,000) | HOLD (two admins) | `R_PAYOUT_OVER_CAP` |
| PAYOUT_ACCOUNT_SHARED | The account is used by other households | HOLD | `R_PAYOUT_ACCOUNT_SHARED` |
| PAYOUT_ACCOUNT_CHANGED | The account changed in the last 30 days | HOLD | `R_PAYOUT_ACCOUNT_CHANGED` |
| PAYOUT_HELPER_OWNED | The account belongs to the helper | HOLD | `R_PAYOUT_HELPER_OWNED` |
| SCAM_FLAG | A scam signal on the claim | HOLD | `R_SCAM_FLAG` |
| DOC_EDITED | A paper shows signs of editing | HUMAN | `R_DOC_EDITED` |
| HOUSEHOLD_MISMATCH | The household size she typed did not match the survey record after 3 tries | HUMAN | `R_HOUSEHOLD_MISMATCH` |
| ID_NOT_YOURS | The ID number typed in step 3 belongs to someone else | HUMAN | `R_ID_NOT_YOURS` |
| CARD_UNREADABLE | The card photo cannot be read, or no face is found on it | ASK_MORE | `R_CARD_UNREADABLE` |
| CARD_MISMATCH | The card's **ID number, name or face** differs from the government record | HUMAN | one of 7 `R_CARD_*_MISMATCH` codes (Section 30) |

Further rules come from the **active rule set** (the admin edits these): missing household score, household score above the cutoff or within the borderline band, exclusion flags (government employee, owns a vehicle, tax filer, foreign trips, high phone bill), missing or blurry documents, too many missing fields, and so on.

### 15.3 The three zones

| Zone | Meaning | Condition |
|---|---|---|
| **AUTO** (approve alone) | Fast and confident | `p_eligible` is at or above the **approval line (0.97)**, **no rule fired**, and **no check is unsure or failing** |
| **ASK_MORE** | One thing is missing or unclear | A blurry photo, a missing paper, an unreadable ID. The system says exactly what. |
| **HUMAN** | A person decides | Anything else. This is the safe default. |

Below the **reject line (0.15)** the case still goes to a **person** ("likely not eligible"), because **automatic rejection is switched off**. A machine never says "no" alone in this prototype.

### 15.4 The cost-of-being-wrong maths (challenge 1)

The approval line is **calculated**, not guessed. The admin sets four costs (invented numbers, editable):

| Cost | Value | Meaning |
|---|---|---|
| Wrong approval | 100 | Paying someone who should not be paid |
| Wrong rejection | 20 | Turning away someone who deserves it |
| A person reviewing | 3 | Staff time for one case |
| Ask for proof | 1 | A small cost to ask |

- **Approval line = 1 − (review cost ÷ wrong-approval cost) = 1 − 3 ÷ 100 = 0.97.** In words: approve alone only if you are at least 97% sure. Below that, it is cheaper to ask a person.
- **Reject line = review cost ÷ wrong-rejection cost = 3 ÷ 20 = 0.15.** Below 15% sure, "no" is likely, but still a person confirms it.
- A safety rule: the review cost must be smaller than the wrong-approval cost, or the settings are refused.

If you make "wrong approval" cheaper, the approval line drops and more cases are approved alone. If you make a person's time cheaper, the line rises. The **Policy** screen draws this live.

### 15.5 The live rule settings

| Setting | Value (version 1) |
|---|---|
| Programme name | Sahara Relief Programme (MOCK) |
| Poverty-score cutoff | 30 (at or below is eligible) |
| Borderline band | 5 (within 5 points of the cutoff is "close") |
| Payment amount | Rs 13,500 per quarter |
| Payout cap | Rs 29,000 |
| Second approver needed above | Rs 20,000 |
| Payout account change window | 30 days |
| Most missing fields allowed | 3 |
| Automatic rejection | Off |

### 15.6 How rules are written (safely)

Rules are stored as **JSON expressions** (a small safe subset of "json-logic"). Example: *household score greater than cutoff* is `{">": [{"var": "household.pmt_score"}, {"var": "params.cutoff"}]}`.

- Allowed operators: `var`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`, `!`, `in`, `missing`.
- The checker refuses unknown operators, unknown variables, expressions deeper than 8 levels or longer than 200 parts.
- There is **no `eval`**, no function calls. A comparison with a missing value is simply false, so **a missing score never passes**.
- An expression that evaluates to true means the rule **fires**.

### 15.7 Rule versions (challenge 4: change without redeploying)

- A **rule set** is one version. Statuses: draft, active, retired.
- **Saved versions cannot be edited** (the database refuses). To change anything, copy to a new draft.
- **Only one version can be active** (a database index enforces it).
- The admin **previews** with the Digital Twin, then calls `app.activate_rule_set`. The old version is retired, the new version starts, and the diary records who did it.
- Every decision stores the **rule version and a checksum** of the rules it used. The admin can always see which rules applied to a decision.
- Changing the rules needs **no code change and no restart**.

## 16. Consent (challenge 6)

### 16.1 What consent is

Consent is a person's **permission** for someone to read her details for a stated purpose. In our system:

- **Who:** an office (for processing her claim), her helper (for helping her), or the payment service.
- **Purpose:** `claim_processing` (office, service) or `claim_help` (helper).
- **Fields:** which details may be seen (for example name, ID, household, account).
- **Status:** granted, withdrawn, expired.

### 16.2 Giving consent

- A **citizen** gives it herself at step 2 of the claim, or in "My data".
- A **helper cannot give it for her without proof.** The woman tells the helper her **ID number, date of birth and household size**; he types them on his own phone. The server checks them against the government records (the helper never sees the records), records her permission as hers (to the office and to that helper), and writes the diary line `consent.granted_with_details`. Three wrong tries lock the family for 30 minutes. These details are not secret (neighbours may know them), so this is weaker proof than a code sent to her own phone; Section 40 names this.
- Every consent has a **receipt hash** (a fingerprint of what she agreed to and when).

### 16.3 Taking it back

- She presses **Take back my permission** and confirms.
- **At once:** admins cannot open her case, helpers cannot read her details, her claim waits, and any pending action is blocked. The database checks consent on every read, so nothing is cached.
- The withdrawal is written in the diary. **She can give permission again** later.

### 16.4 What a data trail looks like

"Who has seen my data" lists every access: when, who, role and purpose. This comes from the diary lines (for example `data.read`).

## 17. Safety rules the database enforces

| Rule | In plain words |
|---|---|
| Separation of duties | Nobody approves their own claim or one they helped with. |
| Two-person approval | Payments over Rs 20,000 need a second admin. |
| Append-only diary | The diary cannot be updated, deleted or emptied. |
| Immutable decisions | A decision is never edited. A change of mind is a new row. |
| Immutable rule versions | Saved rule sets cannot be edited. Only one is active. |
| Consent on every read | Access stops the moment consent is withdrawn. |
| Mass-assignment guards | A user cannot sneak in fields they may not set, such as their own role. |
| Helper sessions | A helper has only one open family at a time. |
| Masked identity | Admin sees people only for own-office cases with consent, or through a masked view. |
| Hard flags beat scores | Deceased, expired ID or missing consent always blocks auto-approval. |
| Safe rule language | Rules cannot run code. They can only compare numbers and words. |
