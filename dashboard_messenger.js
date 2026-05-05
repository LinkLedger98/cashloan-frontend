(function () {
  let isOpen = false;
  let selectedFile = null;
  let typingTimer = null;
  let refreshTimer = null;
  let isSending = false;
  let profileLogoUrl = "";
  let lastMessagesSignature = "";

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
          <button id="ll-logo-upload" type="button" title="Upload display picture">🖼️</button>
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
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.txt,.csv,.xlsx"
        />

        <input id="ll-chat-input" placeholder="Type message..." />
        <button id="ll-chat-send" type="button">
          <svg viewBox="0 0 24 24" class="ll-send-icon">
            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" />
          </svg>
        </button>
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
    startAutoRefresh();
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

  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);

    refreshTimer = setInterval(function () {
      if (isOpen && !isSending) {
        loadMessages(false);
      }
    }, 5000);
  }

  function isPreviewableImage(urlOrName) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(String(urlOrName || "").split("?")[0]);
  }

  function isHeicFile(urlOrName) {
    return /\.(heic|heif)$/i.test(String(urlOrName || "").split("?")[0]);
  }

  function getAttachmentIcon(fileName) {
    const name = String(fileName || "").toLowerCase();

    if (name.endsWith(".pdf")) return "📄";
    if (name.endsWith(".doc") || name.endsWith(".docx")) return "📝";
    if (name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊";
    if (name.endsWith(".txt")) return "📃";
    if (isHeicFile(name)) return "🖼️";

    return "📎";
  }

  function getMessagesSignature(messages) {
    return messages.map((m) => {
      return [
        m._id || m.id || "",
        m.createdAt || "",
        m.updatedAt || "",
        m.message || "",
        m.senderRole || "",
        m.attachment && m.attachment.fileUrl ? m.attachment.fileUrl : ""
      ].join("|");
    }).join("~");
  }

  function getLogoFromPayload(payload) {
    return (
      payload?.logo?.url ||
      payload?.data?.logo?.url ||
      payload?.user?.logo?.url ||
      payload?.item?.logo?.url ||
      payload?.profile?.logo?.url ||
      payload?.data?.data?.logo?.url ||
      ""
    );
  }

  function hasRealProfileLogo() {
    const logo = String(profileLogoUrl || "").trim();
    return logo && logo !== "./assets/logo.png" && logo !== "assets/logo.png";
  }

  function getAvatarHtml(isMine) {
    if (isMine && hasRealProfileLogo()) {
      return `
        <img
          class="ll-msg-avatar ll-msg-avatar-img"
          src="${escapeAttr(profileLogoUrl)}"
          alt="Display picture"
          onerror="this.outerHTML='<div class=&quot;ll-msg-avatar ll-user-avatar&quot;>👤</div>'"
        />
      `;
    }

    if (isMine) {
      return `<div class="ll-msg-avatar ll-user-avatar">👤</div>`;
    }

    return `
      <img
        class="ll-msg-avatar ll-msg-avatar-img"
        src="./assets/logo.png"
        alt="LinkLedger Support"
        onerror="this.style.display='none'"
      />
    `;
  }

  function renderAttachmentHtml(attachment) {
    if (!attachment || !attachment.fileUrl) return "";

    const fileUrl = attachment.fileUrl;
    const fileName = attachment.fileName || "Open attachment";

    if (isPreviewableImage(fileUrl) || isPreviewableImage(fileName)) {
      return `
        <a class="ll-image-link" href="${escapeAttr(fileUrl)}" target="_blank" rel="noopener">
          <img
            class="ll-chat-image-preview"
            src="${escapeAttr(fileUrl)}"
            alt="${escapeAttr(fileName)}"
            loading="lazy"
          />
        </a>
      `;
    }

    return `
      <a class="ll-attachment" href="${escapeAttr(fileUrl)}" target="_blank" rel="noopener">
        ${getAttachmentIcon(fileName)} ${escapeHtml(fileName)}
      </a>
    `;
  }

  function renderFilePreview() {
    const preview = document.getElementById("ll-file-preview");
    if (!preview) return;

    if (!selectedFile) {
      preview.style.display = "none";
      preview.innerHTML = "";
      return;
    }

    const fileName = selectedFile.name || "Selected file";
    const canPreview = isPreviewableImage(fileName);
    const tempUrl = canPreview ? URL.createObjectURL(selectedFile) : "";

    preview.style.display = "flex";

    preview.innerHTML = `
      <div class="ll-selected-file">
        ${
          canPreview
            ? `
              <img
                class="ll-selected-file-img"
                src="${escapeAttr(tempUrl)}"
                alt="${escapeAttr(fileName)}"
              />
            `
            : `
              <span class="ll-selected-file-icon">${getAttachmentIcon(fileName)}</span>
            `
        }

        <span>${escapeHtml(fileName)}</span>
      </div>

      <button id="ll-remove-file" type="button">Remove</button>
    `;

    document.getElementById("ll-remove-file").onclick = function () {
      selectedFile = null;

      const fileInput = document.getElementById("ll-chat-file");
      if (fileInput) fileInput.value = "";

      renderFilePreview();
    };
  }

  async function loadMessages(forceScroll = true) {
    try {
      const r = await fetchJson("/api/messages/mine");
      const messages = Array.isArray(r.data) ? r.data : [];
      const box = document.getElementById("ll-chat-messages");
      if (!box) return;

      const signature = getMessagesSignature(messages);

      if (signature === lastMessagesSignature && box.dataset.loaded === "1") {
        updateRedDot(messages);
        return;
      }

      lastMessagesSignature = signature;

      const wasNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;

      box.innerHTML = "";

      if (!messages.length) {
        box.innerHTML = `
          <div class="ll-empty-chat">
            No messages yet. Send LinkLedger Support a message.
          </div>
        `;
        box.dataset.loaded = "1";
        updateRedDot(messages);
        return;
      }

      messages.forEach((m, index) => {
        const isMine = m.senderRole === "lender";
        const div = document.createElement("div");

        div.className = isMine ? "ll-msg me" : "ll-msg admin";
        div.style.animationDelay = box.dataset.loaded === "1" ? "0ms" : `${Math.min(index * 35, 350)}ms`;

        const timeText = formatTime(m.sentAt || m.createdAt);
        const attachmentHtml = renderAttachmentHtml(m.attachment);

        div.innerHTML = `
          ${getAvatarHtml(isMine)}

          <div class="ll-bubble">
            <div class="ll-glass-shine"></div>

            <div class="ll-msg-meta">
              <span>${isMine ? "You" : "LinkLedger Support"}</span>
              <span>${escapeHtml(timeText)}</span>
            </div>

            ${
              m.message
                ? `<div class="ll-msg-text">${escapeHtml(m.message)}</div>`
                : ""
            }

            ${attachmentHtml}

            <div class="ll-locked">🔒</div>
          </div>
        `;

        box.appendChild(div);
      });

      box.dataset.loaded = "1";

      if (forceScroll || wasNearBottom) {
        box.scrollTop = box.scrollHeight;
      }

      updateRedDot(messages);

    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err);
    }
  }

  function setSendingState(state) {
    isSending = state;

    const btn = document.getElementById("ll-chat-send");
    const input = document.getElementById("ll-chat-input");
    const attach = document.getElementById("ll-chat-attach");

   if (btn) {
  btn.disabled = state;
}

    if (input) input.disabled = state;
    if (attach) attach.disabled = state;
  }

  async function sendMessage() {
    if (isSending) return;

    const input = document.getElementById("ll-chat-input");

    if (!input) return;

    const text = String(input.value || "").trim();

    if (!text && !selectedFile) {
      alert("Please type a message or attach a file before sending.");
      return;
    }

    try {
      setSendingState(true);

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
      hideTyping();
      await loadMessages(true);

    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      alert("Message failed to send.");
    } finally {
      setSendingState(false);
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
        alert((data && data.message) || "Display picture upload failed");
        return;
      }

      const uploadedLogo = getLogoFromPayload(data);
      if (uploadedLogo) {
        profileLogoUrl = uploadedLogo;
      }

      lastMessagesSignature = "";
      await loadProfileLogo();
      await loadMessages(true);

      alert("Display picture updated ✅");

    } catch (err) {
      console.error("UPLOAD LOGO ERROR:", err);
      alert("Upload error");
    }
  }

  async function loadProfileLogo() {
    try {
      const r = await fetchJson("/api/profile/me");
      const logo = getLogoFromPayload(r.data);

      profileLogoUrl = logo || "";

      const img = document.getElementById("ll-dynamic-logo");
      if (img) img.src = "./assets/logo.png";

      lastMessagesSignature = "";

    } catch (err) {
      profileLogoUrl = "";
      console.error("LOGO LOAD FAILED:", err);

      const img = document.getElementById("ll-dynamic-logo");
      if (img) img.src = "./assets/logo.png";
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

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  document.addEventListener("DOMContentLoaded", function () {
    createFloatingButton();
    createMessengerUI();
  });
})();