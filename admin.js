function getToken() {
  return localStorage.getItem("authToken") || "";
}
function getRole() {
  return (localStorage.getItem("userRole") || "").toLowerCase();
}
function getEmail() {
  return (localStorage.getItem("userEmail") || "").toLowerCase();
}

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  const token = getToken();
  const adminKey = (document.getElementById("adminKey")?.value || "").trim();

  // backend supports either x-admin-key OR token
  if (adminKey) h["x-admin-key"] = adminKey;
  if (token) h["Authorization"] = token;
  return h;
}

function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

function setMsg(text, isOk) {
  const el = document.getElementById("msg");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = isOk ? "#5CFFB0" : "#FF7A7A";
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}
window.logout = logout;

(function init() {
  const pill = document.getElementById("adminPill");
  if (pill) {
    const email = getEmail();
    pill.textContent = email ? `Logged in: ${email}` : "Logged in";
  }

  // ▲/▼ collapse accounts
  const btn = document.getElementById("toggleAccountsBtn");
  const wrap = document.getElementById("accountsWrap");
  if (btn && wrap) {
    btn.addEventListener("click", function () {
      const isHidden = wrap.style.display === "none";
      wrap.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "▲" : "▼";
    });
  }

  // search box (debounced)
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    let t = null;
    searchBox.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(() => reloadAccounts(), 250);
    });
  }

  // create lender
  const form = document.getElementById("adminForm");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg("", true);

      const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
      if (!api) return setMsg("API_BASE_URL missing in config.js", false);

      const payload = {
        businessName: document.getElementById("businessName").value.trim(),
        branchName: document.getElementById("branchName").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        licenseNo: document.getElementById("licenseNo").value.trim(),
        email: document.getElementById("email").value.trim(),
        tempPassword: document.getElementById("tempPassword").value.trim()
      };

      // basic client-side guard
      if (!payload.businessName || !payload.branchName || !payload.phone || !payload.licenseNo || !payload.email || !payload.tempPassword) {
        return setMsg("Please fill all fields.", false);
      }

      try {
        const res = await fetch(`${api}/api/admin/lenders`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMsg(data.message || "Failed to create lender", false);

        setMsg("Lender created ✅", true);

        // clear fields
        ["businessName","branchName","phone","licenseNo","email","tempPassword"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });

        await reloadAccounts();
      } catch (err) {
        console.error(err);
        setMsg("Network error", false);
      }
    });
  }

  // initial loads
  loadRequests();
  reloadAccounts();
})();

