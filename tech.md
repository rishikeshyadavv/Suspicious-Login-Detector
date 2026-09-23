# TECH — Stack & Setup

All choices are free/open-source. No API keys, no signups, no paid services.

## Stack
| Layer | Choice | Why |
|---|---|---|
| Backend | Python 3 + **FastAPI** + **Uvicorn** | Fast to stand up, auto docs at `/docs`, easy JSON API |
| Data handling | **pandas** | CSV parsing, groupby-per-user baseline |
| Anomaly model | **scikit-learn** `IsolationForest` (optional stretch — see `logic.md` §3) | Free, no training data needed beyond the log itself |
| Geo lookups | Static lookup table we hand-write (city → lat/lon) OR free `geopy`/no lib at all | Avoids needing a paid/keyed GeoIP DB under time pressure |
| Frontend | Plain **HTML + CSS + vanilla JS** (single `index.html`) | Zero build step, zero npm install, fastest to vibe-code |
| Data transfer | `fetch()` to FastAPI JSON endpoint | No framework needed |
| Hosting (demo) | `uvicorn` on `localhost:8000`, frontend served as static file from FastAPI | One process, nothing to deploy |

No React, no Node, no database, no Docker. This is intentional — every extra tool is time you don't have.

## Project structure
```
suspicious-login-detector/
├── backend/
│   ├── main.py          # FastAPI app, all endpoints
│   ├── rules.py         # rule-check functions (see logic.md)
│   ├── scoring.py        # combines rules (+ optional IsolationForest) into risk level
│   └── sample_logins.csv # bundled demo data (backup if upload fails)
├── frontend/
│   └── index.html        # dashboard: table + detail panel + CSS + JS inline
└── requirements.txt
```

## requirements.txt
```
fastapi
uvicorn
pandas
scikit-learn
python-multipart
```

## Install & run (do this first, before writing any logic — see workflow.md Task 0)
```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```
Then open `http://localhost:8000` in a browser.

## API contract (frontend ↔ backend — must match `frontend.md` exactly)
### `POST /analyze`
- Input: multipart file upload, field name `file`, a CSV with columns:
  `user, timestamp, ip, city, device, login_result`
- Output: JSON array, one object per login row:
```json
[
  {
    "id": 0,
    "user": "aayush",
    "timestamp": "2026-09-23T09:14:00",
    "ip": "103.21.4.5",
    "city": "Bangalore",
    "device": "Chrome/Windows",
    "risk_level": "High",
    "risk_score": 0.87,
    "reasons": ["Impossible travel: Bangalore → London in 12 min", "New device for this user"]
  }
]
```

### `GET /sample`
- No input. Returns the same JSON shape as `/analyze`, computed on the bundled `sample_logins.csv`. This is the demo-safety-net button.

## Sample CSV columns (exact — logic.md depends on these names)
```
user,timestamp,ip,city,device,login_result
```

## Related docs
- `logic.md` for what happens *inside* `/analyze`.
- `frontend.md` for exactly how `index.html` calls these two endpoints and renders the result.
- `workflow.md` for build order.
