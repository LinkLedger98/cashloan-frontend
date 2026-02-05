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

function statusBadgeClass(statusUpperOrLower) {
  const s = String(statusUpperOrLower || "").toLowerCase();
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

    if (!res.ok) {
      alert(data.message || "Failed to save borrower record");
      // ✅ if duplicate, auto show their own list so they see it immediately
      if (res.status === 409) {
        loadMyClients();
      }
      return;
    }

    alert("Borrower record saved ✅");

    document.getElementById("fullName").value = "";
    document.getElementById("nationalId").value = "";
    document.getElementById("status").value = "paid";
    document.getElementById("dueDate").value = "";

    // ✅ refresh my list after adding
    loadMyClients();

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
        <div style="font-weight:700; margin-bottom:8px;">Active Loans</div>
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
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
            <div>
              <div><b>${lenderName}${branch}${phone}</b></div>
              <div class="small">Status: <span class="badge ${badgeClass}">${statusUpper}</span></div>
              ${dateLine}
            </div>
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

// ✅ NEW: show only this lender's added clients
async function loadMyClients() {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  const box = document.getElementById("myClients");

  if (!API_BASE_URL) { alert("API_BASE_URL missing in config.js"); return; }
  if (!box) return;

  box.innerHTML = `<p class="small">Loading...</p>`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/mine`, {
      headers: { "Authorization": token }
    });

    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      box.innerHTML = "";
      alert(data.message || "Failed to load your clients");
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      box.innerHTML = `<p class="small">No borrowers added yet.</p>`;
      return;
    }

    box.innerHTML = data.map(c => {
      const id = c._id;
      const name = c.fullName || "";
      const nid = c.nationalId || "";
      const st = String(c.status || "").toLowerCase();

      const dueVal = c.dueDate ? String(c.dueDate).slice(0, 10) : "";
      const paidVal = c.paidDate ? String(c.paidDate).slice(0, 10) : "";

      return `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>${name}</b></div>
              <div class="small">National ID: <b>${nid}</b></div>
              <div class="small">Current: <span class="badge ${statusBadgeClass(st)}">${st.toUpperCase()}</span></div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start;">
              <select id="st_${id}">
                <option value="paid" ${st === "paid" ? "selected" : ""}>paid</option>
                <option value="owing" ${st === "owing" ? "selected" : ""}>owing</option>
                <option value="overdue" ${st === "overdue" ? "selected" : ""}>overdue</option>
              </select>

              <input id="due_${id}" type="date" value="${dueVal}" />
              <input id="paid_${id}" type="date" value="${paidVal}" />

              <button class="btn-primary" type="button" onclick="updateClient('${id}')">Update</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    box.innerHTML = "";
    alert("Server error while loading your clients");
  }
}

// ✅ NEW: update your own record only
async function updateClient(id) {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  const status = document.getElementById(`st_${id}`).value;
  const dueDate = document.getElementById(`due_${id}`).value;
  const paidDate = document.getElementById(`paid_${id}`).value;

  const payload = {
    status: status,
    dueDate: dueDate ? dueDate : null,
    paidDate: paidDate ? paidDate : null
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Update failed");
      return;
    }

    alert("Updated ✅");
    loadMyClients();
  } catch (err) {
    console.error(err);
    alert("Network/server error");
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
window.logout = logout;
window.loadMyClients = loadMyClients;
window.updateClient = updateClient;

(function () {
  if (!requireLogin()) return;
  const pill = document.getElementById("userPill");
  const email = getEmail();
  if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";
})();

// auto load my list when dashboard opens
document.addEventListener("DOMContentLoaded", function () {
  loadMyClients();
});
