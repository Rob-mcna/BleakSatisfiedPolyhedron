// Demo well data
const wells = [
  { id: 'Well-1', country: 'Country A', field: 'Field 1', platform: 'Platform X', status: 'OK' },
  { id: 'Well-2', country: 'Country A', field: 'Field 1', platform: 'Platform X', status: 'OK' },
  { id: 'Well-3', country: 'Country B', field: 'Field 2', platform: 'Platform Y', status: 'Fail' },
  { id: 'Well-4', country: 'Country A', field: 'Field 2', platform: 'Platform X', status: 'Warning' },
  { id: 'Well-5', country: 'Country B', field: 'Field 1', platform: 'Platform Y', status: 'OK' },
  { id: 'Well-6', country: 'Country A', field: 'Field 1', platform: 'Platform X', status: 'Fail' },
  { id: 'Well-7', country: 'Country B', field: 'Field 2', platform: 'Platform Y', status: 'OK' },
  { id: 'Well-8', country: 'Country A', field: 'Field 2', platform: 'Platform X', status: 'Warning' },
  { id: 'Well-9', country: 'Country B', field: 'Field 1', platform: 'Platform Y', status: 'OK' },
  { id: 'Well-10', country: 'Country A', field: 'Field 2', platform: 'Platform X', status: 'OK' },
  { id: 'Well-11', country: 'Country B', field: 'Field 1', platform: 'Platform Y', status: 'OK' },
  { id: 'Well-12', country: 'Country A', field: 'Field 1', platform: 'Platform X', status: 'OK' }
];
// Demo numbers
const demoRepairCount = 3;
const demoDeviationCount = 1;

function renderDashboard() {
  // Get filter values
  const fCountry = document.getElementById('filterCountry').value;
  const fField = document.getElementById('filterField').value;
  const fPlatform = document.getElementById('filterPlatform').value;
  const fStatus = document.getElementById('filterStatus').value;

  // Filter wells
  let filtered = wells.filter(w =>
    (!fCountry || w.country === fCountry) &&
    (!fField || w.field === fField) &&
    (!fPlatform || w.platform === fPlatform) &&
    (!fStatus || w.status === fStatus)
  );

  // KPIs
  document.getElementById('kpiWells').textContent = filtered.length;
  document.getElementById('kpiOK').textContent = filtered.filter(w => w.status === 'OK').length;
  document.getElementById('kpiWarning').textContent = filtered.filter(w => w.status === 'Warning').length;
  document.getElementById('kpiFail').textContent = filtered.filter(w => w.status === 'Fail').length;
  document.getElementById('kpiRepairs').textContent = demoRepairCount;
  document.getElementById('kpiDeviations').textContent = demoDeviationCount;

  // Well cards
  const board = document.getElementById('wellStatusBoard');
  board.innerHTML = '';
  filtered.forEach(well => {
    const color = well.status === 'OK' ? 'green' : well.status === 'Warning' ? 'yellow' : 'red';
    const card = document.createElement('div');
    card.className = `well-card ${color}`;
    card.innerHTML = `
      <div class="well-circle ${color}"></div>
      <div class="well-name">${well.id}</div>
      <div class="well-status">${well.status}</div>
    `;
    // Click handler: to be replaced with navigation to well details
    card.onclick = () => alert('Go to details for ' + well.id);
    board.appendChild(card);
  });
}

// Attach filter handlers
function attachDashboardFilters() {
  ['filterCountry', 'filterField', 'filterPlatform', 'filterStatus'].forEach(id => {
    document.getElementById(id).onchange = renderDashboard;
  });
}

// Call this on page load or when switching to dashboard
function initDashboard() {
  attachDashboardFilters();
  renderDashboard();
}