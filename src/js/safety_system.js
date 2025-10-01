// =================== Safety System Dashboard Extension ===================
// This file extends the existing dashboard with a new safety system filter
// that specifically tracks SCSSV, HMV, and HWV valve failures

// Safety valve types we're monitoring
const SAFETY_VALVE_TYPES = ['SCSSV', 'HMV', 'HWV'];

// Safety system color mapping based on number of failed safety valves
const SAFETY_COLORS = {
  0: 'green',   // All safety valves passed
  1: 'yellow',  // One safety valve failed
  2: 'orange',  // Two safety valves failed
  3: 'red'      // All three safety valves failed
};

// Function to identify safety valves from a well's valve list
function identifySafetyValves(well) {
  if (!well.christmasTree || !Array.isArray(well.christmasTree.valves)) {
    return [];
  }

  const safetyValves = [];
  
  well.christmasTree.valves.forEach(valve => {
    const valveId = valve.id || '';
    const valveName = valve.name || '';
    
    // Check if valve ID or name contains any of our safety valve types
    SAFETY_VALVE_TYPES.forEach(safetyType => {
      if (valveId.includes(safetyType) || valveName.includes(safetyType)) {
        safetyValves.push({
          ...valve,
          safetyType: safetyType
        });
      }
    });
  });

  return safetyValves;
}

// Function to evaluate safety system status for a well
function evaluateWellSafetySystem(well) {
  const testResults = (window.valveTestResults && window.valveTestResults[well.name]) || {};
  const safetyValves = identifySafetyValves(well);
  
  if (safetyValves.length === 0) {
    return {
      hasData: false,
      failedCount: 0,
      totalCount: 0,
      color: 'green',
      details: [],
      status: 'no-safety-valves'
    };
  }

  let failedSafetyValves = 0;
  let totalSafetyValves = 0;
  const failureDetails = [];

  safetyValves.forEach(valve => {
    const valveId = valve.id;
    const valveTests = testResults[valveId];
    
    if (Array.isArray(valveTests) && valveTests.length > 0) {
      totalSafetyValves++;
      const latestTest = valveTests[valveTests.length - 1];
      
      if (latestTest && typeof latestTest === 'object') {
        const testPassed = latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass;
        
        if (!testPassed) {
          failedSafetyValves++;
          failureDetails.push({
            valveId: valveId,
            valveName: valve.name || valveId,
            safetyType: valve.safetyType,
            failureReasons: latestTest.failure_reasons || ['Test Failed'],
            testResult: latestTest
          });
        }
      }
    }
  });

  // Determine color based on number of failed safety valves (max 3)
  const cappedFailures = Math.min(failedSafetyValves, 3);
  const color = SAFETY_COLORS[cappedFailures];

  return {
    hasData: totalSafetyValves > 0,
    failedCount: failedSafetyValves,
    totalCount: totalSafetyValves,
    color: color,
    details: failureDetails,
    status: failedSafetyValves > 0 ? 'has-failures' : 'all-passed'
  };
}

// Function to categorize wells by safety system status
function categorizeWellBySafetySystem(well) {
  const safetyStatus = evaluateWellSafetySystem(well);
  
  if (!safetyStatus.hasData) {
    return 'no-safety-data';
  }
  
  if (safetyStatus.failedCount > 0) {
    return 'safety-failures';
  }
  
  return 'safety-passed';
}

// Function to get wells filtered by safety system status
function getWellsBySafetyFilter(filterOption) {
  const allWells = window.deduplicateWellsById ? window.deduplicateWellsById(window.wells || []) : (window.wells || []);
  
  switch (filterOption) {
    case 'safety-system':
      return allWells.filter(well => {
        const category = categorizeWellBySafetySystem(well);
        return category === 'safety-failures' || category === 'safety-passed';
      });
    default:
      return allWells;
  }
}

