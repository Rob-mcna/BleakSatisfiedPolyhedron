// =================== DASHBOARD ===================

let wells = [];

// ------------------- HELPERS -------------------

function deduplicateWellsById(wellsArray) {
  if (!Array.isArray(wellsArray)) return [];

  const seen = new Set();
  const result = [];

  wellsArray.forEach(well => {
    if (!well?.id) return;
    const key = String(well.id);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(well);
  });

  return result;
}

function getWellTypeKey(wellType) {
  const typeMapping = {
    'Sub-sea Natural Flow': 'Producer',
    'Sub-sea Water Injector': 'Dual Service'
  };
  return typeMapping[wellType] || 'Producer';
}

function colorMap(color) {
  const map = {
    red: "#e64a3a",
    orange: "#ff9800",
    yellow: "#e6c23a",
    green: "#19d219"
  };
  return map[color] || "#999";
}

function countActiveDeviationsFromRecords() {
  return (window.deviations || []).filter(
    d => d.status === "open" || d.status === "dispensation_requested"
  ).length;
}

function getWellResultsForDashboard(well) {
  if (!well?.id || !window.valveTestResults) return {};
  return window.valveTestResults[well.id] || {};
}

function selectWellFromDashboard(well) {
  if (!well) return;

  if (typeof showSection === "function") {
    showSection('wells');
  }

  setTimeout(() => {
    const wellDropdown = document.getElementById('wellDropdown');
    if (!wellDropdown) return;

    wellDropdown.value = well.id;
    wellDropdown.dispatchEvent(new Event('change', { bubbles: true }));
    wellDropdown.dispatchEvent(new Event('input', { bubbles: true }));

    if (typeof onWellSelectionChange === "function") {
      onWellSelectionChange(well.id);
    }

    if (typeof displayWellDetails === "function") {
      displayWellDetails(well.id);
    }
    if (typeof renderWellDetail === "function") {
      renderWellDetail(well.id);
    }
  }, 300);
}

// ------------------- FAILURE MATRIX / STATUS -------------------

function getFailureCategoryAndNumber(testResult) {
  if (!testResult || testResult.pass === true) {
    return { category: null, number: null };
  }

  const wellId = window.currentWellContext?.id;
  const well = (window.wells || []).find(w => String(w.id) === String(wellId));
  const valveType = testResult.valve_type || testResult.inputs?.ValveType || '';
  const failureReasons = testResult.failure_reasons || [];
  const isLeakRateExceeded = failureReasons.some(reason =>
    reason.includes('leak rate') || reason.includes('exceed')
  );
  const isSubsurfaceValve = valveType.toUpperCase() === 'SCSSV';
  const multipleValvesFailed = checkForMultipleFailedValves(wellId);

  let category = isSubsurfaceValve
    ? (multipleValvesFailed ? 'multipleSubSurfaceFailures' : 'singleSubSurfaceFailure')
    : (multipleValvesFailed ? 'multipleSurfaceFailures' : 'singleSurfaceFailure');

  let number = null;
  const categoryEntries = window.wellFailureMatrix?.[category] || {};

  for (const [failureNum, failureData] of Object.entries(categoryEntries)) {
    const description = failureData.description.toLowerCase();
    const valveTypeUpper = valveType.toUpperCase();

    if (description.includes(valveTypeUpper)) {
      number = parseInt(failureNum, 10);
      break;
    }

    if (isSubsurfaceValve && isLeakRateExceeded && description.includes('completion leak')) {
      number = parseInt(failureNum, 10);
      break;
    }
  }

  if (number === null && Object.keys(categoryEntries).length > 0) {
    number = parseInt(Object.keys(categoryEntries)[0], 10);
  }

  return { category, number };
}

function checkForMultipleFailedValves(wellId) {
  const wellResults = getWellResultsForDashboard({ id: wellId });
  let failedValveCount = 0;

  for (const valveId in wellResults) {
    const tests = wellResults[valveId];
    if (!Array.isArray(tests) || tests.length === 0) continue;

    const latestTest = tests[tests.length - 1];
    if (latestTest && latestTest.pass === false) {
      failedValveCount++;
    }
  }

  return failedValveCount > 1;
}

