// Ensure SweetAlert is included in your project by adding the following script tag in your HTML:
// <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

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

  // Get saved form data from API instead of localStorage
  let savedFormData = {};
  try {
    const formDataResponse = await fetch(`http://10.226.14.79:5000/api/integrity_test/form_data?well=${currentWellId}&valve=${currentValveId}`);
    if (formDataResponse.ok) {
      savedFormData = await formDataResponse.json();
    }
  } catch (error) {
    console.error(`Error fetching saved form data for ${currentWellId}/${currentValveId}:`, error);
  }

  // Fetch valve limits from API instead of using hardcoded values
  let valveLimits = { monitoring_time: "", critical_rate: "" };
  try {
    const limitsResponse = await fetch(`http://10.226.14.79:5000/api/valves/${currentValveId}/limits`);
    if (limitsResponse.ok) {
      valveLimits = await limitsResponse.json();
    } else {
      console.error(`Failed to fetch limits for valve ${currentValveId}:`, limitsResponse.status);
    }
  } catch (error) {
    console.error(`Error fetching valve limits for ${currentValveId}:`, error);
  }

  // Get valve type from API instead of using local function
  let valveType = "";
  try {
    const valveDetailsResponse = await fetch(`http://10.226.14.79:5000/api/valves/${currentValveId}`);
    if (valveDetailsResponse.ok) {
      const valveDetails = await valveDetailsResponse.json();
      valveType = valveDetails.type_label || currentValveId;
    }
  } catch (error) {
    console.error(`Error fetching valve type for ${currentValveId}:`, error);
    valveType = currentValveId; // Fallback
  }

  let validBlockingValves = [];
  try {
    const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/blocking_valve?well=${currentWellId}&valve=${currentValveId}`);
    
    if (response.ok) {
      const data = await response.json();
      validBlockingValves = data.blocking_valves || [];
    } else {
      console.error(`Failed to fetch valid blocking valves for ${currentWellId}/${currentValveId}:`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`Error fetching valid blocking valves for ${currentWellId}/${currentValveId}:`, error);
  }
  
  const wellName = (window.wells.find(w => w.id === currentWellId))?.name || currentWellId;
  let formHtml = `<h3>Valve ${currentValveId} Data (Well: ${wellName})</h3><form id="valveForm_${currentWellId}_${currentValveId}">`;

  // Fetch valve form sections from API
  let valveFormSections = [];
  try {
    const formSectionsResponse = await fetch(`http://10.226.14.79:5000/api/integrity_test/form_sections`);
    if (formSectionsResponse.ok) {
      valveFormSections = await formSectionsResponse.json();
    } else {
      console.error("Failed to fetch form sections:", formSectionsResponse.status);
      // Fallback to default form sections if API fails
      valveFormSections = getDefaultFormSections();
    }
  } catch (error) {
    console.error("Error fetching form sections:", error);
    valveFormSections = getDefaultFormSections();
  }

  valveFormSections.forEach((section, i) => {
    formHtml += ` <div class="valve-form-accordion">
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
            ${(field.options || []).map(opt => `<option value="${opt}"${val === opt ? ' selected' : ''}>${opt}</option>`).join('')}
          </select></label>`;
      } else if (field.type === "radio") {
        formHtml += `<label>${field.label}<div class="radio-group">` +
          (field.options || []).map(opt => `<label><input type="radio" name="${field.name}" value="${opt}"${val === opt ? ' checked' : ''}> ${opt}</label>`).join('') +
          `</div></label>`;
      } else {
        formHtml += `<label>${field.label}
          <input type="${field.type || 'text'}" name="${field.name}" ${field.readonly ? "readonly" : ""} value="${val}"></label>`;
      }
    });
    formHtml += `</div></div>`;
  });
  
  formHtml += ` <div class="valve-form-accordion">
      <button type="button" class="accordion-toggle" data-index="review">Review & Submit</button>
      <div class="accordion-panel" style="display:none;">
        <div id="reviewPanel_${currentWellId}_${currentValveId}"></div>
        <button type="submit" class="primary-btn" style="margin-top:20px;">Submit Test</button>
        <span id="submitMsg_${currentWellId}_${currentValveId}" style="color:#eaff57;display:none;margin-left:18px;"></span>
      </div>
    </div>
    <div id="autosaveMsg_${currentWellId}_${currentValveId}" style="color:#eaff57; margin-top:12px; font-size:1em; display:none;">Saved to server</div>
  </form>
  <div id="warningHistoryPanel_${currentWellId}_${currentValveId}" style="display:none; margin-top: 18px;"></div>`;
  
  panel.innerHTML = formHtml;

  Array.from(panel.querySelectorAll('.accordion-toggle')).forEach(btn => {
    btn.onclick = function () {
      const currentAccordionPanel = this.nextElementSibling;
      if (!currentAccordionPanel) return;
      const isReviewButton = this.dataset.index === "review";

      const isCurrentlyOpen = currentAccordionPanel.style.display === "block";
      panel.querySelectorAll('.accordion-panel').forEach(p => p.style.display = "none");
      currentAccordionPanel.style.display = isCurrentlyOpen ? "none" : "block";

      if (currentAccordionPanel.style.display === "block" && isReviewButton) {
        const formForReview = document.getElementById(`valveForm_${currentWellId}_${currentValveId}`);
        const reviewPanelDiv = document.getElementById(`reviewPanel_${currentWellId}_${currentValveId}`);
        if (formForReview && reviewPanelDiv) {
          showReviewPanelContent(reviewPanelDiv, formForReview, valveLimits, currentValveId);
        }
      }
    };
  });

  const currentForm = document.getElementById(`valveForm_${currentWellId}_${currentValveId}`);
  if (currentForm) {
    // Replace localStorage autosaving with API calls
    let autoSaveTimer;
    currentForm.addEventListener('input', async function () {
      const data = {};
      new FormData(currentForm).forEach((value, key) => data[key] = value);
      
      // Clear any existing timer
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      
      // Set a new timer
      autoSaveTimer = setTimeout(async () => {
        try {
          // Save form data to API
          const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/form_data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              well: currentWellId,
              valve: currentValveId,
              form_data: data,
              user: 'Rob-mcna',
              timestamp: '2025-07-14T08:13:39Z'
            })
          });
          
          if (response.ok) {
            const msg = document.getElementById(`autosaveMsg_${currentWellId}_${currentValveId}`);
            if (msg) {
              msg.style.display = 'block';
              setTimeout(() => { msg.style.display = 'none'; }, 800);
            }
          } else {
            console.error("Failed to save form data to API:", response.status);
          }
        } catch (error) {
          console.error("Error saving form data to API:", error);
        }
      }, 500);
    });

    currentForm.onsubmit = async function (e) {
      e.preventDefault();

      // Show SweetAlert confirmation dialog
      const userConfirmed = await Swal.fire({
        title: 'Confirm Submission',
        text: "Are you sure all the data entered is correct?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, submit',
        cancelButtonText: 'Cancel',
        reverseButtons: true
      });

      if (!userConfirmed.value) {
        showTemporaryMessage('Test submission cancelled by user.', 'info');
        return;
      }

      // Proceed with submission
      const localWarningHistoryPanel = document.getElementById(`warningHistoryPanel_${currentWellId}_${currentValveId}`);
      if (typeof clearWarningHistoryDisplay === "function") clearWarningHistoryDisplay(localWarningHistoryPanel);

      const submittedFormData = new FormData(currentForm);
      const apiPayload = {
        well: currentWellId,
        testValve: currentValveId,
        blockingValve: submittedFormData.get('downstreamBlockingValve'),
        initialPressure: Number(submittedFormData.get('initialPressure')) || 0,
        finalPressure: Number(submittedFormData.get('finalPressure')) || 0,
        initialTemperature: Number(submittedFormData.get('initialTemp')) || 0,
        finalTemperature: Number(submittedFormData.get('finalTemperature')) || 0,
        monitoringTime: valveLimits.monitoring_time,
        criticalRate: valveLimits.critical_rate,
        sithp: Number(submittedFormData.get('SITHP')) || 0,
        liquidYield: Number(submittedFormData.get('LiquidYield')) || 0,
        pressureUpstreamPFSV: Number(submittedFormData.get('PressureUpstreamPFSV')) || 0,
        gasSG: Number(submittedFormData.get('GasSG')) || 0.6,
        k: Number(submittedFormData.get('k')) || 1.3,
        TestedBy: 'Rob-mcna',
        timestamp: '2025-07-14T08:13:39Z'
      };

      const submitMsgEl = document.getElementById(`submitMsg_${currentWellId}_${currentValveId}`);
      if (submitMsgEl) {
        submitMsgEl.textContent = "Processing test...";
        submitMsgEl.style.display = 'inline';
      }

      try {
        // Submit test to API
        const response = await fetch('http://10.226.14.79:5000/api/integrity_test/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });
        
        const newTestResult = await response.json();
        console.log(`API Response for ${currentValveId} on well ${currentWellId}:`, newTestResult);

        if (!response.ok) {
          const errorMsg = `Server Error: ${newTestResult.error || response.statusText || 'Unknown API error'}`;
          if (typeof addMessageToWarningHistoryDisplay === "function") addMessageToWarningHistoryDisplay(localWarningHistoryPanel, errorMsg);
          if (submitMsgEl) submitMsgEl.textContent = errorMsg.length > 40 ? "Test Failed (see warnings)" : errorMsg;
        } else {
          // Update the actual leak rate field in the form
          const actualLeakRateField = currentForm.elements["actualInternalLeakRate"];
          if (actualLeakRateField && newTestResult.leak_rate_scfm !== undefined) {
            actualLeakRateField.value = Number(newTestResult.leak_rate_scfm).toFixed(3);
          }
          
          if (submitMsgEl) submitMsgEl.textContent = "Test results processed!";

          // Display warnings if any
          if (typeof addMessageToWarningHistoryDisplay === "function" && Array.isArray(newTestResult.failure_reasons)) {
            newTestResult.failure_reasons.forEach(reason => addMessageToWarningHistoryDisplay(localWarningHistoryPanel, reason));
          }

          // Update UI
          updateDashboardAfterTest(currentWellId);
        }
      } catch (error) {
        console.error(`Client-side error for ${currentValveId} on well ${currentWellId}:`, error);
        const clientErrorMsg = 'Client-side error: ' + error.message;
        if (typeof addMessageToWarningHistoryDisplay === "function") addMessageToWarningHistoryDisplay(localWarningHistoryPanel, clientErrorMsg);
        if (submitMsgEl) submitMsgEl.textContent = clientErrorMsg.length > 40 ? "Client Error (see warnings)" : clientErrorMsg;
      } finally {
        if (submitMsgEl) setTimeout(() => { if (submitMsgEl) submitMsgEl.style.display = 'none'; }, 3500);
        
        // After test submission, refresh data from API
        setTimeout(async () => {
          await refreshWellDataFromAPI(currentWellId);
          renderValveTestResultsPanel(currentWellId);
          renderWellSchematicAndPanel(currentWellId);
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
        else if (f.name === "valveType") v = valveType;
        else if (f.name === "monitoringTime") v = currentValveLimits.monitoring_time;
        else if (f.name === "maxInternalLeakRate") v = currentValveLimits.critical_rate;
        else v = (f.type === "radio")
          ? (formForReview.querySelector(`[name="${f.name}"]:checked`) || { value: "" }).value
          : (formForReview.elements[f.name]?.value || "");
        out += `<tr>
            <td style="color:#8ec4f7;padding-left:10px;width:40%;">${f.label}</td>
            <td style="color:#fff;width:60%;">${v || 'N/A'}</td></tr>`;
      });
    });
    out += "</table>";
    reviewPanelDiv.innerHTML = out;
  }

  // Warning history display functions with no localStorage dependency
  let localWarningHistoryStore = [];
  
  function renderWarningHistoryDisplay(historyPanelDiv) {
    if (!historyPanelDiv) return;
    if (localWarningHistoryStore.length === 0) {
      historyPanelDiv.style.display = 'none'; 
      historyPanelDiv.innerHTML = ''; 
      return;
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
    if (toggleBtn) {
      toggleBtn.onclick = function () {
        historyPanelDiv.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
        renderWarningHistoryDisplay(historyPanelDiv);
      };
    }
  }
  
  function addMessageToWarningHistoryDisplay(historyPanelDiv, msg) {
    localWarningHistoryStore.push(msg);
    renderWarningHistoryDisplay(historyPanelDiv);
    
    // Also send warning to API for persistence
    fetch('http://10.226.14.79:5000/api/integrity_test/warnings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        well: currentWellId,
        valve: currentValveId,
        warning: msg,
        timestamp: '2025-07-14T08:13:39Z',
        user: 'Rob-mcna'
      })
    }).catch(error => console.error("Failed to save warning to API:", error));
  }
  
  function clearWarningHistoryDisplay(historyPanelDiv) {
    localWarningHistoryStore = [];
    renderWarningHistoryDisplay(historyPanelDiv);
  }
  
  clearWarningHistoryDisplay(document.getElementById(`warningHistoryPanel_${currentWellId}_${currentValveId}`));
}

