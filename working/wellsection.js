// --- Keep your existing VALVE_LIMITS and valveFormSections ---
const VALVE_LIMITS = {
  SCSSV: { monitoring_time: 30, critical_rate: 15 },
  MMV:   { monitoring_time: 10, critical_rate: 15 },
  HMV:   { monitoring_time: 10, critical_rate: 15 },
  MWV:   { monitoring_time: 10, critical_rate: 15 },
  HWV:   { monitoring_time: 10, critical_rate: 15 },
  SV:    { monitoring_time: 5,  critical_rate: 3  },
  FSV:   { monitoring_time: 10, critical_rate: 15 }
};

const valveFormSections = [
  {
    title: "Identification",
    fields: [
      { name: "valveId", label: "Valve ID", readonly: true },
      { name: "valveType", label: "Valve Type", readonly: true }
    ]
  },
  {
    title: "Initial Testing Conditions",
    fields: [
      { name: "monitoringTime", label: "Monitoring Time (min)", type: "number", readonly: true  },
      { name: "maxInternalLeakRate", label: "Max Internal Leak Rate (scf/min)", type: "number", readonly: true },
      { name: "initialPressure", label: "Initial Pressure (psig)", type: "number" },
      { name: "initialTemp", label: "Initial Temperature (°F)", type: "number" }
    ]
  },
  {
    title: "Valve Positions (Part 1)",
    fields: [
      { name: "vp_SCSSV", label: "SCSSV", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_MMV", label: "MMV", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_HMV", label: "HMV", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_SV", label: "SV", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_2SV", label: "2SV", type: "select", options: ["O", "C", "N/A"] }
    ]
  },
  {
    title: "Valve Positions (Part 2)",
    fields: [
      { name: "vp_TC", label: "TC", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_MWV", label: "MWV", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_HWV", label: "HWV", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_CV", label: "CV", type: "select", options: ["O", "C", "N/A"] },
      { name: "vp_HDVs", label: "HDVs", type: "select", options: ["O", "C", "N/A"] }
    ]
  },
  {
    title: "External Factors & Timing",
    fields: [
      { name: "externalLeak", label: "External Leak", type: "radio", options: ["Yes", "No"] },
      { name: "closingTime", label: "Closing Time (secs)", type: "number" },
      { name: "asclLeak", label: "Control Line & Actuator Seals Leak", type: "radio", options: ["Yes", "No"] },
      { name: "closedStemLength", label: "Closed Stem Length (in)", type: "number" }
    ]
  },
  // --- New Section: Valve Integrity Test Table (from image/table) ---
  {
    title: "Valve Integrity Test Table",
    fields: [
      { name: "finalPressure", label: "Final Pressure (psig)", type: "number" },
      { name: "finalTemperature", label: "Final Temperature (°F)", type: "number" },
      { name: "downstreamBlockingValve", label: "Downstream Blocking Valve", type: "select", options: [] }, // populated dynamically
      { name: "actualInternalLeakRate", label: "Actual Internal Leak Rate (scfm)", type: "number"},
      { name: "valveInternalLeak", label: "Valve Internal Leak Status", type: "select", options: ["Tight", "Leaking", "N/A"] },
      { name: "functionTestingResults", label: "Function Testing Results", type: "select", options: ["Easy", "Tight", "Frozen"] },
      { name: "stemBearingsGreased", label: "Stem Bearings Greased", type: "radio", options: ["Yes", "No"] }
    ]
  }
];

// Global store for valve test results (fetched or loaded from localStorage)
window.valveTestResults = {}; 
window.selectedValveTestIndex = {};

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// TEMPORARY MESSAGE FUNCTION
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
function showTemporaryMessage(message, type = 'info', duration = 3000) {
  let messageContainer = document.getElementById('temporaryMessageContainer');
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'temporaryMessageContainer';
    Object.assign(messageContainer.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 25px',
      borderRadius: '6px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      zIndex: '10000',
      fontSize: '1em',
      fontWeight: '500',
      textAlign: 'center',
      minWidth: '250px',
      maxWidth: '80%',
      transition: 'opacity 0.5s ease-in-out, top 0.5s ease-in-out'
    });
    document.body.appendChild(messageContainer);
  }

  messageContainer.textContent = message;
  messageContainer.style.opacity = '1';
  messageContainer.style.top = '20px';

  switch (type) {
    case 'success':
      messageContainer.style.backgroundColor = '#28a745';
      messageContainer.style.color = 'white';
      break;
    case 'error':
      messageContainer.style.backgroundColor = '#dc3545';
      messageContainer.style.color = 'white';
      break;
    case 'warning':
      messageContainer.style.backgroundColor = '#ffc107';
      messageContainer.style.color = '#333';
      break;
    case 'info':
    default:
      messageContainer.style.backgroundColor = '#17a2b8';
      messageContainer.style.color = 'white';
      break;
  }

  if (messageContainer._timer) {
    clearTimeout(messageContainer._timer);
  }

  messageContainer._timer = setTimeout(() => {
    messageContainer.style.opacity = '0';
    messageContainer.style.top = '-50px'; 
  }, duration);
}

// Load warnings from localStorage
try {
  const storedWarnings = localStorage.getItem('valve_test_warnings');
  window.valveTestWarnings = storedWarnings ? JSON.parse(storedWarnings) : {};
} catch (e) {
  console.error("Error loading valve test warnings from localStorage:", e);
  window.valveTestWarnings = {};
}

window.currentValvePanel = null; 
window._richDeviationContext = {}; 

// Function to load valveTestResults from localStorage and ensure correct structure
function loadValveTestResultsFromLocalStorage() {
    try {
        const storedResults = localStorage.getItem('valve_test_results');
        if (storedResults) {
            const parsedResults = JSON.parse(storedResults);
            for (const wellId in parsedResults) {
                if (parsedResults.hasOwnProperty(wellId)) {
                    for (const valveId in parsedResults[wellId]) {
                        if (parsedResults[wellId].hasOwnProperty(valveId)) {
                            if (!Array.isArray(parsedResults[wellId][valveId])) {
                                console.warn(`Migrating localStorage data for ${wellId}/${valveId} to array format.`);
                                parsedResults[wellId][valveId] = [parsedResults[wellId][valveId]];
                            }
                        }
                    }
                }
            }
            window.valveTestResults = parsedResults;
        } else {
            window.valveTestResults = {};
        }
    } catch (e) {
        console.error("Error loading valve test results from localStorage:", e);
        window.valveTestResults = {};
    }
}

function saveValveTestResultsToLocalStorage() {
    try {
        localStorage.setItem('valve_test_results', JSON.stringify(window.valveTestResults));
    } catch (e) {
        console.error("Error saving valve test results to localStorage:", e);
    }
}

// FIX #3: Ensure test results persistence
function ensureTestResultsPersistence() {
    // Ensure test results are properly structured and saved
    for (const wellId in window.valveTestResults) {
        for (const valveId in window.valveTestResults[wellId]) {
            const tests = window.valveTestResults[wellId][valveId];
            if (!Array.isArray(tests) && typeof tests === 'object') {
                // Convert single object to array
                window.valveTestResults[wellId][valveId] = [tests];
            }
        }
    }
    saveValveTestResultsToLocalStorage();
    
    // Also ensure global wells data is updated
    if (window.wells) {
        window.wells.forEach(well => {
            if (window.valveTestResults[well.id]) {
                well.valveTestResults = window.valveTestResults[well.id];
            }
        });
    }
}

function getMostRecentTestedWellId() {
  let allResults = {};
  try {
    const localResults = localStorage.getItem('valve_test_results');
    allResults = localResults ? JSON.parse(localResults) : window.valveTestResults;
  } catch {
    allResults = window.valveTestResults || {};
  }

  let mostRecentWellId = null;
  let mostRecentTime = 0;

  for (const wellId in allResults) {
    if (allResults.hasOwnProperty(wellId)) {
      const valvesInWell = allResults[wellId];
      for (const valveId in valvesInWell) {
        if (valvesInWell.hasOwnProperty(valveId)) {
          const testsForValve = valvesInWell[valveId]; 
          if (Array.isArray(testsForValve) && testsForValve.length > 0) {
            testsForValve.forEach(testResult => {
              if (testResult && typeof testResult === 'object') {
                let t = 0;
                if (testResult.utc_timestamp) {
                    t = new Date(testResult.utc_timestamp).getTime();
                } else if (testResult.inputs && testResult.inputs.timestamp) {
                    t = new Date(testResult.inputs.timestamp).getTime();
                } else if (testResult.tested_at) {
                    t = new Date(testResult.tested_at).getTime();
                } 
                if (t > mostRecentTime) {
                    mostRecentTime = t;
                    mostRecentWellId = wellId;
                }
              }
            });
          } else if (typeof testsForValve === 'object' && testsForValve !== null && !Array.isArray(testsForValve)) {
            let t = 0;
            if (testsForValve.utc_timestamp) {
                t = new Date(testsForValve.utc_timestamp).getTime();
            } else if (testsForValve.inputs && testsForValve.inputs.timestamp) {
                t = new Date(testsForValve.inputs.timestamp).getTime();
            }
            if (t > mostRecentTime) {
                mostRecentTime = t;
                mostRecentWellId = wellId;
            }
          }
        }
      }
    }
  }
  return mostRecentWellId;
}

