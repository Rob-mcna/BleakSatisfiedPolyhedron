function renderReportsSection() {
  const reportsContainer = document.getElementById('reportsSection');
  if (!reportsContainer) return;

  const html = `
    <div class="reports-page">
      <div class="reports-hero">
        <div class="reports-hero-text">
          <div class="reports-kicker">REPORTING DASHBOARD</div>
          <h1>Well Integrity Test Reports</h1>
          <p>
            Generate professional technical reports, failure summaries, compliance reviews,
            and risk-based integrity analysis for your wells.
          </p>

          <div class="reports-hero-tags">
            <span>Failure analysis</span>
            <span>Compliance reporting</span>
            <span>Risk assessment</span>
            <span>Technical summaries</span>
          </div>
        </div>

        <div class="reports-hero-summary">
          <div class="summary-mini-card">
            <div class="summary-mini-label">Available Reports</div>
            <div class="summary-mini-value">6</div>
          </div>
          <div class="summary-mini-card">
            <div class="summary-mini-label">Export Formats</div>
            <div class="summary-mini-value">PDF / CSV</div>
          </div>
        </div>
      </div>

      <div class="reports-main-layout">
        <aside class="reports-control-panel">
          <div class="panel-card">
            <div class="panel-card-header">
              <h3>Report Setup</h3>
              <p>Select report type and filters</p>
            </div>

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
              <!-- Filters injected dynamically -->
            </div>

            <div class="report-actions">
              <button id="generateReportBtn" class="primary-btn" disabled>Generate Report</button>
              <button id="exportPdfBtn" class="secondary-btn" disabled>Export PDF</button>
              <button id="exportCsvBtn" class="secondary-btn" disabled>Export CSV</button>
              <button id="printReportBtn" class="secondary-btn" disabled>Print Report</button>
            </div>
          </div>
        </aside>

        <section class="reports-content-panel">
          <div id="reportOutputContainer" class="report-output">
            <div class="report-placeholder-card">
              <div class="placeholder-badge">READY</div>
              <h2>Ready to Generate Reports</h2>
              <p>
                Select a report type, apply filters, and generate a clean technical report
                for analysis, export, or printing.
              </p>

              <div class="placeholder-feature-grid">
                <div class="feature-box">
                  <strong>Failure Analysis</strong>
                  <span>Highlight critical test issues and root causes</span>
                </div>
                <div class="feature-box">
                  <strong>Statistical Summaries</strong>
                  <span>Generate technical summaries and pass/fail breakdowns</span>
                </div>
                <div class="feature-box">
                  <strong>Compliance Reporting</strong>
                  <span>Support integrity assurance and regulatory review</span>
                </div>
                <div class="feature-box">
                  <strong>Export & Print</strong>
                  <span>Create polished PDF and CSV deliverables</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  reportsContainer.innerHTML = html;
  setupReportEventHandlers();
}
