"""Builds the big manual: hand-written chapters (docs/gen/ch_*.md) + parts generated from the live database and code.
Run:  python docs/gen/build_manual.py   (needs DATABASE_URL in the environment for the sample records)
Output: docs/gen/manual.md  (then converted to PDF by docs/gen/to_pdf.js)"""
import json, os, re, glob, html
from pathlib import Path

HERE = Path(__file__).parent
S = json.load(open(HERE / "schema.json", encoding="utf-8"))
POL = json.load(open(HERE / "policies.json", encoding="utf-8"))
ROUTES = json.load(open(HERE / "routes.json", encoding="utf-8"))
OAPI = json.load(open(HERE / "openapi.json", encoding="utf-8"))
REASONS = json.load(open(HERE.parent.parent / "shared" / "reasons.json", encoding="utf-8"))

# ------------------------------------------------------------------ what each table is
T = {
 "user_roles": ("People and logins", "One row per user. Says which role the user has: citizen (shown as Person), helper or admin. One role per user.",
   "The user themselves reads their own row. Only an admin can add or remove a role, and never their own.",
   "Created by the admin tool or the seed. Never changed by the app for normal users."),
 "profiles": ("People and logins", "The display details of a user: full name, preferred language (Urdu or English), the office they belong to, and the link to their person record.",
   "A user reads and updates their own profile. Admin read all. Only an admin adds or edits other profiles.",
   "One row per user (184 in the demo)."),
 "local_users": ("People and logins", "The login table used in local login mode: email, a scrambled (bcrypt) password or PIN, failed-attempt counter and a lock time. Only the service can touch it.",
   "Nobody signs in through the database directly. The service calls one protected function to check a login. Five wrong tries lock the account for 30 seconds.",
   "The PIN or password is never stored in plain text."),
 "people": ("Identity", "The identity record of a person: name in English letters and Urdu, ID card (CNIC) number and expiry, date of birth, father or husband name, gender, district, whether deceased, household, mock phone or wallet, source of the record.",
   "A citizen sees only their own record. A helper sees a person only inside an open session and only with consent. An admin sees a person only for cases in their own office and only with consent. Admin does not read this table. The admin reads a masked view (people_masked).",
   "Real systems would load this from NADRA. Here it is invented (189 people). Some people are on purpose the same person with different spellings."),
 "people_masked": ("Identity", "A VIEW (a saved query, not stored data) of people with the ID number hidden except the end, for the admin.",
   "Admin and staff views only. It never shows the full ID card number.", "Computed on the fly."),
 "households": ("Identity", "A household from the (mock) national survey: district, number of members, the poverty score (pmt_score), and flags such as government employee, owns vehicle, tax filer, foreign trips, high phone bill.",
   "Visible to people who can see someone in that household (the same rules as people). The admin can read all.",
   "The poverty score drives eligibility: a score at or below the cutoff (30) is eligible."),
 "person_links": ("Identity", "Possible matches between two person records (the same woman on two records). Stores the match band (SAME, MAYBE, DIFFERENT), the score and the evidence behind it.",
   "Visible if you can see either person. Admin reads all.",
   "Records here are suggestions only. A MAYBE is never merged automatically."),
 "helper_assignments": ("Helper Mode", "Which families a helper helps. 'active' is true while the helper has that family open (the session). A helper can have only one active family at a time.",
   "A helper reads their own assignments. A citizen reads who is assigned to her. Admin read all. Admin or the citizen creates or removes an assignment.",
   "40 families are assigned to the demo helper."),
 "cases": ("Claims", "The claim itself, one per person per quarter. Holds who owns it, which helper helped, the person and household, the office, the quarter (for example 2026-Q4), status, zone (AUTO, ASK_MORE, HUMAN), result, amount, the payout account and its title, the current draft and step, the resume code, the assigned admin, a priority number, and key dates.",
   "The citizen reads her own claims. A helper reads claims of the family in the open session. An admin reads claims of their own office that have active consent. Admin read all claims. The citizen and helper may update only while the claim is a draft or awaiting proof. Admins and admin update through the decision flow.",
   "Status moves: draft, submitted, in_review, awaiting_proof, approved, rejected, paid, stopped, closed."),
 "case_events": ("Claims", "The timeline of a claim: created, step saved, submitted, decided, and so on, each with who did it and extra data.",
   "Visible to anyone who can see the claim. Inserted by the citizen, helper, admin or admin, always as themselves.", "Append-only history."),
 "drafts": ("Claims", "The saved in-progress claim: which step she reached, the answers so far, the 6-digit resume code and an idempotency key so a repeated save is not applied twice.",
   "Citizen and helper, for claims they can see.", "Empty in the demo database because the demo claims keep their draft inside the case row."),
 "documents": ("Claims", "One row per photographed paper: the type (ID card front, and so on), where the file is stored, its SHA-256 fingerprint, the check signals (as JSON) and the verdict (ok, blurry, suspicious).",
   "Visible to anyone who can see the claim. Only a citizen or helper adds a document, as themselves.",
   "The fingerprint finds the same photo sent twice."),
 "doc_checks": ("Claims", "Each individual check on a document: name of the check (blur, edit signs, duplicate), verdict, confidence and detail.",
   "Visible to anyone who can see the document.", "Written by the service when a photo is analysed."),
 "decisions": ("Decisions", "Every decision ever made on a claim, never updated. Holds the zone, result, reason code, confidence, the approve and reject lines used, the rule version and its checksum, the model version, all checks, the citizen-friendly explanation, the full trace, the next step, a snapshot of the inputs and its hash, and the consent used. Both the system and admins write rows.",
   "Visible to anyone who can see the claim. An admin may insert a decision only as themselves.",
   "This is the heart of 'explain and audit'. A change of mind is a NEW row, never an edit."),
 "case_notes": ("Decisions", "The 'I am not sure' package: what was checked, what is missing, what the admin should do next.",
   "Read by admins for visible claims. Written by admins (through the service).", "Created whenever the system sends a claim to a person."),
 "case_flags": ("Decisions", "Concern flags an admin raises on a claim (kind, severity, status, who opened and resolved it).",
   "Read by admin. Opened and updated by admins.", "Open flags block payment until resolved."),
 "data_quality_queue": ("Decisions", "A to-do list of bad or odd data found by the system (for example a missing name), with the reason code and status.",
   "Read by admin. Updated by admin.", "Supports challenge 3: bad data is queued, not guessed."),
 "consents": ("Consent", "Each permission: who gave it (subject), to whom (office, helper or the payment service), for what purpose (claim_processing, claim_help), which fields, status (granted, withdrawn, expired), when granted and withdrawn, and a version.",
   "The citizen reads and updates (withdraws) her own consents and inserts her own. A helper reads the consent of the family they are working with. Admin read all. A helper can NOT insert consent for someone else.",
   "A withdrawn consent stops admin and helper access straight away."),
 "consent_events": ("Consent", "The history of each consent: granted, withdrawn, with a receipt hash so the citizen can keep proof.",
   "Visible to whoever can see the consent.", "Append-only."),
 "consent_flags": ("Consent", "A VIEW: for a person and purpose, is there an active consent right now (true or false)?",
   "Used by the database rules. No private details inside.", "Computed on the fly."),
 "rule_sets": ("Rules", "A version of the programme rules. Holds version number, name, status (draft, active, retired), the parameters as JSON (cutoff, amount, payout cap, costs...), a checksum, the parent version and dates. Only ONE can be active at a time. Saved versions cannot be edited.",
   "Active version readable by citizens and admins. Admin read all. Only an admin inserts, updates (to go live) or deletes a DRAFT.",
   "Version 1 is live. Version 2 is a draft used for the Digital Twin demo."),
 "rules": ("Rules", "The individual rules inside a rule set: a code, the condition as safe json-logic, the outcome (PASS, HOLD, ASK_MORE), the reason code and the reason text in English and Urdu.",
   "Readable wherever the rule set is readable. Only an admin adds or deletes rules (in a draft).", "18 rules in the demo."),
 "audit_log": ("Audit", "The diary. Every important action: who (actor), what (action), on what (entity), when, the input hash, the rule and model version, confidence, result, details, and two chain fingerprints: prev_hash and hash.",
   "Admin read everything. Everybody else reads only lines about themselves. NOBODY can update, delete or truncate it. Triggers refuse.",
   "Each hash is built from the row plus the previous row's hash. 'Verify the diary' re-checks the chain from row 1."),
 "api_keys": ("Platform", "Keys for the public API: a name, the hash of the key (the key itself is never stored), allowed scopes, a per-minute limit, revoked flag and dates.",
   "Admin read. Only an admin creates, edits or revokes.", "A revoked key stops working immediately."),
 "scam_reports": ("Platform", "Messages that people checked or reported: the text, the sender, the label (safe, suspicious, scam), the score, the reasons, language and district.",
   "Citizen, helper and admin insert reports as themselves and read their own. Admin read all.", "Feeds the 'scam map' idea."),
 "labelled_cases": ("Evaluation", "Past made-up cases with the true answer (truth) and the facts at the time. Used by the Digital Twin and by evaluation.",
   "Admin.", "120 cases."),
 "eval_runs": ("Evaluation", "One row for each evaluation run with the metrics as JSON.", "Admin read.", "Empty until an evaluation is saved."),
 "eval_cases": ("Evaluation", "The per-case results of an evaluation run: truth, predicted, zone, correct or not, cost.", "Admin read.", "Empty until an evaluation is saved."),
 "schema_migrations": ("Platform", "The list of migration files that have been applied, with the time.", "Internal.", "6 files."),
}

