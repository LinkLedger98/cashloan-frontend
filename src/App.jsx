import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";

import AdminMessenger from "./components/adminMessenger/AdminMessenger";

import ImportedAdminConsents from "./pages/AdminConsents";
import linkLedgerLogo from "./assets/logo.png";
import logo2 from "./assets/logo2.png";

import Landing from "./pages/Landing";
import Compliance from "./pages/Compliance";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import "./styles/premium-theme.css";
import AdminEmployees from "./pages/AdminEmployees";

const API_BASE_URL = "https://cashloan-backend.onrender.com";

function clearSession() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem("role");
}

function getToken() {
  return localStorage.getItem("authToken");
}

function getRole() {
  return String(
    localStorage.getItem("userRole") ||
    localStorage.getItem("role") ||
    ""
  )
    .toLowerCase()
    .trim();
}

function isStaffRole(role = getRole()) {
  return [
    "superadmin",
    "admin",
    "limited_admin",
    "finance",
    "support_compliance",
    "audit_viewer"
  ].includes(String(role || "").toLowerCase().trim());
}

function isSuperAdmin(role = getRole()) {
  const r = String(role || "").toLowerCase().trim();
  return r === "superadmin" || r === "admin";
}

function isFinance(role = getRole()) {
  return String(role || "").toLowerCase().trim() === "finance";
}

function isSupportCompliance(role = getRole()) {
  return String(role || "").toLowerCase().trim() === "support_compliance";
}

function isAuditViewer(role = getRole()) {
  return String(role || "").toLowerCase().trim() === "audit_viewer";
}

function canViewAccounts(role = getRole()) {
  const r = String(role || "").toLowerCase().trim();
  return isSuperAdmin(role) || isFinance(role) || r === "limited_admin";
}

function canViewConsents(role = getRole()) {
  return isSuperAdmin(role) || isSupportCompliance(role);
}

function canViewDisputes(role = getRole()) {
  return isSuperAdmin(role) || isSupportCompliance(role);
}

function canViewAudit(role = getRole()) {
  return isSuperAdmin(role) || isAuditViewer(role);
}

function canViewMessenger(role = getRole()) {
  return isSuperAdmin(role) || isFinance(role) || isSupportCompliance(role);
}

function getRoleLabel(role = getRole()) {
  const r = String(role || "").toLowerCase().trim();

  if (r === "superadmin") return "Super Admin";
  if (r === "admin") return "Super Admin";
  if (r === "limited_admin") return "Limited Admin";
  if (r === "finance") return "Finance";
  if (r === "support_compliance") return "Support & Compliance";
  if (r === "audit_viewer") return "Audit Viewer";

  return "Account";
}

function getDefaultAdminPath(role = getRole()) {
  const r = String(role || "").toLowerCase().trim();

  if (r === "limited_admin") return "/admin/accounts";
  if (canViewAccounts(role)) return "/admin/accounts";
  if (canViewConsents(role)) return "/admin/consents";
  if (canViewDisputes(role)) return "/admin/disputes";
  if (canViewAudit(role)) return "/admin/audit";
  if (canViewMessenger(role)) return "/admin/messages";

  return "/welcome";
}

function authHeaders(extra = {}) {
  const token = getToken();

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function inputStyle(extra = {}) {
  return {
    width: "100%",
    padding: 12,
    boxSizing: "border-box",
    ...extra
  };
}

function statusBadgeStyle(status = "") {
  const value = String(status || "").toLowerCase();

  const colors = {
    paid: ["rgba(34,197,94,0.14)", "rgba(34,197,94,0.35)", "#bff3cf"],
    active: ["rgba(34,197,94,0.14)", "rgba(34,197,94,0.35)", "#bff3cf"],
    approved: ["rgba(34,197,94,0.14)", "rgba(34,197,94,0.35)", "#bff3cf"],
    owing: ["rgba(245,158,11,0.14)", "rgba(245,158,11,0.35)", "#ffe3b0"],
    pending: ["rgba(245,158,11,0.14)", "rgba(245,158,11,0.35)", "#ffe3b0"],
    due: ["rgba(245,158,11,0.14)", "rgba(245,158,11,0.35)", "#ffe3b0"],
    overdue: ["rgba(255,77,77,0.14)", "rgba(255,77,77,0.35)", "#ffc1c1"],
    suspended: ["rgba(255,77,77,0.14)", "rgba(255,77,77,0.35)", "#ffc1c1"],
    rejected: ["rgba(255,77,77,0.14)", "rgba(255,77,77,0.35)", "#ffc1c1"],
    investigating: ["rgba(255,58,167,0.16)", "rgba(255,58,167,0.35)", "#ffb8df"],
    resolved: ["rgba(34,197,94,0.14)", "rgba(34,197,94,0.35)", "#bff3cf"]
  };

  const [bg, border, color] =
    colors[value] ||
    ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.16)", "rgba(244,245,248,0.82)"];

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 850,
    textTransform: "capitalize"
  };
}

function AuthShell({ children }) {
  return (
    <main className="ll-auth-page">
      <div className="ll-auth-shell">
        {children}
      </div>
    </main>
  );
}

function AppShell({ children }) {
  return (
    <main className="ll-app-page">
      <div className="ll-shell">
        {children}
      </div>
    </main>
  );
}

function ProtectedRoute({ children }) {
  const token = getToken();

  if (!token) {
    return (
      <AuthShell>
        <section className="ll-auth-card">
          <h1>Login required</h1>
          <p>Please sign in to continue.</p>
          <Link to="/login">Go to login</Link>
        </section>
      </AuthShell>
    );
  }

  return children;
}

function AdminRoute({ children, allow }) {
  const token = getToken();
  const role = getRole();

  if (!token) {
    return (
      <AuthShell>
        <section className="ll-auth-card">
          <h1>Login required</h1>
          <p>Please sign in to continue.</p>
          <Link to="/login">Go to login</Link>
        </section>
      </AuthShell>
    );
  }

  if (!isStaffRole(role)) {
    return (
      <AuthShell>
        <section className="ll-auth-card">
          <h1>Access denied</h1>
          <p>You are not authorised to access this page.</p>
          <Link to="/welcome">Return home</Link>
        </section>
      </AuthShell>
    );
  }

  if (typeof allow === "function" && !allow(role)) {
    return (
      <AuthShell>
        <section className="ll-auth-card">
          <h1>Access denied</h1>
          <p>Your staff role cannot access this page.</p>
          <Link to={getDefaultAdminPath(role)}>Go to your workspace</Link>
        </section>
      </AuthShell>
    );
  }

  return children;
}

function AdminTopbar({ title, active }) {
  const email = localStorage.getItem("userEmail") || "Admin";
  const role = getRole();
  const roleLabel = getRoleLabel(role);

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  function navClass(page) {
    return active === page ? "active" : "";
  }

  return (
    <>
      <div className="ll-topbar">
       <div className="ll-brand">
  <img
    src={logo2}
    alt=""
    className="ll-admin-logo"
  />
  <h1 className="ll-brand-title">
    {title || `LinkLedger • ${roleLabel}`}
  </h1>
</div>

        <div className="ll-top-actions">
          <span className="ll-pill">{roleLabel}: {email}</span>
          <Link className="ll-btn-ghost" to="/welcome">Home</Link>
          <button data-variant="ghost" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="ll-nav">
        {canViewAccounts(role) && (
          <Link className={navClass("accounts")} to="/admin/accounts">Accounts</Link>
        )}

        {canViewDisputes(role) && (
          <Link className={navClass("disputes")} to="/admin/disputes">Disputes</Link>
        )}

        {canViewConsents(role) && (
          <Link className={navClass("consents")} to="/admin/consents">Consents</Link>
        )}

        {canViewAudit(role) && (
          <Link className={navClass("audit")} to="/admin/audit">Audit</Link>
        )}
      </div>
    </>
  );
}

function DashboardTopbar() {
  const email = localStorage.getItem("userEmail") || "Account";

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  return (
     <div className="ll-topbar">
  <div className="ll-brand">
    <img
      src={logo2}
      alt=""
      className="ll-admin-logo"
    />
    <h1 className="ll-brand-title">LinkLedger</h1>
  </div>

      <div className="ll-top-actions">
        <span className="ll-pill">Account: {email}</span>
        <Link className="ll-btn-ghost" to="/welcome">&lt; back</Link>
        <button data-variant="ghost" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

async function openProtectedFile(url) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const res = await fetch(url, {
      headers: authHeaders()
    });

    if (!res.ok) {
      alert("Unable to open file.");
      return;
    }

    const blob = await res.blob();
    const fileUrl = URL.createObjectURL(blob);
    window.open(fileUrl, "_blank");
  } catch (err) {
    console.error(err);
    alert("Network error while opening file.");
  }
}


function formatChatTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return "";
  }
}

function getAttachmentUrl(attachment) {
  return attachment?.fileUrl || attachment?.url || "";
}

function getAttachmentName(attachment) {
  return attachment?.fileName || attachment?.filename || "Open attachment";
}

function DashboardMessengerWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

 const [file, setFile] = useState(null);
 const [profileLogoUrl, setProfileLogoUrl] = useState("");
 const [category, setCategory] = useState("general");
 const [loading, setLoading] = useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

 const dashboardChatMessagesRef = useRef(null);
 const imageInputRef = useRef(null);
 const logoInputRef = useRef(null);

  function scrollDashboardMessagesToBottom() {
    const box = dashboardChatMessagesRef.current;
    if (!box) return;

    requestAnimationFrame(() => {
      box.scrollTop = box.scrollHeight;
    });

    setTimeout(() => {
      box.scrollTop = box.scrollHeight;
    }, 120);
  }

  async function loadMessages(forceScroll = false) {
  const token = getToken();
  if (!token) return;

  const box = dashboardChatMessagesRef.current;
  const wasNearBottom = box
    ? box.scrollHeight - box.scrollTop - box.clientHeight < 120
    : true;

  setLoading(true);
  setError("");

  try {
    const res = await fetch(`${API_BASE_URL}/api/messages/mine`, {
      headers: authHeaders()
    });

    const data = await res.json().catch(() => []);

    if (!res.ok) {
      setError(data.message || "Unable to load messages.");
      return;
    }

    if (Array.isArray(data)) {
      setMessages(data);
    }

    if (forceScroll || wasNearBottom) {
      setTimeout(() => {
        scrollDashboardMessagesToBottom();
      }, 80);
    }
  } catch (err) {
    console.error(err);
    setError("Network error while loading messages.");
  } finally {
    setLoading(false);
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

async function loadProfileLogo() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile/me`, {
      headers: authHeaders()
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setProfileLogoUrl("");
      return;
    }

    setProfileLogoUrl(getLogoFromPayload(data));
  } catch (err) {
    console.error("LOGO LOAD FAILED:", err);
    setProfileLogoUrl("");
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

    const uploadedLogo = getLogoFromPayload(data);

    if (uploadedLogo) {
      setProfileLogoUrl(uploadedLogo);
    }

    await loadProfileLogo();
    await loadMessages(true);

    alert("Display picture updated ✅");
  } catch (err) {
    console.error("UPLOAD LOGO ERROR:", err);
    alert("Upload error");
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
fd.append("category", category);
fd.append("department", category === "finance" ? "finance" : "compliance");

if (file) fd.append("attachment", file);
      if (file) fd.append("attachment", file);

      const res = await fetch(`${API_BASE_URL}/api/messages/mine`, {
        method: "POST",
        headers: authHeaders(),
        body: fd
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Failed to send message.");
        return;
      }

      setMessage("");
      setFile(null);
      await loadMessages(true);
    } catch (err) {
      console.error(err);
      setError("Message failed to send.");
    } finally {
      setSending(false);
    }
  }

  function isImage(urlOrName) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(String(urlOrName || "").split("?")[0]);
  }

  function renderAttachment(attachment) {
    if (!attachment) return null;

    const protectedUrl = attachment.protectedUrl || "";
    const attachmentUrl = getAttachmentUrl(attachment);
    const attachmentName = getAttachmentName(attachment);

    if (protectedUrl) {
      return (
        <button
          className="ll-attachment ll-protected-attachment"
          type="button"
          onClick={() =>
            openProtectedFile(
              protectedUrl.startsWith("http")
                ? protectedUrl
                : `${API_BASE_URL}${protectedUrl}`
            )
          }
        >
          📄 View Consent File • {attachmentName}
        </button>
      );
    }

    if (!attachmentUrl) return null;

    if (isImage(attachmentUrl) || isImage(attachmentName)) {
      return (
        <a className="ll-image-link" href={attachmentUrl} target="_blank" rel="noreferrer">
          <img className="ll-chat-image-preview" src={attachmentUrl} alt={attachmentName} loading="lazy" />
        </a>
      );
    }

    return (
      <a className="ll-attachment" href={attachmentUrl} target="_blank" rel="noreferrer">
        📎 {attachmentName}
      </a>
    );
  }

  function normalizeMetaLink(link) {
    const value = String(link || "").trim();
    if (!value) return "";

    if (value.includes("admin_consents.html") || value.includes("admin/consents") || value.includes("consents")) return "/admin/consents";
    if (value.includes("admin_disputes.html") || value.includes("admin/disputes") || value.includes("disputes")) return "/admin/disputes";
    if (value.includes("admin_accounts.html") || value.includes("admin/accounts") || value.includes("accounts")) return "/admin/accounts";
    if (value.includes("admin_audit.html") || value.includes("admin/audit") || value.includes("audit")) return "/admin/audit";
    if (value === "dashboard.html" || value.endsWith("/dashboard.html")) return "/app/dashboard";

    return value;
  }

  function renderMetaAction(m) {
    const label = m.metaLabel || m.actionLabel || "";
    const link = normalizeMetaLink(m.metaLink || m.actionUrl || "");

    if (!label || !link) return null;

    return (
      <div className="ll-msg-action-wrap">
        <a className="ll-msg-action-btn" href={link}>
          {label}
        </a>
      </div>
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
  if (!open) return;

  const t1 = setTimeout(() => {
    scrollDashboardMessagesToBottom();
  }, 100);

  const t2 = setTimeout(() => {
    scrollDashboardMessagesToBottom();
  }, 350);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
  };
}, [open, messages.length]);

return (
  <>
    <button className="ll-dashboard-chat-button" type="button" onClick={() => setOpen((v) => !v)}>
        💬
      </button>

      {open && (
        <div className={`ll-dashboard-chat-panel ${expanded ? "expanded" : ""}`}>
          <div className="ll-dashboard-chat-head">
            <div className="ll-dashboard-chat-brand">
              <img
  className="ll-dashboard-chat-logo"
  src={linkLedgerLogo}
  alt="LinkLedger Support"
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
  onClick={() => logoInputRef.current?.click()}
>
  🖼️
</button>

<input
  ref={logoInputRef}
  type="file"
  accept="image/*"
  style={{ display: "none" }}
  onChange={(e) => uploadLogo(e.target.files?.[0])}
/>

              <button type="button" title="Expand" onClick={() => setExpanded((v) => !v)}>⛶</button>
              <button type="button" title="Minimize" onClick={() => setOpen(false)}>—</button>
            </div>
          </div>

          <div className="ll-dashboard-chat-messages" ref={dashboardChatMessagesRef}>
            {loading && !messages.length ? <p className="ll-empty-chat">Loading messages...</p> : null}
            {error ? <p className="ll-empty-chat">{error}</p> : null}
            {!loading && !messages.length && !error ? <p className="ll-empty-chat">No messages yet. Send LinkLedger Support a message.</p> : null}

            {messages.map((m) => {
              const isMine = String(m.senderRole || "").toLowerCase() === "lender";

              return (
                <div key={m._id || `${m.createdAt}-${m.message}`} className={`ll-msg ${isMine ? "me" : "admin"}`}>
                 {isMine ? (
  profileLogoUrl ? (
    <img
      className="ll-msg-avatar"
      src={profileLogoUrl}
      alt=""
      onError={() => setProfileLogoUrl("")}
    />
  ) : (
    <div className="ll-msg-avatar">👤</div>
  )
) : (
  <img
    className="ll-msg-avatar"
    src={linkLedgerLogo}
    alt="LinkLedger Support"
  />
)}

                  <div className="ll-bubble">
                    <div className="ll-msg-meta">
                      <span>{isMine ? "You" : "LinkLedger Support"}</span>
                      <span>{formatChatTime(m.sentAt || m.createdAt)}</span>
                    </div>

                    {m.message ? <div className="ll-msg-text">{m.message}</div> : null}
                    {renderAttachment(m.attachment)}
                    {renderMetaAction(m)}
                    <div className="ll-locked">🔒</div>
                  </div>
                </div>
              );
            })}
          </div>

          {file ? (
            <div className="ll-file-preview">
              <span>📎 {file.name}</span>
              <button type="button" onClick={() => setFile(null)}>Remove</button>
            </div>
          ) : null}

           <div className="ll-chat-category-wrap">
  <button
    type="button"
    className={`ll-finance-route-pill ${category === "finance" ? "active" : ""}`}
    onClick={() => setCategory(category === "finance" ? "general" : "finance")}
    aria-pressed={category === "finance"}
    title={category === "finance" ? "Finance team selected" : "Send this message to Finance"}
  >
    <span className="ll-finance-route-icon">💳</span>

    <span className="ll-finance-route-text">
      <strong>{category === "finance" ? "Finance selected" : "Send to Finance"}</strong>
      <small>
        {category === "finance"
          ? "This message goes to the Finance Team"
          : "For payments, accounts, billing & follow-ups"}
      </small>
    </span>

    <span className="ll-finance-route-switch">
      <span />
    </span>
  </button>
</div>

          <div className="ll-chat-input-wrap">
            <label className="ll-chat-attach">
              📎
              <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>

            <input
              className="ll-chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type message..."
              disabled={sending}
            />

            <button className="ll-chat-send" type="button" disabled={sending} onClick={sendMessage}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function AdminMessengerWidget({ defaultOpen = false, pageMode = false } = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [conversations, setConversations] = useState([]);
  const [activeEmail, setActiveEmail] = useState("");
  const [thread, setThread] = useState([]);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [file, setFile] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const adminChatMessagesRef = useRef(null);

  function scrollAdminThreadToBottom() {
    const box = adminChatMessagesRef.current;
    if (!box) return;

    requestAnimationFrame(() => {
      box.scrollTop = box.scrollHeight;
    });

    setTimeout(() => {
      box.scrollTop = box.scrollHeight;
    }, 120);

    setTimeout(() => {
      box.scrollTop = box.scrollHeight;
    }, 420);
  }

  async function loadConversations() {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/messages/conversations`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        setError(data.message || "Unable to load conversations.");
        return;
      }

      setConversations(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Network error while loading conversations.");
    }
  }

  async function loadThread(email = activeEmail) {
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/messages/${encodeURIComponent(email)}`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        setError(data.message || "Unable to load thread.");
        return;
      }

      setThread(Array.isArray(data) ? data : []);
      scrollAdminThreadToBottom();
    } catch (err) {
      console.error(err);
      setError("Network error while loading thread.");
    } finally {
      setLoading(false);
    }
  }

  async function sendAdminReply() {
    if (!activeEmail) {
      alert("Select a conversation first.");
      return;
    }

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
      fd.append("category", category);
      if (file) fd.append("attachment", file);

      const res = await fetch(`${API_BASE_URL}/api/admin/messages/${encodeURIComponent(activeEmail)}`, {
        method: "POST",
        headers: authHeaders(),
        body: fd
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Failed to send reply.");
        return;
      }

      setMessage("");
      setFile(null);
      await loadThread(activeEmail);
      await loadConversations();
    } catch (err) {
      console.error(err);
      setError("Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  function initials(value) {
    const parts = String(value || "Institution")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "IN";
  }

  function getConversationLogo(conversation) {
    return (
      conversation?.logoUrl ||
      conversation?.lenderLogoUrl ||
      conversation?.lenderLogo?.url ||
      conversation?.profileLogoUrl ||
      conversation?.profile?.logo?.url ||
      conversation?.businessLogoUrl ||
      conversation?.institutionLogoUrl ||
      conversation?.logo?.url ||
      ""
    );
  }

  function AdminConversationAvatar({ conversation, email }) {
    const logoUrl = getConversationLogo(conversation);
    const name = conversation?.lenderName || email || "Institution";
    const avatarKey = `${String(email || "").toLowerCase()}::${String(logoUrl || "")}`;
    const [failedAvatarKey, setFailedAvatarKey] = useState("");

    useEffect(() => {
      setFailedAvatarKey("");
    }, [avatarKey]);

    if (logoUrl && failedAvatarKey !== avatarKey) {
      return (
        <img
          key={avatarKey}
          src={logoUrl}
          alt={name}
          onError={() => setFailedAvatarKey(avatarKey)}
        />
      );
    }

    return <span>{initials(name)}</span>;
  }

  function isImage(urlOrName) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(String(urlOrName || "").split("?")[0]);
  }

  function renderAttachment(attachment) {
    if (!attachment) return null;

    const protectedUrl = attachment.protectedUrl || "";
    const attachmentUrl = attachment.fileUrl || attachment.url || "";
    const attachmentName = attachment.fileName || attachment.filename || "Open attachment";

    if (protectedUrl) {
      return (
        <button
          className="admin-attachment admin-protected-attachment"
          type="button"
          onClick={() => openProtectedFile(protectedUrl.startsWith("http") ? protectedUrl : `${API_BASE_URL}${protectedUrl}`)}
        >
          📄 View Consent File • {attachmentName}
        </button>
      );
    }

    if (!attachmentUrl) return null;

    if (isImage(attachmentUrl) || isImage(attachmentName)) {
      return (
        <a className="admin-image-link" href={attachmentUrl} target="_blank" rel="noreferrer">
          <img className="admin-chat-image-preview" src={attachmentUrl} alt={attachmentName} loading="lazy" />
        </a>
      );
    }

    return (
      <a className="admin-attachment" href={attachmentUrl} target="_blank" rel="noreferrer">
        📎 {attachmentName}
      </a>
    );
  }

 function normalizeMetaLink(link) {
  const value = String(link || "").trim();

  if (!value) return "";

  if (
    value.includes("admin_consents.html") ||
    value.includes("admin/consents") ||
    value.includes("consents")
  ) {
    return "/admin/consents";
  }

  if (
    value.includes("admin_disputes.html") ||
    value.includes("admin/disputes") ||
    value.includes("disputes")
  ) {
    return "/admin/disputes";
  }

  if (
    value.includes("admin_accounts.html") ||
    value.includes("admin/accounts") ||
    value.includes("accounts")
  ) {
    return "/admin/accounts";
  }

  if (
    value.includes("admin_audit.html") ||
    value.includes("admin/audit") ||
    value.includes("audit")
  ) {
    return "/admin/audit";
  }

  return value;
}

  function renderMetaAction(m) {
    const label = m.metaLabel || m.actionLabel || "";
    const link = normalizeMetaLink(m.metaLink || m.actionUrl || "");

    if (!label || !link) return null;

    return (
      <div className="admin-msg-action-wrap">
        <a className="admin-msg-action-btn" href={link}>
          {label}
        </a>
      </div>
    );
  }

  useEffect(() => {
    if (!open) return;

    loadConversations();

    const timer = setInterval(() => {
      loadConversations();
      if (activeEmail) loadThread(activeEmail);
    }, 6000);

    return () => clearInterval(timer);
  }, [open, activeEmail]);

  useEffect(() => {
    if (!open || !activeEmail) return;

    const box = adminChatMessagesRef.current;
    if (!box) return;

    requestAnimationFrame(() => {
      box.scrollTop = box.scrollHeight;
    });
  }, [thread, activeEmail, open]);

  const activeConversation = conversations.find((c) => String(c.lenderEmail || "").toLowerCase().trim() === activeEmail);

  const filteredConversations = conversations.filter((c) => {
    const q = search.trim().toLowerCase();
    const unread = Number(c.unreadAdmin || 0);
    const cat = String(c.lastCategory || "general").toLowerCase();
    const text = [c.lenderName, c.lenderEmail, c.lenderBranch, c.lastMessage, c.lastCategory].join(" ").toLowerCase();

    if (filter === "unread" && unread <= 0) return false;
    if (filter !== "all" && filter !== "unread" && cat !== filter) return false;
    if (q && !text.includes(q)) return false;

    return true;
  });

  const unreadTotal = conversations.reduce((sum, c) => sum + Number(c.unreadAdmin || 0), 0);

  return (
    <>
      {!pageMode && (
        <button className="ll-admin-floating-inbox" type="button" onClick={() => setOpen((v) => !v)}>
          💬
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
              {["all", "unread", "payment", "support"].map((f) => (
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
              {filteredConversations.length} conversations • {unreadTotal} unread
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
                    onClick={() => {
                      setActiveEmail(email);
                      loadThread(email);
                    }}
                  >
                    <div className="conversation-top">
                      <div>
                        <div className="conversation-name">{c.lenderName || c.lenderEmail || "Unknown Institution"}</div>
                        <div className="conversation-email">{email}</div>
                      </div>

                      <div className="conversation-right">
                        {unread > 0 ? <span className="unread-dot">{unread}</span> : null}
                        <span className="conversation-time">{formatChatTime(c.lastAt)}</span>
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
                <p>Choose a lender to start chatting.</p>
              </div>
            ) : (
              <div className="active-conversation">
                <div className="chat-panel-head">
                  <div className="chat-panel-user-wrap">
                    <div className="active-lender-avatar" key={`avatar-shell-${activeEmail}`}>
                      <AdminConversationAvatar conversation={activeConversation} email={activeEmail} />
                    </div>

                    <div className="chat-panel-user-info">
                      <h2>{activeConversation?.lenderName || "Institution"}</h2>
                      <p>{activeEmail}{activeConversation?.lenderBranch ? ` • ${activeConversation.lenderBranch}` : ""}</p>
                    </div>
                  </div>

                  <div className="chat-head-actions">
                    <span className="category-pill">{activeConversation?.lastCategory || category}</span>

                    <button className="reload-btn" type="button" onClick={() => loadThread(activeEmail)}>
                      Reload
                    </button>

                    {!pageMode && (
                      <button className="inbox-filter" type="button" onClick={() => setOpen(false)}>
                        Minimize
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-chat-messages" ref={adminChatMessagesRef}>
                  {loading ? <div className="thread-loading">Loading thread...</div> : null}
                  {error ? <div className="thread-error">{error}</div> : null}
                  {!loading && thread.length === 0 && !error ? <div className="thread-empty">No messages yet.</div> : null}

                  {thread.map((m) => {
                    const role = String(m.senderRole || "").toLowerCase();
                    const isAdmin = role === "superadmin" || role === "admin";

                    return (
                      <div key={m._id || `${m.createdAt}-${m.message}`} className={`admin-thread-msg ${isAdmin ? "admin-side" : "lender-side"}`}>
                        <div className="admin-thread-bubble">
                          <div className="admin-msg-meta">
                            <span>{isAdmin ? "LinkLedger Admin" : activeConversation?.lenderName || "Institution"}</span>
                            <span>{formatChatTime(m.sentAt || m.createdAt)}</span>
                          </div>

                          {m.message ? <div className="admin-msg-text">{m.message}</div> : null}
                          {renderAttachment(m.attachment)}
                          {renderMetaAction(m)}
                          <div className="admin-lock">🔒</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {file ? (
                  <div className="admin-file-preview">
                    <span>📎 {file.name}</span>
                    <button type="button" onClick={() => setFile(null)}>Remove</button>
                  </div>
                ) : null}

                <div className="admin-reply-box">
                  <div className="reply-tools">
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="general">General</option>
                      <option value="support">Support</option>
                      <option value="payment">Payment</option>
                      <option value="password">Password</option>
                      <option value="meeting">Meeting</option>
                      <option value="workshop">Workshop</option>
                    </select>

                    <label>
                      📎 Attach
                      <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>

                  <textarea
                    className="admin-reply-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendAdminReply();
                      }
                    }}
                    placeholder="Type your reply..."
                  />

                </div>
              </div>
            )}
          </main>
        </section>
      )}
    </>
  );
}
function isLinkLedgerStaffEmail(email) {
  return String(email || "")
    .toLowerCase()
    .trim()
    .endsWith("@linkledger.co.bw");
}

function shouldUseAdminSide(role, email) {
  return isStaffRole(role) || isLinkLedgerStaffEmail(email);
}

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    if (!email || !password) {
      setMsg("Email + password required.");
      return;
    }

    setMsg("Signing in...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Login failed");
        return;
      }

      const loginEmail = String(data.email || email || "")
        .toLowerCase()
        .trim();

      const role = String(data.role || "lender")
        .toLowerCase()
        .trim();

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userEmail", loginEmail);
      localStorage.setItem("userRole", role);
      localStorage.setItem("role", role);

      if (data.mustSetPassword === true || data.mustChangePassword === true) {
        navigate("/set-password");
        return;
      }

      if (shouldUseAdminSide(role, loginEmail)) {
        navigate(getDefaultAdminPath(role));
      } else {
        navigate("/welcome");
      }
    } catch (err) {
      console.error(err);
      setMsg("Network error. Try again.");
    }
  }

  return (
    <AuthShell>
      <div className="ll-auth-topbar">
        <div className="ll-brand">
          <img
  src={logo2}
  alt=""
  className="ll-auth-logo"
/>
          <h1 className="ll-brand-title">LinkLedger</h1>
        </div>

        <div className="ll-row">
          <Link className="ll-btn-ghost" to="/">
            Home
          </Link>
          <Link className="ll-btn-ghost" to="/signup">
            Request Sign up
          </Link>
        </div>
      </div>

      <section className="ll-auth-card">
        <h2>Sign in</h2>
        <p>Access your dashboard.</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginTop: 12 }}>
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle({ marginTop: 6 })}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Password</label>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle({ flex: 1 })}
              />

              <button type="button" onClick={() => setShowPw(!showPw)}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            className="ll-btn-primary"
            type="submit"
            style={{ marginTop: 16, width: "100%" }}
          >
            Login
          </button>

          {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
        </form>
      </section>
    </AuthShell>
  );
}

function Signup() {
  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  async function submitRequest(e) {
    e.preventDefault();

    if (!businessName || !branchName || !phone || !licenseNo || !email) {
      setMsg("Please complete all required fields.");
      return;
    }

    setMsg("Submitting request...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/requests/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          branchName: branchName.trim(),
          phone: phone.trim(),
          licenseNo: licenseNo.trim(),
          email: email.trim().toLowerCase(),
          notes: notes.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to submit request.");
        return;
      }

      setMsg(
        "Request submitted successfully. An administrator will contact you after verification."
      );

      setBusinessName("");
      setBranchName("");
      setPhone("");
      setLicenseNo("");
      setEmail("");
      setNotes("");
    } catch (err) {
      console.error(err);
      setMsg("Network error while submitting request.");
    }
  }

  return (
    <AuthShell>
      <div className="ll-auth-topbar">
        <div className="ll-brand">
          <img
  src={logo2}
  alt=""
  className="ll-auth-logo"
/>
          <h1 className="ll-brand-title">LinkLedger</h1>
        </div>

        <div className="ll-row">
          <Link className="ll-btn-ghost" to="/">
            Home
          </Link>
          <Link className="ll-btn-ghost" to="/login">
            Sign in
          </Link>
        </div>
      </div>

      <section className="ll-auth-card">
        <h2>Request Account</h2>
        <p>
          Submit your details. An administrator will contact you after
          verification.
        </p>

        <form onSubmit={submitRequest}>
          <div className="ll-grid" style={{ marginTop: 12 }}>
            <div>
              <label>Business Name *</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Golden Cashloans"
                style={inputStyle({ marginTop: 6 })}
              />
            </div>

            <div>
              <label>Branch *</label>
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Palapye"
                style={inputStyle({ marginTop: 6 })}
              />
            </div>

            <div>
              <label>Phone / Landline *</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 490000 / 71xxxxxx"
                style={inputStyle({ marginTop: 6 })}
              />
            </div>

            <div>
              <label>NBIFIRA License No. *</label>
              <input
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder="e.g. NBIFIRA-12345"
                style={inputStyle({ marginTop: 6 })}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. info@business.co.bw"
              style={inputStyle({ marginTop: 6 })}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Notes optional</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you want admin to know..."
              style={inputStyle({ marginTop: 6 })}
            />
          </div>

          <button
            className="ll-btn-primary"
            type="submit"
            style={{ marginTop: 14, padding: "12px 18px" }}
          >
            Submit Request
          </button>

          {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
        </form>
      </section>

      <div
        style={{
          marginTop: 22,
          paddingBottom: 10,
          color: "rgba(244,245,248,0.88)"
        }}
      >
        <div style={{ fontSize: 14 }}>© 2026 LinkLedger • Botswana</div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "rgba(244,245,248,0.72)"
          }}
        >
          Support: <b>73132277</b>
        </div>
      </div>
    </AuthShell>
  );
}

function SetPassword() {
  const navigate = useNavigate();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [msg, setMsg] = useState("");

  async function savePassword(e) {
    e.preventDefault();

    if (!pw1 || !pw2) {
      setMsg("Please enter and confirm your password.");
      return;
    }

    if (pw1 !== pw2) {
      setMsg("Passwords do not match.");
      return;
    }

    if (pw1.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setMsg("Saving password...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/set-password`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          password: pw1,
          newPassword: pw1
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to save password.");
        return;
      }

      const role = String(
        localStorage.getItem("userRole") ||
          localStorage.getItem("role") ||
          "lender"
      )
        .toLowerCase()
        .trim();

      const storedEmail = String(localStorage.getItem("userEmail") || "")
        .toLowerCase()
        .trim();

      if (shouldUseAdminSide(role, storedEmail)) {
        navigate(getDefaultAdminPath(role));
      } else {
        navigate("/welcome");
      }
    } catch (err) {
      console.error(err);
      setMsg("Network error while saving password.");
    }
  }

  return (
    <AuthShell>
      <div className="ll-auth-topbar">
  <div className="ll-brand">
    <img
      src={logo2}
      alt=""
      className="ll-admin-logo"
    />
    <h1 className="ll-brand-title">LinkLedger</h1>
  </div>

        <div className="ll-row">
          <Link className="ll-btn-ghost" to="/">
            Home
          </Link>
          <Link className="ll-btn-ghost" to="/login">
            Sign in
          </Link>
        </div>
      </div>

      <section className="ll-auth-card">
        <h2>Set your password</h2>
        <p>Create a secure password to continue.</p>

        <form onSubmit={savePassword}>
          <div style={{ marginTop: 12 }}>
            <label>New Password</label>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <input
                type={show1 ? "text" : "password"}
                required
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                style={inputStyle({ flex: 1 })}
              />

              <button type="button" onClick={() => setShow1(!show1)}>
                {show1 ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Confirm Password</label>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <input
                type={show2 ? "text" : "password"}
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                style={inputStyle({ flex: 1 })}
              />

              <button type="button" onClick={() => setShow2(!show2)}>
                {show2 ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            className="ll-btn-primary"
            type="submit"
            style={{ marginTop: 16, width: "100%" }}
          >
            Save Password
          </button>

          {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
        </form>
      </section>
    </AuthShell>
  );
}


function AdminAccounts() {
  const [lenders, setLenders] = useState([]);
  const [requests, setRequests] = useState([]);

  const [msg, setMsg] = useState("");
  const [requestsMsg, setRequestsMsg] = useState("");

  const [adminKey, setAdminKey] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [lendersSearch, setLendersSearch] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  function isEmployeeAccount(u) {
  const email = String(u?.email || "").toLowerCase().trim();
  const role = String(u?.role || u?.userRole || "").toLowerCase().trim();

  return (
    email.endsWith("@linkledger.co.bw") ||
    [
      "admin",
      "superadmin",
      "staff",
      "employee",
      "finance",
      "compliance",
      "support",
      "support_compliance",
      "limited_admin",
      "limited admin"
    ].includes(role)
  );
}

  const institutionLenders = lenders.filter((u) => !isEmployeeAccount(u));

const pendingPayments = institutionLenders.filter((u) => {
  const billing = String(u.billingStatus || "").toLowerCase();
  return ["due", "pending", "overdue", "past_due"].includes(billing);
}).length;

  const filteredLenders = institutionLenders.filter((u) => {
    const q = lendersSearch.trim().toLowerCase();
    const billing = String(u.billingStatus || "").toLowerCase();
    const isPendingPayment = ["due", "pending", "overdue", "past_due"].includes(billing);

    if (accountFilter === "pendingPayments" && !isPendingPayment) return false;

    if (!q) return true;

    return [
      u.businessName,
      u.branchName,
      u.email,
      u.phone,
      u.licenseNo,
      u.status,
      u.billingStatus,
      u.billingDueDate
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  function clearForm() {
    setAdminKey("");
    setBusinessName("");
    setBranchName("");
    setPhone("");
    setLicenseNo("");
    setNewEmail("");
    setTempPassword("");
    setSelectedRequestId("");
    setCreateMsg("");
  }

  function useRequest(r) {
    setSelectedRequestId(r._id || "");
    setBusinessName(r.businessName || r.cashloanName || "");
    setBranchName(r.branchName || r.cashloanBranch || "");
    setPhone(r.phone || r.cashloanPhone || "");
    setLicenseNo(r.licenseNo || r.licenceNo || "");
    setNewEmail(r.email || r.cashloanEmail || "");
    setTempPassword("");
    setCreateMsg("Autofilled from signup request. Add temporary password, then create account.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadLenders() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setMsg("Loading accounts...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lenders`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        setMsg(data.message || "Unable to load accounts.");
        return;
      }

      setLenders(Array.isArray(data) ? data : []);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Network error while loading accounts.");
    }
  }

  async function loadRequests() {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setRequestsMsg("Loading signup requests...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/requests`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        setRequestsMsg(data.message || "Unable to load requests.");
        return;
      }

      setRequests(Array.isArray(data) ? data : []);
      setRequestsMsg("");
    } catch (err) {
      console.error(err);
      setRequestsMsg("Network error while loading requests.");
    }
  }

  async function deleteRequest(requestId) {
    if (!requestId) {
      alert("Missing request ID.");
      return false;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/requests/${requestId}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || "Unable to delete signup request.");
        return false;
      }

      await loadRequests();
      return true;
    } catch (err) {
      console.error(err);
      alert("Network error while deleting request.");
      return false;
    }
  }

  async function updateLenderStatus(userId, status) {
    if (!userId) {
      alert("Missing account ID.");
      return;
    }

    const ok = window.confirm(`Set this account to ${status}?`);
    if (!ok) return;

    setMsg("Updating account status...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to update account.");
        return;
      }

      setMsg("Account updated successfully.");
      await loadLenders();
    } catch (err) {
      console.error(err);
      setMsg("Network error while updating account.");
    }
  }

  async function secureLender(userId, email) {
    if (!userId) {
      alert("Missing account ID.");
      return;
    }

    const temp = window.prompt(
      `Set a temporary password for:\n${email || userId}\n\nMinimum 8 characters.`
    );

    if (temp === null) return;

    const tempPasswordValue = String(temp || "").trim();

    if (tempPasswordValue.length < 8) {
      alert("Temporary password must be at least 8 characters.");
      return;
    }

    const ok = window.confirm("Set temporary password and force password change on next login?");
    if (!ok) return;

    setMsg("Securing account...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/secure`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tempPassword: tempPasswordValue })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to secure account.");
        return;
      }

      setMsg("Temporary password set successfully.");
      await loadLenders();
    } catch (err) {
      console.error(err);
      setMsg("Network error while securing account.");
    }
  }

  async function updateBilling(userId, billingStatus) {
    if (!userId) {
      alert("Missing account ID.");
      return;
    }

    let billingDueDate = "";
    let billingNote = "";

    if (billingStatus === "due") {
      billingDueDate = window.prompt("Enter payment due date, e.g. 2026-05-31:", "") || "";
      billingNote = window.prompt("Optional note for due payment:", "Payment marked as due.") || "";
    }

    if (billingStatus === "paid") {
      billingNote = window.prompt("Optional payment note:", "Payment received and marked paid.") || "";
    }

    if (billingStatus === "overdue") {
      billingNote = window.prompt("Optional overdue note:", "Payment is overdue.") || "";
    }

    const ok = window.confirm(`Mark billing as ${billingStatus}?`);
    if (!ok) return;

    setMsg("Updating billing...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lenders/${userId}/billing`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          billingStatus,
          status: billingStatus,
          dueDate: billingDueDate,
          billingDueDate,
          note: billingNote,
          billingNote
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to update billing.");
        return;
      }

      setMsg(`Billing marked as ${billingStatus}.`);
      await loadLenders();
    } catch (err) {
      console.error(err);
      setMsg("Network error while updating billing.");
    }
  }

  async function createLender(e) {
    e.preventDefault();

    if (!businessName || !branchName || !phone || !newEmail || !tempPassword) {
      setCreateMsg("Please complete all required fields.");
      return;
    }

    if (tempPassword.length < 8) {
      setCreateMsg("Temporary password must be at least 8 characters.");
      return;
    }

    setCreateMsg("Creating account...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lenders`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          businessName: businessName.trim(),
          branchName: branchName.trim(),
          phone: phone.trim(),
          licenseNo: licenseNo.trim(),
          email: newEmail.trim().toLowerCase(),
          password: tempPassword,
          tempPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCreateMsg(data.message || "Unable to create account.");
        return;
      }

      if (selectedRequestId) {
        await deleteRequest(selectedRequestId);
      }

      setCreateMsg("Account created successfully.");
      clearForm();
      await loadLenders();
      await loadRequests();
    } catch (err) {
      console.error(err);
      setCreateMsg("Network error while creating account.");
    }
  }

  useEffect(() => {
    loadLenders();
    loadRequests();
  }, []);

  const textSmall = {
    fontSize: 12,
    lineHeight: 1.45,
    opacity: 0.82
  };

  const sectionTitle = {
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15,
    color: "#f3f4f6"
  };

  const compactCardStyle = {
    padding: 13,
    marginTop: 9,
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    alignItems: "start",
    borderRadius: 16
  };

  const ghostBtnStyle = {
    fontSize: 11,
    padding: "7px 9px",
    borderRadius: 10
  };

  function statCardStyle(active) {
    return {
      marginTop: 0,
      padding: 14,
      textAlign: "left",
      cursor: "pointer",
      border: active ? "1px solid rgba(255,58,167,.75)" : "1px solid rgba(255,255,255,.08)",
      background: active
        ? "linear-gradient(180deg, rgba(255,58,167,.18), rgba(255,255,255,.035))"
        : undefined,
      boxShadow: active
        ? "0 0 30px rgba(255,58,167,.22), 0 18px 50px rgba(0,0,0,.35)"
        : undefined,
      transform: active ? "translateY(-2px)" : "translateY(0)",
      transition: "all .22s ease"
    };
  }

  function sectionRevealStyle(open) {
    return {
      maxHeight: open ? "6000px" : "0px",
      marginTop: open ? 10 : 0,
      opacity: open ? 1 : 0,
      transform: open ? "translateY(0)" : "translateY(-6px)",
      overflow: "hidden",
      transition: "max-height .32s ease, opacity .22s ease, transform .22s ease"
    };
  }

  function switchAccountView(view) {
    const nextView = accountFilter === view ? "" : view;

    setAccountFilter(nextView);

    if (!nextView) return;

    setTimeout(() => {
     const id =
  nextView === "requests"
    ? "signupRequestsSection"
    : "accountsSection";

      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 90);
  }

  function scrollToAccountsTop() {
    document.getElementById("accountsTop")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function activeButtonStyle(isActive) {
    return {
      ...ghostBtnStyle,
      background: isActive ? "#ff3ea5" : "rgba(255,255,255,.06)",
      color: isActive ? "#000" : "#fff",
      border: isActive ? "1px solid #ff3ea5" : "1px solid rgba(255,255,255,.14)"
    };
  }

  return (
    <AppShell>
      <div
        className="ll-card"
        style={{
          marginTop: 0,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={() => (window.location.href = "/welcome")}
          style={{
            border: 0,
            background: "transparent",
            color: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            padding: 0,
            fontWeight: 900,
            fontSize: 18
          }}
        >
         <img
  src={logo2}
  alt=""
  style={{
    width: 42,
    height: 42,
    objectFit: "contain"
  }}
/>
          {`LinkLedger • ${getRoleLabel()}`}
        </button>

{String(localStorage.getItem("userRole") || localStorage.getItem("role") || "").toLowerCase() === "superadmin" ? (
  <button
    type="button"
    onClick={() => (window.location.href = "/admin/employees")}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.06)",
      fontSize: 12,
      fontWeight: 800,
      color: "rgba(243,244,246,.75)",
      cursor: "pointer"
    }}
    title="Create and manage employee accounts"
  >
    <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff3aa7" }} />
    <span>&lt;</span>
    <span style={{ width: 10, height: 10, borderRadius: 999, background: "#4aa3ff" }} />
    <span>Legacy Mode</span>
  </button>
) : (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(255,255,255,.06)",
      fontSize: 12,
      fontWeight: 800,
      color: "rgba(243,244,246,.75)"
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff3aa7" }} />
    <span>&lt;</span>
    <span style={{ width: 10, height: 10, borderRadius: 999, background: "#4aa3ff" }} />
    <span>Legacy Mode</span>
  </div>
)}

        <div className="ll-row" style={{ gap: 10 }}>
          <span data-variant="ghost" style={{ ...ghostBtnStyle, border: "1px solid rgba(255,255,255,.14)" }}>
            {getRoleLabel()}: {localStorage.getItem("userEmail") || "Admin"}
          </span>

          <button
            data-variant="ghost"
            type="button"
            onClick={() => {
              localStorage.removeItem("authToken");
              localStorage.removeItem("userRole");
              localStorage.removeItem("role");
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap"
        }}
      >
        {canViewAccounts() && (
          <button
            type="button"
            onClick={() => (window.location.href = "/admin/accounts")}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 900,
              background:
                window.location.pathname === "/admin/accounts"
                  ? "#ff3ea5"
                  : "rgba(255,255,255,.06)",
              color:
                window.location.pathname === "/admin/accounts"
                  ? "#000"
                  : "#fff",
              border:
                window.location.pathname === "/admin/accounts"
                  ? "1px solid #ff3ea5"
                  : "1px solid rgba(255,255,255,.14)"
            }}
          >
            Accounts
          </button>
        )}

        {canViewDisputes() && (
          <button
            type="button"
            data-variant="ghost"
            onClick={() => (window.location.href = "/admin/disputes")}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 900
            }}
          >
            Disputes
          </button>
        )}

        {canViewConsents() && (
          <button
            type="button"
            data-variant="ghost"
            onClick={() => (window.location.href = "/admin/consents")}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 900
            }}
          >
            Consents
          </button>
        )}

        {canViewAudit() && (
          <button
            type="button"
            data-variant="ghost"
            onClick={() => (window.location.href = "/admin/audit")}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 900
            }}
          >
            Audit
          </button>
        )}
      </div>

      <div id="accountsTop" className="ll-grid" style={{ marginTop: 18, gap: 12 }}>
        <button
  type="button"
  className="ll-card"
  onClick={() => switchAccountView("accounts")}
  style={statCardStyle(accountFilter === "accounts")}
