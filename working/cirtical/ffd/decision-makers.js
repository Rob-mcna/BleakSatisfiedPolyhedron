// =================== ESCALATION SYSTEM ADDITION ===================
// Add escalation tracking to globals
window.activeEscalations = window.activeEscalations || [];
window.escalationIdCounter = window.escalationIdCounter || 1;

class EscalationSystem {
  constructor() {
    this.escalations = window.activeEscalations;
  }

  _getWellIdFromName(wellName) {
    if (!wellName) {
      console.error('Cannot get well ID - well name is undefined');
      return null;
    }
    const wellObj = window.wells.find(w => w.name === wellName);
    if (wellObj && wellObj.id) {
      console.log(`Found well ID ${wellObj.id} for well name ${wellName}`);
      return wellObj.id;
    }
    const idMatch = wellName.match(/(\d+)$/);
    if (idMatch) {
      console.log(`Extracted numeric ID ${idMatch[1]} from well name ${wellName}`);
      return idMatch[1];
    }
    console.warn(`Could not find ID for well ${wellName}, using name as ID`);
    return wellName;
  }

  async createEscalation(wellName, valveId, failureDetails, userInitiated = false, wellId = null) {
    console.log('Current escalations:', this.escalations);
    if (!wellName) {
      console.error('Error: Cannot create escalation without a well name');
      showTemporaryMessage('Failed to create escalation: Missing well name', 'error');
      return null;
    }
    if (!wellId) {
      const wellObject = window.wells.find(w => w.name === wellName);
      if (wellObject && wellObject.id) {
        wellId = wellObject.id;
        console.log(`Found well ID ${wellId} for well name ${wellName}`);
      }
    }

    const userEmail = window.AuthService.currentUserData?.email || 'system';
    const userRole = window.AuthService.currentUserData?.role || '';

    const escalation = {
      id: `ESC-${Date.now()}-${window.escalationIdCounter++}`,
      wellName,
      wellId,
      valveId,
      failureDetails,
      status: 'open',
      priority: this.getPriorityFromTrafficLight(failureDetails.trafficLight),
      createdAt: new Date(),
      createdBy: userEmail,
      creatorRole: userRole,
      userInitiated,
      escalatedTo: this.determineSuperior(userRole),
      comments: [],
      acknowledgedAt: null,
      resolvedAt: null,
      dispensationRequestedAt: null,
      dispensationApprovedAt: null,
      dispensationDeniedAt: null,
      dispensationApprovedBy: null,
      dispensationDeniedBy: null
    };

    this.escalations.push(escalation);
    console.log(`Created escalation ${escalation.id} for well ${wellName} (ID: ${wellId}), valve ${valveId} by ${userEmail} (${userRole})`, escalation);

    this.updateDashboardEscalationIndicators();
    await this.sendEscalationToDatabase(escalation);

    return escalation;
  }

