// =================== NOTIFICATION PANEL IMPLEMENTATION ===================

// Add notification panel to globals
window.notificationPanelSettings = window.notificationPanelSettings || {
  isOpen: false,
  activeTab: 'pending-dispensations' // Default tab
};

/**
 * Creates and attaches the notification panel to the DOM
 */
function createNotificationPanel() {
  // Remove any existing panel first
  const existingPanel = document.getElementById('notificationPanel');
  if (existingPanel) existingPanel.remove();
  
  // Create the panel container
  const panel = document.createElement('div');
  panel.id = 'notificationPanel';
  panel.className = 'notification-panel';
  
  // Set panel position based on settings
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: ${window.notificationPanelSettings.isOpen ? '0' : '-350px'};
    width: 350px;
    height: 100vh;
    background: white;
    box-shadow: -3px 0 10px rgba(0,0,0,0.2);
    z-index: 1500;
    display: flex;
    flex-direction: column;
    transition: right 0.3s ease;
  `;
  
  // Create panel header
  const header = document.createElement('div');
  header.style.cssText = `
    background: #70d4e6ff;
    color: white;
    padding: 12px 15px;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #70d4e6ff;
  `;
  header.innerHTML = `
    <div>Notifications</div>
    <button id="closeNotificationPanel" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
  `;
  
  // Create notification counts badge
  const countsDiv = document.createElement('div');
  countsDiv.style.cssText = `
    display: flex;
    gap: 8px;
    padding: 10px 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
  `;
  
  // Get count of various notification types
  const pendingCount = window.dispensationSystem ? window.dispensationSystem.getPendingDispensations().length : 0;
  const approvedCount = window.dispensationSystem ? 
    window.dispensationSystem.deviations.filter(d => d.status === 'approved').length : 0;
  const rejectedCount = window.dispensationSystem ? 
    window.dispensationSystem.deviations.filter(d => d.status === 'rejected').length : 0;
  const retestCount = window.escalationSystem ? 
    window.escalationSystem.escalations.filter(e => e.status === 'retest-requested').length : 0;
  
  countsDiv.innerHTML = `
    <span class="count-badge" style="background: #ffc107; color: #212529; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Pending: ${pendingCount}
    </span>
    <span class="count-badge" style="background: #28a745; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Approved: ${approvedCount}
    </span>
    <span class="count-badge" style="background: #dc3545; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Denied: ${rejectedCount}
    </span>
    <span class="count-badge" style="background: #17a2b8; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Retests: ${retestCount}
    </span>
  `;
  
  // Create tab navigation
  const tabNav = document.createElement('div');
  tabNav.style.cssText = `
    display: flex;
    background: #e9ecef;
    border-bottom: 1px solid #dee2e6;
  `;
  
  // Tab definitions
  const tabs = [
    { id: 'pending-dispensations', title: 'Pending', icon: '⏳' },
    { id: 'approved-dispensations', title: 'Approved', icon: '✓' },
    { id: 'rejected-dispensations', title: 'Denied', icon: '✗' },
    { id: 'retest-requests', title: 'Retests', icon: '🔄' }
  ];
  
  tabs.forEach(tab => {
    const tabButton = document.createElement('button');
    tabButton.id = `tab-${tab.id}`;
    tabButton.dataset.tabId = tab.id;
    tabButton.className = `notification-tab ${window.notificationPanelSettings.activeTab === tab.id ? 'active' : ''}`;
    tabButton.style.cssText = `
      flex: 1;
      padding: 10px;
      border: none;
      background: ${window.notificationPanelSettings.activeTab === tab.id ? '#fff' : 'transparent'};
      cursor: pointer;
      font-size: 12px;
      ${window.notificationPanelSettings.activeTab === tab.id ? 'box-shadow: 0 -3px 0 #007bff inset;' : ''}
    `;
    tabButton.innerHTML = `${tab.icon} ${tab.title}`;
    tabNav.appendChild(tabButton);
  });
  
  // Create content area
  const contentArea = document.createElement('div');
  contentArea.id = 'notificationContent';
  contentArea.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  `;
  
  // Assemble the panel
  panel.appendChild(header);
  panel.appendChild(countsDiv);
  panel.appendChild(tabNav);
  panel.appendChild(contentArea);
  
  // Create toggle button (always visible)
  const toggleButton = document.createElement('button');
  toggleButton.id = 'notificationPanelToggle';
  toggleButton.className = 'notification-panel-toggle';
  toggleButton.style.cssText = `
    position: fixed;
    top: 50%;
    right: ${window.notificationPanelSettings.isOpen ? '350px' : '0'};
    transform: translateY(-50%);
    background: #209ad3ff;
    color: white;
    border: none;
    border-radius: 4px 0 0 4px;
    padding: 10px;
    cursor: pointer;
    z-index: 1499;
    box-shadow: -3px 0 10px rgba(0,0,0,0.2);
    transition: right 0.3s ease;
  `;
  
  toggleButton.innerHTML = window.notificationPanelSettings.isOpen ? '»' : '«';
  
  // Add to document
  document.body.appendChild(panel);
  document.body.appendChild(toggleButton);
  
  // Add event listeners
  document.getElementById('closeNotificationPanel').addEventListener('click', toggleNotificationPanel);
  document.getElementById('notificationPanelToggle').addEventListener('click', toggleNotificationPanel);
  
  // Add tab click listeners
  const tabButtons = document.querySelectorAll('.notification-tab');
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const tabId = e.currentTarget.dataset.tabId;
      setActiveNotificationTab(tabId);
    });
  });
  
  // Load initial tab content
  loadNotificationTabContent(window.notificationPanelSettings.activeTab);
}

