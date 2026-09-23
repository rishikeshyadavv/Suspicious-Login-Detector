# LOGIC — Detection Rules & Risk Scoring

This is the "AI + cyber" brain referenced in `tech.md`'s `rules.py` / `scoring.py`. Keep it simple — explainability beats complexity in a 90-minute build.

## 1. Baseline per user
For each `user` in the CSV, compute from their *other* rows (their history):
- Set of previously-seen `city` values.
- Set of previously-seen `device` values.
- Typical login hour range (min/max hour of day).

First-ever row for a user = "cold start" → rule-only, low-confidence scoring (per PRD mitigation plan).

## 2. Rule checks (each returns True/False + a reason string)
Implement these four, in this order of priority:

1. **Impossible travel** — same user, two logins whose cities differ, and the time gap between them is too small for real travel (use a flat threshold: distance-independent version for time — "< 60 minutes between logins in two different cities" = flag; if time allows, use straight-line km / assumed 900 km/h max travel speed).
   - Reason text: `"Impossible travel: {city_a} → {city_b} in {minutes} min"`
2. **New device** — `device` not in the user's previously-seen device set.
   - Reason text: `"New device for this user: {device}"`
3. **Off-hours login** — login hour falls outside the user's typical hour range (or, cold start: outside 6am–11pm as a generic default).
   - Reason text: `"Off-hours login at {time}"`
4. **Failed-attempt burst** — `login_result == "fail"` appears 3+ times for the same user within a short window (e.g. same hour) right before this row.
   - Reason text: `"{n} failed attempts before this login"`

## 3. Combining into a risk score (time-boxed decision — pick ONE path, do not do both)
**Default path (do this unless far ahead of schedule): Rule-weighted score.**
```
score = 0
+ 0.4 if impossible_travel
+ 0.2 if new_device
+ 0.15 if off_hours
+ 0.25 if failed_burst
```
- `score >= 0.5` → **High**
- `0.2 <= score < 0.5` → **Medium**
- `score < 0.2` → **Low**

**Stretch path (only if Phase 1+2 of workflow.md finish early):** feed engineered features (num_flags_triggered, hour, is_new_device, is_new_city) per row into `sklearn.ensemble.IsolationForest`, blend its anomaly score 50/50 with the rule score above. Never replace rules entirely — the reasons list must always come from the rule checks, since IsolationForest can't explain itself.

## 4. Output object (must match `tech.md` API contract exactly)
```python
{
  "risk_level": "High" | "Medium" | "Low",
  "risk_score": float,        # 0.0–1.0
  "reasons": [str, ...]        # empty list allowed for Low risk
}
```

## 5. Ethics guardrails (from the source deck — keep these true in the UI copy too)
- Output is a **risk indicator**, never an auto block/allow decision.
- Always show: *"This is a risk signal, not proof of compromise — a human should review it."*
- No raw PII beyond what's in the demo CSV; nothing is persisted to disk.

## Related docs
- `tech.md` for where these functions live (`rules.py`, `scoring.py`) and the exact API shape.
- `frontend.md` for how `risk_level` drives row color and the detail panel.
