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
