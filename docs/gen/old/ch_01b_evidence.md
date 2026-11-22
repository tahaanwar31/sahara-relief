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
