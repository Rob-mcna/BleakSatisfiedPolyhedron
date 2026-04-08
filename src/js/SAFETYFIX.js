    const valveName = String(valve.name || '').toUpperCase();

    // Check valve name only
    SAFETY_VALVE_TYPES.forEach(safetyType => {
      if (valveName.includes(safetyType)) {


function evaluateWellSafetySystem(well) {
  const testResults =
    (window.valveTestResults && window.valveTestResults[well.id]) ||
    (window.valveTestResults && window.valveTestResults[well.name]) ||
    {};


    if (!well || typeof well.id === 'undefined') return;
    if (renderedWells.has(String(well.id))) return;

    renderedWells.add(String(well.id));

    div.className = "well-multiring safety-system";
    div.dataset.wellId = well.id;



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
