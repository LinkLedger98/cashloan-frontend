(function () {
  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const form = document.getElementById("adminForm");
  const msg = document.getElementById("msg");

  if (!API_BASE_URL) {
    if (msg) msg.textContent = "Config not loaded (config.js).";
    return;
  }
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (msg) msg.textContent = "Creating lender...";

    // Keep your admin key field
    const adminKey = String(document.getElementById("adminKey").value || "").trim();

    const payload = {
      businessName: String(document.getElementById("businessName").value || "").trim(),
      branchName: String(document.getElementById("branchName").value || "").trim(),
      phone: String(document.getElementById("phone").value || "").trim(),
      licenseNo: String(document.getElementById("licenseNo").value || "").trim(),
      email: String(document.getElementById("email").value || "").toLowerCase().trim(),
      tempPassword: String(document.getElementById("tempPassword").value || "").trim()
    };

    // Build headers
    const headers = { "Content-Type": "application/json" };

    // ✅ Option A: Admin key (legacy)
    if (adminKey) headers["x-admin-key"] = adminKey;

    // ✅ Option B: Authorization token (new safety net)
    const token = localStorage.getItem("authToken");
    if (token) headers["Authorization"] = token; // works with your middleware that reads raw token

    try {
      const res = await fetch(API_BASE_URL + "/api/admin/lenders", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (msg) msg.textContent = data.message || ("Request failed (" + res.status + ")");
        return;
      }

      if (msg) msg.textContent = "✅ Lender account created";

      // Clear lender fields (leave adminKey as-is so you don’t re-paste every time)
      document.getElementById("businessName").value = "";
      document.getElementById("branchName").value = "";
      document.getElementById("phone").value = "";
      document.getElementById("licenseNo").value = "";
      document.getElementById("email").value = "";
      document.getElementById("tempPassword").value = "";
    } catch (err) {
      console.error(err);
      if (msg) msg.textContent = "Network/server error.";
    }
  });
})();
