"""Docs: roles are Person (eligible for relief), Helper, Admin. Admin also reviews cases and checks the diary."""
import re
from pathlib import Path

R = Path(__file__).resolve().parent.parent
D = R / "docs"

GUIDE_TABLE = """| | Person | Helper | Admin |
|---|---|---|---|
| See **own** claim and data | Yes | n/a | n/a |
| See a **family's** data | n/a | Only the family in the open session, **and only with her active consent** | Only cases in **own office**, **and only with active consent**. Identity records only through a masked view |
| Create / edit a claim draft | Own | For the open family | No |
| Give consent | Yes (own) | **No.** The woman types her own PIN | No |
| Take back consent | Yes | Yes (for that family) | No |
| Approve / reject / hold a case | No | **No** | **Yes** (not own, not one they helped with) |
| Edit rules | No | No | **Yes** (as a new draft) |
| Make a rule version live | No | No | **Yes** |
| Run Digital Twin | No | No | Yes |
| Read the audit diary | Only lines about themselves | Own | Yes, all |
| Change the diary | **Nobody** | **Nobody** | **Nobody** |
| Change their own role | No | No | No |
| Manage API keys | No | No | Yes |
"""

MANUAL_TABLE = """| | Person (eligible for relief) | Helper | Admin |
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
"""


def swap_table(text, header_start, new_table):
    lines = text.split("\n")
    out, i = [], 0
    while i < len(lines):
        if lines[i].startswith(header_start):
            while i < len(lines) and lines[i].startswith("|"):
                i += 1
            out.extend(new_table.rstrip("\n").split("\n"))
            continue
        out.append(lines[i])
        i += 1
    return "\n".join(out)


def sub(t, pairs, name=""):
    for a, b in pairs:
        if a not in t:
            print("  MISSING", name, a[:60])
        t = t.replace(a, b)
    return t


# ------------------------------------------------------------------ short guide
p = D / "Sahara_Relief_Complete_Guide.md"
s = p.read_text(encoding="utf-8")
s = swap_table(s, "| | Citizen | Citizen as helper | Officer | Admin |", GUIDE_TABLE)
s = re.sub(r"\| \*\*Citizen\*\* \|.*\n\| \*\*Citizen who helps others.*\n\| \*\*Officer\*\* \|.*\n\| \*\*Admin\*\* \|.*\n",
           "| **Person** (eligible for relief) | A woman claiming her payment (also a shopkeeper who wants to check a message) | Claims her payment, checks scam messages, gives and takes back permission |\n"
           "| **Helper** | A community worker who helps many women | Helps one family at a time with their claim |\n"
           "| **Admin** | Programme staff in an office | Reviews the cases the system is unsure about, edits rules, previews changes, reads evaluation reports, manages API keys, **reads and verifies the diary** |\n", s)
s = sub(s, [
    ("### 3.1 The Citizen's journey, step by step", "### 3.1 The Person's journey, step by step"),
    ("### 3.2 The helper's journey (a citizen with families)", "### 3.2 The Helper's journey"),
    ("### 3.3 The Officer's journey", "### 3.3 The Admin's journey, part 1: reviewing cases"),
    ("a **second officer** must approve too.", "a **second admin** must approve too."),
    ("An officer **cannot** approve", "An admin **cannot** approve"),
    ("loses access to a case the moment the citizen takes back", "loses access to a case the moment the person takes back"),
    ("### 3.4 The Admin's journey", "### 3.4 The Admin's journey, part 2: rules and reports"),
    ("The admin **cannot decide a case**. The admin sees people only through a masked view (middle of the ID number hidden).",
     "Rules and decisions are kept apart in the database: nobody can approve their own case or one they helped with, and a rule change always starts as a new draft."),
    ("### 3.5 The Admin as checker: the diary", "### 3.5 The Admin's journey, part 3: checking the diary"),
    ("Citizen who helps (Yousuf)", "Helper (Yousuf)"),
    ("all three roles", "all three roles (person, helper, admin)"),
], "guide")
s = re.sub(r"\| Officer \| `officer1@gov.sahara.test`[^\n]*\n", "| Admin (reviewer) | `admin1@gov.sahara.test`, `admin2@gov.sahara.test` | Admin#2026 |\n", s)
s = s.replace("| Citizen |", "| Person |").replace("| Admin | `admin@gov.sahara.test` | Admin#2026 |", "| Admin (programme) | `admin@gov.sahara.test` | Admin#2026 |")
s = s.replace("an officer", "an admin").replace("An officer", "An admin").replace("the officer", "the admin").replace("The officer", "The admin")
p.write_text(s, encoding="utf-8")

