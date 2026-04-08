// =================== SAFETY SYSTEM DASHBOARD EXTENSION ===================
// Full replacement
// Assumes the core frontend now uses well.id as the canonical key for window.valveTestResults

const SAFETY_VALVE_TYPES = ['SCSSV', 'HMV', 'HWV'];

const SAFETY_COLORS = {
  0: 'green',
  1: 'yellow',
  2: 'orange',
  3: 'red'
};

// =================== HELPERS ===================

function safetySameId(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function safetyGetWellById(wellId) {
  return (window.wells || []).find(w => safetySameId(w.id, wellId)) || null;
}

function safetyGetWellByName(wellName) {
  return (window.wells || []).find(w => String(w.name || '').trim() === String(wellName || '').trim()) || null;
}

function safetyResolveWellId(wellOrIdOrName) {
  if (!wellOrIdOrName) return null;

  if (typeof wellOrIdOrName === 'object' && wellOrIdOrName.id) {
    return wellOrIdOrName.id;
  }

  const byId = safetyGetWellById(wellOrIdOrName);
  if (byId) return byId.id;

  const byName = safetyGetWellByName(wellOrIdOrName);
  if (byName) return byName.id;

  return String(wellOrIdOrName);
}

function safetyGetWellResultsStore(wellOrIdOrName) {
  const wellId = safetyResolveWellId(wellOrIdOrName);
  if (!wellId || !window.valveTestResults) return {};
  return window.valveTestResults[wellId] || {};
}

function safetyGetWellDisplayName(wellOrIdOrName) {
  const wellId = safetyResolveWellId(wellOrIdOrName);
  const well = safetyGetWellById(wellId);
  return well?.name || wellId || '';
}

function getColorValue(color) {
  const colorValues = {
    red: '#e64a3a',
    orange: '#ff9800',
    yellow: '#e6c23a',
    green: '#19d219'
  };
  return colorValues[color] || '#999';
}

function hideTooltip() {
  if (window.hideTooltip && window.hideTooltip !== hideTooltip) {
    window.hideTooltip();
    return;
  }
  const tooltip = document.getElementById('dashboardTooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

function getPriorityColor(priority) {
  const colors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745'
  };
  return colors[priority] || '#6c757d';
}

function getTrafficLightFromCode(failureCode) {
  if (!window.wellFailureModel) return 'red';
  const action = window.wellFailureModel.getMitigatingAction(failureCode);
  return action ? action.trafficLight : 'red';
}

// =================== SAFETY SYSTEM ===================

function identifySafetyValves(well) {
  if (!well?.christmasTree || !Array.isArray(well.christmasTree.valves)) {
    return [];
  }

  const safetyValves = [];

  well.christmasTree.valves.forEach(valve => {
    const valveName = String(valve.name || '').toUpperCase();

    SAFETY_VALVE_TYPES.forEach(safetyType => {
      if (valveName.includes(safetyType)) {
        safetyValves.push({
          ...valve,
          safetyType
        });
      }
    });
  });

  return safetyValves;
}

function evaluateWellSafetySystem(well) {
  const testResults = safetyGetWellResultsStore(well);
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

  const cappedFailures = Math.min(failedSafetyValves, 3);
  const color = SAFETY_COLORS[cappedFailures];

  return {
    hasData: totalSafetyValves > 0,
    failedCount: failedSafetyValves,
    totalCount: totalSafetyValves,
    color,
    details: failureDetails,
    status: failedSafetyValves > 0 ? 'has-failures' : 'all-passed'
  };
}

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

function getWellsBySafetyFilter(filterOption) {
  const allWells = window.deduplicateWellsById
    ? window.deduplicateWellsById(window.wells || [])
    : (window.wells || []);

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

function getSafetySystemRingData(well) {
  const safetyStatus = evaluateWellSafetySystem(well);

  if (!safetyStatus.hasData) {
    return [];
  }

  return [{
    label: `Safety System (${safetyStatus.failedCount}/${safetyStatus.totalCount} failed)`,
    color: safetyStatus.color,
    message: generateSafetyMessage(safetyStatus),
    failureCode: null,
    safetySystem: true,
    safetyDetails: safetyStatus
  }];
}

// =================== SAFETY FILTER DROPDOWN ===================

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
      addSafetySystemLegend();
      renderSafetySystemDashboard();
      updateSafetySystemKPIs();
      updateSafetySystemStats();
    } else {
      removeSafetySystemLegend();
      if (window.renderFilteredDashboard) window.renderFilteredDashboard(selectedFilter);
      if (window.updateFilteredKPIs) window.updateFilteredKPIs(selectedFilter);
      if (window.updateFilterStats) window.updateFilterStats(selectedFilter);
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

  setTimeout(() => {
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, 0);
}

// =================== SAFETY DASHBOARD ===================

function showSafetySystemTooltip(e, well, div, ringData) {
  if (!ringData || ringData.length === 0) return;

  const safetyRing = ringData[0];
  const safetyDetails = safetyRing.safetyDetails;

  let tooltipContent = `<b>Safety System Status:</b><br>`;
  tooltipContent += `${safetyRing.message}<br>`;

  if (safetyDetails.failedCount > 0) {
    tooltipContent += `<br><b>Failed Valves:</b><br>`;
    safetyDetails.details.forEach(detail => {
      tooltipContent += `• ${detail.valveName} (${detail.safetyType})<br>`;
    });
  }

  tooltipContent += `<div style="margin-top: 8px; font-size: 11px; color: #888;"></div>`;

  if (window.showTooltipBox) {
    window.showTooltipBox(e.clientX, e.clientY, tooltipContent, safetyRing, well.name);
  }
}

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
    if (!well || typeof well.id === 'undefined') return;
    if (renderedWells.has(String(well.id))) return;

    renderedWells.add(String(well.id));

    const safetyRingData = getSafetySystemRingData(well);
    if (safetyRingData.length === 0) return;

    const safetyColor = window.colorMap ? window.colorMap(safetyRingData[0].color) : getColorValue(safetyRingData[0].color);

    const svg = `<svg width="90" height="90" style="display:block">
      <circle cx="45" cy="45" r="44" fill="${safetyColor}" />
    </svg>`;

    const div = document.createElement('div');
    div.className = "well-multiring safety-system";
    div.dataset.wellId = well.id;
    div.innerHTML = svg + `<div class="well-label">${well.name}</div>`;

    div.onmousemove = (e) => {
      window.currentDashboardWell = well;
      showSafetySystemTooltip(e, well, div, safetyRingData);
    };
    div.onmouseleave = hideTooltip;

    div.onclick = () => {
      if (typeof window.selectWellInWellsSection === 'function') {
        window.selectWellInWellsSection(well);
      } else if (typeof showSection === 'function') {
        showSection('wells');
        setTimeout(() => {
          const wellDropdown = document.getElementById('wellDropdown');
          if (wellDropdown) {
            wellDropdown.value = well.id;
            wellDropdown.dispatchEvent(new Event('change', { bubbles: true }));
            wellDropdown.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 300);
      }
    };

    container.appendChild(div);
  });

  console.log(`Safety System Dashboard: Rendered ${renderedWells.size} wells`);
}

function updateSafetySystemKPIs() {
  const filteredWells = getWellsBySafetyFilter('safety-system');

  if (document.getElementById('kpiWells')) {
    document.getElementById('kpiWells').textContent = filteredWells.length;
  }

  let redRings = 0;
  let orangeRings = 0;
  let yellowRings = 0;
  let wellsWithCriticalSafety = 0;

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

  if (document.getElementById('kpiRed')) document.getElementById('kpiRed').textContent = redRings;
  if (document.getElementById('kpiOrange')) document.getElementById('kpiOrange').textContent = orangeRings;
  if (document.getElementById('kpiYellow')) document.getElementById('kpiYellow').textContent = yellowRings;
  if (document.getElementById('kpiRepairs')) document.getElementById('kpiRepairs').textContent = wellsWithCriticalSafety;
  if (document.getElementById('kpiDeviations')) {
    document.getElementById('kpiDeviations').textContent =
      typeof window.countActiveDeviationsFromRecords === 'function'
        ? window.countActiveDeviationsFromRecords()
        : 0;
  }
}

function updateSafetySystemStats() {
  const statsContainer = document.getElementById('filterStats');
  if (!statsContainer) return;

  const allWells = window.deduplicateWellsById
    ? window.deduplicateWellsById(window.wells || [])
    : (window.wells || []);

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

  const filterSelect = document.getElementById('dashboardFilter');
  const currentFilter = filterSelect ? filterSelect.value : 'with-failures';

  if (currentFilter === 'safety-system') {
    statsContainer.innerHTML = `
      Showing: ${totalWithSafetyData} wells<br>
      <small>Safety Failures: ${safetyFailures} | Safety Passed: ${safetyPassed} | No Safety Data: ${noSafetyData}</small>
    `;
  } else {
    if (window.updateFilterStats) {
      window.updateFilterStats(currentFilter);
    }
  }
}

// =================== LEGEND ===================

function addSafetySystemLegend() {
  removeSafetySystemLegend();

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

  const dashboardContainer = document.getElementById('wellMultiRingBoard');
  if (dashboardContainer) {
    dashboardContainer.parentNode.insertBefore(legend, dashboardContainer);
  }
}

function removeSafetySystemLegend() {
  const existingLegend = document.getElementById('safetySystemLegend');
  if (existingLegend) existingLegend.remove();
}

// =================== ESCALATION SYSTEM ===================

window.activeEscalations = window.activeEscalations || [];
window.escalationIdCounter = window.escalationIdCounter || 1;

class EscalationSystem {
  constructor() {
    this.escalations = window.activeEscalations;
  }

  _getWellIdFromName(wellName) {
    const wellObj = safetyGetWellByName(wellName);
    return wellObj?.id || null;
  }

  getPriorityFromTrafficLight(trafficLight) {
    const priorityMap = {
      red: 'critical',
      orange: 'high',
      yellow: 'medium',
      green: 'low'
    };
    return priorityMap[trafficLight] || 'medium';
  }

  determineSuperior(userRole = null) {
    const role = userRole || window.AuthService?.currentUserData?.role;
    const dms = window.decisionMakers?.decisionMakers;

    if (!role || !dms) return 'supervisor';

    const currentUserDM = dms.find(dm => dm.role === role);
    const currentUserLevel = currentUserDM ? currentUserDM.level : -1;

    if (currentUserLevel === -1) return 'supervisor';

    const superior = dms
      .filter(dm => dm.level > currentUserLevel)
      .sort((a, b) => a.level - b.level)[0];

    return superior ? superior.role : role;
  }

  async createEscalation(wellName, valveId, failureDetails, userInitiated = false, wellId = null) {
    if (!wellName) {
      console.error('Cannot create escalation without a well name');
      return null;
    }

    if (!wellId) {
      wellId = this._getWellIdFromName(wellName);
    }

    const userEmail = window.AuthService?.currentUserData?.email || 'system';
    const userRole = window.AuthService?.currentUserData?.role || '';

    const escalation = {
      id: `ESC-${Date.now()}-${window.escalationIdCounter++}`,
      wellName,
      wellId,
      valveId,
      failureDetails,
      status: 'open',
      priority: this.getPriorityFromTrafficLight(failureDetails.trafficLight),
      createdAt: new Date(),
      createdBy: userEmail,
      creatorRole: userRole,
      userInitiated,
      escalatedTo: this.determineSuperior(userRole),
      comments: [],
      acknowledgedAt: null,
      resolvedAt: null
    };

    this.escalations.push(escalation);
    this.updateDashboardEscalationIndicators();
    await this.sendEscalationToDatabase(escalation);
    updateEscalationButtonCount();
    return escalation;
  }

  _prepareDataForBackend(escalation) {
    const { failureDetails } = escalation;
    return {
      wellId: escalation.wellId,
      valveId: escalation.valveId,
      failureCode: failureDetails.failureCode,
      matrixCategory: failureDetails.matrixCategory,
      failureDescription: failureDetails.failureReason,
      requiredAction: failureDetails.matrixDescription,
      escalationId: escalation.id,
      createdBy: escalation.createdBy
    };
  }

  async sendEscalationToDatabase(escalation) {
    try {
      const backendData = {
        failureCode: escalation.failureDetails.failureCode,
        matrixCategory: escalation.failureDetails.matrixCategory,
        failureDescription: escalation.failureDetails.failureReason,
        requiredAction: escalation.failureDetails.matrixDescription,
        createdBy: escalation.createdBy,
        createdAt: new Date().toISOString()
      };

      const response = await fetch(
        `http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(backendData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to save escalation:', error);
      return false;
    }
  }

  async updateEscalationInDatabase(escalation) {
    try {
      const backendData = this._prepareDataForBackend(escalation);

      const response = await fetch(
        `http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(escalation.wellId)}&valve=${encodeURIComponent(escalation.valveId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(backendData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to update escalation:', error);
      return false;
    }
  }

  async acknowledgeEscalation(id, comment = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (!esc) return;

    esc.acknowledgedAt = new Date();
    esc.status = 'acknowledged';

    if (comment) {
      esc.comments.push({
        text: comment,
        author: window.AuthService?.currentUserData?.email || 'system',
        timestamp: new Date()
      });
    }

    this.updateDashboardEscalationIndicators();
    await this.updateEscalationInDatabase(esc);
    updateEscalationButtonCount();
  }

  async resolveEscalation(id, resolution = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (!esc) return;

    esc.resolvedAt = new Date();
    esc.status = 'resolved';

    if (resolution) {
      esc.comments.push({
        text: `Resolution: ${resolution}`,
        author: window.AuthService?.currentUserData?.email || 'system',
        timestamp: new Date()
      });
    }

    this.updateDashboardEscalationIndicators();
    await this.updateEscalationInDatabase(esc);
    updateEscalationButtonCount();
  }

  async requestRetest(id, comment = '') {
    const esc = this.escalations.find(e => e.id === id);
    if (!esc) return;

    esc.status = 'retest-requested';
    esc.comments.push({
      text: `Re-test requested. ${comment ? `Comment: ${comment}` : ''}`,
      author: window.AuthService?.currentUserData?.email || 'system',
      timestamp: new Date()
    });

    esc.escalatedTo = esc.creatorRole;
    this.updateDashboardEscalationIndicators();
    await this.updateEscalationInDatabase(esc);
    updateEscalationButtonCount();
  }

  addCommentToEscalation(escalationId, comment) {
    const escalation = this.escalations.find(e => e.id === escalationId);
    if (escalation && comment) {
      escalation.comments.push({
        text: comment,
        author: window.AuthService?.currentUserData?.email || 'user',
        timestamp: new Date()
      });
      this.updateEscalationInDatabase(escalation);
    }
  }

  getActiveEscalationsForWell(wellName) {
    return this.escalations.filter(e =>
      e.wellName === wellName &&
      (e.status === 'open' || e.status === 'acknowledged' || e.status === 'retest-requested')
    );
  }

  getEscalationForValve(wellName, valveId) {
    return this.escalations.find(e =>
      e.wellName === wellName &&
      e.valveId === valveId &&
      (e.status === 'open' || e.status === 'acknowledged' || e.status === 'retest-requested')
    );
  }

  updateDashboardEscalationIndicators() {
    const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';

    if (currentFilter === 'safety-system') {
      renderSafetySystemDashboard();
      updateSafetySystemKPIs();
      updateSafetySystemStats();
    } else if (typeof window.renderFilteredDashboard === 'function') {
      window.renderFilteredDashboard(currentFilter);
    }
  }
}

window.escalationSystem = window.escalationSystem || new EscalationSystem();

// =================== ESCALATION HELPERS ===================

function checkIfShouldEscalate(wellName, valveId, failureDetails) {
  const existing = window.escalationSystem.escalations.find(e =>
    e.wellName === wellName &&
    e.valveId === valveId &&
    (e.status === 'open' || e.status === 'acknowledged') &&
    e.failureDetails.failureCode === failureDetails.failureCode
  );

  return !existing && failureDetails.trafficLight === 'red';
}

function addEscalationIndicatorToWell(wellDiv, wellName) {
  const activeEscalations = window.escalationSystem.getActiveEscalationsForWell(wellName);

  if (activeEscalations.length > 0) {
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      z-index: 10;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.5);
    `;
    badge.textContent = activeEscalations.length;
    badge.title = `${activeEscalations.length} active escalation(s)`;

    wellDiv.style.position = 'relative';
    wellDiv.appendChild(badge);
  }
}

function addEscalationManagementButton() {
  const filterContainer = document.getElementById('dashboardFilterContainer');
  if (filterContainer && !document.getElementById('globalEscalationBtn')) {
    const escalationBtn = document.createElement('button');
    escalationBtn.id = 'globalEscalationBtn';
    escalationBtn.style.cssText = `
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-left: 10px;
    `;
    escalationBtn.title = 'View and manage all escalations';
    escalationBtn.onclick = () => showEscalationManagementModal();

    filterContainer.appendChild(escalationBtn);
    updateEscalationButtonCount();
  }
}

function updateEscalationButtonCount() {
  const btn = document.getElementById('globalEscalationBtn');
  if (btn) {
    const activeCount = window.escalationSystem.escalations.filter(e => e.status !== 'resolved').length;
    btn.innerHTML = `🚨 Escalations (${activeCount})`;
  }
}

// =================== FAILURE CATEGORY HELPERS ===================

function getFailureCategoryAndNumber(testResult) {
  if (!testResult || testResult.pass === true) {
    return { category: null, number: null };
  }

  const wellId = window.currentWellContext?.id || safetyResolveWellId(window.currentWellContext?.name);
  const well = safetyGetWellById(wellId);
  const wellType = well ? getWellTypeKey(well.type) : 'Producer';

  const valveType = testResult.valve_type || testResult.inputs?.ValveType || '';
  const failureReasons = testResult.failure_reasons || [];
  const isLeakRateExceeded = failureReasons.some(reason =>
    reason.includes('leak rate') || reason.includes('exceed')
  );

  const isSubsurfaceValve = valveType.toUpperCase() === 'SCSSV';
  const multipleValvesFailed = checkForMultipleFailedValves(wellId);

  let category = null;
  let number = null;

  if (isSubsurfaceValve) {
    category = multipleValvesFailed ? 'multipleSubSurfaceFailures' : 'singleSubSurfaceFailure';
  } else {
    category = multipleValvesFailed ? 'multipleSurfaceFailures' : 'singleSurfaceFailure';
  }

  if (category && window.wellFailureMatrix[category]) {
    const categoryEntries = window.wellFailureMatrix[category];

    for (const [failureNum, failureData] of Object.entries(categoryEntries)) {
      const description = failureData.description.toLowerCase();
      const valveTypeUpper = valveType.toUpperCase();

      if (description.includes(valveTypeUpper)) {
        number = parseInt(failureNum, 10);
        break;
      }

      if (
        isSubsurfaceValve &&
        isLeakRateExceeded &&
        description.includes('completion leak') &&
        description.includes('above allowable leak rate')
      ) {
        number = parseInt(failureNum, 10);
        break;
      }
    }

    if (number === null && Object.keys(categoryEntries).length > 0) {
      number = parseInt(Object.keys(categoryEntries)[0], 10);
    }
  }

  console.log(`Dynamically categorized failure for ${valveType} as ${category}:${number}`, failureReasons);
  return { category, number };
}

function checkForMultipleFailedValves(wellIdOrName) {
  const wellId = safetyResolveWellId(wellIdOrName);
  const wellResults = safetyGetWellResultsStore(wellId);
  let failedValveCount = 0;

  for (const valveId in wellResults) {
    if (!Object.prototype.hasOwnProperty.call(wellResults, valveId)) continue;

    const tests = wellResults[valveId];
    if (!Array.isArray(tests) || tests.length === 0) continue;

    const latestTest = tests[tests.length - 1];
    if (latestTest && latestTest.pass === false) {
      failedValveCount++;
    }
  }

  return failedValveCount > 1;
}

// =================== MODALS ===================

function _buildEscalationManagementSection(existingEscalation) {
  let actionsHtml = '';
  let statusHtml = '';

  const currentUser = window.AuthService?.currentUserData;
  const isAdmin = currentUser?.role === 'admin';
  const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'manager';

  if (existingEscalation) {
    const originText = existingEscalation.creatorRole
      ? `Created by: ${existingEscalation.creatorRole}`
      : `Created by: ${existingEscalation.createdBy}`;

    statusHtml = `
      <div style="background: #e2f0d9; border-left: 4px solid #548235; padding: 12px; border-radius: 4px; margin-bottom: 12px; color: #333;">
        <strong style="font-size: 1.1em;">✅ This failure has been escalated.</strong><br>
        <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 0.9em; list-style-position: inside;">
          <li><strong>${originText}</strong></li>
          <li><strong>Timestamp:</strong> ${new Date(existingEscalation.createdAt).toLocaleString()}</li>
        </ul>
      </div>
    `;

    if (!isAdmin) {
      actionsHtml = `
        <button id="acknowledgeBtn" style="background: #28a745; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1;">Acknowledge</button>
      `;
      if (isSupervisor) {
        actionsHtml += `
          <button id="requestRetestBtn" style="background: #17a2b8; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1; margin-top: 10px;">
            Request Re-Test
          </button>
        `;
      }
      const placeholder = isSupervisor
        ? 'Add a comment (required for re-test)...'
        : 'Add an optional comment...';
      actionsHtml += `<textarea id="escalationComment" placeholder="${placeholder}" style="width: 100%; box-sizing: border-box; height: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit; margin-top: 10px;"></textarea>`;
    } else {
      actionsHtml = `
        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; color: #495057; font-style: italic;">
          As an admin, you don't need to manage escalations directly.
        </div>
      `;
    }
  } else if (!isAdmin) {
    statusHtml = `
      <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
        <strong>⚠️ Action Required:</strong> This failure has not been escalated yet.
      </div>
    `;
    actionsHtml = `
      <button id="escalateBtn" style="background: #dc3545; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; flex-grow: 1;">
        Escalate to Superior
      </button>
      <textarea id="escalationComment" placeholder="Add an optional comment before escalating..." style="width: 100%; box-sizing: border-box; height: 60px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: inherit; margin-top: 10px;"></textarea>
    `;
  } else {
    statusHtml = `
      <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
        <strong>ℹ️ Information:</strong> This failure has not been escalated yet.
      </div>
    `;
  }

  const viewAllBtn = !isAdmin
    ? `<button id="viewAllEscalationsBtn" title="View all active escalations" style="background: #6c757d; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer;">View All Escalations</button>`
    : '';

  return `
    <div style="border-top: 1px solid #eee; padding-top: 20px;">
      <h4 style="margin: 0 0 12px 0; font-size: 1.2em;">🚨 Escalation Management</h4>
      ${statusHtml}
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px;">
        ${actionsHtml}
        ${viewAllBtn}
      </div>
    </div>
  `;
}

async function showDetailedFailureModal(ringInfo, wellName) {
  const existingModal = document.getElementById('failureDetailModal');
  if (existingModal) existingModal.remove();

  const wellObj = safetyGetWellByName(wellName);
  const wellId = wellObj?.id;
  const valveId = ringInfo?.valveId;

  if (!wellId || !valveId) {
    if (window.showTemporaryMessage) {
      window.showTemporaryMessage('Unable to load escalation: missing well/valve identifier', 'error');
    }
    return;
  }

  let record = null;
  try {
    const resp = await fetch(
      `http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(wellId)}&valve=${encodeURIComponent(valveId)}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    );

    if (resp.ok) {
      const data = await resp.json();
      record = Array.isArray(data) ? data[data.length - 1] : data;
    }
  } catch (e) {
    console.warn('Error fetching escalation from DB', e);
  }

  const failureCode = record?.failureCode ?? record?.code ?? 'N/A';
  const matrixCategory = record?.matrixCategory ?? record?.matrix_category ?? 'N/A';
  const failureDescription = record?.failureDescription ?? record?.description ?? 'N/A';
  const requiredAction = record?.requiredAction ?? record?.required_action ?? 'N/A';
  const createdBy = record?.createdBy ?? record?.created_by ?? window.AuthService?.currentUserData?.email ?? 'N/A';
  const createdAt = record?.created_at ?? record?.createdAt ?? null;
  const escalationId = record?.escalationId ?? record?.id ?? 'N/A';

  const dbEscalation = record ? {
    id: escalationId,
    wellName,
    wellId,
    valveId,
    createdAt,
    createdBy,
    creatorRole: record?.creatorRole || '',
    escalatedTo: record?.escalatedTo || '',
    comments: record?.comments || [],
    failureDetails: {
      failureCode,
      matrixCategory,
      failureReason: failureDescription,
      matrixDescription: requiredAction
    }
  } : null;

  const backdrop = document.createElement('div');
  backdrop.id = 'failureDetailModal';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.75); z-index: 2000; display: flex;
    align-items: center; justify-content: center; backdrop-filter: blur(5px);
  `;

  const barColor = (typeof window.getColorForCode === 'function' && failureCode !== 'N/A')
    ? window.getColorForCode(failureCode)
    : '#6c757d';

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
    width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
    position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    border-top: 5px solid ${barColor};
  `;

  const mitigatingAction = typeof window.wellFailureModel?.getMitigatingAction === 'function'
    ? window.wellFailureModel.getMitigatingAction(failureCode)
    : null;

  const infoBlock = record ? `
    <div style="background: #e2f0d9; border-left: 4px solid #548235; padding: 12px; border-radius: 4px; margin-bottom: 12px; color: #333;">
      <strong style="font-size: 1.1em;">Escalation Info</strong><br>
      <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 0.9em; list-style-position: inside;">
        <li><strong>ID:</strong> ${escalationId}</li>
        <li><strong>Created By:</strong> ${createdBy}</li>
        <li><strong>Timestamp:</strong> ${createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</li>
      </ul>
    </div>
  ` : `
    <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
      <strong>No escalation record found for this well/valve.</strong>
    </div>
  `;

  const escalationManagementHtml = _buildEscalationManagementSection(dbEscalation);

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 1.5em;">Failure Details: ${ringInfo.label} (${wellName})</h3>
      <button id="closeModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
    </div>

    ${infoBlock}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px;">
      <div>
        <h4 style="margin: 0 0 8px 0;">Failure Code & Category</h4>
        <p style="margin: 0;">Code ${failureCode} (${typeof window.formatCategoryName === 'function' ? window.formatCategoryName(matrixCategory) : matrixCategory})</p>
      </div>
      <div>
        <h4 style="margin: 0 0 8px 0;">Traffic Light Status</h4>
        <p style="margin: 0; text-transform: capitalize; font-weight: bold; color: ${barColor};">
          ${mitigatingAction ? (mitigatingAction.trafficLight || 'Unknown').toUpperCase() : 'UNKNOWN'}
        </p>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0;">Matrix Failure Description:</h4>
      <p style="margin: 0; line-height: 1.5;">${failureDescription}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0;">Required Action:</h4>
      <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; line-height: 1.5;">${requiredAction}</div>
    </div>

    ${escalationManagementHtml}

    <div style="text-align: right; margin-top: 24px; border-top: 1px solid #eee; padding-top: 15px;">
      <button id="closeModalBtn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('closeModalBtn').onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  const commentEl = document.getElementById('escalationComment');

  const escalateBtn = document.getElementById('escalateBtn');
  if (escalateBtn) {
    escalateBtn.onclick = async () => {
      const comment = commentEl?.value.trim() || '';
      const action = window.wellFailureModel?.getMitigatingAction?.(ringInfo.failureCode);

      const failureDetails = {
        failureReason: ringInfo.message,
        failureCode: ringInfo.failureCode,
        matrixCategory: ringInfo.matrixCategory,
        trafficLight: action?.trafficLight || 'red',
        matrixDescription: action?.description || 'Action required',
        wellType: typeof window.getWellTypeKey === 'function' ? window.getWellTypeKey(wellName) : '',
        timestamp: new Date().toISOString()
      };

      const created = await window.escalationSystem.createEscalation(wellName, valveId, failureDetails, true, wellId);
      if (created && comment) {
        window.escalationSystem.addCommentToEscalation(created.id, comment);
      }

      if (window.showTemporaryMessage) {
        window.showTemporaryMessage(`Failure for ${wellName} escalated successfully!`, 'success');
      }
      closeModal();
    };
  }

  const acknowledgeBtn = document.getElementById('acknowledgeBtn');
  if (acknowledgeBtn && dbEscalation) {
    acknowledgeBtn.onclick = async () => {
      const comment = commentEl?.value.trim() || '';
      await window.escalationSystem.acknowledgeEscalation(dbEscalation.id, comment);
      if (window.showTemporaryMessage) {
        window.showTemporaryMessage('Escalation acknowledged', 'success');
      }
      closeModal();
    };
  }

  const requestRetestBtn = document.getElementById('requestRetestBtn');
  if (requestRetestBtn && dbEscalation) {
    requestRetestBtn.onclick = async () => {
      const comment = commentEl?.value.trim();
      if (!comment) {
        if (window.showTemporaryMessage) {
          window.showTemporaryMessage('A comment is required to request a re-test.', 'error');
        }
        if (commentEl) {
          commentEl.style.border = '2px solid red';
          commentEl.focus();
        }
        return;
      }

      await window.escalationSystem.requestRetest(dbEscalation.id, comment);
      if (window.showTemporaryMessage) {
        window.showTemporaryMessage('Re-test requested!', 'info');
      }
      closeModal();
    };
  }

  const viewAllBtn = document.getElementById('viewAllEscalationsBtn');
  if (viewAllBtn) {
    viewAllBtn.onclick = () => showEscalationManagementModal();
  }
}

function showEscalationManagementModal(wellName = null) {
  const existingModal = document.getElementById('escalationManagementModal');
  if (existingModal) existingModal.remove();

  const escalations = wellName
    ? window.escalationSystem.getActiveEscalationsForWell(wellName)
    : window.escalationSystem.escalations.filter(e => e.status !== 'resolved');

  const currentUser = window.AuthService?.currentUserData;
  const isAdmin = currentUser?.role === 'admin';

  const backdrop = document.createElement('div');
  backdrop.id = 'escalationManagementModal';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); z-index: 2000; display: flex;
    align-items: center; justify-content: center;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white; border-radius: 8px; padding: 24px; max-width: 800px;
    max-height: 80vh; overflow-y: auto; position: relative;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  const escalationRows = escalations.map(esc => {
    let actions = '';
    const isEscalatedToCurrentUser = currentUser && esc.escalatedTo === currentUser.role;

    if (!isAdmin) {
      if (esc.status === 'open' && isEscalatedToCurrentUser) {
        actions = `<button onclick="window.escalationSystem.acknowledgeEscalation('${esc.id}', 'Acknowledged by supervisor')" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Acknowledge</button>`;
      } else if (esc.status === 'acknowledged' && isEscalatedToCurrentUser) {
        actions = `<button onclick="window.escalationSystem.resolveEscalation('${esc.id}', 'Issue resolved')" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Resolve</button>`;
      }
    }

    const statusColor = esc.status === 'retest-requested' ? '#17a2b8' : '#6c757d';

    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; font-weight: bold;">${esc.id}</td>
        <td style="padding: 8px;">${esc.wellName}</td>
        <td style="padding: 8px;">${esc.valveId}</td>
        <td style="padding: 8px;"><span style="background: ${getPriorityColor(esc.priority)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${esc.priority.toUpperCase()}</span></td>
        <td style="padding: 8px;"><span style="color: ${statusColor}; text-transform: capitalize;">${esc.status}</span></td>
        <td style="padding: 8px;">${esc.creatorRole || esc.createdBy}</td>
        <td style="padding: 8px;">${new Date(esc.createdAt).toLocaleString()}</td>
        <td style="padding: 8px;">${actions}</td>
      </tr>
    `;
  }).join('');

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="margin: 0; color: #333;">Escalation Management ${wellName ? `- ${wellName}` : ''}</h3>
      <button id="closeEscalationModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
    </div>
    <p style="color: #666; margin-top:0;">Active escalations: <strong>${escalations.length}</strong></p>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">ID</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Well</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Valve</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Priority</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Status</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Created By</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Created</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Actions</th>
          </tr>
        </thead>
        <tbody>${escalationRows || '<tr><td colspan="8" style="padding: 20px; text-align: center; color: #666;">No active escalations</td></tr>'}</tbody>
      </table>
    </div>
    <div style="text-align: right; margin-top: 20px;">
      <button id="closeEscalationModalBtn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();

  document.getElementById('closeEscalationModal').onclick = closeModal;
  document.getElementById('closeEscalationModalBtn').onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
}

// =================== INITIALIZATION ===================

function initializeSafetySystemExtension() {
  console.log('Initializing Safety System Dashboard Extension...');

  if (window.createDashboardFilterDropdown) {
    window.createDashboardFilterDropdown = createSafetySystemFilterDropdown;
  }

  window.identifySafetyValves = identifySafetyValves;
  window.evaluateWellSafetySystem = evaluateWellSafetySystem;
  window.categorizeWellBySafetySystem = categorizeWellBySafetySystem;
  window.getWellsBySafetyFilter = getWellsBySafetyFilter;
  window.getSafetySystemRingData = getSafetySystemRingData;
  window.renderSafetySystemDashboard = renderSafetySystemDashboard;
  window.updateSafetySystemKPIs = updateSafetySystemKPIs;
  window.updateSafetySystemStats = updateSafetySystemStats;
  window.createSafetySystemFilterDropdown = createSafetySystemFilterDropdown;
  window.removeSafetySystemLegend = removeSafetySystemLegend;
  window.addSafetySystemLegend = addSafetySystemLegend;
  window.showDetailedFailureModal = showDetailedFailureModal;
  window.showEscalationManagementModal = showEscalationManagementModal;
  window.addEscalationIndicatorToWell = addEscalationIndicatorToWell;
  window.addEscalationManagementButton = addEscalationManagementButton;
  window.updateEscalationButtonCount = updateEscalationButtonCount;
  window.debugShowCurrentUser = () => {
    console.log("Current user from AuthService:", window.AuthService?.currentUserData);
    return window.AuthService?.currentUserData;
  };

  console.log('Safety System Dashboard Extension initialized successfully.');
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeSafetySystemExtension();
  }, 200);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSafetySystemExtension);
} else {
  setTimeout(initializeSafetySystemExtension, 200);
}
