/* =========================================================
   🚨 RISK ENGINE + AUDIT EVIDENCE FILTER
========================================================= */
(function () {
  let latestAuditRows = [];
  let activeEvidenceFilter = null;

  function normalize(v) {
    return String(v || "").toLowerCase().trim();
  }

  function getActor(a) {
    return String(a.actorEmail || a.email || a.userEmail || a.actor || "unknown");
  }

  function getAction(a) {
    return String(a.action || a.event || "");
  }

  function getNationalId(a) {
    return String(a.targetNationalId || a.nationalId || "");
  }

  function getBusiness(a) {
    const meta = a.meta || a.details || a.payload || {};
    return String(
      a.againstBusiness ||
      a.targetBusiness ||
      a.businessName ||
      meta.lenderName ||
      meta.businessName ||
      meta.fullName ||
      getActor(a)
    );
  }

  function isOddLogin(a) {
    const action = getAction(a).toUpperCase();
    const ts = a.createdAt || a.timestamp || a.time || null;

    if (!ts) return false;

    const d = new Date(ts);
    if (isNaN(d.getTime())) return false;

    const time = d.getHours() + d.getMinutes() / 60;

    return action.includes("LOGIN") && (time < 7.5 || time > 18);
  }

  function matchesEvidence(row, filter) {
    if (!filter) return true;

    const actor = normalize(getActor(row));
    const action = normalize(getAction(row));
    const nationalId = normalize(getNationalId(row));
    const business = normalize(getBusiness(row));

    if (filter.type === "odd-login") {
      return actor === normalize(filter.actor) && isOddLogin(row);
    }

    if (filter.type === "high-login") {
      return actor === normalize(filter.actor) && action.includes("login");
    }

    if (filter.type === "business-disputes") {
      return business === normalize(filter.business) && action.includes("dispute");
    }

    if (filter.type === "business-searches") {
      return business === normalize(filter.business) && action.includes("search");
    }

    if (filter.type === "repeat-search") {
      return (
        actor === normalize(filter.actor) &&
        nationalId === normalize(filter.nationalId) &&
        action.includes("search")
      );
    }

    return true;
  }

  function setEvidenceFilter(filter) {
    activeEvidenceFilter = filter;
    renderAuditRows(latestAuditRows, filter);

    const auditList = $("auditList");
    if (auditList) {
      auditList.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  window.openRiskEvidence = function (encodedFilter) {
    try {
      const filter = JSON.parse(decodeURIComponent(encodedFilter));
      setEvidenceFilter(filter);
    } catch (err) {
      console.error("Risk evidence open error:", err);
      alert("Could not open matching audit evidence.");
    }
  };

  window.clearRiskEvidenceFilter = function () {
    activeEvidenceFilter = null;
    renderAuditRows(latestAuditRows, null);
  };

  function makeRiskButton(label, filter) {
    return `
      <button
        type="button"
        class="btn-ghost btn-sm"
        style="width:100%; margin-bottom:6px; text-align:left; justify-content:flex-start;"
        onclick="openRiskEvidence('${encodeURIComponent(JSON.stringify(filter))}')"
      >
        ${escapeHtml(label)}
      </button>
    `;
  }

  function runRiskEngine(rows) {
    if (!Array.isArray(rows)) return;

    const userRisk = {};
    const businessRisk = {};
    const searchTracker = {};
    const alerts = [];

    rows.forEach((a) => {
      if (!a || typeof a !== "object") return;

      const actor = getActor(a);
      const action = getAction(a).toUpperCase();
      const nationalId = getNationalId(a);
      const business = getBusiness(a);

      if (!userRisk[actor]) {
        userRisk[actor] = { score: 0, oddLogins: 0 };
      }

      if (isOddLogin(a)) {
        userRisk[actor].score += 2;
        userRisk[actor].oddLogins += 1;
      }

      const ts = a.createdAt || a.timestamp || null;
      if (ts) {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          const time = d.getHours() + d.getMinutes() / 60;
          if (action.includes("LOGIN") && (time < 5 || time > 21)) {
            userRisk[actor].score += 3;
          }
        }
      }

      if (!businessRisk[business]) {
        businessRisk[business] = { disputes: 0, searches: 0 };
      }

      if (action.includes("DISPUTE")) {
        businessRisk[business].disputes += 1;
      }

      if (action.includes("SEARCH") && nationalId) {
        const key = actor + "_" + nationalId;

        if (!searchTracker[key]) {
          searchTracker[key] = 0;
        }

        searchTracker[key] += 1;
        businessRisk[business].searches += 1;
      }
    });

    Object.entries(userRisk || {}).forEach(([actor, data]) => {
      const odd = Number((data && data.oddLogins) || 0);
      const score = Number((data && data.score) || 0);

      if (odd >= 2) {
        alerts.push(
          makeRiskButton(
            `🌙 ${actor} logged in at unusual times (${odd})`,
            { type: "odd-login", actor }
          )
        );
      }

      if (score >= 6) {
        alerts.push(
          makeRiskButton(
            `🔥 HIGH RISK LOGIN: ${actor} (score ${score})`,
            { type: "high-login", actor }
          )
        );
      }
    });

    Object.entries(businessRisk || {}).forEach(([biz, data]) => {
      const disputes = Number((data && data.disputes) || 0);
      const searches = Number((data && data.searches) || 0);

      if (disputes >= 3) {
        alerts.push(
          makeRiskButton(
            `🏢 ${biz} has ${disputes} disputes against them`,
            { type: "business-disputes", business: biz }
          )
        );
      }

      if (disputes >= 5) {
        alerts.push(
          makeRiskButton(
            `🚨 HIGH RISK BUSINESS: ${biz} (${disputes} disputes)`,
            { type: "business-disputes", business: biz }
          )
        );
      }

      if (searches >= 5) {
        alerts.push(
          makeRiskButton(
            `🔍 ${biz} is aggressively searching records (${searches})`,
            { type: "business-searches", business: biz }
          )
        );
      }

      if (searches >= 10) {
        alerts.push(
          makeRiskButton(
            `🚨 SEARCH ABUSE RISK: ${biz} (${searches})`,
            { type: "business-searches", business: biz }
          )
        );
      }
    });

    Object.entries(searchTracker || {}).forEach(([key, count]) => {
      const safeCount = Number(count || 0);

      if (safeCount >= 5) {
        const [actor, id] = String(key).split("_");

        alerts.push(
          makeRiskButton(
            `🔍 ${actor} repeatedly searched ${id}`,
            { type: "repeat-search", actor, nationalId: id }
          )
        );
      }
    });

    const box = document.getElementById("riskBox");
    const list = document.getElementById("riskList");

    if (box && list) {
      if (alerts.length === 0) {
        box.style.display = "none";
      } else {
        box.style.display = "block";
        list.innerHTML = alerts.join("");
      }
    }

    if (typeof renderRiskDashboard === "function") {
      renderRiskDashboard(businessRisk);
    }
  }

  function renderAuditRows(rows, filter) {
    const list = $("auditList");
    if (!list) return;

    const visibleRows = Array.isArray(rows)
      ? rows.filter((row) => matchesEvidence(row, filter))
      : [];

    const countLine = $("auditCountLine");

    if (countLine) {
      countLine.innerHTML = filter
        ? `Showing matching evidence: ${visibleRows.length} log(s) <button class="btn-ghost btn-sm" onclick="clearRiskEvidenceFilter()">Clear filter</button>`
        : `Logs: ${Array.isArray(rows) ? rows.length : 0}`;
    }

    if (visibleRows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No matching audit logs found.</div></div>`;
      return;
    }

    let html = "";

    visibleRows.forEach((a) => {
      const ts = a.createdAt || a.timestamp || a.time || null;
      const when = ts ? new Date(ts).toLocaleString() : "";
      const actor = getActor(a);
      const action = getAction(a) || "—";
      const target = getNationalId(a);
      const meta = a.meta || a.details || a.payload || null;
      const business = getBusiness(a);

      const prettyMeta = meta
        ? Object.entries(meta).map(([k, v]) => {
            return `<div class="small"><b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}</div>`;
          }).join("")
        : "";

      html += `
        <div
          class="audit-premium-card"
          style="${filter ? "outline:2px solid #ff4db8; box-shadow:0 0 0 4px rgba(255,77,184,.18);" : ""}"
        >

          <div class="audit-topline">
            <div>
              <div class="audit-action">
                ${String(action).includes("DISPUTE") ? "🔴 " : String(action).includes("SEARCH") ? "🔍 " : "🧾 "}
                ${escapeHtml(action)}
              </div>

              <div class="small">
                By: <b>${escapeHtml(actor)}</b>${when ? ` • ${escapeHtml(when)}` : ""}
              </div>

              <div class="small">
                Institution: <b>${escapeHtml(business)}</b>
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

  async function loadAudit() {
    const list = $("auditList");
    if (!list) return;

    const limit = Math.min(
      200,
      Math.max(1, parseInt((($("auditLimit") && $("auditLimit").value) || "100"), 10) || 100)
    );

    list.innerHTML = `<div class="small">Loading...</div>`;

    const r = await fetchJson(`/api/admin/audit?limit=${limit}`, { method: "GET" });

    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load audit logs");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    latestAuditRows = rows;

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

    runRiskEngine(rows);
    renderAuditRows(rows, activeEvidenceFilter);
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
          r.nationalId || r.targetNationalId || ""
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

  try {
    if ($("auditList")) loadAudit();
  } catch (e) {}
});