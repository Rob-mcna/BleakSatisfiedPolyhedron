// =================== REPORT SECTION ===================

// Global variables for export functionality
let lastReportData = [];
let lastReportHeaders = [];
let lastWellInfoData = [];
let lastInitialConditionsData = [];
let lastFinalConditionsData = [];
let lastReportType = '';
let lastReportSummary = {};

// ------------------- HELPERS -------------------

function reportSameId(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function reportGetWellById(wellId) {
  return (window.wells || []).find(w => reportSameId(w.id, wellId)) || null;
}

function reportMatchesWellFilter(filterValue, wellId) {
  if (!filterValue) return true;
  return reportSameId(filterValue, wellId);
}

function reportGetValveName(valveId) {
  const valve = (window.allValves || []).find(v => reportSameId(v.id, valveId));
  return valve?.name || 'Unknown';
}

function reportGetGroupedResultsForWell(wellId) {
  return (window.valveTestResults && window.valveTestResults[wellId]) || {};
}

function reportGetAllWellsWithResults() {
  return (window.wells || []).filter(w => {
    const grouped = reportGetGroupedResultsForWell(w.id);
    return grouped && Object.keys(grouped).length > 0;
  });
}

// ------------------- UI -------------------

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

  if (generateBtn) generateBtn.onclick = generateReport;
  if (exportPdfBtn) exportPdfBtn.onclick = exportCurrentReportPDF;
  if (exportCsvBtn) exportCsvBtn.onclick = exportCurrentReportCSV;
  if (printBtn) printBtn.onclick = printCurrentReport;
}

function setupReportFilters(reportType) {
  const filtersContainer = document.getElementById('reportFiltersContainer');
  if (!filtersContainer) return;

  let filtersHtml = '';

  switch (reportType) {
    case 'valveTestResults':
    case 'testFailureSummary':
    case 'detailedTestResults':
    case 'wellOverview':
    case 'complianceReport':
    case 'riskAssessment':
      filtersHtml += `
        <div class="filter-group">
          <label for="wellFilter">Select Well:</label>
          <select id="wellFilter">
            <option value="">All Wells</option>
            ${(window.wells || []).map(well => `<option value="${well.id}">${well.name || well.id}</option>`).join('')}
          </select>
        </div>
      `;
      break;
  }

  if (['valveTestResults', 'testFailureSummary', 'detailedTestResults', 'riskAssessment'].includes(reportType)) {
    filtersHtml += `
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
    `;
  }

  if (['valveTestResults', 'detailedTestResults'].includes(reportType)) {
    filtersHtml += `
      <div class="filter-group">
        <label for="testStatusFilter">Test Status:</label>
        <select id="testStatusFilter">
          <option value="">All Results</option>
          <option value="pass">Passed Only</option>
          <option value="fail">Failed Only</option>
        </select>
      </div>
    `;
  }

  if (reportType === 'testFailureSummary' || reportType === 'riskAssessment') {
    filtersHtml += `
      <div class="filter-group">
        <label for="severityFilter">Failure Severity:</label>
        <select id="severityFilter">
          <option value="">All Severities</option>
          <option value="critical">Critical Failures</option>
          <option value="major">Major Failures</option>
          <option value="minor">Minor Issues</option>
        </select>
      </div>
    `;
  }

  filtersContainer.innerHTML = filtersHtml;
}

// ------------------- FILTERS -------------------

function getFilterValues() {
  return {
    well: document.getElementById('wellFilter')?.value || '',
    valveType: document.getElementById('valveTypeFilter')?.value || '',
    testStatus: document.getElementById('testStatusFilter')?.value || '',
    severityFilter: document.getElementById('severityFilter')?.value || ''
  };
}

// ------------------- REPORT CORE -------------------

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

  if (valveType === 'SCSSV' && test.leakRate && test.leakRate > 0.1) {
    reasons.push('SCSSV excessive leakage - potential safety hazard');
  }

  if (reasons.length === 0) {
    reasons.push(test.status === 'fail' ? 'Test status marked as failed' : 'Failure criteria met but reason undetermined');
  }

  return reasons;
}