// Function to show SweetAlert temporary messages
function showTemporaryMessage(message, type) {
  Swal.fire({
    title: message,
    icon: type,
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    toastClass: 'temporary-message'
  });
}

// Style for temporary messages
const style = document.createElement('style');
style.innerHTML = `
  .temporary-message {
    background-color: #333;
    color: #fff;
    border-radius: 5px;
    padding: 10px;
    font-size: 1em;
  }
`;
document.head.appendChild(style);

// Function to refresh well data from API
async function refreshWellDataFromAPI(wellId = null) {
  try {
    showTemporaryMessage('Refreshing data from server...', 'info');
    
    const response = await fetch('http://10.226.14.79:5000/api/wells/');
    if (!response.ok) {
      console.error("Failed to refresh wells data:", response.status);
      showTemporaryMessage('Failed to refresh data from server', 'error');
      return false;
    }
    
    const wellsData = await response.json();
    window.wells = wellsData;
    
    if (wellId) {
      // If we're refreshing a specific well, also get its test results
      const testResultsResponse = await fetch(`http://10.226.14.79:5000/api/integrity_test/results?well=${wellId}`);
      if (testResultsResponse.ok) {
        const testResults = await testResultsResponse.json();
        
        // Update the specific well's test results in memory
        const well = window.wells.find(w => w.id === wellId);
        if (well) {
          well.valveTestResults = testResults;
        }
      }
    }
    
    showTemporaryMessage('Data refreshed from server', 'success');
    return true;
  } catch (error) {
    console.error("Error refreshing data:", error);
    showTemporaryMessage('Network error while refreshing data', 'error');
    return false;
  }
}

