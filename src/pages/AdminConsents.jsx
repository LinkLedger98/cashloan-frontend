import { useEffect, useState } from "react";
import AdminMessenger from "../components/adminMessenger/AdminMessenger";

const API_BASE_URL = "https://cashloan-backend.onrender.com";

const REJECTION_REASONS = [
  "Unclear image quality",
  "Incomplete document",
  "Missing signature",
  "Expired / outdated consent",
  "Verification mismatch",
  "Unsupported document format",
  "Other compliance issue"
];

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

function clearSession() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem("role");
}

function statusBadgeClass(status) {
  const value = String(status || "pending").toLowerCase();
  if (value === "approved") return "badge badge-green";
  if (value === "rejected") return "badge badge-red";
  return "badge badge-yellow";
}

async function openConsentFile(url) {
  try {
    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: authHeaders()
    });

    if (!res.ok) {
      alert("Failed to open consent file.");
      return;
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error("OPEN CONSENT FILE ERROR:", err);
    alert("Failed to open consent file.");
  }
}

export default function AdminConsentsPage() {
  const [consents, setConsents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [nationalIdFilter, setNationalIdFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [rejectBoxes, setRejectBoxes] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [rejectNotes, setRejectNotes] = useState({});

  const email = localStorage.getItem("userEmail") || "Admin";
  const role = String(
  localStorage.getItem("userRole") ||
  localStorage.getItem("role") ||
  ""
)
  .toLowerCase()
  .trim();

useEffect(() => {
  const allowed = ["superadmin", "support_compliance", "admin"];

  if (!allowed.includes(role)) {
    window.location.href = "/admin";
  }
}, [role]);

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  async function loadConsents() {
    setMsg("Loading...");

    const q = [];
    if (statusFilter) q.push(`status=${encodeURIComponent(statusFilter)}`);
    if (nationalIdFilter.trim()) q.push(`nationalId=${encodeURIComponent(nationalIdFilter.trim())}`);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/consents${q.length ? `?${q.join("&")}` : ""}`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMsg((data && data.message) || "Failed to load consents.");
        return;
      }

      setConsents(Array.isArray(data) ? data : []);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Network error while loading consents.");
    }
  }

  function showRejectConsentBox(id) {
    setRejectBoxes((prev) => ({ ...prev, [id]: true }));
    setRejectReasons((prev) => ({ ...prev, [id]: prev[id] || REJECTION_REASONS[0] }));
  }

  function hideRejectConsentBox(id) {
    setRejectBoxes((prev) => ({ ...prev, [id]: false }));
  }

  async function setConsentStatus(id, status) {
    const cleanStatus = String(status || "").toLowerCase().trim();

    let note = "Consent approved.";
    let rejectionReason = "";

    if (cleanStatus === "rejected") {
      rejectionReason = String(rejectReasons[id] || "").trim();
      const extraNote = String(rejectNotes[id] || "").trim();

      if (!rejectionReason) {
        alert("Please select a rejection reason.");
        return;
      }

      note = extraNote ? `${rejectionReason} - ${extraNote}` : rejectionReason;
    }

    const ok = window.confirm(`Confirm consent ${cleanStatus}?`);
    if (!ok) return;

    setMsg("Updating consent...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/consents/${id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          consentStatus: cleanStatus,
          status: cleanStatus,
          notes: note,
          adminNote: note,
          rejectionReason,
          notifyInbox: true
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Failed to update consent.");
        return;
      }

      setMsg(`Consent ${cleanStatus}. Inbox notification sent.`);
      hideRejectConsentBox(id);
      await loadConsents();
    } catch (err) {
      console.error(err);
      setMsg("Network error while updating consent.");
    }
  }

  useEffect(() => {
    loadConsents();
  }, []);

  return (
    <main className="ll-app-page">
      <div className="ll-shell">
        <div className="ll-topbar">
          <div className="ll-brand">
            <span className="ll-brand-dot" />
            <h1 className="ll-brand-title">LinkLedger • Super Admin</h1>
          </div>

          <div className="ll-top-actions">
            <span className="ll-pill">Account: {email}</span>
            <a className="ll-btn-ghost" href="/welcome">Home</a>
            <button data-variant="ghost" onClick={logout}>Logout</button>
          </div>
        </div>

<div className="ll-nav">
  {(role === "superadmin" || role === "finance") && (
    <a href="/admin/accounts">Accounts</a>
  )}

  {(role === "superadmin" || role === "support_compliance" || role === "admin") && (
    <a href="/admin/disputes">Disputes</a>
  )}

  {(role === "superadmin" || role === "support_compliance" || role === "admin") && (
    <a className="active" href="/admin/consents">Consents</a>
  )}

  {(role === "superadmin" || role === "audit_viewer") && (
    <a href="/admin/audit">Audit</a>
  )}
</div>

        <section className="ll-card" style={{ marginTop: 18, padding: 20 }}>
          <div className="ll-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Consent Approvals</h2>
              <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.65 }}>
                Approve / reject borrower consent evidence.
              </p>
            </div>

            <button data-variant="ghost" onClick={loadConsents} style={{ fontSize: 11 }}>Reload</button>
          </div>

          <div className="ll-grid" style={{ marginTop: 16, gap: 12 }}>
            <div>
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ marginTop: 6, padding: 11 }}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label>Omang / National ID</label>
              <input
                value={nationalIdFilter}
                onChange={(e) => setNationalIdFilter(e.target.value)}
                placeholder="e.g. 123456789"
                style={{ marginTop: 6, padding: 11 }}
              />
            </div>
          </div>

          <button className="ll-btn-primary" onClick={loadConsents} style={{ marginTop: 12, fontSize: 11 }}>
            Apply Filter
          </button>

          {msg ? <p style={{ marginTop: 12, fontSize: 12, opacity: 0.82 }}>{msg}</p> : null}

          <p style={{ marginTop: 14, fontSize: 12, opacity: 0.82 }}><b>Items:</b> {consents.length}</p>

          {consents.length === 0 && !msg ? (
            <div className="consent-premium-card"><div className="mini-value">No consent items.</div></div>
          ) : null}

          {consents.map((c) => {
            const id = c._id || "";
            const status = c.consentStatus || c.status || "pending";
            const statusLower = String(status).toLowerCase();
            const created = c.createdAt ? new Date(c.createdAt).toLocaleString() : "—";
            const lenderName = c.lenderName || c.cashloanName || c.businessName || "—";
            const lenderBranch = c.lenderBranch || c.branchName || "";
            const lenderEmail = c.lenderEmail || c.email || "—";
            const fromLine = [lenderName, lenderBranch].filter(Boolean).join(" • ");

            return (
              <div className="consent-premium-card" key={id}>
                <div className="consent-topline">
                  <div>
                    <div className="consent-title">Consent Evidence • Omang: {c.nationalId || "—"}</div>
                    <div className="small" style={{ color: "rgba(244,245,248,.70)", fontSize: 12 }}>
                      {c.fullName ? <>Client: <b>{c.fullName}</b> • </> : null}
                      Uploaded: {created}
                    </div>
                  </div>

                  <span className={statusBadgeClass(status)}>{status}</span>
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
                  <button data-variant="ghost" type="button" onClick={() => openConsentFile(`/api/admin/consents/${id}/file`)}>
                    View Consent
                  </button>

                  <button className="ll-btn-primary" type="button" onClick={() => setConsentStatus(id, "approved")}>
                    Approve + Notify
                  </button>

                  <button data-variant="ghost" type="button" onClick={() => showRejectConsentBox(id)}>
                    Reject + Notify
                  </button>
                </div>

                {rejectBoxes[id] ? (
                  <div className="consent-reject-box">
                    <div className="mini-label">Rejection reason</div>

                    <select
                      value={rejectReasons[id] || REJECTION_REASONS[0]}
                      onChange={(e) => setRejectReasons((prev) => ({ ...prev, [id]: e.target.value }))}
                    >
                      {REJECTION_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                    </select>

                    <div style={{ marginTop: 10 }}>
                      <label>Additional note optional</label>
                      <input
                        value={rejectNotes[id] || ""}
                        onChange={(e) => setRejectNotes((prev) => ({ ...prev, [id]: e.target.value }))}
                        placeholder="Example: Please upload a clearer full-page copy."
                      />
                    </div>

                    <div className="mini-value" style={{ marginTop: 8, opacity: 0.75 }}>
                      This updates the consent status and sends an automatic compliance message through the LinkLedger Inbox.
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <button className="ll-btn-primary" type="button" onClick={() => setConsentStatus(id, "rejected")}>Confirm Rejection</button>
                      <button data-variant="ghost" type="button" onClick={() => hideRejectConsentBox(id)}>Cancel</button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

        <div className="ll-footer">© 2026 LinkLedger • Botswana</div>
      </div>

      <AdminMessenger />
    </main>
  );
}
