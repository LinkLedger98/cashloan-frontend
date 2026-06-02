import { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/admin_messages.css";

const API_BASE_URL = "https://cashloan-backend.onrender.com";

function getAdminRole() {
  return String(localStorage.getItem("userRole") || localStorage.getItem("role") || "superadmin")
    .toLowerCase()
    .trim();
}

function isSuperAdminRole(role) {
  return String(role || "").toLowerCase().trim() === "superadmin";
}

function isFinanceRole(role) {
  return String(role || "").toLowerCase().trim() === "finance";
}

function isSupportComplianceRole(role) {
  return String(role || "").toLowerCase().trim() === "support_compliance";
}

function isAuditViewerRole(role) {
  return String(role || "").toLowerCase().trim() === "audit_viewer";
}

function getRoleLabel(role) {
  const cleanRole = String(role || "").toLowerCase().trim();

  if (cleanRole === "finance") return "Finance Desk";
  if (cleanRole === "support_compliance") return "Support & Compliance";
  if (cleanRole === "audit_viewer") return "Audit Viewer";
  if (cleanRole === "admin") return "Legacy Admin";
  return "Super Admin";
}

function getAllowedFiltersForRole(role) {
  const cleanRole = String(role || "").toLowerCase().trim();

  if (cleanRole === "finance") return ["all", "unread", "payment", "finance"];
  if (cleanRole === "support_compliance") return ["all", "unread", "support", "compliance", "dispute", "general"];
  if (cleanRole === "audit_viewer") return [];

  return ["all", "unread", "payment", "support", "compliance", "finance", "dispute", "audit", "general"];
}

function getDefaultCategoryForRole(role) {
  const cleanRole = String(role || "").toLowerCase().trim();

  if (cleanRole === "finance") return "payment";
  if (cleanRole === "support_compliance") return "support";
  return "general";
}

function isMessageFromAdminRole(senderRole) {
  return ["superadmin", "admin", "finance", "support_compliance", "audit_viewer"].includes(
    String(senderRole || "").toLowerCase().trim()
  );
}

function categoryAllowedForRole(category, role) {
  const cleanCategory = String(category || "general").toLowerCase().trim();
  const cleanRole = String(role || "").toLowerCase().trim();

  if (cleanRole === "finance") {
    return ["payment", "finance", "billing", "account", "accounts", "onboarding"].includes(cleanCategory);
  }

  if (cleanRole === "support_compliance") {
    return ["general", "support", "compliance", "dispute", "consent", "consents", "password", "meeting", "workshop"].includes(cleanCategory);
  }

  if (cleanRole === "audit_viewer") return false;

  return true;
}

function conversationAllowedForRole(conversation, role) {
  const cleanRole = String(role || "").toLowerCase().trim();

  if (isSuperAdminRole(cleanRole) || cleanRole === "admin") return true;
  if (isAuditViewerRole(cleanRole)) return false;

  const category = String(conversation?.lastCategory || "general").toLowerCase().trim();
  const text = [
    conversation?.lastMessage,
    conversation?.lenderName,
    conversation?.lenderEmail,
    conversation?.lenderBranch,
    conversation?.lastCategory
  ]
    .join(" ")
    .toLowerCase();

  if (isFinanceRole(cleanRole)) {
    return (
      categoryAllowedForRole(category, cleanRole) ||
      text.includes("payment") ||
      text.includes("billing") ||
      text.includes("proof") ||
      text.includes("pop") ||
      text.includes("paid") ||
      text.includes("invoice") ||
      text.includes("account") ||
      text.includes("onboarding")
    );
  }

  if (isSupportComplianceRole(cleanRole)) {
    return (
      categoryAllowedForRole(category, cleanRole) ||
      text.includes("consent") ||
      text.includes("dispute") ||
      text.includes("support") ||
      text.includes("password") ||
      text.includes("help") ||
      text.includes("compliance")
    );
  }

  return false;
}

function getToken() {
  return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
}

function authHeaders(extra = {}) {
  const token = getToken();

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function formatShortTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (err) {
    return "";
  }
}

function formatFullTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (err) {
    return "";
  }
}

function getInitials(value) {
  return (
    String(value || "Institution")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "IN"
  );
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
    c?.businessLogoUrl ||
    c?.institutionLogoUrl ||
    ""
  );
}

function getAttachmentUrl(attachment) {
  return attachment?.fileUrl || attachment?.url || "";
}

