<div class="pagebreak"></div>

# PART 6. QUALITY, HONESTY AND NEXT STEPS

## 37. Testing: what was checked

| Area | Where | Result |
|---|---|---|
| **Database** | `db/tests/` (access, audit, migrations, rules) | **50 of 50 pass** |
| **Service** | `service/tests/` | **179 of 179 pass** (includes the ID card and face tests, the helper three-detail proof, the household-size check and the ask-for-proof message test) |
| **Web** | `web/tests/` (api, mock, outbox, result card, roles) plus the type checker | **27 of 27 pass**, type check clean |
| **Browser click-through** | `web/scripts/e2e_full.mjs` | Real Chrome against the real service and database, **23 checks**, no page or server errors: a correct claim is approved and paid; wrong name, number, face and household size go to a person; the admin sees the red card differences, views a paper, asks for the front, and the citizen's page updates by itself in English and Urdu; one-click resend; the admin approves and the dashboard shows the money sent; offline photo and offline resend; the helper three-detail proof; the practice demo on every page (sends nothing, nothing for helpers); the admin pages and the diary check |
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

- **API security tests:**  forbidden roles, bad input, huge input, revoked and missing keys, rate limits, wrong-login messages.
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

### 38.1 Found and fixed during the final testing

| Bug | How we found it | Fix |
|---|---|---|
| A resent paper only replayed the old answer, so staff never got a new decision | Walking the resend in the browser | A resend now uses a fresh send key |
| A request for a paper showed the standard words, not the admin's message, and no way to know which paper | The citizen's screen | The admin picks the paper and writes a message; both are shown, with Urdu and voice for the standard sentences |
| The upload buttons vanished after a wrong-side photo | A screenshot | Buttons shown again |
| Approving without a note failed with "details not valid" although the note was optional | The 23-check browser test | A default note is saved |
| Opening the upload screen offline showed "No signal" | The offline test | The claim page keeps a copy on the phone |
| Evaluation page said "No evaluation yet" after a database reset | The browser test | Run once; it is stored in the database |
| Two voices played together on the first page with the practice demo | A request log | The page voice waits for the demo |
| A correct claim looked "edited" | A test on another demo account had used the same sample cards, so the duplicate check (correctly) saw one card on two people | The test photos were removed; rule: one demo account per set of sample cards |

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
2. **The Urdu text needs a native speaker's check**, including the practice demo lines. The voices are computer voices and we have not listened to every file.
3. **QR reading** needs a program that is not installed everywhere. The system asks for another photo instead of guessing.
4. **The diary** could in theory be rewritten by someone with full database-owner power. Normal users and the admin cannot do it.
5. **The hosted login mode** (Supabase Auth) is written but untested. The login we run is the local one.
6. **Docker** is written but untested, and the app is **not deployed yet**.
7. **No voice input.** The citizen listens and taps. Offline use was tested with a simulated cut in Chrome, not on a real phone. There is no "weak signal" state: the badge only says online or offline.
8. **The ID card reader and face matcher** work on our fixed template card. The face cutoff (0.50) was set on a handful of AI-generated faces (Section 30.3). A real card needs a bigger model and a fairness test. Only Zainab has a registry photo; every other registry column is filled for every person.
9. **The mock payment pays at once** after an automatic approval (`AUTO_SETTLE`); a real rail would confirm later.
10. **Rate limiting** is in the service's memory. Fine for one server. A bigger system would use a shared store.
11. **Small test sets.** The scam test has 56 messages, the identity test 10 pairs and the document test 21 images.
12. **The helper consent proof** is her ID number, date of birth and household size. A keypad phone cannot approve anything, but these details are not secret: neighbours may know them. A real programme would add a one-time code sent by SMS to her registered mobile (needs a paid SMS gateway).

## 41. Future work

- Deploy on Render and rehearse the live demo.
- Test the Supabase login mode and the Docker image.
- Native-speaker review of all Urdu text and audio.
- Voice input in Urdu.
- A stronger card reader for real Urdu and English CNICs, and a fairness test of the face model.
- Train on **real, approved, de-identified** data under a proper data agreement, and re-measure everything.
- Publish the latest diary hash outside the database.
- A one-time code to her phone for helper consent.
- **A payout check call (planned, not built).** After every payout an automatic AI voice call phones each woman who was paid: press 1 if she received the full amount, press 2 if the helper or agent took or asked for money. A confirmed complaint removes the helper and fines him a very large sum. This is shown in the helper's app as "Planned safeguard (not built yet)". It needs a paid telephony service.
- A scam map showing reports by district.
- Staff dashboards for workload and delay.
