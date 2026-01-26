document.addEventListener("DOMContentLoaded", function () {
  console.log("login loaded");

  var form = document.getElementById("loginForm");
  var msg = document.getElementById("msg");

  if (!form) {
    console.log("No form found");
    return;
  }

  if (!window.APP_CONFIG || !window.APP_CONFIG.API_BASE_URL) {
    console.log("Config missing");
    if (msg) msg.textContent = "Config not loaded. Check config.js";
    return;
  }

  var API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("submit intercepted");

    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    if (msg) msg.textContent = "Logging in...";

    fetch(API_BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .then(function (result) {
        console.log("login response", result);

        if (result.status !== 200) {
          if (msg) msg.textContent = (result.data && result.data.message) ? result.data.message : "Login failed";
          return;
        }

        if (!result.data || !result.data.token) {
          if (msg) msg.textContent = "Login succeeded but token missing (backend response mismatch).";
          return;
        }

        localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("userEmail", (result.data.email || email));

        window.location.href = "welcome.html";
      })
      .catch(function (err) {
        console.error(err);
        if (msg) msg.textContent = "Network error";
      });
  });
});