  async sendEscalationToDatabase(escalation) {
    try {
      const backendData = {
        failureCode: escalation.failureDetails.failureCode,
        matrixCategory: escalation.failureDetails.matrixCategory,
        failureDescription: escalation.failureDetails.failureReason,
        requiredAction: escalation.failureDetails.matrixDescription,
        createdBy: escalation.createdBy,
        createdAt: new Date().toISOString(),
        status: escalation.status,
        dispensationStatus: escalation.status.includes('dispensation') ? escalation.status : null,
        comments: escalation.comments
      };

      console.log('Attempting to save escalation:', backendData);
      const response = await fetch(`http://10.226.112.186:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(backendData)
      });

      console.log('Raw API Response:', response);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database error:', { status: response.status, statusText: response.statusText, error: errorText });
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Escalation saved successfully:', responseData);
      return true;
    } catch (error) {
      console.error('Failed to save escalation:', { wellName: escalation.wellName, error: error.message });
      return false;
    }
  }

  _prepareDataForBackend(escalation) {
    return {
      wellId: escalation.wellId,
      valveId: escalation.valveId,
      failure_code: escalation.failureDetails.failureCode,
      matrix_category: escalation.failureDetails.matrixCategory,
      failure_description: escalation.failureDetails.failureReason,
      required_action: escalation.failureDetails.matrixDescription,
      escalationId: escalation.id,
      status: escalation.status,
      priority: escalation.priority,
      escalatedTo: escalation.escalatedTo,
      createdBy: escalation.createdBy,
      comments: escalation.comments
    };
  }

  async updateEscalationInDatabase(escalation) {
    try {
      if (!escalation.wellId) throw new Error('Escalation is missing well ID');

      const backendData = this._prepareDataForBackend(escalation);
      console.log(`Updating escalation in database for well ID: ${escalation.wellId}`);

      const response = await fetch(`http://10.226.112.186:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Database update error: ${response.status}`, errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      console.log('Escalation updated successfully');
      return true;
    } catch (error) {
      console.error(`Failed to update escalation for well ${escalation.wellName}:`, error);
      return false;
    }
  }

  async acknowledgeEscalation(id, comment = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (esc) {
      esc.acknowledgedAt = new Date();
      esc.status = 'acknowledged';
      if (comment) {
        esc.comments.push({
          text: comment,
          author: window.AuthService.currentUserData?.email || 'system',
          timestamp: new Date()
        });
      }
      this.updateDashboardEscalationIndicators();
      await this.updateEscalationInDatabase(esc);
    }
  }

  async resolveEscalation(id, resolution = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (esc) {
      esc.resolvedAt = new Date();
      esc.status = 'resolved';
      if (resolution) {
        esc.comments.push({
          text: `Resolution: ${resolution}`,
          author: window.AuthService.currentUserData?.email || 'system',
          timestamp: new Date()
        });
      }
      this.updateDashboardEscalationIndicators();
      await this.updateEscalationInDatabase(esc);
    }
  }

  async requestRetest(id, comment = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (esc) {
      esc.status = 'retest-requested';
      const retestComment = `Re-test requested. ${comment ? `Comment: ${comment}` : ''}`;
      esc.comments.push({
        text: retestComment,
        author: window.AuthService.currentUserData?.email || 'system',
        timestamp: new Date()
      });
      esc.escalatedTo = esc.creatorRole;
      this.updateDashboardEscalationIndicators();
      await this.updateEscalationInDatabase(esc);
      console.log(`Re-test requested for escalation ${id} by ${esc.comments[esc.comments.length - 1].author}`);
    }
  }

  // NEW: Request dispensation
  async requestDispensation(id, comment = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (esc) {
      esc.status = 'dispensation-pending';
      esc.dispensationRequestedAt = new Date();
      esc.escalatedTo = 'admin';

      const dispComment = `Dispensation requested. ${comment ? `Comment: ${comment}` : ''}`;
      esc.comments.push({
        text: dispComment,
        author: window.AuthService.currentUserData?.email || 'supervisor',
        timestamp: new Date()
      });

      this.updateDashboardEscalationIndicators();
      await this.updateEscalationInDatabase(esc);
      showTemporaryMessage('Dispensation request sent to admin.', 'info');
    }
  }

  // NEW: Admin approves dispensation
  async approveDispensation(id, comment = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (esc && window.AuthService.currentUserData?.role === 'admin') {
      esc.status = 'dispensation-approved';
      esc.dispensationApprovedAt = new Date();
      esc.dispensationApprovedBy = window.AuthService.currentUserData?.email;

      const appComment = `Dispensation approved. ${comment ? `Comment: ${comment}` : ''}`;
      esc.comments.push({
        text: appComment,
        author: esc.dispensationApprovedBy,
        timestamp: new Date()
      });

      this.updateDashboardEscalationIndicators();
      await this.updateEscalationInDatabase(esc);
      showTemporaryMessage('Dispensation approved.', 'success');
    }
  }

  // NEW: Admin denies dispensation
  async denyDispensation(id, comment = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (esc && window.AuthService.currentUserData?.role === 'admin') {
      esc.status = 'dispensation-denied';
      esc.dispensationDeniedAt = new Date();
      esc.dispensationDeniedBy = window.AuthService.currentUserData?.email;

      const denyComment = `Dispensation denied. ${comment ? `Comment: ${comment}` : ''}`;
      esc.comments.push({
        text: denyComment,
        author: esc.dispensationDeniedBy,
        timestamp: new Date()
      });

      this.updateDashboardEscalationIndicators();
      await this.updateEscalationInDatabase(esc);
      showTemporaryMessage('Dispensation denied.', 'warning');
    }
  }

  getPriorityFromTrafficLight(trafficLight) {
    const priorityMap = { 'red': 'critical', 'orange': 'high', 'yellow': 'medium', 'green': 'low' };
    return priorityMap[trafficLight] || 'medium';
  }

  determineSuperior(userRole = null) {
    const role = userRole || window.AuthService.currentUserData?.role;
    const dms = window.decisionMakers?.decisionMakers;
    if (!role || !dms) return 'supervisor';

    const currentUserDM = dms.find(dm => dm.role === role);
    const currentUserLevel = currentUserDM ? currentUserDM.level : -1;
    if (currentUserLevel === -1) {
      console.warn(`User role "${role}" not found in decision makers list.`);
      return 'supervisor';
    }

    const superior = dms
      .filter(dm => dm.level > currentUserLevel)
      .sort((a, b) => a.level - b.level)[0];

    return superior ? superior.role : role;
  }

  addCommentToEscalation(escalationId, comment) {
    const escalation = this.escalations.find(e => e.id === escalationId);
    if (escalation && comment) {
      escalation.comments.push({
        text: comment,
        author: window.AuthService.currentUserData?.email || 'user',
        timestamp: new Date()
      });
      this.updateEscalationInDatabase(escalation);
    }
  }

  getActiveEscalationsForWell(wellName) {
    return this.escalations.filter(e =>
      e.wellName === wellName &&
      e.status !== 'resolved' &&
      !e.status.includes('denied')
    );
  }

  getEscalationForValve(wellName, valveId) {
    return this.escalations.find(e =>
      e.wellName === wellName &&
      e.valveId === valveId &&
      e.status !== 'resolved' &&
      !e.status.includes('denied')
    );
  }

  updateDashboardEscalationIndicators() {
    const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
    if (typeof renderFilteredDashboard === 'function') {
      renderFilteredDashboard(currentFilter);
    }
    updateEscalationButtonCount();
  }
}

// Initialize
window.escalationSystem = window.escalationSystem || new EscalationSystem();

function getTrafficLightFromCode(failureCode) {
  if (!window.wellFailureModel) return 'red';
  const action = window.wellFailureModel.getMitigatingAction(failureCode);
  return action ? action.trafficLight : 'red';
}

// =================== DASHBOARD UI MODIFICATIONS ===================

function _buildEscalationManagementSection(existingEscalation) {
  let actionsHtml = '';
  let statusHtml = '';
  const currentUser = window.AuthService.currentUserData;
  const isAdmin = currentUser?.role === 'admin';
  const isSupervisor = ['supervisor', 'manager'].includes(currentUser?.role);
  const isEscalatedToCurrentUser = existingEscalation && existingEscalation.escalatedTo === currentUser?.role;

  const originText = existingEscalation?.creatorRole
    ? `Created by: ${existingEscalation.creatorRole}`
    : `Created by: ${existingEscalation?.createdBy}`;

  if (existingEscalation) {
    if (existingEscalation.status === 'retest-requested') {
      const retestComment = existingEscalation.comments?.slice().pop();
      const commentHtml = retestComment ? `
        <li style="margin-top: 8px;">
          <strong>Supervisor's Comment:</strong>
          <em style="display: block; background: #fff; padding: 8px; border-radius: 3px; margin-top: 4px;">"${retestComment.text}"</em>
        </li>` : '<li>Please perform the test again.</li>';

      statusHtml = `
        <div style="background: #cce5ff; border-left: 4px solid #007bff; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <strong>🔁 Re-test Requested</strong><br>
          <ul style="margin: 8px 0 0 20px; font-size: 0.9em;">${commentHtml}</ul>
        </div>`;
    } else if (existingEscalation.status === 'dispensation-pending') {
      statusHtml = `
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <strong>📄 Dispensation Requested</strong><br>
          <ul style="margin: 8px 0 0 20px; font-size: 0.9em;">
            <li>Status: <strong>Pending Admin Approval</strong></li>
            <li>Requested by: ${existingEscalation.comments.slice().pop().author}</li>
          </ul>
        </div>`;
    } else if (existingEscalation.status === 'dispensation-approved') {
      statusHtml = `
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <strong>✅ Dispensation Approved</strong>
        </div>`;
    } else if (existingEscalation.status === 'dispensation-denied') {
      statusHtml = `
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <strong>❌ Dispensation Denied</strong>
        </div>`;
    } else {
      statusHtml = `
        <div style="background: #e2f0d9; border-left: 4px solid #548235; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <strong>✅ Escalated</strong><br>
          <ul style="margin: 8px 0 0 20px; font-size: 0.9em;">
            <li>Status: <strong>${existingEscalation.status}</strong></li>
            <li>${originText}</li>
            <li>Timestamp: ${new Date(existingEscalation.createdAt).toLocaleString()}</li>
          </ul>
        </div>`;
    }

    if (!isAdmin) {
      if (existingEscalation.status === 'open' && isEscalatedToCurrentUser) {
        actionsHtml = `<button id="acknowledgeBtn">Acknowledge</button>`;
      } else if (existingEscalation.status === 'acknowledged' && isEscalatedToCurrentUser) {
        actionsHtml = `<button id="resolveBtn">Resolve</button>`;
      } else if (existingEscalation.status === 'open' || existingEscalation.status === 'acknowledged') {
        actionsHtml = `<button id="requestRetestBtn">Request Re-Test</button>`;
      }

      if (isSupervisor && existingEscalation.status === 'acknowledged') {
        actionsHtml += `<button id="requestDispensationBtn">Request Dispensation</button>`;
      }

      if (actionsHtml) {
        const placeholder = existingEscalation.status === 'acknowledged' ? 'Comment required for dispensation...' : 'Add comment...';
        actionsHtml += `<textarea id="escalationComment" placeholder="${placeholder}" style="width:100%; height:60px; margin-top:10px;"></textarea>`;
      }
    } else if (isAdmin && existingEscalation.status === 'dispensation-pending') {
      actionsHtml = `
        <button id="approveDispensationBtn" style="background:#28a745;">Approve Dispensation</button>
        <button id="denyDispensationBtn" style="background:#dc3545;">Deny Dispensation</button>
        <textarea id="escalationComment" placeholder="Add comment..." style="width:100%; height:60px; margin-top:10px;"></textarea>`;
    }

    actionsHtml += `<button id="viewAllEscalationsBtn">View All Escalations</button>`;
  } else if (!isAdmin) {
    statusHtml = `<div style="background: #fff3cd; padding:12px; margin-bottom:12px;">⚠️ Escalate this failure</div>`;
    actionsHtml = `<button id="escalateBtn">Escalate to Superior</button>`;
  }

  return `
    <div style="border-top:1px solid #eee; padding-top:20px;">
      <h4>🚨 Escalation Management</h4>
      ${statusHtml}
      <div style="display:flex;flex-direction:column;gap:10px;">${actionsHtml}</div>
    </div>`;
}

function showDetailedFailureModal(ringInfo, wellName) {
  console.log("Opening failure modal for", wellName, ringInfo);
  const existingModal = document.getElementById('failureDetailModal');
  if (existingModal) existingModal.remove();

  const existingEscalation = window.escalationSystem.getEscalationForValve(wellName, ringInfo.valveId);
  const backdrop = document.createElement('div');
  backdrop.id = 'failureDetailModal';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.75); z-index: 2000; display: flex;
    align-items: center; justify-content: center; backdrop-filter: blur(5px);
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
    width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
    position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    border-top: 5px solid ${getColorForCode(ringInfo.failureCode)};
  `;

  const mitigatingAction = window.wellFailureModel?.getMitigatingAction(ringInfo.failureCode);
  const matrixFailure = getMatrixFailureDetails(ringInfo.matrixCategory, ringInfo.failureNumber);
  const escalationManagementHtml = _buildEscalationManagementSection(existingEscalation);

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 1.5em;">Failure Details: ${ringInfo.label} (${wellName})</h3>
      <button id="closeModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px;">
      <div><h4 style="margin: 0 0 8px 0;">Failure Code & Category</h4><p style="margin: 0;">Code ${ringInfo.failureCode} (${formatCategoryName(ringInfo.matrixCategory)})</p></div>
      <div><h4 style="margin: 0 0 8px 0;">Traffic Light Status</h4><p style="margin: 0; text-transform: capitalize; font-weight: bold; color: ${getColorForCode(ringInfo.failureCode)};">${mitigatingAction ? mitigatingAction.trafficLight.toUpperCase() : 'Unknown'}</p></div>
    </div>
    <div style="margin-bottom: 20px;"><h4 style="margin: 0 0 8px 0;">Matrix Failure Description:</h4><p style="margin: 0; line-height: 1.5;">${matrixFailure ? matrixFailure.description : 'Description not available'}</p></div>
    <div style="margin-bottom: 20px;"><h4 style="margin: 0 0 8px 0;">Required Action:</h4><div style="background: #f5f5f5; padding: 12px; border-radius: 4px; line-height: 1.5;">${mitigatingAction ? mitigatingAction.description : 'Action not defined'}</div></div>
    <div style="margin-bottom: 20px;"><h4 style="margin: 0 0 8px 0;">Specific Test Failure Reason:</h4><p style="margin: 0; font-style: italic;">${ringInfo.message.split(' - Code')[0]}</p></div>
    ${escalationManagementHtml}
    <div style="text-align: right; margin-top: 24px; border-top: 1px solid #eee; padding-top: 15px;">
      <button id="closeModalBtn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('closeModalBtn').onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // --- DYNAMIC EVENT LISTENERS ---
  const commentEl = document.getElementById('escalationComment');
  const escalateBtn = document.getElementById('escalateBtn');
  if (escalateBtn) {
    escalateBtn.onclick = () => {
      const comment = commentEl?.value.trim() || '';
      const failureDetails = {
        failureReason: ringInfo.message,
        failureCode: ringInfo.failureCode,
        matrixCategory: ringInfo.matrixCategory,
        trafficLight: getTrafficLightFromCode(ringInfo.failureCode),
        matrixDescription: mitigatingAction ? mitigatingAction.description : 'Action required',
        wellType: getWellTypeKey(wellName),
        timestamp: new Date().toISOString()
      };
      const escalation = window.escalationSystem.createEscalation(wellName, ringInfo.valveId, failureDetails, true);
      if (escalation && comment) {
        window.escalationSystem.addCommentToEscalation(escalation.id, comment);
      }
      showTemporaryMessage(`Failure for ${wellName} escalated successfully!`, 'success');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const acknowledgeBtn = document.getElementById('acknowledgeBtn');
  if (acknowledgeBtn) {
    acknowledgeBtn.onclick = () => {
      const comment = commentEl?.value.trim() || '';
      window.escalationSystem.acknowledgeEscalation(existingEscalation.id, comment);
      showTemporaryMessage('Escalation acknowledged!', 'info');
      closeModal();
    };
  }

  const resolveBtn = document.getElementById('resolveBtn');
  if (resolveBtn) {
    resolveBtn.onclick = () => {
      const comment = commentEl?.value.trim() || '';
      window.escalationSystem.resolveEscalation(existingEscalation.id, comment);
      showTemporaryMessage('Escalation resolved!', 'success');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const requestRetestBtn = document.getElementById('requestRetestBtn');
  if (requestRetestBtn) {
    requestRetestBtn.onclick = () => {
      const comment = commentEl?.value.trim();
      if (!comment) {
        showTemporaryMessage('A comment is required to request a re-test.', 'error');
        if (commentEl) {
          commentEl.style.border = '2px solid red';
          commentEl.focus();
        }
        return;
      }
      window.escalationSystem.requestRetest(existingEscalation.id, comment);
      showTemporaryMessage('Re-test requested!', 'info');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const requestDispensationBtn = document.getElementById('requestDispensationBtn');
  if (requestDispensationBtn) {
    requestDispensationBtn.onclick = () => {
      const comment = commentEl?.value.trim();
      if (!comment) {
        showTemporaryMessage('A comment is required to request dispensation.', 'error');
        if (commentEl) {
          commentEl.style.border = '2px solid red';
          commentEl.focus();
        }
        return;
      }
      window.escalationSystem.requestDispensation(existingEscalation.id, comment);
      showTemporaryMessage('Dispensation requested!', 'info');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const approveDispensationBtn = document.getElementById('approveDispensationBtn');
  if (approveDispensationBtn) {
    approveDispensationBtn.onclick = () => {
      const comment = commentEl?.value.trim() || '';
      window.escalationSystem.approveDispensation(existingEscalation.id, comment);
      showTemporaryMessage('Dispensation approved!', 'success');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const denyDispensationBtn = document.getElementById('denyDispensationBtn');
  if (denyDispensationBtn) {
    denyDispensationBtn.onclick = () => {
      const comment = commentEl?.value.trim() || '';
      window.escalationSystem.denyDispensation(existingEscalation.id, comment);
      showTemporaryMessage('Dispensation denied!', 'warning');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const viewAllBtn = document.getElementById('viewAllEscalationsBtn');
  if (viewAllBtn) {
    viewAllBtn.onclick = () => {
      showEscalationManagementModal();
    };
  }
}

function showEscalationManagementModal(wellName = null) {
  const existingModal = document.getElementById('escalationManagementModal');
  if (existingModal) existingModal.remove();

  const escalations = wellName
    ? window.escalationSystem.getActiveEscalationsForWell(wellName)
    : window.escalationSystem.escalations.filter(e => !e.status.includes('resolved') && !e.status.includes('denied'));

  const currentUser = window.AuthService.currentUserData;
  const isAdmin = currentUser?.role === 'admin';

  const backdrop = document.createElement('div');
  backdrop.id = 'escalationManagementModal';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); z-index: 2000; display: flex;
    align-items: center; justify-content: center;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white; border-radius: 8px; padding: 24px; max-width: 800px;
    max-height: 80vh; overflow-y: auto; position: relative;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  const escalationRows = escalations.map(esc => {
    let actions = '';
    const isEscalatedToCurrentUser = currentUser && esc.escalatedTo === currentUser.role;

    if (!isAdmin) {
      if (esc.status === 'open' && isEscalatedToCurrentUser) {
        actions = `<button onclick="window.escalationSystem.acknowledgeEscalation('${esc.id}', 'Acknowledged by supervisor')" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Acknowledge</button>`;
      } else if (esc.status === 'acknowledged' && isEscalatedToCurrentUser) {
        actions = `<button onclick="window.escalationSystem.resolveEscalation('${esc.id}', 'Issue resolved')" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Resolve</button>`;
      } else if (esc.status === 'retest-requested') {
        actions = `<span style="color: #17a2b8;">Awaiting re-test</span>`;
      }
    }

    if (isAdmin && esc.status === 'dispensation-pending') {
      actions = `
        <button onclick="window.escalationSystem.approveDispensation('${esc.id}', 'Approved')" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; margin-right: 4px;">Approve</button>
        <button onclick="window.escalationSystem.denyDispensation('${esc.id}', 'Denied')" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Deny</button>
      `;
    }

    const statusColor = esc.status.includes('dispensation') ? '#ffc107' :
                        esc.status === 'retest-requested' ? '#17a2b8' : '#6c757d';

    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; font-weight: bold;">${esc.id}</td>
        <td style="padding: 8px;">${esc.wellName}</td>
        <td style="padding: 8px;">${esc.valveId}</td>
        <td style="padding: 8px;"><span style="background: ${getPriorityColor(esc.priority)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${esc.priority.toUpperCase()}</span></td>
        <td style="padding: 8px;"><span style="color: ${statusColor}; text-transform: capitalize;">${esc.status.replace('-', ' ')}</span></td>
        <td style="padding: 8px;">${esc.creatorRole || esc.createdBy}</td>
        <td style="padding: 8px;">${new Date(esc.createdAt).toLocaleString()}</td>
        <td style="padding: 8px;">${actions}</td>
      </tr>
    `;
  }).join('');

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="margin: 0; color: #333;">Escalation Management ${wellName ? `- ${wellName}` : ''}</h3>
      <button id="closeEscalationModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
    </div>
    <p style="color: #666; margin-top:0;">Active escalations: <strong>${escalations.length}</strong></p>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">ID</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Well</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Valve</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Priority</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Status</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Created By</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Created</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Actions</th>
          </tr>
        </thead>
        <tbody>${escalationRows || '<tr><td colspan="8" style="padding: 20px; text-align: center; color: #666;">No active escalations</td></tr>'}</tbody>
      </table>
    </div>
    <div style="text-align: right; margin-top: 20px;">
      <button id="closeEscalationModalBtn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  document.getElementById('closeEscalationModal').onclick = closeModal;
  document.getElementById('closeEscalationModalBtn').onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
}

