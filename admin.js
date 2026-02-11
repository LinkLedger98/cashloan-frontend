<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Super Admin | LinkLedger</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="admin.css" />
</head>

<body>
  <div class="container">

    <div class="topbar">
      <div class="brand">
        <div class="brand-badge"></div>
        <h1>LinkLedger • Super Admin</h1>
      </div>

      <div class="legacy-badge" title="Legacy Mode">
        <span class="legacy-dot legacy-dot-pink"></span>
        <span class="legacy-lt">&lt;</span>
        <span class="legacy-dot legacy-dot-blue"></span>
        <span class="legacy-text">Legacy Mode</span>
      </div>

      <div class="top-actions">
        <span class="pill" id="adminPill">Logged in</span>
        <a class="btn-ghost" href="welcome.html">&lt;back</a>
        <button class="btn-ghost" onclick="logout()">Logout</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h2>Create Lender Account</h2>
      <p class="small">Use Admin Token (recommended) or ADMIN_KEY (legacy fallback).</p>

      <form id="adminForm">
        <label>ADMIN KEY (optional if logged in as admin)</label>
        <input id="adminKey" placeholder="Paste ADMIN_KEY here (optional)" autocomplete="off" />

        <div class="row">
          <div>
            <label>Business Name</label>
            <input id="businessName" placeholder="e.g. Golden Finance" required />
          </div>
          <div>
            <label>Branch</label>
            <input id="branchName" placeholder="e.g. Palapye" required />
          </div>
        </div>

        <div class="row">
          <div>
            <label>Phone (shows in borrower search)</label>
            <input id="phone" placeholder="e.g. 71234567" required />
          </div>
          <div>
            <label>NBIFIRA License No.</label>
            <input id="licenseNo" placeholder="e.g. NBIFIRA-12345" required />
          </div>
        </div>

        <div class="row">
          <div>
            <label>Email (login)</label>
            <input id="email" type="email" placeholder="e.g. info@goldenfinance.co.bw" required />
          </div>
          <div>
            <label>Temporary Password</label>
            <input id="tempPassword" placeholder="Set temporary password" required />
          </div>
        </div>

        <button class="btn-primary" type="submit">Create Lender</button>
        <p id="msg" class="small" style="margin-top:10px;"></p>
      </form>

      <div style="margin-top:18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <h2 style="margin:0;">Signup Requests</h2>
          <button class="btn-ghost btn-sm" id="loadRequestsBtn" type="button">Reload Requests</button>
        </div>
        <div id="requestsList" style="margin-top:10px;"></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Registered accounts</h2>
          <p class="small" style="margin:6px 0 0 0;">Search, suspend, and update billing.</p>
        </div>

        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn-ghost btn-sm" id="toggleAccountsBtn" type="button" title="Collapse/Expand">▲</button>
          <button class="btn-ghost btn-sm" id="loadAccountsBtn" type="button">Reload Accounts</button>
        </div>
      </div>

      <div id="accountsWrap">
        <div class="row" style="margin-top:12px;">
          <div>
            <label>Search</label>
            <input id="searchBox" placeholder="Search business / email / license / status / paid..." />
          </div>
          <div>
            <label class="small" style="opacity:.9;">Tip</label>
            <div class="small">Type to auto-search.</div>
          </div>
        </div>

        <div class="small" id="countLine" style="margin-top:10px;"></div>
        <div id="accountsList" style="margin-top:12px;"></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-end; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Disputes</h2>
          <p class="small" style="margin:6px 0 0 0;">
            Pending disputes must be handled within <b>5 business days</b>.
          </p>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-ghost btn-sm" id="loadDisputesBtn" type="button">Reload</button>
          <button class="btn-ghost btn-sm" id="loadOverdueBtn" type="button">Show Overdue</button>
        </div>
      </div>

      <div class="row" style="margin-top:12px;">
        <div>
          <label>Status Filter</label>
          <select id="disputeStatusFilter">
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="resolved">resolved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <div>
          <label>Filter by Omang (9 digits)</label>
          <input id="disputeSearchNationalId" placeholder="e.g. 123456789" />
        </div>
      </div>

      <div class="small" id="disputeCountLine" style="margin-top:10px;"></div>
      <div id="disputesList" style="margin-top:12px;"></div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-end; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Audit Logs</h2>
          <p class="small" style="margin:6px 0 0 0;">
            Hidden trail of logins, searches, edits (for inspections).
          </p>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-ghost btn-sm" id="loadAuditBtn" type="button">Reload</button>
        </div>
      </div>

      <div class="row" style="margin-top:12px;">
        <div>
          <label>Omang (optional filter)</label>
          <input id="auditNationalId" placeholder="e.g. 123456789" />
        </div>
        <div>
          <label>Limit (max 200)</label>
          <input id="auditLimit" type="number" min="1" max="200" value="100" />
        </div>
      </div>

      <div class="small" id="auditCountLine" style="margin-top:10px;"></div>
      <div id="auditList" style="margin-top:12px;"></div>
    </div>

  </div>

  <script src="config.js?v=FINAL"></script>
  <script src="admin.js?v=FINAL"></script>
</body>
</html>
