// build_seed.mjs : writes db/seed/seed.sql (plain SQL, deterministic, safe to run twice).
//   node db/seed/build_seed.mjs
// Everything here is SYNTHETIC. CNICs use the 9xxxxxx / 99xxxxx serial style so they are easy to spot.
// Same input -> same seed.sql (fixed random seed, ids made from md5 of a label).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const reasons = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "shared", "reasons.json"), "utf8"));

// ---------------------------------------------------------------- tiny helpers
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const uid = (label) => {
  const h = md5("sahara:" + label);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
let _seed = 26;
const rnd = () => { // mulberry32
  _seed |= 0; _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const q = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const J = (o) => (o === null || o === undefined ? "NULL" : q(JSON.stringify(o)) + "::jsonb");
const A = (a) => "array[" + a.map(q).join(",") + "]::text[]";
const T = (iso) => (iso ? q(iso) + "::timestamptz" : "NULL");
const D = (iso) => (iso ? q(iso) + "::date" : "NULL");

const out = [];
const emit = (s) => out.push(s);
function insert(table, cols, rows, chunk = 100) {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk).map((r) => "(" + r.join(",") + ")").join(",\n  ");
    emit(`insert into ${table} (${cols.join(",")}) values\n  ${part}\non conflict do nothing;`);
  }
}

// ---------------------------------------------------------------- fixed ids and constants
export const USERS = {
  zainab: "a0000000-0000-4000-8000-000000000001",
  yousuf: "a0000000-0000-4000-8000-000000000002",
  asim: "a0000000-0000-4000-8000-000000000003",
  officer1: "a0000000-0000-4000-8000-000000000004",
  officer2: "a0000000-0000-4000-8000-000000000005",
  admin: "a0000000-0000-4000-8000-000000000006",
};
const RS1 = uid("ruleset:1");
const RS2 = uid("ruleset:2");
const OFFICE = "KHI-EAST";
const QUARTER = "2026-Q4";
const TODAY = "2026-11-20";
const P1 = { cutoff: 30, band: 5, amount: 13500 };
const COSTS = { wrong_approve: 100, wrong_reject: 20, review: 3, proof: 1 };
const exp = (code) => reasons.decision[code];
const explain = (code) => ({ en: exp(code).en, ur: exp(code).ur });

// ---------------------------------------------------------------- 1. the 30 messy records (28 from note 06 + 2 extras)
// [n, roman, urdu, rel, relName, late, cnic, dobRaw, dobIso, dobPrec, gender, district, districtCnic, expiry, wallet, hh, deceased, source]
const R = [
  [1, "Zainab Bibi", "زینب بی بی", "W/O", "Ghulam Mustafa Chandio", true, "41301-9000011-2", "1978-06-15", "1978-06-15", "day", "F", "Larkana", "Larkana", "2029-12-31", "Zainab Bibi", "H1", false, "application"],
  [2, "Zaynab Bibi", "زینب بیبی", "W/O", "Ghulam Mustafa Chandyo", true, "41301-9000011-2", "05/12/1978", null, "year", "F", "Larkana", "Larkana", "2029-12-31", "Zainab Bibi", "H1", false, "survey"],
  [3, "Zeinab Bibi", "زینب بی بی", "W/O", "Ghulam Mustafa", true, "41301-9000011-2", null, null, "missing", "F", "Larkana", "Larkana", "2029-12-31", "Zeinab", "H1", false, "wallet"],
  [4, "Zainab Khatoon", "زینب خاتون", "D/O", "Abdul Karim", false, "41301-9000012-4", "1991-03-04", "1991-03-04", "day", "F", "Larkana", "Larkana", "2027-12-31", "Zainab Khatoon", "H4", false, "application"],
  [5, "Muhammad Aslam", "محمد اسلم", "S/O", "Nazeer Ahmed", false, "42101-9000021-1", "1985", "1985-01-01", "year", "M", "Karachi East", "Karachi East", "2030-12-31", "Muhammad Aslam", "H5", false, "application"],
  [6, "Mohammad Aslam", "محمد اسلم", "S/O", "Nazir Ahmad", false, "42101-9000021-1", "1985", "1985-01-01", "year", "M", "Karachi East", "Karachi East", "2030-12-31", "Mohammad Aslam", "H5", false, "survey"],
  [7, "Mohd Aslam", "محمد اسلم", "S/O", "Nazeer Ahmad", false, "42201-9000022-1", "01-01-1985", "1985-01-01", "year", "M", "Karachi West", "Karachi West", "2030-12-31", "Mohd Aslam", "H7", false, "application"],
  [8, "Rukhsana Begum", "رخسانہ بیگم", "W/O", "Imtiaz Hussain", false, "42201-9000031-6", "1982", "1982-01-01", "year", "F", "Karachi Central", "Karachi Central", "2024-06-30", "Rukhsana Begum", "H8", false, "application"],
  [9, "Rukhsana Begum", "رخسانہ بیگم", "W/O", "Imtiaz Hussain", false, "42201-9000031-5", "1982", "1982-01-01", "year", "F", "Karachi Central", "Karachi Central", "2031-12-31", "Rukhsana Begum", "H8", false, "survey"],
  [10, "Sakina Bano", "سکینہ بانو", "D/O", "Dost Muhammad", false, "43101-9000041-8", "2001-07-19", "2001-07-19", "day", "F", "Hyderabad", "Hyderabad", "2028-12-31", "Sakina Bano", "H10", false, "application"],
  [11, "Ali Raza Syed", "علی رضا سید", "S/O", "Syed Kazim Hussain", false, "35202-9000051-3", "1979", "1979-01-01", "year", "M", "Lahore", "Lahore", "2029-12-31", "Ali Raza", "H11", false, "application"],
  [12, "Sayyid Ali Raza", "سید علی رضا", "S/O", "Kazim Husain", false, "35202-9000051-3", "1979", "1979-01-01", "year", "M", "Lahore", "Lahore", "2029-12-31", "Syed Ali Raza", "H11", false, "survey"],
  [13, "Gul Bibi", "گل بی بی", "W/O", "Noor Zaman", true, "15201-9000061-4", "1969", "1969-01-01", "year", "F", "Peshawar", "Peshawar", "2027-12-31", "Gul Bibi", "H13", false, "application"],
  [14, "Gul Bibi", "گل بی بی", "W/O", "Noor Zaman", false, "15201-9000062-2", "1970", "1970-01-01", "year", "F", "Peshawar", "Peshawar", "2027-12-31", "Gul Bibi", "H14", false, "application"],
  [15, "Bakht Jamal", "بخت جمال", "S/O", "Abdul Wahid", false, "54401-9000071-5", "1966", "1966-01-01", "year", "M", "Quetta", "Quetta", "2026-09-30", "Bakht Jamal", "H15", false, "application"],
  [16, "Hajra Bibi", "ہاجرہ بی بی", "W/O", "Bakht Jamal", true, "54401-9000072-6", "1972", "1972-01-01", "year", "F", "Quetta", "Quetta", "2029-12-31", "Hajra Bibi", "H15", false, "application"],
  [17, "Nasreen Akhtar", "نسرین اختر", "D/O", "Akhtar Ali", false, "36302-9000081-0", "1988", "1988-01-01", "year", "F", "Bahawalpur", "Bahawalpur", "2030-12-31", "Zahid Akhtar", "H17", false, "application"],
  [18, "Nasreen Akhtar", "نسرین اختر", null, null, false, null, null, null, "missing", "F", null, null, null, "Nasreen Akhtar", null, false, "wallet"],
  [19, "Imran Malik", "عمران ملک", "S/O", "Fazal Karim", false, "61101-9000091-7", "1990", "1990-01-01", "year", "M", "Islamabad", "Islamabad", "2029-12-31", "Imran Malik", "H19", false, "application"],
  [20, "Parveen Naz", "پروین ناز", "W/O", "Shahid Mehmood", false, "34101-9000101-8", "1983", "1983-01-01", "year", "F", "Faisalabad", "Gujranwala", "2028-12-31", "Parveen Naz", "H20", false, "application"],
  [21, "Raheela Mallah", "راحیلہ ملاح", "D/O", "Ismail Mallah", false, "45501-9000111-4", "1995", "1995-01-01", "year", "F", "Thatta", "Thatta", "2029-12-31", "Raheela Mallah", "H21", false, "application"],
  [22, "Khair Bibi", "خیر بی بی", "W/O", "Ali Nawaz Soomro", false, "45201-9000121-2", null, null, "missing", "F", "Dadu", "Dadu", null, "Khair Bibi", "H22", false, "application"],
  [23, "Muhammad Yousuf", "محمد یوسف", "S/O", "Muhammad Ismail", false, "42301-9000131-3", "1975", "1975-01-01", "year", "M", "Karachi South", "Karachi South", "2029-12-31", "Muhammad Yousuf", "H23", false, "application"],
  [24, "Mohammed Yousaf", "محمد یوسف", "S/O", "Mohd Ismail", false, "42301-9000131-3", "1975", "1975-01-01", "year", "M", "Karachi South", "Karachi South", "2029-12-31", "Mohammed Yousaf", "H23", false, "survey"],
  [25, "Shazia Kanwal", "شازیہ کنول", "W/O", "Ahmed Nawaz", false, "37405-9000141-2", "1987", "1987-01-01", "year", "F", "Rawalpindi", "Rawalpindi", "2030-12-31", "Shazia Kanwal", "H25", false, "application"],
  [26, "Shazia Kanwal", "شازیہ کنول", "W/O", "Ahmed Nawaz", false, "37405-9000142-6", "1987", "1987-01-01", "year", "F", "Rawalpindi", "Rawalpindi", "2030-12-31", "Shazia Kanwal", "H25", false, "application"],
  [27, "Anwar Ali", "انور علی", "S/O", "Gul Hassan", false, "43203-9000151-9", "1950", "1950-01-01", "year", "M", "Jamshoro", "Jamshoro", "2022-03-31", "Anwar Ali", "H27", false, "application"],
  [28, null, "مہر النساء", "D/O", "Abdul Rehman", false, "13101-9000161-8", "1999", "1999-01-01", "year", "F", "Mardan", "Mardan", "2029-12-31", "Mehr-un-Nisa", "H28", false, "application"],
  [29, "Ghulam Mustafa Chandio", "غلام مصطفیٰ چانڈیو", "S/O", "Allah Bachayo Chandio", false, "41301-9000010-1", "1974-02-11", "1974-02-11", "day", "M", "Larkana", "Larkana", "2029-12-31", "Ghulam Mustafa", "H1", true, "nadra_extract"],
  [30, "Allah Bachayo Soomro", "اللہ بچایو سومرو", "S/O", "Khuda Bux Soomro", false, "45201-9000171-9", "1960", "1960-01-01", "year", "M", "Dadu", "Dadu", "2028-12-31", "Allah Bachayo", "H30", true, "application"],
];
const noDash = (c) => (c ? c.replace(/-/g, "") : null);
// ---- government registry (mock NADRA): every column filled, realistic. Day, month and year of birth always present
// (the application forms may only know the year; the registry does not). Deterministic from the ID number.
const hashN = (str) => { let h = 7; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h; };
const DOB_FIX = { "4130190000112": "1978-06-15" };   // Zainab Bibi, the main demo person
const realDob = (cnicD, iso) => {
  if (DOB_FIX[cnicD]) return DOB_FIX[cnicD];
  if (iso && !String(iso).endsWith("-01-01")) return iso;                       // an exact day already
  const h = hashN(cnicD), y = iso ? String(iso).slice(0, 4) : String(1962 + (h % 38));
  return `${y}-${String(1 + (h % 12)).padStart(2, "0")}-${String(1 + (h % 28)).padStart(2, "0")}`;
};
const realExpiry = (cnicD, iso) => iso || `${2030 + (hashN(cnicD) % 3)}-${String(1 + (hashN(cnicD) % 12)).padStart(2, "0")}-28`;
// households: key -> [district, members, pmt, flags]
const HH = {
  H1: ["Larkana", 4, 22, {}], H4: ["Larkana", 5, 41, { high_phone_bill: true }], H5: ["Karachi East", 6, 33, {}],
  H7: ["Karachi West", 3, 36, { tax_filer: true }], H8: ["Karachi Central", 5, 20, {}], H10: ["Hyderabad", 7, 18, {}],
  H11: ["Lahore", 4, 17, { gov_employee: true }], H13: ["Peshawar", 3, 19, {}], H14: ["Peshawar", 4, null, {}],
  H15: ["Quetta", 5, 27, {}], H17: ["Bahawalpur", 4, 26, {}], H19: ["Islamabad", 3, 29, { owns_vehicle: true }],
  H20: ["Gujranwala", 6, 21, {}], H21: ["Thatta", 8, 14, {}], H22: ["Dadu", 5, null, {}],
  H23: ["Karachi South", 4, 38, { foreign_trips: true }], H25: ["Rawalpindi", 4, 23, {}], H27: ["Jamshoro", 2, 12, {}],
  H28: ["Mardan", 5, 28, {}], H30: ["Dadu", 3, 19, {}],
};
const FLAGS0 = { gov_employee: false, owns_vehicle: false, tax_filer: false, foreign_trips: false, high_phone_bill: false };
const hhId = (k) => uid("hh:" + k);
const personId = (n) => uid("person:" + n);