/**
 * Toggles the notification panel open/closed state
 */
function toggleNotificationPanel() {
  window.notificationPanelSettings.isOpen = !window.notificationPanelSettings.isOpen;
  
  const panel = document.getElementById('notificationPanel');
  const toggle = document.getElementById('notificationPanelToggle');
  
  if (panel && toggle) {
    panel.style.right = window.notificationPanelSettings.isOpen ? '0' : '-350px';
    toggle.style.right = window.notificationPanelSettings.isOpen ? '350px' : '0';
    toggle.innerHTML = window.notificationPanelSettings.isOpen ? '»' : '«';
  }
}

/**
 * Sets the active tab in the notification panel
 * @param {string} tabId - The ID of the tab to activate
 */
function setActiveNotificationTab(tabId) {
  window.notificationPanelSettings.activeTab = tabId;
  
  // Update tab button styles
  const tabButtons = document.querySelectorAll('.notification-tab');
  tabButtons.forEach(button => {
    const isActive = button.dataset.tabId === tabId;
    button.style.background = isActive ? '#fff' : 'transparent';
    button.style.boxShadow = isActive ? '0 -3px 0 #007bff inset' : 'none';
  });
  
  // Load the tab content
  loadNotificationTabContent(tabId);
}

/**
 * Loads the content for the specified notification tab
 * @param {string} tabId - The ID of the tab to load content for
 */
function loadNotificationTabContent(tabId) {
  const contentArea = document.getElementById('notificationContent');
  if (!contentArea) return;
  
  contentArea.innerHTML = '';
  
  switch (tabId) {
    case 'pending-dispensations':
      loadPendingDispensations(contentArea);
      break;
    case 'approved-dispensations':
      loadApprovedDispensations(contentArea);
      break;
    case 'rejected-dispensations':
      loadDeniedDispensations(contentArea);
      break;
    case 'retest-requests':
      loadRetestRequests(contentArea);
      break;
    default:
      contentArea.innerHTML = '<div style="text-align: center; padding: 20px;">No content available</div>';
  }
}

/**
 * Loads pending dispensation requests into the specified container
 * @param {HTMLElement} container - The container to load content into
 */