# ------------------------------------------------------------------ manual chapters
p = D / "gen" / "ch_03_rules_access.md"
s = p.read_text(encoding="utf-8")
s = swap_table(s, "| | Citizen | Citizen as helper | Officer | Admin |", MANUAL_TABLE)
a = s.index("### 14.3")
b = s.index("## 15.")
s = s[:a] + """### 14.3 One role per login

Each user has exactly one role (one row in `user_roles`): **citizen** (shown in the app as **Person**), **helper** or **admin**. Three roles keep the system easy to understand. The admin does the work of a case reviewer, a rule manager and a diary checker. The safety rules stop one admin from doing everything on one case: nobody approves their own case or one they helped with, large payments need a second admin, and rule changes start as a new draft.

""" + s[b:]
s = sub(s, [("## 14. The three roles and what each may do", "## 14. The three roles and what each may do"),
            ("HOLD (two officers)", "HOLD (two admins)")], "ch03")
s = s.replace("Admin sees people only through a masked view.", "Admin sees people only for own-office cases with consent, or through a masked view.")
p.write_text(s, encoding="utf-8")

for name, pairs in {
    "ch_02_usage.md": [
        ("| Citizen with a fresh claim |", "| Person with a fresh claim |"), ("| Citizen (widow, claim already sent) |", "| Person (widow, claim already sent) |"),
        ("| Citizen (shopkeeper) |", "| Person (shopkeeper) |"), ("Citizen who helps (Yousuf)", "Helper (Yousuf)"),
        ("## 6. Helper guide: a citizen helping many families", "## 6. Helper guide: helping many families"),
        ("## 7. Officer guide: reviewing cases", "## 7. Admin guide, part 1: reviewing cases"),
        ("## 9. Admin guide: rules and reports", "## 9. Admin guide, part 2: rules and reports"),
        ("## 10. Admin guide, part 2: checking the diary", "## 10. Admin guide, part 3: checking the diary"),
    ],
    "ch_01_project.md": [("**3 roles** (citizen, officer, admin). A helper is a citizen who has been given families", "**3 roles** (person, helper, admin)")],
    "ch_06_quality.md": [("citizen, helper, officer and admin screens all load", "person, helper and admin screens all load"),
                          ("(citizen, helper, officer, admin)", "(person, helper, admin)")],
}.items():
    p = D / "gen" / name
    s = p.read_text(encoding="utf-8")
    s = re.sub(r"\| Officer \| `officer1@gov.sahara.test`[^\n]*\n", "| Admin (reviewer) | `admin1@gov.sahara.test`, `admin2@gov.sahara.test` | Admin#2026 |\n", s)
    s = s.replace("| Admin | `admin@gov.sahara.test` | Admin#2026 |", "| Admin (programme) | `admin@gov.sahara.test` | Admin#2026 |")
    s = sub(s, pairs, name)
    s = s.replace("second officer", "second admin").replace("two officers", "two admins").replace("An officer", "An admin").replace("an officer", "an admin")
    s = s.replace("The officer", "The admin").replace("the officer", "the admin").replace("human officer", "human reviewer")
    p.write_text(s, encoding="utf-8")

# build_manual.py: schema notes
p = D / "gen" / "build_manual.py"
s = p.read_text(encoding="utf-8")
s = s.replace("citizen, officer or admin (a citizen who has been given families acts as a helper)", "citizen (shown as Person), helper or admin")
s = s.replace("Officer and admin", "Admin").replace("officers and admin", "admins").replace("officer and admin", "admin")
s = s.replace("An officer", "An admin").replace("an officer", "an admin").replace("Officers", "Admins").replace("officers", "admins")
p.write_text(s, encoding="utf-8")

# READMEs / contract
p = R / "README.md"
s = p.read_text(encoding="utf-8")
s = re.sub(r"\| \*\*Citizen who helps others\*\*[^\n]*\n", "| **Helper** | Helps many families from one shared phone, one family at a time, each with separate permission. |\n", s)
s = s.replace("| **Citizen** |", "| **Person (eligible for relief)** |")
s = re.sub(r"\| \*\*Officer\*\* \|[^\n]*\n", "", s)
s = s.replace("| **Admin** |", "| **Admin** | Reviews unsure cases, manages rules, reads the diary and the AI's decisions. |\n<!--", 1) if False else s
s = s.replace("`officer1@gov.sahara.test` / `Officer#2026`, ", "`admin1@gov.sahara.test` / `Admin#2026`, ")
p.write_text(s, encoding="utf-8")

p = R / "CONTRACT.md"
s = p.read_text(encoding="utf-8")
s = s.replace("Roles: `citizen`, `officer`, `admin`. A citizen who has been given families (rows in `helper_assignments`) is treated as a helper by `app.current_role()`.", "Roles: `citizen` (shown as Person), `helper`, `admin`. The admin also reviews cases (own office, with consent).")
s = re.sub(r"\| officer[12]@gov.sahara.test[^\n]*\n", "", s)
p.write_text(s, encoding="utf-8")
p = R / "db" / "README.md"
s = p.read_text(encoding="utf-8")
s = s.replace("(citizen, officer, admin; a citizen with families acts as helper)", "(citizen, helper, admin)")
p.write_text(s, encoding="utf-8")
print("done")
