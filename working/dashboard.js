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

// Enhanced valve classification based on the matrix
window.valveClassification = window.valveClassification || {
  surfaceValves: [
    'UMGV', 'PMV', 'AMV', 'FWV', 'PWV', 'AWV', 'LMGV', 
    'SWAB', 'KWV', 'MIV', 'CIV', 'AXOV', 'XOV', 'SV', 'HWV', 'MWV', 'HMV', 'MMV'
  ],
  subSurfaceValves: ['SCSSV', 'TRSCSSV', 'WRSCSSV', 'ICV'],
  annulusValves: ['VR_PLUG', 'ANNULUS_VALVE']
};

// Enhanced failure analysis function
function analyzeWellFailures(well, testResults) {
  const failedValves = [];
  const failedSurfaceValves = [];
  const failedSubSurfaceValves = [];
  const failedAnnulusValves = [];

  if (!testResults || Object.keys(testResults).length === 0) {
    return { failedValves, failedSurfaceValves, failedSubSurfaceValves, failedAnnulusValves };
  }

  const wellValves = (well.christmasTree && well.christmasTree.valves) || [];

  for (const valveDef of wellValves) {
    const valveId = valveDef.id;
    const valveLabel = valveDef.name || valveDef.id;
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
        const failureInfo = {
          valveId,
          valveLabel,
          result: latestResult,
          failureReason: (latestResult.failure_reasons && Array.isArray(latestResult.failure_reasons) && latestResult.failure_reasons.length)
            ? latestResult.failure_reasons.join(", ")
            : "Test failed"
        };

        failedValves.push(failureInfo);

        // Classify valve type based on the enhanced classification
        const valveType = classifyValveType(valveId);
        if (valveType === 'surface') {
          failedSurfaceValves.push(failureInfo);
        } else if (valveType === 'subsurface') {
          failedSubSurfaceValves.push(failureInfo);
        } else if (valveType === 'annulus') {
          failedAnnulusValves.push(failureInfo);
        }
      }
    }
  }

  return { failedValves, failedSurfaceValves, failedSubSurfaceValves, failedAnnulusValves };
}

function classifyValveType(valveId) {
  const classification = window.valveClassification;
  
  // Check if it's a surface valve
  if (classification.surfaceValves.some(sv => valveId.includes(sv) || sv.includes(valveId))) {
    return 'surface';
  }
  
  // Check if it's a subsurface valve
  if (classification.subSurfaceValves.some(ssv => valveId.includes(ssv) || ssv.includes(valveId))) {
    return 'subsurface';
  }
  
  // Check if it's an annulus valve
  if (classification.annulusValves.some(av => valveId.includes(av) || av.includes(valveId))) {
    return 'annulus';
  }
  
  // Default to surface if unknown
  return 'surface';
}



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
  if (!testResults || Object.keys(testResults).length === 0) {
    return false;
  }

  const { failedValves } = analyzeWellFailures(well, testResults);
  return failedValves.length > 0;
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
                const url = `http://10.226.112.214:5000/api/integrity_test/?well=${encodeURIComponent(wellId)}&valve=${encodeURIComponent(valveId)}`;
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

        const response = await fetch('http://10.226.112.214:5000/api/wells');
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
// --- ENHANCED DATA PROCESSING & STATUS LOGIC (Complete Matrix Implementation) ---
function getLiveStatusForAllRings(well) {
  const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
  let rings = [];

  if (!testResults || Object.keys(testResults).length === 0) {
    return [];
  }

  // Analyze failures using the enhanced analysis function
  const { failedValves, failedSurfaceValves, failedSubSurfaceValves, failedAnnulusValves } = analyzeWellFailures(well, testResults);

  if (failedValves.length === 0) {
    return [];
  }

  // Determine matrix category and failure number based on specific failure combinations
  const wellTypeKey = getWellTypeKey(well.type);
  let matrixCategory = '';
  let failureNumber = 1;
  let failureCode = null;

  // Simplified logic for basic categorization - can be enhanced for specific combinations
  if (failedSubSurfaceValves.length > 0 && failedSurfaceValves.length > 0) {
    // Sub-surface plus surface failure
    matrixCategory = 'subSurfacePlusSurfaceFailure';
    failureNumber = 1; // Default to first type
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, failureNumber, wellTypeKey);
  } else if (failedSubSurfaceValves.length > 1) {
    // Multiple sub-surface failures
    matrixCategory = 'multipleSubSurfaceFailures';
    failureNumber = 1; // Default to first type
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, failureNumber, wellTypeKey);
  } else if (failedSubSurfaceValves.length === 1) {
    // Single sub-surface failure - could be integrity or safety device
    matrixCategory = 'singleSubSurfaceFailure';
    failureNumber = 5; // Default to completion leak above allowable rate
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, failureNumber, wellTypeKey);
  } else if (failedSurfaceValves.length > 1) {
    // Multiple surface failures - analyze specific combinations
    matrixCategory = 'multipleSurfaceFailures';
    failureNumber = determineMultipleSurfaceFailureNumber(failedSurfaceValves);
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, failureNumber, wellTypeKey);
  } else if (failedSurfaceValves.length === 1) {
    // Single surface failure - analyze specific valve type
    matrixCategory = 'singleSurfaceFailure';
    failureNumber = determineSingleSurfaceFailureNumber(failedSurfaceValves[0]);
    failureCode = window.wellFailureModel.getFailureCode(matrixCategory, failureNumber, wellTypeKey);
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
      message: `${failureInfo.failureReason} - Code ${failureCode}: ${matrixDescription}`,
      failureCode: failureCode,
      matrixCategory: matrixCategory,
      failureNumber: failureNumber
    });
  });

  return rings;
}

