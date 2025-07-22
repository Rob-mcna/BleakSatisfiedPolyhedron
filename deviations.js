// --- Deviation/Dispensation Section (From Scratch) ---

// GLOBAL STATE
// --- MODIFICATION: Load deviations from localStorage ---
try {
  const storedDeviations = localStorage.getItem('deviations_data');
  if (storedDeviations) {
    window.deviations = JSON.parse(storedDeviations);
  } else {
    window.deviations = []; // Initialize if nothing in localStorage
  }
} catch (e) {
  console.error("Error loading deviations from localStorage:", e);
  window.deviations = []; // Fallback to empty array on error
}
// --- END MODIFICATION ---

window._richDeviationContext = window._richDeviationContext || {};


// --- Section Rendering ---
function renderDeviationsSection() {
  const section = document.getElementById('deviationsSection');
  if (!section) return;
  section.innerHTML = `
    <h1>Deviations & Dispensations</h1>
    <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
      <button id="addDeviationBtn" class="primary-btn">
        + New Deviation / Dispensation
      </button>
      <div>
        <label for="deviationStatusFilter" style="margin-right: 8px;">Filter by Status:</label>
        <select id="deviationStatusFilter">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
    <div id="deviationsList"></div>
    <div id="deviationModal" class="modal" style="display:none;">
      <div class="modal-content" style="min-width:350px;max-width:99vw;">
        <h3 id="deviationModalTitle">New Deviation / Dispensation</h3>
        <form id="deviationForm" autocomplete="off" style="max-width:650px;">
          <label>
            <input type="radio" name="deviationType" value="deviation" checked>
            Deviation Only
          </label>
          <label style="margin-left:22px;">
            <input type="radio" name="deviationType" value="dispensation">
            Deviation + Dispensation
          </label>
          <br><br>
          <label>Title:<br>
            <input type="text" id="devTitle" required style="width:99%;">
          </label><br>
          <label>Description:<br>
            <textarea id="devDescription" required style="width:99%;min-height:70px;"></textarea>
          </label><br>
          <label>Valid Until:<br>
            <input type="date" id="devValidUntil" required>
          </label><br>
          <div id="dispensationFieldsBlock" style="display:none; margin-top:14px; padding:12px; background:#18191b; border-radius:7px;">
            <h4 style="color:#ffe257;margin-bottom:6px;">Dispensation Details</h4>
            <label>Requested By: <input type="text" id="requestedByField"></label>
            <label>Request Date: <input type="date" id="requestDateField"></label>
            <label>Location: <input type="text" id="locationField"></label>
            <label>Organization: <input type="text" id="organizationField"></label>
            <label>Deviation Title: <input type="text" id="deviationTitleField"></label>
            <label>Deviation No.: <input type="text" id="deviationNoField"></label>
            <label>Reason for Deviation:<br>
              <textarea id="deviationReasonField"></textarea>
            </label>
            <label>Controls Proposed:<br>
              <textarea id="controlsField"></textarea>
            </label>
            <label>Authorization Date: <input type="date" id="authorizationDateField"></label>
            <label>Authorization Valid Until: <input type="date" id="validUntilField"></label>
            <label>Manager Signature: <input type="text" id="managerSignatureField" placeholder="Signature"></label>
          </div>
          <div id="deviationFormError" style="color:#ff4b4b; margin:10px 0 0 0; display:none;"></div>
          <div style="margin-top:18px;">
            <button type="submit" id="saveDeviationBtn" class="primary-btn">Submit</button>
            <button type="button" id="cancelDeviationBtn" class="secondary-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('addDeviationBtn').onclick = () => showDeviationModal();
  document.getElementById('deviationStatusFilter').onchange = renderDeviationsList;

  document.querySelectorAll('input[name="deviationType"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const block = document.getElementById('dispensationFieldsBlock');
      block.style.display = (this.value === "dispensation") ? "block" : "none";
    });
  });

  renderDeviationsList();
  document.getElementById('cancelDeviationBtn').onclick = closeDeviationModal;
}

window.openDeviationFromWell = function(wellId, valveId = null) {
  showSection('deviations');
  setTimeout(function () {
    let context = null;
    if (valveId && window._richDeviationContext && window._richDeviationContext[`${wellId}::${valveId}`]) {
      context = window._richDeviationContext[`${wellId}::${valveId}`];
    } else if (window._richDeviationContext && window._richDeviationContext[`${wellId}::wellOnly`]) {
      context = window._richDeviationContext[`${wellId}::wellOnly`];
    }
    let prefill = {};
    if (context) {
      if (context.valveId) {
        prefill.title = `Deviation: Valve ${context.valveId} failed integrity test on Well ${context.wellName || context.wellId}`;
        let summaryDesc = `Valve: ${context.valveId}\nWell: ${context.wellName || context.wellId}`;
        if (context.result) {
          summaryDesc += `\nLeak Rate: ${context.result.leak_rate_scfm !== undefined ? Number(context.result.leak_rate_scfm).toFixed(3) : "N/A"}\nAllowable Rate: ${context.allowableRate || "N/A"}`;
          if (context.warnings && context.warnings.length) {
            summaryDesc += `\nWarnings: ${context.warnings.join('; ')}`;
          }
        }
        prefill.description = summaryDesc;
        prefill.warnings = context.warnings;
      } else if (context.contextType === "wellOnly") {
        prefill.title = `Deviation: Well ${context.wellName || context.wellId}`;
        prefill.description = `General deviation raised for Well: ${context.wellName || context.wellId}`;
      }
    }
    showDeviationModal(prefill);
  }, 200);
};

function showDeviationModal(context = {}) {
  const modal = document.getElementById('deviationModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const form = document.getElementById("deviationForm");
  if (form) {
    form.onsubmit = null;
    form.onsubmit = deviationFormSubmitHandler;
  }

  const errorDiv = document.getElementById('deviationFormError');
  if (errorDiv) {
    errorDiv.style.display = "none";
    errorDiv.textContent = "";
  }

  if (form) form.reset();
  const dispFields = document.getElementById('dispensationFieldsBlock');
  if (dispFields) dispFields.style.display = "none";
  if (form && form.deviationType) form.deviationType.value = "deviation";


  let motiveHtml = "";
  if (context && (context.warnings && context.warnings.length > 0 || context.description)) {
    motiveHtml = `<div id="deviationMotiveSummary" style="background:#222;padding:10px 14px;border-radius:5px;color:#ff6f61;font-weight:bold;margin-bottom:10px;">`;
    if (context.warnings && context.warnings.length > 0) {
        motiveHtml += `<div style="color:#ffe257;">Deviation Motive / Error:</div>
                       <ul style="margin:0 0 0 18px;padding:0;">
                         ${context.warnings.map(w => `<li>${w}</li>`).join('')}
                       </ul>`;
    } else if (context.description) {
        motiveHtml += `<div style="color:#ffe257;">Context:</div><div>${context.description.replace(/\n/g, '<br>')}</div>`;
    }
    motiveHtml += `</div>`;
  }

  let oldSummary = document.getElementById('deviationMotiveSummary');
  if (oldSummary) oldSummary.remove();
  
  if (motiveHtml && form) {
    form.insertAdjacentHTML('afterbegin', motiveHtml);
  }

  if (context) {
    const devTitleInput = document.getElementById('devTitle');
    const devDescriptionInput = document.getElementById('devDescription');
    if (devTitleInput) devTitleInput.value = context.title || "";
    if (devDescriptionInput) devDescriptionInput.value = context.description || "";
  }
}

function closeDeviationModal() {
  const modal = document.getElementById('deviationModal');
  if (modal) modal.style.display = 'none';
}

function deviationFormSubmitHandler(e) {
  e.preventDefault();
  let error = "";

  const type = document.querySelector('input[name="deviationType"]:checked').value;
  const newDev = {
    id: `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type: type,
    status: (type === "dispensation") ? "dispensation_requested" : "open",
    title: document.getElementById('devTitle').value.trim(),
    description: document.getElementById('devDescription').value.trim(),
    validUntil: document.getElementById('devValidUntil').value,
    createdAt: new Date().toISOString(),
    createdBy: currentUser ? currentUser.username : "Unknown" // --- MODIFICATION: Add createdBy ---
  };

  if (!newDev.title || !newDev.description || !newDev.validUntil) {
    error = "Please fill all required fields (Title, Description, Valid Until).";
  }

  if (type === "dispensation") {
    newDev.dispensationDetails = {
        requestedBy: document.getElementById('requestedByField').value.trim(),
        requestDate: document.getElementById('requestDateField').value,
        location: document.getElementById('locationField').value.trim(),
        organization: document.getElementById('organizationField').value.trim(),
        deviationTitle: document.getElementById('deviationTitleField').value.trim(),
        deviationNo: document.getElementById('deviationNoField').value.trim(),
        deviationReason: document.getElementById('deviationReasonField').value.trim(),
        controls: document.getElementById('controlsField').value.trim(),
        authorizationDate: document.getElementById('authorizationDateField').value,
        validUntilField: document.getElementById('validUntilField').value,
        managerSignature: document.getElementById('managerSignatureField').value.trim()
    };
    const dd = newDev.dispensationDetails;
    if (!dd.requestedBy || !dd.requestDate || !dd.location || !dd.organization || !dd.deviationTitle || !dd.deviationNo || !dd.deviationReason || !dd.controls || !dd.authorizationDate || !dd.validUntilField || !dd.managerSignature) {
        error = "Please fill all required dispensation fields.";
    }
  }

  const errDiv = document.getElementById('deviationFormError');
  if (error) {
    errDiv.style.display = "block";
    errDiv.textContent = error;
    return;
  } else {
    errDiv.style.display = "none";
  }

  window.deviations.push(newDev);
  // --- MODIFICATION: Save to localStorage ---
  try {
    localStorage.setItem('deviations_data', JSON.stringify(window.deviations));
  } catch (e) {
    console.error("Error saving deviations to localStorage:", e);
  }
  // --- END MODIFICATION ---
  closeDeviationModal();
  renderDeviationsList();
}