COLS = {  # global meanings of common column names
 "id": "Unique id of the row.", "created_at": "When the row was created.", "updated_at": "When the row was last changed.",
 "case_id": "The claim this row belongs to.", "person_id": "The person record.", "household_id": "The household.",
 "user_id": "The login user.", "owner_user_id": "The citizen who owns the claim.", "helper_user_id": "The helper user.",
 "actor_id": "Who did it (a user id).", "actor_type": "user, ai, system or job.", "created_by": "Who created it.",
 "status": "Current state.", "note": "A short written note.", "data": "Extra details (JSON).", "details": "Extra details (JSON).",
 "at": "When it happened.", "kind": "The type of event.", "verdict": "pass / unsure / fail or ok / blurry / suspicious.",
 "confidence": "How sure the check or model is, 0 to 1.", "detail": "Plain-words explanation or numbers (JSON).",
 "name_roman": "Name in English letters.", "name_ur": "Name in Urdu script.", "cnic": "13-digit national ID number (fake here).",
 "cnic_expiry": "When the ID card expires.", "dob_raw": "Date of birth as written on the record (may be messy).",
 "dob_iso": "Date of birth as a clean date, if it could be read.", "dob_precision": "How exact the date is (full date, year only, unknown).",
 "father_or_husband": "Father's or husband's name.", "relation_type": "S/O, W/O or D/O.", "relation_late": "True if the relative is marked late (deceased).",
 "gender": "Gender.", "district": "District.", "district_cnic": "District coded in the ID number.", "deceased": "True if the record says the person died.",
 "phone_mock": "Made-up phone number.", "wallet_name": "Mobile wallet provider (mock).", "bank_name": "Bank (mock).",
 "source": "Where the record came from.", "record_no": "Which copy of the record this is (to model duplicates).", "synthetic": "True: invented data.",
 "members": "Number of people in the household.", "pmt_score": "Poverty score from the survey. Lower means poorer.", "flags": "Exclusion flags (JSON).",
 "survey_date": "When the survey was done.", "full_name": "The user's display name.", "language": "ur or en.", "office": "Office code, for example KHI-EAST.",
 "role": "citizen (shown as Person), helper or admin.", "email": "Login email (lower case).", "password_hash": "Scrambled password or PIN (bcrypt).",
 "failed_attempts": "Wrong logins in a row.", "locked_until": "The account is locked until this time.", "last_login_at": "Last successful login.",
 "quarter": "The payment quarter, for example 2026-Q4.", "zone": "AUTO, ASK_MORE or HUMAN.", "result": "APPROVE, HOLD, ASK_MORE, REJECT or HUMAN_REVIEW.",
 "amount": "Payment amount in rupees.", "payout_account": "Mobile account number for the payment.", "payout_account_title": "Name on that account.",
 "payout_changed_at": "When the payout account was last changed.", "draft": "The answers so far (JSON).", "step": "The claim step she reached (1 to 8).",
 "resume_code": "6-digit code to continue later.", "assigned_officer": "Admin working on it.", "priority": "Queue priority number (higher first).",
 "open_flags": "Number of open concern flags.", "submitted_at": "When the claim was sent.", "decided_at": "When it was decided.",
 "reason_code": "One of the 24 decision reason codes.", "approve_line": "The sure-enough line used (for example 0.97).", "reject_line": "The reject line used.",
 "rule_set_id": "The rule set used.", "rule_version": "Rule version number.", "rule_checksum": "Fingerprint of the rule set used.",
 "model_version": "Version of the model used.", "checks": "All the checks and their results (JSON).", "explain_citizen": "The plain explanation for the citizen (JSON).",
 "trace": "Every step the engine took (JSON).", "next_step": "What happens next (JSON).", "input_snapshot": "The exact inputs used (JSON).",
 "input_hash": "Fingerprint of the inputs.", "consent_snapshot_id": "The consent that was active.", "costs_used": "The cost numbers used (JSON).",
 "grantee_type": "office, helper or service.", "grantee_id": "Which office, helper or service.", "purpose": "claim_processing or claim_help.",
 "fields": "Which fields may be seen.", "granted_by": "Who clicked or typed to give it.", "granted_at": "When given.", "withdrawn_at": "When taken back.",
 "expires_at": "When it ends.", "version": "Version number.", "subject_id": "The citizen the consent is about.", "by": "Who did it.",
 "receipt_hash": "Fingerprint proving the consent text and time.", "consent_id": "The consent.", "active": "True if currently in use.",
 "doc_type": "Type of paper.", "storage_path": "Where the file is kept.", "sha256": "Fingerprint of the photo.", "signals": "Check numbers (JSON).",
 "uploaded_by": "Who uploaded.", "document_id": "The document.", "check_name": "Which check.", "session_started_at": "When the helper opened the family.",
 "session_ended_at": "When the helper closed the family.", "idempotency_key": "Stops the same save being applied twice.", "saved_at": "Last save.",
 "band": "SAME, MAYBE or DIFFERENT.", "score": "Match or scam score, 0 to 1.", "evidence": "Field-by-field evidence (JSON).", "a_id": "First person.", "b_id": "Second person.",
 "name": "Name.", "params": "The rule parameters (JSON).", "checksum": "Fingerprint of the rule set.", "parent_version": "Version this was copied from.",
 "effective_from": "Live from.", "effective_to": "Live until.", "code": "Short rule code.", "expression": "The condition (safe json-logic JSON).",
 "outcome": "What happens when the rule fires.", "reason_en": "Reason in English.", "reason_ur": "Reason in Urdu.", "text": "Message text.", "sender": "Who sent the message.",
 "label": "safe, suspicious or scam.", "reasons": "Why (JSON).", "reported_by": "Who reported it.", "ts": "Exact time.", "actor_role": "Role of the actor.",
 "action": "What happened, for example decision.made.", "entity_type": "Kind of thing affected.", "entity_id": "Which one.", "prev_hash": "Hash of the previous diary row.",
 "hash": "Hash of this row plus prev_hash.", "key_hash": "Hash of the API key.", "scopes": "What the key may do.", "rate_limit_per_min": "Calls allowed per minute.",
 "revoked": "True if switched off.", "revoked_at": "When switched off.", "last_used_at": "Last time used.", "severity": "How serious.", "opened_by": "Who opened.",
 "opened_at": "When opened.", "resolved_by": "Who resolved.", "resolved_at": "When resolved.", "resolution_note": "How it was resolved.", "package": "The 'I am not sure' note package (JSON).",
 "decision_id": "The decision.", "entity": "Kind of record.", "entity_id": "Which record.", "problem": "What is wrong.", "category": "Kind of test case.",
 "truth": "The true answer.", "facts": "The facts of the case (JSON).", "outcome_": "", "notes": "Free notes.", "metrics": "Result numbers (JSON).", "triggered_by": "Who ran it.",
 "run_id": "The evaluation run.", "case_text": "Case description.", "predicted": "What the system said.", "correct": "True if right.", "cost": "Cost of this case.",
 "filename": "Migration file.", "applied_at": "When applied.", "cnic_masked": "ID number with the middle hidden.",
}


