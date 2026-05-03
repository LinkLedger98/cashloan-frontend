(function () {
  let conversations = [];
  let activeEmail = "";
  let activeConversation = null;
  let selectedAdminFile = null;
  let activeFilter = "all";

  function getApiBaseUrl() {
    return (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || window.API_BASE || "";
  }

  function getToken() {
    return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  }

  async function apiFetch(path, options = {}) {
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

    return { ok: res.ok, data, status: res.status };
  }

  async function loadConversations() {
    const list = document.getElementById("conversationsList");
    const count = document.getElementById("conversationCount");

    if (list) list.innerHTML = `<div class="inbox-loading">Loading conversations...</div>`;
    if (count) count.textContent = "Loading...";

    const r = await apiFetch("/api/admin/messages/conversations");

    if (!r.ok) {
      if (list) list.innerHTML = `<div class="inbox-error">Failed to load conversations.</div>`;
      return;
    }

    conversations = Array.isArray(r.data) ? r.data : [];
    renderConversations();
  }

  function renderConversations() {
    const list = document.getElementById("conversationsList");
    const count = document.getElementById("conversationCount");
    const search = String(document.getElementById("conversationSearch")?.value || "").toLowerCase().trim();

    if (!list) return;

    let rows = conversations.slice();

    if (search) {
      rows = rows.filter((c) => {
        const text = [
          c.lenderName,
          c.lenderEmail,
          c.lenderBranch,
          c.lastMessage,
          c.lastCategory
        ].join(" ").toLowerCase();

        return text.includes(search);
      });
    }

    if (activeFilter === "unread") {
      rows = rows.filter((c) => Number(c.unreadAdmin || 0) > 0);
    } else if (activeFilter !== "all") {
      rows = rows.filter((c) => String(c.lastCategory || "").toLowerCase() === activeFilter);
    }

    if (count) {
      const unreadTotal = conversations.reduce((sum, c) => sum + Number(c.unreadAdmin || 0), 0);
      count.textContent = `${rows.length} conversations • ${unreadTotal} unread`;
    }

    if (!rows.length) {
      list.innerHTML = `<div class="inbox-empty">No conversations found.</div>`;
      return;
    }

    list.innerHTML = rows.map((c) => {
      const email = escapeHtml(c.lenderEmail || "");
      const name = escapeHtml(c.lenderName || "Unknown Institution");
      const branch = escapeHtml(c.lenderBranch || "");
      const preview = escapeHtml(c.lastMessage || "No message preview");
      const unread = Number(c.unreadAdmin || 0);
      const category = escapeHtml(c.lastCategory || "general");
      const time = formatShortTime(c.lastAt);
      const active = activeEmail === c.lenderEmail ? "active" : "";

      return `
        <button class="conversation-card ${active}" type="button" data-email="${email}">
          <div class="conversation-top">
            <div>
              <div class="conversation-name">${name}</div>
              <div class="conversation-email">${email}</div>
            </div>

            <div class="conversation-right">
              ${unread > 0 ? `<span class="unread-dot">${unread}</span>` : ""}
              <span class="conversation-time">${escapeHtml(time)}</span>
            </div>
          </div>

          <div class="conversation-branch">${branch || "No branch listed"}</div>

          <div class="conversation-preview">${preview}</div>

          <div class="conversation-tags">
            <span>${category}</span>
            ${c.lastHasAttachment ? `<span>📎 attachment</span>` : ""}
          </div>
        </button>
      `;
    }).join("");

    list.querySelectorAll(".conversation-card").forEach((btn) => {
      btn.addEventListener("click", function () {
        openConversation(this.dataset.email);
      });
    });
  }

  async function openConversation(email) {
    activeEmail = String(email || "").toLowerCase().trim();
    if (!activeEmail) return;

    activeConversation = conversations.find((c) => c.lenderEmail === activeEmail) || null;

    document.getElementById("emptyConversation").style.display = "none";
    document.getElementById("activeConversation").style.display = "flex";

    document.getElementById("activeLenderName").textContent =
      activeConversation?.lenderName || "Unknown Institution";

    document.getElementById("activeLenderMeta").textContent =
      `${activeEmail}${activeConversation?.lenderBranch ? " • " + activeConversation.lenderBranch : ""}`;

    document.getElementById("activeCategoryBadge").textContent =
      activeConversation?.lastCategory || "general";

    renderConversations();
    await loadThread();
  }

  async function loadThread() {
    if (!activeEmail) return;

    const box = document.getElementById("adminChatMessages");
    if (!box) return;

    box.innerHTML = `<div class="thread-loading">Loading thread...</div>`;

    const r = await apiFetch(`/api/admin/messages/${encodeURIComponent(activeEmail)}`);

    if (!r.ok) {
      box.innerHTML = `<div class="thread-error">Failed to load thread.</div>`;
      return;
    }

    const messages = Array.isArray(r.data) ? r.data : [];

    if (!messages.length) {
      box.innerHTML = `<div class="thread-empty">No messages yet.</div>`;
      return;
    }

    box.innerHTML = messages.map((m, index) => {
      const isAdmin = m.senderRole === "superadmin";
      const fileUrl = m.attachment && m.attachment.fileUrl ? m.attachment.fileUrl : "";
      const fileName = m.attachment && m.attachment.fileName ? m.attachment.fileName : "";
      const timeText = formatFullTime(m.sentAt || m.createdAt);

      return `
        <div class="admin-thread-msg ${isAdmin ? "admin-side" : "lender-side"}"
             style="animation-delay:${Math.min(index * 25, 300)}ms;">
          <div class="admin-thread-bubble">
            <div class="admin-glass-shine"></div>

            <div class="admin-msg-meta">
              <span>${isAdmin ? "LinkLedger Admin" : escapeHtml(m.lenderName || "Institution")}</span>
              <span>${escapeHtml(timeText)}</span>
            </div>

            <div class="admin-msg-text">${escapeHtml(m.message || "")}</div>

            ${
              fileUrl
                ? `<a class="admin-attachment" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener">
                    📎 ${escapeHtml(fileName || "Open attachment")}
                   </a>`
                : ""
            }

            <div class="admin-lock">🔒</div>
          </div>
        </div>
      `;
    }).join("");

    box.scrollTop = box.scrollHeight;

    await loadConversations();
  }

  async function sendAdminReply() {
    if (!activeEmail) {
      alert("Select a conversation first.");
      return;
    }

    const input = document.getElementById("adminReplyInput");
    const categoryEl = document.getElementById("replyCategory");

    const message = String(input?.value || "").trim();
    const category = String(categoryEl?.value || "general").trim();

    if (!message) {
      alert("Type a reply first.");
      return;
    }

    const fd = new FormData();
    fd.append("message", message);
    fd.append("category", category);

    if (selectedAdminFile) {
      fd.append("attachment", selectedAdminFile);
    }

    showAdminTyping();

    const API_BASE_URL = getApiBaseUrl();
    const token = getToken();

    const res = await fetch(`${API_BASE_URL}/api/admin/messages/${encodeURIComponent(activeEmail)}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: fd
    });

    const data = await res.json().catch(() => null);

    hideAdminTyping();

    if (!res.ok) {
      alert((data && data.message) || "Failed to send reply");
      return;
    }

    input.value = "";
    selectedAdminFile = null;

    const fileInput = document.getElementById("adminAttachment");
    if (fileInput) fileInput.value = "";

    renderAdminFilePreview();
    await loadThread();
  }

  function renderAdminFilePreview() {
    const box = document.getElementById("adminFilePreview");
    if (!box) return;

    if (!selectedAdminFile) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }

    box.style.display = "flex";
    box.innerHTML = `
      <span>📎 ${escapeHtml(selectedAdminFile.name)}</span>
      <button id="removeAdminFile" type="button">Remove</button>
    `;

    document.getElementById("removeAdminFile").onclick = function () {
      selectedAdminFile = null;
      const input = document.getElementById("adminAttachment");
      if (input) input.value = "";
      renderAdminFilePreview();
    };
  }

  function showAdminTyping() {
    const el = document.getElementById("adminTyping");
    if (el) el.style.display = "flex";
  }

  function hideAdminTyping() {
    const el = document.getElementById("adminTyping");
    if (el) el.style.display = "none";
  }

  function bindEvents() {
    document.getElementById("refreshInboxBtn")?.addEventListener("click", loadConversations);
    document.getElementById("reloadThreadBtn")?.addEventListener("click", loadThread);
    document.getElementById("sendAdminReplyBtn")?.addEventListener("click", sendAdminReply);

    document.getElementById("conversationSearch")?.addEventListener("input", renderConversations);

    document.querySelectorAll(".inbox-filter").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".inbox-filter").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        activeFilter = this.dataset.filter || "all";
        renderConversations();
      });
    });

    document.getElementById("adminAttachBtn")?.addEventListener("click", function () {
      document.getElementById("adminAttachment")?.click();
    });

    document.getElementById("adminAttachment")?.addEventListener("change", function (e) {
      selectedAdminFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      renderAdminFilePreview();
    });

    document.getElementById("adminReplyInput")?.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sendAdminReply();
      }
    });
  }

  function formatShortTime(value) {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatFullTime(value) {
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
    bindEvents();
    loadConversations();
  });
})();