document.addEventListener("DOMContentLoaded", function () {
  console.log("login loaded");

  var form = document.getElementById("loginForm");
  var msg = document.getElementById("msg");

  if (!form) {
    console.error("loginForm not found");
    return;
  }

  if (!window.APP_CONFIG || !window.APP_CONFIG.API_BASE_URL) {
    console.error("APP_CONFIG missing");
    if (msg) msg.textContent = "Config not loaded. Please refresh.";
    return;
  }

  var API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("submit intercepted");

    if (msg) msg.textContent = "Logging in...";

    var emailEl = document.getElementById("email");
    var passEl = document.getElementById("password");

    var email = emailEl ? String(emailEl.value || "").trim() : "";
    var password = passEl ? String(passEl.value || "") : "";

    if (!email || !password) {
      if (msg) msg.textContent = "Email and password required.";
      return;
    }

    fetch(API_BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (res) {
        return res
          .json()
          .then(function (data) {
            return { status: res.status, data: data };
          })
          .catch(function () {
            return { status: res.status, data: {} };
          });
      })
      .then(function (result) {
        console.log("login response", result);

        // Not successful
        if (result.status !== 200) {
          var m =
            (result.data && result.data.message)
              ? result.data.message
              : "Login failed.";
          if (msg) msg.textContent = m;
          return;
        }

        // Successful
        var data = result.data || {};
        var role = String(data.role || "lender").toLowerCase();

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userEmail", data.email || email);
        localStorage.setItem("userRole", role);

        // Redirect based on role
        if (role === "admin") {
          window.location.href = "admin.html";
        } else {
          window.location.href = "welcome.html";
        }
      })
      .catch(function (err) {
        console.error("Login network error:", err);
        if (msg) msg.textContent = "Network error. Please try again.";
      });
  });
});
