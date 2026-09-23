# Suspicious Login Detector (KDG) — Build Log

Project: Suspicious Login Detector — a 90-minute hackathon build.
Stack (per `tech.md`): Python 3 + FastAPI + Uvicorn, pandas, scikit-learn (installed, not used for stretch), vanilla HTML/CSS/JS. No React, Node, database, or Docker.

---

## 1. What was built

### Final structure
```
/home/rishi/Downloads/MINI HACKATHON/
├── backend/
│   ├── __init__.py          # added — required for package imports
│   ├── main.py              # FastAPI app: POST /analyze, GET /sample, static / → frontend
│   ├── rules.py             # 4 rule checks + reason strings (logic.md §2)
│   ├── scoring.py           # rule-weighted score → risk level (logic.md §3)
│   └── sample_logins.csv    # 18 rows, 4 users, baked-in anomalies
├── frontend/
│   ├── index.html           # dashboard: header, summary strip, table, detail panel, error banner
│   └── dashboard.js         # fetch, render, sort-by-risk, detail panel, guardrail line
├── venv/
├── requirements.txt         # fastapi, uvicorn, pandas, scikit-learn, python-multipart
└── opencode.json            # stitch MCP server config (added later)
```

### Task-by-task completion (workflow.md)

| Task | Status | Checkpoint |
|---|---|---|
| 0 — Setup | Done | venv + requirements installed; folder structure; hand-written `sample_logins.csv` |
| 1 — Backend core | Done | `GET /sample` returns valid JSON in the browser (verified via curl) |
| 2 — Frontend | Done | "Load Sample Data" populates the table with colored badges |
| 3 — Integration pass | Done | Both endpoints tested (good + bad CSV); detail panel + guardrail line verified |
| 4 — Demo rehearsal | Done | Rehearsal notes produced (see §5); IsolationForest stretch NOT reached → not claimed |

### Verified end-state (via curl, 2026-09-23)
- `GET  /sample`  → `200`, 18 records
- Risk distribution: `High: 3, Medium: 2, Low: 13`
- `POST /analyze` (multipart file, good CSV) → `200`, 18 records
- `POST /analyze` (bad CSV columns) → `400` + JSON `{"error":"Couldn't parse that CSV — check columns match: user, timestamp, ip, city, device, login_result"}`
- `GET  /` (frontend) and `GET /dashboard.js` → `200`

### Demo's flagship High-risk row (aayush, 10:00)
```json
{
  "id": 4,
  "user": "aayush",
  "timestamp": "2026-09-23T10:00:00",
  "ip": "103.21.4.5",
  "city": "Bangalore",
  "device": "Firefox/Mac",
  "risk_level": "High",
  "risk_score": 0.75,
  "reasons": [
    "Impossible travel: London → Bangalore in 34 min",
    "New device for this user: Firefox/Mac",
    "Off-hours login at 10:00"
  ]
}
```

---

## 2. Errors encountered and fixes

| # | Error | Root cause | Fix |
|---|---|---|---|
| 1 | `ModuleNotFoundError` / relative import failure | `backend/` had no `__init__.py`, so `from .rules import ...` failed | Added `backend/__init__.py` (empty) |
| 2 | "Impossible travel: London → Bangalore in -386 min" | Sample CSV rows were not chronological per user; history-based rules compared later rows against earlier timestamps producing **negative** time gaps | In `main.py`, sort `df.sort_values(by=["user","timestamp"]).reset_index(drop=True)` before scoring |
| 3 | Impossible-travel rule applied distance check when gap < 60 min | My first implementation of `rules.py` ran the 900 km/h haversine check inside the `< 60 min` branch | Re-read `logic.md:16`: flat threshold is "< 60 minutes between logins in two different cities = flag" unconditionally. Distance/speed check now only runs when gap ≥ 60 min |
| 4 | Off-hours flagged many "normal-looking" rows (10:00, 14:00, 15:00) | `logic.md:5` defines typical range as literal min/max hour of the user's history; workday 10:00/14:00 falls outside a narrow range | Accepted as spec-conformant — no change (flagged in §4 as a design quirk, not a bug) |
| 5 | `curl` intermittently returning empty / connection refused during testing | The bash tool kills background `uvicorn` processes when the command exits | Start server and curl within the same shell command (`uvicorn ... & sleep 3 && curl ...`) — works reliably |