function getLiveStatusForAllRingsWithEscalation(well) {
  const testResults = getWellResultsForDashboard(well);
  const rings = [];
  const wellType = getWellTypeKey(well.type);
  const wellValves = (well.christmasTree && well.christmasTree.valves) || [];

  if (wellValves.length === 0) return [];

  for (const valveDef of wellValves) {
    const valveId = valveDef.id;
    const valveLabel = valveDef.name || valveDef.id;
    const valveTests = testResults[valveId];

    if (!Array.isArray(valveTests) || valveTests.length === 0) continue;

    const latestResult = valveTests[valveTests.length - 1];
    if (!latestResult || typeof latestResult !== 'object') continue;

    const isTestPassed = latestResult.status === "pass";
    if (isTestPassed) continue;

    window.currentWellContext = {
      id: well.id,
      name: well.name,
      wellObject: well
    };

    const { category, number } = getFailureCategoryAndNumber(latestResult);
    const failureCode = window.wellFailureModel.getFailureCode(category, number, wellType);
    const mitigatingAction = window.wellFailureModel.getMitigatingAction(failureCode);

    const failureDetails = {
      failureReason: (latestResult.failure_reasons || ["Test Failed"]).join(", "),
      failureCode: failureCode,
      matrixCategory: category,
      trafficLight: mitigatingAction ? mitigatingAction.trafficLight : 'red',
      matrixDescription: mitigatingAction ? mitigatingAction.description : 'Action required',
      wellType: wellType,
      testResult: latestResult,
      timestamp: new Date().toISOString()
    };

    const existingEscalation = window.escalationSystem?.getEscalationForValve?.(well.name, valveId);
    if (!existingEscalation && window.escalationSystem) {
      window.escalationSystem.createEscalation(well.name, valveId, failureDetails, false, well.id);
    }

    rings.push({
      label: valveLabel,
      color: mitigatingAction ? mitigatingAction.color : 'red',
      message: `${failureDetails.failureReason} - ${failureDetails.matrixDescription}`,
      failureCode: failureCode,
      matrixCategory: category,
      failureNumber: number,
      trafficLight: failureDetails.trafficLight,
      valveId: valveId
    });
  }

  const colorOrder = { red: 1, orange: 2, yellow: 3, green: 4 };
  rings.sort((a, b) => (colorOrder[a.color] || 99) - (colorOrder[b.color] || 99));
  return rings;
}

function categorizeWellByTestResults(well) {
  const testResults = getWellResultsForDashboard(well);
  const hasTestData = Object.keys(testResults).length > 0;

  if (!hasTestData) return 'no-data';

  let hasFailures = false;
  let hasValidTests = false;

  for (const valveId in testResults) {
    const tests = testResults[valveId];
    if (Array.isArray(tests) && tests.length > 0) {
      hasValidTests = true;
      const latestTest = tests[tests.length - 1];
      const testPassed = latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass;
      if (!testPassed) {
        hasFailures = true;
        break;
      }
    }
  }

  if (!hasValidTests) return 'no-data';
  return hasFailures ? 'with-failures' : 'no-failures';
}

function getWellsByFilterOption(filterOption) {
  const allWells = deduplicateWellsById(wells);

  switch (filterOption) {
    case 'with-failures':
      return allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures');
    case 'no-failures':
      return allWells.filter(well => categorizeWellByTestResults(well) === 'no-failures');
    case 'all':
    default:
      return allWells;
  }
}

// ------------------- KPI / FILTER -------------------

