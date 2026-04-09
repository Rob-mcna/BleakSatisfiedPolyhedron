

async function hydrateEscalationsFromDatabase() {
  try {
    if (!window.wells || !Array.isArray(window.wells)) return;

    const hydrated = [];

    for (const well of window.wells) {
      const valves = well?.christmasTree?.valves || [];

      for (const valve of valves) {
        try {
          const resp = await fetch(
            `http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(well.id)}&valve=${encodeURIComponent(valve.id)}`,
            {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            }
          );

          if (!resp.ok) continue;

          const data = await resp.json();
          if (!data || data.Error) continue;

          const exists = window.escalationSystem.escalations.find(e =>
            (e.dbId && String(e.dbId) === String(data.id)) ||
            (String(e.wellId) === String(well.id) && String(e.valveId) === String(valve.id))
          );

          if (exists) continue;

          let trafficLight = 'red';
          if (typeof getTrafficLightFromCode === 'function') {
            trafficLight = getTrafficLightFromCode(data.code);
          }

          hydrated.push({
            id: `ESC-DB-${data.id}`,
            dbId: data.id,
            wellName: well.name,
            wellId: well.id,
            valveId: valve.id,
            status: 'open',
            priority: window.escalationSystem.getPriorityFromTrafficLight(trafficLight),
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            createdBy: data.createdBy || 'database',
            creatorRole: data.creatorRole || '',
            userInitiated: true,
            escalatedTo: data.escalatedTo || '',
            comments: [],
            acknowledgedAt: null,
            resolvedAt: null,
            failureDetails: {
              failureCode: data.code,
              matrixCategory: data.matrixCategory,
              failureReason: data.description,
              matrixDescription: data.requiredAction,
              trafficLight: trafficLight
            }
          });
        } catch (err) {
          console.warn(`Failed hydrating escalation for well ${well.id}, valve ${valve.id}`, err);
        }
      }
    }

    hydrated.forEach(esc => window.escalationSystem.escalations.push(esc));

    if (typeof updateEscalationButtonCount === 'function') {
      updateEscalationButtonCount();
    }

    console.log('Hydrated escalations from DB:', hydrated);
  } catch (error) {
    console.error('Error hydrating escalations from database:', error);
  }
}

window.hydrateEscalationsFromDatabase = hydrateEscalationsFromDatabase;



.then(async () => {
  console.log("Dashboard: Well data and valve test results fetched successfully.");

  if (typeof hydrateEscalationsFromDatabase === "function") {
    await hydrateEscalationsFromDatabase();
  }

  renderMultiRingDashboardWithFilter();

  if (typeof renderWellsSection === "function" && document.getElementById('wellList')) {
    renderWellsSection();
  }
})
