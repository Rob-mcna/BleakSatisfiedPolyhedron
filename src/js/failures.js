/**
 * Valve Failure Details Panel
 * Shows detailed information about valve failures and diagnostic data
 */

// Initialize global state for failure details
window.valveFailureDetails = {
  activeValveId: null,
  failureHistory: {},
  failureCauses: {
    "leak_rate_too_high": "Valve sealing surfaces worn or damaged",
    "pressure_drop_too_fast": "Internal components may be compromised",
    "incomplete_closure": "Obstruction preventing full valve closure",
    "control_line_issue": "Control line may be damaged or blocked",
    "mechanical_failure": "Mechanical components damaged or stuck",
    "hydraulic_system_failure": "Hydraulic system pressure insufficient",
    "electrical_actuation_failure": "Electrical components malfunctioning",
    "unknown": "Cause undetermined - further investigation required"
  },
  recommendations: {
    "leak_rate_too_high": [
      "Replace valve seals",
      "Perform valve seat reconditioning",
      "Consider full valve replacement if wear is extensive"
    ],
    "pressure_drop_too_fast": [
      "Inspect valve internals for damage",
      "Check for bypassing flow paths",
      "Pressure test upstream and downstream components"
    ],
    "incomplete_closure": [
      "Flush valve to remove potential debris",
      "Increase actuator force if possible",
      "Inspect valve stem and gate alignment"
    ],
    "control_line_issue": [
      "Pressure test control lines",
      "Check for blockages or restrictions",
      "Inspect for external damage to control lines"
    ],
    "mechanical_failure": [
      "Disassemble and inspect valve components",
      "Replace damaged mechanical parts",
      "Check actuator force output"
    ],
    "hydraulic_system_failure": [
      "Check hydraulic pump pressure",
      "Inspect for hydraulic fluid leaks",
      "Verify accumulator pre-charge"
    ],
    "electrical_actuation_failure": [
      "Check power supply to actuator",
      "Test solenoid operation",
      "Verify electrical connections"
    ],
    "unknown": [
      "Conduct comprehensive valve diagnostics",
      "Consider equipment replacement",
      "Monitor closely during next operation cycle"
    ]
  }
};

/**
 * Shows or updates the valve failure details panel
 * @param {string} wellId - The ID of the well
 * @param {string} valveId - The ID of the valve to display details for
 */
function showValveFailureDetailsPanel(wellId, valveId) {
  const panel = document.getElementById('valveFailureDetailsPanel');
  if (!panel) return;
  
  // Store the active valve ID
  window.valveFailureDetails.activeValveId = valveId;
  
  // Make sure the panel is visible
  panel.style.display = 'block';
  
  // Get valve test results
  const valveTests = getValveTestResults(wellId, valveId);
  const failedTests = filterFailedTests(valveTests);
  
  // Get valve information
  const valveName = getValveNameById(valveId);
  
  // Render the panel contents
  renderValveFailureDetailsPanel(panel, wellId, valveId, valveName, failedTests);
}

/**
 * Hides the valve failure details panel
 */
function hideValveFailureDetailsPanel() {
  const panel = document.getElementById('valveFailureDetailsPanel');
  if (panel) {
    panel.style.display = 'none';
  }
  window.valveFailureDetails.activeValveId = null;
}

/**
 * Renders the failure details panel with the provided data
 */
function renderValveFailureDetailsPanel(panel, wellId, valveId, valveName, failedTests) {
  // Determine failure type and recommendations
  const mostRecentFailure = failedTests.length > 0 ? failedTests[0] : null;
  const failureType = determineFailureType(mostRecentFailure);
  
  // Create a title block with close button
  let html = `
    <div class="panel-header">
      <h3>Valve Failure Analysis</h3>
      <button class="close-btn" onclick="hideValveFailureDetailsPanel()">&times;</button>
    </div>
    <div class="panel-content">
  `;
  
  // If no failures, show a message
  if (!mostRecentFailure) {
    html += `
      <div class="no-failures">
        <p>No failures detected for valve ${valveName}.</p>
        <p>All tests are passing or no tests have been performed yet.</p>
      </div>
    `;
  } else {
    // Show failure summary
    html += `
      <div class="failure-summary">
        <h4>Failure Summary</h4>
        <div class="summary-data">
          <div class="data-item">
            <span class="label">Valve:</span>
            <span class="value">${valveName}</span>
          </div>
          <div class="data-item">
            <span class="label">Last Failed:</span>
            <span class="value">${formatTestTimestamp(mostRecentFailure)}</span>
          </div>
          <div class="data-item">
            <span class="label">Failure Type:</span>
            <span class="value">${failureType}</span>
          </div>
          <div class="data-item">
            <span class="label">Leak Rate:</span>
            <span class="value">${formatLeakRate(mostRecentFailure)}</span>
          </div>
        </div>
      </div>
      
      <div class="failure-diagnosis">
        <h4>Diagnosis</h4>
        <p class="diagnosis-text">${window.valveFailureDetails.failureCauses[failureType] || "Unknown cause"}</p>
      </div>
      
      <div class="failure-recommendations">
        <h4>Recommended Actions</h4>
        <ul class="recommendations-list">
          ${getRecommendationsHtml(failureType)}
        </ul>
      </div>
      
      <div class="failure-history">
        <h4>Failure History</h4>
        ${getFailureHistoryHtml(failedTests)}
      </div>
    `;
    
    // Add a section for maintenance planning if we have more than one failure
    if (failedTests.length > 1) {
      html += `
        <div class="maintenance-planning">
          <h4>Maintenance Planning</h4>
          <p>This valve has failed ${failedTests.length} times. Consider scheduling maintenance during the next workover.</p>
          <button class="primary-btn" onclick="scheduleMaintenance('${wellId}', '${valveId}')">Schedule Maintenance</button>
        </div>
      `;
    }
  }
  
  html += `
    </div>
  `;
  
  panel.innerHTML = html;
}

