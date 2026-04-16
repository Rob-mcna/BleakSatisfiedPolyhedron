// ==========================================
// CLEAN MANUAL DISPENSATION SECTION
// Frontend-only UI + backend save
// ==========================================

const DEVIATION_API_BASE =
  (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ||
  'http://127.0.0.1:5000/api';

window._richDeviationContext = window._richDeviationContext || {};

function openDeviationFromWell(wellId, valveId = null) {
  if (typeof showSection === 'function') {
    showSection('deviations');
  }

  setTimeout(() => {
    let prefill = {};
    const key = valveId ? `${wellId}::${valveId}` : `${wellId}::wellOnly`;
    const ctx = window._richDeviationContext?.[key];

    const well = (window.wells || []).find(w => String(w.id) === String(wellId));

    if (ctx) {
      prefill = {
        wellId,
        valveId,
        title: ctx.valveId
          ? `Dispensation Request - ${ctx.valveId} / ${ctx.wellName || ctx.wellId}`
          : `Dispensation Request - ${ctx.wellName || ctx.wellId}`,
        description: ctx.description || '',
        installation: '',
        field: '',
        wellNumber: well?.name || wellId
      };
    } else {
      prefill = {
        wellId,
        valveId,
        title: `Dispensation Request - ${well?.name || wellId}`,
        description: '',
        installation: '',
        field: '',
        wellNumber: well?.name || wellId
      };
    }

    showDeviationModal(prefill);
  }, 200);
}

function getCurrentUserEmail() {
  return window.AuthService?.currentUserData?.email || 'unknown';
}

function getCurrentUserRole() {
  return window.AuthService?.currentUserData?.role || '';
}

function buildWellOptions(selectedWellId = '') {
  const wells = window.wells || [];
  return `
    <option value="">-- Select Well --</option>
    ${wells.map(w => `
      <option value="${w.id}" ${String(w.id) === String(selectedWellId) ? 'selected' : ''}>
        ${w.name || w.id}
      </option>
    `).join('')}
  `;
}

function buildValveOptions(wellId, selectedValveId = '') {
  const well = (window.wells || []).find(w => String(w.id) === String(wellId));
  const valves = well?.christmasTree?.valves || [];
  return `
    <option value="">-- Select Valve --</option>
    ${valves.map(v => `
      <option value="${v.id}" ${String(v.id) === String(selectedValveId) ? 'selected' : ''}>
        ${v.name || v.id}
      </option>
    `).join('')}
  `;
}

function setupManualDispensationSelectors(prefill = {}) {
  const wellSelect = document.getElementById('wellSelectField');
  const valveSelect = document.getElementById('valveSelectField');
  if (!wellSelect || !valveSelect) return;

  const selectedWellId = prefill.wellId || '';
  const selectedValveId = prefill.valveId || '';

  wellSelect.innerHTML = buildWellOptions(selectedWellId);
  valveSelect.innerHTML = buildValveOptions(selectedWellId, selectedValveId);

  wellSelect.onchange = function () {
    valveSelect.innerHTML = buildValveOptions(this.value, '');
  };
}

async function createManualDispensationInBackend(payload) {
  const failureResp = await fetch(
    `${DEVIATION_API_BASE}/integrity_test/failure?well=${encodeURIComponent(payload.wellId)}&valve=${encodeURIComponent(payload.valveId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload.failureData)
    }
  );

  const failureJson = await failureResp.json().catch(() => ({}));
  if (!failureResp.ok || failureJson?.Error || !failureJson?.id) {
    throw new Error(failureJson?.Error || `Failed to create manual deviation (${failureResp.status})`);
  }

  const actionResp = await fetch(
    `${DEVIATION_API_BASE}/integrity_test/action?id=${encodeURIComponent(failureJson.id)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload.actionData)
    }
  );

  const actionJson = await actionResp.json().catch(() => ({}));
  if (!actionResp.ok || actionJson?.Error) {
    throw new Error(actionJson?.Error || `Failed to create dispensation (${actionResp.status})`);
  }

  return {
    failureId: failureJson.id,
    actionId: actionJson.id || null
  };
}

