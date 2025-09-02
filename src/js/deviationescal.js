// Add deviation tracking to globals
window.activeDeviations = window.activeDeviations || [];
window.deviationIdCounter = window.deviationIdCounter || 1;

// Deviation data structure
class DeviationSystem {
  constructor() {
    this.deviations = window.activeDeviations;
  }

  // Create a new deviation request
  async createDeviation(escalationId, description, justification, expiryDate) {
  // Fetch escalation (failure) strictly from DB
  const failure = await this.fetchFailureById(escalationId);
  if (!failure) {
    console.error(`Cannot create deviation - failure ${escalationId} not found in DB`);
    showTemporaryMessage('Failed to create deviation: failure not found', 'error');
    return null;
  }

  if (!description || !justification || !expiryDate) {
    console.error('Error: Cannot create deviation without required fields');
    showTemporaryMessage('Failed to create deviation: Missing required fields', 'error');
    return null;
  }

  const userEmail = window.AuthService.currentUserData?.email || 'unknown';
  const userRole = window.AuthService.currentUserData?.role || 'technician';

  const deviation = {
    id: `DEV-${Date.now()}-${window.deviationIdCounter++}`,
    dbId: undefined,
    escalationId,
    wellName: `Well ID: ${failure.wellId}`,
    wellId: failure.wellId,
    valveId: failure.valveId,
    description,
    justification,
    expiryDate: new Date(expiryDate),
    status: 'pending',
    createdAt: new Date(),
    createdBy: userEmail,
    creatorRole: userRole,
    approvedAt: null,
    approvedBy: null,
    comments: []
  };

  this.deviations.push(deviation);
  this.updateDashboardDeviationIndicators();

  try {
    const saved = await this.sendDeviationToDatabase(deviation);
    if (saved && saved.id) deviation.dbId = saved.id;
  } catch (_) {}
  return deviation;
}
// Send deviation to database
  async sendDeviationToDatabase(deviation) {
  try {

    const failureId = deviation.escalationId;

    // Validate that failureId exists
    if (!failureId) {
      console.error('Failure ID is required to send deviation to database');
      throw new Error('Failure ID is required');
    }

    // Fetch the failure record to get the actual failure ID
    const failure = await this.fetchFailureById(failureId);
    if (!failure) {
      console.error(`Cannot send deviation to database - failure ${failureId} not found in DB`);
      showTemporaryMessage('Failed to send deviation: failure not found', 'error');
      return null;
    }




    const payload = {
      failureId: deviation.escalationId,
      description: deviation.description,
      justification: deviation.justification ?? null,
      status: deviation.status,
      createdAt: deviation.createdAt ? new Date(deviation.createdAt).toISOString() : undefined,
      updatedAt: new Date().toISOString(),
      expiryDate: deviation.expiryDate ? new Date(deviation.expiryDate).toISOString() : undefined
    };
    

    const response = await fetch(`http://10.226.113.12:5000/api/integrity_test/action?id=${encodeURIComponent(deviation.escalationId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text().catch(() => '')}`);
    }

    const result = await response.json();
    console.log('Deviation saved to database:', result);
    if (result && result.id && !deviation.dbId) {
      deviation.dbId = result.id;

    }
    return result;
  } catch (error) {
    console.error('Failed to save deviation to database:', error);
    showTemporaryMessage('Warning: Failed to save to database, but deviation created locally', 'warning');
    throw error;
  }
}
  // Update deviation in database
  async updateDeviationInDatabase(deviation) {
  try {
    const payload = {
   
      status: deviation.status,
     
      updatedAt: new Date().toISOString(),
     
    };
    


    const resp = await fetch(`http://10.226.113.12:5000/api/integrity_test/action/${encodeURIComponent(deviation.dbId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });

     if (!resp.ok) throw new Error(await resp.text().catch(() => String(resp.status)));
  return await resp.json(); // { id, failure_id, ... }}
  } catch (error) {
    console.error('Failed to update deviation in database:', error);
    showTemporaryMessage('Warning: Failed to update database', 'warning');
    throw error;
  }
}




async fetchDeviationsForEscalationFromDatabase(failureId) {
  try {
    const resp = await fetch(`http://10.226.113.12:5000/api/integrity_test/action?failure_id=${encodeURIComponent(failureId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) {
      console.warn('Failed to fetch deviations from DB', resp.status, await resp.text().catch(() => ''));
      return [];
    }

    const data = await resp.json();
    const arr = Array.isArray(data) ? data : (data ? [data] : []);
    const esc = window.escalationSystem.escalations.find(e => e.id === failureId);

    const mapped = arr.map(r => ({
      id: r.id ? `DEV-${r.id}` : `DEV-REMOTE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dbId: r.id,
      escalationId: r.failure_id,
      wellName: esc?.wellName,
      wellId: esc?.wellId,
      valveId: esc?.valveId,
      description: r.description,
      justification: r.justification ?? '',
      status: r.status || 'pending',
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
      expiryDate: esc?.expiryDate, // keep local if you use it
      createdBy: esc?.createdBy || '',
      creatorRole: esc?.creatorRole || '',
      approvedAt: null,
      approvedBy: null,
      comments: []
    }));

    // Merge into local list
    mapped.forEach(m => {
      const idx = this.deviations.findIndex(d => (d.dbId && m.dbId && d.dbId === m.dbId) || d.id === m.id);
      if (idx >= 0) {
        this.deviations[idx] = { ...this.deviations[idx], ...m };
      } else {
        this.deviations.push(m);
      }
    });

    // Refresh indicators if needed
    this.updateDashboardDeviationIndicators();

    return mapped;
  } catch (e) {
    console.warn('Error fetching deviations from DB', e);
    return [];
  }
}
  // Approve a deviation request (admin only)
  async approveDeviation(deviationId, comment = '') {
    const deviation = this.deviations.find(d => d.id === deviationId);
    if (deviation) {
      deviation.status = 'approved';
      deviation.approvedAt = new Date();
      deviation.approvedBy = window.AuthService.currentUserData?.email || 'admin';
      
      if (comment) {
        deviation.comments.push({
          text: `Approval comment: ${comment}`,
          author: window.AuthService.currentUserData?.email || 'admin',
          timestamp: new Date()
        });
      }

      // Send notification to creator
      this.notifyDeviationDecision(deviation, 'approved', comment);

      // Update dashboard indicators
      this.updateDashboardDeviationIndicators();
      
      // Update in database when implemented
    try {
      await this.updateDeviationInDatabase(deviation);
    } catch (error) {
  // Database update failed, but local update succeeded
}

      
      return true;
    }
    return false;
  }

  // Deny a deviation request (admin only)
  async denyDeviation(deviationId, comment = '') {
    const deviation = this.deviations.find(d => d.id === deviationId);
    if (deviation) {
      deviation.status = 'denied';
      deviation.approvedAt = new Date(); // Still use approvedAt for the decision timestamp
      deviation.approvedBy = window.AuthService.currentUserData?.email || 'admin';
      
      if (comment) {
        deviation.comments.push({
          text: `Denial reason: ${comment}`,
          author: window.AuthService.currentUserData?.email || 'admin',
          timestamp: new Date()
        });
      }

      // Send notification to creator
      this.notifyDeviationDecision(deviation, 'denied', comment);

      // Update dashboard indicators
      this.updateDashboardDeviationIndicators();
      
      // Update in database when implemented
      try {
        await this.updateDeviationInDatabase(deviation);
      } catch (error) {
        // Database update failed, but local update succeeded
      }
      return true;
    }
    return false;
  }

  async showDeviationsForEscalation(escalationId) {
  await this.fetchDeviationsForEscalationFromDatabase(escalationId);

  const deviations = this.getDeviationsForEscalation(escalationId);
  if (!deviations || deviations.length === 0) {
    showTemporaryMessage('No dispensations found for this escalation', 'info');
    return;
  }

  const escalation = window.escalationSystem.escalations.find(e => e.id === escalationId);
  if (!escalation) return;

  const existingModal = document.getElementById('deviationListModal');
  if (existingModal) existingModal.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'deviationListModal';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.75); z-index: 2100; display: flex;
    align-items: center; justify-content: center; backdrop-filter: blur(5px);
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
    width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
    position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
  `;

  let deviationsHtml = '';
  deviations.forEach(dev => {
    const statusColor = dev.status === 'approved' ? '#28a745' : (dev.status === 'denied' ? '#dc3545' : '#ffc107');
    const statusLabel = dev.status.charAt(0).toUpperCase() + dev.status.slice(1);

    deviationsHtml += `
      <div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
        <div style="background: #f8f9fa; padding: 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: bold;">${dev.id}</span>
            <span style="margin-left: 10px; background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${statusLabel}</span>
          </div>
          <div style="font-size: 0.8em; color: #666;">Created: ${new Date(dev.createdAt).toLocaleString()}</div>
        </div>
        <div style="padding: 12px;">
          <p style="margin: 0 0 8px 0;"><strong>Description:</strong> ${dev.description}</p>
          <p style="margin: 0 0 8px 0;"><strong>Justification:</strong> ${dev.justification || '-'}</p>
          ${dev.expiryDate ? `<p style="margin: 0;"><strong>Expires:</strong> ${new Date(dev.expiryDate).toLocaleDateString()}</p>` : ''}
        </div>
      </div>
    `;
  });

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 1.5em;">Dispensations for ${escalation.wellName}</h3>
      <button id="closeDeviationListModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
    </div>
    <div style="margin-bottom: 15px; background: #f0f0f0; padding: 10px; border-radius: 4px;">
      <p style="margin: 0; font-size: 0.9em;"><strong>Escalation:</strong> ${escalation.id}</p>
      <p style="margin: 5px 0 0; font-size: 0.9em;"><strong>Valve:</strong> ${escalation.valveId}</p>
    </div>
    <div>
      ${deviationsHtml}
    </div>
    <div style="text-align: right; margin-top: 20px;">
      <button id="closeListBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  document.getElementById('closeDeviationListModal').onclick = closeModal;
  document.getElementById('closeListBtn').onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
}


async showDeviationRequestForm(failureId) {
  const failure = await this.fetchFailureById(failureId);
  if (!failure) {
    console.error(`Cannot show deviation form - failure ${failureId} not found in DB`);
    showTemporaryMessage('Cannot open dispensation form: failure not found', 'error');
    return;
  }

  const existingModal = document.getElementById('deviationRequestModal');
  if (existingModal) existingModal.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'deviationRequestModal';
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.75); z-index: 2100; display: flex;
    align-items: center; justify-content: center; backdrop-filter: blur(5px);
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
    width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;
    position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    border-top: 5px solid #ff9800;
  `;

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minExpiryDate = tomorrow.toISOString().split('T')[0];
  const defaultExpiry = new Date(); defaultExpiry.setDate(defaultExpiry.getDate() + 30);
  const defaultExpiryDate = defaultExpiry.toISOString().split('T')[0];

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 1.5em;">Create Dispensation Request</h3>
      <button id="closeDeviationModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
    </div>

    <div style="margin-bottom: 15px; background: #f8f9fa; padding: 12px; border-radius: 4px; border-left: 4px solid #007bff;">
      <p style="margin: 0; font-size: 0.9em;">For <strong>Well ID: ${failure.wellId}</strong>, Valve <strong>${failure.valveId}</strong></p>
      <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;"><strong>Failure ID:</strong> ${failure.id}</p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 15px;">
      <div>
        <label for="deviationDescription" style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
        <textarea id="deviationDescription" placeholder="Describe the dispensation needed..."
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; resize: vertical;"></textarea>
      </div>
      <div>
        <label for="deviationJustification" style="display: block; margin-bottom: 5px; font-weight: bold;">Justification:</label>
        <textarea id="deviationJustification" placeholder="Explain why this dispensation is necessary..."
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; resize: vertical;"></textarea>
      </div>
      <div>
        <label for="deviationExpiry" style="display: block; margin-bottom: 5px; font-weight: bold;">Expiry Date:</label>
        <input type="date" id="deviationExpiry" min="${minExpiryDate}" value="${defaultExpiryDate}"
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <p style="margin: 5px 0 0; font-size: 0.8em; color: #666;">Specify how long this dispensation should remain in effect</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 24px; padding-top: 15px; border-top: 1px solid #eee;">
      <button id="cancelDeviationBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
      <button id="submitDeviationBtn" style="background: #ff9800; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Submit for Approval</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  document.getElementById('closeDeviationModal').onclick = closeModal;
  document.getElementById('cancelDeviationBtn').onclick = closeModal;
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  document.getElementById('submitDeviationBtn').onclick = async () => {
    const description = document.getElementById('deviationDescription').value.trim();
    const justification = document.getElementById('deviationJustification').value.trim();
    const expiryDate = document.getElementById('deviationExpiry').value;


    if (!description || !justification || !expiryDate) {
      showTemporaryMessage('Please fill all required fields', 'error');
      return;
    }

    const deviation = await this.createDeviation(failureId, description, justification, expiryDate);
    if (deviation) {
      showTemporaryMessage('Dispensation request submitted for approval', 'success');
      closeModal();
      const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
      if (typeof renderFilteredDashboard === 'function') {
        renderFilteredDashboard(currentFilter);
      }
    } else {
      showTemporaryMessage('Failed to create dispensation request', 'error');
    }
  };
}

async fetchFailureById(failureId) {
  try {
    const resp = await fetch(`http://10.226.113.12:5000/api/integrity_test/failure?id=${encodeURIComponent(failureId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) {
      console.warn('Failed to fetch failure by id', resp.status, await resp.text().catch(() => ''));
      return null;
    }
    const data = await resp.json();
    const rec = Array.isArray(data) ? data[0] : data;
    if (!rec) return null;

    return {
      id: rec.escalationId || rec.id || failureId,
      wellId: rec.wellId || rec.well_id || rec.well || null,
      valveId: rec.valveId || rec.valve_id || rec.valve || null,
      createdBy: rec.createdBy || rec.created_by || '',
      createdAt: rec.createdAt || rec.created_at || null
    };
  } catch (e) {
    console.warn('Error fetching failure by id', e);
    return null;
  }
}
  // Get all deviations for a specific escalation
  getDeviationsForEscalation(escalationId) {
    return this.deviations.filter(d => d.escalationId === escalationId);
  }

  // Get all pending deviations that need admin review
  getPendingDeviations() {
    return this.deviations.filter(d => d.status === 'pending');
  }

  // Get all deviations for a specific well
  getDeviationsForWell(wellName) {
    return this.deviations.filter(d => d.wellName === wellName);
  }

  // Check if user can create deviations (only supervisors and managers)
  canCreateDeviations() {
    const userRole = window.AuthService.currentUserData?.role;
    if (!userRole) return false;
    
    // Admins don't create deviations, they only approve/deny them
    // Only supervisors and managers can create deviations
    return ['supervisor', 'manager'].includes(userRole);
  }

  // Check if user can approve/deny deviations (only admins)
  canApproveDeviations() {
    const userRole = window.AuthService.currentUserData?.role;
    if (!userRole) return false;
    
    // Check if user is admin
    return ['admin'].includes(userRole);
  }

  // Add a comment to a deviation
  addCommentToDeviation(deviationId, comment) {
    const deviation = this.deviations.find(d => d.id === deviationId);
    if (deviation && comment) {
      deviation.comments.push({
        text: comment,
        author: window.AuthService.currentUserData?.email || 'user',
        timestamp: new Date()
      });
      // Update in database when implemented
      // this.updateDeviationInDatabase(deviation);
    }
  }

  // Update dashboard indicators
  updateDashboardDeviationIndicators() {
    // Update admin notification badge for pending deviations
    this.updateAdminNotificationBadge();

    // Refresh all well indicators
    addDeviationIndicatorsToWells(); // Make sure all deviation indicators are refreshed
  
    
    // Trigger dashboard re-render if needed
    const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
    if (typeof renderFilteredDashboard === 'function') {
      renderFilteredDashboard(currentFilter);
    }
  }

  // Update notification badge for admins
  updateAdminNotificationBadge() {
    const pendingCount = this.getPendingDeviations().length;
    
    // If user is admin and there are pending deviations, show notification
    const isAdmin = this.canApproveDeviations();
    if (isAdmin && pendingCount > 0) {
      // Find or create admin notification area
      let notifBadge = document.getElementById('adminDeviationBadge');
      
      if (!notifBadge) {
        const headerArea = document.querySelector('header') || document.querySelector('.navbar');
        if (headerArea) {
          notifBadge = document.createElement('div');
          notifBadge.id = 'adminDeviationBadge';
          notifBadge.style.cssText = `
            position: absolute;
            top: 10px;
            right: 20px;
            background: #dc3545;
            color: white;
            border-radius: 50%;
            padding: 5px 10px;
            font-weight: bold;
            cursor: pointer;
            z-index: 100;
          `;
          notifBadge.addEventListener('click', () => this.showDeviationAdminPanel());
          headerArea.appendChild(notifBadge);
        }
      }
      
      if (notifBadge) {
        notifBadge.textContent = pendingCount;
        notifBadge.title = `${pendingCount} dispensation request${pendingCount !== 1 ? 's' : ''} pending approval`;
        notifBadge.style.display = 'block';
      }
    } else {
      // Hide badge if no pending deviations or user is not admin
      const badge = document.getElementById('adminDeviationBadge');
      if (badge) badge.style.display = 'none';
    }
  }

  // Notify creator about deviation decision
  notifyDeviationDecision(deviation, decision, comment) {
    // For now, we'll just use a temporary message and update UI
    const decision_text = decision === 'approved' ? 'approved' : 'denied';
    const message = `Dispensation request ${decision_text} for well ${deviation.wellName}`;
    
    // Show temporary message
    showTemporaryMessage(message, decision === 'approved' ? 'success' : 'warning');
    
    // Update dashboard
    const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
    if (typeof renderFilteredDashboard === 'function') {
      renderFilteredDashboard(currentFilter);
    }
    
    // Update any open modals that might be showing this deviation
    this.refreshOpenModalsWithDeviationUpdate(deviation);
  }

  // Refresh open modals with updated deviation information
  refreshOpenModalsWithDeviationUpdate(deviation) {
    // If failure modal is open and showing this well/valve, refresh it
    const failureDetailModal = document.getElementById('failureDetailModal');
    if (failureDetailModal) {
      // Find the escalation tied to this deviation
      const escalation = window.escalationSystem.escalations.find(e => e.id === deviation.escalationId);
      if (escalation) {
        // Find any open ring info for this valve
        const ringInfo = window.lastRingInfo; // Assuming you store last shown ring info
        if (ringInfo && ringInfo.valveId === escalation.valveId) {
          // Re-show the modal with updated info
          showDetailedFailureModal(ringInfo, escalation.wellName);
        }
      }
    }
  }

  // Show deviation request form


  // Show deviation summary for a well
  
  // Show admin panel for managing deviations
  showDeviationAdminPanel() {
    const existingModal = document.getElementById('deviationAdminModal');
    if (existingModal) existingModal.remove();
    
    // Get pending deviations that need review
    const pendingDeviations = this.getPendingDeviations();
    
    // Also get recently decided deviations (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentlyDecidedDeviations = this.deviations.filter(d => 
      d.status !== 'pending' && 
      d.approvedAt && 
      new Date(d.approvedAt) > oneWeekAgo
    );
    
    const backdrop = document.createElement('div');
    backdrop.id = 'deviationAdminModal';
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 2100; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(5px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
      width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;
      position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
      border-top: 5px solid #dc3545;
    `;
    
    // Create HTML for pending deviations
    let pendingDeviationsHtml = '';
    
    if (pendingDeviations.length === 0) {
      pendingDeviationsHtml = `
        <div style="text-align: center; padding: 30px 20px; background: #f8f9fa; border-radius: 4px;">
          <p style="margin: 0; color: #6c757d; font-style: italic;">No pending dispensation requests to review</p>
        </div>
      `;
    } else {
      pendingDeviations.forEach((deviation, index) => {
        pendingDeviationsHtml += `
          <div id="deviation-${deviation.id}" class="deviation-card" style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
            <div style="background: #fff3cd; padding: 12px; border-bottom: 1px solid #ddd;">
              <h4 style="margin: 0; color: #856404;">⏳ Pending Dispensation Request #${index + 1}</h4>
              <p style="margin: 5px 0 0; font-size: 0.9em; color: #666;">Submitted by ${deviation.createdBy} (${deviation.creatorRole}) on ${new Date(deviation.createdAt).toLocaleString()}</p>
            </div>
            <div style="padding: 15px;">
              <div style="margin-bottom: 10px;">
                <p style="margin: 0; font-size: 0.9em;"><strong>Well:</strong> ${deviation.wellName} - Valve ${deviation.valveId}</p>
                <p style="margin: 3px 0 0; font-size: 0.9em;"><strong>Related Escalation:</strong> ${deviation.escalationId}</p>
                <p style="margin: 3px 0 0; font-size: 0.9em;"><strong>Requested Expiry Date:</strong> ${new Date(deviation.expiryDate).toLocaleDateString()}</p>
              </div>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                <h5 style="margin: 0 0 8px 0; color: #495057;">Description:</h5>
                <p style="margin: 0; white-space: pre-wrap;">${deviation.description}</p>
              </div>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px;">
                <h5 style="margin: 0 0 8px 0; color: #495057;">Justification:</h5>
                <p style="margin: 0; white-space: pre-wrap;">${deviation.justification}</p>
              </div>
              <div style="margin-top: 15px;">
                <label for="comment-${deviation.id}" style="display: block; margin-bottom: 5px; font-weight: bold;">Decision Comments (required):</label>
                <textarea id="comment-${deviation.id}" placeholder="Add comments about your decision..."
                  style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px; resize: vertical;"></textarea>
                <p style="margin: 5px 0 0; font-size: 0.8em; color: #dc3545;">* Comments are required when making a decision</p>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
                <button onclick="handleDenyDeviation('${deviation.id}')"
                  style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                  Deny Request
                </button>
                <button onclick="handleApproveDeviation('${deviation.id}')"
                  style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }
    
    // Create HTML for recently decided deviations
    let recentDecisionsHtml = '';
    
    if (recentlyDecidedDeviations.length > 0) {
      recentDecisionsHtml = `
        <h4 style="margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #ddd;">Recent Decisions</h4>
      `;
      
      recentlyDecidedDeviations.forEach((deviation) => {
        const isApproved = deviation.status === 'approved';
        const statusBg = isApproved ? '#d4edda' : '#f8d7da';
        const statusColor = isApproved ? '#155724' : '#721c24';
        const statusIcon = isApproved ? '✓' : '✗';
        const statusText = isApproved ? 'Approved' : 'Denied';
        
        recentDecisionsHtml += `
          <div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
            <div style="background: ${statusBg}; padding: 10px; border-bottom: 1px solid #ddd; color: ${statusColor}; display: flex; justify-content: space-between;">
              <div>
                <strong>${statusIcon} ${statusText}</strong> - Well ${deviation.wellName}, Valve ${deviation.valveId}
              </div>
              <div style="font-size: 0.9em;">
                Decision: ${new Date(deviation.approvedAt).toLocaleString()}
              </div>
            </div>
            <div style="padding: 10px; font-size: 0.9em;">
              <p style="margin: 0 0 5px 0;"><strong>Requestor:</strong> ${deviation.createdBy} (${deviation.creatorRole})</p>
              <p style="margin: 0 0 5px 0;"><strong>Decision by:</strong> ${deviation.approvedBy}</p>
              ${deviation.comments && deviation.comments.length > 0 ? 
                `<p style="margin: 0;"><strong>Comment:</strong> ${deviation.comments[deviation.comments.length-1].text}</p>` : 
                '<p style="margin: 0; color: #6c757d; font-style: italic;">No comments provided</p>'
              }
            </div>
          </div>
        `;
      });
    }
    
    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.5em;">Dispensation Request Management</h3>
        <button id="closeAdminModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
      </div>
      <p style="color: #666; margin-top: 0; margin-bottom: 20px;">
        <strong>${pendingDeviations.length}</strong> dispensation request${pendingDeviations.length !== 1 ? 's' : ''} pending your review.
      </p>
      <div>
        ${pendingDeviationsHtml}
        ${recentDecisionsHtml}
      </div>
      <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <button id="closeAdminBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const closeModal = () => backdrop.remove();
    document.getElementById('closeAdminModal').onclick = closeModal;
    document.getElementById('closeAdminBtn').onclick = closeModal;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
    
    // Add global handlers for approve/deny
    window.handleApproveDeviation = (deviationId) => {
      const commentEl = document.getElementById(`comment-${deviationId}`);
      const comment = commentEl?.value?.trim() || '';
      
      if (!comment) {
        showTemporaryMessage('Please provide comments with your decision', 'error');
        commentEl.focus();
        return;
      }
      
      window.deviationSystem.approveDeviation(deviationId, comment).then(() => {
        document.getElementById(`deviation-${deviationId}`).remove();
        showTemporaryMessage('Dispensation request approved', 'success');
        
        // Check if we should close the modal (no more pending items)
        if (window.deviationSystem.getPendingDeviations().length === 0) {
          setTimeout(() => {
            const modal = document.getElementById('deviationAdminModal');
            if (modal) modal.remove();
            
            // Refresh the dashboard
            const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
            if (typeof renderFilteredDashboard === 'function') {
              renderFilteredDashboard(currentFilter);
            }
          }, 1500);
        } else {
          // Refresh the modal to show in recent decisions
          window.deviationSystem.showDeviationAdminPanel();
        }
      });
    };
    
    window.handleDenyDeviation = (deviationId) => {
      const commentEl = document.getElementById(`comment-${deviationId}`);
      const comment = commentEl?.value?.trim() || '';
      
      if (!comment) {
        showTemporaryMessage('Please provide comments with your decision', 'error');
        commentEl.focus();
        return;
      }
      
      window.deviationSystem.denyDeviation(deviationId, comment).then(() => {
        document.getElementById(`deviation-${deviationId}`).remove();
        showTemporaryMessage('Dispensation request denied', 'info');
        
        // Check if we should close the modal (no more pending items)
        if (window.deviationSystem.getPendingDeviations().length === 0) {
          setTimeout(() => {
            const modal = document.getElementById('deviationAdminModal');
            if (modal) modal.remove();
            
            // Refresh the dashboard
            const currentFilter = document.getElementById('dashboardFilter')?.value || 'with-failures';
            if (typeof renderFilteredDashboard === 'function') {
              renderFilteredDashboard(currentFilter);
            }
          }, 1500);
        } else {
          // Refresh the modal to show in recent decisions
          window.deviationSystem.showDeviationAdminPanel();
        }
      });
    };
  }
  
  // Show well deviation summary
  showWellDeviationSummary(wellName) {
    // Get all deviations for this well
    const deviations = this.getDeviationsForWell(wellName);
    
    if (!deviations || deviations.length === 0) {
      showTemporaryMessage('No dispensations found for this well', 'info');
      return;
    }
    
    const existingModal = document.getElementById('wellDeviationSummaryModal');
    if (existingModal) existingModal.remove();
    
    const backdrop = document.createElement('div');
    backdrop.id = 'wellDeviationSummaryModal';
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 2100; display: flex;
      align-items: center; justify-content: center; backdrop-filter: blur(5px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #ffffff; color: #333; border-radius: 8px; padding: 24px;
      width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
      position: relative; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
    `;
    
    // Sort deviations with active/pending first, then by date
    const sortedDeviations = [...deviations].sort((a, b) => {
      // First by status priority
      const statusPriority = { 'approved': 1, 'pending': 2, 'denied': 3 };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    let deviationsHtml = '';
    sortedDeviations.forEach(dev => {
      const statusColor = dev.status === 'approved' ? '#28a745' : (dev.status === 'denied' ? '#dc3545' : '#ffc107');
      const statusIcon = dev.status === 'approved' ? '✓' : (dev.status === 'denied' ? '✗' : '⏳');
      const statusLabel = dev.status.charAt(0).toUpperCase() + dev.status.slice(1);
      
      deviationsHtml += `
        <div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
          <div style="background: ${statusColor}; padding: 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; color: white;">
            <div>
              <span style="font-weight: bold;">${statusIcon} ${statusLabel}</span>
              ${dev.status === 'approved' ? `<span style="margin-left: 10px; font-size: 0.9em;">Valid until: ${new Date(dev.expiryDate).toLocaleDateString()}</span>` : ''}
            </div>
            <div style="font-size: 0.9em;">Created: ${new Date(dev.createdAt).toLocaleString()}</div>
          </div>
          <div style="padding: 12px; background: #f8f9fa;">
            <p style="margin: 0 0 8px 0;"><strong>Valve:</strong> ${dev.valveId}</p>
            <p style="margin: 0 0 8px 0;"><strong>Description:</strong> ${dev.description}</p>
            <p style="margin: 0 0 8px 0;"><strong>Justification:</strong> ${dev.justification}</p>
            
            ${dev.status !== 'pending' ? `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;">
                <p style="margin: 0 0 5px 0;"><strong>${dev.status === 'approved' ? 'Approved' : 'Denied'} by:</strong> ${dev.approvedBy || 'Unknown'}</p>
                <p style="margin: 0;"><strong>Decision date:</strong> ${dev.approvedAt ? new Date(dev.approvedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            ` : `
              <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;"><strong>⏳ Pending admin approval</strong></p>
              </div>
            `}
          </div>
          ${dev.comments && dev.comments.length > 0 ? `
            <div style="background: #fff; padding: 10px; border-top: 1px solid #ddd;">
              <h5 style="margin: 0 0 8px 0; font-size: 0.9em;">Comments:</h5>
              <ul style="margin: 0; padding: 0 0 0 20px; font-size: 0.9em;">
                ${dev.comments.map(c => `<li>${c.text} <span style="font-size: 0.8em; color: #666;">- ${c.author}, ${new Date(c.timestamp).toLocaleString()}</span></li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.5em;">Dispensations for ${wellName}</h3>
        <button id="closeDeviationSummaryModal" title="Close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #888; line-height: 1;">&times;</button>
      </div>
      <div style="margin-bottom: 15px; background: #f0f0f0; padding: 10px; border-radius: 4px;">
        <p style="margin: 0; font-size: 0.9em;"><strong>${sortedDeviations.length}</strong> dispensation record(s) for this well</p>
      </div>
      <div>
        ${deviationsHtml}
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="closeDeviationSummaryBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const closeModal = () => backdrop.remove();
    document.getElementById('closeDeviationSummaryModal').onclick = closeModal;
    document.getElementById('closeDeviationSummaryBtn').onclick = closeModal;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
  }
}



// =================== WELL DASHBOARD DISPENSATION INDICATORS ===================

/**
 * Adds deviation/dispensation indicators to well elements on the dashboard
 * @param {HTMLElement} wellDiv - The div element representing the well
 * @param {string} wellName - The name of the well
 */
// Update the addDeviationIndicatorToWell function to position indicators on the top-left instead
function addDeviationIndicatorToWell(wellDiv, wellName) {
  // Skip if deviation system isn't initialized
 /* if (!window.deviationSystem) return;
  
  // Get all active deviations for this well
  const allDeviations = window.deviationSystem.getDeviationsForWell(wellName);
  
  if (allDeviations && allDeviations.length > 0) {
    // Find the latest deviation by status priority (approved > pending > denied)
    const approvedDeviation = allDeviations.find(d => d.status === 'approved');
    const pendingDeviation = allDeviations.find(d => d.status === 'pending');
    const deniedDeviation = allDeviations.find(d => d.status === 'denied');
    
    // Determine which badge to show (prioritize showing the most important status)
    let badgeColor, badgeText, badgeTitle;
    
    if (approvedDeviation) {
      badgeColor = '#28a745'; // Green
      badgeText = '✓';
      badgeTitle = `Dispensation approved until ${new Date(approvedDeviation.expiryDate).toLocaleDateString()}`;
    } else if (pendingDeviation) {
      badgeColor = '#ff9800'; // Orange
      badgeText = '⏳';
      badgeTitle = 'Dispensation request pending approval';
    } else if (deniedDeviation) {
      badgeColor = '#dc3545'; // Red
      badgeText = '✗';
      badgeTitle = 'Dispensation request denied';
    }
    
    if (badgeColor) {
      const badge = document.createElement('div');
      badge.className = 'deviation-indicator';
      badge.style.cssText = `
        position: absolute;
        top: 5px;
        left: 5px; /* Changed from right to left 
        background: ${badgeColor};
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        z-index: 10;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
        cursor: pointer;
      `;
      badge.textContent = badgeText;
      badge.title = badgeTitle;
      
      // Make the badge clickable to show details
      badge.onclick = (e) => {
        e.stopPropagation(); // Prevent triggering the well click event
        window.deviationSystem.showWellDeviationSummary(wellName);
      };
      
      wellDiv.style.position = 'relative';
      wellDiv.appendChild(badge);
    }
  }*/
} 

/**
 * Shows a summary of all deviations/dispensations for a well
 * @param {string} wellName - The name of the well
 */
function showWellDeviationSummary(wellName) {
  if (window.deviationSystem) {
    window.deviationSystem.showWellDeviationSummary(wellName);
  }
}

// Function to add deviation indicators to all wells in the dashboard
function addDeviationIndicatorsToWells() {
  // Find all well elements in the dashboard
  const wellDivs = document.querySelectorAll('.well-container');
  
  // Add deviation indicators to each well
  wellDivs.forEach(wellDiv => {
    const wellName = wellDiv.dataset.wellName || wellDiv.querySelector('.well-name')?.textContent;
    if (wellName) {
      addDeviationIndicatorToWell(wellDiv, wellName);
    }
  });
}

// Make functions available globally
window.showWellDeviationSummary = showWellDeviationSummary;
window.addDeviationIndicatorToWell = addDeviationIndicatorToWell;
window.addDeviationIndicatorsToWells = addDeviationIndicatorsToWells;

// Initialize the deviation system
window.deviationSystem = window.deviationSystem || new DeviationSystem();