function updateDashboardKPIs(wellsForKPIs) {
  if (document.getElementById('kpiWells')) {
    document.getElementById('kpiWells').textContent = wellsForKPIs.length;
  }

  let redRings = 0;
  let orangeRings = 0;
  let yellowRings = 0;
  let wellsWithRedRing = 0;

  wellsForKPIs.forEach(well => {
    const ringsStatus = getLiveStatusForAllRingsWithEscalation(well);
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
  if (document.getElementById('kpiRepairs')) document.getElementById('kpiRepairs').textContent = wellsWithRedRing;
  if (document.getElementById('kpiDeviations')) document.getElementById('kpiDeviations').textContent = countActiveDeviationsFromRecords();
}

function updateFilterStats(filterOption) {
  const statsContainer = document.getElementById('filterStats');
  if (!statsContainer) return;

  const allWells = deduplicateWellsById(wells);
  const withFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures').length;
  const noFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'no-failures').length;
  const noData = allWells.filter(well => categorizeWellByTestResults(well) === 'no-data').length;

  let currentCount;
  switch (filterOption) {
    case 'no-failures':
      currentCount = noFailures;
      break;
    case 'all':
      currentCount = allWells.length;
      break;
    case 'with-failures':
    default:
      currentCount = withFailures;
      break;
  }

  statsContainer.innerHTML = `
    Showing: ${currentCount} wells<br>
    <small>Failed: ${withFailures} | Passed: ${noFailures} | No Data: ${noData}</small>
  `;
}

function updateFilteredKPIs(filterOption) {
  const filteredWells = getWellsByFilterOption(filterOption);
  updateDashboardKPIs(filteredWells);
}

function createDashboardFilterDropdown() {
  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (!dashboardContainer) return;

  let existingDropdown = document.getElementById('dashboardFilterContainer');
  if (existingDropdown) existingDropdown.remove();

  const dropdownContainer = document.createElement('div');
  dropdownContainer.id = 'dashboardFilterContainer';
  dropdownContainer.style.cssText = `
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(0,0,0,0.1);
    border-radius: 4px;
  `;

  const label = document.createElement('label');
  label.textContent = 'Show Wells:';
  label.style.cssText = `
    font-weight: bold;
    color: #333;
    font-size: 14px;
  `;

  const select = document.createElement('select');
  select.id = 'dashboardFilter';
  select.style.cssText = `
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    cursor: pointer;
  `;

  [
    { value: 'with-failures', text: 'With Failures Only' },
    { value: 'no-failures', text: 'No Failures (Passed Tests)' },
    { value: 'all', text: 'All Wells' }
  ].forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    select.appendChild(optionElement);
  });

  select.value = 'with-failures';

  select.addEventListener('change', function() {
    const selectedFilter = this.value;
    renderFilteredDashboard(selectedFilter);
    updateFilteredKPIs(selectedFilter);
    updateFilterStats(selectedFilter);
  });

  const statsContainer = document.createElement('div');
  statsContainer.id = 'filterStats';
  statsContainer.style.cssText = `
    margin-left: auto;
    font-size: 12px;
    color: #666;
    background: rgba(255,255,255,0.7);
    padding: 6px 10px;
    border-radius: 3px;
  `;

  dropdownContainer.appendChild(label);
  dropdownContainer.appendChild(select);
  dropdownContainer.appendChild(statsContainer);

  dashboardContainer.parentNode.insertBefore(dropdownContainer, dashboardContainer);

  updateFilterStats('with-failures');
}

// ------------------- DASHBOARD RENDER -------------------

