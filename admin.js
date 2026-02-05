async function loadAccounts() {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const list = document.getElementById("accountsList");
  const adminKey = String(document.getElementById("adminKey").value || "").trim();
  const token = localStorage.getItem("authToken");

  if (!API_BASE_URL) { alert("Config missing"); return; }
  if (!list) return;

  list.innerHTML = `<p class="small">Loading...</p>`;

  const headers = { "Content-Type": "application/json" };
  if (adminKey) headers["x-admin-key"] = adminKey;
  if (token) headers["Authorization"] = token;

  try {
    const res = await fetch(API_BASE_URL + "/api/admin/lenders", { headers });
    const data = await res.json().catch(() => ([]));

    if (!res.ok) {
      list.innerHTML = "";
      alert((data && data.message) ? data.message : "Failed to load accounts");
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = `<p class="small">No accounts found.</p>`;
      return;
    }

    list.innerHTML = data.map(u => {
      const role = (u.role || "lender").toUpperCase();
      const name = u.businessName || "(no businessName)";
      const email = u.email || "";
      const phone = u.phone || "";
      const branch = u.branchName || "";
      const lic = u.licenseNo || "";
      const status = u.status || "";

      return `
        <div class="result-item">
          <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <div><b>${name}</b> <span class="small">(${role})</span></div>
              <div class="small">${email}</div>
              <div class="small">${branch} • ${phone} • ${lic} • ${status}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  } catch (e) {
    console.error(e);
    list.innerHTML = "";
    alert("Network error");
  }
}

window.loadAccounts = loadAccounts;
