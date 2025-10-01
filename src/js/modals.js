
// --- FIXED: Function to show a modal for creating/registering a new valve ---

function showCreateValveModal() {
  // Prevent duplicate modals
  if (document.getElementById('createValveModal')) return;

  let modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'createValveModal';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="modal-content" style="min-width:400px;">
      <h3>Register New Valve</h3>
      <form id="createValveForm" autocomplete="off">
        <label>Valve Name/Abbreviation:<br>
          <input type="text" name="valveName" required style="width:100%;" placeholder="e.g., SCSSV, THDV, MWV">
        </label><br>
        
        <!-- This dropdown was correctly removed from the HTML, so the JS must also be fixed -->

        <div style="margin-top:18px;">
          <button type="submit" class="primary-btn">Register Valve</button>
          <button type="button" id="cancelCreateValveBtn" class="secondary-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // --- Event Listeners ---
  document.getElementById('cancelCreateValveBtn').onclick = () => modal.remove();

  // --- MODIFIED ONSUBMIT ---
  document.getElementById('createValveForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    
    const valveName = form.valveName.value.trim();
    // const applicableWellType = form.applicableWellType.value; // <-- REMOVED THIS LINE

    // --- Validation ---
    if (!valveName) { // <-- SIMPLIFIED VALIDATION
      alert('Valve Name is required.');
      return;
    }

    // --- API Payload ---
    const valveData = {
      name: valveName,
      // applicable_well_type: applicableWellType, // <-- REMOVED THIS LINE
      createdBy: 'Rob-mcna',
      createdDate: '2025-07-04 09:17:04'
    };

    try {
      // --- API Call ---
      const response = await fetch("http://10.226.113.28:5000/api/valves/", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valveData)
      });

      if (response.ok) {
        alert(`Valve "${valveName}" was registered successfully!`);
        modal.remove();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'An unknown error occurred.'}`);
      }
    } catch (error) {
      console.error('Client-side error while registering valve:', error);
      alert('A client-side error occurred. Please check the console.');
    }
  };
}


/**
 * Displays a modal form to register new Blocking Valve Rules.
 * A rule consists of a primary valve, a blocking valve, and the cavity volume between them for a specific well.
 */
async function showCreateBlockingValveRuleModal() {
  // Prevent duplicate modals
  if (document.getElementById('createBlockingRuleModal')) return;

  let modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'createBlockingRuleModal';
  modal.style.display = 'flex';

  // --- Initial HTML with loading states ---
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
          <div id="blockingValvesContainer" style="border:1px solid #555; padding:10px; height: 220px; overflow-y:auto; background:#fff;">
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

  // --- Get references to form elements ---
  const form = document.getElementById('createBlockingRuleForm');
  const wellDropdown = document.getElementById('ruleWellId');
  const primaryValveDropdown = document.getElementById('rulePrimaryValveId');
  const blockingValvesContainer = document.getElementById('blockingValvesContainer');
  document.getElementById('cancelCreateRuleBtn').onclick = () => modal.remove();

  // --- Data store ---
  let wellsData = [];

  // --- Fetch initial data needed for the form ---
  try {
    const wellsRes = await fetch("http://10.226.113.28:5000/api/wells/");
    if (!wellsRes.ok) {
        throw new Error('Failed to fetch wells data for modal.');
    }
    wellsData = await wellsRes.json();
    
    // Populate wells dropdown
    wellDropdown.innerHTML = '<option value="">-- Select a Well --</option>' + 
      wellsData.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

  } catch (error) {
    console.error("Error initializing modal:", error);
    wellDropdown.innerHTML = `<option value="">Error loading wells</option>`;
    alert('Failed to load data needed to create a rule. Please check the console.');
  }

  // --- Event Listener for Well Selection ---
  wellDropdown.onchange = () => {
    const selectedWellId = wellDropdown.value;
    primaryValveDropdown.innerHTML = '<option value="">Select a well first</option>';
    primaryValveDropdown.disabled = true;
    blockingValvesContainer.innerHTML = '<em style="color:#999;">Select a primary valve first.</em>';

    if (!selectedWellId) return;

    const selectedWell = wellsData.find(w => w.id === selectedWellId);
    
    if (selectedWell && selectedWell.christmasTree && selectedWell.christmasTree.valves) {
      const wellValves = selectedWell.christmasTree.valves;
      primaryValveDropdown.innerHTML = '<option value="">-- Select Primary Valve --</option>' +
        wellValves.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
      primaryValveDropdown.disabled = false;
    } else {
      primaryValveDropdown.innerHTML = '<option value="">No valves found for this well</option>';
    }
  };

  // --- Event Listener for Primary Valve Selection ---
  primaryValveDropdown.onchange = () => {
    const selectedWellId = wellDropdown.value;
    const primaryValveId = primaryValveDropdown.value;
    
    if (!primaryValveId) {
      blockingValvesContainer.innerHTML = '<em style="color:#999;">Select a primary valve first.</em>';
      return;
    }

    const selectedWell = wellsData.find(w => w.id === selectedWellId);
    const allWellValves = selectedWell?.christmasTree?.valves || [];
    
    // Filter for valves that are not the selected primary valve
    const potentialBlockingValves = allWellValves.filter(v => v.id !== primaryValveId);

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
      
      // Add event listeners to enable/disable volume input when checkbox is toggled
      blockingValvesContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.onchange = (e) => {
          const volumeInput = blockingValvesContainer.querySelector(`[name="cavityVolume_${e.target.value}"]`);
          if (volumeInput) {
            volumeInput.disabled = !e.target.checked;
            if(!e.target.checked) volumeInput.value = '';
          }
        };
      });

    } else {
      blockingValvesContainer.innerHTML = '<em style="color:#999;">No other valves available to be blocking valves.</em>';
    }
  };

  // --- Form Submission Logic ---
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
        // Find the valve name for a more user-friendly error message
        const well = wellsData.find(w => w.id === wellId);
        const valve = well?.christmasTree?.valves.find(v => v.id === blockingValveId);
        alert(`Please enter a valid, non-negative cavity volume for valve "${valve?.name || blockingValveId}".`);
        return; // Stop submission
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
      const response = await fetch("http://10.226.113.28:5000/api/cavity_volumes/", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Blocking valve rules registered successfully!');
        modal.remove();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'An unknown server error occurred.'}`);
      }
    } catch (error) {
      console.error('Client-side error while registering blocking valve rules:', error);
      alert('A client-side error occurred. Please check the console for details.');
    }
  };
}