function loadPendingDispensations(container) {
  if (!window.dispensationSystem) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">Dispensation system not available</div>';
    return;
  }
  
  const pendingDispegetPendingDispensations = window.dispensationSystem.getPendingDispensations();
  
  if (pendingDispegetPendingDispensations.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">No pending dispensation requests</div>';
    return;
  }
  
  // Sort by creation date (newest first)
  pendingDispegetPendingDispensations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const currentUserRole = window.AuthService?.currentUserData?.role || '';
  const canApprove = currentUserRole === 'admin';
  
  pendingDispegetPendingDispensations.forEach(deviation => {
    const card = document.createElement('div');
    card.className = 'notification-card';
    card.style.cssText = `
      background: white;
      border: 1px solid #dee2e6;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 12px;
      background: #fff3cd;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>⏳ Pending Dispensation</span>
      <span style="font-size: 11px; color: #6c757d;">
        ${new Date(deviation.createdAt).toLocaleString()}
      </span>
    `;
    
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 10px 12px;
    `;
    body.innerHTML = `
      <div style="margin-bottom: 5px;"><strong>Well:</strong> ${deviation.wellName}</div>
      <div style="margin-bottom: 5px;"><strong>Valve:</strong> ${deviation.valveId}</div>
      <div style="margin-bottom: 5px;"><strong>Requested by:</strong> ${deviation.creatorRole || deviation.createdBy}</div>
      <div style="margin-bottom: 5px;"><strong>Expires:</strong> ${new Date(deviation.expiryDate).toLocaleDateString()}</div>
      <div style="margin-bottom: 10px; font-size: 12px; max-height: 60px; overflow: hidden; text-overflow: ellipsis;">
        ${deviation.description}
      </div>
    `;
    
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 8px 12px;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      display: flex;
      justify-content: ${canApprove ? 'space-between' : 'flex-end'};
    `;
    
    // For admins, show approve/reject buttons
    if (canApprove) {
      footer.innerHTML = `
        <div>
          <button class="reject-btn" data-id="${deviation.id}" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 5px 8px; font-size: 12px; cursor: pointer; margin-right: 5px;">Deny</button>
          <button class="approve-btn" data-id="${deviation.id}" style="background: #28a745; color: white; border: none; border-radius: 3px; padding: 5px 8px; font-size: 12px; cursor: pointer;">Approve</button>
        </div>
      `;
    }
    
    // Add view details button for everyone
    footer.innerHTML += `
      <button class="view-btn" data-id="${deviation.id}" data-type="deviation" style="background: #6c757d; color: white; border: none; border-radius: 3px; padding: 5px 8px; font-size: 12px; cursor: pointer;">
        View Details
      </button>
    `;
    
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
  });
  
  // Add event listeners for buttons
  addNotificationActionListeners(container);
}

/**
 * Loads approved dispensations into the specified container
 * @param {HTMLElement} container - The container to load content into
 */
function loadApprovedDispensations(container) {
  if (!window.dispensationSystem) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">Dispensation system not available</div>';
    return;
  }
  
  const approvedDispegetPendingDispensations = window.dispensationSystem.deviations.filter(d => d.status === 'approved');
  
  if (approvedDispegetPendingDispensations.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">No approved dispensations</div>';
    return;
  }
  
  // Sort by approval date (newest first)
  approvedDispegetPendingDispensations.sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0));
  
  approvedDispegetPendingDispensations.forEach(deviation => {
    const card = document.createElement('div');
    card.className = 'notification-card';
    card.style.cssText = `
      background: white;
      border: 1px solid #dee2e6;
      border-left: 4px solid #28a745;
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 12px;
      background: #d4edda;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #155724;
    `;
    header.innerHTML = `
      <span>✓ Approved Dispensation</span>
      <span style="font-size: 11px;">
        ${deviation.approvedAt ? new Date(deviation.approvedAt).toLocaleString() : 'Unknown date'}
      </span>
    `;
    
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 10px 12px;
    `;
    body.innerHTML = `
      <div style="margin-bottom: 5px;"><strong>Well:</strong> ${deviation.wellName}</div>
      <div style="margin-bottom: 5px;"><strong>Valve:</strong> ${deviation.valveId}</div>
      <div style="margin-bottom: 5px;"><strong>Approved by:</strong> ${deviation.approvedBy || 'Unknown'}</div>
      <div style="margin-bottom: 5px;"><strong>Expires:</strong> ${new Date(deviation.expiryDate).toLocaleDateString()}</div>
      <div style="margin-bottom: 5px;"><strong>Requested by:</strong> ${deviation.creatorRole || deviation.createdBy}</div>
    `;
    
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 8px 12px;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      text-align: right;
    `;
    footer.innerHTML = `
      <button class="view-btn" data-id="${deviation.id}" data-type="deviation" style="background: #6c757d; color: white; border: none; border-radius: 3px; padding: 5px 8px; font-size: 12px; cursor: pointer;">
        View Details
      </button>
    `;
    
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
  });
  
  // Add event listeners for buttons
  addNotificationActionListeners(container);
}

