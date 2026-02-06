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
  if (risk === "red") return { pill: "OVERDUE / HIGH RISK", emoji: "🔴", className: "overdue" };
  if (risk === "yellow") return { pill: "OWING / MEDIUM RISK", emoji: "🟡", className: "owing" };
  return { pill: "LOW RISK", emoji: "🟢", className: "paid" };
}

async function addClient() {
  if (!requireLogin()) return;

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;
  const dueDate = document.getElementById("dueDate").value;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) {
    alert("API_BASE_URL missing in config.js");
    return;
  }

  if (!fullName || !nationalId || !status) {
    alert("Please fill Full name, National ID and Status");
    return;
  }

  const payload = { fullName, nationalId, status };
  if (dueDate) payload.dueDate = dueDate;

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    // ✅ Duplicate on same lender
    if (res.status === 409) {
      alert(data.message || "Borrower already exists on your dashboard.");
      // auto refresh list + show search results
      await loadMyClients();
      document.getElementById("searchNationalId").value = nationalId;
      await searchClient();
      return;
    }

    if (!res.ok) {
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

  if (!API_BASE_URL) {
    alert("API_BASE_URL missing in config.js");
    return;
  }

  if (!nationalId) {
    alert("Enter National ID");
    return;
  }

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
          <div class="badge ${tone.className}" title="Risk level">${riskLabel}</div>
        </div>
      </div>
    `;

    if (activeLoans.length === 0) {
      html += `
        <div class="result-item">
          <div class="small">No records found across lenders for this National ID.</div>
        </div>
      `;
      resultsDiv.innerHTML = html;
      return;
    }

    html += `
      <div class="result-item">
        <div style="font-weight:700; margin-bottom:8px;">Loan History</div>
        <div class="results" style="gap:10px;">
    `;

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
          <div>
            <div><b>${lenderName}${branch}${phone}</b></div>
            <div class="small">Status: <span class="badge ${badgeClass}">${statusUpper}</span></div>
            ${dateLine}
          </div>
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

async function loadMyClients() {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  const list = document.getElementById("myClientsList");
  const q = (document.getElementById("myClientsSearch") && document.getElementById("myClientsSearch").value || "").trim();

  if (!API_BASE_URL) {
    alert("API_BASE_URL missing in config.js");
    return;
  }
  if (!list) return;

  list.innerHTML = `<p class="small">Loading...</p>`;

  try {
    const url = `${API_BASE_URL}/api/clients/mine${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    const res = await fetch(url, { headers: { "Authorization": token } });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      list.innerHTML = "";
      alert((data && data.message) ? data.message : "Failed to load my clients");
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No clients yet.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((r) => {
      const st = String(r.status || "").toUpperCase();
      const badgeClass = statusBadgeClass(st);
      const due = r.dueDate ? fmtDate(r.dueDate) : "";
      const paid = r.paidDate ? fmtDate(r.paidDate) : "";

      let dates = "";
      if (st === "PAID" && paid) dates = `<div class="small">Paid: ${paid}</div>`;
      if ((st === "OWING" || st === "OVERDUE") && due) dates = `<div class="small">Due: ${due}</div>`;

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
            <div>
              <div><b>${r.fullName || "Unknown"}</b></div>
              <div class="small">National ID: <b>${r.nationalId || ""}</b></div>
              <div class="small">Status: <span class="badge ${badgeClass}">${st}</span></div>
              ${dates}
              <div class="small">Added: ${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  } catch (err) {
    console.error(err);
    list.innerHTML = "";
    alert("Server error while loading clients");
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
window.logout = logout;

(function () {
  if (!requireLogin()) return;
  const pill = document.getElementById("userPill");
  const email = getEmail();
  if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";

  // auto load "My Clients"
  loadMyClients();

  // live search (press Enter)
  const input = document.getElementById("myClientsSearch");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        loadMyClients();
      }
    });
  }
})();
