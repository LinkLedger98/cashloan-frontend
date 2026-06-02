import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/dashboard.css";

const FALLBACK_API_BASE = "https://cashloan-backend.onrender.com";

function getApiBaseUrl() {
  return (
    window.APP_CONFIG?.API_BASE_URL ||
    import.meta.env?.VITE_API_BASE_URL ||
    FALLBACK_API_BASE
  ).replace(/\/$/, "");
}

function getToken() {
  return localStorage.getItem("authToken") || "";
}

function getEmail() {
  return localStorage.getItem("userEmail") || "";
}

function fmtDateTime(isoOrNull) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function fmtDate(isoOrNull) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return "";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  return `${String(d.getDate()).padStart(2, "0")} ${
    months[d.getMonth()]
  } ${d.getFullYear()}`;
}

function fmtDateInput(isoOrNull) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "owing") return "owing";
  if (s === "overdue") return "overdue";
  if (s === "resolved") return "paid";
  if (s === "investigating") return "owing";
  if (s === "rejected") return "overdue";
  return "";
}

function riskTone(risk) {
  if (risk === "red") {
    return {
      pill: "High Risk",
      emoji: "🔴",
      className: "overdue"
    };
  }

  if (risk === "yellow") {
    return {
      pill: "Moderate Risk",
      emoji: "🟡",
      className: "owing"
    };
  }

  return {
    pill: "Low Risk",
    emoji: "🟢",
    className: "paid"
  };
}

function isAllowedImageExt(name) {
  const n = String(name || "").toLowerCase().trim();

  return (
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".webp") ||
    n.endsWith(".gif") ||
    n.endsWith(".bmp") ||
    n.endsWith(".heic") ||
    n.endsWith(".heif") ||
    n.endsWith(".tif") ||
    n.endsWith(".tiff")
  );
}

