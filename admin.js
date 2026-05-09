/* ---------------- Global admin helpers ---------------- */
function escapeHtml(x) {
  return String(x || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function $(id) {
  return document.getElementById(id);
}

async function fetchJson(url, options = {}) {
  const API_BASE_URL =
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "";

  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body || null
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {}

  return { ok: res.ok, data };
}

async function requireSuperAdmin() {
  const token = localStorage.getItem("authToken");
  const role = String(
    localStorage.getItem("userRole") || localStorage.getItem("role") || ""
  ).toLowerCase();

  if (!token) {
    window.location.href = "login.html";
    return false;
  }

  if (role !== "superadmin") {
    alert("Access Denied");
    window.location.href = "dashboard.html";
    return false;
  }

  return true;
}

window.escapeHtml = escapeHtml;
window.$ = $;
window.fetchJson = fetchJson;
window.requireSuperAdmin = requireSuperAdmin;

function ensureCollapseWrap(wrapEl) {
  if (!wrapEl) return;

  // remove any old inline hiding
  wrapEl.style.display = "";
  wrapEl.style.maxHeight = "";
  wrapEl.style.overflow = "";

  if (!wrapEl.classList.contains("collapse-wrap")) {
    wrapEl.classList.add("collapse-wrap");
  }
}

  function setCollapsed(wrapEl, btnEl, collapsed) {
    if (!wrapEl || !btnEl) return;

    ensureCollapseWrap(wrapEl);

    btnEl.setAttribute("aria-controls", wrapEl.id || "");
    btnEl.setAttribute("aria-expanded", collapsed ? "false" : "true");

    if (collapsed) {
      wrapEl.classList.add("is-collapsed");

      // 🔥 FORCE HIDE
      wrapEl.style.maxHeight = "0px";
      wrapEl.style.overflow = "hidden";

      btnEl.textContent = "▼";
      btnEl.title = "Expand";
    } else {
      wrapEl.classList.remove("is-collapsed");

      // 🔥 FORCE SHOW (this is the fix)
      wrapEl.style.display = "block";
      wrapEl.style.maxHeight = "2000px"; // large enough for content
      wrapEl.style.overflow = "visible";

      btnEl.textContent = "▲";
      btnEl.title = "Collapse";
    }
  }

  function bindToggle(btnId, wrapId, defaultCollapsed) {
    const btn = $(btnId);
    const wrap = $(wrapId);
    if (!btn || !wrap) return;

    // 🔥 ALWAYS RESET FIRST (critical fix)
    wrap.classList.remove("is-collapsed");
    wrap.style.display = "block";
    wrap.style.maxHeight = "2000px";

    // THEN apply state
    setCollapsed(wrap, btn, !!defaultCollapsed);

    btn.addEventListener("click", function () {
      const isCollapsed = wrap.classList.contains("is-collapsed");
      setCollapsed(wrap, btn, !isCollapsed);
    });
  }

  /* =========================================================
     ACCOUNTS PAGE: Create lender + Signup requests + Lenders list
  ========================================================= */
  function setVal(id, v) {
    const el = $(id);
    if (el) el.value = v == null ? "" : String(v);
  }

  function fillFormDemo() {
    setVal("businessName", "Golden Finance");
    setVal("branchName", "Palapye");
    setVal("phone", "71234567");
    setVal("licenseNo", "NBIFIRA-12345");
    setVal("email", "info@goldenfinance.co.bw");
    setVal("tempPassword", "TempPass123!");
  }

  function clearForm() {
    setVal("businessName", "");
    setVal("branchName", "");
    setVal("phone", "");
    setVal("licenseNo", "");
    setVal("email", "");
    setVal("tempPassword", "");
  }

  const requestMap = {};

  function autofillFromRequest(reqObj) {
    setVal("businessName", reqObj.businessName || reqObj.cashloanName || "");
    setVal("branchName", reqObj.branchName || reqObj.cashloanBranch || "");
    setVal("phone", reqObj.phone || reqObj.cashloanPhone || "");
    setVal("licenseNo", reqObj.licenseNo || reqObj.licenceNo || "");
    setVal("email", reqObj.email || reqObj.cashloanEmail || "");
    setVal("tempPassword", "");

    const msg = $("msg");
    if (msg) msg.textContent = "Autofilled from signup request ✅ (set a temporary password, then Create Lender)";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadRequests() {
    const list = $("requestsList");
    if (!list) return;

    list.innerHTML = `<div class="small">Loading...</div>`;
    const r = await fetchJson("/api/admin/requests", { method: "GET" });

    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load requests");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    const statRequests = $("statRequests");
if (statRequests) statRequests.textContent = rows.length;
    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No signup requests.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((req) => {
      const id = String(req._id || "");
      requestMap[id] = req;

      const businessName = escapeHtml(req.businessName || req.cashloanName || "—");
      const branchName = escapeHtml(req.branchName || req.cashloanBranch || "—");
      const phone = escapeHtml(req.phone || req.cashloanPhone || "—");
      const licenseNo = escapeHtml(req.licenseNo || req.licenceNo || "—");
      const email = escapeHtml(req.email || req.cashloanEmail || "—");
      const created = req.createdAt ? new Date(req.createdAt).toLocaleString() : "";

      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>${businessName}</b> • ${branchName}</div>
              <div class="small">Email: <b>${email}</b></div>
              <div class="small">Phone: ${phone} • License: ${licenseNo}</div>
              ${created ? `<div class="small">Requested: ${escapeHtml(created)}</div>` : ""}
              <div class="small-actions" style="margin-top:10px;">
                <button class="btn-primary btn-sm" type="button" onclick="autofillRequest('${escapeHtml(id)}')">Autofill</button>
                <button class="btn-ghost btn-sm" type="button" onclick="deleteRequest('${escapeHtml(id)}')">Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  window.autofillRequest = function (id) {
    const obj = requestMap[String(id)];
    if (!obj) return alert("Request not found. Click Reload Requests.");
    autofillFromRequest(obj);
    setCollapsed($("requestsWrap"), $("toggleRequestsBtn"), false);
  };

  window.deleteRequest = async function (id) {
    if (!confirm("Delete this signup request?")) return;
    const r = await fetchJson(`/api/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Delete failed");
      return;
    }
    loadRequests();
  };

  function statusTag(status) {
    const s = String(status || "").toLowerCase();
    const cls = s === "suspended" ? "tag suspended" : "tag active";
    const label = s === "suspended" ? "Suspended" : "Active";
    return `<span class="${cls}">${label}</span>`;
  }

  function parseIdFromUrl(u) {
    // expects: /api/admin/payment-proofs/<id>/file
    const m = /payment-proofs\/([^/]+)\/file/i.exec(String(u || ""));
    return m && m[1] ? String(m[1]) : "";
  }

  function proofSeenKey(lenderId) {
    return `ll_seen_pop_${String(lenderId || "")}`;
  }

  function isProofNewForUser(lenderId, updatedAt) {
    const key = proofSeenKey(lenderId);
    const seen = localStorage.getItem(key);
    if (!updatedAt) return false;
    const ts = new Date(updatedAt).getTime();
    if (!isFinite(ts)) return false;
    if (!seen) return true;
    const seenTs = new Date(seen).getTime();
    if (!isFinite(seenTs)) return true;
    return ts > seenTs;
  }

 async function loadLenders() {
  const lendersList = $("lendersList");
  const lendersCount = $("lendersCount");
  const lendersSearch = $("lendersSearch");
  if (!lendersList) return;

  lendersList.innerHTML = `<div class="small">Loading...</div>`;
  if (lendersCount) lendersCount.textContent = "";

  const r = await fetchJson("/api/admin/lenders", { method: "GET" });
  if (!r.ok) {
    lendersList.innerHTML = "";
    alert((r.data && r.data.message) ? r.data.message : "Failed to load lenders");
    return;
  }

  let rows = Array.isArray(r.data) ? r.data : [];

  const statInstitutions = $("statInstitutions");
  if (statInstitutions) statInstitutions.textContent = rows.length;

  const statPendingPayments = $("statPendingPayments");
  if (statPendingPayments) statPendingPayments.textContent = "—";

  const q = String((lendersSearch && lendersSearch.value) || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter(u => {
      const hay = [
        u.businessName,
        u.branchName,
        u.phone,
        u.licenseNo,
        u.email,
        u.status,
        u.billingStatus
      ].map(x => String(x || "").toLowerCase()).join(" ");

      return hay.includes(q);
    });
  }

  if (lendersCount) lendersCount.textContent = `Accounts: ${rows.length}`;

  if (rows.length === 0) {
    lendersList.innerHTML = `<div class="result-item"><div class="small">No lenders found.</div></div>`;
    return;
  }

  let html = "";

  rows.forEach((u) => {
    const id = u._id;
    const businessName = escapeHtml(u.businessName || "—");
    const branchName = escapeHtml(u.branchName || "—");
    const phone = escapeHtml(u.phone || "—");
    const licenseNo = escapeHtml(u.licenseNo || "—");
    const email = escapeHtml(u.email || "—");
    const st = escapeHtml(u.status || "active");

    html += `
      <div class="result-item">
        <div class="admin-row">
          <div>
            <div><b>${businessName}</b> • ${branchName}</div>
            <div class="small">Email: <b>${email}</b></div>
            <div class="small">Phone: ${phone} • License: ${licenseNo}</div>

            <div class="kv" style="margin-top:8px;">
              ${statusTag(st)}
              ${u.billingStatus ? `<span class="tag">${escapeHtml(String(u.billingStatus))}</span>` : ""}
              ${u.mustChangePassword ? `<span class="tag" title="User must change password on next login">mustChangePassword</span>` : ""}
            </div>
          </div>

          <div class="small-actions">
            <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','suspended')">Suspend</button>
            <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','active')">Activate</button>
            <button class="btn-ghost btn-sm" type="button" onclick="secureLender('${id}','${email}')">Secure</button>
            <button class="btn-primary btn-sm" type="button" onclick="openUpdateLender('${id}')">Update</button>
          </div>
        </div>
      </div>
    `;
  });

  lendersList.innerHTML = html;
}

window.loadLenders = loadLenders;

window.setLenderStatus = async function (id, status) {
  if (!confirm(`Set account status to "${status}"?`)) return;

  const r = await fetchJson(`/api/admin/users/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  if (!r.ok) {
    alert((r.data && r.data.message) ? r.data.message : "Status update failed");
    return;
  }

  loadLenders();
};

window.secureLender = async function (id, email) {
  const tempPassword = prompt(
    `Set a TEMP password for:\n${email || id}\n\nRules:\n- At least 8 chars\n- They will be forced to change it on next login`,
    ""
  ) || "";

  const pw = String(tempPassword || "").trim();
  if (!pw) return;

  if (pw.length < 8) {
    alert("Temp password must be at least 8 characters.");
    return;
  }

  const ok = confirm("Confirm: set this temporary password and force password change on next login?");
  if (!ok) return;

  const r = await fetchJson(`/api/admin/users/${encodeURIComponent(id)}/secure`, {
    method: "PATCH",
    body: JSON.stringify({ tempPassword: pw })
  });

  if (!r.ok) {
    alert((r.data && r.data.message) ? r.data.message : "Secure failed");
    return;
  }

  alert("Temporary password set ✅");
  loadLenders();
};

window.openUpdateLender = async function (id) {
  const r = await fetchJson("/api/admin/lenders", { method: "GET" });
  if (!r.ok) return alert("Could not load lender details");

  const rows = Array.isArray(r.data) ? r.data : [];
  const u = rows.find(x => String(x._id) === String(id));
  if (!u) return alert("Lender not found");

  setVal("businessName", u.businessName || "");
  setVal("branchName", u.branchName || "");
  setVal("phone", u.phone || "");
  setVal("licenseNo", u.licenseNo || "");
  setVal("email", u.email || "");
  setVal("tempPassword", "");

  const msg = $("msg");
  if (msg) msg.textContent = "Loaded lender into form ✅";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

  async function handleCreateLenderSubmit(e) {
    e.preventDefault();

    const payload = {
      businessName: String(($("businessName") && $("businessName").value) || "").trim(),
      branchName: String(($("branchName") && $("branchName").value) || "").trim(),
      phone: String(($("phone") && $("phone").value) || "").trim(),
      licenseNo: String(($("licenseNo") && $("licenseNo").value) || "").trim(),
      email: String(($("email") && $("email").value) || "").trim(),
      tempPassword: String(($("tempPassword") && $("tempPassword").value) || "").trim()
    };

    if (!payload.businessName || !payload.branchName || !payload.phone || !payload.licenseNo || !payload.email || !payload.tempPassword) {
      alert("Please fill all fields");
      return;
    }

    if (payload.tempPassword.length < 8) {
      alert("Temporary password must be at least 8 characters.");
      return;
    }

    const msg = $("msg");
    if (msg) msg.textContent = "Creating...";

    const r = await fetchJson("/api/admin/lenders", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Create lender failed";
      if (msg) msg.textContent = "❌ " + m;
      alert(m);
      return;
    }

    if (msg) msg.textContent = "✅ Lender created";
    alert("Lender created ✅");
    clearForm();

    try { loadLenders(); } catch (e) { }
    try { loadRequests(); } catch (e) { }
  }

    
    /* =========================================================
       📝 LOG ADMIN ACTION (UPGRADED)
    ========================================================= */
    window.logAuditAction = async function (target, type, context = {}) {
      try {
        const note = prompt(`Add a note for this action (${type})`, "e.g. Called client, no answer");

        const res = await fetch(window.APP_CONFIG.API_BASE_URL + "/api/admin/audit/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("authToken")
          },
          body: JSON.stringify({
            target,
            action: type,
            note: note || "Admin follow-up action",
            contextType: context.type || null,
            contextId: context.id || null
          })
        });

        if (!res.ok) {
          alert("❌ Failed to log action");
          return;
        }

        // ✅ USE YOUR EXISTING TOAST SYSTEM
        // ✅ SAFE TOAST FALLBACK
if (typeof toast === "function") {

  toast(`${type} logged successfully`, {
    title: "Admin Action",
    ttlMs: 3000
  });

} else {

  alert(`${type} logged successfully`);

}

      } catch (e) {
        console.error(e);
        alert("Error logging action");
      }

      };

    /* ================================
   DISPUTES (SUPER ADMIN) — PREMIUM CLEAN
================================ */
async function loadDisputes(mode = "") {
  const list = $("disputesList");
  if (!list) return;

  list.innerHTML = `<div class="small">Loading disputes...</div>`;

  const r = await fetchJson("/api/admin/disputes", { method: "GET" });

  if (!r.ok) {
    list.innerHTML = "";
    alert("Failed to load disputes");
    return;
  }

  let rows = Array.isArray(r.data) ? r.data : [];

  if (mode === "overdue") {
    const now = Date.now();
    rows = rows.filter((d) => {
      const due = d.slaDueAt ? new Date(d.slaDueAt).getTime() : NaN;
      const st = String(d.adminStatus || d.status || "").toLowerCase();
      return isFinite(due) && due < now && st !== "resolved" && st !== "rejected";
    });
  }

  if (rows.length === 0) {
    list.innerHTML = `<div class="result-item"><div class="small">No disputes found.</div></div>`;
    return;
  }

  let html = "";

  rows.forEach((d) => {
    const id = escapeHtml(d._id || "");
    const nationalId = escapeHtml(d.nationalId || "—");

    const rawStatus = String(d.adminStatus || d.status || "pending").toLowerCase();
    const statusLabel =
      rawStatus === "resolved" ? "Resolved" :
      rawStatus === "investigating" ? "Investigating" :
      rawStatus === "rejected" ? "Rejected" :
      "Pending";

    const statusClass =
      rawStatus === "resolved" ? "paid" :
      rawStatus === "investigating" ? "owing" :
      rawStatus === "rejected" ? "overdue" :
      "owing";

   const raisedByName =
  d.raisedByName ||
  d.raisedByCashloanName ||
  d.cashloanName ||
  d.businessName ||
  d.raisedByEmail ||
  "Unknown lender";

const raisedByBranch =
  d.raisedByBranch ||
  d.raisedByCashloanBranch ||
  d.cashloanBranch ||
  d.branchName ||
  d.branch ||
  "";

const raisedBy = escapeHtml(
  raisedByBranch
    ? `${raisedByName} • ${raisedByBranch}`
    : raisedByName
);

    const againstName =
  d.againstCashloanName ||
  d.againstName ||
  d.againstBusinessName ||
  "Unknown";

const againstBranch =
  d.againstCashloanBranch ||
  d.againstBranch ||
  "";

const against = escapeHtml(
  againstBranch
    ? `${againstName} • ${againstBranch}`
    : againstName
);

    const opened = d.createdAt ? new Date(d.createdAt).toLocaleString() : "—";
    const updated = d.adminUpdatedAt || d.updatedAt
      ? new Date(d.adminUpdatedAt || d.updatedAt).toLocaleString()
      : "";

    const sla = d.slaDueAt ? new Date(d.slaDueAt).toLocaleString() : "";
    const reason = escapeHtml(d.notes || "No reason captured.");
    const action = escapeHtml(d.adminNote || "No action recorded yet.");

    html += `
      <div class="dispute-premium-card">

        <div class="dispute-topline">
          <div>
            <div class="dispute-title">Omang: ${nationalId}</div>
            <div class="small">Opened: ${escapeHtml(opened)}${sla ? ` • SLA: ${escapeHtml(sla)}` : ""}</div>
          </div>

          <span class="badge ${statusClass}">${statusLabel}</span>
        </div>

        <div class="dispute-mini-grid">
          <div>
            <div class="mini-label">Raised by</div>
            <div class="mini-value">${raisedBy}</div>
          </div>

          <div>
            <div class="mini-label">Against</div>
            <div class="mini-value">${against}</div>
          </div>
        </div>

        <div class="dispute-block">
          <div class="mini-label">Reason</div>
          <div class="mini-value">${reason}</div>
        </div>

        <div class="dispute-block">
          <div class="mini-label">Action Taken</div>
          <div class="mini-value">${action}</div>
        </div>

        <div class="timeline-clean">
          <div>🟣 Opened: ${escapeHtml(opened)}</div>
          ${updated ? `<div>🟡 Last update: ${escapeHtml(updated)}</div>` : ""}
          <div>📌 Current status: ${statusLabel}</div>
        </div>

        <div class="dispute-actions">
          ${
            rawStatus !== "resolved"
              ? `
                <button class="btn-ghost btn-sm" onclick="investigateDispute('${id}')">Investigate</button>
                <button class="btn-primary btn-sm" onclick="resolveDispute('${id}')">Resolve</button>
              `
              : ""
          }

          <button class="btn-ghost btn-sm" onclick="openInbox('${nationalId}')">Open Inbox</button>
        </div>

      </div>
    `;
  });

  list.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", function () {
  // ✅ ACCOUNTS PAGE
  bindToggle("toggleRequestsBtn", "requestsWrap", true);
  bindToggle("toggleLendersBtn", "lendersWrap", true);

  if ($("fillFormBtn")) $("fillFormBtn").addEventListener("click", fillFormDemo);
  if ($("clearFormBtn")) $("clearFormBtn").addEventListener("click", clearForm);

  if ($("reloadRequestsBtn")) $("reloadRequestsBtn").addEventListener("click", loadRequests);
  if ($("reloadLendersBtn")) $("reloadLendersBtn").addEventListener("click", loadLenders);
  if ($("lendersSearch")) $("lendersSearch").addEventListener("input", function () { loadLenders(); });

  if ($("adminForm")) $("adminForm").addEventListener("submit", handleCreateLenderSubmit);

  try { if ($("requestsList")) loadRequests(); } catch (e) {}
  try { if ($("lendersList")) loadLenders(); } catch (e) {}

  // ✅ DISPUTES PAGE
  if ($("loadDisputesBtn")) {
    $("loadDisputesBtn").addEventListener("click", () => loadDisputes(""));
  }

  if ($("loadDisputesOverdueBtn")) {
    $("loadDisputesOverdueBtn").addEventListener("click", () => loadDisputes("overdue"));
  }

  try {
    if ($("disputesList")) loadDisputes("");
  } catch (e) {}
});

window.loadDisputes = loadDisputes;

window.resolveDispute = async function (id) {
  const note = prompt("Enter action taken:", "Resolved after review.");

  if (note === null) return;

  const r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      adminStatus: "resolved",
      status: "resolved",
      adminNote: note
    })
  });

  if (!r.ok) {
    alert("Failed to resolve dispute");
    return;
  }

  alert("Resolved ✅");
  loadDisputes("");
};

window.investigateDispute = async function (id) {
  const note = prompt("Enter investigation note:", "We have received your dispute and are investigating.");

  if (note === null) return;

  const r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      adminStatus: "investigating",
      status: "investigating",
      adminNote: note
    })
  });

  if (!r.ok) {
    alert("Failed to update dispute");
    return;
  }

  alert("Marked as investigating ✅");
  loadDisputes("");
};

function openInbox(nationalId) {
  window.location.href = `admin_consents.html?search=${encodeURIComponent(nationalId)}`;
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("role");

  window.location.href = "login.html";
}