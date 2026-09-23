/* Suspicious Login Detector — Map Slider SecOps dashboard logic + Leaflet/OSM map */
let sortDesc = true;
let filterRisk = 'all';
let selectedId = null;
let currentLogins = [];
let markers = [];
let map = null;
let leafletAvailable = false;
let highlightedMarker = null;

const RISK_COLOR = { High: '#ff3b5c', Medium: '#ffb800', Low: '#20e576' };

function ensureMap() {
  if (map) return;
  if (typeof L === 'undefined') { leafletAvailable = false; return; }
  leafletAvailable = true;
  map = L.map('map', { zoomControl: true }).setView([20, 40], 3);
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);
}

function markerIcon(risk) {
  const riskClass = risk.toLowerCase();
  return L.divIcon({
    className: '',
    html: `
      <div class="pin-target-marker ${riskClass}">
        <div class="pulse-ring"></div>
        <div class="center-dot">+</div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function initials(user) {
  if (!user) return '??';
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

  const totalElem = document.getElementById('summary-total');
  if (totalElem) totalElem.textContent = `${logins.length} logins loaded`;
  
  const totalNumElem = document.getElementById('summary-total-num');
  if (totalNumElem) totalNumElem.textContent = logins.length;

  const highElem = document.getElementById('summary-high');
  if (highElem) highElem.textContent = high;
  
  const medElem = document.getElementById('summary-med');
  if (medElem) medElem.textContent = med;
  
  const lowElem = document.getElementById('summary-low');
  if (lowElem) lowElem.textContent = low;

  const countElem = document.getElementById('table-count');
  if (countElem) countElem.textContent = `${logins.length} total`;

  updateScoreboardVisuals();
  renderTable(logins);
  renderMap(logins);
  renderZoneSidebar(logins);
  renderSliderDeck(logins);
  resetDetail();
}

function toggleScoreboardFilter(level) {
  if (filterRisk === level) {
    filterRisk = 'all';
  } else {
    filterRisk = level;
  }
  const selectElem = document.getElementById('filter-risk');
  if (selectElem) selectElem.value = filterRisk;
  updateScoreboardVisuals();
  if (currentLogins.length) {
    renderTable(currentLogins);
    renderSliderDeck(currentLogins);
  }
}

function updateScoreboardVisuals() {
  const cards = {
    all: document.getElementById('card-stat-total'),
    High: document.getElementById('card-stat-high'),
    Medium: document.getElementById('card-stat-med'),
    Low: document.getElementById('card-stat-low')
  };

  Object.keys(cards).forEach(key => {
    if (cards[key]) {
      if (filterRisk === key) {
        cards[key].classList.add('active-filter');
      } else {
        cards[key].classList.remove('active-filter');
      }
    }
  });
}

function filtered(logins) {
  const selectElem = document.getElementById('filter-risk');
  if (selectElem) filterRisk = selectElem.value;
  if (filterRisk === 'all') return logins.slice();
  return logins.filter(l => l.risk_level === filterRisk);
}

function renderTable(logins) {
  const tbody = document.getElementById('login-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const order = { High: 0, Medium: 1, Low: 2 };
  
  const rows = filtered(logins)
    .slice()
    .sort((a, b) => sortDesc
      ? order[a.risk_level] - order[b.risk_level]
      : order[b.risk_level] - order[a.risk_level]);

  rows.forEach(login => {
    const tr = document.createElement('tr');
    tr.dataset.id = login.id;
    tr.className = `border-${login.risk_level.toLowerCase()}`;
    if (String(selectedId) === String(login.id)) {
      tr.classList.add('active');
    }
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

function renderZoneSidebar(logins) {
  const zoneList = document.getElementById('zone-list');
  if (!zoneList) return;
  zoneList.innerHTML = '';

  const activeLogins = filtered(logins);
  const cities = Array.from(new Set(activeLogins.map(l => l.city)));

  cities.forEach(city => {
    const cityLogins = activeLogins.filter(l => l.city === city);
    const hasHigh = cityLogins.some(l => l.risk_level === 'High');
    const hasMed = cityLogins.some(l => l.risk_level === 'Medium');
    const badgeRisk = hasHigh ? 'High' : (hasMed ? 'Medium' : 'Low');

    const item = document.createElement('div');
    item.className = 'zone-item';
    item.dataset.city = city;
    item.innerHTML = `
      <span class="zone-name">${city}</span>
      <span class="zone-badge badge-${badgeRisk.toLowerCase()}">${cityLogins.length} events</span>
    `;
    item.addEventListener('click', () => {
      const match = cityLogins[0];
      if (match) selectLogin(match.id);
    });
    zoneList.appendChild(item);
  });
}

function renderSliderDeck(logins) {
  const slider = document.getElementById('event-slider');
  if (!slider) return;
  slider.innerHTML = '';

  const activeLogins = filtered(logins);
  activeLogins.forEach(login => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.dataset.id = login.id;
    if (String(selectedId) === String(login.id)) {
      card.classList.add('active');
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="city-title">${login.city}</span>
        <span class="badge badge-${login.risk_level.toLowerCase()}">${login.risk_level}</span>
      </div>
      <div class="user-name">👤 ${login.user}</div>
      <div class="meta">${login.timestamp}</div>
      <div class="meta mono" style="font-size:10px;">${login.device}</div>
    `;

    card.addEventListener('click', () => selectLogin(login.id));
    slider.appendChild(card);
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
    map.fitBounds(L.latLngBounds(valid.map(l => [l.lat, l.lon])), { padding: [40, 40], maxZoom: 6 });
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

  // Highlight table row
  document.querySelectorAll('#login-tbody tr').forEach(tr => {
    tr.classList.toggle('active', String(tr.dataset.id) === String(login.id));
  });

  // Highlight slider card
  document.querySelectorAll('.event-card').forEach(card => {
    const isTarget = String(card.dataset.id) === String(login.id);
    card.classList.toggle('active', isTarget);
    if (isTarget) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });

  // Highlight zone sidebar
  document.querySelectorAll('.zone-item').forEach(item => {
    item.classList.toggle('active', item.dataset.city === login.city);
  });

  // Focus map
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
    status.textContent = 'AUDITING';
    status.className = 'status-pill auditing';
  }
  if (!filled) return;

  const reasonHtml = reasons.length === 0
    ? `<div class="reason type-low"><span class="marker"></span>[INFO] No anomaly flags raised for this login event.</div>`
    : reasons.map(r => {
        const isHigh = r.toLowerCase().includes('travel') || r.toLowerCase().includes('new device');
        const prefix = isHigh ? '[ALERT]' : '[WARN]';
        const typeClass = isHigh ? 'type-high' : 'type-med';
        return `<div class="reason ${typeClass}"><span class="marker"></span>${prefix} ${r}</div>`;
      }).join('');

  filled.style.display = 'block';
  filled.innerHTML = `
    <div class="detail-header-row">
      <div>
        <div class="evt">EVENT #${login.id} // ${login.risk_level.toUpperCase()} RISK</div>
        <h4>${login.user}</h4>
        <div class="ts">${login.timestamp}</div>
      </div>
      <span class="badge badge-${login.risk_level.toLowerCase()}">${login.risk_level}</span>
    </div>
    <div class="fields-grid">
      <div class="field">
        <span class="label">LOCATION / IP</span>
        <span class="value">${login.city}</span>
        <span class="sub mono">${login.ip}</span>
      </div>
      <div class="field">
        <span class="label">DEVICE &amp; SCORE</span>
        <span class="value">${login.device}</span>
        <span class="sub mono">Risk score: ${login.risk_score}</span>
      </div>
    </div>
    <div class="reasons-block">
      <span class="label">// DETECTION REASONS &amp; HEURISTICS</span>
      ${reasonHtml}
    </div>
    <div class="guardrail">
      <span class="guardrail-icon">⭐</span>
      <span>This is a risk signal, not proof of compromise — a human should review it.</span>
    </div>
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
    status.textContent = 'READY';
    status.className = 'status-pill';
  }
  document.querySelectorAll('#login-tbody tr').forEach(tr => tr.classList.remove('active'));
  document.querySelectorAll('.event-card').forEach(card => card.classList.remove('active'));
  document.querySelectorAll('.zone-item').forEach(item => item.classList.remove('active'));
  if (highlightedMarker && map) highlightedMarker.closePopup();
  highlightedMarker = null;
}

function toggleSort() {
  sortDesc = !sortDesc;
  if (currentLogins.length) renderTable(currentLogins);
}

function exportHighRiskCSV() {
  const highRiskLogins = currentLogins.filter(l => l.risk_level === 'High');
  const headers = ['user', 'timestamp', 'ip', 'city', 'device', 'risk_level', 'risk_score', 'reasons'];
  
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = Array.isArray(val) ? val.join('; ') : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = [
    headers.join(','),
    ...highRiskLogins.map(l => [
      escapeCell(l.user),
      escapeCell(l.timestamp),
      escapeCell(l.ip),
      escapeCell(l.city),
      escapeCell(l.device),
      escapeCell(l.risk_level),
      escapeCell(l.risk_score),
      escapeCell(l.reasons)
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'high_risk_logins.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const sortHeader = document.getElementById('th-risk');
  if (sortHeader) sortHeader.addEventListener('click', toggleSort);
});