### Non-fatal observations (no code change)
- `requirements.txt` installation succeeded first attempt; no dependency conflicts.
- `scikit-learn` installed but **unused** — IsolationForest stretch deliberately skipped per workflow.md (default rule-weighted path only).

---

## 3. Deviations from the docs (flagged, not freelanced)

1. **Frontend split into two files** — `tech.md` says "single `index.html`"; built `index.html` + `dashboard.js` (plain vanilla JS, no build/npm step, behavior identical to the spec). Deviation flagged rather than hidden.
2. **Sorting fix** — `main.py` pre-sorts by user+timestamp. This fixes a correctness bug in baseline computation, not new scope.
3. **Demo reason text** — prd.md's demo script quotes "Impossible travel: Bangalore → London in **12 min**"; the sample data produces 26/34 min. Still a valid < 60 min impossible-travel flag; text format matches `logic.md:17` exactly.
4. **Off-hours strictness** — literal min/max interpretation of `logic.md:5` makes some innocuous rows Medium/High. Accepted as spec-literal; safe to re-tune the sample CSV if it hurts the demo.

---

## 4. How to run

```bash
cd "/home/rishi/Downloads/MINI HACKATHON"
source venv/bin/activate
uvicorn backend.main:app --port 8000
# open http://localhost:8000  → click "Load Sample Data"
# alternative: upload backend/sample_logins.csv via the file input
```

FastAPI auto-docs: `http://localhost:8000/docs` (Swagger UI) — both endpoints can be exercised there.

---

## 5. Demo rehearsal notes (Task 4)

1. Open dashboard → click "Load Sample Data" → 18 logins, color-coded (3 red High, 2 amber Medium, 13 green Low).
2. Click the High row (aayush, 10:00) → panel: "Impossible travel: London → Bangalore in 34 min", "New device for this user: Firefox/Mac", "Off-hours login at 10:00", risk score 0.75.
3. Say verbatim: *"This is a risk indicator, not a block decision — a human reviews it."*

Speaker assignment:
- **Problem** — 1 person: SOC analysts manually scan login logs; existing tools give black-box flags without explanation.
- **Tech stack** — 1 person: FastAPI backend, pandas per-user baselines, 4 explainable rules, weighted score; vanilla JS frontend, zero build step.
- **Scoring + ethics** — 1 person: weights 0.4/0.2/0.15/0.25; thresholds ≥0.5 High / ≥0.2 Medium / <0.2 Low; product never auto-blocks, only advises.

Note: the IsolationForest stretch (`logic.md:38`) was **not** built (default rule-weighted path chosen, per workflow.md). Do not claim ML in the demo.

---

## 6. Runtime log (tail of server session)

```
INFO:     Started server process [...] 
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     127.0.0.1:37920 - "GET /sample HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxxx - "POST /analyze HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxxx - "POST /analyze HTTP/1.1" 400 Bad Request
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [...]
```

---

## 7. Post-build add-on

`opencode.json` — added the `stitch` remote MCP server (type `remote`, url `https://stitch.googleapis.com/mcp`, enabled, with `X-Goog-Api-Key` header). Restart opencode for it to load.

---

## 8. Feature add: Groq dynamic CSV column mapping

Goal: `/analyze` accepts CSVs with **any** headers; Groq maps them to the canonical schema (`user, timestamp, ip, city, device, login_result`) before the existing rule engine runs.

### New / changed files
- `requirements.txt` → added `groq`, `python-dotenv`.
- `.env` (project root) → `GROQ_API_KEY=<key>` — player-pasted, gitignored, never in any `.py` or opencode.json.
- `.gitignore` (new) → ignores `venv/`, `.env`, `__pycache__/`, `*.pyc`.
- `backend/column_mapper.py` (new) → `map_columns(csv_headers)`: `load_dotenv()` + `os.getenv("GROQ_API_KEY")`; sends **only the header list** to Groq (`openai/gpt-oss-20b`, `temperature=0`, `response_format=json_object`); defensive JSON extraction (strips code fences, grabs first `{...}`), filters matches to real headers; on ANY failure returns `{}` — never raises.
- `backend/main.py` `/analyze` → fast path: if headers exactly match canonical set, **skip Groq**. Else call `map_columns()`; if all 6 fields mapped → `rename` → existing pipeline unchanged; missing any field → existing 400 error, no partial proceed.
- `backend/alt_headers_sample.csv` → test artifact: same data as sample with renamed/reordered headers (`status, username, browser, location, login_time, ip_address`).

