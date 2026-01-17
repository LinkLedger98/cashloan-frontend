// frontend/dashboard.js

(function () {
  // -----------------------
  // AUTH GUARD
  // -----------------------
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // -----------------------
  // ELEMENTS
  // -----------------------
  const signedInPill = document.getElementById("signedInPill");
  const logoutBtn = document.getElementById("logoutBtn");

  const addClientForm = document.getElementById("addClientForm");
  const fullNameEl = document.getElementById("fullName");
  const nationalIdEl = document.getElementById("nationalId");
  const statusEl = document.getElementById("status");

  const searchBtn = document.getElementById("searchBtn");
  const searchNationalIdEl = document.getElementById("searchNationalId");
  const resultsDiv = document.getElementById("results");

  const userEmail = localStorage.getItem("userEmail") || "Signed in";
  signedInPill.textContent = userEmail;

  // -----------------------
  // HELPERS
  // -----------------------
  function clearResults() {
    resultsDiv.innerHTML = "";
  }

  function renderMessage(text) {
    clearResults();
    const div = document.createElement("div");
    div.className = "result-item";
    div.textContent = text;
    resultsDiv.appendChild(div);
  }

  function badgeClass(status) {
    if (status === "paid") return "paid";
    if (status === "owing") return "owing";
    if (status === "overdue") return "overdue";
    return "";
  }

  function renderResults(records) {
    clearResults();

    if (!Array.isArray(records) || records.length === 0) {
      renderMessage("No records found.");
      return;
    }

    records.forEach((r) => {
      const item = document.createElement("div");
      item.className = "result-item";

      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.gap = "10px";
      top.style.flexWrap = "wrap";

      const left = document.createElement("div");
      left.innerHTML = `<strong>${r.fullName || "Unknown"}</strong><br>${r.nationalId || ""}`;

      const badge = document.createElement("span");
      badge.className = `badge ${badgeClass(r.status)}`;
      badge.textContent = (r.status || "unknown").toUpperCase();

      top.appendChild(left);
      top.appendChild(badge);

      const small = document.createElement("span");
      small.className = "small";
      small.textContent = `Reported by: ${r.cashloanEmail || "unknown"}`;

      item.appendChild(top);
      item.appendChild(small);

      resultsDiv.appendChild(item);
    });
  }

  // -----------------------
  // LOGOUT
  // -----------------------
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    window.location.href = "login.html";
  });

  // -----------------------
  // ADD CLIENT
  // -----------------------
  addClientForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = fullNameEl.value.trim();
    const nationalId = nationalIdEl.value.trim();
    const status = statusEl.value;

    if (!fullName || !nationalId || !status) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch(`${window.API_BASE_URL}/api/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({ fullName, nationalId, status })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.message || "Failed to save client.");
        return;
      }

      alert("Client saved ✅");
      fullNameEl.value = "";
      nationalIdEl.value = "";
      statusEl.value = "";

      // Optional: auto-search immediately after saving
      searchNationalIdEl.value = nationalId;
      await searchClient();
    } catch (err) {
      console.error(err);
      alert("Cannot connect to server.");
    }
  });

  // -----------------------
  // SEARCH CLIENT
  // -----------------------
  async function searchClient() {
    const nationalId = searchNationalIdEl.value.trim();

    if (!nationalId) {
      alert("Enter a National ID to search.");
      return;
    }

    try {
      const response = await fetch(
        `${window.API_BASE_URL}/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`,
        {
          headers: { Authorization: token }
        }
      );

      const data = await response.json().catch(() => ([]));

      if (!response.ok) {
        alert(data.message || "Search failed.");
        return;
      }

      renderResults(data);
    } catch (err) {
      console.error(err);
      alert("Cannot connect to server.");
    }
  }

  searchBtn.addEventListener("click", searchClient);

  // Enter key triggers search
  searchNationalIdEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchClient();
  });
})();
