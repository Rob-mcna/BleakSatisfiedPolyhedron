/**
 * Displays a modal form to register new Blocking Valve Rules.
 */
async function showCreateBlockingValveRuleModal() {
  if (document.getElementById('createBlockingRuleModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'createBlockingRuleModal';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="modal-content" style="min-width:550px;">
      <h3>Register New Blocking Valve Rule</h3>
      <form id="createBlockingRuleForm" autocomplete="off">

        <label>Select Well:<br>
          <select name="wellId" id="ruleWellId" required style="width:100%;">
            <option value="">Loading wells...</option>
          </select>
        </label><br>

        <label>Select Primary Valve:<br>
          <select name="primaryValveId" id="rulePrimaryValveId" required style="width:100%;" disabled>
            <option value="">Select a well first</option>
          </select>
        </label><br>

        <label>Blocking Valves & Cavity Volumes:<br>
          <div id="blockingValvesContainer"
               style="border:1px solid #555; padding:10px; height:220px; overflow-y:auto;">
            <em style="color:#999;">Select a primary valve first.</em>
          </div>
        </label><br>

        <div style="margin-top:18px;">
          <button type="submit" class="primary-btn">Register Rules</button>
          <button type="button" id="cancelCreateRuleBtn" class="secondary-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById('createBlockingRuleForm');
  const wellDropdown = document.getElementById('ruleWellId');
  const primaryValveDropdown = document.getElementById('rulePrimaryValveId');
  const blockingValvesContainer = document.getElementById('blockingValvesContainer');

  document.getElementById('cancelCreateRuleBtn').onclick = () => modal.remove();

  let wellsData = [];

  // --- LOAD WELLS ---
  const wellsRes = await fetch("http://127.0.0.1:5000/api/wells/");
  wellsData = await wellsRes.json();

  wellDropdown.innerHTML =
    '<option value="">-- Select a Well --</option>' +
    wellsData.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

  // --- WELL → PRIMARY VALVE ---
  wellDropdown.onchange = () => {
    const wellId = Number(wellDropdown.value);

    primaryValveDropdown.disabled = true;
    primaryValveDropdown.innerHTML =
      '<option value="">-- Select Primary Valve --</option>';

    blockingValvesContainer.innerHTML =
      '<em style="color:#999;">Select a primary valve first.</em>';

    if (!wellId) return;

    const well = wellsData.find(w => Number(w.id) === wellId);
    const valves =
      well?.christmasTree?.valves ||
      well?.christmas_tree?.valves ||
      [];

    if (!valves.length) {
      primaryValveDropdown.innerHTML =
        '<option value="">No valves found</option>';
      return;
    }

    primaryValveDropdown.innerHTML += valves
      .map(v => `<option value="${v.id}">${v.name}</option>`)
      .join('');

    primaryValveDropdown.disabled = false;
  };

  // --- PRIMARY VALVE → BLOCKING VALVES ---
  primaryValveDropdown.onchange = () => {
    const wellId = Number(wellDropdown.value);
    const primaryValveId = Number(primaryValveDropdown.value);

    if (!primaryValveId) return;

    const well = wellsData.find(w => Number(w.id) === wellId);
    const valves =
      well?.christmasTree?.valves ||
      well?.christmas_tree?.valves ||
      [];

    const blockingValves = valves.filter(v => Number(v.id) !== primaryValveId);

    if (!blockingValves.length) {
      blockingValvesContainer.innerHTML =
        '<em style="color:#999;">No blocking valves available.</em>';
      return;
    }

    blockingValvesContainer.innerHTML = blockingValves.map(v => `
      <div style="margin-bottom:8px;">
        <label>
          <input type="checkbox" name="blockingValve" value="${v.id}">
          ${v.name}
        </label>
        <input type="number"
               name="cavityVolume_${v.id}"
               min="0" step="0.01"
               style="width:80px; margin-left:10px;"
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

  // --- SUBMIT ---
  form.onsubmit = async e => {
    e.preventDefault();

    const wellId = Number(form.wellId.value);
    const primaryValveId = Number(form.primaryValveId.value);

    const rules = Array.from(
      form.querySelectorAll('[name="blockingValve"]:checked')
    ).map(cb => ({
      blocking_valve_id: Number(cb.value),
      blocking_valve_value: Number(
        form.querySelector(`[name="cavityVolume_${cb.value}"]`).value
      )
    }));

    if (!rules.length) {
      alert('Select at least one blocking valve.');
      return;
    }

    await fetch("http://127.0.0.1:5000/api/cavity_volumes/", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        well_id: wellId,
        testing_valve_id: primaryValveId,
        blocking_valves: rules
      })
    });

    modal.remove();
  };
}
