// =================== ESCALATION SYSTEM ADDITION ===================

// Add escalation tracking to globals
window.activeEscalations = window.activeEscalations || [];
window.escalationIdCounter = window.escalationIdCounter || 1;

// Escalation data structure
class EscalationSystem {
  constructor() {
    this.escalations = window.activeEscalations;
  }

 
  // Update the createEscalation method to validate inputs
  // 1. Fix the _getWellIdFromName function to properly extract well IDs
  _getWellIdFromName(wellName) {
    // Handle undefined/null case
    if (!wellName) {
      console.error('Cannot get well ID - well name is undefined');
      return null;
    }
    
    // Look up the well in the global wells array to get the ID
    const wellObj = window.wells.find(w => w.name === wellName);
    if (wellObj && wellObj.id) {
      console.log(`Found well ID ${wellObj.id} for well name ${wellName}`);
      return wellObj.id;
    }
    
    // Fallback: try to extract ID from name if it follows a pattern
    const idMatch = wellName.match(/(\d+)$/);
    if (idMatch) {
      console.log(`Extracted numeric ID ${idMatch[1]} from well name ${wellName}`);
      return idMatch[1];
    }
    
    // Final fallback: use the name as ID with a warning
    console.warn(`Could not find ID for well ${wellName}, using name as ID`);
    return wellName;
  }

  // 2. Fix the createEscalation method to store both name and ID
  // =================== MODIFIED ESCALATION SYSTEM ===================

  // Update the createEscalation method to track the origin rather than destination
  async createEscalation(wellName, valveId, failureDetails, userInitiated = false, wellId = null) {
    // Validate required inputs
    if (!wellName) {
      console.error('Error: Cannot create escalation without a well name');
      showTemporaryMessage('Failed to create escalation: Missing well name', 'error');
      return null;
    }
    
    // If wellId wasn't provided, try to get it from the wells list
    if (!wellId) {
      const wellObject = window.wells.find(w => w.name === wellName);
      if (wellObject && wellObject.id) {
        wellId = wellObject.id;
        console.log(`Found well ID ${wellId} for well name ${wellName}`);
      }
    }
    
    // Get the current user
    const userEmail = window.AuthService.currentUserData?.email || 'system';
    const userRole = window.AuthService.currentUserData?.role || '';
    
    const escalation = {
      id: `ESC-${Date.now()}-${window.escalationIdCounter++}`,
      wellName,
      wellId, // Store the well ID for database operations
      valveId,
      failureDetails,
      status: 'open',
      priority: this.getPriorityFromTrafficLight(failureDetails.trafficLight),
      createdAt: new Date(),
      createdBy: userEmail,
      creatorRole: userRole, // Store the role of the creator
      userInitiated,
      escalatedTo: this.determineSuperior(userRole), // Still need this for workflow logic
      comments: [],
      acknowledgedAt: null,
      resolvedAt: null
    };
    
    // Add to local array
    this.escalations.push(escalation);
    
    console.log(`Created escalation ${escalation.id} for well ${wellName} (ID: ${wellId}), valve ${valveId} by ${userEmail} (${userRole})`, escalation);
    
    // Update dashboard indicators
    this.updateDashboardEscalationIndicators();
    
    // Send to database
    await this.sendEscalationToDatabase(escalation);
    
    return escalation;
  }

  // 3. Fix sendEscalationToDatabase to use the well ID instead of name
  async sendEscalationToDatabase(escalation) {
    try {
      // Prepare the data in the exact format your API expects
      const backendData = {
        failureCode: escalation.failureDetails.failureCode,
        matrixCategory: escalation.failureDetails.matrixCategory,
        failureDescription: escalation.failureDetails.failureReason,
        requiredAction: escalation.failureDetails.matrixDescription,
        createdBy: escalation.createdBy,
        createdAt: new Date().toISOString(),
      };

      console.log('Attempting to save escalation:', backendData);

      const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(backendData)
      });

