// --- API ENDPOINTS CONFIGURATION ---
const API_BASE_URL = 'http://10.226.113.162:5000/api'; // Updated API base URL

// --- USER AUTHENTICATION & MANAGEMENT ---
class AuthService {
  static currentToken = null;
  static currentUserData = null;

  static async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(data);
      
   

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.currentToken ? `Bearer ${this.currentToken}` : undefined
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  static async getCurrentUser() {
    if (!this.currentToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.currentToken}`
        }
      });
      
      if (!response.ok) {
        console.warn('Token validation failed, logging out');
        this.logout();
        return null;
      }
      
      const user = await response.json();
      this.currentUserData = user;
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      this.logout();
      return null;
    }
  }

  static logout() {
    // Clear in-memory token and user data
    this.currentToken = null;
    this.currentUserData = null;
    console.log('User logged out, token cleared from memory');
  }

  static getStoredUser() {
    return this.currentUserData;
  }

  static getToken() {
    return this.currentToken;
  }
}





// --- ROLE ACCESS CONTROL (Updated) ---
const sectionRoles = {
  dashboard: ["admin", "supervisor", "technician"],
  wells: ["admin", "supervisor", "technician"],
  data: ["admin", "supervisor"],
  deviations: ["admin", "supervisor"],
  reports: ["admin"],
  users: ["admin"],
  decisionMakers: ["admin"] // New section for managing decision makers
};

// --- GLOBAL VARIABLES ---
let currentUser = null;
let decisionMakers = null;

// --- ENHANCED SHOW/HIDE SECTIONS ---
function showSection(section) {
  // Hide all sections
  [
    'dashboardSection',
    'wellsSection', 
    'dataSection',
    'deviationsSection',
    'reportsSection',
    'usersSection',
    'decisionMakersSection' // New section
  ].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  });

  // Show selected section
  const sectionElement = document.getElementById(section + 'Section');
  if (sectionElement) {
    sectionElement.style.display = '';
  } else {
    console.warn(`Section element ${section + 'Section'} not found.`);
  }

  // Update navigation visibility based on roles
  updateNavigationAccess();

  // Initialize section-specific functionality
  initializeSection(section);
}

function updateNavigationAccess() {
  if (!currentUser) return;

  for (let sec in sectionRoles) {
    const btn = document.querySelector(`nav button[onclick*="showSection('${sec}')"]`);
    if (btn) {
      btn.style.display = sectionRoles[sec].includes(currentUser.role) ? '' : 'none';
    }
  }
}

function initializeSection(section) {
  switch(section) {
    case "dashboard":
      if (typeof initDashboard === 'function') initDashboard();
      break;
    case "users":
      if (typeof renderUserManagement === 'function') renderUserManagement();
      break;
    case "wells":
      if (typeof renderWellsSection === 'function') renderWellsSection();
      break;
    case "data":
      if (typeof renderDataMaaspChart === 'function' && document.getElementById('dataMaaspWellSelect')?.value) {
        renderDataMaaspChart();
      }
      break;
    case "deviations":
      if (typeof renderDeviationsSection === 'function') renderDeviationsSection();
      break;
    case "reports":
      if (typeof renderReportsSection === 'function') {
        renderReportsSection();
      } else {
        console.error('renderReportsSection function is not defined!');
        const reportsUI = document.getElementById('reportsUI');
        if (reportsUI) reportsUI.innerHTML = "<p style='color:red; padding: 20px;'>Error: Could not initialize reports content.</p>";
      }
      break;
    case "decisionMakers":
      if (typeof renderDecisionMakersSection === 'function') {
        renderDecisionMakersSection();
      }
      break;
  }
}

// --- ENHANCED LOGIN/LOGOUT FUNCTIONS ---
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

async function logout() {
  try {
    // Call logout endpoint if available
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
  }

  AuthService.logout();
  currentUser = null;
  decisionMakers = null;
  
  document.getElementById('mainMenu').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  
  // Clear form fields but don't store anything
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  
  showLogin();
}

// --- DECISION MAKERS INTEGRATION ---
async function initializeDecisionMakers() {
  try {
    decisionMakers = await DecisionMakersService.getDecisionMakers();
    
    // Update lead engineer with current user info if they're a technician/engineer
    if (currentUser && (currentUser.role === 'technician' || currentUser.title?.toLowerCase().includes('engineer'))) {
      decisionMakers.leadEngineer.name = currentUser.email;
      decisionMakers.leadEngineer.email = currentUser.email || `${currentUser.email}@company.com`;
    }
    
    return decisionMakers;
  } catch (error) {
    console.error('Failed to initialize decision makers:', error);
    decisionMakers = DecisionMakersService.getDefaultDecisionMakers();
    return decisionMakers;
  }
}

// --- UTILITY FUNCTIONS ---
function getUserByRole(role) {
  if (!decisionMakers) return null;
  
  return decisionMakers.decisionMakers.find(dm => dm.role === role) || null;
}

function getEscalationPath(currentLevel) {
  if (!decisionMakers) return [];
  
  return decisionMakers.decisionMakers
    .filter(dm => dm.level > currentLevel)
    .sort((a, b) => a.level - b.level);
}

function canUserApprove(deviation, user) {
  if (!user || !decisionMakers) return false;
  
  // Check if user is in decision makers list
  const isDecisionMaker = decisionMakers.decisionMakers.some(dm => 
    dm.email === user.email || dm.name === user.email
  );
  
  // Or check by role permissions
  const hasRolePermission = ['admin', 'supervisor'].includes(user.role);
  
  return isDecisionMaker || hasRolePermission;
}

// --- MAIN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // No stored session checking since we don't store anything locally
  // Always show login on page load
  showLogin();
  setupEventHandlers();
});

async function initializeApp() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('mainMenu').style.display = '';
  document.querySelector('main').style.display = '';
  document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.email} (${currentUser.role})`;
  
  // Initialize decision makers
  await initializeDecisionMakers();
  
  // Show dashboard by default
  showSection('dashboard');
}

function setupEventHandlers() {
  // Login form handler
  document.getElementById('loginForm').onsubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    try {
      currentUser = await AuthService.login(email, password);
      await initializeApp();
    } catch (error) {
      document.getElementById('loginError').textContent = 'Invalid email or password.';
    }
  };

