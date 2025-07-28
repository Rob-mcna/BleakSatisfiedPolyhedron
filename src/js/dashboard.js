// =================== Well Failure Model Matrix Implementation ===================

// --- Only define globals if not already defined ---
window.valveConversions = window.valveConversions || {
  SV: "Swab Valve",
  HWV: "PWV - Hydraulic",
  MWV: "PWV - Manual",
  HMV: "UPV",
  MMV: "LMV",
  SCSSV: "SCSSV"
};

window.wellTypes = window.wellTypes || [
  { name: "Natural Flow", mappedType: "Producer" },
  { name: "Sub-sea Natural Flow", mappedType: "Producer" },
  { name: "Water Injector", mappedType: "Dual Service Well" },
  { name: "Sub-sea Water Injector", mappedType: "Dual Service Well" }
];

window.wellFailureMatrix = window.wellFailureMatrix || {
  maintenanceFailure: {
    1: {
      description: "Failed to carry out WIT or SIT within advised allowable timeframe.",
      codes: {
        naturalFlow: 9,
        waterInjector: 9,
        subSeaNaturalFlow: 1,
        subSeaWaterInjector: 1,
        normallyUnmannedInstallation: 9
      }
    }
  },
  singleSurfaceFailure: {
    1: {
      description: "Single surface valve failed test.",
      codes: {
        naturalFlow: 4,
        waterInjector: 4,
        subSeaNaturalFlow: 4,
        subSeaWaterInjector: 4,
        normallyUnmannedInstallation: 4
      }
    }
  },
  multipleSurfaceFailures: {
    1: {
      description: "Multiple surface valves failed test.",
      codes: {
        naturalFlow: 6,
        waterInjector: 6,
        subSeaNaturalFlow: 6,
        subSeaWaterInjector: 6,
        normallyUnmannedInstallation: 6
      }
    }
  },
  singleSubSurfaceFailure: {
    1: {
      description: "Single SCSSV failed test.",
      codes: {
        naturalFlow: 8,
        waterInjector: 8,
        subSeaNaturalFlow: 8,
        subSeaWaterInjector: 8,
        normallyUnmannedInstallation: 8
      }
    }
  },
  multipleSubSurfaceFailures: {
    1: {
      description: "Multiple SCSSVs failed test.",
      codes: {
        naturalFlow: 10,
        waterInjector: 10,
        subSeaNaturalFlow: 10,
        subSeaWaterInjector: 10,
        normallyUnmannedInstallation: 10
      }
    }
  },
  subSurfacePlusSurfaceFailure: {
    1: {
      description: "Both surface valve(s) and SCSSV failed test.",
      codes: {
        naturalFlow: 10,
        waterInjector: 10,
        subSeaNaturalFlow: 10,
        subSeaWaterInjector: 10,
        normallyUnmannedInstallation: 10
      }
    }
  }
};

window.mitigatingActions = window.mitigatingActions || {
  0: {
    color: "green",
    description: "No faults found, well tested within operating parameters",
    trafficLight: "green"
  },
  1: {
    color: "yellow",
    description: "Repair at next planned maintenance / intervention",
    trafficLight: "yellow"
  },
  2: {
    color: "yellow",
    description: "Repair at the earliest opportunity but within 24 months - the well can be flowed during this grace period. See note 'L'.",
    trafficLight: "yellow"
  },
  3: {
    color: "yellow",
    description: "Repair at the earliest opportunity but within 12 months - the well can be flowed during this grace period. See note 'L'.",
    trafficLight: "yellow"
  },
  4: {
    color: "yellow",
    description: "Repair at the earliest opportunity but within 6 months - the well can be flowed during this grace period. See note 'L'.",
    trafficLight: "yellow"
  },
  5: {
    color: "yellow",
    description: "Repair at the earliest opportunity but within 3 months - the well can be flowed during this grace period. See note 'L'.",
    trafficLight: "yellow"
  },
  6: {
    color: "yellow",
    description: "Repair at the earliest opportunity but within 2 months - the well can be flowed during this grace period. See note 'L'.",
    trafficLight: "yellow"
  },
  7: {
    color: "yellow",
    description: "Repair at the earliest opportunity but within 1 months - the well can be flowed during this grace period. See note 'L'.",
    trafficLight: "yellow"
  },
  8: {
    color: "orange",
    description: "Carry out formal Technical Review within 7 days to determine mitigating actions and when/how to repair and/or continue operation - The minimum action resulting from Technical Review outlined in failure code 8 is to make the well safe as per action code 1 - 10 - i.e, a repair is required. See individual Failure Code Guidance Notes for required attendees.",
    trafficLight: "orange"
  },
  9: {
    color: "orange",
    description: "Make well safe immediately and plan repair / test / suspension / abandonment. Make well safe may be carried out by repairing defect at initial visit to well. See note 'N'.",
    trafficLight: "orange"
  },
  10: {
    color: "red",
    description: "Implement installation/field Emergency Response procedures immediately, make well safe at earliest opportunity and plan repair / suspension / abandonment.",
    trafficLight: "red"
  }
};

