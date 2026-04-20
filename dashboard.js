function getToken() {
  return localStorage.getItem("authToken");
}

function getEmail() {
  return localStorage.getItem("userEmail");
}

function requireLogin() {
  const token = getToken();
  if (!token) {
    alert("Authentication required. Please log in to continue.");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem("role");

  window.location.href = "login.html";
}

// ✅ auto-logout helper for suspended/invalid sessions
async function handleAuthFailure(res, data) {
  if (res && res.status === 403) {
    const msg = (data && data.message) ? String(data.message) : "Access restricted";
    if (msg.toLowerCase().includes("suspended")) {
      alert("Your account has been suspended. You will now be logged out.");
      logout();
      return true;
    }
  }
  if (res && res.status === 401) {
    alert("Your session has expired. Please log in again.");
    logout();
    return true;
  }
  return false;
}

function fmtDateTime(isoOrNull) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
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
  if (risk === "red") return { pill: "High Risk", emoji: "🔴", className: "overdue" };
  if (risk === "yellow") return { pill: "Moderate Risk", emoji: "🟡", className: "owing" };
  return { pill: "Low Risk", emoji: "🟢", className: "paid" };
}

function escapeHtml(x) {
  return String(x || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ================================
   ✅ File validation (client-side)
   - Mirrors backend: image/* + pdf
================================ */
function isAllowedImageExt(name) {
  const n = String(name || "").toLowerCase().trim();
  return (
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".webp") ||
    n.endsWith(".gif") ||
    n.endsWith(".bmp") ||
    n.endsWith(".heic") ||
    n.endsWith(".heif") ||
    n.endsWith(".tif") ||
    n.endsWith(".tiff")
  );
}

function isAllowedUploadFile(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase().trim();
  if (mime.startsWith("image/")) return true;
  if (mime === "application/pdf") return true;

  // fallback for some devices
  if (mime === "application/octet-stream" && isAllowedImageExt(file.name)) return true;

  return false;
}

/* ================================
   ✅ UI Helpers
================================ */
function setConsentAck(ok, message) {
  const el = document.getElementById("consentAck");
  if (!el) return;

  el.style.display = "block";
  el.style.padding = "8px 10px";
  el.style.borderRadius = "10px";
  el.style.border = "1px solid rgba(0,0,0,.12)";

  if (ok) {
    el.style.background = "rgba(0, 200, 0, 0.08)";
    el.style.color = "#0b6b0b";
    el.textContent = `✔ ${message || "Consent document received."}`;
  } else {
    el.style.background = "rgba(255, 0, 0, 0.06)";
    el.style.color = "#8a1f1f";
    el.textContent = `⚠ ${message || "Submission failed. Please retry."}`;
  }
}

function clearConsentAck() {
  const el = document.getElementById("consentAck");
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
}

function setPaymentStatus(kind, text) {
  const el = document.getElementById("paymentProofStatus");
  if (!el) return;

  el.style.display = "block";
  el.style.padding = "10px 12px";
  el.style.borderRadius = "10px";
  el.style.border = "1px solid rgba(0,0,0,.12)";

 const k = String(kind || "").toLowerCase();

if (k === "approved") {
  el.style.background = "rgba(0, 200, 0, 0.08)";
  el.style.color = "#0b6b0b";
  el.textContent = `Approved${text ? " — " + text : ""}`.trim();
  return;
}

if (k === "pending") {
  el.style.background = "rgba(0,0,0,0.05)";
  el.style.color = "#333";
  el.textContent = `Pending Review${text ? " — " + text : ""}`.trim();
  return;
}

if (k === "resend") {
  el.style.background = "rgba(255, 165, 0, 0.12)";
  el.style.color = "#7a4b00";
  el.textContent = `Action Required${text ? " — " + text : ""}`.trim();
  return;
}

if (k === "past_due") {
  el.style.background = "rgba(255, 0, 0, 0.06)";
  el.style.color = "#8a1f1f";
  el.textContent = `Past Due${text ? " — " + text : ""}`.trim();
  return;
}

el.style.background = "rgba(0,0,0,.03)";
el.style.color = "#333";
el.textContent = text || "";
}

function clearPaymentStatus() {
  const el = document.getElementById("paymentProofStatus");
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
}


/* ================================
   ✅ Helpers for API calls
================================ */
async function apiJson(path, opts) {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  if (!API_BASE_URL) throw new Error("System configuration error");

  const isForm = (opts && opts.body && (opts.body instanceof FormData));

  const headers = Object.assign({}, (opts && opts.headers) || {}, {
    "Authorization": token
  });

  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, Object.assign({}, opts || {}, { headers }));
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function mapProofToUiStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "resend";
  if (s === "pending") return "pending";
  return "pending";
}