      // Log the raw response for debugging
      console.log('Raw API Response:', response);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Escalation saved successfully:', responseData);
      return true;

    } catch (error) {
      console.error('Failed to save escalation:', {
        wellName: escalation.wellName,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  // 5. Update _prepareDataForBackend to include wellId
  _prepareDataForBackend(escalation) {
    const { failureDetails } = escalation;
    
    return {
      wellId: escalation.wellId, // Use stored wellId
      valveId: escalation.valveId,
      failure_code: failureDetails.failureCode,
      matrix_category: failureDetails.matrixCategory,
      failure_description: failureDetails.failureReason,
      required_action: failureDetails.matrixDescription,
      escalationId: escalation.id,
      status: escalation.status,
      priority: escalation.priority,
      escalatedTo: escalation.escalatedTo,
      createdBy: escalation.createdBy
    };
  }

  // 5. Fix updateEscalationInDatabase to also use wellId
  async updateEscalationInDatabase(escalation) {
    try {
      if (!escalation.wellId) {
        throw new Error('Escalation is missing well ID');
      }
      
      const backendData = this._prepareDataForBackend(escalation);
      
      console.log(`Updating escalation in database for well ID: ${escalation.wellId}`);
      
      // FIX: Changed method to 'POST' and parameter to 'well' to match the working create endpoint.
      const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
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

      // Update dashboard indicators
      this.updateDashboardEscalationIndicators();

      // Send the updated escalation to the backend
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

      // Update dashboard indicators
      this.updateDashboardEscalationIndicators();

      // Send the updated escalation to the backend
      await this.updateEscalationInDatabase(esc);
    }
  }

  // NEW: Method for supervisors to request a re-test
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
      
      // A re-test request should be escalated back to the operator who created it
      esc.escalatedTo = esc.creatorRole;

      this.updateDashboardEscalationIndicators();
      await this.updateEscalationInDatabase(esc);
      console.log(`Re-test requested for escalation ${id} by ${esc.comments[esc.comments.length - 1].author}`);
    }
  }


  getPriorityFromTrafficLight(trafficLight) {
    const priorityMap = {
      'red': 'critical',
      'orange': 'high',
      'yellow': 'medium',
      'green': 'low'
    };
    return priorityMap[trafficLight] || 'medium';
  }

  determineSuperior(userRole = null) {
    // Use the provided userRole or get it from the authentication service
    const role = userRole || window.AuthService.currentUserData?.role;
    const dms = window.decisionMakers?.decisionMakers;

    if (!role || !dms) {
      return 'supervisor'; // Fallback if data is missing
    }

    // 1. Find the current user's level in the decision-maker hierarchy
    const currentUserDM = dms.find(dm => dm.role === role);
    const currentUserLevel = currentUserDM ? currentUserDM.level : -1;

    if (currentUserLevel === -1) {
        console.warn(`User role "${role}" not found in decision makers list.`);
        return 'supervisor'; // Sensible fallback
    }

    // 2. Find the person at the next level up
    const superior = dms
      .filter(dm => dm.level > currentUserLevel)
      .sort((a, b) => a.level - b.level)[0]; // Get the one with the lowest level greater than current

    if (superior) {
      return superior.role;
    }

    // 3. If no one is higher, they are at the top. Return their own role.
    return role;
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
      (e.status === 'open' || e.status === 'acknowledged' || e.status === 'retest-requested')
    );
  }

  getEscalationForValve(wellName, valveId) {
    return this.escalations.find(e => 
      e.wellName === wellName && 
      e.valveId === valveId && 
      (e.status === 'open' || e.status === 'acknowledged' || e.status === 'retest-requested')
    );
  }

  updateDashboardEscalationIndicators() {
    // Trigger dashboard re-render to show escalation indicators
    const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
    if (typeof renderFilteredDashboard === 'function') {
      renderFilteredDashboard(currentFilter);
    }
  }
}
// Helper function to get traffic light from failure code
function getTrafficLightFromCode(failureCode) {
  if (!window.wellFailureModel) return 'red';
  const action = window.wellFailureModel.getMitigatingAction(failureCode);
  return action ? action.trafficLight : 'red';
}
// Initialize escalation system
window.escalationSystem = window.escalationSystem || new EscalationSystem();