function ensureManualEscalationRecord({ failureId, wellId, wellName, valveId, valveName, createdBy, title, reason, actionPlan }) {
  if (!window.escalationSystem) return `ESC-DB-${failureId}`;

  const existing = (window.escalationSystem.escalations || []).find(e =>
    String(e.dbId) === String(failureId) || String(e.id) === `ESC-DB-${failureId}`
  );

  if (existing) return existing.id;

  const trafficLight = 'red';

  const esc = {
    id: `ESC-DB-${failureId}`,
    dbId: failureId,
    wellName,
    wellId,
    valveId,
    valveName,
    status: 'open',
    priority: typeof window.escalationSystem.getPriorityFromTrafficLight === 'function'
      ? window.escalationSystem.getPriorityFromTrafficLight(trafficLight)
      : 'critical',
    createdAt: new Date(),
    createdBy: createdBy || 'manual',
    creatorRole: getCurrentUserRole(),
    userInitiated: true,
    escalatedTo: typeof window.escalationSystem.determineSuperior === 'function'
      ? window.escalationSystem.determineSuperior(getCurrentUserRole())
      : '',
    comments: [],
    acknowledgedAt: null,
    resolvedAt: null,
    failureDetails: {
      failureCode: 'MANUAL_DEVIATION',
      matrixCategory: 'manual',
      failureReason: title || reason || 'Manual deviation created from dispensation section',
      matrixDescription: actionPlan || 'Review and process manual dispensation',
      trafficLight
    }
  };

  window.escalationSystem.escalations.push(esc);

  if (typeof updateEscalationButtonCount === 'function') {
    updateEscalationButtonCount();
  }

  return esc.id;
}

