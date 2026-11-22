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


## 3A. The evidence: the numbers behind the problem

Everything in this manual says "many women cannot read" or "scams are common". This section shows the **real numbers** behind those statements. Each number has a source tag like **[S3]**. The full source list is at the end of this section.

> **How to read these numbers honestly.** Most figures below come from official surveys (the Pakistan Bureau of Statistics, the State Bank, the World Bank, GSMA, BISP's own evaluations) **as reported by news outlets or summaries**. Where sources disagree or a figure is old, we say so. Before quoting a number on stage, open the source link and check it. We never present a figure as newer or more certain than it is.

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

### 3A.2 Reading and writing: literacy

**National picture (Economic Survey 2025-26).** Overall literacy for people aged 10 and above is **63%**. Male literacy is **73%** and female literacy is **54%**. In cities, literacy is **74%** (men 81%, women 68%). In villages it is **55%** (men 67%, women **44%**). By province: Punjab **68%**, Sindh **58%**, Khyber Pakhtunkhwa **58%**, Balochistan **49%**. Rural Sindh is as low as **39%**. [S1]

**The year before (Economic Survey 2024-25).** National literacy was reported at about **60.6%** (men about 68%, women about 52.8%). The two years use different survey bases, so do not subtract them to claim a trend. [S2]

**Literacy depends strongly on income.** A Gallup Pakistan analysis of the 2024-25 Household Integrated Economic Survey (HIES) of the Pakistan Bureau of Statistics shows how much money matters: [S3]

| Group | Poorest fifth of households | Richest fifth of households |
|---|---|---|
| **Rural women** | **28%** literate | 65% literate |
| Urban women | 42% | 83% |
| Rural men | 49% | 84% |
| Urban men | 56% | n/a in our source |

The report notes that **rural women have the lowest literacy at every income level**, and moving from the poorest to the richest fifth is linked with a rise of about 38 points in literacy.

**Women who receive BISP.** BISP's own evaluations found literacy was extremely low among beneficiary women: a 2016 BISP evaluation reported **9%** literate at the national level (and 8% finishing primary school), while an earlier follow-up report said **19%** of adult women in beneficiary households were literate compared with **42%** nationally. The two figures use different measures and both are **old (about 2011 to 2016)**, so treat them as "very low, around one in five or less", not as a precise current number. [S4]

**What this means for our design.**

| Fact | What we built because of it |
|---|---|
| Almost half of women cannot read, and about 7 in 10 poor rural women cannot | The whole citizen flow works **without reading**: one question at a time, big pictures and icons, **spoken prompts in Urdu and English** (108 recordings), and a number pad for the PIN |
| Reading skill is lowest exactly where need is highest | Plain, short sentences, no technical words on citizen screens, and every result is also **spoken** |
| Many cannot fill forms alone | **Helper Mode**: a trusted person helps, but the woman keeps control with her own PIN |

### 3A.3 Poverty and the size of the need

- **The World Bank's 2025 update** moved Pakistan to a new international line of **$4.20 per person per day**. On this line about **44.7%** of Pakistanis are poor (**over 107 million people**). On the **extreme** line of $3.00 a day, about **16.5%** (about 39 million). [S5]
- **The national poverty line** (cost of basic needs) gave **21.9%** in the last full survey (2018-19). The World Bank projects about **22.2%** for 2024-25 and about **60.4 million** people in 2023-24. These are estimates, not a fresh survey. [S5]
- The World Bank also says Pakistan's earlier fall in poverty **stalled** after economic shocks. [S5]

**Why this matters to us:** with tens of millions of poor people and one cash programme for about 10 to 12 million families, **decisions are made at enormous scale**. A tiny error rate still means many thousands of wrong payments or wrongly refused families. That is why our "cost of being wrong" maths and our "I am not sure" zone exist.

### 3A.4 The relief programme itself (BISP Kafaalat)

| Fact | Value | Source |
|---|---|---|
| Kafaalat beneficiaries | About **10.2 million** (Economic Survey); officials say about **12 million households** | [S6] |
| Budget 2025-26 | About **Rs 716 billion** (other reports: Rs 706 to 722 billion). Kafaalat alone about Rs 565 billion | [S6] |
| Quarterly payment | **Rs 10,500** to **Rs 13,500** (January 2025) to **Rs 14,500** (March 2026) | [S7] |
| Poverty-score cutoff | **32** (BISP Board, 2021). **37** for families with a person with a disability | [S7] |
| How people are chosen | The National Socio-Economic Registry (NSER) survey and a poverty score (PMT) | [S7] |
| Exclusions | Government employees, taxpayers, vehicle owners, foreign travel, high phone bills (about **820,000** entries removed in 2020 on such flags) | [S18] |
| Who gets paid | Mostly women. BISP says it has opened about **10 million** bank accounts for women beneficiaries | [S6] |

**How our mock compares to the real programme.** We deliberately use **made-up** values, close to the real ones:

| Setting | Real programme (reported) | Our mock "Sahara Relief" |
|---|---|---|
| Quarterly amount | Rs 14,500 (since March 2026) | **Rs 13,500** (draft v2: Rs 14,500) |
| Poverty-score cutoff | 32 | **30** (draft v2: 25) |
| Official SMS sender | 8171 | **9171** |
| Exclusion flags | Government job, vehicle, tax, foreign travel, phone bill | The same five kinds of flags |
| Second approver | n/a | Over Rs 20,000 |

We changed the numbers on purpose so nobody mistakes our prototype for the real programme.

### 3A.5 Targeting is hard: errors in both directions

Programmes that use a **poverty score** make two kinds of mistakes, called **targeting errors**:

- **Inclusion error:** paying someone who is **not** poor (a "wrong approval" in our maths).
- **Exclusion error:** leaving out someone who **is** poor (a "wrong rejection").

Studies of BISP's targeting show this trade-off clearly: [S8]

- Researchers (Gazdar and Khan) estimated an inclusion error of **64%** if the target is only those below the official poverty line, or **36%** if the "poorest" and the "lower middle" are both counted as targets. Exclusion error was estimated at **77% to 82%** if the goal is to reach everyone below the poverty line. These are **old, survey-based estimates** and depend on definitions.
- Another study (Saleem) found the poverty scorecard **reduces inclusion errors** but at the cost of **higher exclusion errors**, and that community-based methods can do better at not missing the poor.
- A World Bank study before the scorecard began **forecast** about **52%** undercoverage and **37%** leakage for this kind of method. This was a **forecast**, not a measured result.
- The same World Bank work gave a **positive** assessment of the completeness and accuracy of the NSER survey.

**What this means for our design.** No score is perfect. Cases near the cutoff are exactly where errors happen. That is why we:

1. send **borderline cases to a person** (within 5 points of the cutoff),
2. make the machine approve alone **only at 97% sure**,
3. keep **automatic rejection off**, so a "no" is never decided by a machine alone,
4. keep every decision explained and recorded so it can be appealed.

### 3A.6 Who is missing: identity cards

A national ID card (CNIC) is needed for almost every service, including a bank or wallet account. Without one, a person is locked out. Women are less likely to have one: [S10]

- The Election Commission said the gender gap in the electoral rolls fell from **11.8% (2018)** to **7.4% (January 2025)**. [S10]
- In 2023 Human Rights Watch reported about **10 million fewer women than men** on the voter rolls (127 million registered voters). The estimate is **disputed**: one analyst, using census data, estimated a smaller gap of about 3.5 million. [S10]
- Older reporting says women CNIC applicants were about **35% fewer** than men (a gap of about 16.9 million), and that in a 2021 project report **77% of people without a CNIC in Punjab and 74% in Sindh were women**. These are **older** and not a current count. [S10]
- Reported reasons: distant NADRA centres, complex registration steps, social barriers and lack of awareness. [S10]

**What this means for our design.** The system checks **ID validity and expiry** with hard rules, handles **missing or messy records** by asking for proof or sending to a person, and never treats a missing ID as an automatic "no".

### 3A.7 Money, accounts and paying agents

**Women and bank or wallet accounts.** The State Bank reports women's financial inclusion has risen quickly: **about 55%** by December 2025 (from about **11%** in 2015), a gender gap of about **29 points**, and **37 million** active women's bank accounts by June 2025 (up from 20 million). The Governor also gave **52%** and a **30-point** gap for the same period, so the exact numbers vary by date. These are **account counts from banks**, not survey results, so they can overstate real use. [S11]

**Instant payments (Raast).** The State Bank reports about **48 million Raast users** and about **Rs 50 trillion** of transactions in 2025, with **645.7 million** transactions worth **Rs 18.5 trillion** in the last quarter of 2025. [S16] This is why the brief asks for a mock Raast service: instant payments are real and growing.

**The "last mile" problem: agents.** Many BISP payments still pass through agents or retailers. Reports (2025 to 2026) describe: [S9]

- **illegal deductions of about Rs 1,000 to Rs 2,000** per transaction from beneficiaries,
- agents asking women to "take what is offered", and thumb-print verification failing as an excuse to pay less,
- **BISP South Punjab blocked 508 retailer devices** and registered **22 criminal reports** in April to June 2025, and about **139 agents were blocked** in Sukkur in January 2025,
- **FIA arrests** of retailers in 2026 for deductions and embezzlement.

**What this means for our design.** Money should go **straight to her own account**. Our rules hold any claim whose payout account is **shared by other families**, **changed recently**, or **belongs to a helper**. Helper-owned accounts are a classic way to steal a woman's payment.

### 3A.8 Phones and internet: weak signal and shared phones

- **Phone ownership (GSMA Mobile Gender Gap, 2025 data):** **68%** of women own a mobile phone against **93%** of men. **40%** of women own a smartphone against **57%** of men. The gender gap in **mobile internet use** has narrowed to about **8%**, but **28%** of women who use mobile internet use a **borrowed phone**. Women who own a smartphone use the internet daily far more often (94%) than those on shared devices (48%). [S12]
- **Coverage is not use:** GSMA says mobile-broadband coverage reaches about **81%** of the population, but about **52%** of people (37% of adults) live within coverage and **do not use** mobile internet. A later GSMA report counts about **140 million** such people. The main reasons: **literacy and digital skills, cost, and relevance**, plus family restrictions and poor connection quality. [S13]
- **Mobile base (PTA):** about **200.55 million** cellular subscribers by December 2025, about **143 million** on mobile broadband (March 2025), and **56,694** of **58,423** cell sites on 4G (June 2025). [S13]

**What this means for our design.**

| Fact | What we built |
|---|---|
| Many women share or borrow phones | **Helper Mode** with one open family at a time, a screen lock, per-family consent, and a **resume code** to continue on another phone |
| Coverage does not mean a good connection | An **offline-first** web app: answers and photos wait in an **outbox** and are sent later, exactly once |
| Skills and literacy are barriers | Spoken Urdu and English, big buttons, a number pad |
| Not everyone has a smartphone | A very small, fast page (about 68 KB for the citizen part) that works on cheap phones |

### 3A.9 Scams and fraud

- **Cybercrime is rising.** Officials said cybercrime in Pakistan rose about **35%** in 2025. The National Cyber Crime Investigation Agency (NCCIA) reported about **150,000 complaints**, of which about **10,800** became formal inquiries; financial fraud accounted for roughly **82,000 to 85,000** complaints and about **Rs 2.7 billion** reported lost. In 2024 the FIA recorded over **73,000** cybercrime complaints. [S14]
- **Branchless banking is the main route:** an NCCIA official said almost **90%** of financial scams are carried out through **digital or branchless banking accounts**. NCCIA blocked more than **46,000** fake bank accounts in 2025. [S14]
- **Few cases end in a verdict:** in 2024, more than **13,000** online-fraud complaints led to **1,212 arrests** and only **17 verdicts**. Prevention matters more than punishment. [S14]
- **BISP fake-message fraud is official and long-running.** BISP says genuine messages come **only from 8171** and that **no fee or form** is ever asked. It reported **14,606 complaints and 6,136 SIMs blocked** (2016), **19,347 complaints and 7,424 SIMs** (reported 2018), and in a later statement blocking **170 fake websites** and deactivating **37,389 SIMs**. In July 2024 BISP and the telecom regulator (PTA) agreed to work together against fake SMS and fake websites. [S15]
- **PTA advisories** warn people never to share their ID number, OTP or passwords, and warn about fake courier messages asking for verification codes. [S17]

**What this means for our design.**

| Fact | What we built |
|---|---|
| Fake relief SMS are a known problem | The **scam checker** with plain-word reasons (asks for PIN, link, fee, urgency) in Urdu and English |
| Genuine messages come from one sender code | A **rule** about the official sender (we use 9171 in our mock, the real code is 8171) |
| Most scams use accounts, not single messages | **Payout account checks** (shared, recently changed, helper-owned) |
| Few cases end in a verdict | Warn early; **never block or delete** anything; let the person decide |

### 3A.10 The evidence map: problem to feature

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

### 3A.11 Cautions about these numbers

1. **Most figures are from news reports of official data.** We could not open every primary report. Check the source before quoting a number.
2. **Different dates and definitions.** Literacy (age 10 and above), poverty lines ($4.20 against national), "households" against "beneficiaries" are not the same measures.
3. **Some figures are old.** The BISP beneficiary literacy numbers and the CNIC gap by sex are from earlier years. We label them old.
4. **Some are disputed.** The "10 million missing women" figure is contested. The World Bank's targeting figures are forecasts.
5. **Our own numbers are different.** Everything inside our prototype (cutoff 30, Rs 13,500, sender 9171, 189 people) is **made up**.

### 3A.12 Sources

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

### 4.1 Opening the app

- **On a computer:** open **http://localhost:5173** (when you run it on your own laptop) or the public link once deployed.
- **On a phone:** open the same link in Chrome. Choose **Add to Home screen** to install it like an app. It then opens full screen and works offline.
- **The API pages:** `http://localhost:8000/docs` (Swagger).

### 4.2 The login page

The login page has two halves on a computer. The left side explains the promise: *"Your relief payment, with dignity."* The right side is the form.

- **Language switch (top right):** **اردو** or **EN**. It changes the whole app. Urdu flips the screen to read right to left.
- **Online / offline badge:** shows whether the signal is on.
- **Two tabs:** **Family or helper** (email + 6-digit PIN with a big number pad) and **Staff** (email + password).
- **Demo accounts:** one-tap buttons to sign in as each role (all fake).
- **"I have a resume code":** continue a claim someone started, without logging in.
- **"Hear this":** the speaker button reads the page aloud.

### 4.3 The demo accounts (all invented)

| Role | Email | PIN or password |
|---|---|---|
| Person with a fresh claim | `fam-abc0e0aa070a@citizens.sahara.test` (Khair Bibi) | 246810 |
| Person (widow, claim already sent) | `zainab@citizens.sahara.test` | 246810 |
| Person (shopkeeper) | `asim@citizens.sahara.test` | 246810 |
| Helper (Yousuf) | `yousuf@helpers.sahara.test` | 246810 |
| Admin (reviewer) | `admin1@gov.sahara.test`, `admin2@gov.sahara.test` | Admin#2026 |
| Admin (programme) | `admin@gov.sahara.test` | Admin#2026 |

Seven accounts were designed by hand. The other family members in the database also have logins with PIN 246810 (email form `fam-<12 letters>@citizens.sahara.test`).

### 4.4 The sound

Every page has a **Hear this** button. It plays a pre-recorded voice (Urdu or English). The recordings are files stored in the app, so they play **with no internet**. In total there are **108 recordings** (54 Urdu and 54 English).

## 5. Citizen guide: claiming the payment

**Who:** a woman claiming her payment, or any citizen account.
**Bottom bar (phone):** **My claim**, **Is it real?**, **My data**.

### 5.1 The 8 steps

At the top you see a **progress bar** ("Step 3 of 8") and, after you start, a **resume code**. On step 1 a green welcome card says "Assalam o Alaikum" and your name.

| Step | Title | What you see | What you do | What the system does |
|---|---|---|---|---|
| 1 | **Do you want to claim your relief payment?** | A short text: it takes about five minutes, one small question at a time, you can stop and come back. A language choice. | Press **Yes, start**. | Creates or opens your draft. |
| 2 | **Your permission** | Three lines: the office sees your name, ID number and household; your helper sees your details only while helping; the payment service checks your account. A note: you can take permission back at any time in "My data". | Press **I agree** or **No, not now**. | Records your consent with a receipt. Without it, nothing else is read. |
| 3 | **Is this you?** | The name found in the records. | Press **Yes**. Or **Type my ID number instead** and enter the 13 digits. | Runs the name match: SAME (matches), MAYBE (a person will check) or DIFFERENT. |
| 4 | **Your household** | "N people live in your household. Is this right?" | Press **Yes** or **No**. | Saves your answer. A "no" is flagged for a staff member. |
| 5 | **Your papers** | A camera and a gallery button for each required paper. | Take or choose a clear photo of each paper. | Checks blur, signs of editing and duplicates. If there is no signal, the photo waits on your phone and is sent later. |
| 6 | **Where should the money go?** | A field for your 11-digit mobile account number. | Type the number and press **Check this account**. | Asks the (mock) payment service for the account name and shows "The account is in the name of ...". You answer **Is this account yours?** |
| 7 | **Send your claim** | A summary: papers sent, account, amount for this quarter. | Press **Send my claim**. | Makes the decision. If you have no signal, the claim waits on your phone and goes out by itself. |
| 8 | **Result** | One of three cards (below). | Read or press **Hear it again**. | Shows the decision, the reason and what happens next. |

### 5.2 The three results

| Result | Colour | What it says | What happens next |
|---|---|---|---|
| **Approved** | Green | "Your claim matches the rules. Your payment is approved." with the amount | The payment goes to your account. |
| **Please send one more thing** | Yellow | Says exactly what is missing (for example "The photo is not clear") | You send it and the claim is decided again. |
| **I am not sure. A person will look at your case.** | Blue | A kind sentence with the reason, and "A staff member will look at your case by (date). You do not need to do anything." | A staff member reviews it. |

### 5.3 Stopping and coming back

- Your progress is **saved on the server** after every step. A line says "Saved".
- If the signal is off, a line says "Saved on your phone".
- A **6-digit resume code** shows on the screen. Write it down or tell your helper. On the login page press **I have a resume code** and type it to continue on any phone.

### 5.4 "My data" (the consent centre)

- Shows every **permission you gave**: who (office, your helper, the payment service), the date, what they can see, and whether it is **Permission given**, **Taken back** or **Expired**.
- **Take back my permission** asks "Are you sure?" and explains that staff will no longer see your details and your claim will wait until you agree again. After you confirm, access stops **immediately**.
- **Give permission again** puts it back.
- **Who has seen my data** lists every time someone looked at your records, with their role and the reason.

## 6. Helper guide: helping many families

**Who:** a community worker who helps several women from one shared phone.
**Bottom bar:** **Families**, **Is it real?**, **My data**.

> **Why Helper Mode exists (Section 3A):** many women share or borrow phones (**28%** of women internet users use a borrowed phone) and many cannot read. A trusted helper is how help works in real life. The risk is abuse, because agents are reported to take **Rs 1,000 to Rs 2,000** from payments, so every helper action needs her own consent and is recorded. [S9, S12]

### 6.1 The family list

The screen **"Families you help"** lists the women assigned to you (40 in the demo). Each row shows initials, the last 4 digits of her ID, and chips such as **Permission given**, **Approved**, **With a staff member**. You can search by name or the last 4 digits.

**Privacy rule:** a woman's name shows as `F*** B***` and her ID as `••••` until she has given permission.

### 6.2 Opening a family

1. Tap a family. A panel opens.
2. **If she has not given permission:** the panel says "This family has not given permission yet. Ask them first." It shows a box **"Her own PIN, typed by her (so the permission is really hers)"**. **She** types her own PIN. You press **She typed her PIN: record her permission**. The server checks her PIN. If correct, her consent is recorded as **hers** (with your name as the helper) and a line is written in the diary. A wrong PIN is refused, and after 8 tries in a minute it locks.
3. **If she has already given permission:** press **Start helping** (or **Open their claim**).

**Only one family can be open at a time.** Opening another closes the first. This stops papers and answers from getting mixed up on a shared phone.

### 6.3 Doing the claim with her

You see the same 8 steps as the citizen, with a banner "You are helping: (name)". At step 2 a hint says to ask her to type her PIN herself. At step 6, if the payout account belongs to **you**, the system sends the claim to a human admin. The helper's own account must never receive her money.

### 6.4 Finishing

Press **End session**. The screen locks ("Screen locked to protect the family's details") until you tap to continue.

### 6.5 What a helper cannot do

- Approve or reject any claim.
- See a family that is not assigned to them, or see a name before consent.
- Give consent for a woman without her own PIN.
- Change rules, or read the audit diary.

## 7. Admin guide, part 1: reviewing cases

**Who:** a government staff member in an office. **Tabs:** **Cases to review**, **Rules** (read only).

### 7.1 The queue

**Cases to review** shows the cases the system sent to a person. The note says: *highest priority first; when priority is equal, the least sure case comes first; updates every 10 seconds.* A badge shows "15 waiting". Each row has:

- a number (the queue position),
- the person's name in English and Urdu, the amount, the quarter and how many days it has waited,
- the **reason** in staff wording (for example "Household score is close to the limit. Review."),
- the system's **confidence** (a bar and a percentage),
- a **Permission given** badge.

You only see cases of **your own office** and only if the citizen's consent is active.

### 7.2 The case page

Press a row. You see:

- **Header:** name, Urdu name, masked ID, quarter, chips (permission, zone, status).
- **Decision card (left):**
  - **Zone**, **Result** ("Needs a person") and **Confidence**.
  - A plain **reason** sentence.
  - A small line, "Rules version 1 · approves alone above 97% sure".
  - **Checks:** a list such as Permission, ID card, Name match, Household score, Payout account, Scam check, each with Pass, Not sure or Fail, a short detail and a percentage.
- **"I am not sure" notes (blue box):** what was checked, what is missing, suggested next steps.
- **Same person? Side by side:** when a possible duplicate exists, a table compares field by field: Field, Record A, Record B, Match.
- **Papers:** each photo with its label (clear, needs a closer look, photo not clear) and the read confidence.
- **Full trace (every step):** a collapsible list of everything the engine did, for deep checking.
- **Your decision (right):** four big buttons **Approve**, **Reject**, **Ask for more proof**, **Hold**, a **Note** box and a **Choose an action** button. The amount is shown. "Second approver needed." appears if the payment is over Rs 20,000. A line says "Every choice makes a new row in the diary. Nothing is overwritten."

### 7.3 What the database stops

- You cannot approve **your own** case or one you **helped with**.
- You cannot decide a case whose consent was taken back. The page says "Permission was taken back. This person withdrew consent, so no decision can be made."
- For big payments a **second admin** must also approve.

## 8. The scam checker ("Is it real?")

**Who:** any citizen or helper. **Tab:** **Is it real?**

1. Paste the SMS text (or press **Paste**). Optionally type who sent it (the official code is `9171`).
2. Press **Check this message**.
3. You get **Looks real**, **Be careful** or **Looks like a scam**, with **reasons** in plain words, such as "It asks for your PIN, OTP or password. Nobody official will ask for this." or "It has a link that does not look official."
4. Press **Report this message** to add it to the list of reported scams.

It **only warns**. It never blocks or deletes a message.

Examples to try: `Congratulations! You won Rs 50000. Click http://bit.ly/claim-now and send your PIN and CNIC.` (scam), `Sahara Relief: Your Q4 payment of Rs 13500 has been sent to your account. Ref 48210.` (looks real).

## 9. Admin guide, part 2: rules and reports

**Who:** a programme manager. **Tabs:** **Rules**, **Policy**, **Digital Twin**, **Evaluation**, **Diary**.

### 9.1 Rules

**Rule versions** lists every version with: Version, Status (draft or active), Cutoff, Amount, Payout cap, Auto-reject, Live from. Rules are **never edited in place**. Press **New draft from version N** to copy the live version into a draft.

In the **rule editor** you can:

- **Settings:** Cutoff (poverty score), Borderline band, Amount, Payout cap, Second approver above (Rs), Automatic rejection on or off.
- **Costs of being wrong:** Wrong approval, Wrong rejection, A person reviews, Ask for proof.
- **Add a rule:** choose the variable (for example the household score), the operator, the value, and the outcome PASS, HOLD (send to a person) or ASK_MORE (ask for proof), and the reason shown to the person. You can join conditions with **All must be true (AND)** or **Any can be true (OR)**. A "technical condition (json-logic)" box is there for experts, with a **Use the simple form** button.
- **Check** validates the draft (unknown variables or bad operators are refused before saving). **Save as new draft**, **Preview with Digital Twin**, and **Make this version live** (with a "Yes, make it live" confirmation). The page tips: *run the Digital Twin first to see who would change.*

When a version goes live, **every new decision uses it**. Old decisions still show the version they used.

### 9.2 Policy: the cost of being wrong

Three sliders: **A wrong approval costs**, **A wrong rejection costs**, **A person reviewing costs**. A chart shows total expected cost against the approval line and where the best line sits. It is a **preview only**. It changes nothing. A button resets it to the rule set values.

### 9.3 Digital Twin

Pick a **draft** version and press **Run the replay**. The system replays up to 500 past cases under the draft and shows:

- **Cases replayed**, **Change zone**, **Approvals change**, **Cost: before to after**.
- **Who moves where** (for example AUTO to HUMAN: 22 cases).
- **Example cases** with Before, After and Reason now.

### 9.4 Evaluation

Shows how the system did on a labelled test set: **Cases in the system**, **Approved by the system**, **Asked for more proof**, **Sent to a person**, **Waiting for an admin now**, **Average decision time**, **Admin overrides**, **Messages checked for scams**, a **Confusion matrix**, and **False alarms and misses**. The page says "Wrong approvals are the costly mistake."

### 9.5 What an admin cannot do

An admin cannot decide a case, and cannot read the identity table (names and ID numbers of people). An admin can read case, decision and diary data.

## 10. Admin guide, part 3: checking the diary

**Who:** the admin, doing the checker's job. **Tabs:** **Diary**, **Evaluation**, **Rules**.

- **Verify the diary:** press the button. The system re-computes every fingerprint from row 1 and says **"The diary is intact"** (with the number of rows) or **"The diary is broken at row N"**.
- **Filters:** Everything, Decisions, Cases, Consent history, Rule changes, Documents. A search box finds an action, role or id.
- **Reading a row:** open one to see the entity, the actor, the rule version, the model version, the hash and the previous hash, and the **Decision trace**.
- Sign-in lines are hidden by default. Search `login` to see them.
- Nobody can change the diary, the admin included.

## 11. Language and accessibility

> **Why this matters (Section 3A):** only **54%** of women can read and write (**44%** in villages, about **28%** among the poorest rural households). So every citizen screen is built to be used **without reading**. [S1, S3]

- **Two languages everywhere:** Urdu (right to left) and English, on every screen including staff screens.
- **Large type and big buttons**, with high-contrast colours. Pictures and icons next to words.
- **Spoken prompts** on every page.
- **A number pad** for PINs, so no typing on a small keyboard.
- **Simple sentences.** Technical words are avoided on citizen screens.

## 12. Weak internet, offline use and resume

> **Why this matters (Section 3A):** about **140 million** people live inside mobile coverage but **do not use mobile internet**, and **28%** of women who use it use a **borrowed phone**. A good connection cannot be assumed. [S12, S13]

| Situation | What the app does |
|---|---|
| Signal drops while on a step | A badge says "Offline". Your answers are saved on the phone. |
| A photo is taken with no signal | It waits in an **outbox** on the phone. A line says "Saved on your phone". |
| Signal returns | The outbox sends everything **by itself**. Each item has a unique key, so it is **never sent twice**. |
| You press "Send my claim" offline | The claim waits ("Keep this phone. When you have signal, your claim is sent by itself."). |
| You change phones | Use the **6-digit resume code** to continue. |
| The app is loaded again with no signal | It opens from its saved copy (installed web app) and the audio files play from the phone. |

## 13. Troubleshooting

| Problem | Why | What to do |
|---|---|---|
| "No signal right now" while online | The service took too long or is restarting | Press **Try again** or reload. |
| "The email or secret is not right" | Wrong PIN, or the account is locked for 30 seconds after 5 wrong tries | Wait and try again. |
| "You have already sent your claim" | The claim was sent earlier | Press **See my answer**. |
| Helper sees `F*** B***` | The family has not given permission | Ask her to type her own PIN. |
| Admin gets "not found" on a case | Consent was taken back, or it is another office's case | This is correct behaviour. |
| Too many login tries | A rate limit protects the service | Wait one minute. |


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
| **Give consent** | Yes (own) | **No** (she types her own PIN) | No |
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

Further rules come from the **active rule set** (the admin edits these): missing household score, household score above the cutoff or within the borderline band, exclusion flags (government employee, owns a vehicle, tax filer, foreign trips, high phone bill), missing or blurry documents, too many missing fields, and so on.

### 15.3 The three zones

| Zone | Meaning | Condition |
|---|---|---|
| **AUTO** (approve alone) | Fast and confident | `p_eligible` is at or above the **approval line (0.97)**, **no rule fired**, and **no check is unsure or failing** |
| **ASK_MORE** | One thing is missing or unclear | A blurry photo, a missing paper, an unreadable ID. The system says exactly what. |
| **HUMAN** | A person decides | Anything else. This is the safe default. |

Below the **reject line (0.15)** the case still goes to a **person** ("likely not eligible"), because **automatic rejection is switched off**. A machine never says "no" alone in this prototype.

### 15.4 The cost-of-being-wrong maths (challenge 1)

> **Why this matters (Section 3A):** the real programme pays about **10 to 12 million families**. Studies show targeting errors in **both** directions: paying non-poor families and missing poor ones. At that size, deciding how sure the system must be before it acts alone is the central design question. [S6, S8]

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
- A **helper cannot give it for her.** The woman types **her own PIN** on the helper's phone. The server checks the PIN against her login, records the consent as hers (with the helper's name), and writes the diary line `consent.granted_with_pin`.
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
| **Playwright (with Chrome)** | A robot that uses the real browser | Live checks of all three roles |

