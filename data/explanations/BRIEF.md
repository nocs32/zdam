# Writing explanations for Здам

Здам is a study app for the Ukrainian driving theory exam (ПДР, category B), used at home by an older person. When they answer a question, the app shows why their pick is wrong and why the correct answer is right. You write those explanations for one batch of questions. Precision matters more than speed. A wrong explanation teaches a wrong rule.

## Inputs (paths relative to the zdam/ folder)
- `python -I scripts/batch.py <batch> --todo` prints your questions. The correct option is marked `*`; it comes from the official HSC answer key (order No. 190, 04.09.2025). Image paths are listed under each question. Use the Read tool to look at every image before explaining that question. Many answers depend entirely on the picture.
- `data/ref/pdr.txt` is the official ПДР text from zakon.rada.gov.ua, revision of 14.10.2026, including Додаток 1 (signs) and Додаток 2 (markings). Use Grep on it to confirm every clause you cite. Note that sign numbering in this revision may differ from the numbering in older textbooks (e.g. "Початок населеного пункту" is 5.49 here), so search by the sign name, not a number from memory.

## Output
Append one JSON object per question, one per line, to `data/explanations/<batch>.jsonl` (UTF-8, no pretty-printing). Write as you go, at least every 10 questions, so work survives an interruption. If the file already exists, keep its lines and continue with `--todo`.

```
{"id":"14-20","correct":"…","wrong":{"1":"…"},"rule":"ПДР 14.6 «а»","flag":null}
```

- `correct`: Ukrainian, 1–3 short sentences. Why the correct option is right. For picture questions, say what in the picture decides it (the sign, the light, who is on the main road, and so on).
- `wrong`: an object with one key per wrong option number (every option except the correct one). Ukrainian, one sentence each, saying specifically why that option is wrong. Don't just say "це неправильно". For combined options ("Відповіді 1 та 2"), say which part fails.
- `rule`: the clause(s) backing the answer, e.g. `"ПДР 14.6 «а»"`, `"ПДР 1.10 (термін «недостатня видимість»)"`, or `"ПДР, додаток 1, знак 5.49"`. Only cite what you confirmed in pdr.txt. For topics outside the ПДР (first aid, vehicle construction, law, ethics, safe driving), cite another source only if you are certain (e.g. `"КУпАП ст. 130"`); otherwise `null`.
- `flag`: `null` normally. Otherwise a short English note for the developer when any of these apply:
  - you believe the official answer is wrong
  - the rule in the current pdr.txt differs from what the official answer assumes (the rules may have changed since 09.2025)
  - the image is unreadable or missing something needed
  - the question is genuinely ambiguous

  Never change the official answer. Always explain the official answer, and use the flag to raise doubts.

## Style
- Plain, warm Ukrainian for an older learner. Short sentences, everyday words, no legal jargon unless the question is about a term. Use an impersonal or "ви" form.
- Keep each `correct` under ~60 words and each `wrong` entry under ~30 words.
- Don't repeat the question text back. Don't start with "Правильна відповідь…"; the app already shows which one is correct.
- Explain the reason, not just the rule number. Example: «Обгін на перехресті заборонений завжди, навіть якщо ви їдете головною дорогою — тут легко не помітити того, хто виїжджає збоку.»

## When you finish
Run `python -I scripts/batch.py <batch> --todo` again. It should report 0 questions left. Then reply with: the number of questions written, and a list of every flagged id with its flag note.
