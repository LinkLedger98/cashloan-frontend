// dashboard.js
function getTokenOrRedirect() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("Please log in first");
    window.location.href = "login.html";
    return null;
  }
  return token;
}

async function addClient(e) {
  e.preventDefault();

  const token = getTokenOrRedirect();
  if (!token) return;

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;

  try {
    const response = await fetch(`${API_BASE}/api/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ fullName, nationalId, status })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data.message || "Failed to add client");
      return;
    }

    alert("Client added successfully");
    document.getElementById("clientForm").reset();
  } catch (err) {
    console.error(err);
    alert("Cannot connect to backend");
  }
}

async function searchClient() {
  const token = getTokenOrRedirect();
  if (!token) return;

  const nationalId = document.getElementById("searchNationalId").value.trim();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!nationalId) {
    alert("Enter National ID");
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await response.json().catch(() => ([]));

    if (!response.ok) {
      alert(data.message || "Search failed");
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      resultsDiv.innerHTML = "<p>No records found</p>";
      return;
    }

    data.forEach((record) => {
      const div = document.createElement("div");
      div.className = "result-item";

      div.innerHTML = `
        <div><strong>${record.fullName}</strong></div>
        <div class="badge ${record.status}">${record.status.toUpperCase()}</div>
        <span class="small">${record.cashloanEmail}</span>
      `;

      resultsDiv.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    alert("Cannot connect to backend");
  }
}

// Hook form submit once page loads
window.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("clientForm");
  if (form) form.addEventListener("submit", addClient);
});