function getAttachmentName(attachment) {
  return attachment?.fileName || attachment?.filename || "Open attachment";
}

function isPreviewableImage(urlOrName) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(String(urlOrName || "").split("?")[0]);
}

function getAttachmentIcon(fileName) {
  const name = String(fileName || "").toLowerCase();

  if (name.endsWith(".pdf")) return "📄";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "📝";
  if (name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊";
  if (name.endsWith(".txt")) return "📃";

  return "📎";
}

function normalizeMetaLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";

  if (value.includes("admin_consents.html") || value.includes("admin/consents") || value.includes("consents")) {
    return "/admin/consents";
  }

  if (value.includes("admin_disputes.html") || value.includes("admin/disputes") || value.includes("disputes")) {
    return "/admin/disputes";
  }

  if (value.includes("admin_accounts.html") || value.includes("admin/accounts") || value.includes("accounts")) {
    return "/admin/accounts";
  }

  if (value.includes("admin_audit.html") || value.includes("admin/audit") || value.includes("audit")) {
    return "/admin/audit";
  }

  return value;
}

export default function AdminMessenger({ defaultOpen = false, pageMode = false } = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [conversations, setConversations] = useState([]);
  const [activeEmail, setActiveEmail] = useState("");
  const [thread, setThread] = useState([]);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState(getDefaultCategoryForRole(getAdminRole()));
  const [file, setFile] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [brokenAvatarByEmail, setBrokenAvatarByEmail] = useState({});
  const [adminAvatarUrl, setAdminAvatarUrl] = useState("");

  const messagesRef = useRef(null);
  const activeInputRef = useRef(null);
  const adminAvatarInputRef = useRef(null);

  const adminRole = getAdminRole();
  const allowedFilters = getAllowedFiltersForRole(adminRole);
  const messengerBlocked = isAuditViewerRole(adminRole);

  const activeConversation = useMemo(() => {
    const email = String(activeEmail || "").toLowerCase().trim();
    return conversations.find((c) => String(c.lenderEmail || "").toLowerCase().trim() === email) || null;
  }, [activeEmail, conversations]);

  const visibleConversations = useMemo(() => {
    return conversations.filter((c) => conversationAllowedForRole(c, adminRole));
  }, [conversations, adminRole]);

  const unreadTotal = useMemo(
    () => visibleConversations.reduce((sum, c) => sum + Number(c.unreadAdmin || 0), 0),
    [visibleConversations]
  );

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();

    return visibleConversations.filter((c) => {
      const unread = Number(c.unreadAdmin || 0);
      const cat = String(c.lastCategory || "general").toLowerCase();
      const text = [c.lenderName, c.lenderEmail, c.lenderBranch, c.lastMessage, c.lastCategory].join(" ").toLowerCase();

      if (filter === "unread" && unread <= 0) return false;
      if (filter !== "all" && filter !== "unread" && cat !== filter) return false;
      if (q && !text.includes(q)) return false;

      return true;
    });
  }, [visibleConversations, filter, search]);

  function scrollToBottom(smooth = true) {
    window.requestAnimationFrame(() => {
      const box = messagesRef.current;
      if (!box) return;
      box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }

  function hopScroll(direction) {
    const box = messagesRef.current;
    if (!box) return;
    box.scrollBy({ top: direction === "up" ? -260 : 260, behavior: "smooth" });
  }

  function handleChatKeyDown(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      hopScroll("up");
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      hopScroll("down");
    }

    if (e.key === "PageUp") {
      e.preventDefault();
      messagesRef.current?.scrollBy({ top: -520, behavior: "smooth" });
    }

    if (e.key === "PageDown") {
      e.preventDefault();
      messagesRef.current?.scrollBy({ top: 520, behavior: "smooth" });
    }
  }

  async function apiJson(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...authHeaders()
      }
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error((data && data.message) || "Request failed");
    }

    return data;
  }

  function getAdminEmail() {
    return String(
      localStorage.getItem("userEmail") ||
        localStorage.getItem("adminEmail") ||
        localStorage.getItem("email") ||
        "admin@linkledger.co.bw"
    )
      .toLowerCase()
      .trim();
  }

  function getAdminAvatarStorageKey() {
    return `linkledger_admin_avatar_${getAdminEmail()}`;
  }

  function handleAdminAvatarUpload(e) {
    const selected = e.target.files && e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      alert("Please choose an image file for the admin display picture.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;

      localStorage.setItem(getAdminAvatarStorageKey(), dataUrl);
      setAdminAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(selected);
  }

  function renderAdminAvatar() {
    if (adminAvatarUrl) {
      return <img src={adminAvatarUrl} alt="Admin display" />;
    }

    return <span>{getInitials(getAdminEmail().split("@")[0].replace(/[._-]+/g, " "))}</span>;
  }

  function renderLenderAvatar() {
    if (logoUrl && !activeAvatarBroken) {
      return (
        <img
          key={`${activeEmail}-${logoUrl}`}
          src={logoUrl}
          alt={lenderName}
          onError={() => setBrokenAvatarByEmail((prev) => ({ ...prev, [activeEmail]: true }))}
        />
      );
    }

    return <span>{getInitials(lenderName)}</span>;
  }

  async function openProtectedAttachment(url) {
    try {
      if (!url) {
        alert("No file link found.");
        return;
      }

      if (!String(url).startsWith("/")) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      const res = await fetch(`${API_BASE_URL}${url}`, {
        headers: authHeaders()
      });

      if (!res.ok) {
        alert("Failed to open file.");
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      console.error("OPEN PROTECTED ATTACHMENT ERROR:", err);
      alert("Failed to open file.");
    }
  }

  async function loadConversations() {
    const token = getToken();
    if (!token) return;

    try {
      const data = await apiJson("/api/admin/messages/conversations");
      setConversations(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load conversations.");
    }
  }

  async function loadThread(email = activeEmail, forceScroll = true) {
    const cleanEmail = String(email || "").toLowerCase().trim();
    if (!cleanEmail) return;

    setLoadingThread(true);
    setError("");

    try {
      const data = await apiJson(`/api/admin/messages/${encodeURIComponent(cleanEmail)}`);
      setThread(Array.isArray(data) ? data : []);
      if (forceScroll) scrollToBottom(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load thread.");
    } finally {
      setLoadingThread(false);
    }
  }

  function openConversation(email) {
    const cleanEmail = String(email || "").toLowerCase().trim();
    if (!cleanEmail) return;

    setActiveEmail(cleanEmail);
    setThread([]);
    setTimeout(() => activeInputRef.current?.focus(), 120);
  }

  async function sendAdminReply() {
    const cleanEmail = String(activeEmail || "").toLowerCase().trim();
    const text = message.trim();

    if (!cleanEmail) {
      alert("Select a conversation first.");
      return;
    }

    if (!text && !file) {
      alert("Please type a message or attach a file before sending.");
      return;
    }

    if (!categoryAllowedForRole(category, adminRole)) {
      alert("This staff role cannot send messages in that category.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("message", text);
      fd.append("category", category);
      fd.append("staffRole", adminRole);
      if (file) fd.append("attachment", file);

      const res = await fetch(`${API_BASE_URL}/api/admin/messages/${encodeURIComponent(cleanEmail)}`, {
        method: "POST",
        headers: authHeaders(),
        body: fd
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError((data && data.message) || "Failed to send reply.");
        return;
      }

      setMessage("");
      setFile(null);
      await loadThread(cleanEmail, true);
      await loadConversations();
      scrollToBottom(true);
    } catch (err) {
      console.error(err);
      setError("Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  function renderAttachment(attachment) {
    const attachmentUrl = getAttachmentUrl(attachment);
    const attachmentName = getAttachmentName(attachment);
    const protectedUrl = attachment?.protectedUrl || attachment?.fileProtectedUrl || "";
    const openUrl = protectedUrl || attachmentUrl;

    if (!openUrl) return null;

    if (!protectedUrl && (isPreviewableImage(attachmentUrl) || isPreviewableImage(attachmentName))) {
      return (
        <a className="admin-image-link" href={attachmentUrl} target="_blank" rel="noreferrer">
          <img className="admin-chat-image-preview" src={attachmentUrl} alt={attachmentName} loading="lazy" />
        </a>
      );
    }

    if (protectedUrl) {
      return (
        <button className="admin-protected-attachment" type="button" onClick={() => openProtectedAttachment(protectedUrl)}>
          📄 View Consent File • {attachmentName}
        </button>
      );
    }

    return (
      <a className="admin-attachment" href={attachmentUrl} target="_blank" rel="noreferrer">
        {getAttachmentIcon(attachmentName)} {attachmentName}
      </a>
    );
  }

  useEffect(() => {
    if (!open) return;

    loadConversations();

    const timer = setInterval(() => {
      loadConversations();
      if (activeEmail) loadThread(activeEmail, false);
    }, 6000);

    return () => clearInterval(timer);
  }, [open, activeEmail]);

  useEffect(() => {
    if (!activeEmail || !open) return;
    loadThread(activeEmail, true);
  }, [activeEmail, open]);

  useEffect(() => {
    if (!thread.length) return;
    scrollToBottom(false);
  }, [thread.length, activeEmail]);

  useEffect(() => {
    setAdminAvatarUrl(localStorage.getItem(getAdminAvatarStorageKey()) || "");
  }, []);

  useEffect(() => {
    if (messengerBlocked) return;

    if (!allowedFilters.includes(filter)) {
      setFilter(allowedFilters[0] || "all");
    }

    if (!categoryAllowedForRole(category, adminRole)) {
      setCategory(getDefaultCategoryForRole(adminRole));
    }
  }, [adminRole, filter, category, messengerBlocked, allowedFilters]);

  const logoUrl = getLogoFromConversation(activeConversation);
  const lenderName = activeConversation?.lenderName || activeConversation?.lenderEmail || "Unknown Institution";
  const lenderBranch = activeConversation?.lenderBranch || "";
  const activeAvatarBroken = brokenAvatarByEmail[activeEmail];
  const lastAdminMessageIndex = thread.reduce((last, item, index) => {
    const role = String(item?.senderRole || "").toLowerCase();
    return isMessageFromAdminRole(role) ? index : last;
  }, -1);

  if (messengerBlocked) {
    return null;
  }

  return (
    <>
      {!pageMode && (
        <button className="ll-admin-floating-inbox" type="button" onClick={() => setOpen((v) => !v)}>
          💬
          {unreadTotal > 0 && !open ? <span className="ll-chat-red-dot ll-buzzy-dot" /> : null}
        </button>
      )}

      {open && (
        <section className={`admin-inbox-shell ${pageMode ? "admin-inbox-page-mode" : "admin-inbox-overlay"}`}>
          <aside className="inbox-sidebar">
            <div className="inbox-side-head">
              <h2>Inbox</h2>
              <button className="reload-btn" type="button" onClick={loadConversations}>
                Refresh
              </button>
            </div>

            <div className="inbox-search-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search institution, branch, email..."
              />
            </div>

            <div className="inbox-filter-row">
              {allowedFilters.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`inbox-filter ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="inbox-count-line">
              {filteredConversations.length} conversations • {unreadTotal} unread • {getRoleLabel(adminRole)}
            </div>

            <div className="conversations-list">
              {filteredConversations.length === 0 ? <div className="inbox-empty">No conversations found.</div> : null}

              {filteredConversations.map((c) => {
                const email = String(c.lenderEmail || "").toLowerCase().trim();
                const active = email === activeEmail;
                const unread = Number(c.unreadAdmin || 0);

                return (
                  <button
                    key={email || c._id}
                    type="button"
                    className={`conversation-card ${active ? "active" : ""}`}
                    onClick={() => openConversation(email)}
                  >
                    <div className="conversation-top">
                      <div>
                        <div className="conversation-name">{c.lenderName || c.lenderEmail || "Unknown Institution"}</div>
                        <div className="conversation-email">{email}</div>
                      </div>

                      <div className="conversation-right">
                        {unread > 0 ? <span className="unread-dot ll-buzzy-dot">{unread}</span> : null}
                        <span className="conversation-time">{formatShortTime(c.lastAt)}</span>
                      </div>
                    </div>

                    <div className="conversation-branch">{c.lenderBranch || "No branch listed"}</div>
                    <div className="conversation-preview">{c.lastMessage || "No message preview"}</div>

                    <div className="conversation-tags">
                      <span>{c.lastCategory || "general"}</span>
                      {c.lastHasAttachment ? <span>📎 attachment</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="inbox-main">
            {!activeEmail ? (
              <div className="empty-conversation">
                <div className="empty-orb">💬</div>
                <h2>Select a conversation</h2>
                <p>Open a lender thread to view messages, consent files, attachments and replies.</p>
              </div>
            ) : (
              <div className="active-conversation">
                <div className="chat-panel-head">
                  <div className="chat-panel-user-wrap">
                    <div className="active-lender-avatar" key={activeEmail || lenderName}>
                      {renderLenderAvatar()}
                    </div>

                    <div className="chat-panel-user-info">
                      <h2>{lenderName}</h2>
                      <p>
                        {activeEmail}
                        {lenderBranch ? ` • ${lenderBranch}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="chat-head-actions">
                    <span className="category-pill">{activeConversation?.lastCategory || category || "general"}</span>

                    <input
                      ref={adminAvatarInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAdminAvatarUpload}
                    />

                    <button
                      type="button"
                      className="inbox-filter"
                      onClick={() => adminAvatarInputRef.current?.click()}
                      title="Upload admin display picture"
                    >
                      🖼️ Admin DP
                    </button>

                    <button type="button" className="inbox-filter" onClick={() => hopScroll("up")} title="Scroll up">
                      ↑
                    </button>

                    <button type="button" className="inbox-filter" onClick={() => hopScroll("down")} title="Scroll down">
                      ↓
                    </button>

                    <button type="button" className="reload-btn" onClick={() => loadThread(activeEmail, true)}>
                      Reload
                    </button>
                  </div>
                </div>

                <div className="admin-chat-messages" ref={messagesRef} tabIndex={0} onKeyDown={handleChatKeyDown}>
                  {loadingThread && !thread.length ? <div className="thread-loading">Loading thread...</div> : null}
                  {error ? <div className="thread-error">{error}</div> : null}
                  {!loadingThread && !thread.length && !error ? <div className="thread-empty">No messages yet.</div> : null}

                  {thread.map((m, index) => {
                    const senderRole = String(m.senderRole || "").toLowerCase();
                    const isAdmin = isMessageFromAdminRole(senderRole);
                    const actionLink = normalizeMetaLink(m.metaLink);

                    return (
                      <div key={m._id || `${m.createdAt}-${m.message}`}>
                        <div className={`admin-thread-msg ${isAdmin ? "lender-side" : "admin-side"}`}>
                          {isAdmin ? (
                            <div className="admin-msg-avatar admin-avatar" title={getAdminEmail()}>
                              {renderAdminAvatar()}
                            </div>
                          ) : null}

                          <div className="admin-thread-bubble">
                            <div className="admin-msg-meta">
                              <span>{isAdmin ? `LinkLedger • ${getAdminEmail()}` : lenderName}</span>
                              <span>{formatFullTime(m.sentAt || m.createdAt)}</span>
                            </div>

                            {m.message ? <div className="admin-msg-text">{m.message}</div> : null}

                            {renderAttachment(m.attachment)}

                            {actionLink && m.metaLabel ? (
                              <div className="admin-msg-action-wrap">
                                <a className="admin-msg-action-btn" href={actionLink}>
                                  {m.metaLabel}
                                </a>
                              </div>
                            ) : null}

                            <div className="admin-lock">🔒 Locked / audited message</div>
                          </div>

                          {!isAdmin ? (
                            <div className="admin-msg-avatar lender-avatar" title={lenderName}>
                              {renderLenderAvatar()}
                            </div>
                          ) : null}
                        </div>

                        {isAdmin && index === lastAdminMessageIndex ? (
                          <div className="ll-seen-row">
                            <span>Seen by operations desk</span>
                            <span className="ll-seen-dot" title="Seen" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {file ? (
                  <div className="admin-file-preview">
                    <span>📎 {file.name}</span>
                    <button type="button" onClick={() => setFile(null)}>
                      Remove
                    </button>
                  </div>
                ) : null}

                <div className="admin-reply-box">
                  <div className="reply-tools">
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {allowedFilters
                        .filter((item) => !["all", "unread"].includes(item))
                        .map((item) => (
                          <option key={item} value={item}>
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                          </option>
                        ))}
                    </select>

                    <label>
                      📎 Attach
                      <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>

                  <textarea
                    ref={activeInputRef}
                    className="admin-reply-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!sending) sendAdminReply();
                      }
                    }}
                    placeholder="Type reply... Press Enter to send. Shift + Enter for new line."
                    disabled={sending}
                  />

                  <div className="reply-note">
                    Messages are locked and audited after sending. Press Enter to send.
                  </div>
                </div>
              </div>
            )}
          </main>
        </section>
      )}
    </>
  );
}