### 19.2 Why this fits the problem

- **Non-readers:** big buttons, icons and **spoken prompts**.
- **Weak internet:** the **offline outbox** and **resume codes**.
- **Many roles:** one codebase with role-based menus.
- **Two languages:** a switch on every page; all text lives in two files (`en.json`, `ur.json`).
- **Small and fast:** the citizen part of the app is about 68 KB when compressed, so it loads fast on weak connections.

### 19.3 How the web app is organised

- **Pages:** `Login`, citizen (`Claim`, `Consents`, `Scam`, `Resume`), citizen-helper (`Families`), admin (`Queue`, `CaseView`), admin (`Rules`, `RuleEditor`, `Policy`, `Twin`, `Evaluation`, `Audit`).
- **A small hand-written router** keeps the address in the form `#/queue`.
- **The API layer** (`web/src/api`) is the only code that talks to the service. It has two modes: **live** (real service) and **mock** (everything inside the browser, for design work and tests).
- **Auth** keeps the token in the browser and asks the service who you are.
- **Offline** code keeps the outbox and the "online or offline" badge.
- **Staff translation:** staff screens have a dictionary that swaps English text for Urdu when Urdu is chosen.
- **Updates:** screens refresh by **polling every 10 seconds**. We did not need heavy live connections.

### 19.4 Offline outbox in detail