DESC = {
 "GET /analytics/summary": "Counts for the evaluation page: cases, zones, waiting, average time, overrides, scam checks.",
 "GET /api-keys": "List the public API keys (names, limits, revoked or not). Never shows the key itself.",
 "POST /api-keys": "Create a public API key. The key is shown once and stored only as a hash.",
 "DELETE /api-keys/{key_id}": "Revoke a key. It stops working at once.",
 "GET /audit": "Read the diary with filters (entity, action, actor) and paging.",
 "GET /audit/mine": "Read only the diary lines about me.",
 "GET /audit/verify": "Re-check the whole hash chain. Says intact or broken at row N.",
 "POST /auth/login": "Log in with email and PIN or password. Returns a token and the user.",
 "POST /cases": "Start (or open) the claim for this quarter. A helper passes the family's person id.",
 "GET /cases": "List the claims I may see.",
 "GET /cases/{case_id}": "One claim with person, household, documents and consent state.",
 "POST /cases/{case_id}/assign": "Assign a case to an admin (or take it).",
 "POST /cases/{case_id}/close": "Close a finished case.",
 "POST /cases/{case_id}/decide": "Run the decision engine again on the current claim.",
 "GET /cases/{case_id}/decisions": "All decisions ever made on this claim, newest first.",
 "POST /cases/{case_id}/documents": "Upload a paper photo. The service checks blur, editing and duplicates.",
 "PUT /cases/{case_id}/draft": "Save the answers so far and the current step (supports Idempotency-Key).",
 "POST /cases/{case_id}/escalate": "Send a case up for a second look.",
 "GET /cases/{case_id}/events": "The timeline of this claim.",
 "POST /cases/{case_id}/identity-check": "Compare the claimant with the records (SAME, MAYBE, DIFFERENT) with evidence.",
 "GET /cases/{case_id}/notes": "The 'I am not sure' notes: what was checked, what is missing, next steps.",
 "POST /cases/{case_id}/officer-decision": "An admin approves, rejects, asks for more proof or holds, with a note.",
 "POST /cases/{case_id}/submit": "Send the claim. Runs the decision engine and returns the decision card.",
 "GET /consents": "List consents (mine, or a family's for a helper).",
 "POST /consents": "Give consent. A helper must include the woman's own PIN (subject_pin).",
 "POST /consents/{consent_id}/withdraw": "Take consent back. Access stops at once. Returns a receipt hash.",
 "GET /data-access-log": "Who has looked at my data, when and why.",
 "POST /docs/analyze": "Check one photo for blur, editing signs and duplicates without saving a claim.",
 "GET /drafts/resume/{code}": "Open a draft with the 6-digit resume code (no login).",
 "GET /eval/latest": "The last saved evaluation run.",
 "POST /eval/run": "Run the evaluation on synthetic data and return the numbers.",
 "GET /healthz": "Is the service up and the database reachable?",
 "GET /helper/families": "The families this helper helps. Names are masked until consent.",
 "POST /helper/session": "Open one family (or close the open one). Only one at a time.",
 "POST /identity/match": "Compare two person records field by field.",
 "GET /me": "Who am I: role, name, language, office.",
 "PATCH /me": "Change my language or display details.",
 "GET /metrics": "Simple service numbers for admin.",
 "GET /mock/nadra/{cnic}": "Pretend NADRA: identity record for an ID number (consent is checked).",
 "GET /mock/nser/{household_id}": "Pretend NSER: household record and poverty score (consent is checked).",
 "POST /mock/raast/release": "Pretend Raast: release a payment.",
 "POST /mock/raast/settle": "Pretend Raast: settle a payment.",
 "POST /mock/raast/verify": "Pretend Raast: get the name on an account number.",
 "GET /policy/cost-curve": "Expected cost against the approval line for the given costs (preview only).",
 "GET /policy/search": "Search the programme policy. Returns clauses with their source.",
 "GET /public/v1/cases/{case_id}/status": "Public API: the status of a case.",
 "POST /public/v1/eligibility/precheck": "Public API: a rough 'are you likely eligible' check.",
 "POST /public/v1/scam/check": "Public API: scam check for a message.",
 "GET /queue": "The admin queue: cases waiting for a person, sorted by priority then least sure.",
 "GET /rule-sets": "List the rule versions.",
 "POST /rule-sets": "Make a new draft rule set (copy of a version, with changes).",
 "GET /rule-sets/{set_id}": "One rule version with its rules.",
 "POST /rules/activate": "Make a draft live. The old version is retired.",
 "POST /rules/twin": "Digital Twin: replay past cases under a draft and show who changes.",
 "POST /rules/validate": "Check a rule or a whole draft for mistakes before saving.",
 "POST /scam/check": "Check an SMS: safe, suspicious or scam, with reasons.",
 "POST /scam/report": "Report a message.",
 "GET /users": "List users (admin).",
 "POST /users": "Create a user and role (admin).",
}

