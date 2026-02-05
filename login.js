document.addEventListener("DOMContentLoaded", function () {
  console.log("login loaded");

  var form = document.getElementById("loginForm");
  var msg = document.getElementById("msg");

  // show/hide password button
  var toggle = document.getElementById("togglePwdBtn");
  var pwd = document.getElementById("password");
  if (toggle && pwd) {
    toggle.addEventListener("click", function () {
      var isHidden = pwd.type === "password";
      pwd.type = isHidden ? "text" : "password";
      toggle.textContent = isHidden ? "Hide" : "Show";
    });
  }

  if (!form) return;

  if (!window.APP_CONFIG || !window.APP_CONFIG.API_BASE_URL) {
    console.error("APP_CONFIG missing");
    if (msg) msg.textContent = "Config not loaded.";
    return;
  }

  var API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("submit intercepted");

    if (msg) msg.textContent = "Logging in...";

    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;

    fetch(API_BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data };
        }).catch(function () {
          return { status: res.status, data: {} };
        });
      })
      .then(function (result) {
        console.log("login response", result);

        if (result.status !== 200) {
          if (msg) msg.textContent =
            (result.data && result.data.message) ? result.data.message : "Login failed.";
          return;
        }

        // save token + identity
        localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("userEmail", (result.data.email || email));
        localStorage.setItem("userRole", String(result.data.role || "lender").toLowerCase());

        // ✅ redirect based on role
        var role = String(result.data.role || "lender").toLowerCase();
        if (role === "admin") {
          window.location.href = "admin.html";
          return;
        }

        window.location.href = "welcome.html";
      })
      .catch(function (err) {
        console.error(err);
        if (msg) msg.textContent = "Network error.";
      });
  });
});
