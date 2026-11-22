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
