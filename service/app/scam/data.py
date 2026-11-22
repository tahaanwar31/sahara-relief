"""SYNTHETIC scam / safe message sets (English, Roman Urdu, Urdu script).

EVERYTHING HERE IS INVENTED for the prototype. No real message, number or link is used.
- generate_training_set(): builds ~480 messages from templates with random slots.
- HELD_OUT: ~100 hand-written messages with different wording, used only for evaluation.
  Because the same author wrote both sets, numbers on it show the machinery works; they do
  not predict performance on real SMS traffic.

Labels: "safe", "suspicious", "scam". "suspicious" is deliberately fuzzy (unknown sender or
unknown link with no direct ask), which is where a classifier should say "be careful", not "block".
"""
from __future__ import annotations

import random

OFFICIAL_SENDER = "9171"  # the mock programme short code
OFFICIAL_DOMAINS = ("sahara.gov.test",)

ORGS = ["BISP", "Sahara Relief", "NADRA", "Ehsaas", "Kafaalat", "FBR", "PM Relief", "Sahara Programme", "Benazir"]
ORGS_UR = ["بی آئی ایس پی", "سہارا ریلیف", "نادرا", "احساس", "کفالت"]
BAD_LINKS = ["http://sahara-relief-claim.xyz/win", "bit.ly/3xRelief", "https://bisp-verify.top/login", "www.nadra-renew.click",
             "http://relief-pk.cc/claim", "tinyurl.com/sahara25", "https://ehsaas-gov.help/pay"]
GOOD_LINK = "https://sahara.gov.test/status"
PLACES = ["Larkana", "Karachi", "Hyderabad", "Quetta", "Peshawar", "Lahore", "Sukkur", "Multan"]

