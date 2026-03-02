
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

  // --- Fetch all valves and make them available ---
  let allValves = [];
  try {
    const valvesResponse = await fetch("http://127.0.0.1:5000/api/valves/");
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