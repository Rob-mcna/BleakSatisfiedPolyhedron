// --- MAASP Data Example (replace or connect to your real data source) ---
const allMaaspData = {
  "Well-1": [
    { date: "2025-05-01", measured: 1500, maasp: 1800 },
    { date: "2025-05-08", measured: 1750, maasp: 1800 },
    { date: "2025-05-15", measured: 1850, maasp: 1800 },
    { date: "2025-05-22", measured: 1700, maasp: 1800 }
  ],
  "Well-2": [
    { date: "2025-05-01", measured: 1300, maasp: 1600 },
    { date: "2025-05-08", measured: 1550, maasp: 1600 },
    { date: "2025-05-15", measured: 1650, maasp: 1600 },
    { date: "2025-05-22", measured: 1500, maasp: 1600 }
  ]
};

// --- MAASP Chart for Well Details Modal ---
function showWellMaasp(wellId) {
  const block = document.getElementById('wellMaaspBlock');
  if (!allMaaspData[wellId]) {
    block.style.display = "none";
    return;
  }
  block.style.display = "block";
  renderMaaspChart(
    'wellMaaspChart',
    'wellMaaspErrors',
    allMaaspData[wellId]
  );
}

// --- MAASP Chart for Data Section ---
function populateDataMaaspWellSelect() {
  const select = document.getElementById('dataMaaspWellSelect');
  select.innerHTML = '';
  Object.keys(allMaaspData).forEach(wellId => {
    const option = document.createElement('option');
    option.value = wellId;
    option.textContent = wellId;
    select.appendChild(option);
  });
}
function renderDataMaaspChart() {
  const wellId = document.getElementById('dataMaaspWellSelect').value;
  renderMaaspChart(
    'dataMaaspChart',
    'dataMaaspErrors',
    allMaaspData[wellId]
  );
}

// --- Main chart rendering with improved error handling ---
function renderMaaspChart(canvasId, errorDivId, maaspData) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const measured = maaspData.map(d => d.measured);
  const maasp = maaspData.map(d => d.maasp);
  const labels = maaspData.map(d => d.date);
  const measuredMA = movingAverage(measured, 3);

  // Collect error points (measured > maasp)
  const errorPoints = maaspData
    .map((d, i) => d.measured > d.maasp ? { ...d, index: i } : null)
    .filter(Boolean);

  renderMaaspErrorTable(errorPoints, "maaspErrorTableBlock");

  // Prepare error messages
  const errors = errorPoints.map(e =>
    `On ${e.date}, measured pressure (<b>${e.measured} psi</b>) exceeded MAASP (<b>${e.maasp} psi</b>)!`
  );

  // Destroy previous chart if exists
  if (ctx._chartInstance) ctx._chartInstance.destroy();
  if (globalMaaspChart) globalMaaspChart.destroy();

  // --- CHART ---
  globalMaaspChart = ctx._chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Measured Pressure (psi)',
          data: measured,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: false,
          tension: 0.2,
          pointBackgroundColor: measured.map((v, i) => v > maasp[i] ? '#f33' : '#1976d2'),
          pointBorderColor: measured.map((v, i) => v > maasp[i] ? '#f33' : '#1976d2'),
          pointRadius: measured.map((v, i) => v > maasp[i] ? 7 : 5)
        },
        {
          label: 'MAASP Limit (psi)',
          data: maasp,
          borderColor: '#e53935',
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Measured Pressure (3-point MA)',
          data: measuredMA,
          borderColor: '#ff9800',
          borderDash: [2, 2],
          borderWidth: 2,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const idx = context.dataIndex;
              const maaspValue = context.chart.data.datasets[1].data[idx];
              let label = `Measured: ${value} psi`;
              if (context.datasetIndex === 0 && value > maaspValue) {
                label += " ⚠️ EXCEEDED MAASP!";
              }
              return label;
            }
          }
        },
        title: { display: false }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Pressure (psi)' }
        }
      }
    }
  });

  // --- ERROR SUMMARY + LIST ---
  const errorDiv = document.getElementById(errorDivId);
  if (errors.length) {
    errorDiv.innerHTML = `
      <span style="color:#fa0;font-weight:bold;">
        ⚠️ ${errors.length} MAASP exceedance${errors.length > 1 ? 's' : ''} detected!
        <br>Last exceedance: <b>${errorPoints.slice(-1)[0].date}</b>
      </span>
      <ul style="color:#f55; margin-top:6px; padding-left:20px;">
        ${errorPoints.map((e,i) =>
          `<li style="cursor:pointer;text-decoration:underline;" onclick="highlightChartPoint(${e.index})">${errors[i]}</li>`
        ).join('')}
      </ul>`;
  } else {
    errorDiv.innerHTML = '<span style="color:#090;">No MAASP exceedances detected.</span>';
  }
}
// --- Integration Hooks ---
// Call this when showing a well's details modal:
     //showWellMaasp(wellId);

