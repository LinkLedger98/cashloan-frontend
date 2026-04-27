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
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>Consent</b> • Omang: <b>${omang || "—"}</b>${fullName ? ` • ${fullName}` : ""}</div>
              <div class="small">Status: <b>${st}</b>${created ? ` • Uploaded: ${escapeHtml(created)}` : ""}</div>
              <div class="small">From: <b>${fromLine || lenderEmail}</b>${lenderEmail ? ` • ${lenderEmail}` : ""}</div>

              <div style="margin-top:10px;">
                <button class="btn-ghost btn-sm" type="button"
                  onclick="openConsentFile('/api/admin/consents/${id}/file')">
                  View Consent
                </button>
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              <button class="btn-ghost btn-sm" type="button"
                onclick="setConsentStatus('${id}','approved')">Approve</button>

              <button class="btn-ghost btn-sm" type="button"
                onclick="setConsentStatus('${id}','rejected')">Reject</button>
            </div>
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

  try { if ($("consentsList")) loadConsents(); } catch (e) {}
});