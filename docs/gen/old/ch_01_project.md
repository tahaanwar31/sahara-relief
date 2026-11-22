<div class="cover">

# Sahara Relief Platform
## The Complete Instruction Manual

**What it is, how to use it, how it works inside, and why every choice was made.**

Written in plain English for a reader who knows nothing about the project.

*Built for Coder's Cup '26: "The Last Mile: AI on Public Rails"*
*ACM Student Chapter, FAST-NUCES Karachi*

**PROTOTYPE. Not a real government service. Every person, ID number, payment and message in the system is made up (synthetic).**

</div>

<div class="pagebreak"></div>

# How to read this manual

This manual has six parts and four appendices.

| Part | What is in it | Read it if you want to... |
|---|---|---|
| **Part 1. The project** | The goal, the problem, **the real numbers and sources behind it (Section 3A)**, why we chose a relief programme, what else we could have chosen, and an honest strength check | Understand the idea and prove it is a real problem |
| **Part 2. User manual** | Screen by screen guides for every type of account | Use or demo the app |
| **Part 3. Rules and access** | Who may do what, the decision rules, consent | Explain safety and fairness |
| **Part 4. Technology** | Front end, back end, database, hosting, security | Answer technical questions |
| **Part 5. AI and machine learning** | Every model, what it learned from, every setting, why we built our own | Answer AI questions |
| **Part 6. Quality** | Tests, bugs found, what is real and what is pretend, limits | Be honest and ready |
| **Appendix A** | The whole database: diagram, every table, every field, policies, triggers | Know the data |
| **Appendix B** | Every API call | Know the interfaces |
| **Appendix C** | All reason codes in English and Urdu | Know the explanations |
| **Appendix D** | Settings, folder map and glossary | Look things up |

**A tip for new readers:** if a word is strange, jump to the glossary in Appendix D. We explain each new word the first time we use it.

<div class="pagebreak"></div>

# PART 1. THE PROJECT

## 1. What is this project?

### 1.1 The one-minute story

Imagine the government runs a **cash relief programme**. Every three months it sends money to poor families. We call it the **"Sahara Relief Programme"**. It is made up for this prototype, but it is modelled on real programmes such as Ehsaas and BISP.

Many of the women who should receive this money have problems that no simple website solves. These are real, measured problems (every number has a source in **Section 3A**):

- **Many cannot read well.** Only **54% of Pakistani women are literate, against 73% of men**. In villages it is **44%**, and among women in the **poorest rural households only about 28%** can read and write. That is fewer than 3 in 10. [S1, S3]
- **Their phone signal comes and goes, and phones are shared.** About **140 million** people live inside mobile-broadband coverage but **do not use mobile internet**. **28%** of women who do use it use a **borrowed phone**. Only **68%** of women own a mobile phone, against **93%** of men. [S12, S13]
- **Her name is spelled in several ways** in different government records ("Muhammad", "Mohammad", "Muhammed"), and women are less likely to hold an ID card in the first place. [S10]
- **Her household score** (a number from a poverty survey) might be old or missing. Studies of BISP's targeting show errors in **both** directions: some non-poor families are paid, and many poor families are missed. [S8]
- **Scammers send fake SMS messages** that say "Your relief money is ready, send your PIN". Cybercrime reports rose about **35% in 2025**, about **90%** of financial scams run through digital or branchless-banking accounts, and BISP has had to block **tens of thousands of SIM cards** used for fake messages. [S14, S15]
- **Agents can take a cut.** Reports describe agents deducting **Rs 1,000 to Rs 2,000** from a payment. [S9]
- **The scale is huge.** The real programme (BISP Kafaalat) pays about **10 to 12 million families** with a budget near **Rs 716 billion** a year. At that scale a tiny error rate means many thousands of wrong decisions. [S6]
- Government staff are **overloaded**, so a wrong payment or a wrongly refused woman is easy to miss.

Our project is a **website and installable phone app** that:

