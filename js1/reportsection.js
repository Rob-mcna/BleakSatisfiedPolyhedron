// --- REPORTS SECTION (Fix for Report Type Change) ---

// renderReportsSection function remains the same as your last version
// (the one that includes the placeholder in #reportOutput)
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
      </div>
    </div>
    <div id="reportOutput" class="report-output-area">
      <div class="report-output-placeholder">
          <svg class="placeholder-icon" xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
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
}


let lastReportHeaders = [];
let lastReportData = [];

// MODIFIED setupReportFilters function
function setupReportFilters(explicitReportType) {
  const accordionContainer = document.getElementById('reportFiltersAccordionContainer');
  
  // Determine the report type to use for building filters.
  // 1. Use explicitly passed type (from onchange event)
  // 2. Else, try to get from DOM (if #reportTypeSelect already exists from a previous render)
  // 3. Else, default to "wellStatus" (for initial load)
  const reportTypeForLogic = explicitReportType !== undefined 
                             ? explicitReportType
                             : (document.getElementById('reportTypeSelect')?.value || "wellStatus");

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
          isReportTypeSelector: true, // Crucial flag
          options: [
            { value: "wellStatus", text: "Well Status" },
            { value: "deviations", text: "Deviations/Dispensations" },
            { value: "maasp", text: "MAASP Exceedances" },
            { value: "audit", text: "Deviation Audit Logs" },
            { value: "valveTestDetail", text: "Valve Test Outcomes" },
            { value: "custom", text: "Custom Chart/Report" }
          ]
        }
      ]
    },
    // Dynamic filter groups will be added below
  ];

  // Add dynamic filter groups based on reportTypeForLogic
  if (reportTypeForLogic === "wellStatus" || reportTypeForLogic === "maasp") {
    allFilterGroups.push({ /* Location Filters group */ 
      id: "locationFiltersGroup", title: "Location Filters", items: [
        { label: "Well:", type: "select", id: "filterWell", options: (window.wells || []).map(w => ({ value: w.id, text: w.id })) },
        { label: "Country:", type: "select", id: "filterCountry", options: Array.from(new Set((window.wells || []).map(w => w.country))).filter(Boolean).map(c => ({ value: c, text: c })) },
        { label: "Field:", type: "select", id: "filterField", options: Array.from(new Set((window.wells || []).map(w => w.field))).filter(Boolean).map(f => ({ value: f, text: f })) },
        { label: "Platform:", type: "select", id: "filterPlatform", options: Array.from(new Set((window.wells || []).map(w => w.platform))).filter(Boolean).map(p => ({ value: p, text: p })) }
      ]});
    allFilterGroups.push({ /* Status & Date group */
      id: "statusDateFiltersGroup", title: "Status & Date", items: [
        { label: "Status:", type: "select", id: "filterStatus", options: [{value:"Red", text:"Red"}, {value:"Orange", text:"Orange"}, {value:"Yellow", text:"Yellow"}, {value:"Green", text:"Green"}] },
        { label: "Date From:", type: "date", id: "filterDateFrom" },
        { label: "Date To:", type: "date", id: "filterDateTo" }
      ]});
  } else if (reportTypeForLogic === "deviations" || reportTypeForLogic === "audit") {
    allFilterGroups.push({ /* Deviation Filters group */
      id: "deviationFiltersGroup", title: "Deviation Filters", items: [
        { label: "Well:", type: "select", id: "filterDevWell", options: (window.wells || []).map(w => ({ value: w.id, text: w.id })) },
        { label: "Status:", type: "select", id: "filterDevStatus", options: [{value:"draft",text:"Draft"}, {value:"open",text:"Open"}, {value:"closed",text:"Closed"}, {value:"expired",text:"Expired"}, {value:"dispensation_requested",text:"Dispensation Requested"}] },
        { label: "Date From:", type: "date", id: "filterDevDateFrom" },
        { label: "Date To:", type: "date", id: "filterDevDateTo" }
      ]});
  } else if (reportTypeForLogic === "valveTestDetail") {
     allFilterGroups.push({ /* Valve Test Filters group */
      id: "valveTestFiltersGroup", title: "Valve Test Filters", items: [
        { label: "Well ID:", type: "text", id: "filterVtdWell", placeholder: "e.g., Well-1" },
        { label: "Valve ID:", type: "text", id: "filterVtdValve", placeholder: "e.g., HWV" }
      ]});
  }

  // Build HTML for accordion groups
  allFilterGroups.forEach(group => {
    const groupWrapper = document.createElement('div');
    groupWrapper.className = 'accordion-group';
    if (group.isOpen) { // Only "Report Type" group has isOpen: true initially
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
        // Ensure the 'selected' attribute is correctly set based on reportTypeForLogic
        contentHtml += `${(item.options || []).map(opt => 
            `<option value="${opt.value}" ${reportTypeForLogic === opt.value && item.isReportTypeSelector ? 'selected' : ''}>${opt.text}</option>`
        ).join('')}
                      </select>`;
      } else if (item.type === "date") {
        contentHtml += `<input type="date" id="${item.id}" name="${item.id}">`;
      } else if (item.type === "text") {
        contentHtml += `<input type="text" id="${item.id}" name="${item.id}" placeholder="${item.placeholder || ''}">`;
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
    
    // MODIFIED: Attach onchange handler for reportTypeSelect
    if (group.items.some(item => item.isReportTypeSelector)) {
        const reportTypeSelectElement = content.querySelector('#reportTypeSelect');
        if (reportTypeSelectElement) {
            // When this select changes, call setupReportFilters again,
            // PASSING the NEWLY SELECTED VALUE.
            reportTypeSelectElement.onchange = function() {
                setupReportFilters(this.value); 
            };
        }
    }
  });
}