PURPOSE_ORDER = ["People and logins", "Identity", "Helper Mode", "Claims", "Decisions", "Consent", "Rules", "Audit", "Platform", "Evaluation"]

def sample_rows():
    try:
        import psycopg
        c = psycopg.connect(os.environ["DATABASE_URL"])
    except Exception as e:
        print("no db for samples:", e); return {}
    out = {}
    for t in S["tables"]:
        try:
            cur = c.execute(f"select * from public.{t} limit 1")
            cols = [d.name for d in cur.description]; r = cur.fetchone()
            out[t] = dict(zip(cols, r)) if r else None
        except Exception as e:
            out[t] = None; c.rollback()
    return out

def short(v):
    s = json.dumps(v, default=str, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v)
    s = s.replace("|", "/")
    return (s[:52] + "…") if len(s) > 54 else s

def er_svg():
    pos = {  # x, y of the centre
     "user_roles": (90, 60), "profiles": (90, 140), "local_users": (90, 220),
     "people": (330, 140), "households": (330, 270), "person_links": (330, 30), "helper_assignments": (90, 330),
     "cases": (600, 170), "drafts": (860, 60), "documents": (860, 170), "doc_checks": (1100, 170),
     "decisions": (600, 330), "case_notes": (860, 300), "case_flags": (860, 380), "case_events": (860, 460),
     "consents": (330, 430), "consent_events": (90, 470),
     "rule_sets": (600, 500), "rules": (860, 560), "audit_log": (330, 590), "api_keys": (90, 600),
     "scam_reports": (600, 640), "labelled_cases": (1100, 400), "eval_runs": (1100, 500), "eval_cases": (1100, 590),
     "data_quality_queue": (600, 740),
    }
    W, H = 150, 36
    s = [f'<svg viewBox="0 0 1230 790" xmlns="http://www.w3.org/2000/svg" style="width:100%;font-family:Segoe UI,Arial,sans-serif">']
    colour = {"People and logins": "#e6f3f0", "Identity": "#e6f3f0", "Helper Mode": "#e6f3f0", "Claims": "#fbf3e1", "Decisions": "#fbf3e1",
              "Consent": "#e2edfb", "Rules": "#f1e8fb", "Audit": "#fde9e7", "Platform": "#eee", "Evaluation": "#eee"}
    for t, col, t2, col2 in S["fks"]:
        if t in pos and t2 in pos:
            (x1, y1), (x2, y2) = pos[t], pos[t2]
            s.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#8aa" stroke-width="1.2"/>')
    for t, (x, y) in pos.items():
        grp = T[t][0] if t in T else "Platform"
        n = S["counts"].get(t, "")
        s.append(f'<rect x="{x-W/2}" y="{y-H/2}" width="{W}" height="{H}" rx="8" fill="{colour.get(grp, "#eee")}" stroke="#0f6f66" stroke-width="1.3"/>')
        s.append(f'<text x="{x}" y="{y-2}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">{t}</text>')
        s.append(f'<text x="{x}" y="{y+12}" text-anchor="middle" font-size="10" fill="#5f6e6c">{n} rows</text>')
    s.append("</svg>")
    return "\n".join(s)

