(function () {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;

  if (!API_BASE_URL) {
    if (msg) msg.textContent = "Config missing (API_BASE_URL).";
    return;
  }

  function setMsg(t) {
    if (msg) msg.textContent = t || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const email = String(document.getElementById("email").value || "").trim();
    const password = String(document.getElementById("password").value || "").trim();

    if (!email || !password) {
      setMsg("Email and password required.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Login failed.");
        return;
      }

      // Save session
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userEmail", data.email || email);
      localStorage.setItem("userRole", String(data.role || "lender").toLowerCase());

      // Redirect by role
      const role = String(data.role || "lender").toLowerCase();
      if (role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "welcome.html";
      }
    } catch (err) {
      console.error(err);
      setMsg("Network error. Try again.");
    }
  });
})();
