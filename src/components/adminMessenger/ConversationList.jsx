import { formatShortTime } from "./messengerUtils";

function getRole() {
  return String(
    localStorage.getItem("userRole") ||
    localStorage.getItem("role") ||
    "superadmin"
  )
    .toLowerCase()
    .trim();
}

function getFiltersForRole(role) {
  if (role === "finance") return ["all", "unread", "payment", "finance"];
  if (role === "support_compliance") return ["all", "unread", "support", "compliance", "dispute", "general"];
  if (role === "audit_viewer") return [];
  return ["all", "unread", "payment", "support", "compliance", "finance", "dispute", "audit", "general"];
}

export default function ConversationList({
  conversations,
  activeEmail,
  unreadTotal,
  filter,
  setFilter,
  search,
  setSearch,
  openConversation,
  loadConversations
}) {
  const role = getRole();
  const filters = getFiltersForRole(role);

  if (role === "audit_viewer") {
    return null;
  }

  return (
    <aside className="ll-ops-sidebar">
      <div className="ll-ops-side-head">
        <h2>Inbox</h2>
        <button className="ll-ops-pink-btn" type="button" onClick={loadConversations}>
          Refresh
        </button>
      </div>

      <div className="ll-ops-search-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search institution, branch, email..."
        />
      </div>

      <div className="ll-ops-filter-row">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={`ll-ops-filter ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="ll-ops-count-line">
        {conversations.length} conversations • {unreadTotal} unread
      </div>

      <div className="ll-ops-conversations-list">
        {conversations.length === 0 ? <div className="ll-ops-empty">No conversations found.</div> : null}

        {conversations.map((c) => {
          const email = String(c.lenderEmail || "").toLowerCase().trim();
          const active = email === activeEmail;
          const unread = Number(c.unreadAdmin || 0);

          return (
            <button
              key={email || c._id}
              type="button"
              className={`ll-ops-conversation-card ${active ? "active" : ""}`}
              onClick={() => openConversation(email)}
            >
              <div className="ll-ops-conversation-top">
                <div>
                  <div className="ll-ops-conversation-name">{c.lenderName || c.lenderEmail || "Unknown Institution"}</div>
                  <div className="ll-ops-conversation-email">{email}</div>
                </div>

                <div className="ll-ops-conversation-right">
                  {unread > 0 ? <span className="ll-ops-unread-dot ll-ops-buzzy-dot">{unread}</span> : null}
                  <span className="ll-ops-conversation-time">{formatShortTime(c.lastAt)}</span>
                </div>
              </div>

              <div className="ll-ops-conversation-branch">{c.lenderBranch || "No branch listed"}</div>
              <div className="ll-ops-conversation-preview">{c.lastMessage || "No message preview"}</div>

              <div className="ll-ops-conversation-tags">
                <span>{c.lastCategory || "general"}</span>
                {c.lastHasAttachment ? <span>📎 attachment</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}