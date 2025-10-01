
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// MAIN RENDER FUNCTIONS
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// ... (keep all the code from the top of the file as is) ...

// The renderWellsSection function is now simpler. It just renders the UI.
// Update the renderWellsSection function to better handle auto-selection

window.currentUser = { login: 'Rob-mcna', role: 'admin' };
function renderWellsSection() {
  const wellListDiv = document.getElementById('wellList');
  if (!wellListDiv) return;

  // Clear previous contents
  wellListDiv.innerHTML = '';

  // Build the dropdown HTML
  let html = '';
  if (window.currentUser && window.currentUser.role === 'admin') {
    html += `<button id="createWellBtn" class="primary-btn" style="margin-bottom: 18px;">Create Well</button>
            <button id="createChristmassTreeBtn" class="primary-btn" style="margin-bottom: 18px;">Create Christmass Tree</button>
            <button id="registerValveBtn" class="primary-btn" style="margin-bottom: 18px;">Register Valve</button> 
            <button id="registerRuleModalBtn" class="primary-btn" style="margin-bottom: 18px;">RegisterRuleModal</button> `;
            
            
  }
    // ... inside renderWellsSection ...
  html += `<label for="wellDropdown" style="font-weight:bold;">Select Well:</label>
  <select id="wellDropdown" style="margin:0 12px 24px 8px;">
  <option value="" selected disabled>-- Select Well --</option>
  ${(window.wells || [])
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
    .map(w => `<option value="${w.id}">${w.name || w.id}</option>`).join('')}
</select>

<!-- Fixed layout: Schematic + Results side-by-side, Input below -->
<div class="well-layout" id="wellInlineLayout" style="display:none;">
  <div class="well-schematic-and-results-wrapper">
    <div id="wellSchematicArea"></div>
    <div id="valveTestResultsPanel"></div>
  </div>
  <div id="valveInputPanel"></div>
</div>
<div id="wellDetailsContainer" style="margin-top:18px;"></div>`;

  wellListDiv.innerHTML = html;

  // Admin create well button handler, if present
  if (window.currentUser && window.currentUser.role === 'admin') {
    const createWellBtn = document.getElementById('createWellBtn');
    const createChrismassTreeBtn = document.getElementById('createChristmassTreeBtn')
    const registerValveBtn= document.getElementById('registerValveBtn')
    const registerRuleModalBtn= document.getElementById('registerRuleModalBtn')
    if (createWellBtn) createWellBtn.onclick = showCreateWellModal;
    if (createChrismassTreeBtn) createChrismassTreeBtn.onclick = showCreateChristmasTreeModal;
    if (registerValveBtn) registerValveBtn.onclick = showCreateValveModal;
    if (registerRuleModalBtn) registerRuleModalBtn.onclick =showCreateBlockingValveRuleModal;
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
// MODIFIED INITIALIZATION FUNCTION


async function loadValveTestStatuses(wellId) {
  console.log(`Loading valve test results for well ${wellId}`);
  try {
    // First check if we already have the test results in memory
    const wellConfig = (window.wells || []).find(w => w.id === wellId);
    if (!wellConfig) {
      console.error(`Could not find well with ID ${wellId}`);
      return {};
    }
    
    // If we already have results in memory, use those
    if (window.valveTestResults && 
        (window.valveTestResults[wellId] || window.valveTestResults[wellConfig.name])) {
      console.log(`Using cached test results for well ${wellId}`);
      return window.valveTestResults[wellId] || window.valveTestResults[wellConfig.name];
    }
    
    // Otherwise fetch from API
    console.log(`Fetching test results from API for well ${wellId}`);
    const response = await fetch(`http://10.226.112.176:5000/api/integrity_test/results?well=${wellId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch valve test results for well ${wellId}: ${response.statusText}`);
      return {};
    }
     
    const testResults = await response.json();

    console.log(`Fetched test results for well ${wellId}:`, testResults);

    
        
    // Store results in memory using both wellId and well.name as keys for easier lookup
    if (!window.valveTestResults) window.valveTestResults = {};
    window.valveTestResults[wellId] = testResults;
    if (wellConfig.name) window.valveTestResults[wellConfig.name] = testResults;
    
    console.log(`Successfully loaded test results for well ${wellId}`, testResults);
    return testResults;
    
  } catch (error) {
    console.error(`Error loading valve test statuses for well ${wellId}:`, error);
    return {};
  }
}
// MODIFIED: This function is now async to handle fetching the schematic// CORRECTED: This function now uses the pre-loaded schematicsMap.
// FINAL CORRECTED VERSION
// This function is now async to handle fetching the schematic from its URL.
/**
 * Fixed version of renderWellSchematicAndPanel function with corrected valve coloring logic
 * @param {string} wellId - The ID of the well to render
 */
async function renderWellSchematicAndPanel(wellId) {
  console.log(`Starting to render schematic for well ${wellId}`);
  
  // Load test statuses first to ensure data is available
  await loadValveTestStatuses(wellId);
  
  const wellConfig = (window.wells || []).find(w => w.id === wellId);
  const wellInlineLayout = document.getElementById('wellInlineLayout');
  const wellSchematicArea = document.getElementById('wellSchematicArea');
  const valveInputPanel = document.getElementById('valveInputPanel');

  if (!wellConfig || !wellInlineLayout || !wellSchematicArea || !valveInputPanel) {
    console.warn("Missing required elements for rendering well schematic");
    if (wellInlineLayout) wellInlineLayout.style.display = 'none';
    return;
  }
  
  wellInlineLayout.style.display = 'flex';

  // --- Schematic Loading Logic ---
  const schematicPath = wellConfig.christmasTree && wellConfig.christmasTree.schematic;
  if (schematicPath) {
    const fullSchematicURL = `http://10.226.112.176:5000${schematicPath}`;
    wellSchematicArea.innerHTML = `<div class="loading-schematic">Loading schematic...</div>`;
    try {
      const response = await fetch(fullSchematicURL);
      if (!response.ok) throw new Error(`Failed to load schematic file: ${response.statusText}`);
      const schematicSVG = await response.text();
      wellSchematicArea.innerHTML = `<span class="schematic-svg-preview" id="schematicSVGContainer">${schematicSVG}</span>`;
    } catch (error) {
      console.error("Error fetching schematic:", error);
      wellSchematicArea.innerHTML = `<div class="schematic-error">Could not load schematic from path: ${schematicPath}</div>`;
    }
  } else {
    wellSchematicArea.innerHTML = `<div class="schematic-error">No schematic associated with this well.</div>`;
  }

  // --- Fetch all valves and make them available ---
  let allValves = [];
  try {
    if (!window.allValves || window.allValves.length === 0) {
      console.log("Fetching valve list from API");
      const valvesResponse = await fetch("http://10.226.112.176:5000/api/valves/");
      if (valvesResponse.ok) {
        allValves = await valvesResponse.json();
        window.allValves = allValves; // Make globally accessible
      } else {
        console.error("Failed to fetch valve list from API.");
      }
    } else {
      allValves = window.allValves;
    }
  } catch (error) {
    console.error("Error fetching valve list:", error);
  }

  // Make sure valve test results are properly initialized
  window.valveTestResults = window.valveTestResults || {};
  
  // Log available test results for debugging
  console.log("Available test results for well:", wellId);
  console.log("By ID:", window.valveTestResults[wellId]);
  console.log("By name:", window.valveTestResults[wellConfig.name]);

  const svg = wellSchematicArea.querySelector('svg');
  if (svg && allValves.length > 0) {
    // Use a short delay to ensure SVG has rendered
    setTimeout(() => {
      console.log("Processing SVG elements for valve coloring");
      Array.from(svg.querySelectorAll('g')).forEach(g => {
        const texts = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
        
        // Find the full valve object by matching its name to the SVG text
        const foundValve = allValves.find(v => texts.includes(v.name));
        
        if (foundValve) {
          g.style.cursor = 'pointer';
          
          // --- CORRECTED Valve Coloring Logic ---
          // Default: Untested (yellow)
          let color = '#e6c23a'; 
          let testStatus = null;
          let testDetails = null;

          console.log(`Checking test status for valve: ${foundValve.name} (${foundValve.id})`);
          
          // Look in both possible locations for test results
          const testResultsByWellId = window.valveTestResults[wellId] || {};
          const testResultsByWellName = window.valveTestResults[wellConfig.name] || {};
          
          // Get test results for this valve
          const valveTests = testResultsByWellId[foundValve.id] || testResultsByWellName[foundValve.id];
          
          if (valveTests) {
            if (Array.isArray(valveTests) && valveTests.length > 0) {
              testDetails = valveTests[valveTests.length - 1]; // Get latest test
              testStatus = "array";
            } else if (typeof valveTests === 'object' && valveTests !== null) {
              testDetails = valveTests; // Single test object
              testStatus = "object";
            }
            
            console.log(`Test details for ${foundValve.name}:`, testDetails);
            
            if (testDetails) {

              // Simplify the check - directly use the 'pass' property from the backend
              if (testDetails.status === 'pass') {
                color = '#19d219'; // Pass (green)
                console.log(`${foundValve.name} PASSED - Setting color to GREEN`);
              } else {
                color = '#e64a3a'; // Fail (red)
                console.log(`${foundValve.name} FAILED - Setting color to RED`);
              }
            }
          } else {
            console.log(`No test results found for ${foundValve.name}`);
          }
          
          const mainRect = g.querySelector('rect');
          if (mainRect) {
            mainRect.setAttribute('fill', color);
            console.log(`Set color ${color} for valve ${foundValve.name}`);
          }
          
          // Set valve name text color to black for visibility
          g.querySelectorAll('text').forEach(t => t.setAttribute('fill', '#000'));
          
          // --- CORRECTED Click Handler Logic ---
          g.onclick = function(e) {
          // Instead of directly showing a panel, show options popup
          showValvePanelOptions(wellId, foundValve.id, foundValve.name, e);
          console.log(`Clicked valve: ${foundValve.name} (ID: ${foundValve.id})`);
        };
        }
      });
    }, 300); // Increased delay for more reliable rendering
  } else {
    console.warn("SVG not found or valve list empty");
  }
  
  // Hide panel if no valve is selected
  if (!window.currentValvePanel || !valveInputPanel.classList.contains('active')) {
     valveInputPanel.style.display = 'none';
  }
}
function getWellNameById(wellId) {
  if (!window.wells || !Array.isArray(window.wells)) return wellId;
  const well = window.wells.find(w => w.id === wellId);
  return well ? well.name : wellId;
}
function getValveNameById(valveId) {
  if (!window.allValves) return valveId;
  const match = window.allValves.find(v => v.id === valveId);
  return match ? match.name : valveId;
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



  const mainBlue = '#81b2da'; 
  const mainWhite = '#0f0f0fff';

/*  const trashIconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 24 24" style="width:14px; height:14px;" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
  const deleteIconColor = '#E67E22'; 
  const deleteIconHoverColor = '#D35400'; 
  const deleteAllBgColor = 'rgba(230, 126, 34, 0.1)';
  const deleteAllHoverBgColor = 'rgba(230, 126, 34, 0.2)';
  const deleteButtonSize = '24px';
  const deleteBadgeSize = '14px';
  const deleteBadgeFontSize = '9px';
  const deleteBadgeTopRight = '-7px'; */

  const leftBarColorForCard = '#ffffffff'; 
  const expandIconColorOnBar = mainWhite; 
  const valveEntryCardBackground = '#ffffffff'; 
  const valveEntryCardBorder = '#ffff';   

  window.valveTestResults = window.valveTestResults || {};

  window.valveTestWarnings = window.valveTestWarnings || {};
  window.selectedValveTestIndex = window.selectedValveTestIndex || {};
  if (!window.selectedValveTestIndex[currentWellId]) {
    window.selectedValveTestIndex[currentWellId] = {};
  }

  let resultsForWell = window.valveTestResults[currentWellId];
  console.log('comprobando valveTestResults', window.valveTestResults);
  console.log('comprobando currentWellId', currentWellId);
  if (!resultsForWell) {
    // Try by name as well
    const well = (window.wells || []).find(w => w.id === currentWellId);
    if (well && well.name) resultsForWell = window.valveTestResults[well.name];
  }
  resultsForWell = resultsForWell || {};

  console.log('comprobando resultsForWellqqq', resultsForWell);
  const warningsForWell = window.valveTestWarnings[currentWellId] || {};
  
  let html = `<div class="panel-title" style="color: ${mainWhite}; padding: 18px 24px 12px 24px; text-transform: uppercase; font-weight: bold; font-size: 24px; font-family: Arial, sans-serif; text-align: center; letter-spacing: 1px;">Valve Test Results</div>`;
  html += `<div class="valve-entries-container" style="padding: 15px 20px;">`;

  // Only include valves that actually have test data
  const valveIdsWithActualTests = [];
  
  for (const valveId in resultsForWell) {
    const testsHistoryForValve = resultsForWell[valveId];
    let hasValidTests = false;
    if (Array.isArray(testsHistoryForValve) && testsHistoryForValve.length > 0) {
      // Check if array has actual test objects (not just empty array)
      hasValidTests = testsHistoryForValve.some(test => 
        test && typeof test === 'object' && Object.keys(test).length > 0
      );
    } else if (typeof testsHistoryForValve === 'object' && testsHistoryForValve !== null && !Array.isArray(testsHistoryForValve)) {
      // Check if single test object has content
      hasValidTests = Object.keys(testsHistoryForValve).length > 0;
    }
    if (hasValidTests) {
      valveIdsWithActualTests.push(valveId);
    }
  }

  if (valveIdsWithActualTests.length === 0) {
    html += `<div class="no-results-message" style="color: #86d2f0; opacity: 0.8; padding: 20px; text-align:center;">No tests run yet for well ${getWellNameById(currentWellId)}.</div>`;
  } else {
    for (const valveId of valveIdsWithActualTests) {
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

      // FIX #1: Use the valve's test data directly for the allowable rate.
      // The `VALVE_LIMITS` lookup was incorrect. The critical rate is on the test object.
      const allowableRate = (currentTestToShow && currentTestToShow.criticalRate !== undefined) 
                            ? Number(currentTestToShow.criticalRate).toFixed(3) : 'N/A';
      
      // FIX #2: The leak rate is not on the object, it needs to be calculated or retrieved.
      // For now, let's assume it might be on the test object directly, similar to the console output.
      // If `leak_rate_scfm` is not a property, you will need to find where it comes from.
      // Let's assume it's `Pa` for now based on the console screenshot.
      const leakRateDisplay = (currentTestToShow && currentTestToShow.leakRate !== undefined) 
                              ? Number(currentTestToShow.leakRate).toFixed(3) : 'N/A';

      // FIX #3: Access P1, Pc, and Pf directly from the test object, not from a nested `thresholds` property.
      const p1Value = (currentTestToShow && currentTestToShow.Pa !== undefined)
                      ? Number(currentTestToShow.Pa).toFixed(1) : 'N/A';
      const pcValue = (currentTestToShow && currentTestToShow.Pc !== undefined) 
                      ? Number(currentTestToShow.Pc).toFixed(1) : 'N/A';
      const pfValue = (currentTestToShow && currentTestToShow.Pf !== undefined)
                      ? Number(currentTestToShow.Pf).toFixed(1) : 'N/A';

      let historyDropdownHtml_inner = ''; 
      // === New Delete Buttons (Pill-shaped purple "Delete" buttons) ===
      /* const deleteBtnStyle = `
          background: #ec4141ff;
          color: white;
          border: none;
          border-radius: 30px;
          padding: 1px 1px;
          font-size: 0.7em;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s, transform 0.1s;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;

      const deleteBtnHoverStyle = `
          background: #b71c1c;
          transform: translateY(-1px);
      `;

      const deleteAllBtnStyle = `
          background: #e09c9cff;
          color: white;
          border: none;
          border-radius: 30px;
          padding: 1px 1px;
          font-size: 0.7em;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s, transform 0.1s;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;

      const deleteAllBtnHoverStyle = `
          background: #b71c1c;
          transform: translateY(-1px);
      `;

      let deleteButtonsHtml_inner = '';
      if (Array.isArray(testsHistoryForValve) && testsHistoryForValve.length > 0) {
          deleteButtonsHtml_inner = `
              <div style="margin-top: 8px; display: flex; gap: 8px;">
                  <button 
                      class="delete-test-btn" 
                      style="${deleteBtnStyle}" 
                      onmouseover="this.style.cssText += '${deleteBtnHoverStyle}'" 
                      onmouseout="this.style.cssText = '${deleteBtnStyle}'"
                      onclick="showDeleteTestConfirmation('${currentWellId}','${valveId}',${selectedIdx})"
                      title="Delete currently selected test">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Delete
                  </button>
                  <button 
                      class="delete-all-tests-btn" 
                      style="${deleteAllBtnStyle}"
                      onmouseover="this.style.cssText += '${deleteAllBtnHoverStyle}'" 
                      onmouseout="this.style.cssText = '${deleteAllBtnStyle}'"
                      onclick="showDeleteTestConfirmation('${currentWellId}','${valveId}',null)"
                      title="Delete all ${testsHistoryForValve.length} tests for this valve">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Delete All
                  </button>
              </div>
          `;
      } else {
          if (currentTestToShow) {
              deleteButtonsHtml_inner = `
                  <div style="margin-top: 8px;">
                      <button 
                          class="delete-test-btn" 
                          style="${deleteBtnStyle}"
                          onmouseover="this.style.cssText += '${deleteBtnHoverStyle}'" 
                          onmouseout="this.style.cssText = '${deleteBtnStyle}'"
                          onclick="showDeleteTestConfirmation('${currentWellId}','${valveId}',null)"
                          title="Delete this test">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                          Delete
                      </button>
                  </div>
              `;
          }
} */
      html += `<div class="valve-entry" style="margin-bottom: 12px; background-color: ${valveEntryCardBackground}; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">`;
      html += `  <div class="valve-main-row" style="display: flex; align-items: stretch; min-height: 70px;">`;
      html += `    <div class="left-bar" style="background-color: ${leftBarColorForCard}; padding: 0 15px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="toggleValveTestDetails('${currentWellId}', '${valveId}')">`;
      html += `      <span id="icon-details-${currentWellId}-${valveId}" class="details-icon" style="color: ${expandIconColorOnBar}; font-size: 22px; transition: transform 0.2s;">&#9654;</span>`; 
      html += `    </div>`;
      html += `    <div class="valve-content-area" style="flex-grow: 1; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">`;
      html += `      <div class="valve-info-primary" style="display: flex; flex-direction: column; justify-content: center; padding-right: 10px;">`;
      html += `        <div style="font-weight: bold; font-size: 1.2em; color: #060808ff;">${getValveNameById(valveId)}</div>`;
      html += `        ${historyDropdownHtml_inner}`; 
    //  html += `        ${deleteButtonsHtml_inner}`;  
      html += `      </div>`;
      html += `      <div class="valve-info-secondary" style="text-align: right; color: #ffff; font-size: 0.95em; white-space: nowrap;">`;
      html += `        <div style="margin-bottom: 6px;"><span style="color: #000000ff;">Leak Rate:</span> <strong style="font-size: 1.1em; color: #050505ff;">${leakRateDisplay}</strong> scfm</div>`;
      html += `        <div><span style="color: #000000ff;">Allowable:</span> <strong style="font-size: 1.1em; color: #000000ff;">${allowableRate}</strong> scfm</div>`;
      html += `      </div>`;
      html += `    </div>`; 
      html += `  </div>`; 

      html += `  <div id="details-${currentWellId}-${valveId}" class="valve-details-collapsible" style="display:none; padding: 15px 20px; background-color: rgba(0,0,0,0.05); border-top: 1px solid ${valveEntryCardBorder}; color: #080808ff; font-size: 0.9em;">`;
      html += `    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">`;
      html += `      <div><strong>Initial Pressure (P1):</strong> ${p1Value} psia</div>`;
      html += `      <div><strong>Critical Check (Pc):</strong> ${pcValue} psia</div>`;
      html += `      <div><strong>Final Allowable (Pf):</strong> ${pfValue} psia</div>`;
      html += `    </div>`;
      if (currentTestToShow && currentTestToShow.inputs) {
        html += `<div style="margin-top: 10px; border-top: 1px dashed rgba(255, 255, 255, 1); padding-top: 10px;"><strong>Tested by:</strong> ${currentTestToShow.inputs.TestedBy || 'N/A'} <span style="color:#95a5a6;">at ${formatTestTimestampForDropdown(currentTestToShow)}</span></div>`;
      }
      html += `  </div>`;

      const warningsForValve = warningsForWell[valveId] || [];
      if (currentTestToShow && warningsForValve.length > 0) {
        html += `  <div class="valve-warnings-section" style="padding: 10px 20px; background-color: rgba(192, 57, 43, 0.15); border-top: 1px solid ${valveEntryCardBorder}; color: #e74c3c; font-size: 0.9em;">`;
        html += `    <b>Warnings:</b> ${warningsForValve.join('; ')}`;
        html += `  </div>`;
      }

      // === Well Failure Model Matrix Integration (WFM) ===
      const isFail = currentTestToShow && (!currentTestToShow.pass || !currentTestToShow.test_valid || !currentTestToShow.leak_rate_pass);
      if (isFail && typeof window.wellFailureModel !== "undefined") {
        // Get the valve's short name (domain logic: use getValveNameById or similar)
        const valveName = getValveNameById(valveId);
        // Map to failure matrix category/number (edit getFailureCategoryAndNumber for your domain)
        const mapping = getFailureCategoryAndNumber(valveName, currentTestToShow.failure_reasons);
        if (mapping) {
          const well = (window.wells || []).find(w => w.id === currentWellId);
          const wellType = (well && well.type) ? well.type.replace(/ /g, '').toLowerCase() : "naturalflow";
          const code = window.wellFailureModel.getFailureCode(mapping.category, mapping.number, wellType);
          if (code !== null && code !== undefined) {
            const mitigation = window.wellFailureModel.getMitigatingAction(code);
            const trafficColor = mitigation ? mitigation.trafficLight : 'gray';
            html += `
              <div class="valve-failure-model-info" style="margin-top:10px;padding:10px 15px;background:rgba(255,255,0,0.06);border-left:5px solid ${trafficColor};border-radius:4px;">
                <b>Failure Code:</b> ${code}<br>
                <b>Mitigation:</b> ${mitigation ? mitigation.description : 'N/A'}<br>
                <b>Status:</b> <span style="color:${trafficColor};font-weight:bold;">${trafficColor.toUpperCase()}</span>
              </div>
            `;
          }
        }
      }

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

/*  if (currentUser && currentUser.role === 'admin') {
    html += `  <div class="admin-actions" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.1); border-radius: 4px; text-align:left;">`;
    html += `    <h4 style="margin: 0 0 12px 0; color: ${mainWhite}; opacity:0.9; font-size: 1.1em;">Admin Actions</h4>`;
    html += `    <button class="secondary-btn" onclick="viewDeletedTests('${currentWellId}')" style="margin-right: 10px; font-size:0.9em; padding: 8px 12px; background:rgba(255,255,255,0.2); color:${mainWhite}; border:1px solid rgba(255,255,255,0.3); border-radius:4px;">`;
    html += `      📁 View Deleted Tests`;
    html += `    </button>`;
    html += `    <button class="secondary-btn" onclick="exportTestData('${currentWellId}')" style="font-size:0.9em; padding: 8px 12px; background:rgba(255,255,255,0.2); color:${mainWhite}; border:1px solid rgba(255,255,255,0.3); border-radius:4px;">`;
    html += `      📊 Export All Data`;
    html += `    </button>`;
    html += `  </div>`;
  } */
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
          <h3 style="margin-bottom:8px; color:#18191b;">${well.name}  || ""}</h3>
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