// =================== Escalation Logic Integration ===================

// Decision-making chain for escalation
window.ESCALATION_CHAIN = [
  { role: 'Production Manager', key: 'productionManager', escalateTo: 1 },
  { role: 'Operations Director', key: 'operationsDirector', escalateTo: 2 },
  { role: 'Country Manager', key: 'countryManager', escalateTo: null } // Final authority
];

// Example: assigned users for each role (replace with your actual users/emails)
window.ESCALATION_DECISION_MAKERS = {
  productionManager: { name: "Jane Smith", email: "prod.manager@company.com" },
  operationsDirector: { name: "Paul Jones", email: "ops.director@company.com" },
  countryManager: { name: "Sara Lee", email: "country.manager@company.com" }
};

/**
 * EscalationCase - workflow state for a specific valve failure event.
 * This is attached to window for broad access from anywhere in your dashboard.
 */
class EscalationCase {
  constructor({ issueSummary, well, valve, details, leadEngineer }) {
    this.issue = { summary: issueSummary, well, valve, details };
    this.leadEngineer = leadEngineer;
    this.status = 'pending'; // pending, resolved, closed
    this.currentLevel = 0;   // Index in ESCALATION_CHAIN
    this.history = [];       // [{by, role, action, notes, date}]
    this.notified = window.ESCALATION_CHAIN.map(lvl => window.ESCALATION_DECISION_MAKERS[lvl.key]);
  }

  getCurrentRole() {
    return window.ESCALATION_CHAIN[this.currentLevel]?.role;
  }
  getCurrentDecisionMaker() {
    return window.ESCALATION_DECISION_MAKERS[window.ESCALATION_CHAIN[this.currentLevel]?.key];
  }
  getEscalationHistory() {
    return this.history;
  }
  isFinalLevel() {
    return this.currentLevel === window.ESCALATION_CHAIN.length - 1;
  }

  // Only the current decision-maker can act
  act({ by, action, notes }) {
    const currentRole = this.getCurrentRole();
    const currentUser = this.getCurrentDecisionMaker();
    if (!currentUser || by !== currentUser.name) {
      throw new Error(`Only the current decision maker (${currentUser?.name}) can act at this stage.`);
    }
    if (action === 'resolve') {
      this.status = 'resolved';
      this.history.push({ by, role: currentRole, action, notes, date: new Date().toISOString() });
      return `Issue resolved by ${by}.`;
    } else if (action === 'escalate') {
      if (this.isFinalLevel()) {
        this.status = 'closed';
        this.history.push({ by, role: currentRole, action: 'escalate', notes, date: new Date().toISOString() });
        return `No further escalation possible. Case closed at ${currentRole}.`;
      } else {
        this.history.push({ by, role: currentRole, action: 'escalate', notes, date: new Date().toISOString() });
        this.currentLevel += 1;
        return `Escalated to ${this.getCurrentRole()}.`;
      }
    } else {
      throw new Error('Invalid action. Use "resolve" or "escalate".');
    }
  }

  // Notify all decision-makers at creation (replace with real notification)
  static notifyAll(caseInstance) {
    caseInstance.notified.forEach(user => {
      // Replace below with your real notification system
      console.log(`Notification: Sent to ${user.name} (${user.email}) about valve failure on ${caseInstance.issue.well}.`);
    });
  }
}

// Attach to window for global access
window.EscalationCase = EscalationCase;

// =================== Hook into valve failure dashboard workflow ===================

/**
 * Usage: When a valve failure is detected and needs escalation,
 * call this function with relevant details.
 * It will create the escalation, notify all, and can be managed by decision-makers.
 */
window.triggerValveFailureEscalation = function({ well, valve, details, leadEngineer }) {
  const caseObj = new window.EscalationCase({
    issueSummary: `Valve ${valve} failed test`,
    well: well.name || well.id,
    valve,
    details,
    leadEngineer
  });
  window.EscalationCase.notifyAll(caseObj);
  // You may want to store this caseObj somewhere for audit/history
  if (!window.activeEscalations) window.activeEscalations = [];
  window.activeEscalations.push(caseObj);
  return caseObj;
};

// Example integration in your code: When a failed test is detected
// In the getLiveStatusForAllRings or similar function, you could trigger escalation:
// (You can also add a button in the UI to allow the lead engineer to escalate on demand.)

/*
if (failedValves.length && shouldEscalate) { // shouldEscalate is your logic
  window.triggerValveFailureEscalation({
    well,
    valve: failedValves[0].valveLabel, // or loop for all failed
    details: failedValves[0].failureReason,
    leadEngineer: window.currentUser ? window.currentUser.login : 'Unknown'
  });
}
*/

// Decision-makers resolve/escalate via:
/// caseObj.act({ by: "Jane Smith", action: "escalate", notes: "Escalating to ops director." });
