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
