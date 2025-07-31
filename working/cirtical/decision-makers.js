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

  createEscalation(wellName, valveId, failureDetails, userInitiated = false) {
    const escalation = {
      id: `ESC-${Date.now()}-${window.escalationIdCounter++}`,
      wellName: wellName,
      valveId: valveId,
      failureDetails: failureDetails,
      status: 'open',
      priority: this.getPriorityFromTrafficLight(failureDetails.trafficLight),
      createdAt: new Date(),
      createdBy: window.currentUser?.login || 'system',
      userInitiated: userInitiated,
      escalatedTo: this.determineSuperior(),
      comments: [],
      acknowledgedAt: null,
      resolvedAt: null
    };

    this.escalations.push(escalation);
    console.log(`Created escalation ${escalation.id} for ${wellName} - ${valveId}`);
    
    // Update dashboard to show escalation status
    this.updateDashboardEscalationIndicators();
    
    return escalation;
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
  
  // Check for existing escalations
  const activeEscalations = window.escalationSystem.getActiveEscalationsForWell(wellName);
  const hasActiveEscalation = activeEscalations.some(e => e.valveId === ringInfo.valveId);
  console.log('ringInfo:', ringInfo, 'wellName:', wellName, 'activeEscalations:', activeEscalations);
  
  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'failureDetailModal';
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
      const comment = document.getElementById('escalationComment').value.trim();
      
      const failureDetails = {
        failureReason: ringInfo.message,
        failureCode: ringInfo.failureCode,
        matrixCategory: ringInfo.matrixCategory,
        trafficLight: ringInfo.trafficLight,
        matrixDescription: mitigatingAction ? mitigatingAction.description : 'Action required',
        wellType: getWellTypeKey(wellName),
        timestamp: new Date()
      };
      
      const escalation = window.escalationSystem.createEscalation(wellName, ringInfo.valveId, failureDetails, true);
      
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

function formatDate(date) {
  return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
    
    const activeCount = window.escalationSystem.escalations.filter(e => e.status !== 'resolved').length;
    escalationBtn.innerHTML = `🚨 Escalations (${activeCount})`;
    escalationBtn.title = 'View and manage all escalations';
    
    escalationBtn.onclick = () => showEscalationManagementModal();
    
    filterContainer.appendChild(escalationBtn);
  }
}


function testEscalation() {
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
}

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