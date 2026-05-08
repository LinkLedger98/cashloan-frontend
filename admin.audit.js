/* =========================================================
       🚨 RISK ENGINE (SAFE + BULLETPROOF)
    ========================================================= */
    (function () {
    function runRiskEngine(rows) {
      if (!Array.isArray(rows)) return;

      const userRisk = {};
      const businessRisk = {};
      const searchTracker = {};
      const alerts = [];

      rows.forEach(a => {
        if (!a || typeof a !== "object") return;

        const actor = String(a.actorEmail || a.email || "unknown");
        const action = String(a.action || "").toUpperCase();
        const ts = a.createdAt || a.timestamp || null;
        const nationalId = a.targetNationalId || a.nationalId || null;

        // 🔒 ALWAYS FALL BACK TO ACTOR (NEVER BREAKS)
        const business = String(
          a.againstBusiness || a.targetBusiness || a.businessName || actor
        );

        // ================================
        // 👤 USER LOGIN BEHAVIOR
        // ================================
        if (!userRisk[actor]) {
          userRisk[actor] = { score: 0, oddLogins: 0 };
        }

        if (ts) {
          const d = new Date(ts);
          if (!isNaN(d.getTime())) {
            const time = d.getHours() + (d.getMinutes() / 60);

            if (time < 7.5 || time > 18) {
              userRisk[actor].score += 2;
              userRisk[actor].oddLogins += 1;
            }

            if (time < 5 || time > 21) {
              userRisk[actor].score += 3;
            }
          }
        }

        // ================================
        // 🏢 BUSINESS INIT (NEVER BREAKS)
        // ================================
        if (!businessRisk[business]) {
          businessRisk[business] = { disputes: 0, searches: 0 };
        }

        // ================================
        // 🏢 DISPUTES
        // ================================
        if (action.includes("DISPUTE")) {
          businessRisk[business].disputes += 1;
        }

        // ================================
        // 🔍 SEARCH ABUSE
        // ================================
        if (action.includes("SEARCH") && nationalId) {
          const key = actor + "_" + nationalId;

          if (!searchTracker[key]) {
            searchTracker[key] = 0;
          }

          searchTracker[key] += 1;

          // 🔥 ALWAYS SAFE
          businessRisk[business].searches += 1;
        }
      }); // ← THIS closes rows.forEach

      // ================================
      // 🚨 USER ALERTS (SAFE)
      // ================================
      Object.entries(userRisk || {}).forEach(([actor, data]) => {
        const odd = Number((data && data.oddLogins) || 0);
        const score = Number((data && data.score) || 0);

        if (odd >= 2) {
          alerts.push(`🌙 ${actor} logged in at unusual times (${odd})`);
        }

        if (score >= 6) {
          alerts.push(`🔥 HIGH RISK LOGIN: ${actor} (score ${score})`);
        }
      });

      // ================================
      // 🚨 BUSINESS ALERTS (SAFE)
      // ================================
      Object.entries(businessRisk || {}).forEach(([biz, data]) => {
        const disputes = Number((data && data.disputes) || 0);
        const searches = Number((data && data.searches) || 0);

        if (disputes >= 3) {
          alerts.push(`🏢 ${biz} has ${disputes} disputes against them`);
        }

        if (disputes >= 5) {
          alerts.push(`🚨 HIGH RISK BUSINESS: ${biz} (${disputes} disputes)`);
        }

        if (searches >= 5) {
          alerts.push(`🔍 ${biz} is aggressively searching records (${searches})`);
        }

        if (searches >= 10) {
          alerts.push(`🚨 SEARCH ABUSE RISK: ${biz} (${searches})`);
        }
      });

      // ================================
      // 🚨 SEARCH PATTERN ALERTS (SAFE)
      // ================================
      Object.entries(searchTracker || {}).forEach(([key, count]) => {
        const safeCount = Number(count || 0);

        if (safeCount >= 5) {
          const [actor, id] = String(key).split("_");
          alerts.push(`🔍 ${actor} repeatedly searched ${id}`);
        }
      });

     // ================================
// 🎯 CLICKABLE RISK UI
// ================================
window.jumpToAudit = function(keyword) {

  const cards = document.querySelectorAll(".audit-premium-card");

  let found = false;

  cards.forEach(card => {

    card.style.outline = "";
    card.style.boxShadow = "";

    const text = String(card.innerText || "").toLowerCase();

    if (text.includes(String(keyword || "").toLowerCase())) {

      found = true;

      card.style.outline = "2px solid #ff4db8";
      card.style.boxShadow = "0 0 0 4px rgba(255,77,184,.18)";

      card.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  });

  if (!found) {
    alert("No matching audit log found.");
  }
};

const box = document.getElementById("riskBox");
const list = document.getElementById("riskList");

if (box && list) {

  if (alerts.length === 0) {

    box.style.display = "none";

  } else {

    box.style.display = "block";

    list.innerHTML = alerts.map(a => {

      const keyword =
        String(a)
          .replace(/[^\w\s@.-]/g, " ")
          .trim();

      return `
        <button
          class="btn-ghost btn-sm"
          style="
            width:100%;
            margin-bottom:6px;
            text-align:left;
            justify-content:flex-start;
          "
          onclick="jumpToAudit('${escapeHtml(keyword)}')"
        >
          ${escapeHtml(a)}
        </button>
      `;
    }).join("");
  }
}

      // ================================
      // 🏢 DASHBOARD (SAFE)
      // ================================
      if (typeof renderRiskDashboard === "function") {
        renderRiskDashboard(businessRisk);
      }
    }

    /* =========================================================
       📊 LOAD AUDIT
    ========================================================= */
    async function loadAudit() {
      const list = $("auditList");
      if (!list) return;

      const limit = Math.min(200, Math.max(1, parseInt((($("auditLimit") && $("auditLimit").value) || "100"), 10) || 100));

      list.innerHTML = `<div class="small">Loading...</div>`;

      const r = await fetchJson(`/api/admin/audit?limit=${limit}`, { method: "GET" });

      if (!r.ok) {
        list.innerHTML = "";
        alert((r.data && r.data.message) ? r.data.message : "Failed to load audit logs");
        return;
      }

      const rows = Array.isArray(r.data) ? r.data : [];

      const auditStatTotal = $("auditStatTotal");
const auditStatSearches = $("auditStatSearches");
const auditStatDisputes = $("auditStatDisputes");

if (auditStatTotal) auditStatTotal.textContent = rows.length;

if (auditStatSearches) {
  auditStatSearches.textContent = rows.filter(a =>
    String(a.action || a.event || "").toUpperCase().includes("SEARCH")
  ).length;
}

if (auditStatDisputes) {
  auditStatDisputes.textContent = rows.filter(a =>
    String(a.action || a.event || "").toUpperCase().includes("DISPUTE")
  ).length;
}

      // 🚨 RUN RISK ENGINE
      runRiskEngine(rows);

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

        // 🔥 CLEAN META DISPLAY
        const prettyMeta = meta
          ? Object.entries(meta).map(([k, v]) => {
            return `<div class="small"><b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}</div>`;
          }).join("")
          : "";

       html += `
  <div class="audit-premium-card">

    <div class="audit-topline">
      <div>
        <div class="audit-action">
          ${action.includes("DISPUTE") ? "🔴 " : action.includes("SEARCH") ? "🔍 " : "🧾 "}
          ${escapeHtml(action)}
        </div>

        <div class="small">
          By: <b>${escapeHtml(actor)}</b>${when ? ` • ${escapeHtml(when)}` : ""}
        </div>
      </div>

      ${target ? `<span class="badge badge-pink">Omang: ${escapeHtml(target)}</span>` : `<span class="badge badge-gray">System</span>`}
    </div>

    ${prettyMeta ? `
      <details class="audit-details">
        <summary>View audit details</summary>
        <div style="margin-top:8px;">
          ${prettyMeta}
        </div>
      </details>
    ` : ""}

    <div class="audit-actions">
      <button class="btn-ghost btn-sm" onclick="logAuditAction('${escapeHtml(actor)}','CALL')">📞 Called</button>
      <button class="btn-ghost btn-sm" onclick="logAuditAction('${escapeHtml(actor)}','EMAIL')">📧 Email Sent</button>
      <button class="btn-ghost btn-sm" onclick="logAuditAction('${escapeHtml(actor)}','WARNING')">⚠️ Warning Issued</button>
    </div>

  </div>
`;
      });

      list.innerHTML = html;
    }

    window.exportAuditCSV = async function () {
  try {
    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL;
    const token = localStorage.getItem("authToken");

    if (!API_BASE_URL) {
      alert("API not configured");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/admin/audit`, {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];

    if (!rows.length) {
      alert("No audit data to export");
      return;
    }

    const csv = [
      ["Date", "Actor", "Action", "Omang"].join(","),
      ...rows.map(r => [
        r.createdAt,
        r.actorEmail,
        r.action,
        r.nationalId || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    alert("Export failed");
  }
};

window.loadAudit = loadAudit;
})();

document.addEventListener("DOMContentLoaded", async function () {
  const ok = await requireSuperAdmin();
  if (!ok) return;

  if ($("loadAuditBtn")) $("loadAuditBtn").addEventListener("click", loadAudit);

  try { if ($("auditList")) loadAudit(); } catch (e) {}
});