// Utility Functions
class WellFailureModel {
  constructor() {
    this.matrix = window.wellFailureMatrix;
    this.actions = window.mitigatingActions;
    this.wellTypes = window.wellTypes;
    this.valveConversions = window.valveConversions;
  }

  getFailureCode(category, failureNumber, wellType) {
    try {
      const categoryData = this.matrix[category];
      if (!categoryData || !categoryData[failureNumber]) {
        return null;
      }
      const failure = categoryData[failureNumber];
      return failure.codes[wellType] || null;
    } catch (error) {
      console.error('Error getting failure code:', error);
      return null;
    }
  }

  getMitigatingAction(code) {
    return this.actions[code] || null;
  }

  getFailuresByCategory(category) {
    return this.matrix[category] || {};
  }

  getTrafficLight(code) {
    const action = this.getMitigatingAction(code);
    return action ? action.trafficLight : null;
  }

  convertValve(abbreviation) {
    return this.valveConversions[abbreviation] || abbreviation;
  }

  getMappedWellType(wellTypeName) {
    const wellType = this.wellTypes.find(wt => wt.name === wellTypeName);
    return wellType ? wellType.mappedType : wellTypeName;
  }

  searchFailures(keyword) {
    const results = [];
    Object.keys(this.matrix).forEach(category => {
      Object.keys(this.matrix[category]).forEach(failureNum => {
        const failure = this.matrix[category][failureNum];
        if (failure.description.toLowerCase().includes(keyword.toLowerCase())) {
          results.push({
            category,
            failureNumber: failureNum,
            description: failure.description,
            codes: failure.codes
          });
        }
      });
    });
    return results;
  }

  getAllCodesForWellType(wellType) {
    const codes = new Set();
    Object.keys(this.matrix).forEach(category => {
      Object.keys(this.matrix[category]).forEach(failureNum => {
        const failure = this.matrix[category][failureNum];
        const code = failure.codes[wellType];
        if (code !== null && code !== undefined) {
          codes.add(code);
        }
      });
    });
    return Array.from(codes).sort((a, b) => a - b);
  }

  generateWellTypeSummary(wellType) {
    const summary = {
      wellType,
      totalFailures: 0,
      codeDistribution: {},
      trafficLightDistribution: { green: 0, yellow: 0, orange: 0, red: 0 },
      criticalFailures: []
    };

    Object.keys(this.matrix).forEach(category => {
      Object.keys(this.matrix[category]).forEach(failureNum => {
        const failure = this.matrix[category][failureNum];
        const code = failure.codes[wellType];
        if (code !== null && code !== undefined) {
          summary.totalFailures++;
          summary.codeDistribution[code] = (summary.codeDistribution[code] || 0) + 1;
          const trafficLight = this.getTrafficLight(code);
          if (trafficLight) {
            summary.trafficLightDistribution[trafficLight]++;
          }
          if (code >= 9) {
            summary.criticalFailures.push({
              category,
              failureNumber: failureNum,
              description: failure.description,
              code
            });
          }
        }
      });
    });

    return summary;
  }
}

window.wellFailureModel = window.wellFailureModel || new WellFailureModel();

// =================== Well/Valve Dashboard Implementation ===================

let wells = []; // Used by this file for rendering the dashboard.