/**
 * Gets the valve test results for a specific valve
 */
function getValveTestResults(wellId, valveId) {
  if (!window.valveTestResults) return [];
  
  // Look for well data under both ID and name
  const well = (window.wells || []).find(w => w.id === wellId);
  const wellName = well ? well.name : null;
  
  // Try both wellId and wellName as keys
  const wellResults = (window.valveTestResults[wellId] || window.valveTestResults[wellName] || {});
  const valveTests = wellResults[valveId] || [];
  
  console.log(`Found ${Array.isArray(valveTests) ? valveTests.length : 'object'} tests for valve ${valveId} in well ${wellId}`);
  
  if (Array.isArray(valveTests)) {
    return valveTests;
  } else if (typeof valveTests === 'object' && valveTests !== null) {
    return [valveTests];
  }
  
  return [];
}

/**
 * Filters failed tests from all test results
 */
function filterFailedTests(tests) {
  return tests.filter(test => 
    test && (
      test.status === 'fail' || 
      test.pass === false || 
      test.test_valid === false ||
      (test.leak_rate_pass === false)
    )
  ).sort((a, b) => {
    // Sort by timestamp, newest first
    const timeA = getTimestampFromTest(a);
    const timeB = getTimestampFromTest(b);
    return timeB - timeA;
  });
}

/**
 * Gets a timestamp from a test object
 */
function getTimestampFromTest(test) {
  if (test.utc_timestamp) {
    return new Date(test.utc_timestamp).getTime();
  }
  if (test.inputs && test.inputs.timestamp) {
    return new Date(test.inputs.timestamp).getTime();
  }
  return 0;
}

/**
 * Formats a test timestamp for display
 */
function formatTestTimestamp(test) {
  if (test.utc_timestamp) {
    return new Date(test.utc_timestamp).toLocaleString();
  }
  if (test.inputs && test.inputs.timestamp) {
    return new Date(test.inputs.timestamp).toLocaleString();
  }
  return "Unknown Date";
}

/**
 * Formats a leak rate for display
 */
function formatLeakRate(test) {
  if (test.leakRate !== undefined) {
    return `${Number(test.leakRate).toFixed(3)} scfm`;
  }
  return "N/A";
}

/**
 * Determines the type of failure based on test data
 */
function determineFailureType(test) {
  if (!test) return "unknown";
  
  // Logic to determine failure type based on test data
  if (test.leakRate > 0.5) {
    return "leak_rate_too_high";
  }
  
  if (test.Pa && test.Pf && (test.Pa - test.Pf) > 500) {
    return "pressure_drop_too_fast";
  }
  
  if (test.failure_reasons) {
    if (test.failure_reasons.includes("control_line")) {
      return "control_line_issue";
    }
    if (test.failure_reasons.includes("mechanical")) {
      return "mechanical_failure";
    }
    if (test.failure_reasons.includes("hydraulic")) {
      return "hydraulic_system_failure";
    }
    if (test.failure_reasons.includes("electrical")) {
      return "electrical_actuation_failure";
    }
  }
  
  return "unknown";
}

/**
 * Generates HTML for recommendations based on failure type
 */
function getRecommendationsHtml(failureType) {
  const recommendations = window.valveFailureDetails.recommendations[failureType] || 
                         window.valveFailureDetails.recommendations.unknown;
  
  return recommendations.map(rec => `<li>${rec}</li>`).join('');
}

/**
 * Generates HTML for failure history
 */
function getFailureHistoryHtml(failedTests) {
  if (failedTests.length === 0) {
    return "<p>No failure history available.</p>";
  }
  
  let html = `<table class="failure-history-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Leak Rate</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>`;
  
  failedTests.forEach(test => {
    html += `
      <tr>
        <td>${formatTestTimestamp(test)}</td>
        <td>${formatLeakRate(test)}</td>
        <td>Failed</td>
      </tr>
    `;
  });
  
  html += `</tbody></table>`;
  return html;
}

/**
 * Placeholder for scheduling maintenance function
 */
function scheduleMaintenance(wellId, valveId) {
  const valveName = getValveNameById(valveId);
  alert(`Maintenance scheduled for ${valveName} on well ${getWellNameById(wellId)}`);
  
  // In a real implementation, this would open a modal or redirect to a maintenance scheduling interface
}

// Initialize the panel when the document is ready
document.addEventListener("DOMContentLoaded", function() {
  // This will be called when the document is fully loaded
  console.log("Valve failure details panel initialized");
});