function adminTag(adminStatus, status) {
  const s = String(adminStatus || status || "").toLowerCase();

  if (s === "resolved") {
    return `<span class="badge paid">Resolved</span>`;
  }
  if (s === "rejected") {
    return `<span class="badge overdue">Rejected</span>`;
  }
  if (s === "investigating") {
    return `<span class="badge owing">Investigating</span>`;
  }
  return `<span class="badge">Pending</span>`;
}

// 🔔 Toast popup
function showToast(msg) {
  let container = document.getElementById("toastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.right = "20px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  const t = document.createElement("div");
  t.textContent = msg;

  t.style.padding = "10px 14px";
  t.style.background = "#0e1117";
  t.style.border = "1px solid rgba(255,255,255,0.1)";
  t.style.borderRadius = "12px";
  t.style.fontSize = "13px";
  t.style.color = "#e8eef7";
  t.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";

  // animation start state
  t.style.opacity = "0";
  t.style.transform = "translateY(10px)";
  t.style.transition = "all 0.25s ease";

  container.appendChild(t);

  // animate in
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transform = "translateY(0)";
  });

  // animate out
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
  }, 2500);

  // remove
  setTimeout(() => {
    t.remove();
  }, 3000);
}

/* ================================
   ✅ Load My Disputes (FINAL CLEAN)
================================ */
async function loadMyDisputes(changedIds = []) {
  const activeEl = document.getElementById("myDisputesActive");
  const closedEl = document.getElementById("myDisputesClosed");
  if (!activeEl || !closedEl) return;
  if (!requireLogin()) return;

  activeEl.innerHTML = `<div class="result-item"><div class="small">Loading dispute records...</div></div>`;
  closedEl.innerHTML = "";

  try {
    const { res, data } = await apiJson("/api/disputes/mine", { method: "GET" });
    if (await handleAuthFailure(res, data)) return;

    if (!res.ok) {
      activeEl.innerHTML = "";
      alert(data.message || "Unable to load dispute records");
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    const active = [];
    const closed = [];
    const now = new Date();

    // ✅ SPLIT + 7 DAY FILTER
    rows.forEach((d) => {
      const s = String(d.adminStatus || "").toLowerCase();

      if (s === "resolved" || s === "rejected") {
        const updatedAt = new Date(d.updatedAt || d.createdAt);
        const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);

        if (diffDays <= 7) {
          closed.push(d);
        }
      } else {
        active.push(d);
      }
    });

    // ✅ RENDER FUNCTION
    function render(d) {
      const isChanged = changedIds.includes(d._id);

      return `
        <div class="result-item ${isChanged ? "highlight-update" : ""}">
          <div style="font-weight:600; margin-bottom:4px;">
            Dispute Record • National ID: <b>${escapeHtml(d.nationalId)}</b>
          </div>

          <div class="small">
            ${adminTag(d.adminStatus, d.status)}
            ${d.createdAt ? ` • Submitted: ${fmtDateTime(d.createdAt)}` : ""}
            ${isChanged ? ` • <span class="just-now">updated just now</span>` : ""}
          </div>

          ${d.notes ? `<div class="small"><b>Reason:</b> ${escapeHtml(d.notes)}</div>` : ""}

          ${d.adminNote ? `
            <div class="small" style="margin-top:8px;">
              <b>Admin Response:</b><br/>
              ${escapeHtml(d.adminNote)}
            </div>
          ` : ""}
        </div>
      `;
    }

    // ✅ ACTIVE
    activeEl.innerHTML = active.length
      ? active.map(render).join("")
      : `<div class="result-item"><div class="small">No active disputes</div></div>`;

    // ✅ CLOSED (WITH LABEL)
    closedEl.innerHTML = `
      <div class="section-sub">Showing recent closed disputes (last 7 days)</div>
      ${
        closed.length
          ? closed.map(render).join("")
          : `<div class="result-item"><div class="small">No closed disputes</div></div>`
      }
    `;

  } catch (err) {
    console.error(err);
    activeEl.innerHTML = "";
    alert("Server error while loading dispute records");
  }
}

