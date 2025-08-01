// --- Keep your existing VALVE_LIMITS and valveFormSections ---
const VALVE_LIMITS = {
  SCSSV: { monitoring_time: 30, critical_rate: 15 },
  MMV:   { monitoring_time: 10, critical_rate: 15 },
  HMV:   { monitoring_time: 10, critical_rate: 15 },
  MWV:   { monitoring_time: 10, critical_rate: 15 },
  HWV:   { monitoring_time: 10, critical_rate: 15 },
  SV:    { monitoring_time: 5,  critical_rate: 3  },
  PFSV:   { monitoring_time: 10, critical_rate: 15 }
};

const valveFormSections = [
 
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
      { name: "downstreamBlockingValve", label: "Downstream Blocking Valve", type: "select", options: [] }, // populated dynamically
      { name: "valveInternalLeak", label: "Valve Internal Leak Status", type: "select", options: ["Tight", "Leaking", "N/A"] },
      { name: "functionTestingResults", label: "Function Testing Results", type: "select", options: ["Easy", "Tight", "Frozen"] },
      { name: "stemBearingsGreased", label: "Stem Bearings Greased", type: "radio", options: ["Yes", "No"] }
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
 
];

// Global store for valve test results (fetched or loaded from localStorage)
window.valveTestResults = {}; 
window.selectedValveTestIndex = {};




// Ensure SweetAlert is included in your project by adding the following script tag in your HTML:
// <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
// Ensure SweetAlert is included in your project by adding the following script tag in your HTML:
// <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

/**
 * Displays a blank valve input panel for a given well and valve.
 * This function no longer fetches or uses previously saved form data.
 * @param {string} currentWellId - The ID of the well.
 * @param {string} currentValveId - The ID of the valve being tested.
 */
/**
 * Displays the valve input panel, pre-filling it with previously saved data.
 * @param {string} currentWellId - The ID of the well.
 * @param {string} currentValveId - The unique ID (UUID) of the valve.
 * @param {string} valveName - The short name of the valve (e.g., "SCSSV").
 */
