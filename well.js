// --- Valve form sections and fields ---
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

window.valveTestResults = window.valveTestResults || {}; // { [wellId]: { [valveId]: resultObj } }
window.valveTestWarnings = window.valveTestWarnings || {}; // { [wellId]: { [valveId]: [warnings] } }
window.currentValvePanel = null; // Track currently open valve panel
window._richDeviationContext = {}; // For passing full context to modal

// --- Enhancement: Show Most Recently Tested Well on Well Section Open ---

// Utility: Get the most recently tested well from localStorage (or from window.valveTestResults)
function getMostRecentTestedWellId() {
  // Prefer from localStorage
  let results = {};
  try {
    results = JSON.parse(localStorage.getItem('valve_test_results') || '{}');
  } catch {}
  if (!results || Object.keys(results).length === 0) {
    // fallback to window.valveTestResults if present
    results = window.valveTestResults || {};
  }
  // Find the most recently updated well by looking for the most recent test timestamp if available
  let mostRecentWellId = null;
  let mostRecentTime = 0;
  Object.keys(results).forEach(wellId => {
    const valves = results[wellId] || {};
    Object.values(valves).forEach(result => {
      // Prefer a timestamp field, otherwise fallback to object creation time
      let t = 0;
      if (result && result.inputs && result.inputs.timestamp) {
        t = new Date(result.inputs.timestamp).getTime();
      } else if (result && result.tested_at) {
        t = new Date(result.tested_at).getTime();
      } else if (result && result._ts) {
        t = result._ts;
      } else if (result && result.inputs && result.inputs.createdAt) {
        t = new Date(result.inputs.createdAt).getTime();
      } else if (result && result.inputs && result.inputs.created_at) {
        t = new Date(result.inputs.created_at).getTime();
      }
      // If none, use current time as fallback (last-used object)
      if (!t) t = Date.now();
      if (t > mostRecentTime) {
        mostRecentTime = t;
        mostRecentWellId = wellId;
      }
    });
  });
  return mostRecentWellId;
}

// --- Patch: renderWellsSection to auto-show most recent tested well ---
function renderWellsSection() {
  let wellListDiv = document.getElementById('wellList');
  let html = '';

  // 1. Admin Create Well Button
  if (currentUser && currentUser.role === 'admin') {
    html += `<button id="createWellBtn" class="primary-btn" style="margin-bottom: 18px;">Create Well</button>`;
  }

  // 2. Well Dropdown
  html += `<label for="wellDropdown" style="font-weight:bold;">Select Well:</label>
  <select id="wellDropdown" style="margin:0 12px 24px 8px;">
    <option value="" selected disabled>-- Select Well --</option>
    ${wells.map(w => `<option value="${w.id}">${w.id} - ${w.name || w.id}</option>`).join('')}
  </select>`;

  // 3. Inline layout for schematic and valve panel (populated by JS)
  html += `
  <div class="well-layout" id="wellInlineLayout" style="display:none;">
    <div id="wellSchematicArea"></div>
    <div class="valve-panels-container">
      <div id="valveInputPanel"></div>
      <div id="valveTestResultsPanel"></div>
    </div>
  </div>
`;

  html += `<div id="wellDetailsContainer" style="margin-top:18px;"></div>`;

  wellListDiv.innerHTML = html;

  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('createWellBtn').onclick = showCreateWellModal;
  }
  const dropdown = document.getElementById('wellDropdown');
  dropdown.onchange = function() {
    renderWellSchematicAndPanel(this.value);
    document.getElementById('wellDetailsContainer').innerHTML = '';
    renderWellDetailsButton(this.value);
    renderValveTestResultsPanel(this.value); // ensure results panel shows for selected well
  };
  if (document.getElementById('wellDetails')) {
    document.getElementById('wellDetails').innerHTML = '<span style="color:#888;">Select a well to view details.</span>';
  }
  document.getElementById('wellInlineLayout').style.display = 'none';

  // --- Enhancement: Show the most recently tested well when opening the section ---
  setTimeout(() => {
    const mostRecentWellId = getMostRecentTestedWellId();
    if (mostRecentWellId && wells.find(w => w.id === mostRecentWellId)) {
      dropdown.value = mostRecentWellId;
      // Call onchange to render the well
      dropdown.onchange();
    }
  }, 100);
}