function determineMultipleSurfaceFailureNumber(failedSurfaceValves) {
  const valveIds = failedSurfaceValves.map(v => v.valveId);
  
  // Check for specific combinations from the matrix
  const hasUMGV = valveIds.some(id => id.includes('UMGV'));
  const hasFWV = valveIds.some(id => id.includes('FWV') || id.includes('PWV') || id.includes('AWV'));
  const hasLMGV = valveIds.some(id => id.includes('LMGV'));
  const hasKWV = valveIds.some(id => id.includes('KWV'));
  const hasSWAB = valveIds.some(id => id.includes('SWAB'));
  
  // Apply matrix logic for specific combinations
  if (hasFWV && hasUMGV) return 3; // FWV/PWV/AWV & UMGV/PMV/AMV failure
  if (hasUMGV && (hasKWV || hasSWAB)) return 4; // UMGV & KWV or SWAB
  if (hasUMGV && hasLMGV) return 5; // UMGV & LMGV
  if (hasFWV && (hasKWV || hasSWAB)) return 6; // FWV & KWV or SWAB
  if (hasFWV && hasLMGV) return 7; // FWV & LMGV
  if (hasLMGV && (hasSWAB || hasKWV)) return 8; // LMGV & SWAB or KWV
  
  // Default to first type if no specific combination matched
  return 1;
}

// Helper function to determine specific single surface failure number
function determineSingleSurfaceFailureNumber(failedSurfaceValve) {
  const valveId = failedSurfaceValve.valveId;
  
  // Map valve types to matrix failure numbers
  if (valveId.includes('UMGV') || valveId.includes('PMV') || valveId.includes('AMV')) return 2;
  if (valveId.includes('FWV') || valveId.includes('PWV') || valveId.includes('AWV')) return 3;
  if (valveId.includes('LMGV')) return 4;
  if (valveId.includes('SWAB') || valveId.includes('KWV')) return 5;
  if (valveId.includes('MIV') || valveId.includes('CIV')) return 6;
  if (valveId.includes('AXOV') || valveId.includes('XOV')) return 7;
  
  // Default to first type
  return 1;
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
    const wellsResponse = await fetch('http://10.226.112.214:5000/api/wells/');
    if (!wellsResponse.ok) {
      throw new Error(`HTTP error! status: ${wellsResponse.status}`);
    }
    const wellsData = await wellsResponse.json();
    const processedWellsData = wellsData || [];
    

    const valvesResponse = await fetch('http://10.226.112.214:5000/api/valves/');
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

  fetch('http://10.226.112.214:5000/api/run_integrity_test', {
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