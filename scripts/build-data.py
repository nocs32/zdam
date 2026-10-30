"""Build data/questions.json + public/img/* from the HSC questions PDF and the transcribed answer key.

Run once:  python -I scripts/build-data.py   (from the zdam/ folder; needs pymupdf + Pillow)
"""
import io, json, os, random, re, sys
import pymupdf
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "data", "questions.pdf")
KEY = os.path.join(ROOT, "data", "answer-key.txt")
OUT_JSON = os.path.join(ROOT, "data", "questions.json")
IMG_DIR = os.path.join(ROOT, "public", "img")

# Category B = common sections 1–39 plus the B1/B extra blocks 44–47.
def in_scope_b(sec):
    major = int(sec.split(".")[0])
    return major <= 39 or 44 <= major <= 47

HEADING = re.compile(r"^(\d{1,2}(?:\.\d)?)\.\s*([А-ЯІЇЄҐA-Z’'][А-ЯІЇЄҐA-Z0-9’'\s,()«»\-–]+)$")
QSTART = re.compile(r"^(\d{1,3})\s*\.\s*(.*)$")
OPT = re.compile(r"^([1-9])\)\s*(.*)$")

# Questions whose options in the PDF don't use the "1)" format; fixed by hand from the PDF page.
OVERRIDES = {
    ("16.1", 34): ("Чи дозволено водію чорного автомобіля повернути праворуч у даному випадку?",
                   ["Дозволено.", "Заборонено."]),
    ("45", 16): ("Наведений індикатор червоного кольору інформує про:",
                 ["Відчинені двері автомобіля.", "Блокування дверей автомобіля.", "Відчинені двері багажника."]),
}


def load_key():
    key = {}
    for line in open(KEY, encoding="utf-8"):
        if line.startswith("#") or not line.strip():
            continue
        sec, rest = line.split(":", 1)
        key[sec.strip()] = [None if x == "?" else int(x) for x in rest.split() if x != "|"]
    return key


def stream(doc):
    """Yield page content in reading order: ('text', page, y, text, bold, is_upper) and ('img', page, bbox)."""
    for pno, page in enumerate(doc):
        items = []
        for b in page.get_text("dict")["blocks"]:
            if b["type"] != 0:
                continue
            for l in b["lines"]:
                spans = [s for s in l["spans"] if s["text"].strip()]
                if not spans:
                    continue
                text = " ".join("".join(s["text"] for s in l["spans"]).split())
                bold_chars = sum(len(s["text"].strip()) for s in spans if s["flags"] & 16 or "Bold" in s["font"])
                bold = bold_chars >= 0.5 * sum(len(s["text"].strip()) for s in spans)
                items.append((l["bbox"][1], l["bbox"][0], ("text", pno, l["bbox"][1], text, bold)))
        for info in page.get_image_info(xrefs=True):
            x0, y0, x1, y1 = info["bbox"]
            if (x1 - x0) < 12 or (y1 - y0) < 12:
                continue
            items.append((y0, x0, ("img", pno, tuple(info["bbox"]))))
        # Group into visual rows (an option marker can sit a point or two off its text), then read each row left to right.
        items.sort(key=lambda t: t[0])
        rows = []
        for it in items:
            if rows and it[2][0] == "text" and rows[-1][-1][2][0] == "text" and it[0] - rows[-1][0][0] <= 4:
                rows[-1].append(it)
            else:
                rows.append([it])
        for row in rows:
            for _, _, it in sorted(row, key=lambda t: t[1]):
                yield it


def nice_title(raw):
    t = raw.capitalize()
    # restore category codes after "категорій/категорії": А1, А, В1, В, C1, C, D1, D, BE, C1E, CE, D1E, DE, Т
    t = re.sub(r"(категорі[йї]\s+)([^()]+)", lambda m: m.group(1) + m.group(2).upper(), t)
    return t.replace("(Загальні)", "(загальні)").strip()