// Function to render wells section
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
  
  // Instead of using localStorage for last selected well, fetch from user preferences API
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
    const createChrismassTreeBtn = document.getElementById('createChristmassTreeBtn');
    const registerValveBtn = document.getElementById('registerValveBtn');
    const registerRuleModalBtn = document.getElementById('registerRuleModalBtn');
    
    if (createWellBtn) createWellBtn.onclick = showCreateWellModal;
    if (createChrismassTreeBtn) createChrismassTreeBtn.onclick = showCreateChristmasTreeModal;
    if (registerValveBtn) registerValveBtn.onclick = showCreateValveModal;
    if (registerRuleModalBtn) registerRuleModalBtn.onclick = showCreateBlockingValveRuleModal;
  }

  const dropdown = document.getElementById('wellDropdown');
  if (!dropdown) return;

  // Dropdown change handler: save selection to API and update UI
  dropdown.onchange = async function() {
    const selectedWellId = this.value;
    if (selectedWellId) {
      try {
        // Save user preference to API
        await fetch('http://10.226.14.79:5000/api/user/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: 'Rob-mcna',
            preference_key: 'lastSelectedWellId',
            preference_value: selectedWellId,
            timestamp: '2025-07-14T08:13:39Z'
          })
        });
      } catch (error) {
        console.error("Failed to save user preference:", error);
      }
      
      // Update UI
      renderWellSchematicAndPanel(selectedWellId);
      const wellDetailsContainer = document.getElementById('wellDetailsContainer');
      if (wellDetailsContainer) wellDetailsContainer.innerHTML = '';
      renderWellDetailsButton(selectedWellId);
      renderValveTestResultsPanel(selectedWellId);
    }
  };

  // Get last selected well from API
  getUserLastSelectedWell().then(lastSelectedWellId => {
    if (lastSelectedWellId && (window.wells || []).find(w => w.id === lastSelectedWellId)) {
      dropdown.value = lastSelectedWellId;
      dropdown.onchange();
    } else {
      // Fallback: get most recent tested well from API
      getMostRecentTestedWellId().then(mostRecentWellId => {
        if (mostRecentWellId && (window.wells || []).find(w => w.id === mostRecentWellId)) {
          dropdown.value = mostRecentWellId;
          dropdown.onchange();
        }
      });
    }
  });
}

