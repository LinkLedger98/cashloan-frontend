(function () {
  const REJECTION_REASONS = [
    "Unclear image quality",
    "Incomplete document",
    "Missing signature",
    "Expired / outdated consent",
    "Verification mismatch",
    "Unsupported document format",
    "Other compliance issue"
  ];

  function buildReasonOptions() {
    return REJECTION_REASONS
      .map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`)
      .join("");
  }

  function getApiBaseUrl() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || window.API_BASE || "";
  }

  function getToken() {
    return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  }

  window.openConsentFile = async function (url) {
    try {
      if (typeof openFileWithAuth === "function") {
        openFileWithAuth(url, "consent-file");
        return;
      }

      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();

      const res = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        alert("Failed to open consent file.");
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");

      setTimeout(function () {
        URL.revokeObjectURL(blobUrl);
      }, 60000);

    } catch (err) {
      console.error("OPEN CONSENT FILE ERROR:", err);
      alert("Failed to open consent file.");
    }
  };

  async function loadConsents() {
    const list = $("consentsList");
    if (!list) return;

    const status = String(($("statusFilter") && $("statusFilter").value) || "pending").trim();
    const nationalId = String(($("nationalIdFilter") && $("nationalIdFilter").value) || "").trim();

    list.innerHTML = `<div class="small">Loading...</div>`;

    const q = [];
    if (status) q.push(`status=${encodeURIComponent(status)}`);
    if (nationalId) q.push(`nationalId=${encodeURIComponent(nationalId)}`);

    const r = await fetchJson(`/api/admin/consents${q.length ? "?" + q.join("&") : ""}`, {
      method: "GET"
    });

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
      const id = escapeHtml(c._id || "");
      const omang = escapeHtml(c.nationalId || "");
      const fullName = escapeHtml(c.fullName || "");
      const st = escapeHtml(c.consentStatus || c.status || "pending");
      const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";

      const lenderName = escapeHtml(c.lenderName || "—");
      const lenderBranch = escapeHtml(c.lenderBranch || "");
      const lenderEmail = escapeHtml(c.lenderEmail || "—");
      const fromLine = [lenderName, lenderBranch].filter(Boolean).join(" • ");
      const statusLower = st.toLowerCase();

      html += `
        <div class="consent-premium-card">

          <div class="consent-topline">
            <div>
              <div class="consent-title">
                Consent Evidence • Omang: ${omang || "—"}
              </div>

              <div class="small">
                ${fullName ? `Client: <b>${fullName}</b> • ` : ""}
                Uploaded: ${created ? escapeHtml(created) : "—"}
              </div>
            </div>

            <span class="badge ${
              statusLower === "approved" ? "badge-green" :
              statusLower === "rejected" ? "badge-red" :
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
              Approve + Notify
            </button>

            <button class="btn-ghost btn-sm" type="button"
              onclick="showRejectConsentBox('${id}')">
              Reject + Notify
            </button>
          </div>

          <div
            id="rejectBox_${id}"
            class="consent-reject-box"
            style="
              display:none;
              margin-top:14px;
              padding:14px;
              border-radius:16px;
              border:1px solid rgba(255,47,146,.18);
              background:rgba(255,255,255,.72);
            "
          >
            <div class="mini-label">Rejection reason</div>

            <select id="rejectReason_${id}" style="margin-top:8px;">
              ${buildReasonOptions()}
            </select>

            <div style="margin-top:10px;">
              <label>Additional note optional</label>
              <input
                id="rejectNote_${id}"
                placeholder="Example: Please upload a clearer full-page copy."
              />
            </div>

            <div class="small" style="margin-top:8px; opacity:.75;">
              This will update the consent status and send an automatic compliance message through the LinkLedger Inbox.
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
              <button class="btn-primary btn-sm" type="button"
                onclick="setConsentStatus('${id}','rejected')">
                Confirm Rejection
              </button>

              <button class="btn-ghost btn-sm" type="button"
                onclick="hideRejectConsentBox('${id}')">
                Cancel
              </button>
            </div>
          </div>

        </div>
      `;
    });

    list.innerHTML = html;
  }

  window.showRejectConsentBox = function (id) {
    const box = $(`rejectBox_${id}`);
    if (box) box.style.display = "block";
  };

  window.hideRejectConsentBox = function (id) {
    const box = $(`rejectBox_${id}`);
    if (box) box.style.display = "none";
  };

  window.setConsentStatus = async function (id, status) {
    const cleanStatus = String(status || "").toLowerCase().trim();

    let note = "Consent approved.";
    let rejectionReason = "";

    if (cleanStatus === "rejected") {
      const reasonEl = $(`rejectReason_${id}`);
      const noteEl = $(`rejectNote_${id}`);

      rejectionReason = String(reasonEl ? reasonEl.value : "").trim();
      const extraNote = String(noteEl ? noteEl.value : "").trim();

      if (!rejectionReason) {
        alert("Please select a rejection reason.");
        return;
      }

      note = extraNote || rejectionReason;

    } else {
      const ok = confirm(
        "Approve this consent evidence and send an automatic approval message through LinkLedger Inbox?"
      );

      if (!ok) return;
    }

    const r = await fetchJson(`/api/admin/consents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        consentStatus: cleanStatus,
        notes: note,
        rejectionReason,
        notifyInbox: true
      })
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Failed to update consent";
      alert(m);
      return;
    }

    alert(`Consent ${cleanStatus} ✅ Automatic inbox message queued.`);
    loadConsents();
  };

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

  try {
    if ($("consentsList")) loadConsents();
  } catch (e) {}
});