function isAllowedUploadFile(file) {
  if (!file) return false;

  const mime = String(file.type || "").toLowerCase().trim();

  if (mime.startsWith("image/")) return true;
  if (mime === "application/pdf") return true;
  if (mime === "application/octet-stream" && isAllowedImageExt(file.name)) {
    return true;
  }

  return false;
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function AdminTag({ adminStatus, status }) {
  const s = String(adminStatus || status || "").toLowerCase();

  if (s === "resolved") return <span className="badge paid">Resolved</span>;
  if (s === "rejected") return <span className="badge overdue">Rejected</span>;
  if (s === "investigating") {
    return <span className="badge owing">Investigating</span>;
  }

  return <span className="badge">Pending</span>;
}

function CollapseSection({
  title,
  subtitle,
  collapsed,
  onToggle,
  children,
  id
}) {
  return (
    <div className="card premium-section" style={{ marginTop: 16 }}>
      <button
        className={`section-toggle ${collapsed ? "" : "is-open"}`}
        id={`toggle-${id}`}
        type="button"
        aria-expanded={!collapsed}
        aria-controls={id}
        onClick={onToggle}
      >
        <div>
          <h2>{title}</h2>
          <p className="section-sub">{subtitle}</p>
        </div>

        <span className="chev">⌄</span>
      </button>

      <div
        id={id}
        className={`collapse-wrap ${collapsed ? "is-collapsed" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function Dashboard() {
  
  const [email, setEmail] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);

  const [collapsed, setCollapsed] = useState({
    addClient: true,
    myClients: true,
    myDisputes: true
  });

  const [searchNationalId, setSearchNationalId] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");

  const [addForm, setAddForm] = useState({
    fullName: "",
    nationalId: "",
    status: "paid",
    dueDate: "",
    consentGiven: false
  });
  const [consentFile, setConsentFile] = useState(null);
  const [consentAck, setConsentAck] = useState(null);
  const [savingRecord, setSavingRecord] = useState(false);

  const [myClientsSearch, setMyClientsSearch] = useState("");
  const [myClients, setMyClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientEdits, setClientEdits] = useState({});
  const [openClientEditIds, setOpenClientEditIds] = useState({});

  const [myDisputes, setMyDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [changedDisputeIds, setChangedDisputeIds] = useState([]);
  const [toast, setToast] = useState("");

  const lastDisputesMapRef = useRef({});
  const lastDisputesHashRef = useRef(null);

  const sortedMyClients = useMemo(() => {
  return [...myClients].sort((a, b) => {
    const nameA = String(a.fullName || "").toLowerCase().trim();
    const nameB = String(b.fullName || "").toLowerCase().trim();
    return nameA.localeCompare(nameB);
  });
}, [myClients]);

  const userPill = useMemo(() => {
    return email ? `Account: ${email}` : "Account";
  }, [email]);

  const requireLogin = useCallback(() => {
    const token = getToken();

    if (!token) {
      alert("Authentication required. Please log in to continue.");
      window.location.href = "/login";
      return false;
    }

    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("role");

    window.location.href = "/login";
  }, []);

  const handleAuthFailure = useCallback(
    async (res, data) => {
      if (res && res.status === 403) {
        const msg = data && data.message ? String(data.message) : "Access restricted";

        if (msg.toLowerCase().includes("suspended")) {
          alert(
            "Your account has been suspended. Only messaging support is available."
          );
          setIsSuspended(true);
          return true;
        }
      }

      if (res && res.status === 401) {
        alert("Your session has expired. Please log in again.");
        logout();
        return true;
      }

      return false;
    },
    [logout]
  );

  const apiJson = useCallback(async (path, opts = {}) => {
    const API_BASE_URL = getApiBaseUrl();
    const token = getToken();

    if (!API_BASE_URL) {
      throw new Error("System configuration error");
    }

    const isForm = opts.body instanceof FormData;

    const headers = {
      ...(opts.headers || {}),
      Authorization: `Bearer ${token}`
    };

    if (!isForm) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...opts,
      headers
    });

    const data = await res.json().catch(() => ({}));

    return { res, data };
  }, []);

  const toggleSection = useCallback((key) => {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2800);
  }, []);

  const loadMyClients = useCallback(async () => {
    if (!requireLogin()) return;

    setClientsLoading(true);

    try {
      const query = myClientsSearch.trim();
      const path = `/api/clients/mine${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const { res, data } = await apiJson(path, { method: "GET" });

      if (await handleAuthFailure(res, data)) return;

      if (!res.ok) {
        alert(data && data.message ? data.message : "Unable to load records");
        setMyClients([]);
        return;
      }

      const rows = normalizeArray(data);
      setMyClients(rows);

      const edits = {};
      rows.forEach((row) => {
        const id = String(row._id || row.id || "");
        if (!id) return;

        edits[id] = {
          status: String(row.status || "owing").toLowerCase(),
          dueDate: fmtDateInput(row.dueDate),
          paidDate: fmtDateInput(row.paidDate)
        };
      });

      setClientEdits(edits);
    } catch (err) {
      console.error(err);
      alert("Server error while loading records");
      setMyClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, [apiJson, handleAuthFailure, myClientsSearch, requireLogin]);

  const loadMyDisputes = useCallback(
    async (incomingChangedIds = []) => {
      if (!requireLogin()) return;

      setDisputesLoading(true);

      try {
        const { res, data } = await apiJson("/api/disputes/mine", {
          method: "GET"
        });

        if (await handleAuthFailure(res, data)) return;

        if (!res.ok) {
          alert(data.message || "Unable to load dispute records");
          setMyDisputes([]);
          return;
        }

        setMyDisputes(Array.isArray(data) ? data : []);
        setChangedDisputeIds(incomingChangedIds);

        if (incomingChangedIds.length > 0) {
          window.setTimeout(() => setChangedDisputeIds([]), 1800);
        }
      } catch (err) {
        console.error(err);
        alert("Server error while loading dispute records");
        setMyDisputes([]);
      } finally {
        setDisputesLoading(false);
      }
    },
    [apiJson, handleAuthFailure, requireLogin]
  );

  const searchClient = useCallback(async () => {
    if (!requireLogin()) return;

    const nationalId = searchNationalId.trim();

    if (!nationalId) {
      alert("Please enter a National ID.");
      return;
    }

    if (!/^\d{9}$/.test(nationalId)) {
      alert("National ID must be exactly 9 digits.");
      return;
    }

    setSearchLoading(true);
    setSearchResult(null);

    try {
      const { res, data } = await apiJson(
        `/api/clients/search?nationalId=${encodeURIComponent(nationalId)}`,
        { method: "GET" }
      );

      if (await handleAuthFailure(res, data)) return;

      if (!res.ok) {
        alert(data.message || "Verification failed");
        return;
      }

      setSearchResult({
        nationalId,
        data
      });
    } catch (err) {
      console.error(err);
      alert("Server error while verifying customer");
    } finally {
      setSearchLoading(false);
    }
  }, [apiJson, handleAuthFailure, requireLogin, searchNationalId]);

  const openDispute = useCallback(
    async (nationalId, recordId) => {
      if (!requireLogin()) return;

      const cleanNationalId = String(nationalId || "").trim();

      if (!/^\d{9}$/.test(cleanNationalId)) {
        alert("National ID must be exactly 9 digits.");
        return;
      }

      const notes = prompt("Enter dispute reason (optional):") || "";

      try {
        const { res, data } = await apiJson("/api/disputes", {
          method: "POST",
          body: JSON.stringify({
            nationalId: cleanNationalId,
            clientRecordId: String(recordId || "").trim(),
            notes: String(notes || "").trim()
          })
        });

        if (await handleAuthFailure(res, data)) return;

        if (!res.ok) {
          alert(data.message || "Unable to submit dispute request");
          return;
        }

        alert("Dispute submitted successfully. The record is now under review.");

        await loadMyDisputes();

        if (searchNationalId.trim() === cleanNationalId) {
          await searchClient();
        }
      } catch (err) {
        console.error(err);
        alert("Server error while submitting dispute");
      }
    },
    [
      apiJson,
      handleAuthFailure,
      loadMyDisputes,
      requireLogin,
      searchClient,
      searchNationalId
    ]
  );

  const addClient = useCallback(async () => {
    if (!requireLogin()) return;

    setConsentAck(null);

    const fullName = addForm.fullName.trim();
    const nationalId = addForm.nationalId.trim();
    const status = addForm.status;
    const dueDate = addForm.dueDate;

    if (!fullName || !nationalId || !status) {
      alert("Please complete all required fields: Name, National ID, and Credit Status.");
      return;
    }

    if (!/^\d{9}$/.test(nationalId)) {
      alert("National ID must be exactly 9 digits.");
      return;
    }

    if (!addForm.consentGiven) {
      alert("Customer consent is required before submitting this record.");
      return;
    }

    if (!consentFile) {
      alert("Please upload a valid consent document (image or PDF).");
      return;
    }

    if (!isAllowedUploadFile(consentFile)) {
      setConsentAck({
        ok: false,
        message: "Invalid file type. Please upload an image or PDF."
      });
      alert("Invalid file type. Accepted formats: image or PDF.");
      return;
    }

    const fd = new FormData();
    fd.append("fullName", fullName);
    fd.append("nationalId", nationalId);
    fd.append("status", status);
    if (dueDate) fd.append("dueDate", dueDate);
    fd.append("consentGiven", "true");
    fd.append("consentFile", consentFile);

    setSavingRecord(true);

    try {
      const { res, data } = await apiJson("/api/clients", {
        method: "POST",
        body: fd
      });

      if (await handleAuthFailure(res, data)) return;

      if (res.status === 409) {
        setConsentAck({
          ok: true,
          message: "Consent document received."
        });

        alert(data.message || "A record with this National ID already exists.");

        await loadMyClients();
        setSearchNationalId(nationalId);
        return;
      }

      if (!res.ok) {
        const msg =
          data && data.message
            ? `Submission failed — ${data.message}`
            : "Submission failed. Please retry.";

        setConsentAck({
          ok: false,
          message: msg
        });

        alert(data.message || "Unable to save record");
        return;
      }

      setConsentAck({
        ok: true,
        message: "Consent document received."
      });

      alert("Record saved successfully.");

      setAddForm({
        fullName: "",
        nationalId: "",
        status: "paid",
        dueDate: "",
        consentGiven: false
      });

      setConsentFile(null);

      const input = document.getElementById("consentFile");
      if (input) input.value = "";

      await loadMyClients();
    } catch (err) {
      console.error(err);

      setConsentAck({
        ok: false,
        message: "Submission failed due to a system error."
      });

      alert("Server error while saving record");
    } finally {
      setSavingRecord(false);
    }
  }, [
    addForm,
    apiJson,
    consentFile,
    handleAuthFailure,
    loadMyClients,
    requireLogin
  ]);

  const updateClient = useCallback(
    async (clientId) => {
      if (!requireLogin()) return;

      const id = String(clientId || "");
      const edit = clientEdits[id];

      if (!id || !edit) {
        alert("Unable to update this record.");
        return;
      }

      const payload = {
        status: edit.status
      };

      if (edit.dueDate) payload.dueDate = edit.dueDate;
      if (edit.paidDate) payload.paidDate = edit.paidDate;

      try {
        const { res, data } = await apiJson(`/api/clients/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        if (await handleAuthFailure(res, data)) return;

        if (!res.ok) {
          alert(data.message || "Unable to update record");
          return;
        }

        alert("Record updated successfully.");
        setOpenClientEditIds((prev) => ({
  ...prev,
  [id]: false
}));

        await loadMyClients();

        if (searchNationalId.trim()) {
          await searchClient();
        }
      } catch (err) {
        console.error(err);
        alert("Server error while updating record");
      }
    },
    [
      apiJson,
      clientEdits,
      handleAuthFailure,
      loadMyClients,
      requireLogin,
      searchClient,
      searchNationalId
    ]
  );

  const startDisputesAutoRefresh = useCallback(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const { res, data } = await apiJson("/api/disputes/mine", {
          method: "GET"
        });

        if (!res.ok) return;

        const rows = Array.isArray(data) ? data : [];

        const hash = JSON.stringify(
          rows.map((d) => ({
            id: d._id,
            status: d.adminStatus,
            note: d.adminNote
          }))
        );

        if (hash !== lastDisputesHashRef.current) {
          const changedIds = [];

          rows.forEach((d) => {
            const prev = lastDisputesMapRef.current[d._id];

            const curr = {
              status: d.adminStatus,
              note: d.adminNote
            };

            if (prev && (prev.status !== curr.status || prev.note !== curr.note)) {
              changedIds.push(d._id);
            }

            lastDisputesMapRef.current[d._id] = curr;
          });

          if (changedIds.length > 0) {
            showToast(
              changedIds.length === 1
                ? "Dispute updated"
                : `${changedIds.length} disputes updated`
            );
          }

          lastDisputesHashRef.current = hash;
          setMyDisputes(rows);
          setChangedDisputeIds(changedIds);

          if (changedIds.length > 0) {
            window.setTimeout(() => setChangedDisputeIds([]), 1800);
          }
        }
      } catch (err) {
        console.error("Auto refresh error:", err);
      }
    }, 5000);

    return intervalId;
  }, [apiJson, showToast]);

  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    async function bootDashboard() {
      if (!requireLogin()) return;

      const storedEmail = getEmail();
      setEmail(storedEmail);

      try {
        const authCheck = await apiJson("/api/auth/me", { method: "GET" });

        if (cancelled) return;

        if (
          authCheck.data &&
          (authCheck.data.isSuspended === true ||
            authCheck.data.status === "suspended")
        ) {
          setIsSuspended(true);
          return;
        }

        await loadMyClients();
        await loadMyDisputes();

        if (!cancelled) {
          intervalId = startDisputesAutoRefresh();
        }
      } catch (err) {
        console.error(err);
      }
    }

    bootDashboard();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [
    apiJson,
    loadMyClients,
    loadMyDisputes,
    requireLogin,
    startDisputesAutoRefresh
  ]);

  const activeDisputes = useMemo(() => {
    return myDisputes.filter((d) => {
      const s = String(d.adminStatus || d.status || "").toLowerCase();
      return s !== "resolved" && s !== "rejected";
    });
  }, [myDisputes]);

  const closedDisputes = useMemo(() => {
    const now = new Date();

    return myDisputes.filter((d) => {
      const s = String(d.adminStatus || d.status || "").toLowerCase();

      if (s !== "resolved" && s !== "rejected") return false;

      const updatedAt = new Date(d.updatedAt || d.createdAt);
      const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);

      return diffDays <= 7;
    });
  }, [myDisputes]);

  function toggleClientEdit(id) {
  setOpenClientEditIds((prev) => ({
    ...prev,
    [id]: !prev[id]
  }));
}

function closeMyCustomersAndScrollTop() {
  setCollapsed((prev) => ({
    ...prev,
    myClients: true
  }));

  window.setTimeout(() => {
    document.querySelector(".dashboard-page")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 120);
}

  function renderSearchResults() {
    if (searchLoading) {
      return <p className="small">Verifying records...</p>;
    }

    if (!searchResult) return null;

    const nationalId = searchResult.nationalId;
    const data = searchResult.data || {};
    const fullName = data.fullName || "Unknown";
    const risk = data.risk || "green";
    const riskLabel = data.riskLabel || "🟢 Low Credit Risk Profile";
    const creditRecords = Array.isArray(data.activeLoans) ? data.activeLoans : [];
    const tone = riskTone(risk);

    return (
      <>
        <div className="result-item">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <div>
              <div className="small">
                Verification Result – National ID: <b>{nationalId}</b>
              </div>
              <div style={{ marginTop: 6 }}>
                <b>Name:</b> {fullName}
              </div>
            </div>

            <div className={`badge ${tone.className}`} title="Risk level">
              {riskLabel}
            </div>
          </div>
        </div>

        {creditRecords.length === 0 ? (
          <div className="result-item">
            <div className="small">
              No credit records found across institutions for this National ID.
            </div>
          </div>
        ) : (
          <div className="result-item">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Credit Records</div>

            <div className="results" style={{ gap: 10 }}>
              {creditRecords.map((record, index) => {
                const institutionName =
                  record.cashloanName ||
                  record.businessName ||
                  record.institutionName ||
                  "Unknown Institution";

                const branch =
                  record.cashloanBranch || record.branchName || record.branch || "";

                const phone =
                  record.cashloanPhone || record.phone || record.contactPhone || "";

                const statusUpper = String(record.status || "").toUpperCase();
                const badgeClass = statusBadgeClass(statusUpper);
                const recordId = record._id || record.id || record.clientRecordId || "";

                return (
                  <div className="result-item" key={`${recordId || index}-${index}`}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "flex-start"
                      }}
                    >
                      <div>
                        <div>
                          <b>{institutionName}</b>
                          {branch ? ` – ${branch}` : ""}
                        </div>

                        {phone ? <div className="small">Tel: {phone}</div> : null}

                        <div className="small" style={{ marginTop: 4 }}>
                          Status:{" "}
                          <span className={`badge ${badgeClass}`}>
                            {statusUpper || "UNKNOWN"}
                          </span>
                        </div>
                      </div>

                      <button
                        className="btn-ghost btn-sm"
                        type="button"
                        onClick={() => openDispute(nationalId, recordId)}
                      >
                        Open Dispute
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  function renderClientRow(client, index) {
  const id = String(client._id || client.id || "");
  const isSelectedClient = selectedClientId === id;
  const stUpper = String(client.status || "").toUpperCase();
  const badgeClass = statusBadgeClass(stUpper);
  const due = client.dueDate ? fmtDate(client.dueDate) : "";
  const paid = client.paidDate ? fmtDate(client.paidDate) : "";
  const editOpen = Boolean(openClientEditIds[id]);

  const edit = clientEdits[id] || {
    status: String(client.status || "owing").toLowerCase(),
    dueDate: fmtDateInput(client.dueDate),
    paidDate: fmtDateInput(client.paidDate)
  };

  return (
    <div className="result-item" key={id || `${client.nationalId}-${client.createdAt}`}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start"
        }}
      >
        <div>
          <div><b>{index + 1}. {client.fullName || "Unknown"}</b></div>

          <div className="small">
            National ID: <b>{client.nationalId || ""}</b>
          </div>

          <div className="small">
            Credit Status:{" "}
            <span className={`badge ${badgeClass}`}>{stUpper || "UNKNOWN"}</span>
          </div>

          {stUpper === "PAID" && paid ? <div className="small">Settled on: {paid}</div> : null}
          {(stUpper === "OWING" || stUpper === "OVERDUE") && due ? <div className="small">Due date: {due}</div> : null}

          {client.consentStatus ? (
            <div className="small" style={{ marginTop: 6 }}>
              <b>Consent Status:</b> {client.consentStatus}
            </div>
          ) : null}

          {client.consentNotes ? (
            <div className="small" style={{ marginTop: 4 }}>
              {client.consentNotes}
            </div>
          ) : null}

          <div className="small">
            Created: {client.createdAt ? fmtDateTime(client.createdAt) : ""}
          </div>
        </div>

        {id ? (
          <div
            className="small-actions"
            style={{
              display: "grid",
              gap: 8,
              minWidth: 260
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-ghost btn-sm"
                type="button"
                onClick={closeMyCustomersAndScrollTop}
              >
                ↑
              </button>

              <button
                className={`btn-ghost btn-sm update-client-toggle ${editOpen ? "is-open" : ""}`}
                type="button"
                onClick={() => toggleClientEdit(id)}
              >
                Update Client <span>⌄</span>
              </button>
            </div>

            <div className={`mini-update-wrap ${editOpen ? "is-open" : ""}`}>
              <div className="mini-update-inner">
                <select
                  value={edit.status}
                  onChange={(e) =>
                    setClientEdits((prev) => ({
                      ...prev,
                      [id]: { ...(prev[id] || edit), status: e.target.value }
                    }))
                  }
                >
                  <option value="paid">paid</option>
                  <option value="owing">owing</option>
                  <option value="overdue">overdue</option>
                </select>

                <div className="row" style={{ gap: 8 }}>
                  <div>
                    <label>Due date</label>
                    <input
                      type="date"
                      value={edit.dueDate}
                      onChange={(e) =>
                        setClientEdits((prev) => ({
                          ...prev,
                          [id]: { ...(prev[id] || edit), dueDate: e.target.value }
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label>Paid date</label>
                    <input
                      type="date"
                      value={edit.paidDate}
                      onChange={(e) =>
                        setClientEdits((prev) => ({
                          ...prev,
                          [id]: { ...(prev[id] || edit), paidDate: e.target.value }
                        }))
                      }
                    />
                  </div>
                </div>

                <button
                  className="btn-primary btn-sm"
                  type="button"
                  onClick={() => updateClient(id)}
                >
                  Update Record
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

  return (
    <div className="dashboard-page">
      {toast ? <div id="toastContainer">{toast}</div> : null}

      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="brand-badge"></div>
            <h1>LinkLedger</h1>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <span className="pill" id="userPill">
              {userPill}
            </span>

            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                window.location.href = "/welcome";
              }}
            >
              &lt; back
            </button>

            <button className="btn-ghost" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Verify Customer</h2>
          <p>Search by National ID to see reported credit statuses across institutions.</p>

          <div className="row">
            <div>
              <label htmlFor="searchNationalId">National ID</label>
              <input
                id="searchNationalId"
                placeholder="e.g. 123456789"
                value={searchNationalId}
                onChange={(e) => setSearchNationalId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchClient();
                  }
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                className="btn-primary"
                type="button"
                style={{ width: "100%" }}
                onClick={searchClient}
                disabled={searchLoading}
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          <hr />

          <div id="results" className="results">
            {renderSearchResults()}
          </div>
        </div>

        <CollapseSection
          id="addClientWrap"
          title="Add Customer Record"
          subtitle="Add new customer credit data with consent."
          collapsed={collapsed.addClient}
          onToggle={() => toggleSection("addClient")}
        >
          <div style={{ padding: "0 18px 18px" }}>
            <div className="row">
              <div>
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  placeholder="e.g. Thato Molefe"
                  value={addForm.fullName}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      fullName: e.target.value
                    }))
                  }
                />
              </div>

              <div>
                <label htmlFor="nationalId">National ID</label>
                <input
                  id="nationalId"
                  placeholder="e.g. 123456789"
                  value={addForm.nationalId}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      nationalId: e.target.value
                    }))
                  }
                />
              </div>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <div>
                <label htmlFor="status">Credit Status</label>
                <select
                  id="status"
                  value={addForm.status}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      status: e.target.value
                    }))
                  }
                >
                  <option value="paid">paid</option>
                  <option value="owing">owing</option>
                  <option value="overdue">overdue</option>
                </select>
              </div>

              <div>
                <label htmlFor="dueDate">Due date</label>
                <input
                  id="dueDate"
                  type="date"
                  value={addForm.dueDate}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      dueDate: e.target.value
                    }))
                  }
                />
              </div>
            </div>

            <div className="consent-box" style={{ marginTop: 12 }}>
              <label
                className="consent-check"
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center"
                }}
              >
                <input
                  id="consentCheck"
                  type="checkbox"
                  checked={addForm.consentGiven}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      consentGiven: e.target.checked
                    }))
                  }
                />
                Customer consent obtained (required)
              </label>

              <div style={{ marginTop: 10 }}>
                <label htmlFor="consentFile">Upload signed consent proof</label>
                <input
                  id="consentFile"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    setConsentAck(null);
                    setConsentFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
                  }}
                />
                <div className="small" style={{ marginTop: 6 }}>
                  Upload image or PDF
                </div>
              </div>

              {consentAck ? (
                <div
                  id="consentAck"
                  style={{
                    display: "block",
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: consentAck.ok
                      ? "rgba(0, 200, 0, 0.08)"
                      : "rgba(255, 0, 0, 0.06)"
                  }}
                >
                  {consentAck.ok ? "✔ " : "⚠ "}
                  {consentAck.message}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                className="btn-primary"
                type="button"
                onClick={addClient}
                disabled={savingRecord}
              >
                {savingRecord ? "Saving..." : "Save record"}
              </button>
            </div>
          </div>
        </CollapseSection>

        <CollapseSection
          id="myClientsWrap"
          title="My Customers"
          subtitle="View and manage your saved customer records."
          collapsed={collapsed.myClients}
          onToggle={() => toggleSection("myClients")}
        >
          <div className="section-tools">
            <input
              id="myClientsSearch"
              placeholder="Search name or National ID"
              value={myClientsSearch}
              onChange={(e) => setMyClientsSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  loadMyClients();
                }
              }}
            />

            <button className="btn-ghost" type="button" onClick={loadMyClients}>
              Refresh
            </button>
          </div>

          <div id="myClientsList" className="results">
            {clientsLoading ? (
              <p className="small">Loading records...</p>
            ) : myClients.length === 0 ? (
              <div className="result-item">
                <div className="small">No records available.</div>
              </div>
            ) : (
              sortedMyClients.map((client, index) => renderClientRow(client, index))
            )}
          </div>
        </CollapseSection>

        <CollapseSection
          id="myDisputesWrap"
          title="My Disputes"
          subtitle="Track active and recently closed dispute records."
          collapsed={collapsed.myDisputes}
          onToggle={() => toggleSection("myDisputes")}
        >
          <div className="section-tools">
            <button
              className="btn-ghost"
              id="reloadMyDisputesBtn"
              type="button"
              onClick={() => loadMyDisputes()}
            >
              Refresh
            </button>
          </div>

          <h3>Active Disputes</h3>
          <div id="myDisputesActive" className="results">
            {disputesLoading ? (
              <div className="result-item">
                <div className="small">Loading dispute records...</div>
              </div>
            ) : activeDisputes.length === 0 ? (
              <div className="result-item">
                <div className="small">No active disputes</div>
              </div>
            ) : (
              activeDisputes.map(renderDisputeRow)
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <h3>Closed Disputes</h3>

            <div className="section-sub">
              Showing recent closed disputes (last 7 days)
            </div>

            <div id="myDisputesClosed" className="results">
              {closedDisputes.length === 0 ? (
                <div className="result-item">
                  <div className="small">No closed disputes</div>
                </div>
              ) : (
                closedDisputes.map(renderDisputeRow)
              )}
            </div>
          </div>
        </CollapseSection>
      </div>
    </div>
  );
}