# Contract gaps found by the web app (for the service owner)

The web client assumed these. Please confirm or tell P3 the real shape (all are in `src/api/types.ts`, marked ASSUMED).

1. `GET /cases/{id}` should embed: `person {id,name_roman,name_ur,cnic_masked,...}`, `household {members,pmt_score?}`, `documents[] {doc_type,verdict,signals}`,
   `latest_decision`, `consent_status`, `needs_second_approver`. Never send the full CNIC to the browser.
2. `GET /drafts/resume/{code}` -> `{case_id, step, draft, status}`. The web app needs no login for the lookup, but then asks the user to log in to carry on.
3. `GET /queue` items: `{id,status,zone,reason_code,confidence,priority,amount,quarter,person_name,person_name_ur,created_at,consent_status,needs_second_approver}`.
4. `POST /cases/{id}/officer-decision` -> `{case_id, status, needs_second_approver, decision, message}`. Contract says "second approver needed above the limit" but not how the reply shows it.
5. `GET /cases/{id}/notes` -> `{id,case_id,decision_id,package:{summary{en,ur},why_unsure[],checked[],missing[],suggested[],compare[]}}`.
6. `POST /mock/raast/verify {account}` -> `{valid,title,shared_with_other_households?}` (the contract lists the path only). The web app shows `title` at step 6.
7. `POST /consents` body: `{grantee_type,purpose,fields,person_id?}` (`person_id` only for a helper acting for a family). `GET /consents?person_id=` for the helper.
   `GET /data-access-log` -> `[{id,at,who,role,what,purpose}]`.
8. `GET /helper/families` -> `[{person_id,name_roman,name_ur,cnic_last4,district,consent_status,case_status,case_id}]`. `POST /helper/session` -> `{person_id,active,started_at}`.
9. `POST /rule-sets` body `{parent_id, params, rules[]}` returns the new draft with `rules`. `POST /rules/validate {params?,rules?,expression?}` -> `{ok, errors[{path,message}]}`.
   `POST /rules/activate {rule_set_id}`. `GET /rule-sets` rows may omit `rules`; `GET /rule-sets/{id}` includes them.
10. `GET /policy/cost-curve` -> `{points[{approve_line,expected_cost}], min{...}, current{...}}`.
11. `GET /eval/latest` -> `{n,accuracy,auto_rate,human_rate,confusion{labels,matrix},false_alarms[{case,truth,predicted,note}],speed{p50_ms,p95_ms},created_at}`;
    `GET /analytics/summary` -> `{cases_total,by_zone{AUTO,ASK_MORE,HUMAN},queue_open,avg_decision_ms,override_rate,scam_checked}`.
12. `GET /audit` accepts `entity_type`, `action`, `actor_id`, `limit`; returns `{items,total}` or a plain array. `GET /audit/verify` is read tolerantly:
    `intact|ok`, and `broken_at|first_broken_row|first_broken`.
13. Decision card `next_step.due_date` (optional) is used for "a person will look by <date>". Without it the web app shows created_at + 3 days.
14. Identity step: the web app calls `POST /identity/match` with the typed CNIC only (b has no CNIC), so a real service will answer MAYBE/DIFFERENT.
    A better contract: a case-scoped check such as `POST /cases/{id}/identity-check {cnic}` that compares against the stored record server-side.
15. CORS: the web app sends `Authorization`, `Content-Type`, `Idempotency-Key` headers, including PUT and multipart POST. Please allow them in `CORS_ORIGINS` handling.
16. The service should return `message_ur` in errors where it can; the web app shows it to Urdu users.
