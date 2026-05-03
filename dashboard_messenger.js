(function () {
  let isOpen = false;
  let selectedFile = null;
  let typingTimer = null;

  function getApiBaseUrl() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || window.API_BASE || "";
  }

  function getToken() {
    return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  }

  async function fetchJson(path, options = {}) {
    const API_BASE_URL = getApiBaseUrl();
    const token = getToken();

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error((data && data.message) || "Request failed");
    }

    return { data, res };
  }

  function createMessengerUI() {
    const box = document.createElement("div");
    box.id = "ll-chat-box";
    box.style.display = "none";

    box.innerHTML = `
      <div id="ll-chat-header">
        <div class="ll-chat-brand">
          <img id="ll-dynamic-logo" src="./assets/logo.png" class="ll-chat-logo" alt="Logo" />
          <div>
            <b>LinkLedger Support</b>
            <div class="ll-chat-status">Online support</div>
          </div>
        </div>

        <input id="ll-logo-input" type="file" accept="image/*" style="display:none;" />

        <div class="ll-chat-header-actions">
          <button id="ll-logo-upload" type="button" title="Upload Logo">🖼️</button>
          <button id="ll-chat-expand" type="button" title="Expand">⛶</button>
          <button id="ll-chat-toggle" type="button" title="Minimize">—</button>
        </div>
      </div>

      <div id="ll-chat-messages"></div>

      <div id="ll-typing" style="display:none;">
        <span></span><span></span><span></span>
        <em>Typing...</em>
      </div>

      <div id="ll-file-preview" style="display:none;"></div>

      <div id="ll-chat-input-wrap">
        <button id="ll-chat-attach" type="button" title="Attach file">📎</button>

        <input
          id="ll-chat-file"
          type="file"
          style="display:none;"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.xlsx"
        />

        <input id="ll-chat-input" placeholder="Type message..." />
        <button id="ll-chat-send" type="button">Send</button>
      </div>
    `;

    document.body.appendChild(box);

    document.getElementById("ll-chat-toggle").onclick = toggleChat;
    document.getElementById("ll-chat-expand").onclick = toggleExpand;
    document.getElementById("ll-chat-send").onclick = sendMessage;

    document.getElementById("ll-logo-upload").onclick = function () {
      document.getElementById("ll-logo-input").click();
    };

    document.getElementById("ll-logo-input").onchange = function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) uploadLogo(file);
    };

    document.getElementById("ll-chat-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    document.getElementById("ll-chat-input").addEventListener("input", function () {
      showTyping();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(hideTyping, 800);
    });

    document.getElementById("ll-chat-attach").onclick = function () {
      document.getElementById("ll-chat-file").click();
    };

    document.getElementById("ll-chat-file").onchange = function (e) {
      selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      renderFilePreview();
    };

    loadMessages();
    loadProfileLogo();
  }

  function createFloatingButton() {
    const btn = document.createElement("div");
    btn.id = "ll-chat-button";
    btn.innerHTML = `
      <span class="ll-chat-icon">💬</span>
      <span id="ll-chat-red-dot" style="display:none;"></span>
    `;
    btn.onclick = toggleChat;
    document.body.appendChild(btn);
  }

  function toggleChat() {
    const box = document.getElementById("ll-chat-box");
    if (!box) return;

    isOpen = !isOpen;
    box.style.display = isOpen ? "flex" : "none";

    if (isOpen) loadMessages();
  }

  function toggleExpand() {
    const box = document.getElementById("ll-chat-box");
    if (box) box.classList.toggle("expanded");
  }

  function renderFilePreview() {
    const preview = document.getElementById("ll-file-preview");
    if (!preview) return;

    if (!selectedFile) {
      preview.style.display = "none";
      preview.innerHTML = "";
      return;
    }

    preview.style.display = "flex";
    preview.innerHTML = `
      <span>📎 ${escapeHtml(selectedFile.name)}</span>
      <button id="ll-remove-file" type="button">Remove</button>
    `;

    document.getElementById("ll-remove-file").onclick = function () {
      selectedFile = null;
      const fileInput = document.getElementById("ll-chat-file");
      if (fileInput) fileInput.value = "";
      renderFilePreview();
    };
  }

  async function loadMessages() {
    try {
      const r = await fetchJson("/api/messages/mine");
      const messages = Array.isArray(r.data) ? r.data : [];
      const box = document.getElementById("ll-chat-messages");
      if (!box) return;

      box.innerHTML = "";

      if (!messages.length) {
        box.innerHTML = `
          <div class="ll-empty-chat">
            No messages yet. Send LinkLedger Support a message.
          </div>
        `;
        updateRedDot(messages);
        return;
      }

      messages.forEach((m, index) => {
        const isMine = m.senderRole === "lender";
        const div = document.createElement("div");

        div.className = isMine ? "ll-msg me" : "ll-msg admin";
        div.style.animationDelay = `${Math.min(index * 35, 350)}ms`;

        const fileUrl = m.attachment && m.attachment.fileUrl ? m.attachment.fileUrl : "";
        const fileName = m.attachment && m.attachment.fileName ? m.attachment.fileName : "";
        const timeText = formatTime(m.sentAt || m.createdAt);

        div.innerHTML = `
          <div class="ll-bubble">
            <div class="ll-glass-shine"></div>

            <div class="ll-msg-meta">
              <span>${isMine ? "You" : "LinkLedger Support"}</span>
              <span>${escapeHtml(timeText)}</span>
            </div>

            <div class="ll-msg-text">${escapeHtml(m.message || "")}</div>

            ${
              fileUrl
                ? `
                  <a class="ll-attachment" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener">
                    📎 ${escapeHtml(fileName || "Open attachment")}
                  </a>
                `
                : ""
            }

            <div class="ll-locked">🔒</div>
          </div>
        `;

        box.appendChild(div);
      });

      box.scrollTop = box.scrollHeight;
      updateRedDot(messages);

    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err);
    }
  }

  async function sendMessage() {
    const input = document.getElementById("ll-chat-input");
    if (!input) return;

    const text = String(input.value || "").trim();

    if (!text) {
      alert("Please type a message before sending.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("message", text);
      fd.append("category", "general");

      if (selectedFile) fd.append("attachment", selectedFile);

      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();

      const res = await fetch(`${API_BASE_URL}/api/messages/mine`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: fd
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert((data && data.message) || "Failed to send message");
        return;
      }

      input.value = "";
      selectedFile = null;

      const fileInput = document.getElementById("ll-chat-file");
      if (fileInput) fileInput.value = "";

      renderFilePreview();

      showTyping();

      setTimeout(function () {
        hideTyping();
        loadMessages();
      }, 650);

    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      alert("Message failed to send.");
    }
  }

  async function uploadLogo(file) {
    try {
      const fd = new FormData();
      fd.append("logo", file);

      const API_BASE_URL = getApiBaseUrl();
      const token = getToken();

      const res = await fetch(`${API_BASE_URL}/api/profile/logo`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: fd
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert((data && data.message) || "Logo upload failed");
        return;
      }

      alert("Logo updated ✅");
      loadProfileLogo();

    } catch (err) {
      console.error("UPLOAD LOGO ERROR:", err);
      alert("Upload error");
    }
  }

  async function loadProfileLogo() {
    try {
      const r = await fetchJson("/api/profile/me");

      const logo =
        r.data &&
        r.data.data &&
        r.data.data.logo &&
        r.data.data.logo.url
          ? r.data.data.logo.url
          : "./assets/logo.png";

      const img = document.getElementById("ll-dynamic-logo");
      if (img) img.src = logo;

    } catch (err) {
      console.error("LOGO LOAD FAILED:", err);
    }
  }

  function showTyping() {
    const el = document.getElementById("ll-typing");
    if (el) el.style.display = "flex";
  }

  function hideTyping() {
    const el = document.getElementById("ll-typing");
    if (el) el.style.display = "none";
  }

  function updateRedDot(messages) {
    const dot = document.getElementById("ll-chat-red-dot");
    if (!dot) return;

    const hasUnread = messages.some((m) => m.readByLender === false);
    dot.style.display = hasUnread && !isOpen ? "block" : "none";
  }

  function formatTime(value) {
    if (!value) return "";

    const d = new Date(value);

    return d.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.addEventListener("DOMContentLoaded", function () {
    createFloatingButton();
    createMessengerUI();
  });
})();