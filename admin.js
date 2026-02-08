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

  // backend allows either x-admin-key OR token
  if (adminKey) h["x-admin-key"] = adminKey;
  if (token) h["Authorization"] = token;

  return h;
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

function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function badge(text, cls) {
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

function statusBadge(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  if (s === "suspended") return badge("SUSPENDED", "badge-red");
  return badge("ACTIVE", "badge-green");
}

function billingBadge(billingRaw) {
  const b = String(billingRaw || "paid").toLowerCase();
  if (b === "overdue") return badge("OVERDUE", "badge-red");
  if (b === "due") return badge("DUE", "badge-yellow");
  return badge("PAID", "badge-pink"); // approved = pink vibe
}

function roleBadge(roleRaw) {
  const r = String(roleRaw || "lender").toLowerCase();
  if (r === "admin") return badge("ADMIN", "badge-blue");
  return badge("LENDER", "badge-gray");
}

(function init() {
  const pill = document.getElementById("adminPill");
  if (pill) {
    const email = getEmail();
    pill.textContent = email ? `Logged in: ${email}` : "Logged in";
  }

  // collapse
  const btn = document.getElementById("toggleAccountsBtn");
  const wrap = document.getElementById("accountsWrap");
  if (btn && wrap) {
    btn.addEventListener("click", function () {
      const isHidden = wrap.style.display === "none";
      wrap.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "▲" : "▼";
    });
  }

  // reload buttons
  document.getElementById("loadAccountsBtn")?.addEventListener("click", reloadAccounts);
  document.getElementById("loadRequestsBtn")?.addEventListener("click", loadRequests);

  // search box auto
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

  // initial load
  loadRequests();
  reloadAccounts();
})();

async function reloadAccounts() {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  const q = (document.getElementById("searchBox")?.value || "").trim();
  const list = document.getElementById("accountsList");
  const countLine = document.getElementById("countLine");

  if (list) list.innerHTML = `<div class="small">Loading accounts...</div>`;

  try {
    const url = q ? `${api}/api/admin/lenders?q=${encodeURIComponent(q)}` : `${api}/api/admin/lenders`;
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      if (list) list.innerHTML = "";
      alert((data && data.message) ? data.message : "Failed to load accounts (Forbidden?)");
      return;
    }

    let rows = Array.isArray(data) ? data : [];

    // hide junk legacy record that has "password" instead of passwordHash
    rows = rows.filter(u => !(u.email === "admin@cashloan.com"));

    if (countLine) countLine.textContent = `Showing ${rows.length} account(s).`;

    if (!list) return;

    // clean wide table (no side scroll)
    const html = `
      <div class="accounts-table">
        <div class="a-head">
          <div>Business</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Billing</div>
          <div>Paid Until</div>
          <div>Branch</div>
          <div>Phone</div>
          <div>License</div>
          <div>Actions</div>
        </div>
        ${rows.map(u => {
          const id = u._id;
          const isSusp = String(u.status || "").toLowerCase() === "suspended";
          const suspendLabel = isSusp ? "Activate" : "Suspend";
          const nextStatus = isSusp ? "active" : "suspended";

          return `
            <div class="a-row">
              <div>${esc(u.businessName || "")}</div>
              <div>${esc(u.email || "")}</div>
              <div>${roleBadge(u.role)}</div>
              <div>${statusBadge(u.status)}</div>
              <div>${billingBadge(u.billingStatus)}</div>
              <div>${esc(fmtDate(u.paidUntil) || "-")}</div>
              <div>${esc(u.branchName || "")}</div>
              <div>${esc(u.phone || "")}</div>
              <div>${esc(u.licenseNo || "")}</div>
              <div class="a-actions">
                <button class="btn-ghost btn-sm" onclick="setStatus('${id}','${nextStatus}')">${suspendLabel}</button>
                <button class="btn-ghost btn-sm" onclick="markPaid('${id}')">Mark Paid</button>
                <button class="btn-ghost btn-sm" onclick="setDue('${id}')">Set Due</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    list.innerHTML = html;

  } catch (err) {
    console.error(err);
    if (list) list.innerHTML = "";
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
    if (!res.ok) return alert(data.message || "Failed to update status");

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

  const amount = prompt("Payment amount (optional):", "");
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
    if (!res.ok) return alert(data.message || "Failed to mark paid");

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
    if (!res.ok) return alert(data.message || "Failed to set due");

    await reloadAccounts();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}
window.setDue = setDue;

/* ---------------------------
   Signup requests
---------------------------- */
async function loadRequests() {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const box = document.getElementById("requestsList");
  if (!api || !box) return;

  box.innerHTML = `<div class="small">Loading requests...</div>`;

  try {
    const res = await fetch(`${api}/api/admin/requests`, { headers: authHeaders() });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      box.innerHTML = "";
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      box.innerHTML = `<div class="small">No signup requests yet.</div>`;
      return;
    }

    box.innerHTML = rows.map(r => {
      const id = r._id;
      const b = esc(r.businessName || "");
      const e = esc(r.email || "");
      const p = esc(r.phone || "");
      return `
        <div class="request-card">
          <div><b>${b}</b></div>
          <div class="small">${e} • ${p}</div>
          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn-ghost btn-sm" onclick="prefillFromRequest('${id}','${b}','${e}','${p}')">Use in Create Form</button>
            <button class="btn-ghost btn-sm" onclick="deleteRequest('${id}')">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    box.innerHTML = "";
  }
}

function prefillFromRequest(id, businessName, email, phone) {
  const bn = document.getElementById("businessName");
  const em = document.getElementById("email");
  const ph = document.getElementById("phone");
  if (bn) bn.value = businessName;
  if (em) em.value = email;
  if (ph) ph.value = phone;
  setMsg("Prefilled from request ✅ (fill branch/license/password, then Create).", true);
}
window.prefillFromRequest = prefillFromRequest;

async function deleteRequest(requestId) {
  const api = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!api) return;

  if (!confirm("Delete this signup request?")) return;

  try {
    const res = await fetch(`${api}/api/admin/requests/${encodeURIComponent(requestId)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.message || "Failed to delete request");

    await loadRequests();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}
window.deleteRequest = deleteRequest;
