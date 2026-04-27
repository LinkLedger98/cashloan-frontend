/* =========================================================
   LinkLedger • Super Admin (admin.js)
   One JS file for:
   - admin_accounts.html (create lender, signup requests, lenders list + Secure + PoP + billing ack)
   - admin_disputes.html (list disputes + "investigating" note)
   - admin_audit.html (audit logs)
   - admin_consents.html (consent approvals ONLY)

   Notes:
   - Uses token in localStorage.authToken
   - Uses role in localStorage.userRole  ✅ (single source of truth)
   - Optional legacy ADMIN_KEY input (#adminKey) sent as x-admin-key
========================================================= */
const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL;

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
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Optional legacy admin key input
    const adminKeyEl = $("adminKey");
    const keyVal = adminKeyEl ? String(adminKeyEl.value || "").trim() : "";
    if (keyVal) headers["x-admin-key"] = keyVal;

    return headers;
  }

  function handleAdminForbiddenMaybe(data, status) {
    if (status === 403 && data && data.redirectTo) {
      const msg = data.alert || data.message || "Access Denied";
      alert(msg);
      window.location.href = String(data.redirectTo).replace(/^\//, "");
      return true;
    }
    if ((status === 401 || status === 403) && data && data.message) {
      const m = String(data.message || "");
      if (m.toLowerCase().includes("suspended") || status === 401) {
        alert(m || "Session expired. Please login again.");
        logout();
        return true;
      }
    }
    return false;
  }

  function normalizeApiPathOrUrl(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";

    // If it's a full URL, strip the origin and keep only /api/...
    // Example: https://cashloan-backend.onrender.com/api/admin/consents/ID/file
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        return u.pathname + (u.search || "");
      } catch (e) {
        // fallback: try to find /api/
        const idx = raw.toLowerCase().indexOf("/api/");
        if (idx >= 0) return raw.slice(idx);
        return raw;
      }
    }

    // Ensure it starts with /
    if (!raw.startsWith("/")) return "/" + raw;
    return raw;
  }

  async function fetchJson(path, opts) {
    if (!API_BASE_URL) throw new Error("API_BASE_URL missing in config.js");

    const headers = Object.assign(
      { "Content-Type": "application/json" },
      authHeaders((opts && opts.headers) ? opts.headers : {})
    );

    const res = await fetch(API_BASE_URL + path, Object.assign({}, opts || {}, { headers }));
    let data = {};
try {
  data = await res.json();
} catch (e) {}

    // ✅ auto-handle backend redirectTo/alert
    if (handleAdminForbiddenMaybe(data, res.status)) {
      return { ok: false, status: res.status, data };
    }

    return { ok: res.ok, status: res.status, data };
  }

  async function fetchBlob(pathOrUrl) {
    if (!API_BASE_URL) throw new Error("API_BASE_URL missing in config.js");

    const apiPath = normalizeApiPathOrUrl(pathOrUrl);
    if (!apiPath) throw new Error("Missing file path");

    const headers = authHeaders({});
    const res = await fetch(API_BASE_URL + apiPath, { method: "GET", headers });

    if (!res.ok) {
      let text = "";
      try { text = await res.text(); } catch (e) { }

      // try parse json style
      try {
        const j = JSON.parse(text || "{}");
        if (handleAdminForbiddenMaybe(j, res.status)) throw new Error("redirect");
      } catch (e) { }

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
    } catch (e) { }
    return fallback || "file";
  }

  async function openFileWithAuth(pathOrUrl, fallbackName) {
    try {
      const { blob, contentDisposition } = await fetchBlob(pathOrUrl);

      const fileName = filenameFromContentDisposition(contentDisposition, fallbackName || "file");

      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, "_blank");

      if (!win) {
        alert("Popup blocked. Please allow popups.");
      }

      setTimeout(() => URL.revokeObjectURL(url), 5000);

    } catch (e) {
      console.error(e);
      alert("Could not open file: " + (e.message || ""));
    }
  }

  /* =========================================================
     ✅ SUPERADMIN ONLY gate (front-end)
     - token must exist
     - role must be superadmin
     - best-effort verify /api/auth/me
  ========================================================= */
  async function requireSuperAdmin() {
    const token = getToken();
    if (!token) {
      alert("Please log in first");
      window.location.href = "login.html";
      return false;
    }

    const pill = $("adminPill");
    const email = getEmail();
    if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";

    // Fast path
    if (getRole() === "superadmin") return true;

    // Verify role via backend (if /api/auth/me exists)
    try {
      const r = await fetchJson("/api/auth/me", { method: "GET" });

      // If /auth/me doesn't exist, deny for safety
      if (!r.ok && (r.status === 404 || r.status === 500)) {
        alert("Access Denied");
        window.location.href = "dashboard.html";
        return false;
      }

      if (!r.ok) {
        alert("Session expired or access denied. Please login again.");
        logout();
        return false;
      }

      const role = String((r.data && (r.data.role || r.data.userRole)) || "").toLowerCase();
      if (role) localStorage.setItem("userRole", role);

      if (role !== "superadmin") {
        alert("Access Denied");
        window.location.href = "dashboard.html";
        return false;
      }

      return true;
    } catch (e) {
      alert("Access Denied");
      window.location.href = "dashboard.html";
      return false;
    }
  }