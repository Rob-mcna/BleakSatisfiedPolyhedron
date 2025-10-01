/**
 * Enhanced Well Integrity Reports System
 * Improved version with comprehensive valve test analysis and reporting capabilities
 * Author: MiniMax Agent
 * Date: 2025-10-01
 */

// --- ENHANCED REPORTS SECTION WITH TEST RESULTS INTEGRATION ---

function renderReportsSection() {
  const container = document.getElementById('reportsUI');
  if (!container) return;

  container.innerHTML = `
    <div class="report-controls-panel">
      <div class="report-panel-header">
        <h2>Filters & Report Generation</h2>
      </div>
      <div class="report-panel-body" id="reportFiltersAccordionContainer"> 
        <!-- Accordion will be built here by setupReportFilters -->
      </div>
      <div class="report-panel-footer">
        <button id="generateReportBtn" class="primary-btn report-action-btn">Generate Report</button>
        <button id="exportCSVBtn" class="secondary-btn report-action-btn" style="display:none;">Export CSV</button>
        <button id="exportPDFBtn" class="secondary-btn report-action-btn" style="display:none;">Export PDF</button>
        <button id="exportHTMLBtn" class="secondary-btn report-action-btn" style="display:none;">Export HTML</button>
      </div>
    </div>
    <div id="reportOutput" class="report-output-area">
      <div class="report-output-placeholder">
          <svg class="placeholder-icon" xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
          </svg>
          <p class="placeholder-text-main">Report Display Area</p>
          <p class="placeholder-text-sub">Use the filters on the left and click "Generate Report".</p>
          <p class="placeholder-text-detail">Your selected data and visualizations will appear here.</p>
      </div>
    </div>
    <div id="customReportChart" style="margin-top:18px;"></div>
  `;

  setupReportFilters(); // Initial call - no argument passed
  
  document.getElementById('generateReportBtn').onclick = generateReport;
  document.getElementById('exportCSVBtn').onclick = exportCurrentReportCSV;
  document.getElementById('exportPDFBtn').onclick = exportCurrentReportPDF;
  document.getElementById('exportHTMLBtn').onclick = exportCurrentReportHTML;
}

let lastReportHeaders = [];
let lastReportData = [];
let lastReportType = '';
let lastReportFilters = {};

// ENHANCED setupReportFilters function with improved valve test options
function setupReportFilters(explicitReportType) {
  const accordionContainer = document.getElementById('reportFiltersAccordionContainer');
  
  // Determine the report type to use for building filters.
  const reportTypeForLogic = explicitReportType !== undefined 
                             ? explicitReportType
                             : (document.getElementById('reportTypeSelect')?.value || "wellStatus");

  // Store current report type
  lastReportType = reportTypeForLogic;

  // Now clear the container AFTER we've determined the reportTypeForLogic
  accordionContainer.innerHTML = ''; 

  const allFilterGroups = [
    {
      id: "reportTypeGroup",
      title: "Report Type",
      isOpen: true, 
      items: [
        { 
          label: "", type: "select", id: "reportTypeSelect", 
          isReportTypeSelector: true,
          options: [
            { value: "wellStatus", text: "Well Status Overview" },
            { value: "deviations", text: "Deviations/Dispensations" },
            { value: "maasp", text: "MAASP Exceedances" },
            { value: "audit", text: "Deviation Audit Logs" },
            { value: "valveTestDetail", text: "Valve Test Results (Basic)" },
            { value: "valveTestComprehensive", text: "Comprehensive Test Analysis" },
            { value: "wellIntegrityReport", text: "Well Integrity Assessment" },
            { value: "custom", text: "Custom Chart/Report" }
          ]
        }
      ]
    },
    // Dynamic filter groups will be added below
  ];

  // Add dynamic filter groups based on reportTypeForLogic
  if (reportTypeForLogic === "wellStatus" || reportTypeForLogic === "maasp") {
    allFilterGroups.push({ 
      id: "locationFiltersGroup", title: "Location Filters", items: [
        { label: "Well:", type: "select", id: "filterWell", options: (window.wells || []).map(w => ({ value: w.id, text: w.id })) },
        { label: "Country:", type: "select", id: "filterCountry", options: Array.from(new Set((window.wells || []).map(w => w.country))).filter(Boolean).map(c => ({ value: c, text: c })) },
        { label: "Field:", type: "select", id: "filterField", options: Array.from(new Set((window.wells || []).map(w => w.field))).filter(Boolean).map(f => ({ value: f, text: f })) },
        { label: "Platform:", type: "select", id: "filterPlatform", options: Array.from(new Set((window.wells || []).map(w => w.platform))).filter(Boolean).map(p => ({ value: p, text: p })) }
      ]});
    allFilterGroups.push({ 
      id: "statusDateFiltersGroup", title: "Status & Date", items: [
        { label: "Status:", type: "select", id: "filterStatus", options: [{value:"Red", text:"Red"}, {value:"Orange", text:"Orange"}, {value:"Yellow", text:"Yellow"}, {value:"Green", text:"Green"}] },
        { label: "Date From:", type: "date", id: "filterDateFrom" },
        { label: "Date To:", type: "date", id: "filterDateTo" }
      ]});
  } else if (reportTypeForLogic === "deviations" || reportTypeForLogic === "audit") {
    allFilterGroups.push({ 
      id: "deviationFiltersGroup", title: "Deviation Filters", items: [
        { label: "Well:", type: "select", id: "filterDevWell", options: (window.wells || []).map(w => ({ value: w.id, text: w.id })) },
        { label: "Status:", type: "select", id: "filterDevStatus", options: [{value:"draft",text:"Draft"}, {value:"open",text:"Open"}, {value:"closed",text:"Closed"}, {value:"expired",text:"Expired"}, {value:"dispensation_requested",text:"Dispensation Requested"}] },
        { label: "Date From:", type: "date", id: "filterDevDateFrom" },
        { label: "Date To:", type: "date", id: "filterDevDateTo" }
      ]});
  } else if (reportTypeForLogic === "valveTestDetail" || reportTypeForLogic === "valveTestComprehensive" || reportTypeForLogic === "wellIntegrityReport") {
     allFilterGroups.push({ 
      id: "valveTestFiltersGroup", title: "Test Filters", items: [
        { label: "Well ID:", type: "text", id: "filterVtdWell", placeholder: "e.g., Well-1" },
        { label: "Valve ID:", type: "text", id: "filterVtdValve", placeholder: "e.g., HWV" },
        { label: "Test Result:", type: "select", id: "filterTestResult", options: [{value:"pass", text:"Pass Only"}, {value:"fail", text:"Fail Only"}] },
        { label: "Test Date From:", type: "date", id: "filterTestDateFrom" },
        { label: "Test Date To:", type: "date", id: "filterTestDateTo" }
      ]});
      
      if (reportTypeForLogic === "valveTestComprehensive" || reportTypeForLogic === "wellIntegrityReport") {
        allFilterGroups.push({
          id: "analysisFiltersGroup", title: "Analysis Options", items: [
            { label: "Include Failure Analysis:", type: "checkbox", id: "includeFailureAnalysis", checked: true },
            { label: "Include Recommendations:", type: "checkbox", id: "includeRecommendations", checked: true },
            { label: "Include Trends:", type: "checkbox", id: "includeTrends", checked: false },
            { label: "Group by Well:", type: "checkbox", id: "groupByWell", checked: true }
          ]
        });
      }
  }

  // Build HTML for accordion groups
  allFilterGroups.forEach(group => {
    const groupWrapper = document.createElement('div');
    groupWrapper.className = 'accordion-group';
    if (group.isOpen) {
      groupWrapper.classList.add('open');
    }

    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.innerHTML = `${group.title} <span class="accordion-icon">${group.isOpen ? '-' : '+'}</span>`;
    header.setAttribute('aria-expanded', group.isOpen ? 'true' : 'false');
    header.setAttribute('aria-controls', `accordion-content-${group.id}`);

    const content = document.createElement('div');
    content.className = 'accordion-content';
    content.id = `accordion-content-${group.id}`;
    if (!group.isOpen) {
      content.style.display = 'none';
    }

    let contentHtml = '';
    group.items.forEach(item => {
      contentHtml += `<div class="filter-item">`;
      if (item.label) {
          contentHtml += `<label for="${item.id}">${item.label}</label>`;
      }
      if (item.type === "select") {
        contentHtml += `<select id="${item.id}" name="${item.id}">`;
        if (!item.isReportTypeSelector) { 
            contentHtml += `<option value="">All</option>`;
        }
        contentHtml += `${(item.options || []).map(opt => 
            `<option value="${opt.value}" ${reportTypeForLogic === opt.value && item.isReportTypeSelector ? 'selected' : ''}>${opt.text}</option>`
        ).join('')}
                      </select>`;
      } else if (item.type === "date") {
        contentHtml += `<input type="date" id="${item.id}" name="${item.id}">`;
      } else if (item.type === "text") {
        contentHtml += `<input type="text" id="${item.id}" name="${item.id}" placeholder="${item.placeholder || ''}">`;
      } else if (item.type === "checkbox") {
        contentHtml += `<input type="checkbox" id="${item.id}" name="${item.id}" ${item.checked ? 'checked' : ''}> ${item.label}`;
      }
      contentHtml += `</div>`;
    });
    content.innerHTML = contentHtml;

    groupWrapper.appendChild(header);
    groupWrapper.appendChild(content);
    accordionContainer.appendChild(groupWrapper);

    header.onclick = function() {
      const currentlyOpen = groupWrapper.classList.toggle('open');
      content.style.display = currentlyOpen ? '' : 'none';
      this.setAttribute('aria-expanded', currentlyOpen ? 'true' : 'false');
      this.querySelector('.accordion-icon').textContent = currentlyOpen ? '-' : '+';
    };
    
    // Attach onchange handler for reportTypeSelect
    if (group.items.some(item => item.isReportTypeSelector)) {
        const reportTypeSelectElement = content.querySelector('#reportTypeSelect');
        if (reportTypeSelectElement) {
            reportTypeSelectElement.onchange = function() {
                setupReportFilters(this.value); 
            };
        }
    }
  });
}

