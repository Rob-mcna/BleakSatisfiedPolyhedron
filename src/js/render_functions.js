
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



// MODIFIED: This function is now async to handle fetching the schematic// CORRECTED: This function now uses the pre-loaded schematicsMap.
// FINAL CORRECTED VERSION
// This function is now async to handle fetching the schematic from its URL.
async function renderWellSchematicAndPanel(wellId) {
  const wellConfig = (window.wells || []).find(w => w.id === wellId);
  const wellInlineLayout = document.getElementById('wellInlineLayout');
  const wellSchematicArea = document.getElementById('wellSchematicArea');
  const valveInputPanel = document.getElementById('valveInputPanel');

  if (!wellConfig || !wellInlineLayout || !wellSchematicArea || !valveInputPanel) {
    if (wellInlineLayout) wellInlineLayout.style.display = 'none';
    return;
  }
  wellInlineLayout.style.display = 'flex';

  // --- Schematic Loading Logic ---
  const schematicPath = wellConfig.christmasTree && wellConfig.christmasTree.schematic;
  if (schematicPath) {
    const fullSchematicURL = `http://10.226.112.214:5000${schematicPath}`;
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
    const valvesResponse = await fetch("http://10.226.112.214:5000/api/valves/");
    if (valvesResponse.ok) {
      allValves = await valvesResponse.json();
      window.allValves = allValves; // Make globally accessible
    } else {
      console.error("Failed to fetch valve list from API.");
    }
  } catch (error) {
    console.error("Error fetching valve list:", error);
  }

  const svg = wellSchematicArea.querySelector('svg');
  if (svg && allValves.length > 0) {
    // Use a short delay to ensure SVG has rendered
    setTimeout(() => {
      Array.from(svg.querySelectorAll('g')).forEach(g => {
        const texts = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
        
        // Find the full valve object by matching its name to the SVG text
        const foundValve = allValves.find(v => texts.includes(v.name));
        
        if (foundValve) {
          g.style.cursor = 'pointer';
          
          // --- CORRECTED Valve Coloring Logic ---
          // Use the valve's ID to look up its test results
          let color = '#e6c23a'; // Default: Untested (yellow)
          const wellTests = window.valveTestResults[wellId];
          if (wellTests && wellTests[foundValve.id] && Array.isArray(wellTests[foundValve.id]) && wellTests[foundValve.id].length > 0) {
            const latestTest = wellTests[foundValve.id][wellTests[foundValve.id].length - 1]; 
            if (latestTest && typeof latestTest === 'object') {
              if (latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass) {
                color = '#19d219'; // Pass (green)
              } else {
                color = '#e64a3a'; // Fail (red)
              }
            }
          }
          
          const mainRect = g.querySelector('rect');
          if (mainRect) mainRect.setAttribute('fill', color);
          // Set valve name text color to black for visibility
          g.querySelectorAll('text').forEach(t => t.setAttribute('fill', '#000'));
          
          // --- CORRECTED Click Handler Logic ---
          g.onclick = function(e) {
            e.stopPropagation();
            // Check against the valve's ID
            if (window.currentValvePanel === foundValve.id && valveInputPanel.style.display === 'block') {
              valveInputPanel.style.display = 'none';
              valveInputPanel.classList.remove('active');
              window.currentValvePanel = null;
            } else {
              // Pass both ID and NAME to the input panel function
              showValveInputPanel(wellId, foundValve.id, foundValve.name);
              // Set the current panel state using the ID
              window.currentValvePanel = foundValve.id;
              console.log(`Clicked valve: ${foundValve.name} (ID: ${foundValve.id})`);
            }
          };
        }
      });
    }, 100); // Increased delay slightly for complex SVGs
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

  panel.style.width = '400px'; 

  const mainBlue = '#81b2da'; 
  const mainWhite = '#0f0f0fff';

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
      html += `        <div style="font-weight: bold; font-size: 1.2em; color: #ecf0f1;">${getValveNameById(valveId)}</div>`;
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

window.renderWellsSection = renderWellsSection;
window.renderWellSchematicAndPanel = renderWellSchematicAndPanel;
window.renderValveTestResultsPanel = renderValveTestResultsPanel;