document.addEventListener("DOMContentLoaded", function () {
  console.log("admin.js loaded ✅");

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const form = document.getElementById("adminForm");
  const msg = document.getElementById("msg");

  if (!form) {
    console.error("adminForm not found");
    return;
  }

  // ✅ Stop browser refresh no matter what
  form.addEventListener("submit", function (e) {
    e.preventDefault();
  });

  if (!API_BASE_URL) {
    console.error("APP_CONFIG missing");
    if (msg) msg.textContent = "Config not loaded (config.js).";
    return;
  }

  async function createLender() {
    if (msg) msg.textContent = "Creating lender...";

    const adminKey = String(document.getElementById("adminKey").value || "").trim();
    const token = localStorage.getItem("authToken");

    const payload = {
      businessName: String(document.getElementById("businessName").value || "").trim(),
      branchName: String(document.getElementById("branchName").value || "").trim(),
      phone: String(document.getElementById("phone").value || "").trim(),
      licenseNo: String(document.getElementById("licenseNo").value || "").trim(),
      email: String(document.getElementById("email").value || "").toLowerCase().trim(),
      tempPassword: String(document.getElementById("tempPassword").value || "").trim()
    };

    const headers = { "Content-Type": "application/json" };
    if (adminKey) headers["x-admin-key"] = adminKey;
    if (token) headers["Authorization"] = token;

    try {
      const res = await fetch(API_BASE_URL + "/api/admin/lenders", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      console.log("create lender response:", res.status, data);

      if (!res.ok) {
        if (msg) msg.textContent = data.message || ("Request failed (" + res.status + ")");
        return;
      }

      if (msg) msg.textContent = "✅ Lender account created";

      // Clear lender fields only
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
  }

  // ✅ Now attach the REAL submit handler
  form.addEventListener("submit", function () {
    createLender();
  });
});
