document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("signupRequestForm");
  const msg = document.getElementById("msg");

  if (!form) return;

  function setMsg(text, ok) {
    if (!msg) return;
    msg.textContent = text || "";
    msg.style.color = ok ? "#5CFFB0" : "#FF7A7A";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    setMsg("Submitting...", true);

    const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
    if (!API_BASE_URL) {
      setMsg("Config missing. Please refresh.", false);
      return;
    }

    const payload = {
      businessName: document.getElementById("businessName").value.trim(),
      branchName: document.getElementById("branchName").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      licenseNo: document.getElementById("licenseNo").value.trim(),
      email: document.getElementById("email").value.trim(),
      notes: document.getElementById("notes").value.trim()
    };

    if (!payload.businessName || !payload.branchName || !payload.phone || !payload.licenseNo || !payload.email) {
      setMsg("Please fill all required fields.", false);
      return;
    }

    try {
      const res = await fetch(API_BASE_URL + "/api/requests/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setMsg(data.message || "A request is already pending for this email.", false);
        return;
      }

      if (!res.ok) {
        setMsg(data.message || "Request failed.", false);
        return;
      }

      setMsg("Request submitted ✅ Admin will contact you.", true);
      form.reset();
    } catch (err) {
      console.error(err);
      setMsg("Network error. Try again.", false);
    }
  });
});