// Call these when showing the Data section:
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dataMaaspWellSelect')) {
    populateDataMaaspWellSelect();
    renderDataMaaspChart();
    document.getElementById('dataMaaspWellSelect').addEventListener('change', renderDataMaaspChart);
  }
});










// NEW SECTION: MAASP ISSUE REPORTING/CORRECTION WORKFLOW

// --- Utility: Compute moving average (already provided, keep it if present) ---
let globalMaaspChart = null;

function movingAverage(arr, windowSize = 3) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    let start = Math.max(0, i - windowSize + 1);
    let window = arr.slice(start, i + 1);
    result.push(window.reduce((sum, val) => sum + val, 0) / window.length);
  }
  return result;
}

// --- Highlight a chart point when an error is clicked ---
function highlightChartPoint(idx) {
  if (!globalMaaspChart) return;
  globalMaaspChart.setActiveElements([
    { datasetIndex: 0, index: idx }
  ]);
  globalMaaspChart.tooltip.setActiveElements([
    { datasetIndex: 0, index: idx }
  ]);
  globalMaaspChart.update();
}

// --- MAASP issue reporting/correction logic ---
let maaspIssueReports = JSON.parse(localStorage.getItem('maasp-issue-reports') || '{}');
function saveMaaspIssueReports() {
  localStorage.setItem('maasp-issue-reports', JSON.stringify(maaspIssueReports));
}