def db_part():
    """Compact Appendix A: the diagram, one line per table, the policy count by table. No per-field tables or sample rows."""
    o = ["# Appendix A. The database\n",
         f"Supabase Postgres (Mumbai): **{len([t for t in S['tables'] if t not in S['views']])} tables**, **{len(S['views'])} views**, **{len(POL)} row-lock policies**, **{len(S['triggers'])} triggers**, **{len(S['functions'])} helper functions**. A row-lock policy is a rule inside the database; if no policy allows an action, the database refuses it. All data is invented. The government mock registries live in schema `mock` (`nadra` with photos, `nser`, `raast_accounts`, `raast_payments`).\n",
         "## A.1 How the tables connect\n",
         "Each box is a table with its record count; each line is a link. `audit_log`, `api_keys`, `scam_reports`, `data_quality_queue` and the user tables stand alone on purpose. Colours: green = people, yellow = claims and decisions, blue = consent, purple = rules, red = audit diary, grey = platform.\n",
         er_svg() + "\n",
         "## A.2 Every table in one line\n",
         "| Table | Group | What it holds | Who reads it | Rows |\n|---|---|---|---|---|"]
    groups = {}
    for t in S["tables"]:
        groups.setdefault(T.get(t, ("Platform",))[0], []).append(t)
    for g in PURPOSE_ORDER:
        for t in sorted(groups.get(g, [])):
            info = T.get(t)
            what = (info[1].split(". ")[0] if info else "").replace("|", "/")
            who = (info[2].split(". ")[0] if info else "").replace("|", "/")
            kind = " (view)" if t in S["views"] else ""
            o.append(f"| `{t}`{kind} | {g} | {what} | {who} | {S['counts'].get(t, 0)} |")
    pol = {}
    for tbl, name, cmd, qual, chk in POL:
        pol[tbl] = pol.get(tbl, 0) + 1
    o.append("\n## A.3 Policies and triggers\n")
    o.append("Policies per table: " + ", ".join(f"`{t}` {n}" for t, n in sorted(pol.items())) + ".\n")
    seen = sorted({(tbl, tr) for tbl, tr, tim, ev in S["triggers"]})
    o.append("Triggers: " + ", ".join(f"`{tbl}.{tr}`" for tbl, tr in seen) + ".\n")
    o.append("Helper functions in schema `app` include `app.current_role()`, `app.can_see_person(id)`, `app.has_consent(...)`, `app.activate_rule_set(id)`, `app.verify_audit_chain()`, `app.local_login(email, secret)`, `app.helper_start_session(person)`.\n")
    return "\n".join(o)