function renderFilteredDashboard(filterOption = 'with-failures') {
  const container = document.getElementById('wellMultiRingBoard');
  if (!container) {
    console.error("Dashboard container 'wellMultiRingBoard' not found.");
    return;
  }

  const filteredWells = getWellsByFilterOption(filterOption);
  container.innerHTML = '';

  if (filteredWells.length === 0) {
    let message = 'No wells found.';
    if (filterOption === 'no-failures') message = 'No wells with passed tests found.';
    if (filterOption === 'with-failures') message = 'No wells with failed tests found.';
    container.innerHTML = `<p style='color:#ccc; text-align:center;'>${message}</p>`;
    return;
  }

  const renderedWells = new Set();

  filteredWells.forEach(well => {
    if (!well?.id) return;
    if (renderedWells.has(String(well.id))) return;
    renderedWells.add(String(well.id));

    const ringData = getLiveStatusForAllRingsWithEscalation(well);
    let displayRings = ringData;

    if (filterOption === 'no-failures' && ringData.length === 0) {
      displayRings = [{
        label: 'All Tests Passed',
        color: 'green',
        message: 'All valve tests passed successfully',
        failureCode: 0
      }];
    }

    const totalRings = displayRings.length;
    const maxRadius = 44;
    const minRadius = 9;
    const strokeWidth = 2;

    let effectiveSpacing;
    if (totalRings <= 1) {
      effectiveSpacing = 0;
    } else {
      const availableRadiusForCenters = maxRadius - minRadius - strokeWidth;
      effectiveSpacing = availableRadiusForCenters / Math.max(1, totalRings - 1);
    }

    const dynamicRadii = displayRings.map((_, idx) => maxRadius - strokeWidth / 2 - (idx * effectiveSpacing));
    const validRadii = dynamicRadii.filter(r => r > strokeWidth / 2);

    const ringsHtml = validRadii.map((radius, idx) => {
      const originalIndex = dynamicRadii.indexOf(radius);
      if (originalIndex !== -1 && displayRings[originalIndex]) {
        return `<circle cx="45" cy="45" r="${radius}" stroke="${colorMap(displayRings[originalIndex].color)}" stroke-width="${strokeWidth}" fill="none" />`;
      }
      return '';
    }).join('');

    const centerCircleRadius = Math.max(minRadius, (validRadii.length > 0 ? validRadii[validRadii.length - 1] - strokeWidth / 2 : minRadius));
    const svg = `<svg width="90" height="90" style="display:block">
      ${ringsHtml}
      <circle cx="45" cy="45" r="${centerCircleRadius}" fill="#ec5642ff" />
    </svg>`;

    const div = document.createElement('div');
    div.className = "well-multiring";
    div.dataset.wellId = well.id;
    div.innerHTML = svg + `<div class="well-label">${well.name}</div>`;

    div.onclick = () => selectWellFromDashboard(well);

    if (typeof addEscalationIndicatorToWell === "function") {
      addEscalationIndicatorToWell(div, well.name);
    }
    if (typeof addDeviationIndicatorToWell === "function") {
      addDeviationIndicatorToWell(div, well.name);
    }

    container.appendChild(div);
  });
}

function renderMultiRingDashboardWithFilter() {
  createDashboardFilterDropdown();
  const filterSelect = document.getElementById('dashboardFilter');
  const currentFilter = filterSelect ? filterSelect.value : 'with-failures';
  renderFilteredDashboard(currentFilter);
  updateFilteredKPIs(currentFilter);
  updateFilterStats(currentFilter);
}

// ------------------- DATA LOAD / INIT -------------------

