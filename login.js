(function () {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");
  const toggleBtn = document.getElementById("togglePw");
  const pw = document.getElementById("password");

  function setMsg(t) {
    if (msg) msg.textContent = t || "";
  }

  // ✅ Show / hide password
  if (toggleBtn && pw) {
    toggleBtn.addEventListener("click", function () {
      const isHidden = pw.type === "password";
      pw.type = isHidden ? "text" : "password";
      toggleBtn.textContent = isHidden ? "Hide" : "Show";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
    if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");

    const email = String(document.getElementById("email").value || "").trim().toLowerCase();
    const password = String(document.getElementById("password").value || "");

    if (!email || !password) {
      setMsg("Email + password required.");
      return;
    }

    setMsg("Signing in...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Login failed");
        return;
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("userRole", (data.role || "lender").toLowerCase());

      // ✅ If approved but needs password setup
      if (data.mustSetPassword === true) {
        window.location.href = "set_password.html";
        return;
      }

      // ✅ Role redirect (FIXED)
      const role = (data.role || "lender").toLowerCase();
      window.location.href = (role === "admin")
        ? "admin_accounts.html"
        : "welcome.html";

    } catch (err) {
      console.error(err);
      setMsg("Network error. Try again.");
    }
  });
})();