/**
 * Loads rejected dispensations into the specified container
 * @param {HTMLElement} container - The container to load content into
 */
function loadDeniedDispensations(container) {
  if (!window.dispensationSystem) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">Dispensation system not available</div>';
    return;
  }
  
  const rejectedDispegetPendingDispensations = window.dispensationSystem.deviations.filter(d => d.status === 'rejected');
  
  if (rejectedDispegetPendingDispensations.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">No rejected dispensations</div>';
    return;
  }
  
  // Sort by denial date (newest first)
  rejectedDispegetPendingDispensations.sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0));
  
  rejectedDispegetPendingDispensations.forEach(deviation => {
    const card = document.createElement('div');
    card.className = 'notification-card';
    card.style.cssText = `
      background: white;
      border: 1px solid #dee2e6;
      border-left: 4px solid #dc3545;
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 12px;
      background: #f8d7da;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #721c24;
    `;
    header.innerHTML = `
      <span>✗ Denied Dispensation</span>
      <span style="font-size: 11px;">
        ${deviation.approvedAt ? new Date(deviation.approvedAt).toLocaleString() : 'Unknown date'}
      </span>
    `;
    
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 10px 12px;
    `;
    body.innerHTML = `
      <div style="margin-bottom: 5px;"><strong>Well:</strong> ${deviation.wellName}</div>
      <div style="margin-bottom: 5px;"><strong>Valve:</strong> ${deviation.valveId}</div>
      <div style="margin-bottom: 5px;"><strong>Denied by:</strong> ${deviation.approvedBy || 'Unknown'}</div>
      <div style="margin-bottom: 5px;"><strong>Requested by:</strong> ${deviation.creatorRole || deviation.createdBy}</div>
    `;
    
    // Add the latest comment (denial reason) if available
    if (deviation.comments && deviation.comments.length > 0) {
      const latestComment = deviation.comments[deviation.comments.length - 1];
      body.innerHTML += `
        <div style="margin-top: 10px; font-size: 12px; color: #721c24;">
          <strong>Reason:</strong> ${latestComment.text}
        </div>
      `;
    }
    
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 8px 12px;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      text-align: right;
    `;
    footer.innerHTML = `
      <button class="view-btn" data-id="${deviation.id}" data-type="deviation" style="background: #6c757d; color: white; border: none; border-radius: 3px; padding: 5px 8px; font-size: 12px; cursor: pointer;">
        View Details
      </button>
    `;
    
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
  });
  
  // Add event listeners for buttons
  addNotificationActionListeners(container);
}

/**
 * Loads retest requests into the specified container
 * @param {HTMLElement} container - The container to load content into
 */