// FIX #1: Dashboard integration function
function updateDashboardAfterTest(wellId) {
    // Update the dashboard rings
    if (typeof renderMultiRingDashboard === 'function') {
        renderMultiRingDashboard();
    }
    
    // Also update the schematic colors
    renderWellSchematicAndPanel(wellId);
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// SIMPLIFIED DELETE FUNCTIONS
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// SIMPLIFIED DELETE SPECIFIC TEST
async function deleteSpecificTest(wellId, valveId, testIndex) {
    try {
        // Simple backend call
        const response = await fetch('http://10.226.14.79:5000/api/delete_valve_test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wellId: wellId,
                valveId: valveId,
                testIndex: testIndex,
                deletedBy: 'Rob-mcna'
            })
        });
        
        if (response.ok) {
            // Simple local cleanup
            if (window.valveTestResults[wellId] && window.valveTestResults[wellId][valveId]) {
                if (Array.isArray(window.valveTestResults[wellId][valveId])) {
                    window.valveTestResults[wellId][valveId].splice(testIndex, 1);
                } else {
                    delete window.valveTestResults[wellId][valveId];
                }
            }
            
            // Update selected index
            if (window.selectedValveTestIndex[wellId] && window.selectedValveTestIndex[wellId][valveId] !== undefined) {
                const testsArray = window.valveTestResults[wellId][valveId];
                if (Array.isArray(testsArray)) {
                    if (testsArray.length === 0) {
                        delete window.selectedValveTestIndex[wellId][valveId];
                    } else if (window.selectedValveTestIndex[wellId][valveId] >= testsArray.length) {
                        window.selectedValveTestIndex[wellId][valveId] = testsArray.length - 1;
                    }
                }
            }
            
            saveValveTestResultsToLocalStorage();
            showTemporaryMessage('Test deleted successfully', 'success');
            return true;
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showTemporaryMessage('Delete failed - working offline', 'warning');
        
        // Fallback: delete locally only
        if (window.valveTestResults[wellId] && window.valveTestResults[wellId][valveId]) {
            if (Array.isArray(window.valveTestResults[wellId][valveId])) {
                window.valveTestResults[wellId][valveId].splice(testIndex, 1);
            } else {
                delete window.valveTestResults[wellId][valveId];
            }
        }
        
        // Update selected index for offline mode
        if (window.selectedValveTestIndex[wellId] && window.selectedValveTestIndex[wellId][valveId] !== undefined) {
            const testsArray = window.valveTestResults[wellId][valveId];
            if (Array.isArray(testsArray)) {
                if (testsArray.length === 0) {
                    delete window.selectedValveTestIndex[wellId][valveId];
                } else if (window.selectedValveTestIndex[wellId][valveId] >= testsArray.length) {
                    window.selectedValveTestIndex[wellId][valveId] = testsArray.length - 1;
                }
            }
        }
        
        saveValveTestResultsToLocalStorage();
        return true;
    }
}

// SIMPLIFIED DELETE ALL TESTS
async function deleteAllTestsForValve(wellId, valveId) {
    try {
        const response = await fetch('http://10.226.14.79:5000/api/delete_valve_test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wellId: wellId,
                valveId: valveId,
                testIndex: null, // null means delete all
                deletedBy: 'Rob-mcna'
            })
        });
        
        if (response.ok) {
            // Simple cleanup
            if (window.valveTestResults[wellId]) {
                window.valveTestResults[wellId][valveId] = [];
            }
            
            // Clear selected index
            if (window.selectedValveTestIndex[wellId]) {
                delete window.selectedValveTestIndex[wellId][valveId];
            }
            
            // Clear warnings
            if (window.valveTestWarnings[wellId]) {
                delete window.valveTestWarnings[wellId][valveId];
                localStorage.setItem('valve_test_warnings', JSON.stringify(window.valveTestWarnings));
            }
            
            saveValveTestResultsToLocalStorage();
            showTemporaryMessage('All tests deleted successfully', 'success');
            return true;
        } else {
            throw new Error('Delete all failed');
        }
    } catch (error) {
        console.error('Delete all error:', error);
        showTemporaryMessage('Delete failed - working offline', 'warning');
        
        // Fallback: delete locally
        if (window.valveTestResults[wellId]) {
            window.valveTestResults[wellId][valveId] = [];
        }
        
        if (window.selectedValveTestIndex[wellId]) {
            delete window.selectedValveTestIndex[wellId][valveId];
        }
        
        if (window.valveTestWarnings[wellId]) {
            delete window.valveTestWarnings[wellId][valveId];
            localStorage.setItem('valve_test_warnings', JSON.stringify(window.valveTestWarnings));
        }
        
        saveValveTestResultsToLocalStorage();
        return true;
    }
}