let lastDisputesMap = {};

/* ================================
   🔄 Auto Refresh Disputes
================================ */
function startDisputesAutoRefresh() {
  let lastHash = null;

  setInterval(async () => {
    try {
      const { res, data } = await apiJson("/api/disputes/mine", { method: "GET" });
      if (!res.ok) return;

      const rows = Array.isArray(data) ? data : [];

      const hash = JSON.stringify(
        rows.map(d => ({
          id: d._id,
          status: d.adminStatus,
          note: d.adminNote
        }))
      );

      if (hash !== lastHash) {
        // 🔥 detect changes
        const changedIds = [];

        rows.forEach(d => {
          const prev = lastDisputesMap[d._id];
          const curr = {
            status: d.adminStatus,
            note: d.adminNote
          };

          if (!prev) return;

          if (prev.status !== curr.status || prev.note !== curr.note) {
            changedIds.push(d._id);
          }
        });

        // 🔔 POPUP
        if (changedIds.length > 0) {
        showToast(
  changedIds.length === 1
    ? "Dispute updated"
    : `${changedIds.length} disputes updated`
);
        }

        // update map
        lastDisputesMap = {};
        rows.forEach(d => {
          lastDisputesMap[d._id] = {
            status: d.adminStatus,
            note: d.adminNote
          };
        });

        lastHash = hash;

        // pass changed IDs
        loadMyDisputes(changedIds);
      }

    } catch (err) {
      console.error("Auto refresh error:", err);
    }
  }, 5000);
}

/* ================================
   ✅ Billing loopback UI (FINAL FIXED)
================================ */
function setBillingLoopbackBox(html, kind) {
  const el = document.getElementById("billingLoopback");
  if (!el) return;

  el.style.display = "block";
  el.style.padding = "10px 12px";
  el.style.borderRadius = "12px";
  el.style.border = "1px solid rgba(255,255,255,.12)";

  const k = String(kind || "").toLowerCase();
  if (k === "approved") el.style.background = "rgba(0,255,140,0.10)";
  else if (k === "past_due") el.style.background = "rgba(255,70,70,0.10)";
  else el.style.background = "rgba(255,205,0,0.10)";

  el.innerHTML = html;
}

