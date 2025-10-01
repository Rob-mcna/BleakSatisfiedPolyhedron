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

/**
 * ===================================================================================
 * OPTIMIZED: Replacement for fetchValveTestResults to prevent a "request storm".
 * This version fetches data in manageable chunks.
 * ===================================================================================
 */
async function fetchValveTestResults(batchSize = 50) {
    try {
        console.log('--- Starting to fetch valve test results in batches ---');
        const wells = window.wells || [];
        window.valveTestResults = window.valveTestResults || {};
        window.selectedValveTestIndex = window.selectedValveTestIndex || {};
        window.valvesWithNoData = window.valvesWithNoData || {};

        const allFetchTasks = [];
        for (const well of wells) {
            const wellId = well.id;
            const wellName = well.name;
            const valves = (well.christmasTree && Array.isArray(well.christmasTree.valves))
                ? well.christmasTree.valves : [];

            for (const valve of valves) {
                const valveId = valve.id;
                allFetchTasks.push({ wellId, wellName, valveId });
            }
        }

        console.log(`Total fetch tasks to perform: ${allFetchTasks.length}`);

        let addedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < allFetchTasks.length; i += batchSize) {
            const batch = allFetchTasks.slice(i, i + batchSize);
            console.log(`Fetching batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allFetchTasks.length / batchSize)}...`);

            const fetchPromises = batch.map(({ wellId, wellName, valveId }) => {
                const url = `http://10.226.112.188:5000/api/integrity_test/?well=${encodeURIComponent(wellId)}&valve=${encodeURIComponent(valveId)}`;
                return fetch(url)
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
                    });
            });

            const resultsArray = await Promise.all(fetchPromises);

            for (const { wellName, valveId, data } of resultsArray) {
                let isValid = false;
                if (data && typeof data === "object" && !Array.isArray(data)) {
                    if (!("Error" in data || "error" in data)) isValid = true;
                } else if (Array.isArray(data) && data.length > 0) {
                    isValid = data.every(item => item && typeof item === "object" && !("Error" in item || "error" in item));
                }

                if (isValid) {
                    // BUG FIX: Ensure sub-objects are initialized if they don't exist
                    if (!window.valveTestResults[wellName]) {
                        window.valveTestResults[wellName] = {};
                    }
                    if (!window.selectedValveTestIndex[wellName]) {
                        window.selectedValveTestIndex[wellName] = {};
                    }
                    window.valveTestResults[wellName][valveId] = Array.isArray(data) ? data : [data];
                    window.selectedValveTestIndex[wellName][valveId] = 0;
                    addedCount++;
                } else {
                    if (!window.valvesWithNoData[wellName]) window.valvesWithNoData[wellName] = [];
                    window.valvesWithNoData[wellName].push(valveId);
                    skippedCount++;
                }
            }
             // Give the browser a moment to breathe between batches
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`--- Fetch Complete ---`);
        console.log(`Valves with valid test data: ${addedCount}`);
        console.log(`Valves skipped (invalid/no data): ${skippedCount}`);

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

        const response = await fetch('http://10.226.112.188:5000/api/wells');
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
            // OPTIMIZED: Call the batched version of the fetch function
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
  // The main initialization is now handled by initializeDashboard
});

