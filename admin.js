function getToken() {
  return localStorage.getItem("authToken") || "";
}
function getRole() {
  return (localStorage.getItem("userRole") || "").toLowerCase();
}
function getEmail() {
  return (localStorage.getItem("userEmail") || "").toLowerCase();
}

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  const token = getToken();
  const adminKey = (document.getElementById("adminKey")?.value || "").trim();

  if (adminKey) h["x-admin-key"] = adminKey;
  if (token) h["Authorization"] = token;

  return h;
}

function fmtDate(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

function setMsg(text, isOk) {
  const el = document.getElementById("msg");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = isOk ? "#5CFFB0" : "#FF7A7A";
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}

window.logout = logout;

(function init() {
  const pill = document.getElementById("adminPill");
  if (pill) {
    const email = getEmail();
    pill.textContent = email ? `Logged in: ${email}` : "Logged in";
  }

  const form = document.getElementById("adminForm");
  if (form) {
    form.addEventListener("submit", createLender);
  }

  reloadAccounts();
  loadSignupRequests(); // ← NEW
})();

async function createLender(e) {
  e.preventDefault();
  setMsg("", true);

  const api = window.APP_CONFIG?.API_BASE_URL;
  if (!api) return setMsg("API_BASE_URL missing", false);

  const payload = {
    businessName: businessName.value.trim(),
    branchName: branchName.value.trim(),
    phone: phone.value.trim(),
    licenseNo: licenseNo.value.trim(),
    email: email.value.trim(),
    tempPassword: tempPassword.value.trim()
  };

  const res = await fetch(`${api}/api/admin/lenders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return setMsg(data.message || "Failed", false);

  setMsg("Lender created ✅", true);
  reloadAccounts();
}

async function reloadAccounts() {
  const api = window.APP_CONFIG?.API_BASE_URL;
  if (!api) return;

  const body = document.getElementById("accountsBody");
  if (!body) return;

  body.innerHTML = "<tr><td colspan='9'>Loading...</td></tr>";

  const res = await fetch(`${api}/api/admin/lenders`, { headers: authHeaders() });
  const data = await res.json().catch(() => []);

  body.innerHTML = data.map(u => `
<tr>
<td>${u.businessName || ""}</td>
<td>${u.email || ""}</td>
<td>${u.status || ""}</td>
<td>${u.billingStatus || ""}</td>
<td>${fmtDate(u.paidUntil) || "-"}</td>
<td>${u.phone || ""}</td>
<td>${u.licenseNo || ""}</td>
<td>
<button onclick="setStatus('${u._id}','suspended')">Suspend</button>
<button onclick="setStatus('${u._id}','active')">Activate</button>
</td>
</tr>
`).join("");
}

async function loadSignupRequests() {
  const api = window.APP_CONFIG?.API_BASE_URL;
  if (!api) return;

  const list = document.getElementById("requestsList");
  if (!list) return;

  const res = await fetch(`${api}/api/admin/requests`, { headers: authHeaders() });
  const data = await res.json().catch(() => []);

  list.innerHTML = data.map(r => `
<div class="card">
<b>${r.businessName}</b><br>
${r.email}<br>
${r.phone}
</div>
`).join("");
}

async function setStatus(id, status) {
  const api = window.APP_CONFIG?.API_BASE_URL;

  await fetch(`${api}/api/admin/users/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });

  reloadAccounts();
}
