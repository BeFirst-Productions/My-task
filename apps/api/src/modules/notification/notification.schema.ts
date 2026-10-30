export interface NotificationQueryParams {
  organisationId?: string;
  search?: string;
  channel?: string;
  status?: string;
  documentType?: string;
  dateRange?: string;
  page?: string | number;
  limit?: string | number;
}

export interface UpdateNotificationStatusInput {
  status: "SENT" | "PENDING" | "FAILED" | "DELIVERED";
  errorDetails?: string;
}

export interface FormattedDeliveryStep {
  title: string;
  timestamp: string;
  status: "completed" | "current" | "failed" | "pending";
  details?: string;
}

export interface FormattedNotificationResponse {
  id: string;
  itemNumber: number;
  clientName: string;
  clientCompany: string;
  clientInitials: string;
  avatarColor: {
    bg: string;
    text: string;
  };
  documentType: string;
  documentNumber: string;
  notificationType: "Expiry Reminder" | "Expired Notice" | "Expiring Soon";
  channel: "WhatsApp" | "Email" | "SMS";
  dateTime: string;
  dateIso: string;
  status: "Sent" | "Failed" | "Pending" | "Delivered";
  message: string;
  deliveryTimeline: FormattedDeliveryStep[];
}

export interface NotificationStatsResponse {
  total: number;
  totalTrend: string;
  whatsappSent: number;
  whatsappTrend: string;
  emailSent: number;
  emailTrend: string;
  failed: number;
  failedTrend: string;
}