// --- DATA PROCESSING & STATUS LOGIC (Matrix-Based) ---
function getLiveStatusForAllRingsWithEscalation(well) {
    const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
    const rings = [];
    const wellType = getWellTypeKey(well.type);

    const wellValves = (well.christmasTree && well.christmasTree.valves) || [];
    if (wellValves.length === 0) {
        return [];
    }

    const failedValves = analyzeMultipleFailures(well, testResults);
    
    if (failedValves.length === 0) {
        return []; // No failures found
    }
    
    const matrixInfo = determineMatrixCategoryForMultipleFailures(failedValves);
    
    if (!matrixInfo) {
        return []; // Couldn't determine matrix category
    }
    
    const failureCode = window.wellFailureModel.getFailureCode(matrixInfo.category, matrixInfo.number, wellType);
    const mitigatingAction = window.wellFailureModel.getMitigatingAction(failureCode);
    
    if (failureCode === null || failureCode === undefined) {
        console.warn(`No failure code found for ${well.name} - Category: ${matrixInfo.category}, Number: ${matrixInfo.number}, Well Type: ${wellType}`);
        return [];
    }
    
    const failureDetails = {
        failureReason: failedValves.map(v => `${v.valveLabel}: ${v.failureReasons.join(", ")}`).join("; "),
        failureCode: failureCode,
        matrixCategory: matrixInfo.category,
        matrixNumber: matrixInfo.number,
        trafficLight: mitigatingAction ? mitigatingAction.trafficLight : 'red',
        matrixDescription: mitigatingAction ? mitigatingAction.description : 'Action required',
        wellType: wellType,
        failedValves: failedValves,
        timestamp: new Date().toISOString()
    };
    
    const existingEscalation = window.escalationSystem && window.escalationSystem.getEscalationForWell ? 
        window.escalationSystem.getEscalationForWell(well.name) : null;
    
    if (!existingEscalation && window.escalationSystem && window.escalationSystem.createEscalation) {
        console.log(`%c[AUTO-ESCALATION] Multiple failure detected for ${well.name}. Creating escalation.`, "color: #ff8c00; font-weight: bold;");
        window.escalationSystem.createEscalation(well.name, 'MULTIPLE', failureDetails, false);
    }
    
    const combinedLabel = failedValves.length === 1 ? 
        failedValves[0].valveLabel : 
        `${failedValves.length} Valves Failed`;
        
    rings.push({
        label: combinedLabel,
        color: mitigatingAction ? mitigatingAction.color : 'red',
        message: `${failureDetails.failureReason} - ${failureDetails.matrixDescription}`,
        failureCode: failureCode,
        matrixCategory: matrixInfo.category,
        failureNumber: matrixInfo.number,
        trafficLight: failureDetails.trafficLight,
        valveId: failedValves.length === 1 ? failedValves[0].valveId : 'MULTIPLE',
        failedValves: failedValves
    });

    return rings;
}
// Helper function to convert well type to matrix key
function getWellTypeKey(wellType) {
  const typeMapping = {
    'Sub-sea Natural Flow': 'Producer',
    'Sub-sea Water Injector': 'Dual Service'
  };

  return typeMapping[wellType] || 'Producer'; // Default to Producer
}
// --- MATRIX-AWARE DASHBOARD RENDER ---
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
    
    if (!uniqueWells[well.name]) {
      uniqueWells[well.name] = true;
      result.push(well);
    }
  });
  
  return result;
}

function countActiveDeviationsFromRecords() {
  return (window.deviations || []).filter(d => d.status === "open" || d.status === "dispensation_requested").length;
}

// This function is now just for updating KPIs, rendering is separate.
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
  });

  if (document.getElementById('kpiRed')) document.getElementById('kpiRed').textContent = redRings;
  if (document.getElementById('kpiOrange')) document.getElementById('kpiOrange').textContent = orangeRings;
  if (document.getElementById('kpiYellow')) document.getElementById('kpiYellow').textContent = yellowRings;
  if (document.getElementById('kpiRepairs')) document.getElementById('kpiRepairs').textContent = wellsWithRedRing;

  if (document.getElementById('kpiDeviations')) {
    document.getElementById('kpiDeviations').textContent = countActiveDeviationsFromRecords();
  }
}

// OPTIMIZED main data fetch function
function fetchWellsAndSyncResultsWithFilter() {
  console.log(`Dashboard: Fetching all application data...`);
  if (typeof showTemporaryMessage === 'function') showTemporaryMessage('Loading wells and test data...', 'info');

  fetch('http://10.226.112.188:5000/api/wells/')
    .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
    .then(wellsData => {
      wells = deduplicateWellsById(wellsData || []);
      window.wells = wells;
      
      // BUG FIX: Properly initialize both global objects for all wells before fetching
      window.valveTestResults = {};
      window.selectedValveTestIndex = {};
      wells.forEach(well => { 
          window.valveTestResults[well.name] = {}; 
          window.selectedValveTestIndex[well.name] = {};
      });

      // Use the new batched fetch function
      return fetchValveTestResults(); 
    })
    .then(() => {
      console.log("Dashboard: Well data and valve test results fetched successfully.");
      if (typeof showTemporaryMessage === 'function') showTemporaryMessage('Data loaded. Rendering dashboard...', 'success');
      
      renderMultiRingDashboardWithFilter(); // Call the render trigger
      
      if (typeof renderWellsSection === "function" && document.getElementById('wellList')) {
        renderWellsSection();
      }
    })
    .catch(error => {
      console.error("Dashboard: Failed to fetch and sync data:", error);
      if (typeof showTemporaryMessage === 'function') showTemporaryMessage('Error loading application data.', 'error');
      const container = document.getElementById('wellMultiRingBoard');
      if (container) {
        container.innerHTML = `<p style="color:#888; text-align:center; padding:20px;">Error loading application data.</p>`;
      }
    });
}

