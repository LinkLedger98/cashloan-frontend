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

  if (adminKey) h["x-admin-key"] = adminKey;
  if (token) h["Authorization"] = token;
  return h;
}

function setMsg(text, ok) {
  const el = document.getElementById("msg");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#5CFFB0" : "#FF7A7A";
}

function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

function pill(html, cls) {
  return `<span class="pill ${cls || ""}">${html}</span>`;
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}
window.logout = logout;

function setAdminPill() {
  const pillEl = document.getElementById("adminPill");
  if (!pillEl) return;
  const email = getEmail();
  pillEl.textContent = email ? `Logged in: ${email}` : "Logged in";
}

function setupCollapse() {
  const btn = document.getElementById("toggleAccountsBtn");
  const wrap = document.getElementById("accountsWrap");
  if (!btn || !wrap) return;

  btn.addEventListener("click", function () {
    const hidden = wrap.style.display === "none";
    wrap.style.display = hidden ? "block" : "none";
    btn.textContent = hidden ? "▲" : "▼";
  });
}

function setupSearchDebounce() {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox) return;

  let t = null;
  searchBox.addEventListener("input", function () {
    clearTimeout(t);
    t = setTimeout(() => reloadAccounts(), 250);
  });
}

async function createLenderHandler() {
  const form = document.getElementById("adminForm");
  if (!form) return;

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

    try {
      const res = await fetch(`${api}/api/admin/lenders`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.message || "Failed to create lender", false);

      setMsg("Lender created ✅", true);

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

async function reloadRequests() {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  const box = document.getElementById("requestsList");
  if (!box) return;

  box.innerHTML = `<div class="small">Loading requests...</div>`;

  try {
    const res = await fetch(`${api}/api/admin/requests`, { headers: authHeaders() });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      box.innerHTML = "";
      alert((data && data.message) ? data.message : "Failed to load requests");
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      box.innerHTML = `<div class="small">No signup requests.</div>`;
      return;
    }

    box.innerHTML = rows.map(r => {
      const status = String(r.status || "pending").toLowerCase();
      const statusPill =
        status === "approved" ? pill("APPROVED", "pill-approved") :
        status === "rejected" ? pill("REJECTED", "pill-suspended") :
        pill("PENDING", "pill-due");

      return `
        <div class="card" style="padding:14px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
            <div style="font-weight:800;">${r.businessName || ""}</div>
            <div>${statusPill}</div>
          </div>

          <div class="small" style="margin-top:8px;">
            <div><b>Email:</b> ${r.email || ""}</div>
            <div><b>Branch:</b> ${r.branchName || ""}</div>
            <div><b>Phone:</b> ${r.phone || ""}</div>
            <div><b>NBIFIRA:</b> ${r.licenseNo || ""}</div>
            ${r.notes ? `<div><b>Notes:</b> ${r.notes}</div>` : ``}
            <div style="opacity:.85; margin-top:6px;">${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
            <button class="btn-ghost btn-sm" onclick="deleteRequest('${r._id}')">Delete</button>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    box.innerHTML = "";
    alert("Network error while loading requests");
  }
}

window.deleteRequest = async function (id) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  if (!confirm("Delete this signup request?")) return;

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
    await reloadRequests();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
};

async function reloadAccounts() {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  const q = (document.getElementById("searchBox")?.value || "").trim();
  const list = document.getElementById("accountsList");
  const countLine = document.getElementById("countLine");

  if (!list) return;

  list.innerHTML = `<div class="small">Loading accounts...</div>`;

  try {
    const url = q ? `${api}/api/admin/lenders?q=${encodeURIComponent(q)}` : `${api}/api/admin/lenders`;
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      list.innerHTML = "";
      alert((data && data.message) ? data.message : "Failed to load accounts");
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (countLine) countLine.textContent = `Showing ${rows.length} account(s).`;

    if (rows.length === 0) {
      list.innerHTML = `<div class="small">No accounts found.</div>`;
      return;
    }

    list.innerHTML = rows.map(u => {
      const id = u._id;

      const role = String(u.role || "lender").toUpperCase();
      const status = String(u.status || "active").toLowerCase();
      const billing = String(u.billingStatus || "paid").toLowerCase();

      const statusPill = status === "suspended"
        ? pill("SUSPENDED", "pill-suspended")
        : pill("ACTIVE", "pill-active");

      // “approved should be pink highlight”
      // Your backend stores billingStatus: paid/due/overdue
      // We’ll show PAID as APPROVED (pink)
      const billingPill =
        billing === "paid" ? pill("APPROVED", "pill-approved") :
        billing === "overdue" ? pill("OVERDUE", "pill-suspended") :
        pill("DUE", "pill-due");

      const paidUntil = fmtDate(u.paidUntil);

      const suspendLabel = status === "suspended" ? "Activate" : "Suspend";
      const suspendNext = status === "suspended" ? "active" : "suspended";

      return `
        <div class="card" style="padding:14px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
            <div style="min-width:240px;">
              <div style="font-weight:900;">${u.businessName || ""}</div>
              <div class="small" style="margin-top:4px;">
                <div><b>Email:</b> ${u.email || ""}</div>
                <div><b>Branch:</b> ${u.branchName || ""}</div>
                <div><b>Phone:</b> ${u.phone || ""}</div>
                <div><b>License:</b> ${u.licenseNo || ""}</div>
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:flex-end;">
              ${pill(role, "pill-role")}
              ${statusPill}
              ${billingPill}
              ${paidUntil ? pill("Paid until: " + paidUntil, "pill-soft") : ""}
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
            <button class="btn-ghost btn-sm" onclick="setStatus('${id}','${suspendNext}')">${suspendLabel}</button>
            <button class="btn-ghost btn-sm" onclick="editBilling('${id}')">Edit Billing</button>
            <button class="btn-ghost btn-sm" onclick="markPaid('${id}')">Mark Paid</button>
            <button class="btn-ghost btn-sm" onclick="setDue('${id}')">Set Due</button>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    list.innerHTML = "";
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

window.editBilling = async function (userId) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  // quick + safe (no layout break): prompts
  const billingStatus = prompt("billingStatus: paid / due / overdue", "paid");
  if (billingStatus === null) return;

  const paidUntil = prompt("paidUntil (YYYY-MM-DD) or blank", "");
  if (paidUntil === null) return;

  const lastPaymentAt = prompt("lastPaymentAt (YYYY-MM-DD) or blank", "");
  if (lastPaymentAt === null) return;

  const lastPaymentAmount = prompt("lastPaymentAmount (number) or blank", "");
  if (lastPaymentAmount === null) return;

  const lastPaymentRef = prompt("lastPaymentRef or blank", "");
  if (lastPaymentRef === null) return;

  const notes = prompt("notes or blank", "");
  if (notes === null) return;

  const payload = {
    billingStatus: String(billingStatus || "").trim().toLowerCase()
  };

  payload.paidUntil = paidUntil.trim() ? paidUntil.trim() : null;
  payload.lastPaymentAt = lastPaymentAt.trim() ? lastPaymentAt.trim() : null;
  payload.lastPaymentAmount = lastPaymentAmount.trim() ? Number(lastPaymentAmount.trim()) : null;
  payload.lastPaymentRef = lastPaymentRef.trim();
  payload.notes = notes.trim();

  try {
    const res = await fetch(`${api}/api/admin/users/${encodeURIComponent(userId)}/billing`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Failed to update billing");
      return;
    }
    await reloadAccounts();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
};

(function init() {
  setAdminPill();
  setupCollapse();
  setupSearchDebounce();
  createLenderHandler();

  document.getElementById("loadRequestsBtn")?.addEventListener("click", reloadRequests);
  document.getElementById("loadAccountsBtn")?.addEventListener("click", reloadAccounts);

  // load on open
  reloadRequests();
  reloadAccounts();
})();