// generateReport function remains the same
function generateReport() {
  const type = document.getElementById('reportTypeSelect')?.value; 
  if (!type) {
    // This case should ideally not happen if the select is always present and has a value
    console.error("Report type select element not found or has no value.");
    alert("Please select a report type.");
    return;
  }
  // ... rest of your generateReport logic
  let headers = [];
  let data = [];
  document.getElementById('customReportChart').innerHTML = ''; 

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
    headers = [
      "Well ID", "Valve ID",
      "Output Leak Rate (scfm)", "Allowable Leak Rate (scfm)", 
      "Test Valid?", "Leak Rate Pass?", "Overall API Result", "Warnings"
    ];
    data = [];
    const fWell = document.getElementById('filterVtdWell')?.value.toLowerCase() || '';
    const fValve = document.getElementById('filterVtdValve')?.value.toLowerCase() || '';

    for (const wellId in window.valveTestResults) {
      if (fWell && wellId.toLowerCase().indexOf(fWell) === -1) continue;
      const wellData = window.valveTestResults[wellId];
      for (const valveId in wellData) {
        if (fValve && valveId.toLowerCase().indexOf(fValve) === -1) continue;
        
        const result = wellData[valveId]; 
        if (!result) continue;

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
      }
    }
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
}


// filterWells, filterDeviations, renderDeviationBarChart, renderReportTable, 
// exportCurrentReportCSV, exportToCsv, exportCurrentReportPDF functions remain THE SAME.
// (Copied from your previous complete version for completeness here)
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

// Ensure this function is part of your reportsection.js file
// Ensure this function is part of your reportsection.js file

