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

  // No separate well summary table on screen anymore
  groupedReportData.forEach(group => {
    html += `
      <details class="report-table-section" style="margin-top:20px; border:1px solid #ddd; border-radius:8px; background:#fff;" open>
        <summary style="cursor:pointer; padding:14px 16px; font-weight:bold; font-size:16px; background:#f8f9fa; border-radius:8px;">
          ${group.wellName}
          <span style="margin-left:12px; font-weight:normal; font-size:13px; color:#555;">
            | Valves Tested: ${group.totalValves}
            | Passed: ${group.passed}
            | Failed: ${group.failed}
            | SITHP: ${group.sithp}
            | Liquid Yield: ${group.liquidYield}
          </span>
        </summary>

        <div style="padding:14px 16px;">
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
      </details>
    `;
  });

  html += generateRecommendationsSection(reportType, summary);
  outputContainer.innerHTML = html;
}