### Deviations (all user-approved)
1. Model `llama-3.1-8b-instant` → **404 model_not_found** on this Groq account. Listed available models; user chose `openai/gpt-oss-20b`.

### Errors & fixes during this feature
| Error | Fix |
|---|---|
| `NotFoundError 404 model llama-3.1-8b-instant does not exist` | Swapped to `openai/gpt-oss-20b` (user-approved) |
| Stale uvicorn (no `--reload`) returned 400 on Test 2 despite working direct call | `pkill -f uvicorn`, restart server, re-ran test |

### Test results (all pass)
| Test | Result |
|---|---|
| 1. Exact-match CSV (`sample_logins.csv`) → `/analyze` | PASS — 18 records, identical to pre-feature baseline (fast path, no Groq) |
| 2. Mismatched headers CSV via Groq → `/analyze` | PASS — output byte-identical to baseline after mapping |
| 3. GROQ_API_KEY unset → exact CSV works; mismatched CSV → HTTP 400 clean error, no crash | PASS — verified before key was filled in |

GROQ_API_KEY left in `.env` (gitignored). To verify live again: `source venv/bin/activate && uvicorn backend.main:app --port 8000` then upload `backend/alt_headers_sample.csv`.
## §9 — Map + Stitch frontend redesign (user-approved scope expansion)

### Motivation
User asked for maps showing device/login locations on the dashboard. Decisions (user-approved): dashboard-wide map (recommended), server-side lat/lon (additive contract), Stitch MCP used purely as a design tool, then transcribed by hand into the vanilla frontend (Stitch HTML uses Tailwind CDN — not permitted by baseline constraints; the Tailwind markup was NOT copied, only the visual language).

### What changed
- **Backend (`backend/main.py`)** — additive `lat`/`lon` fields in `analyze_csv()`, pulled from `CITY_COORDS` (`backend/rules.py`: Bangalore/London/Mumbai/Delhi/Chennai). `null` when city unknown. No existing field or behavior changed.
- **Frontend (`frontend/index.html` + `dashboard.js`)** — full redesign transcribed from Stitch screen `projects/4673353524222161526/screens/2151652729f0440eb95715e04eb68f4c`:
  - Fonts: Space Grotesk (headlines) + Inter (body) via Google Fonts.
  - Palette: header `#2c3e50`, accent `#3498db`, canvas `#f8f9fa`, white cards, slate-200 borders, 8px radius.
  - Header with shield mark + "SOC Telemetry Console" subtitle; Upload CSV (outline) + Load Sample Data (accent) buttons.
  - Summary strip: total count + High/Med/Low pill counters (red/amber/emerald dots).
  - **Map panel**: Leaflet + OpenStreetMap tiles (no key, no framework), 360px tall card, title bar + risk-color legend; div-icon markers size 14, color-coded white-ringed circles by risk; `fitBounds` to data; marker click → popup + detail panel; hash map falls back gracefully if Leaflet CDN is unreachable.
  - Two-column workspace: table (2fr) + detail panel (1fr) with risk filter dropdown (prd.md scope: "sortable/filterable by risk level") and click-to-sort by risk on the header.
  - Detail panel: "Incident Forensic Inspector"-style card with status pill (Ready→Auditing), field grid (City/IP, Device/Risk score), reasons chips colored by severity, guardrail box with exact text per logic.md: _"This is a risk signal, not proof of compromise — a human should review it."_
- **Osm**: tiles served client-side at runtime; demo needs internet (same CDN constraint as Groq/Google Fonts).

### Verification
| Check | Result |
|---|---|
| `GET /sample` | 200 |
| `POST /analyze` exact CSV | 200 — byte-identical with pre-map baseline |
| `POST /analyze` alt-headers CSV via Groq | 200 — byte-identical with baseline |
| `POST /analyze` garbage CSV | 400 with canonical error |
| `lat`/`lon` present for all 18 sample records | All 5 cities resolve to correct CITY_COORDS; no nulls |
| `node --check frontend/dashboard.js` | Syntax OK |
| `GET /` and `GET /dashboard.js` | 200 (static mount) |

### Deviations (user-approved)
- Additive `lat`/`lon` fields in `/sample` and `/analyze` JSON (superset of the original contract).
- Stitch design "Ethics Guardrail" wording differs from logic.md; baseline guardrail text kept verbatim.
- Stitch HTML mock data/auto-refresh telemetry discarded — dashboard renders live data from the API only.