function renderDeviationsSection() {
  const section = document.getElementById('deviationsSection');
  if (!section) return;

  section.innerHTML = `
    <div style="max-width:1200px; margin:24px auto; font-family:Arial,sans-serif;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:20px;">
        <div>
          <h1 style="margin:0; font-size:30px; color:#111827;">Deviations & Dispensations</h1>
          <p style="margin:8px 0 0; color:#6b7280; font-size:14px;">
            Manual dispensation requests and related records.
          </p>
        </div>

        <div style="display:flex; gap:12px; align-items:center;">
          <select id="deviationStatusFilter" style="
            padding:10px 12px;
            border:1px solid #d1d5db;
            border-radius:12px;
            background:#fff;
            font-size:14px;
          ">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="closed">Closed</option>
          </select>

          <button id="addDeviationBtn" style="
            border:none;
            background:linear-gradient(135deg,#0f62fe,#2563eb);
            color:#fff;
            padding:12px 18px;
            border-radius:14px;
            font-size:14px;
            font-weight:700;
            cursor:pointer;
            box-shadow:0 10px 24px rgba(37,99,235,0.20);
          ">
            + New Dispensation
          </button>
        </div>
      </div>

      <div id="deviationsList"></div>

      <div id="deviationModal" style="
        display:none;
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.70);
        z-index:2100;
        align-items:center;
        justify-content:center;
        backdrop-filter:blur(4px);
      ">
        <div style="
          background:#fff;
          color:#222;
          border-radius:12px;
          width:95%;
          max-width:780px;
          max-height:94vh;
          overflow:auto;
          box-shadow:0 10px 30px rgba(0,0,0,0.30);
          border:1px solid #dbe3ee;
        ">
          <div style="background:#eaf3ff; border-bottom:1px solid #cfe0fb; padding:18px 24px; text-align:center;">
            <h2 style="margin:0; font-size:22px;">DISPENSATION REQUEST FORM</h2>
          </div>

          <form id="deviationForm" autocomplete="off" style="padding:22px 24px 24px;">
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
              <label style="display:flex; flex-direction:column; gap:6px;">
                <span>Installation</span>
                <input type="text" id="installationField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
              </label>
              <label style="display:flex; flex-direction:column; gap:6px;">
                <span>Field</span>
                <input type="text" id="fieldField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
              </label>
              <label style="display:flex; flex-direction:column; gap:6px;">
                <span>Well</span>
                <select id="wellSelectField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required></select>
              </label>
              <label style="display:flex; flex-direction:column; gap:6px;">
                <span>Valve</span>
                <select id="valveSelectField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required></select>
              </label>
            </div>

            <label style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">
              <span>Dispensation Title</span>
              <input type="text" id="devTitle" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required>
            </label>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
              <label style="display:flex; flex-direction:column; gap:6px;">
                <span>Date and Place</span>
                <input type="date" id="requestDateField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required>
              </label>
              <label style="display:flex; flex-direction:column; gap:6px;">
                <span>Reference No.</span>
                <input type="text" id="referenceNumberField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;">
              </label>
              <label style="display:flex; flex-direction:column; gap:6px;">
                <span>Valid Until</span>
                <input type="date" id="devValidUntil" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required>
              </label>
            </div>

            <div style="border:1px solid #dbe3ee; border-radius:12px; overflow:hidden; margin-bottom:16px;">
              <div style="background:#eaf3ff; padding:10px 14px; font-weight:700;">Dispensation Description</div>
              <div style="padding:14px;">
                <label style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
                  <span>Reasons for Dispensation Request</span>
                  <textarea id="reasonField" style="min-height:70px; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required></textarea>
                </label>

                <label style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
                  <span>Impact of Deviation from Standards</span>
                  <textarea id="impactField" style="min-height:70px; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required></textarea>
                </label>

                <label style="display:flex; flex-direction:column; gap:6px;">
                  <span>Proposed Action Plan</span>
                  <textarea id="actionPlanField" style="min-height:70px; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required></textarea>
                </label>
              </div>
            </div>

            <div style="border:1px solid #dbe3ee; border-radius:12px; overflow:hidden; margin-bottom:16px;">
              <div style="background:#eaf3ff; padding:10px 14px; font-weight:700;">Prepared By</div>
              <div style="padding:14px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                <label style="display:flex; flex-direction:column; gap:6px;">
                  <span>Name</span>
                  <input type="text" id="preparedByField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required>
                </label>
                <label style="display:flex; flex-direction:column; gap:6px;">
                  <span>Signature</span>
                  <input type="text" id="signatureField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required>
                </label>
                <label style="display:flex; flex-direction:column; gap:6px;">
                  <span>Date</span>
                  <input type="date" id="preparedDateField" style="padding:10px 12px; border:1px solid #d1d5db; border-radius:10px;" required>
                </label>
              </div>
            </div>

            <div id="deviationFormError" style="display:none; color:#dc2626; margin-bottom:12px; font-size:13px;"></div>

            <div style="display:flex; justify-content:space-between; gap:12px; margin-top:8px;">
              <button type="button" id="cancelDeviationBtn" style="
                border:none;
                background:#6b7280;
                color:#fff;
                padding:12px 18px;
                border-radius:12px;
                font-weight:700;
                cursor:pointer;
              ">Cancel</button>

              <button type="submit" id="saveDeviationBtn" style="
                border:none;
                background:#0f62fe;
                color:#fff;
                padding:12px 18px;
                border-radius:12px;
                font-weight:700;
                cursor:pointer;
              ">Submit for Approval</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('addDeviationBtn').onclick = () => showDeviationModal();
  document.getElementById('deviationStatusFilter').onchange = renderDeviationsList;
  document.getElementById('cancelDeviationBtn').onclick = closeDeviationModal;
  document.getElementById('deviationForm').onsubmit = deviationFormSubmitHandler;

  renderDeviationsList();
}

function showDeviationModal(prefill = {}) {
  const modal = document.getElementById('deviationModal');
  if (!modal) return;

  modal.style.display = 'flex';

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('deviationForm').reset();
  document.getElementById('deviationFormError').style.display = 'none';
  document.getElementById('deviationFormError').textContent = '';

  document.getElementById('requestDateField').value = today;
  document.getElementById('preparedDateField').value = today;
  document.getElementById('preparedByField').value = getCurrentUserEmail();

  setupManualDispensationSelectors(prefill);

  if (prefill.title) document.getElementById('devTitle').value = prefill.title;
  if (prefill.description) document.getElementById('reasonField').value = prefill.description;
  if (prefill.installation) document.getElementById('installationField').value = prefill.installation;
  if (prefill.field) document.getElementById('fieldField').value = prefill.field;
}

function closeDeviationModal() {
  const modal = document.getElementById('deviationModal');
  if (modal) modal.style.display = 'none';
}

async function deviationFormSubmitHandler(e) {
  e.preventDefault();

  const errorDiv = document.getElementById('deviationFormError');
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  const title = document.getElementById('devTitle').value.trim();
  const validUntil = document.getElementById('devValidUntil').value;
  const reason = document.getElementById('reasonField').value.trim();
  const impact = document.getElementById('impactField').value.trim();
  const actionPlan = document.getElementById('actionPlanField').value.trim();
  const preparedBy = document.getElementById('preparedByField').value.trim();
  const signature = document.getElementById('signatureField').value.trim();
  const preparedDate = document.getElementById('preparedDateField').value;
  const installation = document.getElementById('installationField').value.trim();
  const field = document.getElementById('fieldField').value.trim();
  const wellId = document.getElementById('wellSelectField').value;
  const valveId = document.getElementById('valveSelectField').value;
  const referenceNumber = document.getElementById('referenceNumberField').value.trim();
  const requestDate = document.getElementById('requestDateField').value;

  const selectedWell = (window.wells || []).find(w => String(w.id) === String(wellId));
  const selectedValve = selectedWell?.christmasTree?.valves?.find(v => String(v.id) === String(valveId));

  if (!title || !validUntil || !reason || !impact || !actionPlan || !preparedBy || !signature || !preparedDate || !wellId || !valveId) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Please fill all required fields.';
    return;
  }

  try {
    const createdAtIso = new Date().toISOString();

    const backendResult = await createManualDispensationInBackend({
      wellId,
      valveId,
      failureData: {
        failureCode: 'MANUAL_DEVIATION',
        matrixCategory: 'manual',
        failureDescription: reason,
        requiredAction: actionPlan,
        createdBy: preparedBy,
        createdAt: createdAtIso
      },
      actionData: {
        description: `${title}\n${reason}`,
        justification: `${impact}\nProposed: ${actionPlan}`,
        status: 'pending',
        createdAt: createdAtIso,
        updatedAt: createdAtIso,
        expiryDate: new Date(validUntil).toISOString()
      }
    });

    const escalationId = ensureManualEscalationRecord({
      failureId: backendResult.failureId,
      wellId,
      wellName: selectedWell?.name || wellId,
      valveId,
      valveName: selectedValve?.name || valveId,
      createdBy: preparedBy,
      title,
      reason,
      actionPlan
    });

    const manualRecord = {
      id: backendResult.actionId ? `DEV-${backendResult.actionId}` : `DEV-${Date.now()}`,
      dbId: backendResult.actionId || null,
      type: 'dispensation',
      source: 'manual',
      escalationId,
      failureDbId: backendResult.failureId,
      title,
      description: reason,
      justification: `${impact}\nProposed: ${actionPlan}`,
      expiryDate: new Date(validUntil),
      status: 'pending',
      createdAt: new Date(createdAtIso),
      createdBy: preparedBy,
      creatorRole: getCurrentUserRole(),
      installation,
      field,
      wellNumber: selectedWell?.name || wellId,
      wellId,
      valveId,
      valveName: selectedValve?.name || valveId,
      datePlace: requestDate,
      referenceNumber,
      dispensationTitle: title,
      preparedDate,
      signature,
      comments: []
    };

    if (!window.deviationSystem) {
      throw new Error('Dispensation system not available.');
    }

    const exists = window.deviationSystem.deviations.find(d =>
      (manualRecord.dbId && d.dbId && String(d.dbId) === String(manualRecord.dbId)) ||
      String(d.id) === String(manualRecord.id)
    );

    if (!exists) {
      window.deviationSystem.deviations.push(manualRecord);
    }

    if (typeof window.deviationSystem.updateDashboardDeviationIndicators === 'function') {
      window.deviationSystem.updateDashboardDeviationIndicators();
    }

    closeDeviationModal();
    renderDeviationsList();
    showTemporaryMessage('Dispensation saved to database successfully', 'success');
  } catch (error) {
    console.error('Failed to save manual dispensation:', error);
    errorDiv.style.display = 'block';
    errorDiv.textContent = error.message || 'Failed to save dispensation.';
  }
}

async function closeDispensationRecord(recordId) {
  if (!window.deviationSystem) return;

  const record = window.deviationSystem.deviations.find(d => String(d.id) === String(recordId));
  if (!record) return;

  record.status = 'closed';

  if (record.dbId && typeof window.deviationSystem.updateDeviationInDatabase === 'function') {
    try {
      await window.deviationSystem.updateDeviationInDatabase(record);
    } catch (e) {
      console.warn('Failed to close dispensation in backend', e);
    }
  }

  if (typeof window.deviationSystem.updateDashboardDeviationIndicators === 'function') {
    window.deviationSystem.updateDashboardDeviationIndicators();
  }

  renderDeviationsList();
}

function renderDeviationsList() {
  const div = document.getElementById('deviationsList');
  if (!div) return;

  const filterValue = document.getElementById('deviationStatusFilter')?.value || 'all';
  let items = window.deviationSystem?.deviations || [];

  if (filterValue !== 'all') {
    items = items.filter(item => item.status === filterValue);
  }

  items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!items.length) {
    div.innerHTML = `
      <div style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:18px;
        padding:34px 24px;
        text-align:center;
        color:#6b7280;
        box-shadow:0 8px 24px rgba(15,23,42,0.04);
      ">
        No dispensations found for this filter.
      </div>
    `;
    return;
  }

  div.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      ${items.map(item => {
        const statusColor =
          item.status === 'approved' ? '#16a34a' :
          item.status === 'denied' ? '#dc2626' :
          item.status === 'closed' ? '#6b7280' : '#d97706';

        return `
          <div style="
            background:#fff;
            border:1px solid #e5e7eb;
            border-radius:18px;
            padding:16px 18px;
            box-shadow:0 8px 24px rgba(15,23,42,0.04);
          ">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">
              <div>
                <div style="font-size:16px; font-weight:700; color:#111827;">${item.title || '-'}</div>
                <div style="margin-top:6px; font-size:13px; color:#6b7280;">
                  ${item.wellNumber ? `<strong>Well:</strong> ${item.wellNumber} &nbsp;&nbsp;` : ''}
                  ${item.valveName ? `<strong>Valve:</strong> ${item.valveName} &nbsp;&nbsp;` : ''}
                  <strong>Created By:</strong> ${item.createdBy || '-'} &nbsp;&nbsp;
                  <strong>Valid Until:</strong> ${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}
                </div>
              </div>

              <div style="
                padding:6px 12px;
                border-radius:999px;
                font-size:12px;
                font-weight:700;
                background:${statusColor}22;
                color:${statusColor};
                text-transform:uppercase;
              ">
                ${item.status || 'pending'}
              </div>
            </div>

            <div style="margin-top:12px; color:#374151; font-size:14px; line-height:1.5;">
              ${item.description || '-'}
            </div>

            <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:8px;">
              ${item.status !== 'closed' ? `
                <button onclick="closeDispensationRecord('${item.id}')" style="
                  border:none;
                  background:#6b7280;
                  color:#fff;
                  padding:10px 14px;
                  border-radius:10px;
                  font-weight:700;
                  cursor:pointer;
                ">Close</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.openDeviationFromWell = openDeviationFromWell;
window.renderDeviationsSection = renderDeviationsSection;
window.showDeviationModal = showDeviationModal;
window.closeDeviationModal = closeDeviationModal;
window.closeDispensationRecord = closeDispensationRecord;

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('deviationsSection')) {
    renderDeviationsSection();
  }
});
