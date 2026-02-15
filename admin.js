/* =========================================================
   LinkLedger • Super Admin (admin.js)
   One JS file for:
   - admin_accounts.html (create lender, signup requests, lenders list + Secure + PoP + billing ack)
   - admin_disputes.html (list disputes + "investigating" note)
   - admin_audit.html (audit logs)
   - admin_consents.html (consent approvals ONLY)

   Notes:
   - Uses token in localStorage.authToken
   - Optional legacy ADMIN_KEY input (#adminKey) sent as x-admin-key
   - Backend endpoints aligned to your routes/admin.js:
       GET    /api/admin/requests
       DELETE /api/admin/requests/:id
       POST   /api/admin/lenders
       GET    /api/admin/lenders
       PATCH  /api/admin/users/:id/status
       PATCH  /api/admin/users/:id/billing
       PATCH  /api/admin/users/:id/secure
       GET    /api/admin/audit
       GET    /api/admin/disputes
       PATCH  /api/admin/disputes/:id
       GET    /api/admin/consents
       PATCH  /api/admin/consents/:id
       GET    /api/admin/consents/:id/file
       GET    /api/admin/payment-proofs
       PATCH  /api/admin/payment-proofs/:id
       GET    /api/admin/payment-proofs/:id/file
   - Notifications: simple polling + toast popups for new Requests/Disputes/Consents.
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

  function authHeaders(extra) {
    const token = getToken();
    const headers = Object.assign({}, extra || {});
    if (token) headers["Authorization"] = token;

    // Optional legacy admin key input
    const adminKeyEl = $("adminKey");
    const keyVal = adminKeyEl ? String(adminKeyEl.value || "").trim() : "";
    if (keyVal) headers["x-admin-key"] = keyVal;

    return headers;
  }

  async function fetchJson(path, opts) {
    if (!API_BASE_URL) throw new Error("API_BASE_URL missing in config.js");

    const headers = Object.assign(
      { "Content-Type": "application/json" },
      authHeaders((opts && opts.headers) ? opts.headers : {})
    );

    const res = await fetch(API_BASE_URL + path, Object.assign({}, opts || {}, { headers }));
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function fetchBlob(path) {
    if (!API_BASE_URL) throw new Error("API_BASE_URL missing in config.js");

    const headers = authHeaders({});
    const res = await fetch(API_BASE_URL + path, { method: "GET", headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Failed to fetch file");
    }
    const blob = await res.blob();
    const cd = res.headers.get("content-disposition") || "";
    const ct = res.headers.get("content-type") || "";
    return { blob, contentDisposition: cd, contentType: ct };
  }

  function filenameFromContentDisposition(cd, fallback) {
    try {
      const m = /filename\*?=(?:UTF-8''|")?([^;"\n]+)"?/i.exec(cd || "");
      if (m && m[1]) return decodeURIComponent(m[1].trim());
    } catch (e) {}
    return fallback || "file";
  }

  async function openFileWithAuth(apiPath, fallbackName) {
    try {
      const { blob, contentDisposition } = await fetchBlob(apiPath);
      const filename = filenameFromContentDisposition(contentDisposition, fallbackName || "file");
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked: fallback to download
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      // Revoke later
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (e) {
      console.error(e);
      alert("Could not open file. " + (e && e.message ? e.message : ""));
    }
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
        // If endpoint doesn't exist, allow during dev
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
      return true;
    }
  }

  /* ---------------- Collapsible helpers (smooth) ---------------- */
  function ensureCollapseWrap(wrapEl) {
    if (!wrapEl) return;
    if (!wrapEl.classList.contains("collapse-wrap")) wrapEl.classList.add("collapse-wrap");
  }

  function setCollapsed(wrapEl, btnEl, collapsed) {
    if (!wrapEl || !btnEl) return;
    ensureCollapseWrap(wrapEl);

    btnEl.setAttribute("aria-controls", wrapEl.id || "");
    btnEl.setAttribute("aria-expanded", collapsed ? "false" : "true");

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
     Toast Notifications (polling) — “Facebook pop-ups”
  ========================================================= */
  function ensureToastHost() {
    let host = document.getElementById("llToastHost");
    if (host) return host;
    host = document.createElement("div");
    host.id = "llToastHost";
    document.body.appendChild(host);
    return host;
  }

  function toast(msg, opts) {
    const host = ensureToastHost();
    const t = document.createElement("div");
    t.className = "ll-toast";
    t.innerHTML = `
      <div class="ll-toast-title">${escapeHtml((opts && opts.title) || "LinkLedger")}</div>
      <div class="ll-toast-body">${escapeHtml(msg)}</div>
      <div class="ll-toast-actions">
        ${(opts && opts.actionText) ? `<button class="btn-ghost btn-sm ll-toast-action">${escapeHtml(opts.actionText)}</button>` : ""}
        <button class="btn-ghost btn-sm ll-toast-close">Close</button>
      </div>
    `;
    host.appendChild(t);

    const close = () => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 220);
    };

    const closeBtn = t.querySelector(".ll-toast-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    const actionBtn = t.querySelector(".ll-toast-action");
    if (actionBtn && opts && typeof opts.onAction === "function") {
      actionBtn.addEventListener("click", function () {
        try { opts.onAction(); } catch (e) {}
        close();
      });
    }

    // Auto close
    const ttl = (opts && typeof opts.ttlMs === "number") ? opts.ttlMs : 6500;
    setTimeout(close, ttl);
  }

  function isOnPage(name) {
    const p = (window.location.pathname || "").toLowerCase();
    const h = (window.location.href || "").toLowerCase();
    return p.includes(name) || h.includes(name);
  }

  function notifyNavigateTo(page) {
    if (page === "accounts") window.location.href = "admin_accounts.html";
    if (page === "disputes") window.location.href = "admin_disputes.html";
    if (page === "consents") window.location.href = "admin_consents.html";
  }

  function storeLastSeen(key, ids) {
    try { localStorage.setItem(key, JSON.stringify(ids || [])); } catch (e) {}
  }

  function loadLastSeen(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function diffNewIds(currentIds, oldIds) {
    const oldSet = new Set(oldIds || []);
    return (currentIds || []).filter(id => id && !oldSet.has(id));
  }

  async function pollNotificationsOnce() {
    // Don’t poll if user not logged in / on login page
    if (!getToken()) return;

    // Requests
    try {
      const r = await fetchJson("/api/admin/requests", { method: "GET" });
      if (r.ok) {
        const rows = Array.isArray(r.data) ? r.data : [];
        const ids = rows.map(x => String(x && x._id || "")).filter(Boolean);
        const prev = loadLastSeen("ll_seen_requests");
        const newly = diffNewIds(ids, prev);
        if (newly.length > 0) {
          toast(`${newly.length} new account request${newly.length > 1 ? "s" : ""} received.`, {
            title: "New Account Request",
            actionText: isOnPage("admin_accounts") ? "" : "Open",
            onAction: () => notifyNavigateTo("accounts")
          });
        }
        storeLastSeen("ll_seen_requests", ids.slice(0, 200));
      }
    } catch (e) {}

    // Disputes
    try {
      const r = await fetchJson("/api/admin/disputes", { method: "GET" });
      if (r.ok) {
        const rows = Array.isArray(r.data) ? r.data : [];
        const ids = rows.map(x => String(x && x._id || "")).filter(Boolean);
        const prev = loadLastSeen("ll_seen_disputes");
        const newly = diffNewIds(ids, prev);
        if (newly.length > 0) {
          toast(`${newly.length} new dispute${newly.length > 1 ? "s" : ""} opened.`, {
            title: "New Dispute",
            actionText: isOnPage("admin_disputes") ? "" : "Open",
            onAction: () => notifyNavigateTo("disputes")
          });
        }
        storeLastSeen("ll_seen_disputes", ids.slice(0, 200));
      }
    } catch (e) {}

    // Consents (pending only)
    try {
      const r = await fetchJson("/api/admin/consents?status=pending", { method: "GET" });
      if (r.ok) {
        const rows = Array.isArray(r.data) ? r.data : [];
        const ids = rows.map(x => String(x && x._id || "")).filter(Boolean);
        const prev = loadLastSeen("ll_seen_consents_pending");
        const newly = diffNewIds(ids, prev);
        if (newly.length > 0) {
          toast(`${newly.length} new consent${newly.length > 1 ? "s" : ""} awaiting approval.`, {
            title: "New Consent Upload",
            actionText: isOnPage("admin_consents") ? "" : "Open",
            onAction: () => notifyNavigateTo("consents")
          });
        }
        storeLastSeen("ll_seen_consents_pending", ids.slice(0, 200));
      }
    } catch (e) {}
  }

  function startNotifications() {
    // Only on admin pages (where admin.js is included)
    // Initial seed + then poll
    pollNotificationsOnce();
    setInterval(() => {
      // avoid hammering when tab not visible
      if (document.visibilityState && document.visibilityState !== "visible") return;
      pollNotificationsOnce();
    }, 20000);
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
          u.status, u.billingStatus
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

              <div class="pop-box" style="margin-top:10px;">
                <div class="small" style="margin-bottom:8px;"><b>Billing Acknowledgement</b></div>
                <div class="pop-ack-host" data-lender-id="${id}"></div>
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
    if (msg) msg.textContent = "Loaded lender into form ✅ (set temp password if needed, then Create Lender / update flow)";
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

    // ✅ Align to backend: POST /api/admin/lenders
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

    try { loadLenders(); } catch (e) {}
    try { loadRequests(); } catch (e) {}
  }

  /* ---------------- Billing Acknowledgement UI ---------------- */
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
        const status = String(statusSel.value || "").trim(); // paid/due/overdue etc.
        const note = String(noteInp.value || "").trim();

        msgDiv.textContent = "Sending...";
        msgDiv.className = "popAckMsg";

        try {
          // ✅ Align to backend: PATCH /api/admin/users/:id/billing
          // Store billingStatus and optionally notes (User has "notes" field)
          const r = await fetchJson(`/api/admin/users/${encodeURIComponent(lenderId)}/billing`, {
            method: "PATCH",
            body: JSON.stringify({ billingStatus: status, notes: note })
          });

          if (!r.ok) {
            const m = (r.data && r.data.message)
              ? r.data.message
              : "Failed (backend endpoint missing: PATCH /api/admin/users/:id/billing)";
            msgDiv.textContent = "❌ " + m;
            msgDiv.classList.add("bad");
            alert(m);
            return;
          }

          msgDiv.textContent = "✅ Sent";
          msgDiv.classList.add("good");
          try { loadLenders(); } catch (e) {}
        } catch (e) {
          console.error(e);
          msgDiv.textContent = "❌ Server/network error";
          msgDiv.classList.add("bad");
          alert("Server/network error while sending acknowledgement");
        }
      });

      host.appendChild(node);
    });
  }

  /* =========================================================
     DISPUTES PAGE
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
      const fullName = escapeHtml(c.fullName || "");
      const st = escapeHtml(c.consentStatus || c.status || "pending");
      const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";

      // ✅ Show lender name + branch + email (from your backend payload)
      const lenderName = escapeHtml(c.cashloanName || "—");
      const lenderBranch = escapeHtml(c.cashloanBranch || "");
      const lenderEmail = escapeHtml(c.cashloanEmail || c.lenderEmail || c.createdByEmail || c.uploaderEmail || "—");
      const fromLine = [lenderName, lenderBranch].filter(Boolean).join(" • ");

      // ✅ Use backend-provided file endpoint
      const filePath = (c.consentFileUrl && String(c.consentFileUrl).startsWith("/"))
        ? String(c.consentFileUrl)
        : (c.fileUrl && String(c.fileUrl).startsWith("/") ? String(c.fileUrl) : "");

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>Consent</b> • Omang: <b>${omang || "—"}</b>${fullName ? ` • ${fullName}` : ""}</div>
              <div class="small">Status: <b>${st}</b>${created ? ` • Uploaded: ${escapeHtml(created)}` : ""}</div>
              <div class="small">From: <b>${fromLine || lenderEmail}</b>${lenderEmail ? ` • ${lenderEmail}` : ""}</div>

              <div style="margin-top:10px;">
                ${filePath
                  ? `<button class="btn-ghost btn-sm" type="button" onclick="openConsentFile('${id}')">View file</button>`
                  : `<span class="small" style="opacity:.8;">No file</span>`
                }
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

  window.openConsentFile = function (id) {
    // Backend: GET /api/admin/consents/:id/file (auth required)
    openFileWithAuth(`/api/admin/consents/${encodeURIComponent(id)}/file`, "consent");
  };

  window.setConsentStatus = async function (id, status) {
    const note = status === "rejected"
      ? (prompt("Rejection note (optional):", "Please re-upload a clear consent file.") || "")
      : (prompt("Approval note (optional):", "Consent approved.") || "");

    // ✅ Align to backend: { consentStatus, notes }
    const r = await fetchJson(`/api/admin/consents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ consentStatus: status, notes: note })
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

    // ✅ Start notifications (toast popups)
    startNotifications();

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