// ----------------------------
// SIGNUP REQUESTS UI
// ----------------------------
async function loadRequests() {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const wrap = document.getElementById("requestsList");
  if (!api || !wrap) return;

  wrap.innerHTML = `<div class="small">Loading requests...</div>`;

  try {
    const res = await fetch(`${api}/api/admin/requests`, { headers: authHeaders() });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      wrap.innerHTML = "";
      alert(data.message || "Failed to load signup requests");
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    if (rows.length === 0) {
      wrap.innerHTML = `<div class="small">No signup requests right now.</div>`;
      return;
    }

    // simple cards list (keeps your design safe)
    wrap.innerHTML = rows.map(r => {
      const id = r._id;
      const business = r.businessName || r.business || "";
      const email = r.email || "";
      const phone = r.phone || r.phoneNumber || "";
      const branch = r.branchName || r.branch || "";
      const licenseNo = r.licenseNo || r.license || "";
      const created = fmtDate(r.createdAt);

      return `
        <div class="card" style="margin-top:12px;">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
            <div>
              <div><b>${escapeHtml(business || "Signup request")}</b></div>
              <div class="small" style="margin-top:6px;">
                <div><b>Email:</b> ${escapeHtml(email)}</div>
                <div><b>Phone:</b> ${escapeHtml(phone)}</div>
                ${branch ? `<div><b>Branch:</b> ${escapeHtml(branch)}</div>` : ""}
                ${licenseNo ? `<div><b>License:</b> ${escapeHtml(licenseNo)}</div>` : ""}
                ${created ? `<div><b>Date:</b> ${escapeHtml(created)}</div>` : ""}
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-ghost btn-sm" type="button" onclick="prefillFromRequest('${id}')">Use</button>
              <button class="btn-ghost btn-sm" type="button" onclick="deleteRequest('${id}')">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    wrap.innerHTML = "";
    alert("Network error while loading requests");
  }
}

window.loadRequests = loadRequests;

async function deleteRequest(id) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  const ok = confirm("Delete this signup request?");
  if (!ok) return;

  try {
    const res = await fetch(`${api}/api/admin/requests/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to delete request");
      return;
    }

    await loadRequests();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}

window.deleteRequest = deleteRequest;

// Optional helper: quickly copy request fields into create-lender form
async function prefillFromRequest(id) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  try {
    // We already loaded the list, but to keep it simple, just reload and find it
    const res = await fetch(`${api}/api/admin/requests`, { headers: authHeaders() });
    const data = await res.json().catch(() => ([]));
    if (!res.ok) return;

    const rows = Array.isArray(data) ? data : [];
    const r = rows.find(x => String(x._id) === String(id));
    if (!r) return;

    const business = r.businessName || r.business || "";
    const email = r.email || "";
    const phone = r.phone || r.phoneNumber || "";
    const branch = r.branchName || r.branch || "";
    const licenseNo = r.licenseNo || r.license || "";

    if (business) document.getElementById("businessName").value = business;
    if (branch) document.getElementById("branchName").value = branch;
    if (phone) document.getElementById("phone").value = phone;
    if (licenseNo) document.getElementById("licenseNo").value = licenseNo;
    if (email) document.getElementById("email").value = email;

    // tempPassword must still be entered by admin
    document.getElementById("tempPassword").focus();
  } catch (err) {
    console.error(err);
  }
}

window.prefillFromRequest = prefillFromRequest;

// ----------------------------
// ACCOUNTS LIST
// ----------------------------
async function reloadAccounts() {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  const q = (document.getElementById("searchBox")?.value || "").trim();

  const body = document.getElementById("accountsBody");
  const countLine = document.getElementById("countLine");
  if (body) body.innerHTML = `<tr><td colspan="10" class="small">Loading...</td></tr>`;

  try {
    const url = q ? `${api}/api/admin/lenders?q=${encodeURIComponent(q)}` : `${api}/api/admin/lenders`;
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      if (body) body.innerHTML = "";
      alert((data && data.message) ? data.message : "Failed to load accounts");
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (countLine) countLine.textContent = `Showing ${rows.length} account(s).`;

    if (!body) return;

    body.innerHTML = rows.map(u => {
      const id = u._id;
      const role = String(u.role || "lender").toUpperCase();
      const status = String(u.status || "active").toUpperCase();
      const billing = String(u.billingStatus || "paid").toUpperCase();
      const paidUntil = fmtDate(u.paidUntil);

      const suspendLabel = (String(u.status || "").toLowerCase() === "suspended") ? "Activate" : "Suspend";
      const suspendNextStatus = (String(u.status || "").toLowerCase() === "suspended") ? "active" : "suspended";

      return `
        <tr>
          <td>${escapeHtml(u.businessName || "")}</td>
          <td>${escapeHtml(u.email || "")}</td>
          <td>${escapeHtml(role)}</td>
          <td>${escapeHtml(status)}</td>
          <td>${escapeHtml(billing)}</td>
          <td>${escapeHtml(paidUntil || "-")}</td>
          <td>${escapeHtml(u.branchName || "")}</td>
          <td>${escapeHtml(u.phone || "")}</td>
          <td>${escapeHtml(u.licenseNo || "")}</td>
          <td style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-ghost btn-sm" type="button" onclick="setStatus('${id}','${suspendNextStatus}')">${suspendLabel}</button>
            <button class="btn-ghost btn-sm" type="button" onclick="markPaid('${id}')">Mark Paid</button>
            <button class="btn-ghost btn-sm" type="button" onclick="setDue('${id}')">Set Due</button>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    if (body) body.innerHTML = "";
    alert("Network error while loading accounts");
  }
}

window.reloadAccounts = reloadAccounts;

async function setStatus(userId, newStatus) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  try {
    const res = await fetch(`${api}/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to update status");
      return;
    }
    await reloadAccounts();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}

window.setStatus = setStatus;

async function markPaid(userId) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  const paidUntil = prompt("Paid until date (YYYY-MM-DD). Leave blank for none:", "");
  if (paidUntil === null) return;

  const amount = prompt("Payment amount (number, optional):", "");
  if (amount === null) return;

  const ref = prompt("Payment reference (optional):", "");
  if (ref === null) return;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch(`${api}/api/admin/users/${encodeURIComponent(userId)}/billing`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        billingStatus: "paid",
        paidUntil: paidUntil.trim() ? paidUntil.trim() : null,
        lastPaymentAt: today,
        lastPaymentAmount: amount.trim() ? Number(amount.trim()) : null,
        lastPaymentRef: ref.trim()
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to mark paid");
      return;
    }
    await reloadAccounts();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}

window.markPaid = markPaid;

async function setDue(userId) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  const note = prompt("Reason / note (optional):", "");
  if (note === null) return;

  try {
    const res = await fetch(`${api}/api/admin/users/${encodeURIComponent(userId)}/billing`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        billingStatus: "due",
        notes: note.trim()
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to set due");
      return;
    }
    await reloadAccounts();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}

window.setDue = setDue;

// ----------------------------
// tiny helper: prevent HTML injection in table/cards
// ----------------------------
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
