(function () {
  let conversations = [];
  let activeEmail = "";
  let activeConversation = null;
  let selectedAdminFile = null;
  let activeFilter = "all";
  let isSendingAdmin = false;
  let adminRefreshTimer = null;
  let inboxCollapsed = false;

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

  function getLogoFromConversation(c) {
    return (
      c?.logoUrl ||
      c?.logo?.url ||
      c?.lenderLogoUrl ||
      c?.lenderLogo?.url ||
      c?.profileLogoUrl ||
      c?.profile?.logo?.url ||
      c?.user?.logo?.url ||
      ""
    );
  }

  async function loadConversations() {
    const list = document.getElementById("conversationsList");
    const count = document.getElementById("conversationCount");

    if (list && !conversations.length) {
      list.innerHTML = `<div class="inbox-loading">Loading conversations...</div>`;
    }

    if (count && !conversations.length) {
      count.textContent = "Loading...";
    }

    const r = await apiFetch("/api/admin/messages/conversations");

    if (!r.ok) {
      if (list) {
        list.innerHTML = `<div class="inbox-error">Failed to load conversations.</div>`;
      }
      return;
    }

    conversations = Array.isArray(r.data) ? r.data : [];
    renderConversations();
  }

  function renderConversations() {
    const list = document.getElementById("conversationsList");
    const count = document.getElementById("conversationCount");

    const search = String(document.getElementById("conversationSearch")?.value || "")
      .toLowerCase()
      .trim();

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
        ]
          .join(" ")
          .toLowerCase();

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

    list.innerHTML = rows
      .map((c) => {
        const emailRaw = String(c.lenderEmail || "").toLowerCase().trim();
        const email = escapeHtml(emailRaw);
        const name = escapeHtml(c.lenderName || emailRaw || "Unknown Institution");
        const branch = escapeHtml(c.lenderBranch || "");
        const preview = escapeHtml(c.lastMessage || "No message preview");
        const unread = Number(c.unreadAdmin || 0);
        const category = escapeHtml(c.lastCategory || "general");
        const time = formatShortTime(c.lastAt);
        const active = activeEmail === emailRaw ? "active" : "";

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
      })
      .join("");

    list.querySelectorAll(".conversation-card").forEach((btn) => {
      btn.addEventListener("click", function () {
        openConversation(this.dataset.email);
      });
    });
  }

  async function openConversation(email) {
    activeEmail = String(email || "").toLowerCase().trim();

    if (!activeEmail) return;

    activeConversation =
      conversations.find((c) => String(c.lenderEmail || "").toLowerCase().trim() === activeEmail) || null;

    const emptyConversation = document.getElementById("emptyConversation");
    const activeConversationEl = document.getElementById("activeConversation");

    if (emptyConversation) emptyConversation.style.display = "none";
    if (activeConversationEl) activeConversationEl.style.display = "flex";

    renderActiveHeader();
    renderConversations();

    await loadThread(true);
  }

  function renderActiveHeader() {
    const avatarEl = document.getElementById("activeLenderAvatar");
    const nameEl = document.getElementById("activeLenderName");
    const metaEl = document.getElementById("activeLenderMeta");
    const badgeEl = document.getElementById("activeCategoryBadge");

    const lenderName = activeConversation?.lenderName || "Unknown Institution";
    const lenderBranch = activeConversation?.lenderBranch || "";
    const logoUrl = getLogoFromConversation(activeConversation);
    const initials = getInitials(lenderName);

    if (avatarEl) {
      if (logoUrl) {
        avatarEl.innerHTML = `
          <img
            src="${escapeAttr(logoUrl)}"
            alt="${escapeAttr(lenderName)}"
            onerror="this.parentElement.innerHTML='<span>${escapeAttr(initials)}</span>';"
          />
        `;
      } else {
        avatarEl.innerHTML = `<span>${escapeHtml(initials)}</span>`;
      }
    }

    if (nameEl) {
      nameEl.textContent = lenderName;
    }

    if (metaEl) {
      metaEl.textContent = `${activeEmail}${lenderBranch ? " • " + lenderBranch : ""}`;
    }

    if (badgeEl) {
      badgeEl.textContent = activeConversation?.lastCategory || "general";
    }
  }

  async function loadThread(forceScroll = true) {
    if (!activeEmail) return;

    const box = document.getElementById("adminChatMessages");

    if (!box) return;

    const wasNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 140;

    if (!box.dataset.loaded) {
      box.innerHTML = `<div class="thread-loading">Loading thread...</div>`;
    }

    const r = await apiFetch(`/api/admin/messages/${encodeURIComponent(activeEmail)}`);

    if (!r.ok) {
      box.innerHTML = `<div class="thread-error">Failed to load thread.</div>`;
      return;
    }

    const messages = Array.isArray(r.data) ? r.data : [];

    if (!messages.length) {
      box.innerHTML = `<div class="thread-empty">No messages yet.</div>`;
      box.dataset.loaded = "1";
      return;
    }

    box.innerHTML = messages
      .map((m) => {
        const isAdmin = m.senderRole === "superadmin";
        const timeText = formatFullTime(m.sentAt || m.createdAt);
        const attachmentHtml = renderAdminAttachmentHtml(m.attachment);

        return `
          <div class="admin-thread-msg ${isAdmin ? "admin-side" : "lender-side"}">
            <div class="admin-thread-bubble">
              <div class="admin-msg-meta">
                <span>
                  ${
                    isAdmin
                      ? escapeHtml(m.adminEmail || "LinkLedger Admin")
                      : escapeHtml(m.lenderName || activeConversation?.lenderName || "Institution")
                  }
                </span>

                <span>${escapeHtml(timeText)}</span>
              </div>

              ${
                m.message
                  ? `
                    <div class="admin-msg-text">
                      ${escapeHtml(m.message || "")}
                    </div>
                  `
                  : ""
              }

              ${attachmentHtml}

              <div class="admin-lock">🔒</div>
            </div>
          </div>
        `;
      })
      .join("");

    box.dataset.loaded = "1";

    if (forceScroll || wasNearBottom) {
      box.scrollTop = box.scrollHeight;
    }

    await loadConversations();
  }

  function getInitials(value) {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return "IN";

    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
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

  function renderAdminAttachmentHtml(attachment) {
    if (!attachment || !attachment.fileUrl) return "";

    const fileUrl = attachment.fileUrl;
    const fileName = attachment.fileName || "Open attachment";

    if (isPreviewableImage(fileUrl) || isPreviewableImage(fileName)) {
      return `
        <a
          class="admin-image-link"
          href="${escapeAttr(fileUrl)}"
          target="_blank"
          rel="noopener"
        >
          <img
            class="admin-chat-image-preview"
            src="${escapeAttr(fileUrl)}"
            alt="${escapeAttr(fileName)}"
            loading="lazy"
          />
        </a>
      `;
    }

    return `
      <a
        class="admin-attachment"
        href="${escapeAttr(fileUrl)}"
        target="_blank"
        rel="noopener"
      >
        ${getAttachmentIcon(fileName)}
        ${escapeHtml(fileName)}
      </a>
    `;
  }

  async function sendAdminReply() {
    if (isSendingAdmin) return;

    if (!activeEmail) {
      alert("Select a conversation first.");
      return;
    }

    const input = document.getElementById("adminReplyInput");
    const categoryEl = document.getElementById("replyCategory");

    const message = String(input?.value || "").trim();
    const category = String(categoryEl?.value || "general").trim();

    if (!message && !selectedAdminFile) {
      return;
    }

    try {
      setAdminSendingState(true);

      const fd = new FormData();

      fd.append("message", message);
      fd.append("category", category);

      if (selectedAdminFile) {
        fd.append("attachment", selectedAdminFile);
      }

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

      if (!res.ok) {
        alert((data && data.message) || "Failed to send reply");
        return;
      }

      if (input) input.value = "";

      selectedAdminFile = null;

      const fileInput = document.getElementById("adminAttachment");

      if (fileInput) fileInput.value = "";

      renderAdminFilePreview();

      await loadThread(true);

    } catch (err) {
      console.error("ADMIN SEND REPLY ERROR:", err);
      alert("Failed to send reply.");

    } finally {
      setAdminSendingState(false);
    }
  }

  function setAdminSendingState(state) {
    isSendingAdmin = state;

    const input = document.getElementById("adminReplyInput");
    const attach = document.getElementById("adminAttachBtn");

    if (input) input.disabled = state;
    if (attach) attach.disabled = state;
  }

  function renderAdminFilePreview() {
    const box = document.getElementById("adminFilePreview");

    if (!box) return;

    if (!selectedAdminFile) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }

    const fileName = selectedAdminFile.name || "Selected file";

    box.style.display = "flex";

    box.innerHTML = `
      <div>${escapeHtml(fileName)}</div>
      <button id="removeAdminFile" type="button">Remove</button>
    `;

    document.getElementById("removeAdminFile").onclick = function () {
      selectedAdminFile = null;

      const input = document.getElementById("adminAttachment");

      if (input) input.value = "";

      renderAdminFilePreview();
    };
  }

  /* ✅ SIMPLE MINIMIZE ONLY */

  function startAdminAutoRefresh() {
    if (adminRefreshTimer) clearInterval(adminRefreshTimer);

    adminRefreshTimer = setInterval(function () {
      if (inboxCollapsed) return;

      if (activeEmail && !isSendingAdmin) {
        loadThread(false);
      } else {
        loadConversations();
      }
    }, 5000);
  }

  function bindEvents() {

    document.getElementById("refreshInboxBtn")
      ?.addEventListener("click", loadConversations);

    document.getElementById("reloadThreadBtn")
      ?.addEventListener("click", function () {
        loadThread(true);
      });

    /* ✅ ENTER TO SEND */
    document.getElementById("adminReplyInput")
      ?.addEventListener("keydown", function (e) {

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendAdminReply();
        }

      });

    document.getElementById("conversationSearch")
      ?.addEventListener("input", renderConversations);

    document.querySelectorAll(".inbox-filter")
      .forEach((btn) => {

        btn.addEventListener("click", function () {

          document.querySelectorAll(".inbox-filter")
            .forEach((b) => b.classList.remove("active"));

          this.classList.add("active");

          activeFilter = this.dataset.filter || "all";

          renderConversations();

        });

      });

    document.getElementById("adminAttachBtn")
      ?.addEventListener("click", function () {
        document.getElementById("adminAttachment")?.click();
      });

    document.getElementById("adminAttachment")
      ?.addEventListener("change", function (e) {

        selectedAdminFile =
          e.target.files && e.target.files[0]
            ? e.target.files[0]
            : null;

        renderAdminFilePreview();

      });

 /* OPEN OVERLAY */
document.getElementById("adminFloatingInbox")
  ?.addEventListener("click", function (e) {
    e.preventDefault();

    const shell = document.getElementById("adminInboxShell");

    if (!shell) return;

    const isClosed = shell.classList.contains("is-hidden");

    if (isClosed) {
      shell.classList.remove("is-hidden");
      inboxCollapsed = false;
    } else {
      shell.classList.add("is-hidden");
      inboxCollapsed = true;
    }
  });

/* MINIMIZE OVERLAY */
document.getElementById("closeAdminInboxBtn")
  ?.addEventListener("click", function () {

    const shell = document.getElementById("adminInboxShell");

    if (!shell) return;

    shell.classList.add("is-hidden");

    inboxCollapsed = true;

  });
  }

  function formatShortTime(value) {
    if (!value) return "";

    const d = new Date(value);

    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  document.addEventListener("DOMContentLoaded", function () {

    bindEvents();
    loadConversations();
    startAdminAutoRefresh();

  });

})();