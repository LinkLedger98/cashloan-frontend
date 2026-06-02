import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/admin_employees.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://cashloan-backend.onrender.com";

const EMPLOYEE_ROLES = [
  "superadmin",
  "limited_admin",
  "finance",
  "support_compliance",
  "audit_viewer",
  "admin"
];

function getToken() {
  return localStorage.getItem("authToken") || "";
}

function authHeaders(extra = {}) {
  const token = getToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

function roleLabel(role) {
  const labels = {
    superadmin: "Super Admin",
    limited_admin: "Limited Admin",
    finance: "Finance",
    support_compliance: "Support & Compliance",
    audit_viewer: "Audit Viewer",
  };

  return labels[role] || role || "Employee";
}

function statusClass(status) {
  return String(status || "").toLowerCase() === "suspended"
    ? "danger"
    : "ok";
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("finance");
  const [tempPassword, setTempPassword] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return employees;

    return employees.filter((employee) =>
      [
        employee.displayName,
        employee.jobTitle,
        employee.email,
        employee.role,
        employee.department,
        employee.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [employees, search]);

  async function loadEmployees() {
    setMsg("Loading employee accounts...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/employees`, {
        headers: authHeaders()
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMsg(data.message || "Unable to load employee accounts.");
        return;
      }

      setEmployees(Array.isArray(data) ? data : []);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Network error while loading employees.");
    }
  }

  function clearForm() {
    setDisplayName("");
    setJobTitle("");
    setEmail("");
    setRole("finance");
    setTempPassword("");
    setCreateMsg("");
  }

  async function createEmployee(e) {
    e.preventDefault();

    if (!email || !role || !tempPassword) {
      setCreateMsg("Email, role and temporary password are required.");
      return;
    }

    if (tempPassword.length < 8) {
      setCreateMsg("Temporary password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    setCreateMsg("Creating employee account...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/employees`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          displayName,
          jobTitle,
          email,
          role,
          tempPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCreateMsg(data.message || "Unable to create employee account.");
        return;
      }

      setCreateMsg("Employee account created successfully.");
      clearForm();
      await loadEmployees();
    } catch (err) {
      console.error(err);
      setCreateMsg("Network error while creating employee account.");
    } finally {
      setSaving(false);
    }
  }

  async function updateEmployeeStatus(employee, nextStatus) {
    const ok = window.confirm(
      `Set ${employee.email} to ${nextStatus}?`
    );

    if (!ok) return;

    setMsg("Updating employee status...");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/employees/${employee._id || employee.id}/status`,
        {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ status: nextStatus })
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to update employee status.");
        return;
      }

      setMsg(`Employee account ${nextStatus}.`);
      await loadEmployees();
    } catch (err) {
      console.error(err);
      setMsg("Network error while updating employee status.");
    }
  }

  async function secureEmployee(employee) {
    const temp = window.prompt(
      `Set a temporary password for:\n${employee.email}\n\nMinimum 8 characters.`
    );

    if (temp === null) return;

    const tempPasswordValue = String(temp || "").trim();

    if (tempPasswordValue.length < 8) {
      alert("Temporary password must be at least 8 characters.");
      return;
    }

    const ok = window.confirm(
      "Set temporary password and force password change on next login?"
    );

    if (!ok) return;

    setMsg("Securing employee account...");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/employees/${employee._id || employee.id}/secure`,
        {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ tempPassword: tempPasswordValue })
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to secure employee account.");
        return;
      }

      setMsg("Temporary password set. Employee must change password on next login.");
      await loadEmployees();
    } catch (err) {
      console.error(err);
      setMsg("Network error while securing employee account.");
    }
  }

  async function changeEmployeeRole(employee, nextRole) {
    const ok = window.confirm(
      `Change ${employee.email} role to ${roleLabel(nextRole)}?`
    );

    if (!ok) return;

    setMsg("Changing employee role...");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/employees/${employee._id || employee.id}/role`,
        {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ role: nextRole })
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.message || "Unable to change employee role.");
        return;
      }

      setMsg("Employee role updated.");
      await loadEmployees();
    } catch (err) {
      console.error(err);
      setMsg("Network error while changing employee role.");
    }
  }