async function fetchValveTestResults() {
  try {
    const wells = window.wells || [];
    window.valveTestResults = {};
    window.selectedValveTestIndex = {};
    window.valvesWithNoData = {};

    await Promise.all(
      wells.map(async well => {
        window.valveTestResults[well.id] = {};
        window.selectedValveTestIndex[well.id] = {};

        try {
          const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/results?well=${encodeURIComponent(well.id)}`);
          if (!response.ok) {
            window.valvesWithNoData[well.id] = true;
            return;
          }

          const rows = await response.json();
          const groupedResults = window.groupIntegrityResultsByValve
            ? window.groupIntegrityResultsByValve(rows)
            : {};

          window.valveTestResults[well.id] = groupedResults;
          window.selectedValveTestIndex[well.id] = {};

          Object.keys(groupedResults).forEach(valveId => {
            window.selectedValveTestIndex[well.id][valveId] = groupedResults[valveId].length - 1;
          });

          if (Object.keys(groupedResults).length === 0) {
            window.valvesWithNoData[well.id] = true;
          }
        } catch (error) {
          console.error(`Error fetching test results for well ${well.id}:`, error);
          window.valvesWithNoData[well.id] = true;
        }
      })
    );

    return {
      valveTestResults: window.valveTestResults,
      valvesWithNoData: window.valvesWithNoData
    };
  } catch (error) {
    console.error('Error in fetchValveTestResults:', error);
    throw error;
  }
}

function fetchWellsAndSyncResultsWithFilter() {
  fetch('http://127.0.0.1:5000/api/wells/')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(wellsData => {
      wells = deduplicateWellsById(wellsData || []);
      window.wells = wells;

      return fetch('http://127.0.0.1:5000/api/valves/')
        .then(valvesResponse => {
          if (!valvesResponse.ok) {
            window.allValves = [];
            return [];
          }
          return valvesResponse.json().then(valvesData => {
            window.allValves = valvesData;
            return valvesData;
          });
        })
        .then(() => fetchValveTestResults());
    })
    .then(() => {
      renderMultiRingDashboardWithFilter();

      if (typeof renderWellsSection === "function" && document.getElementById('wellList')) {
        renderWellsSection();
      }
    })
    .catch(error => {
      console.error("Dashboard: Failed to fetch and sync data:", error);
      const container = document.getElementById('wellMultiRingBoard');
      if (container) {
        container.innerHTML = `<p style="color:#888; text-align:center; padding:20px;">Error loading application data.</p>`;
      }
    });
}

function initializeDashboard() {
  if (!document.getElementById('wellMultiRingBoard')) {
    const dashboardContainer = document.createElement('div');
    dashboardContainer.id = 'wellMultiRingBoard';
    dashboardContainer.className = 'well-grid';
    dashboardContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 10px;
      padding: 10px;
    `;

    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.appendChild(dashboardContainer);
  }

  fetchWellsAndSyncResultsWithFilter();
}

// ------------------- SIMPLE INTEGRATION HELPERS -------------------

function updateDashboardAfterTest(wellId) {
  renderMultiRingDashboardWithFilter();
  if (typeof renderWellSchematicAndPanel === "function") {
    renderWellSchematicAndPanel(wellId);
  }
}

async function exportTestData(wellId) {
  try {
    const wellData = window.valveTestResults[wellId] || {};
    const well = (window.wells || []).find(w => String(w.id) === String(wellId));

    if (Object.keys(wellData).length === 0) {
      if (window.showTemporaryMessage) {
        window.showTemporaryMessage('No test data found for this well.', 'warning');
      }
      return;
    }

    const exportData = {
      well_info: {
        id: wellId,
        name: well?.name || wellId,
        type: well?.type || 'Unknown',
        treeType: well?.treeType || 'Unknown',
        exported_at: new Date().toISOString(),
        exported_by: 'Rob-mcna'
      },
      valve_tests: {}
    };

    for (const valveId in wellData) {
      const tests = wellData[valveId];
      exportData.valve_tests[valveId] = {
        valve_type: typeof findValveNameById === "function" ? findValveNameById(valveId) : valveId,
        test_count: Array.isArray(tests) ? tests.length : 1,
        tests: Array.isArray(tests) ? tests : [tests]
      };
    }

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `well_${wellId}_test_data_${new Date().toISOString().slice(0,10)}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);

    if (window.showTemporaryMessage) {
      window.showTemporaryMessage(`Successfully exported data for well ${wellId}`, 'success');
    }
  } catch (error) {
    console.error('Export error:', error);
    if (window.showTemporaryMessage) {
      window.showTemporaryMessage(`Failed to export data: ${error.message}`, 'error');
    }
  }
}

// ------------------- EXPORTS -------------------

window.deduplicateWellsById = deduplicateWellsById;
window.getWellTypeKey = getWellTypeKey;
window.colorMap = colorMap;
window.countActiveDeviationsFromRecords = countActiveDeviationsFromRecords;
window.getFailureCategoryAndNumber = getFailureCategoryAndNumber;
window.checkForMultipleFailedValves = checkForMultipleFailedValves;
window.getLiveStatusForAllRingsWithEscalation = getLiveStatusForAllRingsWithEscalation;
window.categorizeWellByTestResults = categorizeWellByTestResults;
window.getWellsByFilterOption = getWellsByFilterOption;
window.updateDashboardKPIs = updateDashboardKPIs;
window.updateFilterStats = updateFilterStats;
window.updateFilteredKPIs = updateFilteredKPIs;
window.createDashboardFilterDropdown = createDashboardFilterDropdown;
window.renderFilteredDashboard = renderFilteredDashboard;
window.renderMultiRingDashboard = renderMultiRingDashboardWithFilter;
window.fetchWellsAndSyncResults = fetchWellsAndSyncResultsWithFilter;
window.initializeDashboard = initializeDashboard;
window.fetchValveTestResults = fetchValveTestResults;
window.updateDashboardAfterTest = updateDashboardAfterTest;
window.exportTestData = exportTestData;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeDashboard();
  }, 100);
});