# ---- scam templates -----------------------------------------------------------------
SCAM_EN = [
    "{org}: You have won Rs {amt} relief. Send your CNIC and 4-digit PIN to claim today. Reply YES.",
    "Congratulations! Your {org} payment of Rs {amt} is ready. Pay Rs {fee} processing fee to receive it: {link}",
    "URGENT: your account will be blocked in 24 hours. Click {link} and enter your OTP to verify.",
    "{org}: Your CNIC expires today. Send a photo of both sides of your CNIC to renew now.",
    "Dear customer, to release your Rs {amt} send Rs {fee} by easypaisa to {phone} immediately.",
    "{org} notice: unpaid tax Rs {amt}. Pay today or your CNIC will be blocked. Click {link}",
    "You are selected for flood relief of Rs {amt}! Share your OTP code to confirm your number.",
    "Your {org} payment is on hold. Verify your account now at {link} and send your PIN.",
    "Last chance! Claim your free Rs {amt} prize before midnight. Registration fee Rs {fee}. {link}",
    "{org}: Send your password and CNIC number to this number to unlock your payment today.",
    "Winner! Rs {amt} lottery from {org}. Send Rs {fee} courier charges to receive your cheque.",
    "Aap ka account band ho jayega. Abhi {link} par click karen aur apna PIN daalen.",
]
SCAM_RU = [
    "Assalam o alaikum, {org} se message. Aap ko flood relief Rs {amt} mil gaye hain. Apna CNIC aur PIN bhejen.",
    "Aapka {org} ka paisa ruk gaya hai. Is link par click kar ke 3 din mein apni maloomat update karein: {link}",
    "Mubarak ho! Aap ne Rs {amt} ka inaam jeeta hai. Rs {fee} fees jama karwayen aur paisa hasil karen.",
    "Apna OTP code abhi batayen warna aapka {org} account band ho jayega.",
    "{org} ki taraf se Rs {amt} aap ke liye hain. Rs {fee} processing fee {phone} par easypaisa karen.",
    "Aap ka shanakhti card expire ho gaya hai. Foran apni CNIC ki photo bhejen {phone} par.",
    "Aap ka inaam nikal aya hai! Rs {amt}. Link kholain {link} aur apna pin number likhain.",
    "Zaroori: {org} payment lene ke liye apna password bata dein. Aaj hi.",
]
SCAM_UR = [
    "مبارک ہو! آپ کو {org} کی طرف سے {amt} روپے ملے ہیں۔ اپنا شناختی کارڈ نمبر اور پن بھیجیں۔",
    "آپ کا اکاؤنٹ بلاک ہو جائے گا۔ فوراً اس لنک پر کلک کریں {link}",
    "رقم وصول کرنے کے لیے {fee} روپے فیس جمع کروائیں۔",
    "آپ کا انعام نکل آیا ہے۔ ابھی اپنا او ٹی پی کوڈ بتائیں ورنہ رقم ضائع ہو جائے گی۔",
    "{org}: آپ کا شناختی کارڈ ختم ہو گیا ہے۔ اپنے شناختی کارڈ کی تصویر اس نمبر پر بھیجیں {phone}",
    "فوری اطلاع: {amt} روپے کا امدادی چیک آپ کے نام ہے۔ پاس ورڈ بھیجیں اور {link} پر جائیں۔",
]
# ---- suspicious templates (fuzzy: unknown sender or link, no direct ask) -------------
SUSP_EN = [
    "Your relief status was updated. Check details here {link}",
    "Hello, I am from the relief office. Please call me back on {phone} about your payment.",
    "Dear user, your app needs an update to keep receiving alerts. Open {link}",
    "Relief camp registration is open at {place} tomorrow. Forwarded as received.",
    "New offer: apply for the winter support package, details at {link}",
]
SUSP_RU = [
    "Aap ke payment ke baare mein maloomat ke liye is number {phone} par call karen.",
    "Relief ka naya form aya hai, tafseel yahan dekhen {link}",
    "Bhai mujhe pata chala hai ke {org} ki nayi scheme aa rahi hai, apna number de dena.",
    "Camp {place} mein kal lag raha hai, forward kar dein sab ko.",
]
SUSP_UR = [
    "آپ کی ادائیگی کے بارے میں معلومات کے لیے اس نمبر پر کال کریں {phone}",
    "امدادی فارم کی نئی تفصیل یہاں دیکھیں {link}",
    "کل {place} میں امدادی کیمپ لگ رہا ہے، آگے بھیج دیں۔",
]
# ---- safe templates (genuine programme messages + ordinary life) ---------------------
SAFE_EN = [
    "Sahara: Your payment of Rs {amt} is ready. Visit your nearest registered agent with your original CNIC. Never share PIN/OTP.",
    "Sahara: Your CNIC {cnic_mask} is registered. Your survey is under review.",
    "Sahara: Application rejected: CNIC expired. Renew at NADRA and reapply. Appeal within 30 days: helpline 0800-00000 (MOCK).",
    "Sahara: We received your documents on {date}. No fee is needed. Status: {link}",
    "Sahara: Your next payment of Rs {amt} will be released after the 5th. Nobody will ask for your PIN.",
    "Sahara: An officer has asked for one clearer photo of your CNIC. Upload it in the app. This is free.",
    "Are you coming for dinner tonight? Mum made biryani.",
    "Your parcel will arrive tomorrow between 2 and 5 pm. Please keep Rs {amt} cash ready at the door.",
    "Reminder: school fee Rs {amt} is due on the 5th, to be paid at the school office.",
    "Meeting moved to 3 pm. See you at the office.",
    "Your electricity bill of Rs {amt} is due on {date}. Pay at any bank branch.",
    "Bank alert: Rs {amt} credited to your account from Ali. Never share your PIN or OTP with anyone.",
]
SAFE_RU = [
    "Sahara: Aapki Rs {amt} ki adaigi tayyar hai. Apna asal CNIC le kar agent ke paas jayen. PIN kisi ko na batayen.",
    "Sahara: Aapka survey review mein hai. Koi fees nahi hai.",
    "Sahara: Aap ki application mein ek aur tasveer chahiye. App mein upload karen. Yeh bilkul muft hai.",
    "Kal shaam ko ghar aa jayen, khana saath khayenge.",
    "Bhai Rs {amt} bhej diye hain, mil jayen to bata dena.",
    "Aaj ka mausam kharab hai, ghar se na niklen. Bijli {date} ko aayegi.",
]
SAFE_UR = [
    "سہارا: آپ کی ادائیگی تیار ہے۔ اصل شناختی کارڈ کے ساتھ ایجنٹ کے پاس جائیں۔ پن کسی کو نہ بتائیں۔",
    "سہارا: آپ کا سروے زیر جائزہ ہے۔ کوئی فیس نہیں ہے۔",
    "کل شام کو گھر آ جائیں، کھانا ساتھ کھائیں گے۔",
    "سہارا: ایک اور واضح تصویر درکار ہے۔ ایپ میں اپ لوڈ کریں۔ یہ مفت ہے۔",
    "اسکول کی فیس {amt} روپے پانچ تاریخ تک دفتر میں جمع کروا دیں۔",
]


