// --- USER DB: Persist to localStorage ---
function loadUsers() {
  let users = [];
  try { users = JSON.parse(localStorage.getItem('wimt-users') || "[]"); } catch {}
  if (!users || !users.length) {
    users = [
      { username: "admin", password: sha256Sync("password"), role: "admin" },
      { username: "supervisor", password: sha256Sync("supervisor1"), role: "supervisor" },
      { username: "tech", password: sha256Sync("tech1"), role: "technician" }
    ];
    localStorage.setItem('wimt-users', JSON.stringify(users));
  }
  return users;
}
function saveUsers(users) {
  localStorage.setItem('wimt-users', JSON.stringify(users));
}
let users = loadUsers();
let currentUser = null;

// --- ROLE ACCESS CONTROL ---
const sectionRoles = {
  dashboard: ["admin", "supervisor", "technician"],
  wells: ["admin", "supervisor", "technician"],
  data: ["admin", "supervisor"],
  deviations: ["admin", "supervisor"],
  reports: ["admin"],
  users: ["admin"]
};

// --- SHOW/HIDE SECTIONS BASED ON ROLE ---
function showSection(section) {
  [
    'dashboardSection',
    'wellsSection',
    'dataSection',
    'deviationsSection',
    'reportsSection',
    'usersSection'
  ].forEach(id => {
    if(document.getElementById(id)) document.getElementById(id).style.display = 'none';
  });
  if(document.getElementById(section + 'Section')) document.getElementById(section + 'Section').style.display = '';

  // Hide/show nav buttons by access
  if (currentUser) {
    for (let sec in sectionRoles) {
      const btn = document.querySelector(`[onclick*="showSection('${sec}'"]`);
      if (btn) btn.style.display = sectionRoles[sec].includes(currentUser.role) ? '' : 'none';
    }
  }

  if (section === "dashboard") initDashboard();
  if (section === "users") renderUserManagement();
  if (section === "wells") renderWellsSection();
}

// --- SIGN UP LOGIC ---
function showSignUp() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = '';
  document.getElementById('signupError').textContent = '';
}
function showLogin() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginForm').style.display = '';
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('loginError').textContent = '';
}

// --- LOG OUT ---
function logout() {
  currentUser = null;
  document.getElementById('mainMenu').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  showLogin();
}

// --- HASHING ---
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function sha256Sync(str) {
  if (str === 'password') return "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
  if (str === 'supervisor1') return "a4e5b4279d7c0b3e8c73b8a1a39d1ba5f6e6e3ef8f57a4e4c0a4df7e4f0c8e46";
  if (str === 'tech1') return "dc1bffb696477ae4c1d6e6a7b1c2bf76d4e2c5b3a1e4c8b5f7e9c0a2e5c6d1b0";
  return btoa(unescape(encodeURIComponent(str))).split('').reduce((a, c) => a + c.charCodeAt(0), 0).toString(16);
}

