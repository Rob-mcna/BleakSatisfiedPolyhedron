dont be dumb

// =================== Safety System Dashboard Implementation ===================

// Function to determine the safety system status for a well
// This looks specifically at SCSSV, HMV, and HWV valves
function getSafetySystemStatus(well) {
  // Get test results for this well
  const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
  
  // If no test results, return null (can't determine status)
  if (Object.keys(testResults).length === 0) {
    return { status: 'unknown', failedValves: [] };
  }
  
  // Track failed critical valves
  const failedCriticalValves = [];
  
  // Get well valves
  const wellValves = (well.christmasTree && well.christmasTree.valves) || [];
  
  // Check each valve
  wellValves.forEach(valve => {
    // Convert valve type to standardized name for comparison
    const valveType = valve.type ? valve.type.toUpperCase() : '';
    
    // Only consider SCSSV, HMV, and HWV valves
    if (['SCSSV', 'HMV', 'HWV'].includes(valveType)) {
      const valveId = valve.id;
      const valveTests = testResults[valveId];
      
      // Check if this valve has test results
      if (Array.isArray(valveTests) && valveTests.length > 0) {
        // Get latest test
        const latestTest = valveTests[valveTests.length - 1];
        
        // Check if test failed
        if (latestTest && typeof latestTest === 'object') {
          const testPassed = latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass;
          if (!testPassed) {
            // This critical valve failed
            failedCriticalValves.push({
              id: valveId,
              type: valveType,
              name: valve.name || valveType
            });
          }
        }
      }
    }
  });
  
  // Determine status based on number of failed critical valves
  let status = 'healthy';
  let color = 'green';
  
  switch (failedCriticalValves.length) {
    case 1:
      status = 'degraded';
      color = 'yellow';
      break;
    case 2:
      status = 'impaired';
      color = 'orange';
      break;
    case 3:
      status = 'critical';
      color = 'red';
      break;
  }
  
  return {
    status,
    color,
    failCount: failedCriticalValves.length,
    failedValves: failedCriticalValves
  };
}

// Function to get wells filtered for safety system status
function getWellsBySafetySystemStatus() {
  // First ensure we have deduplicated wells
  const allWells = deduplicateWellsById(wells);
  
  // Group wells by their safety status
  const result = {
    all: [],      // All wells with test data
    critical: [], // 3 failed critical valves
    impaired: [], // 2 failed critical valves
    degraded: [], // 1 failed critical valve
    healthy: [],  // 0 failed critical valves
    noData: []    // No test data
  };
  
  allWells.forEach(well => {
    const safetyStatus = getSafetySystemStatus(well);
    
    // First, add to the all wells category if we have any data
    if (safetyStatus.status !== 'unknown') {
      result.all.push(well);
      
      // Then add to the specific category
      result[safetyStatus.status].push(well);
    } else {
      result.noData.push(well);
    }
  });
  
  return result;
}

// Modified function to create and insert the filter dropdown
function createDashboardFilterDropdown() {
  // Find the dashboard container
  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (!dashboardContainer) {
    console.error("Dashboard container not found");
    return;
  }

  // Check if dropdown already exists
  let existingDropdown = document.getElementById('dashboardFilterContainer');
  if (existingDropdown) {
    existingDropdown.remove();
  }

  // Create dropdown container
  const dropdownContainer = document.createElement('div');
  dropdownContainer.id = 'dashboardFilterContainer';
  dropdownContainer.style.cssText = `
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(0,0,0,0.1);
    border-radius: 4px;
  `;

  // Create label
  const label = document.createElement('label');
  label.textContent = 'Show Wells:';
  label.style.cssText = `
    font-weight: bold;
    color: #333;
    font-size: 14px;
  `;

  // Create dropdown select
  const select = document.createElement('select');
  select.id = 'dashboardFilter';
  select.style.cssText = `
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    cursor: pointer;
  `;

// Updated options to include safety system
  const options = [
    { value: 'safety-system', text: 'Safety System Status' },
    { value: 'with-failures', text: 'With Failures Only' },
    { value: 'no-failures', text: 'No Failures (Passed Tests)' },
    { value: 'all', text: 'All Wells' }
   
  ];

  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    select.appendChild(optionElement);
  });

select.value = 'safety-system';