function runIntegrityTestAndRefreshDashboard(testData) {
  console.log('Dashboard: Submitting integrity test...');

  fetch('http://10.226.112.188:5000/api/run_integrity_test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  })
  .then(response => response.ok ? response.json() : response.json().then(err => Promise.reject(err)))
  .then(result => {
    console.log("Dashboard: Integrity test submitted successfully.", result);
    fetchWellsAndSyncResultsWithFilter();
  })
  .catch(error => {
    console.error("Dashboard: Error running integrity test:", error);
    alert(`Error during integrity test: ${error.error || error.message}`);
  });
}

function initializeDashboard() {
  console.log('Dashboard: Initializing...');
  
  window.wells = [];
  window.valveTestResults = {};
  window.selectedValveTestIndex = {};
  window.valvesWithNoData = {};
  
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


document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeDashboard();
  }, 100);
});


function getFailureCategoryAndNumber(testResult) {
  return {
    category: 'singleSurfaceFailure',
    number: 1 // SCSSV failure as default
  };
}

function analyzeMultipleFailures(well, testResults) {
  const failedValves = [];
  const wellValves = (well.christmasTree && well.christmasTree.valves) || [];
  
  for (const valveDef of wellValves) {
    const valveId = valveDef.id;
    const valveTests = testResults[valveId];

    if (!Array.isArray(valveTests) || valveTests.length === 0) continue;

    const latestResult = valveTests[valveTests.length - 1];
    if (!latestResult || typeof latestResult !== 'object') continue;

    const isTestPassed = latestResult.pass && latestResult.test_valid && latestResult.leak_rate_pass;
    
    if (!isTestPassed) {
      failedValves.push({
        valveId,
        valveLabel: valveDef.name || valveDef.id,
        valveType: getValveType(valveDef.id),
        testResult: latestResult,
        failureReasons: latestResult.failure_reasons || ["Test Failed"]
      });
    }
  }

  return failedValves;
}

function getValveType(valveId) {
  const valveId_upper = String(valveId).toUpperCase();
  if (valveId_upper.includes('SCSSV')) return 'SCSSV';
  if (valveId_upper.includes('HMV')) return 'HMV';
  if (valveId_upper.includes('HWV')) return 'HWV';
  if (valveId_upper.includes('MWV')) return 'MWV';
  if (valveId_upper.includes('MMV')) return 'MMV';
  if (valveId_upper.includes('SV')) return 'SV';
  if (valveId_upper.includes('KWV')) return 'KWV';
  if (valveId_upper.includes('MIV')) return 'MIV';
  if (valveId_upper.includes('CIV')) return 'CIV';
  if (valveId_upper.includes('AXOV') || valveId_upper.includes('XOV')) return 'AXOV';
  return 'OTHER';
}

