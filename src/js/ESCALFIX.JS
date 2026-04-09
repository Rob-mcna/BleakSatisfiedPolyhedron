(async () => {
  const hits = [];
  const misses = [];

  for (const well of (window.wells || [])) {
    for (const valve of (well.christmasTree?.valves || [])) {
      const url = `http://127.0.0.1:5000/api/integrity_test/failure?well=${encodeURIComponent(well.id)}&valve=${encodeURIComponent(valve.id)}`;

      try {
        const resp = await fetch(url);
        const data = await resp.json().catch(() => null);

        if (resp.ok && data && !data.Error) {
          hits.push({
            wellName: well.name,
            wellId: well.id,
            valveName: valve.name,
            valveId: valve.id,
            data
          });
        } else {
          misses.push({
            wellName: well.name,
            valveName: valve.name,
            response: data
          });
        }
      } catch (e) {
        misses.push({
          wellName: well.name,
          valveName: valve.name,
          response: String(e)
        });
      }
    }
  }

  console.log('HITS COUNT =', hits.length);
  console.log('FIRST HITS =', hits.slice(0, 10));
  console.log('FIRST MISSES =', misses.slice(0, 10));
})();

async function hydrateEscalationsFromDatabase() {
  try {
    const resp = await fetch('http://127.0.0.1:5000/api/integrity_test/failures', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) {
      console.error('Failed to load escalations from DB');
      return;
    }

    const rows = await resp.json();
    if (!Array.isArray(rows)) {
      console.warn('Unexpected failures payload:', rows);
      return;
    }

    rows.forEach(data => {
      const exists = window.escalationSystem.escalations.find(e =>
        (e.dbId && String(e.dbId) === String(data.id)) ||
        (String(e.wellId) === String(data.wellId) && String(e.valveId) === String(data.valveId))
      );

      if (exists) return;

      let trafficLight = 'red';
      if (typeof getTrafficLightFromCode === 'function') {
        trafficLight = getTrafficLightFromCode(data.code);
      }

      window.escalationSystem.escalations.push({
        id: `ESC-DB-${data.id}`,
        dbId: data.id,
        wellName: data.wellName,
        wellId: data.wellId,
        valveId: data.valveId,
        status: 'open',
        priority: window.escalationSystem.getPriorityFromTrafficLight(trafficLight),
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        createdBy: 'database',
        creatorRole: '',
        userInitiated: true,
        escalatedTo: '',
        comments: [],
        acknowledgedAt: null,
        resolvedAt: null,
        failureDetails: {
          failureCode: data.code,
          matrixCategory: data.matrixCategory,
          failureReason: data.description,
          matrixDescription: data.requiredAction,
          trafficLight
        }
      });
    });

    if (typeof updateEscalationButtonCount === 'function') {
      updateEscalationButtonCount();
    }

    console.log('Hydrated escalations:', window.escalationSystem.escalations);
  } catch (error) {
    console.error('Error hydrating escalations from DB:', error);
  }
}

window.hydrateEscalationsFromDatabase = hydrateEscalationsFromDatabase;
