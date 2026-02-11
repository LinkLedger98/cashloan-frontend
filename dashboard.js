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

// ✅ auto-logout helper for suspended/invalid sessions
async function handleAuthFailure(res, data) {
  if (res && res.status === 403) {
    const msg = (data && data.message) ? String(data.message) : "Access forbidden";
    if (msg.toLowerCase().includes("suspended")) {
      alert("Your account has been suspended. You will be logged out.");
      logout();
      return true;
    }
  }
  if (res && res.status === 401) {
    alert("Session expired. Please login again.");
    logout();
    return true;
  }
  return false;
}

function fmtDate(isoOrNull) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (isNaN(d.getTime())) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateInput(isoOrNull) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
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

function escapeHtml(x) {
  return String(x || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ✅ Dispute button action (5-day dispute loop starter)
async function openDispute(nationalId, clientRecordId) {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  if (!API_BASE_URL) {
    alert("API_BASE_URL missing in config.js");
    return;
  }

  if (!/^\d{9}$/.test(String(v || nationalId || "").trim())) {
    alert("National ID must be exactly 9 digits.");
    return;
  }

  const notes = prompt("Dispute reason (optional):") || "";

  try {
    const res = await fetch(`${API_BASE_URL}/api/disputes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({
        nationalId: String(nationalId).trim(),
        clientRecordId: String(clientRecordId || "").trim(),
        notes: String(notes || "").trim()
      })
    });

    const data = await res.json().catch(() => ({}));
    if (await handleAuthFailure(res, data)) return;

    if (!res.ok) {
      alert(data.message || "Failed to open dispute");
      return;
    }

    alert("Dispute opened ✅ Record marked Under Dispute (for admin review).");

    const input = document.getElementById("searchNationalId");
    if (input && input.value && input.value.trim() === String(nationalId).trim()) {
      await searchClient();
    }
  } catch (err) {
    console.error(err);
    alert("Server error while opening dispute");
  }
}

async function addClient() {
  if (!requireLogin()) return;

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;
  const dueDate = document.getElementById("dueDate").value;

  // ✅ Consent UI elements (must exist in dashboard.html)
  const consentCheck = document.getElementById("consentCheck");
  const consentFile = document.getElementById("consentFile");

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

  // ✅ Strict 9-digit Omang validation
  if (!/^\d{9}$/.test(nationalId)) {
    alert("National ID must be exactly 9 digits.");
    return;
  }

  // ✅ Consent required
  if (!consentCheck || !consentFile) {
    alert("Consent fields missing on dashboard.html (consentCheck / consentFile).");
    return;
  }

  if (!consentCheck.checked) {
    alert("Borrower consent is required. Tick the consent checkbox.");
    return;
  }

  if (!consentFile.files || consentFile.files.length === 0) {
    alert("Please upload a photo/file of the signed consent form.");
    return;
  }

  const file = consentFile.files[0];

  // ✅ Build multipart payload
  const fd = new FormData();
  fd.append("fullName", fullName);
  fd.append("nationalId", nationalId);
  fd.append("status", status);
  if (dueDate) fd.append("dueDate", dueDate);

  // Consent fields
  fd.append("consentGiven", "true");
  fd.append("consentFile", file);

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: {
        // ❗ Do NOT set Content-Type here for FormData
        "Authorization": token
      },
      body: fd
    });

    const data = await res.json().catch(() => ({}));
    if (await handleAuthFailure(res, data)) return;

    if (res.status === 409) {
      alert(data.message || "Borrower already exists on your dashboard.");
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

    // ✅ reset consent fields
    consentCheck.checked = false;
    consentFile.value = "";

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

  // ✅ Strict 9-digit
  if (!/^\d{9}$/.test(nationalId)) {
    alert("National ID must be exactly 9 digits.");
    return;
  }

  resultsDiv.innerHTML = `<p class="small">Searching...</p>`;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`,
      { headers: { "Authorization": token } }
    );

    const data = await res.json().catch(() => ({}));
    if (await handleAuthFailure(res, data)) return;

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
            <div class="small">Search Result – National ID: <b>${escapeHtml(nationalId)}</b></div>
            <div style="margin-top:6px;"><b>Name:</b> ${escapeHtml(fullName)}</div>
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

      const recordId = r.id || "";

      html += `
        <div class="result-item" style="margin:0;">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
            <div>
              <div><b>${escapeHtml(lenderName)}${escapeHtml(branch)}${escapeHtml(phone)}</b></div>
              <div class="small">Status: <span class="badge ${badgeClass}">${escapeHtml(statusUpper)}</span></div>
              ${dateLine}
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-ghost btn-sm" onclick="openDispute('${escapeHtml(nationalId)}','${escapeHtml(recordId)}')">
                Dispute
              </button>
            </div>
          </div>

          <div class="small" style="margin-top:8px; opacity:.8;">
            Disputes must be resolved within <b>5 business days</b>.
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

function toggleEdit(clientId) {
  const panel = document.getElementById(`edit-${clientId}`);
  if (!panel) return;
  const isHidden = panel.style.display === "none" || panel.style.display === "";
  panel.style.display = isHidden ? "block" : "none";
}

async function updateClient(clientId) {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  if (!API_BASE_URL) {
    alert("API_BASE_URL missing in config.js");
    return;
  }

  const statusEl = document.getElementById(`uStatus-${clientId}`);
  const dueEl = document.getElementById(`uDue-${clientId}`);
  const paidEl = document.getElementById(`uPaid-${clientId}`);

  const status = statusEl ? statusEl.value : "";
  const dueDate = dueEl ? dueEl.value : "";
  const paidDate = paidEl ? paidEl.value : "";

  const payload = {};
  if (status) payload.status = status;

  if (status === "paid") {
    payload.dueDate = null;
    payload.paidDate = paidDate ? paidDate : new Date().toISOString().slice(0, 10);
  } else {
    payload.dueDate = dueDate ? dueDate : null;
    payload.paidDate = paidDate ? paidDate : null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/${encodeURIComponent(clientId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (await handleAuthFailure(res, data)) return;

    if (!res.ok) {
      alert(data.message || "Failed to update borrower");
      return;
    }

    alert("Borrower updated ✅");
    await loadMyClients();
  } catch (err) {
    console.error(err);
    alert("Server error while updating borrower");
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

    if (await handleAuthFailure(res, data)) return;

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
      const id = r._id;
      const stUpper = String(r.status || "").toUpperCase();
      const badgeClass = statusBadgeClass(stUpper);

      const due = r.dueDate ? fmtDate(r.dueDate) : "";
      const paid = r.paidDate ? fmtDate(r.paidDate) : "";

      let dates = "";
      if (stUpper === "PAID" && paid) dates = `<div class="small">Paid: ${paid}</div>`;
      if ((stUpper === "OWING" || stUpper === "OVERDUE") && due) dates = `<div class="small">Due: ${due}</div>`;

      const dueInput = fmtDateInput(r.dueDate);
      const paidInput = fmtDateInput(r.paidDate);
      const currentStatus = String(r.status || "owing").toLowerCase();

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
            <div>
              <div><b>${escapeHtml(r.fullName || "Unknown")}</b></div>
              <div class="small">National ID: <b>${escapeHtml(r.nationalId || "")}</b></div>
              <div class="small">Status: <span class="badge ${badgeClass}">${stUpper}</span></div>
              ${dates}
              <div class="small">Added: ${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-ghost btn-sm" onclick="toggleEdit('${id}')">Update</button>
            </div>
          </div>

          <div id="edit-${id}" style="display:none; margin-top:12px;">
            <div class="row" style="margin-top:8px;">
              <div>
                <label class="small">Status</label>
                <select id="uStatus-${id}">
                  <option value="paid" ${currentStatus === "paid" ? "selected" : ""}>paid</option>
                  <option value="owing" ${currentStatus === "owing" ? "selected" : ""}>owing</option>
                  <option value="overdue" ${currentStatus === "overdue" ? "selected" : ""}>overdue</option>
                </select>
              </div>
              <div>
                <label class="small">Due date</label>
                <input id="uDue-${id}" type="date" value="${dueInput}" />
              </div>
            </div>

            <div class="row" style="margin-top:8px;">
              <div>
                <label class="small">Paid date (optional)</label>
                <input id="uPaid-${id}" type="date" value="${paidInput}" />
              </div>
              <div style="display:flex; align-items:flex-end;">
                <button class="btn-primary" style="width:100%;" onclick="updateClient('${id}')">Save Update</button>
              </div>
            </div>

            <div class="small" style="margin-top:8px; opacity:.8;">
              Tip: If you set status to <b>paid</b> we will clear Due Date automatically.
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

window.toggleEdit = toggleEdit;
window.updateClient = updateClient;

// ✅ expose dispute
window.openDispute = openDispute;

(function () {
  if (!requireLogin()) return;
  const pill = document.getElementById("userPill");
  const email = getEmail();
  if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";

  loadMyClients();

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