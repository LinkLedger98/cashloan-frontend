import { useEffect, useRef, useState } from "react";
import "../../styles/chat.css";
import linkLedgerLogo from "../../assets/logo.png";

const API_BASE_URL = "https://cashloan-backend.onrender.com";

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

function formatTime(value) {
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

function getAttachmentUrl(attachment) {
  return attachment?.fileUrl || attachment?.url || "";
}

function getAttachmentName(attachment) {
  return attachment?.fileName || attachment?.filename || "Open attachment";
}

function normalizeMetaLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";

  if (value.includes("admin_consents.html") || value.includes("admin/consents") || value.includes("consents")) return "/admin/consents";
  if (value.includes("admin_disputes.html") || value.includes("admin/disputes") || value.includes("disputes")) return "/admin/disputes";
  if (value.includes("admin_accounts.html") || value.includes("admin/accounts") || value.includes("accounts")) return "/admin/accounts";
  if (value.includes("admin_audit.html") || value.includes("admin/audit") || value.includes("audit")) return "/admin/audit";

  return value;
}

export default function DashboardMessenger() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [profileLogoUrl, setProfileLogoUrl] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);

  const messagesRef = useRef(null);
  const typingTimerRef = useRef(null);

  const hasUnread = messages.some((m) => m.readByLender === false);

  function scrollToBottom(smooth = true) {
    window.requestAnimationFrame(() => {
      const box = messagesRef.current;
      if (!box) return;
      box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }

  async function fetchJson(path, options = {}) {
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

  async function loadProfileLogo() {
    try {
      const data = await fetchJson("/api/profile/me");
      setProfileLogoUrl(getLogoFromPayload(data));
    } catch (err) {
      console.error("LOGO LOAD FAILED:", err);
      setProfileLogoUrl("");
    }
  }

  async function loadMessages(forceScroll = false) {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const data = await fetchJson("/api/messages/mine");
      setMessages(Array.isArray(data) ? data : []);
      if (forceScroll) scrollToBottom(false);
    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err);
      setError("Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (sending) return;

    const text = message.trim();

    if (!text && !file) {
      alert("Please type a message or attach a file before sending.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("message", text);
      fd.append("category", "general");
      if (file) fd.append("attachment", file);

      const res = await fetch(`${API_BASE_URL}/api/messages/mine`, {
        method: "POST",
        headers: authHeaders(),
        body: fd
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError((data && data.message) || "Failed to send message.");
        return;
      }

      setMessage("");
      setFile(null);
      setTyping(false);
      await loadMessages(true);
      scrollToBottom(true);
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      setError("Message failed to send.");
    } finally {
      setSending(false);
    }
  }

  async function uploadLogo(fileToUpload) {
    if (!fileToUpload) return;

    try {
      const fd = new FormData();
      fd.append("logo", fileToUpload);

      const res = await fetch(`${API_BASE_URL}/api/profile/logo`, {
        method: "POST",
        headers: authHeaders(),
        body: fd
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert((data && data.message) || "Display picture upload failed");
        return;
      }

      setProfileLogoUrl(getLogoFromPayload(data));
      await loadProfileLogo();
      await loadMessages(true);
      alert("Display picture updated ✅");
    } catch (err) {
      console.error("UPLOAD LOGO ERROR:", err);
      alert("Upload error");
    }
  }

  function handleInputChange(value) {
    setMessage(value);
    setTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping(false), 800);
  }

  function renderAttachment(attachment) {
    const attachmentUrl = getAttachmentUrl(attachment);
    const attachmentName = getAttachmentName(attachment);

    if (!attachmentUrl) return null;

    if (isPreviewableImage(attachmentUrl) || isPreviewableImage(attachmentName)) {
      return (
        <a className="ll-image-link" href={attachmentUrl} target="_blank" rel="noreferrer">
          <img className="ll-chat-image-preview" src={attachmentUrl} alt={attachmentName} loading="lazy" />
        </a>
      );
    }

    return (
      <a className="ll-attachment" href={attachmentUrl} target="_blank" rel="noreferrer">
        {getAttachmentIcon(attachmentName)} {attachmentName}
      </a>
    );
  }

  useEffect(() => {
    if (!open) return;

    loadProfileLogo();
    loadMessages(true);

    const timer = setInterval(() => {
      if (!sending) loadMessages(false);
    }, 5000);

    return () => clearInterval(timer);
  }, [open, sending]);

  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById("ll-dashboard-messenger-react-overrides")) return;

    const style = document.createElement("style");
    style.id = "ll-dashboard-messenger-react-overrides";
  style.textContent = `
  .ll-msg.me{justify-content:flex-start!important;flex-direction:row!important;}
  .ll-msg.admin{justify-content:flex-end!important;flex-direction:row-reverse!important;}

  .ll-dashboard-chat-messages{scroll-behavior:smooth!important;overscroll-behavior:contain!important;}
      .ll-dashboard-chat-head-actions label{background:rgba(255,255,255,0.09)!important;border:1px solid rgba(255,255,255,0.14)!important;color:white!important;font-size:15px;cursor:pointer;width:30px;height:30px;border-radius:12px!important;display:grid;place-items:center;padding:0!important;}
      .ll-chat-red-dot{position:absolute;top:7px;right:7px;width:12px;height:12px;background:#ff2f3f;border:2px solid #fff;border-radius:50%;}
      .ll-buzzy-dot{animation:llBuzzyPulse 1.15s infinite ease-in-out;}
      @keyframes llBuzzyPulse{0%{box-shadow:0 0 0 0 rgba(255,47,63,.35),0 0 0 6px rgba(255,47,63,.12);transform:scale(1);}50%{box-shadow:0 0 0 8px rgba(255,47,63,.08),0 0 18px rgba(255,47,63,.55);transform:scale(1.12);}100%{box-shadow:0 0 0 0 rgba(255,47,63,0),0 0 0 6px rgba(255,47,63,.12);transform:scale(1);}}
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <>
      <button className="ll-dashboard-chat-button" type="button" onClick={() => setOpen((v) => !v)}>
        💬
        {hasUnread && !open ? <span className="ll-chat-red-dot ll-buzzy-dot" /> : null}
      </button>

      {open && (
        <div className={`ll-dashboard-chat-panel ${expanded ? "expanded" : ""}`}>
          <div className="ll-dashboard-chat-head">
            <div className="ll-dashboard-chat-brand">
     
  <img
  className="ll-chat-logo"
  src="/assets/logo.png"
  alt="LinkLedger Support"
  onError={(e) => {
    e.currentTarget.src = linkLedgerLogo;
  }}
/>

              <div>
                <b>LinkLedger Support</b>
                <div className="ll-dashboard-chat-status">Online support</div>
              </div>
            </div>

            <div className="ll-dashboard-chat-head-actions">
            <button
  type="button"
  title="Upload display picture"
  onClick={() => document.getElementById("ll-logo-input-react")?.click()}
>
  🖼️
</button>

<input
  id="ll-logo-input-react"
  type="file"
  accept="image/*"
  style={{ display: "none" }}
  onChange={(e) => uploadLogo(e.target.files?.[0])}
/>
              <button type="button" title="Expand" onClick={() => setExpanded((v) => !v)}>⛶</button>
              <button type="button" title="Minimize" onClick={() => setOpen(false)}>—</button>
            </div>
          </div>

          <div className="ll-dashboard-chat-messages" ref={messagesRef} tabIndex={0}>
            {loading && !messages.length ? <div className="ll-empty-chat">Loading messages...</div> : null}
            {error ? <div className="ll-empty-chat">{error}</div> : null}
            {!loading && !messages.length && !error ? <div className="ll-empty-chat">No messages yet. Send LinkLedger Support a message.</div> : null}

            {messages.map((m) => {
              const isMine = String(m.senderRole || "").toLowerCase() === "lender";
              const actionLink = normalizeMetaLink(m.metaLink);

              return (
                <div key={m._id || `${m.createdAt}-${m.message}`} className={`ll-msg ${isMine ? "me" : "admin"}`}>
                 {isMine ? (
  profileLogoUrl ? (
    <button
      type="button"
      className="ll-avatar-click"
      onClick={() => setAvatarPreview(profileLogoUrl)}
    >
      <img className="ll-msg-avatar ll-msg-avatar-img" src={profileLogoUrl} alt="You" />
    </button>
  ) : (
    <div className="ll-msg-avatar">👤</div>
  )
) : m.senderLogoUrl ? (
  <button
    type="button"
    className="ll-avatar-click"
    onClick={() => setAvatarPreview(m.senderLogoUrl)}
  >
    <img
      className="ll-msg-avatar ll-msg-avatar-img"
      src={m.senderLogoUrl}
      alt={m.senderDisplayName || "LinkLedger Staff"}
    />
  </button>
) : (
  <button
    type="button"
    className="ll-avatar-click"
    onClick={() => setAvatarPreview(linkLedgerLogo)}
  >
    <img
      className="ll-msg-avatar ll-msg-avatar-img"
      src={linkLedgerLogo}
      alt="LinkLedger Support"
    />
  </button>
)}
                  <div className="ll-bubble">
                    <div className="ll-msg-meta">
                      <span>
  {isMine
    ? "You"
    : `${
        m.senderDisplayName ||
        m.handledByName ||
        "LinkLedger Support"
      }${
        m.senderJobTitle
          ? ` • ${m.senderJobTitle}`
          : ""
      }`}
</span>
                      <span>{formatTime(m.sentAt || m.createdAt)}</span>
                    </div>

                    {m.message ? <div className="ll-msg-text">{m.message}</div> : null}
                    {renderAttachment(m.attachment)}

                    {actionLink && m.metaLabel ? (
                      <div className="ll-msg-action-wrap">
                        <a className="ll-msg-action-btn" href={actionLink}>{m.metaLabel}</a>
                      </div>
                    ) : null}

                    <div className="ll-locked">🔒</div>
                  </div>
                </div>
              );
            })}
          </div>

          {typing ? (
            <div className="ll-typing">
              <span></span><span></span><span></span>
              <em>Typing...</em>
            </div>
          ) : null}

          {file ? (
            <div className="ll-file-preview">
              <span>{getAttachmentIcon(file.name)} {file.name}</span>
              <button type="button" onClick={() => setFile(null)}>Remove</button>
            </div>
          ) : null}

          <div className="ll-chat-input-wrap">
            <label className="ll-chat-attach" title="Attach file">
              📎
              <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>

            <input
              className="ll-chat-input"
              value={message}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type message..."
              disabled={sending}
            />

            <button className="ll-chat-send" type="button" disabled={sending} onClick={sendMessage}>➤</button>
          </div>
                  </div>
      )}

      {avatarPreview ? (
        <div
          className="ll-avatar-preview-backdrop"
          onClick={() => setAvatarPreview(null)}
        >
          <div
            className="ll-avatar-preview-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ll-avatar-preview-close"
              onClick={() => setAvatarPreview(null)}
            >
              ×
            </button>

            <img src={avatarPreview} alt="Profile preview" />
          </div>
        </div>
      ) : null}

    </>
  );
}