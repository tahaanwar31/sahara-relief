<div class="pagebreak"></div>

# PART 6. QUALITY, HONESTY AND NEXT STEPS

## 37. Testing: what was checked

| Area | Where | Result |
|---|---|---|
| **Database** | `db/tests/` (access, audit, migrations, rules) | **53 of 53 pass** |
| **Service** | `service/tests/` | **159 of 159 pass** |
| **Web** | `web/tests/` (api, mock, outbox, result card, roles) plus the type checker | **27 of 27 pass**, type check clean |
| **Live Chrome check** | `web/scripts/smoke_live.mjs` | Real Chrome against the real service and database: person, helper and admin screens all load with no server or page errors |
| **Layout check** | `web/scripts/fit_login.mjs` | The login page fits on one screen at common sizes |
| **Evaluation** | `service/app/eval/run.py` | The numbers in Part 5 |

### 37.1 What the database tests prove

- Each role sees only the rows it should (person, helper, admin).
- A helper cannot see a family outside the open session or without consent.
- Withdrawing consent stops an admin at once.
- Nobody can update, delete or truncate the diary; the chain check finds a tampered row.
- Rule versions cannot be edited; only one is active; only an admin activates.
- Migrations apply cleanly and in order.

### 37.2 What the service tests prove

- **65 API security tests:** forbidden roles, bad input, huge input, revoked and missing keys, rate limits, wrong-login messages.
- **17 real-database flow tests:** a full claim from draft to decision, consent withdrawal, admin decisions, separation of duties.
- **Decision engine tests:** hard rules beat the score; zones are chosen correctly; reason codes are never empty.
- **Identity tests:** variants match; no SAME on the name alone; odd input never crashes.
- **Rule tests:** unsafe rules are refused.
- **Scam, document and AI tests:** known scam and safe messages; blur and edit checks.

## 38. Bugs found and fixed

| Bug | How we found it | Fix |
|---|---|---|
| The engine sent **96% of claims to a person** | Running the evaluation | Fixed the invented case mix, the calibration, and a missing-core-field rule. Now about 38% are approved alone. |
| **Revoked API keys still worked** | A service security test | Fixed and tested. |
| Some **button colours vanished** in the production build | Looking at the screens | Tailwind safelist. |
| A narrow-phone **horizontal scroll** on the admin page | Checking at 375 pixels | Layout fixed. |
| The **helper list took 12 seconds** and showed "no signal" | The live test and the service log: about 160 database calls for 40 families | One query instead of 160. Now about 1.5 seconds. |
| **Pages took 20 to 60 seconds** on the first hosted database | Timing requests | The database was in Seoul. Moved to Mumbai and added connection reuse. About 1.3 seconds. |
| **Urdu names did not match the English names** | Looking at the admin queue | The seed paired different title words. Aligned. |
| **Some citizens could not log in** | A browser check | 18 seeded people had a login but no role or profile. Added. |
| **Staff wording said "your score"** | Screenshots | Staff reason texts written separately, in English and Urdu. |
| **Raw codes and overlapping text** on the decision card | A screenshot | Plain labels and a proper layout. |
| The **tests broke** when `.env` changed a setting | A failing test run | The tests set their own value. |

## 39. What is real and what is simulated

| Real (built and running) | Simulated (made up) |
|---|---|
| Login, roles and the database row locks | NADRA identity, NSER survey and Raast payment services |
| The hash-chained diary and its check | All people, ID numbers, households and cases |
| Consent give and take-back that really stops access | The relief programme and its rules ("Sahara Relief Programme") |
| Rule versions, the Digital Twin, the cost maths | The scam messages and test cases used to train and test |
| The decision engine, name matching, scam and document checks | The official SMS sender code (`9171`) |
| Offline saving, resume codes, Urdu and English voice | Money: nothing is ever really paid |

## 40. Honest limits (say these out loud)

1. **All training and test data is synthetic.** The numbers show the **method works**, not how it performs on real people. We wrote the data generator, so the accuracy numbers measure how well the model learned **our own rules**.
2. **The Urdu text needs a native speaker's check.** The voices are computer voices.
3. **QR and text reading** need extra programs that are not installed everywhere. The system asks for another photo instead of guessing.
4. **The diary** could in theory be rewritten by someone with full database-owner power. Normal users and the admin cannot do it.
5. **PIN proof for Helper Mode** works in the local login mode we run. The hosted-login mode is written but untested.
6. **Docker** is written but untested, and the app is **not deployed yet**.
7. **No voice input.** The citizen listens and taps.
8. **Rate limiting** is in the service's memory. Fine for one server. A bigger system would use a shared store.
9. **Small test sets.** The scam test has 56 messages, the identity test 10 pairs and the document test 21 images.
10. **The helper consent proof** uses the woman's PIN. A real programme might prefer a one-time code to her own phone.

## 41. Future work

- Deploy on Render and rehearse the live demo.
- Test the Supabase login mode and the Docker image.
- Native-speaker review of all Urdu text and audio.
- Voice input in Urdu.
- Real OCR and QR reading.
- Train on **real, approved, de-identified** data under a proper data agreement, and re-measure everything.
- Publish the latest diary hash outside the database.
- A one-time code to her phone for helper consent.
- A scam map showing reports by district.
- Staff dashboards for workload and delay.
