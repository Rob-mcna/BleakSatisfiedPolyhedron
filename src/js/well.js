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
 
  panel.classList.add('active');
  window.currentValvePanel = currentValveId; // Store the unique ID
  
    // ADD THIS LINE HERE - Show the valve failure details panel when a valve is selected
  showValveFailureDetailsPanel(currentWellId, currentValveId);
  

  // ADD THIS CODE: Get the valve limits based on the valve type
  const valveType = valveName.toUpperCase(); // Ensure uppercase for lookup
  const valveLimits = VALVE_LIMITS[valveType] || { monitoring_time: 10, critical_rate: 15 }; // Default values as fallback
  console.log(`Using limits for ${valveType}:`, valveLimits);

 

  let validBlockingValves = [];
  try {
    // NOTE: This API endpoint also uses the valve NAME.
    const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/blocking_valve?well=${currentWellId}&valve=${currentValveId}`);
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
        const response = await fetch('http://127.0.0.1:5000/api/integrity_test/', {
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
          // NEW: Set skip flag to prevent API overwrite during immediate post-submit render
          window.skipApiFetchForWell = currentWellId;
          
          renderValveTestResultsPanel(currentWellId);
          renderWellSchematicAndPanel(currentWellId);
          updateDashboardAfterTest(currentWellId);
          
          // NEW: Clear the skip flag after renders complete
          window.skipApiFetchForWell = null;
          
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
            <td style="color:#000;width:60%;">${v || 'N/A'}</td></tr>`;
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

function validateTestOnFrontend(result, valveLimits) {
  console.log("Validating test with data:", result);
  console.log("Using valve limits:", valveLimits);

  if (!result) {
    console.error("No result data to validate");
    return { pass: false, test_valid: false, leak_rate_pass: false, failure_reasons: ["No result data"] };
  }

  const validatedResult = { ...result };

  // Initialize default values
  validatedResult.pass = validatedResult.pass ?? false;
  validatedResult.test_valid = validatedResult.test_valid ?? true;
  validatedResult.leak_rate_pass = validatedResult.leak_rate_pass ?? false;
  validatedResult.failure_reasons = validatedResult.failure_reasons || [];
  validatedResult.inputs = validatedResult.inputs || {};
  validatedResult.thresholds = validatedResult.thresholds || {};

  // Map nested properties to top-level expected names
  validatedResult.leakRate = parseFloat(validatedResult.leak_rate_scfm ?? 0);
  validatedResult.criticalRate = parseFloat(validatedResult.limits?.critical_rate_scfm ?? valveLimits.critical_rate ?? 0);
  validatedResult.Pa = parseFloat(validatedResult.thresholds?.Pa ?? 0);
  validatedResult.Pc = parseFloat(validatedResult.thresholds?.Pc ?? 0);
  validatedResult.Pf = parseFloat(validatedResult.thresholds?.Pf ?? 0);
  validatedResult.P2 = parseFloat(validatedResult.thresholds?.P2 ?? 0);

  // Validate leak rate
  if (isNaN(validatedResult.leakRate) || isNaN(validatedResult.criticalRate)) {
    console.warn("Invalid leak rate or critical rate:", { leakRate: validatedResult.leakRate, criticalRate: validatedResult.criticalRate });
    validatedResult.leak_rate_pass = false;
    validatedResult.failure_reasons.push("Invalid leak rate or critical rate");
  } else {
    validatedResult.leak_rate_pass = validatedResult.leakRate <= validatedResult.criticalRate;
    if (!validatedResult.leak_rate_pass) {
      validatedResult.failure_reasons.push(`Leak rate (${validatedResult.leakRate} scfm) exceeds critical rate (${validatedResult.criticalRate} scfm)`);
    }
  }

  // Validate pressure conditions
  let pressureValid = true;
  if (isNaN(validatedResult.Pa) || isNaN(validatedResult.Pc)) {
    console.warn("Missing or invalid Pa or Pc values");
    pressureValid = false;
    validatedResult.test_valid = false;
    validatedResult.failure_reasons.push("Missing or invalid pressure values (Pa or Pc)");
  } else if (validatedResult.Pa > validatedResult.Pc) {
    pressureValid = false;
    validatedResult.test_valid = false;
    validatedResult.failure_reasons.push("Invalid test configuration: Pa > Pc");
  }

  // Validate internal leak
  let pass_fail = true;
  if (isNaN(validatedResult.P2) || isNaN(validatedResult.Pf)) {
    console.warn("Missing or invalid P2 or Pf values");
    pass_fail = false;
    validatedResult.failure_reasons.push("Missing or invalid pressure values (P2 or Pf)");
  } else if (validatedResult.P2 > validatedResult.Pf) {
    pass_fail = false;
    validatedResult.failure_reasons.push("Internal leak failure: P2 > Pf");
  }

  // Final pass calculation (only if backend didn't provide a pass value)
  if (typeof validatedResult.pass !== 'boolean') {
    validatedResult.pass = validatedResult.test_valid && pass_fail && validatedResult.leak_rate_pass;
  }

  // Preserve original nested structure and add mapped properties
  validatedResult.thresholds = result.thresholds || {};
  validatedResult.limits = result.limits || {};

  console.log("Final validated result:", validatedResult);
  return validatedResult;
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
    const response = await fetch('http://127.0.0.1:5000/api/wells/');
    if (!response.ok) {
      return false;
    }
    
    const wellsData = await response.json();
    window.wells = wellsData;
    
    if (wellId) {
      const testResultsResponse = await fetch(`http://127.0.0.1:5000/api/integrity_test/results?well=${wellId}`);
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
 * Shows a panel selection popup when a valve is clicked.
 * Ensures the popup is always visible without needing to scroll.
 */
function showValvePanelOptions(wellId, valveId, valveName, event) {
    event.stopPropagation();
    const existingPopup = document.getElementById('valvePanelOptionsPopup');
    if (existingPopup) {
        existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.id = 'valvePanelOptionsPopup';
    popup.className = 'valve-panel-popup';

    // Position popup in the center of the viewport for better visibility
    popup.style.position = 'fixed';
    popup.style.left = '50%';
    popup.style.top = '40%'; // Position slightly above center
    popup.style.transform = 'translate(-50%, -50%)';

    popup.innerHTML = `
        <div class="popup-header">
            <h4>${valveName || 'Valve'}</h4>
            <button class="popup-close" onclick="hideValvePanelOptions()">&times;</button>
        </div>
        <div class="popup-content">
            <p>Select an action for this valve:</p>
            <button class="panel-option input-option" onclick="forceShowPanel('input', '${wellId}', '${valveId}', '${valveName}')">
                <span class="option-icon">📝</span>
                <span class="option-text">Enter Test Data</span>
            </button>
            <button class="panel-option failure-option" onclick="forceShowPanel('failure', '${wellId}', '${valveId}', '${valveName}')">
                <span class="option-icon">🔍</span>
                <span class="option-text">View Failure Analysis</span>
            </button>
        </div>
    `;

    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('active'), 10);
    document.addEventListener('click', hideValvePanelOptions, { once: true });
}

/**
 * Hides the valve panel options popup.
 */
function hideValvePanelOptions(event) {
    const popup = document.getElementById('valvePanelOptionsPopup');
    if (popup) {
        if (event && popup.contains(event.target)) {
            // If the click is inside the popup, don't close it; re-add the listener.
            document.addEventListener('click', hideValvePanelOptions, { once: true });
            return;
        }
        popup.classList.remove('active');
        setTimeout(() => {
            if (popup.parentNode) popup.parentNode.removeChild(popup);
        }, 300);
    }
}
/**
 * This is the ONLY function that should be used to show a panel.
 * It forcefully hides the other panel and guarantees visibility for the chosen one.
 * It also solves the scrolling problem.
 *
 * @param {'input' | 'failure'} panelToShow - The panel you want to see.
 */
function forceShowPanel(panelToShow, wellId, valveId, valveName) {
    hideValvePanelOptions(); // Close the little popup first

    const inputPanel = document.getElementById('valveInputPanel');
    const failurePanel = document.getElementById('valveFailureDetailsPanel');

    // Define which is which
    const panelToDisplay = (panelToShow === 'input') ? inputPanel : failurePanel;
    const panelToHide = (panelToShow === 'input') ? failurePanel : inputPanel;

    // --- FORCE HIDE THE OTHER PANEL ---
    // We set its display to 'none' directly and with high priority.
    if (panelToHide) {
        panelToHide.style.setProperty('display', 'none', 'important');
    }

    // --- PREPARE AND SHOW THE CORRECT PANEL ---
    if (panelToDisplay) {
        // 1. Call your function to fill the panel with content.
        //    (This assumes you've removed display styles from them as per Step 2)
        if (panelToShow === 'input') {
            showValveInputPanel(wellId, valveId, valveName);
        } else {
            showValveFailureDetailsPanel(wellId, valveId, valveName);
        }

        // 2. Use requestAnimationFrame to ensure our style changes apply LAST.
        //    This defeats race conditions.
        requestAnimationFrame(() => {
            // 3. Forcefully set the display property.
            panelToDisplay.style.setProperty('display', 'block', 'important');

            // 4. Scroll it into view so you don't have to.
            panelToDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}
/**
 * DEFINITIVE FIX: Opens the valve input panel and guarantees the failure panel is hidden.
 */
/**
 * Opens the valve input panel by setting the correct class on the container.
 * This also solves the "scrolling down" issue.
 */

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