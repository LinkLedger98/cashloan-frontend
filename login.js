document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("loginForm");
  var msg = document.getElementById("msg");
  if (!form) return;

  var API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  if (!API_BASE_URL) {
    if (msg) msg.textContent = "Config not loaded.";
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (msg) msg.textContent = "Logging in...";

    var email = String((document.getElementById("email").value || "")).trim();
    var password = String((document.getElementById("password").value || ""));

    fetch(API_BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        }).catch(function () {
          return { ok: res.ok, status: res.status, data: {} };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          if (msg) msg.textContent = (result.data && result.data.message) ? result.data.message : "Login failed.";
          return;
        }

        var data = result.data || {};
        var role = String(data.role || "").toLowerCase();

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userEmail", data.email || email);

        // If backend didn't send role, still allow admin by email
        if (!role) {
          if (email.toLowerCase() === "admin@linkledger.co.bw" || email.toLowerCase() === "admin2@linkledger.co.bw") {
            role = "admin";
          } else {
            role = "lender";
          }
        }

        localStorage.setItem("userRole", role);

        if (role === "admin") window.location.href = "admin.html";
        else window.location.href = "welcome.html";
      })
      .catch(function () {
        if (msg) msg.textContent = "Network error.";
      });
  });
});