// Function to get user's last selected well from API
async function getUserLastSelectedWell() {
  try {
    const response = await fetch('http://10.226.14.79:5000/api/user/preferences?user=Rob-mcna&key=lastSelectedWellId');
    if (response.ok) {
      const data = await response.json();
      return data.preference_value;
    }
  } catch (error) {
    console.error("Failed to get user's last selected well:", error);
  }
  return null;
}

// Function to get most recently tested well from API
async function getMostRecentTestedWellId() {
  try {
    const response = await fetch('http://10.226.14.79:5000/api/integrity_test/most_recent_well');
    if (response.ok) {
      const data = await response.json();
      return data.well_id;
    }
  } catch (error) {
    console.error("Failed to get most recently tested well:", error);
  }
  return null;
}

// CORRECTED VERSION FOR WELL SCHEMATIC RENDERING
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

  // Schematic Loading Logic
  const schematicPath = wellConfig.christmasTree && wellConfig.christmasTree.schematic;

  if (schematicPath) {
    const fullSchematicURL = `http://10.226.14.79:5000${schematicPath}`;
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

  // Fetch all valve names from the API
  let valveLabels = [];
  try {
    const valvesResponse = await fetch("http://10.226.14.79:5000/api/valves/");
    if (valvesResponse.ok) {
      const allValves = await valvesResponse.json();
      // Create an array of just the valve names
      valveLabels = allValves.map(valve => valve.name);
    } else {
      console.error("Failed to fetch valve list from API.");
    }
  } catch (error) {
    console.error("Error fetching valve list:", error);
  }

  // Fetch test results for this well to determine valve colors
  let wellTestResults = {};
  try {
    const testResultsResponse = await fetch(`http://10.226.14.79:5000/api/integrity_test/results?well=${wellId}`);
    if (testResultsResponse.ok) {
      wellTestResults = await testResultsResponse.json();
    }
  } catch (error) {
    console.error("Error fetching test results for well:", error);
  }

  const svg = wellSchematicArea.querySelector('svg');
  if (svg) {
    // A short delay to ensure the SVG has rendered before we manipulate it.
    setTimeout(() => {
      if (valveLabels.length === 0) {
        console.warn("No valve labels were loaded; cannot make schematic interactive.");
        return;
      }
      
      Array.from(svg.querySelectorAll('g')).forEach(g => {
        const texts = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
        // Use the dynamically fetched list to find matching valves in the SVG
        const foundLabel = valveLabels.find(v => texts.includes(v));
        
        if (foundLabel) {
          g.style.cursor = 'pointer';
          
          // Valve Coloring Logic - use API data instead of localStorage
          let color = '#e6c23a'; // Default: Untested (yellow)
          
          const valveTests = wellTestResults[foundLabel];
          if (valveTests && Array.isArray(valveTests) && valveTests.length > 0) {
            const latestTest = valveTests[valveTests.length - 1]; 
            if (latestTest && typeof latestTest === 'object') {
              if (latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass) {
                color = '#19d219'; // Pass (green)
              } else {
                color = '#e64a3a'; // Fail (red)
              }
            }
          }
          
          g.querySelectorAll('rect').forEach(rect => rect.setAttribute('fill', color));
          
          // Click Handler Logic
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
  
  // Hide panel if no valve is selected
  if (window.currentValvePanel === null || !valveInputPanel.classList.contains('active')) {
     valveInputPanel.style.display = 'none';
  }
}

// Toggle valve test details
function toggleValveTestDetails(wellId, valveId) {
  const detailsRow = document.getElementById(`details-${wellId}-${valveId}`);
  const iconElement = document.getElementById(`icon-details-${wellId}-${valveId}`); 

  if (detailsRow && iconElement) {
    if (detailsRow.style.display === 'none' || detailsRow.style.display === '') {
      detailsRow.style.display = 'block'; 
      iconElement.style.transform = 'rotate(90deg)';
    } else {
      detailsRow.style.display = 'none';
      iconElement.style.transform = 'rotate(0deg)';
    }
  }
}

function validateTestOnFrontend(result, valveLimits) {
    // Debug the incoming data
    console.log("Validating test with data:", result);
    console.log("Using valve limits:", valveLimits);
    
    // Ensure we have all necessary data structures
    if (!result) {
        console.error("No result data to validate");
        return null;
    }
    
    // Make a copy to avoid modifying the original
    const validatedResult = { ...result };
    
    // IMPORTANT: If the backend already provided a 'pass' value, preserve it
    const backendPassValue = validatedResult.pass;
    
    // Initialize validation fields if they don't exist
    if (typeof validatedResult.pass !== 'boolean') {
        validatedResult.pass = false;
    }
    validatedResult.test_valid = validatedResult.test_valid !== false; // Default to true
    validatedResult.leak_rate_pass = validatedResult.leak_rate_pass || false;
    validatedResult.failure_reasons = validatedResult.failure_reasons || [];
    
    // Only perform validation if required
    if (typeof backendPassValue !== 'boolean') {
        // 1. Validate leak rate with better error handling
        const leakRate = parseFloat(validatedResult.leak_rate_scfm);
        const criticalRate = parseFloat(valveLimits.critical_rate);
        
        console.log(`Checking leak rate: ${leakRate} <= ${criticalRate}`);
        
        if (isNaN(leakRate) || isNaN(criticalRate)) {
            console.warn("Invalid leak rate or critical rate values:", { leakRate, criticalRate });
            validatedResult.leak_rate_pass = false;
        } else {
            validatedResult.leak_rate_pass = leakRate <= criticalRate;
            console.log(`Leak rate check result: ${validatedResult.leak_rate_pass}`);
        }
        
        // 2. Validate pressure conditions with better error handling
        let pressureValid = true;
        if (!validatedResult.thresholds) {
            console.warn("Missing thresholds object in test result");
            pressureValid = false;
        } else {
            const { Pa, Pc } = validatedResult.thresholds;
            console.log(`Checking Pa <= Pc: ${Pa} <= ${Pc}`);
            
            if (Pa !== undefined && Pc !== undefined && Pa > Pc) {
                validatedResult.test_valid = false;
                pressureValid = false;
                console.log("Invalid test configuration: Pa > Pc");
            }
        }
        
        // 3. Set pass/fail flag with better error handling
        let pass_fail = true;
        if (!validatedResult.thresholds) {
            pass_fail = false;
        } else {
            const { P2, Pf } = validatedResult.thresholds;
            console.log(`Checking P2 <= Pf: ${P2} <= ${Pf}`);
            
            if (P2 !== undefined && Pf !== undefined && P2 > Pf) {
                pass_fail = false;
                console.log("Internal leak failure: P2 > Pf");
            }
        }
        
        // Final pass calculation
        validatedResult.pass = validatedResult.test_valid && pass_fail && validatedResult.leak_rate_pass;
        console.log(`Calculated test result - pass: ${validatedResult.pass}, components: valid=${validatedResult.test_valid}, pass_fail=${pass_fail}, leak_rate_pass=${validatedResult.leak_rate_pass}`);
    } else {
        console.log(`Using backend pass value: ${backendPassValue}`);
    }
    
    // If failure reasons array is empty, populate it
    if (validatedResult.failure_reasons.length === 0 && !validatedResult.pass) {
        if (!validatedResult.test_valid) {
            validatedResult.failure_reasons.push("Configuración de prueba inválida (Pa > Pc)");
        }
        if (validatedResult.thresholds && validatedResult.thresholds.P2 > validatedResult.thresholds.Pf) {
            validatedResult.failure_reasons.push("Falla de fuga interna (P2 > Pf)");
        }
        if (!validatedResult.leak_rate_pass) {
            validatedResult.failure_reasons.push("Tasa de fuga excede el máximo permitido (Q_act > critical_rate)");
        }
    }
    
    console.log("Final validated result:", validatedResult);
    return validatedResult;
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

// Function to handle selection of past test
async function handlePastTestSelect(wellId, valveId, selectedTestIndex) {
  try {
    // Save the selected test index to API
    await fetch('http://10.226.14.79:5000/api/user/test_selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: 'Rob-mcna',
        well: wellId,
        valve: valveId,
        test_index: parseInt(selectedTestIndex, 10),
        timestamp: '2025-07-14T08:13:39Z'
      })
    });
    
    // Re-render the test results panel
    renderValveTestResultsPanel(wellId);
  } catch (error) {
    console.error("Failed to save test selection:", error);
  }
}

// Render valve test results panel
async function renderValveTestResultsPanel(currentWellId) {
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

  // Fetch test results and user selections from API
  let resultsForWell = {};
  let warningsForWell = {};
  let selectedValveTestIndices = {};

  try {
    // Get test results
    const resultsResponse = await fetch(`http://10.226.14.79:5000/api/integrity_test/results?well=${currentWellId}`);
    if (resultsResponse.ok) {
      resultsForWell = await resultsResponse.json();
    }
    
    // Get warnings
    const warningsResponse = await fetch(`http://10.226.14.79:5000/api/integrity_test/warnings?well=${currentWellId}`);
    if (warningsResponse.ok) {
      warningsForWell = await warningsResponse.json();
    }
    
    // Get user's selected test indices
    const selectionsResponse = await fetch(`http://10.226.14.79:5000/api/user/test_selections?user=Rob-mcna&well=${currentWellId}`);
    if (selectionsResponse.ok) {
      const selections = await selectionsResponse.json();
      selections.forEach(selection => {
        if (!selectedValveTestIndices[selection.valve]) {
          selectedValveTestIndices[selection.valve] = selection.test_index;
        }
      });
    }
  } catch (error) {
    console.error("Failed to fetch test data from API:", error);
  }
  
  // Fetch valve limits from API
  let valveLimits = {};
  try {
    const limitsResponse = await fetch('http://10.226.14.79:5000/api/valves/limits');
    if (limitsResponse.ok) {
      valveLimits = await limitsResponse.json();
    }
  } catch (error) {
    console.error("Failed to fetch valve limits:", error);
  }
  
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
    html += `<div class="no-results-message" style="color: #86d2f0; opacity: 0.8; padding: 20px; text-align:center;">No tests run yet for well ${currentWellId}.</div>`;
  } else {
    for (const valveId of valveIdsWithActualTests) {
      const testsHistoryForValve = resultsForWell[valveId];
      let currentTestToShow = null;
      let selectedIdx = selectedValveTestIndices[valveId];

      if (Array.isArray(testsHistoryForValve) && testsHistoryForValve.length > 0) {
        if (typeof selectedIdx !== 'number' || selectedIdx < 0 || selectedIdx >= testsHistoryForValve.length) {
            selectedIdx = testsHistoryForValve.length - 1;
            selectedValveTestIndices[valveId] = selectedIdx;
        }
        currentTestToShow = testsHistoryForValve[selectedIdx];
      } else if (typeof testsHistoryForValve === 'object' && testsHistoryForValve !== null && !Array.isArray(testsHistoryForValve)) {
        currentTestToShow = testsHistoryForValve;
        selectedIdx = 0;
      }

      const valveLimit = valveLimits[valveId] || { critical_rate: 'N/A' };
      const allowableRate = valveLimit.critical_rate !== undefined ? Number(valveLimit.critical_rate).toFixed(3) : 'N/A';
      
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
        // Store deviation context in memory (not localStorage)
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

  if (window.currentUser && window.currentUser.role === 'admin') {
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

// Function to render well details button
async function renderWellDetailsButton(wellId) {
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
        <h3 style="margin-bottom:8px; color:#18191b;">${well.name || ""}</h3>
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

// Function to get default form sections when API fails
function getDefaultFormSections() {
  return [
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
        { name: "pressureUpstreamPFSV", label: "Pressure Upstream PFSV (psig)", type: "number" },
        { name: "sithp", label: "SITHP (psig)", type: "number" },
        { name: "liquidYield", label: "Liquid Yield (bpmmscf)", type: "number" },
        { name: "initialPressure", label: "Initial Pressure (psig)", type: "number" },
        { name: "initialTemp", label: "Initial Temperature (°F)", type: "number" }
      ]
    },
    {
      title: "Final Testing Conditions",
      fields: [
        { name: "finalPressure", label: "Final Pressure (psig)", type: "number" },
        { name: "finalTemperature", label: "Final Temperature (°F)", type: "number" },
        { name: "downstreamBlockingValve", label: "Downstream Blocking Valve", type: "select", options: [] },
        { name: "valveInternalLeak", label: "Valve Internal Leak Status", type: "select", options: ["Tight", "Leaking", "N/A"] },
        { name: "functionTestingResults", label: "Function Testing Results", type: "select", options: ["Easy", "Tight", "Frozen"] },
        { name: "stemBearingsGreased", label: "Stem Bearings Greased", type: "radio", options: ["Yes", "No"] }
      ]
    }
  ];
}

// Show delete test confirmation dialog
// Show delete test confirmation dialog
async function showDeleteTestConfirmation(wellId, valveId, testIndex) {
  let title, text;
  if (testIndex === null) {
    title = 'Delete All Tests';
    text = `Are you sure you want to delete ALL test results for valve ${valveId} on well ${wellId}? This action cannot be undone.`;
  } else {
    title = 'Delete Test Result';
    text = `Are you sure you want to delete this test result for valve ${valveId} on well ${wellId}? This action cannot be undone.`;
  }

  const confirmation = await Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel'
  });

  if (confirmation.value) {
    if (testIndex === null) {
      await deleteAllTestsForValve(wellId, valveId);
    } else {
      await deleteSpecificTest(wellId, valveId, testIndex);
    }
  }
}

// Delete specific test via API
async function deleteSpecificTest(wellId, valveId, testIndex) {
  try {
    showTemporaryMessage('Deleting test...', 'info');
    
    // Call API to delete the specific test
    const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        well: wellId,
        valve: valveId,
        test_index: testIndex,
        delete_reason: "User requested deletion",
        deleted_by: "Rob-mcna",
        timestamp: "2025-07-14T08:21:35Z"
      })
    });

    if (response.ok) {
      showTemporaryMessage('Test deleted successfully', 'success');
      // Refresh the data and UI
      await refreshWellDataFromAPI(wellId);
      renderValveTestResultsPanel(wellId);
      renderWellSchematicAndPanel(wellId);
      updateDashboardAfterTest(wellId);
    } else {
      const errorData = await response.json();
      showTemporaryMessage(`Failed to delete: ${errorData.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error("Error deleting test:", error);
    showTemporaryMessage('Failed to delete test: Network error', 'error');
  }
}

// Delete all tests for a valve via API
async function deleteAllTestsForValve(wellId, valveId) {
  try {
    showTemporaryMessage('Deleting all tests...', 'info');
    
    // Call API to delete all tests for this valve
    const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/delete_all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        well: wellId,
        valve: valveId,
        delete_reason: "User requested bulk deletion",
        deleted_by: "Rob-mcna",
        timestamp: "2025-07-14T08:21:35Z"
      })
    });

    if (response.ok) {
      showTemporaryMessage('All tests deleted successfully', 'success');
      // Refresh the data and UI
      await refreshWellDataFromAPI(wellId);
      renderValveTestResultsPanel(wellId);
      renderWellSchematicAndPanel(wellId);
      updateDashboardAfterTest(wellId);
    } else {
      const errorData = await response.json();
      showTemporaryMessage(`Failed to delete tests: ${errorData.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error("Error deleting tests:", error);
    showTemporaryMessage('Failed to delete tests: Network error', 'error');
  }
}

// View deleted tests via API
async function viewDeletedTests(wellId) {
  try {
    showTemporaryMessage('Retrieving deleted test history...', 'info');
    
    // Fetch deleted tests from API
    const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/deleted?well=${wellId}`);
    
    if (!response.ok) {
      showTemporaryMessage('Failed to retrieve deleted tests', 'error');
      return;
    }
    
    const deletedTests = await response.json();
    
    if (!deletedTests || deletedTests.length === 0) {
      showTemporaryMessage('No deleted tests found for this well', 'info');
      return;
    }
    
    // Format deleted tests for display
    let tableContent = `
      <table style="width:100%; border-collapse:collapse; color:#333; background:#f9f9f9;">
        <thead style="background:#555; color:white;">
          <tr>
            <th style="padding:8px; text-align:left">Valve</th>
            <th style="padding:8px; text-align:left">Deleted At</th>
            <th style="padding:8px; text-align:left">Deleted By</th>
            <th style="padding:8px; text-align:left">Reason</th>
          </tr>
        </thead>
        <tbody>
          ${deletedTests.map(test => `
            <tr style="border-bottom:1px solid #ddd">
              <td style="padding:8px">${test.valve}</td>
              <td style="padding:8px">${new Date(test.deleted_at).toLocaleString()}</td>
              <td style="padding:8px">${test.deleted_by}</td>
              <td style="padding:8px">${test.reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Show in modal
    Swal.fire({
      title: 'Deleted Test History',
      html: tableContent,
      width: '800px',
      confirmButtonText: 'Close'
    });
    
  } catch (error) {
    console.error("Error viewing deleted tests:", error);
    showTemporaryMessage('Failed to retrieve deleted tests: Network error', 'error');
  }
}

// Export test data via API
async function exportTestData(wellId) {
  try {
    showTemporaryMessage('Preparing export...', 'info');
    
    // Request the export from API
    const response = await fetch(`http://10.226.14.79:5000/api/integrity_test/export?well=${wellId}&format=json&user=Rob-mcna&timestamp=2025-07-14T08:21:35Z`);
    
    if (!response.ok) {
      showTemporaryMessage('Failed to generate export', 'error');
      return;
    }
    
    // Get the export data
    const exportData = await response.blob();
    
    // Create a download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(exportData);
    link.download = `well_${wellId}_test_data_2025-07-14.json`;
    
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

// Deviation handling
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
        
        // Also send this deviation context to the API for tracking
        fetch('http://10.226.14.79:5000/api/deviations/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            well: wellId,
            valve: valveId,
            title: context.title,
            description: context.description,
            created_by: 'Rob-mcna',
            timestamp: '2025-07-14T08:21:35Z'
          })
        }).catch(error => console.error("Failed to save deviation context:", error));
      } else {
        showTemporaryMessage(`Switched to deviations section for well ${wellId}`, 'info');
      }
    }, 300);
  }, 200);
}

