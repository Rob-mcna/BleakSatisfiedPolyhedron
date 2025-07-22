// Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-07-03 9:53:33
// Current User's Login: Rob-mcna

// --- MODULE-SCOPED DATA ---
let wells = []; // Used by this file for rendering the dashboard.

// Fetch valve test results from the integrity test endpoint
// Fetch valve test results for all wells and all valves using the per-valve API endpoint// Fetch valve test results only for valves that actually have a result// Fetch valve test results only for valves that actually have a result
async function fetchValveTestResults() {
    try {
        console.log('Fetching valve test results for all wells and their actual valves with tests...');
        const wells = window.wells || [];
        window.valveTestResults = {};
        window.selectedValveTestIndex = {};

        // Helper: Check if result is a valid non-error test result
        function isValidTestResult(data) {
            if (!data || typeof data !== 'object') return false;
            if (Array.isArray(data) && data.length === 0) return false;
            if (Object.keys(data).length === 0) return false;
            const str = JSON.stringify(data).toLowerCase();
            // If the object contains error messages, skip it
            if (
                str.includes('error') ||
                str.includes('not found') ||
                str.includes('404')
            ) return false;
            return true;
        }

        const fetchPromises = [];
        for (const well of wells) {
            const wellId = well.id;
            const wellName = well.name;
            const valves = (well.christmasTree && Array.isArray(well.christmasTree.valves))
                ? well.christmasTree.valves : [];

            for (const valve of valves) {
                const valveId = valve.id;
                const url = `http://10.226.14.79:5000/api/integrity_test/?well=${encodeURIComponent(wellId)}&valve=${encodeURIComponent(valveId)}`;
                fetchPromises.push(
                    fetch(url)
                        .then(resp => resp.ok ? resp.json() : null)
                        .then(data => ({ wellName, valveId, data }))
                        .catch(() => ({ wellName, valveId, data: null }))
                );
            }
        }

        const resultsArray = await Promise.all(fetchPromises);

        for (const { wellName, valveId, data } of resultsArray) {
            if (isValidTestResult(data)) {
                if (!window.valveTestResults[wellName]) {
                    window.valveTestResults[wellName] = {};
                    window.selectedValveTestIndex[wellName] = {};
                }
                window.valveTestResults[wellName][valveId] = [data];
                window.selectedValveTestIndex[wellName][valveId] = 0;
            }
        }

        console.log('Valve test results fetched:', window.valveTestResults);
        return window.valveTestResults;
    } catch (error) {
        console.error('Error fetching valve test results:', error);
        throw error;
    }
}
async function fetchWellsAndInitialize() {
    try {
        showTemporaryMessage('Loading wells data...', 'info');

        const response = await fetch('http://10.226.14.79:5000/api/wells');
        if (!response.ok) {
            console.error("Failed to fetch wells data:", response.status, await response.text());
            showTemporaryMessage('Failed to load wells data', 'warning');
            if (document.getElementById('wellList')) renderWellsSection();
            return;
        }
        const wellsDataFromServer = await response.json();

        window.wells = wellsDataFromServer;

        window.valveTestResults = {};
        window.selectedValveTestIndex = {};

        wellsDataFromServer.forEach(well => {
            window.valveTestResults[well.name] = {};
            window.selectedValveTestIndex[well.name] = {};
        });

        try {
            await fetchValveTestResults();
            showTemporaryMessage('Wells and test results loaded successfully', 'success');
        } catch (testError) {
            console.warn('Failed to fetch valve test results:', testError);
            showTemporaryMessage('Wells loaded, test results not available', 'warning');
        }

        if (document.getElementById('wellList')) {
            renderWellsSection();
        }

    } catch (error) {
        console.error("Error during fetchWellsAndInitialize:", error);
        showTemporaryMessage('Network error', 'error');
        if (document.getElementById('wellList')) renderWellsSection();
    }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchWellsAndInitialize();
});

// --- DATA PROCESSING & STATUS LOGIC ---

function getLiveStatusForAllRings(well) {
  const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
  let rings = [];

  const wellValves = (well.christmasTree && well.christmasTree.valves) || [];

  const orderedWellValves = [...wellValves].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (orderedWellValves.length === 0) {
      console.warn(`Well ${well.name || well.id} has no valves defined in its 'christmasTree.valves' property.`);
      return [];
  }

  for (const valveDef of orderedWellValves) {
    const valveId = valveDef.id;
    const valveLabel = valveDef.name || valveDef.id;
    const staticRing = { label: valveLabel, color: "yellow", message: "No data" };

    const valveTests = testResults[valveId];
    let latestResult = null;

    if (Array.isArray(valveTests) && valveTests.length > 0) {
      latestResult = valveTests[valveTests.length - 1];
    } else if (valveTests && typeof valveTests === 'object' && !Array.isArray(valveTests)) {
      latestResult = valveTests;
    }

    if (latestResult && typeof latestResult === 'object') {
      const testPassed = latestResult.pass && latestResult.test_valid && latestResult.leak_rate_pass;

      if (!testPassed) {
        const failureReason = (latestResult.failure_reasons && Array.isArray(latestResult.failure_reasons) && latestResult.failure_reasons.length)
          ? `: ${latestResult.failure_reasons.join(", ")}`
          : "";
        rings.push({ label: valveLabel, color: "red", message: `Test failed${failureReason}` });
      } else {
        rings.push({ label: valveLabel, color: "green", message: "Test passed" });
      }
    } else {
       rings.push(staticRing);
    }
  }
  return rings;
}