// Function to generate safety system ring data for a well
function getSafetySystemRingData(well) {
  const safetyStatus = evaluateWellSafetySystem(well);
  
  if (!safetyStatus.hasData) {
    return [];
  }

  const ringData = [{
    label: `Safety System (${safetyStatus.failedCount}/${safetyStatus.totalCount} failed)`,
    color: safetyStatus.color,
    message: generateSafetyMessage(safetyStatus),
    failureCode: null, // Safety system doesn't use matrix codes
    safetySystem: true,
    safetyDetails: safetyStatus
  }];

  return ringData;
}

// Function to generate safety system message
function generateSafetyMessage(safetyStatus) {
  if (safetyStatus.failedCount === 0) {
    return `All ${safetyStatus.totalCount} safety valves passed tests`;
  }
  
  const failedTypes = safetyStatus.details.map(detail => detail.safetyType);
  const uniqueFailedTypes = [...new Set(failedTypes)];
  
  if (safetyStatus.failedCount === 1) {
    return `1 safety valve failed: ${uniqueFailedTypes.join(', ')}`;
  } else {
    return `${safetyStatus.failedCount} safety valves failed: ${uniqueFailedTypes.join(', ')}`;
  }
}

// Modified version of the filter dropdown creation to include safety system option
function createSafetySystemFilterDropdown() {
  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (!dashboardContainer) {
    console.error("Dashboard container not found");
    return;
  }

  let existingDropdown = document.getElementById('dashboardFilterContainer');
  if (existingDropdown) {
    existingDropdown.remove();
  }

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

  const label = document.createElement('label');
  label.textContent = 'Show Wells:';
  label.style.cssText = `
    font-weight: bold;
    color: #333;
    font-size: 14px;
  `;

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
// ...after options are added:

// Delay to ensure everything is ready (if needed)
setTimeout(() => {
  select.dispatchEvent(new Event('change', { bubbles: true }));
}, 0);
select.addEventListener('change', function() {
  const selectedFilter = this.value;
  console.log(`Dashboard filter changed to: ${selectedFilter}`);
  
  if (selectedFilter === 'safety-system') {
    addSafetySystemLegend(); // <--- add this line
    renderSafetySystemDashboard();
    updateSafetySystemKPIs();
    updateSafetySystemStats();
  } else {
    removeSafetySystemLegend(); // <--- and this line
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

  dropdownContainer.appendChild(label);
  dropdownContainer.appendChild(select);
  dropdownContainer.appendChild(statsContainer);

  dashboardContainer.parentNode.insertBefore(dropdownContainer, dashboardContainer);

  updateSafetySystemStats();
}

// Function to render safety system dashboard
function renderSafetySystemDashboard() {
  const container = document.getElementById('wellMultiRingBoard');
  if (!container) {
    console.error("Dashboard container not found.");
    return;
  }

  const filteredWells = getWellsBySafetyFilter('safety-system');
  container.innerHTML = '';

  if (filteredWells.length === 0) {
    container.innerHTML = `<p style='color:#ccc; text-align:center;'>No wells with safety system data found.</p>`;
    return;
  }

  const renderedWells = new Set();

  filteredWells.forEach(well => {
    if (!well || typeof well.name === 'undefined') return;
    if (renderedWells.has(well.name)) return;
    
    renderedWells.add(well.name);

    const safetyRingData = getSafetySystemRingData(well);
    
    if (safetyRingData.length === 0) return; // Skip wells without safety system data

    const totalRings = safetyRingData.length;
    const maxRadius = 44;
    const minRadius = 9;
    const strokeWidth = 2;

    // For safety system, we typically have just one ring
    const ringRadius = maxRadius - strokeWidth / 2;
    
 

    const centerCircleRadius = 44; // Use max radius for full-size circle
    const safetyColor = window.colorMap ? window.colorMap(safetyRingData[0].color) : getColorValue(safetyRingData[0].color);

    const svg = `<svg width="90" height="90" style="display:block">
      <circle cx="45" cy="45" r="${centerCircleRadius}" fill="${safetyColor}" />
    </svg>`;

    const div = document.createElement('div');
    div.className = "well-multiring safety-system";
    div.dataset.wellName = well.name;
    div.innerHTML = svg + `<div class="well-label">${well.name}</div>`;

    // Add hover handlers for safety system tooltips
    div.onmousemove = (e) => {
      window.currentDashboardWell = well;
      showSafetySystemTooltip(e, well, div, safetyRingData);
    };
    div.onmouseleave = hideTooltip;

    // Add click handler to navigate to well details
   div.onclick = () => {
  console.log(`Dashboard: Well clicked: ${well.name}`);
  
  if (typeof showSection === "function") {
    // First show the wells section
    showSection('wells');
    
    // Wait longer and try multiple approaches to select the well
    setTimeout(() => {
      const wellDropdown = document.getElementById('wellDropdown');
      console.log(`Attempting to select well ${well.name} in dropdown`);
      
      if (wellDropdown) {
        // Try to find the exact option
        const option = Array.from(wellDropdown.options).find(opt => 
          opt.value === well.name || opt.textContent.trim() === well.name
        );
        
        if (option) {
          console.log(`Found option for ${well.name}, selecting...`);
          wellDropdown.value = option.value;
          
          // Trigger multiple events to ensure it's detected
          wellDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          wellDropdown.dispatchEvent(new Event('input', { bubbles: true }));
          
          // If there's a custom handler function, call it directly
          if (typeof onWellSelectionChange === "function") {
            onWellSelectionChange(well.name);
          }
          
          console.log(`Successfully selected well: ${well.name}`);
        } else {
          console.warn(`Option not found for well: ${well.name}`);
          console.log('Available options:', Array.from(wellDropdown.options).map(opt => opt.value));
        }
      } else {
        console.error('Well dropdown not found');
      }
      
      // Also try to trigger any well detail display functions
      if (typeof displayWellDetails === "function") {
        displayWellDetails(well.name);
      }
      if (typeof renderWellDetail === "function") {
        renderWellDetail(well.name);
      }
      
    }, 500); // Increased timeout to ensure wells section is fully loaded
  } else {
    console.error('showSection function not available');
  }
};

    container.appendChild(div);
  });

  console.log(`Safety System Dashboard: Rendered ${renderedWells.size} wells`);
}

// Function to show safety system tooltip
function showSafetySystemTooltip(e, well, div, ringData) {
  if (!ringData || ringData.length === 0) return;

  const safetyRing = ringData[0]; // Safety system uses single ring
  const safetyDetails = safetyRing.safetyDetails;

  let tooltipContent = `<b>Safety System Status:</b><br>`;
  tooltipContent += `${safetyRing.message}<br>`;
  
  if (safetyDetails.failedCount > 0) {
    tooltipContent += `<br><b>Failed Valves:</b><br>`;
    safetyDetails.details.forEach(detail => {
      tooltipContent += `• ${detail.valveName} (${detail.safetyType})<br>`;
    });
  }

  tooltipContent += `<div style="margin-top: 8px; font-size: 11px; color: #888;"</div>`;
  if (window.showTooltipBox) {
    window.showTooltipBox(e.clientX, e.clientY, tooltipContent, safetyRing, well.name);
  }
}

// Function to update KPIs for safety system view
function updateSafetySystemKPIs() {
  const filteredWells = getWellsBySafetyFilter('safety-system');
  
  if (document.getElementById('kpiWells')) {
    document.getElementById('kpiWells').textContent = filteredWells.length;
  }

  let redRings = 0, orangeRings = 0, yellowRings = 0, wellsWithCriticalSafety = 0;

  filteredWells.forEach(well => {
    const safetyStatus = evaluateWellSafetySystem(well);
    
    if (safetyStatus.hasData) {
      const color = safetyStatus.color;
      
      if (color === 'red') { 
        redRings++; 
        wellsWithCriticalSafety++;
      } else if (color === 'orange') {
        orangeRings++;
      } else if (color === 'yellow') {
        yellowRings++;
      }
    }
  });

  // Update KPI displays
  if (document.getElementById('kpiRed')) document.getElementById('kpiRed').textContent = redRings;
  if (document.getElementById('kpiOrange')) document.getElementById('kpiOrange').textContent = orangeRings;
  if (document.getElementById('kpiYellow')) document.getElementById('kpiYellow').textContent = yellowRings;
  
  if (document.getElementById('kpiRepairs')) {
    document.getElementById('kpiRepairs').textContent = wellsWithCriticalSafety;
  }

  // Keep deviations count the same
  if (document.getElementById('kpiDeviations')) {
    document.getElementById('kpiDeviations').textContent = window.countActiveDeviationsFromRecords ? window.countActiveDeviationsFromRecords() : 0;
  }
}

// Function to update safety system statistics
function updateSafetySystemStats() {
  const statsContainer = document.getElementById('filterStats');
  if (!statsContainer) return;

  const allWells = window.deduplicateWellsById ? window.deduplicateWellsById(window.wells || []) : (window.wells || []);
  
  let safetyFailures = 0;
  let safetyPassed = 0;
  let noSafetyData = 0;

  allWells.forEach(well => {
    const category = categorizeWellBySafetySystem(well);
    switch (category) {
      case 'safety-failures':
        safetyFailures++;
        break;
      case 'safety-passed':
        safetyPassed++;
        break;
      case 'no-safety-data':
        noSafetyData++;
        break;
    }
  });

  const totalWithSafetyData = safetyFailures + safetyPassed;

  // Check current filter to show appropriate stats
  const filterSelect = document.getElementById('dashboardFilter');
  const currentFilter = filterSelect ? filterSelect.value : 'with-failures';

  if (currentFilter === 'safety-system') {
    statsContainer.innerHTML = `
      Showing: ${totalWithSafetyData} wells<br>
      <small>Safety Failures: ${safetyFailures} | Safety Passed: ${safetyPassed} | No Safety Data: ${noSafetyData}</small>
    `;
  } else {
    // Use existing stats function if available
    if (window.updateFilterStats) {
      window.updateFilterStats(currentFilter);
    }
  }
}

// Helper function to get color value (fallback if colorMap not available)
function getColorValue(color) {
  const colorValues = {
    'red': '#e64a3a',
    'orange': '#ff9800', 
    'yellow': '#e6c23a',
    'green': '#19d219'
  };
  return colorValues[color] || '#999';
}

// Hide tooltip function (use existing one if available)
function hideTooltip() {
  // Only call window.hideTooltip if it's a DIFFERENT function (not this one)
  if (window.hideTooltip && window.hideTooltip !== hideTooltip) {
    window.hideTooltip();
  } else {
    const tooltip = document.getElementById('dashboardTooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
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


// Function to initialize the safety system extension
function initializeSafetySystemExtension() {
  console.log('Initializing Safety System Dashboard Extension...');
  
  // Replace the original dropdown creation with our extended version
  if (window.createDashboardFilterDropdown) {
    // Override the original function
    window.createDashboardFilterDropdown = createSafetySystemFilterDropdown;
  }
  
  // Export functions to window object for global access
  window.identifySafetyValves = identifySafetyValves;
  window.evaluateWellSafetySystem = evaluateWellSafetySystem;
  window.categorizeWellBySafetySystem = categorizeWellBySafetySystem;
  window.getWellsBySafetyFilter = getWellsBySafetyFilter;
  window.getSafetySystemRingData = getSafetySystemRingData;
  window.renderSafetySystemDashboard = renderSafetySystemDashboard;
  window.updateSafetySystemKPIs = updateSafetySystemKPIs;
  window.updateSafetySystemStats = updateSafetySystemStats;
  window.createSafetySystemFilterDropdown = createSafetySystemFilterDropdown;
  
  console.log('Safety System Dashboard Extension initialized successfully.');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure base dashboard is loaded first
  setTimeout(() => {
    initializeSafetySystemExtension();
  }, 200);
});

// Also initialize if DOM already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSafetySystemExtension);
} else {
  setTimeout(initializeSafetySystemExtension, 200);
}


window.removeSafetySystemLegend = removeSafetySystemLegend;
window.addSafetySystemLegend = addSafetySystemLegend;