>
      
          <p style={{ margin: "0 0 6px", opacity: 0.62, fontSize: 12 }}>Accounts</p>
          <h2 style={{ margin: 0, fontSize: 22 }}>{institutionLenders.length}</h2>
        </button>

        <button
          type="button"
          className="ll-card"
          onClick={() => switchAccountView("requests")}
          style={statCardStyle(accountFilter === "requests")}
        >
          <p style={{ margin: "0 0 6px", opacity: 0.62, fontSize: 12 }}>Signup Requests</p>
          <h2 style={{ margin: 0, fontSize: 22 }}>{requests.length}</h2>
        </button>

        <button
          type="button"
          className="ll-card"
          onClick={() => switchAccountView("pendingPayments")}
          style={statCardStyle(accountFilter === "pendingPayments")}
        >
          <p style={{ margin: "0 0 6px", opacity: 0.62, fontSize: 12 }}>Pending Payments</p>
          <h2 style={{ margin: 0, fontSize: 22 }}>{pendingPayments || "—"}</h2>
        </button>
      </div>

      <section className="ll-card" style={{ marginTop: 14, padding: 18 }}>
        <div className="ll-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>Create Account</h2>
            <p style={{ margin: "5px 0 0", opacity: 0.65, fontSize: 12 }}>
              Autofill a signup request, add a temporary password, then create the institution account.
            </p>
          </div>

          <div className="ll-row" style={{ gap: 7 }}>
  

            <button data-variant="ghost" type="button" onClick={clearForm} style={ghostBtnStyle}>
              Clear
            </button>
          </div>
        </div>

        <form onSubmit={createLender} style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11 }}>ADMIN KEY optional</label>
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            autoComplete="off"
            style={inputStyle({ marginTop: 5, padding: 10, fontSize: 12 })}
          />

          <div className="ll-grid" style={{ marginTop: 10, gap: 10 }}>
            <div>
              <label style={{ fontSize: 11 }}>Business Name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required style={inputStyle({ marginTop: 5, padding: 10, fontSize: 12 })} />
            </div>

            <div>
              <label style={{ fontSize: 11 }}>Branch</label>
              <input value={branchName} onChange={(e) => setBranchName(e.target.value)} required style={inputStyle({ marginTop: 5, padding: 10, fontSize: 12 })} />
            </div>
          </div>

          <div className="ll-grid" style={{ marginTop: 10, gap: 10 }}>
            <div>
              <label style={{ fontSize: 11 }}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle({ marginTop: 5, padding: 10, fontSize: 12 })} />
            </div>

            <div>
              <label style={{ fontSize: 11 }}>NBIFIRA License No.</label>
              <input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} style={inputStyle({ marginTop: 5, padding: 10, fontSize: 12 })} />
            </div>
          </div>

          <div className="ll-grid" style={{ marginTop: 10, gap: 10 }}>
            <div>
              <label style={{ fontSize: 11 }}>Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required style={inputStyle({ marginTop: 5, padding: 10, fontSize: 12 })} />
            </div>

            <div>
              <label style={{ fontSize: 11 }}>Temporary Password</label>
              <input value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} required style={inputStyle({ marginTop: 5, padding: 10, fontSize: 12 })} />
            </div>
          </div>

          <button className="ll-btn-primary" type="submit" style={{ marginTop: 14, width: "100%", padding: 11, fontSize: 12, borderRadius: 12 }}>
            Create Account
          </button>

          {createMsg && <p style={{ marginTop: 10, fontSize: 12, opacity: 0.78 }}>{createMsg}</p>}
        </form>

        <div id="signupRequestsSection" style={{ marginTop: 18 }}>
          <div style={sectionTitle}>Signup Requests</div>

          <div style={sectionRevealStyle(accountFilter === "requests")}>
            <div className="admin-scroll-list" style={{ marginTop: 10 }}>
              <button data-variant="ghost" type="button" onClick={loadRequests} style={ghostBtnStyle}>
                Reload
              </button>

              <button data-variant="ghost" type="button" onClick={scrollToAccountsTop} style={{ ...ghostBtnStyle, marginLeft: 8 }}>
                Back Up
              </button>

              {requestsMsg && <p style={textSmall}>{requestsMsg}</p>}

              {requests.length === 0 && !requestsMsg ? (
                <p style={textSmall}>No signup requests available.</p>
              ) : (
                requests.map((r) => (
                  <div key={r._id} className="ll-result-card" style={compactCardStyle}>
                    <div style={textSmall}>
                      <p style={{ margin: "0 0 7px", fontSize: 13, opacity: 1 }}>
                        <b>{r.businessName || r.cashloanName || "Unknown Business"}</b>
                        {(r.branchName || r.cashloanBranch) ? ` • ${r.branchName || r.cashloanBranch}` : ""}
                      </p>

                      <p style={{ margin: "3px 0" }}><b>Email:</b> {r.email || r.cashloanEmail || "N/A"}</p>
                      {(r.phone || r.cashloanPhone) && <p style={{ margin: "3px 0" }}><b>Phone:</b> {r.phone || r.cashloanPhone}</p>}
                      {(r.licenseNo || r.licenceNo) && <p style={{ margin: "3px 0" }}><b>License:</b> {r.licenseNo || r.licenceNo}</p>}
                      {r.notes && <p style={{ margin: "3px 0" }}><b>Notes:</b> {r.notes}</p>}
                      {r.createdAt && (
                        <p style={{ margin: "5px 0 0", opacity: 0.55 }}>
                          Requested: {new Date(r.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="ll-row" style={{ justifyContent: "flex-end", gap: 7 }}>
                      <button className="ll-btn-primary" type="button" onClick={() => useRequest(r)} style={ghostBtnStyle}>
                        Autofill
                      </button>

                      <button data-variant="ghost" type="button" onClick={() => deleteRequest(r._id)} style={ghostBtnStyle}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div id="accountsSection" style={{ marginTop: 18 }}>
          <div style={sectionTitle}>Accounts</div>

          <div style={sectionRevealStyle(accountFilter === "accounts" || accountFilter === "pendingPayments")}>
            <div className="admin-scroll-list" style={{ marginTop: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 9, alignItems: "center" }}>
                <input
                  placeholder="Search accounts..."
                  value={lendersSearch}
                  onChange={(e) => setLendersSearch(e.target.value)}
                  style={inputStyle({ padding: 10, fontSize: 12 })}
                />

                <button data-variant="ghost" type="button" onClick={loadLenders} style={ghostBtnStyle}>
                  Reload
                </button>
              </div>

              <button data-variant="ghost" type="button" onClick={scrollToAccountsTop} style={{ ...ghostBtnStyle, marginTop: 8 }}>
                Back Up
              </button>

              {msg && <p style={textSmall}>{msg}</p>}

              {filteredLenders.length === 0 && !msg ? (
                <p style={textSmall}>No accounts available.</p>
              ) : (
                filteredLenders.map((u) => {
                  const accountStatus = String(u.status || "active").toLowerCase();
                  const billingStatus = String(u.billingStatus || "active").toLowerCase();
                  const dueDate = u.billingDueDate || u.dueDate || u.nextPaymentDueDate || "";

                  return (
                    <div key={u._id} className="ll-result-card" style={compactCardStyle}>
                      <div style={textSmall}>
                        <p style={{ margin: "0 0 7px", fontSize: 13, opacity: 1 }}>
                          <b>{u.businessName || "Unnamed Institution"}</b>
                          {u.branchName ? ` • ${u.branchName}` : ""}
                        </p>

                        <p style={{ margin: "3px 0" }}><b>Email:</b> {u.email || "N/A"}</p>
                        {u.phone && <p style={{ margin: "3px 0" }}><b>Phone:</b> {u.phone}</p>}
                        {u.licenseNo && <p style={{ margin: "3px 0" }}><b>License:</b> {u.licenseNo}</p>}

                        <p style={{ margin: "5px 0 0" }}>
                          <b>Status:</b>{" "}
                          <span style={statusBadgeStyle(accountStatus)}>
                            {accountStatus}
                          </span>
                        </p>

                        <p style={{ margin: "5px 0 0" }}>
                          <b>Billing:</b>{" "}
                          <span style={statusBadgeStyle(billingStatus)}>
                            {billingStatus}
                          </span>
                          {dueDate ? (
                            <span style={{ marginLeft: 8, opacity: 0.65 }}>
                              Due: {new Date(dueDate).toLocaleDateString()}
                            </span>
                          ) : null}
                        </p>
                      </div>

                      <div className="ll-row" style={{ justifyContent: "flex-end", gap: 7 }}>
                        <button type="button" style={activeButtonStyle(accountStatus === "suspended")} onClick={() => updateLenderStatus(u._id, "suspended")}>
                          Suspend
                        </button>

                        <button type="button" style={activeButtonStyle(accountStatus === "active")} onClick={() => updateLenderStatus(u._id, "active")}>
                          Activate
                        </button>

                        <button data-variant="ghost" type="button" style={ghostBtnStyle} onClick={() => secureLender(u._id, u.email)}>
                          Secure
                        </button>

                        <button type="button" style={activeButtonStyle(billingStatus === "due" || billingStatus === "pending")} onClick={() => updateBilling(u._id, "due")}>
                          Due
                        </button>

                        <button type="button" style={activeButtonStyle(billingStatus === "paid" || billingStatus === "approved")} onClick={() => updateBilling(u._id, "paid")}>
                          Paid
                        </button>

                        <button type="button" style={activeButtonStyle(billingStatus === "overdue" || billingStatus === "past_due")} onClick={() => updateBilling(u._id, "overdue")}>
                          Overdue
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
      <AdminMessenger />
    </AppShell>
  );
}

function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [msg, setMsg] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  async function loadDisputes() {
    setMsg("Loading disputes...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/disputes`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        setMsg(data.message || "Unable to load disputes.");
        return;
      }

      setDisputes(Array.isArray(data) ? data : []);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Network error while loading disputes.");
    }
  }

  async function updateDispute(disputeId, adminStatus) {
    const adminNote = window.prompt("Admin note / action taken:") || "";

    setMsg("Updating dispute...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          status: adminStatus,
          adminStatus,
          adminNote: adminNote.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to update dispute.");
        return;
      }

      setMsg("Dispute updated successfully.");
      await loadDisputes();
    } catch (err) {
      console.error(err);
      setMsg("Network error while updating dispute.");
    }
  }

  function isOverdue(d) {
    const opened = new Date(d.createdAt || d.openedAt || Date.now());
    const due = new Date(opened);
    due.setDate(due.getDate() + 5);

    return (
      new Date() > due &&
      String(d.adminStatus || d.status || "pending").toLowerCase() !== "resolved"
    );
  }

  const visibleDisputes = showOverdueOnly
    ? disputes.filter((d) => isOverdue(d))
    : disputes;

  useEffect(() => {
    loadDisputes();
  }, []);

  const smallText = {
    fontSize: 12,
    lineHeight: 1.45,
    opacity: 0.82
  };

  const cardGrid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginTop: 12
  };

  return (
    <AppShell>
      <AdminTopbar title={`LinkLedger • ${getRoleLabel()}`} active="disputes" />

      <section className="ll-card" style={{ marginTop: 18, padding: 20 }}>
        <div className="ll-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Disputes</h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.65 }}>
              Shows who opened it, who it is against, and lets admin respond.
            </p>
          </div>

          <div className="ll-row" style={{ gap: 8 }}>
            <button data-variant="ghost" onClick={loadDisputes} style={{ fontSize: 11 }}>
              Reload Disputes
            </button>

            <button data-variant="ghost" onClick={() => setShowOverdueOnly(!showOverdueOnly)} style={{ fontSize: 11 }}>
              {showOverdueOnly ? "Show All" : "Overdue SLA"}
            </button>
          </div>
        </div>

        {msg && <p style={smallText}>{msg}</p>}

        {visibleDisputes.length === 0 && !msg ? (
          <p style={smallText}>No disputes available.</p>
        ) : (
          visibleDisputes.map((d) => {
            const status = d.adminStatus || d.status || "pending";

            return (
              <div
                key={d._id}
                className="ll-result-card"
                style={{
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 18
                }}
              >
                <div className="ll-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14 }}>
                      Omang: {d.nationalId || "N/A"}
                    </h3>

                    <p style={{ margin: "5px 0 0", fontSize: 12, opacity: 0.62 }}>
                      Opened: {d.createdAt ? new Date(d.createdAt).toLocaleString() : "N/A"}
                    </p>
                  </div>

                  <span style={statusBadgeStyle(status)}>
                    {status}
                  </span>
                </div>

                <div style={cardGrid}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>RAISED BY</p>
                    <p style={{ margin: "5px 0 0", fontSize: 12 }}>
                      {d.raisedByCashloanName || d.raisedByBusinessName || d.raisedByEmail || d.lenderEmail || "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>AGAINST</p>
                    <p style={{ margin: "5px 0 0", fontSize: 12 }}>
                      {d.againstCashloanName || d.againstBusinessName || d.againstCashloanEmail || "Unknown"}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                  {d.notes && (
                    <p style={smallText}>
                      <b>Reason:</b> {d.notes}
                    </p>
                  )}

                  {d.adminNote && (
                    <p style={smallText}>
                      <b>Action Taken:</b> {d.adminNote}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    background: "rgba(255,255,255,.04)",
                    border: "1px solid rgba(255,255,255,.06)"
                  }}
                >
                  <p style={{ ...smallText, margin: "0 0 4px" }}>
                    🟣 Opened: {d.createdAt ? new Date(d.createdAt).toLocaleString() : "N/A"}
                  </p>
                  <p style={{ ...smallText, margin: "0 0 4px" }}>
                    🟡 Last update: {d.adminUpdatedAt ? new Date(d.adminUpdatedAt).toLocaleString() : "N/A"}
                  </p>
                  <p style={{ ...smallText, margin: 0 }}>
                    📌 Current status: {status}
                  </p>
                </div>

                <div className="ll-row" style={{ marginTop: 12, gap: 8 }}>
                  <button data-variant="ghost" onClick={() => updateDispute(d._id, "investigating")} style={{ fontSize: 11 }}>
                    Investigate
                  </button>

                  <button className="ll-btn-primary" onClick={() => updateDispute(d._id, "resolved")} style={{ fontSize: 11 }}>
                    Resolve
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
      <AdminMessenger />
    </AppShell>
  );
}

function AdminConsents() {
  const REJECTION_REASONS = [
    "Unclear image quality",
    "Incomplete document",
    "Missing signature",
    "Expired / outdated consent",
    "Verification mismatch",
    "Unsupported document format",
    "Other compliance issue"
  ];

  const [consents, setConsents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [nationalIdFilter, setNationalIdFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [openRejectId, setOpenRejectId] = useState("");
  const [rejectReasonById, setRejectReasonById] = useState({});
  const [rejectNoteById, setRejectNoteById] = useState({});

  async function loadConsents() {
    setMsg("Loading consents...");

    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (nationalIdFilter.trim()) params.set("nationalId", nationalIdFilter.trim());

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/consents?${params.toString()}`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        setMsg(data.message || "Unable to load consents.");
        return;
      }

      setConsents(Array.isArray(data) ? data : []);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Network error while loading consents.");
    }
  }

  async function updateConsent(consentId, consentStatus) {
    const cleanStatus = String(consentStatus || "").toLowerCase().trim();

    let note = "Consent approved.";
    let rejectionReason = "";

    if (cleanStatus === "approved") {
      const ok = window.confirm(
        "Approve this consent evidence and send an automatic approval message through LinkLedger Inbox?"
      );

      if (!ok) return;
    }

    if (cleanStatus === "rejected") {
      rejectionReason = String(rejectReasonById[consentId] || "").trim();
      const extraNote = String(rejectNoteById[consentId] || "").trim();

      if (!rejectionReason) {
        alert("Please select a rejection reason.");
        return;
      }

      note = extraNote || rejectionReason;
    }

    setMsg(`Updating consent as ${cleanStatus}...`);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/consents/${consentId}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          consentStatus: cleanStatus,
          notes: note,
          rejectionReason,
          notifyInbox: true
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to update consent.");
        return;
      }

      setMsg(`Consent ${cleanStatus}. Automatic inbox message queued.`);
      setOpenRejectId("");
      setRejectReasonById((prev) => ({ ...prev, [consentId]: "" }));
      setRejectNoteById((prev) => ({ ...prev, [consentId]: "" }));

      await loadConsents();
    } catch (err) {
      console.error(err);
      setMsg("Network error while updating consent.");
    }
  }

  useEffect(() => {
    loadConsents();
  }, []);

  useEffect(() => {
    loadConsents();
  }, [statusFilter]);

  const smallText = {
    fontSize: 12,
    lineHeight: 1.45,
    opacity: 0.82
  };

  function submittedByName(c) {
    return (
      c.lenderName ||
      c.cashloanName ||
      c.businessName ||
      c.lenderBusinessName ||
      c.lenderEmail ||
      "—"
    );
  }

  function submittedByBranch(c) {
    return c.lenderBranch || c.branchName || c.cashloanBranch || "";
  }

  function submittedByEmail(c) {
    return c.lenderEmail || c.email || c.cashloanEmail || "—";
  }

  return (
    <AppShell>
      <AdminTopbar title={`LinkLedger • ${getRoleLabel()}`} active="consents" />

      <section className="ll-card" style={{ marginTop: 18, padding: 20 }}>
        <div className="ll-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Consent Approvals</h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.65 }}>
              Approve / reject borrower consent evidence.
            </p>
          </div>

          <div className="ll-row" style={{ gap: 8 }}>
            <button data-variant="ghost" onClick={loadConsents} style={{ fontSize: 11 }}>
              Reload
            </button>
          </div>
        </div>

        <div className="ll-grid" style={{ marginTop: 12, gap: 12 }}>
          <div>
            <label style={{ fontSize: 12 }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle({ marginTop: 6, fontSize: 12 })}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12 }}>Omang (optional)</label>
            <input
              value={nationalIdFilter}
              onChange={(e) => setNationalIdFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadConsents();
              }}
              placeholder="e.g. 123456789"
              style={inputStyle({ marginTop: 6, fontSize: 12 })}
            />
          </div>
        </div>

        {msg && <p style={smallText}>{msg}</p>}

        <p style={{ ...smallText, marginTop: 10 }}>
          <b>Items:</b> {consents.length}
        </p>

        <div style={{ marginTop: 12 }}>
          {consents.length === 0 && !msg ? (
            <div className="ll-result-card">
              <p style={smallText}>No consent items.</p>
            </div>
          ) : (
            consents.map((c) => {
              const id = c._id;
              const status = c.consentStatus || c.status || "pending";
              const omang = c.nationalId || c.clientNationalId || "—";
              const fullName = c.fullName || c.clientName || "";
              const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "—";
              const lenderName = submittedByName(c);
              const lenderBranch = submittedByBranch(c);
              const lenderEmail = submittedByEmail(c);
              const fromLine = [lenderName, lenderBranch].filter(Boolean).join(" • ");
              const rejectOpen = openRejectId === id;

              return (
                <div key={id} className="consent-premium-card">
                  <div className="consent-topline">
                    <div>
                      <div className="consent-title">
                        Consent Evidence • Omang: {omang}
                      </div>

                      <p style={{ ...smallText, margin: "4px 0 0" }}>
                        {fullName ? (
                          <>
                            Client: <b style={{ color: "rgba(244,245,248,0.95)" }}>{fullName}</b>
                            {" • "}
                          </>
                        ) : null}
                        Uploaded: {created}
                      </p>
                    </div>

                    <span style={statusBadgeStyle(status)}>
                      {status}
                    </span>
                  </div>

                  <div className="consent-meta-grid">
                    <div>
                      <div className="mini-label">Submitted by</div>
                      <div className="mini-value">{fromLine || lenderEmail}</div>
                    </div>

                    <div>
                      <div className="mini-label">Email</div>
                      <div className="mini-value">{lenderEmail}</div>
                    </div>
                  </div>

                  <div className="consent-actions">
                    <button
                      data-variant="ghost"
                      type="button"
                      onClick={() => openProtectedFile(`${API_BASE_URL}/api/admin/consents/${id}/file`)}
                      style={{ fontSize: 11 }}
                    >
                      View Consent
                    </button>

                    <button
                      className="ll-btn-primary"
                      type="button"
                      onClick={() => updateConsent(id, "approved")}
                      style={{ fontSize: 11 }}
                    >
                      Approve + Notify
                    </button>

                    <button
                      data-variant="ghost"
                      type="button"
                      onClick={() => setOpenRejectId(rejectOpen ? "" : id)}
                      style={{ fontSize: 11 }}
                    >
                      Reject + Notify
                    </button>
                  </div>

                  {rejectOpen && (
                    <div className="consent-reject-box">
                      <div className="mini-label">Rejection reason</div>

                      <select
                        value={rejectReasonById[id] || ""}
                        onChange={(e) =>
                          setRejectReasonById((prev) => ({
                            ...prev,
                            [id]: e.target.value
                          }))
                        }
                        style={inputStyle({ fontSize: 12 })}
                      >
                        <option value="">Select reason...</option>
                        {REJECTION_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>

                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 12 }}>Additional note optional</label>
                        <input
                          value={rejectNoteById[id] || ""}
                          onChange={(e) =>
                            setRejectNoteById((prev) => ({
                              ...prev,
                              [id]: e.target.value
                            }))
                          }
                          placeholder="Example: Please upload a clearer full-page copy."
                          style={inputStyle({ marginTop: 6, fontSize: 12 })}
                        />
                      </div>

                      <p style={{ ...smallText, marginTop: 8 }}>
                        This will update the consent status and send an automatic compliance message through the LinkLedger Inbox.
                      </p>

                      <div className="ll-row" style={{ gap: 8, marginTop: 12 }}>
                        <button
                          className="ll-btn-primary"
                          type="button"
                          onClick={() => updateConsent(id, "rejected")}
                          style={{ fontSize: 11 }}
                        >
                          Confirm Rejection
                        </button>

                        <button
                          data-variant="ghost"
                          type="button"
                          onClick={() => setOpenRejectId("")}
                          style={{ fontSize: 11 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <AdminMessenger />
    </AppShell>
  );
}

function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [nationalId, setNationalId] = useState("");
  const [limit, setLimit] = useState(100);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const PAGE_SIZE = 25;

  async function loadAudit() {
    setMsg("Loading audit logs...");
    setPage(1);

    const params = new URLSearchParams();
    if (nationalId.trim()) params.set("nationalId", nationalId.trim());
    params.set("limit", String(limit || 100));

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/audit?${params.toString()}`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        setMsg(data.message || "Unable to load audit logs.");
        return;
      }

      setLogs(Array.isArray(data) ? data : []);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Network error while loading audit logs.");
    }
  }

  function formatRelativeTime(value) {
    if (!value) return "N/A";

    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

    return date.toLocaleString();
  }

  function exportAuditCSV() {
    const rows = [
      ["Date", "Actor", "Role", "Action", "National ID", "Target", "Severity", "Status", "Details"],
      ...filteredLogs.map((l) => [
        l.createdAt ? new Date(l.createdAt).toLocaleString() : "",
        l.actorEmail || "",
        l.actorRole || "",
        l.action || "",
        l.targetNationalId || "",
        l.targetName || "",
        l.riskSeverity || "",
        l.riskStatus || "",
        JSON.stringify(l.meta || {})
      ])
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "audit_logs.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  function getActionInfo(actionValue) {
    const action = String(actionValue || "unknown").toLowerCase();

    if (action.includes("delete")) return { label: actionValue || "Delete", icon: "🛑", color: "#ff4d6d" };
    if (action.includes("dispute")) return { label: actionValue || "Dispute", icon: "⚠️", color: "#ffb703" };
    if (action.includes("search")) return { label: actionValue || "Search", icon: "🔎", color: "#7cc1ff" };
    if (action.includes("login")) return { label: actionValue || "Login", icon: "🟢", color: "#5CFFB0" };
    if (action.includes("update") || action.includes("edit")) return { label: actionValue || "Update", icon: "✏️", color: "#ff5cc0" };
    if (action.includes("message")) return { label: actionValue || "Message", icon: "💬", color: "#b48cff" };

    return { label: actionValue || "Activity", icon: "•", color: "#d6d7dd" };
  }

  function getSeverityInfo(value) {
    const severity = String(value || "medium").toLowerCase();

    if (severity === "critical") return { label: "Critical", color: "#ff1744" };
    if (severity === "high") return { label: "High", color: "#ff7a7a" };
    if (severity === "medium") return { label: "Medium", color: "#ffd25c" };
    if (severity === "low") return { label: "Low", color: "#5cffb0" };

    return { label: "Medium", color: "#ffd25c" };
  }

  function isNewActivity(log) {
    if (!log.createdAt) return false;
    return Date.now() - new Date(log.createdAt).getTime() < 5 * 60 * 1000;
  }

function isUnusualLogin(log) {
  const action = String(log.action || "").toLowerCase();
  if (!action.includes("login")) return false;

  const date = new Date(log.createdAt || log.sentAt || log.updatedAt || "");
  if (Number.isNaN(date.getTime())) return false;

  const hour = date.getHours();
  const minute = date.getMinutes();

  const after730pm = hour > 19 || (hour === 19 && minute >= 30);
  const before7am = hour < 7;

  return after730pm || before7am;
}

  const searchCount = logs.filter((l) =>
    String(l.action || "").toLowerCase().includes("search")
  ).length;

  const disputeCount = logs.filter((l) =>
    String(l.action || "").toLowerCase().includes("dispute")
  ).length;

  const loginCount = logs.filter((l) =>
    String(l.action || "").toLowerCase().includes("login")
  ).length;

  const highRiskCount = logs.filter((l) =>
    ["high", "critical"].includes(String(l.riskSeverity || "").toLowerCase()) || isUnusualLogin(l)
  ).length;

  const filteredLogs = logs.filter((l) => {
    const haystack = [
      l.action,
      l.actorEmail,
      l.actorRole,
      l.targetNationalId,
      l.targetName,
      l.targetType,
      l.ip,
      l.userAgent,
      l.meta?.businessName,
      l.meta?.branchName
    ]
      .join(" ")
      .toLowerCase();

    const q = query.trim().toLowerCase();
    const action = String(l.action || "").toLowerCase();
    const severity = isUnusualLogin(l) ? "high" : String(l.riskSeverity || "medium").toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    const matchesAction = actionFilter === "all" || action.includes(actionFilter);
    const matchesSeverity = severityFilter === "all" || severity === severityFilter;

    return matchesQuery && matchesAction && matchesSeverity;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  const paginatedLogs = filteredLogs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    loadAudit();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, actionFilter, severityFilter]);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      loadAudit();
    }, 30000);

    return () => clearInterval(timer);
  }, [autoRefresh, nationalId, limit]);

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial",
        background: "#0b0c10",
        color: "#fff",
        minHeight: "100vh"
      }}
    >
      <AdminTopbar title={`LinkLedger • ${getRoleLabel()}`} active="audit" />

      <section
        style={{
          marginTop: 24,
          padding: 22,
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.025))",
          boxShadow: "0 20px 60px rgba(0,0,0,.35)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(120px, 1fr))",
            gap: 12,
            marginBottom: 16
          }}
        >
          {[
            ["Total Events", logs.length, "all", "all"],
            ["Searches", searchCount, "search", "all"],
            ["Disputes", disputeCount, "dispute", "all"],
            ["Logins", loginCount, "login", "all"],
            ["Risk Alerts", highRiskCount, "all", "high"]
          ].map(([label, value, nextAction, nextSeverity]) => {
            const activeCard = actionFilter === nextAction && severityFilter === nextSeverity;

            return (
            <button
              type="button"
              key={label}
              onClick={() => {
                setActionFilter(nextAction);
                setSeverityFilter(nextSeverity);
                setPage(1);
              }}
              style={{
                padding: 12,
                textAlign: "left",
                cursor: "pointer",
                border: activeCard ? "1px solid rgba(255,58,167,.75)" : "1px solid rgba(255,255,255,.055)",
                borderRadius: 18,
                background: activeCard ? "linear-gradient(180deg, rgba(255,58,167,.18), rgba(255,255,255,.035))" : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025))",
                color: "#fff",
                boxShadow: activeCard ? "0 0 30px rgba(255,58,167,.22), 0 18px 50px rgba(0,0,0,.35)" : "none"
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.58 }}>{label}</div>
              <h2 style={{ margin: "6px 0 0", fontSize: 22 }}>{value}</h2>
            </button>
          );
          })}
        </div>

        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            padding: 14,
            margin: "0 -6px 16px",
            border: "1px solid rgba(255,255,255,.055)",
            borderRadius: 20,
            background: "rgba(11,12,16,.92)",
            backdropFilter: "blur(10px)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Audit Trail</h2>
              <p style={{ margin: "5px 0 0", opacity: 0.58, fontSize: 13 }}>
                Compliance record of logins, searches, disputes, edits, and admin activity.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {autoRefresh && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5cffb0" }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: "#5cffb0",
                      boxShadow: "0 0 12px #5cffb0"
                    }}
                  />
                  Live
                </span>
              )}

              <button onClick={loadAudit}>Reload</button>
              <button onClick={exportAuditCSV}>Export</button>
              <button onClick={() => setAutoRefresh(!autoRefresh)}>
                {autoRefresh ? "Auto On" : "Auto Off"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 110px",
              gap: 10,
              marginTop: 12
            }}
          >
            <div>
              <label>Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Actor, action, branch, device..."
                style={inputStyle({ marginTop: 6 })}
              />
            </div>

            <div>
              <label>Omang / National ID</label>
              <input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="e.g. 123456789"
                style={inputStyle({ marginTop: 6 })}
              />
            </div>

            <div>
              <label>Limit</label>
              <input
                type="number"
                min="1"
                max="200"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                style={inputStyle({ marginTop: 6 })}
              />
            </div>
          </div>

         <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 10,
    marginTop: 12,
    alignItems: "end"
  }}
