// =================== ESCALATION SYSTEM ADDITION ===================

// Add escalation tracking to globals
window.activeEscalations = window.activeEscalations || [];
window.escalationIdCounter = window.escalationIdCounter || 1;
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
  
  const escalation = {
    id: `ESC-${Date.now()}-${window.escalationIdCounter++}`,
    wellName,
    wellId, // Store the well ID for database operations
    valveId,
    failureDetails,
    status: 'open',
    priority: this.getPriorityFromTrafficLight(failureDetails.trafficLight),
    createdAt: new Date(),
    createdBy: window.currentUser?.login || 'system',
    userInitiated,
    escalatedTo: this.determineSuperior(),
    comments: [],
    acknowledgedAt: null,
    resolvedAt: null
  };
  
  // Add to local array
  this.escalations.push(escalation);
  
  console.log(`Created escalation ${escalation.id} for well ${wellName} (ID: ${wellId}), valve ${valveId}`, escalation);
  
  // Update dashboard indicators
  this.updateDashboardEscalationIndicators();
  
  // Send to database
  await this.sendEscalationToDatabase(escalation);
  
  return escalation;
}

// 3. Fix sendEscalationToDatabase to use the well ID instead of name
async sendEscalationToDatabase(escalation) {
  try {
    if (!escalation.wellId) {
      console.warn(`No well ID for ${escalation.wellName}, attempting to proceed with name`);
    }
    
    // Use wellId if available, otherwise fallback to wellName
    const idParameter = escalation.wellId ? `wellId=${encodeURIComponent(escalation.wellId)}` : `well=${encodeURIComponent(escalation.wellName)}`;
    
    console.log(`Sending escalation to database using ${escalation.wellId ? 'well ID' : 'well name'}: ${escalation.wellId || escalation.wellName}`);
    
    const backendData = this._prepareDataForBackend(escalation);
    
    const response = await fetch(`http://10.226.112.213:5000/api/integrity_test/failure?${idParameter}&valve=${encodeURIComponent(escalation.valveId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Database error: ${response.status}`, errorText);
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    console.log('Escalation saved successfully');
    return true;
  } catch (error) {
    console.error(`Failed to save escalation for well ${escalation.wellName}:`, error);
    return false;
  }
}