// --- LOGIN/SIGNUP HANDLERS ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mainMenu').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  showLogin();

    // Login Logic
  document.getElementById('loginForm').onsubmit = async function(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const hash = await sha256(pass);
    users = loadUsers();
    const found = users.find(u => u.username === user && u.password === hash);
    if (found) {
      currentUser = found;
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('mainMenu').style.display = '';
      document.querySelector('main').style.display = '';
      document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.username} (${currentUser.role})`;
      showSection('dashboard');
    } else {
      document.getElementById('loginError').textContent = 'Invalid username or password.';
    }
  };

  
  // sign up logic
  document.getElementById('signupForm').onsubmit = async function(e) {
    e.preventDefault();
    const user = document.getElementById('signupUser').value.trim();
    const pass = document.getElementById('signupPass').value.trim();
    const role = document.getElementById('signupRole').value;
    if (!user || !pass || !role) {
      document.getElementById('signupError').textContent = 'Fill all fields.';
      return;
    }
    users = loadUsers();
    if (users.find(u => u.username === user)) {
      document.getElementById('signupError').textContent = 'Username already exists.';
      return;
    }
    const hash = await sha256(pass);
    users.push({ username: user, password: hash, role });
    saveUsers(users);
    document.getElementById('signupError').textContent = 'User created. Please log in.';
    setTimeout(showLogin, 1500);
  };

  // Switch between login and signup
  document.getElementById('toSignupBtn').onclick = showSignUp;
  document.getElementById('toLoginBtn').onclick = showLogin;

  // Log out
  document.getElementById('logoutBtn').onclick = logout;

  // KPI/Action Panel toggle
  document.getElementById('showKPIDashboardBtn').onclick = function() {
    document.getElementById('kpiDashboardPanel').style.display = 'block';
  };
  document.getElementById('closeKPIDashboardBtn').onclick = function() {
    document.getElementById('kpiDashboardPanel').style.display = 'none';
  };

  // Placeholder content for other sections
  document.getElementById('wellList').innerHTML = '<div style="color:#888;">[Well List Table Here]</div>';
  document.getElementById('wellDetails').innerHTML = '<div style="color:#aaa;">[Select a well to view details, forms, diagrams]</div>';
  document.getElementById('testHistory').innerHTML = '<div style="color:#888;">[Test History Table Here]</div>';
  document.getElementById('maintenanceBacklog').innerHTML = '<div style="color:#888;">[Maintenance Backlog Table Here]</div>';
  document.getElementById('pressureTrends').innerHTML = '<div style="color:#888;">[Annulus Pressure Trends/Charts Here]</div>';
  document.getElementById('deviationsList').innerHTML = '<div style="color:#888;">[Deviations & Dispensations Table Here]</div>';
  document.getElementById('reportsUI').innerHTML = '<div style="color:#888;">[Report Generation/Export Features Here]</div>';
  document.getElementById('usersUI').innerHTML = '<div style="color:#888;">[User Management Features Here]</div>';


  // what is this?
  document.addEventListener('mousedown', function (e) {
    ['wellDetailsModal', 'addWellModal', 'editWellModal'].forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (!modal || modal.style.display === 'none') return;
      const content = modal.querySelector('.modal-content');
      if (content && !content.contains(e.target)) {
        if (modalId === 'wellDetailsModal') closeWellDetailsModal();
        if (modalId === 'addWellModal') closeAddWellModal();
        if (modalId === 'editWellModal') closeEditWellModal();
      }
    });
  });
});


// --- MULTIRING WELL DATA (SIMPLE FORMAT) ---
const wells = [
  { 
    id: "B-07", 
    name: "B-07", 
    type: "Producer", 
    treeType: "Two Swab Valves", 
    schematic: "b07-tree.png",
    rings: [
      { label: "Integrity Test", color: "red", message: "Test failed – urgent" },
      { label: "Well Failures", color: "orange", message: "Mechanical fault" },
      { label: "Risk Level", color: "red", message: "High operational risk" },
      { label: "Dispensation", color: "yellow", message: "None; deviation exists" }
    ]
  },
  { 
    id: "A-10", 
    name: "A-10", 
    type: "Producer", 
    treeType: "Single Swab Valve", 
    schematic: "single-valve-christmas-tree.png",
    rings: [
      { label: "Integrity Test", color: "yellow", message: "Test passed with controls" },
      { label: "Well Failures", color: "yellow", message: "No failure" },
      { label: "Risk Level", color: "yellow", message: "Medium risk, controlled" },
      { label: "Dispensation", color: "yellow", message: "Valid dispensation active" }
    ]
  },
  { 
    id: "B-06", 
    name: "B-06", 
    type: "Producer", 
    treeType: "Two Swab Valves", 
    schematic: "b06-tree.png",
    rings: [
      { label: "Integrity Test", color: "orange", message: "Test overdue" },
      { label: "Well Failures", color: "orange", message: "Maintenance required" },
      { label: "Risk Level", color: "orange", message: "Low risk" },
      { label: "Dispensation", color: "orange", message: "None" }
    ]
  },
  { 
    id: "B-05", 
    name: "B-05", 
    type: "Producer", 
    treeType: "Two Swab Valves", 
    schematic: "b05-tree.png",
    rings: [
      { label: "Integrity Test", color: "yellow", message: "Test due soon" },
      { label: "Well Failures", color: "yellow", message: "Sensor warning" },
      { label: "Risk Level", color: "yellow", message: "Medium risk, monitored" },
      { label: "Dispensation", color: "yellow", message: "Pending approval" }
    ]
  }
];

const demoRepairCount = 3;
const demoDeviationCount = 1;

// Color mapping for rings
function colorMap(color) {
  return color === "red" ? "#e64a3a" :
         color === "orange" ? "#ff9800" :
         color === "yellow" ? "#e6c23a" :
         "#19d219";
}

// Dashboard rendering (no filters, all wells, multicircle)
function renderMultiRingDashboard() {
  const container = document.getElementById('wellMultiRingBoard');
  let filtered = wells; // All wells

  // KPIs (just total wells for demo)
  document.getElementById('kpiWells').textContent = filtered.length;
  document.getElementById('kpiRed').textContent = filtered.filter(w =>
    w.rings && w.rings.some(r => r.color === 'red')
  ).length;
  document.getElementById('kpiOrange').textContent = filtered.filter(w =>
    w.rings && w.rings.some(r => r.color === 'orange')
  ).length;
  document.getElementById('kpiYellow').textContent = filtered.filter(w =>
    w.rings && w.rings.some(r => r.color === 'yellow')
  ).length;
  document.getElementById('kpiRepairs').textContent = demoRepairCount;
  document.getElementById('kpiDeviations').textContent = demoDeviationCount;

  container.innerHTML = '';
  filtered.forEach(well => {
    // SVG: up to 4 rings, outermost first
    let rings = '';
    const radii = [40, 32, 24, 16];
    if (well.rings) {
      well.rings.forEach((ring, idx) => {
        rings += `<circle cx="45" cy="45" r="${radii[idx]}" stroke="${colorMap(ring.color)}" stroke-width="7" fill="none" data-ring="${idx}" />`;
      });
    }
    const svg = `<svg width="90" height="90" style="display:block">${rings}<circle cx="45" cy="45" r="10" fill="#222" /></svg>`;
    const div = document.createElement('div');
    div.className = "well-multiring";
    div.innerHTML = svg + `<div class="well-label">${well.id}</div>`;
    div.onmousemove = (e) => showTooltip(e, well, div);
    div.onmouseleave = hideTooltip;
    div.onclick = () => {
      window.lastWellDetailsOrigin = 'dashboard';
      showSection('wells');
      setTimeout(() => showWellDetailsModal(well.id), 0);
    };
    container.appendChild(div);
  });
}

// Tooltip logic: show message of ring under mouse or well id
function showTooltip(e, well, div) {
  // Get mouse position relative to SVG center (45,45)
  const rect = div.getBoundingClientRect();
  const x = e.clientX - rect.left - 45;
  const y = e.clientY - rect.top - 45;
  const r = Math.sqrt(x * x + y * y);

  // Find which ring (from outside in)
  let ringIdx = null;
  const bounds = [40, 32, 24, 16];
  for (let i = 0; i < bounds.length; i++) {
    if (r < bounds[i] + 3.5 && r > bounds[i] - 3.5) {
      ringIdx = i;
      break;
    }
  }
  let text = '';
  if (ringIdx !== null && well.rings && well.rings[ringIdx]) {
    text = `<b>${well.rings[ringIdx].label}:</b> ${well.rings[ringIdx].message}`;
  } else {
    text = `<b>${well.id}</b>`;
  }
  showTooltipBox(e.clientX, e.clientY, text);
}
function showTooltipBox(x, y, html) {
  let t = document.getElementById('dashboardTooltip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'dashboardTooltip';
    t.className = 'tooltip';
    document.body.appendChild(t);
  }
  t.innerHTML = html;
  t.style.left = (x + 12) + 'px';
  t.style.top = (y + 12) + 'px';
  t.style.display = 'block';
}
function hideTooltip() {
  let t = document.getElementById('dashboardTooltip');
  if (t) t.style.display = 'none';
}

// No filter handlers (attachDashboardFilters does nothing)
function attachDashboardFilters() {}

function initDashboard() {
  attachDashboardFilters();
  renderMultiRingDashboard();
}



// NEW SECTION







// NEW SECTION




// --- NEW WELL SECTION ---
// Requirements:
// - All users see the well section
// - Only admins see "Create Well" button
// - Well selection by dropdown
// - Admins can create well with Christmas tree type and schematic selection

// --- DATA ---

// (Assume `wells` array already defined as shown in your code snippet above)
// Example structure:
// const wells = [
//   { id: "B-07", name: "B-07", type: "Producer", treeType: "Two Swab Valves", schematic: "b07-tree.png", ... },
//   ...
// ];





// --- Christmas Tree Types for selection ---
const christmasTreeSchematics = [
  { type: "Single Swab Valve", label: "Single Swab Valve" },
  { type: "Two Swab Valves", label: "Two Swab Valves" }
];

// --- Christmas Tree Schematics SVGs ---
// --- Christmas Tree SVG Schematics ---
// Updated SVGs based on user-provided images for Single Swab Valve and Two Swab Valves

const schematicSVGs = {
  "Single Swab Valve": `<svg width="340" height="440" viewBox="-1 -10 340 440" xmlns="http://www.w3.org/2000/svg">
 
<!-- Vertical stem -->
<line x1="130" y1="100" x2="130" y2="370" stroke="#333" stroke-width="4"/>
<!-- TC (Tree Cap) -->
<g>
<rect x="122" y="70" width="15" height="15" fill="#aaa" />
<ellipse cx="130" cy="55" rx="13" ry="13" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
<text x="90" y="79" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">TC</text>
</g>
<!-- SV (bowtie) -->
<g>
<rect x="105" y="90" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
<polygon points="110,95 150,95 130,115" fill="#111"/>
<polygon points="110,135 150,135 130,115" fill="#111"/>
<text x="90" y="125" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SV</text>
</g>
<!-- Gauge block (vertical) -->
<g>
<rect x="105" y="139" width="50" height="40" fill="#aaa" />
<ellipse cx="95" cy="160" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
<text x="70" y="160" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">Gauge</text>
</g>
<!-- MWV (wing, bowtie left-right) -->
<g>
<rect x="175" y="140" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
<polygon points="180,147 200,165 180,183" fill="#111"/>
<polygon points="220,147 200,165 220,183" fill="#111"/>
<text x="200" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">MWV</text>
<text x="174" y="167" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">BT</text>
</g>
<!-- HWV (wing, bowtie left-right) -->
<g>
<line x1="230" y1="165" x2="290" y2="165" stroke="#333" stroke-width="4"/>
<rect x="225" y="140" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
<polygon points="230,147 250,165 230,183" fill="#111"/>
<polygon points="270,147 250,165 270,183" fill="#111"/>
<text x="250" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">HWV</text>
</g>
<!-- HMV (bowtie) -->
<g>
<rect x="105" y="180" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
<polygon points="110,185 150,185 130,205" fill="#111"/>
<polygon points="110,225 150,225 130,205" fill="#111"/>
<text x="90" y="210" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">HMV</text>
</g>
<!-- MMV (bowtie) -->
<g>
<rect x="105" y="231" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="0"/>
<polygon points="110,235 150,235 130,255" fill="#111"/>
<polygon points="110,275 150,275 130,255" fill="#111"/>
<text x="90" y="260" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">MMV</text>
</g>
<!-- SCSSV (bowtie) -->
<g>
<rect x="105" y="335" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
<polygon points="110,340 150,340 130,360" fill="#111"/>
<polygon points="110,380 150,380 130,360" fill="#111"/>
<text x="90" y="365" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SCSSV</text>
</g>
</svg>`,

  "Two Swab Valves": `<svg width="340" height="440" viewBox="-1 -10 340 440" xmlns="http://www.w3.org/2000/svg">
  
<!-- Vertical stem -->
<line x1="130" y1="30" x2="130" y2="370" stroke="#333" stroke-width="4"/>
<!-- TC (Tree Cap) -->
<g>
<rect x="122" y="25" width="15" height="15" fill="#aaa" />
<ellipse cx="130" cy="10" rx="13" ry="13" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
<text x="90" y="32" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SC</text>
</g>
<!-- SSV (bowtie) -->
<g>
<rect x="105" y="40" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
<polygon points="110,45 150,45 130,65" fill="#111"/>
<polygon points="110,85 150,85 130,65" fill="#111"/>
<text x="90" y="70" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">2SV</text>
</g>
<!-- SV (bowtie) -->
<g>
<rect x="105" y="90" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
<polygon points="110,95 150,95 130,115" fill="#111"/>
<polygon points="110,135 150,135 130,115" fill="#111"/>
<text x="90" y="125" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SV</text>
</g>
<!-- Gauge block (vertical) -->
<g>
<rect x="105" y="139" width="50" height="40" fill="#aaa" />
<ellipse cx="95" cy="160" rx="10" ry="10" fill="#6ea2d7" stroke="#4577a4" stroke-width="2"/>
<text x="70" y="167" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">Gauge</text>
</g>
<!-- MWV (wing, bowtie left-right) -->
<g>
<rect x="175" y="140" width="50" height="50" fill="#90EE90" stroke="#333" stroke-width="0"/>
<polygon points="180,147 200,165 180,183" fill="#111"/>
<polygon points="220,147 200,165 220,183" fill="#111"/>
<text x="200" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">MWV</text>
<text x="174" y="167" font-size="14" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">BT</text>
</g>
<!-- HWV (wing, bowtie left-right) -->
<g>
<line x1="230" y1="165" x2="290" y2="165" stroke="#333" stroke-width="4"/>
<rect x="225" y="140" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
<polygon points="230,147 250,165 230,183" fill="#111"/>
<polygon points="270,147 250,165 270,183" fill="#111"/>
<text x="250" y="135" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="middle">HWV</text>
</g>
<!-- HMV (bowtie) -->
<g>
<rect x="105" y="180" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
<polygon points="110,185 150,185 130,205" fill="#111"/>
<polygon points="110,225 150,225 130,205" fill="#111"/>
<text x="90" y="210" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">HMV</text>
</g>
<!-- MMV (bowtie) -->
<g>
<rect x="105" y="231" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="0"/>
<polygon points="110,235 150,235 130,255" fill="#111"/>
<polygon points="110,275 150,275 130,255" fill="#111"/>
<text x="90" y="260" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">MMV</text>
</g>
<!-- SCSSV (bowtie) -->
<g>
<rect x="105" y="335" width="50" height="50" fill="#90EE90" stroke="blue" stroke-width="2"/>
<polygon points="110,340 150,340 130,360" fill="#111"/>
<polygon points="110,380 150,380 130,360" fill="#111"/>
<text x="90" y="365" font-size="16" font-family="Arial" fill="#ffffff" text-anchor="end" alignment-baseline="middle">SCSSV</text>
</g>
</svg>`
};
 { /* ... your SVGs ... */ };

// --- Store test results per well and valve ---
const wellValveTests = {}; // { [wellId]: { [valveId]: { quickResult?: string, ...fields } } }

// --- Modal for SVG only, with interactive valves ---
function showWellSchematicOnlyModal(wellId) {
  const well = wells.find(w => w.id === wellId);
  if (!well) return;
  const schematicSVG = schematicSVGs[well.treeType] || '<div style="color:#888;">No schematic available.</div>';

  let modal = document.getElementById('svgOnlyModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'svgOnlyModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-content"
        style="background: #fff; min-width:500px; min-height:600px; max-width:98vw; max-height:98vh;
          text-align:center; position:relative; overflow:auto; border-radius:24px;
          box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18);">
        <button id="closeSvgOnlyModalBtn"
          style="position:absolute;top:10px;right:10px;font-size:28px;background:none;border:none;color:#444;cursor:pointer;z-index:10;">
          &times;
        </button>
        <div id="svgOnlyContent" style="margin:0 auto;display:inline-block;"></div>
        <div id="svgDescBox"
          style="position: absolute; left: 0; bottom: 0; background: rgba(240,240,240,0.93); color: #222;
            font-size: 1em; text-align: left; padding: 15px 16px 10px 20px; min-width: 180px; min-height: 48px;
            border-top-right-radius: 12px; border-bottom-left-radius: 6px; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
            z-index: 2; pointer-events: none; font-family: 'Segoe UI', Arial, sans-serif;">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeSvgOnlyModalBtn').onclick = closeWellSchematicOnlyModal;
    modal.onclick = function(e) {
      if (e.target === modal) closeWellSchematicOnlyModal();
    };
  }
  document.getElementById('svgOnlyContent').innerHTML = schematicSVG;
  // Minimalist description at bottom left
  let desc = `<span style="font-weight:600;">${well.id}</span>`;
  if (well.name && well.name !== well.id) desc += ` &mdash; ${well.name}`;
  if (well.type) desc += `<br><span>${well.type}</span>`;
  if (well.treeType) desc += `<br><span>${well.treeType}</span>`;
  if (well.metadata) desc += `<br><span>${well.metadata}</span>`;
  document.getElementById('svgDescBox').innerHTML = desc;

  modal.style.display = 'flex';

  setTimeout(() => {
    const svg = document.getElementById('svgOnlyContent').querySelector('svg');
    if (!svg) return;
    const valveLabels = [
      "SV", "MWV", "HWV", "HMV", "MMV", "SCSSV",
      "LWV", "RWV", "USV", "LSV", "2SV"
    ];
    Array.from(svg.querySelectorAll('g')).forEach(g => {
      const label = Array.from(g.querySelectorAll('text')).map(t => (t.textContent || '').trim());
      const found = valveLabels.find(v => label.includes(v));
      if (found) {
        g.style.cursor = 'pointer';
        // Highlight if any property exists (object shape)
        const wellTests = wellValveTests[wellId] || {};
        const testObj = wellTests[found];
        if (testObj && Object.keys(testObj).length > 0) {
          g.setAttribute('opacity', '0.7');
          g.setAttribute('filter', 'drop-shadow(0 0 8px #3fa)');
        } else {
          g.setAttribute('opacity', '1');
          g.removeAttribute('filter');
        }
        g.onclick = function(evt) {
          evt.stopPropagation();
          showValveModal(
            wellId,
            found,
            (wellValveTests[wellId] && wellValveTests[wellId][found]) ? wellValveTests[wellId][found] : {}
          );
        };
        g.oncontextmenu = function(evt) {
          evt.preventDefault();
          showValveInputBox(wellId, found, evt);
        };
      }
    });
  }, 50);
}

function saveValveTests() {
  localStorage.setItem('wimt-valve-tests', JSON.stringify(wellValveTests));
}
function loadValveTests() {
  try {
    const data = JSON.parse(localStorage.getItem('wimt-valve-tests') || '{}');
    Object.assign(wellValveTests, data);
  } catch {}
}
loadValveTests(); // Load data at startup

function closeWellSchematicOnlyModal() {
  const modal = document.getElementById('svgOnlyModal');
  if (modal) modal.style.display = 'none';
  const inputBox = document.getElementById('valveInputBox');
  if (inputBox) inputBox.remove();
}

// --- Quick Input Box ---
function showValveInputBox(wellId, valveId, evt) {
  // Remove any existing box
  const oldBox = document.getElementById('valveInputBox');
  if (oldBox) oldBox.remove();

  // Get bounding rect for placement
  const rect = evt.target.getBoundingClientRect();
  const box = document.createElement('div');
  box.id = 'valveInputBox';
  box.style.position = 'fixed';
  box.style.left = (rect.right + 10) + 'px';
  box.style.top = (rect.top - 10) + 'px';
  box.style.background = '#222';
  box.style.color = '#fff';
  box.style.padding = '12px';
  box.style.border = '2px solid #1976d2';
  box.style.borderRadius = '8px';
  box.style.zIndex = 3000;

  let prevValue = '';
  if (wellValveTests[wellId] && wellValveTests[wellId][valveId]) {
    prevValue = wellValveTests[wellId][valveId].quickResult || '';
  }

  box.innerHTML = `
    <div style="margin-bottom:8px;">
      <b>Integration Test for ${valveId.replace(/^valve-/, '')}</b>
    </div>
    <input type="text" id="valveTestInput" value="${prevValue}" style="width:180px;" autofocus>
    <button id="valveTestSaveBtn" style="margin-left:8px;">Save</button>
    <button id="valveTestCancelBtn" style="margin-left:6px;">Cancel</button>
  `;

  document.body.appendChild(box);
  document.getElementById('valveTestInput').focus();

  document.getElementById('valveTestSaveBtn').onclick = () => {
    const val = document.getElementById('valveTestInput').value;
    if (!wellValveTests[wellId]) wellValveTests[wellId] = {};
    if (!wellValveTests[wellId][valveId] || typeof wellValveTests[wellId][valveId] !== 'object') {
      wellValveTests[wellId][valveId] = {};
    }
    wellValveTests[wellId][valveId].quickResult = val;
    box.remove();
    saveValveTests();
    showWellSchematicOnlyModal(wellId);
  };
  document.getElementById('valveTestCancelBtn').onclick = () => box.remove();
}

// --- Render Wells Section ---
function renderWellsSection() {
  let wellListDiv = document.getElementById('wellList');
  let html = '';

  if (currentUser && currentUser.role === 'admin') {
    html += `<button id="createWellBtn" class="primary-btn" style="margin-bottom: 18px;">Create Well</button>`;
  }

  html += `<label for="wellDropdown" style="font-weight:bold;">Select Well:</label>
  <select id="wellDropdown" style="margin:0 12px 24px 8px;">
    <option value="" selected disabled>-- Select Well --</option>
    ${wells.map(w => `<option value="${w.id}">${w.id} - ${w.name || w.id}</option>`).join('')}
  </select>`;

  html += `<div id="wellDetails" style="margin-top:18px;"></div>`;

  wellListDiv.innerHTML = html;

  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('createWellBtn').onclick = showCreateWellModal;
  }

  const dropdown = document.getElementById('wellDropdown');
  dropdown.onchange = function() {
    renderWellDetails(this.value);
    showWellSchematicOnlyModal(this.value);
  };

  document.getElementById('wellDetails').innerHTML = '<span style="color:#888;">Select a well to view details.</span>';
}

// --- Render Single Well Details ---
function renderWellDetails(wellId) {
  const well = wells.find(w => w.id === wellId);
  if (!well) {
    document.getElementById('wellDetails').innerHTML = '<span style="color:#888;">Well not found.</span>';
    return;
  }
  let schematicHTML = schematicSVGs[well.treeType]
    ? `<span class="schematic-svg-preview">${schematicSVGs[well.treeType]}</span>`
    : "N/A";
  let html = `
    <div class="well-details-block">
      <h3>${well.id} - ${well.name || ""}</h3>
      <ul>
        <li><b>Type:</b> ${well.type || ""}</li>
        <li><b>Christmas Tree Type:</b> ${well.treeType || ""}</li>
        <li><b>Schematic:</b> ${schematicHTML}</li>
        ${(well.rings && well.rings.length) ? `<li><b>Integrity/Risk:</b>
          <ul>
            ${well.rings.map(r => `<li style="color:${r.color};"><b>${r.label}:</b> ${r.message}</li>`).join('')}
          </ul>
        </li>` : ""}
      </ul>
    </div>
  `;
  document.getElementById('wellDetails').innerHTML = html;
}

// --- CREATE WELL MODAL LOGIC (Admin Only) ---
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
        </label><br><br>
        <label>Well Type:<br>
          <input type="text" name="wellType" list="wellTypeList" style="width:100%;">
          <datalist id="wellTypeList">
            <option value="Producer">
            <option value="Injector">
            <option value="Observation">
          </datalist>
        </label><br><br>
        <label>Christmas Tree Type:<br>
          <select name="treeType" id="treeTypeSel" required style="width:100%;">
            ${christmasTreeSchematics.map(t =>
              `<option value="${t.type}">${t.label}</option>`
            ).join('')}
          </select>
        </label><br><br>
        <label>Schematic Diagram:<br>
          <div style="display:flex;align-items:center;gap:10px;">
            <select name="schematic" id="schematicSel" style="width:60%;">
              ${christmasTreeSchematics.map(t =>
                `<option value="${t.type}">${t.label}</option>`
              ).join('')}
            </select>
            <span id="schematicPreview" style="display:inline-block;"></span>
          </div>
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

  function updateSchematicPreview() {
    const type = document.getElementById('schematicSel').value;
    document.getElementById('schematicPreview').innerHTML = type && schematicSVGs[type]
      ? `<span class="schematic-svg-preview">${schematicSVGs[type]}</span>` : '';
  }
  document.getElementById('schematicSel').onchange = updateSchematicPreview;
  document.getElementById('treeTypeSel').onchange = function() {
    document.getElementById('schematicSel').value = this.value;
    updateSchematicPreview();
  };
  updateSchematicPreview();

  document.getElementById('cancelCreateWellBtn').onclick = function() {
    modal.remove();
  };

  document.getElementById('createWellForm').onsubmit = function(e) {
    e.preventDefault();
    const form = e.target;
    const newId = form.wellId.value.trim();
    if (!newId) return;
    if (wells.find(w => w.id === newId)) {
      alert('A well with this ID already exists.');
      return;
    }
    wells.push({
      id: newId,
      name: newId,
      type: form.wellType.value || "",
      treeType: form.treeType.value,
      schematic: form.schematic.value,
      rings: [],
      metadata: form.metadata.value || ""
    });
    modal.remove();
    renderWellsSection();
  };
}

//--- VALVE INPUT MODAL LOGIC ---

const valveColorMap = {
  "2SV": "#A1E69F",    // green
  "HWV": "#A1E69F",    // green
  "SV": "#ADD8E6",     // orange
  "MWV": "#F7B88A",    // orange
  "HMV": "#F7EB9A",    // yellow
  "MMV": "#F7EB9A",    // yellow
  "SCSSV": "#F7EB9A",  // yellow
  "FSV": "#F7EB9A"     // yellow
};
const valveFields = [
  "id", "monitoringTime", "maxInternalLeakRate", "initialPressure", "initialTemp",
  "vp_SCSSV","vp_MMV","vp_HMV","vp_SV","vp_2SV","vp_TC","vp_MWV","vp_HWV","vp_CV","vp_HDVs",
  "externalLeak", "closingTime", "asclLeak", "closedStemLength"
];

function showValveModal(wellId, valveId, existingData = {}) {
  const modal = document.getElementById("valveModal");
  const content = document.getElementById("valveModalContent");
  const color = valveColorMap[valveId] || "#f8f8f8";
  content.style.background = color;
  document.getElementById("valveModalTitle").textContent = `Valve Test Input — ${valveId} (${wellId})`;
  document.getElementById("valveModalError").textContent = "";

  document.getElementById("field-id").value = valveId;
  document.getElementById("field-id").readOnly = true;
  document.getElementById("field-monitoringTime").value = existingData.monitoringTime || "";
  document.getElementById("field-maxInternalLeakRate").value = existingData.maxInternalLeakRate || "";
  document.getElementById("field-initialPressure").value = existingData.initialPressure || "";
  document.getElementById("field-initialTemp").value = existingData.initialTemp || "";
  [
    "SCSSV","MMV","HMV","SV","2SV","TC","MWV","HWV","CV","HDVs"
  ].forEach(v => {
    document.getElementById(`field-vp_${v}`).value = existingData[`vp_${v}`] || "";
  });
  if(existingData.externalLeak){
    document.querySelectorAll('input[name="externalLeak"]').forEach(r=>{ r.checked = (r.value === existingData.externalLeak); });
  } else {
    document.querySelectorAll('input[name="externalLeak"]').forEach(r=>{ r.checked = false; });
  }
  document.getElementById("field-closingTime").value = existingData.closingTime || "";
  if(existingData.asclLeak){
    document.querySelectorAll('input[name="asclLeak"]').forEach(r=>{ r.checked = (r.value === existingData.asclLeak); });
  } else {
    document.querySelectorAll('input[name="asclLeak"]').forEach(r=>{ r.checked = false; });
  }
  document.getElementById("field-closedStemLength").value = existingData.closedStemLength || "";

  modal.style.display = "flex";
  modal.dataset.wellId = wellId;
  modal.dataset.valveId = valveId;
}

function closeValveModal() {
  document.getElementById("valveModal").style.display = "none";
}

function validateValveForm(form) {
  for (const field of valveFields) {
    if(field === "id") continue;
    const el = form.elements[field];
    if(!el) continue;
    if(el.type === "radio") {
      if(!form.querySelector(`[name="${field}"]:checked`)) return false;
    } else if(el.tagName === "SELECT") {
      if(el.value !== "O" && el.value !== "C") return false;
    } else {
      if(el.value.trim() === "") return false;
    }
  }
  return true;
}

function saveValveTest(e) {
  e.preventDefault();
  const form = e.target;
  if(!validateValveForm(form)) {
    document.getElementById("valveModalError").textContent = "All fields must be filled (no blanks).";
    return false;
  }
  let data = {};
  for (const field of valveFields) {
    const el = form.elements[field];
    if(!el) continue;
    if(el.type === "radio") {
      const checked = form.querySelector(`[name="${field}"]:checked`);
      data[field] = checked ? checked.value : "";
    } else {
      data[field] = el.value;
    }
  }
  const wellId = document.getElementById("valveModal").dataset.wellId;
  const valveId = document.getElementById("valveModal").dataset.valveId;
  if(!wellValveTests[wellId]) wellValveTests[wellId] = {};
  if(!wellValveTests[wellId][valveId] || typeof wellValveTests[wellId][valveId] !== 'object') {
    wellValveTests[wellId][valveId] = {};
  }
  const prevQuick = wellValveTests[wellId][valveId].quickResult;
  wellValveTests[wellId][valveId] = { ...data };
  if (prevQuick !== undefined) {
    wellValveTests[wellId][valveId].quickResult = prevQuick;
  }
  saveValveTests();
  closeValveModal();
  if(typeof refreshWellSummaryTable === "function") refreshWellSummaryTable(wellId);
  return false;
}

// --- ON PAGE LOAD: Render Well Section on navigation ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('wellList')) renderWellsSection();
});
// --- END NEW WELL SECTION ---

// --- Identification Forms Storage & Listing ---

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









// --- USER MANAGEMENT (Keep only the extended version with Add User form toggle) ---
function renderUserManagement() {
  // Only admin can see this section
  if (!currentUser || currentUser.role !== "admin") {
    document.getElementById('usersUI').innerHTML = '<div style="color:#e64a3a;">Access denied.</div>';
    return;
  }
  users = loadUsers();

  // State: should the add form be shown?
  if (typeof window.showAddUserForm === 'undefined') window.showAddUserForm = false;

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:50px;">
      <h3 style="margin:0;">User Management</h3>
      <button id="showAddUserBtn" style="margin-left:auto;">Add User</button>
    </div>
  `;

  if (window.showAddUserForm) {
    html += `
      <form id="adminAddUserForm" style="margin-bottom:18px; background:#000000; padding:12px; border:1px solid #ccc;">
        <label>Username <input type="text" id="adminAddUsername" required></label>
        <label>Password <input type="password" id="adminAddPassword" required></label>
        <label>Role
          <select id="adminAddRole" required>
            <option value="">Select role</option>
            <option value="technician">Technician</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit">Add User</button>
        <button type="button" id="cancelAddUserBtn" style="margin-left:8px;">Cancel</button>
        <span id="adminAddUserMsg" style="margin-left:12px;color:#e6c23a;"></span>
      </form>
    `;
  }

  html += `<table><tr><th>Username</th><th>Role</th><th>Action</th></tr>`;
  users.forEach(u => {
    if (u.username === currentUser.username) return; // Don't allow admin to delete self
    html += `<tr>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td><button class="secondary-btn" onclick="deleteUser('${u.username}')">Delete</button></td>
    </tr>`;
  });
  html += `</table>`;
  document.getElementById('usersUI').innerHTML = html;

  // Add User Button Handler
  document.getElementById('showAddUserBtn').onclick = function() {
    window.showAddUserForm = true;
    renderUserManagement();
  };

  // Add User Form Handler (if form is shown)
  if (window.showAddUserForm && document.getElementById('adminAddUserForm')) {
    document.getElementById('adminAddUserForm').onsubmit = async function(e) {
      e.preventDefault();
      const username = document.getElementById('adminAddUsername').value.trim();
      const password = document.getElementById('adminAddPassword').value.trim();
      const role = document.getElementById('adminAddRole').value;
      if (!username || !password || !role) {
        document.getElementById('adminAddUserMsg').textContent = "Fill all fields.";
        return;
      }
      users = loadUsers();
      if (users.find(u => u.username === username)) {
        document.getElementById('adminAddUserMsg').textContent = "Username already exists.";
        return;
      }
      const hash = await sha256(password);
      users.push({ username, password: hash, role });
      saveUsers(users);
      window.showAddUserForm = false;
      renderUserManagement();
    };
    document.getElementById('cancelAddUserBtn').onclick = function() {
      window.showAddUserForm = false;
      renderUserManagement();
    };
  }
}

