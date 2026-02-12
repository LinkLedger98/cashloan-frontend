(function () {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

  function $(id) { return document.getElementById(id); }
  function getToken() { return localStorage.getItem("authToken"); }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  }
  window.logout = logout;

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
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      (opts && opts.headers) ? opts.headers : {}
    );

    if (token) headers["Authorization"] = token;

    const res = await fetch(API_BASE_URL + path, Object.assign({}, opts || {}, { headers }));
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      logout();
      return { ok: false, status: 401, data };
    }

    if (res.status === 403) {
      alert((data && data.message) ? data.message : "Forbidden");
      return { ok: false, status: 403, data };
    }

    return { ok: res.ok, status: res.status, data };
  }

  // Header pill
  const adminPill = $("adminPill");
  if (adminPill) {
    const email = localStorage.getItem("userEmail") || "";
    adminPill.textContent = email ? `Logged in: ${email}` : "Logged in";
  }

  /* ===========================
     CONSENTS
  =========================== */

  const list = $("consentsList");
  const countLine = $("countLine");
  const statusFilter = $("statusFilter");
  const natFilter = $("nationalIdFilter");
  const reloadBtn = $("reloadBtn");

  async function loadConsents() {
    if (!list) return;

    const status = String((statusFilter && statusFilter.value) || "pending").toLowerCase();
    const nat = String((natFilter && natFilter.value) || "").trim();

    if (nat && !isNineDigits(nat)) {
      alert("Omang must be exactly 9 digits.");
      return;
    }

    list.innerHTML = `<div class="small">Loading...</div>`;

    const qs = new URLSearchParams();
    qs.set("status", status);
    if (nat) qs.set("nationalId", nat);

    const r = await fetchJson(`/api/admin/consents?${qs.toString()}`, { method: "GET" });
    if (!r.ok) { list.innerHTML = ""; if (countLine) countLine.textContent = ""; return; }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (countLine) countLine.textContent = `Records: ${rows.length}`;

    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No consent records found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((c) => {
      const id = escapeHtml(c._id);
      const omang = escapeHtml(c.nationalId || "");
      const name = escapeHtml(c.fullName || "");
      const st = escapeHtml(c.consentStatus || "pending");
      const fileUrl = String(c.consentFileUrl || "").trim();
      const fileName = escapeHtml(c.consentFileName || "");
      const mime = escapeHtml(c.consentMime || "");
      const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";

      const fileLine = fileUrl
        ? `<a class="btn-ghost btn-sm" href="${escapeHtml(API_BASE_URL + fileUrl)}" target="_blank" rel="noopener">Open File</a>`
        : `<span class="small" style="opacity:.8;">No file URL saved</span>`;

      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>Omang:</b> ${omang} ${name ? `• <b>${name}</b>` : ""}</div>
              <div class="small">Consent status: <b>${st}</b></div>
              <div class="small">File: ${fileName || "—"} ${mime ? `• ${mime}` : ""}</div>
              <div class="small">Created: ${escapeHtml(created)}</div>
              <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                ${fileLine}
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              ${
                String(st).toLowerCase() === "pending"
                ? `
                  <button class="btn-primary btn-sm" onclick="approveConsent('${id}')">Approve</button>
                  <button class="btn-ghost btn-sm" onclick="rejectConsent('${id}')">Reject</button>
                `
                : `<span class="small" style="opacity:.8;">Done</span>`
              }
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  async function updateConsent(id, consentStatus) {
    const notes = prompt(`Notes (optional) for ${consentStatus}:`) || "";

    const r = await fetchJson(`/api/admin/consents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ consentStatus, notes })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Update failed");
      return;
    }

    alert(`Consent ${consentStatus} ✅`);
    loadConsents();
  }

  window.approveConsent = (id) => updateConsent(id, "approved");
  window.rejectConsent = (id) => updateConsent(id, "rejected");

  if (reloadBtn) reloadBtn.addEventListener("click", loadConsents);
  if (statusFilter) statusFilter.addEventListener("change", loadConsents);

  /* ===========================
     PAYMENT PROOFS
  =========================== */

  const paymentList = $("paymentList");
  const payCountLine = $("payCountLine");
  const payStatusFilter = $("payStatusFilter");
  const payEmailFilter = $("payEmailFilter");
  const reloadPayBtn = $("reloadPayBtn");

  async function loadPaymentProofs() {
    if (!paymentList) return;

    const status = String((payStatusFilter && payStatusFilter.value) || "pending").toLowerCase();
    const email = String((payEmailFilter && payEmailFilter.value) || "").trim().toLowerCase();

    paymentList.innerHTML = `<div class="small">Loading...</div>`;

    const qs = new URLSearchParams();
    qs.set("status", status);
    if (email) qs.set("email", email);

    const r = await fetchJson(`/api/admin/payment-proofs?${qs.toString()}`, { method: "GET" });
    if (!r.ok) { paymentList.innerHTML = ""; if (payCountLine) payCountLine.textContent = ""; return; }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (payCountLine) payCountLine.textContent = `Records: ${rows.length}`;

    if (rows.length === 0) {
      paymentList.innerHTML = `<div class="result-item"><div class="small">No payment proofs found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((p) => {
      const id = escapeHtml(p._id);
      const st = escapeHtml(p.status || "pending");
      const fileUrl = String(p.fileUrl || "").trim();
      const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : "";

      const fileLine = fileUrl
        ? `<a class="btn-ghost btn-sm" href="${escapeHtml(API_BASE_URL + fileUrl)}" target="_blank" rel="noopener">Open File</a>`
        : `<span class="small" style="opacity:.8;">No file URL saved</span>`;

      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>Lender:</b> ${escapeHtml(p.lenderEmail || "")}</div>
              <div class="small">${escapeHtml(p.lenderName || "")} ${p.lenderBranch ? `• ${escapeHtml(p.lenderBranch)}` : ""}</div>
              <div class="small">Status: <b>${st}</b></div>
              <div class="small">File: ${escapeHtml(p.fileName || "—")} ${p.mimeType ? `• ${escapeHtml(p.mimeType)}` : ""}</div>
              <div class="small">Created: ${escapeHtml(created)}</div>

              <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                ${fileLine}
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              ${
                String(st).toLowerCase() === "pending"
                ? `
                  <button class="btn-primary btn-sm" onclick="approvePay('${id}')">Approve</button>
                  <button class="btn-ghost btn-sm" onclick="rejectPay('${id}')">Reject</button>
                `
                : `<span class="small" style="opacity:.8;">Done</span>`
              }
            </div>
          </div>
        </div>
      `;
    });

    paymentList.innerHTML = html;
  }

  async function updatePaymentProof(id, status) {
    const notes = prompt(`Notes (optional) for ${status}:`) || "";

    const r = await fetchJson(`/api/admin/payment-proofs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Update failed");
      return;
    }

    alert(`Payment proof ${status} ✅`);
    loadPaymentProofs();
  }

  window.approvePay = (id) => updatePaymentProof(id, "approved");
  window.rejectPay = (id) => updatePaymentProof(id, "rejected");

  if (reloadPayBtn) reloadPayBtn.addEventListener("click", loadPaymentProofs);
  if (payStatusFilter) payStatusFilter.addEventListener("change", loadPaymentProofs);

  // boot
  loadConsents();
  loadPaymentProofs();
})();
