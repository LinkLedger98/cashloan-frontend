document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("adminForm");
  var msg = document.getElementById("msg");

  if (!form) return;

  var API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : "";

  function setMsg(text, ok) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = ok ? "#22c55e" : "#ff4d4d";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var adminKey = document.getElementById("adminKey").value.trim();
    var businessName = document.getElementById("businessName").value.trim();
    var branchName = document.getElementById("branchName").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var licenseNo = document.getElementById("licenseNo").value.trim();
    var email = document.getElementById("email").value.trim();
    var tempPassword = document.getElementById("tempPassword").value;

    if (!adminKey || !businessName || !branchName || !phone || !licenseNo || !email || !tempPassword) {
      setMsg("Please fill all fields.", false);
      return;
    }

    if (!API_BASE_URL) {
      setMsg("API_BASE_URL missing. Check config.js", false);
      return;
    }

    setMsg("Creating lender...", true);

    fetch(API_BASE_URL + "/api/admin/lenders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({
        businessName: businessName,
        branchName: branchName,
        phone: phone,
        licenseNo: licenseNo,
        email: email,
        password: tempPassword
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status !== 201 && result.status !== 200) {
          var errMsg = (result.data && result.data.message) ? result.data.message : "Failed to create lender";
          setMsg("❌ " + errMsg + " (status " + result.status + ")", false);
          return;
        }

        setMsg("✅ Lender created successfully!", true);

        // Clear fields except admin key
        document.getElementById("businessName").value = "";
        document.getElementById("branchName").value = "";
        document.getElementById("phone").value = "";
        document.getElementById("licenseNo").value = "";
        document.getElementById("email").value = "";
        document.getElementById("tempPassword").value = "";
      })
      .catch(function (err) {
        console.error(err);
        setMsg("❌ Network/server error. Check backend logs.", false);
      });
  });
});
