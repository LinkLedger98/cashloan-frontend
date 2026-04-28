
  /* ---------------- Collapsible helpers (FIXED + BULLETPROOF) ---------------- */
  function ensureCollapseWrap(wrapEl) {
    if (!wrapEl) return;

    // remove any old inline hiding
    wrapEl.style.display = "";
    wrapEl.style.maxHeight = "";
    wrapEl.style.overflow = "";

    if (!wrapEl.classList.contains("collapse-wrap")) {
      wrapEl.classList.add("collapse-wrap");
    }
  }

  function setCollapsed(wrapEl, btnEl, collapsed) {
    if (!wrapEl || !btnEl) return;

    ensureCollapseWrap(wrapEl);

    btnEl.setAttribute("aria-controls", wrapEl.id || "");
    btnEl.setAttribute("aria-expanded", collapsed ? "false" : "true");

    if (collapsed) {
      wrapEl.classList.add("is-collapsed");

      // 🔥 FORCE HIDE
      wrapEl.style.maxHeight = "0px";
      wrapEl.style.overflow = "hidden";

      btnEl.textContent = "▼";
      btnEl.title = "Expand";
    } else {
      wrapEl.classList.remove("is-collapsed");

      // 🔥 FORCE SHOW (this is the fix)
      wrapEl.style.display = "block";
      wrapEl.style.maxHeight = "2000px"; // large enough for content
      wrapEl.style.overflow = "visible";

      btnEl.textContent = "▲";
      btnEl.title = "Collapse";
    }
  }

  function bindToggle(btnId, wrapId, defaultCollapsed) {
    const btn = $(btnId);
    const wrap = $(wrapId);
    if (!btn || !wrap) return;

    // 🔥 ALWAYS RESET FIRST (critical fix)
    wrap.classList.remove("is-collapsed");
    wrap.style.display = "block";
    wrap.style.maxHeight = "2000px";

    // THEN apply state
    setCollapsed(wrap, btn, !!defaultCollapsed);

    btn.addEventListener("click", function () {
      const isCollapsed = wrap.classList.contains("is-collapsed");
      setCollapsed(wrap, btn, !isCollapsed);
    });
  }

  /* =========================================================
     ACCOUNTS PAGE: Create lender + Signup requests + Lenders list
  ========================================================= */
  function setVal(id, v) {
    const el = $(id);
    if (el) el.value = v == null ? "" : String(v);
  }

  function fillFormDemo() {
    setVal("businessName", "Golden Finance");
    setVal("branchName", "Palapye");
    setVal("phone", "71234567");
    setVal("licenseNo", "NBIFIRA-12345");
    setVal("email", "info@goldenfinance.co.bw");
    setVal("tempPassword", "TempPass123!");
  }

  function clearForm() {
    setVal("businessName", "");
    setVal("branchName", "");
    setVal("phone", "");
    setVal("licenseNo", "");
    setVal("email", "");
    setVal("tempPassword", "");
  }

  const requestMap = {};

  function autofillFromRequest(reqObj) {
    setVal("businessName", reqObj.businessName || reqObj.cashloanName || "");
    setVal("branchName", reqObj.branchName || reqObj.cashloanBranch || "");
    setVal("phone", reqObj.phone || reqObj.cashloanPhone || "");
    setVal("licenseNo", reqObj.licenseNo || reqObj.licenceNo || "");
    setVal("email", reqObj.email || reqObj.cashloanEmail || "");
    setVal("tempPassword", "");

    const msg = $("msg");
    if (msg) msg.textContent = "Autofilled from signup request ✅ (set a temporary password, then Create Lender)";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadRequests() {
    const list = $("requestsList");
    if (!list) return;

    list.innerHTML = `<div class="small">Loading...</div>`;
    const r = await fetchJson("/api/admin/requests", { method: "GET" });

    if (!r.ok) {
      list.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load requests");
      return;
    }

    const rows = Array.isArray(r.data) ? r.data : [];
    if (rows.length === 0) {
      list.innerHTML = `<div class="result-item"><div class="small">No signup requests.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((req) => {
      const id = String(req._id || "");
      requestMap[id] = req;

      const businessName = escapeHtml(req.businessName || req.cashloanName || "—");
      const branchName = escapeHtml(req.branchName || req.cashloanBranch || "—");
      const phone = escapeHtml(req.phone || req.cashloanPhone || "—");
      const licenseNo = escapeHtml(req.licenseNo || req.licenceNo || "—");
      const email = escapeHtml(req.email || req.cashloanEmail || "—");
      const created = req.createdAt ? new Date(req.createdAt).toLocaleString() : "";

      html += `
        <div class="result-item">
          <div class="admin-row">
            <div>
              <div><b>${businessName}</b> • ${branchName}</div>
              <div class="small">Email: <b>${email}</b></div>
              <div class="small">Phone: ${phone} • License: ${licenseNo}</div>
              ${created ? `<div class="small">Requested: ${escapeHtml(created)}</div>` : ""}
              <div class="small-actions" style="margin-top:10px;">
                <button class="btn-primary btn-sm" type="button" onclick="autofillRequest('${escapeHtml(id)}')">Autofill</button>
                <button class="btn-ghost btn-sm" type="button" onclick="deleteRequest('${escapeHtml(id)}')">Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  window.autofillRequest = function (id) {
    const obj = requestMap[String(id)];
    if (!obj) return alert("Request not found. Click Reload Requests.");
    autofillFromRequest(obj);
    setCollapsed($("requestsWrap"), $("toggleRequestsBtn"), false);
  };

  window.deleteRequest = async function (id) {
    if (!confirm("Delete this signup request?")) return;
    const r = await fetchJson(`/api/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Delete failed");
      return;
    }
    loadRequests();
  };

  function statusTag(status) {
    const s = String(status || "").toLowerCase();
    const cls = s === "suspended" ? "tag suspended" : "tag active";
    const label = s === "suspended" ? "Suspended" : "Active";
    return `<span class="${cls}">${label}</span>`;
  }

  function parseIdFromUrl(u) {
    // expects: /api/admin/payment-proofs/<id>/file
    const m = /payment-proofs\/([^/]+)\/file/i.exec(String(u || ""));
    return m && m[1] ? String(m[1]) : "";
  }

  function proofSeenKey(lenderId) {
    return `ll_seen_pop_${String(lenderId || "")}`;
  }

  function isProofNewForUser(lenderId, updatedAt) {
    const key = proofSeenKey(lenderId);
    const seen = localStorage.getItem(key);
    if (!updatedAt) return false;
    const ts = new Date(updatedAt).getTime();
    if (!isFinite(ts)) return false;
    if (!seen) return true;
    const seenTs = new Date(seen).getTime();
    if (!isFinite(seenTs)) return true;
    return ts > seenTs;
  }

  async function loadLenders() {
    const lendersList = $("lendersList");
    const lendersCount = $("lendersCount");
    const lendersSearch = $("lendersSearch");
    if (!lendersList) return;

    lendersList.innerHTML = `<div class="small">Loading...</div>`;
    if (lendersCount) lendersCount.textContent = "";

    const r = await fetchJson("/api/admin/lenders", { method: "GET" });
    if (!r.ok) {
      lendersList.innerHTML = "";
      alert((r.data && r.data.message) ? r.data.message : "Failed to load lenders");
      return;
    }

    let rows = Array.isArray(r.data) ? r.data : [];
    const q = String((lendersSearch && lendersSearch.value) || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter(u => {
        const hay = [
          u.businessName, u.branchName, u.phone, u.licenseNo, u.email,
          u.status, u.billingStatus, u.paymentProofStatus
        ].map(x => String(x || "").toLowerCase()).join(" ");
        return hay.includes(q);
      });
    }

    if (lendersCount) lendersCount.textContent = `Accounts: ${rows.length}`;

    if (rows.length === 0) {
      lendersList.innerHTML = `<div class="result-item"><div class="small">No lenders found.</div></div>`;
      return;
    }

    let html = "";
    rows.forEach((u) => {
      const id = u._id;
      const businessName = escapeHtml(u.businessName || "—");
      const branchName = escapeHtml(u.branchName || "—");
      const phone = escapeHtml(u.phone || "—");
      const licenseNo = escapeHtml(u.licenseNo || "—");
      const email = escapeHtml(u.email || "—");
      const st = escapeHtml(u.status || "active");

      const popStatus = String(u.paymentProofStatus || "").toLowerCase();
      const popUpdatedAt = u.paymentProofUpdatedAt || null;
      const popUrl = u.paymentProofUrl || "";
      const popId = parseIdFromUrl(popUrl);

      const popIsNew = isProofNewForUser(u._id, popUpdatedAt);

      const popTag = popStatus
        ? `<span class="tag ${popStatus === "approved" ? "active" : popStatus === "rejected" ? "suspended" : ""}">
           PoP: ${escapeHtml(popStatus)}
         </span>`
        : "";

      html += `
      <div class="result-item ${popIsNew ? "ll-new-highlight" : ""}">
        <div class="admin-row">
          <div>
            <div><b>${businessName}</b> • ${branchName}</div>
            <div class="small">Email: <b>${email}</b></div>
            <div class="small">Phone: ${phone} • License: ${licenseNo}</div>

            <div class="kv" style="margin-top:8px;">
              ${statusTag(st)}
              ${u.billingStatus ? `<span class="tag">${escapeHtml(String(u.billingStatus))}</span>` : ""}
              ${u.mustChangePassword ? `<span class="tag" title="User must change password on next login">mustChangePassword</span>` : ""}
              ${popTag}
              ${popUpdatedAt ? `<span class="small" style="opacity:.8;">PoP updated: ${escapeHtml(new Date(popUpdatedAt).toLocaleString())}</span>` : ""}
            </div>

            <!-- ✅ UPDATED BUTTON BLOCK -->
<div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
  ${popUrl ? `<button class="btn-ghost btn-sm" type="button" onclick="viewPopFile('${id}','${escapeHtml(popUrl)}')">View PoP</button>` : ""}
</div>

            <div class="pop-box" style="margin-top:10px;">
              <div class="small" style="margin-bottom:8px;"><b>Billing Acknowledgement</b></div>
              <div class="pop-ack-host" data-lender-id="${id}"></div>
            </div>
          </div>

          <div class="small-actions">
            <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','suspended')">Suspend</button>
            <button class="btn-ghost btn-sm" type="button" onclick="setLenderStatus('${id}','active')">Activate</button>
            <button class="btn-ghost btn-sm" type="button" onclick="secureLender('${id}','${email}')">Secure</button>
            <button class="btn-primary btn-sm" type="button" onclick="openUpdateLender('${id}')">Update</button>
          </div>
        </div>
      </div>
    `;
    });

    lendersList.innerHTML = html;

    try { mountPopAckUI(); } catch (e) { }
  }

  window.loadLenders = loadLenders;


  // ✅ View proof of payment (token fetch → blob → open)
  window.viewPopFile = async function (lenderId, popUrl) {
    const url = String(popUrl || "");
    if (!url) return;

    try {
      localStorage.setItem(proofSeenKey(lenderId), new Date().toISOString());
    } catch (e) { }

    if (url) {
      openFileWithAuth(url, "proof-of-payment");
    } else {
      alert("File not available");
    }

    setTimeout(() => {
      try { loadLenders(); } catch (e) { }
    }, 600);
  };

  // ✅ Approve/Reject proof
  window.reviewPop = async function (proofId, status) {
    const st = String(status || "").toLowerCase();
    if (!["approved", "rejected"].includes(st)) return;

    const note = prompt(
      st === "approved" ? "Approval note (optional):" : "Rejection note (required):",
      st === "approved" ? "Approved." : "Please resend a clearer receipt."
    ) || "";

    if (st === "rejected" && !String(note).trim()) {
      alert("Rejection note is required.");
      return;
    }

    const r = await fetchJson(`/api/admin/payment-proofs/${encodeURIComponent(proofId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: st, notes: String(note || "").trim() })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Failed to update PoP");
      return;
    }

    alert(`PoP ${st} ✅`);
    loadLenders();
  };

  window.setLenderStatus = async function (id, status) {
    if (!confirm(`Set account status to "${status}"?`)) return;

    const r = await fetchJson(`/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Status update failed");
      return;
    }

    loadLenders();
  };

  window.secureLender = async function (id, email) {
    const tempPassword = prompt(
      `Set a TEMP password for:\n${email || id}\n\nRules:\n- At least 8 chars\n- They will be forced to change it on next login`,
      ""
    ) || "";

    const pw = String(tempPassword || "").trim();
    if (!pw) return;

    if (pw.length < 8) {
      alert("Temp password must be at least 8 characters.");
      return;
    }

    const ok = confirm("Confirm: set this temporary password and force password change on next login?");
    if (!ok) return;

    const r = await fetchJson(`/api/admin/users/${encodeURIComponent(id)}/secure`, {
      method: "PATCH",
      body: JSON.stringify({ tempPassword: pw })
    });

    if (!r.ok) {
      alert((r.data && r.data.message) ? r.data.message : "Secure failed");
      return;
    }

    alert("Temporary password set ✅");
    loadLenders();
  };

  window.openUpdateLender = async function (id) {
    const r = await fetchJson("/api/admin/lenders", { method: "GET" });
    if (!r.ok) return alert("Could not load lender details");

    const rows = Array.isArray(r.data) ? r.data : [];
    const u = rows.find(x => String(x._id) === String(id));
    if (!u) return alert("Lender not found");

    setVal("businessName", u.businessName || "");
    setVal("branchName", u.branchName || "");
    setVal("phone", u.phone || "");
    setVal("licenseNo", u.licenseNo || "");
    setVal("email", u.email || "");
    setVal("tempPassword", "");

    const msg = $("msg");
    if (msg) msg.textContent = "Loaded lender into form ✅";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function handleCreateLenderSubmit(e) {
    e.preventDefault();

    const payload = {
      businessName: String(($("businessName") && $("businessName").value) || "").trim(),
      branchName: String(($("branchName") && $("branchName").value) || "").trim(),
      phone: String(($("phone") && $("phone").value) || "").trim(),
      licenseNo: String(($("licenseNo") && $("licenseNo").value) || "").trim(),
      email: String(($("email") && $("email").value) || "").trim(),
      tempPassword: String(($("tempPassword") && $("tempPassword").value) || "").trim()
    };

    if (!payload.businessName || !payload.branchName || !payload.phone || !payload.licenseNo || !payload.email || !payload.tempPassword) {
      alert("Please fill all fields");
      return;
    }

    if (payload.tempPassword.length < 8) {
      alert("Temporary password must be at least 8 characters.");
      return;
    }

    const msg = $("msg");
    if (msg) msg.textContent = "Creating...";

    const r = await fetchJson("/api/admin/lenders", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const m = (r.data && r.data.message) ? r.data.message : "Create lender failed";
      if (msg) msg.textContent = "❌ " + m;
      alert(m);
      return;
    }

    if (msg) msg.textContent = "✅ Lender created";
    alert("Lender created ✅");
    clearForm();

    try { loadLenders(); } catch (e) { }
    try { loadRequests(); } catch (e) { }
  }

  /* ---------------- Billing Acknowledgement UI ---------------- */
  function mountPopAckUI() {
    const tpl = document.getElementById("popAckTemplate");
    if (!tpl) return;

    document.querySelectorAll(".pop-ack-host").forEach((host) => {
      if (host.__mounted) return;
      host.__mounted = true;

      const lenderId = host.getAttribute("data-lender-id");
      const node = tpl.content.cloneNode(true);

      const statusSel = node.querySelector(".popAckStatus");
      const noteInp = node.querySelector(".popAckNote");
      const saveBtn = node.querySelector(".popAckSave");
      const msgDiv = node.querySelector(".popAckMsg");

      saveBtn.addEventListener("click", async () => {
        const billingStatus = String(statusSel.value || "").trim(); // approved/resend/past_due
        const billingNote = String(noteInp.value || "").trim();

        msgDiv.textContent = "Sending...";
        msgDiv.className = "popAckMsg";

        try {
          const r = await fetchJson(`/api/admin/lenders/${encodeURIComponent(lenderId)}/billing`, {
            method: "PATCH",
            body: JSON.stringify({ billingStatus, billingNote })
          });

          if (!r.ok) {
            const m = (r.data && r.data.message) ? r.data.message : "Failed to send acknowledgement";
            msgDiv.textContent = "❌ " + m;
            msgDiv.classList.add("bad");
            alert(m);
            return;
          }

          msgDiv.textContent = "✅ Sent";
          msgDiv.classList.add("good");
          try { loadLenders(); } catch (e) { }
        } catch (e) {
          console.error(e);
          msgDiv.textContent = "❌ Server/network error";
          msgDiv.classList.add("bad");
          alert("Server/network error while sending acknowledgement");
        }
      });

      host.appendChild(node);
    });
  }

    
    /* =========================================================
       📝 LOG ADMIN ACTION (UPGRADED)
    ========================================================= */
    window.logAuditAction = async function (target, type, context = {}) {
      try {
        const note = prompt(`Add a note for this action (${type})`, "e.g. Called client, no answer");

        const res = await fetch(window.APP_CONFIG.API_BASE_URL + "/api/admin/audit/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("authToken")
          },
          body: JSON.stringify({
            target,
            action: type,
            note: note || "Admin follow-up action",
            contextType: context.type || null,
            contextId: context.id || null
          })
        });

        if (!res.ok) {
          alert("❌ Failed to log action");
          return;
        }

        // ✅ USE YOUR EXISTING TOAST SYSTEM
        toast(`${type} logged successfully`, {
          title: "Admin Action",
          ttlMs: 3000
        });

      } catch (e) {
        console.error(e);
        alert("Error logging action");
      }

      };

      /* ================================
   DISPUTES (SUPER ADMIN)
================================ */
async function loadDisputes() {
  const list = $("disputesList");
  if (!list) return;

  list.innerHTML = `<div class="small">Loading...</div>`;

  const r = await fetchJson("/api/admin/disputes", { method: "GET" });

  if (!r.ok) {
    list.innerHTML = "";
    alert("Failed to load disputes");
    return;
  }

  const rows = Array.isArray(r.data) ? r.data : [];

  if (rows.length === 0) {
    list.innerHTML = `<div class="result-item"><div class="small">No disputes.</div></div>`;
    return;
  }

  let html = "";

  rows.forEach((d) => {
    const id = d._id;
    const nationalId = escapeHtml(d.nationalId || "");

    const status = escapeHtml(d.adminStatus || d.status || "pending");
    const rawStatus = (d.adminStatus || d.status || "pending").toLowerCase();

    const statusClass =
      rawStatus === "resolved" ? "resolved" :
      rawStatus === "investigating" ? "investigating" :
      "pending";

    const statusIcon =
      rawStatus === "resolved" ? "✔" :
      rawStatus === "investigating" ? "⏳" :
      "⚠";

    html += `
      <div class="result-item">
        <div><b>Dispute</b> • ${nationalId}</div>

        <div class="status ${statusClass}">
          <span>${statusIcon}</span> ${status}
        </div>

        ${d.notes ? `<div class="small"><b>Reason:</b> ${escapeHtml(d.notes)}</div>` : ""}
      </div>
    `;
  });

  list.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", function () {
  if ($("loadDisputesBtn")) {
    $("loadDisputesBtn").addEventListener("click", loadDisputes);
  }

  try {
    if ($("disputesList")) loadDisputes();
  } catch (e) {}
});

function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("role");

  window.location.href = "login.html";
}

window.loadDisputes = loadDisputes;