function determineMatrixCategoryForMultipleFailures(failedValves) {
  if (failedValves.length === 0) return null;
  
  if (failedValves.length === 1) {
    const valveType = failedValves[0].valveType;
    return mapSingleValveFailureToMatrix(valveType);
  }
  
  const valveTypes = failedValves.map(v => v.valveType);
  const uniqueTypes = [...new Set(valveTypes)];
  
  if (uniqueTypes.includes('SCSSV') && (uniqueTypes.includes('HMV') || uniqueTypes.includes('HWV') || uniqueTypes.includes('MWV'))) return { category: 'multipleSurfaceFailures', number: 1 };
  if (uniqueTypes.includes('SCSSV') && (uniqueTypes.includes('MMV') || uniqueTypes.includes('SV'))) return { category: 'multipleSurfaceFailures', number: 2 };
  if (uniqueTypes.includes('HWV') && uniqueTypes.includes('HMV')) return { category: 'multipleSurfaceFailures', number: 3 };
  if (uniqueTypes.includes('HMV') && (uniqueTypes.includes('KWV') || uniqueTypes.includes('SV'))) return { category: 'multipleSurfaceFailures', number: 4 };
  if (uniqueTypes.includes('HMV') && uniqueTypes.includes('MMV')) return { category: 'multipleSurfaceFailures', number: 5 };
  if ((uniqueTypes.includes('HWV') || uniqueTypes.includes('MWV')) && (uniqueTypes.includes('KWV') || uniqueTypes.includes('SV'))) return { category: 'multipleSurfaceFailures', number: 6 };
  if ((uniqueTypes.includes('HWV') || uniqueTypes.includes('MWV')) && uniqueTypes.includes('MMV')) return { category: 'multipleSurfaceFailures', number: 7 };
  if (uniqueTypes.includes('MMV') && (uniqueTypes.includes('SV') || uniqueTypes.includes('KWV'))) return { category: 'multipleSurfaceFailures', number: 8 };
  if (uniqueTypes.includes('SCSSV') && valveTypes.filter(type => ['MMV', 'SV', 'KWV'].includes(type)).length >= 2) return { category: 'multipleSurfaceFailures', number: 9 };
  
  return { category: 'multipleSurfaceFailures', number: 1 };
}

function mapSingleValveFailureToMatrix(valveType) {
  const mapping = {
    'SCSSV': { category: 'singleSurfaceFailure', number: 1 },
    'HMV': { category: 'singleSurfaceFailure', number: 2 },
    'HWV': { category: 'singleSurfaceFailure', number: 3 },
    'MWV': { category: 'singleSurfaceFailure', number: 3 },
    'MMV': { category: 'singleSurfaceFailure', number: 4 },
    'SV': { category: 'singleSurfaceFailure', number: 5 },
    'MIV': { category: 'singleSurfaceFailure', number: 6 },
    'CIV': { category: 'singleSurfaceFailure', number: 6 },
    'AXOV': { category: 'singleSurfaceFailure', number: 7 },
    'OTHER': { category: 'singleSurfaceFailure', number: 1 }
  };
  return mapping[valveType] || mapping['OTHER'];
}

function showTooltip(e, well, div, ringData) {
  const rect = div.getBoundingClientRect();
  const x = e.clientX - rect.left - 45, y = e.clientY - rect.top - 45;
  const r = Math.sqrt(x * x + y * y);

  if (well && well.name) {
    window.currentWellContext = { name: well.name, id: well.id || null, wellObject: well };
  }

  let ringInfo = null;
  const totalRings = ringData.length;
  const maxRadius = 44, minRadius = 9, strokeWidth = 2;
  const availableRadiusForCenters = maxRadius - minRadius - strokeWidth;
  const effectiveSpacing = totalRings > 1 ? availableRadiusForCenters / Math.max(1, totalRings - 1) : 0;
  const dynamicRadii = ringData.map((_, idx) => maxRadius - strokeWidth / 2 - (idx * effectiveSpacing));
  const validRadii = dynamicRadii.filter(radius => radius > strokeWidth / 2);
  const ringHalfWidth = strokeWidth + 2;

  for (let i = 0; i < validRadii.length; i++) {
    const ringRadius = validRadii[i];
    if (Math.abs(r - ringRadius) <= ringHalfWidth) {
      const originalIndex = dynamicRadii.indexOf(ringRadius);
      if (originalIndex !== -1 && ringData[originalIndex]) {
        ringInfo = ringData[originalIndex];
        break;
      }
    }
  }

  if (ringInfo && ringInfo.failureCode) {
    const text = `<b>${ringInfo.label || 'N/A'}:</b> ${ringInfo.message || 'No message'}<div style="margin-top: 8px; font-size: 11px; color: #888;">Click for detailed information</div>`;
    showTooltipBox(e.clientX, e.clientY, text, ringInfo, well.name);
  } else {
    hideTooltip();
  }
}

let hideTimeout = null;
let currentTooltip = null;