1. A write action (save a step, upload a photo, send the claim) is put in an **outbox** with a **unique idempotency key**.
2. If online, it is sent at once. If not, it stays in the outbox.
3. When the signal returns, the outbox sends items in order.
4. The service remembers each key. If an item arrives twice, it is **applied only once**.

### 19.5 Voice

- **108 recordings** (54 Urdu, 54 English), made once with the free Microsoft Edge neural voices (`ur-PK-UzmaNeural`, `en-US-JennyNeural`) by `scripts/make_audio.py`.
- They are **files inside the app**, so they play offline.
- The audio list comes from the app's own manifest, so file names always match what the screens ask for.
- If a file is missing, the app falls back to the browser's speech or to text.

### 19.6 Design

Colours: deep teal for trust, a warm gold accent, a cream background. Rounded cards with soft shadows, a gradient progress bar, a split-screen login. Citizen screens use big text and one action per screen.

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
| **pytest** | Test runner | 159 service tests |

### 20.2 Folders inside `service/app`

| Folder or file | What it holds |
|---|---|
| `main.py`, `config.py` | Start-up and settings |
| `routers/` | The API calls, grouped: `auth`, `cases`, `people`, `rules`, `admin`, `tools` |
| `engine/` | The decision engine: `decide`, `facts`, `jsonlogic`, `model`, `policy`, `reasons`, `synth`, `costcurve`, `twin`, `llm` |
| `identity/` | Name normaliser and matcher |
| `scam/` | Scam detector and its invented training messages |
| `docs/` | Document checks and sample images |
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

| Mock | Pretends to be | What it returns |
|---|---|---|
| `GET /mock/nadra/{cnic}` | NADRA (national ID database) | The person's identity record |
| `GET /mock/nser/{household_id}` | NSER (national poverty survey) | The household record and score |
| `POST /mock/raast/verify` | Raast (instant payments) | The name on an account |
| `POST /mock/raast/release` and `/settle` | Raast | Pretend payment release and settlement |

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
| **Hosting** | One Docker image holding the Python service **and** the built web app, deployed on **Render** (Singapore or Mumbai, near the database) |
| **Database** | Supabase Mumbai |
| **Why not Vercel** | Vercel suits websites and short functions. Our service is a long-running Python program that loads AI models, so it would restart cold and hit size limits |
| **Fallback** | The whole system on a laptop, with the local database, tested on a phone hotspot |
| **Status** | The Docker image is written but **not tested yet** (no Docker on the build laptop). The app is **not deployed yet** |

### 22.4 Demo checklist

1. Start with a fresh demo database (reset the seed data).
2. Log in as **Khair Bibi** and claim step by step (Urdu first, then English).
3. Switch the network off to show the offline outbox, then on.
4. Log in as the **helper**: open a family without consent, show her typing her own PIN.
5. Log in as an **admin**: open a case, show the decision card, approve.
6. Log in as **admin**: make a draft rule, run the **Digital Twin**, show the cost slider.
7. Stay logged in as **admin**: open **Diary** and press **Verify the diary**.
8. Show the **scam checker** with the two sample messages.
9. Open **Swagger** and call a public API with the demo key.
10. Say out loud: *prototype, made-up data, trained on synthetic cases*.

## 23. Security summary

| Threat | Our defence |
|---|---|
| A user reads someone else's data | Row-level security in the database |
| An admin keeps looking after consent is withdrawn | Consent is checked on every read |
| A helper claims on behalf of a woman or takes her money | Her own PIN is needed; helper-owned accounts go to a human; helper sessions are one at a time |
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

## 24. AI from zero: the kinds of learning

### 24.1 What is "AI"? What is "machine learning"?

- **Artificial intelligence (AI)** is a broad word for computer programs that do things we think need intelligence: reading, deciding, spotting patterns.
- **Rules-based programs** are the oldest kind. A person writes every rule: "if the ID card is expired, hold the claim." They are predictable and easy to explain, but they cannot learn.
- **Machine learning (ML)** is a part of AI where the computer **learns a pattern from examples** instead of being given every rule. You show it many examples, it adjusts its internal numbers, and then it can handle new cases.
- **Training** is the learning step. **Prediction** (or "inference") is using the trained model on a new case.

### 24.2 The main families of machine learning

