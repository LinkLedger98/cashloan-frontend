/********************************
 * AUTH HELPERS
 ********************************/
function getToken() {
  return localStorage.getItem("authToken");
}

function requireLogin() {
  const token = getToken();
  if (!token) {
    alert("Please log in first");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/********************************
 * CONFIG CHECK
 ********************************/
const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL;

if (!API_BASE_URL) {
  alert("Configuration error: API_BASE_URL not found. Check config.js path and script order.");
  throw new Error("APP_CONFIG missing");
}

/********************************
 * CLIENT ACTIONS
 ********************************/
async function addClient() {
  if (!requireLogin()) return;

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;
  const token = getToken();

  if (!fullName || !nationalId || !status) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ fullName, nationalId, status })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Failed to add client");
      return;
    }

    alert("Client added successfully");
    document.getElementById("fullName").value = "";
    document.getElementById("nationalId").value = "";
    document.getElementById("status").value = "paid";
  } catch (err) {
    console.error(err);
    alert("Server error while adding client");
  }
}

async function searchClient() {
  if (!requireLogin()) return;

  const nationalId = document.getElementById("searchNationalId").value.trim();
  const resultsDiv = document.getElementById("results");
  const token = getToken();

  if (!nationalId) {
    alert("Enter National ID");
    return;
  }

  resultsDiv.innerHTML = "Searching...";

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    const data = await res.json().catch(() => []);

    if (!res.ok) {
      resultsDiv.innerHTML = "";
      alert(data.message || "Search failed");
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      resultsDiv.innerHTML = "<p>No records found</p>";
      return;
    }

    resultsDiv.innerHTML = "";
    data.forEach((r) => {
      const item = document.createElement("div");
      item.className = "result-item";
      item.innerHTML = `
        <div><strong>${r.fullName}</strong> (${r.nationalId})</div>
        <div>Status: <span class="badge ${r.status}">${r.status}</span></div>
        <div class="small">Reported by: ${r.cashloanEmail}</div>
      `;
      resultsDiv.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = "";
    alert("Server error while searching");
  }
}

/********************************
 * LOGOUT
 ********************************/
function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail"); // ✅ correct key
  window.location.href = "login.html";
}

/********************************
 * EXPOSE TO HTML
 ********************************/
window.addClient = addClient;
window.searchClient = searchClient;
window.logout = logout;

/********************************
 * PAGE GUARD
 ********************************/
requireLogin();
