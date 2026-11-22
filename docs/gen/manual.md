<div class="cover">

# Sahara Relief Platform
## The Complete Instruction Manual

**What it is, how to use it, how it works inside, and why each choice was made.**

*Built for Coder's Cup '26: "The Last Mile: AI on Public Rails"*
*ACM Student Chapter, FAST-NUCES Karachi*

**PROTOTYPE. Not a real government service. Every person, ID number, payment and message in the system is made up (synthetic).**

</div>

<div class="pagebreak"></div>

# How to read this manual

| Part | What is in it |
|---|---|
| **1. The project** | The goal, the evidence, the requirements checklist |
| **2. User manual** | Screen-by-screen guide for each role, including the ID card and face check |
| **3. Rules and access** | Who may do what, how a decision is made, consent |
| **4. Technology** | Front end, back end, database, hosting, security |
| **5. AI and machine learning** | Each model, its data, settings and results; the ID card and face check |
| **6. Quality** | Tests, bugs fixed, what is real, honest limits, next steps |
| **Appendices** | A: database. B: API. C: reason codes. D: settings, folders, glossary |

Each fact appears once. Where another part needs it, it points to the section.

<div class="pagebreak"></div>

# PART 1. THE PROJECT

## 1. What is this project?

The government runs a **cash relief programme** and pays poor families every three months. We call ours the **"Sahara Relief Programme"**. It is made up, but modelled on real programmes such as BISP and Ehsaas.

The women who should receive the money face problems no simple website solves: many cannot read well, signal comes and goes and phones are shared, names are spelled several ways across records, scammers send fake "your money is ready" messages, and staff are overloaded. Real numbers are in **Section 3A**.

Our product is a **website and installable phone app** that:

1. helps a woman (and a community helper beside her) **claim her payment from start to end**, in **Urdu or English**, with **spoken instructions**;
2. **checks her ID card photo and face against the government record** and tells her, in plain words, exactly what did not match;
3. gives staff a **review desk** for the cases the computer is not sure about;
4. lets an **admin** change the rules **without a programmer**;
5. gives proof that **nothing was changed or hidden**.

### 1.1 Four verbs

| Verb | Meaning | Example |
|---|---|---|
| **Decide** | Approve, ask for more proof, or send to a person | "All checks passed, 97% sure: approved." |
| **Explain** | Plain reasons in the person's language | "The face on your card does not match the photo in our record." |
| **Protect** | Guard private data, catch scams and fake papers, keep an unchangeable record | "Staff lose access the moment she takes back permission." |
| **Say "I am not sure"** | Do not guess; hand over to a person with notes | "A staff member will look at your case." |

### 1.2 What it is not

It is **not a chatbot**, **not real** (no real person, ID or money), and **not finished for the real world** (limits in Section 40).

## 2. The task and why we chose this service

The brief asked for **one multi-user public-service SaaS** with at least 3 roles, 3 platform extras and 3 AI features; Postgres or Supabase with migrations; a public API with keys and Swagger; mock national services (NADRA, Raast); eight real-life challenges (cost of being wrong, "I am not sure", bad data and name variants, rules that change without redeploying, explain and audit, consent and take-back, non-readers on weak internet, scams and fake documents); optional bonuses (Digital Twin, Helper Mode, offline sync, Scam Map); and a live demo, README, GitHub, video and deployed link. All data must be mock.

We chose the **quarterly cash relief payment** because it touches every challenge at once:

1. **Money at huge scale**, so a wrong approval costs and a wrong refusal is cruel. The cost maths (Section 15.4) is natural.
2. **Name variants and missing ID cards** are everywhere, which the brief itself highlights.
3. **Scams in the programme's name** are an official, long-running problem.
4. **The users are the "last mile"**: voice, big buttons, helper mode and offline mode have a purpose.
5. **Helpers and consent** match real life.
6. **It matches the brief's examples**: a poverty survey (NSER), national identity (NADRA), instant payments (Raast).
7. **Rules change** in real life (amount and cutoff), so versioned rules are a real need.

Other services we could have chosen (licence renewal, school admission, land transfer, health card, tax refund, flood compensation, pensions, bill subsidy, business licence) have lower stakes, fewer scams or a thinner consent story.

**Honest strength check.** Strong: coverage of all eight challenges plus three bonuses; access enforced inside the database; honest error numbers; Urdu and English with offline voice. Risks: another team may choose the same service (we stand out on depth, not topic); data is made up; the public link and demo video must be finished; a native Urdu speaker should review the Urdu text.

## 3. Requirements checklist

| Requirement | Status | Where |
|---|---|---|
| Multi-user public-service SaaS | Done | Whole system |
| At least 3 roles | **3** (person, helper, admin) | Part 3 |
| At least 3 platform extras | Public API with keys, audit diary, rule versions, Digital Twin, offline outbox, consent centre, rate limits | Parts 2 to 4 |
| At least 3 AI features | **10** (two trained by us, three open-source pretrained tools, voices, and classic algorithms): decision model, scam detector, name matching, ID card reading, face matching, photo integrity, "I am not sure" notes, policy search, Digital Twin and cost curve, recorded voice | Part 5, Section 24A |
| Postgres or Supabase with migrations | Supabase Postgres (Mumbai), 6 migrations | Part 4, App. A |
| Swagger / OpenAPI with API keys | Swagger at `/docs`; public API needs `X-API-Key` | App. B |
| Mock NADRA / NSER / Raast | Done (complete, realistic records; the NADRA record also holds a photo for the demo person) | Part 4 |
| Challenges 1 to 8 | All done | Sections 8, 9, 10, 12, 15, 16, 21, 27 to 30 |
| Bonus: Digital Twin, Helper Mode, offline sync | Done and tested (**Scam Map: not built**) | Sections 6, 9, 12 |
| Live demo | Ready (also fully offline on a laptop) | Section 22 |
| README | Done | Section 22 |
| GitHub, demo video, deployed link | GitHub public and deployed on Render (free plan) are **done**; the demo video is **still to do** | Section 22 |
| Mock data only, labelled prototype | Done | Section 39 |

### 3.1 How the project maps to the judging rubric (100 points)

The organisers score six categories. This table says what we built for each and where the manual explains it. "Not proven" says what we have not shown.

