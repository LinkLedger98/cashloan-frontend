(function () {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

  // -------------------------
  // Helpers
  // -------------------------
  function $(id) { return document.getElementById(id); }

  function getToken() { return localStorage.getItem("authToken"); }

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

    // ✅ Legacy support
    if (adminKey) headers["x-admin-key"] = adminKey;

    // ✅ Token support (admin role)
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

    // Forbidden
    if (res.status === 403) {
      alert((data && data.message) ? data.message : "Forbidden");
      return { ok: false, status: 403, data };
    }

    return { ok: res.ok, status: res.status, data };
  }

  function setMsg(t) {
    const el = $("msg");
    if (el) el.textContent = t || "";
  }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  }
  window.logout = logout;

  // -------------------------
  // Header pill
  // -------------------------
  const adminPill = $("adminPill");
  if (adminPill) {
    const email = localStorage.getItem("userEmail") || "";
    adminPill.textContent = email ? `Logged in: ${email}` : "Logged in";
  }

  // -------------------------
  // Signup Requests
  // -------------------------
  const requestsList = $("requestsList");
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

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              <button class="btn-primary btn-sm" onclick="useRequestToFillForm('${escapeHtml(x._id)}')">Use</button>
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

  // ✅ NEW: Fill the create-lender form from a request (button)
  let _lastRequests = [];
  window.useRequestToFillForm = function (requestId) {
    const row = _lastRequests.find(r => String(r._id) === String(requestId));
    if (!row) {
      alert("Request not found in memory. Click Reload Requests then try again.");
      return;
    }

    if ($("businessName")) $("businessName").value = row.businessName || "";
    if ($("branchName")) $("branchName").value = row.branchName || "";
    if ($("phone")) $("phone").value = row.phone || "";
    if ($("licenseNo")) $("licenseNo").value = row.licenseNo || "";
    if ($("email")) $("email").value = row.email || "";
    if ($("tempPassword")) $("tempPassword").value = "";

    const form = $("adminForm");
    if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function loadRequestsAndCache() {
    const r = await fetchJson("/api/admin/requests", { method: "GET" });
    if (!requestsList) return;

    if (!r.ok) {
      requestsList.innerHTML = "";
      _lastRequests = [];
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    _lastRequests = rows;

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

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              <button class="btn-primary btn-sm" onclick="useRequestToFillForm('${escapeHtml(x._id)}')">Use</button>
              <button class="btn-ghost btn-sm" onclick="deleteRequest('${escapeHtml(x._id)}')">Delete</button>
            </div>
          </div>
        </div>
      `;
    });

    requestsList.innerHTML = html;
  }

  const loadRequestsBtn = $("loadRequestsBtn");
  if (loadRequestsBtn) loadRequestsBtn.addEventListener("click", loadRequestsAndCache);

  // -------------------------
  // Create lender
  // -------------------------
  const adminForm = $("adminForm");
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
  // Accounts
  // -------------------------
  const accountsList = $("accountsList");
  const accountsWrap = $("accountsWrap");
  const toggleAccountsBtn = $("toggleAccountsBtn");
  const loadAccountsBtn = $("loadAccountsBtn");
  const searchBox = $("searchBox");
  const countLine = $("countLine");

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
      const id = escapeHtml(u._id);

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
              <button class="btn-ghost btn-sm" onclick="toggleUserStatus('${id}','${escapeHtml(status)}')">
                ${status === "suspended" ? "Activate" : "Suspend"}
              </button>
              <button class="btn-ghost btn-sm" onclick="openBilling('${id}')">Billing</button>

              <!-- ✅ NEW: Secure (sets temporary password for user) -->
              <button class="btn-ghost btn-sm" onclick="secureUser('${id}')">Secure</button>
            </div>
          </div>

          <div id="bill-${id}" class="billing-panel" style="display:none; margin-top:10px;">
            <div class="row" style="grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label class="small">Billing Status</label>
                <select id="bStatus-${id}">
                  <option value="paid" ${billing === "paid" ? "selected" : ""}>paid</option>
                  <option value="due" ${billing === "due" ? "selected" : ""}>due</option>
                  <option value="overdue" ${billing === "overdue" ? "selected" : ""}>overdue</option>
                </select>
              </div>
              <div>
                <label class="small">Paid Until (optional)</label>
                <input id="bPaidUntil-${id}" type="date" />
              </div>
            </div>

            <div class="row" style="grid-template-columns: 1fr 1fr; gap:12px; margin-top:10px;">
              <div>
                <label class="small">Last Payment Amount</label>
                <input id="bAmt-${id}" placeholder="e.g. 500" />
              </div>
              <div>
                <label class="small">Payment Ref</label>
                <input id="bRef-${id}" placeholder="e.g. FNB-1234" />
              </div>
            </div>

            <div style="margin-top:10px;">
              <label class="small">Notes</label>
              <input id="bNotes-${id}" placeholder="Admin notes" />
            </div>

            <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn-primary btn-sm" onclick="saveBilling('${id}')">Save Billing</button>
              <button class="btn-ghost btn-sm" onclick="openBilling('${id}')">Close</button>
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

  // ✅ NEW: Secure user (set temp password)
  async function secureUser(id) {
    const temp = prompt("Set temporary password for this account:");
    if (!temp) return;

    const r = await fetchJson(`/api/admin/users/${encodeURIComponent(id)}/secure`, {
      method: "PATCH",
      body: JSON.stringify({ tempPassword: String(temp).trim() })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Secure failed");
      return;
    }

    alert("Temporary password set ✅\nTell the lender to login, then set their own password in Secure.");
  }
  window.secureUser = secureUser;

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
  // Disputes
  // -------------------------
  const disputesList = $("disputesList");
  const loadDisputesBtn = $("loadDisputesBtn");
  const loadDisputesOverdueBtn = $("loadDisputesOverdueBtn");

  async function loadDisputes(mode) {
    if (!disputesList) return;
    disputesList.innerHTML = `<div class="small">Loading...</div>`;

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
      const r = await fetchJson(`/api/admin/disputes`, { method: "GET" });
      if (!r.ok) { disputesList.innerHTML = ""; return; }
      rows = Array.isArray(r.data) ? r.data : [];
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
              ${isOverdueMode ? `<div class="small"><b>⚠ Over SLA (${slaDays} days)</b></div>` : ""}
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
    if (!r.ok) { alert((r.data && r.data.message) ? r.data.message : "Failed"); return; }
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
    if (!r.ok) { alert((r.data && r.data.message) ? r.data.message : "Failed"); return; }
    alert("Dispute rejected ✅");
    loadDisputes();
  }
  window.rejectDispute = rejectDispute;

  if (loadDisputesBtn) loadDisputesBtn.addEventListener("click", () => loadDisputes());
  if (loadDisputesOverdueBtn) loadDisputesOverdueBtn.addEventListener("click", () => loadDisputes("overdue"));

  // -------------------------
  // Audit logs
  // -------------------------
  const auditList = $("auditList");
  const loadAuditBtn = $("loadAuditBtn");
  const auditNationalId = $("auditNationalId");

  async function loadAudit() {
    if (!auditList) return;
    auditList.innerHTML = `<div class="small">Loading...</div>`;

    const nat = auditNationalId ? String(auditNationalId.value || "").trim() : "";
    if (nat && !isNineDigits(nat)) {
      alert("National ID must be exactly 9 digits.");
      auditList.innerHTML = "";
      return;
    }

    const qs = new URLSearchParams();
    qs.set("limit", "100");
    if (nat) qs.set("nationalId", nat);

    const r = await fetchJson(`/api/admin/audit?${qs.toString()}`, { method: "GET" });
    if (!r.ok) { auditList.innerHTML = ""; return; }

    const rows = Array.isArray(r.data) ? r.data : [];
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

  if (requestsList) loadRequestsAndCache();
  if (accountsList) loadAccounts();
  if (disputesList) loadDisputes();
  if (auditList) loadAudit();
})();