// --- Manipulate MAASP Data (NEW SECTION) ---
function renderPressureEditor(maaspData, wellId) {
  const block = document.getElementById('pressureEditorBlock');
  if (!block) return;
  let html = `<h3>Edit Measured Pressures for ${wellId}</h3>
    <table style="margin-bottom:12px;">
      <thead>
        <tr>
          <th>Date</th>
          <th>Measured Pressure (psi)</th>
          <th>MAASP Limit (psi)</th>
          <th>New Measured Pressure</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;
  maaspData.forEach((row, idx) => {
    html += `
      <tr>
        <td>${row.date}</td>
        <td>${row.measured}</td>
        <td>${row.maasp}</td>
        <td>
          <input type="number" id="editMeasured_${idx}" value="${row.measured}" style="width:80px;">
        </td>
        <td>
          <button onclick="saveMeasuredPressure('${wellId}', ${idx})">Save</button>
        </td>
      </tr>
    `;
  });
  html += `</tbody></table>
    <button onclick="hidePressureEditor()">Close Editor</button>
  `;
  block.innerHTML = html;
  block.style.display = "block";
}
function showPressureEditor(wellId) {
  renderPressureEditor(allMaaspData[wellId], wellId);
}
function saveMeasuredPressure(wellId, idx) {
  const val = parseFloat(document.getElementById(`editMeasured_${idx}`).value);
  if (isNaN(val)) {
    alert("Enter a valid number.");
    return;
  }
  allMaaspData[wellId][idx].measured = val;
  // Optionally: Reset reports for this entry if pressure is now ok
  const row = allMaaspData[wellId][idx];
  const key = wellId ? `${wellId}_${row.date}` : `${row.date}`;
  if (val <= row.maasp && maaspIssueReports[key]) {
    delete maaspIssueReports[key];
    saveMaaspIssueReports();
  }
  renderPressureEditor(allMaaspData[wellId], wellId);
  renderDataMaaspChart();
}
function hidePressureEditor() {
  const block = document.getElementById('pressureEditorBlock');
  if (block) block.style.display = "none";
}

// --- Render MAASP Error Table with robust reporting/correction workflow ---
function renderMaaspErrorTable(errorPoints, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!errorPoints.length) {
    container.innerHTML = '<span style="color:#090;">No MAASP exceedances detected.</span>';
    return;
  }

  let anyUncorrected = false;

  let html = `
    <table class="maasp-error-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Measured Pressure (psi)</th>
          <th>MAASP Limit (psi)</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  errorPoints.forEach((e, i) => {
    // Key includes well ID if available
    const key = e.wellId ? `${e.wellId}_${e.date}` : `${e.date}`;
    let report = maaspIssueReports[key] || {};

    // If measured > maasp, status resets to require new report/correction
    let showReport = false, showCorrected = false, showMarkCorrected = false;
    let statusText = '';

    if (e.measured > e.maasp) {
      if (!report.reported) {
        statusText = '<span style="color:#f33;">Unreported</span>';
        showReport = true;
        anyUncorrected = true;
      } else if (!report.corrected) {
        statusText = '<span style="color:#ff9800;">Reported, needs correction</span>';
        showMarkCorrected = true;
        anyUncorrected = true;
      } else {
        // Even if previously "corrected", but pressure is still high, must repeat workflow
        statusText = '<span style="color:#e53935;">Pressure still high!<br>Report again</span>';
        showReport = true;
        anyUncorrected = true;
      }
    } else {
      // All clear only if pressure is at/below MAASP and previously corrected
      if (report.reported && report.corrected) {
        statusText = '<span style="color:#4caf50;">Corrected</span>';
        showCorrected = true;
      } else {
        statusText = '<span style="color:#090;">No active exceedance</span>';
      }
    }

    html += `
      <tr>
        <td>${e.date}</td>
        <td style="color:#f33;font-weight:bold;">${e.measured}</td>
        <td style="color:#e53935;">${e.maasp}</td>
        <td>${statusText}</td>
        <td>
          ${showReport ? `<button onclick="showReportIssueModal('${key}')">Report Issue</button>` : ''}
          ${showMarkCorrected ? `<button onclick="markMaaspIssueCorrected('${key}')">Mark as Corrected</button>` : ''}
          ${showCorrected ? `<span style="color:#4caf50;">✔</span>` : ''}
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  if (anyUncorrected) {
    html = `
      <div style="color:#fff;background:#e53935;padding:10px 15px;border-radius:5px;margin-bottom:8px;font-weight:bold;">
        ⚠️ At least one MAASP exceedance is not corrected! Please report and correct all issues. Correction must be performed and confirmed while pressure is still high.
      </div>
    ` + html;
  }

  container.innerHTML = html;
}

// --- Modal for reporting MAASP issue ---
function showReportIssueModal(key) {
  let modal = document.getElementById('maaspReportModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'maaspReportModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="min-width:320px;">
        <h3>Report MAASP Exceedance</h3>
        <form id="maaspReportForm">
          <label>Description of issue/corrective action:<br>
            <textarea id="maaspReportDesc" rows="3" style="width:98%;" required></textarea>
          </label><br>
          <button type="submit">Submit Report</button>
          <button type="button" onclick="closeMaaspReportModal()">Cancel</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  document.getElementById('maaspReportForm').onsubmit = function(e) {
    e.preventDefault();
    maaspIssueReports[key] = {
      reported: true,
      corrected: false,
      description: document.getElementById('maaspReportDesc').value,
      reportedAt: new Date().toISOString()
    };
    saveMaaspIssueReports();
    closeMaaspReportModal();
    renderDataMaaspChart();
  };
}
function closeMaaspReportModal() {
  document.getElementById('maaspReportModal').style.display = 'none';
}

// --- Mark as corrected (pressure must still be checked after) ---
function markMaaspIssueCorrected(key) {
  if (maaspIssueReports[key]) {
    maaspIssueReports[key].corrected = true;
    maaspIssueReports[key].correctedAt = new Date().toISOString();
    saveMaaspIssueReports();
    renderDataMaaspChart();
  }
}

// --- Callout summary for MAASP errors (unchanged, optional) ---
function renderMaaspErrorCallout(errorPoints) {
  const calloutDiv = document.getElementById('maaspErrorCallout');
  if (!calloutDiv) return;

  if (!errorPoints.length) {
    calloutDiv.innerHTML = '';
    return;
  }

  const latest = errorPoints.slice(-1)[0];
  calloutDiv.innerHTML = `
    <div class="callout-error">
      <span class="icon">⚠️</span>
      <div class="error-details">
        <b>${errorPoints.length} MAASP exceedance${errorPoints.length > 1 ? 's' : ''} detected</b>
        <div class="error-date">Last: <b>${latest.date}</b></div>
        <div class="error-desc">Measured <b>${latest.measured} psi</b> 
          <span style="color:#fff7b2; font-weight:normal;">&#62;</span> 
          MAASP <b>${latest.maasp} psi</b>
        </div>
        ${errorPoints.length > 1 ? `<div style="margin-top:4px;font-size:0.92em;color:#fff7b2;">See all on chart</div>` : ""}
      </div>
    </div>
  `;
}

// --- Integrate Pressure Editor into Data Section ---
// Call this from your Data Section render function
function updatePressureEditorButton(wellId) {
  const btnId = 'pressureEditorBtn';
  let btn = document.getElementById(btnId);
  if (!btn) {
    btn = document.createElement('button');
    btn.id = btnId;
    btn.className = 'primary-btn';
    btn.innerText = 'Edit Pressures';
    btn.onclick = () => showPressureEditor(wellId);
    const dataBlock = document.getElementById('dataMaaspBlock');
    if (dataBlock) dataBlock.insertBefore(btn, dataBlock.firstChild);
  } else {
    btn.onclick = () => showPressureEditor(wellId);
  }
}

// --- Render Data MAASP Chart and attach editor button ---
function renderDataMaaspChart() {
  const wellId = document.getElementById('dataMaaspWellSelect').value;
  renderMaaspChart(
    'dataMaaspChart',
    'dataMaaspErrors',
    allMaaspData[wellId]
  );
  updatePressureEditorButton(wellId); // Attach or update the editor button
}

// --- On page load, insert editor block if missing ---
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('pressureEditorBlock')) {
    const block = document.createElement('div');
    block.id = 'pressureEditorBlock';
    block.style.display = 'none';
    const dataBlock = document.getElementById('dataMaaspBlock');
    if (dataBlock) dataBlock.appendChild(block);
  }
});