def api_part():
    o = ["# Appendix B. API reference (every call)\n",
         "The Swagger page `/docs` shows the same list interactively. **Who** means which roles may call it. 'any signed in' means any logged-in user. 'API key' means it needs the `X-API-Key` header.\n",
         "| Method | Path | What it does | Who |\n|---|---|---|---|"]
    rmap = {(m, p): (r, k) for m, p, r, k, f in ROUTES}
    for path in sorted(OAPI["paths"]):
        for meth, op in OAPI["paths"][path].items():
            roles, key = rmap.get((meth.upper(), path), (None, None))
            who = ("API key" if path.startswith("/public") else ("admin" if roles is None and path in ("/metrics",) else (", ".join(roles) if roles else "any signed in" if not path.startswith(("/healthz", "/auth/login", "/mock", "/drafts/resume")) else "public (rate limited)")))
            if path.startswith("/mock"): who = "any signed in (consent checked inside)"
            summ = DESC.get(f"{meth.upper()} {path}", op.get("summary") or "").replace("|", "/")
            o.append(f"| {meth.upper()} | `{path}` | {summ} | {who} |")
    return "\n".join(o) + "\n"

def reasons_part():
    o = ["# Appendix C. Reason codes\n", "Every decision carries one of these codes. The citizen sees the plain sentence in her language. Zone shows where the case goes.\n",
         "| Code | Zone | English sentence | Urdu sentence |\n|---|---|---|---|"]
    for k, v in REASONS["decision"].items():
        o.append(f"| <code>{k.replace('_', '_<wbr>')}</code> | <span style='white-space:nowrap'>{v.get('zone', '')}</span> | {v['en']} | {v['ur']} |")
    o.append("\n## Scam reasons\n\n| Code | English | Urdu |\n|---|---|---|")
    for k, v in REASONS["scam"].items():
        o.append(f"| `{k}` | {v['en']} | {v['ur']} |")
    return "\n".join(o) + "\n"

def main():
    parts = []
    for f in sorted(glob.glob(str(HERE / "ch_*.md"))):
        parts.append(open(f, encoding="utf-8").read())
    parts += [db_part(), api_part(), reasons_part()]
    parts.append(open(HERE / "appendix_tail.md", encoding="utf-8").read() if (HERE / "appendix_tail.md").exists() else "")
    open(HERE / "manual.md", "w", encoding="utf-8").write("\n\n".join(parts))
    print("manual.md written,", sum(len(p) for p in parts), "characters")

if __name__ == "__main__":
    main()