// ================================================================= build
emit("-- seed.sql : GENERATED by db/seed/build_seed.mjs. Do not edit by hand; edit the script and re-run it.");
emit("-- Everything is SYNTHETIC (CNIC serials 9xxxxxx / 99xxxxx). Safe to run more than once.");
emit("begin;");
emit("set local search_path = public, extensions;");
emit("select set_config('app.actor_type','job',true), set_config('app.actor_name','seed',true);");

const households = [];   // [id, district, members, pmt, flags, survey_date]
const people = [];
const peopleCols = ["id", "user_id", "name_roman", "name_ur", "cnic", "cnic_expiry", "dob_raw", "dob_iso", "dob_precision",
  "father_or_husband", "relation_type", "relation_late", "gender", "district", "district_cnic", "deceased", "household_id",
  "phone_mock", "wallet_name", "bank_name", "source", "record_no", "synthetic"];
const profiles = [];
const roles = [];
const loginUsers = [];   // [user_id, email, secret]
const nadra = new Map();   // cnic -> row
const nser = [];
const accounts = new Map();
const consents = [];
const consentWithdraw = [];

function addHousehold(key, district, members, pmt, flags, survey = "2025-09-15") {
  households.push([q(hhId(key)), q(district), members, pmt === null ? "NULL" : pmt, J({ ...FLAGS0, ...flags }), D(survey)]);
  if (pmt !== null) nser.push([q(hhId(key)), pmt, members, J({ ...FLAGS0, ...flags }), D(survey), q(district)]);
}
for (const [k, v] of Object.entries(HH)) addHousehold(k, v[0], v[1], v[2], v[3], k === "H14" ? "2024-02-01" : "2025-09-15");

const phone = (n) => `03${String(10 + (n % 40)).padStart(2, "0")}-0000${String(n).padStart(3, "0")}`;
const BANKS = ["Easypaisa", "JazzCash", "HBL Konnect", "Meezan"];

// users with a real login
const LOGIN_PERSON = { 1: USERS.zainab, 5: USERS.asim, 23: USERS.yousuf };
// shadow users: people who need an owner id but have no login of their own (they act through a helper, or are seed data)
const shadow = (key) => uid("user:" + key);

const personOwner = {}; // n -> user id
for (const r of R) {
  const [n, roman, ur, rel, relName, late, cnic, dobRaw, dobIso, dobPrec, gender, district, dcnic, expiry, wallet, hh, dec, source] = r;
  const cnicD = noDash(cnic);
  const user = LOGIN_PERSON[n] || null;
  personOwner[n] = user;
  people.push([q(personId(n)), q(user), q(roman), q(ur), q(cnicD), D(expiry), q(dobRaw), D(dobIso), q(dobPrec), q(relName), q(rel),
    late, q(gender), q(district), q(dcnic), dec, hh ? q(hhId(hh)) : "NULL", q(phone(n)), q(wallet), q(BANKS[n % 4]), q(source), n, "true"]);
}
// NADRA mock: one row per distinct CNIC, filled from the cleanest record of that CNIC (first one seen)
function nadraStatus(r) {
  const [n, , , , , , , , , , , , , expiry, , , dec] = r;
  if (dec) return "deceased";
  if (n === 25) return "superseded";
  if (expiry && expiry < TODAY) return "expired";
  return "valid";
}
for (const r of R) {
  const cnicD = noDash(r[6]);
  if (!cnicD || r[0] === 9 || nadra.has(cnicD)) continue;   // #9 has a wrong last digit: NADRA has never heard of it
  nadra.set(cnicD, [q(cnicD), q(r[1] || "Mehr-un-Nisa"), q(r[2]), q(r[4]), D(realDob(cnicD, r[8] || (r[7] && r[7].length === 10 ? r[7] : null))), q(r[10]), q(r[12]),
    D(realExpiry(cnicD, r[13])), q(nadraStatus(r)), q(phone(r[0]))]);
}

// ---- the 7 test users
const TEST = [
  ["zainab", USERS.zainab, "zainab@citizens.sahara.test", "246810", "citizen", "Zainab Bibi", "ur", OFFICE, personId(1)],
  ["yousuf", USERS.yousuf, "yousuf@helpers.sahara.test", "246810", "helper", "Muhammad Yousuf", "ur", OFFICE, personId(23)],
  ["asim", USERS.asim, "asim@citizens.sahara.test", "246810", "citizen", "Muhammad Aslam", "ur", OFFICE, personId(5)],
  ["officer1", USERS.officer1, "admin1@gov.sahara.test", "Admin#2026", "admin", "Reviewer One (KHI-EAST)", "en", OFFICE, null],
  ["officer2", USERS.officer2, "admin2@gov.sahara.test", "Admin#2026", "admin", "Reviewer Two (KHI-EAST)", "en", OFFICE, null],
  ["admin", USERS.admin, "admin@gov.sahara.test", "Admin#2026", "admin", "Programme Admin", "en", OFFICE, null],
];

// shadow profile helper
const profileSeen = new Set();
function addProfile(user, name, lang, office, person, role) {
  if (profileSeen.has(user)) return;
  profileSeen.add(user);
  profiles.push([q(user), q(name), q(lang), q(office), person ? q(person) : "NULL"]);
  roles.push([q(user), q(role)]);
}
for (const t of TEST) { addProfile(t[1], t[5], t[6], t[7], t[8], t[4]); loginUsers.push([t[1], t[2], t[3]]); }

// persons from the 30 records who act (have a case or a consent): they get a shadow login id
const SHADOW_PEOPLE = [4, 7, 8, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 25, 27, 28, 30];
for (const n of SHADOW_PEOPLE) {
  const r = R.find((x) => x[0] === n);
  personOwner[n] = shadow("p" + n);
}
// patch their people rows with the shadow user id
for (const row of people) {
  const n = row[row.length - 2];
  if (SHADOW_PEOPLE.includes(n)) row[1] = q(personOwner[n]);
}

// ---- person links (possible duplicates)
const links = [
  [1, 2, "SAME", 0.94, [{ field: "cnic", agree: "yes" }, { field: "name", a: "Zainab Bibi", b: "Zaynab Bibi", agree: "close" }, { field: "husband", a: "Ghulam Mustafa Chandio", b: "Ghulam Mustafa Chandyo", agree: "close" }]],
  [1, 3, "SAME", 0.88, [{ field: "cnic", agree: "yes" }, { field: "name", a: "Zainab Bibi", b: "Zeinab Bibi", agree: "close" }, { field: "dob", agree: "missing" }]],
  [1, 4, "DIFFERENT", 0.31, [{ field: "cnic", agree: "no" }, { field: "name", a: "Zainab Bibi", b: "Zainab Khatoon", agree: "close" }, { field: "father_or_husband", agree: "no" }, { field: "dob", agree: "no" }], "false-merge trap"],
  [5, 6, "SAME", 0.96, [{ field: "cnic", agree: "yes" }, { field: "name", a: "Muhammad Aslam", b: "Mohammad Aslam", agree: "close" }, { field: "father", a: "Nazeer Ahmed", b: "Nazir Ahmad", agree: "close" }]],
  [5, 7, "DIFFERENT", 0.35, [{ field: "cnic", agree: "no" }, { field: "district", a: "Karachi East", b: "Karachi West", agree: "no" }, { field: "name", agree: "close" }]],
  [8, 9, "MAYBE", 0.81, [{ field: "cnic", a: "...316", b: "...315", agree: "close" }, { field: "name", agree: "yes" }, { field: "husband", agree: "yes" }]],
  [11, 12, "SAME", 0.95, [{ field: "cnic", agree: "yes" }, { field: "name", a: "Ali Raza Syed", b: "Sayyid Ali Raza", agree: "close" }]],
  [13, 14, "MAYBE", 0.66, [{ field: "cnic", agree: "no" }, { field: "name", agree: "yes" }, { field: "husband", agree: "yes" }, { field: "dob", a: "1969", b: "1970", agree: "close" }]],
  [17, 18, "MAYBE", 0.5, [{ field: "name", agree: "yes" }, { field: "cnic", agree: "missing" }]],
  [23, 24, "SAME", 0.97, [{ field: "cnic", agree: "yes" }, { field: "name", a: "Muhammad Yousuf", b: "Mohammed Yousaf", agree: "close" }]],
  [25, 26, "MAYBE", 0.9, [{ field: "name", agree: "yes" }, { field: "husband", agree: "yes" }, { field: "cnic", a: "...412", b: "...426", agree: "no" }]],
];