function renderDeviationsList() {
  const div = document.getElementById('deviationsList');
  if (!div) return;

  const filterValue = document.getElementById('deviationStatusFilter').value;
  let filteredDeviations = window.deviations || [];

  if (filterValue === "open") {
    filteredDeviations = filteredDeviations.filter(dev => dev.status === "open" || dev.status === "dispensation_requested");
  } else if (filterValue === "closed") {
    filteredDeviations = filteredDeviations.filter(dev => dev.status === "closed");
  }

  let html = `
    <table style="width:100%;margin-top:10px;border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px; border-bottom:1px solid #444;">Type</th>
          <th style="text-align:left; padding:8px; border-bottom:1px solid #444;">Title</th>
          <th style="text-align:left; padding:8px; border-bottom:1px solid #444;">Status</th>
          <th style="text-align:left; padding:8px; border-bottom:1px solid #444;">Valid Until</th>
          <th style="text-align:left; padding:8px; border-bottom:1px solid #444;">Created By</th> <!-- MODIFICATION: Add Created By Column -->
          <th style="text-align:left; padding:8px; border-bottom:1px solid #444;">Actions</th>
        </tr>
      </thead>
      <tbody>`;

  if (filteredDeviations.length === 0) {
    html += `<tr><td colspan="6" style="text-align:center; padding:10px; color:#888;">No deviations found for this filter.</td></tr>`; // MODIFICATION: colspan to 6
  } else {
    filteredDeviations.forEach(dev => {
      html += `<tr>
        <td style="padding:8px; border-bottom:1px solid #333;">${dev.type}</td>
        <td style="padding:8px; border-bottom:1px solid #333;">${dev.title}</td>
        <td style="padding:8px; border-bottom:1px solid #333;">${dev.status}</td>
        <td style="padding:8px; border-bottom:1px solid #333;">${dev.validUntil}</td>
        <td style="padding:8px; border-bottom:1px solid #333;">${dev.createdBy || "N/A"}</td> <!-- MODIFICATION: Display createdBy -->
        <td style="padding:8px; border-bottom:1px solid #333;">
          ${dev.status !== 'closed' ? `<button class="secondary-btn small-btn" onclick="closeDeviation('${dev.id}')">Close</button>` : ''}
        </td>
      </tr>`;
    });
  }
  html += '</tbody></table>';
  div.innerHTML = html;
}

window.closeDeviation = function(deviationId) {
    const deviation = window.deviations.find(d => d.id === deviationId);
    if (deviation) {
        deviation.status = 'closed';
        // --- MODIFICATION: Save to localStorage ---
        try {
          localStorage.setItem('deviations_data', JSON.stringify(window.deviations));
        } catch (e) {
          console.error("Error saving deviations to localStorage:", e);
        }
        // --- END MODIFICATION ---
        renderDeviationsList();
    }
};

document.addEventListener('DOMContentLoaded', function() {
  // Ensure deviations are loaded before rendering.
  // The global state loading at the top of the script handles this.
  if (document.getElementById('deviationsSection')) {
    renderDeviationsSection();
  }
});