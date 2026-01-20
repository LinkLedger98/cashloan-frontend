document.addEventListener("DOMContentLoaded", function () {
  console.log("login.js loaded");

  var form = document.getElementById("loginForm");
  var msg = document.getElementById("msg");

  if (!form) {
    console.error("loginForm not found");
    return;
  }

  if (!window.APP_CONFIG || !window.APP_CONFIG.API_BASE_URL) {
    msg.textContent = "Config missing";
    return;
  }

  var API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("submit intercepted");

    msg.textContent = "Logging in...";

    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;

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
        if (result.status !== 200) {
          msg.textContent = result.data.message || "Login failed";
          return;
        }

        localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("userEmail", result.data.email || email);

        window.location.href = "dashboard.html";
      })
      .catch(function (err) {
        console.error(err);
        msg.textContent = "Network error";
      });
  });
});
