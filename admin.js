/* =========================================================
   LinkLedger • Super Admin (admin.js)
   One JS file for:
   - admin_accounts.html (create lender, signup requests, lenders list + PoP + billing ack)
   - admin_disputes.html (list disputes + "investigating" note)
   - admin_audit.html (audit logs)
   - admin_consents.html (consent approvals ONLY)

   Notes:
   - Uses token in localStorage.authToken
   - Optional legacy ADMIN_KEY input (#adminKey) sent as x-admin-key
   - Backend endpoints are best-effort and will show clear alerts if missing.
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

    if (token) headers["Authorization"] = token;

    // Optional legacy admin key input
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

    // Quick UI pill
    const pill = $("adminPill");
    const email = getEmail();
    if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";

    // If role is already stored, allow (fast path)
    if (getRole() === "admin" || getRole() === "superadmin") return true;

    // Otherwise verify with backend (best-effort)
    try {
      const r = await fetchJson("/api/auth/me", { method: "GET" });
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          alert("Session expired or access denied. Please login again.");
          logout();
          return false;
        }
        // If endpoint doesn't exist, we still allow (but you should add it server-side)
        return true;
      }

      const role = String((r.data && (r.data.role || r.data.userRole)) || "").toLowerCase();
      if (role) localStorage.setItem("userRole", role);

      if (role && role !== "admin" && role !== "superadmin") {
        alert("Access denied: admin only.");
        logout();
        return false;
      }

      return true;
    } catch (e) {
      // If server/network fails, don’t lock you out while developing
      return true;
    }
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
    const r = await fetchJson("/api/admin/requests", { method: "GET" });

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
    const q = String((lendersSearch && lendersSearch.value) || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter(u => {
        const hay = [
          u.businessName, u.branchName, u.phone, u.licenseNo, u.email,
          u.status, u.billingStatus, u.paymentProofStatus
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

      // Proof of Payment fields (best-effort)
      const popUrl = String(u.paymentProofUrl || u.popUrl || "").trim();
      const popStatus = String(u.paymentProofStatus || u.popStatus || u.billingStatus || "").trim();
      const popUpdated = u.paymentProofUpdatedAt || u.popUpdatedAt || u.billingUpdatedAt || null;

      const popLine = popUrl
        ? `<a class="btn-ghost btn-sm" href="${escapeHtml(popUrl)}" target="_blank" rel="noopener">View Proof</a>`
        : `<span class="small" style="opacity:.8;">No proof uploaded</span>`;

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
              </div>

              <div class="pop-box" style="margin-top:10px;">
                <div class="small" style="margin-bottom:8px;"><b>Proof of Payment</b>${popStatus ? ` • <b>${escapeHtml(popStatus)}</b>` : ""}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                  ${popLine}
                  ${popUpdated ? `<span class="small" style="opacity:.8;">Updated: ${escapeHtml(new Date(popUpdated).toLocaleString())}</span>` : ""}
                </div>

                <!-- Host for Payment Acknowledgement UI -->
                <div class="pop-ack-host" data-lender-id="${id}"></div>
              </div>
            </div>

            <div class="small-actions">
              <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','suspended')">Suspend</button>
              <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','active')">Activate</button>
              <button class="btn-primary btn-sm" type="button" onclick="openUpdateLender('${id}')">Update</button>
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
    if (msg) msg.textContent = "Loaded lender into form ✅ (set temp password if needed, then submit your update flow)";
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

    const msg = $("msg");
    if (msg) msg.textContent = "Creating...";

    // Endpoint assumption (common)
    // If your backend uses a different route, change it here ONLY.
    const r = await fetchJson("/api/admin/create-lender", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Create lender failed (check backend route: POST /api/admin/create-lender)";
      if (msg) msg.textContent = "❌ " + m;
      alert(m);
      return;
    }

    if (msg) msg.textContent = "✅ Lender created";
    alert("Lender created ✅");
    clearForm();

    // Refresh lists
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
          // Backend should store what dashboard can read later:
          // PATCH /api/admin/lenders/:id/billing  { billingStatus, billingNote }
          const r = await fetchJson(`/api/admin/lenders/${encodeURIComponent(lenderId)}/billing`, {
            method: "PATCH",
            body: JSON.stringify({ billingStatus: status, billingNote: note })
          });

          if (!r.ok) {
            const m = (r.data && r.data.message)
              ? r.data.message
              : "Failed (backend endpoint missing: PATCH /api/admin/lenders/:id/billing)";
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
     - Show who it's from (lender)
     - Send note back + mark investigating
  ========================================================= */
  function pickLenderDisplay(d) {
    const business = d.lenderBusinessName || d.cashloanName || d.businessName || "";
    const branch = d.lenderBranchName || d.cashloanBranch || d.branchName || "";
    const email = d.lenderEmail || d.openedByEmail || d.createdByEmail || d.email || "";
    const phone = d.lenderPhone || d.cashloanPhone || "";

    const line1 = [business, branch].filter(Boolean).join(" • ");
    const line2 = [email ? `Email: ${email}` : "", phone ? `Phone: ${phone}` : ""].filter(Boolean).join(" • ");
    return { line1: line1 || "Unknown lender", line2 };
  }

  async function loadDisputes(mode) {
    const list = $("disputesList");
    if (!list) return;

    list.innerHTML = `<div class="small">Loading...</div>`;

    // best-effort routes
    const path = (mode === "overdue")
      ? "/api/admin/disputes/overdue"
      : "/api/admin/disputes";

    const r = await fetchJson(path, { method: "GET" });
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
      const created = d.createdAt ? new Date(d.createdAt).toLocaleString() : "";
      const due = d.slaDueAt ? new Date(d.slaDueAt).toLocaleString() : "";
      const note = escapeHtml(d.adminNote || d.note || "");

      const lender = pickLenderDisplay(d);

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>Dispute</b> • Omang: <b>${nationalId || "—"}</b></div>
              <div class="small">Status: <b>${status}</b>${created ? ` • Opened: ${escapeHtml(created)}` : ""}${due ? ` • SLA due: ${escapeHtml(due)}` : ""}</div>
              <div class="small" style="margin-top:6px;"><b>From:</b> ${escapeHtml(lender.line1)}</div>
              ${lender.line2 ? `<div class="small" style="opacity:.9;">${escapeHtml(lender.line2)}</div>` : ""}
              ${d.notes ? `<div class="small" style="margin-top:6px; opacity:.9;"><b>Reason:</b> ${escapeHtml(d.notes)}</div>` : ""}
              ${note ? `<div class="small" style="margin-top:6px; opacity:.9;"><b>Admin note:</b> ${note}</div>` : ""}
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              <button class="btn-ghost btn-sm" type="button" onclick="markInvestigating('${id}')">Investigating</button>
              <button class="btn-primary btn-sm" type="button" onclick="sendDisputeNote('${id}')">Send Note</button>
            </div>
          </div>
          <div class="small" style="margin-top:10px; opacity:.8;">
            Tip: “Investigating” sends acknowledgement to lender and starts the 5-day loop on your side.
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  window.markInvestigating = async function (id) {
    const note = prompt("Note to lender (optional):", "We have received your dispute and are investigating.") || "";

    // Expected backend endpoint:
    // PATCH /api/admin/disputes/:id  { status: "investigating", adminNote }
    const r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "investigating", adminNote: note })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message)
        ? r.data.message
        : "Failed (backend endpoint missing: PATCH /api/admin/disputes/:id)";
      alert(m);
      return;
    }

    alert("Marked as investigating ✅");
    loadDisputes("");
  };

  window.sendDisputeNote = async function (id) {
    const note = prompt("Send note to lender:", "") || "";
    if (!note.trim()) return;

    const r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote: note })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message)
        ? r.data.message
        : "Failed (backend endpoint missing: PATCH /api/admin/disputes/:id)";
      alert(m);
      return;
    }

    alert("Note sent ✅");
    loadDisputes("");
  };

  /* =========================================================
     AUDIT PAGE
     - show who did what + timestamps
  ========================================================= */
  async function loadAudit() {
    const list = $("auditList");
    if (!list) return;

    const nationalId = String(($("auditNationalId") && $("auditNationalId").value) || "").trim();
    const limit = Math.min(200, Math.max(1, parseInt((($("auditLimit") && $("auditLimit").value) || "100"), 10) || 100));

    list.innerHTML = `<div class="small">Loading...</div>`;
    const q = [];
    if (nationalId) q.push(`nationalId=${encodeURIComponent(nationalId)}`);
    if (limit) q.push(`limit=${encodeURIComponent(String(limit))}`);

    const r = await fetchJson(`/api/admin/audit${q.length ? "?" + q.join("&") : ""}`, { method: "GET" });
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
      const target = a.nationalId || a.targetNationalId || "";
      const meta = a.meta || a.details || a.payload || null;

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

    const r = await fetchJson(`/api/admin/consents${q.length ? "?" + q.join("&") : ""}`, { method: "GET" });
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
      const lender = escapeHtml(c.lenderEmail || c.createdByEmail || c.uploaderEmail || "—");
      const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";
      const fileUrl = String(c.fileUrl || c.consentFileUrl || c.url || "").trim();
      const st = escapeHtml(c.status || "pending");

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>Consent</b> • Omang: <b>${omang || "—"}</b></div>
              <div class="small">Status: <b>${st}</b>${created ? ` • Uploaded: ${escapeHtml(created)}` : ""}</div>
              <div class="small">From: <b>${lender}</b></div>
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

  window.setConsentStatus = async function (id, status) {
    const note = status === "rejected"
      ? (prompt("Rejection note (optional):", "Please re-upload a clear consent file.") || "")
      : (prompt("Approval note (optional):", "Consent approved.") || "");

    const r = await fetchJson(`/api/admin/consents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, note })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message)
        ? r.data.message
        : "Failed (backend endpoint missing: PATCH /api/admin/consents/:id)";
      alert(m);
      return;
    }

    alert(`Consent ${status} ✅`);
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
    if ($("loadDisputesBtn")) $("loadDisputesBtn").addEventListener("click", function () { loadDisputes(""); });
    if ($("loadDisputesOverdueBtn")) $("loadDisputesOverdueBtn").addEventListener("click", function () { loadDisputes("overdue"); });

    // Audit page
    if ($("loadAuditBtn")) $("loadAuditBtn").addEventListener("click", loadAudit);

    // Consents page
    if ($("reloadBtn")) $("reloadBtn").addEventListener("click", loadConsents);
    if ($("statusFilter")) $("statusFilter").addEventListener("change", loadConsents);

    // Auto-load depending on page
    try { if ($("requestsList")) loadRequests(); } catch (e) {}
    try { if ($("lendersList")) loadLenders(); } catch (e) {}
    try { if ($("disputesList")) loadDisputes(""); } catch (e) {}
    try { if ($("auditList")) loadAudit(); } catch (e) {}
    try { if ($("consentsList")) loadConsents(); } catch (e) {}
  });

})();
