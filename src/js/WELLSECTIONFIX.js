function sameId(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

function getWellByIdSafe(wellId) {
  return (window.wells || []).find(w => sameId(w.id, wellId)) || null;
}

function ensureWellStores(wellId) {
  if (!window.valveTestResults[wellId]) window.valveTestResults[wellId] = {};
  if (!window.selectedValveTestIndex[wellId]) window.selectedValveTestIndex[wellId] = {};
  if (!window.valveTestWarnings) window.valveTestWarnings = {};
  if (!window.valveTestWarnings[wellId]) window.valveTestWarnings[wellId] = {};
}

OTRO

const wellNameStr = getWellByIdSafe(currentWellId)?.name || currentWellId;

OTRO
const valveDef = (window.allValves || []).find(v => sameId(v.id, currentValveId));

OTRO
ensureWellStores(currentWellId);
if (!Array.isArray(window.valveTestResults[currentWellId][currentValveId])) {
    window.valveTestResults[currentWellId][currentValveId] = [];
}

OTRO

finalValidatedResult.valve_id = currentValveId;
finalValidatedResult.valve_type = valveName;

OTRO
ensureWellStores(currentWellId);
window.selectedValveTestIndex[currentWellId][currentValveId] =
    window.valveTestResults[currentWellId][currentValveId].length - 1;

OTRO
ensureWellStores(currentWellId);
window.valveTestWarnings[currentWellId][currentValveId] = finalValidatedResult.failure_reasons.slice();

OTRO
const valve = window.allValves.find(v => sameId(v.id, valveId));

OTRO
const well = getWellByIdSafe(wellId);

OTRO
if (typeof loadValveTestStatuses === "function") {
    await loadValveTestStatuses(currentWellId);
}

// PLACE THE await Promise.all HERE
await Promise.all([
  renderValveTestResultsPanel(currentWellId),
  renderWellSchematicAndPanel(currentWellId),
  updateDashboardAfterTest(currentWellId)
]);
console.log('valveTestResults before rendering:', JSON.parse(JSON.stringify(window.valveTestResults)));