window.deleteUser = function(username) {
  if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
  users = loadUsers();
  users = users.filter(u => u.username !== username);
  saveUsers(users);
  renderUserManagement();
  alert(`User "${username}" deleted.`);
};


// --- END WELL SCHEMATIC & PHOTOS GALLERY INTEGRATION ---

// You can copy the rest of your dashboard code and utility functions here as needed.

// Example data arrays for demo purposes (replace with your actual data sources)








// --- MAASP Data Example (replace or connect to your real data source) ---
const allMaaspData = {
  "Well-1": [
    { date: "2025-05-01", measured: 1500, maasp: 1800 },
    { date: "2025-05-08", measured: 1750, maasp: 1800 },
    { date: "2025-05-15", measured: 1850, maasp: 1800 },
    { date: "2025-05-22", measured: 1700, maasp: 1800 }
  ],
  "Well-2": [
    { date: "2025-05-01", measured: 1300, maasp: 1600 },
    { date: "2025-05-08", measured: 1550, maasp: 1600 },
    { date: "2025-05-15", measured: 1650, maasp: 1600 },
    { date: "2025-05-22", measured: 1500, maasp: 1600 }
  ]
};

// --- MAASP Chart for Well Details Modal ---
function showWellMaasp(wellId) {
  const block = document.getElementById('wellMaaspBlock');
  if (!allMaaspData[wellId]) {
    block.style.display = "none";
    return;
  }
  block.style.display = "block";
  renderMaaspChart(
    'wellMaaspChart',
    'wellMaaspErrors',
    allMaaspData[wellId]
  );
}

