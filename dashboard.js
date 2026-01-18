const token = localStorage.getItem("authToken");

if (!token) {
  alert("Please log in first");
  window.location.href = "login.html";
}

async function addClient(e) {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const nationalId = document.getElementById("nationalId").value.trim();
  const status = document.getElementById("status").value;

  const response = await fetch(window.API_BASE + "/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ fullName, nationalId, status })
  });

  const data = await response.json();

  if (!response.ok) {
    alert(data.message || "Failed to add client");
    return;
  }

  alert("Client added successfully");
  document.getElementById("clientForm").reset();
}

async function searchClient() {
  const nationalId = document.getElementById("searchNationalId").value.trim();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!nationalId) {
    alert("Enter National ID");
    return;
  }

  const response = await fetch(
    window.API_BASE + "/api/clients/search?nationalId=" + encodeURIComponent(nationalId),
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json();

  if (!response.ok || data.length === 0) {
    resultsDiv.innerHTML = "<p>No records found</p>";
    return;
  }

  data.forEach(record => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <strong>${record.fullName}</strong><br>
      Status: ${record.status}<br>
      Cashloan: ${record.cashloanEmail}
    `;
    resultsDiv.appendChild(div);
  });
}

document.getElementById("clientForm").addEventListener("submit", addClient);