function loadRetestRequests(container) {
  if (!window.escalationSystem) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">Escalation system not available</div>';
    return;
  }
  
  const retestRequests = window.escalationSystem.escalations.filter(e => e.status === 'retest-requested');
  
  if (retestRequests.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">No retest requests</div>';
    return;
  }
  
  // Sort by request date (newest first)
  retestRequests.sort((a, b) => {
    // Find the most recent comment in each escalation, which should be the retest request
    const aComments = a.comments || [];
    const bComments = b.comments || [];
    const aLatestComment = aComments.length > 0 ? aComments[aComments.length - 1] : { timestamp: a.createdAt };
    const bLatestComment = bComments.length > 0 ? bComments[bComments.length - 1] : { timestamp: b.createdAt };
    
    return new Date(bLatestComment.timestamp) - new Date(aLatestComment.timestamp);
  });
  
  retestRequests.forEach(request => {
    const card = document.createElement('div');
    card.className = 'notification-card';
    card.style.cssText = `
      background: white;
      border: 1px solid #dee2e6;
      border-left: 4px solid #17a2b8;
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
    `;
    
    // Find the latest comment (which should be the retest request)
    const comments = request.comments || [];
    const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
    
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 12px;
      background: #d1ecf1;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #0c5460;
    `;
    header.innerHTML = `
      <span>🔄 Retest Requested</span>
      <span style="font-size: 11px;">
        ${latestComment ? new Date(latestComment.timestamp).toLocaleString() : 'Unknown date'}
      </span>
    `;
    
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 10px 12px;
    `;
    body.innerHTML = `
      <div style="margin-bottom: 5px;"><strong>Well:</strong> ${request.wellName}</div>
      <div style="margin-bottom: 5px;"><strong>Valve:</strong> ${request.valveId}</div>
      <div style="margin-bottom: 5px;"><strong>Requested by:</strong> ${latestComment ? latestComment.author : 'Supervisor'}</div>
    `;
    
    // Add comment if available
    if (latestComment) {
      body.innerHTML += `
        <div style="margin-top: 10px; font-size: 12px; border-left: 2px solid #17a2b8; padding-left: 8px;">
          ${latestComment.text}
        </div>
      `;
    }
    
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 8px 12px;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      text-align: right;
    `;
    footer.innerHTML = `
      <button class="view-btn" data-id="${request.id}" data-type="escalation" style="background: #6c757d; color: white; border: none; border-radius: 3px; padding: 5px 8px; font-size: 12px; cursor: pointer;">
        View Details
      </button>
    `;
    
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
  });
  
  // Add event listeners for buttons
  addNotificationActionListeners(container);
}

/**
 * Adds event listeners to action buttons in notifications
 * @param {HTMLElement} container - The container with buttons
 */
function addNotificationActionListeners(container) {
  // View details buttons
  const viewButtons = container.querySelectorAll('.view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const type = e.target.dataset.type;
      
      if (type === 'deviation' && window.dispensationSystem) {
        // Find the deviation's escalation
        const deviation = window.dispensationSystem.deviations.find(d => d.id === id);
        if (deviation) {
          window.dispensationSystem.showDispegetPendingDispensationsForEscalation(deviation.escalationId);
        }
      } else if (type === 'escalation' && window.escalationSystem) {
        // Show the escalation directly (navigate to the well view first)
        const escalation = window.escalationSystem.escalations.find(e => e.id === id);
        if (escalation) {
          // Find the associated ring info to show the modal
          const well = window.wells.find(w => w.name === escalation.wellName);
          if (well && well.christmasTree && well.christmasTree.valves) {
            const valve = well.christmasTree.valves.find(v => v.id === escalation.valveId);
            if (valve) {
              // Construct minimal ring info needed to show the modal
              const ringInfo = {
                label: valve.name || valve.id,
                valveId: escalation.valveId,
                message: escalation.failureDetails?.failureReason || 'Test Failed',
                failureCode: escalation.failureDetails?.failureCode || 0
              };
              showDetailedFailureModal(ringInfo, escalation.wellName);
            }
          }
        }
      }
    });
  });
  
  // Approve buttons
  const approveButtons = container.querySelectorAll('.approve-btn');
  approveButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      
      // Show a simple prompt for comment
      const comment = prompt('Please enter approval comments:', '');
      if (comment === null) return; // User canceled
      
      if (window.dispensationSystem && id) {
        await window.dispensationSystem.approveDeviation(id, comment);
        // Refresh the current tab content
        loadNotificationTabContent(window.notificationPanelSettings.activeTab);
      }
    });
  });
  
  // Deny buttons
  const rejectButtons = container.querySelectorAll('.reject-btn');
  rejectButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      
      // Show a simple prompt for comment
      const comment = prompt('Please enter denial reason:', '');
      if (comment === null) return; // User canceled
      
      if (window.dispensationSystem && id) {
        await window.dispensationSystem.denyDeviation(id, comment);
        // Refresh the current tab content
        loadNotificationTabContent(window.notificationPanelSettings.activeTab);
      }
    });
  });
}

/**
 * Updates notification panel badge counts
 */
function updateNotificationCounts() {
  const countsDiv = document.querySelector('#notificationPanel div:nth-child(2)');
  if (!countsDiv) return;
  
  const pendingCount = window.dispensationSystem ? window.dispensationSystem.getPendingDispensations().length : 0;
  const approvedCount = window.dispensationSystem ? 
    window.dispensationSystem.deviations.filter(d => d.status === 'approved').length : 0;
  const rejectedCount = window.dispensationSystem ? 
    window.dispensationSystem.deviations.filter(d => d.status === 'denied').length : 0;
  const retestCount = window.escalationSystem ? 
    window.escalationSystem.escalations.filter(e => e.status === 'retest-requested').length : 0;
  
  countsDiv.innerHTML = `
    <span class="count-badge" style="background: #ffc107; color: #212529; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Pending: ${pendingCount}
    </span>
    <span class="count-badge" style="background: #28a745; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Approved: ${approvedCount}
    </span>
    <span class="count-badge" style="background: #dc3545; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Denied: ${rejectedCount}
    </span>
    <span class="count-badge" style="background: #17a2b8; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px;">
      Retests: ${retestCount}
    </span>
  `;
  
  // Also update the toggle button notification indicator
  const totalCount = pendingCount + retestCount;
  updateToggleButtonNotification(totalCount);
}

/**
 * Updates the notification indicator on the toggle button
 * @param {number} count - The total number of actionable notifications
 */
function updateToggleButtonNotification(count) {
  const toggleBtn = document.getElementById('notificationPanelToggle');
  if (!toggleBtn) return;
  
  if (count > 0) {
    // Add notification badge
    let badge = toggleBtn.querySelector('.notification-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notification-badge';
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #dc3545;
        color: white;
        border-radius: 50%;
        min-width: 16px;
        height: 16px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
      `;
      toggleBtn.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    // Remove or hide badge
    const badge = toggleBtn.querySelector('.notification-badge');
    if (badge) {
      badge.style.display = 'none';
    }
  }
}