async function showValveInputPanel(currentWellId, currentValveId, valveName) {
  const panel = document.getElementById('valveInputPanel');
  if (!panel) {
    console.error("valveInputPanel element not found");
    return;
  }
  panel.innerHTML = `<div style="color:#ccc; padding:20px;">Loading valve ${valveName} data...</div>`;
  panel.style.display = 'block';
  panel.classList.add('active');
  window.currentValvePanel = currentValveId; // Store the unique ID

 

  let validBlockingValves = [];
  try {
    // NOTE: This API endpoint also uses the valve NAME.
    const response = await fetch(`http://10.226.112.40:5000/api/integrity_test/blocking_valve?well=${currentWellId}&valve=${currentValveId}`);
    if (response.ok) {
      const data = await response.json();
      
      validBlockingValves = data ;
      console.log(data)
      
    } else {
      console.error(`Failed to fetch valid blocking valves for ${valveName}:`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`Error fetching valid blocking valves for ${valveName}:`, error);
  }
  
  const wellNameStr = (window.wells.find(w => w.id === currentWellId))?.name || currentWellId;
  let formHtml = `<h3>Valve ${valveName} Data (Well: ${wellNameStr})</h3><form id="valveForm_${currentWellId}_${currentValveId}">`;
  
  valveFormSections.forEach((section, i) => {
    formHtml += ` <div class="valve-form-accordion">
        <button type="button" class="accordion-toggle" data-index="${i}">${section.title}</button>
        <div class="accordion-panel" style="display:${i === 0 ? "block" : "none"};">`;
    section.fields.forEach(field => {
      let val = "";
      
      // ==================================================================
      // CORRECTED LOGIC: Use the ID for 'valveId' field
      // ==================================================================
      if (field.name === "valveId") {
          val = currentValveId; // FIX: Use the actual UUID for the valveId field.
      }
      // The full name of the valve type should come from the global list
      else if (field.name === "valveType") {
          const valveDef = (window.allValves || []).find(v => v.id === currentValveId);
          val = valveDef ? valveDef.fullName || valveDef.name : valveName; 
      }
      else if (field.name === "monitoringTime") {
          val = valveLimits.monitoring_time;
      }
      else if (field.name === "maxInternalLeakRate") {
          val = valveLimits.critical_rate;
      }

      if (field.name === "downstreamBlockingValve") {
         formHtml += `<label>${field.label} <select name="${field.name}" ${field.readonly ? "disabled" : ""}> <option value="">-- Select --</option> ${validBlockingValves.map(opt => `<option value="${opt.id}"${val === opt ? ' selected' : ''}>${opt.name}</option>`).join('')} </select></label>`;
      } else if (field.type === "select") {
        formHtml += `<label>${field.label} <select name="${field.name}" ${field.readonly ? "disabled" : ""}> <option value=""></option> ${(field.options || []).map(opt => `<option value="${opt}"${val === opt ? ' selected' : ''}>${opt}</option>`).join('')} </select></label>`;
      } else if (field.type === "radio") {
        formHtml += `<label>${field.label}<div class="radio-group">${(field.options || []).map(opt => `<label><input type="radio" name="${field.name}" value="${opt}"${val === opt ? ' checked' : ''}> ${opt}</label>`).join('')}</div></label>`;
      } else {
        formHtml += `<label>${field.label} <input type="${field.type || 'text'}" name="${field.name}" ${field.readonly ? "readonly" : ""} value="${val}"></label>`;
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
    <div id="autosaveMsg_${currentWellId}_${currentValveId}" style="color:#eaff57; margin-top:12px; font-size:1em; display:none;">Autosaved</div>
  </form>
  <div id="warningHistoryPanel_${currentWellId}_${currentValveId}" style="display:none; margin-top: 18px;"></div>`;
  panel.innerHTML = formHtml;

  // --- Attach event listeners (rest of the function is unchanged) ---
  
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
        if (formForReview && reviewPanelDiv && typeof showReviewPanelContent === "function") {
          showReviewPanelContent(reviewPanelDiv, formForReview, valveLimits, currentValveId);
        }
      }
    };
  });

  const currentForm = document.getElementById(`valveForm_${currentWellId}_${currentValveId}`);
  if (currentForm) {
    currentForm.addEventListener('input', function () {
      const data = {};
      new FormData(currentForm).forEach((value, key) => data[key] = value);
      const msg = document.getElementById(`autosaveMsg_${currentWellId}_${currentValveId}`);
      if (msg) {
        msg.style.display = 'block';
        if (panel._saveTimer) clearTimeout(panel._saveTimer);
        panel._saveTimer = setTimeout(() => { msg.style.display = 'none'; }, 800);
      }
    });

    currentForm.onsubmit = async function (e) {
      e.preventDefault();

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
        sithp: Number(submittedFormData.get('sithp')) || 0,
        liquidYield: Number(submittedFormData.get('liquidYield')) || 0,
        pressureUpstreamPFSV: Number(submittedFormData.get('pressureUpstreamPFSV')) || 0,
        gasSG: Number(submittedFormData.get('GasSG')) || 0.6,
        k: Number(submittedFormData.get('k')) || 1.3,
        TestedBy: 'Rob-mcna'
      };
   

      const submitMsgEl = document.getElementById(`submitMsg_${currentWellId}_${currentValveId}`);
      if (submitMsgEl) {
        submitMsgEl.textContent = "Processing test...";
        submitMsgEl.style.display = 'inline';
      }

           try {
        // STEP 1: Fetch raw calculated data from the backend
        const response = await fetch('http://10.226.112.40:5000/api/integrity_test/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload)
        });
        
        if (!response.ok) {
            throw new Error(`Server Error: ${response.statusText || 'Unknown API error'}`);
        }
        
        const apiResponse = await response.json();
        
        // ** FIX: The actual result is the FIRST element of the returned array **
        const calculatedResult = apiResponse[0]; 
        
        console.log("Raw backend result object:", calculatedResult);
        
        // STEP 2: Validate on the frontend using our function
        const finalValidatedResult = validateTestOnFrontend(calculatedResult, valveLimits);
        
        // STEP 3: Add metadata and store the validated result in memory
        if (!window.valveTestResults[currentWellId]) {
            window.valveTestResults[currentWellId] = {};
        }
        if (!Array.isArray(window.valveTestResults[currentWellId][currentValveId])) {
            window.valveTestResults[currentWellId][currentValveId] = [];
        }
        
        finalValidatedResult.utc_timestamp = new Date().toISOString();
        // The 'inputs' object is already on the result, so we just add to it
        finalValidatedResult.inputs.TestedBy = 'Rob-mcna';
        finalValidatedResult.inputs.timestamp = finalValidatedResult.utc_timestamp;
        
        window.valveTestResults[currentWellId][currentValveId].push(finalValidatedResult);
        
        // Update the selected index to show the latest test
        if (!window.selectedValveTestIndex[currentWellId]) {
            window.selectedValveTestIndex[currentWellId] = {};
        }
        window.selectedValveTestIndex[currentWellId][currentValveId] = 
            window.valveTestResults[currentWellId][currentValveId].length - 1;
        
        if (submitMsgEl) submitMsgEl.textContent = "Test results processed!";
        
        // Update warnings display using the new `failure_reasons` array
        if (!window.valveTestWarnings[currentWellId]) {
            window.valveTestWarnings[currentWellId] = {};
        }
        window.valveTestWarnings[currentWellId][currentValveId] = finalValidatedResult.failure_reasons.slice();
            
        if (typeof addMessageToWarningHistoryDisplay === "function") {
            finalValidatedResult.failure_reasons.forEach(reason => 
                addMessageToWarningHistoryDisplay(localWarningHistoryPanel, reason)
            );
        }
        
        // This will trigger the re-render of the results panel and schematic
        updateDashboardAfterTest(currentWellId);
          
      } catch (error) {
          console.error(`Client-side error for ${currentValveId} on well ${currentWellId}:`, error);
          const clientErrorMsg = 'Error: ' + error.message;
          if (typeof addMessageToWarningHistoryDisplay === "function") {
              addMessageToWarningHistoryDisplay(localWarningHistoryPanel, clientErrorMsg);
          }
          if (submitMsgEl) {
              submitMsgEl.textContent = clientErrorMsg.length > 40 ? "Test Failed" : clientErrorMsg;
          }
      
    } finally {
        if (submitMsgEl) setTimeout(() => { if (submitMsgEl) submitMsgEl.style.display = 'none'; }, 3500);
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
        // --- MODIFIED ---
        else if (f.name === "valveType") v = findValveNameById(currentValveIdForReview);
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
  }
  function clearWarningHistoryDisplay(historyPanelDiv) {
    localWarningHistoryStore = [];
    renderWarningHistoryDisplay(historyPanelDiv);
  }
  clearWarningHistoryDisplay(document.getElementById(`warningHistoryPanel_${currentWellId}_${currentValveId}`));
}

// Function to show SweetAlert temporary messages
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

// Example CSS for the temporary message (optional)
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


window.currentValvePanel = null; 
window._richDeviationContext = {}; 

// FIX #1: Dashboard integration function
function updateDashboardAfterTest(wellId) {
    // Update the dashboard rings
    if (typeof renderMultiRingDashboard === 'function') {
        renderMultiRingDashboard();
    }
    
    // Also update the schematic colors
    renderWellSchematicAndPanel(wellId);
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
        
        for (const valveId in wellData) {
            if (wellData.hasOwnProperty(valveId)) {
                const tests = wellData[valveId];
                exportData.valve_tests[valveId] = {
                    // --- MODIFIED ---
                    // Use the new lookup function here as well.
                    valve_type: findValveNameById(valveId),
                    test_count: Array.isArray(tests) ? tests.length : 1,
                    tests: Array.isArray(tests) ? tests : [tests]
                };
            }
        }
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `well_${wellId}_test_data_2025-06-17.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(link.href);
        
        showTemporaryMessage(`Successfully exported data for well ${wellId}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showTemporaryMessage(`Failed to export data: ${error.message}`, 'error');
    }
}



async function refreshWellDataFromAPI(wellId = null) {
  try {
    const response = await fetch('http://10.226.112.40:5000/api/wells/');
    if (!response.ok) {
      return false;
    }
    
    const wellsData = await response.json();
    window.wells = wellsData;
    
    if (wellId) {
      const testResultsResponse = await fetch(`http://10.226.112.40:5000/api/integrity_test/results?well=${wellId}`);
      if (testResultsResponse.ok) {
        // Data refreshed - no need to store in localStorage
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error refreshing data:", error);
    return false;
  }
}


/**
 * Validates a valve integrity test on the frontend using raw data from the backend.
 * 
 * @param {object} result - The raw calculated values from the backend API
 * @param {object} valveLimits - The valve limits from VALVE_LIMITS
 * @returns {object} The validated result with pass/fail flags
 */
function validateTestOnFrontend(result, valveLimits) {
    // Ensure we have all necessary data structures
    if (!result) return null;
    
    // Make a copy to avoid modifying the original
    const validatedResult = { ...result };
    
    // Initialize validation fields if they don't exist
    validatedResult.pass = false;
    validatedResult.test_valid = true;
    validatedResult.leak_rate_pass = false;
    validatedResult.failure_reasons = [];
    
    // 1. Validate leak rate
    const leakRate = validatedResult.leak_rate_scfm;
    const criticalRate = valveLimits.critical_rate;
    validatedResult.leak_rate_pass = leakRate <= criticalRate;
    
    // 2. Validate pressure conditions
    // Check if Pa > Pc (invalid test configuration)
    if (validatedResult.thresholds && 
        validatedResult.thresholds.Pa > validatedResult.thresholds.Pc) {
        validatedResult.test_valid = false;
    }
    
    // 3. Set pass/fail flag
    // Check if P2 > Pf (internal leak failure)
    const pass_fail = !(validatedResult.thresholds && 
                        validatedResult.thresholds.P2 > validatedResult.thresholds.Pf);
    validatedResult.pass = validatedResult.test_valid && pass_fail && validatedResult.leak_rate_pass;
    
    // 4. Populate failure reasons (matching backend logic from Image 2)
    if (!validatedResult.test_valid) {
        validatedResult.failure_reasons.push("Configuración de prueba inválida (Pa > Pc)");
    }
    if (!pass_fail) {
        validatedResult.failure_reasons.push("Falla de fuga interna (P2 > Pf)");
    }
    if (!validatedResult.leak_rate_pass) {
        validatedResult.failure_reasons.push("Tasa de fuga excede el máximo permitido (Q_act > critical_rate)");
    }
    
    return validatedResult;
}

/**
 * Finds the short name of a valve (e.g., "MMV") using its unique ID.
 * This is necessary to look up limits in the VALVE_LIMITS constant.
 * @param {string} valveId - The unique ID (UUID) of the valve.
 * @returns {string} The short name of the valve, or the ID itself if not found.
 */
function findValveNameById(valveId) {
  // window.allValves should be populated when the application starts
  if (!window.allValves || !Array.isArray(window.allValves)) {
    console.warn(`findValveNameById: window.allValves is not available. Cannot find name for ${valveId}.`);
    return valveId; // Fallback to the ID if the global list isn't ready
  }
  const valve = window.allValves.find(v => v.id === valveId);
  return valve ? valve.name : valveId; // Return the short name (e.g., "MMV") or the ID as a fallback
}


window.showValveInputPanel = showValveInputPanel;

window.exportTestData = exportTestData;
window.openDeviationFromWell = openDeviationFromWell;
window.updateDashboardAfterTest = updateDashboardAfterTest;