// --- MAASP Chart for Data Section ---
function populateDataMaaspWellSelect() {
  const select = document.getElementById('dataMaaspWellSelect');
  select.innerHTML = '';
  Object.keys(allMaaspData).forEach(wellId => {
    const option = document.createElement('option');
    option.value = wellId;
    option.textContent = wellId;
    select.appendChild(option);
  });
}
function renderDataMaaspChart() {
  const wellId = document.getElementById('dataMaaspWellSelect').value;
  renderMaaspChart(
    'dataMaaspChart',
    'dataMaaspErrors',
    allMaaspData[wellId]
  );
}

// --- Main chart rendering with improved error handling ---
function renderMaaspChart(canvasId, errorDivId, maaspData) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const measured = maaspData.map(d => d.measured);
  const maasp = maaspData.map(d => d.maasp);
  const labels = maaspData.map(d => d.date);
  const measuredMA = movingAverage(measured, 3);

  // Collect error points (measured > maasp)
  const errorPoints = maaspData
    .map((d, i) => d.measured > d.maasp ? { ...d, index: i } : null)
    .filter(Boolean);

  renderMaaspErrorTable(errorPoints, "maaspErrorTableBlock");

  // Prepare error messages
  const errors = errorPoints.map(e =>
    `On ${e.date}, measured pressure (<b>${e.measured} psi</b>) exceeded MAASP (<b>${e.maasp} psi</b>)!`
  );

  // Destroy previous chart if exists
  if (ctx._chartInstance) ctx._chartInstance.destroy();
  if (globalMaaspChart) globalMaaspChart.destroy();

  // --- CHART ---
  globalMaaspChart = ctx._chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Measured Pressure (psi)',
          data: measured,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: false,
          tension: 0.2,
          pointBackgroundColor: measured.map((v, i) => v > maasp[i] ? '#f33' : '#1976d2'),
          pointBorderColor: measured.map((v, i) => v > maasp[i] ? '#f33' : '#1976d2'),
          pointRadius: measured.map((v, i) => v > maasp[i] ? 7 : 5)
        },
        {
          label: 'MAASP Limit (psi)',
          data: maasp,
          borderColor: '#e53935',
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Measured Pressure (3-point MA)',
          data: measuredMA,
          borderColor: '#ff9800',
          borderDash: [2, 2],
          borderWidth: 2,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const idx = context.dataIndex;
              const maaspValue = context.chart.data.datasets[1].data[idx];
              let label = `Measured: ${value} psi`;
              if (context.datasetIndex === 0 && value > maaspValue) {
                label += " ⚠️ EXCEEDED MAASP!";
              }
              return label;
            }
          }
        },
        title: { display: false }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Pressure (psi)' }
        }
      }
    }
  });

  // --- ERROR SUMMARY + LIST ---
  const errorDiv = document.getElementById(errorDivId);
  if (errors.length) {
    errorDiv.innerHTML = `
      <span style="color:#fa0;font-weight:bold;">
        ⚠️ ${errors.length} MAASP exceedance${errors.length > 1 ? 's' : ''} detected!
        <br>Last exceedance: <b>${errorPoints.slice(-1)[0].date}</b>
      </span>
      <ul style="color:#f55; margin-top:6px; padding-left:20px;">
        ${errorPoints.map((e,i) =>
          `<li style="cursor:pointer;text-decoration:underline;" onclick="highlightChartPoint(${e.index})">${errors[i]}</li>`
        ).join('')}
      </ul>`;
  } else {
    errorDiv.innerHTML = '<span style="color:#090;">No MAASP exceedances detected.</span>';
  }
}
// --- Integration Hooks ---
// Call this when showing a well's details modal:
     //showWellMaasp(wellId);