// SIMPLIFIED VIEW DELETED TESTS
async function viewDeletedTests(wellId, valveId = null) {
    try {
        showTemporaryMessage('Loading deleted tests...', 'info');
        
        // Simple URL construction
        let url = `http://10.226.14.79:5000/api/deleted_valve_tests?well=${wellId}`;
        if (valveId) url += `&valve=${valveId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Deleted tests response:', data);
        
        // Handle different response formats
        let testsToShow = [];
        if (Array.isArray(data)) {
            testsToShow = data;
        } else if (data.deleted_tests && typeof data.deleted_tests === 'object') {
            // Flatten all valve tests
            testsToShow = Object.values(data.deleted_tests).flat();
        } else if (data.well_id && data.deleted_tests) {
            testsToShow = Object.values(data.deleted_tests).flat();
        }
        
        if (testsToShow.length === 0) {
            showTemporaryMessage('No deleted tests found', 'info');
            return;
        }
        
        // Simple modal display
        showSimpleDeletedTestsModal(testsToShow, wellId);
        
    } catch (error) {
        console.error('View deleted tests error:', error);
        showTemporaryMessage('Cannot load deleted tests - check connection', 'error');
    }
}

// SIMPLIFIED DELETED TESTS MODAL
function showSimpleDeletedTestsModal(testsArray, wellId) {
    // Remove any existing modal
    const existingModal = document.getElementById('simpleDeletedTestsModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'simpleDeletedTestsModal';
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; color: black; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80%; overflow-y: auto; min-width: 600px;">
            <h3 style="margin-top: 0; color: #333;">Deleted Tests for Well ${wellId}</h3>
            <p>Found ${testsArray.length} deleted test(s)</p>
            ${testsArray.length > 0 ? `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Valve</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Deleted At</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Deleted By</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Leak Rate (scfm)</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pass/Fail</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${testsArray.map((test, index) => {
                                const deletedAt = test.deletion_info?.deleted_at ? 
                                    new Date(test.deletion_info.deleted_at).toLocaleString() : 
                                    (test.deleted_at ? new Date(test.deleted_at).toLocaleString() : 'N/A');
                                const deletedBy = test.deletion_info?.deleted_by || test.deleted_by || 'N/A';
                                const leakRate = test.leak_rate_scfm !== undefined ? 
                                    Number(test.leak_rate_scfm).toFixed(3) : 'N/A';
                                const passStatus = test.pass && test.test_valid && test.leak_rate_pass ? 
                                    '✅ Pass' : '❌ Fail';
                                const valveType = test.ValveType || test.inputs?.ValveType || 'N/A';
                                
                                return `
                                    <tr style="${index % 2 === 1 ? 'background-color: #f8f9fa;' : ''}">
                                        <td style="border: 1px solid #ddd; padding: 8px;">${valveType}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${deletedAt}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${deletedBy}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${leakRate}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${passStatus}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>No deleted tests to display</p>'}
            <div style="text-align: right; margin-top: 15px;">
                <button onclick="document.getElementById('simpleDeletedTestsModal').remove()" 
                        style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    showTemporaryMessage(`Displaying ${testsArray.length} deleted tests`, 'success');
}

// SIMPLIFIED DELETE CONFIRMATION
async function showDeleteTestConfirmation(wellId, valveId, testIndex = null) {
    const isDeleteAll = testIndex === null;
    const testsArray = window.valveTestResults[wellId] && window.valveTestResults[wellId][valveId];
    
    if (!testsArray) {
        showTemporaryMessage(`No tests found for valve ${valveId}`, 'error');
        return;
    }
    
    // Simple confirmation
    const testCount = Array.isArray(testsArray) ? testsArray.length : 1;
    let confirmMessage;
    
    if (isDeleteAll) {
        confirmMessage = `Delete ALL ${testCount} test(s) for valve ${valveId} in well ${wellId}?`;
    } else {
        confirmMessage = `Delete test ${testIndex + 1} for valve ${valveId} in well ${wellId}?`;
    }
    
    if (confirm(confirmMessage)) {
        showTemporaryMessage('Deleting...', 'info');
        
        try {
            let success = false;
            if (isDeleteAll) {
                success = await deleteAllTestsForValve(wellId, valveId);
            } else {
                success = await deleteSpecificTest(wellId, valveId, testIndex);
            }
            
            if (success) {
                // Refresh displays and update dashboard
                renderValveTestResultsPanel(wellId);
                renderWellSchematicAndPanel(wellId);
                updateDashboardAfterTest(wellId);
            }
        } catch (error) {
            console.error('Delete operation failed:', error);
            showTemporaryMessage('Delete failed', 'error');
        }
    }
}

// SIMPLIFIED EXPORT DATA FUNCTION
async function exportTestData(wellId) {
    try {
        showTemporaryMessage('Preparing export...', 'info');
        
        const wellData = window.valveTestResults[wellId] || {};
        const well = (window.wells || []).find(w => w.id === wellId);
        
        if (Object.keys(wellData).length === 0) {
            showTemporaryMessage('No test data found for this well.', 'warning');
            return;
        }
        
        // Prepare export data
        const exportData = {
            well_info: {
                id: wellId,
                name: well?.name || wellId,
                type: well?.type || 'Unknown',
                treeType: well?.treeType || 'Unknown',
                exported_at: '2025-06-17T16:03:29Z',
                exported_by: 'Rob-mcna'
            },
            valve_tests: {}
        };
        
        // Process all valve test data
        for (const valveId in wellData) {
            if (wellData.hasOwnProperty(valveId)) {
                const tests = wellData[valveId];
                exportData.valve_tests[valveId] = {
                    valve_type: getValveTypeLabel(valveId),
                    test_count: Array.isArray(tests) ? tests.length : 1,
                    tests: Array.isArray(tests) ? tests : [tests]
                };
            }
        }
        
        // Create and download file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `well_${wellId}_test_data_2025-06-17.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(link.href);
        
        showTemporaryMessage(`Successfully exported data for well ${wellId}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showTemporaryMessage(`Failed to export data: ${error.message}`, 'error');
    }
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// MAIN RENDER FUNCTIONS
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// ... (keep all the code from the top of the file as is) ...

// The renderWellsSection function is now simpler. It just renders the UI.
// Update the renderWellsSection function to better handle auto-selection
function renderWellsSection() {
  const wellListDiv = document.getElementById('wellList');
  if (!wellListDiv) return;

  // Clear previous contents
  wellListDiv.innerHTML = '';

  // Build the dropdown HTML
  let html = '';
  if (window.currentUser && window.currentUser.role === 'admin') {
    html += `<button id="createWellBtn" class="primary-btn" style="margin-bottom: 18px;">Create Well</button>`;
  }
  html += `<label for="wellDropdown" style="font-weight:bold;">Select Well:</label>
    <select id="wellDropdown" style="margin:0 12px 24px 8px;">
      <option value="" selected disabled>-- Select Well --</option>
      ${(window.wells || []).map(w => `<option value="${w.id}">${w.id} - ${w.name || w.id}</option>`).join('')}
    </select>
    <div class="well-layout" id="wellInlineLayout" style="display:none;">
      <div id="wellSchematicArea"></div>
      <div class="valve-panels-container">
        <div id="valveInputPanel"></div>
        <div id="valveTestResultsPanel"></div>
      </div>
    </div>
    <div id="wellDetailsContainer" style="margin-top:18px;"></div>`;

  wellListDiv.innerHTML = html;

  // Admin create well button handler, if present
  if (window.currentUser && window.currentUser.role === 'admin') {
    const createWellBtn = document.getElementById('createWellBtn');
    if (createWellBtn) createWellBtn.onclick = showCreateWellModal;
  }

  const dropdown = document.getElementById('wellDropdown');
  if (!dropdown) return;

  // Dropdown change handler: persist and update UI
  dropdown.onchange = function() {
    const selectedWellId = this.value;
    if (selectedWellId) {
      localStorage.setItem('lastSelectedWellId', selectedWellId);
      renderWellSchematicAndPanel(selectedWellId);
      const wellDetailsContainer = document.getElementById('wellDetailsContainer');
      if (wellDetailsContainer) wellDetailsContainer.innerHTML = '';
      renderWellDetailsButton(selectedWellId);
      renderValveTestResultsPanel(selectedWellId);
    }
  };

  // Restore last selected well if available, otherwise auto-select most recently tested well
  const lastSelectedWellId = localStorage.getItem('lastSelectedWellId');
  if (lastSelectedWellId && (window.wells || []).find(w => w.id === lastSelectedWellId)) {
    dropdown.value = lastSelectedWellId;
    dropdown.onchange();
  } else {
    // Fallback: auto-select the most recent tested well
    setTimeout(() => {
      const mostRecentWellId = getMostRecentTestedWellId();
      if (mostRecentWellId && (window.wells || []).find(w => w.id === mostRecentWellId)) {
        dropdown.value = mostRecentWellId;
        dropdown.onchange();
      }
    }, 200);
  }
}

// Example stub for getMostRecentTestedWellId
function getMostRecentTestedWellId() {
  let mostRecentWellId = null;
  let mostRecentTime = 0;
  if (window.valveTestResults) {
    for (const [wellId, valves] of Object.entries(window.valveTestResults)) {
      for (const tests of Object.values(valves)) {
        if (Array.isArray(tests)) {
          for (const test of tests) {
            if (test && test.inputs && test.inputs.timestamp) {
              const t = new Date(test.inputs.timestamp).getTime();
              if (t > mostRecentTime) {
                mostRecentTime = t;
                mostRecentWellId = wellId;
              }
            }
          }
        }
      }
    }
  }
  return mostRecentWellId;
}
// MODIFIED INITIALIZATION FUNCTION
async function fetchWellsAndInitialize() {
    try {
        showTemporaryMessage('Loading wells data...', 'info');
        
        const response = await fetch('http://10.226.14.79:5000/api/wells');
        if (!response.ok) {
            console.error("Failed to fetch wells data:", response.status, await response.text());
            showTemporaryMessage('Failed to load wells data - using local storage', 'warning');
            loadValveTestResultsFromLocalStorage(); 
            if (document.getElementById('wellList')) {
                renderWellsSection(); 
            }
            return;
        }
        const wellsDataFromServer = await response.json();
        
        window.wells = wellsDataFromServer; 
        
        // Process test results data...
        window.valveTestResults = {}; 
        window.selectedValveTestIndex = {}; 

        wellsDataFromServer.forEach(well => {
            // ... existing processing logic ...
        });
        
        ensureTestResultsPersistence();
        saveValveTestResultsToLocalStorage(); 

        // IMPORTANT: Render wells section AFTER all data is loaded
        if (document.getElementById('wellList')) {
            renderWellsSection(); 
        }
        
        showTemporaryMessage('Wells data loaded successfully', 'success');
        console.log(`Data loading completed for Rob-mcna at 2025-06-17 21:09:44. Auto-selection should now work.`);

    } catch (error) {
        console.error("Error during fetchWellsAndInitialize:", error);
        showTemporaryMessage('Network error - using offline data', 'error');
        loadValveTestResultsFromLocalStorage();
        if (document.getElementById('wellList')) renderWellsSection();
    }
}

function renderWellSchematicAndPanel(wellId) {
  const wellConfig = (window.wells || []).find(w => w.id === wellId); 
  const wellInlineLayout = document.getElementById('wellInlineLayout');
  const wellSchematicArea = document.getElementById('wellSchematicArea');
  const valveInputPanel = document.getElementById('valveInputPanel');

  if (!wellConfig || !wellInlineLayout || !wellSchematicArea || !valveInputPanel) {
    if(wellInlineLayout) wellInlineLayout.style.display = 'none';
    return;
  }
  wellInlineLayout.style.display = 'flex';
  
  let schematicHTML = (schematicSVGs && schematicSVGs[wellConfig.treeType])
    ? `<span class="schematic-svg-preview" id="schematicSVGContainer">${schematicSVGs[wellConfig.treeType]}</span>`
    : "N/A";
  wellSchematicArea.innerHTML = schematicHTML;

  const svg = wellSchematicArea.querySelector('svg');
  if (svg) {
    // NEW APPROACH: Use the same logic as wellschematics.js
    setTimeout(() => {
      const valveLabels = [
        "SV", "MWV", "HWV", "HMV", "MMV", "SCSSV", "2SV",
        "PFSV", "THDV", "PHDV", "PFSV B/P", "Header B/P", "Bleed Down Valve",
        "IDV", "IFSV", "IHDV", "PDV", "Test Sep HDV", "D Sep HDV", "B Sep HDV", "FHDV",
        "Choke", "Flare Header Choke"
      ];

      Array.from(svg.querySelectorAll('g')).forEach(g => {
        const texts = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
        const foundLabel = valveLabels.find(v => texts.includes(v));
        
        if (foundLabel) {
          g.style.cursor = 'pointer';
          
          // Color the valve based on test results
          let color = '#e6c23a'; // Default yellow
          const wellTests = window.valveTestResults[wellId];
          if (wellTests && wellTests[foundLabel] && Array.isArray(wellTests[foundLabel]) && wellTests[foundLabel].length > 0) {
            const latestTest = wellTests[foundLabel][wellTests[foundLabel].length - 1]; 
            if (latestTest && typeof latestTest === 'object') {
              if (latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass) {
                color = '#19d219'; // Green for pass
              } else {
                color = '#e64a3a'; // Red for fail
              }
            }
          }
          
          // Apply color to all rects in this group
          const rects = g.querySelectorAll('rect');
          rects.forEach(rect => rect.setAttribute('fill', color));
          
          // Add click handler
          g.onclick = function(e) {
            e.stopPropagation();
            if (window.currentValvePanel === foundLabel && valveInputPanel.style.display === 'block') {
              valveInputPanel.style.display = 'none';
              valveInputPanel.classList.remove('active');
              window.currentValvePanel = null;
            } else {
              showValveInputPanel(wellId, foundLabel); 
              window.currentValvePanel = foundLabel;
            }
          };
        }
      });
    }, 50);
  }
  
  if (window.currentValvePanel === null || !valveInputPanel.classList.contains('active')) {
     valveInputPanel.style.display = 'none';
  }
}

// ... (keep the rest of the file, including the DOMContentLoaded listener, the same) ...
function toggleValveTestDetails(wellId, valveId) {
  const detailsRow = document.getElementById(`details-${wellId}-${valveId}`);
  const iconElement = document.getElementById(`icon-details-${wellId}-${valveId}`); 

  if (detailsRow && iconElement) {
    // For the new card layout, we toggle 'block' vs 'none'
    // and rotate the icon
    if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
      detailsRow.style.display = 'block'; 
      iconElement.style.transform = 'rotate(90deg)';
    } else {
      detailsRow.style.display = 'none';
      iconElement.style.transform = 'rotate(0deg)';
    }
  }
}

function formatTestTimestampForDropdown(test) {
    if (test && test.utc_timestamp) {
        return new Date(test.utc_timestamp).toLocaleString();
    }
    if (test && test.inputs && test.inputs.timestamp) {
        return new Date(test.inputs.timestamp).toLocaleString();
    }
    return "Test (Unknown Time)";
}

function handlePastTestSelect(wellId, valveId, selectedTestIndex) {
    if (!window.selectedValveTestIndex[wellId]) {
        window.selectedValveTestIndex[wellId] = {};
    }
    window.selectedValveTestIndex[wellId][valveId] = parseInt(selectedTestIndex, 10);
    renderValveTestResultsPanel(wellId); 
}

function renderValveTestResultsPanel(currentWellId) {
  const panel = document.getElementById('valveTestResultsPanel');
  if (!panel) return;

  panel.style.width = '400px'; 

  const mainBlue = '#81b2da'; 
  const mainWhite = '#fff';

  const trashIconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 24 24" style="width:14px; height:14px;" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
  const deleteIconColor = '#E67E22'; 
  const deleteIconHoverColor = '#D35400'; 
  const deleteAllBgColor = 'rgba(230, 126, 34, 0.1)';
  const deleteAllHoverBgColor = 'rgba(230, 126, 34, 0.2)';
  const deleteButtonSize = '24px';
  const deleteBadgeSize = '14px';
  const deleteBadgeFontSize = '9px';
  const deleteBadgeTopRight = '-7px';

  const leftBarColorForCard = '#A9D0F5'; 
  const expandIconColorOnBar = mainWhite; 
  const valveEntryCardBackground = '#2C3E50'; 
  const valveEntryCardBorder = '#34495E';   

  window.valveTestResults = window.valveTestResults || {};
  window.valveTestWarnings = window.valveTestWarnings || {};
  window.selectedValveTestIndex = window.selectedValveTestIndex || {};
  if (!window.selectedValveTestIndex[currentWellId]) {
    window.selectedValveTestIndex[currentWellId] = {};
  }

  const resultsForWell = window.valveTestResults[currentWellId] || {};
  const warningsForWell = window.valveTestWarnings[currentWellId] || {};
  
  let html = `<div class="panel-title" style="color: ${mainWhite}; padding: 18px 24px 12px 24px; text-transform: uppercase; font-weight: bold; font-size: 24px; font-family: Arial, sans-serif; text-align: center; letter-spacing: 1px;">Valve Test Results</div>`;
  html += `<div class="valve-entries-container" style="padding: 15px 20px;">`;

  const allValveIdsInWell = [...new Set([...Object.keys(resultsForWell), ...Object.keys(warningsForWell)])];

  if (allValveIdsInWell.length === 0) {
    html += `<div class="no-results-message" style="color: ${mainWhite}; opacity: 0.8; padding: 20px; text-align:center;">No tests run or warnings recorded yet for well ${currentWellId}.</div>`;
  } else {
    for (const valveId of allValveIdsInWell) {
      const testsHistoryForValve = resultsForWell[valveId];
      let currentTestToShow = null;
      let selectedIdx = window.selectedValveTestIndex[currentWellId][valveId];

      if (Array.isArray(testsHistoryForValve) && testsHistoryForValve.length > 0) {
        if (typeof selectedIdx !== 'number' || selectedIdx < 0 || selectedIdx >= testsHistoryForValve.length) {
            selectedIdx = testsHistoryForValve.length - 1;
            window.selectedValveTestIndex[currentWellId][valveId] = selectedIdx;
        }
        currentTestToShow = testsHistoryForValve[selectedIdx];
      } else if (typeof testsHistoryForValve === 'object' && testsHistoryForValve !== null && !Array.isArray(testsHistoryForValve)) {
        currentTestToShow = testsHistoryForValve;
        selectedIdx = 0;
      }

      const allowableRate = (VALVE_LIMITS[valveId] && VALVE_LIMITS[valveId].critical_rate !== undefined) 
                            ? Number(VALVE_LIMITS[valveId].critical_rate).toFixed(3) : 'N/A';
      const leakRateDisplay = (currentTestToShow && currentTestToShow.leak_rate_scfm !== undefined) 
                              ? Number(currentTestToShow.leak_rate_scfm).toFixed(3) : 'N/A';
      const p1Value = (currentTestToShow && currentTestToShow.thresholds && currentTestToShow.thresholds.P1_psia_actual !== undefined)
                      ? Number(currentTestToShow.thresholds.P1_psia_actual).toFixed(1)
                      : (currentTestToShow && currentTestToShow.inputs && currentTestToShow.inputs.InitialPressure_psig !== undefined)
                        ? (Number(currentTestToShow.inputs.InitialPressure_psig) + 14.7).toFixed(1) : 'N/A';
      const pcValue = (currentTestToShow && currentTestToShow.thresholds && currentTestToShow.thresholds.Pc_psia_critical_check !== undefined) 
                      ? Number(currentTestToShow.thresholds.Pc_psia_critical_check).toFixed(1) 
                      : (currentTestToShow && currentTestToShow.thresholds && currentTestToShow.thresholds.Pc !== undefined) 
                        ? Number(currentTestToShow.thresholds.Pc).toFixed(1) : 'N/A';
      const pfValue = (currentTestToShow && currentTestToShow.thresholds && currentTestToShow.thresholds.Pf_psia_allowable !== undefined)
                      ? Number(currentTestToShow.thresholds.Pf_psia_allowable).toFixed(1)
                      : (currentTestToShow && currentTestToShow.thresholds && currentTestToShow.thresholds.Pf !== undefined)
                        ? Number(currentTestToShow.thresholds.Pf).toFixed(1) : 'N/A';

      let historyDropdownHtml_inner = ''; 
      let deleteButtonsHtml_inner = ''; 

      if (Array.isArray(testsHistoryForValve) && testsHistoryForValve.length > 0) {
        historyDropdownHtml_inner = `<select class="past-tests-dropdown" style="margin-left: 0; margin-top: 5px; font-size: 0.9em; padding: 4px; background-color: #34495e; color: #ecf0f1; border: 1px solid #4a6278; border-radius: 3px;" onchange="handlePastTestSelect('${currentWellId}', '${valveId}', this.value)">`;
        testsHistoryForValve.forEach((test, index) => {
          const timestampLabel = formatTestTimestampForDropdown(test);
          historyDropdownHtml_inner += `<option value="${index}" ${index === selectedIdx ? 'selected' : ''}>${timestampLabel}</option>`;
        });
        historyDropdownHtml_inner += `</select>`;
        deleteButtonsHtml_inner = `<div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                <button class="circular-delete-btn" style="width:${deleteButtonSize}; height:${deleteButtonSize}; border-radius:50%; background:transparent; color:${deleteIconColor}; border:1px solid ${deleteIconColor}; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s ease;" onclick="showDeleteTestConfirmation('${currentWellId}','${valveId}',${selectedIdx})" title="Delete currently selected test" onmouseover="this.style.background='${deleteAllBgColor}'; this.style.borderColor='${deleteIconHoverColor}'; this.style.color='${deleteIconHoverColor}'; this.style.transform='scale(1.1)';" onmouseout="this.style.background='transparent'; this.style.borderColor='${deleteIconColor}'; this.style.color='${deleteIconColor}'; this.style.transform='scale(1)';">${trashIconSVG}</button>
                <button class="circular-delete-all-btn" style="width:${deleteButtonSize}; height:${deleteButtonSize}; border-radius:50%; background:${deleteAllBgColor}; color:${deleteIconColor}; border:1px solid ${deleteIconColor}; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s ease; position:relative;" onclick="showDeleteTestConfirmation('${currentWellId}','${valveId}',null)" title="Delete all ${testsHistoryForValve.length} tests for this valve" onmouseover="this.style.background='${deleteAllHoverBgColor}'; this.style.borderColor='${deleteIconHoverColor}'; this.style.color='${deleteIconHoverColor}'; this.style.transform='scale(1.1)';" onmouseout="this.style.background='${deleteAllBgColor}'; this.style.borderColor='${deleteIconColor}'; this.style.color='${deleteIconColor}'; this.style.transform='scale(1)';"><span style="position:relative; display:flex; align-items:center; justify-content:center;">${trashIconSVG}<span style="position:absolute; top:${deleteBadgeTopRight}; right:${deleteBadgeTopRight}; background:${mainWhite}; color:${deleteIconColor}; border-radius:50%; width:${deleteBadgeSize}; height:${deleteBadgeSize}; font-size:${deleteBadgeFontSize}; font-weight:bold; display:flex; align-items:center; justify-content:center; border:1px solid ${deleteIconColor};">${testsHistoryForValve.length}</span></span></button>
            </div>`;
      } else {
        historyDropdownHtml_inner = (currentTestToShow) ? `<span style="font-size:0.9em; color:#bdc3c7; margin-top: 5px; display: inline-block;">(1 test record)</span>` : `<span style="font-size:0.9em; color:#bdc3c7; margin-top: 5px; display: inline-block;">(No test records)</span>`;
        if (currentTestToShow) {
          deleteButtonsHtml_inner = `<div style="margin-top:8px;"><button class="circular-delete-btn" style="width:${deleteButtonSize}; height:${deleteButtonSize}; border-radius:50%; background:transparent; color:${deleteIconColor}; border:1px solid ${deleteIconColor}; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s ease;" onclick="showDeleteTestConfirmation('${currentWellId}','${valveId}',null)" title="Delete this test" onmouseover="this.style.background='${deleteAllBgColor}'; this.style.borderColor='${deleteIconHoverColor}'; this.style.color='${deleteIconHoverColor}'; this.style.transform='scale(1.1)';" onmouseout="this.style.background='transparent'; this.style.borderColor='${deleteIconColor}'; this.style.color='${deleteIconColor}'; this.style.transform='scale(1)';">${trashIconSVG}</button></div>`;
        }
      }

      html += `<div class="valve-entry" style="margin-bottom: 12px; background-color: ${valveEntryCardBackground}; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">`;
      html += `  <div class="valve-main-row" style="display: flex; align-items: stretch; min-height: 70px;">`;
      html += `    <div class="left-bar" style="background-color: ${leftBarColorForCard}; padding: 0 15px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="toggleValveTestDetails('${currentWellId}', '${valveId}')">`;
      html += `      <span id="icon-details-${currentWellId}-${valveId}" class="details-icon" style="color: ${expandIconColorOnBar}; font-size: 22px; transition: transform 0.2s;">&#9654;</span>`; 
      html += `    </div>`;
      html += `    <div class="valve-content-area" style="flex-grow: 1; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">`;
      html += `      <div class="valve-info-primary" style="display: flex; flex-direction: column; justify-content: center; padding-right: 10px;">`;
      html += `        <div style="font-weight: bold; font-size: 1.2em; color: #ecf0f1;">${valveId}</div>`;
      html += `        ${historyDropdownHtml_inner}`; 
      html += `        ${deleteButtonsHtml_inner}`;  
      html += `      </div>`;
      html += `      <div class="valve-info-secondary" style="text-align: right; color: #bdc3c7; font-size: 0.95em; white-space: nowrap;">`;
      html += `        <div style="margin-bottom: 6px;"><span style="color: #95a5a6;">Leak Rate:</span> <strong style="font-size: 1.1em; color: #ecf0f1;">${leakRateDisplay}</strong> scfm</div>`;
      html += `        <div><span style="color: #95a5a6;">Allowable:</span> <strong style="font-size: 1.1em; color: #ecf0f1;">${allowableRate}</strong> scfm</div>`;
      html += `      </div>`;
      html += `    </div>`; 
      html += `  </div>`; 

      html += `  <div id="details-${currentWellId}-${valveId}" class="valve-details-collapsible" style="display:none; padding: 15px 20px; background-color: rgba(0,0,0,0.15); border-top: 1px solid ${valveEntryCardBorder}; color: #bdc3c7; font-size: 0.9em;">`;
      html += `    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">`;
      html += `      <div><strong>Initial Pressure (P1):</strong> ${p1Value} psia</div>`;
      html += `      <div><strong>Critical Check (Pc):</strong> ${pcValue} psia</div>`;
      html += `      <div><strong>Final Allowable (Pf):</strong> ${pfValue} psia</div>`;
      html += `    </div>`;
      if (currentTestToShow && currentTestToShow.inputs) {
        html += `<div style="margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;"><strong>Tested by:</strong> ${currentTestToShow.inputs.TestedBy || 'N/A'} <span style="color:#95a5a6;">at ${formatTestTimestampForDropdown(currentTestToShow)}</span></div>`;
      }
      html += `  </div>`;

      const warningsForValve = warningsForWell[valveId] || [];
      if (currentTestToShow && warningsForValve.length > 0) {
        html += `  <div class="valve-warnings-section" style="padding: 10px 20px; background-color: rgba(192, 57, 43, 0.15); border-top: 1px solid ${valveEntryCardBorder}; color: #e74c3c; font-size: 0.9em;">`;
        html += `    <b>Warnings:</b> ${warningsForValve.join('; ')}`;
        html += `  </div>`;
}

      const isFail = currentTestToShow && (!currentTestToShow.pass || !currentTestToShow.test_valid || !currentTestToShow.leak_rate_pass);
      if (isFail) {
        // FIX #5: Enhanced deviation context
        if (!window._richDeviationContext) window._richDeviationContext = {};
        window._richDeviationContext[`${currentWellId}::${valveId}`] = {
          wellId: currentWellId,
          valveId: valveId,
          result: currentTestToShow,
          warnings: warningsForValve,
          allowableRate: allowableRate
        };
        
        html += `  <div class="valve-deviation-section" style="padding: 12px 20px; background-color: rgba(0,0,0,0.05); border-top: 1px solid ${valveEntryCardBorder};">`;
        html += `    <button class="raise-deviation-btn" style="background-color: #e67e22; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 0.9em;" onclick="openDeviationFromWell('${currentWellId}','${valveId}')">`;
        html += `      <span class="icon-warning" style="margin-right: 5px;">⚠️</span> Raise Deviation`; 
        html += `    </button>`;
        html += `  </div>`;
      }
      html += `</div>`; 
    }
  }
  html += `</div>`; 

  html += `<div class="well-deviation-action" style="background: ${mainBlue}; padding: 24px 0 20px 0; border-radius: 0 0 14px 14px; text-align: center; margin-top: 0;">`;
  html += `  <button class="primary-btn" style="background: ${mainWhite}; color: ${mainBlue}; padding: 12px 30px; font-size: 1.1em; border-radius: 8px; border: 2px solid ${mainBlue}; font-weight: bold; transition: background 0.2s, color 0.2s;" onmouseover="this.style.background='${mainBlue}'; this.style.color='${mainWhite}'; this.style.borderColor='${mainWhite}';" onmouseout="this.style.background='${mainWhite}'; this.style.color='${mainBlue}'; this.style.borderColor='${mainBlue}';" onclick="openDeviationFromWell('${currentWellId}')">`; 
  html += `    + Create Deviation for this Well`;
  html += `  </button>`;

  if (currentUser && currentUser.role === 'admin') {
    html += `  <div class="admin-actions" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.1); border-radius: 4px; text-align:left;">`;
    html += `    <h4 style="margin: 0 0 12px 0; color: ${mainWhite}; opacity:0.9; font-size: 1.1em;">Admin Actions</h4>`;
    html += `    <button class="secondary-btn" onclick="viewDeletedTests('${currentWellId}')" style="margin-right: 10px; font-size:0.9em; padding: 8px 12px; background:rgba(255,255,255,0.2); color:${mainWhite}; border:1px solid rgba(255,255,255,0.3); border-radius:4px;">`;
    html += `      📁 View Deleted Tests`;
    html += `    </button>`;
    html += `    <button class="secondary-btn" onclick="exportTestData('${currentWellId}')" style="font-size:0.9em; padding: 8px 12px; background:rgba(255,255,255,0.2); color:${mainWhite}; border:1px solid rgba(255,255,255,0.3); border-radius:4px;">`;
    html += `      📊 Export All Data`;
    html += `    </button>`;
    html += `  </div>`;
  }
  html += `</div>`;

  panel.innerHTML = html;
}

function renderWellDetailsButton(wellId) {
  const wellDetailsContainer = document.getElementById('wellDetailsContainer');
  if (!wellDetailsContainer) return;

  const well = (window.wells || []).find(w => w.id === wellId); 
  if (!well) {
    wellDetailsContainer.innerHTML = '';
    return;
  }
  wellDetailsContainer.innerHTML = `
    <button id="showWellDetailsBtn" class="show-well-details-btn">Well details</button>
    <div id="wellDetailsBox" class="well-details-box" style="display:none;"></div>`;
  
  const showWellDetailsBtn = document.getElementById('showWellDetailsBtn');
  if(showWellDetailsBtn) {
      showWellDetailsBtn.onclick = function() {
        const detailsBox = document.getElementById('wellDetailsBox');
        if (!detailsBox) return;
        if (detailsBox.style.display === "block") {
          detailsBox.style.display = "none";
          return;
        }
        let html = `
          <h3 style="margin-bottom:8px; color:#18191b;">${well.id} - ${well.name || ""}</h3>
          <ul style="color:#18191b;">
            <li><b>Type:</b> ${well.type || ""}</li>
            <li><b>Christmas Tree Type:</b> ${well.treeType || ""}</li>
            ${(well.rings && well.rings.length)
                ? `<li><b>Integrity/Risk:</b>
                  <ul style="margin-bottom:0;">
                    ${well.rings.map(r => `<li style="color:${r.color};"><b>${r.label}:</b> ${r.message}</li>`).join('')}
                  </ul></li>` : ""}
          </ul>`;
        detailsBox.innerHTML = html;
        detailsBox.style.display = "block";
      };
  }
}

async function showValveInputPanel(currentWellId, currentValveId) { 
  const panel = document.getElementById('valveInputPanel');
  if (!panel) {
    console.error("valveInputPanel element not found");
    return;
  }
  panel.innerHTML = `<div style="color:#ccc; padding:20px;">Loading valve ${currentValveId} data for well ${currentWellId}...</div>`;
  panel.style.display = 'block';
  panel.classList.add('active');
  window.currentValvePanel = currentValveId; 

  const savedFormData = JSON.parse(localStorage.getItem(`valveData_${currentWellId}_${currentValveId}`) || '{}');
  const valveType = getValveTypeLabel(currentValveId); 
  const valveLimits = VALVE_LIMITS[currentValveId] || { monitoring_time: "", critical_rate: "" };

  let validBlockingValves = [];
  try {
    const response = await fetch(`http://10.226.14.79:5000/api/valid_blocking_valves?well=${currentWellId}&valve=${currentValveId}`);
    if (response.ok) {
      const data = await response.json();
      validBlockingValves = data.blocking_valves || [];
    } else {
      console.error(`Failed to fetch valid blocking valves for ${currentWellId}/${currentValveId}:`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`Error fetching valid blocking valves for ${currentWellId}/${currentValveId}:`, error);
  }

  let formHtml = `<h3>Valve ${currentValveId} Data (Well: ${currentWellId})</h3><form id="valveForm_${currentWellId}_${currentValveId}">`; 
  valveFormSections.forEach((section, i) => {
    formHtml += `
      <div class="valve-form-accordion">
        <button type="button" class="accordion-toggle" data-index="${i}">${section.title}</button>
        <div class="accordion-panel" style="display:${i === 0 ? "block" : "none"};">`;
    section.fields.forEach(field => {
      let val = savedFormData[field.name] || "";
      if (field.name === "valveId") val = currentValveId; 
      if (field.name === "valveType") val = valveType;
      if (field.name === "monitoringTime") val = valveLimits.monitoring_time;
      if (field.name === "maxInternalLeakRate") val = valveLimits.critical_rate;

      if (field.name === "downstreamBlockingValve") {
        formHtml += `<label>${field.label}
          <select name="${field.name}" ${field.readonly ? "disabled" : ""}>
            <option value="">-- Select Blocking Valve --</option>
            ${validBlockingValves.map(opt => `<option value="${opt}"${val === opt ? ' selected' : ''}>${opt}</option>`).join('')}
          </select></label>`;
      } else if (field.type === "select") {
        formHtml += `<label>${field.label}
          <select name="${field.name}" ${field.readonly ? "disabled" : ""}>
            <option value=""></option>
            ${(field.options||[]).map(opt => `<option value="${opt}"${val===opt?' selected':''}>${opt}</option>`).join('')}
          </select></label>`;
      } else if (field.type === "radio") {
        formHtml += `<label>${field.label}<div class="radio-group">` +
          (field.options||[]).map(opt => `<label><input type="radio" name="${field.name}" value="${opt}"${val===opt?' checked':''}> ${opt}</label>`).join('') +
        `</div></label>`;
      } else {
        formHtml += `<label>${field.label}
          <input type="${field.type||'text'}" name="${field.name}" ${field.readonly?"readonly":""} value="${val}"></label>`;
      }
    });
    formHtml += `</div></div>`;
  });
  formHtml += `
        <div class="valve-form-accordion">
      <button type="button" class="accordion-toggle" data-index="review">Review & Submit</button>
      <div class="accordion-panel" style="display:none;">
        <div id="reviewPanel_${currentWellId}_${currentValveId}"></div>
        <button type="submit" class="primary-btn" style="margin-top:20px;">Submit Test</button>
        <span id="submitMsg_${currentWellId}_${currentValveId}" style="color:#eaff57;display:none;margin-left:18px;"></span>
      </div>
    </div>
    <div id="autosaveMsg_${currentWellId}_${currentValveId}" style="color:#eaff57; margin-top:12px; font-size:1em; display:none;">Autosaved</div>
  </form>
  <div id="warningHistoryPanel_${currentWellId}_${currentValveId}" style="display:none; margin-top: 18px;"></div>`;
  panel.innerHTML = formHtml;

  Array.from(panel.querySelectorAll('.accordion-toggle')).forEach(btn => {
    btn.onclick = function() {
      const currentAccordionPanel = this.nextElementSibling;
      if (!currentAccordionPanel) return;
      const isReviewButton = this.dataset.index === "review";
      
      const isCurrentlyOpen = currentAccordionPanel.style.display === "block";
      panel.querySelectorAll('.accordion-panel').forEach(p => p.style.display = "none"); 
      currentAccordionPanel.style.display = isCurrentlyOpen ? "none" : "block";

      if (currentAccordionPanel.style.display === "block" && isReviewButton) {
        const formForReview = document.getElementById(`valveForm_${currentWellId}_${currentValveId}`);
        const reviewPanelDiv = document.getElementById(`reviewPanel_${currentWellId}_${currentValveId}`);
        if (formForReview && reviewPanelDiv && typeof showReviewPanelContent === "function") { 
            showReviewPanelContent(reviewPanelDiv, formForReview, valveLimits, currentValveId);
        }
      }
    };
  });

  const currentForm = document.getElementById(`valveForm_${currentWellId}_${currentValveId}`);
  if (currentForm) {
    currentForm.addEventListener('input', function() {
      const data = {};
      new FormData(currentForm).forEach((value, key) => data[key] = value);
      localStorage.setItem(`valveData_${currentWellId}_${currentValveId}`, JSON.stringify(data));
      const msg = document.getElementById(`autosaveMsg_${currentWellId}_${currentValveId}`);
      if (msg) {
        msg.style.display = 'block';
        if (panel._saveTimer) clearTimeout(panel._saveTimer); 
        panel._saveTimer = setTimeout(() => { msg.style.display = 'none'; }, 800);
      }
    });

    currentForm.onsubmit = async function(e) {
      e.preventDefault();
      const localWarningHistoryPanel = document.getElementById(`warningHistoryPanel_${currentWellId}_${currentValveId}`);
      if (typeof clearWarningHistoryDisplay === "function") clearWarningHistoryDisplay(localWarningHistoryPanel);

      const submittedFormData = {};
      new FormData(currentForm).forEach((value, key) => submittedFormData[key] = value);

      const apiPayload = {
        Well: currentWellId, 
        ValveType: currentValveId,
        BlockingValve: submittedFormData.downstreamBlockingValve,
        InitialPressure: Number(submittedFormData.initialPressure) || 0,
        FinalPressure: Number(submittedFormData.finalPressure) || 0,
        InitialTemperature: Number(submittedFormData.initialTemp) || 0,
        FinalTemperature: Number(submittedFormData.finalTemperature) || 0,
        MonitoringTime: valveLimits.monitoring_time, 
        SITHP: Number(submittedFormData.SITHP) || 0,
        LiquidYield: Number(submittedFormData.LiquidYield) || 0,
        PressureUpstreamPFSV: Number(submittedFormData.PressureUpstreamPFSV) || 0,
        GasSG: Number(submittedFormData.GasSG) || 0.6, 
        k: Number(submittedFormData.k) || 1.3,       
        TestedBy: 'Rob-mcna'
      };
      
      const submitMsgEl = document.getElementById(`submitMsg_${currentWellId}_${currentValveId}`);
      if(submitMsgEl) {
        submitMsgEl.textContent = "Processing test...";
        submitMsgEl.style.display = 'inline';
      }

      try {
        const response = await fetch('http://10.226.14.79:5000/api/run_integrity_test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });
        const newTestResult = await response.json(); 
        console.log(`API Response for ${currentValveId} on well ${currentWellId}:`, newTestResult);

        if (!response.ok) {
          const errorMsg = `Server Error: ${newTestResult.error || response.statusText || 'Unknown API error'}`;
          if (typeof addMessageToWarningHistoryDisplay === "function") addMessageToWarningHistoryDisplay(localWarningHistoryPanel, errorMsg);
          if(submitMsgEl) submitMsgEl.textContent = errorMsg.length > 40 ? "Test Failed (see warnings)" : errorMsg;
        } else {
          if (!window.valveTestResults[currentWellId]) {
            window.valveTestResults[currentWellId] = {};
          }
          if (!Array.isArray(window.valveTestResults[currentWellId][currentValveId])) {
            window.valveTestResults[currentWellId][currentValveId] = []; 
          }
          
          // Add timestamp for tracking
          newTestResult.utc_timestamp = '2025-06-17T16:07:06Z';
          newTestResult.inputs = newTestResult.inputs || {};
          newTestResult.inputs.TestedBy = 'Rob-mcna';
          newTestResult.inputs.timestamp = '2025-06-17T16:07:06Z';
          
          window.valveTestResults[currentWellId][currentValveId].push(newTestResult);
          
           if (!window.selectedValveTestIndex[currentWellId]) window.selectedValveTestIndex[currentWellId] = {};
           window.selectedValveTestIndex[currentWellId][currentValveId] = window.valveTestResults[currentWellId][currentValveId].length - 1;

          saveValveTestResultsToLocalStorage(); 

          const actualLeakRateField = currentForm.elements["actualInternalLeakRate"];
          if (actualLeakRateField && newTestResult.leak_rate_scfm !== undefined) {
            actualLeakRateField.value = Number(newTestResult.leak_rate_scfm).toFixed(3);
          }
          if(submitMsgEl) submitMsgEl.textContent = "Test results processed!";

          // Update local warnings
          if (!window.valveTestWarnings[currentWellId]) window.valveTestWarnings[currentWellId] = {};
          window.valveTestWarnings[currentWellId][currentValveId] = Array.isArray(newTestResult.failure_reasons) ? newTestResult.failure_reasons.slice() : [];
          if (typeof addMessageToWarningHistoryDisplay === "function" && Array.isArray(newTestResult.failure_reasons)) {
            newTestResult.failure_reasons.forEach(reason => addMessageToWarningHistoryDisplay(localWarningHistoryPanel, reason));
          }
          localStorage.setItem('valve_test_warnings', JSON.stringify(window.valveTestWarnings));

          // FIX #1: CRITICAL - Update dashboard and sync with global wells data
          updateDashboardAfterTest(currentWellId);

          // Also update global wells data structure for dashboard compatibility
          if (window.wells) {
            const wellIndex = window.wells.findIndex(w => w.id === currentWellId);
            if (wellIndex !== -1) {
              if (!window.wells[wellIndex].valveTestResults) {
                window.wells[wellIndex].valveTestResults = {};
              }
              window.wells[wellIndex].valveTestResults[currentValveId] = window.valveTestResults[currentWellId][currentValveId];
            }
          }
        }
      } catch (error) {
        console.error(`Client-side error for ${currentValveId} on well ${currentWellId}:`, error);
        const clientErrorMsg = 'Client-side error: ' + error.message;
        if (typeof addMessageToWarningHistoryDisplay === "function") addMessageToWarningHistoryDisplay(localWarningHistoryPanel, clientErrorMsg);
        if(submitMsgEl) submitMsgEl.textContent = clientErrorMsg.length > 40 ? "Client Error (see warnings)" : clientErrorMsg;
      } finally {
        if(submitMsgEl) setTimeout(() => { if(submitMsgEl) submitMsgEl.style.display = 'none'; }, 3500);
        
        // FIX #4: Force immediate UI updates
        setTimeout(() => {
          renderValveTestResultsPanel(currentWellId); 
          renderWellSchematicAndPanel(currentWellId); 
          updateDashboardAfterTest(currentWellId);
          showTemporaryMessage('Test completed and displays updated', 'success');
        }, 100);
      }
    };
  } else {
    console.error(`Form element #valveForm_${currentWellId}_${currentValveId} not found after rendering panel content.`);
  }

  function showReviewPanelContent(reviewPanelDiv, formForReview, currentValveLimits, currentValveIdForReview) { 
    let out = "<table style='width:100%;font-size:1em;'>";
    valveFormSections.forEach(section => {
      out += `<tr><th colspan="2" style="color:#ffe257;text-align:left;padding-top:10px;">${section.title}</th></tr>`;
      section.fields.forEach(f => {
        let v;
        if (f.name === "valveId") v = currentValveIdForReview;
        else if (f.name === "valveType") v = getValveTypeLabel(currentValveIdForReview);
        else if (f.name === "monitoringTime") v = currentValveLimits.monitoring_time;
        else if (f.name === "maxInternalLeakRate") v = currentValveLimits.critical_rate;
        else v = (f.type === "radio")
          ? (formForReview.querySelector(`[name="${f.name}"]:checked`) || {value:""}).value
          : (formForReview.elements[f.name]?.value || "");
        out += `<tr>
            <td style="color:#8ec4f7;padding-left:10px;width:40%;">${f.label}</td>
            <td style="color:#fff;width:60%;">${v || 'N/A'}</td></tr>`; 
      });
    });
    out += "</table>";
    reviewPanelDiv.innerHTML = out;
  }

  let localWarningHistoryStore = []; 
  function renderWarningHistoryDisplay(historyPanelDiv) {
    if (!historyPanelDiv) return;
    if (localWarningHistoryStore.length === 0) {
      historyPanelDiv.style.display = 'none'; historyPanelDiv.innerHTML = ''; return;
    }
    const collapsed = historyPanelDiv.getAttribute('data-collapsed') === 'true';
    historyPanelDiv.style.display = 'block';
    historyPanelDiv.innerHTML = `
      <button class="toggle-warning-history-btn" style="background:#222;color:#ffe257;border:none;padding:6px 14px;border-radius:4px;font-size:1em;cursor:pointer;float:right;">
        ${collapsed ? 'Show' : 'Hide'} Warning History (${localWarningHistoryStore.length})</button>
      <div class="warning-history-content" style="margin-top: 8px;${collapsed ? 'display:none;' : ''}">
        <div style="color:#ff4b4b;font-weight:bold;">Warning History:</div>
        <ul style="color:#ffbaba;list-style:disc inside;padding-left:18px;">
          ${localWarningHistoryStore.map(w => `<li>${w}</li>`).join('')}</ul></div>
      <div style="clear:both"></div>`;
    
    const toggleBtn = historyPanelDiv.querySelector('.toggle-warning-history-btn');
    if(toggleBtn) {
      toggleBtn.onclick = function() {
        historyPanelDiv.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
        renderWarningHistoryDisplay(historyPanelDiv); 
      };
    }
  }
  function addMessageToWarningHistoryDisplay(historyPanelDiv, msg) { 
    localWarningHistoryStore.push(msg); 
    renderWarningHistoryDisplay(historyPanelDiv); 
  }
  function clearWarningHistoryDisplay(historyPanelDiv) { 
    localWarningHistoryStore = []; 
    renderWarningHistoryDisplay(historyPanelDiv); 
  }
  clearWarningHistoryDisplay(document.getElementById(`warningHistoryPanel_${currentWellId}_${currentValveId}`));
}

function getValveTypeLabel(valveId) {
  switch(valveId) {
    case "HWV": return "Hydraulic Wing Valve"; case "MWV": return "Manual Wing Valve";
    case "SCSSV": return "Subsurface Safety Valve"; case "MMV": return "Master Valve";
    case "HMV": return "Hydraulic Master Valve"; case "SV": return "Swab Valve";
    case "2SV": return "Second Swab Valve"; case "TC": return "Tree Cap";
    case "CV": return "Crossover Valve"; case "HDVs": return "Hydraulic Downhole Valve";
    default: return valveId; 
  }
}

function showCreateWellModal() {
  let modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'createWellModal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content" style="min-width:340px;">
      <h3>Create New Well</h3>
      <form id="createWellForm" autocomplete="off">
        <label>Well Name/ID:<br>
          <input type="text" name="wellId" required style="width:100%;">
        </label><br><br>
        <label>Well Type:<br>
          <input type="text" name="wellType" list="wellTypeList" style="width:100%;">
          <datalist id="wellTypeList">
            <option value="Producer">
            <option value="Injector">
            <option value="Observation">
          </datalist>
        </label><br><br>
        <label>Christmas Tree Type:<br>
          <select name="treeType" id="treeTypeSel" required style="width:100%;">
            ${(window.christmasTreeSchematics || []).map(t =>
              `<option value="${t.type}">${t.label}</option>`
            ).join('')}
          </select>
        </label><br><br>
        <label>Schematic Diagram:<br>
          <div style="display:flex;align-items:center;gap:10px;">
            <select name="schematic" id="schematicSel" style="width:60%;">
              ${(window.christmasTreeSchematics || []).map(t =>
                `<option value="${t.type}">${t.label}</option>`
              ).join('')}
            </select>
            <span id="schematicPreview" style="display:inline-block;"></span>
          </div>
        </label><br>
        <label>Additional Metadata:<br>
          <input type="text" name="metadata" style="width:100%;" placeholder="Optional notes, etc.">
        </label><br>
        <div style="margin-top:18px;">
          <button type="submit" class="primary-btn">Create Well</button>
          <button type="button" id="cancelCreateWellBtn" class="secondary-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  function updateSchematicPreview() {
    const type = document.getElementById('schematicSel').value;
    const schematicPreview = document.getElementById('schematicPreview');
    if (schematicPreview) {
        schematicPreview.innerHTML = type && schematicSVGs && schematicSVGs[type]
        ? `<span class="schematic-svg-preview">${schematicSVGs[type]}</span>` : '';
    }
  }
  const schematicSel = document.getElementById('schematicSel');
  if(schematicSel) schematicSel.onchange = updateSchematicPreview;
  
  const treeTypeSel = document.getElementById('treeTypeSel');
  if(treeTypeSel) {
      treeTypeSel.onchange = function() {
        if(schematicSel) schematicSel.value = this.value;
        updateSchematicPreview();
      };
  }
  updateSchematicPreview(); 
  
  const cancelCreateWellBtn = document.getElementById('cancelCreateWellBtn');
  if(cancelCreateWellBtn) cancelCreateWellBtn.onclick = function() { modal.remove(); };

  const createWellForm = document.getElementById('createWellForm');
  if(createWellForm) {
      createWellForm.onsubmit = function(e) {
        e.preventDefault();
        const form = e.target;
        const newId = form.wellId.value.trim();
        if (!newId) return;
        if ((window.wells || []).find(w => w.id === newId)) { 
          alert('A well with this ID already exists.');
          return;
        }
        const newWellData = {
          id: newId, name: newId, type: form.wellType.value || "",
          treeType: form.treeType.value, schematic: form.schematic.value, 
          rings: [], 
          metadata: form.metadata.value || "",
          valveTestResults: {} 
        };
        if (!window.wells) window.wells = [];
        window.wells.push(newWellData);
        modal.remove();
        renderWellsSection(); 
        const wellDropdown = document.getElementById('wellDropdown');
        if(wellDropdown) {
            wellDropdown.value = newId;
            if(typeof wellDropdown.onchange === 'function') wellDropdown.onchange();
        }
      };
  }
}

// FIX #5: Enhanced deviation integration with proper context
function openDeviationFromWell(wellId, valveId = null) {
    // Switch to deviations section
    if (typeof showSection === 'function') {
        showSection('deviations');
    }
    
    // Wait for section to load, then trigger deviation form with context
    setTimeout(() => {
        // Look for the add deviation button
        const addDeviationBtn = document.getElementById('addDeviationBtn');
        if (addDeviationBtn && typeof addDeviationBtn.click === 'function') {
            addDeviationBtn.click();
        }
        
        // Pre-populate deviation form if available
        setTimeout(() => {
            // Get the current test result and warnings for context
            let context = {};
            if (valveId && window._richDeviationContext && window._richDeviationContext[`${wellId}::${valveId}`]) {
                const richContext = window._richDeviationContext[`${wellId}::${valveId}`];
                context = {
                    title: `Test Failure - ${valveId} in Well ${wellId}`,
                    description: `Valve ${valveId} in well ${wellId} failed integrity test.\n\nLeak Rate: ${richContext.result?.leak_rate_scfm ? Number(richContext.result.leak_rate_scfm).toFixed(3) : 'N/A'} scfm\nAllowable Rate: ${richContext.allowableRate || 'N/A'} scfm`,
                    warnings: richContext.warnings || []
                };
            } else {
                context = {
                    title: `Well Integrity Issue - ${wellId}`,
                    description: `Well ${wellId} has integrity issues requiring attention.`
                };
            }
            
            // Try to find and populate form fields
            const titleField = document.getElementById('devTitle');
            const descField = document.getElementById('devDescription');
            
            if (titleField && descField) {
                titleField.value = context.title;
                descField.value = context.description;
                showTemporaryMessage(`Deviation form opened for ${valveId ? valveId + ' in ' : ''}well ${wellId}`, 'success');
            } else {
                showTemporaryMessage(`Switched to deviations section for well ${wellId}`, 'info');
            }
        }, 300);
    }, 200);
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// INITIALIZATION AND DATA FETCHING
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

async function fetchWellsAndInitialize() {
    try {
        showTemporaryMessage('Loading wells data...', 'info');
        
        const response = await fetch('http://10.226.14.79:5000/api/wells');
        if (!response.ok) {
            console.error("Failed to fetch wells data:", response.status, await response.text());
            showTemporaryMessage('Failed to load wells data - using local storage', 'warning');
            loadValveTestResultsFromLocalStorage(); 
            if (document.getElementById('wellList')) renderWellsSection(); 
            return;
        }
        const wellsDataFromServer = await response.json();
        
        window.wells = wellsDataFromServer; 
        
        window.valveTestResults = {}; 
        window.selectedValveTestIndex = {}; 

        wellsDataFromServer.forEach(well => {
            if (well.valveTestResults && typeof well.valveTestResults === 'object') {
                window.valveTestResults[well.id] = {};
                 window.selectedValveTestIndex[well.id] = {};
                for (const valveId in well.valveTestResults) {
                    if (well.valveTestResults.hasOwnProperty(valveId)) {
                         const testsArray = well.valveTestResults[valveId];
                         if(Array.isArray(testsArray)) {
                            window.valveTestResults[well.id][valveId] = testsArray;
                            if (testsArray.length > 0) {
                                window.selectedValveTestIndex[well.id][valveId] = testsArray.length - 1;
                            }
                         } else {
                             console.warn(`Received non-array test data for ${well.id}/${valveId} from server.`);
                             window.valveTestResults[well.id][valveId] = [];
                         }
                    }
                }
            } else {
                 window.valveTestResults[well.id] = {}; 
                 window.selectedValveTestIndex[well.id] = {};
            }
        });
        
        // FIX #3: Call persistence function
        ensureTestResultsPersistence();
        
        saveValveTestResultsToLocalStorage(); 

        if (document.getElementById('wellList')) {
            renderWellsSection(); 
        }
        
        showTemporaryMessage('Wells data loaded successfully', 'success');

    } catch (error) {
        console.error("Error during fetchWellsAndInitialize:", error);
        showTemporaryMessage('Network error - using offline data', 'error');
        loadValveTestResultsFromLocalStorage();
        if (document.getElementById('wellList')) renderWellsSection();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Load initial data
  loadValveTestResultsFromLocalStorage();
  
  // Fetch from server
  fetchWellsAndInitialize();
});

// Export functions for global access
window.renderWellsSection = renderWellsSection;
window.renderWellSchematicAndPanel = renderWellSchematicAndPanel;
window.renderValveTestResultsPanel = renderValveTestResultsPanel;
window.showValveInputPanel = showValveInputPanel;
window.deleteSpecificTest = deleteSpecificTest;
window.deleteAllTestsForValve = deleteAllTestsForValve;
window.viewDeletedTests = viewDeletedTests;
window.showDeleteTestConfirmation = showDeleteTestConfirmation;
window.exportTestData = exportTestData;
window.fetchWellsAndInitialize = fetchWellsAndInitialize;
window.openDeviationFromWell = openDeviationFromWell;
window.updateDashboardAfterTest = updateDashboardAfterTest;