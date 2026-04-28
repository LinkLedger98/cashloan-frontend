/* =========================================================
     DISPUTES PAGE (no /overdue endpoint → filter client-side)
  ========================================================= */
  (function () {
  function pickLenderDisplay(d) {
    const business = d.raisedByName || "";
    const branch = d.raisedByBranch || "";
    const email = d.raisedByEmail || "";
    const phone = d.raisedByPhone || "";

    // 🔥 derive name from email if missing
    let fallbackName = "";
    if (!business && email) {
      const namePart = email.split("@")[0];
      const domainPart = email.split("@")[1]?.split(".")[0] || "";
      fallbackName = (namePart + " " + domainPart).trim();
    }

    const line1 = [business || fallbackName, branch].filter(Boolean).join(" • ");
    const line2 = [
      email ? `Email: ${email}` : "",
      phone ? `Phone: ${phone}` : ""
    ].filter(Boolean).join(" • ");

    return {
      line1: line1 || "Unknown lender",
      line2
    };
  }

  async function loadDisputes(mode) {
    const list = $("disputesList");
    if (!list) return;

    list.innerHTML = `<div class="small">Loading...</div>`;

    const r = await fetchJson("/api/admin/disputes", { method: "GET" });
    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load disputes");
      return;
    }

    let rows = Array.isArray(r.data) ? r.data : [];

    if (mode === "overdue") {
      const now = Date.now();
      rows = rows.filter(d => {
        const due = d.slaDueAt ? new Date(d.slaDueAt).getTime() : NaN;
        const st = String(d.status || "").toLowerCase();
        if (!isFinite(due)) return false;
        if (st === "resolved" || st === "rejected") return false;
        return due < now;
      });
    }

    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No disputes.</div></div>`;
      return;
    }

    let html = "";

    rows.forEach((d) => {
      const id = escapeHtml(d._id);
      const nationalId = escapeHtml(d.nationalId || "");
      const status = escapeHtml(d.adminStatus || d.status || "pending");
      const created = d.createdAt ? new Date(d.createdAt).toLocaleString() : "";
      const due = d.slaDueAt ? new Date(d.slaDueAt).toLocaleString() : "";
      const note = escapeHtml(d.adminNote || d.note || "");

      const lender = pickLenderDisplay(d);
      const against = {
        name: d.againstName,
        branch: d.againstBranch,
        email: d.againstEmail,
        phone: d.againstPhone
      };

      const client = {
        nationalId: d.nationalId
      };

     html += `
<div class="result-item" style="padding:14px;">

  <!-- 🔴 HEADER -->
  <div style="font-weight:700; margin-bottom:6px;">
    Dispute • Omang: <b>${nationalId || "—"}</b>
  </div>

  <div class="small" style="margin-bottom:8px;">
    <b>Status:</b> ${status}
    ${created ? ` • Opened: ${escapeHtml(created)}` : ""}
    ${due ? ` • SLA: ${escapeHtml(due)}` : ""}
  </div>

  <!-- 👤 CLIENT -->
  <div class="small" style="margin-bottom:6px;">
    <b>Client:</b> ${escapeHtml(d.fullName || nationalId)}
  </div>

  <!-- 🏢 AGAINST -->
  <div class="small" style="margin-bottom:6px;">
    <b>Against:</b> 
    ${escapeHtml(
      [d.againstCashloanName, d.againstCashloanBranch]
        .filter(Boolean)
        .join(" • ") || "—"
    )}
  </div>

  <!-- 👤 FROM -->
  <div class="small" style="margin-bottom:6px;">
    <b>Raised by:</b> ${escapeHtml(lender.line1)}
  </div>

  ${lender.line2 ? `
    <div class="small" style="opacity:.8; margin-bottom:6px;">
      ${escapeHtml(lender.line2)}
    </div>
  ` : ""}

  <!-- 📝 NOTES -->
  ${d.notes ? `
    <div class="small" style="margin-top:6px;">
      <b>Reason:</b> ${escapeHtml(d.notes)}
    </div>
  ` : ""}

  ${note ? `
    <div class="small" style="margin-top:6px;">
      <b>Admin:</b> ${note}
    </div>
  ` : ""}

  <!-- 🎯 ACTIONS -->
  <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">

    <button class="btn-ghost btn-sm"
      onclick="markInvestigating('${id}')">
      Investigating
    </button>

    <button class="btn-primary btn-sm"
      onclick="resolveDispute('${id}')">
      Resolve
    </button>

    <button class="btn-ghost btn-sm"
      onclick="sendDisputeNote('${id}')">
      Add Note
    </button>

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
        const m = (r.data && r.data.message) ? r.data.message : "Failed to update dispute";
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
    body: JSON.stringify({
      adminNote: note
    })
  });

  if (!r.ok) {
    const m = (r.data && r.data.message) ? r.data.message : "Failed to update dispute";
    alert(m);
    return;
  }

  alert("Note sent ✅");
  loadDisputes("");
};

window.resolveDispute = async function (id) {
  const note = prompt("Resolution note:", "Issue resolved and record corrected.") || "";

  const r = await fetchJson(`/api/admin/disputes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "resolved",   // 🔥 THIS IS THE KEY
      adminNote: note
    })
  });

  if (!r.ok) {
    const m = (r.data && r.data.message) ? r.data.message : "Failed to resolve dispute";
    alert(m);
    return;
  }

  alert("Dispute resolved ✅");
  loadDisputes("");
};

// 🔥 EXPOSE LOAD FUNCTION (THIS WAS MISSING)
window.loadDisputes = loadDisputes;

})();

document.addEventListener("DOMContentLoaded", async function () {
  const ok = await requireSuperAdmin();
  if (!ok) return;

  if ($("loadDisputesBtn")) $("loadDisputesBtn").addEventListener("click", () => loadDisputes(""));
  if ($("loadDisputesOverdueBtn")) $("loadDisputesOverdueBtn").addEventListener("click", () => loadDisputes("overdue"));

  try { if ($("disputesList")) loadDisputes(""); } catch (e) {}
});