>
  <div>
    <label>Action Type</label>
    <select
      value={actionFilter}
      onChange={(e) => {
        setActionFilter(e.target.value);
        setPage(1);
      }}
      style={inputStyle({ marginTop: 6 })}
    >
      <option value="all">All activity</option>
      <option value="login">Logins</option>
      <option value="search">Searches</option>
      <option value="dispute">Disputes</option>
      <option value="update">Updates</option>
      <option value="delete">Deletes</option>
      <option value="message">Messages</option>
    </select>
  </div>

  <div>
    <label>Risk Level</label>
    <select
      value={severityFilter}
      onChange={(e) => {
        setSeverityFilter(e.target.value);
        setPage(1);
      }}
      style={inputStyle({ marginTop: 6 })}
    >
      <option value="all">All risk levels</option>
      <option value="low">Low risk</option>
      <option value="medium">Medium risk</option>
      <option value="high">High risk</option>
      <option value="critical">Critical risk</option>
    </select>
  </div>

  <button
    type="button"
    onClick={loadAudit}
    style={{
      height: 44,
      padding: "10px 16px",
      borderRadius: 14,
      fontWeight: 900
    }}
  >
    Apply
  </button>
</div>
          </div>

        {msg && <p style={{ opacity: 0.68, fontSize: 13 }}>{msg}</p>}

        {filteredLogs.length === 0 && !msg ? (
          <p>No audit logs available.</p>
        ) : (
          paginatedLogs.map((l) => {
            const actionInfo = getActionInfo(l.action);
            const unusualLogin = isUnusualLogin(l);
            const severityInfo = getSeverityInfo(unusualLogin ? "high" : l.riskSeverity);
            const fresh = isNewActivity(l);

            return (
              <div
                key={l._id || `${l.createdAt}-${l.action}`}
                style={{
                  marginTop: 7,
                  padding: 10,
                  border: fresh
                    ? "1px solid rgba(255,58,167,.22)"
                    : "1px solid rgba(255,255,255,.04)",
                  borderRadius: 18,
                  background: fresh
                    ? "linear-gradient(180deg, rgba(255,58,167,.10), #0d1015)"
                    : "linear-gradient(180deg,#111318,#0d1015)",
                  color: "#fff",
                  boxShadow: fresh ? "0 0 18px rgba(255,58,167,.08)" : "none"
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    alignItems: "start"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 9px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,.055)",
                          border: `1px solid ${actionInfo.color}`,
                          color: actionInfo.color,
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        <span>{actionInfo.icon}</span>
                        <span>{actionInfo.label}</span>
                      </span>

                      <span
                        style={{
                          display: "inline-flex",
                          padding: "4px 9px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,.045)",
                          border: `1px solid ${severityInfo.color}`,
                          color: severityInfo.color,
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        {severityInfo.label}
                      </span>

                      {fresh && (
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "4px 9px",
                            borderRadius: 999,
                            background: "rgba(255,58,167,.14)",
                            color: "#ff5cc0",
                            fontSize: 11,
                            fontWeight: 800
                          }}
                        >
                          New
                        </span>
                      )}

                      {unusualLogin && (
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "4px 9px",
                            borderRadius: 999,
                            background: "rgba(255,77,77,.15)",
                            color: "#ffc1c1",
                            fontSize: 11,
                            fontWeight: 900
                          }}
                        >
                          Risk Alert: unusual login time
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: "8px 0 2px", fontSize: 13 }}>
                      {l.actorEmail || "Unknown User"}
                    </h3>

                    <p style={{ opacity: 0.55, margin: 0, fontSize: 12 }}>
                      {l.actorRole || "N/A"}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", fontSize: 12, opacity: 0.68 }}>
                    <div>{formatRelativeTime(l.createdAt)}</div>
                    <div style={{ marginTop: 3, opacity: 0.48 }}>
                      {l.createdAt ? new Date(l.createdAt).toLocaleString() : "N/A"}
                    </div>

                    {l.targetNationalId && (
                      <div style={{ marginTop: 5 }}>
                        <b>Omang:</b> {l.targetNationalId}
                      </div>
                    )}
                  </div>
                </div>

                {(l.targetName || l.targetType || l.ip || l.meta?.businessName || l.meta?.branchName) && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255,255,255,.045)",
                      display: "flex",
                      gap: 18,
                      flexWrap: "wrap",
                      fontSize: 12,
                      opacity: 0.82
                    }}
                  >
                    {(l.targetName || l.meta?.businessName) && (
                      <span><b>Business:</b> {l.targetName || l.meta?.businessName}</span>
                    )}

                    {(l.targetType || l.meta?.branchName) && (
                      <span><b>Type/Branch:</b> {l.targetType || l.meta?.branchName}</span>
                    )}

                    {l.riskStatus && (
                      <span><b>Status:</b> {l.riskStatus}</span>
                    )}

                    {l.ip && (
                      <span><b>IP:</b> {l.ip}</span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11, opacity: 0.42 }}>
                    Audit trail locked • Not editable
                  </span>

                  <button
                    onClick={() => setSelectedLog(l)}
                    style={{
                      padding: "5px 9px",
                      borderRadius: 10,
                      fontSize: 11
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })
        )}

        {filteredLogs.length > PAGE_SIZE && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 20,
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <p style={{ opacity: 0.62, fontSize: 13 }}>
              Showing {(page - 1) * PAGE_SIZE + 1}
              {" - "}
              {Math.min(page * PAGE_SIZE, filteredLogs.length)}
              {" of "}
              {filteredLogs.length}
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: 24
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(820px, 96vw)",
              maxHeight: "86vh",
              overflow: "auto",
              padding: 22,
              borderRadius: 22,
              background: "#111318",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.08)",
              boxShadow: "0 30px 90px rgba(0,0,0,.65)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Audit Detail</h2>
                <p style={{ opacity: 0.6 }}>Full locked activity record.</p>
              </div>

              <button onClick={() => setSelectedLog(null)}>Close</button>
            </div>

            <pre
              style={{
                marginTop: 14,
                whiteSpace: "pre-wrap",
                overflowX: "auto",
                background: "#0b0c10",
                padding: 14,
                borderRadius: 14,
                fontSize: 12,
                border: "1px solid rgba(255,255,255,.05)"
              }}
            >
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        </div>
      )}
      <AdminMessenger />
    </main>
  );
}

