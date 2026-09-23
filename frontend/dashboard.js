/* Suspicious Login Detector — dashboard logic + Leaflet/OSM map */
let sortDesc = true;
let filterRisk = 'all';
let selectedId = null;
let currentLogins = [];
let markers = [];
let map = null;
let leafletAvailable = false;
let highlightedMarker = null;

const RISK_COLOR = { High: '#e5484d', Medium: '#f5a623', Low: '#2ecc71' };

function ensureMap() {
  if (map) return;
  if (typeof L === 'undefined') { leafletAvailable = false; return; }
  leafletAvailable = true;
  map = L.map('map', { zoomControl: true }).setView([20, 40], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

function markerIcon(risk) {
  return L.divIcon({
    className: '',
    html: `<div class="risk-marker ${risk.toLowerCase()}" style="width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function initials(user) {
  return user.slice(0, 2).toUpperCase();
}

async function loadSample() {
  hideError();
  try {
    const res = await fetch('/sample');
    if (!res.ok) { showError(); return; }
    render(await res.json());
  } catch (e) { showError(); }
}

async function analyzeFile(file) {
  hideError();
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/analyze', { method: 'POST', body: form });
    if (!res.ok) { showError(); return; }
    render(await res.json());
  } catch (e) { showError(); }
}

function showError() {
  const b = document.getElementById('error-banner');
  if (b) {
    b.innerHTML = "Couldn't parse that CSV — check columns match: user, timestamp, ip, city, device, login_result. Click 'Load Sample Data' instead.";
    b.style.display = 'block';
  }
}

function hideError() {
  const b = document.getElementById('error-banner');
  if (b) b.style.display = 'none';
}

function render(logins) {
  currentLogins = logins;
  window.__lastLogins = logins;
  hideError();
  selectedId = null;

  const high = logins.filter(l => l.risk_level === 'High').length;
  const med = logins.filter(l => l.risk_level === 'Medium').length;
  const low = logins.filter(l => l.risk_level === 'Low').length;

  document.getElementById('summary-total').textContent = `${logins.length} logins`;
  document.getElementById('summary-high').textContent = high;
  document.getElementById('summary-med').textContent = med;
  document.getElementById('summary-low').textContent = low;

  document.getElementById('table-count').textContent = `${logins.length} total`;

  // Table
  renderTable(logins);
  // Map
  renderMap(logins);
  // Reset detail
  resetDetail();
}

function filtered(logins) {
  filterRisk = document.getElementById('filter-risk').value;
  if (filterRisk === 'all') return logins.slice();
  return logins.filter(l => l.risk_level === filterRisk);
}

function renderTable(logins) {
  const tbody = document.getElementById('login-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const order = { High: 0, Medium: 1, Low: 2 };
  filtered(logins)
    .slice()
    .sort((a, b) => sortDesc
      ? order[a.risk_level] - order[b.risk_level]
      : order[b.risk_level] - order[a.risk_level])
    .forEach(login => {
      const tr = document.createElement('tr');
      tr.dataset.id = login.id;
      tr.className = `border-${login.risk_level.toLowerCase()}`;
      tr.innerHTML = `
        <td><span class="user-cell"><span class="avatar">${initials(login.user)}</span>${login.user}</span></td>
        <td><span class="ts">${login.timestamp}</span></td>
        <td>${login.city}</td>
        <td>${login.device}</td>
        <td><span class="badge badge-${login.risk_level.toLowerCase()}">${login.risk_level}</span></td>`;
      tr.addEventListener('click', () => selectLogin(login.id));
      tbody.appendChild(tr);
    });
}

function renderMap(logins) {
  ensureMap();
  if (!leafletAvailable) { markers = []; return; }
  markers.forEach(x => map.removeLayer(x.marker));
  markers = [];

  const valid = logins.filter(l => typeof l.lat === 'number' && typeof l.lon === 'number');
  valid.forEach(login => {
    const m = L.marker([login.lat, login.lon], { icon: markerIcon(login.risk_level) });
    m.bindPopup(`<strong>${login.user}</strong><br/>${login.city}<br/>${login.device}<br/>Risk: <b>${login.risk_level}</b>`);
    m.on('click', () => selectLogin(login.id));
    m.addTo(map);
    markers.push({ login, marker: m });
  });

  if (valid.length > 0) {
    map.fitBounds(L.latLngBounds(valid.map(l => [l.lat, l.lon])), { padding: [30, 30], maxZoom: 6 });
  }
  const overlay = document.getElementById('map-overlay');
  if (overlay) {
    if (markers.length === 0) {
      overlay.style.display = 'block';
      overlay.textContent = 'No geocoded logins to plot';
    } else {
      overlay.style.display = 'none';
    }
  }
}

function markerForLogin(login) {
  const entry = markers.find(x => x.login.id === login.id);
  return entry ? entry.marker : null;
}

function selectLogin(id) {
  const login = currentLogins.find(l => String(l.id) === String(id));
  if (!login) return;
  selectedId = login.id;

  document.querySelectorAll('#login-tbody tr').forEach(tr => {
    tr.classList.toggle('active', String(tr.dataset.id) === String(login.id));
  });

  const m = markerForLogin(login);
  if (m && map) {
    map.panTo(m.getLatLng());
    if (highlightedMarker && highlightedMarker !== m) highlightedMarker.closePopup();
    m.openPopup();
    highlightedMarker = m;
  }

  renderDetail(login);
}

function renderDetail(login) {
  const empty = document.getElementById('detail-empty');
  const filled = document.getElementById('detail-filled');
  const status = document.getElementById('detail-status-pill');
  const reasons = login.reasons || [];
  if (empty) empty.style.display = 'none';
  if (status) {
    status.textContent = 'Auditing';
    status.className = 'status-pill auditing';
  }
  if (!filled) return;

  const reasonHtml = reasons.length === 0
    ? `<div class="reason type-low"><span class="marker"></span>No anomaly flags raised for this login.</div>`
    : reasons.map(r =>
        `<div class="reason ${r.toLowerCase().includes('travel') || r.toLowerCase().includes('new device') ? 'type-high' : 'type-med'}"><span class="marker"></span>${r}</div>`
      ).join('');

  filled.style.display = 'block';
  filled.innerHTML = `
    <div class="detail-header-row">
      <div>
        <div class="evt">Event #${login.id} · ${login.risk_level} risk</div>
        <h4>${login.user}</h4>
        <div class="ts">${login.timestamp}</div>
      </div>
      <span class="badge badge-${login.risk_level.toLowerCase()}">${login.risk_level}</span>
    </div>
    <div class="fields-grid">
      <div class="field">
        <span class="label">City / IP</span>
        <span class="value">${login.city}</span>
        <span class="sub mono">${login.ip}</span>
      </div>
      <div class="field">
        <span class="label">Device</span>
        <span class="value">${login.device}</span>
        <span class="sub">Risk score ${login.risk_score}</span>
      </div>
    </div>
    <div class="reasons-block">
      <span class="label">Detection Reasons &amp; Heuristics</span>
      ${reasonHtml}
    </div>
    <div class="guardrail">&#11088; <span>This is a risk signal, not proof of compromise — a human should review it.</span></div>
  `;
}

function resetDetail() {
  selectedId = null;
  const empty = document.getElementById('detail-empty');
  const filled = document.getElementById('detail-filled');
  const status = document.getElementById('detail-status-pill');
  if (empty) empty.style.display = 'flex';
  if (filled) filled.style.display = 'none';
  if (status) {
    status.textContent = 'Ready';
    status.className = 'status-pill';
  }
  document.querySelectorAll('#login-tbody tr').forEach(tr => tr.classList.remove('active'));
  if (highlightedMarker && map) highlightedMarker.closePopup();
  highlightedMarker = null;
}

function toggleSort() {
  sortDesc = !sortDesc;
  if (currentLogins.length) renderTable(currentLogins);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('th-risk').addEventListener('click', toggleSort);
});