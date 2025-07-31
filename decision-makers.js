// =================== Valve Failure Escalation System ===================

// Escalation Configuration
window.escalationConfig = window.escalationConfig || {
  decisionMakers: [
    {
      id: 'production_manager',
      title: 'Production Manager',
      name: 'John Smith', // This should come from your user management system
      email: 'production.manager@company.com',
      level: 1,
      canEscalateTo: 'operations_director'
    },
    {
      id: 'operations_director', 
      title: 'Operations Director',
      name: 'Sarah Johnson',
      email: 'operations.director@company.com',
      level: 2,
      canEscalateTo: 'country_manager'
    },
    {
      id: 'country_manager',
      title: 'Country Manager', 
      name: 'Michael Chen',
      email: 'country.manager@company.com',
      level: 3,
      canEscalateTo: null // Final decision maker
    }
  ],
  leadEngineer: {
    id: 'lead_engineer',
    title: 'Lead Engineer',
    name: 'Current User', // This should be dynamic based on current user
    email: 'lead.engineer@company.com'
  }
};

// Escalation Status Types
window.escalationStatus = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
  REJECTED: 'rejected'
};

// Decision Types
window.decisionTypes = {
  RESOLVE: 'resolve',
  ESCALATE: 'escalate',
  REJECT: 'reject'
};

// Escalation Storage (In production, this should be stored in your backend)
window.activeEscalations = window.activeEscalations || [];
window.escalationHistory = window.escalationHistory || [];

// =================== Core Escalation Functions ===================

class ValveFailureEscalationSystem {
  constructor() {
    this.config = window.escalationConfig;
    this.activeEscalations = window.activeEscalations;
    this.history = window.escalationHistory;
  }

  // Create new escalation when valve test fails
  createEscalation(wellName, valveId, failureDetails) {
    const escalationId = this.generateEscalationId();
    const timestamp = new Date();
    
    const escalation = {
      id: escalationId,
      wellName: wellName,
      valveId: valveId,
      failureDetails: failureDetails,
      createdBy: this.config.leadEngineer,
      createdAt: timestamp,
      status: window.escalationStatus.PENDING,
      currentLevel: 1, // Start with Production Manager
      currentDecisionMaker: this.config.decisionMakers[0],
      decisions: [],
      priority: this.calculatePriority(failureDetails),
      matrixCode: failureDetails.failureCode || null,
      trafficLight: failureDetails.trafficLight || 'red'
    };

    this.activeEscalations.push(escalation);
    
    // Notify all decision makers (they all receive the escalation)
    this.notifyAllDecisionMakers(escalation);
    
    console.log(`Escalation created: ${escalationId} for ${wellName} - ${valveId}`);
    return escalation;
  }

  // Calculate priority based on matrix failure code
  calculatePriority(failureDetails) {
    if (!failureDetails.failureCode) return 'medium';
    
    const code = failureDetails.failureCode;
    if (code >= 9) return 'critical';
    if (code >= 6) return 'high';
    if (code >= 3) return 'medium';
    return 'low';
  }

