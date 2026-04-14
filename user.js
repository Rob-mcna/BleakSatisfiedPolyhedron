// =================== USER MANAGEMENT FRONTEND ===================

// Backend roles only
const BACKEND_ROLES = ["admin", "engineer", "analyst", "operator", "viewer"];

// Users page should only be visible to admin
if (typeof sectionRoles !== "undefined") {
  sectionRoles.users = ["admin"];
}

// Helper: backend sometimes returns tuple-like JSON arrays such as [payload, 201]
function normalizeApiPayload(data) {
  if (Array.isArray(data) && data.length === 2 && typeof data[1] === "number" && typeof data[0] === "object") {
    return data[0];
  }
  return data;
}

async function usersApiGet(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  });

  const raw = await response.json().catch(() => ({}));
  const data = normalizeApiPayload(raw);

  if (!response.ok) {
    throw new Error(data?.Error || data?.message || `Request failed (${response.status})`);
  }

  return data;
}

async function usersApiPost(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.json().catch(() => ({}));
  const data = normalizeApiPayload(raw);

  if (!response.ok) {
    throw new Error(data?.Error || data?.message || `Request failed (${response.status})`);
  }

  return data;
}

function renderUsersTable(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return `<div style="padding:12px;color:#777;">No users found.</div>`;
  }

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Email</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Pick Up</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Status</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Role</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${user.email || "-"}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${user.pickUp || "-"}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${user.status || "-"}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">
              ${
                Array.isArray(user.roles) && user.roles.length
                  ? user.roles.map(r => r.name).join(", ")
                  : "-"
              }
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function fetchUsersForPage() {
  const data = await usersApiGet(`${API_BASE_URL}/users/`);
  return Array.isArray(data) ? data : [];
}

async function createUserFromPage(payload) {
  return await usersApiPost(`${API_BASE_URL}/users/`, payload);
}

async function renderUserManagement() {
  const section = document.getElementById("usersSection");
  if (!section) return;

  section.innerHTML = `
    <h1>User Management</h1>

    <div style="display:grid;grid-template-columns:380px 1fr;gap:20px;align-items:start;">
      <div style="background:#fff;padding:16px;border:1px solid #ddd;border-radius:8px;">
        <h3 style="margin-top:0;">Create User</h3>

        <form id="createUserForm">
          <label style="display:block;margin-bottom:12px;">
            Email<br>
            <input type="email" id="createUserEmail" style="width:100%;padding:8px;" required>
          </label>

          <label style="display:block;margin-bottom:12px;">
            Pick Up<br>
            <input type="text" id="createUserPickUp" style="width:100%;padding:8px;" required>
          </label>

          <label style="display:block;margin-bottom:12px;">
            Password<br>
            <input type="password" id="createUserPassword" style="width:100%;padding:8px;" required>
          </label>

          <label style="display:block;margin-bottom:12px;">
            Role<br>
            <select id="createUserRole" style="width:100%;padding:8px;" required>
              <option value="">-- Select Role --</option>
              ${BACKEND_ROLES.map(role => `<option value="${role}">${role}</option>`).join("")}
            </select>
          </label>

          <div id="createUserMsg" style="margin:10px 0;font-size:14px;"></div>

          <button type="submit" class="primary-btn">Create User</button>
        </form>
      </div>

      <div style="background:#fff;padding:16px;border:1px solid #ddd;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Users</h3>
          <button id="refreshUsersBtn" class="secondary-btn">Refresh</button>
        </div>
        <div id="usersTableContainer" style="margin-top:12px;">Loading...</div>
      </div>
    </div>
  `;

  const usersTableContainer = document.getElementById("usersTableContainer");
  const msg = document.getElementById("createUserMsg");
  const form = document.getElementById("createUserForm");

  async function loadUsers() {
    usersTableContainer.innerHTML = `<div style="padding:12px;color:#666;">Loading...</div>`;
    try {
      const users = await fetchUsersForPage();
      usersTableContainer.innerHTML = renderUsersTable(users);
    } catch (error) {
      usersTableContainer.innerHTML = `<div style="padding:12px;color:#dc3545;">${error.message}</div>`;
    }
  }

  document.getElementById("refreshUsersBtn").onclick = loadUsers;

  form.onsubmit = async function (e) {
    e.preventDefault();

    msg.textContent = "";
    msg.style.color = "#dc3545";

    const email = document.getElementById("createUserEmail").value.trim().toLowerCase();
    const pickUp = document.getElementById("createUserPickUp").value.trim().toLowerCase();
    const password = document.getElementById("createUserPassword").value.trim();
    const role = document.getElementById("createUserRole").value;

    if (!email || !pickUp || !password || !role) {
      msg.textContent = "Fill all fields.";
      return;
    }

    if (!BACKEND_ROLES.includes(role)) {
      msg.textContent = "Invalid role selected.";
      return;
    }

    try {
      const result = await createUserFromPage({
        email,
        pickUp,   // backend expects pickUp
        password,
        role
      });

      msg.style.color = "#28a745";
      msg.textContent = result?.message || "User created successfully.";
      form.reset();
      await loadUsers();
    } catch (error) {
      msg.style.color = "#dc3545";
      msg.textContent = error.message || "Failed to create user.";
    }
  };

  await loadUsers();
}

window.renderUserManagement = renderUserManagement;
