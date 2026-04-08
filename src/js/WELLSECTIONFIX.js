async function showValveInputPanel(currentWellId, currentValveId, valveName) {
  const panel = document.getElementById('valveInputPanel');
  if (!panel) {
    console.error("valveInputPanel element not found");
    return;
  }

  panel.innerHTML = `<div style="color:#ccc; padding:20px;">Loading valve ${valveName} data...</div>`;
  panel.classList.add('active');
  window.currentValvePanel = currentValveId;

  showValveFailureDetailsPanel(currentWellId, currentValveId);

  const valveType = valveName.toUpperCase();
  const valveLimits = VALVE_LIMITS[valveType] || { monitoring_time: 10, critical_rate: 15 };
  console.log(`Using limits for ${valveType}:`, valveLimits);

  let validBlockingValves = [];
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/blocking_valve?well=${currentWellId}&valve=${currentValveId}`);
    if (response.ok) {
      const data = await response.json();
      validBlockingValves = data;
      console.log(data);
    } else {
      console.error(`Failed to fetch valid blocking valves for ${valveName}:`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`Error fetching valid blocking valves for ${valveName}:`, error);
  }

  const wellNameStr = getWellByIdSafe(currentWellId)?.name || currentWellId;
  let formHtml = `<h3>Valve ${valveName} Data (Well: ${wellNameStr})</h3><form id="valveForm_${currentWellId}_${currentValveId}">`;

  const isScssv = (valveName.toUpperCase() === "SCSSV");

  valveFormSections.forEach((section, i) => {
    formHtml += `
      <div class="valve-form-accordion">
        <button type="button" class="accordion-toggle" data-index="${i}">${section.title}</button>
        <div class="accordion-panel" style="display:${i === 0 ? "block" : "none"};">
    `;

    section.fields.forEach(field => {
      let val = "";

      if (field.name === "valveId") {
        val = currentValveId;
      } else if (field.name === "valveType") {
        const valveDef = (window.allValves || []).find(v => sameId(v.id, currentValveId));
        val = valveDef ? valveDef.fullName || valveDef.name : valveName;
      } else if (field.name === "monitoringTime") {
        val = valveLimits.monitoring_time;
      } else if (field.name === "maxInternalLeakRate") {
        val = valveLimits.critical_rate;
      }

      if (field.name === "downstreamBlockingValve") {
        formHtml += `
          <label>${field.label}
            <select name="${field.name}" ${field.readonly ? "disabled" : ""}>
              <option value="">-- Select --</option>
              ${validBlockingValves.map(opt => `<option value="${opt.id}"${val === opt ? ' selected' : ''}>${opt.name}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (field.type === "select") {
        formHtml += `
          <label>${field.label}
            <select name="${field.name}" ${field.readonly ? "disabled" : ""}>
              <option value=""></option>
              ${(field.options || []).map(opt => `<option value="${opt}"${val === opt ? ' selected' : ''}>${opt}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (field.type === "radio") {
        formHtml += `
          <label>${field.label}
            <div class="radio-group">
              ${(field.options || []).map(opt => `<label><input type="radio" name="${field.name}" value="${opt}"${val === opt ? ' checked' : ''}> ${opt}</label>`).join('')}
            </div>
          </label>
        `;
      } else {
        formHtml += `
          <label>${field.label}
            <input type="${field.type || 'text'}" name="${field.name}" ${field.readonly ? "readonly" : ""} value="${val}">
          </label>
        `;
      }
    });

    if (section.title === "Initial Testing Conditions" && isScssv) {
      formHtml += `<label>SCSSV Depth (ft) <input type="number" name="scssv_depth" value="" step="any"></label>`;
    }

    formHtml += `</div></div>`;
  });

  formHtml += `
    <div class="valve-form-accordion">
      <button type="button" class="accordion-toggle" data-index="review">Review & Submit</button>
      <div class="accordion-panel" style="display:none;">
        <div id="reviewPanel_${currentWellId}_${currentValveId}"></div>
        <button type="submit" class="primary-btn" style="margin-top:20px;">Submit Test</button>
        <span id="submitMsg_${currentWellId}_${currentValveId}" style="color:#eaff57;display:none;margin-left:18px;"></span>
      </div>
    </div>
    <div id="autosaveMsg_${currentWellId}_${currentValveId}" style="color:#eaff57; margin-top:12px; font-size:1em; display:none;">Autosaved</div>
  </form>
  <div id="warningHistoryPanel_${currentWellId}_${currentValveId}" style="display:none; margin-top: 18px;"></div>
  `;

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
  if (!currentForm) {
    console.error(`Form element #valveForm_${currentWellId}_${currentValveId} not found after rendering panel content.`);
    return;
  }

  currentForm.addEventListener('input', function () {
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
    if (typeof clearWarningHistoryDisplay === "function") {
      clearWarningHistoryDisplay(localWarningHistoryPanel);
    }

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
      gasSG: Number(submittedFormData.get('GasSG')) || 0.6,
      k: Number(submittedFormData.get('k')) || 1.3,
      TestedBy: 'Rob-mcna'
    };

    if (isScssv) {
      apiPayload.scssv_depth = Number(submittedFormData.get('scssv_depth')) || 0;
    }

    console.log("Submitting test with data:", apiPayload);

    const submitMsgEl = document.getElementById(`submitMsg_${currentWellId}_${currentValveId}`);
    if (submitMsgEl) {
      submitMsgEl.textContent = "Processing test...";
      submitMsgEl.style.display = 'inline';
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/integrity_test/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      console.log("Raw backend response:", response);

      if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText || 'Unknown API error'}`);
      }

      const apiResponse = await response.json();
      const calculatedResult = apiResponse;

      console.log("Raw backend result object:", calculatedResult);

      const finalValidatedResult = validateTestOnFrontend(calculatedResult, valveLimits);

      ensureWellStores(currentWellId);

      if (!Array.isArray(window.valveTestResults[currentWellId][currentValveId])) {
        window.valveTestResults[currentWellId][currentValveId] = [];
      }

      finalValidatedResult.utc_timestamp = new Date().toISOString();
      finalValidatedResult.valve_id = currentValveId;
      finalValidatedResult.valve_type = valveName;

      finalValidatedResult.inputs.TestedBy = 'Rob-mcna';
      finalValidatedResult.inputs.timestamp = finalValidatedResult.utc_timestamp;

      window.valveTestResults[currentWellId][currentValveId].push(finalValidatedResult);

      ensureWellStores(currentWellId);
      window.selectedValveTestIndex[currentWellId][currentValveId] =
        window.valveTestResults[currentWellId][currentValveId].length - 1;

      if (submitMsgEl) submitMsgEl.textContent = "Test results processed!";

      ensureWellStores(currentWellId);
      window.valveTestWarnings[currentWellId][currentValveId] = finalValidatedResult.failure_reasons.slice();

      if (typeof addMessageToWarningHistoryDisplay === "function") {
        finalValidatedResult.failure_reasons.forEach(reason =>
          addMessageToWarningHistoryDisplay(localWarningHistoryPanel, reason)
        );
      }

      if (typeof loadValveTestStatuses === "function") {
        await loadValveTestStatuses(currentWellId);
      }

      await Promise.all([
        renderValveTestResultsPanel(currentWellId),
        renderWellSchematicAndPanel(currentWellId),
        updateDashboardAfterTest(currentWellId)
      ]);
      console.log('valveTestResults before rendering:', JSON.parse(JSON.stringify(window.valveTestResults)));

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
      if (submitMsgEl) {
        setTimeout(() => { if (submitMsgEl) submitMsgEl.style.display = 'none'; }, 3500);
      }

      setTimeout(() => {
        window.skipApiFetchForWell = currentWellId;

        renderValveTestResultsPanel(currentWellId);
        renderWellSchematicAndPanel(currentWellId);
        updateDashboardAfterTest(currentWellId);

        window.skipApiFetchForWell = null;

        showTemporaryMessage('Test completed and displays updated', 'success');
      }, 100);
    }
  };

  function showReviewPanelContent(reviewPanelDiv, formForReview, currentValveLimits, currentValveIdForReview) {
    let out = "<table style='width:100%;font-size:1em;'>";
    valveFormSections.forEach(section => {
      out += `<tr><th colspan="2" style="color:#ffe257;text-align:left;padding-top:10px;">${section.title}</th></tr>`;
      section.fields.forEach(f => {
        let v;
        if (f.name === "valveId") v = currentValveIdForReview;
        else if (f.name === "valveType") v = findValveNameById(currentValveIdForReview);
        else if (f.name === "monitoringTime") v = currentValveLimits.monitoring_time;
        else if (f.name === "maxInternalLeakRate") v = currentValveLimits.critical_rate;
        else v = (f.type === "radio")
          ? (formForReview.querySelector(`[name="${f.name}"]:checked`) || { value: "" }).value
          : (formForReview.elements[f.name]?.value || "");
        out += `<tr>
          <td style="color:#8ec4f7;padding-left:10px;width:40%;">${f.label}</td>
          <td style="color:#000;width:60%;">${v || 'N/A'}</td>
        </tr>`;
      });
    });
    out += "</table>";
    reviewPanelDiv.innerHTML = out;
  }

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
        ${collapsed ? 'Show' : 'Hide'} Warning History (${localWarningHistoryStore.length})
      </button>
      <div class="warning-history-content" style="margin-top: 8px;${collapsed ? 'display:none;' : ''}">
        <div style="color:#ff4b4b;font-weight:bold;">Warning History:</div>
        <ul style="color:#ffbaba;list-style:disc inside;padding-left:18px;">
          ${localWarningHistoryStore.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
      <div style="clear:both"></div>
    `;

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



function sameId(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function getWellByIdSafe(wellId) {
  return (window.wells || []).find(w => sameId(w.id, wellId)) || null;
}

function ensureWellStores(wellId) {
  if (!window.valveTestResults[wellId]) window.valveTestResults[wellId] = {};
  if (!window.selectedValveTestIndex[wellId]) window.selectedValveTestIndex[wellId] = {};
  if (!window.valveTestWarnings) window.valveTestWarnings = {};
  if (!window.valveTestWarnings[wellId]) window.valveTestWarnings[wellId] = {};
}

OTRO

const wellNameStr = getWellByIdSafe(currentWellId)?.name || currentWellId;

OTRO
const valveDef = (window.allValves || []).find(v => sameId(v.id, currentValveId));

OTRO
ensureWellStores(currentWellId);
if (!Array.isArray(window.valveTestResults[currentWellId][currentValveId])) {
    window.valveTestResults[currentWellId][currentValveId] = [];
}

OTRO

finalValidatedResult.valve_id = currentValveId;
finalValidatedResult.valve_type = valveName;

OTRO
ensureWellStores(currentWellId);
window.selectedValveTestIndex[currentWellId][currentValveId] =
    window.valveTestResults[currentWellId][currentValveId].length - 1;

OTRO
ensureWellStores(currentWellId);
window.valveTestWarnings[currentWellId][currentValveId] = finalValidatedResult.failure_reasons.slice();

OTRO
const valve = window.allValves.find(v => sameId(v.id, valveId));

OTRO
const well = getWellByIdSafe(wellId);

OTRO
if (typeof loadValveTestStatuses === "function") {
    await loadValveTestStatuses(currentWellId);
}

// PLACE THE await Promise.all HERE
await Promise.all([
  renderValveTestResultsPanel(currentWellId),
  renderWellSchematicAndPanel(currentWellId),
  updateDashboardAfterTest(currentWellId)
]);
console.log('valveTestResults before rendering:', JSON.parse(JSON.stringify(window.valveTestResults)));