select.addEventListener('change', function() {
  const selectedFilter = this.value;
  console.log(`Dashboard filter changed to: ${selectedFilter}`);
  
  if (selectedFilter === 'safety-system') {
    renderSafetySystemDashboard();
    updateSafetySystemKPIs();
    updateSafetySystemStats();
  } else {
    // Use existing filter functions for other options
    if (window.renderFilteredDashboard) {
      window.renderFilteredDashboard(selectedFilter);
    }
    if (window.updateFilteredKPIs) {
      window.updateFilteredKPIs(selectedFilter);
    }
    if (window.updateFilterStats) {
      window.updateFilterStats(selectedFilter);
    }
  }
});

  // Create stats display
  const statsContainer = document.createElement('div');
  statsContainer.id = 'filterStats';
  statsContainer.style.cssText = `
    margin-left: auto;
    font-size: 12px;
    color: #666;
    background: rgba(255,255,255,0.7);
    padding: 6px 10px;
    border-radius: 3px;
  `;

  // Assemble dropdown
  dropdownContainer.appendChild(label);
  dropdownContainer.appendChild(select);
  dropdownContainer.appendChild(statsContainer);

  // Insert before dashboard
  dashboardContainer.parentNode.insertBefore(dropdownContainer, dashboardContainer);

  // Initial stats update
  updateFilterStats('safety-system');
}

// Function to update the stats display with safety system info
function updateFilterStats(filterOption) {
  const statsContainer = document.getElementById('filterStats');
  if (!statsContainer) return;

  const allWells = deduplicateWellsById(wells);
  
  // Basic stats
  const withFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'with-failures').length;
  const noFailures = allWells.filter(well => categorizeWellByTestResults(well) === 'no-failures').length;
  const allWithData = withFailures + noFailures;
  const noData = allWells.filter(well => categorizeWellByTestResults(well) === 'no-data').length;

  // Safety system stats
  const safetyWells = getWellsBySafetySystemStatus();
  
  let currentCount;
  let statsHTML;
  
  switch (filterOption) {
    case 'safety-system':
      currentCount = safetyWells.all.length;
      statsHTML = `
        Showing: ${currentCount} wells<br>
        <small>
          <span style="color:#e64a3a">Critical: ${safetyWells.critical.length}</span> | 
          <span style="color:#ff9800">Impaired: ${safetyWells.impaired.length}</span> | 
          <span style="color:#e6c23a">Degraded: ${safetyWells.degraded.length}</span> | 
          <span style="color:#19d219">Healthy: ${safetyWells.healthy.length}</span>
        </small>
      `;
      break;
      
    case 'with-failures':
      currentCount = withFailures;
      statsHTML = `
        Showing: ${currentCount} wells<br>
        <small>Failed: ${withFailures} | Passed: ${noFailures} | No Data: ${noData}</small>
      `;
      break;
      
    case 'no-failures':
      currentCount = noFailures;
      statsHTML = `
        Showing: ${currentCount} wells<br>
        <small>Failed: ${withFailures} | Passed: ${noFailures} | No Data: ${noData}</small>
      `;
      break;
      
    case 'all':
      currentCount = allWells.length;
      statsHTML = `
        Showing: ${currentCount} wells<br>
        <small>Failed: ${withFailures} | Passed: ${noFailures} | No Data: ${noData}</small>
      `;
      break;
      
    default:
      currentCount = withFailures;
      statsHTML = `
        Showing: ${currentCount} wells<br>
        <small>Failed: ${withFailures} | Passed: ${noFailures} | No Data: ${noData}</small>
      `;
  }

  statsContainer.innerHTML = statsHTML;
}

// Modified function to get wells based on selected filter option
function getWellsByFilterOption(filterOption) {
  // First ensure we have deduplicated wells
  const allWells = deduplicateWellsById(wells);
  
  switch (filterOption) {
    case 'safety-system':
      // Return all wells with test data, but they will be rendered 
      // with safety system status rings
      return getWellsBySafetySystemStatus().all;
      
    case 'with-failures':
      return allWells.filter(well => {
        const category = categorizeWellByTestResults(well);
        return category === 'with-failures';
      });
      
    case 'no-failures':
      return allWells.filter(well => {
        const category = categorizeWellByTestResults(well);
        return category === 'no-failures';
      });
      
    case 'all':
      return allWells;
      
    default:
      // Default to safety system view
      return getWellsBySafetySystemStatus().all;
  }
}