1. helps a woman (and a community helper beside her) **claim her payment from start to end**, in **Urdu or English**, with **spoken instructions**;
2. gives the staff a **review desk** for the cases the computer is not sure about;
3. gives an **admin** control of the rules **without a programmer**;
4. gives the **admin** proof that **nothing was changed or hidden**.

### 1.2 What the platform does: four verbs

| Verb | Meaning | Example |
|---|---|---|
| **Decide** | Look at a claim and choose: approve, ask for more proof, or send to a person | "All checks passed, 97% sure: approved." |
| **Explain** | Give plain reasons in the person's language | "The photo is not clear. Please take it again in good light." |
| **Protect** | Guard private data, catch scams and fake papers, keep an unchangeable record | "Admins lose access the moment she takes back permission." |
| **Say "I am not sure"** | When unsure, do not guess. Hand over to a human with notes | "I am not sure. A person will look at your case." |

### 1.3 What it is NOT

- It is **not a chatbot**. The brief said clearly: build a real multi-user system.
- It is **not real**. No real person, no real ID, no real money. We say this out loud everywhere (README, slides, demo).
- It is **not finished for the real world**. Section 40 lists the honest limits.

## 2. The task we were given, and the choice we made

### 2.1 The task

The hackathon brief asked each team to build **one multi-user public-service SaaS** (a software service used by many people and organisations), with these must-haves:

- At least **3 roles** (types of user), at least **3 platform extras**, and at least **3 AI features**.
- A **Postgres or Supabase database with migrations** (numbered setup files).
- A **public API with keys and Swagger documentation**.
- A **live demo**, a README, a GitHub repository, a demo video and a deployed link.
- Mock versions of national services (NADRA identity, Raast payments).
- Eight "real-life" challenges: the cost of being wrong, saying "I am not sure", bad data and name variants, rules that change without redeploying, explaining and auditing, consent and take-back, working for non-readers on weak internet, and scams and fake documents with honest false-alarm numbers.
- Optional bonus ideas: Digital Twin, Helper Mode, offline sync, Scam Map.
- All code written during the event, original, with **mock data only**.

The team was free to choose **which public service**. We chose the **quarterly cash relief payment**.

### 2.2 Other options we could have chosen

| Option | What it would be | Why it could work | Why we did not choose it |
|---|---|---|---|
| **Driving licence or passport renewal** | Citizens renew documents; admins check | Familiar to every judge | Low stakes. A wrong decision costs little, so "cost of being wrong" looks fake. Few scams. |
| **School admission or scholarship** | Parents apply; a committee ranks | Fairness and ranking are interesting | No payments and fewer scams. Less to show for fraud and fake papers. |
| **Land or property transfer** | Registering sale deeds | Very high stakes; forged documents are a real problem | Slow and paper-heavy. Hard to show in a 3-minute demo. Weak for non-readers on phones. |
| **Health card or hospital referral** | Eligibility for free treatment | A caring story | Medical data is very sensitive. The consent and fraud story is thinner. |
| **Tax refund** | Refund claims and fraud checks | Real money, real fraud | Users are mostly educated and salaried. It misses the "woman who cannot read on a weak signal" challenge. |
| **Disaster compensation (floods)** | Pay flood-hit families | Urgent and large | Very close to ours, but harder to explain with a quarterly cycle and a poverty score. |
| **Pension claims** | Widow or retiree pensions | Clear rules | Smaller crowd, fewer name-variant problems, weaker AI story. |
| **Utility bill subsidy** | Reduced bills for poor households | Simple | Little consent or fraud depth. |
| **Business licence** | Shops and small firms | Many documents | No strong "last mile" human story. |

### 2.3 Why the relief programme fits the brief best

It touches almost every challenge at once:

