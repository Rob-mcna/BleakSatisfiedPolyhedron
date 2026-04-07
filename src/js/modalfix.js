function renderReportsSection() {
  const reportsContainer = document.getElementById('reportsSection');
  if (!reportsContainer) return;

  const html = `
    <div class="reports-header">
      <h2>Well Integrity Test Reports</h2>
      <p>Generate professional technical reports, failure summaries, compliance reviews, and risk-based integrity analysis for your wells.</p>
    </div>

    <div class="reports-layout">
      <div class="report-controls">
        <div class="report-type-selection">
          <label for="reportTypeSelect">Report type</label>
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
            <p>Select a report type and configure your filters to generate clean, professional well integrity reports.</p>
            <ul class="feature-list">
              <li>Detailed failure analysis</li>
              <li>Statistical summaries</li>
              <li>Compliance reporting</li>
              <li>Risk assessment insights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  reportsContainer.innerHTML = html;
  setupReportEventHandlers();
}




function renderReportsSection() {
  const reportsContainer = document.getElementById('reportsSection');
  if (!reportsContainer) return;

  const html = `
    <div class="reports-header">
      <h2>Well Integrity Test Reports</h2>
      <p>
        Generate professional technical reports, failure summaries, compliance reviews,
        and risk-based integrity analysis for your wells.
      </p>
    </div>

    <div class="reports-layout">
      <div class="report-controls">
        <div class="report-type-selection">
          <label for="reportTypeSelect">Report type</label>
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
            <p>
              Select a report type and configure your filters to generate clean,
              professional well integrity reports.
            </p>
            <ul class="feature-list">
              <li>Detailed failure analysis</li>
              <li>Statistical summaries</li>
              <li>Compliance reporting</li>
              <li>Risk assessment insights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  reportsContainer.innerHTML = html;
  setupReportEventHandlers();
}
