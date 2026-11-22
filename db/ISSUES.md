# Contract issues found by the database owner (and the assumption made)

1. **`audit_log.id` is `bigint`, not uuid.** The chain order must be the id order. Assumption: the service treats it as an opaque number.
2. **`rules.expression` cannot read `params`.** The contract fact list has no `params.cutoff`, so each rule has the cutoff written inside it (v1: 30, v2: 25). Changing `params.cutoff` without rewriting the rules would drift. Rule sets are immutable, so a new version carries both.
3. **Extra columns** added beyond CONTRACT section 4: `decisions.actor_id` (which officer), `cases.payout_changed_at`, `cases.open_flags`, `consents.granted_by`, `helper_assignments.session_ended_at`, `people.user_id / relation_type / relation_late / dob_precision / district_cnic / source / record_no`. New tables: `drafts`, `doc_checks`, `case_flags`, `labelled_cases`. Nothing was renamed or removed.
4. **`consents.grantee_id` is text** (an office code, a helper user id, or `service`), and `app.has_consent(grantee text, subject uuid, purpose text, field text)`. Purposes in use: `claim_processing` (office, service) and `claim_help` (helper).
5. **Admin has no access to `people` / `households`** and the auditor only gets `people_masked`, following the Build Plan table (the task text says "reads all"; the plan table is stricter, so the plan won).
6. **Separation of duties / approval gates** need the order "decision row first, then case status" (see README).
7. **The synthetic `people.synthetic` column is CHECK-constrained to true**, so real people cannot be loaded by mistake.