// ENHANCED generateReport function with comprehensive test analysis
function generateReport() {
  const type = document.getElementById('reportTypeSelect')?.value; 
  if (!type) {
    console.error("Report type select element not found or has no value.");
    alert("Please select a report type.");
    return;
  }

  let headers = [];
  let data = [];
  document.getElementById('customReportChart').innerHTML = ''; 

  // Store current filters for export functions
  lastReportFilters = getCurrentFilters();

  if (type === "wellStatus") {
    headers = ["ID", "Country", "Field", "Platform", "Status", "Last Test Date", "Details Label", "Details Message"];
    data = filterWells().map(w => [
      w.id, w.country, w.field, w.platform, w.status, w.lastTest,
      (w.rings && w.rings.length > 0 ? w.rings[0].label : ''),
      (w.rings && w.rings.length > 0 ? w.rings[0].message : '')
    ]);
  } else if (type === "deviations") {
    headers = ["Well ID", "Title", "Type", "Status", "Valid Until", "Created At"];
    data = filterDeviations().map(d => [
      d.wellId || "N/A", d.title, d.type, d.status, d.validUntil,
      d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "N/A"
    ]);
  } else if (type === "maasp") {
    headers = ["Well ID", "Date", "Measured", "MAASP", "Exceedance"];
    data = [];
    let wellsToCheck = filterWells().map(w => w.id);
    const fDateFrom = document.getElementById('filterDateFrom')?.value;
    const fDateTo = document.getElementById('filterDateTo')?.value;

    wellsToCheck.forEach(wellId => {
      let arr = (window.allMaaspData && window.allMaaspData[wellId]) || [];
      arr.forEach(row => {
        if (
          (!fDateFrom || row.date >= fDateFrom) &&
          (!fDateTo || row.date <= fDateTo)
        ) {
          data.push([
            wellId, row.date, row.measured, row.maasp,
            parseFloat(row.measured) > parseFloat(row.maasp) ? "Yes" : "No"
          ]);
        }
      });
    });
  } else if (type === "audit") {
    headers = ["Well ID", "Deviation Title", "Action", "User", "Timestamp", "Details"];
    data = [];
    filterDeviations().forEach(d => {
      if (Array.isArray(d.auditLog)) {
        d.auditLog.forEach(log => {
          data.push([
            d.wellId || "N/A",
            (d.title || "").slice(0, 40) + ((d.title || "").length > 40 ? "..." : ""),
            log.action, log.user, new Date(log.timestamp).toLocaleString(), log.details || ""
          ]);
        });
      }
    });
  } else if (type === "valveTestDetail") {
    // Basic valve test details (original functionality)
    headers = [
      "Well ID", "Valve ID",
      "Output Leak Rate (scfm)", "Allowable Leak Rate (scfm)", 
      "Test Valid?", "Leak Rate Pass?", "Overall API Result", "Warnings"
    ];
    data = generateValveTestData();
  } else if (type === "valveTestComprehensive") {
    // Enhanced comprehensive valve test analysis
    return generateComprehensiveTestReport();
  } else if (type === "wellIntegrityReport") {
    // Full well integrity assessment
    return generateWellIntegrityReport();
  } else if (type === "custom") {
    headers = ["Well ID", "Open Deviation Count"];
    let counts = {};
    (window.deviations || []).filter(d => d.status === 'open' || d.status === 'dispensation_requested').forEach(d => {
      const well = d.wellId || "Unknown Well";
      counts[well] = (counts[well] || 0) + 1;
    });
    data = Object.entries(counts).map(([wellId, count]) => [wellId, count]);
    renderDeviationBarChart(counts);
  }

  lastReportHeaders = headers;
  lastReportData = data;
  renderReportTable(headers, data);

  document.getElementById('exportCSVBtn').style.display = data.length ? '' : 'none';
  document.getElementById('exportPDFBtn').style.display = data.length ? '' : 'none';
  document.getElementById('exportHTMLBtn').style.display = data.length ? '' : 'none';
}

