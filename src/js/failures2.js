/**
 * Enhanced valve failure analysis using the well failure matrix
 * Extends the existing valve failure details panel with matrix-based analysis
 */

/**
 * Enhanced function to determine failure type using the well failure matrix
 * @param {Object} test - The test result object
 * @param {string} valveType - The valve type (HWV, SCSSV, etc.)
 * @param {Object} well - The well object containing type information
 * @return {Object} Comprehensive failure analysis data
 */
function getMatrixBasedFailureAnalysis(test, valveType, well) {
  if (!test || !valveType) {
    return {
      category: "unknown",
      number: null,
      failureCode: null,
      matrixDescription: "Unknown failure",
      mitigatingAction: null,
      wellType: null
    };
  }

  // Get well type for matrix lookup
  const wellTypeObj = well && well.type ? 
    window.wellTypes.find(wt => wt.name === well.type) : null;
  const wellType = wellTypeObj ? wellTypeObj.mappedType : "Producer"; // Default to Producer

  // Map valve type to failure category and number
  let category = "singleSurfaceFailure"; // Default category
  let number = 1; // Default number

  // Map valve type to specific failure category and number
  switch(valveType) {
    case "SCSSV":
      category = "singleSurfaceFailure";
      number = 1;
      break;
    case "HMV":
    case "UPV":
      category = "singleSurfaceFailure";
      number = 2;
      break;
    case "HWV":
    case "MWV":
    case "PWV":
      category = "singleSurfaceFailure";
      number = 3;
      break;
    case "MMV":
    case "LMV":
      category = "singleSurfaceFailure";
      number = 4;
      break;
    case "SV":
      category = "singleSurfaceFailure";
      number = 5;
      break;
    default:
      // If we can't determine the exact valve type, check leak rate
      if (test.leakRate > test.criticalRate) {
        category = "singleSubSurfaceFailure";
        number = 3;
      }
      break;
  }

  // Check for multiple failures 
  if (test.failure_reasons && test.failure_reasons.length > 1) {
    // Check for specific combinations of failures
    const hasDownholeFailure = test.failure_reasons.some(r => 
      r.toLowerCase().includes("scssv") || r.toLowerCase().includes("downhole"));

    const hasSurfaceFailure = test.failure_reasons.some(r => 
      r.toLowerCase().includes("hwv") || r.toLowerCase().includes("pwv") || 
      r.toLowerCase().includes("hmv") || r.toLowerCase().includes("upv"));

    if (hasDownholeFailure && hasSurfaceFailure) {
      category = "multipleSurfaceFailures";
      number = 1;
    }
  }

  // Look up the failure code from the matrix based on determined category and number
  const failureCode = window.wellFailureModel.getFailureCode(category, number, wellType);
  
  // Get the matrix description for this failure
  const matrixDesc = window.wellFailureMatrix[category] && 
                    window.wellFailureMatrix[category][number] ? 
                    window.wellFailureMatrix[category][number].description : 
                    "Failure not specified in matrix";

  // Get the mitigation action for this failure code
  const mitigatingAction = window.wellFailureModel.getMitigatingAction(failureCode);

  return {
    category,
    number,
    failureCode,
    matrixDescription: matrixDesc,
    mitigatingAction,
    wellType
  };
}

/**
 * Enhanced function to render valve failure details using matrix data
 */
