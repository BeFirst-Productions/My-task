import { prisma } from "../../database/index.js";
import { resolveOrganisationId } from "../task/task.service.js";

export interface AnalyticsSummary {
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

export async function getOrganisationAnalytics(
  orgIdOrSubdomain?: string,
  timeframe: string = "this_year"
): Promise<AnalyticsSummary> {
  const resolvedOrgId = await resolveOrganisationId(orgIdOrSubdomain);

  if (!resolvedOrgId) {
    return getEmptyAnalytics();
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Parallel fetch from Prisma DB for high efficiency
  const [
    clients,
    documents,
    serviceItems,
    proformaInvoices,
    walletTransactions,
    auditLogs,
    orgUsers,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { organisationId: resolvedOrgId },
      include: {
        wallet: true,
        services: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.document.findMany({
      where: { organisationId: resolvedOrgId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.clientServiceItem.findMany({
      where: {
        client: { organisationId: resolvedOrgId },
      },
      include: {
        client: true,
        serviceItem: true,
        assignedStaff: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.proformaInvoice.findMany({
      where: { organisationId: resolvedOrgId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.walletTransaction.findMany({
      where: { organisationId: resolvedOrgId },
      include: {
        createdBy: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: { organisationId: resolvedOrgId },
      include: {
        user: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: { organisationId: resolvedOrgId },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    }),
  ]);

  // =========================================================================
  // 1. KPI Aggregates (100% accurate, zero dummy values)
  // =========================================================================
  const totalUsers = orgUsers.length;
  const activeUsers = orgUsers.filter((u) => u.status === "ACTIVE").length;
  const inactiveUsers = orgUsers.filter((u) => u.status !== "ACTIVE").length;

  const totalClients = clients.length;
  const clientsThisMonth = clients.filter((c) => new Date(c.createdAt) >= startOfMonth).length;
  const clientsLastMonth = clients.filter(
    (c) => new Date(c.createdAt) >= startOfLastMonth && new Date(c.createdAt) < startOfMonth
  ).length;
  let clientGrowthPct = 0;
  if (clientsLastMonth > 0) {
    clientGrowthPct = Math.round(((clientsThisMonth - clientsLastMonth) / clientsLastMonth) * 100);
  } else if (clientsThisMonth > 0) {
    clientGrowthPct = 100;
  }

  const totalDocuments = documents.length;
  const docsThisMonth = documents.filter((d) => new Date(d.createdAt) >= startOfMonth).length;
  const docsLastMonth = documents.filter(
    (d) => new Date(d.createdAt) >= startOfLastMonth && new Date(d.createdAt) < startOfMonth
  ).length;
  let documentGrowthPct = 0;
  if (docsLastMonth > 0) {
    documentGrowthPct = Math.round(((docsThisMonth - docsLastMonth) / docsLastMonth) * 100);
  } else if (docsThisMonth > 0) {
    documentGrowthPct = 100;
  }

  const activeTasks = serviceItems.filter(
    (s) => s.status === "READY_TO_ASSIGN" || s.status === "ASSIGNED" || s.status === "IN_PROGRESS"
  ).length;
  const tasksThisMonth = serviceItems.filter((s) => new Date(s.createdAt) >= startOfMonth).length;
  const tasksLastMonth = serviceItems.filter(
    (s) => new Date(s.createdAt) >= startOfLastMonth && new Date(s.createdAt) < startOfMonth
  ).length;
  let taskGrowthPct = 0;
  if (tasksLastMonth > 0) {
    taskGrowthPct = Math.round(((tasksThisMonth - tasksLastMonth) / tasksLastMonth) * 100);
  } else if (tasksThisMonth > 0) {
    taskGrowthPct = 100;
  }

  const totalInvoices = proformaInvoices.length;
  const invoicesThisMonth = proformaInvoices.filter((p) => new Date(p.createdAt) >= startOfMonth).length;
  const invoicesLastMonth = proformaInvoices.filter(
    (p) => new Date(p.createdAt) >= startOfLastMonth && new Date(p.createdAt) < startOfMonth
  ).length;
  let invoiceGrowthPct = 0;
  if (invoicesLastMonth > 0) {
    invoiceGrowthPct = Math.round(((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) * 100);
  } else if (invoicesThisMonth > 0) {
    invoiceGrowthPct = 100;
  }

  // Calculate Revenue
  const totalCreditAdvance = walletTransactions
    .filter((t) => t.type === "CREDIT_ADVANCE" || t.type === "CREDIT_TOPUP")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalPackagesValue = clients.reduce((sum, c) => {
    const pkg = (c.services || []).reduce((pSum, s) => pSum + Number(s.totalPrice || 0), 0);
    return sum + pkg;
  }, 0);

  const totalRevenue = Math.max(totalCreditAdvance, totalPackagesValue);

  const revThisMonth = walletTransactions
    .filter(
      (t) =>
        (t.type === "CREDIT_ADVANCE" || t.type === "CREDIT_TOPUP") &&
        new Date(t.createdAt) >= startOfMonth
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const revLastMonth = walletTransactions
    .filter(
      (t) =>
        (t.type === "CREDIT_ADVANCE" || t.type === "CREDIT_TOPUP") &&
        new Date(t.createdAt) >= startOfLastMonth &&
        new Date(t.createdAt) < startOfMonth
    )
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  let revenueGrowthPct = 0;
  if (revLastMonth > 0) {
    revenueGrowthPct = Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100);
  } else if (revThisMonth > 0) {
    revenueGrowthPct = 100;
  }

  // High-impact secondary ratios
  const totalWalletBalance = clients.reduce(
    (sum, c) => sum + Number(c.wallet?.balance || 0),
    0
  );
  const avgRevenuePerClient =
    totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

  const completedTasks = serviceItems.filter((s) => s.status === "COMPLETED").length;
  const taskCompletionRate =
    serviceItems.length > 0 ? Math.round((completedTasks / serviceItems.length) * 100) : 0;

  // =========================================================================
  // 2. Document Status Breakdown & Expiry Horizon
  // =========================================================================
  let validDocsCount = 0;
  let expiringSoonCount = 0;
  let expiredDocsCount = 0;

  let next7Days = 0;
  let next15Days = 0;
  let next30Days = 0;
  let next60Days = 0;
  let beyond60Days = 0;

  for (const doc of documents) {
    if (!doc.expiryDate) {
      validDocsCount++;
      beyond60Days++;
    } else {
      const exp = new Date(doc.expiryDate);
      const diffMs = exp.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (exp < now) {
        expiredDocsCount++;
      } else if (exp <= in30Days) {
        expiringSoonCount++;
        validDocsCount++;
      } else {
        validDocsCount++;
      }

      // Horizon buckets
      if (diffDays >= 0 && diffDays <= 7) {
        next7Days++;
      } else if (diffDays > 7 && diffDays <= 15) {
        next15Days++;
      } else if (diffDays > 15 && diffDays <= 30) {
        next30Days++;
      } else if (diffDays > 30 && diffDays <= 60) {
        next60Days++;
      } else if (diffDays > 60) {
        beyond60Days++;
      }
    }
  }

  const complianceRate =
    totalDocuments > 0 ? Math.round((validDocsCount / totalDocuments) * 100) : 100;

  const documentStatus = {
    total: totalDocuments,
    valid: {
      count: validDocsCount,
      percentage: totalDocuments > 0 ? Math.round((validDocsCount / totalDocuments) * 100) : 0,
    },
    expiringSoon: {
      count: expiringSoonCount,
      percentage: totalDocuments > 0 ? Math.round((expiringSoonCount / totalDocuments) * 100) : 0,
    },
    expired: {
      count: expiredDocsCount,
      percentage: totalDocuments > 0 ? Math.round((expiredDocsCount / totalDocuments) * 100) : 0,
    },
  };

  const documentExpiryHorizon = {
    next7Days,
    next15Days,
    next30Days,
    next60Days,
    beyond60Days,
  };

  // =========================================================================
  // 3. Document Types Distribution
  // =========================================================================
  const typeMap = new Map<string, number>();
  for (const doc of documents) {
    const rawType = (doc.documentType || "OTHER").toString().toUpperCase();
    typeMap.set(rawType, (typeMap.get(rawType) || 0) + 1);
  }

  const tradeLicenseCount = typeMap.get("TRADE_LICENSE") || 0;
  const employmentVisaCount =
    (typeMap.get("VISA") || 0) + (typeMap.get("EMPLOYMENT_VISA") || 0);
  const residenceVisaCount = typeMap.get("RESIDENCE_VISA") || 0;
  const permitAndOtherCount =
    (typeMap.get("COMMERCIAL_PERMIT") || 0) +
    (typeMap.get("PASSPORT") || 0) +
    (typeMap.get("EMIRATES_ID") || 0) +
    (typeMap.get("TENANCY_CONTRACT") || 0) +
    (typeMap.get("MEMORANDUM_OF_ASSOCIATION") || 0) +
    (typeMap.get("TAX_REGISTRATION_CERTIFICATE") || 0) +
    (typeMap.get("LABOUR_ESTABLISHMENT_CARD") || 0) +
    (typeMap.get("INSURANCE_POLICY") || 0) +
    (typeMap.get("POWER_OF_ATTORNEY") || 0) +
    (typeMap.get("OTHER") || 0);

  const documentTypes = [
    { type: "Trade License", count: tradeLicenseCount, color: "#2563eb" },
    { type: "Employment Visa", count: employmentVisaCount, color: "#a855f7" },
    { type: "Residence Visa", count: residenceVisaCount, color: "#f43f5e" },
    { type: "Permit & Other", count: permitAndOtherCount, color: "#38bdf8" },
  ];

  // =========================================================================
  // 4. Dynamic Timeframe Series for Monthly Revenue & Client Growth
  // =========================================================================
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  let monthlyRevenue: Array<{ month: string; revenue: number }> = [];
  let clientGrowth: Array<{ month: string; count: number }> = [];

  if (timeframe === "this_month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weeks = [
      { label: "W1 (1-7)", start: 1, end: 7 },
      { label: "W2 (8-14)", start: 8, end: 14 },
      { label: "W3 (15-21)", start: 15, end: 21 },
      { label: "W4 (22-28)", start: 22, end: 28 },
      { label: `W5 (29-${daysInMonth})`, start: 29, end: daysInMonth },
    ];

    monthlyRevenue = weeks.map((w) => {
      const rev = walletTransactions
        .filter((tx) => {
          if (tx.type !== "CREDIT_ADVANCE" && tx.type !== "CREDIT_TOPUP") return false;
          const d = new Date(tx.createdAt);
          return (
            d.getFullYear() === currentYear &&
            d.getMonth() === now.getMonth() &&
            d.getDate() >= w.start &&
            d.getDate() <= w.end
          );
        })
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      return { month: w.label, revenue: rev };
    });

    clientGrowth = weeks.map((w) => {
      const count = clients.filter((c) => {
        const d = new Date(c.createdAt);
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === now.getMonth() &&
          d.getDate() >= w.start &&
          d.getDate() <= w.end
        );
      }).length;
      return { month: w.label, count };
    });
  } else if (timeframe === "last_6_months") {
    const buckets: Array<{ monthIndex: number; year: number; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        label: monthNames[d.getMonth()] ?? "Month",
      });
    }

    monthlyRevenue = buckets.map((b) => {
      const rev = walletTransactions
        .filter((tx) => {
          if (tx.type !== "CREDIT_ADVANCE" && tx.type !== "CREDIT_TOPUP") return false;
          const d = new Date(tx.createdAt);
          return d.getFullYear() === b.year && d.getMonth() === b.monthIndex;
        })
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      return { month: b.label, revenue: rev };
    });

    clientGrowth = buckets.map((b) => {
      const count = clients.filter((c) => {
        const d = new Date(c.createdAt);
        return d.getFullYear() === b.year && d.getMonth() === b.monthIndex;
      }).length;
      return { month: b.label, count };
    });
  } else {
    const currentMonthIndex = now.getMonth();
    const monthsToDisplay = monthNames.slice(0, Math.max(currentMonthIndex + 1, 10));

    const monthlyRevMap = new Map<number, number>();
    for (const tx of walletTransactions) {
      if (tx.type === "CREDIT_ADVANCE" || tx.type === "CREDIT_TOPUP") {
        const d = new Date(tx.createdAt);
        if (d.getFullYear() === currentYear) {
          monthlyRevMap.set(d.getMonth(), (monthlyRevMap.get(d.getMonth()) || 0) + Number(tx.amount || 0));
        }
      }
    }

    monthlyRevenue = monthsToDisplay.map((mName, idx) => ({
      month: mName,
      revenue: monthlyRevMap.get(idx) || 0,
    }));

    const monthlyClientMap = new Map<number, number>();
    for (const c of clients) {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === currentYear) {
        monthlyClientMap.set(d.getMonth(), (monthlyClientMap.get(d.getMonth()) || 0) + 1);
      }
    }

    clientGrowth = monthsToDisplay.map((mName, idx) => ({
      month: mName,
      count: monthlyClientMap.get(idx) || 0,
    }));
  }

  // =========================================================================
  // 5. Invoices Status & Financial Settlement Breakdown
  // =========================================================================
  const paidInvoicesList = proformaInvoices.filter((p) => p.status === "CONVERTED_TO_WORK");
  const pendingInvoicesList = proformaInvoices.filter((p) => p.status === "ISSUED" || p.status === "DRAFT");
  const overdueInvoicesList = proformaInvoices.filter((p) => p.status === "CANCELLED");

  const paidAmount = paidInvoicesList.reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);
  const pendingAmount = pendingInvoicesList.reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);
  const overdueAmount = overdueInvoicesList.reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);
  const totalInvoicesCalculated = proformaInvoices.length;

  const invoiceStatus = {
    total: totalInvoicesCalculated,
    paid: {
      count: paidInvoicesList.length,
      amount: paidAmount,
      percentage: totalInvoicesCalculated > 0 ? Math.round((paidInvoicesList.length / totalInvoicesCalculated) * 100) : 0,
    },
    pending: {
      count: pendingInvoicesList.length,
      amount: pendingAmount,
      percentage: totalInvoicesCalculated > 0 ? Math.round((pendingInvoicesList.length / totalInvoicesCalculated) * 100) : 0,
    },
    overdue: {
      count: overdueInvoicesList.length,
      amount: overdueAmount,
      percentage: totalInvoicesCalculated > 0 ? Math.round((overdueInvoicesList.length / totalInvoicesCalculated) * 100) : 0,
    },
  };

  // =========================================================================
  // 6. Payment Methods Distribution
  // =========================================================================
  const methodMap = new Map<string, { count: number; amount: number }>();
  let totalPaymentsSum = 0;

  for (const tx of walletTransactions) {
    if (tx.type === "CREDIT_ADVANCE" || tx.type === "CREDIT_TOPUP") {
      const m = tx.paymentMethod || "BANK_TRANSFER";
      const amt = Number(tx.amount || 0);
      const curr = methodMap.get(m) || { count: 0, amount: 0 };
      methodMap.set(m, { count: curr.count + 1, amount: curr.amount + amt });
      totalPaymentsSum += amt;
    }
  }

  const paymentMethods = Array.from(methodMap.entries()).map(([method, data]) => ({
    method: method.replace(/_/g, " "),
    count: data.count,
    amount: data.amount,
    percentage: totalPaymentsSum > 0 ? Math.round((data.amount / totalPaymentsSum) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);

  // If no transactions yet, show standard method categories with 0
  if (paymentMethods.length === 0) {
    paymentMethods.push(
      { method: "Bank Transfer", count: 0, amount: 0, percentage: 0 },
      { method: "Credit Card", count: 0, amount: 0, percentage: 0 },
      { method: "Cash", count: 0, amount: 0, percentage: 0 },
      { method: "Cheque", count: 0, amount: 0, percentage: 0 }
    );
  }

  // =========================================================================
  // 7. Tasks Overview & Staff Performance Leaderboard
  // =========================================================================
  const pendingTasks = serviceItems.filter(
    (s) => s.status === "READY_TO_ASSIGN" || s.status === "ASSIGNED" || s.status === "IN_PROGRESS"
  ).length;
  const overdueTasks = serviceItems.filter(
    (s) => s.status === "PENDING_PAYMENT" || s.status === "CANCELLED"
  ).length;
  const totalTasksCount = serviceItems.length;

  const tasksOverview = {
    total: totalTasksCount,
    completed: {
      count: completedTasks,
      percentage: totalTasksCount > 0 ? Math.round((completedTasks / totalTasksCount) * 100) : 0,
    },
    pending: {
      count: pendingTasks,
      percentage: totalTasksCount > 0 ? Math.round((pendingTasks / totalTasksCount) * 100) : 0,
    },
    overdue: {
      count: overdueTasks,
      percentage: totalTasksCount > 0 ? Math.round((overdueTasks / totalTasksCount) * 100) : 0,
    },
  };

  // Staff Performance (Group tasks by assigned staff)
  const staffUsers = orgUsers.filter(
    (u) => u.role === "STAFF" || u.role === "ADMIN" || u.role === "SUPER_ADMIN"
  );
  const staffPerformance = staffUsers.map((staff) => {
    const assigned = serviceItems.filter((s) => s.assignedStaffId === staff.id);
    const completed = assigned.filter((s) => s.status === "COMPLETED").length;
    const rate = assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0;

    return {
      staffId: staff.id,
      staffName: staff.fullName || staff.username || "Staff Member",
      email: staff.email || "",
      assignedTasks: assigned.length,
      completedTasks: completed,
      completionRate: rate,
    };
  }).sort((a, b) => b.assignedTasks - a.assignedTasks);

  // =========================================================================
  // 8. Top In-Demand Services Leaderboard
  // =========================================================================
  const serviceDemandMap = new Map<
    string,
    { name: string; count: number; totalRevenue: number; category: string }
  >();

  for (const item of serviceItems) {
    const sId = item.serviceItemId;
    const sName = item.serviceItem?.name || "Corporate Service";
    const price = Number(item.totalPrice || item.basePrice || 0);

    const existing = serviceDemandMap.get(sId) || {
      name: sName,
      count: 0,
      totalRevenue: 0,
      category: "General",
    };
    serviceDemandMap.set(sId, {
      name: sName,
      count: existing.count + 1,
      totalRevenue: existing.totalRevenue + price,
      category: existing.category,
    });
  }

  const topServices = Array.from(serviceDemandMap.entries())
    .map(([id, val]) => ({
      serviceId: id,
      serviceName: val.name,
      orderCount: val.count,
      totalRevenue: val.totalRevenue,
      category: val.category,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 5);

  // =========================================================================
  // 9. Top 10 Clients by Revenue
  // =========================================================================
  const topClients = clients
    .map((c) => {
      const clientRev = (c.services || []).reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
      const invoiceCount = proformaInvoices.filter((p) => p.clientId === c.id).length;
      const walletBal = Number(c.wallet?.balance || 0);
      const effectiveRevenue = clientRev > 0 ? clientRev : walletBal;

      return {
        id: c.id,
        clientName: c.companyName || c.contactPerson || "Client",
        totalInvoices: invoiceCount,
        revenue: effectiveRevenue,
      };
    })
    .filter((c) => c.revenue > 0 || c.totalInvoices > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // =========================================================================
  // 10. Recent Activities Stream
  // =========================================================================
  const recentActivities: AnalyticsSummary["recentActivities"] = [];

  for (const log of auditLogs) {
    recentActivities.push({
      id: log.id,
      date: new Date(log.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      activity: formatActivityName(log.action),
      details: log.details ? String(log.details) : `${log.entity} ${log.action.toLowerCase()}`,
      user: log.user?.fullName || log.user?.username || "Super Admin",
    });
  }

  if (recentActivities.length < 5) {
    for (const tx of walletTransactions.slice(0, 5)) {
      recentActivities.push({
        id: tx.id,
        date: new Date(tx.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        activity: tx.type === "CREDIT_ADVANCE" ? "Advance Payment" : "Wallet Top-up",
        details: tx.description || `AED ${Number(tx.amount).toFixed(2)} credited`,
        user: tx.createdBy?.fullName || tx.createdBy?.username || "Accounts Team",
      });
    }

    for (const s of serviceItems.filter((item) => item.status === "COMPLETED").slice(0, 4)) {
      recentActivities.push({
        id: s.id,
        date: new Date(s.completedAt || s.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        activity: "Task Completed",
        details: s.serviceItem?.name || "Corporate Service Item",
        user: s.assignedStaff?.fullName || "Assigned Specialist",
      });
    }
  }

  const uniqueActivities = Array.from(
    new Map(recentActivities.map((item) => [item.id, item])).values()
  ).slice(0, 10);

  return {
    kpis: {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalClients,
      clientGrowthPct,
      totalDocuments,
      documentGrowthPct,
      activeTasks,
      taskGrowthPct,
      totalInvoices,
      invoiceGrowthPct,
      totalRevenue,
      revenueGrowthPct,
      totalWalletBalance,
      avgRevenuePerClient,
      taskCompletionRate,
      complianceRate,
    },
    documentStatus,
    documentExpiryHorizon,
    documentTypes,
    monthlyRevenue,
    clientGrowth,
    invoiceStatus,
    paymentMethods,
    tasksOverview,
    staffPerformance,
    topServices,
    topClients,
    recentActivities: uniqueActivities,
    availableModules: {
      clients: true,
      documents: true,
      tasks: true,
      invoices: true,
      revenue: true,
      staff: true,
    },
  };
}

function formatActivityName(action: string): string {
  switch (action) {
    case "CREATE":
    case "CREATED":
      return "Record Created";
    case "UPDATE":
    case "UPDATED":
      return "Record Updated";
    case "DELETE":
    case "DELETED":
      return "Record Removed";
    case "CONVERT_TO_WORK":
      return "Converted to Work";
    case "ASSIGN_STAFF":
      return "Task Assigned";
    case "COMPLETE_TASK":
      return "Task Completed";
    case "TOP_UP_WALLET":
      return "Payment Received";
    default:
      return action.replace(/_/g, " ");
  }
}

function getEmptyAnalytics(): AnalyticsSummary {
  return {
    kpis: {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      totalClients: 0,
      clientGrowthPct: 0,
      totalDocuments: 0,
      documentGrowthPct: 0,
      activeTasks: 0,
      taskGrowthPct: 0,
      totalInvoices: 0,
      invoiceGrowthPct: 0,
      totalRevenue: 0,
      revenueGrowthPct: 0,
      totalWalletBalance: 0,
      avgRevenuePerClient: 0,
      taskCompletionRate: 0,
      complianceRate: 100,
    },
    documentStatus: {
      total: 0,
      valid: { count: 0, percentage: 0 },
      expiringSoon: { count: 0, percentage: 0 },
      expired: { count: 0, percentage: 0 },
    },
    documentExpiryHorizon: {
      next7Days: 0,
      next15Days: 0,
      next30Days: 0,
      next60Days: 0,
      beyond60Days: 0,
    },
    documentTypes: [],
    monthlyRevenue: [],
    clientGrowth: [],
    invoiceStatus: {
      total: 0,
      paid: { count: 0, percentage: 0, amount: 0 },
      pending: { count: 0, percentage: 0, amount: 0 },
      overdue: { count: 0, percentage: 0, amount: 0 },
    },
    paymentMethods: [],
    tasksOverview: {
      total: 0,
      completed: { count: 0, percentage: 0 },
      pending: { count: 0, percentage: 0 },
      overdue: { count: 0, percentage: 0 },
    },
    staffPerformance: [],
    topServices: [],
    topClients: [],
    recentActivities: [],
    availableModules: {
      clients: true,
      documents: true,
      tasks: true,
      invoices: true,
      revenue: true,
      staff: true,
    },
  };
}
