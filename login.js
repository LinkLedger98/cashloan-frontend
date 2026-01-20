document.addEventListener("DOMContentLoaded", function () {
  console.log("login loaded");
  var form = document.getElementById("loginForm");
  var msg = document.getElementById("msg");
  if (!form) return;
  if (!window.APP_CONFIG) return;
  var API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("submit intercepted");
    if (msg) msg.textContent = "Logging in...";
    var email = document.getElementById("email").value;
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
          if (msg) msg.textContent = (result.data && result.data.message) ? result.data.message : "Login failed";
          return;
        }
        localStorage.setItem("authToken", result.data.token);
        localStorage.setItem("userEmail", (result.data && result.data.email) ? result.data.email : email);
        window.location.href = "dashboard.html";
      })
      .catch(function (err) {
        console.error(err);
        if (msg) msg.textContent = "Network error";
      });
  });
});