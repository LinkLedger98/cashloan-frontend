/* =========================================================
   LinkLedger • Super Admin (admin.js)
   One JS file for:
   - admin_accounts.html (create lender, signup requests, lenders list + billing ack UI host)
   - admin_disputes.html (list disputes + "investigating" note)
   - admin_audit.html (audit logs)
   - admin_consents.html (consent approvals ONLY)

   ✅ IMPORTANT FIXES IN THIS VERSION
   - Removed wrong "/api" double-prefix in endpoints (server mounts routes at /api already)
     So we call: "/admin/..." not "/api/admin/..."
   - Create lender uses: POST /admin/lenders
   - Consent PATCH uses: { consentStatus, notes }
   - Dispute PATCH uses: { adminStatus, adminNote } (NOT status="investigating")
   - Stronger admin-gate: requires token AND role=admin (from localStorage or decoded JWT)
========================================================= */

(function () {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

  /* ---------------- Basics ---------------- */
  function $(id) { return document.getElementById(id); }
  function getToken() { return localStorage.getItem("authToken"); }
  function getRole() { return (localStorage.getItem("userRole") || "").toLowerCase(); }
  function getEmail() { return localStorage.getItem("userEmail"); }

  function escapeHtml(x) {
    return String(x || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseJwt(token) {
    try {
      const t = String(token || "");
      const parts = t.split(".");
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  }
  window.logout = logout;

  async function fetchJson(path, opts) {
    if (!API_BASE_URL) throw new Error("API_BASE_URL missing in config.js");

    const token = getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      (opts && opts.headers) ? opts.headers : {}
    );

    if (token) headers["Authorization"] = "Bearer " + token;

    // Optional legacy admin key input (only exists on accounts page)
    const adminKeyEl = $("adminKey");
    const keyVal = adminKeyEl ? String(adminKeyEl.value || "").trim() : "";
    if (keyVal) headers["x-admin-key"] = keyVal;

    const res = await fetch(API_BASE_URL + path, Object.assign({}, opts || {}, { headers }));
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function requireAdminLogin() {
    const token = getToken();
    if (!token) {
      alert("Please log in first");
      window.location.href = "login.html";
      return false;
    }

    // Update pill
    const pill = $("adminPill");
    const email = getEmail();
    if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";

    // Get role from localStorage OR JWT payload
    let role = getRole();
    if (!role) {
      const decoded = parseJwt(token);
      role = String((decoded && (decoded.role || decoded.userRole)) || "").toLowerCase();
      if (role) localStorage.setItem("userRole", role);
    }

    // Hard gate: only admin allowed in Super Admin pages
    if (role && role !== "admin" && role !== "superadmin") {
      alert("Access denied: admin only.");
      logout();
      return false;
    }

    // If role missing (older tokens), allow but keep token requirement
    return true;
  }

  /* ---------------- Collapsible helpers ---------------- */
  function setCollapsed(wrapEl, btnEl, collapsed) {
    if (!wrapEl || !btnEl) return;
    if (collapsed) {
      wrapEl.classList.add("is-collapsed");
      btnEl.textContent = "▼";
      btnEl.title = "Expand";
    } else {
      wrapEl.classList.remove("is-collapsed");
      btnEl.textContent = "▲";
      btnEl.title = "Collapse";
    }
  }

  function bindToggle(btnId, wrapId, defaultCollapsed) {
    const btn = $(btnId);
    const wrap = $(wrapId);
    if (!btn || !wrap) return;
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
    const r = await fetchJson("/admin/requests", { method: "GET" });

    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load requests");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
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
    const r = await fetchJson(`/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE" });
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

  async function loadLenders() {
    const lendersList = $("lendersList");
    const lendersCount = $("lendersCount");
    const lendersSearch = $("lendersSearch");
    if (!lendersList) return;

    lendersList.innerHTML = `<div class="small">Loading...</div>`;
    if (lendersCount) lendersCount.textContent = "";

    const r = await fetchJson("/admin/lenders", { method: "GET" });
    if (!r.ok) {
      lendersList.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load lenders");
      return;
    }

    let rows = Array.isArray(r.data) ? r.data : [];
    const q = String((lendersSearch && lendersSearch.value) || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter(u => {
        const hay = [
          u.businessName, u.branchName, u.phone, u.licenseNo, u.email,
          u.status, u.billingStatus,
          u.billingAckStatus, u.billingAckNote
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
      const id = escapeHtml(u._id);
      const businessName = escapeHtml(u.businessName || "—");
      const branchName = escapeHtml(u.branchName || "—");
      const phone = escapeHtml(u.phone || "—");
      const licenseNo = escapeHtml(u.licenseNo || "—");
      const email = escapeHtml(u.email || "—");
      const st = escapeHtml(u.status || "active");

      // Acknowledgement state (from User model)
      const ack = String(u.billingAckStatus || "").trim();
      const ackUpdated = u.billingAckUpdatedAt || null;

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
                ${ack ? `<span class="tag">${escapeHtml(ack)}</span>` : ""}
                ${ackUpdated ? `<span class="small" style="opacity:.8;">Ack: ${escapeHtml(new Date(ackUpdated).toLocaleString())}</span>` : ""}
              </div>

              <!-- Host for Payment Acknowledgement UI -->
              <div class="pop-ack-host" data-lender-id="${id}" style="margin-top:10px;"></div>
            </div>

            <div class="small-actions">
              <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','suspended')">Suspend</button>
              <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','active')">Activate</button>
            </div>
          </div>
        </div>
      `;
    });

    lendersList.innerHTML = html;

    // Mount acknowledgement UI after render
    try { mountPopAckUI(); } catch (e) {}
  }

  window.loadLenders = loadLenders;

  window.setLenderStatus = async function (id, status) {
    if (!confirm(`Set account status to "${status}"?`)) return;

    const r = await fetchJson(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Status update failed");
      return;
    }

    loadLenders();
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

    const msg = $("msg");
    if (msg) msg.textContent = "Creating...";

    // ✅ Correct backend route
    const r = await fetchJson("/admin/lenders", {
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

    try { loadLenders(); } catch (e) {}
    try { loadRequests(); } catch (e) {}
  }

  /* ---------------- Payment Acknowledgement UI ---------------- */
  function mountPopAckUI() {
    const tpl = document.getElementById("popAckTemplate");
    if (!tpl) return;

    document.querySelectorAll(".pop-ack-host").forEach((host) => {
      if (host.__mounted) return;
      host.__mounted = true;

      const lenderId = host.getAttribute("data-lender-id");
      const node = tpl.content.cloneNode(true);

      const statusSel = node.querySelector(".popAckStatus");
      const noteInp = node.querySelector(".popAckNote");
      const saveBtn = node.querySelector(".popAckSave");
      const msgDiv = node.querySelector(".popAckMsg");

      saveBtn.addEventListener("click", async () => {
        const status = String(statusSel.value || "").trim(); // approved/resend/past_due
        const note = String(noteInp.value || "").trim();

        msgDiv.textContent = "Sending...";

        try {
          // ✅ Correct backend route:
          // PATCH /admin/lenders/:id/billing { billingStatus, billingNote }
          const r = await fetchJson(`/admin/lenders/${encodeURIComponent(lenderId)}/billing`, {
            method: "PATCH",
            body: JSON.stringify({ billingStatus: status, billingNote: note })
          });

          if (!r.ok) {
            const m = (r.data && r.data.message) ? r.data.message : "Failed to save acknowledgement";
            msgDiv.textContent = "❌ " + m;
            alert(m);
            return;
          }

          msgDiv.textContent = "✅ Sent";
          try { loadLenders(); } catch (e) {}
        } catch (e) {
          console.error(e);
          msgDiv.textContent = "❌ Server/network error";
          alert("Server/network error while sending acknowledgement");
        }
      });

      host.appendChild(node);
    });
  }

  /* =========================================================
     DISPUTES PAGE
     - Shows who submitted them (raisedByEmail etc.)
     - Admin can mark investigating + note back
  ========================================================= */
  function pickLenderDisplay(d) {
    const email = d.raisedByEmail || d.lenderEmail || d.openedByEmail || d.createdByEmail || d.email || "";
    const role = d.raisedByRole || "";
    const line1 = email ? `Lender: ${email}${role ? ` • ${role}` : ""}` : "Unknown lender";
    return { line1 };
  }

  async function loadDisputes() {
    const list = $("disputesList");
    if (!list) return;

    list.innerHTML = `<div class="small">Loading...</div>`;

    const r = await fetchJson("/admin/disputes", { method: "GET" });
    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load disputes");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No disputes.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((d) => {
      const id = escapeHtml(d._id);
      const nationalId = escapeHtml(d.nationalId || "");
      const status = escapeHtml(d.status || "pending");
      const adminStatus = escapeHtml(d.adminStatus || "");
      const created = d.createdAt ? new Date(d.createdAt).toLocaleString() : "";
      const adminNote = escapeHtml(d.adminNote || "");

      const lender = pickLenderDisplay(d);

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>Dispute</b> • Omang: <b>${nationalId || "—"}</b></div>
              <div class="small">Status: <b>${status}</b>${adminStatus ? ` • Admin: <b>${adminStatus}</b>` : ""}${created ? ` • Opened: ${escapeHtml(created)}` : ""}</div>
              <div class="small" style="margin-top:6px;"><b>From:</b> ${escapeHtml(lender.line1)}</div>
              ${d.notes ? `<div class="small" style="margin-top:6px; opacity:.9;"><b>Reason:</b> ${escapeHtml(d.notes)}</div>` : ""}
              ${adminNote ? `<div class="small" style="margin-top:6px; opacity:.9;"><b>Admin note:</b> ${adminNote}</div>` : ""}
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              <button class="btn-ghost btn-sm" type="button" onclick="markInvestigating('${id}')">Investigating</button>
              <button class="btn-primary btn-sm" type="button" onclick="sendDisputeNote('${id}')">Send Note</button>
              <button class="btn-ghost btn-sm" type="button" onclick="closeDispute('${id}','resolved')">Resolve</button>
              <button class="btn-ghost btn-sm" type="button" onclick="closeDispute('${id}','rejected')">Reject</button>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  window.markInvestigating = async function (id) {
    const note = prompt("Note to lender (optional):", "We have received your dispute and are investigating.") || "";

    // ✅ Correct backend expects adminStatus + adminNote
    const r = await fetchJson(`/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ adminStatus: "investigating", adminNote: note })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Failed to update dispute";
      alert(m);
      return;
    }

    alert("Marked as investigating ✅");
    loadDisputes();
  };

  window.sendDisputeNote = async function (id) {
    const note = prompt("Send note to lender:", "") || "";
    if (!note.trim()) return;

    const r = await fetchJson(`/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote: note })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Failed to send note";
      alert(m);
      return;
    }

    alert("Note saved ✅");
    loadDisputes();
  };

  window.closeDispute = async function (id, status) {
    if (!confirm(`Set dispute to "${status}"?`)) return;

    const r = await fetchJson(`/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminStatus: status })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Failed to close dispute";
      alert(m);
      return;
    }

    alert("Updated ✅");
    loadDisputes();
  };

  /* =========================================================
     AUDIT PAGE
  ========================================================= */
  async function loadAudit() {
    const list = $("auditList");
    if (!list) return;

    const limit = Math.min(200, Math.max(1, parseInt((($("auditLimit") && $("auditLimit").value) || "100"), 10) || 100));

    list.innerHTML = `<div class="small">Loading...</div>`;
    const r = await fetchJson(`/admin/audit?limit=${encodeURIComponent(String(limit))}`, { method: "GET" });

    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load audit logs");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    const countLine = $("auditCountLine");
    if (countLine) countLine.textContent = `Logs: ${rows.length}`;

    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No audit logs.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((a) => {
      const ts = a.createdAt || a.timestamp || a.time || null;
      const when = ts ? new Date(ts).toLocaleString() : "";
      const actor = a.actorEmail || a.email || a.userEmail || a.actor || "—";
      const action = a.action || a.event || "—";
      const target = a.targetNationalId || a.nationalId || "";
      const meta = a.meta || null;

      html += `
        <div class="result-item">
          <div><b>${escapeHtml(action)}</b></div>
          <div class="small">By: <b>${escapeHtml(actor)}</b>${when ? ` • ${escapeHtml(when)}` : ""}</div>
          ${target ? `<div class="small">Omang: <b>${escapeHtml(target)}</b></div>` : ""}
          ${meta ? `<div class="small" style="opacity:.9; margin-top:6px;"><pre style="white-space:pre-wrap; margin:0;">${escapeHtml(JSON.stringify(meta, null, 2))}</pre></div>` : ""}
        </div>
      `;
    });

    list.innerHTML = html;
  }

  /* =========================================================
     CONSENTS PAGE (consent approvals only)
  ========================================================= */
  async function loadConsents() {
    const list = $("consentsList");
    if (!list) return;

    const status = String(($("statusFilter") && $("statusFilter").value) || "pending").trim();
    const nationalId = String(($("nationalIdFilter") && $("nationalIdFilter").value) || "").trim();

    list.innerHTML = `<div class="small">Loading...</div>`;

    const q = [];
    if (status) q.push(`status=${encodeURIComponent(status)}`);
    if (nationalId) q.push(`nationalId=${encodeURIComponent(nationalId)}`);

    const r = await fetchJson(`/admin/consents${q.length ? "?" + q.join("&") : ""}`, { method: "GET" });
    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load consents");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    const countLine = $("countLine");
    if (countLine) countLine.textContent = `Items: ${rows.length}`;

    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No consent items.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((c) => {
      const id = escapeHtml(c._id);
      const omang = escapeHtml(c.nationalId || "");
      const lenderEmail = escapeHtml(c.cashloanEmail || "—");
      const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";
      const fileUrl = String(c.consentFileUrl || "").trim();
      const st = escapeHtml(c.consentStatus || "pending");

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>Consent</b> • Omang: <b>${omang || "—"}</b></div>
              <div class="small">Status: <b>${st}</b>${created ? ` • Uploaded: ${escapeHtml(created)}` : ""}</div>
              <div class="small">From: <b>${lenderEmail}</b></div>
              <div style="margin-top:10px;">
                ${fileUrl ? `<a class="btn-ghost btn-sm" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener">View file</a>` : `<span class="small" style="opacity:.8;">No file URL</span>`}
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              <button class="btn-ghost btn-sm" type="button" onclick="setConsentStatus('${id}','approved')">Approve</button>
              <button class="btn-ghost btn-sm" type="button" onclick="setConsentStatus('${id}','rejected')">Reject</button>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  window.setConsentStatus = async function (id, consentStatus) {
    const notes = (consentStatus === "rejected")
      ? (prompt("Rejection note (optional):", "Please re-upload a clear consent file.") || "")
      : (prompt("Approval note (optional):", "Consent approved.") || "");

    // ✅ Correct backend expects: { consentStatus, notes }
    const r = await fetchJson(`/admin/consents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ consentStatus, notes })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Failed to update consent";
      alert(m);
      return;
    }

    alert(`Consent ${consentStatus} ✅`);
    loadConsents();
  };

  /* =========================================================
     Boot: wire everything based on which page elements exist
  ========================================================= */
  document.addEventListener("DOMContentLoaded", async function () {
    const ok = await requireAdminLogin();
    if (!ok) return;

    // Collapsibles present on accounts page
    bindToggle("toggleRequestsBtn", "requestsWrap", false);
    bindToggle("toggleLendersBtn", "lendersWrap", false);

    // Accounts page buttons
    if ($("fillFormBtn")) $("fillFormBtn").addEventListener("click", fillFormDemo);
    if ($("clearFormBtn")) $("clearFormBtn").addEventListener("click", clearForm);

    if ($("reloadRequestsBtn")) $("reloadRequestsBtn").addEventListener("click", loadRequests);
    if ($("reloadLendersBtn")) $("reloadLendersBtn").addEventListener("click", loadLenders);
    if ($("lendersSearch")) $("lendersSearch").addEventListener("input", function () { loadLenders(); });

    // Create lender submit
    if ($("adminForm")) $("adminForm").addEventListener("submit", handleCreateLenderSubmit);

    // Disputes page
    if ($("loadDisputesBtn")) $("loadDisputesBtn").addEventListener("click", loadDisputes);

    // Audit page
    if ($("loadAuditBtn")) $("loadAuditBtn").addEventListener("click", loadAudit);

    // Consents page
    if ($("reloadBtn")) $("reloadBtn").addEventListener("click", loadConsents);
    if ($("statusFilter")) $("statusFilter").addEventListener("change", loadConsents);

    // Auto-load depending on page
    try { if ($("requestsList")) loadRequests(); } catch (e) {}
    try { if ($("lendersList")) loadLenders(); } catch (e) {}
    try { if ($("disputesList")) loadDisputes(); } catch (e) {}
    try { if ($("auditList")) loadAudit(); } catch (e) {}
    try { if ($("consentsList")) loadConsents(); } catch (e) {}
  });

})();
