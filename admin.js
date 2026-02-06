function getToken() {
  return localStorage.getItem("authToken");
}
function getEmail() {
  return localStorage.getItem("userEmail");
}
function getRole() {
  return (localStorage.getItem("userRole") || "").toLowerCase();
}

function requireAdmin() {
  const token = getToken();
  const role = getRole();
  if (!token || role !== "admin") {
    alert("Admin access only. Please login as admin.");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function cleanPhoneForWhatsApp(phone) {
  let p = String(phone || "").replace(/[^\d]/g, "");
  if (p.length === 8) p = "267" + p;
  return p;
}
function buildWhatsAppLink(phone, message) {
  const p = cleanPhoneForWhatsApp(phone);
  if (!p) return null;
  return `https://wa.me/${encodeURIComponent(p)}?text=${encodeURIComponent(message || "")}`;
}
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}
window.logout = logout;

const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
const form = document.getElementById("adminForm");
const msg = document.getElementById("msg");
const accountsDiv = document.getElementById("accounts");
const acctQ = document.getElementById("acctQ");
const acctCount = document.getElementById("acctCount");
const adminPill = document.getElementById("adminPill");

if (adminPill) {
  const e = getEmail();
  adminPill.textContent = e ? `Logged in: ${e}` : "Admin";
}

function setMsg(t) {
  if (msg) msg.textContent = t || "";
}

function buildAdminHeaders() {
  const headers = { "Content-Type": "application/json" };

  const token = getToken();
  if (token) headers["Authorization"] = token;

  const adminKeyInput = document.getElementById("adminKey");
  const adminKey = adminKeyInput ? String(adminKeyInput.value || "").trim() : "";
  if (adminKey) headers["x-admin-key"] = adminKey;

  return headers;
}

async function loadAccounts() {
  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");
  if (!requireAdmin()) return;

  accountsDiv.innerHTML = `<p class="small">Loading accounts...</p>`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/lenders`, {
      method: "GET",
      headers: buildAdminHeaders()
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      accountsDiv.innerHTML = "";
      alert(data.message || "Failed to load accounts (check admin token/key).");
      return;
    }

    const q = String(acctQ.value || "").trim().toLowerCase();
    let rows = Array.isArray(data) ? data : [];

    if (q) {
      rows = rows.filter(r => {
        const blob = [
          r.businessName, r.email, r.licenseNo, r.branchName, r.phone, r.status, r.role
        ].map(x => String(x || "").toLowerCase()).join(" ");
        return blob.includes(q);
      });
    }

    if (acctCount) acctCount.textContent = `Showing ${rows.length} accounts.`;

    if (!rows.length) {
      accountsDiv.innerHTML = `<div class="small">No accounts match your search.</div>`;
      return;
    }

    let html = `
      <div class="table">
        <div class="thead">
          <div>Business</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Branch</div>
          <div>Phone</div>
          <div>License</div>
          <div>Contact</div>
        </div>
    `;

    rows.forEach(r => {
      const business = r.businessName || "-";
      const email = r.email || "-";
      const role = (r.role || "lender").toUpperCase();
      const status = (r.status || "-").toUpperCase();
      const branch = r.branchName || "-";
      const phone = r.phone || "";
      const license = r.licenseNo || "-";

      const call = phone ? `<a class="btn-ghost btn-sm" href="tel:${cleanPhoneForWhatsApp(phone)}">Call</a>` : "";
      const wa = phone
        ? buildWhatsAppLink(phone, `Hi ${business}. This is LinkLedger Admin regarding your account (${email}).`)
        : null;

      const waBtn = wa ? `<a class="btn-ghost btn-sm" target="_blank" rel="noopener" href="${wa}">WhatsApp</a>` : "";

      html += `
        <div class="trow">
          <div><b>${escapeHtml(business)}</b></div>
          <div>${escapeHtml(email)}</div>
          <div>${escapeHtml(role)}</div>
          <div>${escapeHtml(status)}</div>
          <div>${escapeHtml(branch)}</div>
          <div>${escapeHtml(phone || "-")}</div>
          <div>${escapeHtml(license)}</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${call}
            ${waBtn}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    accountsDiv.innerHTML = html;

  } catch (err) {
    console.error(err);
    accountsDiv.innerHTML = "";
    alert("Network error while loading accounts.");
  }
}

window.loadAccounts = loadAccounts;

// live search filter (no reload)
acctQ && acctQ.addEventListener("input", () => loadAccounts());

// Create lender
form && form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");
  if (!requireAdmin()) return;

  setMsg("");

  const payload = {
    businessName: document.getElementById("businessName").value.trim(),
    branchName: document.getElementById("branchName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    licenseNo: document.getElementById("licenseNo").value.trim(),
    email: document.getElementById("email").value.trim(),
    tempPassword: document.getElementById("tempPassword").value.trim()
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/lenders`, {
      method: "POST",
      headers: buildAdminHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(data.message || "Failed to create lender.");
      return;
    }

    setMsg("Lender created ✅");
    form.reset();
    await loadAccounts();
  } catch (err) {
    console.error(err);
    setMsg("Network error");
  }
});

// initial load
(function () {
  if (!requireAdmin()) return;
  loadAccounts();
})();
