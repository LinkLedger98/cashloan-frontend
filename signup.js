(function () {
  const form = document.getElementById("requestForm");
  const msg = document.getElementById("msg");

  function setMsg(t) { if (msg) msg.textContent = t || ""; }

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
    if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");

    const payload = {
      businessName: document.getElementById("businessName").value.trim(),
      branchName: document.getElementById("branchName").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      licenseNo: document.getElementById("licenseNo").value.trim(),
      email: document.getElementById("email").value.trim().toLowerCase(),
      notes: document.getElementById("notes").value.trim()
    };

    setMsg("Sending request...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/public/signup-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.message || "Request failed");
        return;
      }

      setMsg("Request sent ✅ Admin will contact you after review.");
      form.reset();
    } catch (err) {
      console.error(err);
      setMsg("Network error. Try again.");
    }
  });
})();
