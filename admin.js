document.addEventListener("DOMContentLoaded", function () {
  const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL;
  const form = document.getElementById("adminForm");
  const msg = document.getElementById("msg");

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!API_BASE_URL) {
      msg.textContent = "❌ API_BASE_URL missing in config.js";
      return;
    }

    const adminKey = document.getElementById("adminKey").value.trim();
    const businessName = document.getElementById("businessName").value.trim();
    const branchName = document.getElementById("branchName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const licenseNo = document.getElementById("licenseNo").value.trim();
    const email = document.getElementById("email").value.trim();
    const tempPassword = document.getElementById("tempPassword").value.trim();

    if (!adminKey || !businessName || !branchName || !phone || !licenseNo || !email || !tempPassword) {
      msg.textContent = "❌ Please fill all fields";
      return;
    }

    msg.textContent = "Creating lender...";

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lenders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey
        },
        body: JSON.stringify({ businessName, branchName, phone, licenseNo, email, tempPassword })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        msg.textContent = `❌ ${data.message || "Failed to create lender"} (status ${res.status})`;
        return;
      }

      msg.textContent = `✅ Created: ${data.lender.email} (${data.lender.businessName} - ${data.lender.branchName})`;
      form.reset();
    } catch (err) {
      console.error(err);
      msg.textContent = "❌ Network/server error";
    }
  });
});
