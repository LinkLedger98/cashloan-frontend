import { formatFullTime, getAdminEmail, normalizeMetaLink } from "./messengerUtils";

export default function MessageBubble({ message, lenderName, renderAdminAvatar, renderLenderAvatar, renderAttachment, isLastAdminMessage }) {
  const senderRole = String(message.senderRole || "").toLowerCase();
  const isAdmin = senderRole === "superadmin" || senderRole === "admin";
  const actionLink = normalizeMetaLink(message.metaLink);

  return (
    <div className="ll-ops-message-block">
      <div className={`ll-ops-thread-msg ${isAdmin ? "admin-side" : "lender-side"}`}>
        {!isAdmin ? (
          <div className="ll-ops-msg-avatar lender-avatar" title={lenderName}>
            {renderLenderAvatar()}
          </div>
        ) : null}

        <div className="ll-ops-thread-bubble">
          <div className="ll-ops-msg-meta">
            <span>{isAdmin ? `LinkLedger • ${getAdminEmail()}` : lenderName}</span>
            <span>{formatFullTime(message.sentAt || message.createdAt)}</span>
          </div>

          {message.message ? <div className="ll-ops-msg-text">{message.message}</div> : null}
          {renderAttachment(message.attachment)}

          {actionLink && message.metaLabel ? (
            <div className="ll-ops-msg-action-wrap">
              <a className="ll-ops-msg-action-btn" href={actionLink}>{message.metaLabel}</a>
            </div>
          ) : null}

          <div className="ll-ops-lock">🔒 Locked / audited message</div>
        </div>

        {isAdmin ? (
          <div className="ll-ops-msg-avatar admin-avatar" title={getAdminEmail()}>
            {renderAdminAvatar()}
          </div>
        ) : null}
      </div>

      {isAdmin && isLastAdminMessage ? (
        <div className="ll-ops-seen-row">
          <span>Seen by operations desk</span>
          <span className="ll-ops-seen-dot" title="Seen" />
        </div>
      ) : null}
    </div>
  );
}
