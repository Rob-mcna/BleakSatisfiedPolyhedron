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
  console.log('Current escalations:', this.escalations);
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

      const response = await fetch(`http://10.226.113.68:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`, {
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
      const response = await fetch(`http://10.226.113.68:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`, {
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
async createDispensationRequest(escalationId, description, justification, expiryDate) {
  const escalation = this.escalations.find(e => e.id === escalationId);
  if (!escalation) {
    console.error(`Cannot create dispensation - escalation ${escalationId} not found`);
    return null;
  }

  if (!description || !justification || !expiryDate) {
    console.error('Error: Cannot create dispensation without required fields');
    showTemporaryMessage('Failed to create dispensation: Missing required fields', 'error');
    return null;
  }

  escalation.dispensationRequest = {
    description,
    justification,
    expiryDate: new Date(expiryDate),
    requestedBy: window.AuthService?.currentUserData?.email || 'unknown',
    requestedAt: new Date()
  };
  escalation.status = 'pending';
  escalation.dispensationDescription = description;
  escalation.dispensationJustification = justification;
  escalation.dispensationExpiryDate = new Date(expiryDate);

  console.log(`Created dispensation request for escalation ${escalationId}`, escalation);
  this.updateDashboardEscalationIndicators();
  await this.sendEscalationToDatabase(escalation);
  return escalation;
}

// Approve a dispensation request
async approveDispensation(escalationId, comment = '') {
  const escalation = this.escalations.find(e => e.id === escalationId);
  if (escalation && escalation.status === 'pending') {
    escalation.status = 'approved';
    escalation.dispensationApprovedAt = new Date();
    escalation.dispensationApprovedBy = window.AuthService?.currentUserData?.email || 'admin';
    
    if (comment) {
      escalation.comments.push({
        text: `Dispensation approved: ${comment}`,
        author: window.AuthService?.currentUserData?.email || 'admin',
        timestamp: new Date()
      });
    }

    this.notifyDispensationDecision(escalation, 'approved', comment);
    this.updateDashboardEscalationIndicators();
    await this.sendEscalationToDatabase(escalation);
    return true;
  }
  return false;
}

// Deny a dispensation request
async denyDispensation(escalationId, comment = '') {
  const escalation = this.escalations.find(e => e.id === escalationId);
  if (escalation && escalation.status === 'pending') {
    escalation.status = 'denied';
    escalation.dispensationApprovedAt = new Date();
    escalation.dispensationApprovedBy = window.AuthService?.currentUserData?.email || 'admin';
    
    if (comment) {
      escalation.comments.push({
        text: `Dispensation denied: ${comment}`,
        author: window.AuthService?.currentUserData?.email || 'admin',
        timestamp: new Date()
      });
    }

    this.notifyDispensationDecision(escalation, 'denied', comment);
    this.updateDashboardEscalationIndicators();
    await this.sendEscalationToDatabase(escalation);
    return true;
  }
  return false;
}

getPendingDispensations() {
  return this.escalations.filter(e => e.status === 'pending');
}

// Get dispensations for a well
getDispensationsForWell(wellName) {
  return this.escalations.filter(e => e.wellName === wellName && e.dispensationRequest);
}

// Check if user can create dispensations
canCreateDispensations() {
  const userRole = window.AuthService?.currentUserData?.role;
  if (!userRole) return false;
  return ['supervisor', 'manager'].includes(userRole);
}

// Check if user can approve dispensations
canApproveDispensations() {
  const userRole = window.AuthService?.currentUserData?.role;
  if (!userRole) return false;
  return ['admin'].includes(userRole);
}

// Notify dispensation decision
notifyDispensationDecision(escalation, decision, comment) {
  const decision_text = decision === 'approved' ? 'approved' : 'denied';
  const message = `Dispensation request ${decision_text} for well ${escalation.wellName}`;
  showTemporaryMessage(message, decision === 'approved' ? 'success' : 'warning');
  
  const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
  if (typeof renderFilteredDashboard === 'function') {
    renderFilteredDashboard(currentFilter);
  }
}

updateAdminDispensationBadge() {
  const pendingCount = this.getPendingDispensations().length;
  const isAdmin = this.canApproveDispensations();
  
  if (isAdmin && pendingCount > 0) {
    let notifBadge = document.getElementById('adminDispensationBadge');
    if (!notifBadge) {
      const headerArea = document.querySelector('header') || document.querySelector('.navbar');
      if (headerArea) {
        notifBadge = document.createElement('div');
        notifBadge.id = 'adminDispensationBadge';
        notifBadge.style.cssText = `
          position: absolute;
          top: 10px;
          right: 20px;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          padding: 5px 10px;
          font-weight: bold;
          cursor: pointer;
          z-index: 100;
        `;
        notifBadge.addEventListener('click', () => this.showDispensationAdminPanel());
        headerArea.appendChild(notifBadge);
      }
    }
    if (notifBadge) {
      notifBadge.textContent = pendingCount;
      notifBadge.title = `${pendingCount} dispensation request${pendingCount !== 1 ? 's' : ''} pending approval`;
      notifBadge.style.display = 'block';
    }
  } else {
    const badge = document.getElementById('adminDispensationBadge');
    if (badge) badge.style.display = 'none';
  }
}

updateAdminDispensationBadge() {
  const pendingCount = this.getPendingDispensations().length;
  const isAdmin = this.canApproveDispensations();
  
  if (isAdmin && pendingCount > 0) {
    let notifBadge = document.getElementById('adminDispensationBadge');
    if (!notifBadge) {
      const headerArea = document.querySelector('header') || document.querySelector('.navbar');
      if (headerArea) {
        notifBadge = document.createElement('div');
        notifBadge.id = 'adminDispensationBadge';
        notifBadge.style.cssText = `
          position: absolute;
          top: 10px;
          right: 20px;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          padding: 5px 10px;
          font-weight: bold;
          cursor: pointer;
          z-index: 100;
        `;
        notifBadge.addEventListener('click', () => this.showDispensationAdminPanel());
        headerArea.appendChild(notifBadge);
      }
    }
    if (notifBadge) {
      notifBadge.textContent = pendingCount;
      notifBadge.title = `${pendingCount} dispensation request${pendingCount !== 1 ? 's' : ''} pending approval`;
      notifBadge.style.display = 'block';
    }
  } else {
    const badge = document.getElementById('adminDispensationBadge');
    if (badge) badge.style.display = 'none';
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


    showDispensationRequestForm(escalationId) {
    const escalation = window.escalationSystem.escalations.find(e => e.id === escalationId);
    if (!escalation) {
      console.error(`Cannot show dispensationform - escalation ${escalationId} not found`);
      return;
    }
    
    const existingModal = document.getElementById('dispensationRequestModal');
    if (existingModal) existingModal.remove();
    
    const backdrop = document.createElement('div');
    backdrop.id = 'dispensationRequestModal';
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 2100; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(5px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
      width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;
      position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
      border-top: 5px solid #ff9800;
    `;
    
    // Calculate minimum expiry date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minExpiryDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Calculate default expiry date (30 days from now)
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    const defaultExpiryDate = defaultExpiry.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.5em;">Create Dispensation Request</h3>
        <button id="closeDispensationModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
      </div>
      
      <div style="margin-bottom: 20px; background: #fff3cd; padding: 12px; border-radius: 4px; border-left: 4px solid #ff9800;">
        <p style="margin: 0; font-weight: bold;">How Dispensation Requests Work:</p>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          <li>Your request will be sent to an admin for review</li>
          <li>Once submitted, a pending indicator will appear on the well</li>
          <li>When approved or denied, the well indicator will update automatically</li>
          <li>You will be notified of the decision</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 15px; background: #f8f9fa; padding: 12px; border-radius: 4px; border-left: 4px solid #007bff;">
        <p style="margin: 0; font-size: 0.9em;">Creating dispensation request for <strong>${escalation.wellName}</strong>, Valve <strong>${escalation.valveId}</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;"><strong>Escalation:</strong> ${escalation.id}</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div>
          <label for="dispensationDescription" style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
          <textarea id="dispensationDescription" placeholder="Describe the dispensation needed..." 
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; resize: vertical;"></textarea>
        </div>
        <div>
          <label for="dispensationJustification" style="display: block; margin-bottom: 5px; font-weight: bold;">Justification:</label>
          <textarea id="dispensationJustification" placeholder="Explain why this dispensation is necessary..." 
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; resize: vertical;"></textarea>
        </div>
        <div>
          <label for="dispensationExpiry" style="display: block; margin-bottom: 5px; font-weight: bold;">Expiry Date:</label>
          <input type="date" id="dispensationExpiry" min="${minExpiryDate}" value="${defaultExpiryDate}" 
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <p style="margin: 5px 0 0; font-size: 0.8em; color: #666;">Specify how long this dispensation should remain in effect</p>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 24px; padding-top: 15px; border-top: 1px solid #eee;">
        <button id="cancelDispensationBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="submitDispensationBtn" style="background: #ff9800; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Submit for Approval</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const closeModal = () => backdrop.remove();
    document.getElementById('closeDispensationModal').onclick = closeModal;
    document.getElementById('cancelDispensationBtn').onclick = closeModal;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

    // Handle form submission
    document.getElementById('submitDispensationBtn').onclick = async () => {
      const description = document.getElementById('dispensationDescription').value.trim();
      const justification = document.getElementById('dispensationJustification').value.trim();
      const expiryDate = document.getElementById('dispensationExpiry').value;
      
      if (!description || !justification || !expiryDate) {
        showTemporaryMessage('Please fill all required fields', 'error');
        return;
      }
      
      const dispensation = await this.createDispensationRequest(escalationId, description, justification, expiryDate);
      
      if (dispensation) {
        showTemporaryMessage('Dispensation request submitted for approval', 'success');
        closeModal();
        
        // Refresh the dashboard to show the new indicator
        const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
        if (typeof renderFilteredDashboard === 'function') {
          renderFilteredDashboard(currentFilter);
        }
      } else {
        showTemporaryMessage('Failed to create dispensation request', 'error');
      }
    };
  }

  showDispensationAdminPanel() {
    const existingModal = document.getElementById('dispensationAdminModal');
    if (existingModal) existingModal.remove();
    // Get pending dispensations that need review
    const pendingDispensations = this.getPendingDispensations();
    // Also get recently decided dispensations (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentlyDecidedDispensations = this.escalations
      .filter(e => e.status && e.status !== 'pending')
      .filter(e => e.dispensationApprovedAt && new Date(e.dispensationApprovedAt) > oneWeekAgo);
    const backdrop = document.createElement('div');
    backdrop.id = 'dispensationAdminModal';
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 2100; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(5px);
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
      width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;
      position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
      border-top: 5px solid #dc3545;
    `;
    // Create HTML for pending dispensations
    let pendingDispensationsHtml = '';
    if (pendingDispensations.length === 0) {
      pendingDispensationsHtml = `
        <div style="text-align: center; padding: 30px 20px; background: #f8f9fa; border-radius: 4px;">
          <p style="margin: 0; color: #6c757d; font-style: italic;">No pending dispensation requests to review</p>
        </div>
      `;
    } else {
      pendingDispensations.forEach((dispensation, index) => {
        pendingDispensationsHtml += `
          <div id="dispensation-${dispensation.id}" class="dispensation-card" style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
            <div style="background: #fff3cd; padding: 12px; border-bottom: 1px solid #ddd;">
              <h4 style="margin: 0; color: #856404;">⏳ Pending Dispensation Request #${index + 1}</h4>
              <p style="margin: 5px 0 0; font-size: 0.9em; color: #666;">Submitted by ${dispensation.createdBy} (${dispensation.creatorRole}) on ${new Date(dispensation.createdAt).toLocaleString()}</p>
            </div>
            <div style="padding: 15px;">
              <div style="margin-bottom: 10px;">
                <p style="margin: 0; font-size: 0.9em;"><strong>Well:</strong> ${dispensation.wellName} - Valve ${dispensation.valveId}</p>
                <p style="margin: 3px 0 0; font-size: 0.9em;"><strong>Related Escalation:</strong> ${dispensation.escalationId}</p>
                <p style="margin: 3px 0 0; font-size: 0.9em;"><strong>Requested Expiry Date:</strong> ${new Date(dispensation.expiryDate).toLocaleDateString()}</p>
              </div>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                <h5 style="margin: 0 0 8px 0; color: #495057;">Description:</h5>
                <p style="margin: 0; white-space: pre-wrap;">${dispensation.description}</p>
              </div>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px;">
                <h5 style="margin: 0 0 8px 0; color: #495057;">Justification:</h5>
                <p style="margin: 0; white-space: pre-wrap;">${dispensation.justification}</p>
              </div>
              <div style="margin-top: 15px;">
                <label for="comment-${dispensation.id}" style="display: block; margin-bottom: 5px; font-weight: bold;">Decision Comments (required):</label>
                <textarea id="comment-${dispensation.id}" placeholder="Add comments about your decision..."
                  style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px; resize: vertical;"></textarea>
                <p style="margin: 5px 0 0; font-size: 0.8em; color: #dc3545;">* Comments are required when making a decision</p>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
                <button onclick="handleDenyDispensation('${dispensation.id}')"
                  style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                  Deny Request
                </button>
                <button onclick="handleApproveDispensation('${dispensation.id}')"
                  style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }
    // Create HTML for recently decided dispensations
    let recentDecisionsHtml = '';
    if (recentlyDecidedDispensations.length > 0) {
      recentDecisionsHtml = `
        <h4 style="margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #ddd;">Recent Decisions</h4>
      `;
      recentlyDecidedDispensations.forEach((dispensation) => {
        const isApproved = dispensation.status === 'approved';
        const statusBg = isApproved ? '#d4edda' : '#f8d7da';
        const statusColor = isApproved ? '#155724' : '#721c24';
        const statusIcon = isApproved ? '✓' : '✗';
        const statusText = isApproved ? 'Approved' : 'Denied';
        recentDecisionsHtml += `
          <div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
            <div style="background: ${statusBg}; padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; display: flex; justify-content: space-between;">
              <div>
                <strong>${statusIcon} ${statusText}</strong> - Well ${dispensation.wellName}, Valve ${dispensation.valveId}
              </div>
              <div style="font-size: 0.9em;">
                Decision: ${new Date(dispensation.approvedAt).toLocaleString()}
              </div>
            </div>
            <div style="padding: 10px; font-size: 0.9em;">
              <p style="margin: 0 0 5px 0;"><strong>Requestor:</strong> ${dispensation.createdBy} (${dispensation.creatorRole})</p>
              <p style="margin: 0 0 5px 0;"><strong>Decision by:</strong> ${dispensation.approvedBy}</p>
              ${dispensation.comments && dispensation.comments.length > 0 ? 
                `<p style="margin: 0;"><strong>Comment:</strong> ${dispensation.comments[dispensation.comments.length-1].text}</p>` : 
                '<p style="margin: 0; color: #6c757d; font-style: italic;">No comments provided</p>'
              }
            </div>
          </div>
        `;
      });
    }
    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.5em;">Dispensation Request Management</h3>
        <button id="closeAdminModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
      </div>
      <p style="color: #666; margin-top: 0; margin-bottom: 20px;">
        <strong>${pendingDispensations.length}</strong> dispensation request${pendingDispensations.length !== 1 ? 's' : ''} pending your review.
      </p>
      <div>
        ${pendingDispensationsHtml}
        ${recentDecisionsHtml}
      </div>
      <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <button id="closeAdminBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    const closeModal = () => backdrop.remove();
    document.getElementById('closeAdminModal').onclick = closeModal;
    document.getElementById('closeAdminBtn').onclick = closeModal;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
    // Add global handlers for approve/deny
    window.handleApproveDispensation = (dispensationId) => {
      const commentEl = document.getElementById(`comment-${dispensationId}`);
      const comment = commentEl?.value?.trim() || '';
      if (!comment) {
        showTemporaryMessage('Please provide comments with your decision', 'error');
        commentEl.focus();
        return;
      }
      window.escalationSystem.approveDispensation(dispensationId, comment).then(() => {
        document.getElementById(`dispensation-${dispensationId}`).remove();
        showTemporaryMessage('Dispensation request approved', 'success');
        // Check if we should close the modal (no more pending items)
        if (window.escalationSystem.getPendingDispensations().length === 0) {
          setTimeout(() => {
            const modal = document.getElementById('dispensationAdminModal');
            if (modal) modal.remove();
            // Refresh the dashboard
            const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
            if (typeof renderFilteredDashboard === 'function') {
              renderFilteredDashboard(currentFilter);
            }
          }, 1500);
        } else {
          // Refresh the modal to show in recent decisions
          window.escalationSystem.showDispensationAdminPanel();
        }
      });
    };
    window.handleDenyDispensation = (dispensationId) => {
      const commentEl = document.getElementById(`comment-${dispensationId}`);
      const comment = commentEl?.value?.trim() || '';
      if (!comment) {
        showTemporaryMessage('Please provide comments with your decision', 'error');
        commentEl.focus();
        return;
      }
      window.escalationSystem.denyDispensation(dispensationId, comment).then(() => {
        document.getElementById(`dispensation-${dispensationId}`).remove();
        showTemporaryMessage('Dispensation request denied', 'info');
        // Check if we should close the modal (no more pending items)
        if (window.escalationSystem.getPendingDispensations().length === 0) {
          setTimeout(() => {
            const modal = document.getElementById('dispensationAdminModal');
            if (modal) modal.remove();
            // Refresh the dashboard
            const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
            if (typeof renderFilteredDashboard === 'function') {
              renderFilteredDashboard(currentFilter);
            }
          }, 1500);
        } else {
          // Refresh the modal to show in recent decisions
          window.escalationSystem.showDispensationAdminPanel();
        }
      });
    };
  }
/**
 * Loads all dispensations from the database and restores them into the local system.
 * This ensures persistence across page refreshes.
 */


  // Show well dispensation summary
  showWellDispensationSummary(wellName) {
    // Get all dispensations for this well
    const dispensations = this.getDispensationsForWell(wellName);
    if (!dispensations || dispensations.length === 0) {
      showTemporaryMessage('No dispensations found for this well', 'info');
      return;
    }
    const existingModal = document.getElementById('wellDispensationSummaryModal');
    if (existingModal) existingModal.remove();
    const backdrop = document.createElement('div');
    backdrop.id = 'wellDispensationSummaryModal';
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 2100; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(5px);
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
      width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
      position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    `;
    // Sort dispensations with active/pending first, then by date
    const sortedDispensations = [...dispensations].sort((a, b) => {
      // First by status priority
      const statusPriority = { 'approved': 1, 'pending': 2, 'denied': 3 };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      // Then by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    let dispensationsHtml = '';
    sortedDispensations.forEach(dev => {
      const statusColor = dev.status === 'approved' ? '#28a745' : (dev.status === 'denied' ? '#dc3545' : '#ffc107');
      const statusIcon = dev.status === 'approved' ? '✓' : (dev.status === 'denied' ? '✗' : '⏳');
      const statusLabel = dev.status.charAt(0).toUpperCase() + dev.status.slice(1);
      dispensationsHtml += `
        <div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
          <div style="background: ${statusColor}; padding: 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; color: white;">
            <div>
              <span style="font-weight: bold;">${statusIcon} ${statusLabel}</span>
              ${dev.status === 'approved' ? `<span style="margin-left: 10px; font-size: 0.9em;">Valid until: ${new Date(dev.expiryDate).toLocaleDateString()}</span>` : ''}
            </div>
            <div style="font-size: 0.9em;">Created: ${new Date(dev.createdAt).toLocaleString()}</div>
          </div>
          <div style="padding: 12px; background: #f8f9fa;">
            <p style="margin: 0 0 8px 0;"><strong>Valve:</strong> ${dev.valveId}</p>
            <p style="margin: 0 0 8px 0;"><strong>Description:</strong> ${dev.description}</p>
            <p style="margin: 0 0 8px 0;"><strong>Justification:</strong> ${dev.justification}</p>
            ${dev.status !== 'pending' ? `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;">
                <p style="margin: 0 0 5px 0;"><strong>${dev.status === 'approved' ? 'Approved' : 'Denied'} by:</strong> ${dev.approvedBy || 'Unknown'}</p>
                <p style="margin: 0;"><strong>Decision date:</strong> ${dev.approvedAt ? new Date(dev.approvedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            ` : `
              <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;"><strong>⏳ Pending admin approval</strong></p>
              </div>
            `}
          </div>
          ${dev.comments && dev.comments.length > 0 ? `
            <div style="background: #fff; padding: 10px; border-top: 1px solid #ddd;">
              <h5 style="margin: 0 0 8px 0; font-size: 0.9em;">Comments:</h5>
              <ul style="margin: 0; padding: 0 0 0 20px; font-size: 0.9em;">
                ${dev.comments.map(c => `<li>${c.text} <span style="font-size: 0.8em; color: #666;">- ${c.author}, ${new Date(c.timestamp).toLocaleString()}</span></li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    });
    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.5em;">Dispensations for ${wellName}</h3>
        <button id="closeDispensationSummaryModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
      </div>
      <div style="margin-bottom: 15px; background: #f0f0f0; padding: 10px; border-radius: 4px;">
        <p style="margin: 0; font-size: 0.9em;"><strong>${sortedDispensations.length}</strong> dispensation record(s) for this well</p>
      </div>
      <div>
        ${dispensationsHtml}
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="closeDispensationSummaryBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    const closeModal = () => backdrop.remove();
    document.getElementById('closeDispensationSummaryModal').onclick = closeModal;
    document.getElementById('closeDispensationSummaryBtn').onclick = closeModal;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
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
  
  // Get the current user from the Auth Service
  const currentUser = window.AuthService.currentUserData;
  console.log("Building escalation section. Current user:", currentUser);
  
  if (!currentUser) {
    console.warn("No user data available when building escalation UI");
  }
  
  // Check if the user is admin (admins don't escalate, they only approve/deny dispensations)
  const isAdmin = currentUser?.role === 'admin';
  const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'manager';
  
  // Check if the user can take action on this escalation
  const isEscalatedToCurrentUser = existingEscalation && existingEscalation.escalatedTo === currentUser?.role;
  console.log(`Escalation to: ${existingEscalation?.escalatedTo}, Current role: ${currentUser?.role}, Match: ${isEscalatedToCurrentUser}`);

  // Check if user can create dispensations (supervisor or manager, but not admin)
  const canCreateDispensations = window.escalationSystem  && window.escalationSystem .canCreateDispensations();

  if (existingEscalation) {
    // Prepare the origin text (who created the escalation)
    const originText = existingEscalation.creatorRole 
      ? `Created by: ${existingEscalation.creatorRole}` 
      : `Created by: ${existingEscalation.createdBy}`;
    
    // Custom status message for re-test requests
        // Custom status message for re-test requests
    if (existingEscalation.status === 'retest-requested') {
        // Find the most recent comment, which should be the re-test request
        const retestComment = existingEscalation.comments?.slice().pop();
        let commentHtml = '<li>Please perform the test again and update the status.</li>';

        if (retestComment) {
            commentHtml = `
                <li style="margin-top: 8px;">
                    <strong>Supervisor's Comment:</strong>
                    <em style="display: block; background: #fff; padding: 8px; border-radius: 3px; margin-top: 4px;">"${retestComment.text}"</em>
                </li>
            `;
        }

        statusHtml = `
            <div style="background: #cce5ff; border-left: 4px solid #007bff; padding: 12px; border-radius: 4px; margin-bottom: 12px; color: #004085;">
                <strong style="font-size: 1.1em;">🔁 A re-test has been requested for this failure.</strong><br>
                <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 0.9em; list-style-position: inside;">
                    <li><strong>status:</strong> <span style="text-transform: capitalize;">Re-test Requested</span></li>
                    ${commentHtml}
                </ul>
            </div>
        `;
    } else {
  
        statusHtml = `
          <div style="background: #e2f0d9; border-left: 4px solid #548235; padding: 12px; border-radius: 4px; margin-bottom: 12px; color: #333;">
            <strong style="font-size: 1.1em;">✅ This failure has been escalated.</strong><br>
            <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 0.9em; list-style-position: inside;">
              <li><strong>status:</strong> <span style="text-transform: capitalize;">${existingEscalation.status}</span></li>
              <li><strong>${originText}</strong></li>
              <li><strong>Timestamp:</strong> ${new Date(existingEscalation.createdAt).toLocaleString()}</li>
            </ul>
          </div>
        `;
    }

    // Don't show escalation action buttons for admins
    if (!isAdmin) {
      if (existingEscalation.status === 'open' && isEscalatedToCurrentUser) {
        actionsHtml = `
          <button id="acknowledgeBtn" style="background: #28a745; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1;">Acknowledge</button>
        `;
      } else if (existingEscalation.status === 'acknowledged' && isEscalatedToCurrentUser) {
        actionsHtml = `
          <button id="resolveBtn" style="background: #007bff; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1;">Resolve</button>
        `;
      } else if (existingEscalation.status !== 'retest-requested') {
        actionsHtml = `
          <button disabled style="background: #999; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: not-allowed; font-weight: bold; flex-grow: 1;">
            Already Escalated
          </button>
        `;
      }

      // Add "Request Retest" button for supervisors if the escalation is open or acknowledged
      if (isSupervisor && (existingEscalation.status === 'open' || existingEscalation.status === 'acknowledged')) {
        actionsHtml += `
          <button id="requestRetestBtn" style="background: #17a2b8; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1; margin-top: 10px;">
            Request Re-Test
          </button>
        `;
      }

          
      if (canCreateDispensations && existingEscalation && !existingEscalation.dispensationRequest) {
      actionsHtml += `
        <button id="createDispensationBtn" style="background: #ff9800; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1; margin-top: 10px;">
          Request Dispensation
        </button>
      `;
    }

      
      // Add comment box if any action is possible
            // Add comment box if any action is possible
      if (actionsHtml) {
        const placeholder = (isSupervisor && (existingEscalation.status === 'open' || existingEscalation.status === 'acknowledged'))
          ? 'Add a comment (required for re-test)...'
          : 'Add an optional comment...';
        actionsHtml += `<textarea id="escalationComment" placeholder="${placeholder}" style="width: 100%; box-sizing: border-box; height: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit; margin-top: 10px;"></textarea>`;
      }

    } else {
      // For admins, show a message explaining they don't need to escalate
      actionsHtml = `
        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; color: #495057; font-style: italic;">
          As an admin, you don't need to manage escalations directly. 
          You can approve or deny dispensation/dispensation requests through the admin panel.
        </div>
      `;
    }
    
    // Add dispensationbutton for supervisors if an escalation exists
     // For admins, add quick access to dispensationmanagement
    if (isAdmin) {
      const pendingCount = window.escalationSystem ? window.escalationSystem.getPendingDispensations().length : 0;
      if (pendingCount > 0) {
        actionsHtml += `
          <button id="adminDispensationPanelBtn" style="margin-top: 12px; background: #dc3545; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">
            Review Pending Dispensations (${pendingCount})
          </button>
        `;
      }
    }
  } else if (!isAdmin) {
    // Only show escalation option for non-admins
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
    // For admins, show a message explaining they don't need to escalate
    statusHtml = `
      <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
        <strong>ℹ️ Information:</strong> This failure has not been escalated yet.
      </div>
    `;
    actionsHtml = `
      <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; color: #495057; font-style: italic;">
        As an admin, you don't need to create escalations. 
        You are responsible for approving or denying dispensation/dispensation requests.
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

/**
 * Displays a detailed modal for a specific valve failure.
 * It checks if the failure has already been escalated and updates the UI accordingly.
 *
 * @param {object} ringInfo - An object containing details about the failed ring (label, color, message, failureCode, etc.).
 * @param {string} wellName - The name of the well where the failure occurred.
 */
// Updated showDetailedFailureModal function with admin dispensationpanel access
function showDetailedFailureModal(ringInfo, wellName) {
  console.log("Opening failure modal for", wellName, ringInfo);
  const existingModal = document.getElementById('failureDetailModal');
  if (existingModal) existingModal.remove();

  const existingEscalation = window.escalationSystem.getEscalationForValve(wellName, ringInfo.valveId);
  
  // Log debugging info for escalation matching
  if (existingEscalation) {
    console.log("Found existing escalation:", existingEscalation);
    console.log("Current user:", window.AuthService.currentUserData);
  }

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
      <div><h4 style="margin: 0 0 8px 0;">Traffic Light status</h4><p style="margin: 0; text-transform: capitalize; font-weight: bold; color: ${getColorForCode(ringInfo.failureCode)};">${mitigatingAction ? mitigatingAction.trafficLight.toUpperCase() : 'Unknown'}</p></div>
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
        trafficLight: getTrafficLightFromCode(ringInfo.failureCode), // Use helper function
        matrixDescription: mitigatingAction ? mitigatingAction.description : 'Action required',
        wellType: getWellTypeKey(wellName), 
        timestamp: new Date().toISOString()
      };
      
      console.log("Creating escalation with details:", failureDetails);
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
      console.log("Acknowledging escalation:", existingEscalation.id);
      window.escalationSystem.acknowledgeEscalation(existingEscalation.id, comment);
      showTemporaryMessage('Escalation acknowledged!', 'info');
      closeModal();
      
      // Check if well has failure and open dispensationmodal if needed
      if (existingEscalation && existingEscalation.failureDetails) {
        console.log("Opening dispensationmodal after acknowledgment");
        // Small delay to ensure acknowledgment is processed first
        setTimeout(() => {
          window.escalationSystem .showDispensationRequestForm(existingEscalation.id);
        }, 300);
      } else {
        showTemporaryMessage('Acknowledged', 'info');
      }
    };
  }
  
  const resolveBtn = document.getElementById('resolveBtn');
  if (resolveBtn) {
    resolveBtn.onclick = () => {
      const comment = commentEl?.value.trim() || '';
      console.log("Resolving escalation:", existingEscalation.id);
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
        if(commentEl) {
            commentEl.style.border = '2px solid red';
            commentEl.focus();
        }
        return;
      }
      console.log("Requesting re-test for escalation:", existingEscalation.id);
      window.escalationSystem.requestRetest(existingEscalation.id, comment);
      showTemporaryMessage('Re-test requested!', 'info');
      closeModal();
      showDetailedFailureModal(ringInfo, wellName);
    };
  }

  const viewAllBtn = document.getElementById('viewAllEscalationsBtn');
  if(viewAllBtn && typeof window.escalationSystem.showManagementModal === 'function') {
      viewAllBtn.onclick = () => window.escalationSystem.showManagementModal();
  } else if (viewAllBtn) {
      viewAllBtn.onclick = () => showEscalationManagementModal();
  }
  
  // Dispensation button handlers
  const createDispensationBtn = document.getElementById('createDispensationBtn');
  if (createDispensationBtn && window.escalationSystem  && existingEscalation) {
    createDispensationBtn.onclick = () => {
      window.escalationSystem .showDispensationRequestForm(existingEscalation.id);
    };
  }
  
  const viewDispensationsBtn = document.getElementById('viewDispensationsBtn');
  if (viewDispensationsBtn && window.escalationSystem  && existingEscalation) {
    viewDispensationsBtn.onclick = () => {
      window.escalationSystem .showDispensationsForEscalation(existingEscalation.id);
    };
  }
  
  // Admin panel access
  const adminDispensationPanelBtn = document.getElementById('adminDispensationPanelBtn');
  if (adminDispensationPanelBtn && window.escalationSystem ) {
    adminDispensationPanelBtn.onclick = () => {
      window.escalationSystem .showDispensationAdminPanel();
    };
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

    // Check if there are any dispensations for this escalation
    const dispensations = window.escalationSystem  ? window.escalationSystem .getDispensationsForEscalation(esc.id) : [];
    const hasDispensations = dispensations && dispensations.length > 0;
    
    // Add dispensationindicator if any exist
    const dispensationIndicator = hasDispensations ? 
      `<span onclick="window.escalationSystem .showDispensationsForEscalation('${esc.id}')" 
        style="margin-left: 5px; background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; 
        font-size: 11px; cursor: pointer;" title="This escalation has dispensations">
        DIS: ${dispensations.length}
      </span>` : '';
      
    // Add dispensationbutton for supervisors
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'manager') {
      if (esc.status === 'open' || esc.status === 'acknowledged') {
        const hasActiveDispensation = dispensations.some(d => d.status === 'approved' || d.status === 'pending');
        if (!hasActiveDispensation) {
          actions += ` <button onclick="window.escalationSystem .showDispensationRequestForm('${esc.id}')" style="background: #ff9800; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; margin-left: 5px;">Create Dispensation</button>`;
        }
      }
    }
    
    // For admins, add button to directly review dispensations if they exist
    if (isAdmin && hasDispensations) {
      actions = `<button onclick="window.escalationSystem .showDispensationsForEscalation('${esc.id}')" style="background: #ff9800; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Review Dispensations</button>`;
    }
    
    // Display status with a specific color for 'retest-requested'
    const statusColor = esc.status === 'retest-requested' ? '#17a2b8' : '#6c757d';

    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; font-weight: bold;">${esc.id} ${dispensationIndicator}</td>
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
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">status</th>
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
        <button id="adminDispensationPanelBtn" style="background: #ff9800; color: white; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 4px; cursor: pointer;">
          Review Pending Dispensations (${window.escalationSystem  ? window.escalationSystem .pending().length : 0})
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
  
  // Add event listener for admin dispensationpanel button if it exists
  const adminDispensationPanelBtn = document.getElementById('adminDispensationPanelBtn');
  if (adminDispensationPanelBtn && window.escalationSystem ) {
    adminDispensationPanelBtn.onclick = () => {
      window.escalationSystem .showDispensationAdminPanel();
    };
  }
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
  const dispensations = window.escalationSystem.getDispensationsForWell(wellName);
  
  if (activeEscalations.length > 0 || dispensations.length > 0) {
    // Show escalation indicator (red) or dispensation indicator (green for approved, orange for pending)
    let badgeColor = '#dc3545'; // Red for escalations
    let badgeText = activeEscalations.length;
    let titleText = `${activeEscalations.length} active escalation(s)`;
    
    // Check for approved dispensations
    const approvedDispensation = dispensations.find(d => d.status === 'approved');
    const pendingDispensation = dispensations.find(d => d.status === 'pending');
    
    if (approvedDispensation) {
      badgeColor = '#28a745'; // Green
      badgeText = '✓';
      titleText = `Dispensation approved until ${new Date(approvedDispensation.dispensationExpiryDate).toLocaleDateString()}`;
    } else if (pendingDispensation) {
      badgeColor = '#ff9800'; // Orange
      badgeText = '⏳';
      titleText = 'Dispensation request pending approval';
    }
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