// 5. Update _prepareDataForBackend to include wellId
_prepareDataForBackend(escalation) {
  const { failureDetails } = escalation;
  
  return {
    wellId: escalation.wellId, // Use stored wellId
    valveId: escalation.valveId,
    failureCode: failureDetails.failureCode,
    matrixCategory: failureDetails.matrixCategory,
    failureDescription: failureDetails.failureReason,
    requiredAction: failureDetails.matrixDescription,
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
    
    const response = await fetch(`http://10.226.112.213:5000/api/integrity_test/failure?wellId=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`, {
      method: 'PUT',
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
        author: window.currentUser?.login || 'user',
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
        author: window.currentUser?.login || 'user',
        timestamp: new Date()
      });
    }

    // Update dashboard indicators
    this.updateDashboardEscalationIndicators();

    // Send the updated escalation to the backend
    await this.updateEscalationInDatabase(esc);
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

  determineSuperior() {
    // Simple hierarchy - in real implementation, this would come from user management system
    const hierarchy = {
      'operator': 'supervisor',
      'supervisor': 'admin',
      'admin': 'director'
    };
    
    const currentRole = window.currentUser?.role || 'operator';
    return hierarchy[currentRole] || 'supervisor';
  }

  acknowledgeEscalation(escalationId, comment = '') {
    const escalation = this.escalations.find(e => e.id === escalationId);
    if (escalation) {
      escalation.acknowledgedAt = new Date();
      escalation.status = 'acknowledged';
      if (comment) {
        escalation.comments.push({
          text: comment,
          author: window.currentUser?.login || 'user',
          timestamp: new Date()
        });
      }
      this.updateDashboardEscalationIndicators();
    }
  }

  resolveEscalation(escalationId, resolution = '') {
    const escalation = this.escalations.find(e => e.id === escalationId);
    if (escalation) {
      escalation.resolvedAt = new Date();
      escalation.status = 'resolved';
      if (resolution) {
        escalation.comments.push({
          text: `Resolution: ${resolution}`,
          author: window.currentUser?.login || 'user',
          timestamp: new Date()
        });
      }
      this.updateDashboardEscalationIndicators();
    }
  }

  getActiveEscalationsForWell(wellName) {
    return this.escalations.filter(e => 
      e.wellName === wellName && 
      (e.status === 'open' || e.status === 'acknowledged')
    );
  }

  updateDashboardEscalationIndicators() {
    // Trigger dashboard re-render to show escalation indicators
    const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
    renderFilteredDashboard(currentFilter);
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

// Auto-escalation function for critical failures
window.autoEscalateFailedValve = function(wellName, valveId, failureDetails) {
  // Only auto-escalate critical failures (red traffic light)
  if (failureDetails.trafficLight === 'red') {
    return window.escalationSystem.createEscalation(wellName, valveId, failureDetails, false);
  }
  return null;
};

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

// Modified showDetailedFailureModal to include escalation options
function showDetailedFailureModal(ringInfo, wellName) {
  // Remove existing modal if present


  const existingModal = document.getElementById('failureDetailModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Ensure we have a well name - use global context if not provided
  if (!wellName && window.currentWellContext && window.currentWellContext.name) {
    wellName = window.currentWellContext.name;
    console.log('Using well name from current context:', wellName);
  }
  
  if (!wellName) {
    console.error('Cannot show modal: Missing well name');
    showTemporaryMessage('Cannot show details: Well information missing', 'error');
    return;
  }
  
  // Store well name in a data attribute for the modal
  const backdrop = document.createElement('div');
  backdrop.id = 'failureDetailModal';
  backdrop.setAttribute('data-well-name', wellName);
  
  // Check for existing escalations
  const activeEscalations = window.escalationSystem.getActiveEscalationsForWell(wellName);
  const hasActiveEscalation = activeEscalations.some(e => e.valveId === ringInfo.valveId);
  console.log('ringInfo:', ringInfo, 'wellName:', wellName, 'activeEscalations:', activeEscalations);
  
  // Create modal backdrop

 
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Get failure details from matrix
  const mitigatingAction = window.wellFailureModel.getMitigatingAction(ringInfo.failureCode);
  const matrixFailure = getMatrixFailureDetails(ringInfo.matrixCategory, ringInfo.failureNumber);
  
  // Create modal content with escalation section
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 700px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  
  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <h3 style="margin: 0; color: #333;">Failure Details - ${ringInfo.label}</h3>
      <button id="closeModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
    </div>
    
    <div style="border-left: 4px solid ${getColorForCode(ringInfo.failureCode)}; padding-left: 16px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; color: #333;">Failure Code: ${ringInfo.failureCode}</h4>
      <p style="margin: 0; color: #666; font-size: 14px;">Traffic Light: ${mitigatingAction ? mitigatingAction.trafficLight.toUpperCase() : 'Unknown'}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; color: #333;">Matrix Category:</h4>
      <p style="margin: 0; color: #666;">${formatCategoryName(ringInfo.matrixCategory)}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; color: #333;">Failure Description:</h4>
      <p style="margin: 0; color: #666; line-height: 1.4;">${matrixFailure ? matrixFailure.description : 'Description not available'}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; color: #333;">Required Action:</h4>
      <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; line-height: 1.4;">
        ${mitigatingAction ? mitigatingAction.description : 'Action not defined'}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; color: #333;">Test Failure Reason:</h4>
      <p style="margin: 0; color: #666; font-style: italic;">${ringInfo.message.split(' - Code')[0]}</p>
    </div>
    
    <!-- Escalation Section -->
    <div style="margin-bottom: 20px; border-top: 1px solid #eee; padding-top: 20px;">
      <h4 style="margin: 0 0 12px 0; color: #333;">🚨 Escalation Management</h4>
      
      ${hasActiveEscalation ? `
        <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <strong>⚠️ Active Escalation Exists</strong><br>
          <small>This failure has already been escalated. Check escalation status below.</small>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 10px; margin-bottom: 12px;">
        <button id="escalateBtn" 
                ${hasActiveEscalation ? 'disabled' : ''} 
                style="background: ${hasActiveEscalation ? '#ccc' : '#dc3545'}; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: ${hasActiveEscalation ? 'not-allowed' : 'pointer'};">
          ${hasActiveEscalation ? 'Already Escalated' : 'Escalate to Superior'}
        </button>
        
        <button id="viewEscalationsBtn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          View All Escalations (${activeEscalations.length})
        </button>
      </div>
      
      <textarea id="escalationComment" placeholder="Add escalation comment (optional)..." 
                style="width: 100%; height: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit;"></textarea>
    </div>
    
    <div style="text-align: right; margin-top: 24px;">
      <button id="closeModalBtn" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        Close
      </button>
    </div>
  `;
  
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  // Add escalation handlers
const escalateBtn = document.getElementById('escalateBtn');
  if (escalateBtn && !hasActiveEscalation) {
    escalateBtn.onclick = () => {
      // Get well name from the modal's data attribute
      const modalWellName = backdrop.getAttribute('data-well-name');
      if (!modalWellName) {
        console.error('Cannot escalate: Missing well name');
        showTemporaryMessage('Cannot escalate: Missing well information', 'error');
        return;
      }
      
      // Look up the well ID from the global wells array
      let wellId = null;
      const wellObject = window.wells.find(w => w.name === modalWellName);
      if (wellObject && wellObject.id) {
        wellId = wellObject.id;
        console.log(`Found well ID ${wellId} for well name ${modalWellName}`);
      } else {
        console.warn(`Could not find well ID for ${modalWellName}, proceeding with name only`);
      }
      
      const comment = document.getElementById('escalationComment').value.trim();
      
      const failureDetails = {
        failureReason: ringInfo.message,
        failureCode: ringInfo.failureCode,
        matrixCategory: ringInfo.matrixCategory,
        trafficLight: ringInfo.trafficLight || getTrafficLightFromCode(ringInfo.failureCode),
        matrixDescription: mitigatingAction ? mitigatingAction.description : 'Action required',
        wellType: getWellTypeKey(modalWellName),
        timestamp: new Date()
      };
      
      console.log(`Creating escalation for well: ${modalWellName}, valve: ${ringInfo.valveId}`);
      
      // Pass both well name and well ID to createEscalation
      const escalation = window.escalationSystem.createEscalation(modalWellName, ringInfo.valveId, failureDetails, true, wellId);
      if (comment) {
        escalation.comments.push({
          text: comment,
          author: window.currentUser?.login || 'user',
          timestamp: new Date()
        });
      }
      
      showTemporaryMessage(`Escalation ${escalation.id} created and sent to ${escalation.escalatedTo}`, 'success');
      closeModal();
    };
  }
  
  // View escalations handler
  document.getElementById('viewEscalationsBtn').onclick = () => {
    showEscalationManagementModal(wellName);
  };
  
  // Add close handlers
  const closeModal = () => {
    backdrop.remove();
    hideTooltip();
  };
  
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('closeModalBtn').onclick = closeModal;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// New escalation management modal
function showEscalationManagementModal(wellName = null) {
  const existingModal = document.getElementById('escalationManagementModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const escalations = wellName 
    ? window.escalationSystem.getActiveEscalationsForWell(wellName)
    : window.escalationSystem.escalations.filter(e => e.status !== 'resolved');
  
  const backdrop = document.createElement('div');
  backdrop.id = 'escalationManagementModal';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  
  const escalationRows = escalations.map(esc => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 8px; font-weight: bold;">${esc.id}</td>
      <td style="padding: 8px;">${esc.wellName}</td>
      <td style="padding: 8px;">${esc.valveId}</td>
      <td style="padding: 8px;">
        <span style="background: ${getPriorityColor(esc.priority)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
          ${esc.priority.toUpperCase()}
        </span>
      </td>
      <td style="padding: 8px;">${esc.status}</td>
      <td style="padding: 8px;">${esc.escalatedTo}</td>
      <td style="padding: 8px;">${formatDate(esc.createdAt)}</td>
      <td style="padding: 8px;">
        ${esc.status === 'open' ? `
          <button onclick="window.escalationSystem.acknowledgeEscalation('${esc.id}', 'Acknowledged by supervisor')" 
                  style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
            Acknowledge
          </button>
        ` : ''}
        ${esc.status === 'acknowledged' ? `
          <button onclick="window.escalationSystem.resolveEscalation('${esc.id}', 'Issue resolved')" 
                  style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
            Resolve
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
  
  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="margin: 0; color: #333;">
        Escalation Management ${wellName ? `- ${wellName}` : ''}
      </h3>
      <button id="closeEscalationModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
    </div>
    
    <div style="margin-bottom: 20px;">
      <p style="color: #666;">Active escalations: <strong>${escalations.length}</strong></p>
    </div>
    
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">ID</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Well</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Valve</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Priority</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Status</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Escalated To</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Created</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${escalationRows || '<tr><td colspan="8" style="padding: 20px; text-align: center; color: #666;">No active escalations</td></tr>'}
        </tbody>
      </table>
    </div>
    
    <div style="text-align: right; margin-top: 20px;">
      <button id="closeEscalationModalBtn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        Close
      </button>
    </div>
  `;
  
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  const closeModal = () => {
    backdrop.remove();
  };
  
  document.getElementById('closeEscalationModal').onclick = closeModal;
  document.getElementById('closeEscalationModalBtn').onclick = closeModal;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };
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

// Add this debugging function to help identify well ID issues
function debugWellInfo(wellNameOrId) {
  console.log('=== WELL INFO DEBUG ===');
  console.log('Input:', wellNameOrId);
  
  // Search by ID
  const wellByID = window.wells.find(w => w.id === wellNameOrId);
  if (wellByID) {
    console.log('Found by ID:', wellByID);
  }
  
  // Search by name
  const wellByName = window.wells.find(w => w.name === wellNameOrId);
  if (wellByName) {
    console.log('Found by name:', wellByName);
  }
  
  // Show all wells for reference
  console.log('All wells:', window.wells);
  
  return {
    wellByID,
    wellByName,
    allWellIds: window.wells.map(w => w.id),
    allWellNames: window.wells.map(w => w.name)
  };
}

// Make it available globally
window.debugWellInfo = debugWellInfo;
function formatDate(date) {
  return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function testEscalation() {
  // Find a real well from the system to test with
  const testWell = window.wells && window.wells.length > 0 ? window.wells[0] : null;
  
  if (!testWell) {
    console.error('No wells available for test escalation');
    return null;
  }
  
  console.log(`Creating test escalation for well: ${testWell.name} (ID: ${testWell.id})`);
  
  const testFailureDetails = {
    failureReason: "Test valve failure",
    failureCode: 9,
    matrixCategory: 'singleSurfaceFailure',
    trafficLight: 'red',
    matrixDescription: 'Make well safe immediately',
    wellType: 'Producer',
    timestamp: new Date()
  };
  
  // Use a real well name that can be mapped to an ID
  const escalation = window.escalationSystem.createEscalation(testWell.name, 'TEST_VALVE', testFailureDetails, true);
  console.log('Test escalation created:', escalation);
  
  // Update dashboard to show the escalation
  window.escalationSystem.updateDashboardEscalationIndicators();
  
  return escalation;
}
// =================== DASHBOARD VISUAL INDICATORS ===================

// Add escalation indicator to well circles
function addEscalationIndicatorToWell(wellDiv, wellName) {
  const activeEscalations = window.escalationSystem.getActiveEscalationsForWell(wellName);
  
  if (activeEscalations.length > 0) {
    // Add escalation badge
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      z-index: 10;
    `;
    badge.textContent = activeEscalations.length;
    badge.title = `${activeEscalations.length} active escalation(s)`;
    
    wellDiv.style.position = 'relative';
    wellDiv.appendChild(badge);
  }
}

// Modified renderFilteredDashboard to include escalation indicators
// (Insert this modification into the existing renderFilteredDashboard function where wells are created)

// Add global escalation management button to dashboard
function addEscalationManagementButton() {
  const filterContainer = document.getElementById('dashboardFilterContainer');
  if (filterContainer && !document.getElementById('globalEscalationBtn')) {
    const escalationBtn = document.createElement('button');
    escalationBtn.id = 'globalEscalationBtn';
    escalationBtn.style.cssText = `
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-left: 10px;
    `;
    escalationBtn.title = 'View and manage all escalations';
    
    // Set onclick first
    escalationBtn.onclick = () => showEscalationManagementModal();
    
    // Add to DOM immediately
    filterContainer.appendChild(escalationBtn);

    // Now update the text
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


 /*function testEscalation() {
  // Create a test escalation to verify the system works
  const testFailureDetails = {
    failureReason: "Test valve failure",
    failureCode: 9,
    matrixCategory: 'singleSurfaceFailure',
    trafficLight: 'red',
    matrixDescription: 'Make well safe immediately',
    wellType: 'Producer',
    timestamp: new Date()
  };
  
  const escalation = window.escalationSystem.createEscalation('TEST_WELL', 'TEST_VALVE', testFailureDetails, true);
  console.log('Test escalation created:', escalation);
  
  // Update dashboard to show the escalation
  window.escalationSystem.updateDashboardEscalationIndicators();
  
  return escalation;
}*/ 

// Make functions available globally for debuggin

// Add these function calls to your existing dashboard render functions:

// 1. Add this to your renderFilteredDashboard function after creating each well div:
//    addEscalationIndicatorToWell(div, well.name);

// 2. Add this to your createDashboardFilterDropdown function or similar initialization:
//    addEscalationManagementButton();

// 3. Update the showDetailedFailureModal call to include wellName:
//    showDetailedFailureModal(ringInfo, wellName);

// Export functions for global access
window.escalationSystem = window.escalationSystem;
window.showEscalationManagementModal = showEscalationManagementModal;
window.addEscalationIndicatorToWell = addEscalationIndicatorToWell;
window.addEscalationManagementButton = addEscalationManagementButton;
window.updateEscalationButtonCount = updateEscalationButtonCount;