

// Load identification forms from localStorage
function loadIdentificationForms() {
  try { return JSON.parse(localStorage.getItem('wimt-identificationForms') || "[]"); } catch { return []; }
}

// Save identification forms to localStorage
function saveIdentificationForms(arr) {
  localStorage.setItem('wimt-identificationForms', JSON.stringify(arr));
}

// In-memory array for current session
let identificationForms = loadIdentificationForms();

// --- INTEGRATION WITH EXISTING FORM UI ---
// Reference to headers and wells must exist before this script is loaded!

function showIdentificationFormModal(existingId = null) {
  document.getElementById('identificationFormModal').style.display = 'flex';
  populatePlatforms();
  document.getElementById('idFormType').onchange = handleTypeChange;
  document.getElementById('idFormPlatform').onchange = handlePlatformChange;
  document.getElementById('idFormWellHeader').onchange = handleWellHeaderChange;
  document.getElementById('idFormSchematicInput').onchange = handleSchematicUpload;
  document.getElementById('idFormPhotoInput').onchange = handlePhotoUpload;
  resetIdentificationForm();

  // If editing, populate fields (optional, expand as needed)
  if (existingId) {
    const form = identificationForms.find(f => f.id === existingId);
    if (form) {
      document.getElementById('idFormPlatform').value = form.platform;
      handlePlatformChange();
      document.getElementById('idFormWellHeader').value = form.wellHeader;
      document.getElementById('idFormType').value = form.type;
      handleWellHeaderChange();
      // Preview images
      if (form.schematic) {
        document.getElementById('idFormSchematicPreview').innerHTML = `<img src="${form.schematic}" style="max-width:150px;">`;
      }
      if (form.photo) {
        document.getElementById('idFormPhotoPreview').innerHTML = `<img src="${form.photo}" style="max-width:100px;">`;
      }
    }
  }
}

function closeIdentificationFormModal() {
  document.getElementById('identificationFormModal').style.display = 'none';
}

function populatePlatforms() {
  const select = document.getElementById('idFormPlatform');
  select.innerHTML = '<option value="">Select Platform</option>';
  // Combine platforms from wells and headers for demo
  const platforms = Array.from(new Set([
    ...(typeof wells !== "undefined" ? wells.map(w => w.platform) : []),
    ...(typeof headers !== "undefined" ? headers.map(h => h.platform) : [])
  ]));
  platforms.forEach(p => {
    const option = document.createElement('option');
    option.value = p;
    option.textContent = p;
    select.appendChild(option);
  });
}

function handlePlatformChange() {
  const platform = document.getElementById('idFormPlatform').value;
  const type = document.getElementById('idFormType').value;
  const select = document.getElementById('idFormWellHeader');
  select.innerHTML = '<option value="">Select Well/Header</option>';
  let items = [];
  if (type === "well" && typeof wells !== "undefined") {
    items = wells.filter(w => w.platform === platform);
  } else if (type === "header" && typeof headers !== "undefined") {
    items = headers.filter(h => h.platform === platform);
  }
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.id;
    select.appendChild(option);
  });
  document.getElementById('idFormAutoFields').innerHTML = '';
  document.getElementById('idFormSchematicPreview').innerHTML = '';
  document.getElementById('idFormPhotoPreview').innerHTML = '';
}

function handleTypeChange() {
  handlePlatformChange(); // refresh well/header list
}

function handleWellHeaderChange() {
  // Auto-fill fields and display schematic/photo for selected item
  const type = document.getElementById('idFormType').value;
  const id = document.getElementById('idFormWellHeader').value;
  let obj = null;
  if (type === "well" && typeof wells !== "undefined") obj = wells.find(w => w.id === id);
  else if (type === "header" && typeof headers !== "undefined") obj = headers.find(h => h.id === id);

  if (obj) {
    let html = '';
    for (const key in obj) {
      if (["id","platform","schematic","photo"].includes(key)) continue;
      html += `<div><b>${key}:</b> ${obj[key]}</div>`;
    }
    document.getElementById('idFormAutoFields').innerHTML = html;
    // Load schematic/photo if available
    if (obj.schematic) {
      document.getElementById('idFormSchematicPreview').innerHTML = `<img src="${obj.schematic}" style="max-width:150px;">`;
    } else {
      document.getElementById('idFormSchematicPreview').innerHTML = '<span style="color:#888;">No schematic</span>';
    }
    if (obj.photo) {
      document.getElementById('idFormPhotoPreview').innerHTML = `<img src="${obj.photo}" style="max-width:100px;">`;
    } else {
      document.getElementById('idFormPhotoPreview').innerHTML = '<span style="color:#888;">No photo</span>';
    }
  } else {
    document.getElementById('idFormAutoFields').innerHTML = '';
    document.getElementById('idFormSchematicPreview').innerHTML = '';
    document.getElementById('idFormPhotoPreview').innerHTML = '';
  }
}

function handleSchematicUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(ev) {
      document.getElementById('idFormSchematicPreview').innerHTML = `<img src="${ev.target.result}" style="max-width:150px;">`;
    };
    reader.readAsDataURL(file);
  }
}
function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(ev) {
      document.getElementById('idFormPhotoPreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100px;">`;
    };
    reader.readAsDataURL(file);
  }
}

function resetIdentificationForm() {
  document.getElementById('identificationForm').reset();
  document.getElementById('idFormAutoFields').innerHTML = '';
  document.getElementById('idFormSchematicPreview').innerHTML = '';
  document.getElementById('idFormPhotoPreview').innerHTML = '';
}

// --- Save handler: now saves to array & localStorage ---
document.getElementById('identificationForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const form = e.target;
  // Gather form data
  const platform = form.idFormPlatform.value;
  const wellHeader = form.idFormWellHeader.value;
  const type = form.idFormType.value;
  // Generate a unique ID (platform + wellHeader + timestamp)
  const id = platform + "-" + wellHeader + "-" + type + "-" + Date.now();
  const schematic = document.getElementById('idFormSchematicPreview').querySelector('img')?.src || "";
  const photo = document.getElementById('idFormPhotoPreview').querySelector('img')?.src || "";

  const newForm = {
    id,
    platform,
    wellHeader,
    type,
    schematic,
    photo
    // Add more fields as needed
  };
  identificationForms.push(newForm);
  saveIdentificationForms(identificationForms);
  closeIdentificationFormModal();
  renderIdentificationFormsList();
  alert('Identification form saved.');
});

// --- List all identification forms in the Wells section ---
function renderIdentificationFormsList() {
  const containerId = 'identificationFormsList';
  let container = document.getElementById(containerId);
  if (!container) {
    // Optionally create a container if it doesn't exist
    container = document.createElement('div');
    container.id = containerId;
    // Insert after "wellList" for visibility in Wells section
    const wellsSection = document.getElementById('wellsSection');
    if (wellsSection) {
      wellsSection.insertBefore(container, wellsSection.querySelector('#wellList')?.nextSibling || wellsSection.firstChild);
    } else {
      document.body.appendChild(container); // fallback
    }
  }
  if (!identificationForms.length) {
    container.innerHTML = `<div style="color:#888;">No identification forms created yet.</div>`;
    return;
  }
  let html = `<h3>Identification Forms</h3>
    <table>
      <tr>
        <th>ID</th>
        <th>Platform</th>
        <th>Well/Header</th>
        <th>Type</th>
        <th>Actions</th>
      </tr>`;
  identificationForms.forEach((form, idx) => {
    html += `<tr>
      <td>${form.id}</td>
      <td>${form.platform}</td>
      <td>${form.wellHeader}</td>
      <td>${form.type}</td>
      <td>
        <button onclick="viewIdentificationForm(${idx})">View</button>
        <button onclick="deleteIdentificationForm(${idx})">Delete</button>
      </td>
    </tr>`;
  });
  html += `</table>`;
  container.innerHTML = html;
}

// Example: View details of an identification form
function viewIdentificationForm(idx) {
  const form = identificationForms[idx];
  let html = `
    <h3>Identification Form Details</h3>
    <ul>
      <li><b>ID:</b> ${form.id}</li>
      <li><b>Platform:</b> ${form.platform}</li>
      <li><b>Well/Header:</b> ${form.wellHeader}</li>
      <li><b>Type:</b> ${form.type}</li>
      <li><b>Schematic:</b><br>${form.schematic ? `<img src="${form.schematic}" style="max-width:150px;">` : 'None'}</li>
      <li><b>Photo:</b><br>${form.photo ? `<img src="${form.photo}" style="max-width:100px;">` : 'None'}</li>
    </ul>
    <button onclick="closeIdentificationFormDetails()">Close</button>
  `;
  let modal = document.getElementById('identificationFormDetailsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'identificationFormDetailsModal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-content" id="identificationFormDetailsContent"></div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('identificationFormDetailsContent').innerHTML = html;
  modal.style.display = 'flex';
}
function closeIdentificationFormDetails() {
  document.getElementById('identificationFormDetailsModal').style.display = 'none';
}
// Delete handler
function deleteIdentificationForm(idx) {
  if (!confirm("Are you sure you want to delete this identification form?")) return;
  identificationForms.splice(idx, 1);
  saveIdentificationForms(identificationForms);
  renderIdentificationFormsList();
}

// On page load, render the identification forms list (if in Wells section) and expose globally
document.addEventListener('DOMContentLoaded', () => {
  renderIdentificationFormsList();
  window.identificationForms = identificationForms; // for other modules (e.g. deviations)
});