function getPriorityColor(priority) {
  const colors = { 'critical': '#dc3545', 'high': '#fd7e14', 'medium': '#ffc107', 'low': '#28a745' };
  return colors[priority] || '#6c757d';
}

function addEscalationIndicatorToWell(wellDiv, wellName) {
  const activeEscalations = window.escalationSystem.getActiveEscalationsForWell(wellName);
  if (activeEscalations.length > 0) {
    const badgeColor = '#dc3545';
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute; top: 5px; right: 5px; background: ${badgeColor}; color: white;
      border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center;
      justify-content: center; font-size: 12px; font-weight: bold; z-index: 10;
      border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);
    `;
    badge.textContent = activeEscalations.length;
    badge.title = `${activeEscalations.length} active escalation(s)`;
    wellDiv.style.position = 'relative';
    wellDiv.appendChild(badge);
  }
}

function addEscalationManagementButton() {
  const filterContainer = document.getElementById('dashboardFilterContainer');
  if (filterContainer && !document.getElementById('globalEscalationBtn')) {
    const escalationBtn = document.createElement('button');
    escalationBtn.id = 'globalEscalationBtn';
    escalationBtn.style.cssText = `
      background: #dc3545; color: white; border: none; padding: 8px 12px;
      border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 10px;
    `;
    escalationBtn.title = 'View and manage all escalations';
    escalationBtn.onclick = () => showEscalationManagementModal();
    filterContainer.appendChild(escalationBtn);
    updateEscalationButtonCount();
  }
}

function updateEscalationButtonCount() {
  const btn = document.getElementById('globalEscalationBtn');
  if (btn) {
    const activeCount = window.escalationSystem.escalations.filter(e => 
      e.status !== 'resolved' && !e.status.includes('denied')
    ).length;
    btn.innerHTML = `🚨 Escalations (${activeCount})`;
  }
}

// Make functions globally available
window.escalationSystem = window.escalationSystem;
window.showEscalationManagementModal = showEscalationManagementModal;
window.addEscalationIndicatorToWell = addEscalationIndicatorToWell;
window.addEscalationManagementButton = addEscalationManagementButton;
window.updateEscalationButtonCount = updateEscalationButtonCount;