// Dashboard integration function
async function updateDashboardAfterTest(wellId) {
  // Update dashboard with API data instead of local data
  try {
    // Fetch latest well status for dashboard
    const response = await fetch(`http://10.226.14.79:5000/api/wells/status?well=${wellId}`);
    if (!response.ok) {
      console.error("Failed to fetch well status for dashboard:", response.status);
      return;
    }
    
    const wellStatus = await response.json();
    
    // Update the dashboard rings if the function exists
    if (typeof renderMultiRingDashboard === 'function') {
      renderMultiRingDashboard(wellStatus);
    }
    
    // Also update the schematic colors
    renderWellSchematicAndPanel(wellId);
    
  } catch (error) {
    console.error("Error updating dashboard:", error);
  }
}

// Initialization function
async function fetchWellsAndInitialize() {
  try {
    showTemporaryMessage('Loading wells data...', 'info');
    
    const response = await fetch('http://10.226.14.79:5000/api/wells/');
    
    if (!response.ok) {
      console.error("Failed to fetch wells data:", response.status);
      showTemporaryMessage('Failed to load wells data from server', 'error');
      return false;
    }
    
    const wellsDataFromServer = await response.json();
    window.wells = wellsDataFromServer;
    
    // Clear any old references to localStorage
    window.currentValvePanel = null;
    window._richDeviationContext = {};
    
    // Render wells section after data is loaded
    if (document.getElementById('wellList')) {
      renderWellsSection();
    }
    
    showTemporaryMessage('Wells data loaded successfully', 'success');
    console.log(`Data loading completed for ${window.currentUser.login} at 2025-07-14T08:21:35Z.`);
    
    return true;
  } catch (error) {
    console.error("Error during fetchWellsAndInitialize:", error);
    showTemporaryMessage('Network error while loading data', 'error');
    return false;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.currentUser = { login: 'Rob-mcna', role: 'admin' };
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
window.handlePastTestSelect = handlePastTestSelect;
window.toggleValveTestDetails = toggleValveTestDetails;
window.refreshWellDataFromAPI = refreshWellDataFromAPI;