async function showCreateChristmasTreeModal() {
  // Prevent duplicate modals
  if (document.getElementById('createChristmasTreeModal')) return;

  let modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'createChristmasTreeModal';
  modal.style.display = 'flex';

  // Fetch all available valves from the API to populate the checklist
  let allValves = [];
  try {
    const response = await fetch("http://10.226.113.28:5000/api/valves/");
    if (response.ok) {
      allValves = await response.json();
    } else {
      console.error("Failed to fetch valves for modal.");
    }
  } catch (error) {
    console.error("Error fetching valves:", error);
  }

  // Generate the checklist HTML from the fetched valves
  const valveChecklistHtml = allValves.length > 0 
    ? allValves.map(valve => `
        <label style="display:block; margin-bottom:5px; font-weight:normal; cursor:pointer;">
          <input type="checkbox" name="valves" value="${valve.id}">
          ${valve.name} <em style="color:#999; font-size:0.9em;">(${valve.applicable_well_type})</em>
        </label>
      `).join('')
    : `<em style="color:#ffc107;">No valves have been registered yet. Please register valves first.</em>`;

  modal.innerHTML = `
    <div class="modal-content" style="min-width:500px;">
      <h3>Create New Christmas Tree</h3>
      <form id="createChristmasTreeForm" autocomplete="off">
        <label>Tree Type Name:<br>
          <input type="text" name="treeType" required style="width:100%;" placeholder="e.g., A/C Producer - SSV">
        </label><br>

        <label>Select Applicable Valves:<br>
          <div id="valveSelectionContainer" style="border:1px solid #555; padding:10px; height: 220px; overflow-y:auto; background:#fff;">
            ${valveChecklistHtml}
          </div>
        </label><br>

        <label>Upload Schematic (.svg):<br>
          <input type="file" name="schematicFile" accept=".svg" style="width:100%;">
        </label><br>

        <div style="margin-top:18px;">
          <button type="submit" class="primary-btn">Create Christmas Tree</button>
          <button type="button" id="cancelCreateTreeBtn" class="secondary-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // --- Event Listeners ---

  // Cancel button
  document.getElementById('cancelCreateTreeBtn').onclick = () => modal.remove();

  // Form submission
  document.getElementById('createChristmasTreeForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    
    // Get the IDs of all checked valves
    const selectedValveIds = Array.from(form.querySelectorAll('[name="valves"]:checked')).map(cb => cb.value);

    // --- Validation ---
    if (!form.treeType.value.trim()) {
      alert('The "Tree Type Name" is required.');
      return;
    }
    if (selectedValveIds.length === 0) {
      alert('You must select at least one valve for this tree.');
      return;
    }

    // --- API Payload ---
    const formData = new FormData();
    formData.append('treeType', form.treeType.value.trim());
    formData.append('valves', JSON.stringify(selectedValveIds)); // Send valve IDs as a JSON string array
    formData.append('createdBy', 'Rob-mcna');
    formData.append('createdDate', '2025-07-04 08:19:00');
    console.log(formData)


    // Add the schematic file if one was selected
    if (form.schematicFile.files.length > 0) {
      formData.append('schematic', form.schematicFile.files[0]);
    }

    try {
      const response = await fetch("http://10.226.113.28:5000/api/wellheads/", {
        method: "POST",
   
        body: formData // Let the browser set the Content-Type for FormData

      });
      console.log(response)

      if (response.ok) {
        alert('Christmas Tree created successfully!');
        modal.remove();
        // Optionally, refresh any part of the UI that lists Christmas Trees
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'An unknown error occurred on the server.'}`);
      }
    } catch (error) {
      console.error('Client-side error while creating Christmas Tree:', error);
      alert('A client-side error occurred. Please check the console for details.');
    }
  };
}

