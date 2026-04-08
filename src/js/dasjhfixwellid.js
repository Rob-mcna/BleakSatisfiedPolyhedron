function dashboardSameId(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function getDashboardResultsForWell(well) {
  if (!well || !window.valveTestResults) return {};
  return window.valveTestResults[well.id] || window.valveTestResults[well.name] || {};
}

function groupDashboardIntegrityResults(rows) {
  const grouped = {};

  (rows || []).forEach(row => {
    const valveId = row.testValveId || row.valveId;
    if (!valveId) return;

    if (!grouped[valveId]) grouped[valveId] = [];

    const normalized = window.normalizeIntegrityResultFromBackend
      ? window.normalizeIntegrityResultFromBackend(row)
      : row;

    grouped[valveId].push(normalized);
  });

  Object.keys(grouped).forEach(valveId => {
    grouped[valveId].sort((a, b) => {
      const ta = new Date(a.utc_timestamp || a.createdAt || a.updatedAt || a.inputs?.timestamp || 0).getTime();
      const tb = new Date(b.utc_timestamp || b.createdAt || b.updatedAt || b.inputs?.timestamp || 0).getTime();
      return ta - tb;
    });
  });

  return grouped;
}


OTRO

async function fetchValveTestResults() {
  try {
    console.log('--- Starting to fetch valve test results for all wells ---');

    const wells = window.wells || [];
    window.valveTestResults = {};
    window.selectedValveTestIndex = {};
    window.valvesWithNoData = {};

    const fetchPromises = wells.map(async (well) => {
      const wellId = well.id;
      const wellName = well.name;

      try {
        const response = await fetch(
          `http://127.0.0.1:5000/api/integrity_test/results?well=${encodeURIComponent(wellId)}`
        );

        if (!response.ok) {
          console.warn(`[FETCH FAIL] Well ${wellName}: HTTP ${response.status}`);
          window.valvesWithNoData[wellId] = true;
          return;
        }

        const rows = await response.json();
        const grouped = groupDashboardIntegrityResults(rows);

        // canonical storage by well.id
        window.valveTestResults[wellId] = grouped;

        // compatibility alias for old code still using well.name
        window.valveTestResults[wellName] = grouped;

        window.selectedValveTestIndex[wellId] = {};
        window.selectedValveTestIndex[wellName] = {};

        Object.keys(grouped).forEach(valveId => {
          const lastIdx = grouped[valveId].length - 1;
          window.selectedValveTestIndex[wellId][valveId] = lastIdx;
          window.selectedValveTestIndex[wellName][valveId] = lastIdx;
        });

        if (Object.keys(grouped).length === 0) {
          window.valvesWithNoData[wellId] = true;
        }
      } catch (error) {
        console.error(`[FETCH ERROR] Well ${wellName}:`, error);
        window.valvesWithNoData[wellId] = true;
      }
    });

    await Promise.all(fetchPromises);

    console.log('--- Fetch Complete ---');
    console.log('valveTestResults:', window.valveTestResults);
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

function categorizeWellByTestResults(well) {
  const testResults = getDashboardResultsForWell(well);

  const hasTestData = Object.keys(testResults).length > 0;
  if (!hasTestData) {
    return 'no-data';
  }

  let hasFailures = false;
  let hasValidTests = false;

  for (const valveId in testResults) {
    const tests = testResults[valveId];
    if (Array.isArray(tests) && tests.length > 0) {
      hasValidTests = true;
      const latestTest = tests[tests.length - 1];
      if (latestTest && typeof latestTest === 'object') {
        const testPassed = latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass;
        if (!testPassed) {
          hasFailures = true;
          break;
        }
      }
    }
  }

  if (!hasValidTests) {
    return 'no-data';
  }

  return hasFailures ? 'with-failures' : 'no-failures';
}

OTRO

function getLiveStatusForAllRingsWithEscalation(well) {
  const testResults = getDashboardResultsForWell(well);
  const rings = [];
  const wellType = getWellTypeKey(well.type);

  const wellValves = (well.christmasTree && well.christmasTree.valves) || [];
  if (wellValves.length === 0) {
    return [];
  }

  for (const valveDef of wellValves) {
    const valveId = valveDef.id;
    const valveLabel = valveDef.name || valveDef.id;
    const valveTests = testResults[valveId];

    if (!Array.isArray(valveTests) || valveTests.length === 0) {
      continue;
    }

    const latestResult = valveTests[valveTests.length - 1];
    if (!latestResult || typeof latestResult !== 'object') {
      continue;
    }

    const isTestPassed = latestResult.status === "pass";
    if (!isTestPassed) {
      window.currentWellContext = {
        name: well.name,
        id: well.id,
        wellObject: well
      };

      const { category, number } = getFailureCategoryAndNumber(latestResult);
      const failureCode = window.wellFailureModel.getFailureCode(category, number, wellType);
      const mitigatingAction = window.wellFailureModel.getMitigatingAction(failureCode);

      const failureDetails = {
        failureReason: (latestResult.failure_reasons || ["Test Failed"]).join(", "),
        failureCode: failureCode,
        matrixCategory: category,
        trafficLight: mitigatingAction ? mitigatingAction.trafficLight : 'red',
        matrixDescription: mitigatingAction ? mitigatingAction.description : 'Action required',
        wellType: wellType,
        testResult: latestResult,
        timestamp: new Date().toISOString()
      };

      const existingEscalation = window.escalationSystem.getEscalationForValve(well.name, valveId);

      if (!existingEscalation) {
        console.log(`[AUTO-ESCALATION] ${well.name} - ${valveLabel}`);
        window.escalationSystem.createEscalation(well.name, valveId, failureDetails, false, well.id);
      }

      rings.push({
        label: valveLabel,
        color: mitigatingAction ? mitigatingAction.color : 'red',
        message: `${failureDetails.failureReason} - ${failureDetails.matrixDescription}`,
        failureCode: failureCode,
        matrixCategory: category,
        failureNumber: number,
        trafficLight: failureDetails.trafficLight,
        valveId: valveId
      });
    }
  }

  const colorOrder = { red: 1, orange: 2, yellow: 3, green: 4 };
  rings.sort((a, b) => (colorOrder[a.color] || 99) - (colorOrder[b.color] || 99));

  return rings;
}



OTRO

div.onclick = () => {
  console.log(`Dashboard: Well clicked: ${well.name}`);

  if (typeof showSection === "function") {
    showSection('wells');

    setTimeout(() => {
      const wellDropdown = document.getElementById('wellDropdown');
      console.log(`Attempting to select well ${well.name} (${well.id}) in dropdown`);

      if (wellDropdown) {
        const option = Array.from(wellDropdown.options).find(opt =>
          String(opt.value) === String(well.id)
        );

        if (option) {
          console.log(`Found option for ${well.name}, selecting...`);
          wellDropdown.value = option.value;
          wellDropdown.dispatchEvent(new Event('change', { bubbles: true }));
          wellDropdown.dispatchEvent(new Event('input', { bubbles: true }));

          if (typeof onWellSelectionChange === "function") {
            onWellSelectionChange(well.id);
          }

          console.log(`Successfully selected well: ${well.name}`);
        } else {
          console.warn(`Option not found for well: ${well.name}`);
          console.log('Available options:', Array.from(wellDropdown.options).map(opt => opt.value));
        }
      } else {
        console.error('Well dropdown not found');
      }

      if (typeof displayWellDetails === "function") {
        displayWellDetails(well.id);
      }
      if (typeof renderWellDetail === "function") {
        renderWellDetail(well.id);
      }
    }, 300);
  } else {
    console.error('showSection function not available');
  }
};


OTRO

const option = Array.from(wellDropdown.options).find(opt => 
  String(opt.value) === String(well.id)
);


OTRO

onWellSelectionChange(well.id);
displayWellDetails(well.id);
renderWellDetail(well.id);