/**
 * Initialize the notification panel
 */
function initializeNotificationPanel() {
  createNotificationPanel();
  
  // Register to update when deviations/escalations change
  if (window.dispensationSystem) {
    // Override the notifyDeviationDecision method to update our panel too
    const originalNotify = window.dispensationSystem.notifyDeviationDecision;
    window.dispensationSystem.notifyDeviationDecision = function(deviation, decision, comment) {
      // Call the original method
      if (originalNotify) {
        originalNotify.call(this, deviation, decision, comment);
      }
      
      // Update our panel
      updateNotificationCounts();
      if (document.getElementById('notificationPanel')) {
        loadNotificationTabContent(window.notificationPanelSettings.activeTab);
      }
    };
  }
}

// Define a modified function to remove dispensation indicators from wells
function addDeviationIndicatorToWell(wellDiv, wellName) {
  // This is now intentionally empty to prevent adding indicators to wells
  // The indicators will only appear in the notification panel
}

// Make functions available globally
window.initializeNotificationPanel = initializeNotificationPanel;
window.toggleNotificationPanel = toggleNotificationPanel;
window.updateNotificationCounts = updateNotificationCounts;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeNotificationPanel();
    
    // Also update counts periodically
    setInterval(updateNotificationCounts, 60000); // Update every minute
  }, 1000); // Give time for other systems to initialize
});


