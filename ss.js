// ==========================================
// ENHANCED COMPREHENSIVE REPORTS SECTION FOR WELL INTEGRITY MANAGEMENT TOOL
// LATEST TEST PER VALVE ONLY + GROUPED BY WELL
// ==========================================

// Global variables for export functionality
let lastReportData = [];
let lastReportHeaders = [];
let lastWellInfoData = [];
let lastInitialConditionsData = [];
let lastFinalConditionsData = [];
let lastGroupedReportData = [];
let lastReportType = '';
let lastReportSummary = {};

/**
 * Main function to render the enhanced reports section
 */
function renderReportsSection() {
  const reportsContainer = document.getElementById('reportsSection');
  if (!reportsContainer) return;

  const html = `
    <div class="reports-page-title">
      <h2>Well Integrity Test Reports</h2>
      <p>Generate and export well integrity reports.</p>
    </div>

    <div class="reports-layout single-column">
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

        <div id="reportFiltersContainer" class="report-filters"></div>

        <div class="report-actions">
          <button id="generateReportBtn" class="primary-btn" disabled>Generate Report</button>
          <button id="exportPdfBtn" class="secondary-btn" disabled>Export PDF</button>
          <button id="exportCsvBtn" class="secondary-btn" disabled>Export CSV</button>
          <button id="printReportBtn" class="secondary-btn" disabled>Print Report</button>
        </div>
      </div>

      <div id="reportOutputContainer" class="report-output hidden-report-output"></div>
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
    reportTypeSelect.onchange = function () {
      setupReportFilters(this.value);
      generateBtn.disabled = !this.value;
      exportPdfBtn.disabled = true;
      exportCsvBtn.disabled = true;
      printBtn.disabled = true;
    };
  }

  if (generateBtn) generateBtn.onclick = generateReport;
  if (exportPdfBtn) exportPdfBtn.onclick = exportCurrentReportPDF;
  if (exportCsvBtn) exportCsvBtn.onclick = exportCurrentReportCSV;
  if (printBtn) printBtn.onclick = printCurrentReport;
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
 * Well matching helpers
 */
function sameWellValue(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function findWellByKey(key) {
  return (window.wells || []).find(w =>
    sameWellValue(w.id, key) || sameWellValue(w.name, key)
  );
}

function matchesWellFilter(filterValue, wellKey, wellObj) {
  if (!filterValue) return true;

  return (
    sameWellValue(filterValue, wellKey) ||
    sameWellValue(filterValue, wellObj?.id) ||
    sameWellValue(filterValue, wellObj?.name)
  );
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
 * Latest-test helpers
 */
function getLatestTestOnly(tests) {
  const arr = Array.isArray(tests) ? tests : [tests];
  if (!arr.length) return null;
  return arr[arr.length - 1];
}

function isFailedTest(test) {
  return !!(
    test &&
    (
      test.status === 'fail' ||
      test.pass === false ||
      test.test_valid === false ||
      test.leak_rate_pass === false
    )
  );
}

/**
 * Determine failure reasons based on test data and valve type
 */
function determineFailureReasons(test, valveType) {
  const reasons = [];

  if (test.failure_reasons && Array.isArray(test.failure_reasons) && test.failure_reasons.length > 0) {
    return test.failure_reasons;
  }

  if (test.leakRate && test.criticalRate && test.leakRate > test.criticalRate) {
    reasons.push(`Leak rate too high: ${test.leakRate.toFixed(3)} scfm exceeds critical rate of ${test.criticalRate.toFixed(3)} scfm`);
  } else if (test.leak_rate_pass === false) {
    reasons.push('Leak rate test failed');
  }

  if (test.Pa && test.Pf && (test.Pa - test.Pf) > 500) {
    reasons.push(`Excessive pressure drop: ${(test.Pa - test.Pf).toFixed(1)} psi`);
  }

  if (test.test_valid === false) {
    reasons.push('Test marked as invalid');
  }

  if (test.pass === false && reasons.length === 0) {
    reasons.push('Test failed validation criteria');
  }

  if (valveType === 'SCSSV') {
    if (test.leakRate && test.leakRate > 0.1) {
      reasons.push('SCSSV excessive leakage - potential safety hazard');
    }
  }

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
 * Grouped latest data builder
 */
function buildGroupedLatestReportData(filters) {
  const grouped = [];
  const testResults = window.valveTestResults || {};

  for (const [wellKey, valveResults] of Object.entries(testResults)) {
    const well = findWellByKey(wellKey);
    const wellId = well?.id || wellKey;
    const wellName = well?.name || wellKey;

    if (!matchesWellFilter(filters.well, wellKey, well)) continue;

    const rows = [];
    let sithp = 'N/A';
    let liquidYield = 'N/A';

    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
      const valveType = valveInfo?.name || 'Unknown';

      if (filters.valveType && valveType !== filters.valveType) continue;

      const latestTest = getLatestTestOnly(tests);
      if (!latestTest || typeof latestTest !== 'object') continue;
      if (filters.testStatus && latestTest.status !== filters.testStatus) continue;

      if (sithp === 'N/A') {
        sithp = latestTest.sithp || latestTest.inputs?.Sithp || 'N/A';
      }
      if (liquidYield === 'N/A') {
        liquidYield = latestTest.liquid_yield || latestTest.inputs?.LiquidYield || 'N/A';
      }

      let comments = 'Test completed successfully';
      if (isFailedTest(latestTest)) {
        const reasons = determineFailureReasons(latestTest, valveType);
        comments = reasons.length ? reasons.join('; ') : 'Test failed - reason undetermined';
      }

      rows.push({
        valve: valveType,
        monitoringTime: latestTest.monitoringTime ?? latestTest.inputs?.MonitoringTime_min ?? 'N/A',
        maxInternalRate: latestTest.criticalRate ?? 'N/A',
        initialTemperature: latestTest.initialTemperature ?? 'N/A',
        initialPressure: latestTest.initialPressure ?? 'N/A',
        finalTemperature: latestTest.finalTemperature ?? 'N/A',
        finalPressure: latestTest.P2 ?? latestTest.finalPressure ?? 'N/A',
        blockingValve: latestTest.blockingValve ?? 'N/A',
        actualInternalLeak: (latestTest.leakRate !== null && latestTest.leakRate !== undefined)
          ? Number(latestTest.leakRate).toFixed(3)
          : 'N/A',
        status: latestTest.status === 'pass' ? 'PASS' : 'FAIL',
        comments,
        rawTest: latestTest
      });
    }

    if (!rows.length) continue;

    rows.sort((a, b) => String(a.valve).localeCompare(String(b.valve)));

    grouped.push({
      wellId,
      wellName,
      sithp,
      liquidYield,
      rows,
      totalValves: rows.length,
      passed: rows.filter(r => r.status === 'PASS').length,
      failed: rows.filter(r => r.status === 'FAIL').length
    });
  }

  grouped.sort((a, b) => String(a.wellName).localeCompare(String(b.wellName)));
  return grouped;
}

function flattenGroupedReportData(groupedReportData) {
  const wellInfoData = [];
  const initialConditionsData = [];
  const finalConditionsData = [];

  groupedReportData.forEach(group => {
    wellInfoData.push({
      wellId: group.wellName,
      sithp: group.sithp,
      liquidYield: group.liquidYield
    });

    group.rows.forEach(row => {
      initialConditionsData.push({
        wellName: group.wellName,
        valve: row.valve,
        monitoringTime: row.monitoringTime,
        maxInternalRate: row.maxInternalRate,
        initialTemperature: row.initialTemperature,
        initialPressure: row.initialPressure
      });

      finalConditionsData.push({
        wellName: group.wellName,
        valve: row.valve,
        finalTemperature: row.finalTemperature,
        finalPressure: row.finalPressure,
        blockingValve: row.blockingValve,
        actualInternalLeak: row.actualInternalLeak,
        status: row.status,
        comments: row.comments
      });
    });
  });

  return { wellInfoData, initialConditionsData, finalConditionsData };
}

function buildSummaryFromGroupedData(groupedReportData) {
  const totalWells = groupedReportData.length;
  const totalValves = groupedReportData.reduce((sum, g) => sum + g.totalValves, 0);
  const passed = groupedReportData.reduce((sum, g) => sum + g.passed, 0);
  const failed = groupedReportData.reduce((sum, g) => sum + g.failed, 0);
  const passRate = totalValves > 0 ? ((passed / totalValves) * 100).toFixed(1) : '0.0';

  return { totalWells, totalValves, passed, failed, passRate };
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
    const well = findWellByKey(wellKey);
    const wellName = well?.name || wellKey;

    if (!matchesWellFilter(filters.well, wellKey, well)) continue;

    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
      const valveType = valveInfo?.name || 'Unknown';

      if (filters.valveType && valveType !== filters.valveType) continue;

      const test = getLatestTestOnly(tests);
      if (!test || typeof test !== 'object') continue;
      if (filters.testStatus && test.status !== filters.testStatus) continue;

      summary.total++;
      if (test.status === 'pass') summary.passed++;
      else summary.failed++;

      let formattedFailures = 'No failures detected';

      if (isFailedTest(test)) {
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
    const well = findWellByKey(wellKey);
    const wellName = well?.name || wellKey;

    if (!matchesWellFilter(filters.well, wellKey, well)) continue;

    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
      const valveType = valveInfo?.name || 'Unknown';

      if (filters.valveType && valveType !== filters.valveType) continue;

      const test = getLatestTestOnly(tests);
      if (!test || !isFailedTest(test)) continue;

      summary.totalFailures++;

      const failureReasons = determineFailureReasons(test, valveType);

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

      const severityMap = { critical: 'Critical', major: 'Major', minor: 'Minor' };
      if (filters.severityFilter && severity !== severityMap[filters.severityFilter]) continue;

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
    const well = findWellByKey(wellKey);
    const wellName = well?.name || wellKey;

    if (!matchesWellFilter(filters.well, wellKey, well)) continue;

    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
      const valveType = valveInfo?.name || 'Unknown';

      if (filters.valveType && valveType !== filters.valveType) continue;

      const test = getLatestTestOnly(tests);
      if (!test || typeof test !== 'object') continue;
      if (filters.testStatus && test.status !== filters.testStatus) continue;

      summary.total++;

      if (test.leakRate) {
        totalLeakRate += test.leakRate;
        validTests++;
      }

      let analysis = 'Standard test parameters within acceptable ranges';
      let technicalNotes = 'No significant technical issues identified';

      if (isFailedTest(test)) {
        const failureReasons = determineFailureReasons(test, valveType);
        analysis = `FAILURE ANALYSIS: ${failureReasons.join('; ')}`;

        if (failureReasons.some(r => r.toLowerCase().includes('leak rate'))) {
          technicalNotes = 'Leak rate failure detected. Review valve sealing integrity and downstream isolation.';
        } else if (failureReasons.some(r => r.toLowerCase().includes('pressure'))) {
          technicalNotes = 'Pressure test failure. Check valve sealing integrity and system pressure.';
        } else if (failureReasons.some(r => r.toLowerCase().includes('invalid'))) {
          technicalNotes = 'Test validity issues detected. Review test procedures and equipment calibration.';
        } else {
          technicalNotes = 'Multiple failure modes detected. Comprehensive valve inspection recommended.';
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
    if (!matchesWellFilter(filters.well, well.id, well)) return;

    summary.totalWells++;
    const wellTestResults = testResults[well.id] || testResults[well.name] || {};
    let totalValves = 0;
    let testedValves = 0;
    let passedTests = 0;
    let failedTests = 0;
    let criticalFailures = 0;

    if (well.christmasTree?.valves) {
      totalValves = well.christmasTree.valves.length;
    }

    for (const [valveId, tests] of Object.entries(wellTestResults)) {
      const latestTest = getLatestTestOnly(tests);
      if (!latestTest || typeof latestTest !== 'object') continue;

      testedValves++;

      if (isFailedTest(latestTest)) {
        failedTests++;
        const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
        if (valveInfo?.name === 'SCSSV') {
          criticalFailures++;
        }
      } else {
        passedTests++;
      }
    }

    summary.totalCriticalFailures += criticalFailures;

    const passRate = testedValves > 0 ? ((passedTests / (passedTests + failedTests)) * 100) : 0;
    totalPassRate += passRate;

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
    if (!matchesWellFilter(filters.well, well.id, well)) return;

    const wellTestResults = testResults[well.id] || testResults[well.name] || {};
    let totalValves = well.christmasTree?.valves?.length || 0;
    let testedValves = Object.keys(wellTestResults).length;
    let coveragePercent = totalValves > 0 ? ((testedValves / totalValves) * 100) : 0;

    let outstandingIssues = [];
    let criticalFailures = 0;

    for (const [valveId, tests] of Object.entries(wellTestResults)) {
      const test = getLatestTestOnly(tests);
      if (!test) continue;

      if (isFailedTest(test)) {
        const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
        if (valveInfo?.name === 'SCSSV') {
          outstandingIssues.push('Critical SCSSV failure');
          criticalFailures++;
        } else {
          outstandingIssues.push(`${valveInfo?.name || 'Valve'} failure`);
        }
      }
    }

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
    if (!matchesWellFilter(filters.well, well.id, well)) return;

    const wellTestResults = testResults[well.id] || testResults[well.name] || {};
    let riskFactors = [];
    let mitigationStatus = 'Adequate';
    let priorityLevel = 'Low Priority';

    for (const [valveId, tests] of Object.entries(wellTestResults)) {
      const test = getLatestTestOnly(tests);
      if (!test) continue;

      if (isFailedTest(test)) {
        const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
        if (valveInfo?.name === 'SCSSV') {
          riskFactors.push('SCSSV failure - Well control risk');
        } else {
          riskFactors.push(`${valveInfo?.name || 'Valve'} operational failure`);
        }
      }
    }

    const totalValves = well.christmasTree?.valves?.length || 0;
    const testedValves = Object.keys(wellTestResults).length;
    if (testedValves < totalValves) {
      riskFactors.push('Incomplete testing coverage');
    }

    if (riskFactors.some(factor => factor.includes('SCSSV'))) {
      priorityLevel = 'Critical Priority';
      mitigationStatus = 'Inadequate';
      summary.highRiskWells++;
    } else if (riskFactors.length > 0) {
      priorityLevel = 'High Priority';
      mitigationStatus = 'Needs Improvement';
    }

    const recommendedActions = priorityLevel === 'Critical Priority'
      ? 'Emergency response plan activation'
      : priorityLevel === 'High Priority'
        ? 'Accelerated maintenance schedule'
        : 'Standard maintenance protocols';

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
 * Generate report based on selected type and filters
 */
function generateReport() {
  const reportType = document.getElementById('reportTypeSelect')?.value;
  if (!reportType) return;

  lastReportType = reportType;

  const filters = getFilterValues();

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

  const groupedReportData = buildGroupedLatestReportData(filters);
  const { wellInfoData, initialConditionsData, finalConditionsData } = flattenGroupedReportData(groupedReportData);

  lastGroupedReportData = groupedReportData;
  lastWellInfoData = wellInfoData;
  lastInitialConditionsData = initialConditionsData;
  lastFinalConditionsData = finalConditionsData;
  lastReportSummary = buildSummaryFromGroupedData(groupedReportData);

  lastReportData = reportData;
  lastReportHeaders = reportHeaders;

  displayEnhancedReport(reportData, reportHeaders, reportType, lastReportSummary, groupedReportData);
  document.getElementById('reportOutputContainer').classList.add('active');

  document.getElementById('exportPdfBtn').disabled = false;
  document.getElementById('exportCsvBtn').disabled = false;
  document.getElementById('printReportBtn').disabled = false;
}

/**
 * Grouped report display
 */
function displayEnhancedReport(data, headers, reportType, summary, groupedReportData = []) {
  const outputContainer = document.getElementById('reportOutputContainer');
  if (!outputContainer) return;

  const reportTitle = getEnhancedReportTitle(reportType);
  const currentDate = new Date().toLocaleString();

  let html = `
    <div class="enhanced-report-header">
      <div class="report-title-section">
        <h2>${reportTitle}</h2>
        <div class="report-metadata">
          <span class="report-date">Generated: ${currentDate}</span>
          <span class="report-records">Wells: ${summary.totalWells || 0}</span>
          <span class="report-records">Valves: ${summary.totalValves || 0}</span>
        </div>
      </div>
    </div>
  `;

  if (!groupedReportData.length) {
    html += '<div class="no-data-enhanced">No data available matching the selected criteria.</div>';
    outputContainer.innerHTML = html;
    return;
  }

  html += `
    <div class="executive-summary">
      <h3>Executive Summary</h3>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-number">${summary.totalWells || 0}</div>
          <div class="summary-label">Total Wells</div>
        </div>
        <div class="summary-card">
          <div class="summary-number">${summary.totalValves || 0}</div>
          <div class="summary-label">Valves Tested</div>
        </div>
        <div class="summary-card success">
          <div class="summary-number">${summary.passed || 0}</div>
          <div class="summary-label">Passed</div>
        </div>
        <div class="summary-card failure">
          <div class="summary-number">${summary.failed || 0}</div>
          <div class="summary-label">Failed</div>
        </div>
        <div class="summary-card performance">
          <div class="summary-number">${summary.passRate || 0}%</div>
          <div class="summary-label">Pass Rate</div>
        </div>
      </div>
    </div>
  `;

  html += `
    <div class="report-table-section">
      <h3>Well-by-Well Summary</h3>
      <div class="enhanced-report-table-container">
        <table class="enhanced-report-table">
          <thead>
            <tr>
              <th>Well</th>
              <th>SITHP</th>
              <th>Liquid Yield</th>
              <th>Valves Tested</th>
              <th>Passed</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            ${groupedReportData.map(group => `
              <tr>
                <td>${group.wellName}</td>
                <td>${group.sithp}</td>
                <td>${group.liquidYield}</td>
                <td>${group.totalValves}</td>
                <td>${group.passed}</td>
                <td>${group.failed}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  groupedReportData.forEach(group => {
    html += `
      <div class="report-table-section" style="margin-top:28px;">
        <h3>${group.wellName}</h3>
        <div style="margin-bottom:10px;color:#555;font-size:13px;">
          <strong>SITHP:</strong> ${group.sithp} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Liquid Yield:</strong> ${group.liquidYield} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Valves Tested:</strong> ${group.totalValves} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Passed:</strong> ${group.passed} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Failed:</strong> ${group.failed}
        </div>

        <div class="enhanced-report-table-container">
          <table class="enhanced-report-table">
            <thead>
              <tr>
                <th>Valve</th>
                <th>Monitoring Time</th>
                <th>Max Internal Rate</th>
                <th>Initial Temp</th>
                <th>Initial Pressure</th>
                <th>Final Temp</th>
                <th>Final Pressure</th>
                <th>Blocking Valve</th>
                <th>Actual Leak</th>
                <th>Status</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              ${group.rows.map(row => {
                const isFailed = row.status === 'FAIL';
                return `
                  <tr class="${isFailed ? 'failed-test' : ''}">
                    <td>${row.valve}</td>
                    <td>${row.monitoringTime}</td>
                    <td>${row.maxInternalRate}</td>
                    <td>${row.initialTemperature}</td>
                    <td>${row.initialPressure}</td>
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
  });

  html += generateRecommendationsSection(reportType, summary);
  outputContainer.innerHTML = html;
}

/**
 * Enhanced CSS injection
 */
function injectFailureHighlightingCSS() {
  if (document.getElementById('failure-highlighting-styles')) return;

  const style = document.createElement('style');
  style.id = 'failure-highlighting-styles';
  style.textContent = `
    .enhanced-report-table tbody tr.failed-test {
      background-color: #f8d7da !important;
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

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      25%, 75% { opacity: 0.5; }
    }
  `;

  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', injectFailureHighlightingCSS);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFailureHighlightingCSS);
} else {
  injectFailureHighlightingCSS();
}

/**
 * Generate executive summary for reports
 */
function generateExecutiveSummary(reportType, summary, recordCount) {
  let summaryHtml = '<div class="executive-summary">';
  summaryHtml += '<h3>Executive Summary</h3>';

  switch (reportType) {
    case 'valveTestResults':
      summaryHtml += `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-number">${summary.total || recordCount}</div>
            <div class="summary-label">Total Tests</div>
          </div>
          <div class="summary-card success">
            <div class="summary-number">${summary.passed || 0}</div>
            <div class="summary-label">Passed</div>
          </div>
          <div class="summary-card failure">
            <div class="summary-number">${summary.failed || 0}</div>
            <div class="summary-label">Failed</div>
          </div>
        </div>
      `;
      break;

    default:
      summaryHtml += `
        <div class="summary-card">
          <div class="summary-number">${recordCount}</div>
          <div class="summary-label">Total Records</div>
        </div>
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
      if ((summary.failed || 0) > 0) {
        recommendationsHtml += '<div class="recommendation urgent"><strong>URGENT:</strong> Review failed latest valve tests and prioritize corrective actions.</div>';
      }
      recommendationsHtml += '<div class="recommendation standard"><strong>ROUTINE:</strong> Continue latest-test based monitoring and scheduled retesting.</div>';
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
 * Get report title
 */
function getEnhancedReportTitle(reportType) {
  const selectedWellId = document.getElementById('wellFilter')?.value || '';
  let wellName = '';

  if (selectedWellId) {
    const well = findWellByKey(selectedWellId);
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
 * CSV export
 */
function exportCurrentReportCSV() {
  if (!lastWellInfoData && !lastInitialConditionsData && !lastFinalConditionsData) {
    alert('No report data to export');
    return;
  }

  let csvContent = `"${getEnhancedReportTitle(lastReportType)}"\n`;
  csvContent += `"Generated: ${new Date().toLocaleString()}"\n\n`;

  if (lastReportSummary && Object.keys(lastReportSummary).length > 0) {
    csvContent += '"EXECUTIVE SUMMARY"\n';
    for (const [key, value] of Object.entries(lastReportSummary)) {
      csvContent += `"${key}","${value}"\n`;
    }
    csvContent += '\n';
  }

  if (lastGroupedReportData.length > 0) {
    csvContent += '"WELL SUMMARY"\n';
    csvContent += '"Well","SITHP","Liquid Yield","Valves Tested","Passed","Failed"\n';
    csvContent += lastGroupedReportData.map(group =>
      `"${group.wellName}","${group.sithp}","${group.liquidYield}","${group.totalValves}","${group.passed}","${group.failed}"`
    ).join('\n') + '\n\n';

    lastGroupedReportData.forEach(group => {
      csvContent += `"${group.wellName}"\n`;
      csvContent += '"Valve","Monitoring Time","Max Internal Rate","Initial Temp","Initial Pressure","Final Temp","Final Pressure","Blocking Valve","Actual Leak","Status","Comments"\n';
      csvContent += group.rows.map(row =>
        `"${row.valve}","${row.monitoringTime}","${row.maxInternalRate}","${row.initialTemperature}","${row.initialPressure}","${row.finalTemperature}","${row.finalPressure}","${row.blockingValve}","${row.actualInternalLeak}","${row.status}","${row.comments}"`
      ).join('\n') + '\n\n';
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `well_integrity_grouped_latest_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * PDF export
 */
function exportCurrentReportPDF() {
  if (!lastGroupedReportData.length) {
    alert('No report data to export');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');

  doc.setFillColor(255, 253, 208);
  doc.rect(20, 15, 257, 18, 'F');

  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  const titleText = getEnhancedReportTitle(lastReportType);
  const pageWidth = doc.internal.pageSize.width;
  const titleWidth = doc.getTextWidth(titleText);
  const titleX = (pageWidth - titleWidth) / 2;
  doc.text(titleText, titleX, 26);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 25, 45);
  doc.text('Well Integrity Management System', 200, 45);

  let startY = 58;

  doc.autoTable({
    head: [['Well', 'SITHP', 'Liquid Yield', 'Valves Tested', 'Passed', 'Failed']],
    body: lastGroupedReportData.map(group => [
      group.wellName, group.sithp, group.liquidYield, group.totalValves, group.passed, group.failed
    ]),
    startY,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [255, 253, 208], textColor: [0, 0, 0] },
    margin: { left: 25, right: 25 }
  });

  startY = doc.lastAutoTable.finalY + 12;

  lastGroupedReportData.forEach((group, index) => {
    if (startY > 160) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(group.wellName, 25, startY);

    startY += 4;

    doc.autoTable({
      head: [['Valve', 'Monitoring', 'Max Rate', 'Init Temp', 'Init Press', 'Final Temp', 'Final Press', 'Blocking', 'Leak', 'Status', 'Comments']],
      body: group.rows.map(row => [
        row.valve,
        row.monitoringTime,
        row.maxInternalRate,
        row.initialTemperature,
        row.initialPressure,
        row.finalTemperature,
        row.finalPressure,
        row.blockingValve,
        row.actualInternalLeak,
        row.status,
        row.comments
      ]),
      startY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [255, 253, 208], textColor: [0, 0, 0] },
      didParseCell: function (data) {
        if (data.section === 'body') {
          const rowData = group.rows[data.row.index];
          if (rowData && rowData.status === 'FAIL') {
            data.cell.styles.fillColor = [255, 230, 230];
            data.cell.styles.textColor = [180, 50, 50];
            if (data.column.index === 9) {
              data.cell.styles.fillColor = [220, 53, 69];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
      margin: { left: 25, right: 25 }
    });

    startY = doc.lastAutoTable.finalY + 10;
  });

  const filename = `well_integrity_grouped_latest_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Exports / globals
 */
window.displayEnhancedReport = displayEnhancedReport;
window.injectFailureHighlightingCSS = injectFailureHighlightingCSS;
window.renderReportsSection = renderReportsSection;
window.generateReport = generateReport;
window.exportCurrentReportCSV = exportCurrentReportCSV;
window.exportCurrentReportPDF = exportCurrentReportPDF;
window.printCurrentReport = printCurrentReport;