async function deleteEmployee(employeeId, employeeEmail) {
  if (!employeeId) {
    alert("Missing employee ID.");
    return;
  }

  const ok = window.confirm(
    `Delete this employee account?\n\n${employeeEmail || employeeId}\n\nThis cannot be undone.`
  );

  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/employees/${employeeId}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || "Unable to delete employee account.");
      return;
    }

    alert("Employee account deleted.");
    await loadEmployees();
  } catch (err) {
    console.error(err);
    alert("Network error while deleting employee account.");
  }
}
  useEffect(() => {
    loadEmployees();
  }, []);

  return (
    <main className="employees-page">
      <div className="employees-shell">
        <div className="employees-topbar">
          <div className="employees-brand">
            <div className="employees-brand-badge"></div>
            <div>
              <h1>LinkLedger</h1>
              <p>Employee account management</p>
            </div>
          </div>

          <div className="employees-nav">
            <Link className="employees-btn-ghost" to="/admin/accounts">
              Accounts
            </Link>
            <Link className="employees-btn-ghost" to="/admin/disputes">
              Disputes
            </Link>
            <Link className="employees-btn-ghost" to="/admin/consents">
              Consents
            </Link>
            <Link className="employees-btn-ghost" to="/admin/audit">
              Audit
            </Link>
          </div>
        </div>

        <section className="employees-hero">
          <div>
            <h2>Employee Accounts</h2>
            <p>
              Create and manage LinkLedger internal staff accounts without touching
              institution accounts.
            </p>
          </div>

          <button className="employees-btn-primary" type="button" onClick={loadEmployees}>
            Reload
          </button>
        </section>

        <section className="employees-grid">
          <div className="employees-card">
            <h3>Create Employee</h3>
            <p className="employees-muted">
              Employee accounts are internal LinkLedger users. They must change
              their temporary password after login.
            </p>

            <form onSubmit={createEmployee} className="employees-form">
              <div className="employees-row">
                <div className="employees-field">
                  <label>Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Thato M."
                  />
                </div>

                <div className="employees-field">
                  <label>Job Title</label>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Finance Officer"
                  />
                </div>
              </div>

              <div className="employees-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@linkledger.co.bw"
                  required
                />
              </div>

              <div className="employees-row">
                <div className="employees-field">
                  <label>Role *</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    {EMPLOYEE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="employees-field">
                  <label>Temporary Password *</label>
                  <input
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>
              </div>

              <button
                className="employees-btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Employee Account"}
              </button>

              {createMsg ? <p className="employees-message">{createMsg}</p> : null}
            </form>
          </div>

          <div className="employees-card">
            <h3>Role Access</h3>

            <div className="employees-role-list">
              <div>
                <b>Finance</b>
                <span>Accounts, billing, payment follow-ups</span>
              </div>
              <div>
                <b>Support & Compliance</b>
                <span>Consents, disputes, compliance inbox</span>
              </div>
              <div>
                <b>Audit Viewer</b>
                <span>Audit page access only</span>
              </div>
              <div>
                <b>Limited Admin</b>
                <span>Operational admin actions</span>
              </div>
              <div>
                <b>Legacy Admin</b>
                <span>Fallback admin access</span>
              </div>
            </div>
          </div>
        </section>

        <section className="employees-card employees-list-card">
          <div className="employees-list-head">
            <div>
              <h3>Employee List</h3>
              <p className="employees-muted">
                {filteredEmployees.length} employee account(s)
              </p>
            </div>

            <input
              className="employees-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
            />
          </div>

          {msg ? <p className="employees-message">{msg}</p> : null}

          <div className="employees-list">
            {filteredEmployees.length === 0 && !msg ? (
              <p className="employees-muted">No employee accounts found.</p>
            ) : (
              filteredEmployees.map((employee) => (
                <div className="employees-item" key={employee._id || employee.id}>
                  <div>
                    <h4>{employee.displayName || employee.email}</h4>

                    <p>
                      <b>Email:</b> {employee.email}
                    </p>

                    <p>
                      <b>Job:</b> {employee.jobTitle || "N/A"}
                    </p>

                    <p>
                      <b>Role:</b>{" "}
                      <span className="employees-pill">
                        {roleLabel(employee.role)}
                      </span>
                    </p>

                    <p>
                      <b>Status:</b>{" "}
                      <span className={`employees-pill ${statusClass(employee.status)}`}>
                        {employee.status || "active"}
                      </span>
                    </p>

                    {employee.mustChangePassword ? (
                      <p className="employees-warning">
                        Must change password on next login.
                      </p>
                    ) : null}
                  </div>

                  <div className="employees-actions">
                    <select
                      value={employee.role}
                      onChange={(e) => changeEmployeeRole(employee, e.target.value)}
                    >
                      {EMPLOYEE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>

                    <button
                      className="employees-btn-ghost"
                      type="button"
                      onClick={() => secureEmployee(employee)}
                    >
                      Secure
                    </button>

                    {String(employee.status || "").toLowerCase() === "suspended" ? (
                      <button
                        className="employees-btn-primary"
                        type="button"
                        onClick={() => updateEmployeeStatus(employee, "active")}
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        className="employees-btn-danger"
                        type="button"
                        onClick={() => updateEmployeeStatus(employee, "suspended")}
                      >
                        Suspend
                      </button>
                    )}
                                 <button
  className="employees-btn-danger"
  type="button"
  onClick={() => deleteEmployee(employee._id || employee.id, employee.email)}
>
  Delete
</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}