// ================================================================= 2. the 40 helper families (Zainab + 39 generated)
const FEM = [["Fatima", "فاطمہ"], ["Ayesha", "عائشہ"], ["Khadija", "خدیجہ"], ["Bushra", "بشریٰ"], ["Naseem", "نسیم"], ["Shabana", "شبانہ"], ["Rubina", "روبینہ"], ["Samina", "ثمینہ"], ["Nargis", "نرگس"], ["Farzana", "فرزانہ"], ["Shamim", "شمیم"], ["Haleema", "حلیمہ"], ["Sughra", "صغریٰ"], ["Zubaida", "زبیدہ"], ["Mumtaz", "ممتاز"], ["Rehana", "ریحانہ"], ["Kalsoom", "کلثوم"], ["Mehnaz", "مہناز"]];
const TITLE = [["Bibi", "بی بی"], ["Begum", "بیگم"], ["Bano", "بانو"], ["Khatoon", "خاتون"]];
const SUR = [["Memon", "میمن"], ["Soomro", "سومرو"], ["Chandio", "چانڈیو"], ["Shaikh", "شیخ"], ["Mallah", "ملاح"], ["Ansari", "انصاری"], ["Siddiqui", "صدیقی"], ["Qureshi", "قریشی"], ["Baloch", "بلوچ"], ["Khan", "خان"]];
const MALE = ["Abdul Rehman", "Ghulam Hussain", "Muhammad Ismail", "Allah Ditta", "Noor Muhammad", "Ali Ahmed", "Abdul Karim", "Dost Muhammad", "Imtiaz Hussain", "Shahid Mehmood"];
const DISTRICTS = ["Karachi East", "Karachi West", "Karachi Central", "Karachi South", "Hyderabad", "Thatta", "Larkana", "Lahore"];
let cnicCounter = 0;
function genCnic(province, gender) {
  cnicCounter++;
  const loc = String(province) + String(ri(100, 499));
  const mid = "99" + String(10000 + cnicCounter * 7 + ri(0, 6)).slice(-5);
  const last = gender === "F" ? pick([0, 2, 4, 6, 8]) : pick([1, 3, 5, 7, 9]);
  return `${loc.padEnd(5, "0").slice(0, 5)}${mid}${last}`;
}
function genDob() {
  const y = ri(1958, 1998), m = ri(1, 12), d = ri(1, 28);
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const kind = ri(0, 9);
  if (kind <= 5) return [iso, iso, "day"];
  if (kind === 6) return [`${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`, iso, "day"];
  if (kind === 7) return [`${d}/${m}/${String(y).slice(2)}`, iso, "day"];
  if (kind === 8) return [String(y), `${y}-01-01`, "year"];
  return [`01-01-${y}`, `${y}-01-01`, "year"];
}

const helperAssign = [[q(uid("assign:1")), q(USERS.yousuf), q(personId(1))]];
const families = [{ n: 1, personId: personId(1), user: USERS.zainab, hh: hhId("H1"), name: "Zainab Bibi", cnic: "4130190000112", helperConsent: true }];
const SHARED_SUR = [SUR[1], SUR[2], SUR[3]];   // some families share a surname and a father's name on purpose
let sharedFather = "Muhammad Ismail";
const famAccounts = {};
for (let i = 1; i <= 39; i++) {
  const [fn, fnu] = pick(FEM);
  const [tt, ttu] = pick(TITLE);
  const [sn, snu] = i % 4 === 0 ? pick(SHARED_SUR) : pick(SUR);
  const father = i % 4 === 0 ? sharedFather : pick(MALE);
  const rel = pick(["W/O", "W/O", "D/O"]);   // (flipped to D/O below: the registry records daughters of, never husbands)
  const nameRoman = `${fn} ${tt}`, nameUr = `${fnu} ${ttu}`;
  const fullRoman = i % 3 === 0 ? `${fn} ${sn}` : nameRoman;      // a few carry a surname, most do not (messy)
  const fullUr = i % 3 === 0 ? `${fnu} ${snu}` : nameUr;
  const cnic = genCnic(4, "F");
  const [dobRaw, dobIso, dobPrec] = genDob();
  const expired = i === 7 || i === 22;
  const expiry = expired ? `2026-0${ri(1, 8)}-28` : `${ri(2027, 2033)}-12-31`;
  const pmt = [9, 19, 31].includes(i) ? null : ri(8, 46);
  const flags = i % 13 === 0 ? { owns_vehicle: true } : i % 17 === 0 ? { tax_filer: true } : i % 11 === 0 ? { high_phone_bill: true } : {};
  const hk = "F" + i;
  const pid = uid("person:fam" + i), user = shadow("fam" + i);
  addHousehold(hk, "Karachi South", ri(3, 8), pmt, flags);
  const wallet = fullRoman;
  people.push([q(pid), q(user), q(fullRoman), q(fullUr), q(cnic), D(expiry), q(dobRaw), D(dobIso), q(dobPrec), q(father), q(rel), rel === "W/O" && i % 5 === 0,
    "'F'", q("Karachi South"), q("Karachi South"), false, q(hhId(hk)), q(`0333-00${String(i).padStart(5, "0")}`), q(wallet), q(BANKS[i % 4]), "'application'", "NULL", "true"]);
  nadra.set(cnic, [q(cnic), q(fullRoman), q(fullUr), q(father), D(realDob(cnic, dobIso)), "'F'", q("Karachi South"), D(expiry), q(expiry < TODAY ? "expired" : "valid"), q(`0333-00${String(i).padStart(5, "0")}`)]);
  addProfile(user, fullRoman, "ur", OFFICE, pid, "citizen");
  families.push({ n: i + 1, personId: pid, user, hh: hhId(hk), name: fullRoman, cnic, helperConsent: ![5, 17, 30].includes(i), pmt, flags });
}

// accounts
const YOUSUF_WALLET = "0321-9900123", SHARED_WALLET = "0345-9900777", SCAM_WALLET = "0333-9900888";
function addAccount(id, title, cnic, kind, bank, phone_, owner_user = null, changedAt = null) {
  if (!accounts.has(id)) accounts.set(id, [q(id), q(title), q(cnic), q(owner_user), q(kind), q(bank), q(phone_), D(changedAt) ]);
}
addAccount(YOUSUF_WALLET, "Muhammad Yousuf", "4230190001313", "wallet", "JazzCash", "0321-0000023", USERS.yousuf, "2026-10-02");
addAccount(SHARED_WALLET, "Bashir Ahmed (agent)", "4210199900777", "wallet", "Easypaisa", "0345-0000777");
addAccount(SCAM_WALLET, "Rafiq Traders", "4210199900888", "wallet", "JazzCash", "0333-0000888");

// ---- consents for everyone (people with a case / session)
const consentRows = [];
function addConsent(subject, type, grantee, purpose, grantedAt, withdrawn = false) {
  const id = uid(`consent:${subject}:${type}:${grantee}:${purpose}`);
  consentRows.push([q(id), q(subject), q(type), q(grantee), q(purpose), A(["*"]), q("granted"), q(subject), T(grantedAt)]);
  if (withdrawn) consentWithdraw.push(id);
  return id;
}
const consentOf = {};   // `${subject}:${grantee}` -> id
function giveConsents(subject, office, { helper = false, service = true, officeOn = true, at = "2026-10-05T09:00:00Z" } = {}) {
  if (officeOn) consentOf[subject + ":office"] = addConsent(subject, "office", office, "claim_processing", at);
  if (service) consentOf[subject + ":service"] = addConsent(subject, "service", "service", "claim_processing", at);
  if (helper) consentOf[subject + ":helper"] = addConsent(subject, "helper", USERS.yousuf, "claim_help", at);
}
giveConsents(USERS.zainab, OFFICE, { helper: false, at: "2026-10-03T08:30:00Z" });
giveConsents(USERS.asim, OFFICE, { at: "2026-10-04T10:00:00Z" });
for (const f of families.slice(1)) giveConsents(f.user, OFFICE, { helper: f.helperConsent, at: "2026-10-06T09:00:00Z" });

// ================================================================= 3. cases (live ones for 2026-Q4)
const cases = [], caseEvents = [], docs = [], docChecks = [], decisions = [], notes = [], flagsOpen = [], flagsResolve = [], payments = [];
const labelled = [];
const model = "seed-logreg-2026-11-01";
const officerIds = [USERS.officer1, USERS.officer2];

function factsOf({ gender = "F", cnicValid = true, cnicExpired = false, deceased = false, age = 40, pmt, members = 4, flags = {}, shared = false, changed = 999, helperOwned = false,
  docMissing = false, blurry = false, edited = false, minConf = 0.92, band = "SAME", score = 0.96, amount = P1.amount }) {
  return {
    person: { gender, cnic_valid: cnicValid, cnic_expired: cnicExpired, deceased, age },
    household: { pmt_score: pmt, members, flags: { ...FLAGS0, ...flags } },
    payout: { shared_with_other_households: shared, changed_within_days: changed, owner_is_helper: helperOwned },
    doc: { required_missing: docMissing, any_blurry: blurry, any_edited: edited, min_confidence: minConf },
    identity: { band, score },
    claim: { amount },
  };
}
const ageOf = (iso) => (iso ? 2026 - Number(iso.slice(0, 4)) : null);

