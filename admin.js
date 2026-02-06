function getToken(){ return localStorage.getItem("authToken"); }
function getEmail(){ return localStorage.getItem("userEmail"); }
function getRole(){ return (localStorage.getItem("userRole") || "").toLowerCase(); }

function requireAdmin(){
  const token = getToken();
  const role = getRole();
  if (!token || role !== "admin") {
    alert("Admin access only. Please login as admin.");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function logout(){
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}
window.logout = logout;

function toggleAccounts(){
  const p = document.getElementById("accountsPanel");
  if (!p) return;
  const showing = p.style.display !== "none";
  p.style.display = showing ? "none" : "block";
  if (!showing) loadAccounts();
}
window.toggleAccounts = toggleAccounts;

const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

const adminPill = document.getElementById("adminPill");
if (adminPill) adminPill.textContent = getEmail() ? `Logged in: ${getEmail()}` : "Admin";

function buildAdminHeaders(){
  const headers = { "Content-Type":"application/json" };

  const token = getToken();
  if (token) headers["Authorization"] = token;

  const adminKey = String((document.getElementById("adminKey")?.value || "")).trim();
  if (adminKey) headers["x-admin-key"] = adminKey;

  return headers;
}

function setMsg(t){
  const msg = document.getElementById("msg");
  if (msg) msg.textContent = t || "";
}

/* -------------------- CREATE LENDER -------------------- */
document.getElementById("adminForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");
  if (!requireAdmin()) return;

  setMsg("");

  const payload = {
    businessName: document.getElementById("businessName").value.trim(),
    branchName: document.getElementById("branchName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    licenseNo: document.getElementById("licenseNo").value.trim(),
    email: document.getElementById("email").value.trim().toLowerCase(),
    tempPassword: document.getElementById("tempPassword").value.trim(),
    paidUntil: document.getElementById("paidUntil").value || null
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/lenders`, {
      method:"POST",
      headers: buildAdminHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(data.message || "Failed"); return; }

    setMsg("Lender created ✅");
    document.getElementById("adminForm").reset();
    loadAccounts();
  } catch (err) {
    console.error(err);
    setMsg("Network error");
  }
});

/* -------------------- ACCOUNTS LIST -------------------- */
async function loadAccounts(){
  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");
  if (!requireAdmin()) return;

  const accountsDiv = document.getElementById("accounts");
  const acctCount = document.getElementById("acctCount");
  const q = String(document.getElementById("acctQ")?.value || "").trim().toLowerCase();

  if (accountsDiv) accountsDiv.innerHTML = `<p class="small">Loading accounts...</p>`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/lenders`, {
      method:"GET",
      headers: buildAdminHeaders()
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (accountsDiv) accountsDiv.innerHTML = "";
      alert(data.message || "Failed to load accounts");
      return;
    }

    let rows = Array.isArray(data) ? data : [];
    if (q) {
      rows = rows.filter(r => {
        const blob = [r.businessName,r.email,r.licenseNo,r.branchName,r.phone,r.status,r.role]
          .map(x => String(x || "").toLowerCase()).join(" ");
        return blob.includes(q);
      });
    }

    if (acctCount) acctCount.textContent = `Showing ${rows.length} accounts.`;

    let html = `
      <div class="table">
        <div class="thead">
          <div>Business</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Paid Until</div>
          <div>Last Payment</div>
          <div>Action</div>
        </div>
    `;

    rows.forEach(r => {
      const id = r._id;
      const status = String(r.status || "active").toLowerCase();
      const paidUntil = r.paidUntil ? String(r.paidUntil).slice(0,10) : "";
      const lastPay = r.lastPaymentAt ? String(r.lastPaymentAt).slice(0,10) : "";

      html += `
        <div class="trow">
          <div><b>${escapeHtml(r.businessName || "-")}</b></div>
          <div>${escapeHtml(r.email || "-")}</div>
          <div>${escapeHtml((r.role || "lender").toUpperCase())}</div>
          <div>${escapeHtml(status.toUpperCase())}</div>
          <div>${escapeHtml(paidUntil || "-")}</div>
          <div>${escapeHtml(lastPay || "-")}</div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${
              status === "active"
                ? `<button class="btn-ghost btn-sm" onclick="setStatus('${id}','suspended')">Suspend</button>`
                : `<button class="btn-ghost btn-sm" onclick="setStatus('${id}','active')">Activate</button>`
            }

            <button class="btn-primary btn-sm" onclick="markPaid('${id}')">Mark Paid</button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    if (accountsDiv) accountsDiv.innerHTML = html;
  } catch (err) {
    console.error(err);
    if (accountsDiv) accountsDiv.innerHTML = "";
    alert("Network error");
  }
}
window.loadAccounts = loadAccounts;

document.getElementById("acctQ")?.addEventListener("input", () => loadAccounts());

async function setStatus(userId, newStatus){
  if (!requireAdmin()) return;
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/status`, {
    method:"PATCH",
    headers: buildAdminHeaders(),
    body: JSON.stringify({ status: newStatus })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.message || "Failed");
  loadAccounts();
}
window.setStatus = setStatus;

async function markPaid(userId){
  if (!requireAdmin()) return;
  const paidUntil = prompt("Paid until date (YYYY-MM-DD). Leave blank for today only:");
  const payload = { paidUntil: paidUntil || null };

  const res = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/payment`, {
    method:"PATCH",
    headers: buildAdminHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return alert(data.message || "Failed");
  loadAccounts();
}
window.markPaid = markPaid;

/* -------------------- SIGNUP REQUESTS -------------------- */
async function loadRequests(){
  if (!requireAdmin()) return;
  const div = document.getElementById("requests");
  if (div) div.innerHTML = `<p class="small">Loading requests...</p>`;

  const res = await fetch(`${API_BASE_URL}/api/admin/signup-requests`, {
    method:"GET",
    headers: buildAdminHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { if(div) div.innerHTML=""; return alert(data.message || "Failed"); }

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) { if(div) div.innerHTML = `<div class="small">No requests right now.</div>`; return; }

  let html = `<div class="results">`;
  rows.forEach(r => {
    html += `
      <div class="result-item">
        <div><b>${escapeHtml(r.businessName)}</b> • ${escapeHtml(r.email)}</div>
        <div class="small">Branch: ${escapeHtml(r.branchName)} • Phone: ${escapeHtml(r.phone)} • License: ${escapeHtml(r.licenseNo)}</div>
        <div class="small">Notes: ${escapeHtml(r.notes || "-")}</div>
      </div>
    `;
  });
  html += `</div>`;
  if (div) div.innerHTML = html;
}
window.loadRequests = loadRequests;

(function(){
  if (!requireAdmin()) return;
  loadRequests();
})();