function generateEnhancedValveTestResultsReport(filters) {
  const headers = ['Well Name', 'Valve Type', 'Status', 'Leak Rate (scfm)', 'Critical Rate (scfm)', 'Failure Reasons'];
  const data = [];
  const summary = { total: 0, passed: 0, failed: 0, criticalFailures: 0 };

  (window.wells || []).forEach(well => {
    if (!reportMatchesWellFilter(filters.well, well.id)) return;

    const grouped = reportGetGroupedResultsForWell(well.id);
    Object.entries(grouped).forEach(([valveId, tests]) => {
      const valveType = reportGetValveName(valveId);
      if (filters.valveType && valveType !== filters.valveType) return;

      (tests || []).forEach(test => {
        if (!test || typeof test !== 'object') return;
        if (filters.testStatus && test.status !== filters.testStatus) return;

        summary.total++;
        if (test.status === 'pass') summary.passed++;
        else summary.failed++;

        let formattedFailures = 'No failures detected';
        if (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false) {
          const failureReasons = determineFailureReasons(test, valveType);
          formattedFailures = failureReasons.join('; ');
          if (valveType === 'SCSSV') summary.criticalFailures++;
        }

        data.push([
          well.name,
          valveType,
          test.status === 'pass' ? 'PASS' : 'FAIL',
          test.leakRate?.toFixed(3) || 'N/A',
          test.criticalRate?.toFixed(3) || 'N/A',
          formattedFailures
        ]);
      });
    });
  });

  return { data, headers, summary };
}

function generateEnhancedTestFailureSummaryReport(filters) {
  const headers = ['Well Name', 'Valve Type', 'Failure Severity', 'Primary Failure Reason', 'Secondary Issues', 'Leak Rate (scfm)', 'Recommended Action'];
  const data = [];
  const summary = { totalFailures: 0, criticalFailures: 0, majorFailures: 0, minorFailures: 0 };

  (window.wells || []).forEach(well => {
    if (!reportMatchesWellFilter(filters.well, well.id)) return;

    const grouped = reportGetGroupedResultsForWell(well.id);
    Object.entries(grouped).forEach(([valveId, tests]) => {
      const valveType = reportGetValveName(valveId);
      if (filters.valveType && valveType !== filters.valveType) return;

      (tests || []).forEach(test => {
        if (!test || (test.status === 'pass' && test.pass !== false && test.test_valid !== false && test.leak_rate_pass !== false)) return;

        const failureReasons = determineFailureReasons(test, valveType);
        let severity = 'Minor';
        let recommendedAction = 'Monitor and retest within 30 days';

        summary.totalFailures++;

        if (valveType === 'SCSSV') {
          severity = 'Critical';
          summary.criticalFailures++;
          recommendedAction = 'IMMEDIATE ACTION REQUIRED - Shut in well and repair valve';
        } else if (failureReasons.some(r => r.toLowerCase().includes('leak rate') || r.toLowerCase().includes('pressure'))) {
          severity = 'Major';
          summary.majorFailures++;
          recommendedAction = 'Schedule maintenance within 7 days';
        } else {
          summary.minorFailures++;
        }

        const severityMap = { critical: 'Critical', major: 'Major', minor: 'Minor' };
        if (filters.severityFilter && severity !== severityMap[filters.severityFilter]) return;

        data.push([
          well.name,
          valveType,
          severity,
          failureReasons[0] || 'Test failed - reason undetermined',
          failureReasons.length > 1 ? failureReasons.slice(1).join('; ') : 'None',
          test.leakRate?.toFixed(3) || 'N/A',
          recommendedAction
        ]);
      });
    });
  });

  return { data, headers, summary };
}

