export const API_BASE_URL = "https://cashloan-backend.onrender.com";

export const ADMIN_TEAMS = [
  { id: "all", label: "All Desk", email: "admin@linkledger.co.bw", role: "Super Admin", receives: "Everything + audit" },
  { id: "compliance", label: "Compliance", email: "pamela@linkledger.co.bw", role: "Compliance", receives: "Consents, disputes, support" },
  { id: "support", label: "Support", email: "belong@linkledger.co.bw", role: "Support", receives: "General support + lender help" },
  { id: "disputes", label: "Disputes", email: "rudi@linkledger.co.bw", role: "Compliance", receives: "Disputes + escalations" },
  { id: "finance", label: "Finance", email: "finance-lady@linkledger.co.bw", role: "Finance", receives: "Payments + billing only" }
];

export const CATEGORY_TEAM_MAP = {
  general: "support",
  support: "support",
  compliance: "compliance",
  dispute: "disputes",
  payment: "finance",
  finance: "finance",
  audit: "all"
};

export function getToken() {
  return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function formatShortTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export function formatFullTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export function getInitials(value) {
  return String(value || "Institution")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "IN";
}

export function getLogoFromConversation(c) {
  return (
    c?.logoUrl ||
    c?.logo?.url ||
    c?.lenderLogoUrl ||
    c?.lenderLogo?.url ||
    c?.profileLogoUrl ||
    c?.profile?.logo?.url ||
    c?.user?.logo?.url ||
    c?.businessLogoUrl ||
    c?.institutionLogoUrl ||
    ""
  );
}

export function getAttachmentUrl(attachment) {
  return attachment?.fileUrl || attachment?.url || "";
}

export function getAttachmentName(attachment) {
  return attachment?.fileName || attachment?.filename || "Open attachment";
}

export function isPreviewableImage(urlOrName) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(String(urlOrName || "").split("?")[0]);
}

export function getAttachmentIcon(fileName) {
  const name = String(fileName || "").toLowerCase();
  if (name.endsWith(".pdf")) return "📄";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "📝";
  if (name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊";
  if (name.endsWith(".txt")) return "📃";
  return "📎";
}

export function normalizeMetaLink(link) {
  const value = String(link || "").trim();
  if (!value) return "";

  if (value.includes("admin_consents.html") || value.includes("admin/consents") || value.includes("consents")) return "/admin/consents";
  if (value.includes("admin_disputes.html") || value.includes("admin/disputes") || value.includes("disputes")) return "/admin/disputes";
  if (value.includes("admin_accounts.html") || value.includes("admin/accounts") || value.includes("accounts")) return "/admin/accounts";
  if (value.includes("admin_audit.html") || value.includes("admin/audit") || value.includes("audit")) return "/admin/audit";

  return value;
}

export function getAdminEmail() {
  return String(
    localStorage.getItem("userEmail") ||
      localStorage.getItem("adminEmail") ||
      localStorage.getItem("email") ||
      "admin@linkledger.co.bw"
  ).toLowerCase().trim();
}

export function getAdminAvatarStorageKey() {
  return `linkledger_admin_avatar_${getAdminEmail()}`;
}

export async function apiJson(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders()
    }
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error((data && data.message) || "Request failed");
  }

  return data;
}
