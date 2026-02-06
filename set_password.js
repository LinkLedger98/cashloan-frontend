(function () {
  const form = document.getElementById("pwForm");
  const msg = document.getElementById("msg");

  function setMsg(t){ if (msg) msg.textContent = t || ""; }

  function toggle(btnId, inputId){
    const b = document.getElementById(btnId);
    const i = document.getElementById(inputId);
    if (!b || !i) return;
    b.addEventListener("click", () => {
      const hidden = i.type === "password";
      i.type = hidden ? "text" : "password";
      b.textContent = hidden ? "Hide" : "Show";
    });
  }
  toggle("toggle1","pw1");
  toggle("toggle2","pw2");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
    const token = localStorage.getItem("authToken");
    if (!API_BASE_URL) return alert("API_BASE_URL missing in config.js");
    if (!token) { alert("Please login again."); window.location.href="login.html"; return; }

    const pw1 = String(document.getElementById("pw1").value || "");
    const pw2 = String(document.getElementById("pw2").value || "");

    if (pw1.length < 8) return setMsg("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setMsg("Passwords do not match.");

    setMsg("Saving...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization": token },
        body: JSON.stringify({ newPassword: pw1 })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.message || "Failed");

      setMsg("Password saved ✅ Redirecting...");
      setTimeout(() => window.location.href = "welcome.html", 700);
    } catch (err) {
      console.error(err);
      setMsg("Network error");
    }
  });
})();
