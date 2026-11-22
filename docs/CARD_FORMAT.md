# The Sahara card format (what the computer vision reads)

The ID card photo is read by computer vision (RapidOCR, runs on the server's CPU). To make the reading reliable we fixed **one layout**.
A real CNIC has Urdu and English text and security patterns; this prototype uses a simple English template, because the data is made up.

**Front of the card** (one label line, then its value on the next line):

| Label | Example value |
|---|---|
| Name | Zainab Bibi |
| Father Name | Ghulam Mustafa Chandio |
| Gender | F |
| Date of Birth | 15.06.1978 |
| Date of Expiry | 31.12.2029 |
| Identity Number | 41301-9000011-2 |

The card also has a **photo box** (top left). The government record (`mock.nadra.photo`) holds the holder's photo too.

**What the system checks, in this order**
1. The photo is a real photo: sharp, not edited, not a duplicate of another family's photo (existing document checks).
2. The photo can be read. If not: the claim asks for a clearer front photo (`R_CARD_UNREADABLE`).
3. The **ID number** on the card is compared with the government record (`mock.nadra`, our stand-in for NADRA). Digits only; the dashes do not matter.
4. The **name** on the card is compared with the record (case and spacing do not matter; small spelling slips are accepted at 88 % similarity).
5. The **face** on the card is compared with the photo in the record. Two small models from the OpenCV zoo (YuNet finds the face, SFace turns it into 128 numbers); two faces are "the same person" at cosine similarity 0.50 or more.

**Outcomes**
Every combination of face / name / number has its own reason, shown to the person and to the staff member:

| Face | Name | Number | Result | Reason code |
|---|---|---|---|---|
| match | match | match | goes on to the other checks (can be approved automatically) | none |
| match | match | differs | a staff member checks | `R_CARD_NUMBER_MISMATCH` |
| match | differs | match | a staff member checks | `R_CARD_NAME_MISMATCH` |
| differs | match | match | a staff member checks | `R_CARD_FACE_MISMATCH` |
| match | differs | differs | a staff member checks | `R_CARD_BOTH_MISMATCH` (name and number) |
| differs | differs | match | a staff member checks | `R_CARD_FACE_NAME_MISMATCH` |
| differs | match | differs | a staff member checks | `R_CARD_FACE_NUMBER_MISMATCH` |
| differs | differs | differs | a staff member checks | `R_CARD_ALL_MISMATCH` |

If the card or the face cannot be read, the claim asks for a clearer photo (`R_CARD_UNREADABLE`) and guesses nothing.

**The face cutoff.** 0.50 was chosen on a handful of AI-generated faces: the same person on a card-sized, noisy print scored 0.78-0.84, different people scored 0.13-0.41.
The model's own paper suggests 0.363, which let one pair of different people through, so we use the stricter line (a wrong "no match" only sends the claim to a person).
It has not been tested on a real population, on different skin tones or ages, or on glare and bent cards. Before real use it needs that evaluation and a fairness check.
The demo faces are AI-generated (nobody real). The registry photo for Zainab is `db/seed/photos/4130190000112.jpg`; load photos with `python scripts/load_registry_photos.py`.

**Honest limits.** A real NADRA card needs a bigger model that handles Urdu script, glare and bent cards. This check proves the method on our template.
It cannot tell a skilled forgery from a real card; the edit-signs check helps, and a person always decides doubtful cases.
Make sample cards with `python scripts/make_sample_cards.py` (they go to `Desktop\sahara-sample-docs`).