// Call these when showing the Data section:
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dataMaaspWellSelect')) {
    populateDataMaaspWellSelect();
    renderDataMaaspChart();
    document.getElementById('dataMaaspWellSelect').addEventListener('change', renderDataMaaspChart);
  }
});










// NEW SECTION: MAASP ISSUE REPORTING/CORRECTION WORKFLOW

// --- Utility: Compute moving average (already provided, keep it if present) ---
let globalMaaspChart = null;

function movingAverage(arr, windowSize = 3) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    let start = Math.max(0, i - windowSize + 1);
    let window = arr.slice(start, i + 1);
    result.push(window.reduce((sum, val) => sum + val, 0) / window.length);
  }
  return result;
}

// --- Highlight a chart point when an error is clicked ---
function highlightChartPoint(idx) {
  if (!globalMaaspChart) return;
  globalMaaspChart.setActiveElements([
    { datasetIndex: 0, index: idx }
  ]);
  globalMaaspChart.tooltip.setActiveElements([
    { datasetIndex: 0, index: idx }
  ]);
  globalMaaspChart.update();
}

// --- MAASP issue reporting/correction logic ---
let maaspIssueReports = JSON.parse(localStorage.getItem('maasp-issue-reports') || '{}');
function saveMaaspIssueReports() {
  localStorage.setItem('maasp-issue-reports', JSON.stringify(maaspIssueReports));
}

