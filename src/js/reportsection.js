// ==========================================
// ENHANCED COMPREHENSIVE REPORTS SECTION FOR WELL INTEGRITY MANAGEMENT TOOL
// ==========================================

// Global variables for export functionality
let lastReportData = [];
let lastReportHeaders = [];
let lastWellInfoData = [];
let lastInitialConditionsData = [];
let lastFinalConditionsData = [];
let lastReportType = '';
let lastReportSummary = {};

/**
 * Main function to render the enhanced reports section
 */
function renderReportsSection() {
  const reportsContainer = document.getElementById('reportsSection');
  if (!reportsContainer) return;

  const html = `
    <div class="reports-header">
      <h2>Well Integrity Test Reports & Analysis</h2>
      <p>Comprehensive reporting and analysis of your well integrity testing program</p>
    </div>
    
    <div class="report-controls">
      <div class="report-type-selection">
        <label for="reportTypeSelect">Report Type:</label>
        <select id="reportTypeSelect">
          <option value="">-- Select Report Type --</option>
          <option value="valveTestResults">Valve Test Results Summary</option>
          <option value="testFailureSummary">Critical Failure Analysis Report</option>
          <option value="detailedTestResults">Detailed Technical Results</option>
          <option value="wellOverview">Well Integrity Overview</option>
          <option value="complianceReport">Regulatory Compliance Report</option>
          <option value="riskAssessment">Risk Assessment Report</option>
        </select>
      </div>
      
      <div id="reportFiltersContainer" class="report-filters">
        <!-- Filters will be populated dynamically -->
      </div>
      
      <div class="report-actions">
        <button id="generateReportBtn" class="primary-btn" disabled>Generate Report</button>
        <button id="exportPdfBtn" class="secondary-btn" disabled>Export PDF</button>
        <button id="exportCsvBtn" class="secondary-btn" disabled>Export CSV</button>
        <button id="printReportBtn" class="secondary-btn" disabled>Print Report</button>
      </div>
    </div>
    
    <div id="reportOutputContainer" class="report-output">
      <div class="report-placeholder">
        <div class="placeholder-content">
          <h3>Ready to Generate Reports</h3>
          <p>Select a report type and configure your filters to generate comprehensive well integrity analysis</p>
          <ul class="feature-list">
            <li>Detailed failure analysis</li>
            <li>Statistical summaries</li>
            <li>Compliance reporting</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  
  reportsContainer.innerHTML = html;
  setupReportEventHandlers();
}

/**
 * Setup event handlers for report controls
 */
function setupReportEventHandlers() {
  const reportTypeSelect = document.getElementById('reportTypeSelect');
  const generateBtn = document.getElementById('generateReportBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const printBtn = document.getElementById('printReportBtn');
  
  if (reportTypeSelect) {
    reportTypeSelect.onchange = function() {
      setupReportFilters(this.value);
      generateBtn.disabled = !this.value;
      exportPdfBtn.disabled = true;
      exportCsvBtn.disabled = true;
      printBtn.disabled = true;
    };
  }
  
  if (generateBtn) {
    generateBtn.onclick = generateReport;
  }
  
  if (exportPdfBtn) {
    exportPdfBtn.onclick = exportCurrentReportPDF;
  }
  
  if (exportCsvBtn) {
    exportCsvBtn.onclick = exportCurrentReportCSV;
  }
  
  if (printBtn) {
    printBtn.onclick = printCurrentReport;
  }
}

/**
 * Setup enhanced filters based on selected report type
 */
function setupReportFilters(reportType) {
  const filtersContainer = document.getElementById('reportFiltersContainer');
  if (!filtersContainer) return;
  
  let filtersHtml = '';
  
  switch (reportType) {
    case 'valveTestResults':
      filtersHtml = `
        <div class="filter-group">
          <label for="wellFilter">Select Well:</label>
          <select id="wellFilter">
            <option value="">All Wells</option>
            ${(window.wells || []).map(well => 
              `<option value="${well.id}">${well.name || well.id}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="valveTypeFilter">Valve Type:</label>
          <select id="valveTypeFilter">
            <option value="">All Valve Types</option>
            <option value="SCSSV">SCSSV (Subsurface Safety)</option>
            <option value="MMV">MMV (Master Manual)</option>
            <option value="HMV">HMV (High Pressure Manual)</option>
            <option value="MWV">MWV (Manual Wing)</option>
            <option value="HWV">HWV (High Pressure Wing)</option>
            <option value="SV">SV (Safety Valve)</option>
            <option value="PFSV">PFSV (Production Flow Safety)</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="testStatusFilter">Test Status:</label>
          <select id="testStatusFilter">
            <option value="">All Results</option>
            <option value="pass">Passed Tests Only</option>
            <option value="fail">Failed Tests Only</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="includeSummaryStats">Include Statistics:</label>
          <input type="checkbox" id="includeSummaryStats" checked>
        </div>
      `;
      break;
      
    case 'testFailureSummary':
    case 'riskAssessment':
      filtersHtml = `
        <div class="filter-group">
          <label for="wellFilter">Select Well:</label>
          <select id="wellFilter">
            <option value="">All Wells</option>
            ${(window.wells || []).map(well => 
              `<option value="${well.id}">${well.name || well.id}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="valveTypeFilter">Valve Type:</label>
          <select id="valveTypeFilter">
            <option value="">All Valve Types</option>
            <option value="SCSSV">SCSSV (Critical Subsurface)</option>
            <option value="MMV">MMV (Master Manual)</option>
            <option value="HMV">HMV (High Pressure Manual)</option>
            <option value="MWV">MWV (Manual Wing)</option>
            <option value="HWV">HWV (High Pressure Wing)</option>
            <option value="SV">SV (Safety Valve)</option>
            <option value="PFSV">PFSV (Production Flow Safety)</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="severityFilter">Failure Severity:</label>
          <select id="severityFilter">
            <option value="">All Severities</option>
            <option value="critical">Critical Failures</option>
            <option value="major">Major Failures</option>
            <option value="minor">Minor Issues</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="includeRecommendations">Include Recommendations:</label>
          <input type="checkbox" id="includeRecommendations" checked>
        </div>
      `;
      break;
      
    case 'detailedTestResults':
      filtersHtml = `
        <div class="filter-group">
          <label for="wellFilter">Select Well:</label>
          <select id="wellFilter">
            <option value="">All Wells</option>
            ${(window.wells || []).map(well => 
              `<option value="${well.id}">${well.name || well.id}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="valveTypeFilter">Valve Type:</label>
          <select id="valveTypeFilter">
            <option value="">All Valve Types</option>
            <option value="SCSSV">SCSSV</option>
            <option value="MMV">MMV</option>
            <option value="HMV">HMV</option>
            <option value="MWV">MWV</option>
            <option value="HWV">HWV</option>
            <option value="SV">SV</option>
            <option value="PFSV">PFSV</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="testStatusFilter">Test Status:</label>
          <select id="testStatusFilter">
            <option value="">All Results</option>
            <option value="pass">Passed Only</option>
            <option value="fail">Failed Only</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="includeCalculations">Include Calculations:</label>
          <input type="checkbox" id="includeCalculations" checked>
        </div>
      `;
      break;
      
    case 'wellOverview':
    case 'complianceReport':
      filtersHtml = `
        <div class="filter-group">
          <label for="wellFilter">Select Well:</label>
          <select id="wellFilter">
            <option value="">All Wells</option>
            ${(window.wells || []).map(well => 
              `<option value="${well.id}">${well.name || well.id}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="includeCompliance">Compliance Details:</label>
          <input type="checkbox" id="includeCompliance" checked>
        </div>
        
        <div class="filter-group">
          <label for="includeRecommendations">Include Recommendations:</label>
          <input type="checkbox" id="includeRecommendations" checked>
        </div>
        
        <div class="filter-group">
          <label for="riskLevel">Assessment Level:</label>
          <select id="riskLevel">
            <option value="basic">Basic Assessment</option>
            <option value="detailed">Detailed Analysis</option>
            <option value="comprehensive">Comprehensive Review</option>
          </select>
        </div>
      `;
      break;
  }
  
  filtersContainer.innerHTML = filtersHtml;
}

/**
 * Generate enhanced report based on selected type and filters
 */
/**
 * Updated generateReport function to store three-table data
 */
function generateReport() {
  const reportType = document.getElementById('reportTypeSelect')?.value;
  if (!reportType) return;
  
  lastReportType = reportType;
  
  // Get filter values
  const filters = getFilterValues();
  
  // Generate report data (keeping the old structure for compatibility)
  let reportData = [];
  let reportHeaders = [];
  let reportSummary = {};
  
  switch (reportType) {
    case 'valveTestResults':
      ({ data: reportData, headers: reportHeaders, summary: reportSummary } = generateEnhancedValveTestResultsReport(filters));
      break;
    case 'testFailureSummary':
      ({ data: reportData, headers: reportHeaders, summary: reportSummary } = generateEnhancedTestFailureSummaryReport(filters));
      break;
    case 'detailedTestResults':
      ({ data: reportData, headers: reportHeaders, summary: reportSummary } = generateEnhancedDetailedTestResultsReport(filters));
      break;
    case 'wellOverview':
      ({ data: reportData, headers: reportHeaders, summary: reportSummary } = generateEnhancedWellOverviewReport(filters));
      break;
    case 'complianceReport':
      ({ data: reportData, headers: reportHeaders, summary: reportSummary } = generateComplianceReport(filters));
      break;
    case 'riskAssessment':
      ({ data: reportData, headers: reportHeaders, summary: reportSummary } = generateRiskAssessmentReport(filters));
      break;
  }
  
  // Store the three-table data for exports
  const { wellInfoData, initialConditionsData, finalConditionsData } = processDataForTwoTables();
  lastWellInfoData = wellInfoData;
  lastInitialConditionsData = initialConditionsData;
  lastFinalConditionsData = finalConditionsData;
  lastReportSummary = reportSummary;
  
  // Store old format for backward compatibility
  lastReportData = reportData;
  lastReportHeaders = reportHeaders;
  
  // Display enhanced report
  displayEnhancedReport(reportData, reportHeaders, reportType, reportSummary);
  
  // Enable export buttons
  document.getElementById('exportPdfBtn').disabled = false;
  document.getElementById('exportCsvBtn').disabled = false;
  document.getElementById('printReportBtn').disabled = false;
}


/**
 * Get current filter values
 */
function getFilterValues() {
  return {
    well: document.getElementById('wellFilter')?.value || '',
    valveType: document.getElementById('valveTypeFilter')?.value || '',
    testStatus: document.getElementById('testStatusFilter')?.value || '',
    severityFilter: document.getElementById('severityFilter')?.value || '',
    includeCompliance: document.getElementById('includeCompliance')?.checked || false,
    includeRecommendations: document.getElementById('includeRecommendations')?.checked || false,
    includeSummaryStats: document.getElementById('includeSummaryStats')?.checked || false,
    includeCalculations: document.getElementById('includeCalculations')?.checked || false,
    riskLevel: document.getElementById('riskLevel')?.value || 'basic'
  };
}

/**
 * Determine failure reasons based on test data and valve type
 */
function determineFailureReasons(test, valveType) {
  const reasons = [];
  
  // If explicit failure_reasons exist, use them
  if (test.failure_reasons && Array.isArray(test.failure_reasons) && test.failure_reasons.length > 0) {
    return test.failure_reasons;
  }
  
  // Otherwise, analyze the test data to determine failure reasons
  
  // Check leak rate failure
  if (test.leakRate && test.criticalRate && test.leakRate > test.criticalRate) {
    reasons.push(`Leak rate too high: ${test.leakRate.toFixed(3)} scfm exceeds critical rate of ${test.criticalRate.toFixed(3)} scfm`);
  } else if (test.leak_rate_pass === false) {
    reasons.push('Leak rate test failed');
  }
  
  // Check pressure drop issues
  if (test.Pa && test.Pf && (test.Pa - test.Pf) > 500) {
    reasons.push(`Excessive pressure drop: ${(test.Pa - test.Pf).toFixed(1)} psi`);
  }
  
  // Check if test was marked as invalid
  if (test.test_valid === false) {
    reasons.push('Test marked as invalid');
  }
  
  // Check general pass/fail status
  if (test.pass === false && reasons.length === 0) {
    reasons.push('Test failed validation criteria');
  }
  
  // Check valve-specific issues based on valve type
  if (valveType === 'SCSSV') {
    if (test.leakRate && test.leakRate > 0.1) {
      reasons.push('SCSSV excessive leakage - potential safety hazard');
    }
  }
  
  // If we still have no specific reasons but the test failed
  if (reasons.length === 0) {
    if (test.status === 'fail') {
      reasons.push('Test status marked as failed');
    } else {
      reasons.push('Failure criteria met but reason undetermined');
    }
  }
  
  return reasons;
}

/**
 * Enhanced valve test results report
 */
function generateEnhancedValveTestResultsReport(filters) {
  const headers = ['Well Name', 'Valve Type', 'Status', 'Leak Rate (scfm)', 'Critical Rate (scfm)', 'Failure Reasons'];
  const data = [];
  const summary = { total: 0, passed: 0, failed: 0, criticalFailures: 0 };
  
  const testResults = window.valveTestResults || {};
  
  for (const [wellKey, valveResults] of Object.entries(testResults)) {
    const well = (window.wells || []).find(w => w.id === wellKey || w.name === wellKey);
    const wellId = well?.id || wellKey;
    const wellName = well?.name || wellKey;
    
    if (filters.well && wellId !== filters.well && wellName !== filters.well) continue;
    
    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => v.id === valveId);
      const valveType = valveInfo?.name || 'Unknown';
      
      if (filters.valveType && valveType !== filters.valveType) continue;
      
      const testArray = Array.isArray(tests) ? tests : [tests];
      
      testArray.forEach(test => {
        if (!test || typeof test !== 'object') return;
        
        if (filters.testStatus && test.status !== filters.testStatus) return;
        
        summary.total++;
        if (test.status === 'pass') summary.passed++;
        else summary.failed++;
        
        // Determine failure reasons for failed tests
        let formattedFailures = 'No failures detected';
        
        if (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false) {
          const failureReasons = determineFailureReasons(test, valveType);
          formattedFailures = failureReasons.length > 0 ? failureReasons.join('; ') : 'Test failed - reason undetermined';
          
          if (valveType === 'SCSSV') {
            summary.criticalFailures++;
          }
        }
        
        data.push([
          wellName,
          valveType,
          test.status === 'pass' ? 'PASS' : 'FAIL',
          test.leakRate?.toFixed(3) || 'N/A',
          test.criticalRate?.toFixed(3) || 'N/A',
          formattedFailures
        ]);
      });
    }
  }
  
  return { data, headers, summary };
}

/**
 * Enhanced test failure summary report
 */
function generateEnhancedTestFailureSummaryReport(filters) {
  const headers = ['Well Name', 'Valve Type', 'Failure Severity', 'Primary Failure Reason', 'Secondary Issues', 'Leak Rate (scfm)', 'Recommended Action'];
  const data = [];
  const summary = { totalFailures: 0, criticalFailures: 0, majorFailures: 0, minorFailures: 0 };
  
  const testResults = window.valveTestResults || {};
  
  for (const [wellKey, valveResults] of Object.entries(testResults)) {
    const well = (window.wells || []).find(w => w.id === wellKey || w.name === wellKey);
    const wellId = well?.id || wellKey;
    const wellName = well?.name || wellKey;
    
    if (filters.well && wellId !== filters.well && wellName !== filters.well) continue;
    
    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => v.id === valveId);
      const valveType = valveInfo?.name || 'Unknown';
      
      if (filters.valveType && valveType !== filters.valveType) continue;
      
      const testArray = Array.isArray(tests) ? tests : [tests];
      
      testArray.forEach(test => {
        if (!test || (test.status === 'pass' && test.pass !== false && test.test_valid !== false && test.leak_rate_pass !== false)) return;
        
        summary.totalFailures++;
        
        // Get actual failure reasons
        const failureReasons = determineFailureReasons(test, valveType);
        
        // Determine failure severity based on valve type and failure reasons
        let severity = 'Minor';
        let recommendedAction = 'Monitor and retest within 30 days';
        
        if (valveType === 'SCSSV') {
          severity = 'Critical';
          summary.criticalFailures++;
          recommendedAction = 'IMMEDIATE ACTION REQUIRED - Shut in well and repair valve';
        } else if (failureReasons.some(r => r.toLowerCase().includes('leak rate') && r.toLowerCase().includes('exceeds'))) {
          severity = 'Major';
          summary.majorFailures++;
          recommendedAction = 'Schedule maintenance within 7 days';
        } else if (failureReasons.some(r => r.toLowerCase().includes('pressure'))) {
          severity = 'Major';
          summary.majorFailures++;
          recommendedAction = 'Schedule maintenance within 7 days';
        } else {
          summary.minorFailures++;
        }
        
        // Apply severity filter
        const severityMap = { 'critical': 'Critical', 'major': 'Major', 'minor': 'Minor' };
        if (filters.severityFilter && severity !== severityMap[filters.severityFilter]) return;
        
        const primaryFailure = failureReasons[0] || 'Test failed - reason undetermined';
        const secondaryIssues = failureReasons.length > 1 ? failureReasons.slice(1).join('; ') : 'None';
        
        data.push([
          wellName,
          valveType,
          severity,
          primaryFailure,
          secondaryIssues,
          test.leakRate?.toFixed(3) || 'N/A',
          recommendedAction
        ]);
      });
    }
  }
  
  return { data, headers, summary };
}

/**
 * Enhanced detailed test results report
 */
function generateEnhancedDetailedTestResultsReport(filters) {
  const headers = [
    'Well Name', 'Valve Type', 'Status', 'Leak Rate (scfm)', 'Critical Rate (scfm)', 
    'Pa (psia)', 'Pc (psia)', 'Pf (psia)', 'P2 (psia)', 
    'Pass/Fail Analysis', 'Technical Notes'
  ];
  const data = [];
  const summary = { total: 0, avgLeakRate: 0 };
  
  const testResults = window.valveTestResults || {};
  let totalLeakRate = 0;
  let validTests = 0;
  
  for (const [wellKey, valveResults] of Object.entries(testResults)) {
    const well = (window.wells || []).find(w => w.id === wellKey || w.name === wellKey);
    const wellId = well?.id || wellKey;
    const wellName = well?.name || wellKey;
    
    if (filters.well && wellId !== filters.well && wellName !== filters.well) continue;
    
    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => v.id === valveId);
      const valveType = valveInfo?.name || 'Unknown';
      
      if (filters.valveType && valveType !== filters.valveType) continue;
      
      const testArray = Array.isArray(tests) ? tests : [tests];
      
      testArray.forEach(test => {
        if (!test || typeof test !== 'object') return;
        
        if (filters.testStatus && test.status !== filters.testStatus) return;
        
        summary.total++;
        
        // Accumulate leak rate for summary
        if (test.leakRate) {
          totalLeakRate += test.leakRate;
          validTests++;
        }
        
        // Generate technical analysis based on actual test results
        let analysis = 'Standard test parameters within acceptable ranges';
        let technicalNotes = 'No significant technical issues identified';
        
        if (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false) {
          const failureReasons = determineFailureReasons(test, valveType);
          analysis = `FAILURE ANALYSIS: ${failureReasons.join('; ')}`;
          
          if (failureReasons.some(r => r.toLowerCase().includes('leak rate'))) {
            technicalNotes = `Leak rate failure detected. Review valve sealing integrity and downstream isolation.`;
          } else if (failureReasons.some(r => r.toLowerCase().includes('pressure'))) {
            technicalNotes = `Pressure test failure. Check valve sealing integrity and system pressure.`;
          } else if (failureReasons.some(r => r.toLowerCase().includes('invalid'))) {
            technicalNotes = `Test validity issues detected. Review test procedures and equipment calibration.`;
          } else {
            technicalNotes = `Multiple failure modes detected. Comprehensive valve inspection recommended.`;
          }
        }
        
        data.push([
          wellName,
          valveType,
          test.status === 'pass' ? 'PASS' : 'FAIL',
          test.leakRate?.toFixed(3) || 'N/A',
          test.criticalRate?.toFixed(3) || 'N/A',
          test.Pa?.toFixed(1) || 'N/A',
          test.Pc?.toFixed(1) || 'N/A',
          test.Pf?.toFixed(1) || 'N/A',
          test.P2?.toFixed(1) || 'N/A',
          analysis,
          technicalNotes
        ]);
      });
    }
  }
  
  summary.avgLeakRate = validTests > 0 ? (totalLeakRate / validTests) : 0;
  
  return { data, headers, summary };
}

/**
 * Enhanced well overview report
 */
function generateEnhancedWellOverviewReport(filters) {
  const headers = ['Well Name', 'Well Type', 'Total Valves', 'Tested Valves', 'Pass Rate %', 'Critical Failures', 'Compliance Status'];
  const data = [];
  const summary = { totalWells: 0, averagePassRate: 0, totalCriticalFailures: 0 };
  
  const wells = window.wells || [];
  const testResults = window.valveTestResults || {};
  let totalPassRate = 0;
  
  wells.forEach(well => {
    if (filters.well && well.id !== filters.well) return;
    
    summary.totalWells++;
    const wellTestResults = testResults[well.id] || testResults[well.name] || {};
    let totalValves = 0;
    let testedValves = 0;
    let passedTests = 0;
    let failedTests = 0;
    let criticalFailures = 0;
    
    // Count valves from christmasTree configuration
    if (well.christmasTree?.valves) {
      totalValves = well.christmasTree.valves.length;
    }
    
    // Analyze test results
    for (const [valveId, tests] of Object.entries(wellTestResults)) {
      const testArray = Array.isArray(tests) ? tests : [tests];
      if (testArray.length > 0) {
        testedValves++;
        
        testArray.forEach(test => {
          if (test && typeof test === 'object') {
            // Determine if test failed using comprehensive criteria
            const testFailed = (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false);
            
            if (testFailed) {
              failedTests++;
              const valveInfo = (window.allValves || []).find(v => v.id === valveId);
              if (valveInfo?.name === 'SCSSV') {
                criticalFailures++;
              }
            } else {
              passedTests++;
            }
          }
        });
      }
    }
    
    summary.totalCriticalFailures += criticalFailures;
    
    const passRate = testedValves > 0 ? ((passedTests / (passedTests + failedTests)) * 100) : 0;
    totalPassRate += passRate;
    
    // Determine compliance status
    let complianceStatus = 'Compliant';
    
    if (criticalFailures > 0) {
      complianceStatus = 'Non-Compliant';
    } else if (passRate < 80) {
      complianceStatus = 'Needs Attention';
    }
    
    data.push([
      well.name || well.id,
      well.type || 'N/A',
      totalValves,
      testedValves,
      passRate > 0 ? `${passRate.toFixed(1)}%` : 'N/A',
      criticalFailures,
      complianceStatus
    ]);
  });
  
  summary.averagePassRate = summary.totalWells > 0 ? (totalPassRate / summary.totalWells) : 0;
  
  return { data, headers, summary };
}

/**
 * Generate compliance report
 */
function generateComplianceReport(filters) {
  const headers = ['Well Name', 'Regulatory Status', 'Test Coverage %', 'Outstanding Issues', 'Next Test Due', 'Compliance Level', 'Action Required'];
  const data = [];
  const summary = { compliantWells: 0, nonCompliantWells: 0, overdueTests: 0 };
  
  const wells = window.wells || [];
  const testResults = window.valveTestResults || {};
  
  wells.forEach(well => {
    if (filters.well && well.id !== filters.well) return;
    
    const wellTestResults = testResults[well.id] || testResults[well.name] || {};
    let totalValves = well.christmasTree?.valves?.length || 0;
    let testedValves = Object.keys(wellTestResults).length;
    let coveragePercent = totalValves > 0 ? ((testedValves / totalValves) * 100) : 0;
    
    let outstandingIssues = [];
    let criticalFailures = 0;
    
    // Check for failures and critical issues
    for (const [valveId, tests] of Object.entries(wellTestResults)) {
      const testArray = Array.isArray(tests) ? tests : [tests];
      testArray.forEach(test => {
        if (test && (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false)) {
          const valveInfo = (window.allValves || []).find(v => v.id === valveId);
          if (valveInfo?.name === 'SCSSV') {
            outstandingIssues.push(`Critical SCSSV failure`);
            criticalFailures++;
          } else {
            outstandingIssues.push(`${valveInfo?.name || 'Valve'} failure`);
          }
        }
      });
    }
    
    // Determine compliance status
    let regulatoryStatus = 'Compliant';
    let complianceLevel = 'Full Compliance';
    let actionRequired = 'Continue routine testing';
    
    if (criticalFailures > 0) {
      regulatoryStatus = 'Non-Compliant';
      complianceLevel = 'Critical Non-Compliance';
      actionRequired = 'IMMEDIATE REGULATORY NOTIFICATION REQUIRED';
      summary.nonCompliantWells++;
    } else if (coveragePercent < 100) {
      regulatoryStatus = 'Incomplete';
      complianceLevel = 'Partial Compliance';
      actionRequired = 'Complete remaining valve tests';
      summary.nonCompliantWells++;
    } else {
      summary.compliantWells++;
    }
    
    data.push([
      well.name || well.id,
      regulatoryStatus,
      `${coveragePercent.toFixed(1)}%`,
      outstandingIssues.length > 0 ? outstandingIssues.join('; ') : 'None',
      'Annual testing cycle',
      complianceLevel,
      actionRequired
    ]);
  });
  
  return { data, headers, summary };
}

/**
 * Generate risk assessment report
 */
function generateRiskAssessmentReport(filters) {
  const headers = ['Well Name', 'Primary Risk Factors', 'Mitigation Status', 'Recommended Actions'];
  const data = [];
  const summary = { highRiskWells: 0 };
  
  const wells = window.wells || [];
  const testResults = window.valveTestResults || {};
  
  wells.forEach(well => {
    if (filters.well && well.id !== filters.well) return;
    
    const wellTestResults = testResults[well.id] || testResults[well.name] || {};
    let riskFactors = [];
    let mitigationStatus = 'Adequate';
    let priorityLevel = 'Low Priority';
    
    // Identify risk factors
    for (const [valveId, tests] of Object.entries(wellTestResults)) {
      const testArray = Array.isArray(tests) ? tests : [tests];
      testArray.forEach(test => {
        if (test && (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false)) {
          const valveInfo = (window.allValves || []).find(v => v.id === valveId);
          if (valveInfo?.name === 'SCSSV') {
            riskFactors.push('SCSSV failure - Well control risk');
          } else {
            riskFactors.push(`${valveInfo?.name || 'Valve'} operational failure`);
          }
        }
      });
    }
    
    // Additional risk factors
    const totalValves = well.christmasTree?.valves?.length || 0;
    const testedValves = Object.keys(wellTestResults).length;
    if (testedValves < totalValves) {
      riskFactors.push('Incomplete testing coverage');
    }
    
    // Determine overall risk level
    if (riskFactors.some(factor => factor.includes('SCSSV'))) {
      priorityLevel = 'Critical Priority';
      mitigationStatus = 'Inadequate';
      summary.highRiskWells++;
    } else if (riskFactors.length > 0) {
      priorityLevel = 'High Priority';
      mitigationStatus = 'Needs Improvement';
    }
    
    const recommendedActions = priorityLevel === 'Critical Priority' ? 'Emergency response plan activation' : 
                              priorityLevel === 'High Priority' ? 'Accelerated maintenance schedule' : 
                              'Standard maintenance protocols';
    
    data.push([
      well.name || well.id,
      riskFactors.length > 0 ? riskFactors.join('; ') : 'No significant risk factors',
      mitigationStatus,
      recommendedActions
    ]);
  });
  
  return { data, headers, summary };
}

/**
 * Complete updated displayEnhancedReport function for three tables
 */
function displayEnhancedReport(data, headers, reportType, summary) {
  const outputContainer = document.getElementById('reportOutputContainer');
  if (!outputContainer) return;
  
  const reportTitle = getEnhancedReportTitle(reportType);
  const currentDate = new Date().toLocaleString();
  
  // Get the selected well information
  const selectedWellId = document.getElementById('wellFilter')?.value || '';
  
  let html = `
    <div class="enhanced-report-header">
      <div class="report-title-section">
        <h2>${reportTitle}</h2>
        <div class="report-metadata">
          <span class="report-date">Generated: ${currentDate}</span>
          <span class="report-records">Records: ${data.length}</span>
        </div>
      </div>
    </div>
  `;
  
  if (data.length === 0) {
    html += '<div class="no-data-enhanced">No data available matching the selected criteria.</div>';
  } else {
    // Generate the three separate tables
    const { wellInfoData, initialConditionsData, finalConditionsData } = processDataForTwoTables();
    
    // TABLE 1: Well Information
    html += `
      <div class="report-table-section">
        <h3>Well Information</h3>
        <div class="enhanced-report-table-container">
          <table class="enhanced-report-table">
            <thead>
              <tr>
                <th>Well ID</th>
                <th>SITHP</th>
                <th>Liquid Yield</th>
              </tr>
            </thead>
            <tbody>
              ${wellInfoData.map(row => `
                <tr>
                  <td>${row.wellId}</td>
                  <td>${row.sithp}</td>
                  <td>${row.liquidYield}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // TABLE 2: Initial Conditions
    html += `
      <div class="report-table-section">
        <h3>Initial Conditions</h3>
        <div class="enhanced-report-table-container">
          <table class="enhanced-report-table">
            <thead>
              <tr>
                <th>Valve</th>
                <th>Monitoring Time (min)</th>
                <th>Maximum Internal Rate (scfm)</th>
                <th>Initial Temperature (°F)</th>
                <th>Initial Pressure (psig)</th>
              </tr>
            </thead>
            <tbody>
              ${initialConditionsData.map(row => `
                <tr>
                  <td>${row.valve}</td>
                  <td>${row.monitoringTime}</td>
                  <td>${row.maxInternalRate}</td>
                  <td>${row.initialTemperature}</td>
                  <td>${row.initialPressure}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // TABLE 3: Final Conditions
    html += `
      <div class="report-table-section">
        <h3>Final Conditions</h3>
        <div class="enhanced-report-table-container">
          <table class="enhanced-report-table">
            <thead>
              <tr>
                <th>Valve</th>
                <th>Final Temperature (°F)</th>
                <th>Final Pressure (psig)</th>
                <th>Blocking Valve</th>
                <th>Actual Internal Leak (scfm)</th>
                <th>Status</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              ${finalConditionsData.map(row => {
                const isFailed = row.status === 'FAIL' || row.status === 'Failed';
                const rowClass = isFailed ? 'failed-test' : '';
                
                return `
                  <tr class="${rowClass}">
                    <td>${row.valve}</td>
                    <td>${row.finalTemperature}</td>
                    <td>${row.finalPressure}</td>
                    <td>${row.blockingValve}</td>
                    <td>${row.actualInternalLeak}</td>
                    <td class="${isFailed ? 'status-cell-failed' : ''}">${row.status}</td>
                    <td class="${isFailed ? 'failure-reasons-cell' : ''}">${row.comments}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Show statistics BELOW the tables
    html += generateExecutiveSummary(reportType, summary, data.length);
  }
  
  // Add recommendations section
  html += generateRecommendationsSection(reportType, summary);
  
  outputContainer.innerHTML = html;
}
/**
 * Process the existing test data to create data for the two separate tables
 */
function processDataForTwoTables() {
  const wellInfoData = [];
  const initialConditionsData = [];
  const finalConditionsData = [];
  
  const filters = getFilterValues();
  const testResults = window.valveTestResults || {};
  
  // Track processed wells to avoid duplicates in well info table
  const processedWells = new Set();
  
  for (const [wellKey, valveResults] of Object.entries(testResults)) {
    const well = (window.wells || []).find(w => w.id === wellKey || w.name === wellKey);
    const wellId = well?.id || wellKey;
    const wellName = well?.name || wellKey;
    
    if (filters.well && wellId !== filters.well && wellName !== filters.well) continue;
    
    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => v.id === valveId);
      const valveType = valveInfo?.name || 'Unknown';
      
      if (filters.valveType && valveType !== filters.valveType) continue;
      
      // Get only the MOST RECENT test for each valve
     // Get only the MOST RECENT test for each valve
      const testArray = Array.isArray(tests) ? tests : [tests];
      const mostRecentTest = testArray[testArray.length - 1]; // Get last test (most recent)

      // Process only the most recent test
      if (!mostRecentTest || typeof mostRecentTest !== 'object') return;

      if (filters.testStatus && mostRecentTest.status !== filters.testStatus) return;

      // Well Information Data - only add once per well
      if (!processedWells.has(wellId)) {
        wellInfoData.push({
          wellId: wellName,
          sithp: mostRecentTest.sithp || mostRecentTest.inputs?.Sithp || 'N/A',
          liquidYield: mostRecentTest.liquid_yield || mostRecentTest.inputs?.LiquidYield || 'N/A'
        });
        processedWells.add(wellId);
      }

      let comments = 'Test completed successfully';
      if (mostRecentTest.status === 'fail' || mostRecentTest.pass === false || mostRecentTest.test_valid === false || mostRecentTest.leak_rate_pass === false) {
        const failureReasons = determineFailureReasons(mostRecentTest, valveType);
        comments = failureReasons.length > 0 ? failureReasons.join('; ') : 'Test failed - reason undetermined';
      }

      // Initial Conditions Data
      initialConditionsData.push({
        valve: valveType,
        monitoringTime: mostRecentTest.monitoringTime ?? mostRecentTest.inputs?.MonitoringTime_min ?? 'N/A',
        maxInternalRate: mostRecentTest.criticalRate ?? 'N/A',
        initialTemperature: mostRecentTest.initialTemperature ?? 'N/A',
        initialPressure: mostRecentTest.initialPresure ?? 'N/A'
      });

      finalConditionsData.push({
        valve: valveType,
        finalTemperature: mostRecentTest.finalTemperature ?? 'N/A',
        finalPressure: mostRecentTest.P2 ?? 'N/A',
        blockingValve: mostRecentTest.blockingValve ?? 'N/A',
        actualInternalLeak: (mostRecentTest.leakRate !== null && mostRecentTest.leakRate !== undefined) ? 
          mostRecentTest.leakRate.toFixed(3) : 'N/A',
        status: mostRecentTest.status === 'pass' ? 'PASS' : 'FAIL',
        comments: comments
      });
     
    }
  }
  
  return { wellInfoData, initialConditionsData, finalConditionsData };
}
/**
 * Enhanced CSS injection function to ensure styling is applied
 */
/**
 * Enhanced CSS injection function to ensure styling is applied
 */
function injectFailureHighlightingCSS() {
  // Check if CSS is already injected
  if (document.getElementById('failure-highlighting-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'failure-highlighting-styles';
  style.textContent = `
    /* Enhanced failure highlighting styles */
    .enhanced-report-table tbody tr.failed-test {
      background-color: #f8d7da !important; /* Light red for all failures */
      border-left: 4px solid #dc3545 !important;
      color: #dc3545 !important;
    }
    
    .enhanced-report-table tbody tr.failed-test:hover {
      background-color: #f1b0b7 !important;
    }
    
    .status-cell-failed {
      background-color: #dc3545 !important;
      color: white !important;
      font-weight: bold !important;
      text-align: center !important;
    }
    
    .critical-valve-cell {
      background-color: #dc3545 !important;
      color: white !important;
      font-weight: bold !important;
    }
    
    .failure-reasons-cell {
      font-style: italic;
      color: #6c757d;
      background-color: #e2818a;
    }
    
    .failure-alert {
      background: linear-gradient(135deg, #dc3545, #c82333);
      color: white;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 8px;
      border: 2px solid #dc3545;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .alert-content {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .alert-icon {
      font-size: 24px;
      animation: pulse 2s infinite;
    }
    
    .critical-alert {
      color: #ffecb3;
      font-weight: bold;
      animation: blink 1.5s infinite;
    }
    
    .failure-icon, .critical-icon {
      margin-right: 5px;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
    
    @keyframes blink {
      0%, 50% { opacity: 1; }
      25%, 75% { opacity: 0.5; }
    }
    
    /* Summary card enhancements */
    .summary-card.failure {
      background-color: #dc3545;
      color: white;
      border: 2px solid #c82333;
    }
    
    .summary-card.critical {
      background-color: #dc3545;
      color: white;
      border: 2px solid #dc3545;
      animation: pulse 2s infinite;
    }
  `;
  
  document.head.appendChild(style);
}
// Auto-inject CSS when the script loads
document.addEventListener('DOMContentLoaded', injectFailureHighlightingCSS);

// Also inject immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFailureHighlightingCSS);
} else {
  injectFailureHighlightingCSS();
}

// Export the enhanced function
window.displayEnhancedReport = displayEnhancedReport;
window.injectFailureHighlightingCSS = injectFailureHighlightingCSS;

/**
 * Generate executive summary for reports
 */
function generateExecutiveSummary(reportType, summary, recordCount) {
  let summaryHtml = '<div class="executive-summary">';
  summaryHtml += '<h3>Executive Summary</h3>';
  
  switch (reportType) {
    case 'valveTestResults':
      const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;
      summaryHtml += `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number">${summary.total}</div>
            <div class="summary-label">Total Tests</div>
          </div>
          <div class="summary-card success">
            <div class="summary-number">${summary.passed}</div>
            <div class="summary-label">Passed</div>
          </div>
          <div class="summary-card failure">
            <div class="summary-number">${summary.failed}</div>
            <div class="summary-label">Failed</div>
          </div>
          <div class="summary-card performance">
            <div class="summary-number">${passRate}%</div>
            <div class="summary-label">Pass Rate</div>
          </div>
        </div>
        <p><strong>Key Finding:</strong> ${summary.criticalFailures > 0 ? 
          `${summary.criticalFailures} critical failure(s) require immediate attention.` :
          'All systems operating within acceptable parameters.'}</p>
      `;
      break;
      
    case 'testFailureSummary':
      summaryHtml += `
        <div class="summary-grid">
          <div class="summary-card failure">
            <div class="summary-number">${summary.totalFailures || recordCount}</div>
            <div class="summary-label">Total Issues</div>
          </div>
          <div class="summary-card critical">
            <div class="summary-number">${summary.criticalFailures || 0}</div>
            <div class="summary-label">Critical</div>
          </div>
          <div class="summary-card major">
            <div class="summary-number">${summary.majorFailures || 0}</div>
            <div class="summary-label">Major</div>
          </div>
          <div class="summary-card minor">
            <div class="summary-number">${summary.minorFailures || 0}</div>
            <div class="summary-label">Minor</div>
          </div>
        </div>
        <p><strong>Assessment:</strong> ${summary.criticalFailures > 0 ? 
          'Critical issues detected requiring immediate intervention.' :
          'Manageable issues with standard mitigation protocols.'}</p>
      `;
      break;
      
    case 'riskAssessment':
      summaryHtml += `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number">${recordCount}</div>
            <div class="summary-label">Total Wells</div>
          </div>
          <div class="summary-card critical">
            <div class="summary-number">${summary.highRiskWells || 0}</div>
            <div class="summary-label">High Risk Wells</div>
          </div>
        </div>
        <p><strong>Assessment:</strong> ${summary.highRiskWells > 0 ? 
          'High risk conditions detected requiring immediate intervention.' :
          'Manageable risk levels with standard mitigation protocols.'}</p>
      `;
      break;
      
    default:
      summaryHtml += `
        <div class="summary-card">
          <div class="summary-number">${recordCount}</div>
          <div class="summary-label">Total Records</div>
        </div>
        <p><strong>Status:</strong> Report generated successfully with comprehensive data analysis.</p>
      `;
  }
  
  summaryHtml += '</div>';
  return summaryHtml;
}

/**
 * Generate recommendations section
 */
function generateRecommendationsSection(reportType, summary) {
  let recommendationsHtml = '<div class="recommendations-section">';
  recommendationsHtml += '<h3>Recommendations & Next Steps</h3>';
  recommendationsHtml += '<div class="recommendations-list">';
  
  switch (reportType) {
    case 'valveTestResults':
      if (summary.criticalFailures > 0) {
        recommendationsHtml += '<div class="recommendation urgent"><strong>URGENT:</strong> Address critical valve failures immediately - implement emergency response protocols.</div>';
      }
      recommendationsHtml += '<div class="recommendation standard"><strong>ROUTINE:</strong> Continue regular testing schedule and monitor trends.</div>';
      break;
      
    case 'testFailureSummary':
      recommendationsHtml += '<div class="recommendation urgent"><strong>PRIORITY 1:</strong> All critical failures require immediate corrective action.</div>';
      recommendationsHtml += '<div class="recommendation important"><strong>PRIORITY 2:</strong> Major failures should be addressed within 7 days.</div>';
      recommendationsHtml += '<div class="recommendation standard"><strong>PRIORITY 3:</strong> Monitor minor issues and schedule maintenance as required.</div>';
      break;
      
    case 'riskAssessment':
      recommendationsHtml += '<div class="recommendation urgent"><strong>MITIGATION:</strong> Implement enhanced monitoring for high-risk wells.</div>';
      recommendationsHtml += '<div class="recommendation standard"><strong>COMPLIANCE:</strong> Ensure all recommendations align with regulatory requirements.</div>';
      break;
      
    default:
      recommendationsHtml += '<div class="recommendation standard"><strong>ACTION:</strong> Review report findings and implement appropriate corrective measures.</div>';
  }
  
  recommendationsHtml += '</div></div>';
  return recommendationsHtml;
}

/**
 * Get enhanced report title with dynamic well information
 */
function getEnhancedReportTitle(reportType) {
  const selectedWellId = document.getElementById('wellFilter')?.value || '';
  let wellName = '';
  
  if (selectedWellId) {
    const well = (window.wells || []).find(w => w.id === selectedWellId || w.name === selectedWellId);
    wellName = well?.name || well?.id || selectedWellId;
    return `COP WELL INTEGRITY TEST REPORT FOR ${wellName}`;
  } else {
    return 'COP WELL INTEGRITY TEST REPORT FOR THE ALBA FIELD';
  }
}

/**
 * Print current report
 */
function printCurrentReport() {
  window.print();
}

/**
 * Updated CSV export to export all three tables
 */
function exportCurrentReportCSV() {
  if (!lastWellInfoData && !lastInitialConditionsData && !lastFinalConditionsData) {
    alert('No report data to export');
    return;
  }
  
  let csvContent = `"${getEnhancedReportTitle(lastReportType)}"\n`;
  csvContent += `"Generated: ${new Date().toLocaleString()}"\n\n`;
  
  // Add summary if available
  if (lastReportSummary && Object.keys(lastReportSummary).length > 0) {
    csvContent += '"EXECUTIVE SUMMARY"\n';
    for (const [key, value] of Object.entries(lastReportSummary)) {
      csvContent += `"${key}","${value}"\n`;
    }
    csvContent += '\n';
  }
  
  // TABLE 1: Well Information
  if (lastWellInfoData.length > 0) {
    csvContent += '"WELL INFORMATION"\n';
    csvContent += '"Well ID","SITHP","Liquid Yield"\n';
    csvContent += lastWellInfoData.map(row => 
      `"${row.wellId}","${row.sithp}","${row.liquidYield}"`
    ).join('\n') + '\n\n';
  }
  
  // TABLE 2: Initial Conditions
  if (lastInitialConditionsData.length > 0) {
    csvContent += '"INITIAL CONDITIONS"\n';
    csvContent += '"Valve","Monitoring Time (min)","Maximum Internal Rate (scfm)","Initial Temperature (°F)","Initial Pressure (psig)"\n';
    csvContent += lastInitialConditionsData.map(row => 
      `"${row.valve}","${row.monitoringTime}","${row.maxInternalRate}","${row.initialTemperature}","${row.initialPressure}"`
    ).join('\n') + '\n\n';
  }
  
  // TABLE 3: Final Conditions
  if (lastFinalConditionsData.length > 0) {
    csvContent += '"FINAL CONDITIONS"\n';
    csvContent += '"Valve","Final Temperature (°F)","Final Pressure (psig)","Blocking Valve","Actual Internal Leak (scfm)","Status","Comments"\n';
    csvContent += lastFinalConditionsData.map(row => 
      `"${row.valve}","${row.finalTemperature}","${row.finalPressure}","${row.blockingValve}","${row.actualInternalLeak}","${row.status}","${row.comments}"`
    ).join('\n') + '\n';
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `well_integrity_three_tables_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
/**
 * Updated PDF export to show all three tables
 */
function exportCurrentReportPDF() {
  if (!lastWellInfoData && !lastInitialConditionsData && !lastFinalConditionsData) {
    alert('No report data to export');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // CLEAN TITLE SECTION
  // Simple blue background for title (no border, cleaner look)
  doc.setFillColor(255, 253, 208); // Blue background
  doc.rect(20, 15, 257, 18, 'F'); // Cleaner rectangle
  
  // Main title - white text on blue background
  doc.setFontSize(20); // Slightly smaller for better proportion
  doc.setTextColor(0, 0, 0); // White text
  doc.setFont(undefined, 'bold');
  const titleText = getEnhancedReportTitle(lastReportType);
  
  // Center the title
  const pageWidth = doc.internal.pageSize.width;
  const titleWidth = doc.getTextWidth(titleText);
  const titleX = (pageWidth - titleWidth) / 2;
  doc.text(titleText, titleX, 26);
  
  // SIMPLE METADATA - No strange characters
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100); // Gray text
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 25, 45);
  doc.text('Well Integrity Management System', 200, 45);
  
  // Clean separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(25, 46, 272, 46);  // Extremely close (1px gap)


    // Add this section after the separator line and before startY = 65
  // SUMMARY SECTION - Test Results Overview
  const totalTests = lastFinalConditionsData.length;
  const failedTests = lastFinalConditionsData.filter(row => row.status === 'FAIL' || row.status === 'Failed').length;
  const passedTests = totalTests - failedTests;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

  // Summary box background
  doc.setFillColor(248, 249, 250); // Light gray background
  doc.rect(25, 52, 247, 25, 'F');

  // Summary title
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.text('TEST RESULTS SUMMARY', 25, 60);

  // Summary content in columns
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  // Total Tests
  doc.setTextColor(0, 0, 0);
  doc.text('Total Tests:', 30, 68);
  doc.setFont(undefined, 'bold');
  doc.text(`${totalTests}`, 70, 68);

  // Passed Tests
  doc.setFont(undefined, 'normal');
  doc.text('Passed:', 100, 68);
  doc.setTextColor(0, 128, 0); // Green for passed
  doc.setFont(undefined, 'bold');
  doc.text(`${passedTests}`, 130, 68);

  // Failed Tests
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.text('Failed:', 160, 68);
  doc.setTextColor(220, 53, 69); // Red for failed
  doc.setFont(undefined, 'bold');
  doc.text(`${failedTests}`, 185, 68);

  // Pass Rate
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.text('Pass Rate:', 215, 68);
  doc.setFont(undefined, 'bold');
  doc.text(`${passRate}%`, 250, 68);

  // Update startY to account for summary section
  let startY = 95; // Changed from 65 to 85
    
 
  
  // TABLE 1: Well Information - CLEAN APPROACH
  if (lastWellInfoData.length > 0) {
    // Simple section header - no background, just larger text
    doc.setFontSize(11);
    doc.setTextColor(0,0,0); // Blue text
    doc.setFont(undefined, 'bold');
    doc.text('WELL INFORMATION', 25, startY);
    
    // Add some space after header
    startY += 2;
    
    doc.autoTable({
      head: [['Well ID', 'SITHP', 'Liquid Yield']],
      body: lastWellInfoData.map(row => [row.wellId, row.sithp, row.liquidYield]),
      startY: startY,
      styles: { 
        fontSize: 10, 
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [255, 253, 208], 
        textColor: [0,0,0],
        fontSize: 11,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: 25, right: 25 }
    });
    
    // MORE SPACE between tables
    startY = doc.lastAutoTable.finalY + 20;
  }
  
  // TABLE 2: Initial Conditions - CLEAN APPROACH
  if (lastInitialConditionsData.length > 0) {
    // Simple section header
    doc.setFontSize(11);
    doc.setTextColor(0,0,0);
    doc.setFont(undefined, 'bold');
    doc.text('INITIAL CONDITIONS', 25, startY);
    startY += 2;
    
    doc.autoTable({
      head: [['Valve', 'Monitoring Time (min)', 'Max Internal Rate (scfm)', 'Initial Temp (°F)', 'Initial Pressure (psig)']],
      body: lastInitialConditionsData.map(row => [
        row.valve, row.monitoringTime, row.maxInternalRate, row.initialTemperature, row.initialPressure
      ]),
      startY: startY,
      styles: { 
        fontSize: 9, 
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [255, 253, 208], 
        textColor: [0,0,0],
        fontSize: 9,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: 25, right: 25 }
    });
    
    startY = doc.lastAutoTable.finalY + 20;
  }
  
  // TABLE 3: Final Conditions - CLEAN APPROACH
  if (lastFinalConditionsData.length > 0) {
    // Check if we need a new page
    if (startY > 150) {
      doc.addPage();
      startY = 25;
    }
    
    // Simple section header
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('FINAL CONDITIONS', 25, startY);
    startY += 2;
    
    doc.autoTable({
      head: [['Valve', 'Final Temp (°F)', 'Final Pressure (psig)', 'Blocking Valve', 'Actual Leak (scfm)', 'Status', 'Comments']],
      body: lastFinalConditionsData.map(row => [
        row.valve, row.finalTemperature, row.finalPressure, row.blockingValve, row.actualInternalLeak, row.status, row.comments
      ]),
      startY: startY,
      styles: { 
        fontSize: 9, 
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [255, 253, 208], 
        textColor: [0,0,0],
        fontSize: 9,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const rowData = lastFinalConditionsData[data.row.index];
          if (rowData && (rowData.status === 'FAIL' || rowData.status === 'Failed')) {
            // Simple red highlighting for failed tests
            data.cell.styles.fillColor = [255, 230, 230]; // Very light red
            data.cell.styles.textColor = [180, 50, 50]; // Dark red text
            
            if (data.column.index === 5) { // Status column
              data.cell.styles.fillColor = [220, 53, 69]; // Red background
              data.cell.styles.textColor = [255, 255, 255]; // White text
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
      margin: { left: 25, right: 25 }
    });
    
    startY = doc.lastAutoTable.finalY + 15;
  }
  
  // SIMPLE failure summary - no strange characters
  const failureCount = lastFinalConditionsData.filter(row => row.status === 'FAIL' || row.status === 'Failed').length;
  if (failureCount > 0) {
    // Simple warning box
    doc.setFillColor(255, 240, 240); // Very light red
    doc.rect(25, startY, 247, 12, 'F');
    
    doc.setTextColor(220, 53, 69);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`WARNING: ${failureCount} Test Failure(s) Detected - Review Required`, 30, startY + 8);
  }
  
  // CLEAN FOOTER - Simple and minimal
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Simple footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(25, 195, 272, 195);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, 'normal');
    doc.text(`Page ${i} of ${pageCount}`, 250, 202);
    doc.text('Well Integrity Management System', 25, 202);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 25, 206);
  }
  
  // Save with simple filename
  const filename = `well_integrity_report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Alternative function for high-contrast PDF export (black/white printer friendly)
 */

// Export the enhanced functions
window.exportCurrentReportPDF = exportCurrentReportPDF;
window.exportCurrentReportPDFHighContrast = exportCurrentReportPDFHighContrast;

// Export functions to global scope
window.renderReportsSection = renderReportsSection;
window.generateReport = generateReport;
window.exportCurrentReportCSV = exportCurrentReportCSV;
window.exportCurrentReportPDF = exportCurrentReportPDF;
window.printCurrentReport = printCurrentReport;