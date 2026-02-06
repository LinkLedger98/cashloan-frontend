// dashboard.js (FULL) — WhatsApp works, “Call” = copy number (no tel handler prompts)
function getToken() { return localStorage.getItem("authToken"); }
function getEmail() { return localStorage.getItem("userEmail"); }

function requireLogin() {
  const token = getToken();
  if (!token) { alert("Please log in first"); window.location.href = "login.html"; return false; }
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

function cleanPhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}
function phoneWithBW(phone) {
  let p = cleanPhone(phone);
  if (p.length === 8) p = "267" + p;
  return p;
}
function buildWhatsAppLink(phone, message) {
  const p = phoneWithBW(phone);
  if (!p) return null;
  return `https://wa.me/${encodeURIComponent(p)}?text=${encodeURIComponent(message || "")}`;
}
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(String(txt || ""));
    alert("Copied ✅ " + txt);
  } catch {
    prompt("Copy this number:", txt);
  }
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
      if (res.status === 409 && data.existing) {
        alert("This borrower already exists in YOUR records ✅");
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
    const res = await fetch(`${API_BASE_URL}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`, {
      headers: { "Authorization": token }
    });

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
            <div class="small">Search Result – National ID: <b>${escapeHtml(nationalId)}</b></div>
            <div style="margin-top:6px;"><b>Name:</b> ${escapeHtml(fullName)}</div>
          </div>
          <div class="badge ${tone.className}">${escapeHtml(riskLabel)}</div>
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
      if (statusUpper === "PAID" && paid) dateLine = `<div class="small">Paid: ${escapeHtml(paid)}</div>`;
      if ((statusUpper === "OWING" || statusUpper === "OVERDUE") && due) dateLine = `<div class="small">Due: ${escapeHtml(due)}</div>`;

      const msg = `Hi, this is regarding borrower ${fullName} (National ID: ${nationalId}) from LinkLedger.`;
      const wa = buildWhatsAppLink(phoneRaw, msg);

      html += `
        <div class="result-item" style="margin:0;">
          <div>
            <div><b>${escapeHtml(lenderName)}${escapeHtml(branch)}</b></div>
            <div class="small">Phone: <b>${escapeHtml(phoneRaw || "-")}</b></div>
            <div class="small">Status: <span class="badge ${badgeClass}">${escapeHtml(statusUpper)}</span></div>
            ${dateLine}
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              ${phoneRaw ? `<button class="btn-ghost btn-sm" onclick="copyPhone('${escapeHtml(phoneRaw)}')">Copy phone</button>` : ""}
              ${wa ? `<a class="btn-ghost btn-sm" target="_blank" rel="noopener" href="${wa}">WhatsApp</a>` : ""}
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
          <div><b>${escapeHtml(name)}</b> <span class="small">(${escapeHtml(nid)})</span></div>
          <div class="small" style="margin-top:4px;">Status: <b>${escapeHtml(st.toUpperCase())}</b></div>

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
              <input id="due_${id}" type="date" value="${escapeHtml(due)}" />
            </div>
          </div>

          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
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

  const payload = { status, dueDate: dueDate || null };

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.message || "Update failed"); return; }

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

window.copyPhone = function (p) { copyText(p); };

(function () {
  if (!requireLogin()) return;
  const pill = document.getElementById("userPill");
  const email = getEmail();
  if (pill) pill.textContent = email ? `Logged in: ${email}` : "Logged in";
  loadMyClients();
})();