function renderMultiRingDashboard() {
  const container = document.getElementById('wellMultiRingBoard');
  if (!container) {
    console.error("Dashboard container 'wellMultiRingBoard' not found.");
    return;
  }

  const filtered = deduplicateWellsById(wells);
  console.log(`Dashboard: Rendering ${filtered.length} wells for user: ${window.currentUser.login}`);

  updateDashboardKPIs(filtered);

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = "<p style='color:#ccc; text-align:center;'>No well data available.</p>";
    return;
  }

  filtered.forEach(well => {
    if (!well || typeof well.name === 'undefined') return;

    const ringData = getLiveStatusForAllRings(well);
    const totalRings = ringData.length;
    const maxRadius = 104;
    const minRadius = 15;
    const strokeWidth = 3;
    const gap = 2;

    const totalRequiredSpace = totalRings * strokeWidth + Math.max(0, totalRings - 1) * gap;
    const availableDrawingRadius = maxRadius - minRadius;

    let effectiveSpacing;
    if (totalRings <= 1) {
        effectiveSpacing = 0;
    } else {
        const availableRadiusForCenters = maxRadius - minRadius - strokeWidth;
        effectiveSpacing = availableRadiusForCenters / Math.max(1, totalRings - 1);
    }

    const dynamicRadii = ringData.map((_, idx) => maxRadius - strokeWidth / 2 - (idx * effectiveSpacing));
    const validRadii = dynamicRadii.filter(r => r > strokeWidth / 2);

    const ringsHtml = validRadii.map((radius, idx) => {
       const originalRingIndex = dynamicRadii.indexOf(radius);
       if (originalRingIndex !== -1 && ringData[originalRingIndex]) {
            return `<circle cx="45" cy="45" r="${radius}" stroke="${colorMap(ringData[originalRingIndex].color)}" stroke-width="${strokeWidth}" fill="none" />`;
       }
       return '';
    }).join('');

    const centerCircleRadius = Math.max(minRadius, (validRadii.length > 0 ? validRadii[validRadii.length - 1] - strokeWidth / 2 : minRadius));

    const svg = `<svg width="90" height="90" style="display:block">${ringsHtml}<circle cx="45" cy="45" r="${centerCircleRadius}" fill="#222" /></svg>`;
    const div = document.createElement('div');
    div.className = "well-multiring";
    div.innerHTML = svg + `<div class="well-label">${well.name}</div>`;

    div.onmousemove = (e) => showTooltip(e, well, div, ringData.slice(0, validRadii.length));
    div.onmouseleave = hideTooltip;

    div.onclick = () => {
      if (typeof showSection === "function") {
        showSection('wells');
        setTimeout(() => {
            const wellDropdown = document.getElementById('wellDropdown');
            if (wellDropdown) {
                wellDropdown.value = well.name;
                wellDropdown.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, 100);
      }
    };
    container.appendChild(div);
  });
}

function colorMap(color) {
  const map = { red: "#e64a3a", orange: "#ff9800", yellow: "#e6c23a", green: "#19d219" };
  return map[color] || "#999";
}

function deduplicateWellsById(wellsArray) {
  if (!Array.isArray(wellsArray)) return [];
  const seen = new Set();
  return wellsArray.filter(well => {
    if (!well || typeof well.name === 'undefined') return false;
    if (seen.has(well.name)) return false;
    seen.add(well.name);
    return true;
  });
}

function countActiveDeviationsFromRecords() {
  return (window.deviations || []).filter(d => d.status === "open" || d.status === "dispensation_requested").length;
}

function updateDashboardKPIs(wellsForKPIs) {
  if (document.getElementById('kpiWells')) {
    document.getElementById('kpiWells').textContent = wellsForKPIs.length;
  }

  let redRings = 0, orangeRings = 0, yellowRings = 0, wellsWithRedRing = 0;

  wellsForKPIs.forEach(w => {
    const ringsStatus = getLiveStatusForAllRings(w);
    let hasRedRing = false;
    ringsStatus.forEach(ring => {
      if (ring.color === 'red') { redRings++; hasRedRing = true; }
      if (ring.color === 'orange') orangeRings++;
      if (ring.color === 'yellow') yellowRings++;
    });
    if (hasRedRing) wellsWithRedRing++;
  });

  if (document.getElementById('kpiRed')) document.getElementById('kpiRed').textContent = redRings;
  if (document.getElementById('kpiOrange')) document.getElementById('kpiOrange').textContent = orangeRings;
  if (document.getElementById('kpiYellow')) document.getElementById('kpiYellow').textContent = yellowRings;

  if (document.getElementById('kpiRepairs')) {
    document.getElementById('kpiRepairs').textContent = wellsWithRedRing;
  }

  if (document.getElementById('kpiDeviations')) {
    document.getElementById('kpiDeviations').textContent = countActiveDeviationsFromRecords();
  }
}

async function fetchWellsAndSyncResults() {
  console.log(`Dashboard: Fetching all application data...`);
  try {
    const wellsResponse = await fetch('http://10.226.14.79:5000/api/wells/');
    if (!wellsResponse.ok) {
      throw new Error(`HTTP error! status: ${wellsResponse.status}`);
    }
    const wellsData = await wellsResponse.json();
    const processedWellsData = wellsData || [];
    

    const valvesResponse = await fetch('http://10.226.14.79:5000/api/valves/');
    if (!valvesResponse.ok) {
       console.warn(`Dashboard: Failed to fetch valve list from API: ${valvesResponse.status}. Proceeding without full valve list.`);
       window.allValves = [];
    } else {
      window.allValves = await valvesResponse.json();
      console.log("Dashboard: Valve list fetched successfully.", window.allValves);
    }

    wells = deduplicateWellsById(processedWellsData);

    window.wells = wells;

    window.valveTestResults = {};
    window.wells.forEach(well => {
      window.valveTestResults[well.name] = {};
    });

    try {
      await fetchValveTestResults();
      console.log("Dashboard: Well data and valve test results fetched successfully.");
    } catch (testError) {
      console.warn("Dashboard: Failed to fetch valve test results:", testError);
    }

    renderMultiRingDashboard();
    if (typeof renderWellsSection === "function" && document.getElementById('wellList')) {
      renderWellsSection();
    }

  } catch (error) {
    console.error("Dashboard: Failed to fetch and sync data:", error);
    const container = document.getElementById('wellMultiRingBoard');
    if (container) {
      container.innerHTML = `<p style="color:#888; text-align:center; padding:20px;">Error loading application data.</p>`;
    }
  }
}

function runIntegrityTestAndRefreshDashboard(testData) {
  console.log('Dashboard: Submitting integrity test...');

  fetch('http://10.226.14.79:5000/api/run_integrity_test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => { throw new Error(err.error || `HTTP error ${response.status}`) });
    }
    return response.json();
  })
  .then(result => {
    console.log("Dashboard: Integrity test submitted successfully.", result);
    fetchWellsAndSyncResults();
  })
  .catch(error => {
    console.error("Dashboard: Error running integrity test:", error);
    alert(`Error during integrity test: ${error.message}`);
  });
}

