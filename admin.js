document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
});

document.getElementById("statusText").textContent = "Admin session active ✅";