function Placeholder({ title }) {
  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>{title}</h1>
      <p>This React page is ready to be migrated next.</p>
      <Link to="/">Back home</Link>
    </div>
  );
}

function AdminMessagesPage() {
  return (
    <AppShell>
      <AdminTopbar title="LinkLedger • Super Admin" active="messages" />
      <AdminMessenger defaultOpen={true} pageMode={true} />
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/set-password" element={<SetPassword />} />

      <Route
        path="/welcome"
        element={
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        }
      />

      <Route path="/compliance" element={<Compliance />} />

      <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <>
        <Dashboard />
        <DashboardMessengerWidget />
      </>
    </ProtectedRoute>
  }
/>

 <Route
  path="/app/dashboard"
  element={
    <ProtectedRoute>
      <>
        <Dashboard />
        <DashboardMessengerWidget />
      </>
    </ProtectedRoute>
  }
/>

      <Route
        path="/admin/accounts"
        element={
          <AdminRoute allow={canViewAccounts}>
            <AdminAccounts />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/disputes"
        element={
          <AdminRoute allow={canViewDisputes}>
            <AdminDisputes />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/consents"
        element={
          <AdminRoute allow={canViewConsents}>
            <ImportedAdminConsents />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/audit"
        element={
          <AdminRoute allow={canViewAudit}>
            <AdminAudit />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/messages"
        element={
          <AdminRoute allow={canViewMessenger}>
            <AdminMessagesPage />
          </AdminRoute>
        }
      />

      <Route
  path="/admin/employees"
  element={
    <AdminRoute allow={canViewAccounts}>
      <AdminEmployees />
    </AdminRoute>
  }
/>

      <Route path="*" element={<Placeholder title="Page Not Found" />} />
    </Routes>
  );
}