export default function ReplyBox({ category, setCategory, setFile, file, message, setMessage, sendAdminReply, sending, activeInputRef, assignedTo }) {
  return (
    <div className="ll-ops-reply-box">
      {file ? (
        <div className="ll-ops-file-preview">
          <span>📎 {file.name}</span>
          <button type="button" onClick={() => setFile(null)}>Remove</button>
        </div>
      ) : null}

      <div className="ll-ops-reply-tools">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="general">General</option>
          <option value="payment">Payment</option>
          <option value="support">Support</option>
          <option value="compliance">Compliance</option>
          <option value="finance">Finance</option>
          <option value="dispute">Dispute</option>
          <option value="audit">Audit</option>
        </select>

        <label>
          📎 Attach
          <input type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <textarea
        ref={activeInputRef}
        className="ll-ops-reply-input"
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

      <div className="ll-ops-reply-note">
        Messages are locked and audited after sending. Press Enter to send. Assigned to: {assignedTo}
      </div>
    </div>
  );
}
