// --- WELL → PRIMARY VALVE ---
wellDropdown.onchange = () => {
  const selectedWellId = Number(wellDropdown.value);

  primaryValveDropdown.innerHTML = '<option value="">-- Select Primary Valve --</option>';
  primaryValveDropdown.disabled = true;
  blockingValvesContainer.innerHTML =
    '<em style="color:#999;">Select a primary valve first.</em>';

  if (!selectedWellId) return;

  const selectedWell = wellsData.find(w => Number(w.id) === selectedWellId);
  const valves =
    selectedWell?.christmasTree?.valves ||
    selectedWell?.christmas_tree?.valves ||
    [];

  if (!valves.length) {
    primaryValveDropdown.innerHTML = '<option value="">No valves found</option>';
    return;
  }

  primaryValveDropdown.innerHTML += valves
    .map(v => `<option value="${v.id}">${v.name}</option>`)
    .join('');

  primaryValveDropdown.disabled = false;
};

// --- PRIMARY VALVE → BLOCKING VALVES ---
primaryValveDropdown.onchange = () => {
  const selectedWellId = Number(wellDropdown.value);
  const primaryValveId = Number(primaryValveDropdown.value);

  if (!primaryValveId) return;

  const selectedWell = wellsData.find(w => Number(w.id) === selectedWellId);
  const valves =
    selectedWell?.christmasTree?.valves ||
    selectedWell?.christmas_tree?.valves ||
    [];

  const blocking = valves.filter(v => Number(v.id) !== primaryValveId);

  blockingValvesContainer.innerHTML = blocking.map(v => `
    <div>
      <label>
        <input type="checkbox" value="${v.id}" name="blockingValve">
        ${v.name}
      </label>
      <input type="number"
             name="cavityVolume_${v.id}"
             min="0" step="0.01"
             disabled>
    </div>
  `).join('');

  blockingValvesContainer
    .querySelectorAll('input[type="checkbox"]')
    .forEach(cb => {
      cb.onchange = () => {
        const input = blockingValvesContainer.querySelector(
          `[name="cavityVolume_${cb.value}"]`
        );
        input.disabled = !cb.checked;
        if (!cb.checked) input.value = '';
      };
    });
};