async function loadBillingLoopback() {
  if (!requireLogin()) return;

  try {
    const { res, data } = await apiJson("/api/billing/proofs/mine", { method: "GET" });
    if (await handleAuthFailure(res, data)) return;

    if (res.ok && data && data.ok && data.hasProof) {
      const p = data.proof || {};
      const ui = mapProofToUiStatus(p.status);

      const reviewedAt = p.reviewedAt ? fmtDateTime(p.reviewedAt) : "";
      const createdAt = p.createdAt ? fmtDateTime(p.createdAt) : "";
      const notes = escapeHtml(p.notes || "");

      const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

      // ✅ FIX: SAFE URL BUILDING
      let fullFileUrl = "";
      if (p.fileUrl) {
        if (p.fileUrl.startsWith("http")) {
          fullFileUrl = p.fileUrl; // already full
        } else if (API_BASE_URL) {
          fullFileUrl = `${API_BASE_URL}${p.fileUrl}`;
        }
      }

      const receiptUrl = (API_BASE_URL && p._id)
        ? `${API_BASE_URL}/api/billing/proofs/${p._id}/receipt`
        : "";

      // ✅ status text upgrade
      if (ui === "approved") setPaymentStatus("approved", "Payment confirmation approved.");
      else if (ui === "pending") setPaymentStatus("pending", "Awaiting review.");
      else setPaymentStatus("resend", "Action required.");

      setBillingLoopbackBox(`
        <div style="font-weight:900; margin-bottom:6px;">Payment Confirmation — Review Outcome</div>

        <div class="small" style="opacity:.9;">
          Status: <b>${escapeHtml(String(p.status || "").toUpperCase())}</b>
          ${createdAt ? ` • Submitted: ${escapeHtml(createdAt)}` : ""}
          ${reviewedAt ? ` • Reviewed: ${escapeHtml(reviewedAt)}` : ""}
        </div>

        ${
          notes
            ? `<div style="margin-top:10px;"><b>Review Notes:</b> ${notes}</div>`
            : `<div style="margin-top:10px; opacity:.8;">No review notes provided.</div>`
        }

        ${
          fullFileUrl
            ? `<div style="margin-top:10px;">
                 <button class="btn-ghost btn-sm"
                   onclick="window.open('${escapeHtml(fullFileUrl)}', '_blank')">
                   View Submitted Document
                 </button>
               </div>`
            : `<div class="small" style="margin-top:10px; opacity:.7;">
                 Document not available.
               </div>`
        }

        ${
          receiptUrl
            ? `<div style="margin-top:10px;">
                 <a class="btn-primary btn-sm"
                    href="${escapeHtml(receiptUrl)}">
                    Download Receipt
                 </a>
               </div>`
            : ``
        }
      `, ui === "approved" ? "approved" : (ui === "pending" ? "resend" : "resend"));

      return;
    }

    if (res.ok && data && data.ok && data.hasProof === false) {
      setBillingLoopbackBox(`
        <div style="font-weight:900; margin-bottom:6px;">Payment Confirmation</div>
        <div class="small" style="opacity:.85;">No payment confirmation submitted.</div>
      `, "resend");
      clearPaymentStatus();
      return;
    }
  } catch (e) {
    // silent
  }

  // fallback
  try {
    const { res, data } = await apiJson("/api/auth/me", { method: "GET" });
    if (await handleAuthFailure(res, data)) return;

    if (res.ok && data) {
      const billing = String(data.billingStatus || "").toLowerCase();
      const note = escapeHtml(data.notes || "");

      const kind = billing === "paid" ? "approved" : (billing === "overdue" ? "past_due" : "resend");

      setBillingLoopbackBox(`
        <div style="font-weight:900; margin-bottom:6px;">Subscription Status</div>
        <div class="small" style="opacity:.9;">
          Status: <b>${escapeHtml(billing || "unknown")}</b>
        </div>

        ${
          note
            ? `<div style="margin-top:10px;"><b>Notes:</b><br/>
                 <span class="small" style="opacity:.9; white-space:pre-wrap;">${note}</span>
               </div>`
            : ""
        }
      `, kind);
    }
  } catch (err) {
    // silent
  }
}

