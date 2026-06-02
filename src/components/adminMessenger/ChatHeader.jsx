export default function ChatHeader({
  lenderName,
  lenderBranch,
  activeEmail,
  category,
  activeConversation,
  renderLenderAvatar,
  adminAvatarInputRef,
  handleAdminAvatarUpload,
  hopScroll,
  loadThread
}) {
  return (
    <div className="ll-ops-chat-head">
      <div className="ll-ops-chat-user-wrap">
        <div className="ll-ops-active-lender-avatar" key={activeEmail || lenderName}>
          {renderLenderAvatar()}
        </div>

        <div className="ll-ops-chat-user-info">
          <h2>{lenderName}</h2>
          <p>{activeEmail}{lenderBranch ? ` • ${lenderBranch}` : ""}</p>
        </div>
      </div>

      <div className="ll-ops-chat-actions">
        <span className="ll-ops-category-pill">{activeConversation?.lastCategory || category || "general"}</span>
        <input
          ref={adminAvatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAdminAvatarUpload}
        />
        <button type="button" className="ll-ops-filter" onClick={() => adminAvatarInputRef.current?.click()} title="Upload admin display picture">
          🖼️ Admin DP
        </button>
        <button type="button" className="ll-ops-filter" onClick={() => hopScroll("up")} title="Scroll up">↑</button>
        <button type="button" className="ll-ops-filter" onClick={() => hopScroll("down")} title="Scroll down">↓</button>
        <button type="button" className="ll-ops-pink-btn" onClick={() => loadThread(activeEmail, true)}>Reload</button>
      </div>
    </div>
  );
}