  // Generate unique escalation ID
  generateEscalationId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ESC-${timestamp}-${random}`;
  }

  // Notify all decision makers about new escalation
  notifyAllDecisionMakers(escalation) {
    const allRecipients = [
      ...this.config.decisionMakers,
      this.config.leadEngineer
    ];

    allRecipients.forEach(recipient => {
      this.sendNotification(recipient, escalation, 'new_escalation');
    });
  }

  // Process decision from a decision maker
  processDecision(escalationId, decisionMakerId, decision, comments = '') {
    const escalation = this.activeEscalations.find(e => e.id === escalationId);
    if (!escalation) {
      throw new Error('Escalation not found');
    }

    const decisionMaker = this.config.decisionMakers.find(dm => dm.id === decisionMakerId);
    if (!decisionMaker) {
      throw new Error('Invalid decision maker');
    }

    // Verify decision maker is at the correct level
    if (decisionMaker.level !== escalation.currentLevel) {
      throw new Error('Decision maker not authorized at current level');
    }

    const decisionRecord = {
      id: this.generateDecisionId(),
      decisionMaker: decisionMaker,
      decision: decision,
      comments: comments,
      timestamp: new Date(),
      level: escalation.currentLevel
    };

    escalation.decisions.push(decisionRecord);

    // Process the decision
    switch (decision) {
      case window.decisionTypes.RESOLVE:
        this.resolveEscalation(escalation, decisionRecord);
        break;
        
      case window.decisionTypes.ESCALATE:
        this.escalateToNextLevel(escalation, decisionRecord);
        break;
        
      case window.decisionTypes.REJECT:
        this.rejectEscalation(escalation, decisionRecord);
        break;
        
      default:
        throw new Error('Invalid decision type');
    }

    return escalation;
  }

  // Resolve escalation
  resolveEscalation(escalation, decisionRecord) {
    escalation.status = window.escalationStatus.RESOLVED;
    escalation.resolvedAt = new Date();
    escalation.resolvedBy = decisionRecord.decisionMaker;
    
    // Move to history
    this.moveToHistory(escalation);
    
    // Notify all stakeholders
    this.notifyResolution(escalation, decisionRecord);
    
    console.log(`Escalation ${escalation.id} resolved by ${decisionRecord.decisionMaker.title}`);
  }

  // Escalate to next level
  escalateToNextLevel(escalation, decisionRecord) {
    const currentLevel = escalation.currentLevel;
    const nextLevel = currentLevel + 1;
    
    if (nextLevel > this.config.decisionMakers.length) {
      throw new Error('Cannot escalate beyond Country Manager level');
    }

    escalation.currentLevel = nextLevel;
    escalation.currentDecisionMaker = this.config.decisionMakers[nextLevel - 1];
    escalation.status = window.escalationStatus.ESCALATED;
    
    // Notify about escalation
    this.notifyEscalation(escalation, decisionRecord);
    
    console.log(`Escalation ${escalation.id} escalated to level ${nextLevel} (${escalation.currentDecisionMaker.title})`);
  }

  // Reject escalation
  rejectEscalation(escalation, decisionRecord) {
    escalation.status = window.escalationStatus.REJECTED;
    escalation.rejectedAt = new Date();
    escalation.rejectedBy = decisionRecord.decisionMaker;
    
    // Move to history
    this.moveToHistory(escalation);
    
    // Notify rejection
    this.notifyRejection(escalation, decisionRecord);
    
    console.log(`Escalation ${escalation.id} rejected by ${decisionRecord.decisionMaker.title}`);
  }

  // Move escalation to history
  moveToHistory(escalation) {
    const index = this.activeEscalations.findIndex(e => e.id === escalation.id);
    if (index > -1) {
      this.activeEscalations.splice(index, 1);
      this.history.push(escalation);
    }
  }

  // Generate decision ID
  generateDecisionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100);
    return `DEC-${timestamp}-${random}`;
  }

  // Notification functions (implement according to your notification system)
  sendNotification(recipient, escalation, type) {
    const notification = {
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: type,
      recipient: recipient,
      escalation: escalation,
      timestamp: new Date(),
      read: false
    };

    // In production, send email/SMS/push notification
    console.log(`Notification sent to ${recipient.title}: ${type} for escalation ${escalation.id}`);
    
    // Store notification (implement your notification storage)
    this.storeNotification(notification);
    
    return notification;
  }

  notifyResolution(escalation, decisionRecord) {
    const allStakeholders = [
      ...this.config.decisionMakers,
      this.config.leadEngineer
    ];

    allStakeholders.forEach(stakeholder => {
      this.sendNotification(stakeholder, {
        ...escalation,
        resolution: decisionRecord
      }, 'escalation_resolved');
    });
  }

  notifyEscalation(escalation, decisionRecord) {
    const allStakeholders = [
      ...this.config.decisionMakers,
      this.config.leadEngineer
    ];

    allStakeholders.forEach(stakeholder => {
      this.sendNotification(stakeholder, {
        ...escalation,
        escalationDecision: decisionRecord
      }, 'escalation_escalated');
    });
  }

  notifyRejection(escalation, decisionRecord) {
    const allStakeholders = [
      ...this.config.decisionMakers,
      this.config.leadEngineer
    ];

    allStakeholders.forEach(stakeholder => {
      this.sendNotification(stakeholder, {
        ...escalation,
        rejection: decisionRecord
      }, 'escalation_rejected');
    });
  }

  storeNotification(notification) {
    // Implement notification storage
    window.notifications = window.notifications || [];
    window.notifications.push(notification);
  }

  // Get escalations for a specific decision maker
  getEscalationsForDecisionMaker(decisionMakerId) {
    const decisionMaker = this.config.decisionMakers.find(dm => dm.id === decisionMakerId);
    if (!decisionMaker) return [];

    return this.activeEscalations.filter(escalation => 
      escalation.currentLevel === decisionMaker.level &&
      (escalation.status === window.escalationStatus.PENDING || 
       escalation.status === window.escalationStatus.ESCALATED)
    );
  }

  // Get all escalations (for lead engineer and reporting)
  getAllEscalations() {
    return {
      active: this.activeEscalations,
      history: this.history
    };
  }

  // Get escalation statistics
  getEscalationStats() {
    const stats = {
      total: this.activeEscalations.length + this.history.length,
      active: this.activeEscalations.length,
      resolved: this.history.filter(e => e.status === window.escalationStatus.RESOLVED).length,
      rejected: this.history.filter(e => e.status === window.escalationStatus.REJECTED).length,
      byLevel: {
        level1: this.activeEscalations.filter(e => e.currentLevel === 1).length,
        level2: this.activeEscalations.filter(e => e.currentLevel === 2).length,
        level3: this.activeEscalations.filter(e => e.currentLevel === 3).length
      },
      byPriority: {
        critical: this.activeEscalations.filter(e => e.priority === 'critical').length,
        high: this.activeEscalations.filter(e => e.priority === 'high').length,
        medium: this.activeEscalations.filter(e => e.priority === 'medium').length,
        low: this.activeEscalations.filter(e => e.priority === 'low').length
      }
    };

    return stats;
  }
}

// =================== Integration Functions ===================

// Initialize escalation system
window.escalationSystem = new ValveFailureEscalationSystem();

// Function to automatically create escalation when valve test fails
function autoEscalateFailedValve(wellName, valveId, failureDetails) {
  // Check if escalation already exists for this well/valve combination
  const existingEscalation = window.activeEscalations.find(e => 
    e.wellName === wellName && 
    e.valveId === valveId && 
    e.status !== window.escalationStatus.RESOLVED &&
    e.status !== window.escalationStatus.REJECTED
  );

  if (existingEscalation) {
    console.log(`Escalation already exists for ${wellName} - ${valveId}: ${existingEscalation.id}`);
    return existingEscalation;
  }

  // Create new escalation
  const escalation = window.escalationSystem.createEscalation(wellName, valveId, failureDetails);
  
  // Show notification to user
  showEscalationNotification(escalation);
  
  return escalation;
}

// Show escalation notification in UI
function showEscalationNotification(escalation) {
  const message = `Valve failure escalated to ${escalation.currentDecisionMaker.title} for ${escalation.wellName} - ${escalation.valveId}`;
  
  if (typeof showTemporaryMessage === 'function') {
    showTemporaryMessage(message, 'warning', 5000);
  } else {
    console.log(`ESCALATION: ${message}`);
  }
}

// =================== UI Components ===================

// Create escalation dashboard widget
function createEscalationDashboard() {
  const stats = window.escalationSystem.getEscalationStats();
  
  const widget = document.createElement('div');
  widget.id = 'escalationDashboard';
  widget.className = 'escalation-widget';
  widget.style.cssText = `
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;

