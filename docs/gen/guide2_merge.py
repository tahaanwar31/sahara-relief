"""Joins the two guide PDFs: cover (no footer) + the rest (with page numbers). Usage: python docs/gen/guide2_merge.py"""
from pathlib import Path
import pypdf

HERE = Path(__file__).parent
a = pypdf.PdfReader(str(HERE / "_g_nofooter.pdf"))
b = pypdf.PdfReader(str(HERE / "_g_footer.pdf"))
w = pypdf.PdfWriter()
w.add_page(a.pages[0])
for p in b.pages[1:]:
    w.add_page(p)
w.add_metadata({"/Title": "Sahara Relief: The Complete Guide", "/Author": "Sahara Relief team, Coder's Cup '26"})
out = HERE.parent / "Sahara_Relief_Complete_Guide.pdf"
with open(out, "wb") as f:
    w.write(f)
print("pages:", len(w.pages), "->", out)
