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

// --- DEV BYPASS: Persist currentUser across reloads, or always auto-login as admin in dev ---
let currentUser = JSON.parse(localStorage.getItem('wimt-currentUser')) || null;
if (!currentUser) {
  currentUser = users.find(u => u.username === "admin");
  localStorage.setItem('wimt-currentUser', JSON.stringify(currentUser));
}

// --- ROLE ACCESS CONTROL ---
const sectionRoles = {
  dashboard: ["admin", "supervisor", "technician"],
  wells: ["admin", "supervisor", "technician"],
  data: ["admin", "supervisor"],
  deviations: ["admin", "supervisor"],
  reports: ["admin"], // Assuming only admin can see reports as per your initial setup
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

  const sectionElement = document.getElementById(section + 'Section');
  if(sectionElement) {
    sectionElement.style.display = '';
  } else {
    console.warn(`Section element ${section + 'Section'} not found.`);
  }

  // Hide/show nav buttons by access
  if (currentUser) {
    for (let sec in sectionRoles) {
      const btn = document.querySelector(`nav button[onclick*="showSection('${sec}')"]`); // More specific selector for nav buttons
      if (btn) {
        btn.style.display = sectionRoles[sec].includes(currentUser.role) ? '' : 'none';
      }
    }
  }

  // Call initialization/rendering functions for the active section
  if (section === "dashboard") {
    if (typeof initDashboard === 'function') initDashboard();
  } else if (section === "users") {
    if (typeof renderUserManagement === 'function') renderUserManagement();
  } else if (section === "wells") {
    if (typeof renderWellsSection === 'function') renderWellsSection();
  } else if (section === "data") {
    // Assuming you have a function to initialize the data section, e.g., renderDataSection or similar
    // if (typeof renderDataSection === 'function') renderDataSection();
    // Or if renderDataMaaspChart is the main initializer for the data view:
    if (typeof renderDataMaaspChart === 'function' && document.getElementById('dataMaaspWellSelect')?.value) {
        // renderDataMaaspChart(); // Or call a general data section initializer
    }
  } else if (section === "deviations") {
    if (typeof renderDeviationsSection === 'function') renderDeviationsSection();
  }
  // *** ADD THIS ELSE IF BLOCK FOR REPORTS ***
  else if (section === "reports") {
    if (typeof renderReportsSection === 'function') {
      renderReportsSection();
    } else {
      console.error('renderReportsSection function is not defined!');
      const reportsUI = document.getElementById('reportsUI');
      if (reportsUI) reportsUI.innerHTML = "<p style='color:red; padding: 20px;'>Error: Could not initialize reports content (render function missing).</p>";
    }
  }
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
  localStorage.removeItem('wimt-currentUser');
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
function sha256Sync(str) { // This is a mock for simplicity in the example. Use proper crypto.
  if (str === 'password') return "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
  if (str === 'supervisor1') return "a4e5b4279d7c0b3e8c73b8a1a39d1ba5f6e6e3ef8f57a4e4c0a4df7e4f0c8e46";
  if (str === 'tech1') return "dc1bffb696477ae4c1d6e6a7b1c2bf76d4e2c5b3a1e4c8b5f7e9c0a2e5c6d1b0";
  // Fallback for other strings - NOT SECURE FOR PRODUCTION, just for example hashing.
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}


// --- LOGIN/SIGNUP HANDLERS ---
document.addEventListener('DOMContentLoaded', () => {
  // If currentUser exists, show UI immediately without login
  if (currentUser) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainMenu').style.display = '';
    document.querySelector('main').style.display = '';
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.username} (${currentUser.role})`;
    showSection('dashboard'); // Show dashboard by default after login
  } else {
    document.getElementById('mainMenu').style.display = 'none';
    document.querySelector('main').style.display = 'none';
    showLogin();
  }

  // Login Logic
  document.getElementById('loginForm').onsubmit = async function(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    users = loadUsers(); // ensure users are loaded
    const hash = await sha256(pass); // Use async sha256
    const found = users.find(u => u.username === user && u.password === hash);
    if (found) {
      currentUser = found;
      localStorage.setItem('wimt-currentUser', JSON.stringify(currentUser));
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('mainMenu').style.display = '';
      document.querySelector('main').style.display = '';
      document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.username} (${currentUser.role})`;
      showSection('dashboard'); // Show dashboard by default after login
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
    users = loadUsers(); // ensure users are loaded
    if (users.find(u => u.username === user)) {
      document.getElementById('signupError').textContent = 'Username already exists.';
      return;
    }
    const hash = await sha256(pass); // Use async sha256
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
  const showKPIDashboardBtn = document.getElementById('showKPIDashboardBtn');
  const kpiDashboardPanel = document.getElementById('kpiDashboardPanel');
  const closeKPIDashboardBtn = document.getElementById('closeKPIDashboardBtn');

  if(showKPIDashboardBtn && kpiDashboardPanel) {
    showKPIDashboardBtn.onclick = function() {
      kpiDashboardPanel.style.display = 'block';
    };
  }
  if(closeKPIDashboardBtn && kpiDashboardPanel) {
    closeKPIDashboardBtn.onclick = function() {
      kpiDashboardPanel.style.display = 'none';
    };
  }
  
  // Remove placeholder content if actual rendering functions will take over
  // document.getElementById('wellList').innerHTML = ''; // Cleared by renderWellsSection
  // document.getElementById('wellDetails').innerHTML = ''; // Managed by wellsection.js
  // document.getElementById('testHistory').innerHTML = ''; // etc.
  // document.getElementById('maintenanceBacklog').innerHTML = '';
  // document.getElementById('pressureTrends').innerHTML = '';
  // document.getElementById('deviationsList').innerHTML = ''; // Cleared by renderDeviationsSection
  document.getElementById('reportsUI').innerHTML = ''; // Will be cleared by renderReportsSection
  // document.getElementById('usersUI').innerHTML = ''; // Cleared by renderUserManagement

  // what is this? // This is for closing modals by clicking outside of them.
  document.addEventListener('mousedown', function (e) {
    ['wellDetailsModal', 'addWellModal', 'editWellModal', 'identificationFormModal', 'confirmDeleteWellModal', 'dispensationModal', 'approveDispensationModal', 'extendDispensationModal', 'valveWizardModal'].forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (!modal || modal.style.display === 'none') return;
      const content = modal.querySelector('.modal-content') || modal.querySelector('.valve-wizard-content'); // Handle different modal content classes
      if (content && !content.contains(e.target) && !e.target.closest('.valve-wizard-close')) { // Ensure close button itself doesn't trigger this
        // Call specific close functions for each modal if they exist
        if (modalId === 'identificationFormModal' && typeof closeIdentificationFormModal === 'function') closeIdentificationFormModal();
        else if (modalId === 'confirmDeleteWellModal' && document.getElementById('cancelDeleteWellBtn')) document.getElementById('cancelDeleteWellBtn').click(); // Simulate cancel click
        else if (modalId === 'dispensationModal' && typeof closeDispensationModal === 'function') closeDispensationModal();
        else if (modalId === 'approveDispensationModal' && typeof closeApproveDispensationModal === 'function') closeApproveDispensationModal();
        else if (modalId === 'extendDispensationModal' && typeof closeExtendDispensationModal === 'function') closeExtendDispensationModal();
        else if (modalId === 'valveWizardModal' && typeof closeValveWizard === 'function') closeValveWizard();
        // Add other specific modal close handlers here if needed
        // else {
        //   modal.style.display = 'none'; // Generic hide if no specific closer
        // }
      }
    });
  });
});