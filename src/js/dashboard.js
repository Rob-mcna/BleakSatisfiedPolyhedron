// =================== Well Failure Model Matrix Implementation ===================
window.activeEscalations = window.activeEscalations || [];
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
  { name: "Water Injector", mappedType: "Dual Service" },
  { name: "Sub-sea Water Injector", mappedType: "Dual Service"  }
];

// =================== Complete Well Failure Matrix Implementation ===================

// Enhanced matrix based on the detailed images provided
window.wellFailureMatrix = window.wellFailureMatrix || {
  // Maintenance Schedule Failures
  maintenanceFailure: {
    1: {
      description: "Failed to carry out WIT or SIT within advised allowable timeframe.",
      codes: {
        Producer: 9, // Using subSeaNaturalFlow code from original
        "Dual Service": 9 // Using subSeaWaterInjector code from original
      }
    }
  },

  // Single Surface Failures
  singleSurfaceFailure: {
    1: { description: "Sub-Surface Safety device failure (SCSSV etc.)", codes: { Producer: 4, "Dual Service": 4 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    2: { description: "HMV failure (Gas or oil side) - Platform wells, see note 'A'", codes: { Producer: 4, "Dual Service": 4 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    3: { description: "HWV/MWV failure (Gas or oil side) - Platform wells, see note 'A'", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    4: { description: "MMV failure (Gas or oil side) - Platform wells, see note 'B'", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    5: { description: "SV (Gas or oil side) - See note 'B'", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    6: { description: "MIV or CIV (Where actuated - Subsea trees)", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    7: { description: "AXOV/XOV failure", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    8: { description: "Single annulus valve failure or VR plug failure - Non artificial lifted annuli only", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    9: { description: "External leak from tree/wellhead - See note 'D'", codes: { Producer: 9, "Dual Service": 9 }}, // Original subsea codes were null
    10: { description: "Loss of annulus pressure monitoring capability. Subsea wells and NUIs, see note 'K'", codes: { Producer: 8, "Dual Service": 8 }} // Using subSeaNaturalFlow and subSeaWaterInjector codes
  },

  // Multiple Surface Failures
  multipleSurfaceFailures: {
    1: { description: "SCSSV & actuated tree valve (HMV or HWV/MWV)", codes: { Producer: 5, "Dual Service": 5 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    2: { description: "SCSSV & MMV or SV  failure - See note 'B'", codes: { Producer: 4, "Dual Service": 4 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    3: { description: "HWV/MWV & HMV failure", codes: { Producer: 5, "Dual Service": 5 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    4: { description: "HMV & KWV or SV - See note 'B'", codes: { Producer: 4, "Dual Service": 4 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    5: { description: "HMV & MMV - See notes 'A' and 'B'", codes: { Producer: 4, "Dual Service": 4 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    6: { description: "HWV/MWV & KWV or SV - See notes 'A' and 'B'", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    7: { description: "HWV/MWV & MMV - See notes 'A' and 'B'", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    8: { description: "MMV & SV or KWV - See note 'B'", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    9: { description: "SCSSV & 2 manual valves (MMV or SV or KWV) - See note 'B'", codes: { Producer: 4, "Dual Service": 4 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    10: { description: "Multiple annulus valve/VR plug failure on 'A' annulus - See note 'C'", codes: { Producer: null, "Dual Service": null }} // Original subsea codes were null
  },

  // Integrity Failures (Single Sub-Surface)
  singleSubSurfaceFailure: {
    1: { description: "Integrity failure - water injection well with controlled completion leak via proven single leak path. See note 'E' ", codes: { Producer: null, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    2: { description: "Integrity failure - water injection well with controlled completion leak via proven multiplr leak path or unproven leak path. See note 'E'", codes: { Producer: null, "Dual Service": 2 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    3: { description: "Integrity failure - completion leak above downhole safety device, above or below allowable leak rate where SITHP is below 'A' ann MAASP. See note 'M'", codes: { Producer: 1 , "Dual Service": null }}, // Original subsea codes were null
    4: { description: "Integrity failure - completion leak below downhole safety device, below allowable leak rate where SITHP is below 'A' ann MAASP.", codes: { Producer: 1 , "Dual Service": null }}, // Original subsea codes were null
    5: { description: "Integrity failure - completion leak below downhole safety device, above allowable leak rate where SITHP is below 'A' ann MAASP.", codes: { Producer: 4, "Dual Service": 4 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    6: { description: "Integrity failure - completion leak where SITHP is above 'A' annulus MAASP.", codes: { Producer: 9, "Dual Service": 9 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    7: { description: "Integrity failure - Leak across production casing.", codes: { Producer: 9, "Dual Service": 9 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    8: { description: "Integrity failure - Intermediate or outer annulus pressurised from reservoir/formation (live annulus) or via intermediate casing. Unable to control source pressure below MAASP.", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    9: { description: "Integrity failure - Intermediate or outer annulus pressurised from reservoir/formation (live annulus) or via intermediate casing. Annulus pressure can be controlled below MAASP.", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    10: { description: "Integrity failure - 'A' annulus unable to hold positive pressure. E.G. Subhydrostatic well with packer leak.", codes: { Producer: 1, "Dual Service": 1 }}, // Using subSeaNaturalFlow and subSeaWaterInjector codes
    11: { description: "Integrity failure - Intermediate annuli unable to hold positive pressure", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    12: { description: "Integrity failure - Surface casing failure. Outer annulus unable to hold positive pressure.", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    13: { description: "PEC survey results show >25% wall thickness loss on surface casing", codes: { Producer: null, "Dual Service": null }} // Original subsea codes were null
  },

  // Multiple Sub-Surface Failures
  multipleSubSurfaceFailures: {
    1: { description: "Integrity failure - completion and intermediate casing/annulus issue.", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    2: { description: "Integrity failure - completion and surface casing/annulus issue.", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    3: { description: "Integrity failure - intermediate casing/annulus issue and surface casing/annulus issue.", codes: { Producer: null, "Dual Service": null }} // Original subsea codes were null
  },

  // Sub-Surface plus Surface Failure
  subSurfacePlusSurfaceFailure: {
    1: { description: "Live annulus + only or both annulus valve failure.", codes: { Producer: null, "Dual Service": null }}, // Original subsea codes were null
    2: { description: "Downhole safety device + completion failure above downhole safety device above allowable leak rate.", codes: { Producer: 4, "Dual Service": 4 }} // Using subSeaNaturalFlow and subSeaWaterInjector codes
  }
};

// Enhanced mitigating actions with traffic light colors from the matrix
window.mitigatingActions = window.mitigatingActions || {
  0: { color: "green", description: "No faults found, well tested within operating parameters", trafficLight: "green" },
  1: { color: "yellow", description: "Repair at next planned maintenance / intervention", trafficLight: "yellow" },
  2: { color: "yellow", description: "Repair at the earliest opportunity but within 24 months - the well can be flowed during this grace period. See note 'L'.", trafficLight: "yellow" },
  3: { color: "yellow", description: "Repair at the earliest opportunity but within 12 months - the well can be flowed during this grace period. See note 'L'.", trafficLight: "yellow" },
  4: { color: "yellow", description: "Repair at the earliest opportunity but within 6 months - the well can be flowed during this grace period. See note 'L'.", trafficLight: "yellow" },
  5: { color: "yellow", description: "Repair at the earliest opportunity but within 3 months - the well can be flowed during this grace period. See note 'L'.", trafficLight: "yellow" },
  6: { color: "yellow", description: "Repair at the earliest opportunity but within 2 months - the well can be flowed during this grace period. See note 'L'.", trafficLight: "yellow" },
  7: { color: "yellow", description: "Repair at the earliest opportunity but within 1 months - the well can be flowed during this grace period. See note 'L'.", trafficLight: "yellow" },
  8: { color: "orange", description: "Carry out formal Technical Review within 7 days to determine mitigating actions and when/how to repair and/or continue operation", trafficLight: "orange" },
  9: { color: "red", description: "Make well safe immediately and plan repair / test / suspension / abandonment. Make well safe may be carried out by repairing defect at initial visit to well.", trafficLight: "orange" },
  10: { color: "red", description: "Implement installation/field Emergency Response procedures immediately, make well safe at earliest opportunity and plan repair / suspension / abandonment.", trafficLight: "red" }
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
                const url = `http://127.0.0.1:5000/api/integrity_test/?well=${encodeURIComponent(wellId)}&valve=${encodeURIComponent(valveId)}`;
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

        const response = await fetch('http://127.0.0.1:5000/api/wells');
        if (!response.ok) {
            console.error("Failed to fetch wells data:", response.status, await response.text());
            showTemporaryMessage('Failed to load wells data', 'warning');
            if (document.getElementById('wellList')) renderWellsSection();
            return;
        }
        const wellsDataFromServer = await response.json();
        console.log('Fetched wells data:', wellsDataFromServer);

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
function getLiveStatusForAllRingsWithEscalation(well) {
    const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
    const rings = [];
    const wellType = getWellTypeKey(well.type);

    const wellValves = (well.christmasTree && well.christmasTree.valves) || [];
    if (wellValves.length === 0) {
        return []; // No valves to process
    }

    // Process each valve individually for failures and escalations
    for (const valveDef of wellValves) {
        const valveId = valveDef.id;
        const valveLabel = valveDef.name || valveDef.id;
        const valveTests = testResults[valveId];

        if (!Array.isArray(valveTests) || valveTests.length === 0) {
            continue; // No test data for this valve
        }

        // Use the latest test result
        const latestResult = valveTests[valveTests.length - 1];
        if (!latestResult || typeof latestResult !== 'object') {
            continue;
        }

        const isTestPassed = latestResult.status === "pass";

        // --- CORE LOGIC: If the test failed, process it ---
        if (!isTestPassed) {
            // 1. Determine the failure category and code using the matrix
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

            // 2. AUTOMATIC ESCALATION: Check if an escalation already exists
            const existingEscalation = window.escalationSystem.getEscalationForValve(well.name, valveId);

            if (!existingEscalation) {
                // 3. If no escalation exists, CREATE ONE AUTOMATICALLY
                console.log(`%c[AUTO-ESCALATION] New failure detected for ${well.name} - ${valveLabel}. Creating escalation.`, "color: #ff8c00; font-weight: bold;");
                
                // The 'false' indicates this was a system-initiated (automatic) escalation
                window.escalationSystem.createEscalation(well.name, valveId, failureDetails, false); 
            }

            // 4. Add a ring to the dashboard for this failed valve
            rings.push({
                label: valveLabel,
                color: mitigatingAction ? mitigatingAction.color : 'red',
                message: `${failureDetails.failureReason} - ${failureDetails.matrixDescription}`,
                failureCode: failureCode,
                matrixCategory: category,
                failureNumber: number, // Pass this along for the modal
                trafficLight: failureDetails.trafficLight,
                valveId: valveId
            });
        }
    }

    // Sort rings by severity (red, orange, yellow) for consistent display
    const colorOrder = { 'red': 1, 'orange': 2, 'yellow': 3, 'green': 4 };
    rings.sort((a, b) => (colorOrder[a.color] || 99) - (colorOrder[b.color] || 99));

    return rings;
}

// Helper function to convert well type to matrix key
// Helper function to convert well type to matrix key
function getWellTypeKey(wellType) {
  const typeMapping = {
    'Sub-sea Natural Flow': 'Producer',
    'Sub-sea Water Injector': 'Dual Service'
  };

  return typeMapping[wellType] || 'Producer'; // Default to Producer if well type not found in the strict list
}
// --- MATRIX-AWARE DASHBOARD RENDER ---
// --- MATRIX-AWARE DASHBOARD RENDER (Modified) ---

function colorMap(color) {
  const map = { red: "#e64a3a", orange: "#ff9800", yellow: "#e6c23a", green: "#19d219" };
  return map[color] || "#999";
}

function deduplicateWellsById(wellsArray) {
  if (!Array.isArray(wellsArray)) return [];
  
  const uniqueWells = {};
  const result = [];
  
  wellsArray.forEach(well => {
    if (!well || typeof well.name === 'undefined') return;
    
    // Only add if this well name hasn't been seen before
    if (!uniqueWells[well.name]) {
      uniqueWells[well.name] = true;
      result.push(well);
    }
  });
  
  console.log(`Deduplicated wells: ${wellsArray.length} → ${result.length}`);
  return result;
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
    const ringsStatus = getLiveStatusForAllRingsWithEscalation(w);
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

function fetchWellsAndSyncResultsWithFilter() {
  console.log(`Dashboard: Fetching all application data...`);
  
  fetch('http://127.0.0.1:5000/api/wells/')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(wellsData => {
      const processedWellsData = Array.isArray(wellsData) ? wellsData : [];
      
      // Apply deduplication first - critical step!
      wells = deduplicateWellsById(processedWellsData);
      window.wells = wells;
      
      console.log(`Dashboard: Fetched and deduplicated wells - ${wells.length} unique wells found`);
      
      return fetch('http://127.0.0.1:5000/api/valves/')
        .then(valvesResponse => {
          if (!valvesResponse.ok) {
            console.warn(`Dashboard: Failed to fetch valve list from API: ${valvesResponse.status}. Proceeding without full valve list.`);
            window.allValves = [];
            return [];
          } else {
            return valvesResponse.json().then(valvesData => {
              window.allValves = valvesData;
              console.log("Dashboard: Valve list fetched successfully.", window.allValves);
              return valvesData;
            });
          }
        })
        .then(() => {
          // Clear and initialize valve results containers for unique wells
          window.valveTestResults = {};
          window.selectedValveTestIndex = {};
          
          window.wells.forEach(well => {
            window.valveTestResults[well.name] = {};
            window.selectedValveTestIndex[well.name] = {};
          });

          return fetchValveTestResults();
        })
        .then(() => {
          console.log("Dashboard: Well data and valve test results fetched successfully.");
          renderMultiRingDashboardWithFilter();
          
          if (typeof renderWellsSection === "function" && document.getElementById('wellList')) {
            renderWellsSection();
          }
        })
        .catch(testError => {
          console.warn("Dashboard: Failed to fetch valve test results:", testError);
          renderMultiRingDashboardWithFilter();
        });
    })
    .catch(error => {
      console.error("Dashboard: Failed to fetch and sync data:", error);
      const container = document.getElementById('wellMultiRingBoard');
      if (container) {
        container.innerHTML = `<p style="color:#888; text-align:center; padding:20px;">Error loading application data.</p>`;
      }
    });
}

function runIntegrityTestAndRefreshDashboard(testData) {
  console.log('Dashboard: Submitting integrity test...');

  fetch('http://127.0.0.1:5000/api/run_integrity_test', {
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

function initializeDashboard() {
  console.log('Dashboard: Initializing...');
  
  // Clear any existing state to prevent duplication issues
  window.wells = [];
  window.valveTestResults = {};
  window.selectedValveTestIndex = {};
  window.valvesWithNoData = {};
  
  // Check if we need to create the container
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
  
  // Initialize the dashboard with proper filtering
  fetchWellsAndSyncResultsWithFilter();
}


document.addEventListener('DOMContentLoaded', () => {
  // Use timeout to ensure everything else is loaded first
  setTimeout(() => {
    initializeDashboard();
  }, 100);
});
// Modified showTooltip function to make tooltips clickable// Modified showTooltip function to properly detect all rings and extend hover time
function showTooltip(e, well, div, ringData) {
  const rect = div.getBoundingClientRect();
  const x = e.clientX - rect.left - 45;
  const y = e.clientY - rect.top - 45;
  const r = Math.sqrt(x * x + y * y);

  // Store well info globally
  if (well && well.name) {
    window.currentWellContext = {
      name: well.name,
      id: well.id || null,
      wellObject: well
    };
    console.log('Set current well context:', window.currentWellContext);
  }

  let ringInfo = null;
  let ringIndex = -1;
  
  // Calculate actual radii based on the rendering logic from your dashboard
  const totalRings = ringData.length;
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

  const dynamicRadii = ringData.map((_, idx) => maxRadius - strokeWidth / 2 - (idx * effectiveSpacing));
  const validRadii = dynamicRadii.filter(radius => radius > strokeWidth / 2);
  
  // Increased detection width for better click/hover detection
  const ringHalfWidth = strokeWidth + 2; // Increased from 3.5 to strokeWidth + 2

  // Check each ring from outermost to innermost
  for (let i = 0; i < validRadii.length; i++) {
    const ringRadius = validRadii[i];
    if (Math.abs(r - ringRadius) <= ringHalfWidth) {
      // Find the corresponding ring data
      const originalIndex = dynamicRadii.indexOf(ringRadius);
      if (originalIndex !== -1 && ringData[originalIndex]) {
        ringInfo = ringData[originalIndex];
        ringIndex = i;
        break;
      }
    }
  }

  // Only show tooltip if there is matrix/ring info (not just well name)
  if (ringInfo && ringInfo.failureCode) {
    const text = `<b>${ringInfo.label || 'N/A'}:</b> ${ringInfo.message || 'No message'}
      <div style="margin-top: 8px; font-size: 11px; color: #888;">
        Click for detailed information
      </div>`;
    showTooltipBox(e.clientX, e.clientY, text, ringInfo, well.name);
  } else {
    hideTooltip();
  }
}

// Modified showTooltipBox function with better hover retention
let hideTimeout = null;
let currentTooltip = null;

function showTooltipBox(x, y, html, ringInfo = null, wellName = null) {
  // Store well name for click handler
  if (wellName) {
    window.currentTooltipWellName = wellName;
  }
  
  // Clear any existing hide timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  let t = document.getElementById('dashboardTooltip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'dashboardTooltip';
    t.className = 'tooltip';
    t.style.cssText = `
      position: absolute;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      max-width: 250px;
      z-index: 1000;
      cursor: pointer;
      border: 1px solid #555;
      transition: opacity 0.2s ease;
      pointer-events: auto;
    `;
    document.body.appendChild(t);
    
    // Add hover handlers to keep tooltip visible when hovering over it
    t.addEventListener('mouseenter', function() {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    });
    
    t.addEventListener('mouseleave', function() {
      startTooltipHideTimeout();
    });
  }
  
  currentTooltip = t;
  t.innerHTML = html;
  t.style.left = (x + 15) + 'px';
  t.style.top = (y + 15) + 'px';
  t.style.display = 'block';
  t.style.visibility = 'visible';
  t.style.opacity = '1';

  // Mark if tooltip has matrix info
  if (ringInfo && ringInfo.failureCode) {
    t.setAttribute('data-matrix-info', 'true');
  } else {
    t.removeAttribute('data-matrix-info');
  }

  // Remove any existing click handlers
  t.onclick = null;
  // Add click handler if we have ring information
  if (ringInfo && ringInfo.failureCode) {
    t.onclick = function(event) {
      event.stopPropagation();
      showDetailedFailureModal(ringInfo, wellName || window.currentTooltipWellName);
    };
  }
}

// Helper to start the hide timeout (shared for well and tooltip mouseleave)
function startTooltipHideTimeout() {
  let t = document.getElementById('dashboardTooltip');
  if (!t) return;
  if (hideTimeout) clearTimeout(hideTimeout);

  const delay = t.getAttribute('data-matrix-info') === 'true' ? 800 : 0; // 0.8s or instant, adjust as needed
  hideTimeout = setTimeout(() => {
    if (t && !t.matches(':hover')) { // Don't hide if mouse is over tooltip
      t.style.opacity = '0';
      setTimeout(() => {
        if (t) t.style.display = 'none';
      }, 200);
    }
  }, delay);
}



// And make sure you clear the timeout on onmousemove/onmouseenter:

// Modified hideTooltip function with longer delay for matrix info
function hideTooltip() {
  let t = document.getElementById('dashboardTooltip');
  if (t) {
    // Clear any existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    
    if (t.getAttribute('data-matrix-info') === 'true') {
      // Longer delay for matrix info tooltips (3 seconds instead of 5)
      hideTimeout = setTimeout(() => {
        if (t && t.style.display !== 'none') {
          t.style.opacity = '0';
          setTimeout(() => {
            if (t) t.style.display = 'none';
          }, 200);
        }
      }, 8000);
    } else {
      // Immediate hide for non-matrix tooltips
      t.style.opacity = '0';
      setTimeout(() => {
        if (t) t.style.display = 'none';
      }, 200);
    }
  }
}

// Add this helper function to handle mouse movement more smoothly
function handleWellHover(e, well, div, ringData) {
  // Ensure well context is available
  window.currentDashboardWell = well;
  
  if (!div._tooltipThrottle) {
    div._tooltipThrottle = true;
    setTimeout(() => {
      div._tooltipThrottle = false;
      showTooltip(e, well, div, ringData);
    }, 50);
  }
}


// Helper function to get matrix failure details
function getMatrixFailureDetails(category, failureNumber) {
  if (window.wellFailureMatrix && window.wellFailureMatrix[category] && window.wellFailureMatrix[category][failureNumber]) {
    return window.wellFailureMatrix[category][failureNumber];
  }
  return null;
}

// Helper function to get color for failure code
function getColorForCode(code) {
  const mitigatingAction = window.wellFailureModel.getMitigatingAction(code);
  if (mitigatingAction) {
    const colorMap = {
      'green': '#19d219',
      'yellow': '#e6c23a', 
      'orange': '#ff9800',
      'red': '#e64a3a'
    };
    return colorMap[mitigatingAction.color] || '#999';
  }
  return '#999';
}

// Helper function to format category names
function formatCategoryName(category) {
  const nameMap = {
    'maintenanceFailure': 'Maintenance Schedule Failure',
    'singleSurfaceFailure': 'Single Surface Failure',
    'multipleSurfaceFailures': 'Multiple Surface Failures',
    'singleSubSurfaceFailure': 'Single Sub-Surface/Integrity Failure',
    'multipleSubSurfaceFailures': 'Multiple Sub-Surface Failures',
    'subSurfacePlusSurfaceFailure': 'Combined Surface & Sub-Surface Failure'
  };
  return nameMap[category] || category;
}

// =================== Dashboard Filter Dropdown Implementation ===================

// Add this function to determine well status categories
function categorizeWellByTestResults(well) {
  const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
  
  // Check if well has any valve test data
  const hasTestData = Object.keys(testResults).length > 0;
  if (!hasTestData) {
    return 'no-data';
  }

  // Check if any valve has failed tests
  let hasFailures = false;
  let hasValidTests = false;

  for (const valveId in testResults) {
    const tests = testResults[valveId];
    if (Array.isArray(tests) && tests.length > 0) {
      hasValidTests = true;
      const latestTest = tests[tests.length - 1];
      if (latestTest && typeof latestTest === 'object') {
        const testPassed = latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass;
        if (!testPassed) {
          hasFailures = true;
          break;
        }
      }
    }
  }

  if (!hasValidTests) {
    return 'no-data';
  }

  return hasFailures ? 'with-failures' : 'no-failures';
}

// Modified function to filter wells based on selected option
function getWellsByFilterOption(filterOption) {
  // First ensure we have deduplicated wells
  const allWells = deduplicateWellsById(wells);
  
  switch (filterOption) {
    case 'with-failures':
      return allWells.filter(well => {
        const category = categorizeWellByTestResults(well);
        return category === 'with-failures';
      });
      
    case 'no-failures':
      return allWells.filter(well => {
        const category = categorizeWellByTestResults(well);
        return category === 'no-failures';
      });
      
    case 'all':
      return allWells;
      
    default:
      return allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures');
  }
}


// Function to create and insert the filter dropdown
function createDashboardFilterDropdown() {
  // Find the dashboard container
  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (!dashboardContainer) {
    console.error("Dashboard container not found");
    return;
  }

  // Check if dropdown already exists
  let existingDropdown = document.getElementById('dashboardFilterContainer');
  if (existingDropdown) {
    existingDropdown.remove();
  }

  // Create dropdown container
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

  // Create label
  const label = document.createElement('label');
  label.textContent = 'Show Wells:';
  label.style.cssText = `
    font-weight: bold;
    color: #333;
    font-size: 14px;
  `;

  // Create dropdown select
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

  // Add options
  const options = [
    { value: 'with-failures', text: 'With Failures Only' },
    { value: 'no-failures', text: 'No Failures (Passed Tests)' },
    { value: 'all', text: 'All Wells' }
  ];

  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    select.appendChild(optionElement);
  });

  // Set default to current behavior (with failures)
  select.value = 'with-failures';

  // Add change event listener
  select.addEventListener('change', function() {
    const selectedFilter = this.value;
    console.log(`Dashboard filter changed to: ${selectedFilter}`);
    renderFilteredDashboard(selectedFilter);
    updateFilteredKPIs(selectedFilter);
  });

  // Create stats display
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

  // Assemble dropdown
  dropdownContainer.appendChild(label);
  dropdownContainer.appendChild(select);
  dropdownContainer.appendChild(statsContainer);

  // Insert before dashboard
  dashboardContainer.parentNode.insertBefore(dropdownContainer, dashboardContainer);

  // Initial stats update
  updateFilterStats('with-failures');
}

// Function to update the stats display
function updateFilterStats(filterOption) {
  const statsContainer = document.getElementById('filterStats');
  if (!statsContainer) return;

  const allWells = deduplicateWellsById(wells);
  const withFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures').length;
  const noFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'no-failures').length;
  const allWithData = withFailures + noFailures;
  const noData = allWells.filter(well => categorizeWellByTestResults(well) === 'no-data').length;

  let currentCount;
  switch (filterOption) {
    case 'with-failures':
      currentCount = withFailures;
      break;
    case 'no-failures':
      currentCount = noFailures;
      break;
    case 'all':
      currentCount = allWells.length;
      break;
    default:
      currentCount = withFailures;
  }

  statsContainer.innerHTML = `
    Showing: ${currentCount} wells<br>
    <small>Failed: ${withFailures} | Passed: ${noFailures} | No Data: ${noData}</small>
  `;
}

// Modified dashboard render function with filtering
function renderFilteredDashboard(filterOption = 'with-failures') {
  const container = document.getElementById('wellMultiRingBoard');
  if (!container) {
    console.error("Dashboard container 'wellMultiRingBoard' not found.");
    return;
  }

  // Get wells based on filter and ensure they're properly deduplicated
  const filteredWells = getWellsByFilterOption(filterOption);
  
  // Empty the container first to prevent duplication
  container.innerHTML = '';
  
  if (filteredWells.length === 0) {
    let message;
    switch (filterOption) {
      case 'no-failures':
        message = "No wells with passed tests found.";
        break;
      case 'all-with-data':
        message = "No wells with test data found.";
        break;
      default:
        message = "No wells with failed tests found.";
    }
    container.innerHTML = `<p style='color:#ccc; text-align:center;'>${message}</p>`;
    return;
  }

  // Track rendered wells to prevent duplicates within this function
  const renderedWells = new Set();

  filteredWells.forEach(well => {
    // Skip invalid wells or already rendered ones
    if (!well || typeof well.name === 'undefined') return;
    if (renderedWells.has(well.name)) return;
    
    renderedWells.add(well.name);

    const ringData = getLiveStatusForAllRingsWithEscalation(well);
    
    // For wells with no failures, create a single green ring
    let displayRings = ringData;
    if (filterOption === 'no-failures' && ringData.length === 0) {
      displayRings = [{
        label: 'All Tests Passed',
        color: 'green',
        message: 'All valve tests passed successfully',
        failureCode: 0
      }];
    } else if (filterOption === 'all-with-data' && ringData.length === 0) {
      displayRings = [{
        label: 'Tests Passed',
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
      const originalRingIndex = dynamicRadii.indexOf(radius);
      if (originalRingIndex !== -1 && displayRings[originalRingIndex]) {
        return `<circle cx="45" cy="45" r="${radius}" stroke="${colorMap(displayRings[originalRingIndex].color)}" stroke-width="${strokeWidth}" fill="none" />`;
      }
      return '';
    }).join('');

    const centerCircleRadius = Math.max(minRadius, (validRadii.length > 0 ? validRadii[validRadii.length - 1] - strokeWidth / 2 : minRadius));
    const centerFill = '#ec5642ff'; // Always use your blue
    const svg = `<svg width="90" height="90" style="display:block">
      ${ringsHtml}
      <circle cx="45" cy="45" r="${centerCircleRadius}" fill="${centerFill}" />
    </svg>`;
        
    const div = document.createElement('div');
    div.className = "well-multiring";
    div.dataset.wellName = well.name; // Add well name as data attribute for debugging
    div.innerHTML = svg + `<div class="well-label">${well.name}</div>`;

    div.onmousemove = (e) => {
      // Store well context globally for tooltip system
      window.currentDashboardWell = well;
      handleWellHover(e, well, div, displayRings.slice(0, validRadii.length));
    };
   
    // Attach this to the well/ring element's onmouseleave:
    div.onmouseleave = startTooltipHideTimeout;
    div.onmouseenter = function() {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = null;
};

  div.onclick = () => {
  console.log(`Dashboard: Well clicked: ${well.name}`);
  
  if (typeof showSection === "function") {
    // First show the wells section
    showSection('wells');
    
    // Wait longer and try multiple approaches to select the well
    setTimeout(() => {
      const wellDropdown = document.getElementById('wellDropdown');
      console.log(`Attempting to select well ${well.name} in dropdown`);
      
      if (wellDropdown) {
        // Try to find the exact option
        const option = Array.from(wellDropdown.options).find(opt => 
          opt.value === well.name || opt.textContent.trim() === well.name
        );
        
        if (option) {
          console.log(`Found option for ${well.name}, selecting...`);
          wellDropdown.value = option.value;
          
          // Trigger multiple events to ensure it's detected
          wellDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          wellDropdown.dispatchEvent(new Event('input', { bubbles: true }));
          
          // If there's a custom handler function, call it directly
          if (typeof onWellSelectionChange === "function") {
            onWellSelectionChange(well.name);
          }
          
          console.log(`Successfully selected well: ${well.name}`);
        } else {
          console.warn(`Option not found for well: ${well.name}`);
          console.log('Available options:', Array.from(wellDropdown.options).map(opt => opt.value));
        }
      } else {
        console.error('Well dropdown not found');
      }
      
      // Also try to trigger any well detail display functions
      if (typeof displayWellDetails === "function") {
        displayWellDetails(well.name);
      }
      if (typeof renderWellDetail === "function") {
        renderWellDetail(well.name);
      }
      
    }, 50); // Increased timeout to ensure wells section is fully loaded
  } else {
    console.error('showSection function not available');
  }
};
    container.appendChild(div);
    
    // Add indicators if those functions exist
    if (typeof addEscalationIndicatorToWell === "function") {
      addEscalationIndicatorToWell(div, well.name);
    }
    if (typeof addDeviationIndicatorToWell === "function") {
      addDeviationIndicatorToWell(div, well.name);
    }
  });

  console.log(`Dashboard: Rendered ${renderedWells.size} unique wells with filter: ${filterOption}`);
    // Add safety system legend if in safety system mode
  if (filterOption === 'safety-system') {
    addSafetySystemLegend();
  } else {
    removeSafetySystemLegend();
  }


}

// Function to update KPIs based on filtered wells
function updateFilteredKPIs(filterOption) {
  const filteredWells = getWellsByFilterOption(filterOption);
  
  if (document.getElementById('kpiWells')) {
    document.getElementById('kpiWells').textContent = filteredWells.length;
  }

  let redRings = 0, orangeRings = 0, yellowRings = 0, wellsWithRedRing = 0;

  filteredWells.forEach(well => {
    const category = categorizeWellByTestResults(well);
    
    if (category === 'with-failures') {
      const ringsStatus = getLiveStatusForAllRingsWithEscalation(well);
      let hasRedRing = false;
      ringsStatus.forEach(ring => {
        if (ring.color === 'red') { redRings++; hasRedRing = true; }
        if (ring.color === 'orange') orangeRings++;
        if (ring.color === 'yellow') yellowRings++;
      });
      if (hasRedRing) wellsWithRedRing++;
    }
    // Wells with no failures don't contribute to failure counts
  });

  if (document.getElementById('kpiRed')) document.getElementById('kpiRed').textContent = redRings;
  if (document.getElementById('kpiOrange')) document.getElementById('kpiOrange').textContent = orangeRings;
  if (document.getElementById('kpiYellow')) document.getElementById('kpiYellow').textContent = yellowRings;

  if (document.getElementById('kpiRepairs')) {
    document.getElementById('kpiRepairs').textContent = wellsWithRedRing;
  }

  // Deviations count stays the same regardless of filter
  if (document.getElementById('kpiDeviations')) {
    document.getElementById('kpiDeviations').textContent = countActiveDeviationsFromRecords();
  }
}
// Add this function to create a legend for the dashboard


// Modified main render function to use the new filtering system
function renderMultiRingDashboardWithFilter() {
  // Create dropdown if it doesn't exist
  createDashboardFilterDropdown();
  addEscalationManagementButton();

  
  // Get current filter value or default to 'with-failures'
  const filterSelect = document.getElementById('dashboardFilter');
  const currentFilter = filterSelect ? filterSelect.value : 'with-failures';
  
  // Render with current filter
  renderFilteredDashboard(currentFilter);
  updateFilteredKPIs(currentFilter);
  updateFilterStats(currentFilter);
}

// Update the main initialization functions
function fetchWellsAndSyncResultsWithFilter() {
  console.log(`Dashboard: Fetching all application data...`);
  
  // Keep all the existing fetch logic from fetchWellsAndSyncResults
  fetch('http://127.0.0.1:5000/api/wells/')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(wellsData => {
      const processedWellsData = wellsData || [];
      
      return fetch('http://127.0.0.1:5000/api/valves/')
        .then(valvesResponse => {
          if (!valvesResponse.ok) {
            console.warn(`Dashboard: Failed to fetch valve list from API: ${valvesResponse.status}. Proceeding without full valve list.`);
            window.allValves = [];
          } else {
            return valvesResponse.json().then(valvesData => {
              window.allValves = valvesData;
              console.log("Dashboard: Valve list fetched successfully.", window.allValves);
            });
          }
        })
        .then(() => {
          wells = deduplicateWellsById(processedWellsData);
          window.wells = wells;

          window.valveTestResults = {};
          window.wells.forEach(well => {
            window.valveTestResults[well.name] = {};
          });

          return fetchValveTestResults();
        })
        .then(() => {
          console.log("Dashboard: Well data and valve test results fetched successfully.");
          renderMultiRingDashboardWithFilter();
          
          if (typeof renderWellsSection === "function" && document.getElementById('wellList')) {
            renderWellsSection();
          }
        })
        .catch(testError => {
          console.warn("Dashboard: Failed to fetch valve test results:", testError);
          renderMultiRingDashboardWithFilter();
        });
    })
    .catch(error => {
      console.error("Dashboard: Failed to fetch and sync data:", error);
      const container = document.getElementById('wellMultiRingBoard');
      if (container) {
        container.innerHTML = `<p style="color:#888; text-align:center; padding:20px;">Error loading application data.</p>`;
      }
    });
}


// Update window exports
window.renderMultiRingDashboard = renderMultiRingDashboardWithFilter;
window.fetchWellsAndSyncResults = fetchWellsAndSyncResultsWithFilter;
window.categorizeWellByTestResults = categorizeWellByTestResults;
window.getWellsByFilterOption = getWellsByFilterOption;
window.renderFilteredDashboard = renderFilteredDashboard;
window.onload = function() {
    console.log(`Dashboard: Initializing for user: ${window.currentUser.login}`);
    fetchWellsAndSyncResults();
};
window.runIntegrityTestAndRefreshDashboard = runIntegrityTestAndRefreshDashboard;
window.fetchValveTestResults = fetchValveTestResults;
window.getLiveStatusForAllRingsWithEscalation = getLiveStatusForAllRingsWithEscalation;
// 6. Update the window objects to use these new functions
window.deduplicateWellsById = deduplicateWellsById;

window.initializeDashboard = initializeDashboard;