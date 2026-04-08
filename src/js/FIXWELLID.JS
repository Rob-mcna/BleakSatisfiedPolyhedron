function normalizeIntegrityResultFromBackend(row) {
  const normalized = {
    testId: row.testId,
    wellId: row.wellId,
    valveId: row.testValveId,
    valveName: row.testValveName,
    blockingValveId: row.blockingValveId,
    blockingValve: row.blockingValveName,

    monitoringTime: row.monitoringTime,
    criticalRate: row.criticalRate,
    initialPressure: row.initialPressure,
    finalPressure: row.finalPressure,
    initialTemperature: row.initialTemperature,
    finalTemperature: row.finalTemperature,

    Pa: row.Pa,
    Pc: row.Pc,
    Pf: row.Pf,
    P2: row.P2,

    leakRate: row.leakRate,
    sithp: row.sithp,
    liquid_yield: row.liquid_yield,
    status: row.status,

    utc_timestamp: row.createdAt || row.updatedAt || null,

    inputs: {
      Well: row.wellId,
      ValveType: row.testValveName,
      BlockingValve: row.blockingValveName,
      MonitoringTime_min: row.monitoringTime,
      InitialPressure_psig: row.initialPressure,
      FinalPressure_psig: row.finalPressure,
      InitialTemperature_F: row.initialTemperature,
      FinalTemperature_F: row.finalTemperature,
      Sithp: row.sithp,
      LiquidYield: row.liquid_yield,
      timestamp: row.createdAt || row.updatedAt || null
    },

    failure_reasons: []
  };

  return validateTestOnFrontend(normalized, {
    critical_rate: Number(row.criticalRate || 0)
  });
}

function groupIntegrityResultsByValve(rows) {
  const grouped = {};

  (rows || []).forEach(row => {
    const valveId = row.testValveId;
    if (!valveId) return;

    if (!grouped[valveId]) grouped[valveId] = [];
    grouped[valveId].push(normalizeIntegrityResultFromBackend(row));
  });

  Object.keys(grouped).forEach(valveId => {
    grouped[valveId].sort((a, b) => {
      const ta = new Date(a.utc_timestamp || a.inputs?.timestamp || 0).getTime();
      const tb = new Date(b.utc_timestamp || b.inputs?.timestamp || 0).getTime();
      return ta - tb;
    });
  });

  return grouped;
}


OTRO
async function loadValveTestStatuses(wellId) {
  console.log(`Loading valve test results for well ${wellId}`);

  try {
    const wellConfig = (window.wells || []).find(w => String(w.id) === String(wellId));
    if (!wellConfig) {
      console.error(`Could not find well with ID ${wellId}`);
      return {};
    }

    if (!window.valveTestResults) window.valveTestResults = {};
    if (!window.selectedValveTestIndex) window.selectedValveTestIndex = {};

    if (window.valveTestResults[wellId]) {
      console.log(`Using cached test results for well ${wellId}`);
      return window.valveTestResults[wellId];
    }

    const response = await fetch(`http://127.0.0.1:5000/api/integrity_test/results?well=${encodeURIComponent(wellId)}`);
    if (!response.ok) {
      console.warn(`Failed to fetch valve test results for well ${wellId}: ${response.statusText}`);
      return {};
    }

    const rows = await response.json();
    const groupedResults = groupIntegrityResultsByValve(rows);

    // Store by ID as canonical key
    window.valveTestResults[wellId] = groupedResults;

    // Temporary compatibility alias for old code that still uses well name
    window.valveTestResults[wellConfig.name] = groupedResults;

    window.selectedValveTestIndex[wellId] = window.selectedValveTestIndex[wellId] || {};
    window.selectedValveTestIndex[wellConfig.name] = window.selectedValveTestIndex[wellConfig.name] || {};

    Object.keys(groupedResults).forEach(valveId => {
      const lastIdx = groupedResults[valveId].length - 1;
      window.selectedValveTestIndex[wellId][valveId] = lastIdx;
      window.selectedValveTestIndex[wellConfig.name][valveId] = lastIdx;
    });

    console.log(`Successfully loaded grouped test results for well ${wellId}`, groupedResults);
    return groupedResults;
  } catch (error) {
    console.error(`Error loading valve test statuses for well ${wellId}:`, error);
    return {};
  }
}


OTRO

async function fetchValveTestResults() {
  try {
    console.log('--- Starting to fetch valve test results for all wells ---');

    const wells = window.wells || [];
    window.valveTestResults = {};
    window.selectedValveTestIndex = {};
    window.valvesWithNoData = {};

    await Promise.all(
      wells.map(async well => {
        const wellId = well.id;
        const wellName = well.name;

        let response;
        try {
          response = await fetch(`http://127.0.0.1:5000/api/integrity_test/results?well=${encodeURIComponent(wellId)}`);
        } catch (error) {
          console.error(`[FETCH ERROR] Well ${wellName}:`, error);
          window.valvesWithNoData[wellId] = true;
          return;
        }

        if (!response.ok) {
          console.warn(`[FETCH FAIL] Well ${wellName}: HTTP ${response.status}`);
          window.valvesWithNoData[wellId] = true;
          return;
        }

        const rows = await response.json();
        const groupedResults = groupIntegrityResultsByValve(rows);

        // Canonical store by well ID
        window.valveTestResults[wellId] = groupedResults;

        // Temporary compatibility alias for old code
        window.valveTestResults[wellName] = groupedResults;

        window.selectedValveTestIndex[wellId] = {};
        window.selectedValveTestIndex[wellName] = {};

        Object.keys(groupedResults).forEach(valveId => {
          const lastIdx = groupedResults[valveId].length - 1;
          window.selectedValveTestIndex[wellId][valveId] = lastIdx;
          window.selectedValveTestIndex[wellName][valveId] = lastIdx;
        });

        if (Object.keys(groupedResults).length === 0) {
          window.valvesWithNoData[wellId] = true;
        }
      })
    );

    console.log('--- Fetch Complete ---', window.valveTestResults);

    return {
      valveTestResults: window.valveTestResults,
      valvesWithNoData: window.valvesWithNoData
    };
  } catch (error) {
    console.error('Error in fetchValveTestResults:', error);
    throw error;
  }
}

OTRO
const option = Array.from(wellDropdown.options).find(opt => 
  String(opt.value) === String(well.id)
);


OTRO

if (typeof onWellSelectionChange === "function") {
  onWellSelectionChange(well.id);
}


OTRO

if (typeof displayWellDetails === "function") {
  displayWellDetails(well.id);
}
if (typeof renderWellDetail === "function") {
  renderWellDetail(well.id);
}