def parse(doc):
    sections, questions = [], []
    sec = None
    q = None
    pending_heading = None
    part = None  # "q" | "opt"
    problems = []

    def close_q():
        nonlocal q
        if q:
            questions.append(q)
        q = None

    for it in stream(doc):
        if it[0] == "img":
            if q is None:
                problems.append(f"image before any question on page {it[1] + 1}")
                continue
            q["_imgs"].append((it[1], it[2]))
            continue
        _, pno, y, text, bold = it
        if re.fullmatch(r"\d{1,3}", text) and y < 60:  # page number
            continue
        m = HEADING.match(text)
        if m and text.upper() == text and sum(c.isalpha() for c in text) > 4:
            close_q()
            sec = {"id": m.group(1), "raw": m.group(2).strip(), "page": pno + 1}
            sections.append(sec)
            pending_heading = sec
            continue
        if pending_heading and text.upper() == text and sum(c.isalpha() for c in text) > 2 and not QSTART.match(text):
            pending_heading["raw"] += " " + text  # heading continued on the next line
            continue
        pending_heading = None
        mq = QSTART.match(text)
        if mq and bold and sec:
            n = int(mq.group(1))
            expected = (questions[-1]["n"] + 1 if questions and questions[-1]["section"] == sec["id"] else 1) if q is None else (q["n"] + 1 if q["section"] == sec["id"] else 1)
            if n == expected:
                close_q()
                q = {"section": sec["id"], "n": n, "text": mq.group(2), "options": [], "_imgs": [], "page": pno + 1}
                part = "q"
                continue
        if q is None:
            problems.append(f"orphan text p{pno + 1}: {text[:60]}")
            continue
        mo = OPT.match(text)
        if mo and int(mo.group(1)) == len(q["options"]) + 1:
            q["options"].append(mo.group(2))
            part = "opt"
            continue
        if part == "q":
            q["text"] = (q["text"] + " " + text).strip()
        else:
            q["options"][-1] = (q["options"][-1] + " " + text).strip()
    close_q()
    return sections, questions, problems


def save_images(doc, questions):
    os.makedirs(IMG_DIR, exist_ok=True)
    for f in os.listdir(IMG_DIR):
        os.remove(os.path.join(IMG_DIR, f))
    count = 0
    for q in questions:
        q["images"] = []
        for i, (pno, bbox) in enumerate(q.pop("_imgs")):
            page = doc[pno]
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=pymupdf.Rect(bbox))
            im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
            if im.width > 1200:
                im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
            name = f"{q['section']}-{q['n']}" + (f"-{i + 1}" if i else "") + ".webp"
            im.save(os.path.join(IMG_DIR, name), "WEBP", quality=78, method=6)
            q["images"].append(name)
            count += 1
    return count


def tidy(s):
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def main():
    doc = pymupdf.open(PDF)
    key = load_key()
    sections, questions, problems = parse(doc)
    problems = [p for p in problems if not p.startswith("orphan text p1:")]  # document title above section 1
    for q in questions:
        if (q["section"], q["n"]) in OVERRIDES:
            q["text"], q["options"] = OVERRIDES[(q["section"], q["n"])]
            q["options"] = list(q["options"])

    by_sec = {}
    for q in questions:
        by_sec.setdefault(q["section"], []).append(q)

    print(f"sections parsed: {len(sections)}   questions parsed: {len(questions)}")
    bad = []
    for s in sections:
        qs = by_sec.get(s["id"], [])
        k = key.get(s["id"])
        if k is None:
            bad.append(f"section {s['id']}: not in answer key")
            continue
        if len(qs) != len(k):
            bad.append(f"section {s['id']}: {len(qs)} questions parsed vs {len(k)} answers in key")
        for q in qs:
            q["text"] = tidy(q["text"])
            q["options"] = [tidy(o) for o in q["options"]]
            ans = k[q["n"] - 1] if q["n"] <= len(k) else None
            q["correct"] = ans
            if any(not o or o[0].islower() for o in q["options"]):
                bad.append(f"{s['id']}/{q['n']} p{q['page']}: empty option or option starting mid-sentence :: {q['options']}")
            if len(q["options"]) < 2:
                bad.append(f"{s['id']}/{q['n']} p{q['page']}: only {len(q['options'])} options :: {q['text'][:80]}")
            if ans is None:
                bad.append(f"{s['id']}/{q['n']}: answer unknown")
            elif ans > len(q["options"]):
                bad.append(f"{s['id']}/{q['n']} p{q['page']}: answer {ans} but only {len(q['options'])} options")
    for p in problems:
        bad.append(p)

    n_img = save_images(doc, questions)
    files = set(os.listdir(IMG_DIR))
    referenced = {i for q in questions for i in q["images"]}
    orphans = files - referenced

    out = {
        "source": "HSC MVS test bank, order No. 190 of 04.09.2025",
        "sections": [{"id": s["id"], "title": nice_title(s["raw"]), "b": in_scope_b(s["id"]),
                      "count": len(by_sec.get(s["id"], []))} for s in sections],
        "questions": [{"id": f"{q['section']}-{q['n']}", "section": q["section"], "n": q["n"], "text": q["text"],
                       "options": q["options"], "correct": q["correct"], "images": q["images"], "page": q["page"]}
                      for q in questions],
    }
    json.dump(out, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    b_count = sum(1 for q in questions if in_scope_b(q["section"]))
    print(f"category B questions: {b_count}   images written: {n_img}   orphan image files: {len(orphans)}")
    print(f"problems: {len(bad)}")
    for b in bad:
        print("  -", b)


if __name__ == "__main__":
    main()
