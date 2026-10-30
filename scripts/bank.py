"""Build public/data/bank.json (what the app loads): category-B questions + explanations.

Run after build-data.py and whenever data/explanations/*.jsonl change:  python -I scripts/bank.py
Writes data/explanations/flags.md with every flagged explanation for review.
"""
import glob, json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    data = json.load(open(os.path.join(ROOT, "data", "questions.json"), encoding="utf-8"))
    ex, problems = {}, []
    for path in sorted(glob.glob(os.path.join(ROOT, "data", "explanations", "*.jsonl"))):
        for i, line in enumerate(open(path, encoding="utf-8"), 1):
            if not line.strip():
                continue
            try:
                e = json.loads(line)
                ex[e["id"]] = e
            except (json.JSONDecodeError, KeyError) as err:
                problems.append(f"{os.path.basename(path)}:{i}: {err}")

    # Plain-language notes shown in the app for flagged questions (outdated rule, unclear picture, source error).
    notes = json.load(open(os.path.join(ROOT, "data", "explanations", "notes.json"), encoding="utf-8"))

    sections = [s for s in data["sections"] if s["b"]]
    in_b = {s["id"] for s in sections}
    questions, flags, missing = [], [], 0
    for q in data["questions"]:
        if q["section"] not in in_b:
            continue
        item = {k: q[k] for k in ("id", "section", "n", "text", "options", "correct", "images")}
        e = ex.get(q["id"])
        if e:
            wrong = {k: v for k, v in (e.get("wrong") or {}).items() if k != str(q["correct"])}
            expected = {str(i) for i in range(1, len(q["options"]) + 1)} - {str(q["correct"])}
            if set(wrong) != expected:
                problems.append(f"{q['id']}: wrong-option keys {sorted(wrong)} != {sorted(expected)}")
            item["ex"] = {"correct": e["correct"], "wrong": wrong, "rule": e.get("rule")}
            if q["id"] in notes:
                item["ex"]["note"] = notes[q["id"]]
            if e.get("flag"):
                flags.append((q, e["flag"]))
                if q["id"] not in notes:
                    problems.append(f"{q['id']}: flagged but has no note in notes.json")
        else:
            missing += 1
        questions.append(item)

    for nid in sorted(set(notes) - {q["id"] for q in questions}):
        problems.append(f"{nid}: note in notes.json for an unknown question")

    os.makedirs(os.path.join(ROOT, "public", "data"), exist_ok=True)
    out = {"sections": [{"id": s["id"], "title": s["title"], "count": s["count"]} for s in sections], "questions": questions}
    json.dump(out, open(os.path.join(ROOT, "public", "data", "bank.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    with open(os.path.join(ROOT, "data", "explanations", "flags.md"), "w", encoding="utf-8") as f:
        f.write(f"# Flagged explanations ({len(flags)})\n\n")
        for q, flag in flags:
            f.write(f"- **{q['id']}** (PDF p.{q['page']}): {flag}\n  - Q: {q['text']}\n  - key: {q['correct']}) {q['options'][q['correct'] - 1]}\n")

    print(f"questions: {len(questions)}  with explanations: {len(questions) - missing}  missing: {missing}  flagged: {len(flags)}")
    for p in problems:
        print("  problem:", p)


if __name__ == "__main__":
    main()