function showCreateWellModal() {
  let modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'createWellModal';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="modal-content" style="min-width:340px;">
      <h3>Create New Well</h3>
      <form id="createWellForm" autocomplete="off">
        <label>Well Name/ID:<br>
          <input type="text" name="wellId" required style="width:100%;">
        </label><br>
        <label>Well Type:<br>
          <select name="wellType" required style="width:100%;">
            <option value="">Select type</option>
            <option value="producer">Producer</option>
            <option value="dual service">Dual Service</option>
          </select>
        </label><br>
        <label>Christmas Tree Type:<br>
          <select name="treeTypeId" required style="width:100%;" id="treeTypeDropdown">
            <option value="">Loading...</option>
          </select>
        </label><br>
        <label>Additional Metadata:<br>
          <input type="text" name="metadata" style="width:100%;" placeholder="Optional notes, etc.">
        </label><br>
        <div style="margin-top:18px;">
          <button type="submit" class="primary-btn">Create Well</button>
          <button type="button" id="cancelCreateWellBtn" class="secondary-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Fetch tree types for the dropdown
  fetch("http://10.226.113.28:5000/api/wellheads/")
  .then(r => r.json())
  .then(treeTypes => {
    const dropdown = document.getElementById('treeTypeDropdown');
    dropdown.innerHTML = '<option value="">Select tree type</option>' +
      treeTypes.map(tt => `<option value="${tt.id}">${tt.treeType}</option>`).join('');
  });
  document.getElementById('cancelCreateWellBtn').onclick = () => modal.remove();

  document.getElementById('createWellForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const newId = form.wellId.value.trim();
    const newType = form.wellType.value;
    const newTreeTypeId = form.treeTypeId.value;
    if (!newId || !newType || !newTreeTypeId) {
      alert('All fields are required.');
      return;
    }
    if ((window.wells || []).find(w => w.id === newId)) {
      alert('A well with this ID already exists.');
      return;
    }
    const newWellData = {
    
      name: newId,
      type: newType,
      treeType: newTreeTypeId,
      metadata: form.metadata.value || "",
      status: "active"
    };
    await fetch("http://10.226.113.28:5000/api/wells/", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWellData)
    });
    modal.remove();
    if (typeof renderWellsSection === "function") renderWellsSection();
    const wellDropdown = document.getElementById('wellDropdown');
    if (wellDropdown) {
      wellDropdown.value = newId;
      if (typeof wellDropdown.onchange === 'function') wellDropdown.onchange();
    }
  };
}