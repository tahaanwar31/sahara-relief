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
| Bonus: Digital Twin, Helper Mode, offline sync | Done | Sections 6, 9, 12 |
| Live demo | Ready (also fully offline on a laptop) | Section 22 |
| README | Done | Section 22 |
| GitHub, demo video, deployed link | **Still to do** | Section 22 |
| Mock data only, labelled prototype | Done | Section 39 |

### 3.1 How the project maps to the judging rubric (100 points)

The organisers score six categories. This table says what we built for each and where the manual explains it. "Not proven" says what we have not shown.

| Category (points) | What we built | Manual | Not proven |
|---|---|---|---|
| **AI implementation (30)**: at least 3 working AI features, workflow, output quality, model choice | 10 AI features (decision model, scam checker, name matching, ID card reading, face match, photo integrity, notes, policy search, Digital Twin, recorded voice). They run inside one claim: hard rules first, then the model, then auto-approve, ask for proof, or a person. Two models trained by us, three open-source pretrained tools used as they come. | Part 5, Section 24A | All data is synthetic. No real photos or real SMS were tested. No language model is used. |
| **SaaS and architecture (20)**: features, API, database, deployment, testing, monitoring | Three roles, queue, rule versions, public API with keys, FastAPI service, Postgres with row locks, hash-chained diary, 179 + 50 + 27 automated tests and a 23-check browser test, health and metrics pages | Parts 3, 4, 6 | **Not deployed yet.** The Docker image is untested. |
| **Real-world problem solving (15)**: needs, end-to-end completion, impact | A woman (or her helper) claims the payment end to end: consent, identity, household, papers, account, decision, money sent, staff call to confirm. The admin can ask for one more paper and the loop closes by itself. | Parts 1, 2 | Money is a mock. No real users were interviewed. |
| **Accessibility (10)**: voice and language, low literacy, weak internet | Urdu and English on every screen, 154 recorded voice prompts, number pad, icons, practice demo before each page, offline outbox, saved steps, resume code | Sections 4 to 5, 11, 12, 19 | No voice input. The Urdu needs a native speaker's check. Offline was tested with a simulated cut in Chrome, not on a real phone. |
| **Safety, privacy, reliability (15)**: uncertainty, consent, explainability, risk | "I am not sure" path to a person with notes, hard rules over any score, consent with take-back that stops access at once, helper three-detail proof, one sentence for her and a full trail for the auditor, safe retries, lockouts | Parts 3 and 5 (Sections 15, 16, 36) | The helper-commission problem is only reduced (a helper's own number is held, and a planned phone-call check is described). |
| **Innovation (10)**: originality, creative features, design decisions | Digital Twin, helper mode with consent from three details, mock government services, the one-click "send this paper again" loop, a game-style practice demo | Sections 6, 9, 19.6, 32 | None of these has been tested with real users. |
