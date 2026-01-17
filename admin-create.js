const API_BASE = "https://cashloan-backend.onrender.com";
const token = localStorage.getItem("authToken");

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
});

document.getElementById("createForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");
  msg.textContent = "";

  try {
    const response = await fetch(`${API_BASE}/api/admin/create-cashloan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      msg.textContent = data.message || "Failed to create cashloan";
      return;
    }

    msg.textContent = "Cashloan created successfully ✅";
    document.getElementById("createForm").reset();
  } catch (err) {
    console.error(err);
    msg.textContent = "Cannot connect to server";
  }
});