function renderWellSchematicAndPanel(wellId) {
  const well = wells.find(w => w.id === wellId);
  if (!well) {
    document.getElementById('wellInlineLayout').style.display = 'none';
    return;
  }
  document.getElementById('wellInlineLayout').style.display = 'flex';

  let schematicHTML = schematicSVGs[well.treeType]
    ? `<span class="schematic-svg-preview" id="schematicSVGContainer">${schematicSVGs[well.treeType]}</span>`
    : "N/A";
  document.getElementById('wellSchematicArea').innerHTML = schematicHTML;

  const svg = document.querySelector('#wellSchematicArea svg');
  if (svg) {
    svg.querySelectorAll('g.valve').forEach(g => {
      g.style.cursor = 'pointer';
      const vId = g.getAttribute('data-valve');
      g.onclick = function(e) {
        e.stopPropagation();
        // Toggle valve input panel
        if (window.currentValvePanel === vId) {
          document.getElementById('valveInputPanel').style.display = 'none';
          document.getElementById('valveInputPanel').classList.remove('active');
          window.currentValvePanel = null;
        } else {
          showValveInputPanel(wellId, vId);
          window.currentValvePanel = vId;
        }
      };
      const testResult = window.valveTestResults[wellId] && window.valveTestResults[wellId][vId];
      let color = '#e6c23a';
      if (testResult) {
        if (testResult.pass && testResult.test_valid && testResult.leak_rate_pass) {
          color = '#19d219';
        } else {
          color = '#e64a3a';
        }
      }
      const rect = g.querySelector('rect');
      if (rect) rect.setAttribute('fill', color);
    });
  }

  document.getElementById('valveInputPanel').style.display = 'none';
  document.getElementById('valveInputPanel').classList.remove('active');
}