// Modified function to render filtered dashboard with safety system support
function renderFilteredDashboard(filterOption = 'safety-system') {
  const container = document.getElementById('wellMultiRingBoard');
  if (!container) {
    console.error("Dashboard container 'wellMultiRingBoard' not found.");
    return;
  }

  // Get wells based on filter and ensure they're properly deduplicated
  const filteredWells = getWellsByFilterOption(filterOption);
  
  // Empty the container first to prevent duplication
  container.innerHTML = '';
  
  if (filteredWells.length === 0) {
    let message;
    switch (filterOption) {
      case 'safety-system':
        message = "No wells with safety valve test data found.";
        break;
      case 'no-failures':
        message = "No wells with passed tests found.";
        break;
      case 'all-with-data':
        message = "No wells with test data found.";
        break;
      default:
        message = "No wells with failed tests found.";
    }
    container.innerHTML = `<p style='color:#ccc; text-align:center;'>${message}</p>`;
    return;
  }

  // Track rendered wells to prevent duplicates within this function
  const renderedWells = new Set();

  filteredWells.forEach(well => {
    // Skip invalid wells or already rendered ones
    if (!well || typeof well.name === 'undefined') return;
    if (renderedWells.has(well.name)) return;
    
    renderedWells.add(well.name);

    // Different rendering based on filter type
    let displayRings;
    
    if (filterOption === 'safety-system') {
      // Safety system mode - create rings based on critical valve status
      const safetyStatus = getSafetySystemStatus(well);
      
      if (safetyStatus.status === 'unknown') {
        // No data for this well's critical valves
        displayRings = [{
          label: 'No Data',
          color: 'gray',
          message: 'No test data available for safety valves',
          failureCode: null
        }];
      } else if (safetyStatus.failCount === 0) {
        // All safety valves passed
        displayRings = [{
          label: 'Safety System Healthy',
          color: 'green',
          message: 'All safety valves passed tests',
          failureCode: 0
        }];
      } else {
        // Create single ring showing safety system status
        const failedValveNames = safetyStatus.failedValves
          .map(v => window.valveConversions[v.type] || v.name || v.type)
          .join(", ");
        
        displayRings = [{
          label: `Safety System ${safetyStatus.status.toUpperCase()}`,
          color: safetyStatus.color,
          message: `${safetyStatus.failCount} failed safety valve${safetyStatus.failCount > 1 ? 's' : ''}: ${failedValveNames}`,
          failureCode: safetyStatus.failCount > 0 ? 9 : 0, // Use 9 to indicate critical failure
          trafficLight: safetyStatus.color
        }];
      }
    } else {
      // Normal modes - use existing ring generation logic
      displayRings = getLiveStatusForAllRingsWithEscalation(well);
      
      // For wells with no failures, create a single green ring
      if (filterOption === 'no-failures' && displayRings.length === 0) {
        displayRings = [{
          label: 'All Tests Passed',
          color: 'green',
          message: 'All valve tests passed successfully',
          failureCode: 0
        }];
      } else if (filterOption === 'all' && displayRings.length === 0) {
        displayRings = [{
          label: 'Tests Passed',
          color: 'green', 
          message: 'All valve tests passed successfully',
          failureCode: 0
        }];
      }
    }

    // Render the well with its rings
    const totalRings = displayRings.length;
    const maxRadius = 44;
    const minRadius = 9;
    const strokeWidth = 2;

    let effectiveSpacing;
    if (totalRings <= 1) {
      effectiveSpacing = 0;
    } else {
      const availableRadiusForCenters = maxRadius - minRadius - strokeWidth;
      effectiveSpacing = availableRadiusForCenters / Math.max(1, totalRings - 1);
    }

    const dynamicRadii = displayRings.map((_, idx) => maxRadius - strokeWidth / 2 - (idx * effectiveSpacing));
    const validRadii = dynamicRadii.filter(r => r > strokeWidth / 2);

    const ringsHtml = validRadii.map((radius, idx) => {
      const originalRingIndex = dynamicRadii.indexOf(radius);
      if (originalRingIndex !== -1 && displayRings[originalRingIndex]) {
        return `<circle cx="45" cy="45" r="${radius}" stroke="${colorMap(displayRings[originalRingIndex].color)}" stroke-width="${strokeWidth}" fill="none" />`;
      }
      return '';
    }).join('');

    const centerCircleRadius = Math.max(minRadius, (validRadii.length > 0 ? validRadii[validRadii.length - 1] - strokeWidth / 2 : minRadius));
    const centerFill = '#ec5642ff'; // Always use your blue
    const svg = `<svg width="90" height="90" style="display:block">
      ${ringsHtml}
      <circle cx="45" cy="45" r="${centerCircleRadius}" fill="${centerFill}" />
    </svg>`;
        
    const div = document.createElement('div');
    div.className = "well-multiring";
    div.dataset.wellName = well.name; // Add well name as data attribute for debugging
    div.innerHTML = svg + `<div class="well-label">${well.name}</div>`;

    div.onmousemove = (e) => {
      // Store well context globally for tooltip system
      window.currentDashboardWell = well;
      handleWellHover(e, well, div, displayRings.slice(0, validRadii.length));
    };
    div.onmouseleave = hideTooltip;

    div.onclick = () => {
      if (typeof showSection === "function") {
        showSection('wells');
        setTimeout(() => {
          const wellDropdown = document.getElementById('wellDropdown');
          if (wellDropdown) {
            wellDropdown.value = well.name;
            wellDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, 100);
      }
    };
    
    container.appendChild(div);
    
    // Add indicators if those functions exist
    if (typeof addEscalationIndicatorToWell === "function") {
      addEscalationIndicatorToWell(div, well.name);
    }
    if (typeof addDeviationIndicatorToWell === "function") {
      addDeviationIndicatorToWell(div, well.name);
    }
  });

  console.log(`Dashboard: Rendered ${renderedWells.size} unique wells with filter: ${filterOption}`);
  
  // Add safety system legend if in safety system mode
  if (filterOption === 'safety-system') {
    addSafetySystemLegend();
  } else {
    removeSafetySystemLegend();
  }
}

// Function to add safety system legend
function addSafetySystemLegend() {
  // Remove existing legend first
  removeSafetySystemLegend();
  
  // Create legend container
  const legend = document.createElement('div');
  legend.id = 'safetySystemLegend';
  legend.style.cssText = `
    margin: 0 0 20px;
    padding: 10px 15px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    color: #333;
  `;
  
  legend.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">Safety System Status:</div>
    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
      <div>
        <span style="display: inline-block; width: 12px; height: 12px; background-color: #e64a3a; border-radius: 50%; margin-right: 5px;"></span>
        <b>Critical:</b> All 3 safety valves failed
      </div>
      <div>
        <span style="display: inline-block; width: 12px; height: 12px; background-color: #ff9800; border-radius: 50%; margin-right: 5px;"></span>
        <b>Impaired:</b> 2 safety valves failed
      </div>
      <div>
        <span style="display: inline-block; width: 12px; height: 12px; background-color: #e6c23a; border-radius: 50%; margin-right: 5px;"></span>
        <b>Degraded:</b> 1 safety valve failed
      </div>
      <div>
        <span style="display: inline-block; width: 12px; height: 12px; background-color: #19d219; border-radius: 50%; margin-right: 5px;"></span>
        <b>Healthy:</b> All safety valves passed
      </div>
    </div>
    <div style="margin-top: 8px; font-size: 12px; color: #666;">
      Safety valves monitored: SCSSV, HMV, HWV
    </div>
  `;
  
  // Add legend to page
  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (dashboardContainer) {
    dashboardContainer.parentNode.insertBefore(legend, dashboardContainer);
  }
}

// Function to remove safety system legend
function removeSafetySystemLegend() {
  const existingLegend = document.getElementById('safetySystemLegend');
  if (existingLegend) {
    existingLegend.remove();
  }
}

// Update tooltips to include safety system information
function showSafetySystemTooltip(e, well, div) {
  const safetyStatus = getSafetySystemStatus(well);
  
  let tooltipText;
  let tooltipColor;
  
  if (safetyStatus.status === 'unknown') {
    tooltipText = `<b>${well.name}</b><br>No safety valve test data available`;
    tooltipColor = '#999';
  } else if (safetyStatus.failCount === 0) {
    tooltipText = `<b>${well.name}</b><br>All safety valves passed tests`;
    tooltipColor = '#19d219';
  } else {
    const failedValves = safetyStatus.failedValves
      .map(v => window.valveConversions[v.type] || v.name || v.type)
      .join("<br>• ");
    
    tooltipText = `
      <b>${well.name}</b><br>
      <span style="color:${getColorForStatus(safetyStatus.status)}">
        <b>Safety System: ${safetyStatus.status.toUpperCase()}</b>
      </span><br>
      Failed safety valves:<br>
      • ${failedValves}
    `;
    tooltipColor = getColorForStatus(safetyStatus.status);
  }
  
  showTooltipBox(e.clientX, e.clientY, tooltipText);
  
  // Helper function to get color for status
  function getColorForStatus(status) {
    const colors = {
      'critical': '#e64a3a',
      'impaired': '#ff9800',
      'degraded': '#e6c23a',
      'healthy': '#19d219'
    };
    return colors[status] || '#999';
  }
}

// Add function to update KPIs for safety system
function updateSafetySystemKPIs() {
  const safetyWells = getWellsBySafetySystemStatus();
  
  if (document.getElementById('kpiWells')) {
    document.getElementById('kpiWells').textContent = safetyWells.all.length;
  }

  if (document.getElementById('kpiRed')) {
    document.getElementById('kpiRed').textContent = safetyWells.critical.length;
  }
  
  if (document.getElementById('kpiOrange')) {
    document.getElementById('kpiOrange').textContent = safetyWells.impaired.length;
  }
  
  if (document.getElementById('kpiYellow')) {
    document.getElementById('kpiYellow').textContent = safetyWells.degraded.length;
  }

  if (document.getElementById('kpiRepairs')) {
    // Repairs needed for critical + impaired
    document.getElementById('kpiRepairs').textContent = 
      safetyWells.critical.length + safetyWells.impaired.length;
  }
}

// Modified function to update KPIs based on filtered wells
function updateFilteredKPIs(filterOption) {
  if (filterOption === 'safety-system') {
    updateSafetySystemKPIs();
    return;
  }

  // Use existing KPI logic for other filter options
  const filteredWells = getWellsByFilterOption(filterOption);
  
  if (document.getElementById('kpiWells')) {
    document.getElementById('kpiWells').textContent = filteredWells.length;
  }

  let redRings = 0, orangeRings = 0, yellowRings = 0, wellsWithRedRing = 0;

  filteredWells.forEach(well => {
    const category = categorizeWellByTestResults(well);
    
    if (category === 'with-failures') {
      const ringsStatus = getLiveStatusForAllRingsWithEscalation(well);
      let hasRedRing = false;
      ringsStatus.forEach(ring => {
        if (ring.color === 'red') { redRings++; hasRedRing = true; }
        if (ring.color === 'orange') orangeRings++;
        if (ring.color === 'yellow') yellowRings++;
      });
      if (hasRedRing) wellsWithRedRing++;
    }
  });

  if (document.getElementById('kpiRed')) document.getElementById('kpiRed').textContent = redRings;
  if (document.getElementById('kpiOrange')) document.getElementById('kpiOrange').textContent = orangeRings;
  if (document.getElementById('kpiYellow')) document.getElementById('kpiYellow').textContent = yellowRings;

  if (document.getElementById('kpiRepairs')) {
    document.getElementById('kpiRepairs').textContent = wellsWithRedRing;
  }

  if (document.getElementById('kpiDeviations')) {
    document.getElementById('kpiDeviations').textContent = countActiveDeviationsFromRecords();
  }
}

// Add this to window exports
window.getSafetySystemStatus = getSafetySystemStatus;
window.getWellsBySafetySystemStatus = getWellsBySafetySystemStatus;


you were supposed to fix this code






// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// MAIN RENDER FUNCTIONS
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// ... (keep all the code from the top of the file as is) ...

// The renderWellsSection function is now simpler. It just renders the UI.
// Update the renderWellsSection function to better handle auto-selection

window.currentUser = { login: 'Rob-mcna', role: 'admin' };
function renderWellsSection() {
  const wellListDiv = document.getElementById('wellList');
  if (!wellListDiv) return;

  // Clear previous contents
  wellListDiv.innerHTML = '';

  // Build the dropdown HTML
  let html = '';
  if (window.currentUser && window.currentUser.role === 'admin') {
    html += `<button id="createWellBtn" class="primary-btn" style="margin-bottom: 18px;">Create Well</button>
            <button id="createChristmassTreeBtn" class="primary-btn" style="margin-bottom: 18px;">Create Christmass Tree</button>
            <button id="registerValveBtn" class="primary-btn" style="margin-bottom: 18px;">Register Valve</button> 
            <button id="registerRuleModalBtn" class="primary-btn" style="margin-bottom: 18px;">RegisterRuleModal</button> `;
            
            
  }


  // ... (button creation logic remains the same) ...

// In renderWellsSection()

  // ... (button creation logic remains the same) ...

// Inside your renderWellsSection() function...

  html += `<label for="wellDropdown" style="font-weight:bold;">Select Well:</label>
  <select id="wellDropdown" style="margin:0 12px 24px 8px;">
    <option value="" selected disabled>-- Select Well --</option>
    ${(window.wells || [])
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
      .map(w => `<option value="${w.id}">${w.name || w.id}</option>`).join('')}
  </select>

  <!-- CORRECTED AND FINAL LAYOUT -->
  <div class="well-layout" id="wellInlineLayout" style="display:none;">
    
    <div class="well-schematic-and-results-wrapper">
      <div id="wellSchematicArea"></div>
      <div id="valveTestResultsPanel"></div>
    </div>
    
    <!-- This container will now control visibility via CSS classes -->
    <div class="panel-container">
      <div id="valveInputPanel"></div>
      <div id="valveFailureDetailsPanel"></div>
    </div>

  </div>
  <div id="wellDetailsContainer" style="margin-top:18px;"></div>`;

  wellListDiv.innerHTML = html;