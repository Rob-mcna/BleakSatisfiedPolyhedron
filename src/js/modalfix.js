async function showCreateBlockingValveRuleModal() {
  if (document.getElementById('createBlockingRuleModal')) return;

  let modal = document.createElement('div');
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

        <label>Select Primary Valve (the valve being tested):<br>
          <select name="primaryValveId" id="rulePrimaryValveId" required style="width:100%;" disabled>
            <option value="">Select a well first</option>
          </select>
        </label><br>

        <label>Select Blocking Valves and Enter Cavity Volumes:<br>
          <div id="blockingValvesContainer" style="border:1px solid #555; padding:10px; height:220px; overflow-y:auto; background:#fff;">
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
  let currentWellValves = [];

  try {
    const wellsRes = await fetch("http://127.0.0.1:5000/api/wells/");
    if (!wellsRes.ok) {
      throw new Error('Failed to fetch wells data for modal.');
    }

    wellsData = await wellsRes.json();

    wellDropdown.innerHTML =
      '<option value="">-- Select a Well --</option>' +
      wellsData.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  } catch (error) {
    console.error("Error initializing modal:", error);
    wellDropdown.innerHTML = `<option value="">Error loading wells</option>`;
    alert('Failed to load data needed to create a rule. Please check the console.');
    return;
  }

  wellDropdown.onchange = async () => {
    const selectedWellId = wellDropdown.value;

    primaryValveDropdown.innerHTML = '<option value="">Loading valves...</option>';
    primaryValveDropdown.disabled = true;
    blockingValvesContainer.innerHTML = '<em style="color:#999;">Select a primary valve first.</em>';
    currentWellValves = [];

    if (!selectedWellId) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/wells/${selectedWellId}`);
      if (!res.ok) throw new Error('Failed to fetch selected well');

      const selectedWell = await res.json();
      currentWellValves = selectedWell?.christmasTree?.valves || [];

      if (currentWellValves.length > 0) {
        primaryValveDropdown.innerHTML =
          '<option value="">-- Select Primary Valve --</option>' +
          currentWellValves.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
        primaryValveDropdown.disabled = false;
      } else {
        primaryValveDropdown.innerHTML = '<option value="">No valves found for this well</option>';
      }
    } catch (error) {
      console.error('Error loading valves for selected well:', error);
      primaryValveDropdown.innerHTML = '<option value="">Error loading valves</option>';
    }
  };

  primaryValveDropdown.onchange = () => {
    const primaryValveId = primaryValveDropdown.value;

    if (!primaryValveId) {
      blockingValvesContainer.innerHTML = '<em style="color:#999;">Select a primary valve first.</em>';
      return;
    }

    const allWellValves = currentWellValves || [];
    const potentialBlockingValves = allWellValves.filter(v => String(v.id) !== String(primaryValveId));

    if (potentialBlockingValves.length > 0) {
      blockingValvesContainer.innerHTML = potentialBlockingValves.map(valve => `
        <div style="display:flex; align-items:center; margin-bottom:8px;">
          <label style="flex-grow:1; cursor:pointer; display:flex; align-items:center;">
            <input type="checkbox" name="blockingValve" value="${valve.id}" style="margin-right:8px;">
            ${valve.name}
          </label>
          <label style="white-space:nowrap; margin-left:10px;">
            Cavity Volume (ft³):
            <input type="number" name="cavityVolume_${valve.id}" class="cavity-volume-input" min="0" step="0.01" style="width:80px;" disabled>
          </label>
        </div>
      `).join('');

      blockingValvesContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.onchange = (e) => {
          const volumeInput = blockingValvesContainer.querySelector(`[name="cavityVolume_${e.target.value}"]`);
          if (volumeInput) {
            volumeInput.disabled = !e.target.checked;
            if (!e.target.checked) volumeInput.value = '';
          }
        };
      });
    } else {
      blockingValvesContainer.innerHTML = '<em style="color:#999;">No other valves available to be blocking valves.</em>';
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();

    const wellId = form.wellId.value;
    const primaryValveId = form.primaryValveId.value;

    const selectedBlockingValves = Array.from(form.querySelectorAll('[name="blockingValve"]:checked'));
    if (selectedBlockingValves.length === 0) {
      alert('You must select at least one blocking valve.');
      return;
    }

    const rules = [];
    for (const checkbox of selectedBlockingValves) {
      const blockingValveId = checkbox.value;
      const cavityVolumeInput = form.querySelector(`[name="cavityVolume_${blockingValveId}"]`);
      const cavityVolume = parseFloat(cavityVolumeInput.value);

      if (isNaN(cavityVolume) || cavityVolume < 0) {
        const valve = currentWellValves.find(v => String(v.id) === String(blockingValveId));
        alert(`Please enter a valid, non-negative cavity volume for valve "${valve?.name || blockingValveId}".`);
        return;
      }

      rules.push({
        blocking_valve_id: blockingValveId,
        blocking_valve_value: cavityVolume
      });
    }

    const payload = {
      well_id: wellId,
      testing_valve_id: primaryValveId,
      blocking_valves: rules
    };

    try {
      const response = await fetch("http://127.0.0.1:5000/api/cavity_volumes/", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Blocking valve rules registered successfully!');
        modal.remove();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || errorData.Error || 'An unknown server error occurred.'}`);
      }
    } catch (error) {
      console.error('Client-side error while registering blocking valve rules:', error);
      alert('A client-side error occurred. Please check the console for details.');
    }
  };
}