// --- Matrix Matching Helper ---
function matchesMatrix(well, testResults) {
  // Get mapped well type for matrix lookup
  const mappedType = window.wellFailureModel.getMappedWellType(well.type);
  const matrix = window.wellFailureModel.matrix;

  // Only consider wells with valid test data
  if (!testResults || Object.keys(testResults).length === 0) return false;

  // Check for any failed valve
  let hasFailedTest = false;
  for (const valveId in testResults) {
    const tests = testResults[valveId];
    if (Array.isArray(tests) && tests.length > 0) {
      // Check the latest test for each valve
      const latestTest = tests[tests.length - 1];
      if (latestTest && typeof latestTest === 'object') {
        const testPassed = latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass;
        if (!testPassed) {
          hasFailedTest = true;
          break;
        }
      }
    }
  }

  // Only show wells that have failed tests (match matrix conditions)
  return hasFailedTest;
}
// Fetch valve test results from the integrity test endpoint
async function fetchValveTestResults() {
    try {
        console.log('--- Starting to fetch valve test results for all wells and valves ---');
        const wells = window.wells || [];
        window.valveTestResults = {};
        window.selectedValveTestIndex = {};
        window.valvesWithNoData = {};

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
                        .then(resp => {
                            if (!resp.ok) {
                                console.warn(`[FETCH FAIL] Well ${wellName}, valve ${valveId}: HTTP ${resp.status}`);
                                return { wellName, valveId, data: null };
                            }
                            return resp.json().then(data => ({ wellName, valveId, data }));
                        })
                        .catch(error => {
                            console.error(`[FETCH ERROR] Well ${wellName}, valve ${valveId}:`, error);
                            return { wellName, valveId, data: null };
                        })
                );
            }
        }

        const resultsArray = await Promise.all(fetchPromises);

        let addedCount = 0;
        let skippedCount = 0;

        for (const { wellName, valveId, data } of resultsArray) {
            let isValid = false;
            if (data && typeof data === "object" && !Array.isArray(data)) {
                if (!("Error" in data || "error" in data)) {
                    isValid = true;
                }
            }
            else if (Array.isArray(data) && data.length > 0) {
                isValid = data.every(
                    item =>
                        item &&
                        typeof item === "object" &&
                        !Array.isArray(item) &&
                        !("Error" in item || "error" in item)
                );
            }

            if (isValid) {
                if (!window.valveTestResults[wellName]) {
                    window.valveTestResults[wellName] = {};
                    window.selectedValveTestIndex[wellName] = {};
                }
                window.valveTestResults[wellName][valveId] = Array.isArray(data) ? data : [data];
                window.selectedValveTestIndex[wellName][valveId] = 0;
                addedCount++;
                console.log(`[ADDED] Well ${wellName}, valve ${valveId}:`, data);
            } else {
                if (!window.valvesWithNoData[wellName]) window.valvesWithNoData[wellName] = [];
                window.valvesWithNoData[wellName].push(valveId);
                skippedCount++;
                if (data === null) {
                    console.log(`[SKIPPED] Well ${wellName}, valve ${valveId}: No data returned (null)`);
                } else if (Array.isArray(data) && data.length === 0) {
                    console.log(`[SKIPPED] Well ${wellName}, valve ${valveId}: Empty array []`);
                } else if (Array.isArray(data) && "Error" in data[0]) {
                    console.log(`[SKIPPED] Well ${wellName}, valve ${valveId}: API returned Error array:`, data);
                } else if (typeof data === "object" && (("Error" in data) || ("error" in data))) {
                    console.log(`[SKIPPED] Well ${wellName}, valve ${valveId}: API returned Error object:`, data);
                } else {
                    console.log(`[SKIPPED] Well ${wellName}, valve ${valveId}: Unknown/invalid data:`, data);
                }
            }
        }

        console.log(`--- Fetch Complete ---`);
        console.log(`Valves with valid test data: ${addedCount}`);
        console.log(`Valves skipped (invalid/no data): ${skippedCount}`);
        console.log("Valves with valid test data (window.valveTestResults):", window.valveTestResults);
        console.log("Valves with no/invalid data (window.valvesWithNoData):", window.valvesWithNoData);

        return {
            valveTestResults: window.valveTestResults,
            valvesWithNoData: window.valvesWithNoData,
        };
    } catch (error) {
        console.error('Error in fetchValveTestResults:', error);
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
// --- DATA PROCESSING & STATUS LOGIC (Modified) ---
// --- DATA PROCESSING & STATUS LOGIC (Matrix-Based) ---
function getLiveStatusForAllRings(well) {
  const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
  let rings = [];

  const wellValves = (well.christmasTree && well.christmasTree.valves) || [];
  const orderedWellValves = [...wellValves].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (orderedWellValves.length === 0) {
      console.warn(`Well ${well.name || well.id} has no valves defined in its 'christmasTree.valves' property.`);
      return [];
  }

  // Analyze all valve failures to determine matrix conditions
  const failedValves = [];
  const failedSurfaceValves = [];
  const failedSubSurfaceValves = [];

  for (const valveDef of orderedWellValves) {
    const valveId = valveDef.id;
    const valveLabel = valveDef.name || valveDef.id;

    const valveTests = testResults[valveId];
    let latestResult = null;

    if (Array.isArray(valveTests) && valveTests.length > 0) {
      latestResult = valveTests[valveTests.length - 1];
    } else if (valveTests && typeof valveTests === 'object' && !Array.isArray(valveTests)) {
      latestResult = valveTests;
    }

    // Check if valve failed
    if (latestResult && typeof latestResult === 'object') {
      const testPassed = latestResult.pass && latestResult.test_valid && latestResult.leak_rate_pass;

      if (!testPassed) {
        const failureInfo = {
          valveId,
          valveLabel,
          result: latestResult,
          failureReason: (latestResult.failure_reasons && Array.isArray(latestResult.failure_reasons) && latestResult.failure_reasons.length)
            ? latestResult.failure_reasons.join(", ")
            : "Test failed"
        };

        failedValves.push(failureInfo);

        // Categorize valve type
        const convertedValveName = window.wellFailureModel.convertValve(valveId);
        if (convertedValveName === "SCSSV") {
          failedSubSurfaceValves.push(failureInfo);
        } else {
          failedSurfaceValves.push(failureInfo);
        }
      }
    }
  }

  // If no failed valves, return empty array
  if (failedValves.length === 0) {
    return [];
  }

  // Determine matrix condition and get failure code
  const wellType = getWellTypeKey(well.type);
  let matrixCategory = '';
  let failureCode = null;

  // Apply matrix logic to determine failure category
  if (failedSubSurfaceValves.length > 0 && failedSurfaceValves.length > 0) {
    // Both surface and subsurface failures
    matrixCategory = 'subSurfacePlusSurfaceFailure';
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, 1, wellType);
  } else if (failedSubSurfaceValves.length > 1) {
    // Multiple subsurface failures
    matrixCategory = 'multipleSubSurfaceFailures';
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, 1, wellType);
  } else if (failedSubSurfaceValves.length === 1) {
    // Single subsurface failure
    matrixCategory = 'singleSubSurfaceFailure';
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, 1, wellType);
  } else if (failedSurfaceValves.length > 1) {
    // Multiple surface failures
    matrixCategory = 'multipleSurfaceFailures';
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, 1, wellType);
  } else if (failedSurfaceValves.length === 1) {
    // Single surface failure
    matrixCategory = 'singleSurfaceFailure';
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, 1, wellType);
  }

  // Get mitigating action and color from failure code
  const mitigatingAction = window.wellFailureModel.getMitigatingAction(failureCode);
  const ringColor = mitigatingAction ? mitigatingAction.color : 'red';
  const matrixDescription = mitigatingAction ? mitigatingAction.description : 'Action required';

  // Create rings for each failed valve with matrix-determined color
  failedValves.forEach(failureInfo => {
    rings.push({
      label: failureInfo.valveLabel,
      color: ringColor,
      message: `${failureInfo.failureReason} - ${matrixDescription}`,
      failureCode: failureCode,
      matrixCategory: matrixCategory
    });
  });

  return rings;
}

