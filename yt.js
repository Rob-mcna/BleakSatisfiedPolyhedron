
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

  const savedFormData = JSON.parse(localStorage.getItem(`valveData_${currentWellId}_${currentValveId}`) || '{}');
  const valveType = getValveTypeLabel(currentValveId);
  const valveLimits = VALVE_LIMITS[currentValveId] || { monitoring_time: "", critical_rate: "" };

  let validBlockingValves = [];
  try {
    const response = await fetch(`http://p629719.mnet.com:5000/api/valid_blocking_valves?well=${currentWellId}&valve=${currentValveId}`);
    if (response.ok) {
      const data = await response.json();
      validBlockingValves = data.blocking_valves || [];
    } else {
      console.error(`Failed to fetch valid blocking valves THDVfor ${currentWellId}/${currentValveId}:`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`Error fetching valid blocking valves for ${currentWellId}/${currentValveId}:`, error);
  }
  
  const wellName = (window.wells.find(w => w.id === currentWellId))?.name || currentWellId;
  let formHtml = `<h3>Valve ${currentValveId} Data (Well: ${wellName})</h3><form id="valveForm_${currentWellId}_${currentValveId}">`;
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
    <div id="autosaveMsg_${currentWellId}_${currentValveId}" style="color:#eaff57; margin-top:12px; font-size:1em; display:none;">Autosaved</div>
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
      localStorage.setItem(`valveData_${currentWellId}_${currentValveId}`, JSON.stringify(data));
      const msg = document.getElementById(`autosaveMsg_${currentWellId}_${currentValveId}`);
      if (msg) {
        msg.style.display = 'block';
        if (panel._saveTimer) clearTimeout(panel._saveTimer);
        panel._saveTimer = setTimeout(() => { msg.style.display = 'none'; }, 800);
      }
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
        Well: currentWellId,
        ValveType: currentValveId,
        BlockingValve: submittedFormData.get('downstreamBlockingValve'),
        InitialPressure: Number(submittedFormData.get('initialPressure')) || 0,
        FinalPressure: Number(submittedFormData.get('finalPressure')) || 0,
        InitialTemperature: Number(submittedFormData.get('initialTemp')) || 0,
        FinalTemperature: Number(submittedFormData.get('finalTemperature')) || 0,
        MonitoringTime: valveLimits.monitoring_time,
        SITHP: Number(submittedFormData.get('SITHP')) || 0,
        LiquidYield: Number(submittedFormData.get('LiquidYield')) || 0,
        PressureUpstreamPFSV: Number(submittedFormData.get('PressureUpstreamPFSV')) || 0,
        GasSG: Number(submittedFormData.get('GasSG')) || 0.6,
        k: Number(submittedFormData.get('k')) || 1.3,
        TestedBy: 'Rob-mcna'
      };

      const submitMsgEl = document.getElementById(`submitMsg_${currentWellId}_${currentValveId}`);
      if (submitMsgEl) {
        submitMsgEl.textContent = "Processing test...";
        submitMsgEl.style.display = 'inline';
      }

      try {
        const response = await fetch('http://p629719.mnet.com:5000/api/run_integrity_test', {
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
          if (!window.valveTestResults[currentWellId]) {
            window.valveTestResults[currentWellId] = {};
          }
          if (!Array.isArray(window.valveTestResults[currentWellId][currentValveId])) {
            window.valveTestResults[currentWellId][currentValveId] = [];
          }

          // Add timestamp for tracking
          newTestResult.utc_timestamp = '2025-06-17T16:07:06Z';
          newTestResult.inputs = newTestResult.inputs || {};
          newTestResult.inputs.TestedBy = 'Rob-mcna';
          newTestResult.inputs.timestamp = '2025-06-17T16:07:06Z';

          window.valveTestResults[currentWellId][currentValveId].push(newTestResult);

          if (!window.selectedValveTestIndex[currentWellId]) window.selectedValveTestIndex[currentWellId] = {};
          window.selectedValveTestIndex[currentWellId][currentValveId] = window.valveTestResults[currentWellId][currentValveId].length - 1;

          saveValveTestResultsToLocalStorage();

          const actualLeakRateField = currentForm.elements["actualInternalLeakRate"];
          if (actualLeakRateField && newTestResult.leak_rate_scfm !== undefined) {
            actualLeakRateField.value = Number(newTestResult.leak_rate_scfm).toFixed(3);
          }
          if (submitMsgEl) submitMsgEl.textContent = "Test results processed!";

          // Update local warnings
          if (!window.valveTestWarnings[currentWellId]) window.valveTestWarnings[currentWellId] = {};
          window.valveTestWarnings[currentWellId][currentValveId] = Array.isArray(newTestResult.failure_reasons) ? newTestResult.failure_reasons.slice() : [];
          if (typeof addMessageToWarningHistoryDisplay === "function" && Array.isArray(newTestResult.failure_reasons)) {
            newTestResult.failure_reasons.forEach(reason => addMessageToWarningHistoryDisplay(localWarningHistoryPanel, reason));
          }
          localStorage.setItem('valve_test_warnings', JSON.stringify(window.valveTestWarnings));

          // FIX #1: CRITICAL - Update dashboard and sync with global wells data
          updateDashboardAfterTest(currentWellId);

          // Also update global wells data structure for dashboard compatibility
          if (window.wells) {
            const wellIndex = window.wells.findIndex(w => w.id === currentWellId);
            if (wellIndex !== -1) {
              if (!window.wells[wellIndex].valveTestResults) {
                window.wells[wellIndex].valveTestResults = {};
              }
              window.wells[wellIndex].valveTestResults[currentValveId] = window.valveTestResults[currentWellId][currentValveId];
            }
          }
        }
      } catch (error) {
        console.error(`Client-side error for ${currentValveId} on well ${currentWellId}:`, error);
        const clientErrorMsg = 'Client-side error: ' + error.message;
        if (typeof addMessageToWarningHistoryDisplay === "function") addMessageToWarningHistoryDisplay(localWarningHistoryPanel, clientErrorMsg);
        if (submitMsgEl) submitMsgEl.textContent = clientErrorMsg.length > 40 ? "Client Error (see warnings)" : clientErrorMsg;
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