1. **It involves money at a huge scale** (about 10 to 12 million families and about Rs 716 billion a year), so a wrong approval has a real cost and a wrong refusal is cruel. That makes the "cost of being wrong" maths natural. [S6, S8]
2. **Name variants are everywhere.** Women's names differ across ID, survey and bank records, and women are less likely to hold an ID card. The brief's own example talks about this. [S10]
3. **Scams are real and measured.** Fake "relief payment" SMS messages are an official, long-running problem, and cybercrime reports rose about 35% in 2025. [S14, S15]
4. **The users are the "last mile":** only about 28% of women in the poorest rural households can read, and 28% of women who use mobile internet use a borrowed phone. Voice, big buttons, helper mode and offline mode have a purpose. [S3, S12]
5. **Consent and helpers matter.** A community helper helping many women is exactly how this works in real life, and it makes consent and misuse risks vivid.
6. **It matches the brief's own examples:** a poverty survey (like NSER), national identity (NADRA) and instant payments (Raast).
7. **Its rules change.** The real quarterly payment went from Rs 10,500 to Rs 13,500 (January 2025) to Rs 14,500 (March 2026), and the cutoff is set by a board. So "rules change without redeploying" is a real need. [S7]

### 2.4 Is our project really strong? An honest check

| | Our view |
|---|---|
| **Strong: coverage** | All eight challenges are built, plus three bonus items (Digital Twin, Helper Mode, offline sync). Few teams will cover this much. |
| **Strong: safety is real** | Access is enforced **inside the database**, not just on the screen. The diary is chained. Consent take-back really cuts access. |
| **Strong: honesty** | We report error numbers, name what is made up, and say "I am not sure" in the product itself. |
| **Strong: people first** | Urdu and English, spoken prompts that work offline, big buttons, resume codes, a helper mode. |
| **Risk: a common choice** | Other teams may also pick a relief programme. We stand out through **execution and depth**, not the topic. |
| **Risk: made-up data** | The accuracy numbers prove the method works, not that it works on real people. We say it first. |
| **Risk: delivery** | A public link, a demo video and a polished live demo are required. The deployment must be finished and rehearsed. |
| **Risk: Urdu quality** | A native Urdu speaker should read the Urdu text before the final demo. |

**Conclusion:** the idea is strong and well matched. The remaining risk is finishing, deploying and presenting well.

## 3. Requirements checklist: what the brief asked and what we built

| Requirement | Status | Where |
|---|---|---|
| One multi-user public-service SaaS | Done | Whole system |
| At least 3 roles | **3 roles** (person, helper, admin) | Part 3 |
| At least 3 platform extras | Done: public API with keys, audit diary, rule versions and Digital Twin, offline outbox, consent centre, rate limits | Parts 2 to 4 |
| At least 3 AI features | **7** (decision model, scam detector, name matching, document checks, policy search, Digital Twin and cost curve, evaluation) | Part 5 |
| Postgres or Supabase with migrations | **Postgres on Supabase (Mumbai), 6 migrations** | Part 4, Appendix A |
| Swagger / OpenAPI with API keys | **59 operations at `/docs`; public API needs `X-API-Key`** | Appendix B |
| Mock NADRA / NSER / Raast | Done | Part 4 |
| Challenge 1: cost of being wrong | Done | Section 15 |
| Challenge 2: "I am not sure" | Done | Sections 15 and 27 |
| Challenge 3: bad data and name variants | Done | Section 29 |
| Challenge 4: rules without redeploy | Done | Sections 9 and 15 |
| Challenge 5: explain and audit | Done | Sections 10 and 21 |
| Challenge 6: consent and take-back | Done | Section 16 |
| Challenge 7: non-readers and weak internet | Done | Sections 12 and 19 |
| Challenge 8: scams and fake documents with honest numbers | Done | Sections 28 and 30 |
| Bonus: Digital Twin, Helper Mode, offline sync | Done | Sections 6, 9, 12 |
| Live demo | Ready to run (also fully offline on a laptop) | Section 22 |
| README, GitHub, demo video, deployed link | **README done. GitHub, video and deployed link still to do** | Section 22 |
| Mock data only, label as prototype | Done | Section 39 |
