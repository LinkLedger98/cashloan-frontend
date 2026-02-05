function getToken() {
  return localStorage.getItem("authToken");
}
function getRole() {
  return (localStorage.getItem("userRole") || "").toLowerCase();
}
function getEmail() {
  return (localStorage.getItem("userEmail") || "").toLowerCase();
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function apiBase() {
  return window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}
window.logout = logout;

function requireAdminUI() {
  const role = getRole();
  const email = getEmail();
  const pill = document.getElementById("adminPill");

  if (pill) pill.textContent = role ? `Role: ${role}` : "Role: (unknown)";

  // Soft gate: still allow ADMIN_KEY fallback, but warn if not admin role.
  if (role !== "admin") {
    console.warn("Not admin role in localStorage. You can still use ADMIN_KEY in the form.");
  }

  if (!getToken() && !document.getElementById("adminKey")?.value) {
    // they can still paste admin key
  }
}

let ALL_ACCOUNTS = [];
let LAST_CREATED_TEXT = "";

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };

  // prefer token
  const token = getToken();
  if (token) headers["Authorization"] = token;

  // legacy admin key optional
  const adminKey = String(document.getElementById("adminKey")?.value || "").trim();
  if (adminKey) headers["x-admin-key"] = adminKey;

  return headers;
}

async function refreshAccounts() {
  const msg = document.getElementById("listMsg");
  const tbody = document.getElementById("accountsTbody");
  const base = apiBase();

  if (!base) return alert("API_BASE_URL missing in config.js");
  if (msg) msg.textContent = "Loading accounts...";
  if (tbody) tbody.innerHTML = "";

  try {
    const res = await fetch(`${base}/api/admin/lenders`, {
      method: "GET",
      headers: buildHeaders()
    });

    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      if (msg) msg.textContent = "";
      alert((data && data.message) ? data.message : "Failed to load accounts");
      return;
    }

    ALL_ACCOUNTS = Array.isArray(data) ? data : [];
    renderAccounts();
  } catch (err) {
    console.error(err);
    if (msg) msg.textContent = "";
    alert("Network/server error while loading accounts");
  }
}
window.refreshAccounts = refreshAccounts;

function renderAccounts() {
  const q = String(document.getElementById("searchBox")?.value || "").toLowerCase().trim();
  const msg = document.getElementById("listMsg");
  const tbody = document.getElementById("accountsTbody");

  const filtered = ALL_ACCOUNTS.filter((u) => {
    if (!q) return true;
    const bag = [
      u.businessName, u.email, u.licenseNo, u.branchName, u.phone, u.status, u.role
    ].map(x => String(x || "").toLowerCase()).join(" ");
    return bag.includes(q);
  });

  if (msg) {
    msg.textContent = q
      ? `Showing ${filtered.length} match(es) from ${ALL_ACCOUNTS.length} accounts.`
      : `Showing ${ALL_ACCOUNTS.length} accounts.`;
  }

  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="small">No matches.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((u) => {
    const id = esc(u._id);
    const status = String(u.status || "active").toLowerCase();
    const role = String(u.role || "lender").toLowerCase();

    const statusBadge = status === "suspended"
      ? `<span class="badge overdue">SUSPENDED</span>`
      : `<span class="badge paid">ACTIVE</span>`;

    const roleBadge = role === "admin"
      ? `<span class="badge owing">ADMIN</span>`
      : `<span class="badge paid">LENDER</span>`;

    const suspendBtn = status === "suspended"
      ? `<button class="btn-ghost btn-sm" onclick="setStatus('${id}','active')">Activate</button>`
      : `<button class="btn-ghost btn-sm" onclick="setStatus('${id}','suspended')">Suspend</button>`;

    const resetBtn = `<button class="btn-ghost btn-sm" onclick="resetPasswordPrompt('${id}','${esc(u.email)}')">Reset PW</button>`;

    return `
      <tr>
        <td>${esc(u.businessName || "-")}</td>
        <td>${esc(u.email || "-")}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td>${esc(u.branchName || "-")}</td>
        <td>${esc(u.phone || "-")}</td>
        <td>${esc(u.licenseNo || "-")}</td>
        <td>
          <div class="btnrow">
            ${suspendBtn}
            ${resetBtn}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function setStatus(id, status) {
  const base = apiBase();
  if (!base) return alert("API_BASE_URL missing");

  const ok = confirm(`Are you sure you want to set status = ${status}?`);
  if (!ok) return;

  try {
    const res = await fetch(`${base}/api/admin/lenders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify({ status })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to update status");
      return;
    }

    alert("Status updated ✅");
    await refreshAccounts();
  } catch (err) {
    console.error(err);
    alert("Network/server error while updating status");
  }
}
window.setStatus = setStatus;

