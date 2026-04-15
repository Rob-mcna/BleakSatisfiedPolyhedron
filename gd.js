// =================== USER MANAGEMENT FRONTEND ===================

// Current backend roles
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

async function fetchUsersForPage() {
  const data = await usersApiGet(`${API_BASE_URL}/users/`);
  return Array.isArray(data) ? data : [];
}

async function createUserFromPage(payload) {
  return await usersApiPost(`${API_BASE_URL}/users/`, payload);
}

function renderUsersList(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return `<div style="padding:12px 0;color:#7b8794;font-size:14px;">No users found.</div>`;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
      ${users.map(user => `
        <div style="
          padding:12px 14px;
          border:1px solid #e7edf3;
          border-radius:12px;
          background:#fbfdff;
        ">
          <div style="font-weight:600;color:#1f2937;font-size:14px;">${user.email || "-"}</div>
          <div style="margin-top:6px;font-size:12px;color:#6b7280;display:flex;gap:10px;flex-wrap:wrap;">
            <span><b>Pick Up:</b> ${user.pickUp || "-"}</span>
            <span><b>Status:</b> ${user.status || "-"}</span>
            <span><b>Role:</b> ${
              Array.isArray(user.roles) && user.roles.length
                ? user.roles.map(r => r.name).join(", ")
                : "-"
            }</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function renderUserManagement() {
  const section = document.getElementById("usersSection");
  if (!section) return;

  section.innerHTML = `
    <div style="
      max-width:560px;
      margin:28px auto;
      background:#ffffff;
      border:1px solid #e9eef5;
      border-radius:20px;
      padding:28px;
      box-shadow:0 10px 30px rgba(15,23,42,0.06);
      font-family:Arial,sans-serif;
    ">
      <div style="margin-bottom:22px;">
        <h1 style="margin:0;font-size:28px;color:#111827;">Create User</h1>
        <div style="margin-top:6px;color:#6b7280;font-size:14px;">Minimal user management aligned with backend roles.</div>
      </div>

      <form id="createUserForm" autocomplete="off" style="display:flex;flex-direction:column;gap:14px;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:13px;font-weight:600;color:#374151;">Email</span>
          <input type="email" id="createUserEmail" style="
            width:100%;
            padding:12px 14px;
            border:1px solid #d7dee8;
            border-radius:12px;
            font-size:14px;
            outline:none;
            box-sizing:border-box;
          " required>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:13px;font-weight:600;color:#374151;">Pick Up</span>
          <input type="text" id="createUserPickUp" style="
            width:100%;
            padding:12px 14px;
            border:1px solid #d7dee8;
            border-radius:12px;
            font-size:14px;
            outline:none;
            box-sizing:border-box;
          " required>
        </label>

        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:13px;font-weight:600;color:#374151;">Password</span>
          <input type="password" id="createUserPassword" style="
            width:100%;
            padding:12px 14px;
            border:1px solid #d7dee8;
            border-radius:12px;
            font-size:14px;
            outline:none;
            box-sizing:border-box;
          " required>
        </label>

        <details id="usersAccordion" style="
          border:1px solid #e7edf3;
          border-radius:14px;
          background:#f8fbff;
          padding:0 14px;
        ">
          <summary style="
            cursor:pointer;
            list-style:none;
            padding:14px 0;
            font-weight:600;
            color:#1f2937;
            outline:none;
          ">
            Existing users
          </summary>
          <div style="padding:0 0 14px 0;">
            <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
              <button type="button" id="refreshUsersBtn" style="
                border:none;
                background:#eaf3ff;
                color:#0f62fe;
                font-size:12px;
                font-weight:600;
                padding:8px 10px;
                border-radius:10px;
                cursor:pointer;
              ">Refresh</button>
            </div>
            <div id="usersListContainer" style="max-height:260px;overflow:auto;color:#6b7280;font-size:14px;">
              Loading...
            </div>
          </div>
        </details>

        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:13px;font-weight:600;color:#374151;">Role</span>
          <select id="createUserRole" style="
            width:100%;
            padding:12px 14px;
            border:1px solid #d7dee8;
            border-radius:12px;
            font-size:14px;
            outline:none;
            box-sizing:border-box;
            background:#fff;
          " required>
            <option value="">-- Select Role --</option>
            ${BACKEND_ROLES.map(role => `<option value="${role}">${role}</option>`).join("")}
          </select>
        </label>

        <div id="createUserMsg" style="min-height:20px;font-size:13px;"></div>

        <button type="submit" style="
          margin-top:4px;
          border:none;
          background:#0f62fe;
          color:#fff;
          padding:13px 16px;
          border-radius:12px;
          font-size:14px;
          font-weight:700;
          cursor:pointer;
          box-shadow:0 8px 20px rgba(15,98,254,0.22);
        ">
          Create User
        </button>
      </form>
    </div>
  `;

  const form = document.getElementById("createUserForm");
  const msg = document.getElementById("createUserMsg");
  const usersListContainer = document.getElementById("usersListContainer");

  async function loadUsers() {
    usersListContainer.innerHTML = `<div style="padding:8px 0;color:#6b7280;">Loading...</div>`;
    try {
      const users = await fetchUsersForPage();
      usersListContainer.innerHTML = renderUsersList(users);
    } catch (error) {
      usersListContainer.innerHTML = `<div style="padding:8px 0;color:#dc2626;">${error.message}</div>`;
    }
  }

  document.getElementById("refreshUsersBtn").onclick = loadUsers;

  form.onsubmit = async function (e) {
    e.preventDefault();

    msg.textContent = "";
    msg.style.color = "#dc2626";

    const email = document.getElementById("createUserEmail").value.trim().toLowerCase();
    const pickUp = document.getElementById("createUserPickUp").value.trim().toLowerCase();
    const password = document.getElementById("createUserPassword").value.trim();
    const role = document.getElementById("createUserRole").value;

    if (!email || !pickUp || !password || !role) {
      msg.textContent = "Fill all fields.";
      return;
    }

    try {
      const result = await createUserFromPage({
        email,
        pickUp,
        password,
        role
      });

      msg.style.color = "#15803d";
      msg.textContent = result?.message || "User created successfully.";
      form.reset();
      await loadUsers();
    } catch (error) {
      msg.style.color = "#dc2626";
      msg.textContent = error.message || "Failed to create user.";
    }
  };

  await loadUsers();
}

window.renderUserManagement = renderUserManagement;
