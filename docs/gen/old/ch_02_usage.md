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