async function resetPasswordPrompt(id, email) {
  const base = apiBase();
  if (!base) return alert("API_BASE_URL missing");

  const tempPassword = prompt(`Set a NEW temporary password for:\n${email}\n\n(min 6 chars)`);
  if (!tempPassword) return;

  try {
    const res = await fetch(`${base}/api/admin/lenders/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ tempPassword })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Reset failed");
      return;
    }

    const text = `Login details:\nEmail: ${email}\nTemp Password: ${tempPassword}\nLogin URL: ${window.location.origin}/login.html`;
    LAST_CREATED_TEXT = text;

    alert("Password reset ✅ (Copy details from the box after you close this)");
    const box = document.getElementById("createdBox");
    const pre = document.getElementById("createdCreds");
    if (box && pre) {
      pre.textContent = text;
      box.style.display = "block";
    }
  } catch (err) {
    console.error(err);
    alert("Network/server error while resetting password");
  }
}
window.resetPasswordPrompt = resetPasswordPrompt;

async function createLender(e) {
  e.preventDefault();

  const base = apiBase();
  if (!base) return alert("API_BASE_URL missing in config.js");

  const msg = document.getElementById("msg");
  if (msg) msg.textContent = "Creating lender...";

  const payload = {
    businessName: document.getElementById("businessName").value.trim(),
    branchName: document.getElementById("branchName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    licenseNo: document.getElementById("licenseNo").value.trim(),
    email: document.getElementById("email").value.trim().toLowerCase(),
    tempPassword: document.getElementById("tempPassword").value.trim()
  };

  try {
    const res = await fetch(`${base}/api/admin/lenders`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (msg) msg.textContent = "";
      alert(data.message || "Failed to create lender");
      return;
    }

    if (msg) msg.textContent = "Created ✅";

    const text = `Login details:\nBusiness: ${payload.businessName}\nEmail: ${payload.email}\nTemp Password: ${payload.tempPassword}\nLogin URL: ${window.location.origin}/login.html`;
    LAST_CREATED_TEXT = text;

    const box = document.getElementById("createdBox");
    const pre = document.getElementById("createdCreds");
    if (box && pre) {
      pre.textContent = text;
      box.style.display = "block";
    }

    // clear form fields (keep adminKey)
    document.getElementById("businessName").value = "";
    document.getElementById("branchName").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("licenseNo").value = "";
    document.getElementById("email").value = "";
    document.getElementById("tempPassword").value = "";

    await refreshAccounts();
  } catch (err) {
    console.error(err);
    if (msg) msg.textContent = "";
    alert("Network/server error while creating lender");
  }
}

function copyCreated() {
  if (!LAST_CREATED_TEXT) return alert("Nothing to copy yet.");
  navigator.clipboard.writeText(LAST_CREATED_TEXT)
    .then(() => alert("Copied ✅"))
    .catch(() => alert("Copy failed. Select and copy manually."));
}
window.copyCreated = copyCreated;

(function init() {
  requireAdminUI();

  const form = document.getElementById("adminForm");
  if (form) form.addEventListener("submit", createLender);

  const search = document.getElementById("searchBox");
  if (search) search.addEventListener("input", () => renderAccounts());

  refreshAccounts();
})();