/* ================================
   ✅ Dispute Action (5-day resolution workflow)
================================ */
async function openDispute(nationalId, recordId) {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  if (!API_BASE_URL) {
    alert("System configuration error. Please contact support.");
    return;
  }

  if (!/^\d{9}$/.test(String(nationalId || "").trim())) {
    alert("National ID must be exactly 9 digits.");
    return;
  }

  const notes = prompt("Enter dispute reason (optional):") || "";

  try {
    const res = await fetch(`${API_BASE_URL}/api/disputes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({
        nationalId: String(nationalId).trim(),
        clientRecordId: String(recordId || "").trim(),
        notes: String(notes || "").trim()
      })
    });

    const data = await res.json().catch(() => ({}));
    if (await handleAuthFailure(res, data)) return;

    if (!res.ok) {
      alert(data.message || "Unable to submit dispute request");
      return;
    }

    alert("Dispute submitted successfully. The record is now under review.");

    const input = document.getElementById("searchNationalId");
    if (input && input.value && input.value.trim() === String(nationalId).trim()) {
      await searchClient();
    }

    try { await loadMyDisputes(); } catch (e) {}
  } catch (err) {
    console.error(err);
    alert("Server error while submitting dispute");
  }
}


/* ================================
   ✅ Add Record (consent required)
================================ */
async function addClient() {
  if (!requireLogin()) return;
  clearConsentAck();

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;
  const dueDate = document.getElementById("dueDate").value;

  const consentCheck = document.getElementById("consentCheck");
  const consentFile = document.getElementById("consentFile");

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) {
    alert("System configuration error. Please contact support.");
    setConsentAck(false, "Submission failed.");
    return;
  }

  if (!fullName || !nationalId || !status) {
    alert("Please complete all required fields: Name, National ID, and Credit Status.");
    return;
  }

  if (!/^\d{9}$/.test(nationalId)) {
    alert("National ID must be exactly 9 digits.");
    return;
  }

  if (!consentCheck || !consentFile) {
    alert("Consent verification fields are missing. Please contact support.");
    setConsentAck(false, "Submission failed.");
    return;
  }

  if (!consentCheck.checked) {
    alert("Customer consent is required before submitting this record.");
    return;
  }

  if (!consentFile.files || consentFile.files.length === 0) {
    alert("Please upload a valid consent document (image or PDF).");
    return;
  }

  const file = consentFile.files[0];

 // ✅ Client-side validation to match backend
if (!isAllowedUploadFile(file)) {
  setConsentAck(false, "Invalid file type. Please upload an image or PDF.");
  alert("Invalid file type. Accepted formats: image or PDF.");
  return;
}

const fd = new FormData();
fd.append("fullName", fullName);
fd.append("nationalId", nationalId);
fd.append("status", status);
if (dueDate) fd.append("dueDate", dueDate);

fd.append("consentGiven", "true");
fd.append("consentFile", file);

try {
  const res = await fetch(`${API_BASE_URL}/api/clients`, {
    method: "POST",
    headers: { "Authorization": token },
    body: fd
  });

  const data = await res.json().catch(() => ({}));
  if (await handleAuthFailure(res, data)) return;

  if (res.status === 409) {
    setConsentAck(true, "Consent document received.");
    alert(data.message || "A record with this National ID already exists.");
    await loadMyClients();
    document.getElementById("searchNationalId").value = nationalId;
    await searchClient();
    return;
  }

  if (!res.ok) {
    setConsentAck(
      false,
      (data && data.message)
        ? `Submission failed — ${data.message}`
        : "Submission failed. Please retry."
    );
    alert(data.message || "Unable to save record");
    return;
  }

  setConsentAck(true, "Consent document received.");
  alert("Record saved successfully.");

  document.getElementById("fullName").value = "";
  document.getElementById("nationalId").value = "";
  document.getElementById("status").value = "paid";
  document.getElementById("dueDate").value = "";

  consentCheck.checked = false;
  consentFile.value = "";

  await loadMyClients();
} catch (err) {
  console.error(err);
  setConsentAck(false, "Submission failed due to a system error.");
  alert("Server error while saving record");
}
}

/* ================================
   ✅ Payment Confirmation Upload
================================ */
async function uploadPaymentProof() {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  if (!API_BASE_URL) {
    alert("System configuration error. Please contact support.");
    return;
  }

  const fileInput = document.getElementById("paymentProofFile");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Please select a valid payment confirmation document (image or PDF).");
    return;
  }

  const file = fileInput.files[0];

  // ✅ Client-side validation
  if (!isAllowedUploadFile(file)) {
    setPaymentStatus("resend", "Invalid file type. Please upload an image or PDF.");
    alert("Invalid file type. Accepted formats: image or PDF.");
    return;
  }

  const fd = new FormData();
  fd.append("paymentProofFile", file);

  setPaymentStatus("pending", "Uploading document...");

  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/proofs`, {
      method: "POST",
      headers: { "Authorization": token },
      body: fd
    });

    const data = await res.json().catch(() => ({}));
    if (await handleAuthFailure(res, data)) return;

    if (!res.ok) {
      const msg = (data && data.message) ? String(data.message) : "Upload failed";
      setPaymentStatus("resend", msg);
      alert(msg);
      return;
    }

    alert("Payment confirmation submitted successfully. It will be reviewed shortly.");
    fileInput.value = "";

       try {
      await loadBillingLoopback();
    } catch (e) {}

  } catch (err) {
    console.error(err);
    setPaymentStatus("resend", "Upload failed due to a system error.");
    alert("Server error while submitting payment confirmation");
  }
} 


