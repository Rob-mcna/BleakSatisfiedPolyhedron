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

 <!-- CORRECTED AND FINAL LAYOUT -->
  <div class="well-layout" id="wellInlineLayout" style="display:none;">
    
    <div class="well-schematic-and-results-wrapper">
      <div id="wellSchematicArea"></div>
      <div id="valveTestResultsPanel"></div>
    </div>
    
    <!-- This container will now control visibility via CSS classes -->
    <div class="panel-container">
      <div id="valveInputPanel"></div>
      <div id="valveFailureDetailsPanel"></div>
    </div>

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
    const wellConfig = (window.wells || []).find(w => w.id === wellId);
    if (!wellConfig) {
      console.error(`Could not find well with ID ${wellId}`);
      return {};
    }

    if (window.valveTestResults && (window.valveTestResults[wellId] || window.valveTestResults[wellConfig.name])) {
      console.log(`Using cached test results for well ${wellId}`);
      return window.valveTestResults[wellId] || window.valveTestResults[wellConfig.name];
    }

    console.log(`Fetching test results from API for well ${wellId}`);
    const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/results?well=${wellId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch valve test results for well ${wellId}: ${response.statusText}`);
      return {};
    }

    const testResults = await response.json();
    console.log(`Fetched test results for well ${wellId}:`, testResults);

    // Validate each test result
    const validatedResults = {};
    for (const valveId in testResults) {
      if (Array.isArray(testResults[valveId])) {
        validatedResults[valveId] = testResults[valveId].map(test => 
          validateTestOnFrontend(test, { critical_rate: test.criticalRate || test.limits?.critical_rate_scfm || 0 }));
      } else {
        validatedResults[valveId] = validateTestOnFrontend(testResults[valveId], { 
          critical_rate: testResults[valveId].criticalRate || testResults[valveId].limits?.critical_rate_scfm || 0 
        });
      }
    }

    if (!window.valveTestResults) window.valveTestResults = {};
    window.valveTestResults[wellId] = validatedResults;
    if (wellConfig.name) window.valveTestResults[wellConfig.name] = validatedResults;

    console.log(`Successfully loaded and validated test results for well ${wellId}`, validatedResults);
    return validatedResults;
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

  const schematicPath = wellConfig.christmasTree && wellConfig.christmasTree.schematic;
  if (schematicPath) {
    const fullSchematicURL = `http://127.0.0.1:5000${schematicPath}`;
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

  let allValves = [];
  try {
    if (!window.allValves || window.allValves.length === 0) {
      console.log("Fetching valve list from API");
      const valvesResponse = await fetch("http://127.0.0.1:5000/api/valves/");
      if (valvesResponse.ok) {
        allValves = await valvesResponse.json();
        window.allValves = allValves;
      } else {
        console.error("Failed to fetch valve list from API.");
      }
    } else {
      allValves = window.allValves;
    }
  } catch (error) {
    console.error("Error fetching valve list:", error);
  }

  window.valveTestResults = window.valveTestResults || {};
  
  console.log("Available test results for well:", wellId);
  console.log("By ID:", window.valveTestResults[wellId]);
  console.log("By name:", window.valveTestResults[wellConfig.name]);

  const svg = wellSchematicArea.querySelector('svg');
  if (svg && allValves.length > 0) {
    setTimeout(() => {
      console.log("Processing SVG elements for valve coloring");
      Array.from(svg.querySelectorAll('g')).forEach(g => {
        const texts = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
        const foundValve = allValves.find(v => texts.includes(v.name));
        
        if (foundValve) {
          g.style.cursor = 'pointer';
          
          let color = '#e6c23a'; // Default: Untested (yellow)
          let testStatus = null;
          let testDetails = null;

          console.log(`Checking test status for valve: ${foundValve.name} (${foundValve.id})`);
          
          const testResultsByWellId = window.valveTestResults[wellId] || {};
          const testResultsByWellName = window.valveTestResults[wellConfig.name] || {};
          
          const valveTests = testResultsByWellId[foundValve.id] || testResultsByWellName[foundValve.id];
          
          if (valveTests) {
            if (Array.isArray(valveTests) && valveTests.length > 0) {
              testDetails = valveTests[valveTests.length - 1];
              testStatus = "array";
            } else if (typeof valveTests === 'object' && valveTests !== null) {
              testDetails = valveTests;
              testStatus = "object";
            }
            
            console.log(`Test details for ${foundValve.name}:`, testDetails);
            
            if (testDetails) {
              if (testDetails.status === "pass") {
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
          
          g.querySelectorAll('text').forEach(t => t.setAttribute('fill', '#000'));
          
          g.onclick = function(e) {
            showValvePanelOptions(wellId, foundValve.id, foundValve.name, e);
            console.log(`Clicked valve: ${foundValve.name} (ID: ${foundValve.id})`);
          };
        }
      });
    }, 300);
  } else {
    console.warn("SVG not found or valve list empty");
  }
  
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
  if (!resultsForWell) {
    const well = (window.wells || []).find(w => w.id === currentWellId);
    if (well && well.name) resultsForWell = window.valveTestResults[well.name];
  }
  resultsForWell = resultsForWell || {};

  const warningsForWell = window.valveTestWarnings[currentWellId] || {};
  
  let html = `<div class="panel-title" style="color: ${mainWhite}; padding: 18px 24px 12px 24px; text-transform: uppercase; font-weight: bold; font-size: 24px; font-family: Arial, sans-serif; text-align: center; letter-spacing: 1px;">Valve Test Results</div>`;
  html += `<div class="valve-entries-container" style="padding: 15px 20px;">`;

  const valveIdsWithActualTests = [];
  
  for (const valveId in resultsForWell) {
    const testsHistoryForValve = resultsForWell[valveId];
    let hasValidTests = false;
    if (Array.isArray(testsHistoryForValve) && testsHistoryForValve.length > 0) {
      hasValidTests = testsHistoryForValve.some(test => 
        test && typeof test === 'object' && Object.keys(test).length > 0
      );
    } else if (typeof testsHistoryForValve === 'object' && testsHistoryForValve !== null && !Array.isArray(testsHistoryForValve)) {
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

      console.log(`Rendering test for valve ${valveId} at index ${selectedIdx}:`, currentTestToShow);

      const allowableRate = (currentTestToShow && currentTestToShow.criticalRate !== undefined) 
        ? Number(currentTestToShow.criticalRate).toFixed(3) : 'N/A';
      const leakRateDisplay = (currentTestToShow && currentTestToShow.leakRate !== undefined) 
        ? Number(currentTestToShow.leakRate).toFixed(3) : 'N/A';
      const p1Value = (currentTestToShow && currentTestToShow.Pa !== undefined)
        ? Number(currentTestToShow.Pa).toFixed(1) : 'N/A';
      const pcValue = (currentTestToShow && currentTestToShow.Pc !== undefined) 
        ? Number(currentTestToShow.Pc).toFixed(1) : 'N/A';
      const pfValue = (currentTestToShow && currentTestToShow.Pf !== undefined)
        ? Number(currentTestToShow.Pf).toFixed(1) : 'N/A';

      html += `<div class="valve-entry" style="margin-bottom: 12px; background-color: ${valveEntryCardBackground}; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">`;
      html += `  <div class="valve-main-row" style="display: flex; align-items: stretch; min-height: 70px;">`;
      html += `    <div class="left-bar" style="background-color: ${leftBarColorForCard}; padding: 0 15px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="toggleValveTestDetails('${currentWellId}', '${valveId}')">`;
      html += `      <span id="icon-details-${currentWellId}-${valveId}" class="details-icon" style="color: ${expandIconColorOnBar}; font-size: 22px; transition: transform 0.2s;">&#9654;</span>`;
      html += `    </div>`;
      html += `    <div class="valve-content-area" style="flex-grow: 1; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">`;
      html += `      <div class="valve-info-primary" style="display: flex; flex-direction: column; justify-content: center; padding-right: 10px;">`;
      html += `        <div style="font-weight: bold; font-size: 1.2em; color: #060808ff;">${getValveNameById(valveId)}</div>`;
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

      const isFail = currentTestToShow && (!currentTestToShow.pass || !currentTestToShow.test_valid || !currentTestToShow.leak_rate_pass);
      if (isFail && typeof window.wellFailureModel !== "undefined") {
        const valveName = getValveNameById(valveId);
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
  html += `</div>`;

  panel.innerHTML = html;
}

/**
 * Determines the failure category and number from valve test results
 * using the well failure matrix for accurate categorization.
 * 
 * @param {Object} testResult - The valve test result data
 * @returns {Object} An object with category and number properties
 */
function getFailureCategoryAndNumber(testResult) {
  if (!testResult) {
    return { category: null, number: null };
  }

  // If the test passed, return null values
  if (testResult.pass === true) {
    return { category: null, number: null };
  }

  // Get the current well type from global context
  const wellName = window.currentWellContext?.name;
  const well = window.wells.find(w => w.name === wellName);
  const wellType = well ? getWellTypeKey(well.type) : 'Producer'; // Fallback to Producer

  // Get valve type
  const valveType = testResult.valve_type || '';
  const valveId = testResult.valve_id || '';
  
  // Extract failure information
  const failureReasons = testResult.failure_reasons || [];
  const isLeakRateExceeded = failureReasons.some(reason => 
    reason.includes('leak rate') || reason.includes('exceed')
  );
  
  // Determine if this is a surface or subsurface valve
  const isSubsurfaceValve = valveType.toUpperCase() === 'SCSSV';
  
  // Check if multiple valves failed (need to determine from global context)
  const multipleValvesFailed = checkForMultipleFailedValves(wellName);

  // Initialize with null values
  let category = null;
  let number = null;

  // Step 1: Determine the category
  if (isSubsurfaceValve) {
    category = multipleValvesFailed ? 'multipleSubSurfaceFailures' : 'singleSubSurfaceFailure';
  } else {
    category = multipleValvesFailed ? 'multipleSurfaceFailures' : 'singleSurfaceFailure';
  }

  // Step 2: Find the appropriate failure number by searching through the matrix
  if (category && window.wellFailureMatrix[category]) {
    // Get all entries in the selected category
    const categoryEntries = window.wellFailureMatrix[category];
    
    // Find the most appropriate failure description based on valve type
    for (const [failureNum, failureData] of Object.entries(categoryEntries)) {
      const description = failureData.description.toLowerCase();
      const valveTypeUpper = valveType.toUpperCase();
      
      // Match based on valve type
      if (description.includes(valveTypeUpper)) {
        number = parseInt(failureNum);
        break;
      }
      
      // For SCSSV and leak rate failures
      if (isSubsurfaceValve && isLeakRateExceeded && 
          description.includes('completion leak') && description.includes('above allowable leak rate')) {
        number = parseInt(failureNum);
        break;
      }
    }
    
    // If still not found, use first available number as fallback
    if (number === null && Object.keys(categoryEntries).length > 0) {
      number = parseInt(Object.keys(categoryEntries)[0]);
    }
  }

  console.log(`Dynamically categorized failure for ${valveType} as ${category}:${number}`, failureReasons);
  return { category, number };
}

/**
 * Helper function to check if multiple valves have failed for the well
 * @param {string} wellName - The name of the well to check
 * @returns {boolean} True if multiple valves have failed tests
 */
function checkForMultipleFailedValves(wellName) {
  if (!wellName || !window.valveTestResults || !window.valveTestResults[wellName]) {
    return false;
  }
  
  const wellResults = window.valveTestResults[wellName];
  let failedValveCount = 0;
  
  for (const valveId in wellResults) {
    if (wellResults.hasOwnProperty(valveId)) {
      const tests = wellResults[valveId];
      if (!Array.isArray(tests) || tests.length === 0) continue;
      
      // Check most recent test result
      const latestTest = tests[tests.length - 1];
      if (latestTest && latestTest.pass === false) {
        failedValveCount++;
      }
    }
  }
  
  return failedValveCount > 1;
}

window.renderWellsSection = renderWellsSection;
window.renderWellSchematicAndPanel = renderWellSchematicAndPanel;
window.renderValveTestResultsPanel = renderValveTestResultsPanel;