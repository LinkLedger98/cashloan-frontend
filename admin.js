function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}

(function () {
  const API = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = localStorage.getItem("authToken");
  const role = (localStorage.getItem("userRole") || "").toLowerCase();

  if (!API) {
    alert("Config missing (config.js not loaded)");
    return;
  }

  // ✅ Protect page
  if (!token) {
    alert("Please log in first.");
    window.location.href = "login.html";
    return;
  }
  if (role !== "admin") {
    alert("Admins only.");
    window.location.href = "welcome.html";
    return;
  }

  const form = document.getElementById("adminForm");
  const msg = document.getElementById("msg");
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "Creating lender...";

    const payload = {
      businessName: String(document.getElementById("businessName").value || "").trim(),
      branchName: String(document.getElementById("branchName").value || "").trim(),
      phone: String(document.getElementById("phone").value || "").trim(),
      licenseNo: String(document.getElementById("licenseNo").value || "").trim(),
      email: String(document.getElementById("email").value || "").toLowerCase().trim(),
      tempPassword: String(document.getElementById("tempPassword").value || "").trim()
    };

    try {
      const res = await fetch(API + "/api/admin/lenders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (msg) msg.textContent = data.message || ("Request failed (" + res.status + ")");
        return;
      }

      if (msg) msg.textContent = "✅ Lender created successfully";

      // clear form
      form.reset();
    } catch (err) {
      console.error(err);
      if (msg) msg.textContent = "Network/server error.";
    }
  });
})();
