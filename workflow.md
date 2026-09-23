# WORKFLOW — Loginfer 90-Minute Build Plan

Do these tasks **in this order**. Timebox each one — if a task overruns, cut scope per `prd.md` §4, don't cut the next task's time.

## Task 0 — Setup (0:00–0:10, 10 min)
- Create the folder structure from `tech.md`.
- `venv` + `pip install -r requirements.txt`.
- Hand-write `backend/sample_logins.csv` (~15–20 rows, 3–4 users, with 2–3 obvious anomalies baked in: one impossible-travel pair, one new device, one off-hours, one failed-attempt burst) — this is your demo-safety-net and your test data at the same time.
- Commit / save a checkpoint.

## Task 1 — Backend core (0:10–0:40, 30 min)
- `rules.py`: implement the 4 rule functions from `logic.md` §2.
- `scoring.py`: implement the default rule-weighted score from `logic.md` §3 (skip the IsolationForest stretch for now).
- `main.py`: FastAPI app with `POST /analyze` (reads uploaded CSV via pandas, runs rules+scoring per row, returns JSON per `tech.md`'s contract) and `GET /sample` (same pipeline on the bundled CSV).
- Test with `curl` or `/docs` (FastAPI auto Swagger UI) before touching frontend — confirm the JSON shape matches `tech.md` exactly.
- **Checkpoint: `GET /sample` returns correct JSON in the browser.** Do not proceed until this works.

## Task 2 — Frontend (0:40–1:05, 25 min)
- Build `frontend/index.html` per `frontend.md`: header, summary strip, table, detail panel, plain CSS, vanilla JS calling `/sample` and `/analyze`.
- Serve it as a static file from FastAPI (`main.py`: mount `/` to `frontend/index.html`).
- **Checkpoint: clicking "Load Sample Data" populates the table with colored badges.**

## Task 3 — Integration pass + polish (1:05–1:20, 15 min)
- Click through every row, confirm the detail panel + reasons show correctly.
- Try uploading the sample CSV manually through the file input (not just the `/sample` button) to confirm `/analyze` path also works.
- Add the ethics guardrail line (from `logic.md` §5) to the detail panel if not already there.
- Fix any obvious CSS ugliness — don't chase perfection.

## Task 4 — Demo rehearsal (1:20–1:30, 10 min)
- Run the exact script from `prd.md` §5, out loud, once, as a team.
- Assign who explains: problem (1 person), tech stack (1 person), the scoring logic + ethics guardrail (1 person) — everyone must understand it per hackathon rules.
- If IsolationForest stretch (`logic.md` §3) was reached, mention it as a bonus; if not, don't claim it.

## If you're behind schedule — cut order (matches `prd.md` §4 "out of scope")
1. Drop the "sort by risk" table feature first.
2. Drop 1–2 of the 4 rule checks (keep impossible-travel + new-device, they're the most visually convincing).
3. Never drop: the `/sample` endpoint and the color-coded table — that's the whole demo.

## Related docs
Every task above references a specific section of `prd.md`, `tech.md`, `logic.md`, or `frontend.md` — check those, don't improvise new scope mid-build.