  widget.innerHTML = `
    <h3 style="margin: 0 0 12px 0; color: #333; font-size: 18px;">
      🚨 Active Escalations
    </h3>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
      <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${stats.active}</div>
        <div style="font-size: 12px; color: #666;">Active</div>
      </div>
      <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        <div style="font-size: 24px; font-weight: bold; color: #fd7e14;">${stats.byPriority.critical}</div>
        <div style="font-size: 12px; color: #666;">Critical</div>
      </div>
      <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        <div style="font-size: 24px; font-weight: bold; color: #28a745;">${stats.resolved}</div>
        <div style="font-size: 12px; color: #666;">Resolved</div>
      </div>
      <div style="text-align: center; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        <div style="font-size: 24px; font-weight: bold; color: #6c757d;">${stats.total}</div>
        <div style="font-size: 12px; color: #666;">Total</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="showEscalationModal()" style="flex: 1; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        View Details
      </button>
      <button onclick="refreshEscalationData()" style="padding: 8px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Refresh
      </button>
    </div>
  `;

  return widget;
}

// Show detailed escalation modal
function showEscalationModal() {
  const escalations = window.escalationSystem.getAllEscalations();
  
  // Create modal backdrop
  const backdrop = document.createElement('div');
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
  
  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 900px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    width: 90%;
  `;
  
  const activeEscalationsHtml = escalations.active.map(e => `
    <div style="border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin: 8px 0; background: ${e.priority === 'critical' ? '#fff5f5' : '#f8f9fa'};">
      <div style="display: flex; justify-content: between; align-items: flex-start;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; color: #333;">${e.wellName} - ${e.valveId}</h4>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">
            <strong>Status:</strong> ${e.status} | 
            <strong>Level:</strong> ${e.currentLevel} (${e.currentDecisionMaker.title}) |
            <strong>Priority:</strong> ${e.priority}
          </p>
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Created:</strong> ${new Date(e.createdAt).toLocaleString()}
          </p>
        </div>
        <div style="margin-left: 12px;">
          <span style="background: ${getPriorityColor(e.priority)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
            ${e.priority.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  `).join('');

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <h3 style="margin: 0; color: #333;">Escalation Management</h3>
      <button onclick="this.closest('[style*=\"fixed\"]').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
    </div>
    
    <div style="margin-bottom: 24px;">
      <h4 style="margin: 0 0 12px 0; color: #333;">Active Escalations (${escalations.active.length})</h4>
      ${escalations.active.length > 0 ? activeEscalationsHtml : '<p style="color: #666; font-style: italic;">No active escalations</p>'}
    </div>
    
    <div style="text-align: right; margin-top: 24px;">
      <button onclick="this.closest('[style*=\"fixed\"]').remove()" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        Close
      </button>
    </div>
  `;
  
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

function getPriorityColor(priority) {
  const colors = {
    critical: '#dc3545',
    high: '#fd7e14', 
    medium: '#ffc107',
    low: '#28a745'
  };
  return colors[priority] || '#6c757d';
}

function refreshEscalationData() {
  // Refresh escalation dashboard
  const widget = document.getElementById('escalationDashboard');
  if (widget) {
    const newWidget = createEscalationDashboard();
    widget.parentNode.replaceChild(newWidget, widget);
  }
  
  // Show refresh message
  if (typeof showTemporaryMessage === 'function') {
    showTemporaryMessage('Escalation data refreshed', 'success', 2000);
  }
}

function checkIfShouldEscalate(wellName, valveId, failureDetails) {
  // Only escalate critical and high priority failures (codes 6 and above)
  if (!failureDetails.failureCode || failureDetails.failureCode < 6) {
    return false;
  }

  // Check if there's already an active escalation for this well/valve
  const existingEscalation = window.activeEscalations.find(e => 
    e.wellName === wellName && 
    e.valveId === valveId && 
    (e.status === window.escalationStatus.PENDING || 
     e.status === window.escalationStatus.UNDER_REVIEW ||
     e.status === window.escalationStatus.ESCALATED)
  );

  if (existingEscalation) {
    console.log(`Escalation already exists for ${wellName} - ${valveId}, skipping auto-escalation`);
    return false;
  }

  return true;
}

function getWellTypeKey(wellType) {
  if (!wellType) return 'standard';
  
  const normalizedType = wellType.toLowerCase().trim();
  
  // Map various well type formats to standardized keys
  const typeMapping = {
      'Sub-sea Natural Flow': 'Producer',
      'Sub-sea Water Injector': 'Dual Service'
    };

  
  return typeMapping[wellType] || 'Producer'; // Default to Producer if well type not found in the strict list
}



function createWellEscalationSummary(wellName, failedValves, matrixCategory, failureCode) {
  const summary = {
    wellName: wellName,
    totalFailures: failedValves.length,
    matrixCategory: matrixCategory,
    failureCode: failureCode,
    criticalValves: failedValves.filter(v => v.result.leak_rate_pass === false),
    surfaceFailures: failedValves.filter(v => {
      const convertedValveName = window.wellFailureModel.convertValve(v.valveId);
      return convertedValveName !== "SCSSV";
    }),
    subSurfaceFailures: failedValves.filter(v => {
      const convertedValveName = window.wellFailureModel.convertValve(v.valveId);
      return convertedValveName === "SCSSV";
    }),
    timestamp: new Date(),
    severity: getSeverityLevel(failureCode)
  };
  
  return summary;
}

// Function to determine severity level based on failure code
function getSeverityLevel(failureCode) {
  if (failureCode >= 9) return 'CRITICAL';
  if (failureCode >= 7) return 'HIGH';
  if (failureCode >= 5) return 'MEDIUM';
  if (failureCode >= 3) return 'LOW';
  return 'MINIMAL';
}

// Function to check for escalation patterns across multiple wells
function checkForSystemWideEscalationPatterns() {
  if (!window.activeEscalations || !Array.isArray(window.activeEscalations)) {
    return null;
  }

  const recentEscalations = window.activeEscalations.filter(e => {
    const hoursSinceCreated = (new Date() - new Date(e.createdAt)) / (1000 * 60 * 60);
    return hoursSinceCreated <= 24; // Last 24 hours
  });

  // Group by valve type to identify patterns
  const valveTypeFailures = {};
  recentEscalations.forEach(escalation => {
    const valveType = window.wellFailureModel.convertValve(escalation.valveId);
    if (!valveTypeFailures[valveType]) {
      valveTypeFailures[valveType] = [];
    }
    valveTypeFailures[valveType].push(escalation);
  });

  // Check for concerning patterns
  const patterns = [];
  Object.keys(valveTypeFailures).forEach(valveType => {
    if (valveTypeFailures[valveType].length >= 3) {
      patterns.push({
        type: 'MULTIPLE_SAME_VALVE_TYPE',
        valveType: valveType,
        count: valveTypeFailures[valveType].length,
        wells: [...new Set(valveTypeFailures[valveType].map(e => e.wellName))]
      });
    }
  });

  // Check for multiple wells with escalations
  const wellsWithEscalations = [...new Set(recentEscalations.map(e => e.wellName))];
  if (wellsWithEscalations.length >= 5) {
    patterns.push({
      type: 'WIDESPREAD_FAILURES',
      wellCount: wellsWithEscalations.length,
      wells: wellsWithEscalations
    });
  }

  return patterns.length > 0 ? patterns : null;
}

// Function to auto-escalate well-level issues when multiple valves fail
function autoEscalateWellLevelIssue(wellName, failedValves, matrixCategory, failureCode) {
  if (!window.escalationSystem) {
    console.warn('Escalation system not available for well-level escalation');
    return null;
  }

  // Only escalate well-level issues for severe matrix categories
  const severeCategories = [
    'subSurfacePlusSurfaceFailure',
    'multipleSubSurfaceFailures',
    'multipleSurfaceFailures'
  ];

  if (!severeCategories.includes(matrixCategory)) {
    return null;
  }

  const escalationDetails = {
    type: 'WELL_LEVEL_FAILURE',
    wellName: wellName,
    matrixCategory: matrixCategory,
    failureCode: failureCode,
    affectedValves: failedValves.map(v => v.valveId),
    failureCount: failedValvers.length,
    severity: getSeverityLevel(failureCode),
    summary: createWellEscalationSummary(wellName, failedValves, matrixCategory, failureCode),
    timestamp: new Date()
  };

  try {
    const escalation = window.escalationSystem.createEscalation(escalationDetails);
    console.log(`Created well-level escalation for ${wellName} (ID: ${escalation.id})`);
    return escalation;
  } catch (error) {
    console.error(`Failed to create well-level escalation for ${wellName}:`, error);
    return null;
  }
}

// Function to update escalation status when valve issues are resolved
function checkAndUpdateResolvedEscalations(wellName, currentFailedValves) {
  if (!window.activeEscalations) return;

  const wellEscalations = window.activeEscalations.filter(e => 
    e.wellName === wellName && 
    (e.status === window.escalationStatus.PENDING || 
     e.status === window.escalationStatus.UNDER_REVIEW ||
     e.status === window.escalationStatus.ESCALATED)
  );

  const currentFailedValveIds = currentFailedValves.map(v => v.valveId);

  wellEscalations.forEach(escalation => {
    // If escalation is for a valve that's no longer failing, mark as resolved
    if (escalation.valveId && !currentFailedValveIds.includes(escalation.valveId)) {
      try {
        window.escalationSystem.updateEscalationStatus(
          escalation.id, 
          window.escalationStatus.RESOLVED,
          'Valve test now passing - auto-resolved'
        );
        console.log(`Auto-resolved escalation ${escalation.id} for valve ${escalation.valveId}`);
      } catch (error) {
        console.error(`Failed to auto-resolve escalation ${escalation.id}:`, error);
      }
    }
  });
}

// =================== NOTIFICATION SYSTEM INTEGRATION ===================

// Function to send notifications for critical escalations
function sendCriticalEscalationNotifications(escalation) {
  if (!escalation || escalation.severity !== 'CRITICAL') {
    return;
  }

  const notificationData = {
    type: 'CRITICAL_VALVE_FAILURE',
    wellName: escalation.wellName,
    valveId: escalation.valveId,
    failureCode: escalation.failureCode,
    message: `Critical valve failure detected: ${escalation.wellName} - ${escalation.valveId}`,
    timestamp: new Date(),
    escalationId: escalation.id
  };

  // Send to notification system if available
  if (window.notificationSystem && typeof window.notificationSystem.send === 'function') {
    try {
      window.notificationSystem.send(notificationData);
      console.log(`Sent critical escalation notification for ${escalation.wellName}`);
    } catch (error) {
      console.error('Failed to send critical escalation notification:', error);
    }
  }

  // Also trigger any registered critical failure callbacks
  if (window.criticalFailureCallbacks && Array.isArray(window.criticalFailureCallbacks)) {
    window.criticalFailureCallbacks.forEach(callback => {
      try {
        callback(escalation);
      } catch (error) {
        console.error('Error in critical failure callback:', error);
      }
    });
  }
}

// =================== MAINTENANCE SCHEDULING INTEGRATION ===================

// Function to suggest maintenance windows based on escalation patterns
function suggestMaintenanceWindows(wellName) {
  if (!window.activeEscalations) return null;

  const wellEscalations = window.activeEscalations.filter(e => e.wellName === wellName);
  
  if (wellEscalations.length === 0) return null;

  // Analyze escalation patterns to suggest optimal maintenance timing
  const criticalEscalations = wellEscalations.filter(e => e.severity === 'CRITICAL');
  const highPriorityEscalations = wellEscalations.filter(e => e.severity === 'HIGH');

  let maintenanceUrgency = 'ROUTINE';
  let suggestedWindow = 30; // days

  if (criticalEscalations.length > 0) {
    maintenanceUrgency = 'URGENT';
    suggestedWindow = 7;
  } else if (highPriorityEscalations.length >= 2) {
    maintenanceUrgency = 'HIGH_PRIORITY';
    suggestedWindow = 14;
  } else if (wellEscalations.length >= 3) {
    maintenanceUrgency = 'SCHEDULED';
    suggestedWindow = 21;
  }

  return {
    wellName: wellName,
    urgency: maintenanceUrgency,
    suggestedWindowDays: suggestedWindow,
    affectedValves: [...new Set(wellEscalations.map(e => e.valveId))],
    escalationCount: wellEscalations.length,
    criticalCount: criticalEscalations.length,
    generatedAt: new Date()
  };
}
// =================== Export Functions ===================

// Export the escalation system to global scope
window.ValveFailureEscalationSystem = ValveFailureEscalationSystem;
window.autoEscalateFailedValve = autoEscalateFailedValve;
window.createEscalationDashboard = createEscalationDashboard;
window.showEscalationModal = showEscalationModal;
window.refreshEscalationData = refreshEscalationData;

console.log('Valve Failure Escalation System initialized successfully');