/* ================================
   ✅ Verify Customer (status-only output)
================================ */
window.searchClient = async function () {
  if (!requireLogin()) return;

  const nationalId = document.getElementById("searchNationalId").value.trim();
  const resultsDiv = document.getElementById("results");

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) {
    alert("System configuration error. Please contact support.");
    return;
  }

  if (!nationalId) {
    alert("Please enter a National ID.");
    return;
  }

  if (!/^\d{9}$/.test(nationalId)) {
    alert("National ID must be exactly 9 digits.");
    return;
  }

  resultsDiv.innerHTML = `<p class="small">Verifying records...</p>`;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`,
      { headers: { "Authorization": token } }
    );

    const data = await res.json().catch(() => ({}));
    if (await handleAuthFailure(res, data)) return;

    if (!res.ok) {
      resultsDiv.innerHTML = "";
      alert(data.message || "Verification failed");
      return;
    }

    const fullName = data.fullName || "Unknown";
    const risk = data.risk || "green";
    const riskLabel = data.riskLabel || "🟢 Low Credit Risk Profile";
    const creditRecords = Array.isArray(data.activeLoans) ? data.activeLoans : [];

    const tone = riskTone(risk);

    let html = `
      <div class="result-item">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
          <div>
            <div class="small">Verification Result – National ID: <b>${escapeHtml(nationalId)}</b></div>
            <div style="margin-top:6px;"><b>Name:</b> ${escapeHtml(fullName)}</div>
          </div>
          <div class="badge ${tone.className}" title="Risk level">${riskLabel}</div>
        </div>
      </div>
    `;

   if (creditRecords.length === 0) {
  html += `
    <div class="result-item">
      <div class="small">No credit records found across institutions for this National ID.</div>
    </div>
  `;
  resultsDiv.innerHTML = html;
  return;
}

html += `
  <div class="result-item">
    <div style="font-weight:700; margin-bottom:8px;">Credit Records</div>
    <div class="results" style="gap:10px;">
`;

creditRecords.forEach((r) => {
  const institutionName = r.cashloanName || "Unknown Institution";
  const branch = r.cashloanBranch ? ` – ${r.cashloanBranch}` : "";
  const phone = r.cashloanPhone ? ` | Tel: ${r.cashloanPhone}` : "";
  const statusUpper = String(r.status || "").toUpperCase();
  const badgeClass = statusBadgeClass(statusUpper);

  const due = r.dueDate ? fmtDate(r.dueDate) : "";
  const paid = r.paidDate ? fmtDate(r.paidDate) : "";

  let dateLine = "";
  if (statusUpper === "PAID" && paid) {
    dateLine = `<div class="small">Settled on: ${paid}</div>`;
  }
  if ((statusUpper === "OWING" || statusUpper === "OVERDUE") && due) {
    dateLine = `<div class="small">Due date: ${due}</div>`;
  }

 const recordId = r.id || "";

html += `
  <div class="result-item" style="margin:0;">
    <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
      <div>
        <div><b>${escapeHtml(institutionName)}${escapeHtml(branch)}${escapeHtml(phone)}</b></div>
        <div class="small">
          Credit Status: 
          <span class="badge ${badgeClass}">${escapeHtml(statusUpper)}</span>
        </div>
        ${dateLine}
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button 
          class="btn-ghost btn-sm" 
          onclick="openDispute('${escapeHtml(nationalId)}','${escapeHtml(recordId)}')"
        >
          Raise Dispute
        </button>
      </div>
    </div>
  </div>