def _fill(t: str, rnd: random.Random) -> str:
    return t.format(
        org=rnd.choice(ORGS) if rnd.random() < 0.8 else rnd.choice(ORGS_UR),
        amt=rnd.choice(["25,000", "25000", "13,500", "50,000", "15000", "10,000", "30,000", "8,500", "14,500"]),
        fee=rnd.choice(["500", "1,000", "2,500", "300", "1500"]),
        link=rnd.choice(BAD_LINKS) if rnd.random() < 0.9 else GOOD_LINK,
        phone="03" + str(rnd.randint(0, 4)) + "".join(str(rnd.randint(0, 9)) for _ in range(8)),
        place=rnd.choice(PLACES),
        date=f"{rnd.randint(1, 28)}-{rnd.randint(1, 12)}-2026",
        cnic_mask="42101-XXXXX-" + str(rnd.randint(0, 9)),
    )


def _noise(s: str, rnd: random.Random) -> str:
    r = rnd.random()
    if r < 0.15:
        return s.upper() if s.isascii() else s
    if r < 0.30:
        return s.lower() if s.isascii() else s
    if r < 0.40:
        return s + " " + rnd.choice(["!!", ".", "Thanks", "Shukriya", "❤"])
    return s


def _link_fix(label: str, text: str, rnd: random.Random) -> str:
    return text


def generate_training_set(n: int = 480, seed: int = 7) -> list[dict]:
    """Return a list of {text, sender, label, lang, synthetic: True}. Deterministic for a seed."""
    rnd = random.Random(seed)
    out: list[dict] = []
    groups = [
        ("scam", [(SCAM_EN, "en"), (SCAM_RU, "ru"), (SCAM_UR, "ur")], 0.42),
        ("suspicious", [(SUSP_EN, "en"), (SUSP_RU, "ru"), (SUSP_UR, "ur")], 0.16),
        ("safe", [(SAFE_EN, "en"), (SAFE_RU, "ru"), (SAFE_UR, "ur")], 0.42),
    ]
    for label, langs, share in groups:
        for _ in range(int(n * share)):
            pool, lang = rnd.choice(langs)
            tpl = rnd.choice(pool)
            text = _noise(_fill(tpl, rnd), rnd)
            programme = tpl.startswith("Sahara:") or tpl.startswith("سہارا:")
            if label == "safe" and programme:
                sender = OFFICIAL_SENDER if rnd.random() < 0.92 else rnd.choice(["8171", "03001234567"])
            elif label == "scam":
                sender = rnd.choice(["03" + str(rnd.randint(0, 4)) + "5550123", "BISP-Info", "8171", "JazzCash",
                                     "unknown", "", OFFICIAL_SENDER if rnd.random() < 0.06 else "0300000000"])
            elif label == "suspicious":
                sender = rnd.choice(["03211110000", "", "unknown", "03451112222"])
            else:
                sender = rnd.choice(["03331234567", "Bank", "Mum", "", "03451234567"])
            out.append({"text": text, "sender": sender, "label": label, "lang": lang, "synthetic": True})
    rnd.shuffle(out)
    return out


# ---- held-out set: written by hand with different wording -----------------------------
def _h(text: str, sender: str, label: str, lang: str) -> dict:
    return {"text": text, "sender": sender, "label": label, "lang": lang, "synthetic": True}