// NEW: Generate valve test data with enhanced filtering
function generateValveTestData() {
  const data = [];
  const fWell = document.getElementById('filterVtdWell')?.value.toLowerCase() || '';
  const fValve = document.getElementById('filterVtdValve')?.value.toLowerCase() || '';
  const fResult = document.getElementById('filterTestResult')?.value || '';
  const fDateFrom = document.getElementById('filterTestDateFrom')?.value;
  const fDateTo = document.getElementById('filterTestDateTo')?.value;

  for (const wellId in window.valveTestResults) {
    if (fWell && wellId.toLowerCase().indexOf(fWell) === -1) continue;
    const wellData = window.valveTestResults[wellId];
    
    for (const valveId in wellData) {
      if (fValve && valveId.toLowerCase().indexOf(fValve) === -1) continue;
      
      const tests = Array.isArray(wellData[valveId]) ? wellData[valveId] : [wellData[valveId]];
      
      tests.forEach(result => {
        if (!result) return;

        // Apply result filter
        if (fResult === 'pass' && !result.pass) return;
        if (fResult === 'fail' && result.pass) return;

        // Apply date filter
        if (fDateFrom && result.test_date && result.test_date < fDateFrom) return;
        if (fDateTo && result.test_date && result.test_date > fDateTo) return;

        const allowableRate = (window.VALVE_LIMITS && window.VALVE_LIMITS[valveId] && window.VALVE_LIMITS[valveId].critical_rate !== undefined)
                              ? Number(window.VALVE_LIMITS[valveId].critical_rate).toFixed(3)
                              : "N/A";
        const actualLeakRate = result.leak_rate_scfm !== undefined ? Number(result.leak_rate_scfm).toFixed(3) : "N/A";
        const overallApiResult = (result.pass && result.test_valid && result.leak_rate_pass) ? "Pass" : "Fail";
        const warningsArray = (window.valveTestWarnings && window.valveTestWarnings[wellId] && window.valveTestWarnings[wellId][valveId]) || (result.failure_reasons || []);
        const warningsStr = warningsArray.length > 0 ? warningsArray.join('; ') : "None";

        data.push([
          wellId, valveId, actualLeakRate, allowableRate,
          result.test_valid ? "Yes" : "No", result.leak_rate_pass ? "Yes" : "No",
          overallApiResult, warningsStr
        ]);
      });
    }
  }
  return data;
}

// NEW: Generate comprehensive test report
function generateComprehensiveTestReport() {
  try {
    const wellId = document.getElementById('filterVtdWell')?.value || getFirstAvailableWell();
    if (!wellId || !window.valveTestResults || !window.valveTestResults[wellId]) {
      renderError("No test data available for the selected well. Please ensure test data exists and try again.");
      return;
    }

    // Use the existing test results report generator
    if (window.testResultsReportGenerator) {
      const reportData = window.testResultsReportGenerator.generateTestResultsReport(wellId);
      renderComprehensiveTestReportHTML(reportData);
      
      // Show export buttons
      document.getElementById('exportCSVBtn').style.display = '';
      document.getElementById('exportPDFBtn').style.display = '';
      document.getElementById('exportHTMLBtn').style.display = '';
      
      // Store data for exports
      lastReportHeaders = ["Section", "Details"];
      lastReportData = [
        ["Executive Summary", `Status: ${reportData.executiveSummary.wellStatus}, Pass Rate: ${reportData.executiveSummary.passRate}`],
        ["Total Tests", reportData.executiveSummary.totalTests],
        ["Critical Failures", reportData.executiveSummary.criticalFailures],
        ["Recommendations", reportData.recommendations.length + " action items"]
      ];
    } else {
      renderError("Test results report generator not available. Please ensure all required scripts are loaded.");
    }
  } catch (error) {
    console.error('Error generating comprehensive test report:', error);
    renderError("Error generating comprehensive test report: " + error.message);
  }
}

// NEW: Generate well integrity report
function generateWellIntegrityReport() {
  const wellId = document.getElementById('filterVtdWell')?.value || getFirstAvailableWell();
  if (!wellId) {
    renderError("Please specify a well ID for the integrity assessment.");
    return;
  }

  try {
    if (window.testResultsReportGenerator) {
      const reportData = window.testResultsReportGenerator.generateTestResultsReport(wellId);
      renderWellIntegrityReportHTML(reportData);
      
      // Show export buttons
      document.getElementById('exportCSVBtn').style.display = '';
      document.getElementById('exportPDFBtn').style.display = '';
      document.getElementById('exportHTMLBtn').style.display = '';
    } else {
      renderError("Well integrity report generator not available.");
    }
  } catch (error) {
    console.error('Error generating well integrity report:', error);
    renderError("Error generating well integrity report: " + error.message);
  }
}