function caseRow(o) {
  cases.push([q(o.id), q(o.owner), q(o.helper || null), q(o.person), q(o.hh), q(o.office), q(o.quarter || QUARTER), q(o.status), q(o.zone || null), q(o.result || null),
    o.amount ?? P1.amount, "NULL", "NULL", J(o.draft || {}), o.step || 0, q(o.resume || null), q(o.officer || null), o.priority || 0,
    T(o.createdAt), T(o.submittedAt || null), T(o.decidedAt || null), T(o.updatedAt || o.createdAt)]);
  caseEvents.push([q(uid("ev:" + o.id + ":created")), q(o.id), q("created"), q(o.helper || o.owner), J({ by: o.helper ? "helper" : "citizen" }), T(o.createdAt)]);
  if (o.submittedAt) caseEvents.push([q(uid("ev:" + o.id + ":submitted")), q(o.id), q("submitted"), q(o.helper || o.owner), J({}), T(o.submittedAt)]);
}
function docRow(caseId, type, verdict, signals, by, at) {
  const id = uid(`doc:${caseId}:${type}`);
  docs.push([q(id), q(caseId), q(type), q(`seed/${caseId}/${type}.png`), q(sha256(`seed-file:${caseId}:${type}`)), J(signals), q(verdict), q(by), T(at)]);
  return id;
}
function decisionRow(o) {
  const id = uid(`dec:${o.case}:${o.n || 1}`);
  decisions.push([q(id), q(o.case), T(o.at), q(o.actorType || "ai"), q(o.actorId || null), q(o.zone), q(o.result), q(o.code), o.conf === undefined ? "NULL" : o.conf,
    o.actorType === "user" ? "NULL" : 0.97, o.actorType === "user" ? "NULL" : 0.15, q(o.rs || RS1), q(o.actorType === "user" ? "officer" : model),
    J(o.checks || []), J(explain(o.code)), J(o.trace || []), J(o.next || { type: o.zone === "HUMAN" ? "human" : o.zone === "ASK_MORE" ? "proof" : "none", doc_type: null }),
    J(o.facts || null), q(o.consent || null), J(COSTS), q(o.note || null)]);
  return id;
}
const checksFor = (code, extra = []) => [
  { name: "consent", verdict: "pass", confidence: 1.0, detail: "active consent (seed)" },
  ...extra,
  { name: "rule_engine", verdict: code === "R_AUTO_APPROVED" ? "pass" : "unsure", confidence: 0.8, detail: code, ...(code === "R_AUTO_APPROVED" ? {} : { reason_code: code }) },
];
const traceFor = (rule) => [{ step: 1, what: "hard_rule", rule: "NO_CONSENT", fired: false }, { step: 2, what: "rule", rule, fired: true }];
function noteRow(caseId, decId, pkg, at) {
  notes.push([q(uid("note:" + caseId)), q(caseId), q(decId), J(pkg), T(at)]);
}

// --- Zainab: the core persona. Draft, step 3, helper Yousuf, resume code.
{
  const id = uid("case:zainab"), at = "2026-11-10T06:30:00Z";
  caseRow({ id, owner: USERS.zainab, helper: null, person: personId(1), hh: hhId("H1"), office: OFFICE, status: "draft", step: 3, resume: "482913",
    account: null, title: null, draft: { language: "ur", step_names: ["who", "family", "documents", "payment", "confirm"], family_members: 4, husband_cnic: "4130190000101" }, createdAt: at });
  docRow(id, "cnic_front", "ok", { blur_score: 0.12, is_blurry: false, qr: { found: false }, confidence: 0.91 }, USERS.yousuf, "2026-11-10T06:40:00Z");
  // note: the death certificate is still missing, on purpose
  caseEvents.push([q(uid("ev:zainab:draft")), q(id), q("draft_saved"), q(USERS.yousuf), J({ step: 3 }), T("2026-11-10T06:50:00Z")]);
}

// --- Asim: shopkeeper, borderline score, waiting for an officer
{
  const id = uid("case:asim"), at = "2026-11-12T10:00:00Z", sub = "2026-11-12T10:20:00Z";
  caseRow({ id, owner: USERS.asim, person: personId(5), hh: hhId("H5"), office: OFFICE, status: "in_review", zone: "HUMAN", result: "HUMAN_REVIEW",
    account: "0301-9900021", title: "Muhammad Aslam", step: 5, createdAt: at, submittedAt: sub, priority: 2 });
  addAccount("0301-9900021", "Muhammad Aslam", "4210190000211", "wallet", "Easypaisa", phone(5));
  docRow(id, "cnic_front", "ok", { blur_score: 0.08, is_blurry: false, confidence: 0.95 }, USERS.asim, at);
  const d = decisionRow({ case: id, at: "2026-11-12T10:21:00Z", zone: "HUMAN", result: "HUMAN_REVIEW", code: "R_PMT_BORDERLINE", conf: 0.58,
    checks: checksFor("R_PMT_BORDERLINE", [{ name: "identity_match", verdict: "unsure", confidence: 0.7, detail: "band SAME with name variants" }]),
    trace: traceFor("R1_PMT_BORDERLINE"), consent: consentOf[USERS.asim + ":service"], facts: factsOf({ gender: "M", age: 41, pmt: 33, members: 6 }) });
  noteRow(id, d, { unsure_about: "PMT 33 is within 5 points of the cutoff 30", checked: ["consent", "identity", "documents"], suggested: "Check household size and income proof, then decide." }, "2026-11-12T10:21:00Z");
}