// Helper function to convert well type to matrix key
function getWellTypeKey(wellType) {
  const typeMapping = {
    'Natural Flow': 'naturalFlow',
    'Sub-sea Natural Flow': 'subSeaNaturalFlow',
    'Water Injector': 'waterInjector',
    'Sub-sea Water Injector': 'subSeaWaterInjector',
    'Normally Unmanned Installation': 'normallyUnmannedInstallation'
  };
  
  return typeMapping[wellType] || 'naturalFlow';
}
// --- MATRIX-AWARE DASHBOARD RENDER ---
// --- MATRIX-AWARE DASHBOARD RENDER (Modified) ---
function renderMultiRingDashboard() {
  const container = document.getElementById('wellMultiRingBoard');
  if (!container) {
    console.error("Dashboard container 'wellMultiRingBoard' not found.");
    return;
  }

  const filtered = deduplicateWellsById(wells);
  container.innerHTML = '';
  
  if (filtered.length === 0) {
    container.innerHTML = "<p style='color:#ccc; text-align:center;'>No well data available.</p>";
    return;
  }

  let wellsMatchingMatrix = 0;

  filtered.forEach(well => {
    if (!well || typeof well.name === 'undefined') return;

    const testResults = window.valveTestResults && window.valveTestResults[well.name];

    // --- ONLY SHOW wells that match the matrix (have failures) ---
    if (!matchesMatrix(well, testResults)) {
      console.log(`Well ${well.name} does not match matrix conditions - skipping dashboard display`);
      return; // Skip this well, do NOT render it.
    }

    wellsMatchingMatrix++;
    console.log(`Well ${well.name} matches matrix conditions - displaying in dashboard`);

    // ... rest of the existing rendering code remains the same ...
    const ringData = getLiveStatusForAllRings(well);
    const totalRings = ringData.length;
    const maxRadius = 44;
    const minRadius = 9;
    const strokeWidth = 2;
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

  // Show message if no wells match matrix conditions
  if (wellsMatchingMatrix === 0) {
    container.innerHTML = "<p style='color:#ccc; text-align:center;'>No wells with failed tests to display.</p>";
  }

  console.log(`Dashboard: Displaying ${wellsMatchingMatrix} wells that match matrix conditions`);
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