function renderValveTestResultsPanel(wellId) {
  const panel = document.getElementById('valveTestResultsPanel');
  if (!panel) return;
  const results = window.valveTestResults[wellId] || {};
  const warningsObj = window.valveTestWarnings[wellId] || {};

  let html = `<h3 style="color:#ffe257;">Valve Test Results</h3>`;
  if (Object.keys(results).length === 0) {
    html += `<div style="color:#ccc;">No tests run yet.</div>`;
  } else {
    html += `<table style="width:100%;color:#fff;font-size:1em;"><tr>
      <th style="text-align:left;">Valve</th>
      <th style="text-align:left;">Leak Rate (scf/min)</th>
      <th style="text-align:left;">Allowable Rate (scf/min)</th>
    </tr>`;
    for (const [valveId, result] of Object.entries(results)) {
      const allowableRate = (VALVE_LIMITS[valveId] && VALVE_LIMITS[valveId].critical_rate) || 'N/A';
      html += `<tr>
        <td style="color:#ffe257;">${valveId}</td>
        <td>${result.leak_rate_scfm !== undefined ? Number(result.leak_rate_scfm).toFixed(3) : 'N/A'}</td>
        <td>${allowableRate}</td>
      </tr>`;

      // Warnings
      const warnings = warningsObj[valveId] || [];
      if (warnings.length > 0) {
        html += `<tr><td colspan="3" style="color:#ff6f61; font-size:0.95em;">
          <b>Warnings:</b> ${warnings.join('; ')}
        </td></tr>`;
      }
      // Highlight failed tests and offer "Raise Deviation" (Option 4, Rich context)
      const isFail = !result.pass || !result.test_valid || !result.leak_rate_pass;
      if (isFail) {
        // Store context globally for safe passing
        if (!window._richDeviationContext) window._richDeviationContext = {};
        window._richDeviationContext[`${wellId}::${valveId}`] = {
          wellId, valveId, result,
          allowableRate,
          wellName: (wells.find(w => w.id === wellId) || {}).name || wellId,
          warnings
        };
        html += `
        <tr>
          <td colspan="3" class="deviation-row">
            <button class="raise-deviation-btn"
              onclick="openDeviationFromWell('${wellId}','${valveId}')"
              title="Raise Deviation for ${valveId}">
              <span class="icon-warning"></span> Raise Deviation
            </button>
          </td>
        </tr>`;
      }
    }
    // Well-level deviation button (pass context for summary)
    window._richDeviationContext[`${wellId}::wellOnly`] = {
      wellId,
      wellName: (wells.find(w => w.id === wellId) || {}).name || wellId,
      contextType: "wellOnly"
    };
    html += `
      <tr><td colspan="3" style="text-align:center;">
        <button class="primary-btn" style="margin-top:14px;"
          onclick="openDeviationFromWell('${wellId}')">
          + Create Deviation for this Well
        </button>
      </td></tr>
    `;
    html += `</table>`;
  }
  panel.innerHTML = html;
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
            ${christmasTreeSchematics.map(t =>
              `<option value="${t.type}">${t.label}</option>`
            ).join('')}
          </select>
        </label><br><br>
        <label>Schematic Diagram:<br>
          <div style="display:flex;align-items:center;gap:10px;">
            <select name="schematic" id="schematicSel" style="width:60%;">
              ${christmasTreeSchematics.map(t =>
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
    document.getElementById('schematicPreview').innerHTML = type && schematicSVGs[type]
      ? `<span class="schematic-svg-preview">${schematicSVGs[type]}</span>` : '';
  }
  document.getElementById('schematicSel').onchange = updateSchematicPreview;
  document.getElementById('treeTypeSel').onchange = function() {
    document.getElementById('schematicSel').value = this.value;
    updateSchematicPreview();
  };
  updateSchematicPreview();

  document.getElementById('cancelCreateWellBtn').onclick = function() {
    modal.remove();
  };

  document.getElementById('createWellForm').onsubmit = function(e) {
    e.preventDefault();
    const form = e.target;
    const newId = form.wellId.value.trim();
    if (!newId) return;
    if (wells.find(w => w.id === newId)) {
      alert('A well with this ID already exists.');
      return;
    }
    wells.push({
      id: newId,
      name: newId,
      type: form.wellType.value || "",
      treeType: form.treeType.value,
      schematic: form.schematic.value,
      rings: [],
      metadata: form.metadata.value || ""
    });
    modal.remove();
    renderWellsSection();
  };
}

function renderWellDetailsButton(wellId) {
  const well = wells.find(w => w.id === wellId);
  if (!well) {
    document.getElementById('wellDetailsContainer').innerHTML = '';
    return;
  }
  document.getElementById('wellDetailsContainer').innerHTML = `
    <button id="showWellDetailsBtn" class="show-well-details-btn">Well details</button>
    <div id="wellDetailsBox" class="well-details-box" style="display:none;"></div>
  `;

  document.getElementById('showWellDetailsBtn').onclick = function() {
    const detailsBox = document.getElementById('wellDetailsBox');
    if (detailsBox.style.display === "block") {
      detailsBox.style.display = "none";
      return;
    }
    let html = `
      <h3 style="margin-bottom:8px; color:#18191b;">${well.id} - ${well.name || ""}</h3>
      <ul style="color:#18191b;">
        <li><b>Type:</b> ${well.type || ""}</li>
        <li><b>Christmas Tree Type:</b> ${well.treeType || ""}</li>
        ${
          (well.rings && well.rings.length)
            ? `<li><b>Integrity/Risk:</b>
              <ul style="margin-bottom:0;">
                ${well.rings.map(r =>
                  `<li style="color:${r.color};"><b>${r.label}:</b> ${r.message}</li>`
                ).join('')}
              </ul>
            </li>`
            : ""
        }
      </ul>
    `;
    detailsBox.innerHTML = html;
    detailsBox.style.display = "block";
  };
}

// --- Inline Valve Input Panel ---
async function showValveInputPanel(wellId, valveId) { // Added async here
  const panel = document.getElementById('valveInputPanel');
  if (!panel) {
    console.error("valveInputPanel element not found");
    return;
  }
  // Optional: Add a simple loading state to the panel while fetching
  panel.innerHTML = '<div style="color:#ccc; padding:20px;">Loading valve data...</div>';
  panel.style.display = 'block'; // Show panel immediately with loading message
  panel.classList.add('active');
  window.currentValvePanel = valveId;


  const saved = JSON.parse(localStorage.getItem(`valveData_${wellId}_${valveId}`) || '{}');
  const valveType = getValveTypeLabel(valveId); // Assuming getValveTypeLabel is defined globally
  const valveLimits = VALVE_LIMITS[valveId] || { monitoring_time: "", critical_rate: "" }; // Assuming VALVE_LIMITS is global

  // --- FETCH VALID BLOCKING VALVES ---
  let validBlockingValves = [];
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/valid_blocking_valves?well=${wellId}&valve=${valveId}`);
    if (response.ok) {
      const data = await response.json();
      validBlockingValves = data.blocking_valves || [];
    } else {
      // Log error and potentially inform user via a non-modal way if needed
      console.error("Failed to fetch valid blocking valves:", response.status, await response.text());
      // You could add a message to a specific part of the form if the fetch fails
      // For now, it will proceed with an empty validBlockingValves array.
    }
  } catch (error) {
    console.error("Error fetching valid blocking valves:", error);
    // Handle network error, proceed with empty validBlockingValves
  }
  // --- END FETCH ---

  // The rest of the form generation logic from your working version:
  let formHtml = `<h3>Valve ${valveId} Data</h3><form id="valveForm">`;

  // Assuming valveFormSections is defined globally
  valveFormSections.forEach((section, i) => {
    formHtml += `
      <div class="valve-form-accordion">
        <button type="button" class="accordion-toggle" data-index="${i}">
          ${section.title}
        </button>
        <div class="accordion-panel" style="display:${i === 0 ? "block" : "none"};">
    `;
    section.fields.forEach(field => {
      let val = saved[field.name] || "";
      if (field.name === "valveId") val = valveId;
      if (field.name === "valveType") val = valveType;
      if (field.name === "monitoringTime") val = valveLimits.monitoring_time;
      if (field.name === "maxInternalLeakRate") val = valveLimits.critical_rate;

      // --- MODIFICATION FOR BLOCKING VALVE DROPDOWN ---
      if (field.name === "downstreamBlockingValve") {
        formHtml += `<label>${field.label}
          <select name="${field.name}" ${field.readonly ? "disabled" : ""}>
            <option value="">-- Select Blocking Valve --</option>
            ${validBlockingValves.map(opt => // USE THE FETCHED OPTIONS
              `<option value="${opt}"${val === opt ? ' selected' : ''}>${opt}</option>`).join('')}
          </select>
        </label>`;
      } else if (field.type === "select") {
      // --- END MODIFICATION ---
        formHtml += `<label>${field.label}
          <select name="${field.name}" ${field.readonly ? "disabled" : ""}>
            <option value=""></option>
            ${(field.options||[]).map(opt =>
              `<option value="${opt}"${val===opt?' selected':''}>${opt}</option>`).join('')}
          </select>
        </label>`;
      } else if (field.type === "radio") {
        formHtml += `<label>${field.label}<div class="radio-group">` +
          (field.options||[]).map(opt =>
            `<label>
              <input type="radio" name="${field.name}" value="${opt}"${val===opt?' checked':''}> ${opt}
            </label>`
          ).join('') +
        `</div></label>`;
      } else {
        formHtml += `<label>${field.label}
          <input type="${field.type||'text'}" name="${field.name}" ${field.readonly?"readonly":""} value="${val}">
        </label>`;
      }
    });
    formHtml += `</div></div>`;
  });

  // --- Review & Submit Section (from your working version) ---
  formHtml += `
    <div class="valve-form-accordion">
      <button type="button" class="accordion-toggle" data-index="review">
        Review & Submit
      </button>
      <div class="accordion-panel" style="display:none;">
        <div id="reviewPanel"></div>
        <button type="submit" class="primary-btn" style="margin-top:20px;">Submit</button>
        <span id="submitMsg" style="color:#eaff57;display:none;margin-left:18px;">Saved!</span>
      </div>
    </div>
    <div id="autosaveMsg" style="color:#eaff57; margin-top:12px; font-size:1em; display:none;">Autosaved</div>
  </form>
  <div id="warningHistoryPanel" style="display:none; margin-top: 18px;"></div>
  `;

  // panel.innerHTML = formHtml; // Set innerHTML after form string is complete
  // panel.style.display = 'block'; // Already set if using loading indicator
  // panel.classList.add('active');
  // window.currentValvePanel = valveId; // Already set

  // Update the panel content now that formHtml is fully constructed
  panel.innerHTML = formHtml;


  // --- Accordion and Event Listeners (from your working version) ---
  Array.from(panel.querySelectorAll('.accordion-toggle')).forEach(btn => {
    btn.onclick = function() {
      const panels = panel.querySelectorAll('.accordion-panel'); // Re-query within this scope
      const currentAccordionPanel = this.nextElementSibling; // The panel associated with this button
      const isReviewButton = this.dataset.index === "review";
      
      // If the current panel is open, close it. Otherwise, close all and open current.
      if (currentAccordionPanel.style.display === "block") {
          currentAccordionPanel.style.display = "none";
      } else {
          panels.forEach(p => p.style.display = "none"); // Close all panels
          currentAccordionPanel.style.display = "block"; // Open the current one
          if (isReviewButton) {
            // Ensure showReviewPanel uses the correct form reference
            const formForReview = document.getElementById('valveForm');
            if (formForReview && typeof showReviewPanel === "function") {
                 showReviewPanel(formForReview, valveLimits, valveId); // Pass form, limits, and valveId
            }
          }
      }
    };
  });

  const form = document.getElementById('valveForm'); // Get form after innerHTML is set
  if (form) { // Ensure form exists before adding listeners
    form.addEventListener('input', function() {
      const data = {};
      // Use FormData for robust collection
      new FormData(form).forEach((value, key) => data[key] = value);
      
      localStorage.setItem(`valveData_${wellId}_${valveId}`, JSON.stringify(data));
      const msg = document.getElementById('autosaveMsg');
      if (msg) {
        msg.style.display = 'block';
        clearTimeout(panel._saveTimer); // Use panel specific timer if you had one, otherwise a global one
        panel._saveTimer = setTimeout(() => { msg.style.display = 'none'; }, 800);
      }
    });

    // --- form.onsubmit (from your working version, but ensure it's async for the API call) ---
    form.onsubmit = async function(e) { // Added async here
      e.preventDefault();
      
      // Ensure clearWarningHistory is defined and called correctly
      if (typeof clearWarningHistory === "function") clearWarningHistory(valveId); // Pass valveId if using unique warning panels

      const submittedFormData = {};
      new FormData(form).forEach((value, key) => submittedFormData[key] = value);

      const apiPayload = {
        Well: wellId.replace(/-/g, ''),
        ValveType: valveId,
        BlockingValve: submittedFormData.downstreamBlockingValve, // This will now be from the corrected dropdown
        InitialPressure: Number(submittedFormData.initialPressure) || 0,
        FinalPressure: Number(submittedFormData.finalPressure) || 0,
        InitialTemperature: Number(submittedFormData.initialTemp) || 0,
        FinalTemperature: Number(submittedFormData.finalTemperature) || 0,
        MonitoringTime: valveLimits.monitoring_time, // Use the defined limit
        Z1: Number(submittedFormData.Z1) || 1, // Assuming Z1/Z2 might be added to form
        Z2: Number(submittedFormData.Z2) || 1
      };
      
      console.log(`API Payload for ${valveId}:`, JSON.stringify(apiPayload, null, 2));
      const submitMsgEl = document.getElementById('submitMsg'); // Or submitMsg-${valveId} if you make it unique
      if(submitMsgEl) {
        submitMsgEl.textContent = "Processing test...";
        submitMsgEl.style.display = 'inline';
      }

      try {
        const response = await fetch('http://127.0.0.1:5000/api/run_integrity_test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });
        const result = await response.json();
        console.log(`API Response for ${valveId}:`, result);

        if (!window.valveTestResults[wellId]) window.valveTestResults[wellId] = {};
        window.valveTestResults[wellId][valveId] = result;

        if (!window.valveTestWarnings[wellId]) window.valveTestWarnings[wellId] = {};
        window.valveTestWarnings[wellId][valveId] = result.failure_reasons || [];

        if (!response.ok) {
          const errorMsg = `Server Error: ${result.error || response.statusText || 'Unknown API error'}`;
          if (typeof addWarningToHistory === "function") addWarningToHistory(errorMsg, valveId);
          if(submitMsgEl) submitMsgEl.textContent = errorMsg.length > 40 ? "Test Failed (see warnings)" : errorMsg;
        } else {
          if (result.failure_reasons && result.failure_reasons.length > 0) {
            result.failure_reasons.forEach(reason => {
              if (typeof addWarningToHistory === "function") addWarningToHistory(reason, valveId);
            });
          }
          const actualLeakRateField = form.elements["actualInternalLeakRate"];
          if (actualLeakRateField) {
            actualLeakRateField.value = result.leak_rate_scfm !== undefined
              ? Number(result.leak_rate_scfm).toFixed(3)
              : 'N/A';
          }
          if(submitMsgEl) {
            submitMsgEl.textContent = "Test results processed!";
          }
        }
      } catch (error) {
        console.error(`Client-side error for ${valveId}:`, error);
        const clientErrorMsg = 'Client-side error: ' + error.message;
        if (typeof addWarningToHistory === "function") addWarningToHistory(clientErrorMsg, valveId);
        if(submitMsgEl) submitMsgEl.textContent = clientErrorMsg.length > 40 ? "Client Error (see warnings)" : clientErrorMsg;
      } finally {
        if(submitMsgEl) setTimeout(() => { if(submitMsgEl) submitMsgEl.style.display = 'none'; }, 3500);
        // Ensure these functions are defined and accessible
        if (typeof renderValveTestResultsPanel === "function") renderValveTestResultsPanel(wellId);
        if (typeof renderWellSchematicAndPanel === "function") renderWellSchematicAndPanel(wellId);
        if (typeof renderMultiRingDashboard === "function") renderMultiRingDashboard();
      }
    };
  } else {
      console.error("Form element #valveForm not found after rendering panel content.");
  }

  function showReviewPanel() {
    let out = "<table style='width:100%;font-size:1em;'>";
    valveFormSections.forEach(section => {
      out += `<tr><th colspan="2" style="color:#ffe257;text-align:left;padding-top:10px;">${section.title}</th></tr>`;
      section.fields.forEach(f => {
        let v;
        if (f.name === "monitoringTime") v = valveLimits.monitoring_time;
        else if (f.name === "maxInternalLeakRate") v = valveLimits.critical_rate;
        else v = (f.type === "radio")
          ? (form.querySelector(`[name="${f.name}"]:checked`) || {value:""}).value
          : (form.elements[f.name]?.value || "");
        out += `<tr>
            <td style="color:#8ec4f7;padding-left:10px;width:40%;">${f.label}</td>
            <td style="color:#fff;width:60%;">${v}</td>
          </tr>`;
      });
    });
    out += "</table>";
    document.getElementById('reviewPanel').innerHTML = out;
  }

  // --- Collapsible Warning History Panel ---
  let warningHistory = [];

  function renderWarningHistory() {
    const historyDiv = document.getElementById('warningHistoryPanel');
    if (!historyDiv) return;
    if (warningHistory.length === 0) {
      historyDiv.style.display = 'none';
      historyDiv.innerHTML = '';
      return;
    }
    const collapsed = historyDiv.getAttribute('data-collapsed') === 'true';
    historyDiv.style.display = 'block';
    historyDiv.innerHTML = `
      <button id="toggleWarningHistoryBtn" style="background:#222;color:#ffe257;border:none;padding:6px 14px;border-radius:4px;font-size:1em;cursor:pointer;float:right;">
        ${collapsed ? 'Show' : 'Hide'} Warning History
      </button>
      <div id="warningHistoryContent" style="margin-top: 8px;${collapsed ? 'display:none;' : ''}">
        <div style="color:#ff4b4b;font-weight:bold;">Warning History:</div>
        <ul style="color:#ffbaba;list-style:disc inside;padding-left:18px;">
          ${warningHistory.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
      <div style="clear:both"></div>
    `;
    document.getElementById('toggleWarningHistoryBtn').onclick = function() {
      historyDiv.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
      renderWarningHistory();
    };
  }

  function addWarningToHistory(msg) {
    warningHistory.push(msg);
    renderWarningHistory();
  }

  function clearWarningHistory() {
    warningHistory = [];
    renderWarningHistory();
  }

  clearWarningHistory();

  form.onsubmit = async function(e) {
    e.preventDefault();
    clearWarningHistory();

    const data = {};
    valveFormSections.forEach(section => {
      section.fields.forEach(f => {
        if (f.type === "radio") {
          const checked = form.querySelector(`[name="${f.name}"]:checked`);
          data[f.name] = checked ? checked.value : "";
        } else if (!(f.readonly && (f.name === "monitoringTime" || f.name === "maxInternalLeakRate"))) {
          data[f.name] = form.elements[f.name]?.value || "";
        }
      });
    });

    const apiPayload = {
      Well: wellId.replace(/-/g, ''),
      ValveType: valveId,
      BlockingValve: data.downstreamBlockingValve,
      InitialPressure: Number(data.initialPressure) || 0,
      FinalPressure: Number(data.finalPressure) || 0,
      InitialTemperature: Number(data.initialTemp) || 0,
      FinalTemperature: Number(data.finalTemperature) || 0,
      MonitoringTime: valveLimits.monitoring_time,
      Z1: Number(data.Z1) || 1,
      Z2: Number(data.Z2) || 1
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/run_integrity_test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });
      const result = await response.json();
      if (!window.valveTestResults[wellId]) window.valveTestResults[wellId] = {};
      window.valveTestResults[wellId][valveId] = result;

      // Store warnings for this valve/well
      if (!window.valveTestWarnings[wellId]) window.valveTestWarnings[wellId] = {};
      window.valveTestWarnings[wellId][valveId] = result.failure_reasons || [];

      if (result.failure_reasons && result.failure_reasons.length > 0) {
        result.failure_reasons.forEach(reason => {
          addWarningToHistory(reason);
        });
      }

      if (form.elements["actualInternalLeakRate"])
        form.elements["actualInternalLeakRate"].value = result.leak_rate_scfm !== undefined
          ? Number(result.leak_rate_scfm).toFixed(3)
          : 'N/A';

      renderValveTestResultsPanel(wellId);
      renderWellSchematicAndPanel(wellId);

      // Also update dashboard multiring if present
      if (typeof renderMultiRingDashboard === "function") renderMultiRingDashboard();

    } catch (error) {
      addWarningToHistory('Error running integrity test: ' + error);
    }
  };
}
function getValveTypeLabel(valveId) {
  switch(valveId) {
    case "HWV": return "Hydraulic Wing Valve";
    case "MWV": return "Manual Wing Valve";
    case "SCSSV": return "Subsurface Safety Valve";
    case "MMV": return "Master Valve";
    case "HMV": return "Hydraulic Master Valve";
    case "SV": return "Swab Valve";
    case "2SV": return "Second Swab Valve";
    case "TC": return "Tree Cap";
    case "CV": return "Crossover Valve";
    case "HDVs": return "Hydraulic Downhole Valve";
    default: return valveId;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('wellList')) renderWellsSection();
});


