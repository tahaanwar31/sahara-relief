"""One-off: rewrite the docs from five roles to three (citizen, officer, admin; helper = a citizen with families)."""
import re
from pathlib import Path

R = Path(__file__).resolve().parent.parent


def drop_last_col(text: str, header_start: str) -> str:
    """Remove the last column of the markdown table whose header row starts with header_start."""
    out, inside = [], False
    for ln in text.split("\n"):
        if ln.startswith(header_start):
            inside = True
        elif inside and not ln.startswith("|"):
            inside = False
        if inside:
            cells = ln.rstrip().rstrip("|").split("|")
            ln = "|".join(cells[:-1]) + "|"
        out.append(ln)
    return "\n".join(out)


def sub(text, pairs):
    for a, b in pairs:
        if a not in text:
            print("  MISSING:", a[:70])
        text = text.replace(a, b)
    return text


# ---------------------------------------------------------------- short guide
p = R / "docs" / "Sahara_Relief_Complete_Guide.md"
s = p.read_text(encoding="utf-8")
s = drop_last_col(s, "| | Citizen | Helper | Officer | Admin | Auditor |")
s = sub(s, [
    ("## 3. Who uses it: the five accounts", "## 3. Who uses it: the three roles"),
    ("| **Helper** | A community worker who helps many women | Helps one family at a time with their claim |",
     "| **Citizen who helps others (a \"helper\")** | A community worker who helps many women. This is not a fourth role. It is a citizen account that has been given families | Helps one family at a time with their claim |"),
    ("| **Admin** | A programme manager | Edits rules, previews changes, reads evaluation reports, manages API keys |\n| **Auditor** | An independent checker | Reads everything. Changes nothing. Verifies the diary |",
     "| **Admin** | A programme manager, who also does the checker's job | Edits rules, previews changes, reads evaluation reports, manages API keys, **reads and verifies the diary** |"),
    ("### 3.2 The Helper's journey", "### 3.2 The helper's journey (a citizen with families)"),
    ("### 3.5 The Auditor's journey", "### 3.5 The Admin as checker: the diary"),
    ("The admin **cannot decide a case**. The admin cannot see people's private records either (the database blocks it).",
     "The admin **cannot decide a case**. The admin sees people only through a masked view (middle of the ID number hidden)."),
    ("- Reads the evaluation numbers. The auditor changes nothing.", "- Reads the evaluation numbers. Nobody can change the diary, the admin included."),
    ("| | Citizen | Helper | Officer | Admin |", "| | Citizen | Citizen as helper | Officer | Admin |"),
    ("| Live check in real Chrome (all five roles", "| Live check in real Chrome (all three roles"),
])
s = re.sub(r"\| Auditor \| `auditor@gov.sahara.test` \| Auditor#2026 \|\n", "", s)
s = s.replace("| Helper | `yousuf@helpers.sahara.test` | 246810 |", "| Citizen who helps (Yousuf) | `yousuf@helpers.sahara.test` | 246810 |")
p.write_text(s, encoding="utf-8")

# ---------------------------------------------------------------- manual chapters
d = R / "docs" / "gen"
p = d / "ch_03_rules_access.md"
s = p.read_text(encoding="utf-8")
s = drop_last_col(s, "| | Citizen | Helper | Officer | Admin | Auditor |")
s = sub(s, [
    ("## 14. The five roles and what each may do", "## 14. The three roles and what each may do"),
    ("| | Citizen | Helper | Officer | Admin |", "| | Citizen | Citizen as helper | Officer | Admin |"),
    ("| **Person identity records** (`people`) | Own only | Only the open family, only with consent | Only own-office cases, only with consent | **No access** |",
     "| **Person identity records** (`people`) | Own only | Only the open family, only with consent | Only own-office cases, only with consent | Masked view only |"),
    ("### 14.3 One role per login\n\nEach user has exactly one role (one row in `user_roles`). A real helper who is also a citizen would have two logins.",
     "### 14.3 One role per login, and what a \"helper\" is\n\nEach user has exactly one stored role (one row in `user_roles`): **citizen, officer or admin**. A **helper is a citizen who has been given families** (rows in `helper_assignments`). The database function `app.current_role()` answers `helper` for such a citizen, so the helper rules apply to them. The old **auditor** job (read the diary, verify it, read the evaluation) now belongs to the **admin**. Fewer roles means fewer ways to get confused."),
    ("Admin cannot read people. Auditor sees only a masked view.", "Admin sees people only through a masked view."),
    ("An auditor can always see which rules applied", "The admin can always see which rules applied"),
])
p.write_text(s, encoding="utf-8")

