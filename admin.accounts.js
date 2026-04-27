document.addEventListener("DOMContentLoaded", async function () {
  const ok = await requireSuperAdmin();
  if (!ok) return;

  startNotifications();

  bindToggle("toggleRequestsBtn", "requestsWrap", false);
  bindToggle("toggleLendersBtn", "lendersWrap", false);

  if ($("fillFormBtn")) $("fillFormBtn").addEventListener("click", fillFormDemo);
  if ($("clearFormBtn")) $("clearFormBtn").addEventListener("click", clearForm);

  if ($("reloadRequestsBtn")) $("reloadRequestsBtn").addEventListener("click", loadRequests);
  if ($("reloadLendersBtn")) $("reloadLendersBtn").addEventListener("click", loadLenders);
  if ($("lendersSearch")) $("lendersSearch").addEventListener("input", function () { loadLenders(); });

  if ($("adminForm")) $("adminForm").addEventListener("submit", handleCreateLenderSubmit);

  try { if ($("requestsList")) loadRequests(); } catch (e) {}
  try { if ($("lendersList")) loadLenders(); } catch (e) {}
});