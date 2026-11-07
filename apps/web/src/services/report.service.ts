import { getAuthHeaders } from "./auth.service";

export interface AnalyticsSummaryData {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalClients: number;
    clientGrowthPct: number;
    totalDocuments: number;
    documentGrowthPct: number;
    activeTasks: number;
    taskGrowthPct: number;
    totalInvoices: number;
    invoiceGrowthPct: number;
    totalRevenue: number;
    revenueGrowthPct: number;
    totalWalletBalance: number;
    avgRevenuePerClient: number;
    taskCompletionRate: number;
    complianceRate: number;
  };
  documentStatus: {
    total: number;
    valid: { count: number; percentage: number };
    expiringSoon: { count: number; percentage: number };
    expired: { count: number; percentage: number };
  };
  documentExpiryHorizon: {
    next7Days: number;
    next15Days: number;
    next30Days: number;
    next60Days: number;
    beyond60Days: number;
  };
  documentTypes: Array<{
    type: string;
    count: number;
    color: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  clientGrowth: Array<{
    month: string;
    count: number;
  }>;
  invoiceStatus: {
    total: number;
    paid: { count: number; percentage: number; amount: number };
    pending: { count: number; percentage: number; amount: number };
    overdue: { count: number; percentage: number; amount: number };
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  tasksOverview: {
    total: number;
    completed: { count: number; percentage: number };
    pending: { count: number; percentage: number };
    overdue: { count: number; percentage: number };
  };
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    email: string;
    assignedTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    orderCount: number;
    totalRevenue: number;
    category: string;
  }>;
  topClients: Array<{
    id: string;
    clientName: string;
    totalInvoices: number;
    revenue: number;
  }>;
  recentActivities: Array<{
    id: string;
    date: string;
    activity: string;
    details: string;
    user: string;
  }>;
  availableModules: {
    clients: boolean;
    documents: boolean;
    tasks: boolean;
    invoices: boolean;
    revenue: boolean;
    staff: boolean;
  };
}

export async function fetchOrganisationAnalytics(
  organisationId?: string,
  timeframe: string = "this_year"
): Promise<AnalyticsSummaryData | null> {
  try {
    const params = new URLSearchParams();
    if (organisationId) params.append("organisationId", organisationId);
    if (timeframe) params.append("timeframe", timeframe);

    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/reports/analytics${q}`, {
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
    return null;
  } catch (err) {
    console.warn("Failed to fetch organisation analytics:", err);
    return null;
  }
}
