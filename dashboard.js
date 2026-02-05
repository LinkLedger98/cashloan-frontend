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

/* WhatsApp helpers */
function cleanPhoneForWhatsApp(phone) {
  let p = String(phone || "").replace(/[^\d]/g, "");
  if (p.length === 8) p = "267" + p;
  return p;
}
function whatsAppLink(phone, borrowerName, borrowerId) {
  const p = cleanPhoneForWhatsApp(phone);
  if (!p) return null;
  const text = `Hi, this is regarding borrower ${borrowerName || "Unknown"} (National ID: ${borrowerId || "-"}) from LinkLedger.`;
  return `https://wa.me/${encodeURIComponent(p)}?text=${encodeURIComponent(text)}`;
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
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // ✅ duplicate message
      if (res.status === 409 && data.existing) {
        alert("This borrower already exists in YOUR records ✅");
        // auto show your list filtered by this ID
        const myQ = document.getElementById("myQ");
        if (myQ) myQ.value = nationalId;
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

    // Refresh my list
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
          <div class="badge ${tone.className}" title="Risk level">${riskLabel}</div>
        </div>
      </div>
    `;

    if (activeLoans.length === 0) {
      html += `<div class="result-item"><div class="small">No records found across lenders for this National ID.</div></div>`;
      resultsDiv.innerHTML = html;
      return;
    }

    html += `<div class="result-item"><div style="font-weight:700; margin-bottom:8px;">Active Loans</div><div class="results" style="gap:10px;">`;

    activeLoans.forEach((r) => {
      const lenderName = r.cashloanName || "Unknown Lender";
      const branch = r.cashloanBranch ? ` – ${r.cashloanBranch}` : "";
      const phoneRaw = r.cashloanPhone || "";
      const statusUpper = r.status || "";
      const badgeClass = statusBadgeClass(statusUpper);

      const due = r.dueDate ? fmtDate(r.dueDate) : "";
      const paid = r.paidDate ? fmtDate(r.paidDate) : "";

      let dateLine = "";
      if (statusUpper === "PAID" && paid) dateLine = `<div class="small">Paid: ${paid}</div>`;
      if ((statusUpper === "OWING" || statusUpper === "OVERDUE") && due) dateLine = `<div class="small">Due: ${due}</div>`;

      const wa = whatsAppLink(phoneRaw, fullName, nationalId);
      const waBtn = wa ? `<a class="btn-ghost btn-sm" target="_blank" rel="noopener" href="${wa}">WhatsApp</a>` : "";
      const callBtn = phoneRaw ? `<a class="btn-ghost btn-sm" href="tel:${cleanPhoneForWhatsApp(phoneRaw)}">Call</a>` : "";

      html += `
        <div class="result-item" style="margin:0;">
          <div>
            <div><b>${lenderName}${branch}</b></div>
            <div class="small">Phone: <b>${phoneRaw || "-"}</b></div>
            <div class="small">Status: <span class="badge ${badgeClass}">${statusUpper}</span></div>
            ${dateLine}
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              ${callBtn}
              ${waBtn}
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

/* ===== MY CLIENTS (list + update) ===== */
async function loadMyClients() {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  const myDiv = document.getElementById("myClients");
  const q = String((document.getElementById("myQ") && document.getElementById("myQ").value) || "").trim();

  if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");

  myDiv.innerHTML = `<p class="small">Loading your clients...</p>`;

  try {
    const url = q ? `${API_BASE_URL}/api/clients/mine?q=${encodeURIComponent(q)}` : `${API_BASE_URL}/api/clients/mine`;
    const res = await fetch(url, { headers: { "Authorization": token } });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      myDiv.innerHTML = "";
      alert(data.message || "Failed to load your clients");
      return;
    }

    const rows = Array.isArray(data.clients) ? data.clients : [];
    if (rows.length === 0) {
      myDiv.innerHTML = `<div class="result-item"><div class="small">No clients found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((c) => {
      const id = c._id;
      const name = c.fullName || "";
      const nid = c.nationalId || "";
      const st = String(c.status || "").toLowerCase();

      const due = c.dueDate ? String(c.dueDate).slice(0, 10) : "";
      const paid = c.paidDate ? String(c.paidDate).slice(0, 10) : "";

      html += `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>${name}</b> <span class="small">(${nid})</span></div>
              <div class="small">Status: <b>${st.toUpperCase()}</b></div>
            </div>
          </div>

          <div class="row" style="margin-top:10px;">
            <div>
              <label>Status</label>
              <select id="st_${id}">
                <option value="paid" ${st==="paid"?"selected":""}>paid</option>
                <option value="owing" ${st==="owing"?"selected":""}>owing</option>
                <option value="overdue" ${st==="overdue"?"selected":""}>overdue</option>
              </select>
            </div>
            <div>
              <label>Due date</label>
              <input id="due_${id}" type="date" value="${due}" />
            </div>
            <div>
              <label>Paid date</label>
              <input id="paid_${id}" type="date" value="${paid}" />
            </div>
          </div>

          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn-primary" onclick="updateMyClient('${id}')">Update</button>
          </div>
        </div>
      `;
    });

    myDiv.innerHTML = html;
  } catch (err) {
    console.error(err);
    myDiv.innerHTML = "";
    alert("Server error while loading your clients");
  }
}

async function updateMyClient(id) {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  const status = document.getElementById(`st_${id}`).value;
  const dueDate = document.getElementById(`due_${id}`).value;
  const paidDate = document.getElementById(`paid_${id}`).value;

  const payload = {
    status,
    dueDate: dueDate || null,
    paidDate: paidDate || null
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/${encodeURIComponent(id)}`, {
      method: "PUT",
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
    await loadMyClients();
  } catch (err) {
    console.error(err);
    alert("Server error while updating");
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
window.updateMyClient = updateMyClient;
window.logout = logout;

(function () {
  if (!requireLogin()) return;
  const pill = document.getElementById("userPill");
  const email = getEmail();
  if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";
  // Load list once on entry
  loadMyClients();
})();
