export interface DeliveryStep {
  title: string;
  timestamp: string;
  status: "completed" | "current" | "failed" | "pending";
  details?: string;
}

export interface NotificationItem {
  id: string;
  itemNumber: number;
  clientName: string;
  clientCompany: string;
  clientInitials: string;
  avatarColor: {
    bg: string;
    text: string;
  };
  documentType:
    | "Trade License"
    | "Employment Visa"
    | "Residence Visa"
    | "Establishment Card"
    | "Activity Permit"
    | "Emirates ID"
    | string;
  documentNumber: string;
  notificationType: "Expiry Reminder" | "Expired Notice" | "Expiring Soon";
  channel: "WhatsApp" | "Email" | "SMS";
  dateTime: string;
  dateIso: string;
  status: "Sent" | "Failed" | "Pending" | "Delivered";
  message: string;
  deliveryTimeline: DeliveryStep[];
}

export interface NotificationStats {
  total: number;
  totalTrend: string;
  whatsappSent: number;
  whatsappTrend: string;
  emailSent: number;
  emailTrend: string;
  failed: number;
  failedTrend: string;
}

export interface NotificationFilters {
  search?: string;
  channel?: string;
  status?: string;
  documentType?: string;
  dateRange?: string;
  page?: number;
  limit?: number;
  orgSubdomain?: string;
}

export interface NotificationListResult {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: NotificationStats;
}

/**
 * Dynamic API fetch from backend with 100% real database results.
 */
export async function fetchNotificationsFromApi(
  filters: NotificationFilters = {}
): Promise<NotificationListResult> {
  const emptyResult: NotificationListResult = {
    notifications: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    stats: {
      total: 0,
      totalTrend: "0%",
      whatsappSent: 0,
      whatsappTrend: "0%",
      emailSent: 0,
      emailTrend: "0%",
      failed: 0,
      failedTrend: "0%",
    },
  };

  try {
    const query = new URLSearchParams();
    if (filters.orgSubdomain) query.set("organisationId", filters.orgSubdomain);
    if (filters.page) query.set("page", String(filters.page));
    if (filters.limit) query.set("limit", String(filters.limit));
    if (filters.search) query.set("search", filters.search);
    if (filters.channel && filters.channel !== "ALL") query.set("channel", filters.channel);
    if (filters.status && filters.status !== "ALL") query.set("status", filters.status);
    if (filters.documentType && filters.documentType !== "ALL") query.set("documentType", filters.documentType);
    if (filters.dateRange && filters.dateRange !== "ALL") query.set("dateRange", filters.dateRange);

    const res = await fetch(`/api/notifications?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    } else {
      console.error("[NotificationService] API returned non-OK status:", res.status);
    }
  } catch (err) {
    console.error("[NotificationService] API request failed:", err);
  }

  return emptyResult;
}

/**
 * Update notification status on the backend
 */
export async function updateNotificationStatusApi(
  id: string,
  status: "SENT" | "PENDING" | "FAILED" | "DELIVERED",
  errorDetails?: string,
  orgSubdomain = "ibh"
) {
  try {
    const res = await fetch(`/api/notifications/${id}/status?organisationId=${orgSubdomain}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, errorDetails }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to update notification status:", err);
    return false;
  }
}

/**
 * Resend notification via API
 */
export async function resendNotificationApi(id: string, orgSubdomain = "ibh") {
  try {
    const res = await fetch(`/api/notifications/${id}/resend?organisationId=${orgSubdomain}`, {
      method: "POST",
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to resend notification:", err);
    return false;
  }
}
