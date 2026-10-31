# Здам

A study app for the Ukrainian driving-theory exam (ПДР, category B), made for one person. Ukrainian interface, large type, works offline, and progress syncs between that person's devices.

- **Вчити за темами:** answer, then see straight away why your pick is right or wrong, with the ПДР clause behind it.
- **Пробний іспит:** 20 random questions, 20 minutes, the third mistake fails, then a full review.
- **Мої помилки:** every wrong answer lands here until it's answered right twice in a row.
- **Усі питання й відповіді:** search all 1,762 category-B questions.
- **Пристрої:** sync status, and a QR code or link to connect another device.

Hosted at https://zdam.timnox.dev by [tables-host](https://github.com/nocs32/tables-host) (not listed in its library: reached by the address only).

## On the Pi

tables-host builds this repo's `Dockerfile` as its `zdam` service: Caddy serves the app and sends `/api/*` to the sync server. Update with `cd ~/tables-host && git pull && ./deploy.sh zdam`.

The sync key is made once, in `~/tables-host`:

```bash
echo "ZDAM_KEY=$(openssl rand -hex 24)" > secrets/zdam.env
docker compose up -d zdam
```

Then open `https://zdam.timnox.dev/#k=<the key>` once on each of the person's devices, or open it on one and scan the QR code under **Пристрої** with the others. Changing the key disconnects every device until it gets the new link.

On an iPhone, Здам added to the Home Screen keeps its own storage, apart from Safari, so opening the link in Safari doesn't connect it. Copy the link instead, open Здам from the Home Screen, and tap **Вставити посилання** under **Пристрої**.

Progress (and one backup per day for 30 days) is in the `zdam-data` volume. To copy it out: `docker compose cp zdam:/data/progress.json .`

## Where the questions come from

The official HSC MVS question bank (order No. 190 of 04.09.2025) and its answer table. The two PDFs aren't in git; everything built from them is:

| File | What |
|---|---|
| `data/answer-key.txt` | The answer table, transcribed by hand from the scanned PDF (one line per section) |
| `data/questions.json`, `public/img/` | Every question, its options and pictures, parsed from the questions PDF |
| `data/ref/pdr.txt` | The official ПДР text (zakon.rada.gov.ua, revision of 14.10.2026), used to check explanations |
| `data/explanations/*.jsonl` | Why each answer is right and each other option wrong, with the clause |
| `data/explanations/notes.json` | Notes shown in the app on disputed questions (outdated rule, unclear picture, error in the bank) |
| `data/explanations/flags.md` | The review list those notes came from |
| `public/data/bank.json` | What the app loads: category-B questions with explanations |

To rebuild after changing any of it (needs Python 3 with `pymupdf` and `Pillow`, and the PDFs in `data/` as `questions.pdf` and `answers.pdf`):

```bash
npm run data
```

`python -I scripts/bank.py` alone is enough after editing explanations or notes.

## Develop

```bash
npm install
npm run dev
```

Sync needs the server running too, with a key:

```bash
ZDAM_KEY=dev-key-0123456789abcdef DATA_DIR=.scratch/sync-data npm run server
```

Then open http://localhost:5173/#k=dev-key-0123456789abcdef. `npm test` checks the progress merge.

## How sync works

Each device works from its own copy in the browser, so the app never waits for the network. In the background (on opening, a few seconds after each answer, when the app comes back on screen or back online, and every minute while open) it fetches the shared copy from the server, merges, and saves the result.

The merge goes entry by entry, by time: the newer answer to each question wins, a cleared mistake stays cleared, and exams from every device are kept. The server only stores the copy and refuses a save based on an outdated version, so a phone used offline can't overwrite what was done on the tablet. Text size stays per device.

The server (`server/server.mjs`, no dependencies) needs `ZDAM_KEY`; a device joins by opening `/#k=<key>` once.
