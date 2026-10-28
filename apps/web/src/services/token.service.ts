/**
 * Support Token and Platform Request Service
 * Provides complete 2-sided communication between Organisation SuperAdmin and Platform Owner.
 */

export type TokenCategory =
  | "DOMAIN_CHANGE"
  | "TECHNICAL_SUPPORT"
  | "BILLING_PLAN"
  | "FEATURE_REQUEST"
  | "ACCESS_PERMISSION"
  | "CUSTOM";

export type TokenPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TokenStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "RESOLVED"
  | "CLOSED";

export interface TokenMessage {
  id: string;
  tokenId: string;
  senderId?: string | null;
  senderName: string;
  senderRole: "PLATFORM_OWNER" | "SUPER_ADMIN" | "ADMIN" | "STAFF";
  message: string;
  createdAt: string;
}

export interface SupportToken {
  id: string;
  tokenNumber: string;
  organisationId: string;
  createdById?: string | null;
  category: TokenCategory;
  customCategory?: string | null;
  priority: TokenPriority;
  status: TokenStatus;
  subject: string;
  description: string;
  currentDomain?: string | null;
  requestedDomain?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: TokenMessage[];
  organisation?: {
    id: string;
    companyName: string;
    subdomain: string;
    logo?: string | null;
    setting?: {
      websiteUrl?: string | null;
      domainEditUnlocked?: boolean;
    };
  };
  createdBy?: {
    id: string;
    fullName?: string;
    email: string;
    role: string;
  } | null;
}

export interface CreateTokenPayload {
  category: TokenCategory;
  customCategory?: string;
  priority: TokenPriority;
  subject: string;
  description: string;
  currentDomain?: string;
  requestedDomain?: string;
}

export interface DomainEditStatus {
  canEditDomain: boolean;
  settingUnlocked: boolean;
  currentWebsiteUrl: string;
  latestDomainToken?: SupportToken | null;
  isPending: boolean;
  isApproved: boolean;
}

export interface SystemNotificationItem {
  id: string;
  recipientRole?: string | null;
  recipientUserId?: string | null;
  organisationId?: string | null;
  title: string;
  message: string;
  type: string;
  referenceId?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * Fetch all tokens raised by a specific organisation.
 */
export async function fetchOrgTokens(
  orgSubdomain: string,
  filter?: { status?: string; category?: string }
): Promise<SupportToken[]> {
  const params = new URLSearchParams();
  if (filter?.status && filter.status !== "ALL") params.set("status", filter.status);
  if (filter?.category && filter.category !== "ALL") params.set("category", filter.category);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/tokens/organisation/${encodeURIComponent(orgSubdomain)}${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch organisation tokens");
  }
  const json = await res.json();
  return json.data || [];
}

/**
 * Fetch all tokens across organisations for Platform Owner.
 */
export async function fetchPlatformTokens(filter?: {
  status?: string;
  category?: string;
  organisationId?: string;
}): Promise<SupportToken[]> {
  const params = new URLSearchParams();
  if (filter?.status && filter.status !== "ALL") params.set("status", filter.status);
  if (filter?.category && filter.category !== "ALL") params.set("category", filter.category);
  if (filter?.organisationId) params.set("organisationId", filter.organisationId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/tokens/platform${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch platform tokens");
  }
  const json = await res.json();
  return json.data || [];
}

/**
 * Fetch single token with full message thread.
 */
export async function fetchTokenDetails(tokenId: string): Promise<SupportToken> {
  const res = await fetch(`/api/tokens/${encodeURIComponent(tokenId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch token details");
  }
  const json = await res.json();
  return json.data;
}

/**
 * Raise a new support token.
 */
export async function createSupportToken(
  orgSubdomain: string,
  payload: CreateTokenPayload
): Promise<SupportToken> {
  const res = await fetch(`/api/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      orgSubdomain,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create support token");
  }
  const json = await res.json();
  return json.data;
}

/**
 * Update token status (e.g. APPROVED, IN_REVIEW, REJECTED, RESOLVED).
 */
export async function updateTokenStatus(
  tokenId: string,
  status: TokenStatus,
  resolutionNotes?: string,
  approveDomainChange?: boolean
): Promise<SupportToken> {
  const res = await fetch(`/api/tokens/${encodeURIComponent(tokenId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      resolutionNotes,
      approveDomainChange,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update token status");
  }
  const json = await res.json();
  return json.data;
}

/**
 * Append message to token thread.
 */
export async function sendTokenMessage(
  tokenId: string,
  message: string
): Promise<TokenMessage> {
  const res = await fetch(`/api/tokens/${encodeURIComponent(tokenId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send message");
  }
  const json = await res.json();
  return json.data;
}

/**
 * Query current domain edit permission status.
 */
export async function fetchDomainEditStatus(
  orgSubdomain: string
): Promise<DomainEditStatus> {
  const res = await fetch(`/api/tokens/domain-status/${encodeURIComponent(orgSubdomain)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to check domain status");
  }
  const json = await res.json();
  return json.data;
}

/**
 * Fetch system notifications.
 */
export async function fetchSystemNotifications(
  role?: string,
  organisationId?: string
): Promise<{ notifications: SystemNotificationItem[]; unreadCount: number }> {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (organisationId) params.set("organisationId", organisationId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/tokens/notifications/system${query}`);
  if (!res.ok) {
    return { notifications: [], unreadCount: 0 };
  }
  const json = await res.json();
  return json.data || { notifications: [], unreadCount: 0 };
}

/**
 * Mark notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  await fetch(`/api/tokens/notifications/system/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  }).catch(() => {});
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(
  role?: string,
  organisationId?: string
): Promise<void> {
  await fetch(`/api/tokens/notifications/system/read-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, organisationId }),
  }).catch(() => {});
}