function showTooltipBox(x, y, html, ringInfo = null, wellName = null) {
  if (wellName) window.currentTooltipWellName = wellName;
  if (hideTimeout) clearTimeout(hideTimeout);
  
  let t = document.getElementById('dashboardTooltip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'dashboardTooltip';
    t.className = 'tooltip';
    t.style.cssText = `position: absolute; background: rgba(0,0,0,0.9); color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; max-width: 250px; z-index: 1000; cursor: pointer; border: 1px solid #555; transition: opacity 0.2s ease; pointer-events: auto;`;
    document.body.appendChild(t);
    
    t.addEventListener('mouseenter', () => { if (hideTimeout) clearTimeout(hideTimeout); });
    t.addEventListener('mouseleave', () => hideTooltip());
  }
  
  currentTooltip = t;
  t.innerHTML = html;
  t.style.left = (x + 15) + 'px';
  t.style.top = (y + 15) + 'px';
  t.style.display = 'block';
  t.style.visibility = 'visible';
  t.style.opacity = '1';

  t.setAttribute('data-matrix-info', (ringInfo && ringInfo.failureCode) ? 'true' : 'false');
  
  t.onclick = (ringInfo && ringInfo.failureCode) ? (event) => {
    event.stopPropagation();
    showDetailedFailureModal(ringInfo, wellName || window.currentTooltipWellName);
  } : null;
}

function hideTooltip() {
  let t = document.getElementById('dashboardTooltip');
  if (t) {
    if (hideTimeout) clearTimeout(hideTimeout);
    
    const delay = t.getAttribute('data-matrix-info') === 'true' ? 1000 : 200;
    hideTimeout = setTimeout(() => {
      if (t && t.style.display !== 'none') {
        t.style.opacity = '0';
        setTimeout(() => { if (t) t.style.display = 'none'; }, 200);
      }
    }, delay);
  }
}

function handleWellHover(e, well, div, ringData) {
  window.currentDashboardWell = well;
  if (!div._tooltipThrottle) {
    div._tooltipThrottle = true;
    setTimeout(() => {
      div._tooltipThrottle = false;
      showTooltip(e, well, div, ringData);
    }, 50);
  }
}

function getMatrixFailureDetails(category, failureNumber) {
  return (window.wellFailureMatrix && window.wellFailureMatrix[category] && window.wellFailureMatrix[category][failureNumber]) || null;
}

function getColorForCode(code) {
  const action = window.wellFailureModel.getMitigatingAction(code);
  if (action) {
    const map = { 'green': '#19d219', 'yellow': '#e6c23a', 'orange': '#ff9800', 'red': '#e64a3a' };
    return map[action.color] || '#999';
  }
  return '#999';
}

function formatCategoryName(category) {
  const map = { 'maintenanceFailure': 'Maintenance Schedule Failure', 'singleSurfaceFailure': 'Single Surface Failure', 'multipleSurfaceFailures': 'Multiple Surface Failures', 'singleSubSurfaceFailure': 'Single Sub-Surface/Integrity Failure', 'multipleSubSurfaceFailures': 'Multiple Sub-Surface Failures', 'subSurfacePlusSurfaceFailure': 'Combined Surface & Sub-Surface Failure' };
  return map[category] || category;
}

