# FRONTEND — Loginfer Dashboard Spec (single `index.html`)

One file. No frameworks, no build step. Inline `<style>` and `<script>`.

## Layout
```
┌───────────────────────────────────────────┐
│  SUSPICIOUS LOGIN DETECTOR        [Upload] │  <- header bar, "Load Sample Data" button
├───────────────────────────────────────────┤
│  Summary strip: X logins · Y High · Z Med  │
├───────────────────────┬────────────────────┤
│  Table (left/main)     │  Detail panel      │
│  user | time | city |  │  (empty until a    │
│  device | risk-badge   │  row is clicked)   │
│  ...                   │  shows reasons list│
└───────────────────────┴────────────────────┘
```

## Elements
1. **Header**: title, a file `<input type="file">` (CSV only) + "Analyze" button, and a "Load Sample Data" button (calls `GET /sample` — always works, this is the demo safety net from `prd.md` §5).
2. **Summary strip**: total count + count per risk level, computed client-side from the response array.
3. **Table**: one row per login object. Columns: `user`, `timestamp`, `city`, `device`, `risk_level` (as a colored badge). Sortable by clicking the `risk_level` header (High first).
4. **Row click** → right-side detail panel shows: all fields + the `reasons` list as bullet points + the guardrail line (see `logic.md` §5): *"This is a risk signal, not proof of compromise — a human should review it."*

## Color mapping (must match `logic.md` risk levels exactly)
- `High` → red badge (`#e5484d`)
- `Medium` → amber badge (`#f5a623`)
- `Low` → green badge (`#2ecc71`)

## JS behavior (vanilla, no libraries)
```js
async function loadSample() {
  const res = await fetch('/sample');
  render(await res.json());
}

async function analyzeFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/analyze', { method: 'POST', body: form });
  render(await res.json());
}

function render(logins) {
  // 1. update summary strip counts
  // 2. clear + rebuild table rows, badge colored by risk_level
  // 3. wire each row's onclick -> renderDetail(login)
}

function renderDetail(login) {
  // fill right panel: fields + reasons <ul> + guardrail line
}
```

## Error handling (keep minimal but present)
- If `/analyze` returns non-200 (bad CSV columns): show a plain red banner: "Couldn't parse that CSV — check columns match: user, timestamp, ip, city, device, login_result" and suggest clicking "Load Sample Data".

## Explicitly out of scope for frontend (per `prd.md` §4)
- No charts/graphs beyond the summary strip.
- No login/auth screen.
- No CSS framework — plain CSS only, keep it fast to write.

## Related docs
- `tech.md` for the exact `/analyze` and `/sample` endpoints and JSON shape this file consumes.
- `logic.md` for what `risk_level` and `reasons` mean.
