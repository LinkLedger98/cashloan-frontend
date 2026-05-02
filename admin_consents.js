(function () {

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
      const id = c._id;
      const omang = escapeHtml(c.nationalId || "");
      const fullName = escapeHtml(c.fullName || "");
      const st = escapeHtml(c.consentStatus || c.status || "pending");
      const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";

      const lenderName = escapeHtml(c.lenderName || "—");
      const lenderBranch = escapeHtml(c.lenderBranch || "");
      const lenderEmail = escapeHtml(c.lenderEmail || "—");
      const fromLine = [lenderName, lenderBranch].filter(Boolean).join(" • ");

     html += `
  <div class="consent-premium-card">

    <div class="consent-topline">
      <div>
        <div class="consent-title">
          Consent Evidence • Omang: ${omang || "—"}
        </div>

        <div class="small">
          ${fullName ? `Customer: <b>${fullName}</b> • ` : ""}
          Uploaded: ${created ? escapeHtml(created) : "—"}
        </div>
      </div>

      <span class="badge ${
        st.toLowerCase() === "approved" ? "badge-green" :
        st.toLowerCase() === "rejected" ? "badge-red" :
        "badge-yellow"
      }">${st}</span>
    </div>

    <div class="consent-meta-grid">
      <div>
        <div class="mini-label">Submitted by</div>
        <div class="mini-value">${fromLine || lenderEmail}</div>
      </div>

      <div>
        <div class="mini-label">Email</div>
        <div class="mini-value">${lenderEmail}</div>
      </div>
    </div>

    <div class="consent-actions">
      <button class="btn-ghost btn-sm" type="button"
        onclick="openConsentFile('/api/admin/consents/${id}/file')">
        View Consent
      </button>

      <button class="btn-primary btn-sm" type="button"
        onclick="setConsentStatus('${id}','approved')">
        Approve
      </button>

      <button class="btn-ghost btn-sm" type="button"
        onclick="setConsentStatus('${id}','rejected')">
        Reject
      </button>
    </div>

  </div>
`;
    });

    list.innerHTML = html;
  }

  // ✅ View consent file
  window.openConsentFile = function (url) {
    openFileWithAuth(url, "consent-file");
  };

  // ✅ Approve / Reject
  window.setConsentStatus = async function (id, status) {
    const note = status === "rejected"
      ? (prompt("Rejection note (optional):", "Please re-upload a clear consent file.") || "")
      : (prompt("Approval note (optional):", "Consent approved.") || "");

    const r = await fetchJson(`/api/admin/consents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ consentStatus: status, notes: note })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Failed to update consent";
      alert(m);
      return;
    }

    alert(`Consent ${status} ✅`);
    loadConsents();
  };

  // 🔥 CRITICAL (don’t miss this)
  window.loadConsents = loadConsents;

})();

document.addEventListener("DOMContentLoaded", async function () {
  const ok = await requireSuperAdmin();
  if (!ok) return;

  if ($("reloadBtn")) $("reloadBtn").addEventListener("click", loadConsents);
  if ($("statusFilter")) $("statusFilter").addEventListener("change", loadConsents);

  if ($("nationalIdFilter")) {
  $("nationalIdFilter").addEventListener("keydown", function (e) {
    if (e.key === "Enter") loadConsents();
  });
}

  try { if ($("consentsList")) loadConsents(); } catch (e) {}
});