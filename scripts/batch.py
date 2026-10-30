"""Print one explanation batch as plain text: python -I scripts/batch.py b07 [--todo]

--todo skips questions already present in data/explanations/<batch>.jsonl (for resuming).
"""
import json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (section, first n, last n); None = whole section. Balanced to ~170 questions each.
BATCHES = {
    "b01": [("1",), ("2",), ("3",), ("4",), ("5",)],
    "b02": [("6",), ("7",), ("8.1",), ("8.2",), ("9",)],
    "b03": [("10",), ("11",), ("12",), ("13",)],
    "b04": [("14",), ("15",), ("17",)],
    "b05": [("16.1",), ("16.2",), ("18",)],
    "b06": [(s,) for s in ["19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32"]],
    "b07": [("33", 1, 180)],
    "b08": [("33", 181, 357)],
    "b09": [("35",)],
    "b10": [(s,) for s in ["34", "36", "37", "38", "39", "44", "45", "46", "47"]],
}


def questions(batch):
    data = json.load(open(os.path.join(ROOT, "data", "questions.json"), encoding="utf-8"))
    titles = {s["id"]: s["title"] for s in data["sections"]}
    out = []
    for spec in BATCHES[batch]:
        sec, lo, hi = (spec + (1, 10**6))[:3]
        out += [(titles[sec], q) for q in data["questions"] if q["section"] == sec and lo <= q["n"] <= hi]
    return out


def main():
    batch = sys.argv[1]
    done = set()
    path = os.path.join(ROOT, "data", "explanations", f"{batch}.jsonl")
    if "--todo" in sys.argv and os.path.exists(path):
        done = {json.loads(l)["id"] for l in open(path, encoding="utf-8") if l.strip()}
    items = [(t, q) for t, q in questions(batch) if q["id"] not in done]
    print(f"# batch {batch}: {len(items)} questions to do ({len(done)} already done)\n")
    last = None
    for title, q in items:
        if title != last:
            print(f"\n## Розділ {q['section']}. {title}\n")
            last = title
        print(f"[{q['id']}] {q['text']}")
        for img in q["images"]:
            print(f"  image: public/img/{img}")
        for i, o in enumerate(q["options"], 1):
            print(f"  {'*' if i == q['correct'] else ' '}{i}) {o}")
        print()


if __name__ == "__main__":
    main()