| Family | The idea in plain words | Typical use | Do we use it? |
|---|---|---|---|
| **Supervised learning** | You show examples **with the right answer attached** ("this message is a scam", "this claim was truly eligible"). The model learns to guess the answer for new examples. | Spam filters, loan decisions, medical tests | **Yes: two models** |
| **...Classification** | A kind of supervised learning where the answer is a **category** (safe / suspicious / scam, or eligible / not eligible) | Spam, fraud, diagnosis | **Yes** (both our models are classifiers) |
| **...Regression** | A kind of supervised learning where the answer is a **number** (a house price, tomorrow's temperature) | Price prediction, forecasting | No (our model predicts a probability for a yes/no class) |
| **Unsupervised learning** | You give examples **with no answers**. The model finds groups or patterns on its own. | Grouping customers, spotting odd cases | **No** |
| **...Clustering** | Put similar items in groups | Customer groups, topic groups | No |
| **...Dimensionality reduction** | Squeeze many columns into a few that keep most of the information | Visualising data | No |
| **...Anomaly detection** | Find items that do not look like the rest | Fraud, faults | No (we use rules and a supervised scam model instead) |
| **Semi-supervised learning** | A few labelled examples plus many unlabelled | When labelling is costly | No |
| **Reinforcement learning** | An agent learns by trial, reward and penalty | Games, robots | No |
| **Deep learning** | Very large neural networks that learn their own features | Photos, speech, language | No (we do not have enough data, and it is hard to explain) |
| **Generative AI / large language models** | Models that produce new text or images | Chatbots, writing | **Off by default** (optional wording helper only) |
| **Retrieval (search)** | Find the best matching text, no learning of labels | Search engines | **Yes** (policy search) |
| **Classic algorithms** (maths and rules, no learning) | Fixed formulas | Image sharpness, string similarity | **Yes** (name matching, document checks) |

**Our honest answer to "which kinds did you use?":** two **supervised classification** models (the decision model and the scam detector), plus several **non-learning algorithms** (name matching, document checks, policy search). We used **no unsupervised, reinforcement or deep-learning models**.

### 24.3 What is a classifier?

A **classifier** is a model that puts something into a category. Ours:

- The decision model says: *how likely is this claim to be truly eligible?* (two classes: eligible or not).
- The scam model says: *is this message safe, suspicious or a scam?* (three classes).

A classifier does not just give the class. A good one gives a **probability** for each class, which lets us say "I am not sure" when no class is clearly likely.

## 25. Core ideas you need

| Idea | Plain meaning |
|---|---|
| **Feature** | One fact the model looks at (for example "the photo is blurry"). A model takes a list of numbers, one per feature. |
| **Label** | The right answer for an example (for example "scam"). |
| **Training set** | Examples the model learns from. |
| **Test set** | Fresh examples, never seen during training, used to measure how good the model really is. |
| **Overfitting** | The model memorises the training examples and fails on new ones. Like a student who memorised last year's paper. |
| **Regularisation (the setting `C`)** | A brake that stops a model from fitting every little wiggle. In scikit-learn a **smaller `C` means a stronger brake**. |
| **Probability** | A number from 0 to 1 for how likely something is. 0.97 means 97 chances in 100. |
| **Calibration** | Making sure "97% sure" is really right about 97 times in 100. A model can be accurate but overconfident. Calibration fixes the numbers. |
| **Cross-validation (`cv=5`)** | Split the data into 5 parts. Train on 4, test on 1, and rotate. It gives a fairer estimate and is how we calibrate. |
| **Accuracy** | The share of answers that are right. |
| **Precision** | When it says "scam", how often is it right? |
| **Recall** | Of all the real scams, how many did it catch? |
| **False alarm rate** | Of all the safe messages, how many did it wrongly flag? |
| **Confusion matrix** | A table of true class against predicted class, so you can see which mistakes happen. |
| **Brier score** | A score for how honest the probabilities are. Lower is better. 0 is perfect. |
| **Class imbalance** | When one answer is much rarer than the other. It can fool accuracy. |
| **Synthetic data** | Invented examples. We must use them because the rules forbid real personal data. |
| **TF-IDF** | A way to turn text into numbers: words (or letter pieces) count more if they are frequent in this text but rare in general. |
| **n-gram** | A piece of text of n letters (or words). "scam" has 3-letter pieces "sca", "cam". |

## 26. Logistic regression, explained simply

**Both of our trained models are logistic regressions.** Here is what that means, with a tiny worked example.

### 26.1 The idea

Imagine a judge with a score sheet. Each fact adds or subtracts points. At the end the total points are turned into a **probability** between 0 and 1.

1. The model has a **weight** for each feature (how many points that fact is worth) and a **starting number** (the bias).
2. For a case, it adds up: **z = bias + (weight 1 × fact 1) + (weight 2 × fact 2) + ...**
3. It converts the total to a probability with the **sigmoid curve**: **p = 1 ÷ (1 + e^(−z))**. A big positive total gives p near 1. A big negative total gives p near 0. Zero gives 0.5.

### 26.2 A tiny made-up example

Suppose (these weights are only for illustration, **not our real ones**):

| Fact | Value for this claim | Weight | Points |
|---|---|---|---|
| Bias | 1 | +1.0 | +1.0 |
| Name is the same person (`id_same`) | 1 | +3.0 | +3.0 |
| Photo is blurry (`doc_blurry`) | 1 | −2.5 | −2.5 |
| Household score is far below the cutoff (`pmt_clear_below`) | 1 | +2.0 | +2.0 |
| Any visible problem | 1 | −1.0 | −1.0 |
| **Total z** | | | **+2.5** |

p = 1 ÷ (1 + e^(−2.5)) = 1 ÷ (1 + 0.082) = **0.92**, or 92% likely eligible. That is below our 0.97 line, so the claim would **not** be approved alone.

### 26.3 Why logistic regression suits us

- **Explainable.** You can print the weights and say *which facts pushed the decision*.
- **Fast.** One multiplication per feature. About 6.6 milliseconds per decision in our tests.
- **Stable and hard to overfit** on a small data set.
- **Gives a probability**, which is what "I am not sure" needs.
- **Needs little data** compared with big neural networks.

### 26.4 What a classifier learns during training

Training searches for the weights that make the model's probabilities match the right answers in the training set as well as possible. The setting `C` and the number of rounds `max_iter` control how the search behaves.

## 27. Model 1: the decision model (challenge 2: "I am not sure")

### 27.1 Purpose

Give one honest number, **`p_eligible`**, for how likely a claim is to be truly eligible. The engine uses it with the hard rules and checks to choose AUTO, ASK_MORE or HUMAN.

### 27.2 Type

A **supervised binary classifier**: a **logistic regression** wrapped in **isotonic calibration**.

### 27.3 The 21 features (what the model looks at)

| # | Feature | Meaning |
|---|---|---|
| 1 | `id_same` | The name match band is SAME (1 or 0) |
| 2 | `id_maybe` | The band is MAYBE |
| 3 | `id_diff` | The band is DIFFERENT |
| 4 | `id_score` | The name match score (0 to 1; 0.5 if unknown) |
| 5 | `id_known` | A name match result exists |
| 6 | `doc_conf` | The lowest read confidence across papers (0.7 if unknown) |
| 7 | `doc_blurry` | At least one photo is blurry |
| 8 | `doc_edited` | At least one paper shows signs of editing |
| 9 | `doc_missing` | A required paper is missing |
| 10 | `pmt_margin` | How far the household score is below the cutoff, in units of 15 points, limited to between −2.5 and +2.5 |
| 11 | `pmt_missing` | The household score is missing |
| 12 | `flags` | How many exclusion flags (government employee, vehicle, tax filer, foreign trips, high phone bill) |
| 13 | `payout_risk` | The payout account is shared, helper-owned or changed in the last 30 days |
| 14 | `cnic_bad` | The ID number is invalid or expired |
| 15 | `deceased` | The record says the person died |
| 16 | `scam` | A scam signal on the claim |
| 17 | `duplicate` | The person may be in the records twice |
| 18 | `missing_fields` | Missing details divided by 7 |
| 19 | `any_visible_problem` | A summary flag: any visible problem at all |
| 20 | `pmt_clear_below` | The score is more than 6 points below the cutoff (clearly eligible side) |
| 21 | `pmt_clear_above` | The score is more than 6 points above the cutoff (clearly ineligible side) |

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

> **Why this matters (Section 3A):** cybercrime reports rose about **35%** in 2025, about **90%** of financial scams run through digital or branchless-banking accounts, and BISP says genuine messages come **only from 8171** after blocking **tens of thousands** of SIMs used for fake ones. Only **17 verdicts** followed more than **13,000** online-fraud complaints in 2024, so stopping a scam early matters most. [S14, S15]

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

## 30. Document checks (challenge 8)

**Type: classic image maths, not trained.** It runs on each photographed paper.

| Check | How it works |
|---|---|
| **Blur** | A **Laplacian filter** finds edges. The **variance** (spread) of the result measures sharpness. At 800 pixels wide, a variance **below 60** means **blurry**, so the app says "take it again in good light". |
| **Edited image** | **Error-level analysis (ELA):** re-save a JPEG at a known quality and compare. Edited patches react differently, so they stand out. Plus a **metadata check** (for example editing software written in the file). |
| **Duplicate** | A **SHA-256 fingerprint** of the image finds the same photo sent twice. |
| **QR code** and **text reading (OCR)** | Need extra programs that are not installed everywhere. If missing, the system says so and **asks for another photo instead of guessing**. |

**Results:** 21 of 21 invented card images were judged as expected; 0 clean images were called suspicious. **Limit:** a very small sample and simple methods (ELA only works for JPEG photos).

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

### 34.1 Our reasons

1. **No real data is allowed.** We cannot send anything real to an outside service. Synthetic data is the only honest choice.
2. **"I am not sure" needs a trustworthy confidence.** A small **calibrated** model gives one. A chat model sounds sure even when it is wrong.
3. **Explainable.** We can print the weights and show which facts pushed a decision. An admin, a court or a citizen can ask "why?" and get a real answer.
4. **Fast, cheap and private.** About 6.6 ms per decision on a laptop, with no internet and no fees.
5. **Safe by design.** The model is a helper inside guard rails (section 36).
6. **We stay in control.** We know exactly what data and settings created each model, and every decision records the model version.

**We used no ready-made AI models.** Nothing was downloaded from a model hub.

### 34.2 Other model types we considered and why we did not use them

| Alternative | What it is | Why not here |
|---|---|---|
| **Decision tree / Random forest** | Many yes/no questions or many trees voting | Good accuracy, but harder to explain as one weighted score. Our features are mostly yes/no flags that a linear model handles well. |
| **Gradient boosting (XGBoost, LightGBM)** | Many small trees added together | Strong on real data, but overkill and harder to explain and calibrate for 12,000 invented rows. |
| **Naive Bayes** | A simple probability model for text | Fast, but its probabilities are usually poorly calibrated. |
| **Support vector machine (SVM)** | Finds the best dividing line | Gives scores, not honest probabilities, unless extra steps are added. |
| **Neural network / deep learning** | Layers of learned features | Needs much more data, is hard to explain, and is risky for decisions about benefits. |
| **BERT or a language model as a classifier** | A pre-trained text model | Needs outside weights and more compute. Hard to audit. Unnecessary for 480 short messages. |
| **Unsupervised clustering** | Group similar cases | No labels needed, but it cannot say "eligible" or "scam". We would not be able to explain a decision. |
| **A pure rules engine** | Only if-then rules | Predictable, but gives no probability and cannot weigh many small signals. We do use rules, together with the model. |

### 34.3 Why a probability model plus rules

The **hard rules** guarantee the things that must never go wrong (no consent, expired ID, deceased, edited papers). The **model** helps weigh many soft signals. The **calibration** keeps the confidence honest. The **zones** and the **approval line** decide how much the machine may do alone.

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


# Appendix A. The database in detail

This appendix is generated from the **live database** (Supabase Postgres, Mumbai). It lists every table: what it holds, who may read and write it, every field, how many records the demo has, and one sample record. All data is invented.

The database has **27 tables** and **2 views** (saved queries), **71 row-lock policies**, **65 triggers** and **47 helper functions**.

## A.1 How the tables connect (diagram)

Each box is a table with its record count. Each line is a link (foreign key). `audit_log`, `api_keys`, `scam_reports`, `data_quality_queue` and the user tables stand alone on purpose: the diary and keys must not depend on other tables, and users are joined by id, not by a hard link. Colours: green = people and identity, yellow = claims and decisions, blue = consent, purple = rules, red = audit diary, grey = platform and evaluation.

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
<text x="90" y="342" text-anchor="middle" font-size="10" fill="#5f6e6c">40 rows</text>
<rect x="525.0" y="152.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">cases</text>
<text x="600" y="182" text-anchor="middle" font-size="10" fill="#5f6e6c">151 rows</text>
<rect x="785.0" y="42.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="58" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">drafts</text>
<text x="860" y="72" text-anchor="middle" font-size="10" fill="#5f6e6c">0 rows</text>
<rect x="785.0" y="152.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">documents</text>
<text x="860" y="182" text-anchor="middle" font-size="10" fill="#5f6e6c">149 rows</text>
<rect x="1025.0" y="152.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="1100" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">doc_checks</text>
<text x="1100" y="182" text-anchor="middle" font-size="10" fill="#5f6e6c">12 rows</text>
<rect x="525.0" y="312.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="328" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">decisions</text>
<text x="600" y="342" text-anchor="middle" font-size="10" fill="#5f6e6c">225 rows</text>
<rect x="785.0" y="282.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="298" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">case_notes</text>
<text x="860" y="312" text-anchor="middle" font-size="10" fill="#5f6e6c">19 rows</text>
<rect x="785.0" y="362.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="378" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">case_flags</text>
<text x="860" y="392" text-anchor="middle" font-size="10" fill="#5f6e6c">17 rows</text>
<rect x="785.0" y="442.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="458" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">case_events</text>
<text x="860" y="472" text-anchor="middle" font-size="10" fill="#5f6e6c">398 rows</text>
<rect x="255.0" y="412.0" width="150" height="36" rx="8" fill="#e2edfb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="330" y="428" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">consents</text>
<text x="330" y="442" text-anchor="middle" font-size="10" fill="#5f6e6c">393 rows</text>
<rect x="15.0" y="452.0" width="150" height="36" rx="8" fill="#e2edfb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="90" y="468" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">consent_events</text>
<text x="90" y="482" text-anchor="middle" font-size="10" fill="#5f6e6c">397 rows</text>
<rect x="525.0" y="482.0" width="150" height="36" rx="8" fill="#f1e8fb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="498" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">rule_sets</text>
<text x="600" y="512" text-anchor="middle" font-size="10" fill="#5f6e6c">2 rows</text>
<rect x="785.0" y="542.0" width="150" height="36" rx="8" fill="#f1e8fb" stroke="#0f6f66" stroke-width="1.3"/>
<text x="860" y="558" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">rules</text>
<text x="860" y="572" text-anchor="middle" font-size="10" fill="#5f6e6c">18 rows</text>
<rect x="255.0" y="572.0" width="150" height="36" rx="8" fill="#fde9e7" stroke="#0f6f66" stroke-width="1.3"/>
<text x="330" y="588" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">audit_log</text>
<text x="330" y="602" text-anchor="middle" font-size="10" fill="#5f6e6c">1605 rows</text>
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
<text x="1100" y="512" text-anchor="middle" font-size="10" fill="#5f6e6c">0 rows</text>
<rect x="1025.0" y="572.0" width="150" height="36" rx="8" fill="#eee" stroke="#0f6f66" stroke-width="1.3"/>
<text x="1100" y="588" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">eval_cases</text>
<text x="1100" y="602" text-anchor="middle" font-size="10" fill="#5f6e6c">0 rows</text>
<rect x="525.0" y="722.0" width="150" height="36" rx="8" fill="#fbf3e1" stroke="#0f6f66" stroke-width="1.3"/>
<text x="600" y="738" text-anchor="middle" font-size="12.5" font-weight="700" fill="#14211f">data_quality_queue</text>
<text x="600" y="752" text-anchor="middle" font-size="10" fill="#5f6e6c">28 rows</text>
</svg>

## A.2 Reading the tables

- **Fields** are the columns. **Type** is the kind of data (uuid = unique id, text, integer, numeric = number with decimals, boolean = yes/no, timestamp = date and time, jsonb = flexible structured data, array = list).

- **Null?** says whether the field may be empty.

- **Who can read / write** is taken from the row-lock policies (section A.4 has the exact rules).

## A.3 Every table

### A.3.1 `local_users` (table, group: People and logins)

**What it contains.** The login table used in local login mode: email, a scrambled (bcrypt) password or PIN, failed-attempt counter and a lock time. Only the service can touch it.

**Who can read and write.** Nobody signs in through the database directly. The service calls one protected function to check a login. Five wrong tries lock the account for 30 seconds.

**Records.** 183 in the demo database. The PIN or password is never stored in plain text.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `user_id` | uuid | no | The login user. |
| `email` | text | no | Login email (lower case). |
| `password_hash` | text | no | Scrambled password or PIN (bcrypt). |
| `failed_attempts` | integer | no | Wrong logins in a row. |
| `locked_until` | timestamp | yes | The account is locked until this time. |
| `last_login_at` | timestamp | yes | Last successful login. |
| `created_at` | timestamp | no | When the row was created. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `user_id` | a0000000-0000-4000-8000-000000000001 |
| `email` | zainab@citizens.sahara.test |
| `password_hash` | (hidden: stored only as a scrambled hash) |
| `failed_attempts` | 0 |
| `locked_until` | None |
| `last_login_at` | None |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.2 `profiles` (table, group: People and logins)

**What it contains.** The display details of a user: full name, preferred language (Urdu or English), the office they belong to, and the link to their person record.

**Who can read and write.** A user reads and updates their own profile. Admin read all. Only an admin adds or edits other profiles.

**Records.** 183 in the demo database. One row per user (184 in the demo).

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `user_id` | uuid | no | The login user. |
| `full_name` | text | no | The user's display name. |
| `language` | text | no | ur or en. |
| `office` | text | yes | Office code, for example KHI-EAST. |
| `person_id` | uuid | yes | The person record. |
| `created_at` | timestamp | no | When the row was created. |

**Links:** `person_id` points to `people.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `user_id` | a0000000-0000-4000-8000-000000000001 |
| `full_name` | Zainab Bibi |
| `language` | ur |
| `office` | KHI-EAST |
| `person_id` | 91002eab-10b0-4aea-8fe2-7baf64d0867b |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.3 `user_roles` (table, group: People and logins)

**What it contains.** One row per user. Says which role the user has: citizen (shown as Person), helper or admin. One role per user.

**Who can read and write.** The user themselves reads their own row. Only an admin can add or remove a role, and never their own.

**Records.** 183 in the demo database. Created by the admin tool or the seed. Never changed by the app for normal users.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `user_id` | uuid | no | The login user. |
| `role` | text | no | citizen (shown as Person), helper or admin. |
| `created_at` | timestamp | no | When the row was created. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `user_id` | a0000000-0000-4000-8000-000000000001 |
| `role` | citizen |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.4 `households` (table, group: Identity)

**What it contains.** A household from the (mock) national survey: district, number of members, the poverty score (pmt_score), and flags such as government employee, owns vehicle, tax filer, foreign trips, high phone bill.

**Who can read and write.** Visible to people who can see someone in that household (the same rules as people). The admin can read all.

**Records.** 179 in the demo database. The poverty score drives eligibility: a score at or below the cutoff (30) is eligible.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `district` | text | yes | District. |
| `members` | integer | yes | Number of people in the household. |
| `pmt_score` | numeric | yes | Poverty score from the survey. Lower means poorer. |
| `flags` | jsonb | no | Exclusion flags (JSON). |
| `survey_date` | date | yes | When the survey was done. |
| `synthetic` | boolean | no | True: invented data. |
| `created_at` | timestamp | no | When the row was created. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | a8285c64-3169-4ca9-8c8c-765c45a84887 |
| `district` | Larkana |
| `members` | 4 |
| `pmt_score` | 22 |
| `flags` | {"tax_filer": false, "gov_employee": false, "owns_ve… |
| `survey_date` | 2025-09-15 |
| `synthetic` | True |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.5 `people` (table, group: Identity)

**What it contains.** The identity record of a person: name in English letters and Urdu, ID card (CNIC) number and expiry, date of birth, father or husband name, gender, district, whether deceased, household, mock phone or wallet, source of the record.

**Who can read and write.** A citizen sees only their own record. A helper sees a person only inside an open session and only with consent. An admin sees a person only for cases in their own office and only with consent. Admin does not read this table. The admin reads a masked view (people_masked).

**Records.** 189 in the demo database. Real systems would load this from NADRA. Here it is invented (189 people). Some people are on purpose the same person with different spellings.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `user_id` | uuid | yes | The login user. |
| `name_roman` | text | yes | Name in English letters. |
| `name_ur` | text | yes | Name in Urdu script. |
| `cnic` | text | yes | 13-digit national ID number (fake here). |
| `cnic_expiry` | date | yes | When the ID card expires. |
| `dob_raw` | text | yes | Date of birth as written on the record (may be messy). |
| `dob_iso` | date | yes | Date of birth as a clean date, if it could be read. |
| `dob_precision` | text | no | How exact the date is (full date, year only, unknown). |
| `father_or_husband` | text | yes | Father's or husband's name. |
| `relation_type` | text | yes | S/O, W/O or D/O. |
| `relation_late` | boolean | no | True if the relative is marked late (deceased). |
| `gender` | text | yes | Gender. |
| `district` | text | yes | District. |
| `district_cnic` | text | yes | District coded in the ID number. |
| `deceased` | boolean | no | True if the record says the person died. |
| `household_id` | uuid | yes | The household. |
| `phone_mock` | text | yes | Made-up phone number. |
| `wallet_name` | text | yes | Mobile wallet provider (mock). |
| `bank_name` | text | yes | Bank (mock). |
| `source` | text | no | Where the record came from. |
| `record_no` | integer | yes | Which copy of the record this is (to model duplicates). |
| `synthetic` | boolean | no | True: invented data. |
| `created_at` | timestamp | no | When the row was created. |

**Links:** `household_id` points to `households.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 91002eab-10b0-4aea-8fe2-7baf64d0867b |
| `user_id` | a0000000-0000-4000-8000-000000000001 |
| `name_roman` | Zainab Bibi |
| `name_ur` | زینب بی بی |
| `cnic` | 4130190000112 |
| `cnic_expiry` | 2029-12-31 |
| `dob_raw` | 1978 |
| `dob_iso` | 1978-01-01 |
| `dob_precision` | year |
| `father_or_husband` | Ghulam Mustafa Chandio |
| `relation_type` | W/O |
| `relation_late` | True |
| `gender` | F |
| `district` | Larkana |
| `district_cnic` | Larkana |
| `deceased` | False |
| `household_id` | a8285c64-3169-4ca9-8c8c-765c45a84887 |
| `phone_mock` | 0311-0000001 |
| `wallet_name` | Zainab Bibi |
| `bank_name` | JazzCash |
| `source` | application |
| `record_no` | 1 |
| `synthetic` | True |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.6 `people_masked` (view, group: Identity)

**What it contains.** A VIEW (a saved query, not stored data) of people with the ID number hidden except the end, for the admin.

**Who can read and write.** Admin and staff views only. It never shows the full ID card number.

**Records.** 0 in the demo database. Computed on the fly.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | yes | Unique id of the row. |
| `name_roman` | text | yes | Name in English letters. |
| `name_ur` | text | yes | Name in Urdu script. |
| `cnic_masked` | text | yes | ID number with the middle hidden. |
| `gender` | text | yes | Gender. |
| `district` | text | yes | District. |
| `deceased` | boolean | yes | True if the record says the person died. |
| `household_id` | uuid | yes | The household. |
| `dob_precision` | text | yes | How exact the date is (full date, year only, unknown). |
| `synthetic` | boolean | yes | True: invented data. |

### A.3.7 `person_links` (table, group: Identity)

**What it contains.** Possible matches between two person records (the same woman on two records). Stores the match band (SAME, MAYBE, DIFFERENT), the score and the evidence behind it.

**Who can read and write.** Visible if you can see either person. Admin reads all.

**Records.** 11 in the demo database. Records here are suggestions only. A MAYBE is never merged automatically.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `a_id` | uuid | no | First person. |
| `b_id` | uuid | no | Second person. |
| `band` | text | no | SAME, MAYBE or DIFFERENT. |
| `score` | numeric | no | Match or scam score, 0 to 1. |
| `evidence` | jsonb | no | Field-by-field evidence (JSON). |
| `created_at` | timestamp | no | When the row was created. |

**Links:** `a_id` points to `people.id`; `b_id` points to `people.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | d9eb1560-8056-4637-870b-a27f09285625 |
| `a_id` | 91002eab-10b0-4aea-8fe2-7baf64d0867b |
| `b_id` | 809eed97-801d-4b29-8836-6cb262d0ccc8 |
| `band` | SAME |
| `score` | 0.94 |
| `evidence` | [{"agree": "yes", "field": "cnic"}, {"a": "Zainab Bi… |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.8 `helper_assignments` (table, group: Helper Mode)

**What it contains.** Which families a helper helps. 'active' is true while the helper has that family open (the session). A helper can have only one active family at a time.

**Who can read and write.** A helper reads their own assignments. A citizen reads who is assigned to her. Admin read all. Admin or the citizen creates or removes an assignment.

**Records.** 40 in the demo database. 40 families are assigned to the demo helper.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `helper_user_id` | uuid | no | The helper user. |
| `person_id` | uuid | no | The person record. |
| `active` | boolean | no | True if currently in use. |
| `session_started_at` | timestamp | yes | When the helper opened the family. |
| `session_ended_at` | timestamp | yes | When the helper closed the family. |
| `created_at` | timestamp | no | When the row was created. |

**Links:** `person_id` points to `people.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 7b8e963f-8deb-43fc-8252-1791096faa3f |
| `helper_user_id` | a0000000-0000-4000-8000-000000000002 |
| `person_id` | 91002eab-10b0-4aea-8fe2-7baf64d0867b |
| `active` | False |
| `session_started_at` | None |
| `session_ended_at` | None |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.9 `case_events` (table, group: Claims)

**What it contains.** The timeline of a claim: created, step saved, submitted, decided, and so on, each with who did it and extra data.

**Who can read and write.** Visible to anyone who can see the claim. Inserted by the citizen, helper, admin or admin, always as themselves.

**Records.** 398 in the demo database. Append-only history.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `case_id` | uuid | no | The claim this row belongs to. |
| `kind` | text | no | The type of event. |
| `actor_id` | uuid | yes | Who did it (a user id). |
| `data` | jsonb | no | Extra details (JSON). |
| `at` | timestamp | no | When it happened. |

**Links:** `case_id` points to `cases.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | c583f74b-4029-4f4b-8da5-c2bc4298e02f |
| `case_id` | 96a07ce1-e01d-4e7f-8c0f-be57e9644b59 |
| `kind` | created |
| `actor_id` | a0000000-0000-4000-8000-000000000002 |
| `data` | {"by": "helper"} |
| `at` | 2026-11-10 06:30:00+00:00 |

### A.3.10 `cases` (table, group: Claims)

**What it contains.** The claim itself, one per person per quarter. Holds who owns it, which helper helped, the person and household, the office, the quarter (for example 2026-Q4), status, zone (AUTO, ASK_MORE, HUMAN), result, amount, the payout account and its title, the current draft and step, the resume code, the assigned admin, a priority number, and key dates.

**Who can read and write.** The citizen reads her own claims. A helper reads claims of the family in the open session. An admin reads claims of their own office that have active consent. Admin read all claims. The citizen and helper may update only while the claim is a draft or awaiting proof. Admins and admin update through the decision flow.

**Records.** 151 in the demo database. Status moves: draft, submitted, in_review, awaiting_proof, approved, rejected, paid, stopped, closed.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `owner_user_id` | uuid | no | The citizen who owns the claim. |
| `helper_user_id` | uuid | yes | The helper user. |
| `person_id` | uuid | no | The person record. |
| `household_id` | uuid | yes | The household. |
| `office` | text | no | Office code, for example KHI-EAST. |
| `quarter` | text | no | The payment quarter, for example 2026-Q4. |
| `status` | text | no | Current state. |
| `zone` | text | yes | AUTO, ASK_MORE or HUMAN. |
| `result` | text | yes | APPROVE, HOLD, ASK_MORE, REJECT or HUMAN_REVIEW. |
| `amount` | integer | no | Payment amount in rupees. |
| `payout_account` | text | yes | Mobile account number for the payment. |
| `payout_account_title` | text | yes | Name on that account. |
| `payout_changed_at` | timestamp | yes | When the payout account was last changed. |
| `draft` | jsonb | no | The answers so far (JSON). |
| `step` | integer | no | The claim step she reached (1 to 8). |
| `resume_code` | text | yes | 6-digit code to continue later. |
| `assigned_officer` | uuid | yes | Admin working on it. |
| `priority` | numeric | no | Queue priority number (higher first). |
| `open_flags` | integer | no | Number of open concern flags. |
| `submitted_at` | timestamp | yes | When the claim was sent. |
| `decided_at` | timestamp | yes | When it was decided. |
| `created_at` | timestamp | no | When the row was created. |
| `updated_at` | timestamp | no | When the row was last changed. |

**Links:** `household_id` points to `households.id`; `person_id` points to `people.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 96a07ce1-e01d-4e7f-8c0f-be57e9644b59 |
| `owner_user_id` | a0000000-0000-4000-8000-000000000001 |
| `helper_user_id` | a0000000-0000-4000-8000-000000000002 |
| `person_id` | 91002eab-10b0-4aea-8fe2-7baf64d0867b |
| `household_id` | a8285c64-3169-4ca9-8c8c-765c45a84887 |
| `office` | KHI-EAST |
| `quarter` | 2026-Q4 |
| `status` | draft |
| `zone` | None |
| `result` | None |
| `amount` | 13500 |
| `payout_account` | 0300-9900011 |
| `payout_account_title` | Zainab Bibi |
| `payout_changed_at` | None |
| `draft` | {"language": "ur", "step_names": ["who", "family", "… |
| `step` | 3 |
| `resume_code` | 482913 |
| `assigned_officer` | None |
| `priority` | 0 |
| `open_flags` | 0 |
| `submitted_at` | None |
| `decided_at` | None |
| `created_at` | 2026-11-10 06:30:00+00:00 |
| `updated_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.11 `doc_checks` (table, group: Claims)

**What it contains.** Each individual check on a document: name of the check (blur, edit signs, duplicate), verdict, confidence and detail.

**Who can read and write.** Visible to anyone who can see the document.

**Records.** 12 in the demo database. Written by the service when a photo is analysed.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `document_id` | uuid | no | The document. |
| `check_name` | text | no | Which check. |
| `verdict` | text | no | pass / unsure / fail or ok / blurry / suspicious. |
| `confidence` | numeric | yes | How sure the check or model is, 0 to 1. |
| `detail` | jsonb | no | Plain-words explanation or numbers (JSON). |
| `at` | timestamp | no | When it happened. |

**Links:** `document_id` points to `documents.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 2a9d102a-293b-4800-8cd2-589a466393b2 |
| `document_id` | 86d657be-473c-494e-8b82-5480741a61f3 |
| `check_name` | blur |
| `verdict` | unsure |
| `confidence` | 0.9 |
| `detail` | {"seed": true} |
| `at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.12 `documents` (table, group: Claims)

**What it contains.** One row per photographed paper: the type (ID card front, and so on), where the file is stored, its SHA-256 fingerprint, the check signals (as JSON) and the verdict (ok, blurry, suspicious).

**Who can read and write.** Visible to anyone who can see the claim. Only a citizen or helper adds a document, as themselves.

**Records.** 149 in the demo database. The fingerprint finds the same photo sent twice.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `case_id` | uuid | no | The claim this row belongs to. |
| `doc_type` | text | no | Type of paper. |
| `storage_path` | text | no | Where the file is kept. |
| `sha256` | text | yes | Fingerprint of the photo. |
| `signals` | jsonb | no | Check numbers (JSON). |
| `verdict` | text | yes | pass / unsure / fail or ok / blurry / suspicious. |
| `uploaded_by` | uuid | yes | Who uploaded. |
| `created_at` | timestamp | no | When the row was created. |

**Links:** `case_id` points to `cases.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 86d657be-473c-494e-8b82-5480741a61f3 |
| `case_id` | 96a07ce1-e01d-4e7f-8c0f-be57e9644b59 |
| `doc_type` | cnic_front |
| `storage_path` | seed/96a07ce1-e01d-4e7f-8c0f-be57e9644b59/cnic_front… |
| `sha256` | 3d6017c1564411d70437eeabb466d68ebec975abe9d4588c4e94… |
| `signals` | {"qr": {"found": false}, "is_blurry": false, "blur_s… |
| `verdict` | ok |
| `uploaded_by` | a0000000-0000-4000-8000-000000000002 |
| `created_at` | 2026-11-10 06:40:00+00:00 |

### A.3.13 `drafts` (table, group: Claims)

**What it contains.** The saved in-progress claim: which step she reached, the answers so far, the 6-digit resume code and an idempotency key so a repeated save is not applied twice.

**Who can read and write.** Citizen and helper, for claims they can see.

**Records.** 0 in the demo database. Empty in the demo database because the demo claims keep their draft inside the case row.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `case_id` | uuid | no | The claim this row belongs to. |
| `owner_user_id` | uuid | no | The citizen who owns the claim. |
| `step` | integer | no | The claim step she reached (1 to 8). |
| `data` | jsonb | no | Extra details (JSON). |
| `resume_code` | text | no | 6-digit code to continue later. |
| `idempotency_key` | text | yes | Stops the same save being applied twice. |
| `saved_at` | timestamp | no | Last save. |
| `expires_at` | timestamp | no | When it ends. |

**Links:** `case_id` points to `cases.id`.

### A.3.14 `case_flags` (table, group: Decisions)

**What it contains.** Concern flags an admin raises on a claim (kind, severity, status, who opened and resolved it).

**Who can read and write.** Read by admin. Opened and updated by admins.

**Records.** 17 in the demo database. Open flags block payment until resolved.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `case_id` | uuid | no | The claim this row belongs to. |
| `kind` | text | no | The type of event. |
| `severity` | text | no | How serious. |
| `status` | text | no | Current state. |
| `note` | text | yes | A short written note. |
| `opened_by` | uuid | yes | Who opened. |
| `opened_at` | timestamp | no | When opened. |
| `resolved_by` | uuid | yes | Who resolved. |
| `resolved_at` | timestamp | yes | When resolved. |
| `resolution_note` | text | yes | How it was resolved. |

**Links:** `case_id` points to `cases.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 1c737dd7-2662-4864-8785-f5d685c062e9 |
| `case_id` | 9d631123-e4d9-477f-8615-141fb30b4b3a |
| `kind` | payout_account |
| `severity` | hard |
| `status` | open |
| `note` | Wallet is in the brother's name |
| `opened_by` | a0000000-0000-4000-8000-000000000004 |
| `opened_at` | 2026-11-21 07:21:16.189267+00:00 |
| `resolved_by` | None |
| `resolved_at` | None |
| `resolution_note` | None |

### A.3.15 `case_notes` (table, group: Decisions)

**What it contains.** The 'I am not sure' package: what was checked, what is missing, what the admin should do next.

**Who can read and write.** Read by admins for visible claims. Written by admins (through the service).

**Records.** 19 in the demo database. Created whenever the system sends a claim to a person.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `case_id` | uuid | no | The claim this row belongs to. |
| `decision_id` | uuid | yes | The decision. |
| `package` | jsonb | no | The 'I am not sure' note package (JSON). |
| `created_at` | timestamp | no | When the row was created. |

**Links:** `case_id` points to `cases.id`; `decision_id` points to `decisions.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 6c60cf25-3778-424d-833a-53c3b0f80f7e |
| `case_id` | 340baf08-aad4-4ac5-803e-eff0d40eb92a |
| `decision_id` | 1f7ea4c1-1467-4acd-84a9-25b68667af6a |
| `package` | {"checked": ["consent", "identity", "documents"], "s… |
| `created_at` | 2026-11-12 10:21:00+00:00 |

### A.3.16 `data_quality_queue` (table, group: Decisions)

**What it contains.** A to-do list of bad or odd data found by the system (for example a missing name), with the reason code and status.

**Who can read and write.** Read by admin. Updated by admin.

**Records.** 28 in the demo database. Supports challenge 3: bad data is queued, not guessed.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `entity` | text | no | Kind of record. |
| `entity_id` | uuid | yes | Which record. |
| `problem` | text | no | What is wrong. |
| `reason_code` | text | yes | One of the 24 decision reason codes. |
| `status` | text | no | Current state. |
| `created_at` | timestamp | no | When the row was created. |
| `resolved_by` | uuid | yes | Who resolved. |
| `resolved_at` | timestamp | yes | When resolved. |
| `note` | text | yes | A short written note. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 8939c87f-e67a-4045-954b-42f64c951a09 |
| `entity` | consent |
| `entity_id` | 12701346-fe31-4a65-8f16-c16f27b91705 |
| `problem` | purge derived data (consent withdrawn) |
| `reason_code` | R_CONSENT_MISSING |
| `status` | open |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |
| `resolved_by` | None |
| `resolved_at` | None |
| `note` | None |

### A.3.17 `decisions` (table, group: Decisions)

**What it contains.** Every decision ever made on a claim, never updated. Holds the zone, result, reason code, confidence, the approve and reject lines used, the rule version and its checksum, the model version, all checks, the citizen-friendly explanation, the full trace, the next step, a snapshot of the inputs and its hash, and the consent used. Both the system and admins write rows.

**Who can read and write.** Visible to anyone who can see the claim. An admin may insert a decision only as themselves.

**Records.** 225 in the demo database. This is the heart of 'explain and audit'. A change of mind is a NEW row, never an edit.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `case_id` | uuid | no | The claim this row belongs to. |
| `created_at` | timestamp | no | When the row was created. |
| `actor_type` | text | no | user, ai, system or job. |
| `actor_id` | uuid | yes | Who did it (a user id). |
| `zone` | text | no | AUTO, ASK_MORE or HUMAN. |
| `result` | text | no | APPROVE, HOLD, ASK_MORE, REJECT or HUMAN_REVIEW. |
| `reason_code` | text | no | One of the 24 decision reason codes. |
| `confidence` | numeric | yes | How sure the check or model is, 0 to 1. |
| `approve_line` | numeric | yes | The sure-enough line used (for example 0.97). |
| `reject_line` | numeric | yes | The reject line used. |
| `rule_set_id` | uuid | no | The rule set used. |
| `rule_version` | integer | no | Rule version number. |
| `rule_checksum` | text | no | Fingerprint of the rule set used. |
| `model_version` | text | yes | Version of the model used. |
| `checks` | jsonb | no | All the checks and their results (JSON). |
| `explain_citizen` | jsonb | no | The plain explanation for the citizen (JSON). |
| `trace` | jsonb | no | Every step the engine took (JSON). |
| `next_step` | jsonb | yes | What happens next (JSON). |
| `input_snapshot` | jsonb | yes | The exact inputs used (JSON). |
| `input_hash` | text | yes | Fingerprint of the inputs. |
| `consent_snapshot_id` | uuid | yes | The consent that was active. |
| `costs_used` | jsonb | yes | The cost numbers used (JSON). |
| `note` | text | yes | A short written note. |

**Links:** `case_id` points to `cases.id`; `consent_snapshot_id` points to `consents.id`; `rule_set_id` points to `rule_sets.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 1f7ea4c1-1467-4acd-84a9-25b68667af6a |
| `case_id` | 340baf08-aad4-4ac5-803e-eff0d40eb92a |
| `created_at` | 2026-11-12 10:21:00+00:00 |
| `actor_type` | ai |
| `actor_id` | None |
| `zone` | HUMAN |
| `result` | HUMAN_REVIEW |
| `reason_code` | R_PMT_BORDERLINE |
| `confidence` | 0.58 |
| `approve_line` | 0.97 |
| `reject_line` | 0.15 |
| `rule_set_id` | aad87c09-bb64-4e24-8630-5b1d062cdb87 |
| `rule_version` | 1 |
| `rule_checksum` | sha256-f3d7ea66607ae739d3067bd65ceb34e946d9c913e829a… |
| `model_version` | seed-logreg-2026-11-01 |
| `checks` | [{"name": "consent", "detail": "active consent (seed… |
| `explain_citizen` | {"en": "Your score is close to the limit. A staff me… |
| `trace` | [{"rule": "NO_CONSENT", "step": 1, "what": "hard_rul… |
| `next_step` | {"type": "human", "doc_type": null} |
| `input_snapshot` | {"doc": {"any_blurry": false, "any_edited": false, "… |
| `input_hash` | 285f9bc1a9e1816dfc846d3b331f3381f2de1d48b9493b58b116… |
| `consent_snapshot_id` | 17ab33b3-7b89-409e-8fc0-5e5be34e2553 |
| `costs_used` | {"proof": 1, "review": 3, "wrong_reject": 20, "wrong… |
| `note` | None |

### A.3.18 `consent_events` (table, group: Consent)

**What it contains.** The history of each consent: granted, withdrawn, with a receipt hash so the citizen can keep proof.

**Who can read and write.** Visible to whoever can see the consent.

**Records.** 397 in the demo database. Append-only.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `consent_id` | uuid | no | The consent. |
| `kind` | text | no | The type of event. |
| `by` | uuid | yes | Who did it. |
| `receipt_hash` | text | no | Fingerprint proving the consent text and time. |
| `at` | timestamp | no | When it happened. |

**Links:** `consent_id` points to `consents.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | f7543f97-4ef5-4019-a4d6-edd035a02246 |
| `consent_id` | 60267977-b682-4461-8e17-982ca21b394d |
| `kind` | granted |
| `by` | a0000000-0000-4000-8000-000000000001 |
| `receipt_hash` | 2cab0f409d9184d7e4dd14d7deebbaf709b6525374339dfd460d… |
| `at` | 2026-10-03 08:30:00+00:00 |

### A.3.19 `consent_flags` (view, group: Consent)

**What it contains.** A VIEW: for a person and purpose, is there an active consent right now (true or false)?

**Who can read and write.** Used by the database rules. No private details inside.

**Records.** 0 in the demo database. Computed on the fly.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `subject_id` | uuid | yes | The citizen the consent is about. |
| `purpose` | text | yes | claim_processing or claim_help. |
| `active` | boolean | yes | True if currently in use. |

### A.3.20 `consents` (table, group: Consent)

**What it contains.** Each permission: who gave it (subject), to whom (office, helper or the payment service), for what purpose (claim_processing, claim_help), which fields, status (granted, withdrawn, expired), when granted and withdrawn, and a version.

**Who can read and write.** The citizen reads and updates (withdraws) her own consents and inserts her own. A helper reads the consent of the family they are working with. Admin read all. A helper can NOT insert consent for someone else.

**Records.** 393 in the demo database. A withdrawn consent stops admin and helper access straight away.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `subject_id` | uuid | no | The citizen the consent is about. |
| `grantee_type` | text | no | office, helper or service. |
| `grantee_id` | text | no | Which office, helper or service. |
| `purpose` | text | no | claim_processing or claim_help. |
| `fields` | ARRAY | no | Which fields may be seen. |
| `status` | text | no | Current state. |
| `granted_by` | uuid | yes | Who clicked or typed to give it. |
| `granted_at` | timestamp | no | When given. |
| `withdrawn_at` | timestamp | yes | When taken back. |
| `expires_at` | timestamp | yes | When it ends. |
| `version` | integer | no | Version number. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 60267977-b682-4461-8e17-982ca21b394d |
| `subject_id` | a0000000-0000-4000-8000-000000000001 |
| `grantee_type` | office |
| `grantee_id` | KHI-EAST |
| `purpose` | claim_processing |
| `fields` | ["*"] |
| `status` | granted |
| `granted_by` | a0000000-0000-4000-8000-000000000001 |
| `granted_at` | 2026-10-03 08:30:00+00:00 |
| `withdrawn_at` | None |
| `expires_at` | None |
| `version` | 1 |

### A.3.21 `rule_sets` (table, group: Rules)

**What it contains.** A version of the programme rules. Holds version number, name, status (draft, active, retired), the parameters as JSON (cutoff, amount, payout cap, costs...), a checksum, the parent version and dates. Only ONE can be active at a time. Saved versions cannot be edited.

**Who can read and write.** Active version readable by citizens and admins. Admin read all. Only an admin inserts, updates (to go live) or deletes a DRAFT.

**Records.** 2 in the demo database. Version 1 is live. Version 2 is a draft used for the Digital Twin demo.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `version` | integer | no | Version number. |
| `name` | text | yes | Name. |
| `status` | text | no | Current state. |
| `params` | jsonb | no | The rule parameters (JSON). |
| `checksum` | text | yes | Fingerprint of the rule set. |
| `parent_version` | integer | yes | Version this was copied from. |
| `created_by` | uuid | yes | Who created it. |
| `created_at` | timestamp | no | When the row was created. |
| `effective_from` | timestamp | yes | Live from. |
| `effective_to` | timestamp | yes | Live until. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | aad87c09-bb64-4e24-8630-5b1d062cdb87 |
| `version` | 1 |
| `name` | Policy v1.0 (MOCK) |
| `status` | active |
| `params` | {"costs": {"proof": 1, "review": 3, "wrong_reject": … |
| `checksum` | sha256-f3d7ea66607ae739d3067bd65ceb34e946d9c913e829a… |
| `parent_version` | None |
| `created_by` | a0000000-0000-4000-8000-000000000006 |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |
| `effective_from` | 2026-11-21 07:21:16.189267+00:00 |
| `effective_to` | None |

### A.3.22 `rules` (table, group: Rules)

**What it contains.** The individual rules inside a rule set: a code, the condition as safe json-logic, the outcome (PASS, HOLD, ASK_MORE), the reason code and the reason text in English and Urdu.

**Who can read and write.** Readable wherever the rule set is readable. Only an admin adds or deletes rules (in a draft).

**Records.** 18 in the demo database. 18 rules in the demo.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `rule_set_id` | uuid | no | The rule set used. |
| `code` | text | no | Short rule code. |
| `expression` | jsonb | no | The condition (safe json-logic JSON). |
| `outcome` | text | no | What happens when the rule fires. |
| `reason_code` | text | no | One of the 24 decision reason codes. |
| `reason_en` | text | no | Reason in English. |
| `reason_ur` | text | no | Reason in Urdu. |
| `created_at` | timestamp | no | When the row was created. |

**Links:** `rule_set_id` points to `rule_sets.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 0242f72f-3264-4dd9-9f31-13408197a7c0 |
| `rule_set_id` | aad87c09-bb64-4e24-8630-5b1d062cdb87 |
| `code` | R0_PMT_CLEARLY_ELIGIBLE |
| `expression` | {"and": [{"!": {"missing": ["household.pmt_score"]}}… |
| `outcome` | PASS |
| `reason_code` | R_AUTO_APPROVED |
| `reason_en` | Your claim matches the rules. Your payment is approv… |
| `reason_ur` | آپ کا دعویٰ قواعد پر پورا اترتا ہے۔ آپ کی ادائیگی من… |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |

### A.3.23 `audit_log` (table, group: Audit)

**What it contains.** The diary. Every important action: who (actor), what (action), on what (entity), when, the input hash, the rule and model version, confidence, result, details, and two chain fingerprints: prev_hash and hash.

**Who can read and write.** Admin read everything. Everybody else reads only lines about themselves. NOBODY can update, delete or truncate it. Triggers refuse.

**Records.** 1605 in the demo database. Each hash is built from the row plus the previous row's hash. 'Verify the diary' re-checks the chain from row 1.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | bigint | no | Unique id of the row. |
| `ts` | timestamp | no | Exact time. |
| `actor_id` | uuid | yes | Who did it (a user id). |
| `actor_type` | text | no | user, ai, system or job. |
| `actor_role` | text | yes | Role of the actor. |
| `action` | text | no | What happened, for example decision.made. |
| `entity_type` | text | yes | Kind of thing affected. |
| `entity_id` | uuid | yes | Which record. |
| `input_hash` | text | yes | Fingerprint of the inputs. |
| `rule_version` | integer | yes | Rule version number. |
| `model_version` | text | yes | Version of the model used. |
| `confidence` | numeric | yes | How sure the check or model is, 0 to 1. |
| `result` | text | yes | APPROVE, HOLD, ASK_MORE, REJECT or HUMAN_REVIEW. |
| `details` | jsonb | no | Extra details (JSON). |
| `prev_hash` | text | no | Hash of the previous diary row. |
| `hash` | text | no | Hash of this row plus prev_hash. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 1 |
| `ts` | 2026-11-21 07:21:16.248597+00:00 |
| `actor_id` | None |
| `actor_type` | job |
| `actor_role` | None |
| `action` | user_roles.insert |
| `entity_type` | user_roles |
| `entity_id` | None |
| `input_hash` | None |
| `rule_version` | None |
| `model_version` | None |
| `confidence` | None |
| `result` | None |
| `details` | {"new": {"role": "citizen", "user_id": "a0000000-000… |
| `prev_hash` | GENESIS |
| `hash` | 78dbd9a84e5fbc9bccc16119254f0ae3165be92ffd2beadcd6cf… |

### A.3.24 `api_keys` (table, group: Platform)

**What it contains.** Keys for the public API: a name, the hash of the key (the key itself is never stored), allowed scopes, a per-minute limit, revoked flag and dates.

**Who can read and write.** Admin read. Only an admin creates, edits or revokes.

**Records.** 2 in the demo database. A revoked key stops working immediately.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `name` | text | no | Name. |
| `key_hash` | text | no | Hash of the API key. |
| `scopes` | ARRAY | no | What the key may do. |
| `rate_limit_per_min` | integer | no | Calls allowed per minute. |
| `revoked` | boolean | no | True if switched off. |
| `revoked_at` | timestamp | yes | When switched off. |
| `created_by` | uuid | yes | Who created it. |
| `created_at` | timestamp | no | When the row was created. |
| `last_used_at` | timestamp | yes | Last time used. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 17c80394-5649-4b21-87ca-f12cfd9bd619 |
| `name` | demo-partner (synthetic) |
| `key_hash` | (hidden: stored only as a scrambled hash) |
| `scopes` | ["status:read", "scam:check", "eligibility:precheck"] |
| `rate_limit_per_min` | 60 |
| `revoked` | False |
| `revoked_at` | None |
| `created_by` | a0000000-0000-4000-8000-000000000006 |
| `created_at` | 2026-11-21 07:21:16.189267+00:00 |
| `last_used_at` | None |

### A.3.25 `scam_reports` (table, group: Platform)

**What it contains.** Messages that people checked or reported: the text, the sender, the label (safe, suspicious, scam), the score, the reasons, language and district.

**Who can read and write.** Citizen, helper and admin insert reports as themselves and read their own. Admin read all.

**Records.** 40 in the demo database. Feeds the 'scam map' idea.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `text` | text | no | Message text. |
| `sender` | text | yes | Who sent the message. |
| `label` | text | no | safe, suspicious or scam. |
| `score` | numeric | yes | Match or scam score, 0 to 1. |
| `reasons` | jsonb | no | Why (JSON). |
| `district` | text | yes | District. |
| `language` | text | yes | ur or en. |
| `source` | text | no | Where the record came from. |
| `reported_by` | uuid | yes | Who reported it. |
| `created_at` | timestamp | no | When the row was created. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | 68667792-767f-4302-8cef-1ad0f5d2e356 |
| `text` | BISP: You have won Rs 25,000 relief. Send your CNIC … |
| `sender` | 0300-5550101 |
| `label` | scam |
| `score` | 0.97 |
| `reasons` | [{"code": "PRIZE_TOO_GOOD"}, {"code": "ASKS_CNIC"}, … |
| `district` | Karachi East |
| `language` | en |
| `source` | user |
| `reported_by` | a0000000-0000-4000-8000-000000000003 |
| `created_at` | 2026-10-01 01:00:00+00:00 |

### A.3.26 `schema_migrations` (table, group: Platform)

**What it contains.** The list of migration files that have been applied, with the time.

**Who can read and write.** Internal.

**Records.** 6 in the demo database. 6 files.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `filename` | text | no | Migration file. |
| `applied_at` | timestamp | no | When applied. |

**Sample record (invented):**

| Field | Value |
|---|---|
| `filename` | 0001_core.sql |
| `applied_at` | 2026-11-21 07:21:14.433177+00:00 |

### A.3.27 `eval_cases` (table, group: Evaluation)

**What it contains.** The per-case results of an evaluation run: truth, predicted, zone, correct or not, cost.

**Who can read and write.** Admin read.

**Records.** 0 in the demo database. Empty until an evaluation is saved.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `run_id` | uuid | no | The evaluation run. |
| `case_id` | uuid | yes | The claim this row belongs to. |
| `case_text` | text | yes | Case description. |
| `truth` | text | yes | The true answer. |
| `predicted` | text | yes | What the system said. |
| `zone` | text | yes | AUTO, ASK_MORE or HUMAN. |
| `correct` | boolean | yes | True if right. |
| `cost` | numeric | yes | Cost of this case. |

**Links:** `case_id` points to `cases.id`; `run_id` points to `eval_runs.id`.

### A.3.28 `eval_runs` (table, group: Evaluation)

**What it contains.** One row for each evaluation run with the metrics as JSON.

**Who can read and write.** Admin read.

**Records.** 0 in the demo database. Empty until an evaluation is saved.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `created_at` | timestamp | no | When the row was created. |
| `triggered_by` | uuid | yes | Who ran it. |
| `rule_set_id` | uuid | yes | The rule set used. |
| `model_version` | text | yes | Version of the model used. |
| `metrics` | jsonb | no | Result numbers (JSON). |

**Links:** `rule_set_id` points to `rule_sets.id`.

### A.3.29 `labelled_cases` (table, group: Evaluation)

**What it contains.** Past made-up cases with the true answer (truth) and the facts at the time. Used by the Digital Twin and by evaluation.

**Who can read and write.** Admin.

**Records.** 120 in the demo database. 120 cases.

| Field | Type | Null? | Meaning |
|---|---|---|---|
| `id` | uuid | no | Unique id of the row. |
| `case_id` | uuid | no | The claim this row belongs to. |
| `category` | text | no | Kind of test case. |
| `truth` | text | no | The true answer. |
| `facts` | jsonb | no | The facts of the case (JSON). |
| `outcome` | text | no | What happens when the rule fires. |
| `notes` | text | yes | Free notes. |

**Links:** `case_id` points to `cases.id`.

**Sample record (invented):**

| Field | Value |
|---|---|
| `id` | b923158f-a8f1-4fb4-8366-f1ad798a0bbe |
| `case_id` | a65923e5-404c-4ceb-8824-08ac1d9c074a |
| `category` | borderline |
| `truth` | eligible |
| `facts` | {"doc": {"any_blurry": false, "any_edited": false, "… |
| `outcome` | paid |
| `notes` | borderline / R_PMT_BORDERLINE |

## A.4 Row-lock policies (who can do what, exactly)

A policy is a rule written inside the database. If no policy allows an action, the database refuses it. `app.current_role()` is the role of the person making the request. Helper functions such as `app.can_see_person` hide the long details.

| Table | Policy | Action | Plain meaning |
|---|---|---|---|
| `api_keys` | `keys_insert` | INSERT | `((role = 'admin') AND (created_by = me))` |
| `api_keys` | `keys_select` | SELECT | `(role = 'admin')` |
| `api_keys` | `keys_update` | UPDATE | `(role = 'admin')` |
| `audit_log` | `audit_select_own` | SELECT | `((actor_id = me) OR ((details ->> 'subject_id') = (me)))` |
| `audit_log` | `audit_select_staff` | SELECT | `(role = 'admin')` |
| `case_events` | `events_insert` | INSERT | `((role = ANY (ARRAY['citizen', 'helper', 'admin'])) AND (actor_id = me) AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `case_events` | `events_select` | SELECT | `(case_id IN ( SELECT cases.id FROM cases))` |
| `case_flags` | `flags_insert` | INSERT | `((role = 'admin') AND (opened_by = me) AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `case_flags` | `flags_select` | SELECT | `((role = 'admin') AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `case_flags` | `flags_update` | UPDATE | `((role = 'admin') AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `case_notes` | `notes_insert` | INSERT | `((role = 'admin') AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `case_notes` | `notes_select` | SELECT | `((role = 'admin') AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `cases` | `cases_insert_citizen` | INSERT | `((role = 'citizen') AND (owner_user_id = me) AND (helper_user_id IS NULL) AND (status = 'draft') AND (person_id = app.current_person_id()))` |
| `cases` | `cases_insert_helper` | INSERT | `((role = 'helper') AND (helper_user_id = me) AND (status = 'draft') AND app.helper_can_see_person(person_id) AND (owner_user_id = app.person_user(pers…` |
| `cases` | `cases_select_helper` | SELECT | `app.helper_can_see_person(person_id)` |
| `cases` | `cases_select_officer` | SELECT | `app.officer_sees_case(owner_user_id, office, status)` |
| `cases` | `cases_select_owner` | SELECT | `(owner_user_id = me)` |
| `cases` | `cases_update_admin` | UPDATE | `(role = 'admin')` |
| `cases` | `cases_update_citizen` | UPDATE | `((role = 'citizen') AND (owner_user_id = me) AND (status = ANY (ARRAY['draft', 'awaiting_proof'])))` |
| `cases` | `cases_update_helper` | UPDATE | `(app.helper_can_see_person(person_id) AND (status = ANY (ARRAY['draft', 'awaiting_proof'])))` |
| `cases` | `cases_update_officer` | UPDATE | `app.officer_sees_case(owner_user_id, office, status)` |
| `consent_events` | `cevents_select` | SELECT | `(consent_id IN ( SELECT consents.id FROM consents))` |
| `consents` | `consents_insert_own` | INSERT | `((subject_id = me) AND (granted_by = me) AND (status = 'granted'))` |
| `consents` | `consents_select_helper` | SELECT | `((role = 'helper') AND app.helper_can_see_person(app.person_of_user(subject_id)))` |
| `consents` | `consents_select_own` | SELECT | `(subject_id = me)` |
| `consents` | `consents_select_staff` | SELECT | `(role = 'admin')` |
| `consents` | `consents_update_own` | UPDATE | `(subject_id = me)` |
| `data_quality_queue` | `dq_select` | SELECT | `(role = 'admin')` |
| `data_quality_queue` | `dq_update` | UPDATE | `(role = 'admin')` |
| `decisions` | `decisions_insert_officer` | INSERT | `((role = 'admin') AND (actor_type = 'user') AND (actor_id = me) AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `decisions` | `decisions_select` | SELECT | `(case_id IN ( SELECT cases.id FROM cases))` |
| `doc_checks` | `doc_checks_select` | SELECT | `(document_id IN ( SELECT documents.id FROM documents))` |
| `documents` | `documents_insert` | INSERT | `((role = ANY (ARRAY['citizen', 'helper'])) AND (uploaded_by = me) AND (case_id IN ( SELECT cases.id FROM cases WHERE (cases.status = ANY (ARRAY['draft…` |
| `documents` | `documents_select` | SELECT | `(case_id IN ( SELECT cases.id FROM cases))` |
| `drafts` | `drafts_insert` | INSERT | `((role = ANY (ARRAY['citizen', 'helper'])) AND (case_id IN ( SELECT cases.id FROM cases WHERE (cases.status = ANY (ARRAY['draft', 'awaiting_proof'])))…` |
| `drafts` | `drafts_select` | SELECT | `((role = ANY (ARRAY['citizen', 'helper'])) AND (case_id IN ( SELECT cases.id FROM cases)))` |
| `eval_cases` | `eval_cases_select` | SELECT | `(role = 'admin')` |
| `eval_runs` | `eval_runs_select` | SELECT | `(role = 'admin')` |
| `helper_assignments` | `assign_delete` | DELETE | `((role = 'admin') OR ((role = 'citizen') AND (person_id = app.current_person_id())))` |
| `helper_assignments` | `assign_insert` | INSERT | `((role = 'admin') OR ((role = 'citizen') AND (person_id = app.current_person_id()) AND (active = false)))` |
| `helper_assignments` | `assign_select_citizen` | SELECT | `(person_id = app.current_person_id())` |
| `helper_assignments` | `assign_select_helper` | SELECT | `(helper_user_id = me)` |
| `helper_assignments` | `assign_select_staff` | SELECT | `(role = 'admin')` |
| `helper_assignments` | `assign_update_admin` | UPDATE | `(role = 'admin')` |
| `households` | `households_select` | SELECT | `app.can_see_household(id)` |
| `households` | `households_select_admin` | SELECT | `(role = 'admin')` |
| `labelled_cases` | `labelled_select` | SELECT | `(role = 'admin')` |
| `people` | `people_select` | SELECT | `app.can_see_person(id)` |
| `person_links` | `links_select` | SELECT | `(app.can_see_person(a_id) OR app.can_see_person(b_id))` |
| `person_links` | `links_select_admin` | SELECT | `(role = 'admin')` |
| `profiles` | `profiles_insert_admin` | INSERT | `(role = 'admin')` |
| `profiles` | `profiles_select_own` | SELECT | `(user_id = me)` |
| `profiles` | `profiles_select_staff` | SELECT | `(role = 'admin')` |
| `profiles` | `profiles_update_admin` | UPDATE | `(role = 'admin')` |
| `profiles` | `profiles_update_own` | UPDATE | `(user_id = me)` |
| `rule_sets` | `rule_sets_delete` | DELETE | `((role = 'admin') AND (status = 'draft'))` |
| `rule_sets` | `rule_sets_insert` | INSERT | `(role = 'admin')` |
| `rule_sets` | `rule_sets_select_public` | SELECT | `((status = 'active') AND (role = ANY (ARRAY['citizen', 'admin'])))` |
| `rule_sets` | `rule_sets_select_staff` | SELECT | `(role = 'admin')` |
| `rule_sets` | `rule_sets_update` | UPDATE | `(role = 'admin')` |
| `rules` | `rules_delete` | DELETE | `(role = 'admin')` |
| `rules` | `rules_insert` | INSERT | `(role = 'admin')` |
| `rules` | `rules_select` | SELECT | `(rule_set_id IN ( SELECT rule_sets.id FROM rule_sets))` |
| `scam_reports` | `scam_insert` | INSERT | `((role = ANY (ARRAY['citizen', 'helper', 'admin'])) AND (reported_by = me))` |
| `scam_reports` | `scam_select_own` | SELECT | `(reported_by = me)` |
| `scam_reports` | `scam_select_staff` | SELECT | `(role = 'admin')` |
| `user_roles` | `roles_delete_admin` | DELETE | `((role = 'admin') AND (user_id <> me))` |
| `user_roles` | `roles_insert_admin` | INSERT | `((role = 'admin') AND (user_id <> me))` |
| `user_roles` | `roles_select_own` | SELECT | `(user_id = me)` |
| `user_roles` | `roles_select_staff` | SELECT | `(role = 'admin')` |
| `user_roles` | `roles_update_admin` | UPDATE | `((role = 'admin') AND (user_id <> me))` |

## A.5 Triggers (code that runs inside the database)

| Table | Trigger | When | Event |
|---|---|---|---|
| `api_keys` | `zz_audit` | AFTER | DELETE |
| `api_keys` | `zz_audit` | AFTER | INSERT |
| `api_keys` | `zz_audit` | AFTER | UPDATE |
| `audit_log` | `audit_chain_fill` | BEFORE | INSERT |
| `audit_log` | `audit_no_update` | BEFORE | DELETE |
| `audit_log` | `audit_no_update` | BEFORE | UPDATE |
| `case_flags` | `case_flags_guard` | BEFORE | DELETE |
| `case_flags` | `case_flags_guard` | BEFORE | INSERT |
| `case_flags` | `case_flags_guard` | BEFORE | UPDATE |
| `case_flags` | `case_flags_sync` | AFTER | INSERT |
| `case_flags` | `case_flags_sync` | AFTER | UPDATE |
| `case_flags` | `zz_audit` | AFTER | DELETE |
| `case_flags` | `zz_audit` | AFTER | INSERT |
| `case_flags` | `zz_audit` | AFTER | UPDATE |
| `cases` | `cases_guard` | BEFORE | INSERT |
| `cases` | `cases_guard` | BEFORE | UPDATE |
| `cases` | `cases_no_delete` | BEFORE | DELETE |
| `cases` | `zz_audit` | AFTER | DELETE |
| `cases` | `zz_audit` | AFTER | INSERT |
| `cases` | `zz_audit` | AFTER | UPDATE |
| `consent_events` | `consent_events_immutable` | BEFORE | DELETE |
| `consent_events` | `consent_events_immutable` | BEFORE | UPDATE |
| `consent_events` | `zz_audit` | AFTER | DELETE |
| `consent_events` | `zz_audit` | AFTER | INSERT |
| `consent_events` | `zz_audit` | AFTER | UPDATE |
| `consents` | `consents_after_insert` | AFTER | INSERT |
| `consents` | `consents_after_update` | AFTER | UPDATE |
| `consents` | `consents_before` | BEFORE | INSERT |
| `consents` | `consents_before` | BEFORE | UPDATE |
| `consents` | `consents_no_delete` | BEFORE | DELETE |
| `consents` | `zz_audit` | AFTER | DELETE |
| `consents` | `zz_audit` | AFTER | INSERT |
| `consents` | `zz_audit` | AFTER | UPDATE |
| `decisions` | `decisions_before_insert` | BEFORE | INSERT |
| `decisions` | `decisions_immutable` | BEFORE | DELETE |
| `decisions` | `decisions_immutable` | BEFORE | UPDATE |
| `decisions` | `zz_audit` | AFTER | DELETE |
| `decisions` | `zz_audit` | AFTER | INSERT |
| `decisions` | `zz_audit` | AFTER | UPDATE |
| `documents` | `zz_audit` | AFTER | DELETE |
| `documents` | `zz_audit` | AFTER | INSERT |
| `documents` | `zz_audit` | AFTER | UPDATE |
| `helper_assignments` | `zz_audit` | AFTER | DELETE |
| `helper_assignments` | `zz_audit` | AFTER | INSERT |
| `helper_assignments` | `zz_audit` | AFTER | UPDATE |
| `profiles` | `profiles_guard` | BEFORE | INSERT |
| `profiles` | `profiles_guard` | BEFORE | UPDATE |
| `rule_sets` | `rule_sets_guard` | BEFORE | DELETE |
| `rule_sets` | `rule_sets_guard` | BEFORE | INSERT |
| `rule_sets` | `rule_sets_guard` | BEFORE | UPDATE |
| `rule_sets` | `zz_audit` | AFTER | DELETE |
| `rule_sets` | `zz_audit` | AFTER | INSERT |
| `rule_sets` | `zz_audit` | AFTER | UPDATE |
| `rules` | `rules_guard` | BEFORE | DELETE |
| `rules` | `rules_guard` | BEFORE | INSERT |
| `rules` | `rules_guard` | BEFORE | UPDATE |
| `rules` | `zz_audit` | AFTER | DELETE |
| `rules` | `zz_audit` | AFTER | INSERT |
| `rules` | `zz_audit` | AFTER | UPDATE |
| `user_roles` | `user_roles_guard` | BEFORE | DELETE |
| `user_roles` | `user_roles_guard` | BEFORE | INSERT |
| `user_roles` | `user_roles_guard` | BEFORE | UPDATE |
| `user_roles` | `zz_audit` | AFTER | DELETE |
| `user_roles` | `zz_audit` | AFTER | INSERT |
| `user_roles` | `zz_audit` | AFTER | UPDATE |

## A.6 Database helper functions (schema `app`)

`app.activate_rule_set`, `app.actor_type_now`, `app.audit_canonical`, `app.audit_chain_fill`, `app.audit_head`, `app.audit_refuse_change`, `app.audit_row`, `app.can_see_household`, `app.can_see_person`, `app.case_flags_guard`, `app.case_flags_sync`, `app.cases_guard`, `app.cases_no_delete`, `app.consent_receipt`, `app.consents_after_insert`, `app.consents_after_update`, `app.consents_before`, `app.create_rule_set`, `app.current_office`, `app.current_person_id`, `app.current_role`, `app.current_user_id`, `app.decisions_before_insert`, `app.expire_consents`, `app.expr_problem`, `app.fact_vars`, `app.has_consent`, `app.helper_can_see_person`, `app.helper_end_session`, `app.helper_start_session`, `app.is_active_family`, `app.local_login`, `app.log_access`, `app.officer_sees_case`, `app.person_of_user`, `app.person_user`, `app.profiles_guard`, `app.refuse_change`, `app.resume_draft`, `app.rule_set_checksum`, `app.rule_sets_guard`, `app.rules_guard`, `app.save_draft`, `app.user_roles_guard`, `app.validate_rule_set`, `app.verify_audit_chain`, `app.withdraw_consent`.

Examples: `app.current_role()` (who am I), `app.can_see_person(id)`, `app.has_consent(grantee, subject, purpose, field)`, `app.activate_rule_set(id)`, `app.verify_audit_chain()`, `app.local_login(email, secret)`, `app.helper_start_session(person)`.


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
| <code>R_<wbr>AUTO_<wbr>APPROVED</code> | <span style='white-space:nowrap'>AUTO</span> | Your claim matches the rules. Your payment is approved. | آپ کا دعویٰ قواعد پر پورا اترتا ہے۔ آپ کی ادائیگی منظور ہو گئی ہے۔ |
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
  Dockerfile            One image: service + built web app (untested)
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
    tests/              159 tests
    requirements.txt
  web/
    src/                The React app (pages, components, api, i18n, offline)
    public/audio/       108 voice files (ur/, en/)
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
| Live Chrome check | from `web/`: `node scripts/smoke_live.mjs` |
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