`;
});

html += `
  </div>
</div>
`;

resultsDiv.innerHTML = html;

} catch (err) {
  console.error(err);
  resultsDiv.innerHTML = "";
  alert("Server error while verifying records");
}

} // ✅ closes searchClient

/* ================================
   ✅ Toggle Edit Panel
================================ */
function toggleEdit(recordId) {
  const panel = document.getElementById(`edit-${recordId}`);
  if (!panel) return;
  const isHidden = panel.style.display === "none" || panel.style.display === "";
  panel.style.display = isHidden ? "block" : "none";
}

/* ================================
   ✅ Update Record
================================ */
async function updateClient(recordId) {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  if (!API_BASE_URL) {
    alert("System configuration error. Please contact support.");
    return;
  }

  const statusEl = document.getElementById(`uStatus-${recordId}`);
const dueEl = document.getElementById(`uDue-${recordId}`);
const paidEl = document.getElementById(`uPaid-${recordId}`);

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
  const res = await fetch(`${API_BASE_URL}/api/clients/${encodeURIComponent(recordId)}`, {
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
    alert(data.message || "Unable to update record");
    return;
  }

  alert("Record updated successfully.");
  await loadMyClients();
} catch (err) {
  console.error(err);
  alert("Server error while updating record");
}
}

async function loadMyClients() {
  if (!requireLogin()) return;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();
  const list = document.getElementById("myClientsList");
  const q = (document.getElementById("myClientsSearch") && document.getElementById("myClientsSearch").value || "").trim();

  if (!API_BASE_URL) {
    alert("System configuration error. Please contact support.");
    return;
  }
  if (!list) return;

  list.innerHTML = `<p class="small">Loading records...</p>`;

  try {
    const url = `${API_BASE_URL}/api/clients/mine${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    const res = await fetch(url, { headers: { "Authorization": token } });
    const data = await res.json().catch(() => ([]));

    if (await handleAuthFailure(res, data)) return;

    if (!res.ok) {
      list.innerHTML = "";
      alert((data && data.message) ? data.message : "Unable to load records");
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No records available.</div></div>`;
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
      if (stUpper === "PAID" && paid) {
        dates = `<div class="small">Settled on: ${paid}</div>`;
      }
      if ((stUpper === "OWING" || stUpper === "OVERDUE") && due) {
        dates = `<div class="small">Due date: ${due}</div>`;
      }

     const dueInput = fmtDateInput(r.dueDate);
const paidInput = fmtDateInput(r.paidDate);
const currentStatus = String(r.status || "owing").toLowerCase();

html += `
  <div class="result-item">
    <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
      <div>
        <div><b>${escapeHtml(r.fullName || "Unknown")}</b></div>
        <div class="small">National ID: <b>${escapeHtml(r.nationalId || "")}</b></div>
        <div class="small">
          Credit Status: 
          <span class="badge ${badgeClass}">${escapeHtml(stUpper)}</span>
        </div>
        ${dates}

        ${r.consentStatus ? `
          <div class="small" style="margin-top:6px;">
            <b>Consent Status:</b> ${escapeHtml(r.consentStatus)}
          </div>
        ` : ""}

        ${r.consentNotes ? `
          <div class="small" style="margin-top:4px; color:#2563eb;">
            ${escapeHtml(r.consentNotes)}
          </div>
        ` : ""}

        <div class="small">
          Created: ${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
        </div>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn-ghost btn-sm" onclick="toggleEdit('${id}')">
          Edit Record
        </button>
      </div>
    </div>
  </div>
`;

html += `
  <div id="edit-${id}" style="display:none; margin-top:12px;">
    <div class="row" style="margin-top:8px;">
      <div>
        <label class="small">Credit Status</label>
        <select id="uStatus-${id}">
          <option value="paid" ${currentStatus === "paid" ? "selected" : ""}>Paid (Settled)</option>
          <option value="owing" ${currentStatus === "owing" ? "selected" : ""}>Ongoing (Active)</option>
          <option value="overdue" ${currentStatus === "overdue" ? "selected" : ""}>Overdue (At Risk)</option>
        </select>
      </div>
      <div>
        <label class="small">Due Date</label>
        <input id="uDue-${id}" type="date" value="${dueInput}" />
      </div>
    </div>

    <div class="row" style="margin-top:8px;">
      <div>
        <label class="small">Settlement Date (optional)</label>
        <input id="uPaid-${id}" type="date" value="${paidInput}" />
      </div>
      <div style="display:flex; align-items:flex-end;">
        <button class="btn-primary" style="width:100%;" onclick="updateClient('${id}')">
          Save Changes
        </button>
      </div>
    </div>

    <div class="small" style="margin-top:8px; opacity:.8;">
      Note: Setting the status to <b>Paid (Settled)</b> will automatically clear the due date.
    </div>
  </div>
`;
});

list.innerHTML = html;

} catch (err) {
  console.error(err);
  list.innerHTML = "";
  alert("Server error while loading records");
}
}

/* ================================
   ✅ Smooth collapse for My Records
================================ */
function setupMyClientsCollapse() {
  const btn = document.getElementById("toggleMyClientsBtn");
  const wrap = document.getElementById("myClientsWrap");
  if (!btn || !wrap) return;

  function setCollapsed(collapsed) {
    if (collapsed) {
      wrap.classList.add("is-collapsed");
      btn.textContent = "▼";
      btn.title = "Expand section";
      btn.setAttribute("aria-expanded", "false");
    } else {
      wrap.classList.remove("is-collapsed");
      btn.textContent = "▲";
      btn.title = "Collapse section";
      btn.setAttribute("aria-expanded", "true");
    }
  }

  btn.addEventListener("click", function () {
    const isCollapsed = wrap.classList.contains("is-collapsed");
    setCollapsed(!isCollapsed);
  });

  setCollapsed(false);
}

/* ================================
   ✅ Smooth collapse for Closed Disputes
================================ */
function setupClosedDisputesCollapse() {
  const btn = document.getElementById("toggleClosedDisputesBtn");
  const wrap = document.getElementById("myDisputesClosedWrap");
  if (!btn || !wrap) return;

  function setCollapsed(collapsed) {
    if (collapsed) {
      wrap.classList.add("is-collapsed");
      btn.textContent = "▼";
      btn.title = "Expand section";
      btn.setAttribute("aria-expanded", "false");
    } else {
      wrap.classList.remove("is-collapsed");
      btn.textContent = "▲";
      btn.title = "Collapse section";
      btn.setAttribute("aria-expanded", "true");
    }
  }

  btn.addEventListener("click", function () {
    const isCollapsed = wrap.classList.contains("is-collapsed");
    setCollapsed(!isCollapsed);
  });

  // ✅ start collapsed
  setCollapsed(true);
}

(async function () {
  if (!requireLogin()) return;

  const pill = document.getElementById("userPill");
  const email = getEmail();
  if (pill) {
    pill.textContent = email ? `Account: ${email}` : "Account";
  }

  setupMyClientsCollapse();
  setupClosedDisputesCollapse();

  const cFile = document.getElementById("consentFile");
  if (cFile) cFile.addEventListener("change", clearConsentAck);

  const dBtn = document.getElementById("reloadMyDisputesBtn");
  if (dBtn) dBtn.addEventListener("click", loadMyDisputes);

  const bBtn = document.getElementById("reloadBillingBtn");
  if (bBtn) bBtn.addEventListener("click", loadBillingLoopback);

  loadMyClients();
  loadMyDisputes();
  loadBillingLoopback();

  startDisputesAutoRefresh();

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