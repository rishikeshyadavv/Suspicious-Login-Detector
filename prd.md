# PRD — Suspicious Login Detector (KDG)

## 1. One-liner
A dashboard where an analyst uploads a login log (CSV) and instantly gets, per login, a **risk verdict (Low/Medium/High)** with **plain-English reasons**, by combining rule checks + an ML anomaly score.

## 2. Why (problem)
SOC analysts manually scan thousands of login events to catch account takeovers. Most tools give a black-box "suspicious" flag with no explanation. We need something explainable and fast to build.

## 3. Who it's for
- Primary: SOC analyst / IT security reviewer (our demo persona: the jury acting as the analyst).
- Secondary: any team that wants a lightweight login-anomaly checker.

## 4. Scope for the 1.5 hr build (LOCKED — do not add anything not listed here)
**In scope (MVP, must work in the demo):**
1. Upload a CSV of login events (or use a bundled sample CSV — always have this as backup).
2. Backend computes, per row:
   - Rule flags: impossible travel, off-hours login, new device, failed-attempt burst.
   - One simple anomaly score (Isolation Forest OR pure rule-score — see `logic.md` for the exact, time-boxed choice).
   - Combined risk level: Low / Medium / High.
   - A short list of human-readable reasons.
3. Dashboard table showing all logins, color-coded by risk, sortable/filterable by risk level.
4. Click a row → detail panel with the reasons.
5. Everything runs locally, no signup, no paid API key.

**Explicitly OUT of scope (do not build, no matter how tempting):**
- Real-time streaming / live agents on endpoints.
- User accounts, auth, database persistence.
- Auto-blocking or auto-response actions (we only advise, per ethics rule from the deck).
- Multi-page app, charts/analytics beyond the table + one summary strip.
- Any paid API (no OpenAI key, no paid GeoIP, no paid hosting).

## 5. Success = Demo script (this is what "done" means)
1. Open dashboard → click "Load Sample Data" (or upload CSV).
2. Table populates with N logins, color-coded.
3. Click a High-risk row → panel shows: "Impossible travel: Bangalore → London in 12 min", "New device", risk score.
4. State out loud: "This is a risk indicator, not a block decision — a human reviews it." (matches our ethics slide).

## 6. Constraints
- Total build time: **1.5 hours**. Everything must be free/open-source, no signup friction.
- Team must be able to explain every part (per hackathon rule: AI-assisted is fine, but everyone must understand it).
- No real PII: use the bundled simulated/sample dataset for the demo.

## 7. Related docs
- `tech.md` — exact stack, install commands, file layout.
- `logic.md` — the rules + scoring formula (the actual "AI/cyber" brain).
- `frontend.md` — dashboard UI spec.
- `workflow.md` — the 90-minute build plan, task-by-task, in order.