// Check if escalation is needed (prevent duplicates)
function checkIfShouldEscalate(wellName, valveId, failureDetails) {
  const existing = window.escalationSystem.escalations.find(e => 
    e.wellName === wellName && 
    e.valveId === valveId && 
    (e.status === 'open' || e.status === 'acknowledged') &&
    e.failureDetails.failureCode === failureDetails.failureCode
  );
  
  return !existing && failureDetails.trafficLight === 'red';
}

// =================== DASHBOARD UI MODIFICATIONS ===================

/**
 * Builds the HTML for the Escalation Management section of the failure modal.
 * This function determines which actions are available to the current user.
 * @param {object} existingEscalation - The escalation object, or null if none exists.
 * @returns {string} - The HTML string for the escalation section.
 */
/**
 * Builds the HTML for the Escalation Management section of the failure modal.
 * This function determines which actions are available to the current user based on their role.
 * @param {object} existingEscalation - The escalation object, or null if none exists.
 * @returns {string} - The HTML string for the escalation section.
 */
function _buildEscalationManagementSection(existingEscalation) {
  let actionsHtml = '';
  let statusHtml = '';
  
  const currentUser = window.AuthService.currentUserData;
  console.log("Building escalation section. Current user:", currentUser);
  
  if (!currentUser) {
    console.warn("No user data available when building escalation UI");
  }
  
  const isAdmin = currentUser?.role === 'admin';
  const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'manager';

  if (existingEscalation) {
    const originText = existingEscalation.creatorRole 
      ? `Created by: ${existingEscalation.creatorRole}` 
      : `Created by: ${existingEscalation.createdBy}`;

    statusHtml = `
      <div style="background: #e2f0d9; border-left: 4px solid #548235; padding: 12px; border-radius: 4px; margin-bottom: 12px; color: #333;">
        <strong style="font-size: 1.1em;">✅ This failure has been escalated.</strong><br>
        <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 0.9em; list-style-position: inside;">
          <li><strong>${originText}</strong></li>
          <li><strong>Timestamp:</strong> ${new Date(existingEscalation.createdAt).toLocaleString()}</li>
        </ul>
      </div>
    `;

    if (!isAdmin) {
      actionsHtml = `
        <button id="acknowledgeBtn" style="background: #28a745; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1;">Acknowledge</button>
      `;
      if (isSupervisor) {
        actionsHtml += `
          <button id="requestRetestBtn" style="background: #17a2b8; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1; margin-top: 10px;">
            Request Re-Test
          </button>
        `;
      }
      const placeholder = isSupervisor ? 'Add a comment (required for re-test)...' : 'Add an optional comment...';
      actionsHtml += `<textarea id="escalationComment" placeholder="${placeholder}" style="width: 100%; box-sizing: border-box; height: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit; margin-top: 10px;"></textarea>`;
    } else {
      actionsHtml = `
        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; color: #495057; font-style: italic;">
          As an admin, you don't need to manage escalations directly. 
          You can approve or deny deviation/dispensation requests through the admin panel.
        </div>
      `;
      const pendingCount = window.deviationSystem?.getPendingDeviations()?.length || 0;
      if (pendingCount > 0) {
        actionsHtml += `
          <button id="adminDeviationPanelBtn" style="margin-top: 12px; background: #dc3545; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">
            Review Pending Deviations (${pendingCount})
          </button>
        `;
      }
    }
  } else if (!isAdmin) {
    statusHtml = `
      <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
        <strong>⚠️ Action Required:</strong> This failure has not been escalated yet.
      </div>
    `;
    actionsHtml = `
      <button id="escalateBtn" style="background: #dc3545; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1;">
        Escalate to Superior
      </button>
      <textarea id="escalationComment" placeholder="Add an optional comment before escalating..." style="width: 100%; box-sizing: border-box; height: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit; margin-top: 10px;"></textarea>
    `;
  } else {
    statusHtml = `
      <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
        <strong>ℹ️ Information:</strong> This failure has not been escalated yet.
      </div>
    `;
    actionsHtml = `
      <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; color: #495057; font-style: italic;">
        As an admin, you don't need to create escalations. 
        You are responsible for approving or denying deviation/dispensation requests.
      </div>
    `;
  }

  const viewAllBtn = !isAdmin ? 
    `<button id="viewAllEscalationsBtn" title="View all active escalations" style="background: #6c757d; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer;">
      View All Escalations
    </button>` : '';

  return `
    <div style="border-top: 1px solid #eee; padding-top: 20px;">
      <h4 style="margin: 0 0 12px 0; font-size: 1.2em;">🚨 Escalation Management</h4>
      ${statusHtml}
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px;">
        ${actionsHtml}
        ${viewAllBtn}
      </div>
    </div>
  `;
}
async function showDetailedFailureModal(ringInfo, wellName) {
  console.log("Opening failure modal for", wellName, ringInfo);
  const existingModal = document.getElementById('failureDetailModal');
  if (existingModal) existingModal.remove();

  // Use exactly what is sent to backend: wellId from window.wells, ringInfo.valveId
  const wellId = (Array.isArray(window.wells) ? window.wells.find(w => w.name === wellName) : null)?.id;
  const valveId = ringInfo?.valveId;

  if (!wellId || !valveId) {
    console.warn('Missing wellId or valveId for fetching escalation', { wellName, wellId, valveId });
    showTemporaryMessage('Unable to load escalation: missing well/valve identifier', 'error');
    return;
  }

  // Fetch the escalation record from backend (display-only)
  let record = null;
  try {
    const resp = await fetch(`http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(wellId)}&valve=${encodeURIComponent(valveId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (resp.ok) {
      const data = await resp.json();
     
      record = Array.isArray(data) ? data[data.length - 1] : data;
     
    } else {
      console.warn('Failed to fetch escalation from DB', resp.status, await resp.text().catch(() => ''));
    }
  } catch (e) {
    console.warn('Error fetching escalation from DB', e);
  }

  

  // Map strictly to backend fields (no status usage)
  const failureCode = record?.failureCode ?? record?.code ?? 'N/A';
  const matrixCategory = record?.matrixCategory ?? record?.matrix_category ?? 'N/A';
  const failureDescription = record?.failureDescription ?? record?.description ?? 'N/A';
  const requiredAction = record?.requiredAction ?? record?.required_action ?? 'N/A';
  const createdBy = record?.createdBy ?? record?.created_by ?? window.AuthService.currentUserData?.email ?? 'N/A';
  const createdAt = record?.created_at ?? record?.createdAt ?? null;
  const escalationId = record?.escalationId ?? record?.id ?? 'N/A';


  
  // Build DB-backed object (omit any status)
  const dbEscalation = record ? {
    id: escalationId,
    wellName,
    wellId,
    valveId,
    createdAt,

    creatorRole: record?.creatorRole || '',
    escalatedTo: record?.escalatedTo || '',
    comments: record?.comments || [],
    failureDetails: {
      failureCode,
      matrixCategory,
      failureReason: failureDescription,
      matrixDescription: requiredAction
    }
  } : null;

  const backdrop = document.createElement('div');
  backdrop.id = 'failureDetailModal';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.75); z-index: 2000; display: flex;
    align-items: center; justify-content: center; backdrop-filter: blur(5px);
  `;

  const barColor = (typeof getColorForCode === 'function' && failureCode !== 'N/A')
    ? getColorForCode(failureCode)
    : '#6c757d';

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
    width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
    position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    border-top: 5px solid ${barColor};
  `;

  const mitigatingAction = typeof window.wellFailureModel?.getMitigatingAction === 'function'
    ? window.wellFailureModel.getMitigatingAction(failureCode)
    : null;

  const infoBlock = record ? `
    <div style="background: #e2f0d9; border-left: 4px solid #548235; padding: 12px; border-radius: 4px; margin-bottom: 12px; color: #333;">
      <strong style="font-size: 1.1em;">Escalation Info</strong><br>
      <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 0.9em; list-style-position: inside;">
        <li><strong>ID:</strong> ${escalationId}</li>
        <li><strong>Created By:</strong> ${createdBy}</li>
        <li><strong>Timestamp:</strong> ${createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</li>
      </ul>
    </div>
  ` : `
    <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
      <strong>No escalation record found for this well/valve.</strong>
    </div>
  `;

  const escalationManagementHtml = _buildEscalationManagementSection(dbEscalation);

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 1.5em;">Failure Details: ${ringInfo.label} (${wellName})</h3>
      <button id="closeModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
    </div>

    ${infoBlock}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px;">
      <div>
        <h4 style="margin: 0 0 8px 0;">Failure Code & Category</h4>
        <p style="margin: 0;">Code ${failureCode} (${typeof formatCategoryName === 'function' ? formatCategoryName(matrixCategory) : matrixCategory})</p>
      </div>
      <div>
        <h4 style="margin: 0 0 8px 0;">Traffic Light Status</h4>
        <p style="margin: 0; text-transform: capitalize; font-weight: bold; color: ${barColor};">
          ${mitigatingAction ? (mitigatingAction.trafficLight || 'Unknown').toUpperCase() : 'UNKNOWN'}
        </p>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0;">Matrix Failure Description:</h4>
      <p style="margin: 0; line-height: 1.5;">${failureDescription}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0;">Required Action:</h4>
      <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; line-height: 1.5;">${requiredAction}</div>
    </div>

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

  // --- Event handlers (no status updates sent) ---
  const commentEl = document.getElementById('escalationComment');

  // Escalate (if shown)
  const escalateBtn = document.getElementById('escalateBtn');
  if (escalateBtn) {
    escalateBtn.onclick = async () => {
      const comment = commentEl?.value.trim() || '';
      const action = window.wellFailureModel?.getMitigatingAction?.(ringInfo.failureCode);
      const failureDetails = {
        failureReason: ringInfo.message,
        failureCode: ringInfo.failureCode,
        matrixCategory: ringInfo.matrixCategory,
        trafficLight: action?.trafficLight || 'red',
        matrixDescription: action?.description || 'Action required',
        wellType: typeof getWellTypeKey === 'function' ? getWellTypeKey(wellName) : '',
        timestamp: new Date().toISOString()
      };
      const created = await window.escalationSystem.createEscalation(wellName, valveId, failureDetails, true);
      if (created && comment) {
        window.escalationSystem.addCommentToEscalation(created.id, comment);
      }
      showTemporaryMessage(`Failure for ${wellName} escalated successfully!`, 'success');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  // Acknowledge: add optional comment, update DB, then auto-open deviation
  const acknowledgeBtn = document.getElementById('acknowledgeBtn');
  if (acknowledgeBtn && dbEscalation) {
// inside showDetailedFailureModal, after you fetched `record` from /failure
    acknowledgeBtn.onclick = async () => {
      const comment = document.getElementById('escalationComment')?.value.trim() || '';
      // send your escalation update to backend here (no status fields)
      if (comment) { /* optionally send comment to backend if supported */ }
      closeModal();
      // open deviation form using the backend failure id only
      window.deviationSystem.showDeviationRequestForm(record.id);
    };
  }

  // Request Re-Test: require comment, add comment, update DB
  const requestRetestBtn = document.getElementById('requestRetestBtn');
  if (requestRetestBtn && dbEscalation) {
    requestRetestBtn.onclick = async () => {
      const comment = commentEl?.value.trim();
      if (!comment) {
        showTemporaryMessage('A comment is required to request a re-test.', 'error');
        if (commentEl) {
          commentEl.style.border = '2px solid red';
          commentEl.focus();
        }
        return;
      }
      const update = {
        ...dbEscalation,
        comments: [
          ...(dbEscalation.comments || []),
          { text: `Re-test requested. Comment: ${comment}`, author: window.AuthService?.currentUserData?.email || 'system', timestamp: new Date() }
        ]
      };
      await window.escalationSystem.updateEscalationInDatabase(update);
      showTemporaryMessage('Re-test requested!', 'info');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const viewAllBtn = document.getElementById('viewAllEscalationsBtn');
  if (viewAllBtn && typeof window.escalationSystem.showManagementModal === 'function') {
    viewAllBtn.onclick = () => window.escalationSystem.showManagementModal();
  } else if (viewAllBtn) {
    viewAllBtn.onclick = () => showEscalationManagementModal();
  }

  const createDeviationBtn = document.getElementById('createDeviationBtn');
  if (createDeviationBtn && window.deviationSystem && dbEscalation) {
    createDeviationBtn.onclick = () => window.deviationSystem.showDeviationRequestForm(dbEscalation.id);
  }

  const viewDeviationsBtn = document.getElementById('viewDeviationsBtn');
  if (viewDeviationsBtn && window.deviationSystem && dbEscalation) {
    viewDeviationsBtn.onclick = () => window.deviationSystem.showDeviationsForEscalation(dbEscalation.id);
  }

  const adminDeviationPanelBtn = document.getElementById('adminDeviationPanelBtn');
  if (adminDeviationPanelBtn && window.deviationSystem) {
    adminDeviationPanelBtn.onclick = () => window.deviationSystem.showDeviationAdminPanel();
  }
  
}
// Update the showEscalationManagementModal function to show who created the escalation
function showEscalationManagementModal(wellName = null) {
  const existingModal = document.getElementById('escalationManagementModal');
  if (existingModal) existingModal.remove();
  
  const escalations = wellName 
    ? window.escalationSystem.getActiveEscalationsForWell(wellName)
    : window.escalationSystem.escalations.filter(e => e.status !== 'resolved');
  
  const currentUser = window.AuthService.currentUserData;
  const isAdmin = currentUser?.role === 'admin';
  console.log("Showing escalation management modal. Current user:", currentUser);

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
    console.log(`Checking escalation ${esc.id}: to ${esc.escalatedTo}, user role ${currentUser?.role}, match: ${isEscalatedToCurrentUser}`);

    if (!isAdmin) {
      if (esc.status === 'open' && isEscalatedToCurrentUser) {
        actions = `<button onclick="window.escalationSystem.acknowledgeEscalation('${esc.id}', 'Acknowledged by supervisor')" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Acknowledge</button>`;
      } else if (esc.status === 'acknowledged' && isEscalatedToCurrentUser) {
        actions = `<button onclick="window.escalationSystem.resolveEscalation('${esc.id}', 'Issue resolved')" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Resolve</button>`;
      }
    }

    // Check if there are any deviations for this escalation
    const deviations = window.deviationSystem ? window.deviationSystem.getDeviationsForEscalation(esc.id) : [];
    const hasDeviations = deviations && deviations.length > 0;
    
    // Add deviation indicator if any exist
    const deviationIndicator = hasDeviations ? 
      `<span onclick="window.deviationSystem.showDeviationsForEscalation('${esc.id}')" 
        style="margin-left: 5px; background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; 
        font-size: 11px; cursor: pointer;" title="This escalation has deviations">
        DEV: ${deviations.length}
      </span>` : '';
      
    // Add deviation button for supervisors
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'manager') {
      if (esc.status === 'open' || esc.status === 'acknowledged') {
        const hasActiveDeviation = deviations.some(d => d.status === 'approved' || d.status === 'pending');
        if (!hasActiveDeviation) {
          actions += ` <button onclick="window.deviationSystem.showDeviationRequestForm('${esc.id}')" style="background: #ff9800; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; margin-left: 5px;">Create Deviation</button>`;
        }
      }
    }
    
    // For admins, add button to directly review deviations if they exist
    if (isAdmin && hasDeviations) {
      actions = `<button onclick="window.deviationSystem.showDeviationsForEscalation('${esc.id}')" style="background: #ff9800; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Review Deviations</button>`;
    }
    
    // Display status with a specific color for 'retest-requested'
    const statusColor = esc.status === 'retest-requested' ? '#17a2b8' : '#6c757d';

    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; font-weight: bold;">${esc.id} ${deviationIndicator}</td>
        <td style="padding: 8px;">${esc.wellName}</td>
        <td style="padding: 8px;">${esc.valveId}</td>
        <td style="padding: 8px;"><span style="background: ${getPriorityColor(esc.priority)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${esc.priority.toUpperCase()}</span></td>
        <td style="padding: 8px;"><span style="color: ${statusColor}; text-transform: capitalize;">${esc.status}</span></td>
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
      ${isAdmin ? `
        <button id="adminDeviationPanelBtn" style="background: #ff9800; color: white; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 4px; cursor: pointer;">
          Review Pending Deviations (${window.deviationSystem ? window.deviationSystem.getPendingDeviations().length : 0})
        </button>
      ` : ''}
      <button id="closeEscalationModalBtn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;
  
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  const closeModal = () => backdrop.remove();
  
  document.getElementById('closeEscalationModal').onclick = closeModal;
  document.getElementById('closeEscalationModalBtn').onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
  
  // Add event listener for admin deviation panel button if it exists
  const adminDeviationPanelBtn = document.getElementById('adminDeviationPanelBtn');
  if (adminDeviationPanelBtn && window.deviationSystem) {
    adminDeviationPanelBtn.onclick = () => {
      window.deviationSystem.showDeviationAdminPanel();
    };
  }
}


/**
 * Determines the failure category and number from valve test results
 * using the well failure matrix for accurate categorization.
 * 
 * @param {Object} testResult - The valve test result data
 * @returns {Object} An object with category and number properties
 */
function getFailureCategoryAndNumber(testResult) {
  if (!testResult) {
    return { category: null, number: null };
  }

  // If the test passed, return null values
  if (testResult.pass === true) {
    return { category: null, number: null };
  }

  // Get the current well type from global context
  const wellName = window.currentWellContext?.name;
  const well = window.wells.find(w => w.name === wellName);
  const wellType = well ? getWellTypeKey(well.type) : 'Producer'; // Fallback to Producer

  // Get valve type
  const valveType = testResult.valve_type || '';
  const valveId = testResult.valve_id || '';
  
  // Extract failure information
  const failureReasons = testResult.failure_reasons || [];
  const isLeakRateExceeded = failureReasons.some(reason => 
    reason.includes('leak rate') || reason.includes('exceed')
  );
  
  // Determine if this is a surface or subsurface valve
  const isSubsurfaceValve = valveType.toUpperCase() === 'SCSSV';
  
  // Check if multiple valves failed (need to determine from global context)
  const multipleValvesFailed = checkForMultipleFailedValves(wellName);

  // Initialize with null values
  let category = null;
  let number = null;

  // Step 1: Determine the category
  if (isSubsurfaceValve) {
    category = multipleValvesFailed ? 'multipleSubSurfaceFailures' : 'singleSubSurfaceFailure';
  } else {
    category = multipleValvesFailed ? 'multipleSurfaceFailures' : 'singleSurfaceFailure';
  }

  // Step 2: Find the appropriate failure number by searching through the matrix
  if (category && window.wellFailureMatrix[category]) {
    // Get all entries in the selected category
    const categoryEntries = window.wellFailureMatrix[category];
    
    // Find the most appropriate failure description based on valve type
    for (const [failureNum, failureData] of Object.entries(categoryEntries)) {
      const description = failureData.description.toLowerCase();
      const valveTypeUpper = valveType.toUpperCase();
      
      // Match based on valve type
      if (description.includes(valveTypeUpper)) {
        number = parseInt(failureNum);
        break;
      }
      
      // For SCSSV and leak rate failures
      if (isSubsurfaceValve && isLeakRateExceeded && 
          description.includes('completion leak') && description.includes('above allowable leak rate')) {
        number = parseInt(failureNum);
        break;
      }
    }
    
    // If still not found, use first available number as fallback
    if (number === null && Object.keys(categoryEntries).length > 0) {
      number = parseInt(Object.keys(categoryEntries)[0]);
    }
  }

  console.log(`Dynamically categorized failure for ${valveType} as ${category}:${number}`, failureReasons);
  return { category, number };
}

/**
 * Helper function to check if multiple valves have failed for the well
 * @param {string} wellName - The name of the well to check
 * @returns {boolean} True if multiple valves have failed tests
 */
function checkForMultipleFailedValves(wellName) {
  if (!wellName || !window.valveTestResults || !window.valveTestResults[wellName]) {
    return false;
  }
  
  const wellResults = window.valveTestResults[wellName];
  let failedValveCount = 0;
  
  for (const valveId in wellResults) {
    if (wellResults.hasOwnProperty(valveId)) {
      const tests = wellResults[valveId];
      if (!Array.isArray(tests) || tests.length === 0) continue;
      
      // Check most recent test result
      const latestTest = tests[tests.length - 1];
      if (latestTest && latestTest.pass === false) {
        failedValveCount++;
      }
    }
  }
  
  return failedValveCount > 1;
}

// Helper functions for escalation display
function getPriorityColor(priority) {
  const colors = {
    'critical': '#dc3545',
    'high': '#fd7e14',
    'medium': '#ffc107',
    'low': '#28a745'
  };
  return colors[priority] || '#6c757d';
}

// =================== DASHBOARD VISUAL INDICATORS ===================

/**
 * Adds a color-coded escalation indicator to the well circle on the dashboard.
 * - Red: At least one 'open' escalation.
 * - Orange: All active escalations are 'acknowledged'.
 * - Blue: At least one escalation has a 'retest-requested' status.
 * @param {HTMLElement} wellDiv - The div element for the well.
 * @param {string} wellName - The name of the well.
 */
function addEscalationIndicatorToWell(wellDiv, wellName) {
  const activeEscalations = window.escalationSystem.getActiveEscalationsForWell(wellName);
  
if (activeEscalations.length > 0) {
    // Always use red for escalation indicators
    const badgeColor = '#dc3545'; // Red color
    const titleText = `${activeEscalations.length} active escalation(s)`;

    const badge = document.createElement('div');


    
    badge.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: ${badgeColor};
      color: white;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      z-index: 10;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.5);
    `;
    badge.textContent = activeEscalations.length;
    badge.title = titleText;
    
    wellDiv.style.position = 'relative';
    wellDiv.appendChild(badge);
  }
}


// Add global escalation management button to dashboard
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

// NEW: Update the button text anytime escalations change
function updateEscalationButtonCount() {
  const btn = document.getElementById('globalEscalationBtn');
  if (btn) {
    const activeCount = window.escalationSystem.escalations.filter(e => e.status !== 'resolved').length;
    btn.innerHTML = `🚨 Escalations (${activeCount})`;
  }
}

// Helper to format the date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

// Debug function to show current user info
function debugShowCurrentUser() {
  const user = window.AuthService.currentUserData;
  console.log("Current user from AuthService:", user);
  return user;
}

// Make functions available globally for debugging
window.escalationSystem = window.escalationSystem;
window.showEscalationManagementModal = showEscalationManagementModal;
window.addEscalationIndicatorToWell = addEscalationIndicatorToWell;
window.addEscalationManagementButton = addEscalationManagementButton;
window.updateEscalationButtonCount = updateEscalationButtonCount;
window.debugShowCurrentUser = debugShowCurrentUser;