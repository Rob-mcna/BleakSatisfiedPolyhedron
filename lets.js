// =================== USER MANAGEMENT FRONTEND (NEW) ===================

(() => {
  const USER_API_BASE = window.API_BASE_URL || 'http://127.0.0.1:5000/api';
  const BACKEND_ROLES = ["admin", "engineer", "analyst", "operator", "viewer"];

  if (typeof sectionRoles !== "undefined") {
    sectionRoles.users = ["admin"];
  }

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
      headers: { Accept: "application/json" }
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
    const data = await usersApiGet(`${USER_API_BASE}/users/`);
    return Array.isArray(data) ? data : [];
  }

  async function createUserFromPage(payload) {
    return await usersApiPost(`${USER_API_BASE}/users/`, payload);
  }

  function getUserRoleText(user) {
    if (Array.isArray(user.roles) && user.roles.length) {
      return user.roles.map(r => r.name).join(", ");
    }
    return "-";
  }

  function badge(text, bg, color = "#111827") {
    return `<span style="
      display:inline-flex;
      align-items:center;
      padding:4px 10px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      background:${bg};
      color:${color};
      white-space:nowrap;
    ">${text}</span>`;
  }

  function statusBadge(status) {
    const s = (status || "").toLowerCase();
    if (s === "enabled") return badge("enabled", "#dcfce7", "#166534");
    if (s === "disabled") return badge("disabled", "#fee2e2", "#991b1b");
    return badge(status || "-", "#e5e7eb", "#374151");
  }

  function roleBadge(role) {
    const map = {
      admin: ["#dbeafe", "#1d4ed8"],
      engineer: ["#ede9fe", "#6d28d9"],
      analyst: ["#fef3c7", "#92400e"],
      operator: ["#dcfce7", "#166534"],
      viewer: ["#f3f4f6", "#374151"]
    };
    const cfg = map[(role || "").toLowerCase()] || ["#e5e7eb", "#374151"];
    return badge(role || "-", cfg[0], cfg[1]);
  }

  function filterUsers(users, searchTerm) {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return users;

    return users.filter(user => {
      const values = [
        user.email || "",
        user.pickUp || "",
        user.status || "",
        getUserRoleText(user)
      ].join(" ").toLowerCase();

      return values.includes(term);
    });
  }

  function renderUsersList(users, searchTerm = "") {
    const filtered = filterUsers(users, searchTerm);

    if (!filtered.length) {
      return `<div style="padding:16px 0;color:#6b7280;font-size:14px;">No users found.</div>`;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">
        ${filtered.map(user => `
          <div style="
            border:1px solid #e5e7eb;
            border-radius:16px;
            background:#ffffff;
            padding:14px 16px;
            box-shadow:0 4px 14px rgba(15,23,42,0.04);
          ">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
              <div>
                <div style="font-size:15px;font-weight:700;color:#111827;">${user.email || "-"}</div>
                <div style="margin-top:6px;font-size:12px;color:#6b7280;">Pick Up: ${user.pickUp || "-"}</div>
              </div>
              <div>${statusBadge(user.status)}</div>
            </div>

            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
              ${
                Array.isArray(user.roles) && user.roles.length
                  ? user.roles.map(r => roleBadge(r.name)).join("")
                  : roleBadge("-")
              }
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  async function renderUserManagementNew() {
    const section = document.getElementById("usersSection");
    if (!section) return;

    section.innerHTML = `
      <div style="
        max-width:1400px;
        margin:28px auto;
        display:grid;
        grid-template-columns:minmax(640px, 760px) minmax(360px, 1fr);
        gap:28px;
        align-items:start;
        font-family:Arial,sans-serif;
      ">
        <div style="
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:24px;
          padding:30px;
          box-shadow:0 12px 32px rgba(15,23,42,0.06);
        ">
          <div style="margin-bottom:22px;">
            <div style="
              display:inline-flex;
              align-items:center;
              gap:8px;
              padding:6px 10px;
              border-radius:999px;
              background:#eff6ff;
              color:#1d4ed8;
              font-size:12px;
              font-weight:700;
              margin-bottom:12px;
            ">ADMIN ONLY</div>

            <h1 style="margin:0;font-size:30px;color:#111827;">Create User</h1>
            <div style="margin-top:8px;color:#6b7280;font-size:14px;">
              Clean user creation aligned with backend roles.
            </div>
          </div>

          <form id="createUserForm" autocomplete="off" style="display:flex;flex-direction:column;gap:18px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <label style="display:flex;flex-direction:column;gap:6px;">
                <span style="font-size:13px;font-weight:700;color:#374151;">Email</span>
                <input type="email" id="createUserEmail" style="
                  width:100%;
                  padding:14px 16px;
                  border:1px solid #d1d5db;
                  border-radius:14px;
                  font-size:14px;
                  outline:none;
                  box-sizing:border-box;
                  background:#fff;
                " required>
              </label>

              <label style="display:flex;flex-direction:column;gap:6px;">
                <span style="font-size:13px;font-weight:700;color:#374151;">Pick Up</span>
                <input type="text" id="createUserPickUp" style="
                  width:100%;
                  padding:14px 16px;
                  border:1px solid #d1d5db;
                  border-radius:14px;
                  font-size:14px;
                  outline:none;
                  box-sizing:border-box;
                  background:#fff;
                " required>
              </label>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <label style="display:flex;flex-direction:column;gap:6px;">
                <span style="font-size:13px;font-weight:700;color:#374151;">Password</span>
                <input type="password" id="createUserPassword" style="
                  width:100%;
                  padding:14px 16px;
                  border:1px solid #d1d5db;
                  border-radius:14px;
                  font-size:14px;
                  outline:none;
                  box-sizing:border-box;
                  background:#fff;
                " required>
              </label>

              <label style="display:flex;flex-direction:column;gap:6px;">
                <span style="font-size:13px;font-weight:700;color:#374151;">Role</span>
                <select id="createUserRole" style="
                  width:100%;
                  padding:14px 16px;
                  border:1px solid #d1d5db;
                  border-radius:14px;
                  font-size:14px;
                  outline:none;
                  box-sizing:border-box;
                  background:#fff;
                " required>
                  <option value="">-- Select Role --</option>
                  ${BACKEND_ROLES.map(role => `<option value="${role}">${role}</option>`).join("")}
                </select>
              </label>
            </div>

            <div id="createUserMsg" style="min-height:20px;font-size:13px;font-weight:600;"></div>

            <div style="padding-top:8px;">
              <button type="submit" style="
                min-width:180px;
                border:none;
                background:linear-gradient(135deg,#0f62fe,#2563eb);
                color:#fff;
                padding:14px 20px;
                border-radius:14px;
                font-size:14px;
                font-weight:800;
                cursor:pointer;
                box-shadow:0 10px 24px rgba(37,99,235,0.24);
              ">
                Create User
              </button>
            </div>
          </form>
        </div>

        <div style="
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:24px;
          padding:24px;
          box-shadow:0 12px 32px rgba(15,23,42,0.06);
        ">
          <details id="usersAccordion" style="
            border:1px solid #e5e7eb;
            border-radius:18px;
            background:#f8fafc;
            padding:0 16px;
          ">
            <summary style="
              cursor:pointer;
              list-style:none;
              padding:16px 0;
              font-weight:800;
              color:#111827;
              font-size:15px;
              outline:none;
            ">Existing Users</summary>

            <div style="padding:4px 0 16px 0;">
              <input
                type="text"
                id="usersSearchInput"
                placeholder="Search email, pickup, status, role..."
                style="
                  width:100%;
                  padding:12px 14px;
                  border:1px solid #d1d5db;
                  border-radius:12px;
                  font-size:13px;
                  outline:none;
                  box-sizing:border-box;
                  background:#fff;
                "
              >

              <div style="display:flex;justify-content:flex-end;margin:10px 0 4px 0;">
                <button type="button" id="refreshUsersBtn" style="
                  border:none;
                  background:#eaf3ff;
                  color:#0f62fe;
                  font-size:12px;
                  font-weight:800;
                  padding:9px 12px;
                  border-radius:10px;
                  cursor:pointer;
                ">Refresh</button>
              </div>

              <div id="usersListContainer" style="max-height:560px;overflow:auto;color:#6b7280;font-size:14px;">
                <div style="padding:8px 0;color:#6b7280;">Open “Existing Users” to load the list.</div>
              </div>
            </div>
          </details>
        </div>
      </div>
    `;

    const form = document.getElementById("createUserForm");
    const msg = document.getElementById("createUserMsg");
    const usersListContainer = document.getElementById("usersListContainer");
    const usersSearchInput = document.getElementById("usersSearchInput");
    const usersAccordion = document.getElementById("usersAccordion");

    let allUsers = [];
    let usersLoaded = false;

    function paintUsers() {
      usersListContainer.innerHTML = renderUsersList(allUsers, usersSearchInput.value);
    }

    async function loadUsers() {
      usersListContainer.innerHTML = `<div style="padding:8px 0;color:#6b7280;">Loading...</div>`;
      try {
        allUsers = await fetchUsersForPage();
        usersLoaded = true;
        paintUsers();
      } catch (error) {
        usersListContainer.innerHTML = `<div style="padding:8px 0;color:#dc2626;font-weight:600;">${error.message}</div>`;
      }
    }

    usersSearchInput.addEventListener("input", paintUsers);
    document.getElementById("refreshUsersBtn").onclick = loadUsers;

    usersAccordion.addEventListener("toggle", async function () {
      if (this.open && !usersLoaded) {
        await loadUsers();
      }
    });

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

        if (usersAccordion.open) {
          await loadUsers();
        } else {
          usersLoaded = false;
          allUsers = [];
          usersListContainer.innerHTML = `<div style="padding:8px 0;color:#6b7280;">Open “Existing Users” to load the list.</div>`;
        }
      } catch (error) {
        msg.style.color = "#dc2626";
        msg.textContent = error.message || "Failed to create user.";
      }
    };
  }

  window.renderUserManagement = renderUserManagementNew;
})();