  // Signup form handler
  document.getElementById('signupForm').onsubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('signupUser').value.trim();
    const password = document.getElementById('signupPass').value.trim();
    const role = document.getElementById('signupRole').value;
    
    if (!email || !password || !role) {
      document.getElementById('signupError').textContent = 'Fill all fields.';
      return;
    }

    try {
      await AuthService.register({ email, password, role });
      document.getElementById('signupError').textContent = 'User created. Please log in.';
      setTimeout(showLogin, 1500);
    } catch (error) {
      document.getElementById('signupError').textContent = error.message || 'Registration failed.';
    }
  };

  // Navigation handlers
  document.getElementById('toSignupBtn').onclick = showSignUp;
  document.getElementById('toLoginBtn').onclick = showLogin;
  document.getElementById('logoutBtn').onclick = logout;

  // KPI Dashboard handlers
  const showKPIDashboardBtn = document.getElementById('showKPIDashboardBtn');
  const kpiDashboardPanel = document.getElementById('kpiDashboardPanel');
  const closeKPIDashboardBtn = document.getElementById('closeKPIDashboardBtn');

  if (showKPIDashboardBtn && kpiDashboardPanel) {
    showKPIDashboardBtn.onclick = () => kpiDashboardPanel.style.display = 'block';
  }
  if (closeKPIDashboardBtn && kpiDashboardPanel) {
    closeKPIDashboardBtn.onclick = () => kpiDashboardPanel.style.display = 'none';
  }

  // Modal close handlers
  setupModalHandlers();
}

function setupModalHandlers() {
  document.addEventListener('mousedown', function (e) {
    const modalIds = [
      'wellDetailsModal', 'addWellModal', 'editWellModal', 
      'identificationFormModal', 'confirmDeleteWellModal', 
      'dispensationModal', 'approveDispensationModal', 
      'extendDispensationModal', 'valveWizardModal'
    ];

    modalIds.forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (!modal || modal.style.display === 'none') return;
      
      const content = modal.querySelector('.modal-content') || modal.querySelector('.valve-wizard-content');
      if (content && !content.contains(e.target) && !e.target.closest('.valve-wizard-close')) {
        // Call specific close functions
        const closeFunctions = {
          'identificationFormModal': 'closeIdentificationFormModal',
          'dispensationModal': 'closeDispensationModal',
          'approveDispensationModal': 'closeApproveDispensationModal',
          'extendDispensationModal': 'closeExtendDispensationModal',
          'valveWizardModal': 'closeValveWizard'
        };

        const closeFunction = closeFunctions[modalId];
        if (closeFunction && typeof window[closeFunction] === 'function') {
          window[closeFunction]();
        } else if (modalId === 'confirmDeleteWellModal') {
          const cancelBtn = document.getElementById('cancelDeleteWellBtn');
          if (cancelBtn) cancelBtn.click();
        }
      }
    });
  });
}

// --- EXPORT FOR USE IN OTHER MODULES ---
window.AuthService = AuthService;
window.currentUser = () => currentUser;
window.decisionMakers = () => decisionMakers;
window.canUserApprove = canUserApprove;
window.getEscalationPath = getEscalationPath;