function generateEnhancedDetailedTestResultsReport(filters) {
  const headers = [
    'Well Name', 'Valve Type', 'Status', 'Leak Rate (scfm)', 'Critical Rate (scfm)',
    'Pa (psia)', 'Pc (psia)', 'Pf (psia)', 'P2 (psia)',
    'Pass/Fail Analysis', 'Technical Notes'
  ];

  const data = [];
  const summary = { total: 0, avgLeakRate: 0 };
  let totalLeakRate = 0;
  let validTests = 0;

  (window.wells || []).forEach(well => {
    if (!reportMatchesWellFilter(filters.well, well.id)) return;

    const grouped = reportGetGroupedResultsForWell(well.id);
    Object.entries(grouped).forEach(([valveId, tests]) => {
      const valveType = reportGetValveName(valveId);
      if (filters.valveType && valveType !== filters.valveType) return;

      (tests || []).forEach(test => {
        if (!test || typeof test !== 'object') return;
        if (filters.testStatus && test.status !== filters.testStatus) return;

        summary.total++;
        if (test.leakRate) {
          totalLeakRate += test.leakRate;
          validTests++;
        }

        let analysis = 'Standard test parameters within acceptable ranges';
        let technicalNotes = 'No significant technical issues identified';

        if (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false) {
          const failureReasons = determineFailureReasons(test, valveType);
          analysis = `FAILURE ANALYSIS: ${failureReasons.join('; ')}`;

          if (failureReasons.some(r => r.toLowerCase().includes('leak rate'))) {
            technicalNotes = 'Leak rate failure detected. Review valve sealing integrity and downstream isolation.';
          } else if (failureReasons.some(r => r.toLowerCase().includes('pressure'))) {
            technicalNotes = 'Pressure test failure. Check valve sealing integrity and system pressure.';
          } else {
            technicalNotes = 'Comprehensive valve inspection recommended.';
          }
        }

        data.push([
          well.name,
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
    });
  });

  summary.avgLeakRate = validTests > 0 ? (totalLeakRate / validTests) : 0;
  return { data, headers, summary };
}

function generateEnhancedWellOverviewReport(filters) {
  const headers = ['Well Name', 'Well Type', 'Total Valves', 'Tested Valves', 'Pass Rate %', 'Critical Failures', 'Compliance Status'];
  const data = [];
  const summary = { totalWells: 0, averagePassRate: 0, totalCriticalFailures: 0 };
  let totalPassRate = 0;

  (window.wells || []).forEach(well => {
    if (!reportMatchesWellFilter(filters.well, well.id)) return;

    summary.totalWells++;
    const grouped = reportGetGroupedResultsForWell(well.id);

    const totalValves = well.christmasTree?.valves?.length || 0;
    let testedValves = 0;
    let passedTests = 0;
    let failedTests = 0;
    let criticalFailures = 0;

    Object.entries(grouped).forEach(([valveId, tests]) => {
      if (!Array.isArray(tests) || tests.length === 0) return;
      testedValves++;

      tests.forEach(test => {
        const failed = (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false);
        if (failed) {
          failedTests++;
          if (reportGetValveName(valveId) === 'SCSSV') criticalFailures++;
        } else {
          passedTests++;
        }
      });
    });

    const passRate = (passedTests + failedTests) > 0 ? ((passedTests / (passedTests + failedTests)) * 100) : 0;
    totalPassRate += passRate;
    summary.totalCriticalFailures += criticalFailures;

    let complianceStatus = 'Compliant';
    if (criticalFailures > 0) complianceStatus = 'Non-Compliant';
    else if (passRate < 80) complianceStatus = 'Needs Attention';

    data.push([
      well.name,
      well.type || 'N/A',
      totalValves,
      testedValves,
      `${passRate.toFixed(1)}%`,
      criticalFailures,
      complianceStatus
    ]);
  });

  summary.averagePassRate = summary.totalWells > 0 ? (totalPassRate / summary.totalWells) : 0;
  return { data, headers, summary };
}

function generateComplianceReport(filters) {
  const headers = ['Well Name', 'Regulatory Status', 'Test Coverage %', 'Outstanding Issues', 'Next Test Due', 'Compliance Level', 'Action Required'];
  const data = [];
  const summary = { compliantWells: 0, nonCompliantWells: 0, overdueTests: 0 };

  (window.wells || []).forEach(well => {
    if (!reportMatchesWellFilter(filters.well, well.id)) return;

    const grouped = reportGetGroupedResultsForWell(well.id);
    const totalValves = well.christmasTree?.valves?.length || 0;
    const testedValves = Object.keys(grouped).length;
    const coveragePercent = totalValves > 0 ? ((testedValves / totalValves) * 100) : 0;

    let outstandingIssues = [];
    let criticalFailures = 0;

    Object.entries(grouped).forEach(([valveId, tests]) => {
      (tests || []).forEach(test => {
        if (test && (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false)) {
          const valveType = reportGetValveName(valveId);
          if (valveType === 'SCSSV') {
            outstandingIssues.push('Critical SCSSV failure');
            criticalFailures++;
          } else {
            outstandingIssues.push(`${valveType} failure`);
          }
        }
      });
    });

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
      well.name,
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

function generateRiskAssessmentReport(filters) {
  const headers = ['Well Name', 'Primary Risk Factors', 'Mitigation Status', 'Recommended Actions'];
  const data = [];
  const summary = { highRiskWells: 0 };

  (window.wells || []).forEach(well => {
    if (!reportMatchesWellFilter(filters.well, well.id)) return;

    const grouped = reportGetGroupedResultsForWell(well.id);
    let riskFactors = [];
    let mitigationStatus = 'Adequate';
    let priorityLevel = 'Low Priority';

    Object.entries(grouped).forEach(([valveId, tests]) => {
      (tests || []).forEach(test => {
        if (test && (test.status === 'fail' || test.pass === false || test.test_valid === false || test.leak_rate_pass === false)) {
          const valveType = reportGetValveName(valveId);
          if (valveType === 'SCSSV') {
            riskFactors.push('SCSSV failure - Well control risk');
          } else {
            riskFactors.push(`${valveType} operational failure`);
          }
        }
      });
    });

    const totalValves = well.christmasTree?.valves?.length || 0;
    const testedValves = Object.keys(grouped).length;
    if (testedValves < totalValves) {
      riskFactors.push('Incomplete testing coverage');
    }

    if (riskFactors.some(f => f.includes('SCSSV'))) {
      priorityLevel = 'Critical Priority';
      mitigationStatus = 'Inadequate';
      summary.highRiskWells++;
    } else if (riskFactors.length > 0) {
      priorityLevel = 'High Priority';
      mitigationStatus = 'Needs Improvement';
    }

    const recommendedActions =
      priorityLevel === 'Critical Priority'
        ? 'Emergency response plan activation'
        : priorityLevel === 'High Priority'
        ? 'Accelerated maintenance schedule'
        : 'Standard maintenance protocols';

    data.push([
      well.name,
      riskFactors.length > 0 ? riskFactors.join('; ') : 'No significant risk factors',
      mitigationStatus,
      recommendedActions
    ]);
  });

  return { data, headers, summary };
}

// ------------------- TABLE DATA -------------------

function processDataForTwoTables() {
  const wellInfoData = [];
  const initialConditionsData = [];
  const finalConditionsData = [];
  const filters = getFilterValues();
  const processedWells = new Set();

  (window.wells || []).forEach(well => {
    if (!reportMatchesWellFilter(filters.well, well.id)) return;

    const grouped = reportGetGroupedResultsForWell(well.id);
    Object.entries(grouped).forEach(([valveId, tests]) => {
      const valveType = reportGetValveName(valveId);
      if (filters.valveType && valveType !== filters.valveType) return;

      const mostRecentTest = Array.isArray(tests) && tests.length > 0 ? tests[tests.length - 1] : null;
      if (!mostRecentTest || typeof mostRecentTest !== 'object') return;
      if (filters.testStatus && mostRecentTest.status !== filters.testStatus) return;

      if (!processedWells.has(well.id)) {
        wellInfoData.push({
          wellId: well.name,
          sithp: mostRecentTest.sithp || mostRecentTest.inputs?.Sithp || 'N/A',
          liquidYield: mostRecentTest.liquid_yield || mostRecentTest.inputs?.LiquidYield || 'N/A'
        });
        processedWells.add(well.id);
      }

      let comments = 'Test completed successfully';
      if (mostRecentTest.status === 'fail' || mostRecentTest.pass === false || mostRecentTest.test_valid === false || mostRecentTest.leak_rate_pass === false) {
        comments = determineFailureReasons(mostRecentTest, valveType).join('; ');
      }

      initialConditionsData.push({
        valve: valveType,
        monitoringTime: mostRecentTest.monitoringTime ?? mostRecentTest.inputs?.MonitoringTime_min ?? 'N/A',
        maxInternalRate: mostRecentTest.criticalRate ?? 'N/A',
        initialTemperature: mostRecentTest.initialTemperature ?? mostRecentTest.inputs?.InitialTemperature_F ?? 'N/A',
        initialPressure: mostRecentTest.initialPressure ?? mostRecentTest.inputs?.InitialPressure_psig ?? mostRecentTest.Pa ?? 'N/A'
      });

      finalConditionsData.push({
        valve: valveType,
        finalTemperature: mostRecentTest.finalTemperature ?? 'N/A',
        finalPressure: mostRecentTest.P2 ?? mostRecentTest.finalPressure ?? 'N/A',
        blockingValve: mostRecentTest.blockingValve ?? 'N/A',
        actualInternalLeak: mostRecentTest.leakRate != null ? Number(mostRecentTest.leakRate).toFixed(3) : 'N/A',
        status: mostRecentTest.status === 'pass' ? 'PASS' : 'FAIL',
        comments
      });
    });
  });

  return { wellInfoData, initialConditionsData, finalConditionsData };
}

// ------------------- GENERATE -------------------

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

  const { wellInfoData, initialConditionsData, finalConditionsData } = processDataForTwoTables();
  lastWellInfoData = wellInfoData;
  lastInitialConditionsData = initialConditionsData;
  lastFinalConditionsData = finalConditionsData;
  lastReportSummary = reportSummary;
  lastReportData = reportData;
  lastReportHeaders = reportHeaders;

  displayEnhancedReport(reportData, reportHeaders, reportType, reportSummary);
  document.getElementById('reportOutputContainer')?.classList.add('active');

  document.getElementById('exportPdfBtn').disabled = false;
  document.getElementById('exportCsvBtn').disabled = false;
  document.getElementById('printReportBtn').disabled = false;
}

// ------------------- DISPLAY -------------------

function getEnhancedReportTitle() {
  const selectedWellId = document.getElementById('wellFilter')?.value || '';
  if (selectedWellId) {
    const well = reportGetWellById(selectedWellId);
    return `COP WELL INTEGRITY TEST REPORT FOR ${well?.name || selectedWellId}`;
  }
  return 'COP WELL INTEGRITY TEST REPORT FOR THE ALBA FIELD';
}

function displayEnhancedReport(data, headers, reportType, summary) {
  const outputContainer = document.getElementById('reportOutputContainer');
  if (!outputContainer) return;

  const reportTitle = getEnhancedReportTitle();
  const currentDate = new Date().toLocaleString();

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
    const { wellInfoData, initialConditionsData, finalConditionsData } = processDataForTwoTables();

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
                return `
                  <tr class="${isFailed ? 'failed-test' : ''}">
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

    html += generateExecutiveSummary(reportType, summary, data.length);
  }

  html += generateRecommendationsSection(reportType, summary);
  outputContainer.innerHTML = html;
}

// ------------------- SUMMARY / RECOMMENDATIONS -------------------

function generateExecutiveSummary(reportType, summary, recordCount) {
  let summaryHtml = '<div class="executive-summary"><h3>Executive Summary</h3>';

  switch (reportType) {
    case 'valveTestResults': {
      const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;
      summaryHtml += `
        <div class="summary-grid">
          <div class="summary-card"><div class="summary-number">${summary.total}</div><div class="summary-label">Total Tests</div></div>
          <div class="summary-card success"><div class="summary-number">${summary.passed}</div><div class="summary-label">Passed</div></div>
          <div class="summary-card failure"><div class="summary-number">${summary.failed}</div><div class="summary-label">Failed</div></div>
          <div class="summary-card performance"><div class="summary-number">${passRate}%</div><div class="summary-label">Pass Rate</div></div>
        </div>
      `;
      break;
    }
    default:
      summaryHtml += `<div class="summary-card"><div class="summary-number">${recordCount}</div><div class="summary-label">Total Records</div></div>`;
  }

  summaryHtml += '</div>';
  return summaryHtml;
}

function generateRecommendationsSection(reportType, summary) {
  let recommendationsHtml = '<div class="recommendations-section"><h3>Recommendations & Next Steps</h3><div class="recommendations-list">';

  switch (reportType) {
    case 'valveTestResults':
      if (summary.criticalFailures > 0) {
        recommendationsHtml += '<div class="recommendation urgent"><strong>URGENT:</strong> Address critical valve failures immediately.</div>';
      }
      recommendationsHtml += '<div class="recommendation standard"><strong>ROUTINE:</strong> Continue regular testing schedule.</div>';
      break;
    case 'testFailureSummary':
      recommendationsHtml += '<div class="recommendation urgent"><strong>PRIORITY 1:</strong> All critical failures require immediate corrective action.</div>';
      recommendationsHtml += '<div class="recommendation important"><strong>PRIORITY 2:</strong> Major failures should be addressed within 7 days.</div>';
      recommendationsHtml += '<div class="recommendation standard"><strong>PRIORITY 3:</strong> Monitor minor issues and schedule maintenance as required.</div>';
      break;
    default:
      recommendationsHtml += '<div class="recommendation standard"><strong>ACTION:</strong> Review report findings and implement corrective measures.</div>';
  }

  recommendationsHtml += '</div></div>';
  return recommendationsHtml;
}

// ------------------- EXPORT / PRINT -------------------

function printCurrentReport() {
  window.print();
}

function exportCurrentReportCSV() {
  if (!lastWellInfoData && !lastInitialConditionsData && !lastFinalConditionsData) {
    alert('No report data to export');
    return;
  }

  let csvContent = `"${getEnhancedReportTitle()}"\n`;
  csvContent += `"Generated: ${new Date().toLocaleString()}"\n\n`;

  if (lastWellInfoData.length > 0) {
    csvContent += '"WELL INFORMATION"\n';
    csvContent += '"Well ID","SITHP","Liquid Yield"\n';
    csvContent += lastWellInfoData.map(row => `"${row.wellId}","${row.sithp}","${row.liquidYield}"`).join('\n') + '\n\n';
  }

  if (lastInitialConditionsData.length > 0) {
    csvContent += '"INITIAL CONDITIONS"\n';
    csvContent += '"Valve","Monitoring Time (min)","Maximum Internal Rate (scfm)","Initial Temperature (°F)","Initial Pressure (psig)"\n';
    csvContent += lastInitialConditionsData.map(row => `"${row.valve}","${row.monitoringTime}","${row.maxInternalRate}","${row.initialTemperature}","${row.initialPressure}"`).join('\n') + '\n\n';
  }

  if (lastFinalConditionsData.length > 0) {
    csvContent += '"FINAL CONDITIONS"\n';
    csvContent += '"Valve","Final Temperature (°F)","Final Pressure (psig)","Blocking Valve","Actual Internal Leak (scfm)","Status","Comments"\n';
    csvContent += lastFinalConditionsData.map(row => `"${row.valve}","${row.finalTemperature}","${row.finalPressure}","${row.blockingValve}","${row.actualInternalLeak}","${row.status}","${row.comments}"`).join('\n') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `well_integrity_three_tables_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCurrentReportPDF() {
  if (!lastWellInfoData && !lastInitialConditionsData && !lastFinalConditionsData) {
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
  const titleText = getEnhancedReportTitle();
  const pageWidth = doc.internal.pageSize.width;
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, 26);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 25, 45);
  doc.text('Well Integrity Management System', 200, 45);

  let startY = 60;

  if (lastWellInfoData.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(0,0,0);
    doc.setFont(undefined, 'bold');
    doc.text('WELL INFORMATION', 25, startY);
    startY += 2;

    doc.autoTable({
      head: [['Well ID', 'SITHP', 'Liquid Yield']],
      body: lastWellInfoData.map(row => [row.wellId, row.sithp, row.liquidYield]),
      startY,
      margin: { left: 25, right: 25 }
    });

    startY = doc.lastAutoTable.finalY + 15;
  }

  if (lastInitialConditionsData.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(0,0,0);
    doc.setFont(undefined, 'bold');
    doc.text('INITIAL CONDITIONS', 25, startY);
    startY += 2;

    doc.autoTable({
      head: [['Valve', 'Monitoring Time (min)', 'Max Internal Rate (scfm)', 'Initial Temp (°F)', 'Initial Pressure (psig)']],
      body: lastInitialConditionsData.map(row => [row.valve, row.monitoringTime, row.maxInternalRate, row.initialTemperature, row.initialPressure]),
      startY,
      margin: { left: 25, right: 25 }
    });

    startY = doc.lastAutoTable.finalY + 15;
  }

  if (lastFinalConditionsData.length > 0) {
    if (startY > 150) {
      doc.addPage();
      startY = 25;
    }

    doc.setFontSize(11);
    doc.setTextColor(0,0,0);
    doc.setFont(undefined, 'bold');
    doc.text('FINAL CONDITIONS', 25, startY);
    startY += 2;

    doc.autoTable({
      head: [['Valve', 'Final Temp (°F)', 'Final Pressure (psig)', 'Blocking Valve', 'Actual Leak (scfm)', 'Status', 'Comments']],
      body: lastFinalConditionsData.map(row => [row.valve, row.finalTemperature, row.finalPressure, row.blockingValve, row.actualInternalLeak, row.status, row.comments]),
      startY,
      margin: { left: 25, right: 25 }
    });
  }

  doc.save(`well_integrity_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ------------------- EXPORTS -------------------

window.renderReportsSection = renderReportsSection;
window.generateReport = generateReport;
window.exportCurrentReportCSV = exportCurrentReportCSV;
window.exportCurrentReportPDF = exportCurrentReportPDF;
window.printCurrentReport = printCurrentReport;
