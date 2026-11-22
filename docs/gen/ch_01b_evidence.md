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