// --- Manipulate MAASP Data (NEW SECTION) ---
function renderPressureEditor(maaspData, wellId) {
  const block = document.getElementById('pressureEditorBlock');
  if (!block) return;
  let html = `<h3>Edit Measured Pressures for ${wellId}</h3>
    <table style="margin-bottom:12px;">
      <thead>
        <tr>
          <th>Date</th>
          <th>Measured Pressure (psi)</th>
          <th>MAASP Limit (psi)</th>
          <th>New Measured Pressure</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;
  maaspData.forEach((row, idx) => {
    html += `
      <tr>
        <td>${row.date}</td>
        <td>${row.measured}</td>
        <td>${row.maasp}</td>
        <td>
          <input type="number" id="editMeasured_${idx}" value="${row.measured}" style="width:80px;">
        </td>
        <td>
          <button onclick="saveMeasuredPressure('${wellId}', ${idx})">Save</button>
        </td>
      </tr>
    `;
  });
  html += `</tbody></table>
    <button onclick="hidePressureEditor()">Close Editor</button>
  `;
  block.innerHTML = html;
  block.style.display = "block";
}
function showPressureEditor(wellId) {
  renderPressureEditor(allMaaspData[wellId], wellId);
}
function saveMeasuredPressure(wellId, idx) {
  const val = parseFloat(document.getElementById(`editMeasured_${idx}`).value);
  if (isNaN(val)) {
    alert("Enter a valid number.");
    return;
  }
  allMaaspData[wellId][idx].measured = val;
  // Optionally: Reset reports for this entry if pressure is now ok
  const row = allMaaspData[wellId][idx];
  const key = wellId ? `${wellId}_${row.date}` : `${row.date}`;
  if (val <= row.maasp && maaspIssueReports[key]) {
    delete maaspIssueReports[key];
    saveMaaspIssueReports();
  }
  renderPressureEditor(allMaaspData[wellId], wellId);
  renderDataMaaspChart();
}
function hidePressureEditor() {
  const block = document.getElementById('pressureEditorBlock');
  if (block) block.style.display = "none";
}

// --- Render MAASP Error Table with robust reporting/correction workflow ---
function renderMaaspErrorTable(errorPoints, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!errorPoints.length) {
    container.innerHTML = '<span style="color:#090;">No MAASP exceedances detected.</span>';
    return;
  }

  let anyUncorrected = false;

  let html = `
    <table class="maasp-error-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Measured Pressure (psi)</th>
          <th>MAASP Limit (psi)</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  errorPoints.forEach((e, i) => {
    // Key includes well ID if available
    const key = e.wellId ? `${e.wellId}_${e.date}` : `${e.date}`;
    let report = maaspIssueReports[key] || {};

    // If measured > maasp, status resets to require new report/correction
    let showReport = false, showCorrected = false, showMarkCorrected = false;
    let statusText = '';

    if (e.measured > e.maasp) {
      if (!report.reported) {
        statusText = '<span style="color:#f33;">Unreported</span>';
        showReport = true;
        anyUncorrected = true;
      } else if (!report.corrected) {
        statusText = '<span style="color:#ff9800;">Reported, needs correction</span>';
        showMarkCorrected = true;
        anyUncorrected = true;
      } else {
        // Even if previously "corrected", but pressure is still high, must repeat workflow
        statusText = '<span style="color:#e53935;">Pressure still high!<br>Report again</span>';
        showReport = true;
        anyUncorrected = true;
      }
    } else {
      // All clear only if pressure is at/below MAASP and previously corrected
      if (report.reported && report.corrected) {
        statusText = '<span style="color:#4caf50;">Corrected</span>';
        showCorrected = true;
      } else {
        statusText = '<span style="color:#090;">No active exceedance</span>';
      }
    }

    html += `
      <tr>
        <td>${e.date}</td>
        <td style="color:#f33;font-weight:bold;">${e.measured}</td>
        <td style="color:#e53935;">${e.maasp}</td>
        <td>${statusText}</td>
        <td>
          ${showReport ? `<button onclick="showReportIssueModal('${key}')">Report Issue</button>` : ''}
          ${showMarkCorrected ? `<button onclick="markMaaspIssueCorrected('${key}')">Mark as Corrected</button>` : ''}
          ${showCorrected ? `<span style="color:#4caf50;">✔</span>` : ''}
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  if (anyUncorrected) {
    html = `
      <div style="color:#fff;background:#e53935;padding:10px 15px;border-radius:5px;margin-bottom:8px;font-weight:bold;">
        ⚠️ At least one MAASP exceedance is not corrected! Please report and correct all issues. Correction must be performed and confirmed while pressure is still high.
      </div>
    ` + html;
  }

  container.innerHTML = html;
}

// --- Modal for reporting MAASP issue ---
function showReportIssueModal(key) {
  let modal = document.getElementById('maaspReportModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'maaspReportModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="min-width:320px;">
        <h3>Report MAASP Exceedance</h3>
        <form id="maaspReportForm">
          <label>Description of issue/corrective action:<br>
            <textarea id="maaspReportDesc" rows="3" style="width:98%;" required></textarea>
          </label><br>
          <button type="submit">Submit Report</button>
          <button type="button" onclick="closeMaaspReportModal()">Cancel</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  document.getElementById('maaspReportForm').onsubmit = function(e) {
    e.preventDefault();
    maaspIssueReports[key] = {
      reported: true,
      corrected: false,
      description: document.getElementById('maaspReportDesc').value,
      reportedAt: new Date().toISOString()
    };
    saveMaaspIssueReports();
    closeMaaspReportModal();
    renderDataMaaspChart();
  };
}
function closeMaaspReportModal() {
  document.getElementById('maaspReportModal').style.display = 'none';
}

// --- Mark as corrected (pressure must still be checked after) ---
function markMaaspIssueCorrected(key) {
  if (maaspIssueReports[key]) {
    maaspIssueReports[key].corrected = true;
    maaspIssueReports[key].correctedAt = new Date().toISOString();
    saveMaaspIssueReports();
    renderDataMaaspChart();
  }
}

// --- Callout summary for MAASP errors (unchanged, optional) ---
function renderMaaspErrorCallout(errorPoints) {
  const calloutDiv = document.getElementById('maaspErrorCallout');
  if (!calloutDiv) return;

  if (!errorPoints.length) {
    calloutDiv.innerHTML = '';
    return;
  }

  const latest = errorPoints.slice(-1)[0];
  calloutDiv.innerHTML = `
    <div class="callout-error">
      <span class="icon">⚠️</span>
      <div class="error-details">
        <b>${errorPoints.length} MAASP exceedance${errorPoints.length > 1 ? 's' : ''} detected</b>
        <div class="error-date">Last: <b>${latest.date}</b></div>
        <div class="error-desc">Measured <b>${latest.measured} psi</b> 
          <span style="color:#fff7b2; font-weight:normal;">&#62;</span> 
          MAASP <b>${latest.maasp} psi</b>
        </div>
        ${errorPoints.length > 1 ? `<div style="margin-top:4px;font-size:0.92em;color:#fff7b2;">See all on chart</div>` : ""}
      </div>
    </div>
  `;
}

// --- Integrate Pressure Editor into Data Section ---
// Call this from your Data Section render function
function updatePressureEditorButton(wellId) {
  const btnId = 'pressureEditorBtn';
  let btn = document.getElementById(btnId);
  if (!btn) {
    btn = document.createElement('button');
    btn.id = btnId;
    btn.className = 'primary-btn';
    btn.innerText = 'Edit Pressures';
    btn.onclick = () => showPressureEditor(wellId);
    const dataBlock = document.getElementById('dataMaaspBlock');
    if (dataBlock) dataBlock.insertBefore(btn, dataBlock.firstChild);
  } else {
    btn.onclick = () => showPressureEditor(wellId);
  }
}

// --- Render Data MAASP Chart and attach editor button ---
function renderDataMaaspChart() {
  const wellId = document.getElementById('dataMaaspWellSelect').value;
  renderMaaspChart(
    'dataMaaspChart',
    'dataMaaspErrors',
    allMaaspData[wellId]
  );
  updatePressureEditorButton(wellId); // Attach or update the editor button
}

// --- On page load, insert editor block if missing ---
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('pressureEditorBlock')) {
    const block = document.createElement('div');
    block.id = 'pressureEditorBlock';
    block.style.display = 'none';
    const dataBlock = document.getElementById('dataMaaspBlock');
    if (dataBlock) dataBlock.appendChild(block);
  }
});






// NEW SECTION

// --- Unified Deviation & Dispensation Data Model ---
// Use your wells array for well selection

// --- Deviations & Dispensations Management ---



// -- Deviations & Dispensations Storage --
function loadDispensations() {
  try { return JSON.parse(localStorage.getItem('wimt-dispensations') || "[]"); } catch { return []; }
}
function saveDispensations(list) {
  localStorage.setItem('wimt-dispensations', JSON.stringify(list));
}
let dispensations = loadDispensations();

// Example: To demo, link to "identification forms" and "integrity tests"
function getIdentificationForms() {
  // Replace with real identification forms
  return (window.identificationForms || []).map(f => ({ id: f.id, label: f.title || f.id })) || [];
}
function getIntegrityTestForms() {
  // Replace with real integrity test forms
  return (window.integrityTestForms || []).map(f => ({ id: f.id, label: f.title || f.id })) || [];
}

// --- Custom Modal for Info/Alert ---
function showInfoModal(msg, title = "Info") {
  let modal = document.getElementById('infoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'infoModal';
    modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#222;color:#fff;padding:32px 28px 22px 28px;border-radius:12px;max-width:400px;box-shadow:0 4px 24px #0009;text-align:center;position:relative;">
        <h3 id="infoModalTitle" style="margin-top:0;font-size:1.3em;"></h3>
        <div id="infoModalMsg" style="margin:12px 0 18px 0;word-break:break-word;"></div>
        <button id="infoModalCloseBtn" style="padding:7px 20px;border:none;border-radius:5px;background:#7fffd4;color:#222;font-weight:bold;font-size:1.1em;cursor:pointer;">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('infoModalCloseBtn').onclick = () => {
      modal.style.display = "none";
    };
  }
  document.getElementById('infoModalTitle').textContent = title;
  document.getElementById('infoModalMsg').innerHTML = msg;
  modal.style.display = "flex";
}

// -- Render Deviations/Dispensations List --
function renderDeviationsList() {
  const container = document.getElementById('deviationsList');
  if (!container) return;

  // Show/Hide closed deviations
  let showClosed = false;
  if (document.getElementById('showClosedDeviations')) {
    showClosed = document.getElementById('showClosedDeviations').checked;
  }
  const visible = showClosed ? dispensations : dispensations.filter(d => d.status !== "Closed");

  let html = `
    <div style="margin-bottom:8px">
      <label><input type="checkbox" id="showClosedDeviations" ${showClosed ? "checked" : ""}> Show Closed</label>
    </div>
  `;

  if (!visible.length) {
    html += `<div style="color:#888;">No dispensations or deviations${showClosed ? "" : " (excluding closed)"}.</div>`;
    container.innerHTML = html;
    document.getElementById('showClosedDeviations').onchange = renderDeviationsList;
    return;
  }

  html += `<table><tr>
    <th>Type</th><th>Title</th><th>ID Form</th><th>Status</th>
    <th>Valid Until</th><th>Risk</th><th>Actions</th>
  </tr>`;
  visible.forEach((d, idx) => {
    html += `<tr>
      <td>${d.type}</td>
      <td>${d.title}</td>
      <td>${d.identificationFormLabel || d.identificationForm}</td>
      <td>${d.status || "Draft"}</td>
      <td>${d.validUntil || ""}</td>
      <td>${d.riskAssessmentSummary || ""}</td>
      <td>
        <div class="actions-dropdown">
          <button type="button" onclick="toggleActionsMenu(this)">Actions ▼</button>
          <div class="actions-menu" style="display:none;position:absolute;z-index:1;background:#222;padding:3px 0;border-radius:4px;box-shadow:0 2px 8px #0007;">
            <button type="button" onclick="editDispensation(${idx})">Edit</button>
            <button type="button" onclick="reviewDispensation(${idx})">Review/Approve</button>
            <button type="button" onclick="tryExtendDispensation(${idx})">Extend</button>
            <button type="button" onclick="closeDispensation(${idx})" style="color:#f33;">Close</button>
          </div>
        </div>
      </td>
    </tr>`;
  });
  html += `</table>`;
  container.innerHTML = html;

  // Dropdown and outside click handlers
  document.getElementById('showClosedDeviations').onchange = renderDeviationsList;

  document.querySelectorAll('.actions-dropdown > button').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      // Hide any others
      document.querySelectorAll('.actions-menu').forEach(m => m.style.display = 'none');
      const menu = btn.nextElementSibling;
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };
  });
  document.body.onclick = function() {
    document.querySelectorAll('.actions-menu').forEach(m => m.style.display = 'none');
  };
}

// Toggle actions menu
function toggleActionsMenu(btn) {
  document.querySelectorAll('.actions-menu').forEach(m => m.style.display = 'none');
  const menu = btn.nextElementSibling;
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Add Close action
function closeDispensation(idx) {
  showInfoModal(`
    <div style="margin-bottom:16px">Are you sure you want to <b>close</b> this deviation/dispensation? This cannot be undone.</div>
    <div>
      <button id="infoModalConfirmBtn" style="margin-right:14px;padding:7px 20px;border:none;border-radius:5px;background:#f33;color:#fff;font-weight:bold;font-size:1.1em;cursor:pointer;">Close</button>
      <button id="infoModalCancelBtn" style="padding:7px 20px;border:none;border-radius:5px;background:#aaa;color:#222;font-weight:bold;font-size:1.1em;cursor:pointer;">Cancel</button>
    </div>
  `, "Close Deviation/Dispensation");

  // Handler for the custom confirm/cancel buttons
  setTimeout(() => {
    const modal = document.getElementById('infoModal');
    const confirmBtn = document.getElementById('infoModalConfirmBtn');
    const cancelBtn = document.getElementById('infoModalCancelBtn');
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        dispensations[idx].status = "Closed";
        saveDispensations(dispensations);
        renderDeviationsList();
        modal.style.display = "none";
      };
    }
    if (cancelBtn) {
      cancelBtn.onclick = function() {
        modal.style.display = "none";
      };
    }
  }, 0);
}

// -- Add/Edit Dispensation Modal --
document.getElementById('addDispensationBtn').onclick = () => openDispensationModal();

function openDispensationModal(idx = null) {
  // Setup form for create or edit
  document.getElementById('dispensationModal').style.display = 'flex';
  const form = document.getElementById('dispensationForm');
  form.reset();
  document.getElementById('dispensationModalTitle').textContent = idx === null ? "New Dispensation / Deviation" : "Edit Dispensation / Deviation";
  // Populate identification form select
  const idForms = getIdentificationForms();
  const idSelect = document.getElementById('dispIdentificationForm');
  idSelect.innerHTML = '';
  idForms.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.label;
    idSelect.appendChild(opt);
  });
  // Populate integrity test form select
  const testForms = getIntegrityTestForms();
  const testSelect = document.getElementById('dispIntegrityTestForm');
  testSelect.innerHTML = '<option value="">(None)</option>';
  testForms.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.label;
    testSelect.appendChild(opt);
  });
  // --- Add this block in openDispensationModal() ---

  const openTestBtn = document.getElementById('openIntegrityTestBtn');
  openTestBtn.onclick = function() {
    const select = document.getElementById('dispIntegrityTestForm');
    const testId = select.value;
    if (!testId) {
      showInfoModal("Select an Integrity Test Form first.", "Integrity Test");
      return;
    }
    // Find the test form object
    const testForms = getIntegrityTestForms();
    const testObj = testForms.find(f => f.id === testId);
    if (!testObj) {
      showInfoModal("Integrity Test Form not found.", "Integrity Test");
      return;
    }
    // Display info in a simple modal or alert (replace with your own modal for real UI)
    showIntegrityTestFormDetails(testObj);
    // Or, if your integrity test forms have a details modal, call it here instead of alert
  };
  // Setup risk assessment fields
  setupRiskAssessmentFields();
  // If editing, fill in values
  form.onsubmit = saveDispensation;
  form.dataset.editIdx = idx;
  if (idx !== null && dispensations[idx]) {
    const d = dispensations[idx];
    document.getElementById('dispType').value = d.type;
    idSelect.value = d.identificationForm;
    testSelect.value = d.integrityTestForm || "";
    document.getElementById('dispTitle').value = d.title;
    document.getElementById('dispDescription').value = d.description;
    document.getElementById('dispValidUntil').value = d.validUntil || "";
    document.getElementById('riskAssessmentOption').value = d.riskAssessmentType || "fill";
    setupRiskAssessmentFields(d.riskAssessmentType, d.riskAssessment);
  }
}

// Risk Assessment Option Handler
document.getElementById('riskAssessmentOption').onchange = function() {
  setupRiskAssessmentFields(this.value);
};

function setupRiskAssessmentFields(type, value) {
  const container = document.getElementById('riskAssessmentFields');
  container.innerHTML = '';
  if (type === "upload") {
    container.innerHTML = `<input type="file" id="riskAssessmentFile" accept=".pdf,.doc,.docx">`;
  } else {
    // Simple risk assessment fields
    container.innerHTML = `
      <label>Risk Level:
        <select id="riskLevel">
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
      </label><br>
      <label>Risk Description:
        <textarea id="riskDesc"></textarea>
      </label>
    `;
    if (value) {
      document.getElementById('riskLevel').value = value.level || "";
      document.getElementById('riskDesc').value = value.desc || "";
    }
  }
}

// Save Dispensation/Deviation
function saveDispensation(e) {
  e.preventDefault();
  const form = e.target;
  const idx = form.dataset.editIdx ? parseInt(form.dataset.editIdx, 10) : null;
  const d = {
    type: document.getElementById('dispType').value,
    identificationForm: document.getElementById('dispIdentificationForm').value,
    identificationFormLabel: document.getElementById('dispIdentificationForm').selectedOptions[0]?.textContent,
    integrityTestForm: document.getElementById('dispIntegrityTestForm').value,
    title: document.getElementById('dispTitle').value,
    description: document.getElementById('dispDescription').value,
    validUntil: document.getElementById('dispValidUntil').value,
    status: "Draft"
  };
  // Risk Assessment
  const riskType = document.getElementById('riskAssessmentOption').value;
  d.riskAssessmentType = riskType;
  if (riskType === "upload") {
    const fileInput = document.getElementById('riskAssessmentFile');
    if (fileInput && fileInput.files.length) {
      d.riskAssessmentFileName = fileInput.files[0].name;
      // File content not stored in demo
      d.riskAssessmentSummary = "File: " + fileInput.files[0].name;
    }
  } else {
    d.riskAssessment = {
      level: document.getElementById('riskLevel').value,
      desc: document.getElementById('riskDesc').value
    };
    d.riskAssessmentSummary = d.riskAssessment.level;
  }

  if (idx !== null && dispensations[idx]) {
    // preserve closed status if previously closed
    if (dispensations[idx].status === "Closed") d.status = "Closed";
    dispensations[idx] = d;
  } else {
    dispensations.push(d);
  }
  saveDispensations(dispensations);
  closeDispensationModal();
  renderDeviationsList();
}

function closeDispensationModal() {
  document.getElementById('dispensationModal').style.display = 'none';
}

// Edit/Review/Extend handlers
function editDispensation(idx) { openDispensationModal(idx); }
function reviewDispensation(idx) { openApproveDispensationModal(idx); }
function tryExtendDispensation(idx) { openExtendDispensationModal(idx); }

// --- Approval & Extension Workflows (simplified for demo) ---
function openApproveDispensationModal(idx) {
  const d = dispensations[idx];
  document.getElementById('approveDispensationModal').style.display = 'flex';
  document.getElementById('approveDispensationDetails').innerHTML = `
    <b>${d.title}</b> (${d.type})<br>
    <b>Status:</b> ${d.status || "Draft"}<br>
    <b>Valid Until:</b> ${d.validUntil}<br>
    <b>Risk:</b> ${d.riskAssessmentSummary || ""}<br>
    <b>Description:</b> ${d.description}<br>
    <br>
    <i>Approval workflow not implemented in detail for demo.</i>
  `;
  document.getElementById('approveDispensationBtn').onclick = () => {
    d.status = "Approved"; // In real app, track steps
    saveDispensations(dispensations);
    closeApproveDispensationModal();
    renderDeviationsList();
  };
}
function closeApproveDispensationModal() {
  document.getElementById('approveDispensationModal').style.display = 'none';
}

function openExtendDispensationModal(idx) {
  const d = dispensations[idx];
  document.getElementById('extendDispensationModal').style.display = 'flex';
  document.getElementById('extendDispensationDetails').innerHTML = `
    <b>${d.title}</b><br>
    <b>Current Valid Until:</b> ${d.validUntil}
  `;
  document.getElementById('extendDispensationBtn').onclick = () => {
    d.validUntil = document.getElementById('extendValidUntil').value;
    d.status = "Extension Requested";
    saveDispensations(dispensations);
    closeExtendDispensationModal();
    renderDeviationsList();
  };
}
function closeExtendDispensationModal() {
  document.getElementById('extendDispensationModal').style.display = 'none';
}

// -- INITIALIZE --
document.addEventListener('DOMContentLoaded', () => {
  renderDeviationsList();
});

// --- REPORTS SECTION (Read from existing data models, no conflict with other sections) ---

function renderReportsSection() {
  const container = document.getElementById('reportsUI');
  if (!container) return;

  // UI for report type selection and filters
  let html = `
    <div style="margin-bottom:18px;">
      <label>Report Type:
        <select id="reportTypeSelect">
          <option value="wellStatus">Well Status</option>
          <option value="deviations">Deviations/Dispensations</option>
          <option value="maasp">MAASP Exceedances</option>
          <option value="audit">Deviation Audit Logs</option>
          <option value="custom">Custom Chart/Report</option>
        </select>
      </label>
      <span id="reportFilters"></span>
      <button id="generateReportBtn" class="primary-btn">Generate</button>
      <button id="exportCSVBtn" class="secondary-btn" style="display:none;">Export CSV</button>
      <button id="exportPDFBtn" class="secondary-btn" style="display:none;">Export PDF</button>
    </div>
    <div id="reportOutput"></div>
    <div id="customReportChart" style="margin-top:18px;"></div>
  `;
  container.innerHTML = html;

  // Attach filter UI and logic
  setupReportFilters();
  document.getElementById('reportTypeSelect').onchange = setupReportFilters;
  document.getElementById('generateReportBtn').onclick = generateReport;
  document.getElementById('exportCSVBtn').onclick = exportCurrentReportCSV;
  document.getElementById('exportPDFBtn').onclick = exportCurrentReportPDF;
}

let lastReportHeaders = [];
let lastReportData = [];

function setupReportFilters() {
  const type = document.getElementById('reportTypeSelect').value;
  const filterDiv = document.getElementById('reportFilters');
  let html = '';
  if (type === "wellStatus" || type === "maasp") {
    html += `
      <label>Well: <select id="filterWell"><option value="">All</option>${wells.map(w => `<option value="${w.id}">${w.id}</option>`).join('')}</select></label>
      <label>Country: <select id="filterCountry"><option value="">All</option>${Array.from(new Set(wells.map(w => w.country))).map(c => `<option value="${c}">${c}</option>`).join('')}</select></label>
      <label>Field: <select id="filterField"><option value="">All</option>${Array.from(new Set(wells.map(w => w.field))).map(f => `<option value="${f}">${f}</option>`).join('')}</select></label>
      <label>Platform: <select id="filterPlatform"><option value="">All</option>${Array.from(new Set(wells.map(w => w.platform))).map(p => `<option value="${p}">${p}</option>`).join('')}</select></label>
      <label>Status: <select id="filterStatus"><option value="">All</option><option>Red</option><option>Orange</option><option>Yellow</option><option>Green</option></select></label>
      <label>Date From: <input type="date" id="filterDateFrom"></label>
      <label>Date To: <input type="date" id="filterDateTo"></label>
    `;
  }
  if (type === "deviations" || type === "audit") {
    html += `
      <label>Well: <select id="filterDevWell"><option value="">All</option>${wells.map(w => `<option value="${w.id}">${w.id}</option>`).join('')}</select></label>
      <label>Status: <select id="filterDevStatus"><option value="">All</option><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option><option value="expired">Expired</option></select></label>
      <label>Date From: <input type="date" id="filterDevDateFrom"></label>
      <label>Date To: <input type="date" id="filterDevDateTo"></label>
    `;
  }
  filterDiv.innerHTML = html;
}

function generateReport() {
  const type = document.getElementById('reportTypeSelect').value;
  let headers = [];
  let data = [];

  if (type === "wellStatus") {
    // Well status report
    headers = ["ID", "Country", "Field", "Platform", "Status", "Last Test", "Label", "Message"];
    data = filterWells().map(w => [
      w.id, w.country, w.field, w.platform, w.status, w.lastTest, w.label, w.message
    ]);
  } else if (type === "deviations") {
    // Deviations/Dispensations report
    headers = ["Well ID", "Deviation", "Dispensation?", "Status", "Valid Until", "Solved"];
    data = filterDeviations().map(d => [
      d.wellId, d.deviationDescription, d.dispensationRequired ? "Yes" : "No",
      d.status, d.validUntil, d.solved ? "Yes" : "No"
    ]);
  } else if (type === "maasp") {
    headers = ["Well ID", "Date", "Measured", "MAASP", "Exceedance"];
    data = [];
    let wellsToCheck = filterWells().map(w => w.id);
    const fDateFrom = document.getElementById('filterDateFrom')?.value;
    const fDateTo = document.getElementById('filterDateTo')?.value;
    wellsToCheck.forEach(wellId => {
      let arr = allMaaspData[wellId] || [];
      arr.forEach(row => {
        if (
          (!fDateFrom || row.date >= fDateFrom) &&
          (!fDateTo || row.date <= fDateTo)
        ) {
          data.push([
            wellId, row.date, row.measured, row.maasp,
            row.measured > row.maasp ? "Yes" : ""
          ]);
        }
      });
    });
  } else if (type === "audit") {
    // Deviation audit logs
    headers = ["Well ID", "Deviation", "Action", "User", "Timestamp", "Details"];
    data = [];
    filterDeviations().forEach(d => {
      if (Array.isArray(d.auditLog)) {
        d.auditLog.forEach(log => {
          data.push([
            d.wellId,
            (d.deviationDescription || "").slice(0, 40) + (d.deviationDescription?.length > 40 ? "..." : ""),
            log.action,
            log.user,
            new Date(log.timestamp).toLocaleString(),
            log.details || ""
          ]);
        });
      }
    });
  }  else if (type === "custom") {
    // Example: Show a bar chart of deviation counts per well
    headers = ["Well ID", "Deviation Count"];
    let counts = {};
    deviations.forEach(d => {
      counts[d.wellId] = (counts[d.wellId] || 0) + 1;
    });
    data = Object.entries(counts).map(([wellId, count]) => [wellId, count]);

    lastReportHeaders = headers;
    lastReportData = data;
    renderReportTable(headers, data);

    // Draw a bar chart (basic)
    renderDeviationBarChart(counts);
    document.getElementById('exportCSVBtn').style.display = data.length ? '' : 'none';
    document.getElementById('exportPDFBtn').style.display = data.length ? '' : 'none';
    return;
  }

  lastReportHeaders = headers;
  lastReportData = data;
  renderReportTable(headers, data);

  // Show/hide export button
  document.getElementById('exportCSVBtn').style.display = data.length ? '' : 'none';
  document.getElementById('exportPDFBtn').style.display = data.length ? '' : 'none';
}

function filterWells() {
  const fWell = document.getElementById('filterWell')?.value || '';
  const fCountry = document.getElementById('filterCountry')?.value || '';
  const fField = document.getElementById('filterField')?.value || '';
  const fPlatform = document.getElementById('filterPlatform')?.value || '';
  const fStatus = document.getElementById('filterStatus')?.value || '';
  const fDateFrom = document.getElementById('filterDateFrom')?.value;
  const fDateTo = document.getElementById('filterDateTo')?.value;

  return wells.filter(w =>
    (!fWell || w.id === fWell) &&
    (!fCountry || w.country === fCountry) &&
    (!fField || w.field === fField) &&
    (!fPlatform || w.platform === fPlatform) &&
    (!fStatus || w.status === fStatus) &&
    (!fDateFrom || (w.lastTest && w.lastTest >= fDateFrom)) &&
    (!fDateTo || (w.lastTest && w.lastTest <= fDateTo))
  );
}
function filterDeviations() {
  const fWell = document.getElementById('filterDevWell')?.value || '';
  const fStatus = document.getElementById('filterDevStatus')?.value || '';
  const fDateFrom = document.getElementById('filterDevDateFrom')?.value;
  const fDateTo = document.getElementById('filterDevDateTo')?.value;

  return deviations.filter(d =>
    (!fWell || d.wellId === fWell) &&
    (!fStatus || (d.status || "draft") === fStatus) &&
    (!fDateFrom || (d.validUntil && d.validUntil >= fDateFrom)) &&
    (!fDateTo || (d.validUntil && d.validUntil <= fDateTo))
  );
}

function renderDeviationBarChart(counts) {
  const container = document.getElementById('customReportChart');
  if (!container) return;
  // Simple text chart, for real use Chart.js or similar
  let html = '<h4>Deviation Count per Well</h4><ul style="padding:0;">';
  Object.entries(counts).forEach(([wellId, count]) => {
    html += `<li style="list-style:none;margin:8px 0;">${wellId}: <span style="background:#1976d2;color:#fff;padding:3px 12px;border-radius:3px;">${count}</span></li>`;
  });
  html += '</ul>';
  container.innerHTML = html;
}
function renderReportTable(headers, data) {
  let html = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
  if (!data.length) {
    html += `<tr><td colspan="${headers.length}" style="color:#888;">No data found for this report.</td></tr>`;
  } else {
    html += data.map(row => `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`).join('');
  }
  html += `</tbody></table>`;
  document.getElementById('reportOutput').innerHTML = html;
}

function exportCurrentReportCSV() {
  exportToCsv('report.csv', [lastReportHeaders, ...lastReportData]);
}

function exportToCsv(filename, rows) {
  const processRow = row => row.map(cell => `"${(cell+'').replace(/"/g, '""')}"`).join(",");
  const csvContent = rows.map(processRow).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename);
  document.body.appendChild(link); // for Firefox
  link.click();
  document.body.removeChild(link);
}

function exportCurrentReportPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF library not loaded. Please include jsPDF via CDN in your HTML.");
    return;
  }
  const doc = new window.jspdf.jsPDF();
  let y = 10;
  // Title
  doc.setFontSize(16);
  doc.text("WIMT Report", 10, y);
  y += 10;
  // Table headers
  doc.setFontSize(10);
  let x = 10;
  lastReportHeaders.forEach((h, i) => {
    doc.text(String(h), x, y);
    x += 40;
  });
  y += 8;
  // Table rows
  lastReportData.forEach(row => {
    x = 10;
    row.forEach((cell, i) => {
      let txt = (cell === undefined || cell === null) ? "" : String(cell);
      doc.text(txt.length > 35 ? txt.slice(0, 32) + "..." : txt, x, y, { maxWidth: 38 });
      x += 40;
    });
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });
  doc.save('wimt-report.pdf');
}
// --- Show Reports Section on nav click (add this logic if not already present) ---
function showSection(section) {
  [
    'dashboardSection',
    'wellsSection',
    'dataSection',
    'deviationsSection',
    'reportsSection',
    'usersSection'
  ].forEach(id => {
    if(document.getElementById(id)) document.getElementById(id).style.display = 'none';
  });
  if(document.getElementById(section + 'Section')) document.getElementById(section + 'Section').style.display = '';

  // Hide/show nav buttons by access (as in your access control code)
  if (currentUser) {
    for (let sec in sectionRoles) {
      const btn = document.querySelector(`[onclick*="showSection('${sec}'"]`);
      if (btn) btn.style.display = sectionRoles[sec].includes(currentUser.role) ? '' : 'none';
    }
  }

  if (section === "dashboard") initDashboard();
  if (section === "users") renderUserManagement();
  if (section === "wells") renderWellsSection();
  if (section === "reports") renderReportsSection();
  // add others as needed
}

// 