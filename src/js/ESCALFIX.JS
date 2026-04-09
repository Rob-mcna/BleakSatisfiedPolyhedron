


async function hydrateEscalationsFromDatabase() {
  try {
    if (!window.wells || !Array.isArray(window.wells)) return;

    const requests = [];

    (window.wells || []).forEach(well => {
      const valves = well?.christmasTree?.valves || [];
      valves.forEach(valve => {
        requests.push(
          fetch(`http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(well.id)}&valve=${encodeURIComponent(valve.id)}`)
            .then(async resp => {
              if (!resp.ok) return null;
              const data = await resp.json();
              if (!data || data.Error) return null;

              const trafficLight = typeof getTrafficLightFromCode === 'function'
                ? getTrafficLightFromCode(data.code)
                : 'red';

              return {
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
              };
            })
            .catch(() => null)
        );
      });
    });

    const results = await Promise.all(requests);
    const validEscalations = results.filter(Boolean);

    validEscalations.forEach(dbEsc => {
      const exists = window.escalationSystem.escalations.find(e =>
        e.dbId === dbEsc.dbId ||
        (e.wellId === dbEsc.wellId && e.valveId === dbEsc.valveId)
      );

      if (!exists) {
        window.escalationSystem.escalations.push(dbEsc);
      }
    });

    if (typeof updateEscalationButtonCount === 'function') {
      updateEscalationButtonCount();
    }

    if (typeof renderFilteredDashboard === 'function') {
      const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
      renderFilteredDashboard(currentFilter);
    }



window.hydrateEscalationsFromDatabase = hydrateEscalationsFromDatabase;
    console.log('Hydrated escalations from database:', validEscalations);
  } catch (error) {
    console.error('Failed to hydrate escalations from DB:', error);
  }
}




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
