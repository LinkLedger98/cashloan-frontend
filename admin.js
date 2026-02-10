(function () {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

  // -------------------------
  // Helpers
  // -------------------------
  function $(id) { return document.getElementById(id); }

  function getToken() { return localStorage.getItem("authToken"); }
  function getRole() { return String(localStorage.getItem("userRole") || "").toLowerCase(); }

  function escapeHtml(x) {
    return String(x || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isNineDigits(v) {
    return /^\d{9}$/.test(String(v || "").trim());
  }

  async function fetchJson(path, opts) {
    if (!API_BASE_URL) throw new Error("API_BASE_URL missing in config.js");

    const token = getToken();
    const adminKey = ($("adminKey") && $("adminKey").value ? String($("adminKey").value).trim() : "");

    const headers = Object.assign(
      { "Content-Type": "application/json" },
      (opts && opts.headers) ? opts.headers : {}
    );

    // ✅ If adminKey is provided, send it (legacy support)
    if (adminKey) headers["x-admin-key"] = adminKey;

    // ✅ Always try token as well (role-based support)
    if (token) headers["Authorization"] = token;

    const res = await fetch(API_BASE_URL + path, Object.assign({}, opts || {}, { headers }));

    const data = await res.json().catch(() => ({}));

    // Auto logout on expired session
    if (res.status === 401) {
      alert("Session expired. Please login again.");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      window.location.href = "login.html";
      return { ok: false, status: 401, data };
    }

    // Forbidden (not admin / wrong key)
    if (res.status === 403) {
      // If user is admin but key missing, message still helps
      alert((data && data.message) ? data.message : "Forbidden");
      return { ok: false, status: 403, data };
    }

    return { ok: res.ok, status: res.status, data };
  }

  // -------------------------
  // Existing UI elements
  // -------------------------
  const adminPill = $("adminPill");
  const msg = $("msg");
  const adminForm = $("adminForm");

  const loadRequestsBtn = $("loadRequestsBtn");
  const requestsList = $("requestsList");

  const loadAccountsBtn = $("loadAccountsBtn");
  const toggleAccountsBtn = $("toggleAccountsBtn");
  const accountsWrap = $("accountsWrap");
  const searchBox = $("searchBox");
  const accountsList = $("accountsList");
  const countLine = $("countLine");

  // ✅ New UI elements
  const loadDisputesBtn = $("loadDisputesBtn");
  const loadOverdueBtn = $("loadOverdueBtn");
  const disputeStatusFilter = $("disputeStatusFilter");
  const disputeSearchNationalId = $("disputeSearchNationalId");
  const disputesList = $("disputesList");
  const disputeCountLine = $("disputeCountLine");

  const loadAuditBtn = $("loadAuditBtn");
  const auditNationalId = $("auditNationalId");
  const auditLimit = $("auditLimit");
  const auditList = $("auditList");
  const auditCountLine = $("auditCountLine");

  function setMsg(t) { if (msg) msg.textContent = t || ""; }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  }
  window.logout = logout;

  // -------------------------
  // Gatekeeping
  // -------------------------
  if (adminPill) {
    const email = localStorage.getItem("userEmail") || "";
    adminPill.textContent = email ? `Logged in: ${email}` : "Logged in";
  }

  // If someone loads admin page without token + without admin key,
  // they can still paste ADMIN_KEY to use legacy.
  // But if they do have token and role isn't admin, backend blocks anyway.
  if (!getToken() && !$("adminKey")) {
    // fine
  }

  // -------------------------
  // Signup Requests
  // -------------------------
  async function loadRequests() {
    if (!requestsList) return;
    requestsList.innerHTML = `<div class="small">Loading...</div>`;

    const r = await fetchJson("/api/admin/requests", { method: "GET" });
    if (!r.ok) {
      requestsList.innerHTML = "";
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (rows.length === 0) {
      requestsList.innerHTML = `<div class="result-item"><div class="small">No signup requests.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((x) => {
      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>${escapeHtml(x.businessName || "")}</b> — ${escapeHtml(x.branchName || "")}</div>
              <div class="small">Email: <b>${escapeHtml(x.email || "")}</b></div>
              <div class="small">Phone: ${escapeHtml(x.phone || "")}</div>
              <div class="small">License: ${escapeHtml(x.licenseNo || "")}</div>
              ${x.notes ? `<div class="small">Notes: ${escapeHtml(x.notes)}</div>` : ""}
              <div class="small">Created: ${x.createdAt ? new Date(x.createdAt).toLocaleString() : ""}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-ghost btn-sm" onclick="deleteRequest('${escapeHtml(x._id)}')">Delete</button>
            </div>
          </div>
        </div>
      `;
    });

    requestsList.innerHTML = html;
  }

  async function deleteRequest(id) {
    if (!confirm("Delete this request?")) return;

    const r = await fetchJson(`/api/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Delete failed");
      return;
    }
    alert("Request deleted ✅");
    loadRequests();
  }
  window.deleteRequest = deleteRequest;

  if (loadRequestsBtn) loadRequestsBtn.addEventListener("click", loadRequests);

  // -------------------------
  // Create lender
  // -------------------------
  if (adminForm) {
    adminForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg("Creating lender...");

      const payload = {
        businessName: $("businessName").value.trim(),
        branchName: $("branchName").value.trim(),
        phone: $("phone").value.trim(),
        licenseNo: $("licenseNo").value.trim(),
        email: $("email").value.trim().toLowerCase(),
        tempPassword: $("tempPassword").value.trim()
      };

      if (!payload.businessName || !payload.branchName || !payload.phone || !payload.licenseNo || !payload.email || !payload.tempPassword) {
        setMsg("All fields required.");
        return;
      }

      const r = await fetchJson("/api/admin/lenders", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (r.status === 409) {
        setMsg(r.data.message || "Email already exists.");
        return;
      }
      if (!r.ok) {
        setMsg(r.data.message || "Create failed.");
        return;
      }

      setMsg("Lender created ✅");
      adminForm.reset();
      loadAccounts();
    });
  }

  // -------------------------
  // Accounts (existing)
  // -------------------------
  let accountsCollapsed = false;

  function setAccountsCollapsed(v) {
    accountsCollapsed = !!v;
    if (!accountsWrap) return;
    accountsWrap.style.display = accountsCollapsed ? "none" : "block";
    if (toggleAccountsBtn) toggleAccountsBtn.textContent = accountsCollapsed ? "▼" : "▲";
  }

  async function loadAccounts() {
    if (!accountsList) return;
    accountsList.innerHTML = `<div class="small">Loading...</div>`;

    const q = searchBox ? String(searchBox.value || "").trim() : "";
    const r = await fetchJson(`/api/admin/lenders${q ? `?q=${encodeURIComponent(q)}` : ""}`, { method: "GET" });

    if (!r.ok) {
      accountsList.innerHTML = "";
      if (countLine) countLine.textContent = "";
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (countLine) countLine.textContent = `Accounts: ${rows.length}`;

    if (rows.length === 0) {
      accountsList.innerHTML = `<div class="result-item"><div class="small">No accounts found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((u) => {
      const status = String(u.status || "");
      const billing = String(u.billingStatus || "");
      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>${escapeHtml(u.businessName || "")}</b> — ${escapeHtml(u.branchName || "")}</div>
              <div class="small">Email: <b>${escapeHtml(u.email || "")}</b></div>
              <div class="small">Phone: ${escapeHtml(u.phone || "")}</div>
              <div class="small">License: ${escapeHtml(u.licenseNo || "")}</div>
              <div class="small">Status: <b>${escapeHtml(status)}</b> • Billing: <b>${escapeHtml(billing)}</b></div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-ghost btn-sm" onclick="toggleUserStatus('${escapeHtml(u._id)}','${escapeHtml(status)}')">
                ${status === "suspended" ? "Activate" : "Suspend"}
              </button>
              <button class="btn-ghost btn-sm" onclick="openBilling('${escapeHtml(u._id)}')">Billing</button>
            </div>
          </div>

          <div id="bill-${escapeHtml(u._id)}" class="billing-panel" style="display:none; margin-top:10px;">
            <div class="row" style="grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label class="small">Billing Status</label>
                <select id="bStatus-${escapeHtml(u._id)}">
                  <option value="paid" ${billing === "paid" ? "selected" : ""}>paid</option>
                  <option value="due" ${billing === "due" ? "selected" : ""}>due</option>
                  <option value="overdue" ${billing === "overdue" ? "selected" : ""}>overdue</option>
                </select>
              </div>
              <div>
                <label class="small">Paid Until (optional)</label>
                <input id="bPaidUntil-${escapeHtml(u._id)}" type="date" />
              </div>
            </div>

            <div class="row" style="grid-template-columns: 1fr 1fr; gap:12px; margin-top:10px;">
              <div>
                <label class="small">Last Payment Amount</label>
                <input id="bAmt-${escapeHtml(u._id)}" placeholder="e.g. 500" />
              </div>
              <div>
                <label class="small">Payment Ref</label>
                <input id="bRef-${escapeHtml(u._id)}" placeholder="e.g. FNB-1234" />
              </div>
            </div>

            <div style="margin-top:10px;">
              <label class="small">Notes</label>
              <input id="bNotes-${escapeHtml(u._id)}" placeholder="Admin notes" />
            </div>

            <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn-primary btn-sm" onclick="saveBilling('${escapeHtml(u._id)}')">Save Billing</button>
              <button class="btn-ghost btn-sm" onclick="openBilling('${escapeHtml(u._id)}')">Close</button>
            </div>
          </div>
        </div>
      `;
    });

    accountsList.innerHTML = html;
  }

  async function toggleUserStatus(id, currentStatus) {
    const next = (String(currentStatus).toLowerCase() === "suspended") ? "active" : "suspended";
    if (!confirm(`Set status to "${next}"?`)) return;

    const r = await fetchJson(`/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Update failed");
      return;
    }
    alert("Status updated ✅");
    loadAccounts();
  }
  window.toggleUserStatus = toggleUserStatus;

  function openBilling(id) {
    const el = $(`bill-${id}`);
    if (!el) return;
    const isOpen = el.style.display === "block";
    el.style.display = isOpen ? "none" : "block";
  }
  window.openBilling = openBilling;

  async function saveBilling(id) {
    const billingStatus = ($(`bStatus-${id}`) && $(`bStatus-${id}`).value) || "";
    const paidUntil = ($(`bPaidUntil-${id}`) && $(`bPaidUntil-${id}`).value) || "";
    const lastPaymentAmount = ($(`bAmt-${id}`) && $(`bAmt-${id}`).value) || "";
    const lastPaymentRef = ($(`bRef-${id}`) && $(`bRef-${id}`).value) || "";
    const notes = ($(`bNotes-${id}`) && $(`bNotes-${id}`).value) || "";

    const payload = {
      billingStatus,
      paidUntil: paidUntil ? paidUntil : null,
      lastPaymentAmount: lastPaymentAmount ? Number(lastPaymentAmount) : null,
      lastPaymentRef,
      notes
    };

    const r = await fetchJson(`/api/admin/users/${encodeURIComponent(id)}/billing`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Billing update failed");
      return;
    }

    alert("Billing updated ✅");
    loadAccounts();
  }
  window.saveBilling = saveBilling;

  if (loadAccountsBtn) loadAccountsBtn.addEventListener("click", loadAccounts);

  if (toggleAccountsBtn) {
    toggleAccountsBtn.addEventListener("click", function () {
      setAccountsCollapsed(!accountsCollapsed);
    });
  }

  if (searchBox) {
    let t = null;
    searchBox.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(loadAccounts, 250);
    });
  }

  // -------------------------
  // ✅ Disputes UI (NEW)
  // -------------------------
  async function loadDisputes(mode) {
    if (!disputesList) return;
    disputesList.innerHTML = `<div class="small">Loading...</div>`;
    if (disputeCountLine) disputeCountLine.textContent = "";

    let rows = [];
    let slaDays = 5;
    let isOverdueMode = false;

    if (mode === "overdue") {
      isOverdueMode = true;
      const r = await fetchJson("/api/admin/disputes/overdue", { method: "GET" });
      if (!r.ok) { disputesList.innerHTML = ""; return; }
      slaDays = Number(r.data.slaDays || 5);
      rows = Array.isArray(r.data.rows) ? r.data.rows : [];
    } else {
      const status = disputeStatusFilter ? String(disputeStatusFilter.value || "").trim() : "";
      const r = await fetchJson(`/api/admin/disputes${status ? `?status=${encodeURIComponent(status)}` : ""}`, { method: "GET" });
      if (!r.ok) { disputesList.innerHTML = ""; return; }
      rows = Array.isArray(r.data) ? r.data : [];
    }

    // Optional filter by National ID
    const filterId = disputeSearchNationalId ? String(disputeSearchNationalId.value || "").trim() : "";
    if (filterId) {
      rows = rows.filter(d => String(d.nationalId || "").trim() === filterId);
    }

    if (disputeCountLine) {
      disputeCountLine.textContent = isOverdueMode
        ? `Overdue disputes (>${slaDays} days): ${rows.length}`
        : `Disputes: ${rows.length}`;
    }

    if (rows.length === 0) {
      disputesList.innerHTML = `<div class="result-item"><div class="small">No disputes found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((d) => {
      const st = String(d.status || "pending").toLowerCase();
      const opened = d.dateOpened ? new Date(d.dateOpened).toLocaleString() : "";
      const resolved = d.dateResolved ? new Date(d.dateResolved).toLocaleString() : "";
      const badge =
        st === "pending" ? "badge overdue" :
        st === "resolved" ? "badge paid" :
        "badge owing";

      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>Omang:</b> ${escapeHtml(d.nationalId || "")}</div>
              <div class="small">Status: <span class="${badge}">${escapeHtml(st.toUpperCase())}</span></div>
              <div class="small">Opened: ${escapeHtml(opened)}</div>
              ${resolved ? `<div class="small">Resolved: ${escapeHtml(resolved)}</div>` : ""}
              ${d.raisedByEmail ? `<div class="small">Raised by: ${escapeHtml(d.raisedByEmail)} (${escapeHtml(d.raisedByRole || "")})</div>` : ""}
              ${d.clientRecordId ? `<div class="small">Client Record ID: ${escapeHtml(d.clientRecordId)}</div>` : ""}
              ${d.notes ? `<div class="small">Notes: ${escapeHtml(d.notes)}</div>` : ""}
              ${isOverdueMode ? `<div class="small" style="opacity:.9;"><b>⚠ SLA breach risk</b></div>` : ""}
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              ${
                st === "pending"
                  ? `
                    <button class="btn-primary btn-sm" onclick="resolveDispute('${escapeHtml(d._id)}')">Resolve</button>
                    <button class="btn-ghost btn-sm" onclick="rejectDispute('${escapeHtml(d._id)}')">Reject</button>
                  `
                  : `<span class="small" style="opacity:.8;">Done</span>`
              }
            </div>
          </div>
        </div>
      `;
    });

    disputesList.innerHTML = html;
  }

  async function resolveDispute(id) {
    const notes = prompt("Resolution notes (optional):") || "";
    const r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", notes: String(notes || "").trim() })
    });
    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Failed");
      return;
    }
    alert("Dispute resolved ✅");
    loadDisputes();
  }
  window.resolveDispute = resolveDispute;

  async function rejectDispute(id) {
    const notes = prompt("Rejection reason (optional):") || "";
    const r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "rejected", notes: String(notes || "").trim() })
    });
    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Failed");
      return;
    }
    alert("Dispute rejected ✅");
    loadDisputes();
  }
  window.rejectDispute = rejectDispute;

  if (loadDisputesBtn) loadDisputesBtn.addEventListener("click", () => loadDisputes());
  if (loadOverdueBtn) loadOverdueBtn.addEventListener("click", () => loadDisputes("overdue"));

  if (disputeStatusFilter) disputeStatusFilter.addEventListener("change", () => loadDisputes());

  if (disputeSearchNationalId) {
    disputeSearchNationalId.addEventListener("input", function () {
      const v = String(disputeSearchNationalId.value || "").trim();
      if (v && !isNineDigits(v)) {
        disputeSearchNationalId.classList.add("input-warn");
      } else {
        disputeSearchNationalId.classList.remove("input-warn");
      }
    });

    disputeSearchNationalId.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const v = String(disputeSearchNationalId.value || "").trim();
        if (v && !isNineDigits(v)) {
          alert("National ID must be exactly 9 digits.");
          return;
        }
        loadDisputes();
      }
    });
  }

  // -------------------------
  // ✅ Audit logs UI (NEW)
  // -------------------------
  async function loadAudit() {
    if (!auditList) return;
    auditList.innerHTML = `<div class="small">Loading...</div>`;
    if (auditCountLine) auditCountLine.textContent = "";

    const lim = auditLimit ? Number(auditLimit.value || 100) : 100;
    const nat = auditNationalId ? String(auditNationalId.value || "").trim() : "";

    if (nat && !isNineDigits(nat)) {
      alert("National ID must be exactly 9 digits.");
      auditList.innerHTML = "";
      return;
    }

    const qs = new URLSearchParams();
    qs.set("limit", String(Math.min(200, Math.max(1, lim))));
    if (nat) qs.set("nationalId", nat);

    const r = await fetchJson(`/api/admin/audit?${qs.toString()}`, { method: "GET" });
    if (!r.ok) { auditList.innerHTML = ""; return; }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (auditCountLine) auditCountLine.textContent = `Audit rows: ${rows.length}`;

    if (rows.length === 0) {
      auditList.innerHTML = `<div class="result-item"><div class="small">No audit logs found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((a) => {
      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>${escapeHtml(a.action || "")}</b></div>
              <div class="small">Actor: ${escapeHtml(a.actorEmail || "")} (${escapeHtml(a.actorRole || "")})</div>
              <div class="small">Target: ${escapeHtml(a.targetType || "")} • ${escapeHtml(a.targetId || "")}</div>
              ${a.targetNationalId ? `<div class="small">Omang: <b>${escapeHtml(a.targetNationalId)}</b></div>` : ""}
              <div class="small">Time: ${a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</div>
              <div class="small">IP: ${escapeHtml(a.ip || "")}</div>
            </div>
          </div>
        </div>
      `;
    });

    auditList.innerHTML = html;
  }

  if (loadAuditBtn) loadAuditBtn.addEventListener("click", loadAudit);

  // -------------------------
  // Boot
  // -------------------------
  setAccountsCollapsed(false);

  // auto-load key panels
  loadRequests();
  loadAccounts();

  // New panels
  if (disputesList) loadDisputes();
  if (auditList) loadAudit();
})();