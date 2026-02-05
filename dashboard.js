function getToken() {
  return localStorage.getItem("authToken");
}
function getEmail() {
  return localStorage.getItem("userEmail");
}
function requireLogin() {
  const token = getToken();
  if (!token) {
    alert("Please log in first");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function fmtDate(isoOrNull) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (isNaN(d.getTime())) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function statusBadgeClass(statusUpper) {
  const s = String(statusUpper || "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "owing") return "owing";
  if (s === "overdue") return "overdue";
  return "";
}

function riskTone(risk) {
  if (risk === "red") return { className: "overdue" };
  if (risk === "yellow") return { className: "owing" };
  return { className: "paid" };
}

async function addClient() {
  if (!requireLogin()) return;

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;
  const dueDate = document.getElementById("dueDate").value;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");
  if (!fullName || !nationalId || !status) return alert("Please fill Full name, National ID and Status");

  const payload = { fullName, nationalId, status };
  if (dueDate) payload.dueDate = dueDate;

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // ✅ duplicate
      if (res.status === 409) {
        alert(data.message || "Borrower already exists in your records.");
        await loadMyClients();
        return;
      }
      alert(data.message || "Failed to save borrower record");
      return;
    }

    alert("Borrower record saved ✅");

    document.getElementById("fullName").value = "";
    document.getElementById("nationalId").value = "";
    document.getElementById("status").value = "paid";
    document.getElementById("dueDate").value = "";

    await loadMyClients();
  } catch (err) {
    console.error(err);
    alert("Server error while saving borrower record");
  }
}

async function searchClient() {
  if (!requireLogin()) return;

  const nationalId = document.getElementById("searchNationalId").value.trim();
  const resultsDiv = document.getElementById("results");

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");
  if (!nationalId) return alert("Enter National ID");

  resultsDiv.innerHTML = `<p class="small">Searching...</p>`;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`,
      { headers: { "Authorization": token } }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      resultsDiv.innerHTML = "";
      alert(data.message || "Search failed");
      return;
    }

    const fullName = data.fullName || "Unknown";
    const risk = data.risk || "green";
    const riskLabel = data.riskLabel || "🟢 Low Risk Borrower";
    const activeLoans = Array.isArray(data.activeLoans) ? data.activeLoans : [];

    const tone = riskTone(risk);

    let html = `
      <div class="result-item">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
          <div>
            <div class="small">Search Result – National ID: <b>${nationalId}</b></div>
            <div style="margin-top:6px;"><b>Name:</b> ${fullName}</div>
          </div>
          <div class="badge ${tone.className}">${riskLabel}</div>
        </div>
      </div>
    `;

    if (activeLoans.length === 0) {
      html += `<div class="result-item"><div class="small">No records found across lenders for this National ID.</div></div>`;
      resultsDiv.innerHTML = html;
      return;
    }

    html += `<div class="result-item"><div style="font-weight:700; margin-bottom:8px;">Loan History</div><div class="results" style="gap:10px;">`;

    activeLoans.forEach((r) => {
      const lenderName = r.cashloanName || "Unknown Lender";
      const branch = r.cashloanBranch ? ` – ${r.cashloanBranch}` : "";
      const phone = r.cashloanPhone ? ` no:${r.cashloanPhone}` : "";
      const statusUpper = r.status || "";
      const badgeClass = statusBadgeClass(statusUpper);

      const due = r.dueDate ? fmtDate(r.dueDate) : "";
      const paid = r.paidDate ? fmtDate(r.paidDate) : "";

      let dateLine = "";
      if (statusUpper === "PAID" && paid) dateLine = `<div class="small">Paid: ${paid}</div>`;
      if ((statusUpper === "OWING" || statusUpper === "OVERDUE") && due) dateLine = `<div class="small">Due: ${due}</div>`;

      html += `
        <div class="result-item" style="margin:0;">
          <div><b>${lenderName}${branch}${phone}</b></div>
          <div class="small">Status: <span class="badge ${badgeClass}">${statusUpper}</span></div>
          ${dateLine}
        </div>
      `;
    });

    html += `</div></div>`;
    resultsDiv.innerHTML = html;

  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = "";
    alert("Server error while searching");
  }
}

// ✅ NEW: My Clients
async function loadMyClients() {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  const msg = document.getElementById("myClientsMsg");
  const tbody = document.getElementById("myClientsTbody");

  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");

  if (msg) msg.textContent = "Loading your clients...";
  if (tbody) tbody.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/mine`, {
      headers: { "Authorization": token }
    });

    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      if (msg) msg.textContent = "";
      alert((data && data.message) ? data.message : "Failed to load your clients");
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      if (msg) msg.textContent = "No clients yet. Add your first borrower record above.";
      return;
    }

    if (msg) msg.textContent = `Showing ${rows.length} record(s).`;

    const esc = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    tbody.innerHTML = rows.map((r) => {
      const statusUpper = String(r.status || "").toUpperCase();
      const badgeClass = statusBadgeClass(statusUpper);

      return `
        <tr>
          <td>${esc(r.fullName)}</td>
          <td>${esc(r.nationalId)}</td>
          <td><span class="badge ${badgeClass}">${esc(statusUpper)}</span></td>
          <td>${r.dueDate ? esc(fmtDate(r.dueDate)) : ""}</td>
          <td>${r.paidDate ? esc(fmtDate(r.paidDate)) : ""}</td>
          <td>${r.createdAt ? esc(fmtDate(r.createdAt)) : ""}</td>
          <td>
            <button class="btn-ghost btn-sm" onclick="updateClientPrompt('${esc(r._id)}')">Update</button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    if (msg) msg.textContent = "";
    alert("Server error while loading your clients");
  }
}

// ✅ NEW: Update flow (simple prompts so no layout changes)
async function updateClientPrompt(id) {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");

  const status = prompt("Enter new status: paid / owing / overdue");
  if (!status) return;

  const s = String(status).toLowerCase().trim();
  if (!["paid", "owing", "overdue"].includes(s)) {
    alert("Invalid status. Use: paid / owing / overdue");
    return;
  }

  let dueDate = null;
  let paidDate = null;

  if (s === "paid") {
    // optional paid date
    paidDate = prompt("Paid date (optional, YYYY-MM-DD). Leave blank for today:");
    if (paidDate) paidDate = paidDate.trim();
  } else {
    dueDate = prompt("Due date (optional, YYYY-MM-DD). Leave blank to keep current:");
    if (dueDate) dueDate = dueDate.trim();
  }

  const payload = { status: s };
  if (s === "paid") {
    if (paidDate) payload.paidDate = paidDate;
  } else {
    if (dueDate) payload.dueDate = dueDate;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || "Update failed");
      return;
    }

    alert("Updated ✅");
    await loadMyClients();
  } catch (err) {
    console.error(err);
    alert("Network/server error while updating");
  }
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}

window.addClient = addClient;
window.searchClient = searchClient;
window.loadMyClients = loadMyClients;
window.updateClientPrompt = updateClientPrompt;
window.logout = logout;

(function () {
  if (!requireLogin()) return;
  const pill = document.getElementById("userPill");
  const email = getEmail();
  if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";
  loadMyClients();
})();