HELD_OUT: list[dict] = [
    # scams
    _h("BISP: You have won Rs 25,000 relief. Send your CNIC and 4-digit PIN to claim today. Reply YES.", "0300555", "scam", "en"),
    _h("FBR notice: unpaid tax Rs 18,200. Pay today or CNIC will be blocked. Click link.", "FBR-ALERT", "scam", "en"),
    _h("NADRA: your CNIC expires today. Send a photo of both sides of your CNIC to renew.", "0345123", "scam", "en"),
    _h("Dear beneficiary, your stipend is stuck. Kindly forward the 6 digit code you just received so we can release it.", "03112345", "scam", "en"),
    _h("Claim your winter grant now! Deposit Rs 700 for verification at 0301-2223334 and the money is yours.", "", "scam", "en"),
    _h("Final warning: SIM will be disabled tonight. Reply with your ID card number to keep it active.", "PTA-info", "scam", "en"),
    _h("Congrats, you are our lucky winner of a motorbike. Contact us with your PIN to book delivery.", "unknown", "scam", "en"),
    _h("Your relief card is suspended. Log in at http://relief-check.top and type your password.", "9170", "scam", "en"),
    _h("Sahara Relief: payment released. To receive, send OTP shown on your phone to this number immediately.", "03009998888", "scam", "en"),
    _h("Dear user pay clearance charges Rs 1200 through jazzcash to get your Rs 30000 relief cheque.", "", "scam", "en"),
    _h("Assalam o alaikum, BISP se message. Aap ko flood relief Rs 25000 mil gaye hain. Apna CNIC aur PIN bhejen.", "03005550", "scam", "ru"),
    _h("Aapka Kafaalat ka paisa ruk gaya hai. Is link par click kar ke 3 din mein apni maloomat update karein.", "bit.ly/xyz", "scam", "ru"),
    _h("Aap ki Rs 50000 ki lottery nikli hai, claim karne ke liye Rs 2000 tax jama karwa dein.", "", "scam", "ru"),
    _h("Apna shanakhti card number aur OTP abhi batayen warna aapki imdad band ho jaye gi.", "03451112", "scam", "ru"),
    _h("Mubarak! Aap ka naam relief list mein aa gaya. Apna pin likh kar reply karen foran.", "unknown", "scam", "ru"),
    _h("Aap ka account 24 ghantay mein block ho jaye ga, abhi verify karen http://verify-bank.xyz", "bank-pk", "scam", "ru"),
    _h("آپ کے لیے پچیس ہزار روپے کی امداد منظور ہو گئی ہے۔ اپنا پن اور شناختی کارڈ نمبر بھیجیں۔", "0300111", "scam", "ur"),
    _h("آپ کا کارڈ بلاک ہو رہا ہے۔ فوری طور پر اپنا او ٹی پی بتائیں۔", "", "scam", "ur"),
    _h("انعام جیتنے پر مبارک ہو۔ رقم لینے کے لیے پانچ سو روپے فیس بھیجیں۔", "03217777", "scam", "ur"),
    _h("آپ کا امدادی اکاؤنٹ منجمد ہے۔ اس لنک پر پاس ورڈ ڈالیں http://aid-pk.click", "unknown", "scam", "ur"),
    # safe
    _h("Sahara: Your payment of Rs 13,500 is ready. Visit your nearest registered agent with your original CNIC. Never share PIN/OTP.", "9171", "safe", "en"),
    _h("Sahara: Your CNIC 42101-XXXXX-X is registered. Your survey is under review.", "9171", "safe", "en"),
    _h("Sahara: Application rejected: CNIC expired. Renew at NADRA and reapply. Appeal within 30 days: helpline 0800-00000 (MOCK).", "9171", "safe", "en"),
    _h("Sahara: Policy updated to v2.0 effective 2026-12-01. New amount Rs 14,500. Details at tehsil office.", "9171", "safe", "en"),
    _h("Sahara: Your claim was received on 12-11-2026. There is no fee. Check status at https://sahara.gov.test/status", "9171", "safe", "en"),
    _h("Sahara: Please upload a clearer photo of your death certificate in the app. Staff will never ask for your PIN.", "9171", "safe", "en"),
    _h("Sahara: Payment of Rs 14,500 sent to your registered account. Receipt no 8841. Keep your PIN secret.", "9171", "safe", "en"),
    _h("Sahara: Your appeal was received. A person will review it within 3 working days.", "9171", "safe", "en"),
    _h("Hi, did you pick up the kids from school? I am stuck at work till 6.", "03331112", "safe", "en"),
    _h("Your Daraz order #5521 for Rs 2,300 will be delivered tomorrow. Pay cash to the rider.", "Daraz", "safe", "en"),
    _h("Reminder: electricity bill Rs 4,820 due on 14-11-2026. Pay at any bank.", "KE", "safe", "en"),
    _h("Mum says come early on Friday, the whole family is coming. Bring Rs 500 change please.", "Mum", "safe", "en"),
    _h("Salam, aaj ka match 7 baje hai. Pizza ka order de dun? Rs 1500 ka ho jaye ga.", "03004445", "safe", "ru"),
    _h("Sahara: Aapki application manzoor ho gayi hai. Rs 13,500 agle hafte milenge. Kisi ko PIN na batayen.", "9171", "safe", "ru"),
    _h("Sahara: Aap ke documents mil gaye hain. Koi fees nahi. Status app mein dekhen.", "9171", "safe", "ru"),
    _h("Sahara: Ek aur saaf tasveer chahiye. App mein upload karein, yeh muft hai.", "9171", "safe", "ru"),
    _h("Bhai Rs 5000 bhej diye hain, easypaisa mein check kar lo.", "03337778", "safe", "ru"),
    _h("Kal subah dukaan par aa jana, hisaab kitaab karna hai.", "03225556", "safe", "ru"),
    _h("سہارا: آپ کی درخواست منظور ہو گئی ہے۔ تیرہ ہزار پانچ سو روپے اگلے ہفتے ملیں گے۔ پن کسی کو نہ بتائیں۔", "9171", "safe", "ur"),
    _h("سہارا: آپ کے کاغذات مل گئے ہیں۔ کوئی فیس نہیں۔", "9171", "safe", "ur"),
    _h("آج رات کھانے پر آ جائیں، امی نے بریانی بنائی ہے۔", "03001239", "safe", "ur"),
    _h("بچوں کی اسکول فیس پانچ تاریخ تک جمع کروانی ہے۔", "School", "safe", "ur"),
    # suspicious (unknown sender / unknown link, no direct ask)
    _h("Relief update available, see details at http://pk-help.info/news", "03441112", "suspicious", "en"),
    _h("I can help you get your relief payment faster, call me on 0300-1234567.", "", "suspicious", "en"),
    _h("Forwarded as received: relief camp tomorrow at Sukkur, tell everyone.", "03121110", "suspicious", "en"),
    _h("Aap ke relief ke liye naya form aya hai, yahan dekhen http://form-pk.info", "03441119", "suspicious", "ru"),
    _h("Imdad ke bare mein maloomat chahiye to is number par call kar lein 0301 9998887.", "", "suspicious", "ru"),
    _h("امدادی پیکج کی نئی تفصیل یہاں دیکھیں http://help-pk.info", "03450000", "suspicious", "ur"),
    # harder cases (no obvious keywords, or genuine messages that look scary)
    _h("Your OTP is 482913. Do not share it with anyone. Valid for 5 minutes.", "Bank", "safe", "en"),
    _h("Dear customer your loan instalment of Rs 25,000 is due on 5th. Pay at your branch to avoid late charges.", "MCB", "safe", "en"),
    _h("URGENT: road closed due to flood near Sukkur bridge, take the other route.", "03331119", "safe", "en"),
    _h("Sahara: Your payment is on hold because your CNIC expired. Renew it and your payment will resume. No fee.", "9171", "safe", "en"),
    _h("Brother I am in hospital, my wallet was stolen. Please send Rs 5000 on easypaisa to 0333-1234567 urgently.", "03450001", "scam", "en"),
    _h("Salam sir, I am calling from the relief office. Your file is incomplete, send me your ID card picture on WhatsApp.", "", "scam", "en"),
    _h("Aap ka payment tayyar hai, bas apni ek tasveer aur card ke peeche wala number bhej dein.", "03112220", "scam", "ru"),
    _h("Hello, you got a notice. See https://sahara.gov.test/notice for the details.", "9171", "safe", "en"),
]