function renderEnhancedValveFailureDetailsPanel(panel, wellId, valveId, valveName, failedTests) {
  // Get the well information
  const well = (window.wells || []).find(w => w.id === wellId);
  if (!well) {
    console.error(`Well ${wellId} not found for valve failure analysis`);
    return renderBasicValveFailureDetailsPanel(panel, wellId, valveId, valveName, failedTests);
  }
  
  // Get the valve type from the name
  let valveType = extractValveTypeFromName(valveName);
  
  // If there are no failed tests, show the basic panel
  if (!failedTests || failedTests.length === 0) {
    return renderBasicValveFailureDetailsPanel(panel, wellId, valveId, valveName, []);
  }
  
  // Get the most recent failure
  const mostRecentFailure = failedTests[0];
  
  // Get matrix-based analysis
  const analysis = getMatrixBasedFailureAnalysis(mostRecentFailure, valveType, well);
  
  // Get traffic light color based on failure code
  const trafficLight = analysis.mitigatingAction ? analysis.mitigatingAction.trafficLight : "red";
  const trafficLightColor = {
    red: "#e64a3a",
    orange: "#ff9800", 
    yellow: "#e6c23a",
    green: "#19d219"
  }[trafficLight] || "#e64a3a";
  
  // Create recommendations based on matrix mitigation action
  let recommendations = [];
  
  if (analysis.mitigatingAction) {
    // Primary recommendation from matrix
    recommendations.push(analysis.mitigatingAction.description);
    
    // Add valve-type specific recommendations
    if (valveType === "HWV" || valveType === "MWV" || valveType === "PWV") {
      recommendations.push("Check hydraulic pressure to actuator");
      recommendations.push("Inspect valve sealing surfaces");
      recommendations.push("Verify valve alignment and seat condition");
    } else if (valveType === "SCSSV") {
      recommendations.push("Test control line hydraulic integrity");
      recommendations.push("Verify hydraulic pressure to valve");
      recommendations.push("Consider wireline intervention to check for obstructions");
    } else if (valveType === "SV") {
      recommendations.push("Check manual operator functionality");
      recommendations.push("Inspect seal condition");
      recommendations.push("Test backup actuation mechanisms");
    }
  } else {
    // Fallback recommendations
    recommendations = window.valveFailureDetails.recommendations.unknown;
  }
  
  // Format the header based on traffic light
  let html = `
    <div class="panel-header" style="background-color: ${trafficLightColor}">
      <h3>Valve Failure Analysis</h3>
      <button class="close-btn" onclick="hideValveFailureDetailsPanel()">&times;</button>
    </div>
    <div class="panel-content">
  `;
  
  // Show enhanced failure summary with matrix data
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
          <span class="label">Matrix Category:</span>
          <span class="value">${formatCategory(analysis.category)}</span>
        </div>
        <div class="data-item">
          <span class="label">Failure Code:</span>
          <span class="value" style="font-weight: bold; color: ${trafficLightColor}">
            ${analysis.failureCode !== null ? analysis.failureCode : 'N/A'}
          </span>
        </div>
      </div>
    </div>
    
    <div class="failure-diagnosis">
      <h4>Diagnosis</h4>
      <p class="diagnosis-text">${analysis.matrixDescription || "No matrix description available"}</p>
    </div>
    
    <div class="required-action">
      <h4>Required Action</h4>
      <div class="action-box" style="border-left: 4px solid ${trafficLightColor}">
        ${analysis.mitigatingAction ? analysis.mitigatingAction.description : 'Action required - see supervisor'}
      </div>
    </div>
    
    <div class="technical-details">
      <h4>Technical Details</h4>
      <div class="details-grid">
        <div class="detail-item">
          <span class="label">Well Type:</span>
          <span class="value">${well.type || 'Unknown'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Leak Rate:</span>
          <span class="value">${formatLeakRate(mostRecentFailure)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Critical Rate:</span>
          <span class="value">${formatCriticalRate(mostRecentFailure)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Test Valid:</span>
          <span class="value">${mostRecentFailure.test_valid ? 'Yes' : 'No'}</span>
        </div>
      </div>
      
      <div class="failure-reasons">
        <h5>Failure Reasons:</h5>
        <ul>
          ${(mostRecentFailure.failure_reasons || ['Unknown reason']).map(reason => `<li>${reason}</li>`).join('')}
        </ul>
      </div>
    </div>
    
    <div class="recommendations">
      <h4>Recommendations</h4>
      <ul class="recommendation-list">
        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  `;
  
  // Add failure history if available
  if (failedTests.length > 0) {
    html += `
      <div class="failure-history">
        <h4>Failure History</h4>
        ${getFailureHistoryHtml(failedTests)}
      </div>
    `;
  }
  
  // Add maintenance planning section for multiple failures
  if (failedTests.length > 1) {
    html += `
      <div class="maintenance-planning">
        <h4>Maintenance Planning</h4>
        <p>This valve has failed ${failedTests.length} times. Schedule maintenance according to failure code ${analysis.failureCode}.</p>
        <div class="action-buttons">
          <button class="primary-btn" onclick="raiseDeviationForValve('${wellId}', '${valveId}')">
            Raise Deviation
          </button>
          <button class="secondary-btn" onclick="scheduleMaintenance('${wellId}', '${valveId}')">
            Schedule Maintenance
          </button>
        </div>
      </div>
    `;
  }
  
  html += `</div>`;
  panel.innerHTML = html;
}

/**
 * Helper function to extract valve type from name
 */
function extractValveTypeFromName(valveName) {
  if (!valveName) return "unknown";
  
  const valveLowerCase = valveName.toLowerCase();
  
  if (valveLowerCase.includes('scssv')) return 'SCSSV';
  if (valveLowerCase.includes('hwv')) return 'HWV';
  if (valveLowerCase.includes('mwv')) return 'MWV';
  if (valveLowerCase.includes('pwv')) return 'PWV';
  if (valveLowerCase.includes('hmv')) return 'HMV';
  if (valveLowerCase.includes('upv')) return 'HMV'; // UPV is equivalent to HMV
  if (valveLowerCase.includes('mmv')) return 'MMV';
  if (valveLowerCase.includes('lmv')) return 'MMV'; // LMV is equivalent to MMV
  if (valveLowerCase.includes('sv')) return 'SV';
  if (valveLowerCase.includes('swab')) return 'SV';
  
  // Check for abbreviations that might be at the start of the name
  const valveTypes = ['HWV', 'MWV', 'PWV', 'HMV', 'UPV', 'MMV', 'LMV', 'SV'];
  for (const type of valveTypes) {
    if (valveName.startsWith(type)) {
      return type;
    }
  }
  
  return "unknown";
}

/**
 * Format category name for display
 */
function formatCategory(category) {
  const displayNames = {
    'maintenanceFailure': 'Maintenance Schedule Failure',
    'singleSurfaceFailure': 'Single Surface Failure',
    'multipleSurfaceFailures': 'Multiple Surface Failures',
    'singleSubSurfaceFailure': 'Single Sub-Surface Failure',
    'multipleSubSurfaceFailures': 'Multiple Sub-Surface Failures', 
    'subSurfacePlusSurfaceFailure': 'Surface + Sub-Surface Failure'
  };
  
  return displayNames[category] || category;
}

/**
 * Format critical rate for display
 */
function formatCriticalRate(test) {
  if (!test) return 'N/A';
  
  if (test.criticalRate !== undefined) {
    return `${Number(test.criticalRate).toFixed(3)} scfm`;
  }
  
  return 'N/A';
}

// Override the existing renderValveFailureDetailsPanel function
window.originalRenderValveFailureDetailsPanel = renderValveFailureDetailsPanel;
renderValveFailureDetailsPanel = renderEnhancedValveFailureDetailsPanel;

// Keep the basic panel rendering function for fallback
function renderBasicValveFailureDetailsPanel(panel, wellId, valveId, valveName, failedTests) {
  return window.originalRenderValveFailureDetailsPanel(panel, wellId, valveId, valveName, failedTests);
}