p = d / "ch_02_usage.md"
s = p.read_text(encoding="utf-8")
s = sub(s, [
    ("| Auditor | `auditor@gov.sahara.test` | Auditor#2026 |\n", ""),
    ("| Helper | `yousuf@helpers.sahara.test` | 246810 |", "| Citizen who helps (Yousuf) | `yousuf@helpers.sahara.test` | 246810 |"),
    ("## 6. Helper guide: helping many families", "## 6. Helper guide: a citizen helping many families"),
    ("## 10. Auditor guide: checking the diary\n\n**Who:** an independent checker. **Tabs:** **Diary**, **Evaluation**, **Rules**.",
     "## 10. Admin guide, part 2: checking the diary\n\n**Who:** the admin, doing the checker's job. **Tabs:** **Diary**, **Evaluation**, **Rules**."),
    ("- The auditor **changes nothing**. No role can change the diary.", "- Nobody can change the diary, the admin included."),
    ("An admin cannot decide a case, and cannot read the identity table (names and ID numbers) of people. An admin can read case, decision and diary data.",
     "An admin cannot decide a case, and sees people only through a masked view (middle of the ID number hidden). An admin can read case, decision and diary data."),
])
p.write_text(s, encoding="utf-8")

for name, pairs in {
    "ch_01_project.md": [
        ("gives an **auditor** proof", "gives the **admin** proof"),
        ("| At least 3 roles | **5 roles** (citizen, helper, officer, admin, auditor) | Part 3 |", "| At least 3 roles | **3 roles** (citizen, officer, admin). A helper is a citizen who has been given families | Part 3 |"),
    ],
    "ch_04_tech.md": [
        ("Live checks of all five roles", "Live checks of all three roles"),
        ("helper (`Families`), officer", "citizen-helper (`Families`), officer"),
        ("admin (`Rules`, `RuleEditor`, `Policy`, `Twin`, `Evaluation`), auditor (`Audit`).", "admin (`Rules`, `RuleEditor`, `Policy`, `Twin`, `Evaluation`, `Audit`)."),
        ("runs the check for the auditor.", "runs the check for the admin."),
        ("hides ID numbers for the auditor.", "hides ID numbers for the admin."),
        ("Log in as **auditor**: **Verify the diary**.", "Stay logged in as **admin**: open **Diary** and press **Verify the diary**."),
    ],
    "ch_05_ai.md": [
        ("so an auditor can see exactly", "so the admin can see exactly"),
        ("An auditor, a court or a citizen", "An admin, a court or a citizen"),
    ],
    "ch_06_quality.md": [
        ("citizen, helper, officer, admin and auditor screens all load", "citizen, helper, officer and admin screens all load"),
        ("(citizen, helper, officer, admin, auditor)", "(citizen, helper, officer, admin)"),
    ],
}.items():
    p = d / name
    s = p.read_text(encoding="utf-8")
    p.write_text(sub(s, pairs), encoding="utf-8")

# ---------------------------------------------------------------- READMEs / contract
p = R / "README.md"
s = p.read_text(encoding="utf-8")
s = re.sub(r"\| \*\*Auditor\*\* \|.*\n", "", s)
s = sub(s, [
    ("| **Helper** |", "| **Citizen who helps others** (a citizen given families) |"),
    ("`admin@gov.sahara.test` / `Admin#2026`, `auditor@gov.sahara.test` / `Auditor#2026`.", "`admin@gov.sahara.test` / `Admin#2026`."),
])
p.write_text(s, encoding="utf-8")

p = R / "CONTRACT.md"
s = p.read_text(encoding="utf-8")
s = re.sub(r"\| auditor@gov.sahara.test \|.*\n", "", s)
s = sub(s, [
    ("Roles: `citizen`, `helper`, `officer`, `admin`, `auditor`.", "Roles: `citizen`, `officer`, `admin`. A citizen who has been given families (rows in `helper_assignments`) is treated as a helper by `app.current_role()`."),
    ("auditor reads everything but changes nothing.", "admin sees people only through a masked view."),
    ("auditor+admin / auditor+admin / any", "admin / admin / any"),
    ("admin (read: officer, auditor)", "admin (read: officer)"),
])
p.write_text(s, encoding="utf-8")

p = R / "db" / "README.md"
s = p.read_text(encoding="utf-8")
s = sub(s, [
    ("The role (citizen, helper, officer, admin, auditor) is read", "The role (citizen, officer, admin; a citizen with families acts as helper) is read"),
    ("* Auditors read people through the view `people_masked` (CNIC middle hidden), not the base table. Admins have no access to `people` or `households` at all (as in the Build Plan table).",
     "* Admins read people through the view `people_masked` (CNIC middle hidden), not the base table."),
    ("slide, Auditor screen)", "slide, Diary screen)"),
])
p.write_text(s, encoding="utf-8")

p = R / "web" / "README.md"
s = p.read_text(encoding="utf-8")
s = sub(s, [
    ("helper/, officer/, admin/, auditor/", "helper/, officer/, admin/"),
    ("evaluation page. Auditor: diary", "evaluation page, and the diary. Admin diary"),
    ("(officer, admin, auditor)", "(officer, admin)"),
])
p.write_text(s, encoding="utf-8")
print("done")
