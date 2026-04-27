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
        try { opts.onAction(); } catch (e) { }
        close();
      });
    }

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
    try { localStorage.setItem(key, JSON.stringify(ids || [])); } catch (e) { }
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
    } catch (e) { }

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
    } catch (e) { }

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
    } catch (e) { }
  }

  function startNotifications() {
    pollNotificationsOnce();
    setInterval(() => {
      if (document.visibilityState && document.visibilityState !== "visible") return;
      pollNotificationsOnce();
    }, 20000);
  }