// NEW: Render comprehensive test report HTML
function renderComprehensiveTestReportHTML(reportData) {
  const html = `
    <div class="comprehensive-test-report">
      <div class="report-header">
        <h2>Comprehensive Test Analysis - ${reportData.metadata.wellName}</h2>
        <div class="report-metadata">
          <span class="report-date">Generated: ${reportData.metadata.reportDate}</span>
          <span class="report-number">Report #${reportData.metadata.reportNumber}</span>
        </div>
      </div>
      
      <div class="executive-summary-card">
        <h3>Executive Summary</h3>
        <div class="status-indicator status-${reportData.executiveSummary.wellStatus.toLowerCase().replace(' ', '-')}">
          ${reportData.executiveSummary.wellStatus}
        </div>
        <div class="summary-metrics">
          <div class="metric">
            <span class="metric-value">${reportData.executiveSummary.totalTests}</span>
            <span class="metric-label">Total Tests</span>
          </div>
          <div class="metric">
            <span class="metric-value">${reportData.executiveSummary.passRate}</span>
            <span class="metric-label">Pass Rate</span>
          </div>
          <div class="metric">
            <span class="metric-value">${reportData.executiveSummary.criticalFailures}</span>
            <span class="metric-label">Critical Failures</span>
          </div>
        </div>
      </div>

      <div class="test-results-section">
        <h3>Test Results by Valve</h3>
        ${reportData.testResultsDetails.map(valve => `
          <div class="valve-test-card">
            <div class="valve-header">
              <h4>${valve.valveName} (${valve.valveId})</h4>
              <span class="valve-status status-${valve.currentStatus.toLowerCase().replace(' ', '-')}">${valve.currentStatus}</span>
            </div>
            <div class="valve-details">
              <p><strong>Total Tests:</strong> ${valve.testCount} | <strong>Last Test:</strong> ${valve.lastTestDate || 'Not tested'}</p>
              ${valve.tests.length > 0 ? `
                <div class="test-history">
                  ${valve.tests.slice(-3).map(test => `
                    <div class="test-item ${test.result.toLowerCase()}">
                      <div class="test-date">${test.testDate}</div>
                      <div class="test-result">
                        <span class="traffic-light ${test.trafficLight}"></span>
                        ${test.result}
                      </div>
                      ${test.mitigatingAction ? `<div class="test-action">${test.mitigatingAction}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : '<p class="no-tests">No test data available</p>'}
            </div>
          </div>
        `).join('')}
      </div>

      ${reportData.failureAnalysis.totalFailures > 0 ? `
        <div class="failure-analysis-section">
          <h3>Failure Analysis</h3>
          <div class="failure-summary">
            <p><strong>Total Failures:</strong> ${reportData.failureAnalysis.totalFailures}</p>
            <p><strong>Critical Failures:</strong> ${reportData.failureAnalysis.criticalFailures.length}</p>
          </div>
          <div class="failure-categories">
            <h4>Failures by Category:</h4>
            <ul>
              ${Object.entries(reportData.failureAnalysis.failuresByCategory).map(([category, count]) => 
                `<li>${category}: <strong>${count}</strong></li>`
              ).join('')}
            </ul>
          </div>
        </div>
      ` : ''}

      <div class="recommendations-section">
        <h3>Recommendations</h3>
        ${reportData.recommendations.map(group => `
          <div class="recommendation-group">
            <h4>${group.type}</h4>
            <p class="group-description">${group.description}</p>
            <ul class="recommendation-list">
              ${group.items.map(item => `
                <li class="recommendation-item priority-${item.priority.toLowerCase()}">
                  <div class="priority-badge">${item.priority}</div>
                  <div class="recommendation-content">
                    <div class="recommendation-text">${item.description}</div>
                    ${item.timeframe ? `<div class="timeframe">Timeframe: ${item.timeframe}</div>` : ''}
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('reportOutput').innerHTML = html;
  addComprehensiveReportStyles();
}

// NEW: Render well integrity report HTML
function renderWellIntegrityReportHTML(reportData) {
  const html = `
    <div class="well-integrity-report">
      <div class="report-header">
        <h1>Well Integrity Assessment</h1>
        <h2>${reportData.metadata.wellName} (${reportData.metadata.wellId})</h2>
        <div class="report-metadata">
          <div class="metadata-grid">
            <div class="metadata-item">
              <label>Well Type:</label>
              <span>${reportData.metadata.wellType}</span>
            </div>
            <div class="metadata-item">
              <label>Location:</label>
              <span>${reportData.metadata.location}</span>
            </div>
            <div class="metadata-item">
              <label>Operator:</label>
              <span>${reportData.metadata.operator}</span>
            </div>
            <div class="metadata-item">
              <label>Report Date:</label>
              <span>${reportData.metadata.reportDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="integrity-status-overview">
        <div class="status-card">
          <div class="status-header">
            <h3>Overall Well Status</h3>
            <div class="status-badge ${reportData.executiveSummary.wellStatus.toLowerCase().replace(' ', '-')}">
              ${reportData.executiveSummary.wellStatus}
            </div>
          </div>
          <div class="status-metrics">
            <div class="metric-grid">
              <div class="metric">
                <div class="metric-value">${reportData.executiveSummary.totalValves}</div>
                <div class="metric-label">Valves Monitored</div>
              </div>
              <div class="metric">
                <div class="metric-value">${reportData.executiveSummary.passRate}</div>
                <div class="metric-label">Overall Pass Rate</div>
              </div>
              <div class="metric">
                <div class="metric-value">${reportData.executiveSummary.criticalFailures}</div>
                <div class="metric-label">Critical Issues</div>
              </div>
              <div class="metric">
                <div class="metric-value">${reportData.executiveSummary.lastTestDate}</div>
                <div class="metric-label">Last Test Date</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="integrity-assessment-details">
        <h3>Detailed Integrity Assessment</h3>
        ${reportData.testResultsDetails.map(valve => `
          <div class="valve-integrity-card">
            <div class="valve-header">
              <h4>${valve.valveName}</h4>
              <div class="valve-status-indicator">
                <span class="status-light ${getStatusLight(valve.currentStatus)}"></span>
                <span class="status-text">${valve.currentStatus}</span>
              </div>
            </div>
            <div class="integrity-details">
              <div class="test-summary">
                <strong>Test Summary:</strong> ${valve.testCount} tests performed
                ${valve.lastTestDate ? ` | Last tested: ${valve.lastTestDate}` : ''}
              </div>
              ${valve.tests.length > 0 ? `
                <div class="latest-test-details">
                  <h5>Latest Test Results:</h5>
                  ${(() => {
                    const latestTest = valve.tests[valve.tests.length - 1];
                    return `
                      <div class="test-result-grid">
                        <div class="result-item">
                          <label>Result:</label>
                          <span class="result-badge ${latestTest.result.toLowerCase()}">${latestTest.result}</span>
                        </div>
                        <div class="result-item">
                          <label>Test Pressure:</label>
                          <span>${latestTest.testPressure}</span>
                        </div>
                        <div class="result-item">
                          <label>Pressure Drop:</label>
                          <span>${latestTest.pressureDrop}</span>
                        </div>
                        <div class="result-item">
                          <label>Leak Rate:</label>
                          <span>${latestTest.leakRate}</span>
                        </div>
                      </div>
                      ${latestTest.mitigatingAction ? `
                        <div class="mitigation-action">
                          <strong>Required Action:</strong> ${latestTest.mitigatingAction}
                        </div>
                      ` : ''}
                    `;
                  })()}
                </div>
              ` : '<div class="no-test-data">No test data available for integrity assessment</div>'}
            </div>
          </div>
        `).join('')}
      </div>

      ${reportData.recommendations.length > 0 ? `
        <div class="integrity-recommendations">
          <h3>Integrity Management Recommendations</h3>
          ${reportData.recommendations.map(group => `
            <div class="recommendation-section">
              <h4 class="recommendation-type">${group.type}</h4>
              <p class="recommendation-description">${group.description}</p>
              <div class="recommendation-items">
                ${group.items.map(item => `
                  <div class="recommendation-card priority-${item.priority.toLowerCase()}">
                    <div class="priority-indicator">
                      <span class="priority-label">${item.priority}</span>
                      ${item.timeframe ? `<span class="timeframe">${item.timeframe}</span>` : ''}
                    </div>
                    <div class="recommendation-text">${item.description}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="report-footer">
        <p>This report was generated by the Well Integrity Management System on ${reportData.metadata.reportDate} at ${reportData.metadata.reportTime}.</p>
        <p><strong>Note:</strong> This assessment is based on available test data and should be reviewed by qualified personnel.</p>
      </div>
    </div>
  `;

  document.getElementById('reportOutput').innerHTML = html;
  addWellIntegrityReportStyles();
}

// NEW: Helper functions
function getFirstAvailableWell() {
  if (window.valveTestResults) {
    return Object.keys(window.valveTestResults)[0];
  }
  if (window.wells && window.wells.length > 0) {
    return window.wells[0].id;
  }
  return null;
}

function getStatusLight(status) {
  const statusMap = {
    'PASS': 'green',
    'SATISFACTORY': 'green',
    'ATTENTION REQUIRED': 'yellow',
    'HIGH PRIORITY FAILURE': 'orange',
    'CRITICAL FAILURE': 'red',
    'FAILURE': 'red',
    'NOT TESTED': 'gray'
  };
  return statusMap[status] || 'gray';
}

function renderError(message) {
  document.getElementById('reportOutput').innerHTML = `
    <div class="error-message">
      <div class="error-icon">⚠️</div>
      <h3>Report Generation Error</h3>
      <p>${message}</p>
    </div>
  `;
}

function getCurrentFilters() {
  const filters = {};
  const type = document.getElementById('reportTypeSelect')?.value;
  filters.reportType = type;
  
  // Collect all filter values
  document.querySelectorAll('#reportFiltersAccordionContainer input, #reportFiltersAccordionContainer select').forEach(input => {
    if (input.id && input.value) {
      filters[input.id] = input.value;
    }
  });
  
  return filters;
}

// NEW: Export as HTML function
function exportCurrentReportHTML() {
  if (lastReportType === 'valveTestComprehensive' || lastReportType === 'wellIntegrityReport') {
    // Export the comprehensive report as standalone HTML
    const reportContent = document.getElementById('reportOutput').innerHTML;
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Well Integrity Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .comprehensive-test-report, .well-integrity-report { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .report-header h1, .report-header h2 { color: #2c3e50; margin: 0 0 10px 0; }
        .status-indicator, .status-badge { padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; display: inline-block; }
        .status-satisfactory { background-color: #27ae60; }
        .status-attention-required { background-color: #f39c12; }
        .status-critical { background-color: #e74c3c; }
        .metric { text-align: center; padding: 15px; margin: 10px; background: #ecf0f1; border-radius: 5px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #3498db; display: block; }
        .metric-label { color: #7f8c8d; font-size: 0.9em; }
        .valve-test-card, .valve-integrity-card { border: 1px solid #bdc3c7; margin: 15px 0; border-radius: 5px; background: #fafafa; }
        .valve-header { background: #34495e; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
        .traffic-light { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
        .traffic-light.green { background-color: #27ae60; }
        .traffic-light.yellow { background-color: #f1c40f; }
        .traffic-light.orange { background-color: #e67e22; }
        .traffic-light.red { background-color: #e74c3c; }
        .recommendation-card { border-left: 4px solid #3498db; padding: 15px; margin: 10px 0; background: white; border-radius: 0 5px 5px 0; }
        .priority-critical { border-left-color: #e74c3c; }
        .priority-high { border-left-color: #e67e22; }
        .priority-medium { border-left-color: #f39c12; }
        .priority-low { border-left-color: #27ae60; }
        .report-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7; color: #7f8c8d; font-size: 0.9em; }
        @media print { body { background: white; } .comprehensive-test-report, .well-integrity-report { box-shadow: none; } }
    </style>
</head>
<body>
    ${reportContent}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `well-integrity-report-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Export regular table report as HTML
    const tableHtml = document.getElementById('reportOutput').innerHTML;
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Well Integrity Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
    </style>
</head>
<body>
    <h1>Well Integrity Management Report</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>
    ${tableHtml}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Add comprehensive report styles
function addComprehensiveReportStyles() {
  if (!document.getElementById('comprehensiveReportStyles')) {
    const style = document.createElement('style');
    style.id = 'comprehensiveReportStyles';
    style.innerHTML = `
      .comprehensive-test-report {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 100%;
        background: white;
        border-radius: 8px;
        overflow: hidden;
      }
      .report-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        text-align: center;
      }
      .report-header h2 {
        margin: 0;
        font-size: 1.8em;
        font-weight: 300;
      }
      .report-metadata {
        margin-top: 15px;
        opacity: 0.9;
      }
      .report-metadata span {
        margin: 0 15px;
        font-size: 0.9em;
      }
      .executive-summary-card {
        padding: 30px;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
      }
      .executive-summary-card h3 {
        margin: 0 0 20px 0;
        color: #495057;
      }
      .status-indicator {
        font-size: 1.2em;
        font-weight: 600;
        padding: 12px 24px;
        border-radius: 25px;
        display: inline-block;
        margin-bottom: 20px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .status-satisfactory {
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
      }
      .status-attention-required {
        background: linear-gradient(135deg, #ffc107, #fd7e14);
        color: #212529;
      }
      .status-critical {
        background: linear-gradient(135deg, #dc3545, #e83e8c);
        color: white;
      }
      .summary-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      .metric {
        text-align: center;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .metric-value {
        font-size: 2.5em;
        font-weight: 700;
        color: #6f42c1;
        display: block;
      }
      .metric-label {
        color: #6c757d;
        font-size: 0.9em;
        margin-top: 5px;
      }
      .test-results-section {
        padding: 30px;
      }
      .test-results-section h3 {
        color: #495057;
        margin-bottom: 25px;
        border-bottom: 2px solid #6f42c1;
        padding-bottom: 10px;
      }
      .valve-test-card {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        margin-bottom: 20px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .valve-header {
        background: linear-gradient(135deg, #495057, #6c757d);
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .valve-header h4 {
        margin: 0;
        font-size: 1.1em;
      }
      .valve-status {
        font-size: 0.9em;
        padding: 4px 12px;
        border-radius: 12px;
        background: rgba(255,255,255,0.2);
      }
      .valve-details {
        padding: 20px;
      }
      .test-history {
        margin-top: 15px;
      }
      .test-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        margin: 5px 0;
        border-radius: 5px;
        background: #f8f9fa;
      }
      .test-item.pass {
        border-left: 4px solid #28a745;
      }
      .test-item.fail {
        border-left: 4px solid #dc3545;
      }
      .traffic-light {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }
      .traffic-light.green { background-color: #28a745; }
      .traffic-light.yellow { background-color: #ffc107; }
      .traffic-light.orange { background-color: #fd7e14; }
      .traffic-light.red { background-color: #dc3545; }
      .failure-analysis-section, .recommendations-section {
        padding: 30px;
        background: #f8f9fa;
      }
      .recommendations-section h3, .failure-analysis-section h3 {
        color: #495057;
        margin-bottom: 25px;
        border-bottom: 2px solid #6f42c1;
        padding-bottom: 10px;
      }
      .recommendation-group {
        margin-bottom: 30px;
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .recommendation-group h4 {
        color: #6f42c1;
        margin: 0 0 10px 0;
      }
      .recommendation-list {
        list-style: none;
        padding: 0;
        margin: 15px 0 0 0;
      }
      .recommendation-item {
        display: flex;
        align-items: flex-start;
        padding: 15px;
        margin: 10px 0;
        border-radius: 5px;
        border-left: 4px solid #6c757d;
        background: #f8f9fa;
      }
      .recommendation-item.priority-critical {
        border-left-color: #dc3545;
        background: #f8d7da;
      }
      .recommendation-item.priority-high {
        border-left-color: #fd7e14;
        background: #fff3cd;
      }
      .recommendation-item.priority-medium {
        border-left-color: #ffc107;
        background: #fff3cd;
      }
      .recommendation-item.priority-standard {
        border-left-color: #28a745;
        background: #d4edda;
      }
      .priority-badge {
        background: #6c757d;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: 600;
        margin-right: 15px;
        min-width: 70px;
        text-align: center;
      }
      .recommendation-item.priority-critical .priority-badge {
        background: #dc3545;
      }
      .recommendation-item.priority-high .priority-badge {
        background: #fd7e14;
      }
      .recommendation-item.priority-medium .priority-badge {
        background: #ffc107;
        color: #212529;
      }
      .recommendation-item.priority-standard .priority-badge {
        background: #28a745;
      }
      .recommendation-content {
        flex: 1;
      }
      .timeframe {
        font-style: italic;
        color: #6c757d;
        font-size: 0.9em;
        margin-top: 5px;
      }
      .no-tests {
        color: #6c757d;
        font-style: italic;
        padding: 20px;
        text-align: center;
      }
      .error-message {
        text-align: center;
        padding: 40px;
        color: #721c24;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 8px;
      }
      .error-icon {
        font-size: 3em;
        margin-bottom: 15px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Add well integrity report styles
function addWellIntegrityReportStyles() {
  if (!document.getElementById('wellIntegrityReportStyles')) {
    const style = document.createElement('style');
    style.id = 'wellIntegrityReportStyles';
    style.innerHTML = `
      .well-integrity-report {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 100%;
        background: white;
        border-radius: 8px;
        overflow: hidden;
      }
      .well-integrity-report .report-header {
        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        color: white;
        padding: 40px;
        text-align: center;
      }
      .well-integrity-report .report-header h1 {
        margin: 0;
        font-size: 2.2em;
        font-weight: 300;
        margin-bottom: 10px;
      }
      .well-integrity-report .report-header h2 {
        margin: 0;
        font-size: 1.4em;
        opacity: 0.9;
        font-weight: 400;
      }
      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-top: 25px;
        background: rgba(255,255,255,0.1);
        padding: 20px;
        border-radius: 8px;
      }
      .metadata-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }
      .metadata-item label {
        font-weight: 600;
        opacity: 0.8;
      }
      .integrity-status-overview {
        padding: 30px;
        background: #f8f9fa;
      }
      .status-card {
        background: white;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
      }
      .status-header h3 {
        margin: 0;
        color: #2c3e50;
        font-size: 1.4em;
      }
      .well-integrity-report .status-badge {
        font-size: 1.1em;
        font-weight: 600;
        padding: 12px 24px;
        border-radius: 25px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
      }
      .well-integrity-report .metric {
        text-align: center;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }
      .well-integrity-report .metric-value {
        font-size: 2.2em;
        font-weight: 700;
        color: #3498db;
        display: block;
        margin-bottom: 5px;
      }
      .well-integrity-report .metric-label {
        color: #6c757d;
        font-size: 0.9em;
        font-weight: 500;
      }
      .integrity-assessment-details {
        padding: 30px;
      }
      .integrity-assessment-details h3 {
        color: #2c3e50;
        margin-bottom: 25px;
        border-bottom: 3px solid #3498db;
        padding-bottom: 10px;
        font-size: 1.4em;
      }
      .valve-integrity-card {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        margin-bottom: 25px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .valve-integrity-card .valve-header {
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .valve-integrity-card .valve-header h4 {
        margin: 0;
        font-size: 1.2em;
        font-weight: 500;
      }
      .valve-status-indicator {
        display: flex;
        align-items: center;
        background: rgba(255,255,255,0.2);
        padding: 8px 16px;
        border-radius: 20px;
      }
      .status-light {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
      }
      .status-light.green { background-color: #27ae60; }
      .status-light.yellow { background-color: #f1c40f; }
      .status-light.orange { background-color: #e67e22; }
      .status-light.red { background-color: #e74c3c; }
      .status-light.gray { background-color: #95a5a6; }
      .integrity-details {
        padding: 25px;
      }
      .test-summary {
        color: #6c757d;
        margin-bottom: 20px;
        font-size: 1.05em;
      }
      .latest-test-details h5 {
        color: #2c3e50;
        margin: 0 0 15px 0;
        font-size: 1.1em;
      }
      .test-result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .result-item {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 5px;
        border-left: 4px solid #3498db;
      }
      .result-item label {
        font-weight: 600;
        color: #495057;
        display: block;
        margin-bottom: 5px;
        font-size: 0.9em;
      }
      .result-badge {
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.9em;
      }
      .result-badge.pass {
        background: #d4edda;
        color: #155724;
      }
      .result-badge.fail {
        background: #f8d7da;
        color: #721c24;
      }
      .mitigation-action {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 15px;
        border-radius: 5px;
        border-left: 4px solid #ffc107;
      }
      .no-test-data {
        color: #6c757d;
        font-style: italic;
        text-align: center;
        padding: 30px;
        background: #f8f9fa;
        border-radius: 5px;
      }
      .integrity-recommendations {
        padding: 30px;
        background: #f8f9fa;
      }
      .integrity-recommendations h3 {
        color: #2c3e50;
        margin-bottom: 25px;
        border-bottom: 3px solid #e74c3c;
        padding-bottom: 10px;
        font-size: 1.4em;
      }
      .recommendation-section {
        margin-bottom: 30px;
        background: white;
        border-radius: 8px;
        padding: 25px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .recommendation-type {
        color: #e74c3c;
        margin: 0 0 10px 0;
        font-size: 1.2em;
        font-weight: 600;
      }
      .recommendation-description {
        color: #6c757d;
        margin-bottom: 20px;
        font-size: 1.05em;
      }
      .recommendation-items {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .recommendation-card {
        display: flex;
        align-items: flex-start;
        padding: 20px;
        border-radius: 8px;
        border-left: 5px solid #6c757d;
        background: #f8f9fa;
      }
      .recommendation-card.priority-critical {
        border-left-color: #e74c3c;
        background: linear-gradient(90deg, #f8d7da 0%, #f8f9fa 10%);
      }
      .recommendation-card.priority-high {
        border-left-color: #fd7e14;
        background: linear-gradient(90deg, #fff3cd 0%, #f8f9fa 10%);
      }
      .recommendation-card.priority-medium {
        border-left-color: #ffc107;
        background: linear-gradient(90deg, #fff3cd 0%, #f8f9fa 10%);
      }
      .recommendation-card.priority-standard {
        border-left-color: #28a745;
        background: linear-gradient(90deg, #d4edda 0%, #f8f9fa 10%);
      }
      .priority-indicator {
        margin-right: 20px;
        text-align: center;
        min-width: 100px;
      }
      .priority-label {
        display: block;
        font-weight: 600;
        font-size: 0.9em;
        padding: 6px 12px;
        border-radius: 15px;
        background: #6c757d;
        color: white;
        margin-bottom: 5px;
      }
      .recommendation-card.priority-critical .priority-label {
        background: #e74c3c;
      }
      .recommendation-card.priority-high .priority-label {
        background: #fd7e14;
      }
      .recommendation-card.priority-medium .priority-label {
        background: #ffc107;
        color: #212529;
      }
      .recommendation-card.priority-standard .priority-label {
        background: #28a745;
      }
      .well-integrity-report .timeframe {
        font-size: 0.8em;
        color: #6c757d;
        font-style: italic;
      }
      .recommendation-text {
        flex: 1;
        font-size: 1.05em;
        line-height: 1.5;
        color: #495057;
      }
      .report-footer {
        padding: 30px;
        background: #2c3e50;
        color: white;
        text-align: center;
      }
      .report-footer p {
        margin: 5px 0;
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);
  }
}

// Keep all existing functions from the original file
function filterWells() {
  const fWell = document.getElementById('filterWell')?.value || '';
  const fCountry = document.getElementById('filterCountry')?.value || '';
  const fField = document.getElementById('filterField')?.value || '';
  const fPlatform = document.getElementById('filterPlatform')?.value || '';
  const fStatus = document.getElementById('filterStatus')?.value || '';
  const fDateFrom = document.getElementById('filterDateFrom')?.value;
  const fDateTo = document.getElementById('filterDateTo')?.value;

  return (window.wells || []).filter(w =>
    (!fWell || w.id === fWell) &&
    (!fCountry || w.country === fCountry) &&
    (!fField || w.field === fField) &&
    (!fPlatform || w.platform === fPlatform) &&
    (!fStatus || w.status === fStatus) &&
    (!fDateFrom || (w.lastTest && w.lastTest >= fDateFrom)) &&
    (!fDateTo || (w.lastTest && w.lastTest <= fDateTo))
  );
}

function filterDeviations() {
  const fWell = document.getElementById('filterDevWell')?.value || '';
  const fStatus = document.getElementById('filterDevStatus')?.value || '';
  const fDateFrom = document.getElementById('filterDevDateFrom')?.value;
  const fDateTo = document.getElementById('filterDevDateTo')?.value;

  return (window.deviations || []).filter(d =>
    (!fWell || (d.wellId || "N/A") === fWell) &&
    (!fStatus || (d.status || "draft") === fStatus) &&
    (!fDateFrom || ( (d.validUntil && d.validUntil >= fDateFrom) || (d.createdAt && d.createdAt.split('T')[0] >= fDateFrom) )) &&
    (!fDateTo || ( (d.validUntil && d.validUntil <= fDateTo) || (d.createdAt && d.createdAt.split('T')[0] <= fDateTo) ))
  );
}

function renderDeviationBarChart(counts) {
  const container = document.getElementById('customReportChart');
  if (!container) return;
  let html = '<h4>Open Deviation Count per Well</h4><ul style="padding:0;">';
  if (Object.keys(counts).length === 0) {
    html += '<li style="list-style:none;color:#888;">No open deviations found.</li>';
  } else {
    Object.entries(counts).forEach(([wellId, count]) => {
      html += `<li style="list-style:none;margin:8px 0;">${wellId}: <span style="background:#1976d2;color:#fff;padding:3px 12px;border-radius:3px;">${count}</span></li>`;
    });
  }
  html += '</ul>';
  container.innerHTML = html;
}

function renderReportTable(headers, data) {
  let html = `<table class="report-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
  if (!data.length) {
    html += `<tr><td colspan="${headers.length}" style="text-align:center; color: var(--report-label-color, #495057); padding:20px;">No data found for the selected filters.</td></tr>`;
  } else {
    html += data.map(row => `<tr>${row.map(cell => `<td>${cell === undefined || cell === null ? '' : cell}</td>`).join('')}</tr>`).join('');
  }
  html += `</tbody></table>`;
  const reportOutputDiv = document.getElementById('reportOutput');
  if (reportOutputDiv) {
      reportOutputDiv.innerHTML = html; 
  }

  if (!document.getElementById('reportTableStyle')) {
    const style = document.createElement('style');
    style.id = 'reportTableStyle';
    style.innerHTML = `
      .report-table { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 0.9em; background-color: var(--report-panel-bg); color: var(--report-text-color); }
      .report-table th, .report-table td { border: 1px solid var(--report-panel-border); padding: 10px 12px; text-align: left; }
      .report-table th { background-color: var(--report-table-header-bg); color: var(--report-table-header-text-color); font-weight: 600; }
      .report-table tr:nth-child(even) { background-color: var(--report-table-row-even-bg); }
      .report-table tr:hover { background-color: var(--report-table-row-hover-bg); }
    `;
    document.head.appendChild(style);
  }
}

function exportCurrentReportCSV() {
  exportToCsv('report.csv', [lastReportHeaders, ...lastReportData]);
}

function exportToCsv(filename, rows) {
  const processRow = row => row.map(cell => {
    const cellStr = (cell === undefined || cell === null) ? '' : String(cell);
    return `"${cellStr.replace(/"/g, '""')}"`;
  }).join(",");
  const csvContent = rows.map(processRow).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Enhanced PDF export function
function exportCurrentReportPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF library not loaded. Please include jsPDF and jsPDF-AutoTable via CDN in your HTML.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  if (!doc.autoTable) {
     alert("jsPDF-AutoTable plugin not loaded. Please ensure it's included AFTER jsPDF in your HTML.");
     return;
  }

  const pageMargin = 40;
  const pageWidth = doc.internal.pageSize.getWidth() - 2 * pageMargin;
  let currentY = pageMargin;

  // Report Header
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("Well Integrity Management Tool - Enhanced Report", pageMargin, currentY);
  currentY += 25;

  // Report Metadata
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const reportTypeSelect = document.getElementById('reportTypeSelect');
  const selectedReportText = reportTypeSelect ? reportTypeSelect.selectedOptions[0].text : "N/A";
  doc.text(`Report Type: ${selectedReportText}`, pageMargin, currentY);
  currentY += 15;

  const generatedByUser = (window.currentUser && window.currentUser.username) ? window.currentUser.username : 'System';
  const generationTime = new Date();
  doc.text(`Generated by: ${generatedByUser} on ${generationTime.toLocaleString()}`, pageMargin, currentY);
  currentY += 25;

  const reportType = reportTypeSelect?.value;

  // Handle comprehensive reports differently
  if (reportType === "valveTestComprehensive" || reportType === "wellIntegrityReport") {
    try {
      const wellId = document.getElementById('filterVtdWell')?.value || getFirstAvailableWell();
      if (wellId && window.testResultsReportGenerator) {
        const reportData = window.testResultsReportGenerator.generateTestResultsReport(wellId);
        
        // Executive Summary
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Executive Summary", pageMargin, currentY);
        currentY += 20;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        doc.text(`Well Status: ${reportData.executiveSummary.wellStatus}`, pageMargin, currentY);
        currentY += 15;
        doc.text(`Total Tests: ${reportData.executiveSummary.totalTests}`, pageMargin, currentY);
        currentY += 15;
        doc.text(`Pass Rate: ${reportData.executiveSummary.passRate}`, pageMargin, currentY);
        currentY += 15;
        doc.text(`Critical Failures: ${reportData.executiveSummary.criticalFailures}`, pageMargin, currentY);
        currentY += 25;

        // Test Results Details
        if (reportData.testResultsDetails && reportData.testResultsDetails.length > 0) {
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text("Test Results by Valve", pageMargin, currentY);
          currentY += 20;
          
          reportData.testResultsDetails.forEach(valve => {
            if (currentY > doc.internal.pageSize.getHeight() - 100) {
              doc.addPage();
              currentY = pageMargin;
            }
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(`${valve.valveName} (${valve.valveId}) - Status: ${valve.currentStatus}`, pageMargin, currentY);
            currentY += 18;
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text(`Total Tests: ${valve.testCount} | Last Test: ${valve.lastTestDate || 'Not tested'}`, pageMargin, currentY);
            currentY += 15;
            
            if (valve.tests && valve.tests.length > 0) {
              const latestTest = valve.tests[valve.tests.length - 1];
              doc.text(`Latest Result: ${latestTest.result} | Test Pressure: ${latestTest.testPressure}`, pageMargin, currentY);
              currentY += 12;
              if (latestTest.mitigatingAction) {
                const actionLines = doc.splitTextToSize(`Action Required: ${latestTest.mitigatingAction}`, pageWidth - 20);
                doc.text(actionLines, pageMargin + 10, currentY);
                currentY += actionLines.length * 10 + 10;
              }
            }
            currentY += 10;
          });
        }

        // Recommendations
        if (reportData.recommendations && reportData.recommendations.length > 0) {
          if (currentY > doc.internal.pageSize.getHeight() - 150) {
            doc.addPage();
            currentY = pageMargin;
          }
          
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text("Recommendations", pageMargin, currentY);
          currentY += 20;
          
          reportData.recommendations.forEach(group => {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(group.type, pageMargin, currentY);
            currentY += 15;
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            const descLines = doc.splitTextToSize(group.description, pageWidth - 20);
            doc.text(descLines, pageMargin, currentY);
            currentY += descLines.length * 10 + 10;
            
            group.items.forEach(item => {
              if (currentY > doc.internal.pageSize.getHeight() - 50) {
                doc.addPage();
                currentY = pageMargin;
              }
              
              doc.setFont(undefined, 'bold');
              doc.text(`${item.priority}:`, pageMargin + 10, currentY);
              doc.setFont(undefined, 'normal');
              const itemLines = doc.splitTextToSize(item.description, pageWidth - 60);
              doc.text(itemLines, pageMargin + 60, currentY);
              currentY += Math.max(itemLines.length * 10, 12);
              
              if (item.timeframe) {
                doc.setFont(undefined, 'italic');
                doc.text(`Timeframe: ${item.timeframe}`, pageMargin + 20, currentY);
                currentY += 12;
                doc.setFont(undefined, 'normal');
              }
              currentY += 5;
            });
            currentY += 10;
          });
        }
      } else {
        doc.text("No comprehensive test data available for PDF export.", pageMargin, currentY);
      }
    } catch (error) {
      console.error('Error generating comprehensive PDF:', error);
      doc.text("Error generating comprehensive report data.", pageMargin, currentY);
    }
  } else if (reportType === "deviations") {
    // Keep existing deviations logic
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Deviations & Dispensations Summary", pageMargin, currentY);
    currentY += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (!lastReportData || lastReportData.length === 0) {
      doc.text("No deviations found for the selected filters.", pageMargin, currentY);
    } else {
      const filteredDeviations = filterDeviations();

      filteredDeviations.forEach((dev) => {
        if (currentY > doc.internal.pageSize.getHeight() - 130) { 
            doc.addPage();
            currentY = pageMargin;
        }
        
        let wellIdForTitle = dev.wellId || 'N/A';
        if ((!dev.wellId || dev.wellId === 'N/A') && dev.description) {
            const descLinesForWellId = (dev.description || "").split('\n');
            const wellLine = descLinesForWellId.find(line => line.toLowerCase().startsWith('well:'));
            if (wellLine) {
                wellIdForTitle = wellLine.split(':')[1]?.trim() || 'N/A';
            }
        }
        const titleWellMatch = (dev.title || "").match(/on Well\s*([^\s(]+)/i);
        if (titleWellMatch && titleWellMatch[1]) {
            wellIdForTitle = titleWellMatch[1];
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        let displayTitle = dev.title || 'Untitled Deviation';
        if (wellIdForTitle !== 'N/A' && !displayTitle.toLowerCase().includes(wellIdForTitle.toLowerCase())) {
             displayTitle = `${displayTitle} on Well ${wellIdForTitle}`;
        } else if (wellIdForTitle === 'N/A' && displayTitle.toLowerCase().includes("on well")) {
            displayTitle = displayTitle.replace(/on Well\s*[^\s(]+/i, 'on an Unspecified Well');
        }
        displayTitle = displayTitle.replace(/\(Well: N\/A\)/i, '').trim();
        if (wellIdForTitle !== 'N/A' && !displayTitle.toLowerCase().includes(`well ${wellIdForTitle.toLowerCase()}`)) {
             displayTitle += ` (Well: ${wellIdForTitle})`;
        }

        doc.text(`Deviation: ${displayTitle}`, pageMargin, currentY);
        currentY += 18;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        let detailsText = `Status: ${dev.status || 'N/A'}. Valid Until: ${dev.validUntil || 'N/A'}. Created: ${dev.createdAt ? new Date(dev.createdAt).toLocaleDateString() : 'N/A'}.`;
        doc.text(detailsText, pageMargin, currentY);
        currentY += 16;

        doc.setFont(undefined, 'bold');
        doc.text("Details of Deviation:", pageMargin, currentY);
        currentY += 14;
        doc.setFont(undefined, 'normal');

        const descriptionStr = dev.description || "";
        let narrative = [];
        const isValveFailureTest = dev.title && dev.title.toLowerCase().includes("valve") && dev.title.toLowerCase().includes("failed integrity test");

        if (isValveFailureTest) {
            const lines = descriptionStr.split('\n');
            const details = {};
            lines.forEach(line => {
                const parts = line.split(':');
                if (parts.length === 2) {
                    const key = parts[0].trim().toLowerCase().replace(/\s+/g, '');
                    details[key] = parts[1].trim();
                }
            });

            const valveId = details['valve'] || 'Unknown Valve';
            const wellIdDesc = details['well'] || wellIdForTitle; 
            const leakRate = details['leakrate'];
            const allowableRate = details['allowablerate'];
            const warnings = details['warnings'];
            let overallTestFailed = true;
            let failureReason = "";

            narrative.push(`An integrity test was performed on ${valveId} located on ${wellIdDesc}.`);
            
            if (leakRate && allowableRate) {
                const leakRateNum = parseFloat(leakRate);
                const allowableRateNum = parseFloat(allowableRate);
                if (!isNaN(leakRateNum) && !isNaN(allowableRateNum)) {
                    narrative.push(`The test recorded a leak rate of ${leakRateNum} scfm against an allowable rate of ${allowableRateNum} scfm.`);
                    if (leakRateNum > allowableRateNum) {
                        failureReason = `the recorded leak rate exceeded the allowable limit.`;
                    } else {
                        narrative.push(`The recorded leak rate was within the acceptable limits.`);
                        if (warnings) {
                            failureReason = `the test encountered issues: "${warnings}".`;
                        } else {
                           failureReason = `the test was marked as failed due to other unpecified integrity concerns.`;
                        }
                    }
                } else {
                    narrative.push(`Leak rate data (Measured: ${leakRate || 'N/A'}, Allowable: ${allowableRate || 'N/A'}) could not be fully numerically interpreted.`);
                    if (warnings) failureReason = `the test encountered issues: "${warnings}".`;
                    else failureReason = `the test was marked as failed due to data interpretation issues or other integrity concerns.`;
                }
            } else {
                 narrative.push(`Specific leak rate data was not fully detailed for direct comparison.`);
                 if (warnings) failureReason = `the test encountered issues: "${warnings}".`;
                 else failureReason = `the test was marked as failed due to incomplete data or other integrity concerns.`;
            }

            if (overallTestFailed) {
                if (failureReason) {
                    narrative.push(`The integrity test is considered FAILED because ${failureReason}`);
                } else if (warnings) {
                     narrative.push(`The integrity test is considered FAILED due to the following issues: "${warnings}".`);
                } else {
                    narrative.push(`The integrity test is considered FAILED based on the deviation title, though specific reasons beyond the title were not fully parsed from the description.`);
                }
            }

        } else {
            narrative.push("The following details were provided for this deviation:");
            const descLines = doc.splitTextToSize(descriptionStr || "No specific details provided.", pageWidth - 20);
            descLines.forEach(line => narrative.push(`  ${line}`));
        }
        
        narrative.forEach(sentence => {
            const sentenceLines = doc.splitTextToSize(sentence, pageWidth - 10);
            doc.text(sentenceLines, pageMargin + 5, currentY);
            currentY += sentenceLines.length * 10 + 4;
        });
        currentY += 10;

        if (dev.type === 'dispensation' && dev.dispensationDetails) { 
            doc.setFont(undefined, 'italic');
            doc.text("Dispensation Details:", pageMargin, currentY);
            currentY += 12;
            const dispDetailsText = `Dispensation requested by ${dev.dispensationDetails.requestedBy || 'N/A'} on ${dev.dispensationDetails.requestDate || 'N/A'}. Proposed controls: ${dev.dispensationDetails.controls || 'N/A'}. Valid until: ${dev.dispensationDetails.validUntil || 'N/A'}.`;
            const dispLines = doc.splitTextToSize(dispDetailsText, pageWidth - 20);
            doc.text(dispLines, pageMargin + 10, currentY);
            currentY += dispLines.length * 10 + 10;
            doc.setFont(undefined, 'normal');
        }
        currentY += 10;
      });
    }
  } else if (reportType === "wellStatus") {
    // Keep existing well status logic
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Well Status Summary", pageMargin, currentY);
    currentY += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (!lastReportData || lastReportData.length === 0) {
        doc.text("No wells found for the selected filters.", pageMargin, currentY);
    } else {
        const wells = filterWells(); 
        wells.forEach(well => {
            if (currentY > doc.internal.pageSize.getHeight() - 100) {
                doc.addPage();
                currentY = pageMargin;
            }
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(`Well: ${well.id} (Status: ${well.status || 'N/A'})`, pageMargin, currentY);
            currentY += 18;

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text(`Location: ${well.country || 'N/A'} > ${well.field || 'N/A'} > ${well.platform || 'N/A'}`, pageMargin, currentY);
            currentY += 14;
            doc.text(`Last Test: ${well.lastTest || 'N/A'}`, pageMargin, currentY);
            currentY += 14;

            if (well.rings && well.rings.length > 0 && (well.status === 'Red' || well.status === 'Orange')) {
                const problemRing = well.rings.find(r => r.status === well.status || r.status === 'Red' || r.status === 'Orange');
                if (problemRing) {
                    doc.setFont(undefined, 'bold');
                    doc.text(`Primary Concern (${problemRing.label}):`, pageMargin, currentY);
                    currentY += 12;
                    doc.setFont(undefined, 'normal');
                    const concernLines = doc.splitTextToSize(problemRing.message || "Details not specified.", pageWidth - 20);
                    doc.text(concernLines, pageMargin + 10, currentY);
                    currentY += concernLines.length * 10 + 10;
                }
            }
            currentY += 5; 
        });
    }
  } else if (lastReportData.length > 0) {
    // Keep existing table export logic
    doc.autoTable({
      head: [lastReportHeaders],
      body: lastReportData,
      startY: currentY,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: pageMargin, right: pageMargin },
    });
  } else {
    doc.text("No data available for this report with the current filters.", pageMargin, currentY);
  }

  doc.save('well-integrity-enhanced-report.pdf');
}

console.log('Enhanced Well Integrity Reports System loaded successfully');