// Ensure this function is part of your reportsection.js file
// Ensure this function is part of your reportsection.js file

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

  // --- Report Header ---
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("Well Integrity Management Tool - Report", pageMargin, currentY);
  currentY += 25;

  // --- Report Metadata ---
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const reportTypeSelect = document.getElementById('reportTypeSelect');
  const selectedReportText = reportTypeSelect ? reportTypeSelect.selectedOptions[0].text : "N/A";
  doc.text(`Report Type: ${selectedReportText}`, pageMargin, currentY);
  currentY += 15;

  const generatedByUser = (window.currentUser && window.currentUser.username) ? window.currentUser.username : 'System';
  // Use the provided current UTC time
  const generationTime = new Date('2025-06-15T09:54:47Z'); 
  doc.text(`Generated by: ${generatedByUser} on ${generationTime.toLocaleString()}`, pageMargin, currentY);
  currentY += 25;

  const reportType = reportTypeSelect?.value;

  if (reportType === "deviations") {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Deviations & Dispensations Summary", pageMargin, currentY);
    currentY += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (!lastReportData || lastReportData.length === 0) {
      doc.text("No deviations found for the selected filters.", pageMargin, currentY);
    } else {
      const filteredDeviations = filterDeviations(); // Assuming this returns full objects

      filteredDeviations.forEach((dev) => {
        if (currentY > doc.internal.pageSize.getHeight() - 130) { 
            doc.addPage();
            currentY = pageMargin;
        }
        
        // --- Corrected Deviation Title ---
        // Try to get wellId from description if dev.wellId is missing or 'N/A' for the title
        let wellIdForTitle = dev.wellId || 'N/A';
        if ((!dev.wellId || dev.wellId === 'N/A') && dev.description) {
            const descLinesForWellId = (dev.description || "").split('\n');
            const wellLine = descLinesForWellId.find(line => line.toLowerCase().startsWith('well:'));
            if (wellLine) {
                wellIdForTitle = wellLine.split(':')[1]?.trim() || 'N/A';
            }
        }
        // If title itself contains "on Well XXX", use that.
        const titleWellMatch = (dev.title || "").match(/on Well\s*([^\s(]+)/i);
        if (titleWellMatch && titleWellMatch[1]) {
            wellIdForTitle = titleWellMatch[1];
        }


        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        // Construct a title that makes sense, ensuring wellId is present if possible
        let displayTitle = dev.title || 'Untitled Deviation';
        if (wellIdForTitle !== 'N/A' && !displayTitle.toLowerCase().includes(wellIdForTitle.toLowerCase())) {
             displayTitle = `${displayTitle} on Well ${wellIdForTitle}`;
        } else if (wellIdForTitle === 'N/A' && displayTitle.toLowerCase().includes("on well")) {
            // If title mentions "on well" but we have no ID, remove that part or make it generic
            displayTitle = displayTitle.replace(/on Well\s*[^\s(]+/i, 'on an Unspecified Well');
        }
        // Remove the (Well: N/A) if we have a better wellId or if it's already in the title
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
            // Use wellIdForTitle which we determined earlier for consistency
            const wellIdDesc = details['well'] || wellIdForTitle; 
            const leakRate = details['leakrate'];
            const allowableRate = details['allowablerate'];
            const warnings = details['warnings'];
            let overallTestFailed = true; // Assume failure if title indicates it
            let failureReason = "";

            narrative.push(`An integrity test was performed on ${valveId} located on ${wellIdDesc}.`);
            
            if (leakRate && allowableRate) {
                const leakRateNum = parseFloat(leakRate);
                const allowableRateNum = parseFloat(allowableRate);
                if (!isNaN(leakRateNum) && !isNaN(allowableRateNum)) {
                    narrative.push(`The test recorded a leak rate of ${leakRateNum} scfm against an allowable rate of ${allowableRateNum} scfm.`);
                    if (leakRateNum > allowableRateNum) {
                        failureReason = `the recorded leak rate exceeded the allowable limit.`;
                        // overallTestFailed is already true
                    } else {
                        narrative.push(`The recorded leak rate was within the acceptable limits.`);
                        // If leak rate is fine, the failure must be due to other reasons (e.g., warnings)
                        if (warnings) {
                            failureReason = `the test encountered issues: "${warnings}".`;
                        } else {
                           // This case is tricky: title says failed, leak rate ok, no warnings.
                           // We'll stick to the title indicating failure.
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
                } else if (warnings) { // Fallback if failureReason wasn't set but warnings exist
                     narrative.push(`The integrity test is considered FAILED due to the following issues: "${warnings}".`);
                } else {
                    narrative.push(`The integrity test is considered FAILED based on the deviation title, though specific reasons beyond the title were not fully parsed from the description.`);
                }
            }
            // This replaces the previous simple warnings line
            // if (warnings && !failureReason.includes(warnings)) { // Add warnings if not already part of failure reason
            //     narrative.push(`Additional notes or warnings from the test: "${warnings}".`);
            // }

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
    // ... (Well Status logic - ensure it's the version from reportsection_detailed_pdf.js or similar) ...
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

  doc.save('wimt-refined-report.pdf');
}