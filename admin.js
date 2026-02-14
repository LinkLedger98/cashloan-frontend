/* =========================================================
   LinkLedger Super Admin - Unified admin.js
   - Works on: admin_accounts.html, admin_disputes.html, admin_audit.html
   - Enforces login + role gate
   - Accounts: signup requests + lenders list + PoP acknowledgement UI
   - Disputes: show lender + send note + mark "investigating"
   - Audit: shows who did what + timestamps
========================================================= */

(function () {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

  function $(id) { return document.getElementById(id); }
  function token() { return localStorage.getItem("authToken"); }
  function role() { return (localStorage.getItem("userRole") || "").toLowerCase(); }
  function email() { return localStorage.getItem("userEmail") || ""; }

  function escapeHtml(x) {
    return String(x || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setPill() {
    const pill = $("adminPill");
    if (!pill) return;
    pill.textContent = email() ? `Logged in: ${email()}` : "Logged in";
  }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  }
  window.logout = logout;

  // ✅ Hard gate: no token => login
  function requireAdminLogin() {
    const t = token();
    if (!t) {
      window.location.href = "login.html";
      return false;
    }
    // optional: only allow admin/superadmin roles if you store it
    const r = role();
    if (r && r !== "admin" && r !== "superadmin") {
      alert("Unauthorized role. Please login as Super Admin.");
      logout();
      return false;
    }
    return true;
  }

  async function fetchJson(path, opts) {
    if (!API_BASE_URL) throw new Error("API_BASE_URL missing in config.js");

    const headers = Object.assign(
      { "Content-Type": "application/json" },
      (opts && opts.headers) ? opts.headers : {}
    );

    const t = token();
    if (t) headers["Authorization"] = t;

    // legacy admin key support (optional)
    const adminKeyEl = $("adminKey");
    const keyVal = adminKeyEl ? String(adminKeyEl.value || "").trim() : "";
    if (keyVal) headers["x-admin-key"] = keyVal;

    const res = await fetch(API_BASE_URL + path, Object.assign({}, opts || {}, { headers }));
    const data = await res.json().catch(() => ({}));

    // auto logout on 401
    if (res.status === 401) {
      alert("Session expired. Please login again.");
      logout();
      return { ok: false, status: 401, data };
    }
    if (res.status === 403) {
      const msg = (data && data.message) ? String(data.message) : "Forbidden";
      if (msg.toLowerCase().includes("suspended")) {
        alert("Your admin access is suspended.");
        logout();
      }
      return { ok: false, status: 403, data };
    }

    return { ok: res.ok, status: res.status, data };
  }

  /* =========================
     Collapsible helpers
  ========================= */
  function setCollapsed(wrapEl, btnEl, collapsed) {
    if (!wrapEl || !btnEl) return;
    if (collapsed) {
      wrapEl.classList.add("is-collapsed");
      btnEl.textContent = "▼";
    } else {
      wrapEl.classList.remove("is-collapsed");
      btnEl.textContent = "▲";
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

  /* =========================
     Accounts page logic
  ========================= */
  const requestMap = {};

  function setVal(id, v) {
    const el = $(id);
    if (el) el.value = v == null ? "" : String(v);
  }

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
    setCollapsed($("requestsWrap"), $("toggleRequestsBtn"), false);
  }

  window.autofillRequest = function (id) {
    const obj = requestMap[String(id)];
    if (!obj) return alert("Request not found in memory. Reload requests.");
    autofillFromRequest(obj);
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

  async function loadRequests() {
    const requestsList = $("requestsList");
    if (!requestsList) return;

    requestsList.innerHTML = `<div class="small">Loading...</div>`;
    const r = await fetchJson("/api/admin/requests", { method: "GET" });

    if (!r.ok) {
      requestsList.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load requests");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (rows.length === 0) {
      requestsList.innerHTML = `<div class="result-item"><div class="small">No signup requests.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((req) => {
      const id = escapeHtml(req._id);
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
              <div class="small">Requested: ${escapeHtml(created)}</div>
              <div class="small-actions" style="margin-top:10px;">
                <button class="btn-primary btn-sm" onclick="autofillRequest('${id}')">Autofill</button>
                <button class="btn-ghost btn-sm" onclick="deleteRequest('${id}')">Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;
      requestMap[id] = req;
    });

    requestsList.innerHTML = html;
  }

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

      // proof-of-payment fields best effort
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
                <span class="tag">${escapeHtml(String(popStatus || "—"))}</span>
              </div>

              <div class="pop-box" style="margin-top:10px;">
                <div class="small" style="margin-bottom:8px;"><b>Proof of Payment</b>${popStatus ? ` • <b>${escapeHtml(popStatus)}</b>` : ""}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                  ${popLine}
                  ${popUpdated ? `<span class="small" style="opacity:.8;">Updated: ${escapeHtml(new Date(popUpdated).toLocaleString())}</span>` : ""}
                </div>

                <!-- ✅ Acknowledgement UI host (template mounts here) -->
                <div class="pop-ack-host" data-lender-id="${id}"></div>
              </div>
            </div>

            <div class="small-actions">
              <button class="btn-ghost btn-sm" onclick="setLenderStatus('${id}','suspended')">Suspend</button>
              <button class="btn-ghost btn-sm" onclick="setLenderStatus('${id}','active')">Activate</button>
              <button class="btn-primary btn-sm" onclick="openUpdateLender('${id}')">Update</button>
            </div>
          </div>
        </div>
      `;
    });

    lendersList.innerHTML = html;

    // after render, mount template controls
    mountPopAckUI();
  }

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
    if (msg) msg.textContent = "Loaded lender into form ✅ (edit fields, then submit using your create/update flow)";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keep accessible (so other scripts can call)
  window.loadLenders = loadLenders;

  /* =========================
     ✅ Payment Acknowledgement UI
     Uses the <template id="popAckTemplate"> you added to admin_accounts.html
  ========================= */
  function mountPopAckUI() {
    const tpl = $("popAckTemplate");
    if (!tpl) return; // only exists on admin_accounts.html

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
        const billingStatus = String(statusSel.value || "").trim(); // approved/resend/past_due
        const billingNote = String(noteInp.value || "").trim();

        msgDiv.textContent = "Sending...";

        try {
          // ✅ expected backend endpoint:
          // PATCH /api/admin/lenders/:id/billing { billingStatus, billingNote }
          const r = await fetchJson(`/api/admin/lenders/${encodeURIComponent(lenderId)}/billing`, {
            method: "PATCH",
            body: JSON.stringify({ billingStatus, billingNote })
          });

          if (!r.ok) {
            const m = (r.data && r.data.message) ? r.data.message : "Failed (endpoint missing on backend).";
            msgDiv.textContent = "❌ " + m;
            alert(m);
            return;
          }

          msgDiv.textContent = "✅ Sent";
          // refresh list so the tag/billingStatus updates
          loadLenders();
        } catch (e) {
          console.error(e);
          msgDiv.textContent = "❌ Server/network error";
          alert("Server/network error while sending acknowledgement");
        }
      });

      host.appendChild(node);
    });
  }

  /* =========================
     Disputes page logic
     - show lender (best effort from API fields)
     - send note to lender
     - mark investigating
  ========================= */
  async function loadDisputes(overdueOnly) {
    const list = $("disputesList");
    if (!list) return;

    list.innerHTML = `<div class="small">Loading...</div>`;

    // Try admin disputes endpoint first, fallback to public disputes if needed
    let r = await fetchJson(`/api/admin/disputes${overdueOnly ? "?overdue=1" : ""}`, { method: "GET" });
    if (!r.ok) {
      // fallback
      r = await fetchJson(`/api/disputes${overdueOnly ? "?overdue=1" : ""}`, { method: "GET" });
    }

    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load disputes");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No disputes found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((d) => {
      const id = escapeHtml(d._id || d.id);
      const nationalId = escapeHtml(d.nationalId || "");
      const status = escapeHtml(d.status || d.disputeStatus || "pending");
      const created = d.createdAt ? new Date(d.createdAt).toLocaleString() : "";

      // "from lender" best-effort fields:
      const lenderName = escapeHtml(
        d.lenderName || d.cashloanName || (d.lender && d.lender.businessName) || "Unknown lender"
      );
      const lenderEmail = escapeHtml(
        d.lenderEmail || (d.lender && d.lender.email) || d.createdByEmail || "—"
      );

      const lenderLine = `${lenderName}${lenderEmail && lenderEmail !== "—" ? ` • <span class="small">${lenderEmail}</span>` : ""}`;

      const notes = escapeHtml(d.notes || "");
      const adminNote = escapeHtml(d.adminNote || d.adminNotes || "");

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
            <div>
              <div class="small">Dispute ID: <b>${id}</b></div>
              <div style="margin-top:6px;"><b>Omang:</b> ${nationalId}</div>
              <div class="small" style="margin-top:6px;"><b>From:</b> ${lenderLine}</div>
              <div class="small" style="margin-top:6px;"><b>Status:</b> ${status}</div>
              <div class="small" style="margin-top:6px; opacity:.85;">Opened: ${escapeHtml(created)}</div>

              ${notes ? `<div class="small" style="margin-top:10px;"><b>Lender notes:</b> ${notes}</div>` : ""}
              ${adminNote ? `<div class="small" style="margin-top:6px;"><b>Admin note:</b> ${adminNote}</div>` : ""}
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-ghost btn-sm" onclick="markInvestigating('${id}')">Investigating</button>
              <button class="btn-primary btn-sm" onclick="sendDisputeNote('${id}')">Send note to lender</button>
            </div>
          </div>

          <div class="small" style="margin-top:10px; opacity:.85;">
            ✅ SLA: disputes must be handled within <b>5 business days</b>.
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  window.markInvestigating = async function (id) {
    const note = prompt("Optional note to lender (e.g. We are investigating and will revert soon):") || "";

    // Try admin patch endpoint first, fallback
    let r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "investigating", adminNote: note })
    });

    if (!r.ok) {
      r = await fetchJson(`/api/disputes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "investigating", adminNote: note })
      });
    }

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Failed to mark investigating (backend endpoint may be missing)");
      return;
    }

    alert("Marked as Investigating ✅");
    loadDisputes(false);
  };

  window.sendDisputeNote = async function (id) {
    const note = prompt("Write a note to the lender:") || "";
    if (!note.trim()) return;

    // Try admin patch endpoint first, fallback
    let r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ adminNote: note })
    });

    if (!r.ok) {
      r = await fetchJson(`/api/disputes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ adminNote: note })
      });
    }

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Failed to send note (backend endpoint may be missing)");
      return;
    }

    alert("Note sent ✅");
    loadDisputes(false);
  };

  /* =========================
     Audit page logic
     Shows: login/search/edit etc (hidden trail)
  ========================= */
  async function loadAudit() {
    const list = $("auditList");
    const countLine = $("auditCountLine");
    if (!list) return;

    const omang = $("auditNationalId") ? String($("auditNationalId").value || "").trim() : "";
    const limit = $("auditLimit") ? Number($("auditLimit").value || 100) : 100;

    list.innerHTML = `<div class="small">Loading...</div>`;
    if (countLine) countLine.textContent = "";

    const qs = new URLSearchParams();
    if (omang) qs.set("nationalId", omang);
    qs.set("limit", String(Math.min(Math.max(limit, 1), 200)));

    let r = await fetchJson(`/api/admin/audit?${qs.toString()}`, { method: "GET" });
    if (!r.ok) {
      // fallback if your route name differs
      r = await fetchJson(`/api/audit?${qs.toString()}`, { method: "GET" });
    }

    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load audit logs");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (countLine) countLine.textContent = `Logs: ${rows.length}`;

    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No audit logs found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((a) => {
      const when = a.createdAt ? new Date(a.createdAt).toLocaleString() : "";
      const actor = escapeHtml(a.actorEmail || a.email || a.userEmail || "—");
      const actorRole = escapeHtml(a.actorRole || a.role || "—");
      const action = escapeHtml(a.action || a.event || "—");
      const nationalId = escapeHtml(a.nationalId || "—");
      const target = escapeHtml(a.targetId || a.clientId || a.lenderId || "—");

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>${action}</b></div>
              <div class="small">By: <b>${actor}</b> • Role: ${actorRole}</div>
              <div class="small">Omang: <b>${nationalId}</b> • Target: ${target}</div>
              <div class="small" style="opacity:.85;">${escapeHtml(when)}</div>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  /* =========================
     Boot: bind only what exists
  ========================= */
  if (!requireAdminLogin()) return;
  setPill();

  // collapsibles (accounts page)
  bindToggle("toggleRequestsBtn", "requestsWrap", false);
  bindToggle("toggleLendersBtn", "lendersWrap", false);

  // buttons on accounts page
  if ($("reloadRequestsBtn")) $("reloadRequestsBtn").addEventListener("click", loadRequests);
  if ($("reloadLendersBtn")) $("reloadLendersBtn").addEventListener("click", loadLenders);
  if ($("lendersSearch")) $("lendersSearch").addEventListener("input", () => loadLenders());

  // disputes page
  if ($("loadDisputesBtn")) $("loadDisputesBtn").addEventListener("click", () => loadDisputes(false));
  if ($("loadDisputesOverdueBtn")) $("loadDisputesOverdueBtn").addEventListener("click", () => loadDisputes(true));

  // audit page
  if ($("loadAuditBtn")) $("loadAuditBtn").addEventListener("click", loadAudit);

  // initial loads based on what page you're on
  try { if ($("requestsList")) loadRequests(); } catch(e) {}
  try { if ($("lendersList")) loadLenders(); } catch(e) {}
  try { if ($("disputesList")) loadDisputes(false); } catch(e) {}
  try { if ($("auditList")) loadAudit(); } catch(e) {}

})();