// =================== Dashboard Filter Dropdown Implementation ===================
function categorizeWellByTestResults(well) {
  const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
  if (Object.keys(testResults).length === 0) return 'no-data';

  let hasFailures = false, hasValidTests = false;
  for (const valveId in testResults) {
    const tests = testResults[valveId];
    if (Array.isArray(tests) && tests.length > 0) {
      hasValidTests = true;
      const latestTest = tests[tests.length - 1];
      if (latestTest && typeof latestTest === 'object' && !(latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass)) {
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
    case 'with-failures': return allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures');
    case 'no-failures': return allWells.filter(well => categorizeWellByTestResults(well) === 'no-failures');
    case 'all': return allWells;
    default: return allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures');
  }
}

function createDashboardFilterDropdown() {
  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (!dashboardContainer) return;
  if (document.getElementById('dashboardFilterContainer')) document.getElementById('dashboardFilterContainer').remove();

  const dropdownContainer = document.createElement('div');
  dropdownContainer.id = 'dashboardFilterContainer';
  dropdownContainer.style.cssText = `margin-bottom: 20px; display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px;`;

  const label = document.createElement('label');
  label.textContent = 'Show Wells:';
  label.style.cssText = `font-weight: bold; color: #333; font-size: 14px;`;

  const select = document.createElement('select');
  select.id = 'dashboardFilter';
  select.style.cssText = `padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; background: white; font-size: 14px; cursor: pointer;`;

  const options = [
    { value: 'with-failures', text: 'With Failures Only' },
    { value: 'no-failures', text: 'No Failures (Passed Tests)' },
    { value: 'all', text: 'All Wells' }
  ];
  options.forEach(opt => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.textContent = opt.text;
    select.appendChild(optionElement);
  });
  select.value = 'with-failures';

  select.addEventListener('change', function() {
    renderFilteredDashboard(this.value);
    updateFilteredKPIs(this.value);
    updateFilterStats(this.value);
  });

  const statsContainer = document.createElement('div');
  statsContainer.id = 'filterStats';
  statsContainer.style.cssText = `margin-left: auto; font-size: 12px; color: #666; background: rgba(255,255,255,0.7); padding: 6px 10px; border-radius: 3px;`;

  dropdownContainer.appendChild(label);
  dropdownContainer.appendChild(select);
  dropdownContainer.appendChild(statsContainer);
  dashboardContainer.parentNode.insertBefore(dropdownContainer, dashboardContainer);
  updateFilterStats('with-failures');
}

function updateFilterStats(filterOption) {
  const statsContainer = document.getElementById('filterStats');
  if (!statsContainer) return;

  const allWells = deduplicateWellsById(wells);
  const withFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures').length;
  const noFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'no-failures').length;
  const noData = allWells.length - withFailures - noFailures;
  
  let currentCount;
  switch (filterOption) {
    case 'with-failures': currentCount = withFailures; break;
    case 'no-failures': currentCount = noFailures; break;
    case 'all': currentCount = allWells.length; break;
    default: currentCount = withFailures;
  }
  statsContainer.innerHTML = `Showing: ${currentCount} wells<br><small>Failed: ${withFailures} | Passed: ${noFailures} | No Data: ${noData}</small>`;
}

/**
 * ===================================================================================
 * OPTIMIZED: Replacement for renderFilteredDashboard to prevent UI freezing.
 * This version renders the dashboard asynchronously in chunks.
 * ===================================================================================
 */
