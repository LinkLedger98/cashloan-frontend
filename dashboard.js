// ------------------------
// Auth helpers
// ------------------------
function getToken() {
  return localStorage.getItem("authToken");
}

function getUserEmail() {
  return localStorage.getItem("userEmail");
}

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  window.location.href = "login.html";
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

// If token expires or backend rejects it, handle it cleanly
function handleAuthFailure() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  alert("Your session expired. Please log in again.");
  window.location.href = "login.html";
}

// Wrap fetch so we consistently handle 401/403
async function apiFetch(url, options) {
  const res = await fetch(url, options);

  if (res.status === 401 || res.status === 403) {
    handleAuthFailure();
    // stop further code
    throw new Error("Unauthorized");
  }

  return res;
}

// ------------------------
// UI init (email pill + admin link)
// ------------------------
function initTopbar() {
  const email = getUserEmail() || "";
  const emailPill = document.getElementById("emailPill");
  const adminLink = document.getElementById("adminLink");

  if (emailPill) {
    emailPill.textContent = email ? ("Logged in as: " + email) : "Logged in";
  }

  // Simple admin check (MVP)
  // Change this email to your real admin account later if needed.
  if (adminLink) {
    if (email && email.toLowerCase() === "admin@linkledger.co.bw") {
      adminLink.style.display = "inline-flex";
    } else {
      adminLink.style.display = "none";
    }
  }
}

// ------------------------
// Core actions
// ------------------------
async function addClient() {
  if (!requireLogin()) return;

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) {
    alert("Config not loaded. Check config.js");
    return;
  }

  if (!fullName || !nationalId || !status) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await apiFetch(API_BASE_URL + "/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ fullName: fullName, nationalId: nationalId, status: status })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Failed to add borrower");
      return;
    }

    alert("Borrower added successfully");

    document.getElementById("fullName").value = "";
    document.getElementById("nationalId").value = "";
    document.getElementById("status").value = "paid";
  } catch (err) {
    // apiFetch already handles 401/403
    console.error(err);
    if (String(err && err.message) !== "Unauthorized") {
      alert("Server error while adding borrower");
    }
  }
}

async function searchClient() {
  if (!requireLogin()) return;

  const nationalId = document.getElementById("searchNationalId").value.trim();
  const resultsDiv = document.getElementById("results");

  const API_BASE_URL = window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL;
  const token = getToken();

  if (!API_BASE_URL) {
    alert("Config not loaded. Check config.js");
    return;
  }

  if (!nationalId) {
    alert("Enter National ID");
    return;
  }

  resultsDiv.innerHTML = "Searching...";

  try {
    const res = await apiFetch(
      API_BASE_URL + "/api/clients/search?nationalId=" + encodeURIComponent(nationalId),
      {
        headers: { "Authorization": token }
      }
    );

    const data = await res.json().catch(() => []);

    if (!res.ok) {
      resultsDiv.innerHTML = "";
      alert((data && data.message) || "Search failed");
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      resultsDiv.innerHTML = "<p class='small'>No records found</p>";
      return;
    }

    resultsDiv.innerHTML = "";

    data.forEach(function (r) {
      const item = document.createElement("div");
      item.className = "result-item";
      item.innerHTML =
        "<div><strong>" + (r.fullName || "Unknown") + "</strong> (" + (r.nationalId || "") + ")</div>" +
        "<div>Status: <span class='badge " + (r.status || "") + "'>" + (r.status || "") + "</span></div>" +
        "<div class='small'>Reported by: " + (r.cashloanEmail || r.userEmail || "Unknown") + "</div>";

      resultsDiv.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = "";
    if (String(err && err.message) !== "Unauthorized") {
      alert("Server error while searching");
    }
  }
}

// ------------------------
// Expose for HTML buttons
// ------------------------
window.addClient = addClient;
window.searchClient = searchClient;
window.logout = logout;

// ------------------------
// Boot
// ------------------------
if (requireLogin()) {
  initTopbar();
}
