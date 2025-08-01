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
      <form id="adminAddUserForm" style="margin-bottom:18px; background:#fff; padding:12px; border:1px solid #ccc;">
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