| Category (points) | What we built | Manual | Not proven |
|---|---|---|---|
| **AI implementation (30)**: at least 3 working AI features, workflow, output quality, model choice | 10 AI features (decision model, scam checker, name matching, ID card reading, face match, photo integrity, notes, policy search, Digital Twin, recorded voice). They run inside one claim: hard rules first, then the model, then auto-approve, ask for proof, or a person. Two models trained by us, three open-source pretrained tools used as they come. | Part 5, Section 24A | All data is synthetic. No real photos or real SMS were tested. No language model is used. |
| **SaaS and architecture (20)**: features, API, database, deployment, testing, monitoring | Three roles, queue, rule versions, public API with keys, FastAPI service, Postgres with row locks, hash-chained diary, 179 + 50 + 27 automated tests and a 23-check browser test, health and metrics pages | Parts 3, 4, 6 | **Deployed on Render's free plan** (Singapore): a tenth of a CPU, it sleeps when idle, and memory was measured at about 350 MB with spikes near 520 MB (limit 512 MB). |
| **Real-world problem solving (15)**: needs, end-to-end completion, impact | A woman (or her helper) claims the payment end to end: consent, identity, household, papers, account, decision, money sent, staff call to confirm. The admin can ask for one more paper and the loop closes by itself. | Parts 1, 2 | Money is a mock. No real users were interviewed. |
| **Accessibility (10)**: voice and language, low literacy, weak internet | Urdu and English on every screen, 154 recorded voice prompts, number pad, icons, practice demo before each page, offline outbox, saved steps, resume code | Sections 4 to 5, 11, 12, 19 | No voice input. The Urdu needs a native speaker's check. Offline was tested with a simulated cut in Chrome, not on a real phone. |
| **Safety, privacy, reliability (15)**: uncertainty, consent, explainability, risk | "I am not sure" path to a person with notes, hard rules over any score, consent with take-back that stops access at once, helper three-detail proof, one sentence for her and a full trail for the auditor, safe retries, lockouts | Parts 3 and 5 (Sections 15, 16, 36) | The helper-commission problem is only reduced (a helper's own number is held, and a planned phone-call check is described). |
| **Innovation (10)**: originality, creative features, design decisions | Digital Twin, helper mode with consent from three details, mock government services, the one-click "send this paper again" loop, a game-style practice demo | Sections 6, 9, 19.6, 32 | None of these has been tested with real users. |


## 3A. The evidence: the numbers behind the problem

Each number below is used once, here. The rest of the manual refers to it instead of repeating it. Figures are from official surveys **as reported by news outlets**: open the source before quoting one on stage.

### 3A.1 Ten numbers to remember

| # | The number | What it means | <span style="white-space:nowrap">Source</span> |
|---|---|---|---|
| 1 | **54%** of Pakistani women are literate, against **73%** of men (a gap of 19 points) | Almost **1 in 2 women** cannot read and write | [S1] |
| 2 | **44%** of **rural** women are literate (rural men: 67%) | In villages, more than half of women cannot read and write | [S1] |
| 3 | **28%** of women in the **poorest fifth of rural households** are literate | Among poor village women, **fewer than 3 in 10** can read | [S3] |
| 4 | About **44.7%** of Pakistanis live below the World Bank's $4.20-a-day line (about 107 to 108 million people). On the national line the rate is about **22%** (about 60 million) | The group who need relief is very large, and the numbers depend on the line used | [S5] |
| 5 | **About 10 to 12 million households** receive the BISP Kafaalat cash transfer; the budget for 2025-26 is about **Rs 716 billion** | A huge programme, so even a small error rate means many wrong payments | [S6] |
| 6 | **Rs 14,500** per quarter (raised from Rs 13,500 in March 2026); the **poverty-score cutoff is 32** | Rules and amounts change, so they must be editable without new code | [S7] |
| 7 | **68%** of women own a mobile phone (men: **93%**); **40%** of women own a smartphone (men: 57%); **28%** of women who use mobile internet use **borrowed** phones | A woman may share or borrow a phone, so we need helper mode and simple screens | [S12] |
| 8 | About **140 million** people live inside mobile-broadband coverage but **do not use mobile internet** | Coverage is not the same as use. Weak signal, cost and skills are real barriers | [S13] |
| 9 | Cybercrime reports rose about **35%** in 2025; roughly **82,000 to 85,000** financial-fraud complaints; about **90%** of financial scams run through digital or branchless-banking accounts | Fraud is common, so scam checks and payout-account checks matter | [S14] |
| 10 | Genuine BISP messages come **only from 8171**. BISP has reported **tens of thousands** of fake-SMS SIM cards blocked | Fake "relief" messages are a known, official problem | [S15] |

### 3A.2 Problem to feature

| The problem (with the number) | The feature that answers it |
|---|---|
| 46% of women and about 70% of poor rural women cannot read [S1, S3] | Spoken, picture-based citizen flow in Urdu and English |
| 28% of women borrow phones; 140 million do not use mobile internet [S12, S13] | Helper Mode, resume codes, offline outbox |
| About 10 to 12 million families, about Rs 716 billion a year [S6] | Cost-of-being-wrong maths and the 97% approval line |
| Targeting errors in both directions [S8] | "I am not sure" zone, borderline cases go to a person, auto-reject off |
| Rules and amounts change (Rs 10,500 to 13,500 to 14,500; cutoff 32) [S7] | Versioned rules, edited by an admin with no code change, previewed with the Digital Twin |
| Women are less likely to have a CNIC [S10] | ID checks that ask for proof, never an automatic "no" |
| Agents deduct Rs 1,000 to 2,000 [S9] | Money to her own account; helper-owned or shared accounts go to a person |
| About 35% rise in cybercrime; 90% of financial scams via digital accounts [S14] | Scam checker, payout-account rules |
| Fake messages in BISP's name [S15] | Official-sender rule and plain scam reasons |
| Few verdicts, so prevention matters [S14] | Warn, never block; an honest false-alarm number |

### 3A.3 Cautions

1. **Most figures are from news reports of official data.** We could not open every primary report. Check the source before quoting a number.
2. **Different dates and definitions.** Literacy (age 10 and above), poverty lines ($4.20 against national), "households" against "beneficiaries" are not the same measures.
3. **Some figures are old.** The BISP beneficiary literacy numbers and the CNIC gap by sex are from earlier years. We label them old.
4. **Some are disputed.** The "10 million missing women" figure is contested. The World Bank's targeting figures are forecasts.
5. **Our own numbers are different.** Everything inside our prototype (cutoff 30, Rs 13,500, sender 9171, 189 people) is **made up**.

### 3A.4 Sources

| <span style="white-space:nowrap">Tag</span> | What it is | Where |
|---|---|---|
| <b style="white-space:nowrap">S1</b> | Economic Survey 2025-26: literacy | Dawn https://www.dawn.com/news/2007104 · ProPakistani https://propakistani.pk/2026/06/11/pakistans-literacy-rate-increased-to-63-in-fy-2025-26/ · https://propakistani.pk/2026/06/11/male-vs-female-literacy-gap-in-pakistan-revealed/ |
| <b style="white-space:nowrap">S2</b> | Economic Survey 2024-25: literacy | Daily Times https://dailytimes.com.pk/1312836/literacy-rate-reaches-60-65-gender-urban-rural-divides-persist/ · Official chapter https://finance.gov.pk/survey/chapter_25/10_Education.pdf |
| <b style="white-space:nowrap">S3</b> | Gallup Pakistan analysis of HIES 2024-25 (literacy by income, sex, area) | The News https://www.thenews.pk/print/1393026-literacy-in-pakistan-tied-to-income-level-survey · Pakistan Bureau of Statistics https://pbs.gov.pk/hies/ |
| <b style="white-space:nowrap">S4</b> | BISP Impact Evaluation reports (OPM) | https://www.opml.co.uk/sites/default/files/migrated_bolt_files/bisp-final-impact-evaluation-report.pdf · https://www.opml.co.uk/sites/default/files/migrated_bolt_files/bisp-first-follow-up-impact-evaluation-report.pdf |
| <b style="white-space:nowrap">S5</b> | World Bank poverty figures (2025) | https://www.worldbank.org/en/news/press-release/2025/09/22/pakistan-bold-sustained-people-centered-reforms-needed-to-reduce-poverty-build-resilience-and-protect-vulnerable-populat · https://www.worldbank.org/en/news/feature/2025/10/17/fragile-gains-enduring-challenges-charting-pakistan-s-path-out-of-poverty · Dawn https://www.dawn.com/news/1915759 |
| <b style="white-space:nowrap">S6</b> | BISP budget and beneficiaries | Geo https://www.geo.tv/latest/606425-govt-to-raise-bisp-budget-by-20-to-rs716bn · Business Recorder https://www.brecorder.com/news/40425111 · President's Secretariat https://president.gov.pk/first-lady-bibi-asifa-bhutto-zardari-briefed-on-benazir-income-support-programme-2 · Economic Survey, Social Safety Nets https://www.finance.gov.pk/survey/chapters_17/15-Social_Safety_Nets.pdf |
| <b style="white-space:nowrap">S7</b> | Kafaalat amount and cutoff | Dawn (Rs 13,500) https://www.dawn.com/news/1882502 · ARY (Rs 14,500) https://arynews.tv/bisp-increases-benazir-kafaalat-stipend-to-rs14500 · ProPakistani https://propakistani.pk/2026/03/12/bisp-increases-benazir-kafaalat-stipend/ · Pakistan Observer (cutoff 32 and 37) https://pakobserver.net/?p=788069 |
| <b style="white-space:nowrap">S8</b> | Targeting errors | Research Collective https://www.researchcollective.org/blog/poverty-targeting-of-the-benazir-income-support-programme-achievements-and-challenges · Saleem (thesis) https://repub.eur.nl/pub/119766/534670-L-sub01-bw-Saleem.pdf · Journal paper https://pu.edu.pk/images/journal/pesr/PDF-FILES/1-v57_1_19.pdf · World Bank https://openknowledge.worldbank.org/entities/publication/875f01bc-130e-465f-bfb6-525fba301726/full |
| <b style="white-space:nowrap">S9</b> | Agent deductions and enforcement | Dawn https://dawn.com/news/2021629/price-of-collecting-bisp-stipend · https://www.dawn.com/news/1883917 · Profit https://profit.pakistantoday.com.pk/2025/07/13/bisp-blocks-508-retailer-devices-in-south-punjab · Tribune https://tribune.com.pk/story/2520503/entertainment · https://tribune.com.pk/story/2554054/retailer-held-for-fleecing-bisp-beneficiary |
| <b style="white-space:nowrap">S10</b> | ID cards and the gender gap | HRW https://www.hrw.org/news/2023/11/20/pakistan-faces-severe-voter-gender-gap · Dawn https://www.dawn.com/news/1376870 · Tribune https://tribune.com.pk/story/2531370/entertainment · https://tribune.com.pk/story/1518846/entertainment |
| <b style="white-space:nowrap">S11</b> | Financial inclusion of women | State Bank press release https://www.sbp.org.pk/press/2025/Pr-21-oct-2025.pdf · State Bank policy document https://www.sbp.org.pk/assets/documents/circulars/BoE_2026_Policy_Document.pdf · Arab News https://www.arabnews.pk/node/2624896 · Dawn https://www.dawn.com/news/1950512 |
| <b style="white-space:nowrap">S12</b> | GSMA Mobile Gender Gap (2025 data) | Profit https://profit.pakistantoday.com.pk/2026/06/20/pakistans-mobile-internet-gender-gap-falls-to-8percent-but-phone-ownership-divide-remains-high · Arab News https://www.arabnews.pk/node/2649428/pakistan · Dawn https://www.dawn.com/news/1911146/8m-women-come-online-in-2024-as-digital-gender-divide-narrows |
| <b style="white-space:nowrap">S13</b> | Coverage and usage gap | GSMA https://www.gsma.com/newsroom/press-release/unlocking-pakistans-digital-future-gsma-highlights-opportunities-and-progress-at-digital-nation-summit-islamabad/ · PhoneWorld https://www.phoneworld.com.pk/pakistan-140-million-mobile-internet-usage-gap-digital-divide/ · Profit (PTA data) https://profit.pakistantoday.com.pk/2026/01/20/pakistans-mobile-subscriber-base-tops-200-million-by-end-of-2025-pta-data-shows/ |
| <b style="white-space:nowrap">S14</b> | Cybercrime and financial fraud | Business Recorder https://www.brecorder.com/news/amp/40388687 · Tribune https://tribune.com.pk/story/2564755/online-fraud-worth-rs3b-reported · Profit https://profit.pakistantoday.com.pk/2025/10/23/cybercrime-surges-35-in-pakistan-amid-rising-whatsapp-hacking-and-digital-fraud-cases/ · ARY https://arynews.tv/pakistan-reports-surge-in-online-fraud-cases-senate-body-told |
| <b style="white-space:nowrap">S15</b> | Fake messages in BISP's name | Business Recorder https://www.brecorder.com/news/40384595 · Government press release https://pid.gov.pk/site/press_detail/25791 · Daily Times https://dailytimes.com.pk/93134/bisp-sms-scam-14606-complains-received-6136-involved-sims-blocked/ · Geo https://www.geo.tv/latest/545927-bisp-cautions-beneficiaries-against-fake-messages |
| <b style="white-space:nowrap">S16</b> | Raast | ProPakistani https://propakistani.pk/2026/05/05/raast-transactions-hit-rs-50-trillion-as-pakistanis-switch-to-online-payments/ · State Bank https://www.sbp.org.pk/our-operations/payments-ecosystem-and-infrastructure/raast |
| <b style="white-space:nowrap">S17</b> | PTA fraud advisories | Geo https://www.geo.tv/amp/615586-pta-warns-public-against-fake-courier-messages-seeking-verification-codes |
| <b style="white-space:nowrap">S18</b> | BISP exclusion flags | Government press release https://pid.gov.pk/site/press_detail/12895 · Dawn https://www.dawn.com/news/1524377 |


<div class="pagebreak"></div>

# PART 2. USER MANUAL

## 4. Getting started

- **Computer:** open **http://localhost:5173** (or the public link once deployed). **Phone:** open the link in Chrome and choose **Add to Home screen**; it then opens full screen and works offline. **API docs:** `http://localhost:8000/docs`.
- **Login page:** language switch (**اردو** / **EN**; Urdu flips the screen right to left), an online/offline badge, two tabs (**Family or helper**: email + 6-digit PIN on a big number pad; **Staff**: email + password), and **"I have a resume code"** to continue a claim without logging in.
- **Each browser tab keeps its own login.** A citizen can be signed in on one tab and an admin on another at the same time (closing a tab signs that tab out).
- **Sound:** every page has a **Hear this** button that plays a pre-recorded voice. The recordings are stored in the app and play **with no internet** (Urdu and English for every prompt and reason).

### 4.1 Demo accounts (all invented)

| Role | Email | PIN or password |
|---|---|---|
| **Person (main demo): Zainab Bibi, a widow** | `zainab@citizens.sahara.test` | 246810 |
| Helper (Yousuf) | `yousuf@helpers.sahara.test` | 246810 |
| **Admin** (reviews cases, edits rules, runs the Digital Twin, reads the diary) | `admin1@gov.sahara.test` | Admin#2026 |

The login page shows only these three accounts: one citizen, one helper and one admin. Other people in the database also have logins with PIN 246810, but they are not shown.

## 5. Citizen guide: claiming the payment

**Bottom bar (phone):** **My claim**, **Is it real?**, **My data**. At the top: a progress bar, a **resume code**, and a small faint **restart icon** (demo only, Section 5.4).

### 5.1 The 8 steps

| Step | Title | What you do | What the system does |
|---|---|---|---|
| 1 | **Do you want to claim?** | Press **Yes, start**. | Creates or opens your draft. |
| 2 | **Your permission** | Read three lines (office, helper, payment service) and press **I agree**. | Records consent with a receipt. Without it nothing else is read. |
| 3 | **Is this you?** | **Type your 13-digit ID number first.** | Looks it up in the government record and shows what it holds. See 5.2. |
| 4 | **Your household** | **Type how many people live in your household.** The number is never shown to you. | Compares it with the survey record and says only yes or no. Three wrong tries send the claim to a person. |
| 5 | **Your ID card** | Photograph the **front and back** of your ID card (only if step 4 matched). See 5.3. | Checks blur, edits and duplicates; reads the card and compares it (Section 30). |
| 6 | **Where should the money go?** | Type your **correct mobile account number** (11 digits starting 03), check it, press **Continue**. | Checks the shape only. **No name or number is ever shown back.** |
| 7 | **Send your claim** | Check the summary and press **Send my claim**. | Decides. With no signal, the claim waits on the phone and goes out by itself. |
| 8 | **Result** | Read, or press **Hear it again**. | Shows the decision, the reason and what happens next. |

The **Back** button returns to the screen you actually came from, not just to the previous number. The first time she reaches steps 2 to 7, a short **practice demo** plays first (Section 5.6).

### 5.2 Step 3 in detail: ID number first

1. Type the 13 digits and press **Find my record**.
2. **Your own number:** the screen shows what the record holds (name in English and Urdu, father or husband, date of birth, district, masked ID number) and asks **"Is this you?"**.
3. **Someone else's number that exists:** the screen shows **only the name**, nothing else, and says: "If you go on, you will be asked for your papers. Our system will check them first." If you press **Yes**, the claim carries on, but the papers are compared with **that person's** record and the claim goes to a human with the reason "The ID number you typed belongs to someone else, not to the account you signed in with."
4. **A number that is not in the records:** "Sorry, this is an invalid ID number. It is not in our records." You cannot continue; you can retype.
5. **No, this is not me** goes straight to the summary, where staff will look at the claim.

Nobody can browse other people's records: details appear only for the number linked to the signed-in person.

### 5.3 Step 5 in detail: the ID card

Only two photos are asked for: the **front** and the **back** of the ID card. There is no income letter, no bill and no death certificate, because many rural women have none of these (they work in other people's homes and fields). The system also checks the **side**: the front must show the name and ID number, the back must show the addresses. If the back is sent as the front (or the front as the back), the screen says so in Urdu or English and asks for the right side. For each photo: **Take photo** or **Choose photo**. If it is blurry the screen asks again; if there is no signal the photo waits on the phone. **I do not have it** skips a photo (the claim then goes to a person).

### 5.4 The three results, and the demo restart

| Result | Colour | What it says | What happens next |
|---|---|---|---|
| **Approved** | Green | "Your claim matches the rules. Your payment is approved and the amount has been sent to your account", with the amount | The mock payment service pays at once; the claim shows **Paid**. |
| **Please send one more thing** | Yellow | Says exactly what is missing | You send it and the claim is decided again. |
| **A person will look at your case** | Blue | A kind sentence with the **exact reason** (for example "The face on your card does not match the photo in our record. A staff member will check.") | A staff member reviews it. |

**Reset (demo only).** The faint circular arrow in the top bar puts **this person back to her initial state**: her open claim is closed and a fresh one starts, and her payout side is emptied: **no account number on any of her claims, none in the payout registry, and no payment given**. So after an approval the same household can be shown again with any valid account. Her old claims, papers, decisions and the diary lines are **kept** (they are append-only history). It is switched off with `DEMO_RESTART=0`.

### 5.5 Stopping and coming back, and "My data"

- Progress is **saved on the server** after every step ("Saved"), or on the phone if the signal is off. A **6-digit resume code** continues the claim on any phone.
- **My data** lists every permission (who, when, what they can see, and **given / taken back / expired**). **Take back my permission** stops staff access **immediately**; **Give permission again** restores it. **Who has seen my data** lists every look, with role and reason.

### 5.6 The practice demo (watch first, then you do it)

Before each of steps 2 to 7, the first time she opens it, a **"Watch first"** card appears over the page, like a game tutorial.

- It plays on its **own practice card** with **made-up details** (a fake ID number, a fake account number, a "Sample Name"). A small hand taps the mock buttons and a voice explains, in the language she chose (Urdu or English). A label says: "Practice: made-up details. Nothing is sent."
- It **never fills her real boxes, never moves her to the next page and sends nothing to the service**. When it ends she presses **Now I will do it**, types her own details and presses the real button herself.
- **Skip** works at any time. A small **Show me how** button on the page plays it again. It is shown once per page per person, and the faint restart icon (Section 5.4) makes it show again, so a demo can start from the beginning.
- It is **only for citizens**: helpers and staff never see it, and it is not shown on the one-click "send this paper again" page.
- The page's own voice waits until the practice demo ends, so two voices never overlap.

### 5.7 Her claim page after she has sent the claim

After sending, **My claim** shows only the news about her claim, in one box. It refreshes by itself every 10 seconds.

| Where the claim is | What the box says | Voice |
|---|---|---|
| With staff or the system, no answer yet | **Blue:** "Our people are checking your claim now. Please wait." | Urdu and English |
| Staff asked for a paper | **Yellow:** the staff member's message, "We need: ID card (front)" and a **Send it now** button | Urdu and English |
| Approved by the system or by an admin | **Green:** "Your relief payment of Rs 13,500 has been sent to your account. Our staff will call you to confirm." | Urdu and English |

A small **See my answer** link opens the full answer page.

### 5.8 When staff ask for one more paper

1. The admin chooses **Ask for more proof**, picks which paper (**ID card front, back, front and back, or another paper**) and may write a message. If the message is empty, a **standard sentence** is used. The four standard sentences exist in Urdu and English with a recorded voice. Words the admin types are shown exactly as typed in both languages (no translation is made).
2. Her claim page shows the yellow box (Section 5.7) without a reload.
3. **Send it now** opens the upload screen for **exactly that paper**, with no Next button. When the photo is accepted, the claim is **sent by itself** with a fresh send key, and the system decides again. A blurry or wrong-side photo is not sent: she retakes it first.
4. If the corrected card now matches the record, the system may approve and pay by itself. Otherwise the same claim returns to the admin queue, and the side-by-side table (Section 7) shows the new card.
5. With no signal, the photo waits on the phone and the claim sends when the signal returns (Section 12).

## 6. Helper guide

**Who:** a community worker who helps a woman do her claim **from his own phone**. In the demo there is **one helper (Yousuf) and one family (Zainab)**. Either she claims herself, or the helper does it for her. Many rural women have only a keypad phone, so nothing here needs her to log in. **Bottom bar:** **Families**, **Is it real?**, **My data**.

- **Family list:** the families assigned to you (one in the demo), with initials, the last 4 ID digits and status chips. Names show as `F*** B***` and IDs as `••••` until she has given permission.
- **Opening a family:** you log in on **your own phone**. If she has not given permission, you **ask her three things and type her answers**: her **ID number**, her **date of birth** and **how many people live in her household**. The server checks them against the government records and answers only yes or no, so **you never see the record**. Right answers record her permission **as hers** (to the office, and to you as her helper), with a diary line. Wrong answers record nothing, and the panel says so in plain words, right next to the button: "These details do not match our records. Please ask her again and check the ID number, the date of birth and the household size. Tries left: 2." It never says which detail was wrong. **Three wrong tries lock the family for 30 minutes.** Then press **Start helping**: you do the claim with her, asking her for each answer. If she had already started the claim herself, you carry on from where she stopped.
- **One family at a time.** Opening another closes the first, so papers cannot mix.
- **Doing the claim:** the same 8 steps with a banner "You are helping: (name)". **Step 2 is only a confirmation** ("Her permission is already recorded"): a helper never gives consent for her, because her permission was recorded when her three details matched. **Steps 3 and 4 are skipped**: her ID number and household size were already checked by those three details, so nothing is asked twice; the server records the household check on the claim itself. The claim goes straight to the ID card photos. If the payout account belongs to **you**, the claim goes to a human.
- **End session** locks the screen until you tap to continue.
- **Reset (demo only).** The same faint circular arrow sits in the helper's top bar. It puts **everything the helper changed back to the start** and returns him to his Families screen: her claims are closed, her payout side is emptied (no account, no payment), the permission she gave him is taken back, and his session closes. The next demo starts again at the three-detail check. Her claims, decisions and the diary stay as history. It is switched off with `DEMO_RESTART=0`.
- **A helper cannot:** approve or reject, see a family not assigned to them or a name before consent, give permission without her three details, change rules, or read the diary.

## 7. Admin guide: reviewing cases

**Tabs:** **Cases to review**, **Rules** (read only).

- **The queue** lists cases sent to a person (in the demo it starts empty and fills only when Zainab sends a claim the system cannot approve): highest priority first, then least sure first, updated every 10 seconds. Each row shows the name (English and Urdu), amount, quarter, days waiting, the **reason** in staff wording, the system's **confidence** and a **Permission given** badge. You only see cases of **your own office** with active consent.
- **The case page:**
  - **Decision card:** zone, result, confidence, a plain reason, the rules version, and the **checks** (Permission, ID card, Name match, Household score, **Card vs record**, Payout account, Scam check), each Pass, Not sure or Fail with detail and a percentage.
  - **"I am not sure" notes:** what was checked, what is missing, suggested next steps.
  - **Same person? Side by side:** compares her **registration record**, the **government record** and, when her ID card photo could be read, a column **Her ID card photo** with what the card says (name, father's name, ID number, date of birth). Any value that differs from the government record is **red with a ✗** and the Match column says **card differs**. A **face** row says "same face", "a different face" or "no face found on the card". Name and father's name are shown cleanly when they match (the reader drops spaces).
  - **Papers:** each photo with its verdict and a **View** button that opens the photo the person sent, in a window (the diary records who opened it; only an admin who may see the claim can).
  - **What the numbers mean:** each check has a **Result**, a plain sentence under **What was found**, and a **How sure** percentage. The Household score check has no percentage: it just says, for example, "Score 22 is 8 points below the cutoff 30, so eligible". For Name match, "How sure" is the weighted agreement of name, father's name, ID number, date of birth and district. The side-by-side table compares **her registration record** (what the programme holds from her sign-up) with the **government record**; a date of birth shown as "close (year only)" means her registration knew only the year.
  - **Full trace:** every step the engine took.
  - **Your decision:** **Approve**, **Reject**, **Ask for more proof**, **Hold**, a note, and the amount ("Second approver needed" above Rs 20,000). The note is optional for Approve (a default is saved) and required for Reject and Hold. **Ask for more proof** shows a list of which paper she must send again and a message box (Section 5.8). Every choice is a new row in the diary.
- **What the database stops:** you cannot approve your own case or one you helped with; you cannot decide a case whose consent was taken back; big payments need a second admin.
- An admin cannot read the identity table (names and ID numbers); they read cases, decisions and the diary.

## 8. The scam checker ("Is it real?")

Any citizen or helper pastes an SMS (optionally the sender; the official code is `9171`) and presses **Check this message**. The answer is **Looks real**, **Be careful** or **Looks like a scam**, with plain reasons (for example "It asks for your PIN, OTP or password"). **Report this message** adds it to the reported list. It **only warns**; it never blocks or deletes.

Try: `Congratulations! You won Rs 50000. Click http://bit.ly/claim-now and send your PIN and CNIC.` (scam) and `Sahara Relief: Your Q4 payment of Rs 13500 has been sent to your account. Ref 48210.` (looks real).

## 9. Admin guide: rules and reports

**Tabs:** **Rules**, **Policy**, **Digital Twin**, **Evaluation**, **Diary**.

- **Rules:** every version with status, cutoff, amount, payout cap, auto-reject and go-live date. Rules are **never edited in place**: **New draft from version N** copies the live version. The editor has settings (cutoff, borderline band, amount, payout cap, second-approver limit, auto-reject), the four **costs of being wrong**, and **Add a rule** (variable, operator, value, outcome PASS / HOLD / ASK_MORE, reason, AND/OR). **Check** validates; **Save as new draft**, **Preview with Digital Twin** and **Make this version live** follow. Every new decision then uses the new version; old decisions keep theirs.
- **Policy:** three sliders (wrong approval, wrong rejection, person reviewing) and a chart of expected cost against the approval line. A **preview only**.
- **Digital Twin:** pick a draft and **Run the replay**. Up to 500 past cases are replayed under the draft and you see cases replayed, how many change zone, approvals changed, cost before and after, who moves where, and examples.
- **Evaluation:** (if it says "No evaluation yet", press **Run the evaluation**; it takes about 20 seconds and uses made-up cases) cases, approved alone, asked for proof, sent to a person, waiting now, average decision time, admin overrides, scam checks, a confusion matrix and the false alarms and misses. "Wrong approvals are the costly mistake."

## 10. Checking the diary

- **Verify the diary** recomputes every fingerprint from row 1 and says **"The diary is intact"** (with the row count) or **"The diary is broken at row N"**.
- Filters: Everything, Decisions, Cases, Consent history, Rule changes, Documents; plus a search box. Open a row to see actor, rule and model version, hash and previous hash, and the decision trace. Sign-in lines are hidden by default (search `login`).
- Nobody can change the diary, the admin included.

## 11. Language and accessibility

- **Two languages on every screen** (Urdu right to left, and English), **large type**, big buttons, icons beside words, **spoken prompts**, a **number pad** for PINs and numbers, and simple sentences on citizen screens.

## 12. Weak internet, offline use and resume

| Situation | What the app does |
|---|---|
| Signal drops on a step | An "Offline" badge shows; answers are saved on the phone. |
| A photo is taken with no signal | It waits in an **outbox** ("Saved on your phone"). |
| Signal returns | The outbox sends everything **by itself**; each item has a unique key, so **nothing is sent twice**. |
| "Send my claim" pressed offline | The claim waits and is sent when the signal returns. |
| Staff asked for a paper and she opens it offline | The claim page kept a copy on the phone, so **Send it now** still opens. The photo waits in the outbox and the claim is sent when the signal returns. |
| You change phones | Use the **6-digit resume code**. |
| The app loads with no signal | It opens from its saved copy; audio plays from the phone. |

## 13. Troubleshooting

| Problem | Why | What to do |
|---|---|---|
| "No signal right now" while online | The service is slow or restarting | Press **Try again**. |
| "The email or secret is not right" | Wrong PIN, or locked 30 seconds after 5 wrong tries | Wait, then retry. |
| "This was not found" on a photo | The claim page is old (for example after a demo reset) | Reload the app and start the claim again. |
| "Sorry, this is an invalid ID number" | The number is not in the government record | Check the 13 digits. |
| Account number "does not look right" | A mobile account has 11 digits and starts with 03 | Retype it. |
| "You have already sent your claim" | It was sent earlier | Press **See my answer**. |
| Helper sees `Z*** B***` | No permission yet | Ask her for her ID number, date of birth and household size, and enter them. |
| Admin gets "not found" on a case | Consent was taken back, or another office's case | Correct behaviour. |
| A claim is held as "account changed" | She typed a different account from her earlier claim | Correct behaviour; reuse the same number in the demo. |
| Admin cannot approve: "a hard flag is still open" | A hard flag such as "edited or reused photo". The same card photo was sent by **two different people** | Correct behaviour. Use one demo account per set of sample cards. |
| Admin gets "a case cannot go from closed to awaiting_proof" | The claim was closed underneath the admin (for example by the demo restart icon) | Start a new claim. |
| The practice demo does not show | It was already seen on this browser | Press the faint restart icon, or the **Show me how** button. |


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


<div class="pagebreak"></div>

# PART 4. THE TECHNOLOGY

## 18. The big picture

```
  Phone or computer            Python service              Database
  (React web app)    ----->    (FastAPI)       ----->      (Postgres on Supabase)
  Urdu + English               decides, explains,          row locks, unchangeable
  works offline                protects, serves API        diary, rules, consent
         ^                           |
         |                           +--> mock NADRA, NSER, Raast
         +--- audio files stored in the app
```

**The golden rule of our design: the web app talks only to our service, never straight to the database.** All important logic and all secrets stay in one place. The service talks to the database **as the logged-in person**, so the database applies that person's row locks.

### 18.1 One request, step by step

1. The web app sends a request, for example "give me my cases", with a **login token**.
2. The service **checks the token** and works out who you are.
3. The service **opens a database transaction as you**: `SET LOCAL ROLE authenticated` and sets your user id for that transaction.
4. The database **applies the row locks**. It returns only the rows you may see.
5. The service shapes the answer and sends it back. Important actions also write a **diary** line.

This means a bug in our code **cannot** show you someone else's data, because the database refuses.

### 18.2 The three main parts

| Part | Folder | In one line |
|---|---|---|
| Web app | `web/` | What people see and touch |
| Service | `service/` | The brain: decisions, rules, AI checks, API, mock services |
| Database | `db/` | Tables, locks, triggers, seed data |
| Shared | `shared/` | The reason codes in English and Urdu |
| Scripts | `scripts/` | Local database, start-up, audio maker |

## 19. The front end (what people see)

### 19.1 The tools and why

| Tool | What it is | Why we chose it |
|---|---|---|
| **React 18** | A library that builds screens from small reusable pieces | Very common, fast, a huge community, and good for apps with many screens |
| **TypeScript** | JavaScript with types (labels on data) | Catches many mistakes before the app runs |
| **Vite** | The build and dev tool | Starts in under a second and builds small bundles |
| **Tailwind CSS** | Styling with small ready-made classes | Fast, consistent design; supports right-to-left Urdu |
| **PWA (installable web app)** | A website that behaves like an app | Works offline, installs from the browser, no app store |
| **IndexedDB (idb)** | A database inside the browser | Stores the offline outbox safely |
| **Service worker** | A small background program in the browser | Keeps the app and audio working with no signal |
| **Inter font** (English) and **Noto Naskh Arabic** (Urdu) | Typefaces | Clean and readable. Naskh is an easy Urdu style on small screens |
| **Vitest** | Test runner | 27 web tests |
| **Playwright (with Chrome)** | A robot that uses the real browser | `web/scripts/e2e_full.mjs`: 23 click-through checks of all three roles, the ask-for-proof loop, offline, Urdu and the practice demo |

### 19.2 How the web app is organised

- **Pages:** `Login`, citizen (`Claim`, `Consents`, `Scam`, `Resume`), citizen-helper (`Families`), admin (`Queue`, `CaseView`), admin (`Rules`, `RuleEditor`, `Policy`, `Twin`, `Evaluation`, `Audit`).
- **A small hand-written router** keeps the address in the form `#/queue`.
- **The API layer** (`web/src/api`) is the only code that talks to the service. It has two modes: **live** (real service) and **mock** (everything inside the browser, for design work and tests).
- **Auth** keeps the token in the browser tab's **session storage**, so each tab has its own login (a citizen and an admin can sit side by side) and asks the service who you are.
- **Offline** code keeps the outbox and the "online or offline" badge.
- **Staff translation:** staff screens have a dictionary that swaps English text for Urdu when Urdu is chosen.
- **Updates:** screens refresh by **polling every 10 seconds**. We did not need heavy live connections.

### 19.3 Offline outbox in detail

1. A write action (save a step, upload a photo, send the claim) is put in an **outbox** with a **unique idempotency key**.
2. If online, it is sent at once. If not, it stays in the outbox.
3. When the signal returns, the outbox sends items in order.
4. The service remembers each key. If an item arrives twice, it is **applied only once**.

### 19.4 Voice

- **154 recordings** (77 Urdu, 77 English), made once with the free Microsoft Edge neural voices (`ur-PK-UzmaNeural`, `en-US-JennyNeural`) by `scripts/make_audio.py`.
- They are **files inside the app**, so they play offline.
- The audio list comes from the app's own manifest, so file names always match what the screens ask for.
- If a file is missing, the app falls back to the browser's speech or to text.

### 19.5 Design

Colours: deep teal for trust, a warm gold accent, a cream background. Rounded cards with soft shadows, a gradient progress bar, a split-screen login. Citizen screens use big text and one action per screen.

### 19.6 The practice demo (how it is built)

`web/src/components/Tutorial.tsx` is one component shown by the common step frame for citizens on steps 2 to 7. A timeline of frames (digit typed, hand on a key, button pressed) drives a **mock** number pad and mock buttons drawn inside the overlay. It reads no real input and calls no API, so it cannot change a claim. The voice is the recorded file `demo_<step>` in the chosen language. "Seen" flags live in the browser's local storage per user and page; the restart icon clears them. While it is open, the page's own voice is held back.

### 19.7 The ask-for-proof loop (how it is built)

- `POST /cases/{id}/officer-decision` accepts `doc_type` (`cnic_front`, `cnic_back`, `cnic_both`, `other`) for "ask_more". The saved decision carries the message (`explain_citizen`: English, Urdu, an `officer` marker, and `std` when it is one of the four standard sentences) and `next_step` = upload of that paper.
- The citizen claim page polls every 10 seconds, shows the box and opens `#/claim/<id>/5?doc=<paper>&redo=1`. In that mode the old photo is forgotten, no Next button is shown, and when the photo is accepted the page submits with a **new** idempotency key (the old key would only replay the first answer).
- The claim page saves a copy of the open claim on the phone, so the screen opens offline; the photo goes into the outbox.

## 20. The back end (the brain)

### 20.1 The tools and why

| Tool | What it is | Why we chose it |
|---|---|---|
| **Python 3** | The programming language | The language of machine learning, so AI and API live together |
| **FastAPI** | A web framework | Fast; checks every input; writes the Swagger documentation for free |
| **Uvicorn** | The web server that runs FastAPI | Standard and light |
| **psycopg 3** | The Postgres driver | Direct connection so we can set the user's identity in each transaction |
| **scikit-learn** | A machine learning library | Small, explainable models |
| **numpy, scipy** | Number crunching | Needed by scikit-learn and image maths |
| **rapidfuzz** | Text similarity | Fast name matching |
| **Pillow** | Image library | Reads photos for the document checks |
| **bcrypt (in the database)** | Password and PIN scrambling | PINs are never stored in plain text |
| **OpenCV (opencv-python)** | Computer vision library | Runs the YuNet face finder and SFace face matcher; also image maths |
| **RapidOCR + onnxruntime** | Text reader running small ONNX models on the CPU | Reads the ID card without internet or a graphics card |
| **joblib** | Saves a trained model to a file | The decision model is one small file (`service/models/prob_model.joblib`) |
| **edge-tts** (build time only) | Microsoft's free neural voices | Makes the recorded voice prompts once; not used while the app runs |
| **pytest** | Test runner | 179 service tests |

### 20.2 Folders inside `service/app`

| Folder or file | What it holds |
|---|---|
| `main.py`, `config.py` | Start-up and settings |
| `routers/` | The API calls, grouped: `auth`, `cases`, `people`, `rules`, `admin`, `tools` |
| `engine/` | The decision engine: `decide`, `facts`, `jsonlogic`, `model`, `policy`, `reasons`, `synth`, `costcurve`, `twin`, `llm` |
| `identity/` | Name normaliser and matcher |
| `scam/` | Scam detector and its invented training messages |
| `docs/` | Document checks, **ID card reader (`ocr.py`), face matcher (`face.py`)** and sample images |
| `eval/` | The evaluation script |
| `db.py` | Database access (connection reuse, per-user transactions) |
| `service_writes.py` | The **only** file that uses the database master key |
| `security.py`, `ratelimit.py`, `errors.py`, `deps.py` | Login tokens, rate limits, error format, role checks |
| `pipeline.py` | The claim pipeline: gather facts, decide, save, write the diary |
| `policy_search.py` | Policy search |

### 20.3 Two login modes

| Mode | How it works | Status |
|---|---|---|
| **local** (default) | Our own `local_users` table and a signed token (HS256 JWT). The database function `app.local_login` checks the PIN or password (bcrypt). 5 wrong tries lock the account for 30 seconds. | **Built and tested. This is what runs.** |
| **supabase** | Sign in through Supabase Auth | Written, **not tested** |

### 20.4 API style

- All answers are JSON. Errors have one shape with a code, a message in English and Urdu, details and a request id.
- Wrong email or wrong PIN gives the **same** answer, so nobody can find out which emails exist.
- Input is checked by strict models: unknown fields are refused.
- **Idempotency:** a write can carry an `Idempotency-Key` header. A repeat with the same key returns the first answer.
- **Swagger** is at `/docs` and the raw OpenAPI file at `/openapi.json`.

### 20.5 The public API (for other organisations)

Three calls under `/public/v1/` need an **`X-API-Key`** header:

| Call | What it does |
|---|---|
| `POST /public/v1/scam/check` | Checks a message for scams |
| `POST /public/v1/eligibility/precheck` | A rough "are you likely eligible" check |
| `GET /public/v1/cases/{id}/status` | The status of a case |

**Keys** are stored only as hashes. An admin can create, list and **revoke** them. A revoked key stops working immediately. Each key has its own per-minute limit and scopes. A missing or wrong key gets 401.

### 20.6 The mock government services

| Mock | Pretends to be | What it holds or returns |
|---|---|---|
| `mock.nadra` (and `GET /mock/nadra/{cnic}`) | NADRA, the national ID database | A complete, realistic record for every person: name (English and Urdu), **father's name (D/O, daughter of; there is no husband field)**, a full date of birth, gender, district, expiry, status, mobile number. A **photo** is held only for the demo person (Zainab). |
| `mock.nser` (`GET /mock/nser/{household_id}`) | NSER, the national poverty survey | The household record: **number of family members**, score, flags, survey date, district |
| `mock.raast_accounts`, `POST /mock/raast/verify` | Raast, instant payments | **The registry starts empty: no account number and no payment exists for anybody, and no person or claim in the seed holds an account.** `verify` only checks the shape of a typed mobile number (11 digits starting 03) and whether another household already uses it; it returns **no name**. The account is written to the registry **only after a claim is approved** (by the system or by a staff member), and the payment is recorded as **settled**, so the database shows she has been **paid**. |
| `POST /mock/raast/release` and `/settle` | Raast | Pretend payment release and settlement. After **any** approval, automatic or by staff, the service releases and settles at once (`AUTO_SETTLE`, on by default), so the claim ends as **Paid**. |

Two calls support the claim screens: `POST /cases/{id}/identity-lookup` (ID number to record; full details only for the signed-in person's own number, **name only** for any other number that exists, nothing for a number not in the records) and `POST /demo/restart-claim` (the demo restart, Section 5.4), `POST /cases/{id}/household-check` (she types her household size; the answer is only yes or no) and `POST /helper/verify-family` (the helper's three-detail proof).

Each mock checks the person's **consent** before answering. They are **simulated**. Nothing leaves the system.

### 20.7 Security features in the service

- **Rate limits:** login 40 per minute per computer and 8 per minute per email; uploads 20 per minute; scam check 30 per minute; Helper PIN consent 8 per minute.
- **Strict input checks** and a **size limit on uploads**.
- **Master key isolation:** only `service_writes.py` can use it.
- **No secrets in logs.**
- **Request ids** in every error and log line.
- **CORS** limited to the web app's address.
- **Tests:** 65 API security tests, including revoked keys, forbidden roles and bad input.

## 21. The database

### 21.1 What we use

**Postgres** (a very reliable SQL database), hosted by **Supabase** in the **Mumbai** region. We use Supabase as a **hosted Postgres**. Our own service handles login and logic.

### 21.2 Why Postgres (SQL) and not MongoDB or Firebase

| Need | Postgres | MongoDB / Firebase |
|---|---|---|
| Data full of links (people, households, cases, consents, decisions) | Built for links (joins and foreign keys) | Weaker for links; duplication is common |
| "Each role sees only its rows" | **Row-level security is built in** | Rules are shallow or written in application code |
| An unchangeable diary | **Triggers** can refuse changes and compute hashes | Not available in the same way |
| Money and exact counts | Transactions with full guarantees | Weaker multi-record guarantees |
| Migrations (a brief requirement) | Plain numbered SQL files | Not applicable |
| Free hosting | Supabase free plan | Yes, but we would lose the row locks |

### 21.3 Why Supabase

A managed Postgres with a free plan, backups and a good web dashboard, with no server for us to look after. **Region matters:** we first created the project in Seoul and each page took **20 to 60 seconds** from Karachi. After moving to Mumbai, pages take about **1.3 seconds**.

### 21.4 The six migrations

| File | What it creates |
|---|---|
| `0001_core.sql` | All tables and basic rules |
| `0002_rls.sql` | The row-lock policies |
| `0003_audit.sql` | The hash-chained diary and its protection |
| `0004_rules_consent.sql` | Rule versions, consent, helper sessions |
| `0005_case_safety.sql` | Separation of duties, two-person approval, hard flags |
| `0006_function_grants.sql` | Which database roles may call which functions |

Plus: a local shim for plain Postgres, the local-login file, and the seed data files.

### 21.5 Row-level security ("row locks")

Row-level security (RLS) means each table has **policies**, small rules saying which rows each user may read or change. If no policy allows it, the database refuses. All 27 tables have RLS switched on. Appendix A lists all **72 policies**.

Two examples in plain words:

- *Citizens read their own claims:* `owner_user_id = me`.
- *Admins read claims only for their own office and only with active consent:* `app.officer_sees_case(owner_user_id, office, status)`.

### 21.6 The hash-chained diary (challenge 5)

The table `audit_log` is the **diary**.

**How the chain works.** Each new row stores:

- `hash` = a SHA-256 fingerprint of **this row's content plus the previous row's hash**,
- `prev_hash` = the previous row's hash.

Because every row depends on the one before, **changing any old row changes its fingerprint, and then every later fingerprint stops matching.** `app.verify_audit_chain()` recomputes the whole chain and returns the first broken row (or nothing if intact).

**How it is protected.**

- A trigger **refuses** UPDATE, DELETE and TRUNCATE on `audit_log`.
- A lock (an advisory lock) makes sure two rows are never added at the same moment, which would break the chain.
- Only the database itself writes rows (through a protected function), not normal users.
- The "Verify the diary" button runs the check for the admin.

**Honest limit.** Someone with **full database owner power** could in theory rewrite the whole chain from the start. We say so. A real system would also publish the latest hash somewhere outside the database (for example, to a printed report or another system).

### 21.7 Other database features

- **Decisions are never updated.** A new decision is a new row with the full inputs, checks and trace.
- **Rule sets are immutable** and only one is active.
- **Consent** has events and a receipt hash.
- **Helper sessions:** one active family per helper (a unique index).
- **Drafts** carry a resume code and an idempotency key.
- **Masked views:** `people_masked` hides ID numbers for the admin.
- **Seed data (all invented):** 189 people, 179 households, 151 cases, 120 labelled past cases, 393 consents, 40 scam reports, 2 API keys, and 184 logins.

### 21.8 The local fallback database

For a laptop with **no internet**, the project can run a **local Postgres** (PGlite, a Postgres built to run in a program). The same migrations and the same seed data load into it. One script (`scripts/dev.ps1`) starts everything.

## 22. Running, hosting and the demo

### 22.1 Run everything on one laptop

```
.\scripts\dev.ps1
```

This starts the local database, loads migrations and seed, starts the service on port 8000 and the web app on port 5173. `.\scripts\dev.ps1 -Stop` stops them.

### 22.2 Run against Supabase

Put the Session pooler connection string in `.env` as `DATABASE_URL` and set `DB_SERIALIZE=0`. Run the migrations, then the local-login file and the seed. Start the service with `python -m uvicorn app.main:app --port 8000` from the `service` folder. (The `.env` file is never committed.)

### 22.3 The deployment plan

| Piece | Plan |
|---|---|
| **Hosting** | One Docker image holding the Python service **and** the built web app, deployed on **Render's free plan** (Singapore, near the Mumbai database) at https://sahara-relief.onrender.com |
| **Database** | Supabase Mumbai |
| **Why not Vercel** | Vercel suits websites and short functions. Our service is a long-running Python program that loads AI models, so it would restart cold and hit size limits |
| **Fallback** | The whole system on a laptop, with the local database, tested on a phone hotspot |
| **Status** | **Live.** The first cloud build worked. Settings: `DATABASE_URL`, `JWT_SECRET`, `AUTH_MODE=local`, `DB_SERIALIZE=0`. Measured: about 350 MB of memory in normal use with spikes near 520 MB against the free 512 MB limit; twelve card uploads in a row plus a full submit ran with no restart; about 2.6 to 3 s per photo and about 13 s for a cold submit on the tenth of a CPU. The instance sleeps after about 15 minutes idle and takes about a minute to wake; uploaded photos live on its disk and reset when it restarts; the app's request limit is 75 seconds so a waking server is not mistaken for no signal |

### 22.4 Demo checklist

Sample cards are made by `python scripts/make_sample_cards.py` into `Desktop\sahara-sample-docs`: **A1 and A2** are Zainab's correct ID card front and back; **B1 to B5** are wrong fronts (wrong name, wrong number, wrong face, name and number, everything).

1. Start with a fresh demo database (`python scripts/reset_supabase.py`). **The admin's review queue starts empty**: the invented waiting claims in the seed are closed by `scripts/demo_clean_queue.py` (nothing is deleted; pass `--keep-queue` to keep them). A claim appears in the admin queue only after Zainab sends one the system cannot approve.
2. Log in as **Zainab Bibi** (Urdu first, then English). Type her ID number `4130190000112` at step 3 and show her record. At step 4 type her household size `4`. Upload **A1 and A2**, type a mobile account (for example `03009900044`), send: **approved, paid**.
3. Press the faint **restart icon**. Repeat with **B3** (wrong face) or any B card as the front: **sent to a human with the exact reason**. Type the same account number each time (a different one is held as "account changed").
4. Type another person's ID number (for example `1310190001618`) to show that only the name appears; type `9999999999999` for "invalid ID number".
5. Switch the network off to show the offline outbox, then on.
6. Log in as the **helper** (`yousuf@helpers.sahara.test`, on his own phone): her family shows as `Z*** B***`. Type what she tells him: ID number `4130190000112`, date of birth `1978-06-15`, household size `4`; then **Start helping** and do the claim with her.
7. Log in as an **admin**: open a held case, show the decision card and the **Card vs record** check, decide.
8. As **admin**: make a draft rule, run the **Digital Twin**, show the cost slider; open **Diary** and **Verify the diary**.
9. Show the **scam checker** with the two sample messages, and **Swagger** with the demo API key.
10. Say out loud: *prototype, made-up data, AI-generated faces, trained on synthetic cases*.

## 23. Security summary

| Threat | Our defence |
|---|---|
| A user reads someone else's data | Row-level security in the database |
| An admin keeps looking after consent is withdrawn | Consent is checked on every read |
| A helper claims on behalf of a woman or takes her money | Her three details are needed; helper-owned accounts go to a human; helper sessions are one at a time |
| An insider edits history | An append-only, hash-chained diary |
| Changing rules secretly | Immutable versions, one active, every change in the diary |
| Guessing logins | Same error for wrong email or PIN, lockout, rate limits |
| Stolen API key | Keys stored as hashes, revocable, rate limited |
| Dangerous rules | Rules are data in a safe language, not code |
| Fake or edited papers | Document checks and duplicate fingerprints |
| Scam messages | Scam detector with plain reasons |
| Over-trusting the AI | Hard rules first, high approval line, auto-reject off, a person decides every "no" |


<div class="pagebreak"></div>

# PART 5. AI AND MACHINE LEARNING

## 24. AI basics in one page

**Machine learning** means a program learns a pattern from labelled examples instead of being given every rule. A **classifier** learns to put a case in one of several groups. Training adjusts numbers (weights) until the answers match the examples. We test on **fresh cases the model never saw**, because a model can only be judged on new data.

## 24A. The AI features at a glance

One row per feature. The details and the numbers are in the sections named in the last column, so they are not repeated here.

| Feature | What it does | How it works | Trained by us? | Result (synthetic data) | Sec. |
|---|---|---|---|---|---|
| **Decision model** | One honest number, `p_eligible`, to choose auto-approve, ask for proof, or a person | Logistic regression with isotonic calibration on 21 numbers | **Yes**: 12,000 synthetic cases, fixed seed | 37.9% approved alone; 14 wrong approvals of 758; 0 wrong rejections; about 6.6 ms | 27 |
| **Scam message checker** | Says safe, careful or scam, with reasons, in English, Roman Urdu and Urdu | TF-IDF letter pieces + 9 rule signals + logistic regression | **Yes**: about 480 messages we wrote | 92.9% on 56 test messages; 1 false alarm in 27 safe; 1 missed scam | 28 |
| **Name and duplicate matching** | SAME, MAYBE or DIFFERENT for two person records | Name cleaner + rapidfuzz with fixed weights; never SAME on a name alone | No (classic algorithm) | 0 false merges on 10 labelled pairs | 29 |
| **ID card reading** | Reads the name and number, tells front from back, compares with the government record | RapidOCR (small open-source ONNX models) on a fixed card layout | No (pretrained, used as it comes) | Caught every wrong name and number in our tests | 30.2 |
| **Face match** | Compares the face on the card with the government photo | OpenCV YuNet (finds the face) + SFace (128 numbers), "same" at cosine 0.50 or more | No (pretrained); **we chose the 0.50 line** | Caught every wrong face in our tests | 30.3 |
| **Photo integrity** | Blur, edit signs, the same photo sent twice (also by two people) | Sharpness score, error-level analysis, file fingerprint and picture fingerprint | No (classic image maths) | 21 of 21 invented images as expected | 30.1 |
| **"I am not sure" notes** | Gives the admin what was checked, what is missing and what to ask | Built by rules and templates from the decision trace, plus the 3 past labelled cases with the closest household score | No. **Not a learned model.** | Used on every case sent to a person | 15.1 |
| **Policy answers** | Answers a policy question with the clause as source | TF-IDF search over short clauses | No | Returns the clause text; never invents | 31 |
| **Digital Twin and cost curve** | Shows the effect of a rule change before it goes live | Replays up to 500 past cases under a draft rule; expected-cost curve | No (simulation) | Example: draft v2 moves 56 cases | 32 |
| **Recorded voice** | Speaks every prompt, reason and practice demo | Microsoft neural voices (edge-tts), recorded once, played from the phone | No (pretrained voices) | 154 files; works offline | 19.4 |

**Trained by us: two models** (rows 1 and 2). **Open-source pretrained tools used as they come: three** (RapidOCR, YuNet, SFace) plus the voices. **No language model is used** (Section 33).

**How the pieces work together in one claim:** hard rules run first and no score can beat them; the checks above (identity, card, face, photo integrity, household score, payout, scam) each give Pass, Not sure or Fail; the decision model weighs the soft signals; then the engine allows auto-approval only above 0.97 with no flag. Anything else goes to a person with the "I am not sure" notes.

**Where they are strong and where they are not.** The card reading, face match, name matching and photo checks do real work a clerk does today and caught every planted mistake in our tests. The decision model's confidence is only as good as its synthetic training data, so it shows the machinery works but is not proof of who is truly eligible. The scam checker was trained on messages we wrote. The notes, search and Digital Twin are useful tools but not learning.

## 24B. The three AI features to test in the demo

Judges are asked to test at least three AI features. These are the three we point them to. For each one: what to do in the demo, what the system does step by step, the numbers behind it, and where it stops working. The deeper sections are named in each heading.

### 24B.1 Computer vision: reading and checking the ID card (Section 30)

**Try it.** Log in as Zainab. Upload `A1` (front) and `A2` (back): approved and paid. Press the reset icon and upload `B1` (wrong name), `B2` (wrong number) or `B3` (wrong face) as the front: the claim goes to a person with the exact reason, and the admin sees the differences in red. Also upload the front where the back belongs: the screen says which side to send.

**What the system does with each photo**

1. **File check.** Only photos (jpeg or png) or a pdf within the size limit. Anything else is refused.
2. **Photo integrity.** *Blur:* a sharpness score (variance of the Laplacian); a blurry photo gets "please take it again". *Editing:* error-level analysis (a pasted region compresses differently) and the file's software tag. *Duplicates:* a fingerprint of the file and a fingerprint of the picture are compared with other people's papers. The same card sent by **two different people** raises a hard flag and an admin cannot approve it. A person's own retakes never count. *QR:* read where a QR exists (our sample cards have none).
3. **Which side?** The OCR text of the front has the labels Name, Father Name, Date of Birth and Identity Number; the back has Permanent Address, Present Address and Date of Issue. A wrong side is not accepted.
4. **Reading the front.** RapidOCR reads each label and the value under it, and pulls out the name, father's name, date of birth, expiry and the 13-digit number (dashes ignored, look-alike digits corrected).
5. **Comparing with the government record.** *Number:* digit by digit. *Name:* ignoring case and spaces, a small slip is accepted at 88% letter similarity. *Face:* YuNet finds the face on the card, SFace turns it into 128 numbers, and the cosine similarity with the registry photo must be **0.50 or more**.
6. **The outcome.** Seven mismatch combinations (face, name, number in any mix) each have their own reason code (Section 30.4); an unreadable card or no face asks for a clearer photo. Every mismatch says a staff member will check. The admin's side-by-side table adds a column "Her ID card photo" and a face row.

**Numbers.** Face line 0.50, chosen on test faces: different people scored up to 0.41, the same person on a card-sized noisy print 0.78 to 0.84. The photo checks classed 21 of 21 invented images as expected. About 2.6 to 3 seconds per photo on the free host's tenth of a CPU (faster on a laptop); about 350 MB of memory in normal use.

**Where it stops.** One fixed English card layout and clean sample photos; the face line was set on AI-generated faces and needs a fairness test; only Zainab has a registry photo (for others the face check is skipped, never guessed); QR is not demonstrated; edit detection is a heuristic a skilled forger would pass.

### 24B.2 Classification and routing: approve, ask, or hand to a person (Sections 15, 27, 28)

**Try it.** A correct claim goes **green** (approved and paid). A wrong card goes **blue**, "A person will look", with the reason. A blurry or missing paper goes **yellow**, "Please send one more thing". The admin queue lists only the blue ones, least sure first.

**What the system does**

1. **Gathers the facts** about the claim: the person, household, payout account, papers, the name-match result and the card comparison.
2. **Hard rules** (Section 15.2) run first.
3. **Checks** each give Pass, Not sure or Fail.
4. **The decision model** turns 21 numbers into one calibrated probability, `p_eligible`.
5. **Routing.** *Approve alone* only if `p_eligible` is at least **0.97**, no rule fired and no check is unsure. *Ask for proof* when one clear thing is missing: the screen names the paper and the claim loops back after she sends it. *Hand to a person* for everything else, which is the safe default. Below 0.15 it still goes to a person, because **auto-reject is off**.
6. **The queue** puts the least sure case first and attaches the "I am not sure" notes.

A second classifier sorts **SMS messages** into safe, careful or scam (score of at least 0.62 is scam, at least 0.30 is careful; a direct ask for a PIN, OTP or ID number is never labelled safe).

**Numbers.** The 0.97 line is calculated, not guessed: 1 − (cost of a person reviewing ÷ cost of a wrong approval) = 1 − 3/100. The decision model is a logistic regression with isotonic calibration, trained on 12,000 synthetic cases (fixed seed). On 2,000 fresh cases: 37.9% approved alone, 55.9% to a person, 6.3% asked for proof; 14 wrong approvals out of 758; 0 wrong rejections; about 6.6 ms a decision. The scam classifier scored 92.9% on 56 test messages, with 1 false alarm in 27 safe messages and 1 missed scam.

**Where it stops.** Trained and tested on data from the same generator, so it shows the machinery works, not who is truly eligible. The household cutoff and amounts are invented.

### 24B.3 Guardrails and human approval (Sections 15.2, 17, 36)

**Try it.** (a) Upload a wrong card: it is never approved. (b) As admin, try to approve a claim with an open hard flag (for example the same photo sent by two people): the database refuses. (c) The citizen takes back her permission: the admin is blocked at once. (d) A payment over Rs 20,000 needs a second admin. (e) A payout account that matches a helper's own number is held.

**The layers, from the outside in**

1. **Hard rules before any score** (15 of them: consent, ID validity, deceased, duplicate identity, payout cap, shared, changed or helper-owned account, scam flag, edited paper, household mismatch, someone else's ID, unreadable or mismatched card).
2. **The approval line** of 0.97, and no unsure check, before the machine acts alone.
3. **Disagreement or a missing fact** goes to a person: missing never means pass.
4. **Auto-reject is off**: the machine never says "no" alone.
5. **Human approval:** an admin decides every held case; payments above Rs 20,000 need a second, different admin.
6. **The database refuses** what the code might miss: approving with an open hard flag, approving your own or a helped case, deciding after consent was withdrawn, editing a decision or the diary.
7. **Everything is recorded:** rule version, model version, inputs (as a hash), every check, the full trace and the confidence, in a diary nobody can change.

Layered on purpose: if one layer has a bug, the next one still stops the mistake.

**Where it stops.** A guardrail is only as good as its rules, and the rules are ours. Someone with full database-owner power could rewrite the diary. The helper-commission problem is only reduced (Section 40).

## 24C. The judges' AI checklist: what we have and what we do not

| Feature | Have it? | What exists, accurately |
|---|---|---|
| RAG | **No** | Policy search (Section 31) retrieves the matching clause and shows it as the source. No language model writes an answer from it, so it is retrieval, not RAG |
| Autonomous agents and tool calling | **No** | The pipeline is a fixed set of checks in a fixed order. There is no agent and no model that calls tools |
| Classification and routing | **Yes** | Decision model and zones (24B.2); scam classifier |
| Computer vision (OCR, forgery, QR) | **Yes** | ID card reading, face match, edit detection, duplicates (24B.1). QR exists in the code but is not demonstrated |
| Voice (speech-to-text, text-to-speech) | **Half** | Text-to-speech: 154 recorded Urdu and English prompts. Speech-to-text: no, we cut it |
| Structured outputs | **Yes** | Every decision is a validated record: zone, result, reason code, confidence, checks, trace and next step. All API errors share one shape. They come from our engine, not from a language model (the optional model wrapper is switched off, and would be refused if its output did not fit the schema) |
| Guardrails and human approval | **Yes** | 24B.3 |
| Explainability | **Yes** | A plain reason in her language, every check with its result, the full trace, the notes, and the model and rule version on each decision |
| Anomaly detection | **No** | No anomaly model. The nearest are rule checks: a reused photo, a shared payout account, an account changed in the last 30 days |
| Memory and context | **Partial** | The system remembers a claim's saved progress and resume code, her earlier payout account, how many times proof was asked (after two it goes to a person), consent history and past similar cases. This is stored data, not an AI memory of conversations |
| Evaluation dashboard | **Yes** | Accuracy, confusion matrix, false alarms, speed and the cost curve (Section 9). If the database was reset, press **Run the evaluation** once |

**Bonus features:** Digital Twin, Helper Mode and Offline-First Sync are built and tested. **The Scam Map was not built.**

## 25. Core ideas

- **Probability, not yes/no.** The model outputs a number from 0 to 1. We act alone only above the **approval line** (0.97, Section 15.4).
- **Calibration.** When the model says 90%, about 90 in 100 such cases should be right. We calibrate so the number can be trusted.
- **Two kinds of mistake.** A **wrong approval** pays someone who should not be paid; a **wrong rejection** turns away someone who deserves it. Their costs differ, so one accuracy number is not enough (we report both).

## 26. Logistic regression in short

Logistic regression adds up the features, each multiplied by a learned weight, and squeezes the total into a 0-to-1 probability. It suits us because it is **small, fast, runs on a laptop CPU, needs little data**, and every weight can be read and explained to a judge. Training means finding the weights that best match the labelled cases.

## 27. Model 1: the decision model (challenge 2: "I am not sure")

### 27.1 Purpose

Give one honest number, **`p_eligible`**, for how likely a claim is to be truly eligible. The engine uses it with the hard rules and checks to choose AUTO, ASK_MORE or HUMAN.

### 27.2 Type

A **supervised binary classifier**: a **logistic regression** wrapped in **isotonic calibration**.

### 27.3 The 21 features (what the model looks at)

| Feature | Meaning |
|---|---|
| `id_same` | The name match band is SAME (1 or 0) |
| `id_maybe` | The band is MAYBE |
| `id_diff` | The band is DIFFERENT |
| `id_score` | The name match score (0 to 1; 0.5 if unknown) |
| `id_known` | A name match result exists |
| `doc_conf` | The lowest read confidence across papers (0.7 if unknown) |
| `doc_blurry` | At least one photo is blurry |
| `doc_edited` | At least one paper shows signs of editing |
| `doc_missing` | A required paper is missing |
| `pmt_margin` | How far the household score is below the cutoff, in units of 15 points, limited to between −2.5 and +2.5 |
| `pmt_missing` | The household score is missing |
| `flags` | How many exclusion flags (government employee, vehicle, tax filer, foreign trips, high phone bill) |
| `payout_risk` | The payout account is shared, helper-owned or changed in the last 30 days |
| `cnic_bad` | The ID number is invalid or expired |
| `deceased` | The record says the person died |
| `scam` | A scam signal on the claim |
| `duplicate` | The person may be in the records twice |
| `missing_fields` | Missing details divided by 7 |
| `any_visible_problem` | A summary flag: any visible problem at all |
| `pmt_clear_below` | The score is more than 6 points below the cutoff (clearly eligible side) |
| `pmt_clear_above` | The score is more than 6 points above the cutoff (clearly ineligible side) |

The cutoff used is the **active rule set's cutoff**, so changing the cutoff moves the probability too.

### 27.4 The training data

**12,000 synthetic cases**, made by our own generator (`engine/synth.py`) with a fixed random seed (**20261121**) so the result is repeatable. Every case has a hidden **true answer**.

**The mix of case types** (chosen by us, not measured from the real world):

| Category | Share | What it is |
|---|---|---|
| Clearly eligible | 40% | Low score, clean papers, name matches |
| Clearly ineligible | 25% | High score or an exclusion |
| Borderline | 15% | Score near the cutoff |
| Bad data | 15% | Missing score, blurry or missing papers, invalid ID |
| Scam | 5% | A scam signal |

**What makes a case "truly eligible"** in the generator: the **true** survey score is at or below the cutoff, there is **no true exclusion**, the person is **who the record says**, and **nothing is fraudulent**.

**What the system "sees" is the truth plus noise.** So cases near the cutoff are honestly uncertain, and a small share of clean-looking cases secretly hide a problem (a missed exclusion flag, or an impostor with a matching record). The generator uses **two cutoffs (25 and 30)** so the model does not memorise a single number.

**Why the mix matters:** an early version had too many bad-data cases and sent **96% of claims to a person**. We fixed the mix, the calibration and a missing-core-field rule. Now **about 38% are approved alone**.

### 27.5 The training steps and settings

1. Generate 12,000 synthetic cases.
2. Turn each into the 21 numbers (the "feature vector").
3. Train a **logistic regression** on them.
4. **Calibrate** it with **isotonic regression** using **5-fold cross-validation**.
5. Save the model file with a **version name** (`logreg-synth-v1-<8 letters>`, derived from the features, size and seed).

| Setting | Value | Meaning in plain words |
|---|---|---|
| Algorithm | Logistic regression (scikit-learn) | Weighted score to probability |
| `C` | 100 | A light brake: fit the training data closely |
| `max_iter` | 2000 | Up to 2000 rounds of searching for the weights |
| Calibration method | **Isotonic** | Bend the output into an honest staircase-shaped curve |
| Calibration folds `cv` | 5 | Rotate five train/test splits |
| Random seed | 20261121 | Makes training repeatable |
| Probability limits | Clipped to 0.001 to 0.999 | Never claims to be absolutely sure |
| Training cases | 12,000 | Synthetic |

**Isotonic calibration, simply.** After training, the raw probabilities are sorted from lowest to highest. A staircase-shaped curve is fitted so that among cases the model scores 0.97, about 97 in 100 really are eligible. Staircase means it never goes backwards, so a higher score always means higher honesty-adjusted probability. We chose isotonic over the simpler **Platt scaling** (a smooth S-curve) because we have plenty of synthetic data and isotonic can fit odd shapes.

### 27.6 How it is used at decision time

1. The engine gathers the facts and builds the 21 numbers.
2. The model returns `p_eligible`.
3. The engine compares it with the **approval line (0.97)**. It can only allow AUTO if **also** no rule fired and no check is unsure or failing.
4. The probability, model version and approval line are saved in the decision, so the admin can see exactly what was used.

### 27.7 Results (2,000 fresh synthetic cases)

| Measure | Result |
|---|---|
| Sent to AUTO | 758 (37.9%) |
| Sent to HUMAN | 1,117 (55.9%) |
| Sent to ASK MORE | 125 (6.3%) |
| Wrong auto-approvals | 14 of 758 (1.8%), all from "clearly eligible" cases that hid a problem |
| Clearly ineligible, scam, borderline or bad-data cases wrongly auto-approved | **0** of 1,179 |
| Total cost of the engine | **4,876** against **5,500** for a naive "decide everything alone" approach |
| Brier score | 0.0383 (honest probabilities) |
| Time per decision | about 6.6 ms |

**By category:**

| Category | Cases | AUTO | ASK MORE | HUMAN | Wrong approvals |
|---|---|---|---|---|---|
| Clearly eligible | 821 | 739 (90%) | 42 | 40 | 14 |
| Clearly ineligible | 501 | 0 | 0 | 501 | 0 |
| Borderline | 293 | 19 (6.5%) | 1 | 273 | 0 |
| Bad data | 299 | 0 | 82 | 217 | 0 |
| Scam | 86 | 0 | 0 | 86 | 0 |

### 27.7a Reading the results honestly

The model was trained and tested on data **made by the same generator**. So these numbers show the **machinery works** (the engine sends hard cases to people and only approves clean ones). They say **nothing** about how it would do on real households.

## 28. Model 2: the scam message detector (challenge 8)

### 28.1 Purpose

Warn a person that an SMS may be a scam and say **why**, in plain words. It **only warns**. It never blocks or deletes.

### 28.2 Type

A **supervised three-class classifier** (safe, suspicious, scam): **TF-IDF character n-grams plus rule features, fed to a logistic regression.**

### 28.3 How it works, step by step

1. **Clean the text.** Lower-case it, replace links with a marker `xurlx`, and replace every number with `0` (so "Rs 50000" and "Rs 20000" look alike).
2. **Cut into letter pieces.** Use **character n-grams of length 2 to 5** inside words (`char_wb`). This works for **English, Roman Urdu and Urdu script** and survives spelling changes.
3. **Weight them with TF-IDF** (with `sublinear_tf`, which tames very frequent pieces), keeping pieces that appear in at least 2 messages (`min_df=2`) and at most **30,000** pieces.
4. **Add 9 rule signals** (each 0 or 1):

| Signal | What it looks for |
|---|---|
| `asks_fee` | Asks you to pay a fee or send money (processing fee, release charges, "send Rs to this number"). Ignored if the message says there is **no fee**. |
| `asks_pin_otp` | Asks for your PIN, OTP, password or code. **Understands negation**, so "never share your PIN" does **not** trigger it. |
| `asks_cnic` | Asks for your ID card number or a photo of it |
| `urgent` | Pressure words: "urgent", "within 24 hours", "will be blocked", "last chance" |
| `suspicious_link` | A link that is not an official domain (shorteners such as bit.ly, odd endings like .xyz) |
| `prize` | Prize language: "you won", "lottery", "congratulations" |
| `sender_not_official` | A sender was given and it is not the official code |
| `official_sender` | The sender is the official code `9171` (made up) |
| `unknown_phone` | The message asks you to contact an unknown phone number |

5. **Logistic regression** gives probabilities for safe, suspicious and scam.
6. **Score = P(scam) + 0.5 × P(suspicious).** The label is:
   - **scam** if the score is at or above **0.62**,
   - **suspicious** ("Be careful") at or above **0.30**,
   - otherwise **safe**.
7. **A hard safety net:** a direct ask for a PIN, OTP or ID number is **never labelled safe**. The score is lifted at least to the suspicious line.
8. The reasons shown to the user come from the signals that fired, written as plain sentences in Urdu and English.

### 28.4 Training data and settings

| Item | Value |
|---|---|
| Training data | About **480 synthetic messages** that we wrote: English, Roman Urdu and Urdu script, labelled safe, suspicious or scam |
| Text features | `TfidfVectorizer(analyzer="char_wb", ngram_range=(2,5), sublinear_tf=True, min_df=2, max_features=30000)` |
| Classifier | `LogisticRegression(C=8.0, max_iter=2000)` |
| Random seed | 7 |
| Scam line / suspicious line | 0.62 / 0.30 |
| Model version | `scam-tfidf-lr-synth-v1` |

### 28.5 Results on a small labelled test set (56 messages)

| Measure | Result |
|---|---|
| Three-way accuracy | **92.9%** |
| Scam precision / recall | 95.7% / 95.7% |
| **False-alarm rate on safe messages** | **3.7%** (1 of 27) |
| Scams missed | 1 |
| Speed | about 39 ms per message |

Confusion matrix (rows = true, columns = predicted): safe 26 safe, 0 suspicious, 1 scam; suspicious 0, 6, 0; scam 1 safe, 2 suspicious, 20 scam.

### 28.6 Why a mix of learning and rules

Rules alone are easy to evade (change a word). A learned model alone can be fooled by a new trick and cannot explain itself. Together they are stronger and the **rule signals provide the plain-words reasons**.

### 28.7 Limits

The messages were written by us. Real SMS is messier. The numbers show the method works, not that it will catch real scams.

## 29. Name and duplicate matching (challenge 3)

**Type: classic algorithm, not trained.** It compares two person records and says SAME, MAYBE or DIFFERENT.

### 29.1 The normaliser

Before comparing, names are cleaned:

- **Spelling variants** of Muhammad (Mohammad, Mohammed, Muhammed, Mohamed, Mohd, Muhd, Md, ...) become one form.
- **Titles** such as Bibi, Begum, Khatoon, Mst, Syed, Haji are **dropped**, because they come and go ("Zainab Bibi" and "Zainab Begum" are the same woman).
- **Relation words** (S/O, W/O, D/O, "son of", "wife of") are stripped.
- Case, punctuation and extra spaces are cleaned.
- **Urdu and Roman script can be compared** using a consonant skeleton (a rough "sound outline": vowels removed, similar consonants merged) and a word list for common Urdu names.
- It is **total**: odd input (empty, huge, numbers, Urdu only, or `<script>` tags) gives a harmless result and never an error.

### 29.2 The scoring

Each field gets a similarity from 0 to 1 using **rapidfuzz** (a fast string-similarity library). Fields are combined with **fixed weights**:

| Field | Weight |
|---|---|
| Name | 30% |
| ID number (CNIC) | 30% |
| Father's or husband's name | 20% |
| Date of birth | 15% |
| District | 5% |

**A missing field is neutral:** it is left out of the average. It does not count for or against.

### 29.3 The bands

| Band | When |
|---|---|
| **SAME** | The weighted score is **at least 0.95**, a strong identifier agrees (an equal ID number, or an equal birth date **and** an equal father/husband name), and nothing hard disagrees |
| **MAYBE** | The score is at least 0.82, or the evidence conflicts. A person decides. |
| **DIFFERENT** | Otherwise |

### 29.4 The golden rules

1. **Never SAME on the name alone.** A strong identifier must agree.
2. **A different ID number with everything else equal is a possible duplicate: MAYBE, never merged.**
3. The weights are returned with the answer so a reviewer can see them.
4. The admin sees a **side-by-side table** and decides.

**Results:** on 10 labelled synthetic pairs there were **0 false merges** (two different people called SAME). Five same-person pairs were all SAME.

## 30. Document and ID card checks (challenge 8)

### 30.1 Photo checks

Every photo gets four quick checks: **blur** (a sharpness score), **signs of editing** (error-level analysis: a pasted region compresses differently), **duplicates** (a fingerprint of the file, so the same photo sent for two families is caught), and a **QR code** read where the program is installed. An unclear photo gets "please take it again"; the system never guesses.

### 30.2 Reading the ID card (computer vision)

The server reads the **front of the card** with RapidOCR (small ONNX models, CPU only, no internet needed after install). Our prototype uses one fixed English card layout so the reading is reliable: a label line, then its value on the next line (Name, Father Name, Gender, Date of Birth, Date of Expiry, Identity Number). The name and the 13-digit number are pulled out.

- **Which side?** The same reader tells the front (name, date of birth, identity-number labels) from the back (permanent address, present address, issue date). A back sent as the front, or a front sent as the back, is not accepted and the person is told which side to send.
- **Number:** compared with the government record digit by digit (dashes ignored).
- **Name:** compared with the record, ignoring case and spaces; a small spelling slip is accepted at 88% letter similarity.
- **What the admin sees:** the side-by-side table (Section 7) shows what the card said next to the government record, in red where they differ, plus a face row.

### 30.3 Matching the face

The card has a photo box and the government record (`mock.nadra.photo`) holds the holder's photo. Two small OpenCV models compare them: **YuNet** finds the face and **SFace** turns it into 128 numbers. Two faces are "the same person" at **cosine similarity 0.50 or more**.

- The model paper suggests 0.363. On our test faces that let one pair of **different** people through (0.41), while the same person on a card-sized noisy print scored 0.78 to 0.84. We chose the stricter line: a wrong "no match" only sends the claim to a person, a wrong "match" would wave a stranger through.
- Honest limit: this cutoff was set on **a handful of AI-generated faces**. It has not been tested on a real population, on different skin tones or ages, or on glare and bent cards. Before real use it needs that test and a fairness check. Only Zainab has a registry photo; for other people the face check is skipped, never guessed.

### 30.4 What the person is told

| Face | Name | Number | Reason code | The person sees (English) |
|---|---|---|---|---|
| match | match | match | none | goes on to the other checks (can be approved alone) |
| match | match | differs | `R_CARD_NUMBER_MISMATCH` | the ID number does not match the record |
| match | differs | match | `R_CARD_NAME_MISMATCH` | the name does not match the record |
| differs | match | match | `R_CARD_FACE_MISMATCH` | the face does not match the photo in the record |
| match | differs | differs | `R_CARD_BOTH_MISMATCH` | name and number do not match |
| differs | differs | match | `R_CARD_FACE_NAME_MISMATCH` | face and name do not match |
| differs | match | differs | `R_CARD_FACE_NUMBER_MISMATCH` | face and number do not match |
| differs | differs | differs | `R_CARD_ALL_MISMATCH` | face, name and number do not match |

Each case says that **a staff member will check**, so the person knows it was forwarded to a human. If the card or face cannot be read: `R_CARD_UNREADABLE`, "please send a clearer photo". If the person typed someone else's ID number (Section 5.2), the papers are compared with **that** record and the claim goes to a human with `R_ID_NOT_YOURS`.

A skilled forgery is not caught by this check; the edit signs help, and a person always decides doubtful cases. A real NADRA card (Urdu text, glare, bent corners) needs a larger model than this template reader.

## 31. Policy answers with sources

**Type: retrieval (search), no labels.** A citizen or admin can ask a plain question about the (made-up) programme policy.

- The policy is a short list of **clauses** (for example P8, "Consent").
- **TF-IDF over words and word pairs** (`ngram_range=(1,2)`, English stop words removed) turns each clause and the question into numbers.
- The clauses whose numbers are most similar to the question are returned **with their source** ("Sahara Relief Programme policy (MOCK), clause P8").
- It **does not invent an answer.** The answer is the policy text itself.

## 32. The Digital Twin and the cost curve

### 32.1 Digital Twin

**Type: simulation, no learning.** It takes up to 500 past cases (invented), runs them through the **current** rules and through a **draft**, and compares.

It reports: how many cases change zone, which moves (for example AUTO to HUMAN), how many approvals change, and the **total cost before and after** (using the true answers to count wrong approvals and wrong rejections). Example from the demo: **draft v2 moves 56 cases (22 from AUTO to HUMAN) and changes the cost from 1,399 to 1,373.**

**Why it matters:** the admin sees the effect of a rule change on real-looking cases **before** making it live.

### 32.2 The cost curve

For a range of approval lines, it computes the **expected total cost** on 3,000 synthetic predictions (seed 424242) using the admin's four costs, and draws the curve. The lowest point shows the best line. It is a preview only.

## 33. The optional language model

There is a small wrapper (`engine/llm.py`) that can call an outside language model (a local Ollama model, or Claude) only to **reword explanations**. It is **off by default** (`LLM_PROVIDER=none`). It is **never** used to make a decision. Nothing in the demo depends on it.

## 34. Why we built our own models

Our reasons:

1. **No real data is allowed.** We cannot send anything real to an outside service. Synthetic data is the only honest choice.
2. **"I am not sure" needs a trustworthy confidence.** A small **calibrated** model gives one. A chat model sounds sure even when it is wrong.
3. **Explainable.** We can print the weights and show which facts pushed a decision. An admin, a court or a citizen can ask "why?" and get a real answer.
4. **Fast, cheap and private.** About 6.6 ms per decision on a laptop, with no internet and no fees.
5. **Safe by design.** The model is a helper inside guard rails (section 36).
6. **We stay in control.** We know exactly what data and settings created each model, and every decision records the model version.

**What we trained and what we did not.** We trained the decision model and the scam checker ourselves, from scratch, on data we made. For reading the card and matching faces we use small open-source pretrained models (RapidOCR, and the YuNet and SFace files in `service/models/face`) as they come: they run on the CPU, need no internet, and send nothing to anyone. We did not use any hosted AI service.

## 35. How to reproduce the numbers

From the `service` folder:

```
python -m app.eval.run
```

It prints: the scam detector results, the decision engine results by category, the name matching result, and the document check result. Every time, it says: *"All data here is SYNTHETIC. These numbers show the machinery works. They do not show how it would perform on real people or real SMS traffic."*

The decision model is trained by `engine/model.py` (`train()`), and the scam model by `scam/classifier.py`. Both use fixed seeds so results repeat.

## 36. The AI guard rails

| Guard rail | What it does |
|---|---|
| **Hard rules first** | The model cannot override consent, ID validity, deceased flags, edited papers or payout risks. |
| **High approval line (0.97)** | The machine approves alone only when very sure. |
| **Any disagreement goes to a person** | Two checks that disagree send the claim to a human. |
| **Auto-reject is off** | The machine never says "no" alone. |
| **Missing means "not sure"** | A missing score or paper never passes. |
| **"I am not sure" notes** | When a person must decide, they get a summary of what was checked and what is missing. |
| **Every decision is recorded** | Rule version, model version, inputs, checks, trace and confidence are saved. |
| **Human approval for large payments** | Over Rs 20,000, two admins must approve. |
| **Warn, never block** | The scam checker only warns. |
| **Honest numbers** | Errors and false alarms are reported, and everything is labelled synthetic. |


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

1. **The helper-commission problem is only reduced, not solved.** Reports say some agents and helpers take a cut (Rs 1,000 to 2,000) from the woman's payment and she feels she cannot refuse. Software cannot stop a person asking for cash after the money has reached her account. *What we did:* the money goes to **her own** account, typed by her; a payout account that matches any helper's own number is held for a person; a helper needs her three details, holds one family at a time and cannot approve anything; everything is in the unchangeable diary. *What we did not do:* we cannot see who owns an account (only its shape is checked), and her three details are not secret. *Planned, not built:* an automatic phone call after every payout asking her whether she received the full amount (Section 41).
2. **All training and test data is synthetic.** The numbers show the **method works**, not how it performs on real people. We wrote the data generator, so the accuracy numbers measure how well the model learned **our own rules**.
3. **The Urdu text needs a native speaker's check**, including the practice demo lines. The voices are computer voices and we have not listened to every file.
4. **QR reading** needs a program that is not installed everywhere. The system asks for another photo instead of guessing.
5. **The diary** could in theory be rewritten by someone with full database-owner power. Normal users and the admin cannot do it.
6. **The hosted login mode** (Supabase Auth) is written but untested. The login we run is the local one.
7. **Hosting is the free plan**: a tenth of a CPU, memory close to the 512 MB limit in spikes, the instance sleeps when idle, and uploaded photos reset when it restarts. The Docker image works on Render but was never tested on a laptop. We have not load-tested the service.
8. **No voice input.** The citizen listens and taps. Offline use was tested with a simulated cut in Chrome, not on a real phone. There is no "weak signal" state: the badge only says online or offline.
9. **The ID card reader and face matcher** work on our fixed template card. The face cutoff (0.50) was set on a handful of AI-generated faces (Section 30.3). A real card needs a bigger model and a fairness test. Only Zainab has a registry photo; every other registry column is filled for every person.
10. **The mock payment pays at once** after an automatic approval (`AUTO_SETTLE`); a real rail would confirm later.
11. **Rate limiting** is in the service's memory. Fine for one server. A bigger system would use a shared store.
12. **Small test sets.** The scam test has 56 messages, the identity test 10 pairs and the document test 21 images.
13. **The helper consent proof** is her ID number, date of birth and household size. A keypad phone cannot approve anything, but these details are not secret: neighbours may know them. A real programme would add a one-time code sent by SMS to her registered mobile (needs a paid SMS gateway).

## 41. Future work

- Rehearse the live demo on the Render link, and move to a plan with 1 GB or more of memory for headroom.
- Test the Supabase login mode.
- Native-speaker review of all Urdu text and audio.
- Voice input in Urdu.
- A stronger card reader for real Urdu and English CNICs, and a fairness test of the face model.
- Train on **real, approved, de-identified** data under a proper data agreement, and re-measure everything.
- Publish the latest diary hash outside the database.
- A one-time code to her phone for helper consent.
- **A payout check call (planned, not built).** After every payout an automatic AI voice call phones each woman who was paid: press 1 if she received the full amount, press 2 if the helper or agent took or asked for money. A confirmed complaint removes the helper and fines him a very large sum. This is shown in the helper's app as "Planned safeguard (not built yet)". It needs a paid telephony service.
- A scam map showing reports by district.
- Staff dashboards for workload and delay.


# Appendix A. The database

Supabase Postgres (Mumbai): **27 tables**, **2 views**, **71 row-lock policies**, **65 triggers**, **47 helper functions**. A row-lock policy is a rule inside the database; if no policy allows an action, the database refuses it. All data is invented. The government mock registries live in schema `mock` (`nadra` with photos, `nser`, `raast_accounts`, `raast_payments`).

## A.1 How the tables connect

Each box is a table with its record count; each line is a link. `audit_log`, `api_keys`, `scam_reports`, `data_quality_queue` and the user tables stand alone on purpose. Colours: green = people, yellow = claims and decisions, blue = consent, purple = rules, red = audit diary, grey = platform.

<svg viewBox="0 0 1230 790" xmlns="http://www.w3.org/2000/svg" style="width:100%;font-family:Segoe UI,Arial,sans-serif">
<line x1="860" y1="460" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="860" y1="380" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="860" y1="300" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="860" y1="300" x2="600" y2="330" stroke="#8aa" stroke-width="1.2"/>
<line x1="600" y1="170" x2="330" y2="270" stroke="#8aa" stroke-width="1.2"/>
<line x1="600" y1="170" x2="330" y2="140" stroke="#8aa" stroke-width="1.2"/>
<line x1="90" y1="470" x2="330" y2="430" stroke="#8aa" stroke-width="1.2"/>
<line x1="600" y1="330" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="600" y1="330" x2="330" y2="430" stroke="#8aa" stroke-width="1.2"/>
<line x1="600" y1="330" x2="600" y2="500" stroke="#8aa" stroke-width="1.2"/>
<line x1="1100" y1="170" x2="860" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="860" y1="170" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="860" y1="60" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="1100" y1="590" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="1100" y1="590" x2="1100" y2="500" stroke="#8aa" stroke-width="1.2"/>
<line x1="1100" y1="500" x2="600" y2="500" stroke="#8aa" stroke-width="1.2"/>
<line x1="90" y1="330" x2="330" y2="140" stroke="#8aa" stroke-width="1.2"/>
<line x1="1100" y1="400" x2="600" y2="170" stroke="#8aa" stroke-width="1.2"/>
<line x1="330" y1="140" x2="330" y2="270" stroke="#8aa" stroke-width="1.2"/>
<line x1="330" y1="30" x2="330" y2="140" stroke="#8aa" stroke-width="1.2"/>
<line x1="330" y1="30" x2="330" y2="140" stroke="#8aa" stroke-width="1.2"/>
<line x1="90" y1="140" x2="330" y2="140" stroke="#8aa" stroke-width="1.2"/>
<line x1="860" y1="560" x2="600" y2="500" stroke="#8aa" stroke-width="1.2"/>
<rect x="15.0" y="42.0" width="150" height="36" rx="8" fill="#e6f3f0" stroke="#0f6f66" stroke-width="1.3"/>
<text x="90" y="58" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">user_roles</text>
<text x="90" y="72" text-anchor="middle" font-size="10" fill="#5f6e6c">183 rows</text>
<rect x="15.0" y="122.0" width="150" height="36" rx="8" fill="#e6f3f0" stroke="#0f6f66" stroke-width="1.3"/>
<text x="90" y="138" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">profiles</text>
<text x="90" y="152" text-anchor="middle" font-size="10" fill="#5f6e6c">183 rows</text>
<rect x="15.0" y="202.0" width="150" height="36" rx="8" fill="#e6f3f0" stroke="#0f6f66" stroke-width="1.3"/>
<text x="90" y="218" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">local_users</text>
<text x="90" y="232" text-anchor="middle" font-size="10" fill="#5f6e6c">183 rows</text>
<rect x="255.0" y="122.0" width="150" height="36" rx="8" fill="#e6f3f0" stroke="#0f6f66" stroke-width="1.3"/>
<text x="330" y="138" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">people</text>
<text x="330" y="152" text-anchor="middle" font-size="10" fill="#5f6e6c">189 rows</text>
<rect x="255.0" y="252.0" width="150" height="36" rx="8" fill="#e6f3f0" stroke="#0f6f66" stroke-width="1.3"/>
<text x="330" y="268" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">households</text>
<text x="330" y="282" text-anchor="middle" font-size="10" fill="#5f6e6c">179 rows</text>
<rect x="255.0" y="12.0" width="150" height="36" rx="8" fill="#e6f3f0" stroke="#0f6f66" stroke-width="1.3"/>
<text x="330" y="28" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">person_links</text>
<text x="330" y="42" text-anchor="middle" font-size="10" fill="#5f6e6c">11 rows</text>
<rect x="15.0" y="312.0" width="150" height="36" rx="8" fill="#e6f3f0" stroke="#0f6f66" stroke-width="1.3"/>
<text x="90" y="328" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">helper_assignments</text>
<text x="90" y="342" text-anchor="middle" font-size="10" fill="#5f6e6c">1 rows</text>
<rect x="525.0" y="152.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">cases</text>
<text x="600" y="182" text-anchor="middle" font-size="10" fill="#5f6e6c">261 rows</text>
<rect x="785.0" y="42.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="58" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">drafts</text>
<text x="860" y="72" text-anchor="middle" font-size="10" fill="#5f6e6c">486 rows</text>
<rect x="785.0" y="152.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">documents</text>
<text x="860" y="182" text-anchor="middle" font-size="10" fill="#5f6e6c">340 rows</text>
<rect x="1025.0" y="152.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="1100" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">doc_checks</text>
<text x="1100" y="182" text-anchor="middle" font-size="10" fill="#5f6e6c">12 rows</text>
<rect x="525.0" y="312.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="328" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">decisions</text>
<text x="600" y="342" text-anchor="middle" font-size="10" fill="#5f6e6c">347 rows</text>
<rect x="785.0" y="282.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="298" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">case_notes</text>
<text x="860" y="312" text-anchor="middle" font-size="10" fill="#5f6e6c">83 rows</text>
<rect x="785.0" y="362.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="378" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">case_flags</text>
<text x="860" y="392" text-anchor="middle" font-size="10" fill="#5f6e6c">21 rows</text>
<rect x="785.0" y="442.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="458" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">case_events</text>
<text x="860" y="472" text-anchor="middle" font-size="10" fill="#5f6e6c">1567 rows</text>
<rect x="255.0" y="412.0" width="150" height="36" rx="8" fill="#e2edfb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="330" y="428" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">consents</text>
<text x="330" y="442" text-anchor="middle" font-size="10" fill="#5f6e6c">413 rows</text>
<rect x="15.0" y="452.0" width="150" height="36" rx="8" fill="#e2edfb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="90" y="468" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">consent_events</text>
<text x="90" y="482" text-anchor="middle" font-size="10" fill="#5f6e6c">437 rows</text>
<rect x="525.0" y="482.0" width="150" height="36" rx="8" fill="#f1e8fb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="498" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">rule_sets</text>
<text x="600" y="512" text-anchor="middle" font-size="10" fill="#5f6e6c">2 rows</text>
<rect x="785.0" y="542.0" width="150" height="36" rx="8" fill="#f1e8fb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="558" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">rules</text>
<text x="860" y="572" text-anchor="middle" font-size="10" fill="#5f6e6c">18 rows</text>
<rect x="255.0" y="572.0" width="150" height="36" rx="8" fill="#fde9e7" stroke="#0f6f66" stroke-width="1.3"/>
<text x="330" y="588" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">audit_log</text>
<text x="330" y="602" text-anchor="middle" font-size="10" fill="#5f6e6c">19177 rows</text>
<rect x="15.0" y="582.0" width="150" height="36" rx="8" fill="#eee" stroke="#0f6f66" stroke-width="1.3"/>
<text x="90" y="598" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">api_keys</text>
<text x="90" y="612" text-anchor="middle" font-size="10" fill="#5f6e6c">2 rows</text>
<rect x="525.0" y="622.0" width="150" height="36" rx="8" fill="#eee" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="638" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">scam_reports</text>
<text x="600" y="652" text-anchor="middle" font-size="10" fill="#5f6e6c">40 rows</text>
<rect x="1025.0" y="382.0" width="150" height="36" rx="8" fill="#eee" stroke="#0f6f66" stroke-width="1.3"/>
<text x="1100" y="398" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">labelled_cases</text>
<text x="1100" y="412" text-anchor="middle" font-size="10" fill="#5f6e6c">120 rows</text>
<rect x="1025.0" y="482.0" width="150" height="36" rx="8" fill="#eee" stroke="#0f6f66" stroke-width="1.3"/>
<text x="1100" y="498" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">eval_runs</text>
<text x="1100" y="512" text-anchor="middle" font-size="10" fill="#5f6e6c">1 rows</text>
<rect x="1025.0" y="572.0" width="150" height="36" rx="8" fill="#eee" stroke="#0f6f66" stroke-width="1.3"/>
<text x="1100" y="588" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">eval_cases</text>
<text x="1100" y="602" text-anchor="middle" font-size="10" fill="#5f6e6c">0 rows</text>
<rect x="525.0" y="722.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="738" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">data_quality_queue</text>
<text x="600" y="752" text-anchor="middle" font-size="10" fill="#5f6e6c">48 rows</text>
</svg>

## A.2 Every table in one line

| Table | Group | What it holds | Who reads it | Rows |
|---|---|---|---|---|
| `local_users` | People and logins | The login table used in local login mode: email, a scrambled (bcrypt) password or PIN, failed-attempt counter and a lock time | Nobody signs in through the database directly | 183 |
| `profiles` | People and logins | The display details of a user: full name, preferred language (Urdu or English), the office they belong to, and the link to their person record. | A user reads and updates their own profile | 183 |
| `user_roles` | People and logins | One row per user | The user themselves reads their own row | 183 |
| `households` | Identity | A household from the (mock) national survey: district, number of members, the poverty score (pmt_score), and flags such as government employee, owns vehicle, tax filer, foreign trips, high phone bill. | Visible to people who can see someone in that household (the same rules as people) | 179 |
| `people` | Identity | The identity record of a person: name in English letters and Urdu, ID card (CNIC) number and expiry, date of birth, father or husband name, gender, district, whether deceased, household, mock phone or wallet, source of the record. | A citizen sees only their own record | 189 |
| `people_masked` (view) | Identity | A VIEW (a saved query, not stored data) of people with the ID number hidden except the end, for the admin. | Admin and staff views only | 0 |
| `person_links` | Identity | Possible matches between two person records (the same woman on two records) | Visible if you can see either person | 11 |
| `helper_assignments` | Helper Mode | Which families a helper helps | A helper reads their own assignments | 1 |
| `case_events` | Claims | The timeline of a claim: created, step saved, submitted, decided, and so on, each with who did it and extra data. | Visible to anyone who can see the claim | 1567 |
| `cases` | Claims | The claim itself, one per person per quarter | The citizen reads her own claims | 261 |
| `doc_checks` | Claims | Each individual check on a document: name of the check (blur, edit signs, duplicate), verdict, confidence and detail. | Visible to anyone who can see the document. | 12 |
| `documents` | Claims | One row per photographed paper: the type (ID card front, and so on), where the file is stored, its SHA-256 fingerprint, the check signals (as JSON) and the verdict (ok, blurry, suspicious). | Visible to anyone who can see the claim | 340 |
| `drafts` | Claims | The saved in-progress claim: which step she reached, the answers so far, the 6-digit resume code and an idempotency key so a repeated save is not applied twice. | Citizen and helper, for claims they can see. | 486 |
| `case_flags` | Decisions | Concern flags an admin raises on a claim (kind, severity, status, who opened and resolved it). | Read by admin | 21 |
| `case_notes` | Decisions | The 'I am not sure' package: what was checked, what is missing, what the admin should do next. | Read by admins for visible claims | 83 |
| `data_quality_queue` | Decisions | A to-do list of bad or odd data found by the system (for example a missing name), with the reason code and status. | Read by admin | 48 |
| `decisions` | Decisions | Every decision ever made on a claim, never updated | Visible to anyone who can see the claim | 347 |
| `consent_events` | Consent | The history of each consent: granted, withdrawn, with a receipt hash so the citizen can keep proof. | Visible to whoever can see the consent. | 437 |
| `consent_flags` (view) | Consent | A VIEW: for a person and purpose, is there an active consent right now (true or false)? | Used by the database rules | 0 |
| `consents` | Consent | Each permission: who gave it (subject), to whom (office, helper or the payment service), for what purpose (claim_processing, claim_help), which fields, status (granted, withdrawn, expired), when granted and withdrawn, and a version. | The citizen reads and updates (withdraws) her own consents and inserts her own | 413 |
| `rule_sets` | Rules | A version of the programme rules | Active version readable by citizens and admins | 2 |
| `rules` | Rules | The individual rules inside a rule set: a code, the condition as safe json-logic, the outcome (PASS, HOLD, ASK_MORE), the reason code and the reason text in English and Urdu. | Readable wherever the rule set is readable | 18 |
| `audit_log` | Audit | The diary | Admin read everything | 19177 |
| `api_keys` | Platform | Keys for the public API: a name, the hash of the key (the key itself is never stored), allowed scopes, a per-minute limit, revoked flag and dates. | Admin read | 2 |
| `scam_reports` | Platform | Messages that people checked or reported: the text, the sender, the label (safe, suspicious, scam), the score, the reasons, language and district. | Citizen, helper and admin insert reports as themselves and read their own | 40 |
| `schema_migrations` | Platform | The list of migration files that have been applied, with the time. | Internal. | 6 |
| `eval_cases` | Evaluation | The per-case results of an evaluation run: truth, predicted, zone, correct or not, cost. | Admin read. | 0 |
| `eval_runs` | Evaluation | One row for each evaluation run with the metrics as JSON. | Admin read. | 1 |
| `labelled_cases` | Evaluation | Past made-up cases with the true answer (truth) and the facts at the time | Admin. | 120 |

## A.3 Policies and triggers

Policies per table: `api_keys` 3, `audit_log` 2, `case_events` 2, `case_flags` 3, `case_notes` 2, `cases` 9, `consent_events` 1, `consents` 5, `data_quality_queue` 2, `decisions` 2, `doc_checks` 1, `documents` 2, `drafts` 2, `eval_cases` 1, `eval_runs` 1, `helper_assignments` 6, `households` 2, `labelled_cases` 1, `people` 1, `person_links` 2, `profiles` 5, `rule_sets` 5, `rules` 3, `scam_reports` 3, `user_roles` 5.

Triggers: `api_keys.zz_audit`, `audit_log.audit_chain_fill`, `audit_log.audit_no_update`, `case_flags.case_flags_guard`, `case_flags.case_flags_sync`, `case_flags.zz_audit`, `cases.cases_guard`, `cases.cases_no_delete`, `cases.zz_audit`, `consent_events.consent_events_immutable`, `consent_events.zz_audit`, `consents.consents_after_insert`, `consents.consents_after_update`, `consents.consents_before`, `consents.consents_no_delete`, `consents.zz_audit`, `decisions.decisions_before_insert`, `decisions.decisions_immutable`, `decisions.zz_audit`, `documents.zz_audit`, `helper_assignments.zz_audit`, `profiles.profiles_guard`, `rule_sets.rule_sets_guard`, `rule_sets.zz_audit`, `rules.rules_guard`, `rules.zz_audit`, `user_roles.user_roles_guard`, `user_roles.zz_audit`.

Helper functions in schema `app` include `app.current_role()`, `app.can_see_person(id)`, `app.has_consent(...)`, `app.activate_rule_set(id)`, `app.verify_audit_chain()`, `app.local_login(email, secret)`, `app.helper_start_session(person)`.


# Appendix B. API reference (every call)

The Swagger page `/docs` shows the same list interactively. **Who** means which roles may call it. 'any signed in' means any logged-in user. 'API key' means it needs the `X-API-Key` header.

| Method | Path | What it does | Who |
|---|---|---|---|
| GET | `/analytics/summary` | Counts for the evaluation page: cases, zones, waiting, average time, overrides, scam checks. | admin |
| GET | `/api-keys` | List the public API keys (names, limits, revoked or not). Never shows the key itself. | admin |
| POST | `/api-keys` | Create a public API key. The key is shown once and stored only as a hash. | admin |
| DELETE | `/api-keys/{key_id}` | Revoke a key. It stops working at once. | admin |
| GET | `/audit` | Read the diary with filters (entity, action, actor) and paging. | admin |
| GET | `/audit/mine` | Read only the diary lines about me. | any signed in |
| GET | `/audit/verify` | Re-check the whole hash chain. Says intact or broken at row N. | admin |
| POST | `/auth/login` | Log in with email and PIN or password. Returns a token and the user. | public (rate limited) |
| POST | `/cases` | Start (or open) the claim for this quarter. A helper passes the family's person id. | citizen, helper |
| GET | `/cases` | List the claims I may see. | any signed in |
| GET | `/cases/{case_id}` | One claim with person, household, documents and consent state. | any signed in |
| POST | `/cases/{case_id}/assign` | Assign a case to an admin (or take it). | admin |
| POST | `/cases/{case_id}/close` | Close a finished case. | admin |
| POST | `/cases/{case_id}/decide` | Run the decision engine again on the current claim. | admin |
| GET | `/cases/{case_id}/decisions` | All decisions ever made on this claim, newest first. | any signed in |
| POST | `/cases/{case_id}/documents` | Upload a paper photo. The service checks blur, editing and duplicates. | citizen, helper |
| PUT | `/cases/{case_id}/draft` | Save the answers so far and the current step (supports Idempotency-Key). | citizen, helper |
| POST | `/cases/{case_id}/escalate` | Send a case up for a second look. | admin |
| GET | `/cases/{case_id}/events` | The timeline of this claim. | any signed in |
| POST | `/cases/{case_id}/identity-check` | Compare the claimant with the records (SAME, MAYBE, DIFFERENT) with evidence. | citizen, helper |
| GET | `/cases/{case_id}/notes` | The 'I am not sure' notes: what was checked, what is missing, next steps. | admin |
| POST | `/cases/{case_id}/officer-decision` | An admin approves, rejects, asks for more proof or holds, with a note. | admin |
| POST | `/cases/{case_id}/submit` | Send the claim. Runs the decision engine and returns the decision card. | citizen, helper |
| GET | `/consents` | List consents (mine, or a family's for a helper). | admin, citizen, helper |
| POST | `/consents` | Give consent. A helper must include the woman's own PIN (subject_pin). | citizen, helper |
| POST | `/consents/{consent_id}/withdraw` | Take consent back. Access stops at once. Returns a receipt hash. | citizen, helper |
| GET | `/data-access-log` | Who has looked at my data, when and why. | citizen, helper |
| POST | `/docs/analyze` | Check one photo for blur, editing signs and duplicates without saving a claim. | any signed in |
| GET | `/drafts/resume/{code}` | Open a draft with the 6-digit resume code (no login). | public (rate limited) |
| GET | `/eval/latest` | The last saved evaluation run. | admin |
| POST | `/eval/run` | Run the evaluation on synthetic data and return the numbers. | admin |
| GET | `/healthz` | Is the service up and the database reachable? | public (rate limited) |
| GET | `/helper/families` | The families this helper helps. Names are masked until consent. | helper |
| POST | `/helper/session` | Open one family (or close the open one). Only one at a time. | helper |
| POST | `/identity/match` | Compare two person records field by field. | any signed in |
| GET | `/me` | Who am I: role, name, language, office. | any signed in |
| PATCH | `/me` | Change my language or display details. | any signed in |
| GET | `/metrics` | Simple service numbers for admin. | admin |
| GET | `/mock/nadra/{cnic}` | Pretend NADRA: identity record for an ID number (consent is checked). | any signed in (consent checked inside) |
| GET | `/mock/nser/{household_id}` | Pretend NSER: household record and poverty score (consent is checked). | any signed in (consent checked inside) |
| POST | `/mock/raast/release` | Pretend Raast: release a payment. | any signed in (consent checked inside) |
| POST | `/mock/raast/settle` | Pretend Raast: settle a payment. | any signed in (consent checked inside) |
| POST | `/mock/raast/verify` | Pretend Raast: get the name on an account number. | any signed in (consent checked inside) |
| GET | `/policy/cost-curve` | Expected cost against the approval line for the given costs (preview only). | admin |
| GET | `/policy/search` | Search the programme policy. Returns clauses with their source. | any signed in |
| GET | `/public/v1/cases/{case_id}/status` | Public API: the status of a case. | API key |
| POST | `/public/v1/eligibility/precheck` | Public API: a rough 'are you likely eligible' check. | API key |
| POST | `/public/v1/scam/check` | Public API: scam check for a message. | API key |
| GET | `/queue` | The admin queue: cases waiting for a person, sorted by priority then least sure. | admin |
| GET | `/rule-sets` | List the rule versions. | admin |
| POST | `/rule-sets` | Make a new draft rule set (copy of a version, with changes). | admin |
| GET | `/rule-sets/{set_id}` | One rule version with its rules. | admin |
| POST | `/rules/activate` | Make a draft live. The old version is retired. | admin |
| POST | `/rules/twin` | Digital Twin: replay past cases under a draft and show who changes. | admin |
| POST | `/rules/validate` | Check a rule or a whole draft for mistakes before saving. | admin |
| POST | `/scam/check` | Check an SMS: safe, suspicious or scam, with reasons. | any signed in |
| POST | `/scam/report` | Report a message. | admin, citizen, helper |
| GET | `/users` | List users (admin). | admin |
| POST | `/users` | Create a user and role (admin). | admin |


# Appendix C. Reason codes

Every decision carries one of these codes. The citizen sees the plain sentence in her language. Zone shows where the case goes.

| Code | Zone | English sentence | Urdu sentence |
|---|---|---|---|
| <code>R_<wbr>AUTO_<wbr>APPROVED</code> | <span style='white-space:nowrap'>AUTO</span> | Your claim matches the rules. Your payment is approved and the amount has been sent to your account. | آپ کا دعویٰ قواعد پر پورا اترتا ہے۔ آپ کی ادائیگی منظور ہو گئی ہے اور رقم آپ کے اکاؤنٹ میں بھیج دی گئی ہے۔ |
| <code>R_<wbr>CONSENT_<wbr>MISSING</code> | <span style='white-space:nowrap'>HUMAN</span> | We need your permission before we can look at your details. | آپ کی تفصیلات دیکھنے سے پہلے ہمیں آپ کی اجازت چاہیے۔ |
| <code>R_<wbr>CNIC_<wbr>INVALID</code> | <span style='white-space:nowrap'>ASK_MORE</span> | The ID number looks wrong. Please check it or send a clear photo. | شناختی کارڈ نمبر درست نہیں لگتا۔ براہ کرم دوبارہ دیکھیں یا صاف تصویر بھیجیں۔ |
| <code>R_<wbr>CNIC_<wbr>EXPIRED</code> | <span style='white-space:nowrap'>HUMAN</span> | Your ID card has expired. Please renew it. A staff member will help. | آپ کا شناختی کارڈ ختم ہو چکا ہے۔ براہ کرم اسے تجدید کروائیں۔ عملے کا فرد مدد کرے گا۔ |
| <code>R_<wbr>DECEASED</code> | <span style='white-space:nowrap'>HUMAN</span> | Our records show a problem with this person. A staff member will check. | ہمارے ریکارڈ میں اس شخص کے بارے میں مسئلہ ہے۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>DUPLICATE_<wbr>IDENTITY</code> | <span style='white-space:nowrap'>HUMAN</span> | This person may be in our records twice. A staff member will check before any payment. | یہ شخص ہمارے ریکارڈ میں دو بار ہو سکتا ہے۔ ادائیگی سے پہلے عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>NAME_<wbr>AMBIGUOUS</code> | <span style='white-space:nowrap'>HUMAN</span> | The name matches more than one record. A staff member will check. | یہ نام ایک سے زیادہ ریکارڈ سے ملتا ہے۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>PMT_<wbr>ABOVE_<wbr>CUTOFF</code> | <span style='white-space:nowrap'>HUMAN</span> | Your household score is above the limit for this programme. A staff member will confirm. | آپ کے گھرانے کا اسکور اس پروگرام کی حد سے زیادہ ہے۔ عملے کا فرد تصدیق کرے گا۔ |
| <code>R_<wbr>PMT_<wbr>BORDERLINE</code> | <span style='white-space:nowrap'>HUMAN</span> | Your score is close to the limit. A staff member will look at your case. | آپ کا اسکور حد کے بہت قریب ہے۔ عملے کا فرد آپ کا کیس دیکھے گا۔ |
| <code>R_<wbr>PMT_<wbr>MISSING</code> | <span style='white-space:nowrap'>HUMAN</span> | We could not find your household score. A staff member will help. | ہمیں آپ کے گھرانے کا اسکور نہیں ملا۔ عملے کا فرد مدد کرے گا۔ |
| <code>R_<wbr>EXCLUSION_<wbr>HIT</code> | <span style='white-space:nowrap'>HUMAN</span> | A rule needs a closer look at your household. A staff member will check. | ایک اصول کے تحت آپ کے گھرانے کی مزید جانچ ضروری ہے۔ عملے کا فرد دیکھے گا۔ |
| <code>R_<wbr>DOC_<wbr>MISSING</code> | <span style='white-space:nowrap'>ASK_MORE</span> | Please send the missing paper. | براہ کرم کمی والا کاغذ بھیجیں۔ |
| <code>R_<wbr>DOC_<wbr>BLURRY</code> | <span style='white-space:nowrap'>ASK_MORE</span> | The photo is not clear. Please take it again in good light. | تصویر صاف نہیں ہے۔ براہ کرم روشنی میں دوبارہ لیں۔ |
| <code>R_<wbr>DOC_<wbr>LOW_<wbr>CONFIDENCE</code> | <span style='white-space:nowrap'>ASK_MORE</span> | We could not read the paper well. Please send a clearer photo. | ہم کاغذ ٹھیک سے پڑھ نہیں سکے۔ براہ کرم زیادہ صاف تصویر بھیجیں۔ |
| <code>R_<wbr>DOC_<wbr>EDITED</code> | <span style='white-space:nowrap'>HUMAN</span> | This paper needs a closer look. A staff member will check it. | اس کاغذ کی مزید جانچ ضروری ہے۔ عملے کا فرد دیکھے گا۔ |
| <code>R_<wbr>PAYOUT_<wbr>ACCOUNT_<wbr>SHARED</code> | <span style='white-space:nowrap'>HUMAN</span> | The payment account is used by other families. A staff member will check. | ادائیگی کا اکاؤنٹ دوسرے گھرانے بھی استعمال کر رہے ہیں۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>PAYOUT_<wbr>ACCOUNT_<wbr>CHANGED</code> | <span style='white-space:nowrap'>HUMAN</span> | The payment account was changed recently. A staff member will check. | ادائیگی کا اکاؤنٹ حال ہی میں تبدیل ہوا ہے۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>PAYOUT_<wbr>HELPER_<wbr>OWNED</code> | <span style='white-space:nowrap'>HUMAN</span> | The payment account belongs to a helper, not to you. A staff member will check. | ادائیگی کا اکاؤنٹ مددگار کا ہے، آپ کا نہیں۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>PAYOUT_<wbr>OVER_<wbr>CAP</code> | <span style='white-space:nowrap'>HUMAN</span> | This payment is larger than the usual limit. Two staff members must approve it. | یہ ادائیگی معمول کی حد سے زیادہ ہے۔ دو افسران کی منظوری ضروری ہے۔ |
| <code>R_<wbr>CHECKS_<wbr>DISAGREE</code> | <span style='white-space:nowrap'>HUMAN</span> | Our checks did not agree. A staff member will look at your case. | ہماری جانچ ایک دوسرے سے نہیں ملی۔ عملے کا فرد آپ کا کیس دیکھے گا۔ |
| <code>R_<wbr>MISSING_<wbr>FIELDS</code> | <span style='white-space:nowrap'>HUMAN</span> | Some details are missing. A staff member will help you. | کچھ تفصیلات موجود نہیں ہیں۔ عملے کا فرد آپ کی مدد کرے گا۔ |
| <code>R_<wbr>SCAM_<wbr>FLAG</code> | <span style='white-space:nowrap'>HUMAN</span> | Something in this claim looks like a scam. A staff member will check. Do not share your PIN. | اس دعوے میں کوئی چیز فراڈ جیسی لگتی ہے۔ عملے کا فرد جانچ کرے گا۔ اپنا پن کسی کو نہ بتائیں۔ |
| <code>R_<wbr>LOW_<wbr>CONFIDENCE</code> | <span style='white-space:nowrap'>HUMAN</span> | I am not sure. A person will look at your case. | مجھے یقین نہیں ہے۔ ایک انسان آپ کا کیس دیکھے گا۔ |
| <code>R_<wbr>LIKELY_<wbr>NOT_<wbr>ELIGIBLE</code> | <span style='white-space:nowrap'>HUMAN</span> | Based on the rules, you may not qualify. A staff member will confirm and explain. | قواعد کے مطابق شاید آپ اہل نہ ہوں۔ عملے کا فرد تصدیق کر کے وضاحت کرے گا۔ |
| <code>R_<wbr>CARD_<wbr>NUMBER_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The ID number on your card does not match our record. A staff member will check. | آپ کے کارڈ پر شناختی نمبر ہمارے ریکارڈ سے نہیں ملتا۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>CARD_<wbr>NAME_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The name on your card does not match our record. A staff member will check. | آپ کے کارڈ پر نام ہمارے ریکارڈ سے نہیں ملتا۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>CARD_<wbr>BOTH_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The name and the ID number on your card do not match our record. A staff member will check. | آپ کے کارڈ پر نام اور شناختی نمبر دونوں ہمارے ریکارڈ سے نہیں ملتے۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>CARD_<wbr>UNREADABLE</code> | <span style='white-space:nowrap'>ASK_MORE</span> | We could not read your ID card. Please take a clear photo of the front, flat, in good light. | ہم آپ کا شناختی کارڈ پڑھ نہیں سکے۔ براہ کرم کارڈ کے سامنے کی صاف تصویر روشنی میں سیدھی لیں۔ |
| <code>R_<wbr>CARD_<wbr>FACE_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The face on your card does not match the photo in our record. A staff member will check. | آپ کے کارڈ پر چہرہ ہمارے ریکارڈ کی تصویر سے نہیں ملتا۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>CARD_<wbr>FACE_<wbr>NAME_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The face and the name on your card do not match our record. A staff member will check. | آپ کے کارڈ پر چہرہ اور نام ہمارے ریکارڈ سے نہیں ملتے۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>CARD_<wbr>FACE_<wbr>NUMBER_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The face and the ID number on your card do not match our record. A staff member will check. | آپ کے کارڈ پر چہرہ اور شناختی نمبر ہمارے ریکارڈ سے نہیں ملتے۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>CARD_<wbr>ALL_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The face, the name and the ID number on your card do not match our record. A staff member will check. | آپ کے کارڈ پر چہرہ، نام اور شناختی نمبر ہمارے ریکارڈ سے نہیں ملتے۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>ID_<wbr>NOT_<wbr>YOURS</code> | <span style='white-space:nowrap'>HUMAN</span> | The ID number you typed belongs to someone else, not to the account you signed in with. A staff member will check. | آپ کا لکھا ہوا شناختی نمبر کسی اور کا ہے، آپ کے لاگ ان اکاؤنٹ کا نہیں۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>HOUSEHOLD_<wbr>MISMATCH</code> | <span style='white-space:nowrap'>HUMAN</span> | The number of people in your household does not match our record. A staff member will check. | آپ کے گھرانے کے افراد کی تعداد ہمارے ریکارڈ سے نہیں ملتی۔ عملے کا فرد جانچ کرے گا۔ |
| <code>R_<wbr>HOUSEHOLD_<wbr>NOT_<wbr>CHECKED</code> | <span style='white-space:nowrap'>HUMAN</span> | We could not check the number of people in your household. A staff member will check. | ہم آپ کے گھرانے کے افراد کی تعداد کی جانچ نہیں کر سکے۔ عملے کا فرد جانچ کرے گا۔ |

## Scam reasons

| Code | English | Urdu |
|---|---|---|
| `ASKS_FEE` | It asks you to pay a fee. Registration and payments are free. | یہ آپ سے فیس مانگتا ہے۔ رجسٹریشن اور ادائیگی مفت ہیں۔ |
| `SENDER_NOT_OFFICIAL` | It did not come from the official sender code (9171 in this prototype). | یہ سرکاری کوڈ (اس پروٹو ٹائپ میں 9171) سے نہیں آیا۔ |
| `ASKS_PIN_OR_OTP` | It asks for your PIN, OTP or password. Nobody official will ask for this. | یہ آپ کا پن، او ٹی پی یا پاس ورڈ مانگتا ہے۔ کوئی سرکاری شخص یہ نہیں مانگتا۔ |
| `ASKS_CNIC` | It asks you to send your ID number in a message. | یہ آپ سے پیغام میں شناختی کارڈ نمبر مانگتا ہے۔ |
| `URGENT_LANGUAGE` | It rushes you to act right now. | یہ آپ کو فوراً عمل کرنے پر مجبور کرتا ہے۔ |
| `SUSPICIOUS_LINK` | It has a link that does not look official. | اس میں ایسا لنک ہے جو سرکاری نہیں لگتا۔ |
| `PRIZE_TOO_GOOD` | It promises a prize or money you did not apply for. | یہ ایسے انعام یا رقم کا وعدہ کرتا ہے جس کے لیے آپ نے درخواست نہیں دی۔ |
| `OFFICIAL_SENDER` | It came from the official sender code and has nothing suspicious. | یہ سرکاری کوڈ سے آیا ہے اور اس میں کوئی مشکوک بات نہیں۔ |


<div class="pagebreak"></div>

# Appendix D. Settings, folder map and glossary

## D.1 Settings (environment variables)

Copy `.env.example` to `.env` and fill it in. **Never commit `.env`.**

| Variable | What it does | Example or default |
|---|---|---|
| `AUTH_MODE` | `local` (our own login) or `supabase` | `local` |
| `DATABASE_URL` | The Postgres connection string | Local: `postgresql://postgres:postgres@127.0.0.1:5433/postgres`. Supabase: the Session pooler string |
| `DB_SERIALIZE` | `1` for the one-connection-at-a-time local test database, `0` for Supabase | `0` on Supabase |
| `JWT_SECRET` | The secret that signs login tokens in local mode | a long random string |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` | Only for Supabase login mode. The service key is the master key and stays on the server. | empty |
| `STORAGE_MODE` | Where photos are kept | `local` |
| `LLM_PROVIDER` | Optional wording helper: `none`, `ollama` or `anthropic` | `none` |
| `CORS_ORIGINS` | Which web address may call the service | `http://localhost:5173` |
| `RATE_LIMIT_PER_MIN` | General rate limit | `120` |

## D.2 Folder map

```
sahara-relief/
  README.md             The short project description
  CONTRACT.md           The agreement between web, service and database
  Dockerfile            One image: service + built web app (runs on Render)
  docker-compose.yml    Database + app on one machine (untested)
  .env.example          Settings template
  shared/
    reasons.json        The reason codes in English and Urdu
  db/
    migrations/         0001 to 0006 (tables, row locks, diary, rules, consent, safety)
    local/              A Supabase look-alike and local login for plain Postgres
    seed/               Invented data (people, cases, consents, scams) and helper SQL
    tests/              53 database tests
    apply_migrations.py Applies the files in order
  service/
    app/                The Python service (see section 20.2)
    tests/              179 tests
    requirements.txt
  web/
    src/                The React app (pages, components, api, i18n, offline)
    public/audio/       154 voice files (ur/, en/)
    tests/              27 tests
    scripts/            Live Chrome checks and audio manifest
  scripts/
    dev.ps1             Start or stop everything on one laptop
    local_pg.mjs        The local Postgres (PGlite)
    make_audio.py       Makes the voice files
  docs/
    Sahara_Relief_Complete_Guide.pdf   The short guide
    Sahara_Relief_Instruction_Manual.pdf   This manual
```

## D.3 Commands

| Task | Command |
|---|---|
| Start everything locally | `.\scripts\dev.ps1` |
| Stop it | `.\scripts\dev.ps1 -Stop` |
| Database tests | `node --test "db/tests/*.test.mjs"` |
| Service tests | from `service/`: `python -m pytest tests -q` |
| Web tests and type check | from `web/`: `npm test` and `npx tsc --noEmit` |
| Browser click-through | from `web/`: `node scripts/e2e_full.mjs` (needs the sample cards; `ONLY="tutorial"` runs part of it) |
| Evaluation numbers | from `service/`: `python -m app.eval.run` |
| Make the voice files | `python scripts/make_audio.py` (needs internet once) |

## D.4 Glossary

- **Admin:** the role of programme staff. Reviews cases, manages rules and reports, and checks the diary.
- **API:** a menu of requests one program can make to another.
- **API key:** a secret code that lets another program use our public API.
- **Audit trail (diary):** a record of every important action that nobody can edit.
- **Bias (in a model):** the starting number before any facts are added.
- **bcrypt:** a method that scrambles passwords so they cannot be read back.
- **Calibration:** making a model's "97% sure" honest.
- **Case:** one claim by one person for one quarter.
- **Person (citizen):** the role of a woman claiming her payment, shown as Person in the app.
- **Classifier:** a model that puts something into a category.
- **CNIC:** the 13-digit national ID number.
- **Consent:** a person's permission, which she can take back.
- **Cost of being wrong:** the numbers that say how bad a wrong approval or wrong refusal is.
- **Cross-validation:** testing a model on rotating parts of the data.
- **Digital Twin:** a safe replay of past cases under new rules.
- **Docker:** a way to package a program with everything it needs.
- **ELA (error-level analysis):** a trick to find edited parts of a JPEG photo.
- **Endpoint:** one address of an API.
- **FastAPI:** the Python tool we used to build the service.
- **Feature:** one fact a model looks at.
- **Foreign key:** a link from one table to another.
- **Hash:** a digital fingerprint of some data.
- **Helper:** the role of a community worker who helps families.
- **Idempotency key:** a unique label that stops the same action being applied twice.
- **IndexedDB:** a small database inside the browser.
- **Isotonic regression:** a staircase-shaped curve used to make probabilities honest.
- **JWT:** a signed login ticket.
- **Laplacian:** an image filter that finds edges, used to measure blur.
- **Logistic regression:** a simple scoring model that outputs a probability.
- **Migration:** a numbered database setup file.
- **Mock:** a pretend version of a real service.
- **n-gram:** a piece of text of n letters or words.
- **Offline-first:** works without internet and syncs later.
- **OCR:** reading text from a photo.
- **PGlite:** a Postgres that runs inside a program, used for the local database.
- **PIN:** the 6-digit secret a citizen types to log in.
- **PMT score:** the poverty score from the household survey. Lower means poorer.
- **Postgres:** a popular, reliable SQL database.
- **Precision / recall:** how often a "scam" label is right / how many real scams are caught.
- **Probability:** a number from 0 to 1 for how likely something is.
- **Prototype:** an early working version, not a finished product.
- **PWA:** a website that behaves like an installable app.
- **Rate limit:** a cap on how many requests are allowed per minute.
- **RLS (row-level security):** database rules that decide which rows each user may see or change.
- **Rule set:** one version of the programme rules.
- **Sigmoid:** the S-shaped curve that turns a score into a probability.
- **Supabase:** a hosted Postgres service.
- **Supervised learning:** learning from examples that have the right answers attached.
- **Swagger / OpenAPI:** an automatic, clickable page that documents an API.
- **Synthetic data:** invented data used instead of real data.
- **TF-IDF:** a way to turn text into numbers by weighting rare pieces more than common ones.
- **Trigger (database):** code that runs automatically when a row is added, changed or deleted.
- **Unsupervised learning:** finding patterns in data that has no answers attached (not used here).
- **View (database):** a saved query that behaves like a table.
- **Zone (AUTO / ASK_MORE / HUMAN):** the three possible outcomes of a decision.

---

*End of the manual. Every number in it comes from the project's code, database and test runs.*