function renderFilteredDashboard(filterOption = 'with-failures') {
    const container = document.getElementById('wellMultiRingBoard');
    if (!container) {
        console.error("Dashboard container 'wellMultiRingBoard' not found.");
        return;
    }

    const filteredWells = getWellsByFilterOption(filterOption);
    container.innerHTML = ''; // Clear previous content

    if (filteredWells.length === 0) {
        let message = "No wells with failed tests found.";
        if (filterOption === 'no-failures') message = "No wells with passed tests found.";
        if (filterOption === 'all') message = "No wells found.";
        container.innerHTML = `<p style='color:#ccc; text-align:center;'>${message}</p>`;
        return;
    }

    let wellIndex = 0;
    const batchSize = 20; // Render 20 wells at a time

    function renderBatch() {
        const fragment = document.createDocumentFragment();
        const batchEnd = Math.min(wellIndex + batchSize, filteredWells.length);

        for (let i = wellIndex; i < batchEnd; i++) {
            const well = filteredWells[i];
            if (!well || !well.name) continue;

            const ringData = getLiveStatusForAllRingsWithEscalation(well);
            let displayRings = ringData;

            if (filterOption === 'no-failures' && ringData.length === 0) {
                displayRings = [{ label: 'All Tests Passed', color: 'green', message: 'All valve tests passed successfully', failureCode: 0 }];
            }

            const totalRings = displayRings.length;
            const maxRadius = 44, minRadius = 9, strokeWidth = 2;
            const availableRadius = maxRadius - minRadius - strokeWidth;
            const effectiveSpacing = totalRings > 1 ? availableRadius / (totalRings - 1) : 0;

            const dynamicRadii = displayRings.map((_, idx) => maxRadius - strokeWidth / 2 - (idx * effectiveSpacing));
            const validRadii = dynamicRadii.filter(r => r > strokeWidth / 2);

            const ringsHtml = validRadii.map((radius, idx) => {
                const originalIndex = dynamicRadii.indexOf(radius);
                const ring = displayRings[originalIndex];
                return ring ? `<circle cx="45" cy="45" r="${radius}" stroke="${colorMap(ring.color)}" stroke-width="${strokeWidth}" fill="none" />` : '';
            }).join('');

            const centerCircleRadius = Math.max(minRadius, (validRadii.length > 0 ? validRadii[validRadii.length - 1] - strokeWidth / 2 : minRadius));
            const centerFill = '#ec5642ff';
            const svg = `<svg width="90" height="90" style="display:block">${ringsHtml}<circle cx="45" cy="45" r="${centerCircleRadius}" fill="${centerFill}" /></svg>`;

            const div = document.createElement('div');
            div.className = "well-multiring";
            div.dataset.wellName = well.name;
            div.innerHTML = svg + `<div class="well-label">${well.name}</div>`;
            
            div.onmousemove = (e) => handleWellHover(e, well, div, displayRings.slice(0, validRadii.length));
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
            
            fragment.appendChild(div);
        }

        container.appendChild(fragment);
        wellIndex = batchEnd;

        if (wellIndex < filteredWells.length) {
            requestAnimationFrame(renderBatch); // Schedule the next batch
        } else {
            console.log(`Dashboard: Asynchronously rendered ${filteredWells.length} wells.`);
            // Add indicators after all wells are rendered
            document.querySelectorAll('.well-multiring').forEach(div => {
                const wellName = div.dataset.wellName;
                if(typeof addEscalationIndicatorToWell === "function") addEscalationIndicatorToWell(div, wellName);
                if(typeof addDeviationIndicatorToWell === "function") addDeviationIndicatorToWell(div, wellName);
            });
        }
    }

    requestAnimationFrame(renderBatch); // Start the rendering process
}


function addDashboardIndicatorLegend() {
  if (document.getElementById('dashboardIndicatorLegend')) return;
  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (!dashboardContainer) return;
  
  const legend = document.createElement('div');
  legend.id = 'dashboardIndicatorLegend';
  legend.style.cssText = `margin: 10px 0 15px; padding: 8px 12px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; font-size: 12px; color: #666; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;`;
  legend.innerHTML = `<div style="font-weight: bold; margin-right: 5px;">Indicator Legend:</div>`;
  
  const filterContainer = document.getElementById('dashboardFilterContainer');
  if (filterContainer) {
    filterContainer.insertAdjacentElement('afterend', legend);
  } else {
    dashboardContainer.insertAdjacentElement('beforebegin', legend);
  }
}

// OPTIMIZED render trigger function
function renderMultiRingDashboardWithFilter() {
  if (!document.getElementById('dashboardFilterContainer')) {
    createDashboardFilterDropdown();
  }
  if (typeof addEscalationManagementButton === "function") addEscalationManagementButton();
  if (!document.getElementById('dashboardIndicatorLegend')) {
    addDashboardIndicatorLegend();
  }
  
  const filterSelect = document.getElementById('dashboardFilter');
  const currentFilter = filterSelect ? filterSelect.value : 'with-failures';
  
  // Use the new asynchronous render function
  renderFilteredDashboard(currentFilter); 
  
  updateFilteredKPIs(currentFilter);
  updateFilterStats(currentFilter);
}

// --- Window Exports & Final Setup ---
window.renderMultiRingDashboard = renderMultiRingDashboardWithFilter;
window.fetchWellsAndSyncResults = fetchWellsAndSyncResultsWithFilter;
window.categorizeWellByTestResults = categorizeWellByTestResults;
window.getWellsByFilterOption = getWellsByFilterOption;
window.renderFilteredDashboard = renderFilteredDashboard;
window.runIntegrityTestAndRefreshDashboard = runIntegrityTestAndRefreshDashboard;
window.getLiveStatusForAllRingsWithEscalation = getLiveStatusForAllRingsWithEscalation;
window.deduplicateWellsById = deduplicateWellsById;
window.initializeDashboard = initializeDashboard;

// The main entry point is now initializeDashboard, called via DOMContentLoaded