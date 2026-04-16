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





function buildGroupedLatestReportData(filters) {
  const groupedMap = new Map();
  const testResults = window.valveTestResults || {};

  for (const [wellKey, valveResults] of Object.entries(testResults)) {
    const well = findWellByKey(wellKey);
    const wellId = String(well?.id || wellKey);
    const wellName = well?.name || wellKey;

    if (!matchesWellFilter(filters.well, wellKey, well)) continue;

    if (!groupedMap.has(wellId)) {
      groupedMap.set(wellId, {
        wellId,
        wellName,
        sithp: 'N/A',
        liquidYield: 'N/A',
        rowMap: new Map()
      });
    }

    const group = groupedMap.get(wellId);

    for (const [valveId, tests] of Object.entries(valveResults)) {
      const valveInfo = (window.allValves || []).find(v => sameWellValue(v.id, valveId));
      const valveType = valveInfo?.name || 'Unknown';

      if (filters.valveType && valveType !== filters.valveType) continue;

      const latestTest = getLatestTestOnly(tests);
      if (!latestTest || typeof latestTest !== 'object') continue;
      if (filters.testStatus && latestTest.status !== filters.testStatus) continue;

      if (group.sithp === 'N/A') {
        group.sithp = latestTest.sithp || latestTest.inputs?.Sithp || 'N/A';
      }
      if (group.liquidYield === 'N/A') {
        group.liquidYield = latestTest.liquid_yield || latestTest.inputs?.LiquidYield || 'N/A';
      }

      let comments = 'Test completed successfully';
      if (isFailedTest(latestTest)) {
        const reasons = determineFailureReasons(latestTest, valveType);
        comments = reasons.length ? reasons.join('; ') : 'Test failed - reason undetermined';
      }

      group.rowMap.set(String(valveId), {
        valveId: String(valveId),
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
  }

  const grouped = Array.from(groupedMap.values()).map(group => {
    const rows = Array.from(group.rowMap.values()).sort((a, b) =>
      String(a.valve).localeCompare(String(b.valve))
    );

    return {
      wellId: group.wellId,
      wellName: group.wellName,
      sithp: group.sithp,
      liquidYield: group.liquidYield,
      rows,
      totalValves: rows.length,
      passed: rows.filter(r => r.status === 'PASS').length,
      failed: rows.filter(r => r.status === 'FAIL').length
    };
  });

  grouped.sort((a, b) => String(a.wellName).localeCompare(String(b.wellName)));
  return grouped;
}




