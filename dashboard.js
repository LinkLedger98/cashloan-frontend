function getToken() {
  return localStorage.getItem("authToken");
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

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  window.location.href = "login.html";
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

async function addClient() {
  if (!requireLogin()) return;

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;
  const dueDate = document.getElementById("dueDate").value || null;
  const paidDate = document.getElementById("paidDate").value || null;

  const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) {
    alert("API_BASE_URL missing in config.js");
    return;
  }

  if (!fullName || !nationalId || !status) {
    alert("Please fill all required fields");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ fullName, nationalId, status, dueDate, paidDate })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Failed to save record");
      return;
    }

    alert("Saved successfully ✅");
    document.getElementById("fullName").value = "";
    document.getElementById("nationalId").value = "";
    document.getElementById("status").value = "paid";
    document.getElementById("dueDate").value = "";
    document.getElementById("paidDate").value = "";
  } catch (err) {
    console.error(err);
    alert("Server error while saving");
  }
}

async function searchClient() {
  if (!requireLogin()) return;

  const nationalId = document.getElementById("searchNationalId").value.trim();
  const resultsDiv = document.getElementById("results");

  const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) {
    alert("API_BASE_URL missing in config.js");
    return;
  }

  if (!nationalId) {
    alert("Enter National ID");
    return;
  }

  resultsDiv.innerHTML = "Searching...";

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`, {
      headers: { "Authorization": token }
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      resultsDiv.innerHTML = "";
      alert((data && data.message) ? data.message : "Search failed");
      return;
    }

    // Expected data format:
    // { nationalId, fullName, riskLabel, activeLoans: [...] }

    const fullName = data.fullName || "Unknown";
    const riskLabel = data.riskLabel || "🟢 Low Risk Borrower";
    const loans = Array.isArray(data.activeLoans) ? data.activeLoans : [];

    resultsDiv.innerHTML = `
      <div class="result-item">
        <div><strong>Search Result – National ID:</strong> ${nationalId}</div>
        <div class="small" style="margin-top:6px;"><strong>Name:</strong> ${fullName}</div>
        <div class="small"><strong>Status:</strong> ${riskLabel}</div>
      </div>
    `;

    if (loans.length === 0) {
      resultsDiv.innerHTML += `<p class="small" style="margin-top:10px;">No records found.</p>`;
      return;
    }

    resultsDiv.innerHTML += `<div class="small" style="margin-top:10px;"><strong>Active Loans:</strong></div>`;

    loans.forEach((r) => {
      const statusLower = String(r.status || "").toLowerCase();
      const badgeClass =
        statusLower === "PAID".toLowerCase() ? "paid" :
        statusLower === "OWING".toLowerCase() ? "owing" : "overdue";

      resultsDiv.innerHTML += `
        <div class="result-item">
          <div><strong>${r.cashloanName}</strong> – ${r.cashloanBranch} <span class="small">no: ${r.cashloanPhone}</span></div>
          <div class="small">Status: <span class="badge ${badgeClass}">${r.status}</span></div>
          <div class="small">Due: ${fmtDate(r.dueDate)}</div>
        </div>
      `;
    });

  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = "";
    alert("Server error while searching");
  }
}

// Show who is logged in
(function init() {
  requireLogin();
  const who = document.getElementById("whoami");
  const email = localStorage.getItem("userEmail") || "Logged in";
  if (who) who.textContent = email;
})();

window.addClient = addClient;
window.searchClient = searchClient;
window.logout = logout;