function showTooltip(e, well, div, ringData) {
  const rect = div.getBoundingClientRect();
  const x = e.clientX - rect.left - 45;
  const y = e.clientY - rect.top - 45;
  const r = Math.sqrt(x * x + y * y);

  let text = `<b>${well.name || 'N/A'}</b>`;
  const radii = [44, 37, 30, 23, 16, 9];
  const ringHalfWidth = 3.5;

  for (let i = 0; i < radii.length; i++) {
    if (Math.abs(r - radii[i]) <= ringHalfWidth) {
      if (ringData && ringData[i]) {
        text = `<b>${ringData[i].label || 'N/A'}:</b> ${ringData[i].message || 'No message'}`;
      }
      break;
    }
  }
  showTooltipBox(e.clientX, e.clientY, text);
}

function showTooltipBox(x, y, html) {
  let t = document.getElementById('dashboardTooltip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'dashboardTooltip';
    t.className = 'tooltip';
    document.body.appendChild(t);
  }
  t.innerHTML = html;
  t.style.left = (x + 15) + 'px';
  t.style.top = (y + 15) + 'px';
  t.style.display = 'block';
  t.style.visibility = 'visible';
}

function hideTooltip() {
  let t = document.getElementById('dashboardTooltip');
  if (t) t.style.display = 'none';
}

window.onload = function() {
    console.log(`Dashboard: Initializing for user: ${window.currentUser.login}`);
    fetchWellsAndSyncResults();
};

window.renderMultiRingDashboard = renderMultiRingDashboard;
window.fetchWellsAndSyncResults = fetchWellsAndSyncResults;
window.runIntegrityTestAndRefreshDashboard = runIntegrityTestAndRefreshDashboard;
window.fetchValveTestResults = fetchValveTestResults;
window.getLiveStatusForAllRings = getLiveStatusForAllRings;



