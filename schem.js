async function renderWellSchematicAndPanel(wellId) {

  await loadValveTestStatuses(wellId);
  const wellConfig = (window.wells || []).find(w => w.id === wellId);
  const wellInlineLayout = document.getElementById('wellInlineLayout');
  const wellSchematicArea = document.getElementById('wellSchematicArea');
  const valveInputPanel = document.getElementById('valveInputPanel');

  if (!wellConfig || !wellInlineLayout || !wellSchematicArea || !valveInputPanel) {
    if (wellInlineLayout) wellInlineLayout.style.display = 'none';
    return;
  }
  wellInlineLayout.style.display = 'flex';

  // --- Schematic Loading Logic ---
  const schematicPath = wellConfig.christmasTree && wellConfig.christmasTree.schematic;
  if (schematicPath) {
    const fullSchematicURL = `http://10.226.112.213:5000${schematicPath}`;
    wellSchematicArea.innerHTML = `<div class="loading-schematic">Loading schematic...</div>`;
    try {
      const response = await fetch(fullSchematicURL);
      if (!response.ok) throw new Error(`Failed to load schematic file: ${response.statusText}`);
      const schematicSVG = await response.text();
      wellSchematicArea.innerHTML = `<span class="schematic-svg-preview" id="schematicSVGContainer">${schematicSVG}</span>`;
    } catch (error) {
      console.error("Error fetching schematic:", error);
      wellSchematicArea.innerHTML = `<div class="schematic-error">Could not load schematic from path: ${schematicPath}</div>`;
    }
  } else {
    wellSchematicArea.innerHTML = `<div class="schematic-error">No schematic associated with this well.</div>`;
  }

  // --- Fetch all valves and make them available ---
  let allValves = [];
  try {
    const valvesResponse = await fetch("http://10.226.112.213:5000/api/valves/");
    if (valvesResponse.ok) {
      allValves = await valvesResponse.json();
      window.allValves = allValves; // Make globally accessible
    } else {
      console.error("Failed to fetch valve list from API.");
    }
  } catch (error) {
    console.error("Error fetching valve list:", error);
  }

  const svg = wellSchematicArea.querySelector('svg');
  if (svg && allValves.length > 0) {
    // Use a short delay to ensure SVG has rendered
    setTimeout(() => {
      Array.from(svg.querySelectorAll('g')).forEach(g => {
        const texts = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
        
        const foundValve = allValves.find(v => texts.includes(v.name));
        
        if (foundValve) {
          g.style.cursor = 'pointer';
          
          let color = '#e6c23a'; // Default: Untested (yellow)

          // ====================================================================
          // THIS IS THE ONLY LINE THAT HAS BEEN CHANGED
          // We must use the well's NAME, not its ID, to look up test results.
          // ====================================================================
          const wellTests = window.valveTestResults[wellConfig.name];
          
          if (wellTests && wellTests[foundValve.id] && Array.isArray(wellTests[foundValve.id]) && wellTests[foundValve.id].length > 0) {
            const latestTest = wellTests[foundValve.id][wellTests[foundValve.id].length - 1]; 
            if (latestTest && typeof latestTest === 'object') {
              if (latestTest.pass && latestTest.test_valid && latestTest.leak_rate_pass) {
                color = '#19d219'; // Pass (green)
              } else {
                color = '#e64a3a'; // Fail (red)
              }
            }
          }
          
          const mainRect = g.querySelector('rect');
          if (mainRect) mainRect.setAttribute('fill', color);
          g.querySelectorAll('text').forEach(t => t.setAttribute('fill', '#000'));
          
          g.onclick = function(e) {
            e.stopPropagation();
            if (window.currentValvePanel === foundValve.id && valveInputPanel.style.display === 'block') {
              valveInputPanel.style.display = 'none';
              valveInputPanel.classList.remove('active');
              window.currentValvePanel = null;
            } else {
              showValveInputPanel(wellId, foundValve.id, foundValve.name);
              window.currentValvePanel = foundValve.id;
              console.log(`Clicked valve: ${foundValve.name} (ID: ${foundValve.id})`);
            }
          };
        }
      });
    }, 100); 
  }
  
  if (!window.currentValvePanel || !valveInputPanel.classList.contains('active')) {
     valveInputPanel.style.display = 'none';
  }
}