// --- the other live cases from the messy records
// [personNo, status, zone, result, code, conf, office, extra]
const LIVE = [
  [8, "in_review", "HUMAN", "HUMAN_REVIEW", "R_CNIC_EXPIRED", 0.9, OFFICE, { cnicExpired: true, pmt: 20, age: 44 }],
  [11, "in_review", "HUMAN", "HUMAN_REVIEW", "R_EXCLUSION_HIT", 0.8, OFFICE, { pmt: 17, flags: { gov_employee: true }, gender: "M", age: 47 }],
  [13, "in_review", "HUMAN", "HUMAN_REVIEW", "R_NAME_AMBIGUOUS", 0.62, "LHR-CENTRAL", { pmt: 19, band: "MAYBE", score: 0.66, age: 57 }],
  [16, "awaiting_proof", "ASK_MORE", "ASK_PROOF", "R_DOC_MISSING", 0.7, OFFICE, { pmt: 27, docMissing: true, age: 54, cnicExpired: false }],
  [17, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PAYOUT_ACCOUNT_CHANGED", 0.66, OFFICE, { pmt: 26, changed: 6, age: 38 }],
  [19, "in_review", "HUMAN", "HUMAN_REVIEW", "R_EXCLUSION_HIT", 0.77, "ISB-CENTRAL", { pmt: 29, flags: { owns_vehicle: true }, gender: "M", age: 36 }],
  [20, "in_review", "HUMAN", "HUMAN_REVIEW", "R_LOW_CONFIDENCE", 0.52, "LHR-CENTRAL", { pmt: 21, age: 43 }],
  [21, "awaiting_proof", "ASK_MORE", "ASK_PROOF", "R_MISSING_FIELDS", 0.6, OFFICE, { pmt: 14, age: 31 }],
  [25, "in_review", "HUMAN", "HUMAN_REVIEW", "R_DUPLICATE_IDENTITY", 0.55, OFFICE, { pmt: 23, band: "MAYBE", score: 0.9, age: 39 }],
  [27, "awaiting_proof", "ASK_MORE", "ASK_PROOF", "R_DOC_BLURRY", 0.65, "KHI-WEST", { pmt: 12, blurry: true, cnicExpired: true, minConf: 0.4, gender: "M", age: 76 }],
  [28, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PMT_BORDERLINE", 0.57, OFFICE, { pmt: 28, age: 27 }],
  [10, "approved", "AUTO", "APPROVE", "R_AUTO_APPROVED", 0.985, OFFICE, { pmt: 18, age: 25 }],
  [30, "in_review", "HUMAN", "HUMAN_REVIEW", "R_DECEASED", 0.9, OFFICE, { pmt: 19, deceased: true, gender: "M", age: 66 }],
  [4, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PMT_ABOVE_CUTOFF", 0.82, OFFICE, { pmt: 41, flags: { high_phone_bill: true }, age: 35 }],
  [15, "in_review", "HUMAN", "HUMAN_REVIEW", "R_CNIC_EXPIRED", 0.9, "KHI-WEST", { pmt: 27, cnicExpired: true, gender: "M", age: 60 }],
];
LIVE.forEach(([n, status, zone, result, code, conf, office, ex], k) => {
  const r = R.find((x) => x[0] === n), owner = personOwner[n], id = uid("case:p" + n);
  const created = `2026-11-${String(5 + (k % 12)).padStart(2, "0")}T0${(k % 8) + 1}:15:00Z`;
  const sub = created.replace(":15:", ":40:");
  const wallet = `03${String(20 + n).padStart(2, "0")}-9900${String(n).padStart(3, "0")}`;
  const title = n === 17 ? "Zahid Akhtar" : r[14];
  addAccount(wallet, title, n === 17 ? "3630290000999" : noDash(r[6]), "wallet", BANKS[n % 4], phone(n), null, n === 17 ? "2026-11-14" : null);
  const prio = zone === "HUMAN" ? ri(0, 3) : 0;
  caseRow({ id, owner, person: personId(n), hh: r[15] ? hhId(r[15]) : null, office, status, zone, result, account: wallet, title, step: 5, createdAt: created,
    submittedAt: sub, decidedAt: status === "approved" ? sub : null, priority: prio });
  addConsentFor(owner, office);
  docRow(id, "cnic_front", ex.blurry ? "ask_better_photo" : "ok", { blur_score: ex.blurry ? 0.81 : 0.1, is_blurry: !!ex.blurry, confidence: ex.minConf ?? 0.9 }, owner, created);
  const facts = factsOf({ gender: r[10], cnicExpired: !!ex.cnicExpired, deceased: !!ex.deceased, age: ex.age, pmt: ex.pmt ?? null, members: HH[r[15]]?.[1] || 4, flags: ex.flags || {},
    changed: ex.changed ?? 999, docMissing: !!ex.docMissing, blurry: !!ex.blurry, minConf: ex.minConf ?? 0.92, band: ex.band || "SAME", score: ex.score ?? 0.96 });
  const d = decisionRow({ case: id, at: sub.replace(":40:", ":41:"), zone, result, code, conf, checks: checksFor(code), trace: traceFor(code), consent: consentOf[owner + ":service"], facts });
  if (zone === "HUMAN") noteRow(id, d, { unsure_about: exp(code).en, checked: ["consent", "identity", "documents", "rules"], suggested: "Please review and decide." }, sub);
  if (n === 25) flagsOpen.push([q(uid("flag:p25")), q(id), q("duplicate_identity"), q("hard"), q("Two CNICs for one person: freeze until reviewed"), q(USERS.officer1), T("2026-11-14T09:00:00Z")]);
  if (n === 17) flagsOpen.push([q(uid("flag:p17")), q(id), q("payout_account"), q("hard"), q("Wallet is in the brother's name"), q(USERS.officer1), T("2026-11-15T09:00:00Z")]);
  if (status === "approved") payments.push([q(uid("pay:" + id)), q(id), q(wallet), P1.amount, q("queued"), q("SEED-" + n), T(sub)]);
});
function addConsentFor(owner, office) {
  if (consentOf[owner + ":office"] || consentOf[owner + ":service"]) return;
  const n = SHADOW_PEOPLE.find((x) => personOwner[x] === owner);
  if (n === 22) return;      // Khair Bibi never agreed: consent missing
  giveConsents(owner, office, { at: "2026-10-08T09:00:00Z" });
}
// Khair Bibi (#22): a draft, no consent yet
{
  const n = 22, r = R.find((x) => x[0] === n), id = uid("case:p22");
  caseRow({ id, owner: personOwner[n], person: personId(n), hh: hhId("H22"), office: OFFICE, status: "draft", step: 1, resume: "130572", account: null, title: null,
    draft: { note: "helper collects missing details" }, createdAt: "2026-11-16T07:00:00Z" });
}
// Mohd Aslam (#7) just started
{
  const id = uid("case:p7");
  addConsentFor(personOwner[7], OFFICE);
  caseRow({ id, owner: personOwner[7], person: personId(7), hh: hhId("H7"), office: "KHI-WEST", status: "draft", step: 2, createdAt: "2026-11-17T07:00:00Z" });
}
// Gul Bibi (#14) near-duplicate: no case, but consent exists
addConsentFor(personOwner[14], OFFICE);

// --- helper families: 12 of the 40 have a 2026-Q4 case
const famPlan = [
  [1, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PAYOUT_HELPER_OWNED", YOUSUF_WALLET, true],
  [2, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PAYOUT_HELPER_OWNED", YOUSUF_WALLET, true],
  [3, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PAYOUT_ACCOUNT_SHARED", SHARED_WALLET, true],
  [4, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PAYOUT_ACCOUNT_SHARED", SHARED_WALLET, true],
  [6, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PAYOUT_ACCOUNT_SHARED", SHARED_WALLET, true],
  [8, "in_review", "HUMAN", "HUMAN_REVIEW", "R_PMT_BORDERLINE", null, false],
  [10, "in_review", "HUMAN", "HUMAN_REVIEW", "R_LOW_CONFIDENCE", null, false],
  [12, "submitted", null, null, null, null, false],
  [14, "awaiting_proof", "ASK_MORE", "ASK_PROOF", "R_DOC_BLURRY", null, false],
  [15, "draft", null, null, null, null, false],
  [16, "draft", null, null, null, null, false],
  [18, "approved", "AUTO", "APPROVE", "R_AUTO_APPROVED", null, false],
];
for (const [i, status, zone, result, code, acct, flagged] of famPlan) {
  const f = families[i];
  const id = uid("case:fam" + i), created = `2026-11-${String(8 + (i % 9)).padStart(2, "0")}T05:${String(10 + i).padStart(2, "0")}:00Z`;
  const sub = created.replace("T05", "T06");
  const wallet = acct || `0333-9901${String(i).padStart(3, "0")}`;
  const title = acct === YOUSUF_WALLET ? "Muhammad Yousuf" : acct === SHARED_WALLET ? "Bashir Ahmed (agent)" : f.name;
  if (!acct) addAccount(wallet, f.name, f.cnic, "wallet", BANKS[i % 4], `0333-00${String(i).padStart(5, "0")}`);
  const isDraft = status === "draft";
  caseRow({ id, owner: f.user, helper: USERS.yousuf, person: f.personId, hh: f.hh, office: OFFICE, status, zone, result, account: wallet, title,
    step: isDraft ? ri(1, 4) : 5, resume: isDraft ? String(500000 + i * 137) : null, draft: isDraft ? { family: f.name } : {}, createdAt: created,
    submittedAt: isDraft ? null : sub, decidedAt: status === "approved" ? sub : null, priority: flagged ? 3 : 0 });
  docRow(id, "cnic_front", status === "awaiting_proof" ? "ask_better_photo" : "ok", { blur_score: status === "awaiting_proof" ? 0.78 : 0.1, confidence: 0.9 }, USERS.yousuf, created);
  if (!isDraft && status !== "submitted") {
    const facts = factsOf({ age: 41, pmt: f.pmt ?? null, flags: f.flags || {}, shared: acct === SHARED_WALLET, helperOwned: acct === YOUSUF_WALLET, changed: acct ? 400 : 999, blurry: status === "awaiting_proof", minConf: status === "awaiting_proof" ? 0.45 : 0.92 });
    const d = decisionRow({ case: id, at: sub.replace(":00Z", ":30Z"), zone, result, code, conf: zone === "AUTO" ? 0.985 : 0.6, checks: checksFor(code), trace: traceFor(code), consent: consentOf[f.user + ":service"], facts });
    if (zone === "HUMAN") noteRow(id, d, { unsure_about: exp(code).en, checked: ["consent", "payout account", "identity"], suggested: "Call the family before deciding." }, sub);
    if (status === "approved") payments.push([q(uid("pay:" + id)), q(id), q(wallet), P1.amount, q("queued"), q("SEED-F" + i), T(sub)]);
  }
  if (flagged) flagsOpen.push([q(uid("flag:fam" + i)), q(id), q("payout_account"), q("hard"), q(code === "R_PAYOUT_HELPER_OWNED" ? "Payout account belongs to the helper" : "Payout account shared by several families"), q(USERS.officer1), T(sub)]);
}

// ================================================================= 4. 120 historical cases
// category plan: 40 eligible, 35 ineligible, 20 borderline, 15 bad_data, 10 scam
const plan = [];
for (let i = 0; i < 40; i++) plan.push("clearly_eligible");
for (let i = 0; i < 35; i++) plan.push("clearly_ineligible");
for (let i = 0; i < 20; i++) plan.push("borderline");
for (let i = 0; i < 15; i++) plan.push("bad_data");
for (let i = 0; i < 10; i++) plan.push("scam");
// shuffle deterministically
for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
const OFFICES = [OFFICE, OFFICE, OFFICE, OFFICE, OFFICE, OFFICE, "KHI-WEST", "LHR-CENTRAL"];
const QS = ["2026-Q1", "2026-Q2", "2026-Q3"];
const QSTART = { "2026-Q1": "2026-01-10", "2026-Q2": "2026-04-10", "2026-Q3": "2026-07-10" };
const BAD_KINDS = ["expired", "expired", "expired", "expired", "pmt_missing", "pmt_missing", "pmt_missing", "invalid_cnic", "invalid_cnic", "ambiguous", "ambiguous", "ambiguous", "deceased", "missing_fields", "missing_fields"];
const SCAM_KINDS = ["shared", "shared", "shared", "shared", "helper", "helper", "helper", "scamflag", "scamflag", "scamflag"];
let badIdx = 0, scamIdx = 0;
const hist = []; const dqRows = [];

plan.forEach((cat, i) => {
  const k = i + 1, pid = uid("person:h" + k), user = shadow("h" + k), hk = "HH" + k, caseId = uid("case:h" + k);
  const office = OFFICES[i % 8], quarter = QS[i % 3];
  const male = rnd() < 0.35, gender = male ? "M" : "F";
  const [fn, fnu] = male ? pick([["Imran", "عمران"], ["Kamran", "کامران"], ["Waseem", "وسیم"], ["Tariq", "طارق"], ["Saleem", "سلیم"]]) : pick(FEM);
  const [sn, snu] = pick(SUR);
  const nameRoman = male ? `${fn} ${sn}` : `${fn} ${pick(TITLE)[0]}`, nameUr = male ? `${fnu} ${snu}` : `${fnu} ${pick(TITLE)[1]}`;
  const district = office === "LHR-CENTRAL" ? "Lahore" : office === "KHI-WEST" ? "Karachi West" : pick(["Karachi East", "Karachi East", "Karachi Central", "Hyderabad"]);
  const prov = office === "LHR-CENTRAL" ? 3 : 4;
  const cnic = genCnic(prov, gender);
  const [dobRaw, dobIso, dobPrec] = genDob();
  const age = 2026 - Number(dobIso.slice(0, 4));
  let pmt, flags = {}, expiry = `${ri(2027, 2033)}-12-31`, facts, truth, outcome, status, zone, result, code, conf, officerRes = null;
  let shared = false, helperOwned = false, changed = 999, cnicValid = true, cnicExpired = false, deceased = false, band = "SAME", score = ri(93, 99) / 100, docMissing = false, minConf = ri(86, 98) / 100;
  let resolveFlag = null, openFlag = null, payAccount = null, withdraw = false, cnicStored = cnic, genderStored = gender;
  let dq = null;
  const base = () => ({ gender, cnicValid, cnicExpired, deceased, age, pmt, members: ri(3, 8), flags, shared, changed, helperOwned, docMissing, minConf, band, score });

  if (cat === "clearly_eligible") {
    pmt = ri(8, 22);
    truth = "eligible"; outcome = "paid"; status = "paid"; zone = "AUTO"; result = "APPROVE"; code = "R_AUTO_APPROVED"; conf = ri(970, 995) / 1000;
  } else if (cat === "clearly_ineligible") {
    if (i % 2 === 0) { pmt = ri(46, 80); } else {
      pmt = ri(10, 24); const fl = pick(["gov_employee", "owns_vehicle", "tax_filer", "foreign_trips", "high_phone_bill"]); flags = { [fl]: true };
    }
    truth = "ineligible"; outcome = "rejected"; status = rnd() < 0.5 ? "rejected" : "closed"; zone = "HUMAN"; result = "HUMAN_REVIEW";
    code = Object.keys(flags).length ? "R_EXCLUSION_HIT" : "R_PMT_ABOVE_CUTOFF"; conf = ri(8, 24) / 100; officerRes = "REJECT";
  } else if (cat === "borderline") {
    pmt = ri(26, 34);
    truth = pmt <= 30 ? "eligible" : "ineligible";
    zone = "HUMAN"; result = "HUMAN_REVIEW"; code = "R_PMT_BORDERLINE"; conf = ri(42, 72) / 100;
    officerRes = truth === "eligible" ? "APPROVE" : "REJECT";
    outcome = truth === "eligible" ? "paid" : "rejected"; status = truth === "eligible" ? "paid" : "rejected";
  } else if (cat === "bad_data") {
    const kind = BAD_KINDS[badIdx++ % BAD_KINDS.length];
    pmt = ri(12, 28); zone = "HUMAN"; result = "HUMAN_REVIEW"; conf = ri(35, 65) / 100;
    if (kind === "expired") { cnicExpired = true; expiry = `2025-0${ri(1, 9)}-15`; code = "R_CNIC_EXPIRED"; dq = ["people", "CNIC expired", "R_CNIC_EXPIRED"]; }
    else if (kind === "pmt_missing") { pmt = null; code = "R_PMT_MISSING"; dq = ["households", "no survey score", "R_PMT_MISSING"]; }
    else if (kind === "invalid_cnic") {
      cnicValid = false; code = "R_CNIC_INVALID"; zone = "ASK_MORE"; result = "ASK_PROOF"; dq = ["people", "CNIC last digit does not match gender", "R_CNIC_INVALID"];
      cnicStored = cnic.slice(0, 12) + (gender === "F" ? "7" : "2"); // wrong parity on purpose
    }
    else if (kind === "ambiguous") { band = "MAYBE"; score = ri(55, 72) / 100; code = "R_NAME_AMBIGUOUS"; }
    else if (kind === "deceased") { deceased = true; code = "R_DECEASED"; dq = ["people", "marked deceased", "R_DECEASED"]; }
    else { docMissing = true; code = "R_MISSING_FIELDS"; minConf = 0.5; dq = ["people", "address and date of birth missing", "R_MISSING_FIELDS"]; }
    const fixable = ["expired", "pmt_missing", "ambiguous", "missing_fields", "invalid_cnic"].includes(kind) && badIdx % 2 === 1;
    truth = (kind === "deceased") ? "ineligible" : (fixable || badIdx % 3 === 0) ? "eligible" : "ineligible";
    officerRes = truth === "eligible" ? "APPROVE" : "REJECT";
    outcome = truth === "eligible" ? "paid" : "rejected"; status = truth === "eligible" ? "paid" : "rejected";
    if (zone === "ASK_MORE") { /* asked for a photo, then the officer decided */ }
  } else { // scam
    const kind = SCAM_KINDS[scamIdx++ % SCAM_KINDS.length];
    pmt = ri(10, 25); zone = "HUMAN"; result = "HUMAN_REVIEW"; conf = ri(30, 60) / 100;
    if (kind === "shared") { shared = true; code = "R_PAYOUT_ACCOUNT_SHARED"; payAccount = SCAM_WALLET; }
    else if (kind === "helper") { helperOwned = true; code = "R_PAYOUT_HELPER_OWNED"; payAccount = YOUSUF_WALLET; changed = 3; }
    else { code = "R_SCAM_FLAG"; changed = 5; }
    openFlag = [kind === "scamflag" ? "scam" : "payout_account", `${kind} anomaly (history)`];
    const real = scamIdx % 5 !== 0;     // 8 of 10 stay with a human stop; the rest were honest families whose payout was hijacked
    truth = scamIdx % 5 === 1 || scamIdx % 5 === 3 ? "eligible" : "ineligible";
    officerRes = "REJECT";
    outcome = truth === "eligible" ? "stopped" : "rejected";
    status = truth === "eligible" ? "stopped" : "rejected";
    if (status === "rejected" && scamIdx % 2 === 0) resolveFlag = "Confirmed fraud attempt; claim rejected";
    if (status === "stopped") withdraw = false;
  }
  // build rows
  addHousehold(hk, district, ri(3, 8), pmt, flags, "2025-08-20");
  const fatherN = pick(MALE);
  people.push([q(pid), q(user), q(nameRoman), q(nameUr), q(cnicStored), D(expiry), q(dobRaw), D(dobIso), q(dobPrec), q(fatherN), q(gender === "F" ? "D/O" : "S/O"), false,
    q(genderStored), q(district), q(district), deceased, q(hhId(hk)), q(`0344-00${String(k).padStart(5, "0")}`), q(nameRoman), q(BANKS[k % 4]), "'application'", "NULL", "true"]);
  const nstatus = deceased ? "deceased" : (cnicExpired || expiry < TODAY) ? "expired" : "valid";
  if (cnicValid) nadra.set(cnicStored, [q(cnicStored), q(nameRoman), q(nameUr), q(fatherN), D(realDob(cnicStored, dobIso)), q(gender), q(district), D(realExpiry(cnicStored, expiry)), q(nstatus), q(`0344-00${String(k).padStart(5, "0")}`)]);
  addProfile(user, nameRoman, "ur", office, pid, "citizen");
  giveConsents(user, office, { at: `${QSTART[quarter]}T08:00:00Z` });
  const created = `${QSTART[quarter]}T0${(k % 8) + 1}:00:00Z`;
  const sub = `${QSTART[quarter]}T0${(k % 8) + 1}:30:00Z`;
  const decided = `${QSTART[quarter].slice(0, 8)}${String(Number(QSTART[quarter].slice(8)) + 3 + (k % 7)).padStart(2, "0")}T11:00:00Z`;
  const wallet = payAccount || `0344-99${String(k).padStart(5, "0")}`;
  const title = payAccount === SCAM_WALLET ? "Rafiq Traders" : payAccount === YOUSUF_WALLET ? "Muhammad Yousuf" : nameRoman;
  if (!payAccount) addAccount(wallet, nameRoman, cnicStored, "wallet", BANKS[k % 4], `0344-00${String(k).padStart(5, "0")}`);
  const viaHelper = helperOwned || (cat === "scam" && k % 3 === 0);
  const amount = P1.amount;
  caseRow({ id: caseId, owner: user, helper: viaHelper ? USERS.yousuf : null, person: pid, hh: hhId(hk), office, quarter, status, zone: officerRes ? "HUMAN" : zone, result: officerRes ? officerRes : result,
    amount, account: wallet, title, step: 5, createdAt: created, submittedAt: sub, decidedAt: decided, priority: 0, updatedAt: decided });
  docRow(caseId, "cnic_front", cnicValid && !docMissing ? "ok" : "ask_better_photo", { blur_score: 0.1, confidence: minConf }, viaHelper ? USERS.yousuf : user, created);
  const f = factsOf(base());
  decisionRow({ case: caseId, n: 1, at: `${QSTART[quarter]}T0${(k % 8) + 1}:31:00Z`, zone, result, code, conf, checks: checksFor(code), trace: traceFor(code), consent: consentOf[user + ":service"], facts: f });
  if (officerRes) {
    const off = officerIds[k % 2];
    const oCode = officerRes === "APPROVE" ? "R_AUTO_APPROVED" : (code === "R_AUTO_APPROVED" ? "R_LIKELY_NOT_ELIGIBLE" : code);
    decisionRow({ case: caseId, n: 2, at: decided, actorType: "user", actorId: off, zone: "HUMAN", result: officerRes, code: oCode, conf: undefined, checks: [], trace: [], facts: f,
      note: officerRes === "APPROVE" ? "Checked documents, approved." : "Checked, not eligible.", consent: consentOf[user + ":service"] });
    caseEvents.push([q(uid(`ev:${caseId}:officer`)), q(caseId), q("officer_decision"), q(off), J({ decision: officerRes.toLowerCase() }), T(decided)]);
  }
  if (status === "paid") payments.push([q(uid("pay:" + caseId)), q(caseId), q(wallet), amount, q("settled"), q("HIST-" + k), T(decided)]);
  if (openFlag) {
    flagsOpen.push([q(uid("flag:h" + k)), q(caseId), q(openFlag[0]), q("hard"), q(openFlag[1]), q(USERS.officer1), T(sub)]);
    if (resolveFlag) flagsResolve.push([uid("flag:h" + k), resolveFlag, officerIds[k % 2]]);
  }
  if (dq) dqRows.push([q(uid("dq:h" + k)), q(dq[0]), q(dq[0] === "households" ? hhId(hk) : pid), q(dq[1]), q(dq[2]), q(i % 3 === 0 ? "fixed" : "open")]);
  labelled.push([q(uid("lab:h" + k)), q(caseId), q(cat), q(truth), J(f), q(outcome), q(`${cat} / ${code}`)]);
  hist.push({ k, cat, truth, status });
});


// ================================================================= 5. the rest: links, assignments, rules, mock accounts, scams, keys, data quality
// The payout registry (mock Raast) starts EMPTY: no account number and no payment exists for anybody. An account is written to the
// registry, and the person marked as paid, only when a claim is approved (by the system or a staff member).
const accountsRows = [];
payments.length = 0;
for (const row of people) { row[18] = "NULL"; row[19] = "NULL"; }   // people.wallet_name, people.bank_name

// registry rule: women are recorded as D/O (daughter of) with their FATHER's name; there is no husband field and no widow flag
for (const row of people) { if (row[10] === "'W/O'") row[10] = "'D/O'"; row[11] = false; }

// people + households must be inserted before profiles; build the SQL in dependency order
emit("-- ---- households and people");
insert("public.households", ["id", "district", "members", "pmt_score", "flags", "survey_date"], households);
insert("public.people", peopleCols, people);
emit("-- ---- logins and roles");
insert("public.profiles", ["user_id", "full_name", "language", "office", "person_id"], profiles);
insert("public.user_roles", ["user_id", "role"], roles);
emit(`do $$ begin
  if to_regclass('public.local_users') is not null then
    insert into public.local_users (user_id, email, password_hash) values
${loginUsers.map((u) => `      (${q(u[0])}, ${q(u[1])}, crypt(${q(u[2])}, gen_salt('bf')))`).join(",\n")}
    on conflict do nothing;
  end if;
end $$;`);
insert("public.person_links", ["id", "a_id", "b_id", "band", "score", "evidence"],
  links.map(([a, b, band, score, ev]) => [q(uid(`link:${a}:${b}`)), q(personId(a)), q(personId(b)), q(band), score, J(ev)]));

// ---- rule sets
function rulesFor(cutoff, band) {
  const pmt = { var: "household.pmt_score" }, present = { "!": { missing: ["household.pmt_score"] } };
  const flag = (f) => ({ "==": [{ var: "household.flags." + f }, true] });
  const R_ = (code, expression, outcome, rc) => ({ code, expression, outcome, reason_code: rc, reason_en: exp(rc).en, reason_ur: exp(rc).ur });
  return [
    R_("R0_PMT_CLEARLY_ELIGIBLE", { and: [present, { "<=": [pmt, cutoff - band] }] }, "PASS", "R_AUTO_APPROVED"),
    R_("R1_PMT_BORDERLINE", { and: [present, { ">=": [pmt, cutoff - band] }, { "<=": [pmt, cutoff + band] }] }, "HOLD", "R_PMT_BORDERLINE"),
    R_("R1_PMT_ABOVE_CUTOFF", { and: [present, { ">": [pmt, cutoff + band] }] }, "HOLD", "R_PMT_ABOVE_CUTOFF"),
    R_("R1_PMT_MISSING", { missing: ["household.pmt_score"] }, "HOLD", "R_PMT_MISSING"),
    R_("R2_GOV_EMPLOYEE", flag("gov_employee"), "HOLD", "R_EXCLUSION_HIT"),
    R_("R3_VEHICLE", flag("owns_vehicle"), "HOLD", "R_EXCLUSION_HIT"),
    R_("R4_TAX_FILER", flag("tax_filer"), "HOLD", "R_EXCLUSION_HIT"),
    R_("R5_FOREIGN_TRIPS", flag("foreign_trips"), "HOLD", "R_EXCLUSION_HIT"),
    R_("R6_HIGH_PHONE_BILL", flag("high_phone_bill"), "HOLD", "R_EXCLUSION_HIT"),
  ];
}
const params = (cutoff, amount) => ({ programme: "Sahara Relief Programme (MOCK)", cutoff, borderline_band: 5, amount, payout_cap: 29000, auto_reject_enabled: false, second_approver_over: 20000, costs: COSTS });
function ruleSetSql(id, version, name, cutoff, amount, parent, activate) {
  const rules = rulesFor(cutoff, 5);
  return `do $$ begin
  if not exists (select 1 from public.rule_sets where version = ${version}) then
    insert into public.rule_sets (id, version, name, params, parent_version, created_by)
    values (${q(id)}, ${version}, ${q(name)}, ${J(params(cutoff, amount))}, ${parent ?? "NULL"}, ${q(USERS.admin)});
${rules.map((r) => `    insert into public.rules (rule_set_id, code, expression, outcome, reason_code, reason_en, reason_ur) values (${q(id)}, ${q(r.code)}, ${J(r.expression)}, ${q(r.outcome)}, ${q(r.reason_code)}, ${q(r.reason_en)}, ${q(r.reason_ur)});`).join("\n")}
${activate ? `    perform app.activate_rule_set(${q(id)});` : ""}
  end if;
end $$;`;
}
emit("-- ---- rule set v1 (ACTIVE) and v2 (DRAFT, for the rule-change demo)");
emit(ruleSetSql(RS1, 1, "Policy v1.0 (MOCK)", 30, 13500, null, true));
emit(ruleSetSql(RS2, 2, "Policy v2.0 draft (MOCK)", 25, 14500, 1, false));

emit("-- ---- consent");
insert("public.consents", ["id", "subject_id", "grantee_type", "grantee_id", "purpose", "fields", "status", "granted_by", "granted_at"], consentRows);
emit("-- ---- helper families");
insert("public.helper_assignments", ["id", "helper_user_id", "person_id"], helperAssign);

emit("-- ---- cases and everything that hangs off them");
insert("public.cases", ["id", "owner_user_id", "helper_user_id", "person_id", "household_id", "office", "quarter", "status", "zone", "result", "amount", "payout_account",
  "payout_account_title", "draft", "step", "resume_code", "assigned_officer", "priority", "created_at", "submitted_at", "decided_at", "updated_at"], cases);
insert("public.case_events", ["id", "case_id", "kind", "actor_id", "data", "at"], caseEvents);
insert("public.documents", ["id", "case_id", "doc_type", "storage_path", "sha256", "signals", "verdict", "uploaded_by", "created_at"], docs);
insert("public.decisions", ["id", "case_id", "created_at", "actor_type", "actor_id", "zone", "result", "reason_code", "confidence", "approve_line", "reject_line", "rule_set_id",
  "model_version", "checks", "explain_citizen", "trace", "next_step", "input_snapshot", "consent_snapshot_id", "costs_used", "note"], decisions, 50);
insert("public.case_notes", ["id", "case_id", "decision_id", "package", "created_at"], notes);
insert("public.case_flags", ["id", "case_id", "kind", "severity", "note", "opened_by", "opened_at"], flagsOpen);
insert("public.labelled_cases", ["id", "case_id", "category", "truth", "facts", "outcome", "notes"], labelled);
for (const [fid, note, by] of flagsResolve) {
  emit(`update public.case_flags set status = 'resolved', resolution_note = ${q(note)}, resolved_by = ${q(by)} where id = ${q(fid)} and status = 'open';`);
}
// a few doc checks
{
  const rows = docs.slice(0, 12).map((d, i) => [q(uid("dc:" + i)), d[0], q("blur"), q(i % 5 === 0 ? "unsure" : "pass"), 0.9, J({ seed: true })]);
  insert("public.doc_checks", ["id", "document_id", "check_name", "verdict", "confidence", "detail"], rows);
}
// 4 historical consents were taken back later (derived data purge queued, history kept)
for (const k of [3, 14, 41, 77]) {
  const cid = consentOf[shadow("h" + k) + ":service"];
  if (cid) emit(`update public.consents set status = 'withdrawn' where id = ${q(cid)} and status = 'granted';`);
}

emit("-- ---- data quality queue");
const dq0 = [
  ["people", personId(9), "CNIC last digit is odd for a woman", "R_CNIC_INVALID"],
  ["people", personId(3), "date of birth and surname missing", "R_MISSING_FIELDS"],
  ["people", personId(22), "many fields missing; helper to collect", "R_MISSING_FIELDS"],
  ["people", personId(18), "wallet record with no CNIC", "R_MISSING_FIELDS"],
  ["people", personId(26), "second CNIC for the same person", "R_DUPLICATE_IDENTITY"],
  ["people", personId(8), "CNIC expired 2024-06", "R_CNIC_EXPIRED"],
  ["people", personId(15), "CNIC expired 2026-09", "R_CNIC_EXPIRED"],
  ["people", personId(27), "CNIC expired 2022-03", "R_CNIC_EXPIRED"],
  ["people", personId(30), "applicant is marked deceased", "R_DECEASED"],
  ["people", personId(20), "district on application differs from CNIC district", "R_LOW_CONFIDENCE"],
  ["households", hhId("H14"), "no survey score", "R_PMT_MISSING"],
  ["households", hhId("H22"), "no survey score", "R_PMT_MISSING"],
].map((r) => [q(uid("dq:" + r[1] + r[3])), q(r[0]), q(r[1]), q(r[2]), q(r[3]), q("open")]);
insert("public.data_quality_queue", ["id", "entity", "entity_id", "problem", "reason_code", "status"], [...dq0, ...dqRows]);

emit("-- ---- mock services (private schema)");
insert("mock.nadra", ["cnic", "name_roman", "name_ur", "father_or_husband", "dob_iso", "gender", "district", "expiry", "status", "phone_mock"], [...nadra.values()]);
insert("mock.nser", ["household_id", "pmt_score", "members", "flags", "survey_date", "district"], nser);
insert("mock.raast_accounts", ["account_id", "title", "owner_cnic", "owner_user_id", "kind", "bank_name", "registered_phone", "changed_at"], accountsRows);
insert("mock.raast_payments", ["id", "case_id", "account_id", "amount", "status", "reference", "created_at"], payments);

// ---- scam reports (about 40)
const S = (text, sender, label, score, codes, district, lang, by = null) => [text, sender, label, score, codes, district, lang, by];
const scams = [
  S("BISP: You have won Rs 25,000 relief. Send your CNIC and 4-digit PIN to claim today. Reply YES.", "0300-5550101", "scam", 0.97, ["PRIZE_TOO_GOOD", "ASKS_CNIC", "ASKS_PIN_OR_OTP", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Karachi East", "en", USERS.asim),
  S("Dear user, your Ehsaas payment of Rs 13,500 is on hold. Verify at bisp-relief-check.example/login within 24 hours.", "0312-5550102", "scam", 0.95, ["SUSPICIOUS_LINK", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Karachi East", "en", USERS.asim),
  S("Your Easypaisa account will be blocked. Send the 6-digit code you just received to our agent to keep it active.", "0321-5550103", "scam", 0.96, ["ASKS_PIN_OR_OTP", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Karachi East", "en", USERS.asim),
  S("FBR notice: unpaid tax Rs 18,200. Pay today or CNIC will be blocked. Click link.", "0333-5550104", "scam", 0.9, ["URGENT_LANGUAGE", "SUSPICIOUS_LINK", "SENDER_NOT_OFFICIAL"], "Lahore", "en"),
  S("Congratulations! Jazz lucky draw winner Rs 500,000. Call the number below, processing fee Rs 3,000.", "0304-5550105", "scam", 0.98, ["PRIZE_TOO_GOOD", "ASKS_FEE", "SENDER_NOT_OFFICIAL"], "Hyderabad", "en"),
  S("NADRA: your CNIC expires today. Send a photo of both sides of your CNIC to renew.", "0345-5550106", "scam", 0.93, ["ASKS_CNIC", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Peshawar", "en"),
  S("Assalam o alaikum, BISP se message. Aap ko flood relief Rs 25000 mil gaye hain. Apna CNIC aur PIN bhejen.", "0300-5550107", "scam", 0.97, ["PRIZE_TOO_GOOD", "ASKS_CNIC", "ASKS_PIN_OR_OTP", "SENDER_NOT_OFFICIAL"], "Thatta", "roman", USERS.asim),
  S("Aapka Kafaalat ka paisa ruk gaya hai. Is link par click kar ke 3 din mein apni maloomat update karein.", "0311-5550108", "scam", 0.92, ["SUSPICIOUS_LINK", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Larkana", "roman"),
  S("Sir main Easypaisa se bol raha hun, ghalti se aap ke account mein Rs 20000 aa gaye, wapas bhej dein.", "0322-5550109", "scam", 0.88, ["SENDER_NOT_OFFICIAL", "URGENT_LANGUAGE"], "Karachi South", "roman"),
  S("Mubarak ho! Aap ka Benazir Income Support ka inaam nikla hai. Processing fee Rs 2500 JazzCash par bhejein.", "0305-5550110", "scam", 0.98, ["PRIZE_TOO_GOOD", "ASKS_FEE", "SENDER_NOT_OFFICIAL"], "Dadu", "roman"),
  S("WAPDA bill pending hai, aaj raat tak connection kat jayega. Is number par call karein.", "0346-5550111", "scam", 0.85, ["URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Karachi Central", "roman"),
  S("Aap ki SIM band hone wali hai. Biometric verification ke liye code bataein.", "0301-5550112", "scam", 0.9, ["ASKS_PIN_OR_OTP", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Quetta", "roman"),
  S("آپ کے لیے 25,000 روپے کا امدادی پیکج منظور ہو گیا ہے۔ اپنا شناختی کارڈ نمبر اور پن بھیجیں۔", "0302-5550113", "scam", 0.97, ["PRIZE_TOO_GOOD", "ASKS_CNIC", "ASKS_PIN_OR_OTP", "SENDER_NOT_OFFICIAL"], "Larkana", "ur"),
  S("بی آئی ایس پی: آپ کی قسط روک دی گئی ہے۔ نیچے دیے گئے لنک پر کلک کر کے تصدیق کریں۔", "0313-5550114", "scam", 0.93, ["SUSPICIOUS_LINK", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Karachi West", "ur"),
  S("آپ کا ایزی پیسہ اکاؤنٹ بند ہونے والا ہے، موصول شدہ کوڈ فوری بتائیں۔", "0323-5550115", "scam", 0.95, ["ASKS_PIN_OR_OTP", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Karachi East", "ur", USERS.asim),
  S("مبارک ہو! آپ انعامی اسکیم میں کامیاب ہوئے ہیں۔ انعام لینے کے لیے 3,000 روپے فیس جمع کروائیں۔", "0306-5550116", "scam", 0.98, ["PRIZE_TOO_GOOD", "ASKS_FEE", "SENDER_NOT_OFFICIAL"], "Hyderabad", "ur"),
  S("میں بینظیر آفس سے بول رہا ہوں، آپ کا انگوٹھا لگانا ہے، ابھی ایک کوڈ آئے گا وہ بتا دیں۔", "0347-5550117", "scam", 0.94, ["ASKS_PIN_OR_OTP", "SENDER_NOT_OFFICIAL"], "Mardan", "ur"),
  S("Rs 12,000 flood grant approved. Forward to 10 contacts to unlock. Link: relief-pk.example", "0314-5550118", "scam", 0.96, ["PRIZE_TOO_GOOD", "SUSPICIOUS_LINK", "SENDER_NOT_OFFICIAL"], "Thatta", "mixed"),
  // genuine (10)
  S("Sahara: Your payment of Rs 13,500 is ready. Visit your nearest registered agent with your original CNIC. Never share PIN/OTP.", "9171", "safe", 0.03, ["OFFICIAL_SENDER"], "Karachi East", "en", USERS.asim),
  S("Sahara: Your CNIC 42101-XXXXX-X is registered. Your survey is under review.", "9171", "safe", 0.05, ["OFFICIAL_SENDER"], "Karachi East", "en"),
  S("Sahara: Aap ki qist tayyar hai. Apna asal shanakhti card le kar agent par jayein. Koi fees nahi.", "9171", "safe", 0.04, ["OFFICIAL_SENDER"], "Larkana", "roman"),
  S("سہارا: آپ کی رقم 13,500 روپے جاری کر دی گئی ہے۔ رقم صرف رجسٹرڈ ایجنٹ سے وصول کریں۔ پن یا کوڈ کسی کو نہ بتائیں۔", "9171", "safe", 0.04, ["OFFICIAL_SENDER"], "Larkana", "ur"),
  S("Sahara: Application rejected: CNIC expired. Renew at NADRA and reapply. Appeal within 30 days: helpline 0800-00000 (MOCK).", "9171", "safe", 0.08, ["OFFICIAL_SENDER"], "Karachi Central", "en"),
  S("Sahara: Appeal ID A-2026-0042 received. Decision in 21 working days.", "9171", "safe", 0.03, ["OFFICIAL_SENDER"], "Karachi Central", "en"),
  S("Sahara: Fingerprint verification failed (attempt 2/3). Please try again at the agent.", "9171", "safe", 0.06, ["OFFICIAL_SENDER"], "Peshawar", "en"),
  S("Sahara: Rs 13,500 collected on 2026-11-18 at agent code 1234. If not you, call the helpline.", "9171", "safe", 0.07, ["OFFICIAL_SENDER"], "Karachi South", "en"),
  S("Sahara: Aap ki application mil gayi hai. Reference ID R-77001. Natija 15 din mein.", "9171", "safe", 0.03, ["OFFICIAL_SENDER"], "Dadu", "roman"),
  S("Sahara: Policy updated to v2.0 effective 2026-12-01. New amount Rs 14,500. Details at tehsil office.", "9171", "safe", 0.05, ["OFFICIAL_SENDER"], "Karachi East", "en"),
  // grey and extra (12)
  S("Your relief payment is ready. Visit the nearest shop and show your CNIC.", "0311-5550199", "suspicious", 0.55, ["SENDER_NOT_OFFICIAL"], "Karachi East", "en"),
  S("Sahara payment update: tap here to see your status.", "SAHARA-INFO", "suspicious", 0.6, ["SUSPICIOUS_LINK", "SENDER_NOT_OFFICIAL"], "Hyderabad", "en"),
  S("Relief centre open tomorrow 9am at the union council office. Bring family card.", "0300-5550201", "suspicious", 0.42, ["SENDER_NOT_OFFICIAL"], "Thatta", "en"),
  S("Aap ko relief ke liye register karna hai, apna naam aur shanakhti card number bhejen.", "0312-5550202", "suspicious", 0.7, ["ASKS_CNIC", "SENDER_NOT_OFFICIAL"], "Dadu", "roman"),
  S("آپ کی امدادی رقم تیار ہے، قریبی دکان پر جا کر وصول کریں۔", "0333-5550203", "suspicious", 0.5, ["SENDER_NOT_OFFICIAL"], "Larkana", "ur"),
  S("Reminder: reply with your 4-digit PIN to confirm your Sahara account.", "0345-5550204", "scam", 0.96, ["ASKS_PIN_OR_OTP", "SENDER_NOT_OFFICIAL"], "Karachi East", "en"),
  S("Kafaalat ki qist ke liye Rs 500 registration fee JazzCash par bhejein.", "0305-5550205", "scam", 0.97, ["ASKS_FEE", "SENDER_NOT_OFFICIAL"], "Karachi West", "roman"),
  S("اپنا او ٹی پی ابھی بھیجیں ورنہ آپ کی قسط ضبط ہو جائے گی۔", "0306-5550206", "scam", 0.97, ["ASKS_PIN_OR_OTP", "URGENT_LANGUAGE", "SENDER_NOT_OFFICIAL"], "Peshawar", "ur"),
  S("Claim Rs 15,000 flood aid now: bit.example/sahara-aid (limited time!)", "0307-5550207", "scam", 0.95, ["SUSPICIOUS_LINK", "URGENT_LANGUAGE", "PRIZE_TOO_GOOD", "SENDER_NOT_OFFICIAL"], "Thatta", "en"),
  S("Your Jazz package has been renewed. Thank you.", "JAZZ", "safe", 0.04, [], "Karachi East", "en"),
  S("Your electricity bill for October is Rs 2,310. Due 28 Nov.", "KE", "safe", 0.05, [], "Karachi South", "en"),
  S("Salam, main aap ki madad karne wala hun. Mujhe apna PIN dein, main aap ka form bhar dunga.", "0321-5550208", "scam", 0.9, ["ASKS_PIN_OR_OTP", "SENDER_NOT_OFFICIAL"], "Karachi East", "roman", USERS.asim),
];
insert("public.scam_reports", ["id", "text", "sender", "label", "score", "reasons", "district", "language", "source", "reported_by", "created_at"],
  scams.map((s, i) => [q(uid("scam:" + i)), q(s[0]), q(s[1]), q(s[2]), s[3], J(s[4].map((c) => ({ code: c }))), q(s[5]), q(s[6]), q(s[7] ? "user" : "seed"), q(s[7]),
    T(`2026-10-${String(1 + (i % 28)).padStart(2, "0")}T0${(i % 9) + 1}:00:00Z`)]));

// ---- api keys (hash only). The demo key text is "sahara_demo_key_0001" (synthetic, documented in the README).
insert("public.api_keys", ["id", "name", "key_hash", "scopes", "rate_limit_per_min", "revoked", "revoked_at", "created_by"], [
  [q(uid("key:demo")), q("demo-partner (synthetic)"), q(sha256("sahara_demo_key_0001")), A(["status:read", "scam:check", "eligibility:precheck"]), 60, "false", "NULL", q(USERS.admin)],
  [q(uid("key:old")), q("old-partner (revoked)"), q(sha256("sahara_old_key_0000")), A(["status:read"]), 30, "true", T("2026-10-20T10:00:00Z"), q(USERS.admin)],
]);

emit("commit;");

const sql = out.join("\n") + "\n";
fs.writeFileSync(path.join(here, "seed.sql"), sql);
fs.writeFileSync(path.join(here, "test_users.json"), JSON.stringify(TEST.map((t) => ({ key: t[0], user_id: t[1], email: t[2], secret: t[3], role: t[4], office: t[7] })), null, 2) + "\n");
console.log(`seed.sql written: ${(sql.length / 1024).toFixed(0)} KB, ${people.length} people, ${cases.length} cases, ${decisions.length} decisions, ${scams.length} scam reports`);
