// frontend/register.js
document.getElementById("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data.message || "Registration failed");
      return;
    }

    alert("Cashloan account created successfully!");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Register error:", error);
    alert("Cannot connect to server");
  }
});
