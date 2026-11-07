"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users2,
  UserCheck,
  UserX,
  UserPlus,
  FileText,
  ClipboardCheck,
  ArrowUpRight,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Receipt,
  FilePlus,
  Briefcase,
  Layers,
  Wallet,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  LifeBuoy,
  Shield,
  Sliders,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPermittedModulesForRole } from "@/services/user.service";
import { fetchOrganisationAnalytics, AnalyticsSummaryData } from "@/services/report.service";
import { fetchClients, ClientData } from "@/services/client.service";
import { fetchWorkOrders, WorkOrderItemData } from "@/services/work-order.service";

export interface DocumentExpiryNotification {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  assignedPerson: string;
  companyName?: string;
  documentUrl?: string;
  expiryDate: string;
  daysRemaining: number;
  stage: "SEVEN_DAYS" | "THREE_DAYS" | "ONE_DAY" | "EXPIRED_TODAY";
  urgency: "critical" | "warning" | "notice" | "expired";
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

interface OrgDashboardViewProps {
  orgName?: string;
  orgSubdomain?: string;
  orgId?: string;
  userRole?: string;
  onNavigateTab?: (tab: string) => void;
}

interface KpiCardConfig {
  id: string;
  title: string;
  value: number | string;
  subtext: string;
  badge: string;
  badgeColor: "emerald" | "sky" | "amber" | "slate";
  icon: any;
  onClick?: () => void;
}

export function OrgDashboardView({
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
  orgId,
  userRole = "SUPER_ADMIN",
  onNavigateTab,
}: OrgDashboardViewProps) {
  const { user } = useAuth();

  // Role & Permissions Determination
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "PLATFORM_OWNER";

  // Dynamic Permitted Set: Base Role + Custom Permissions granted by Super Admin
  const permittedSet = useMemo(() => {
    if (isSuperAdmin) {
      return new Set([
        "dashboard",
        "clients",
        "work_orders",
        "tasks",
        "services",
        "documents",
        "alerts",
        "invoices",
        "reports",
        "users",
        "settings",
        "tokens",
      ]);
    }

    const set =
      user?.permittedModules && user.permittedModules.length > 0
        ? new Set(user.permittedModules)
        : new Set(getPermittedModulesForRole(user?.role));

    // Dynamic Super Admin Custom Permissions grant check:
    // If Super Admin provided custom permissions to any module, immediately unlock that module's dashboard cards & data
    if (user?.customPermissions && typeof user.customPermissions === "object") {
      Object.keys(user.customPermissions).forEach((mod) => {
        const perms = (user.customPermissions as any)[mod];
        if (Array.isArray(perms) ? perms.length > 0 : Boolean(perms)) {
          set.add(mod);
        }
      });
    }

    if (user?.role === "ADMIN") {
      set.add("services");
    }

    return set;
  }, [user, isSuperAdmin]);

  const canAccess = (moduleId: string) => isSuperAdmin || permittedSet.has(moduleId);

  // Live State from Real Database APIs
  const [analytics, setAnalytics] = useState<AnalyticsSummaryData | null>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderItemData[]>([]);
  const [notifications, setNotifications] = useState<DocumentExpiryNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [timeframe, setTimeframe] = useState<"this_year" | "last_6_months" | "this_month">("this_year");
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"ALL" | "1DAY" | "3DAYS" | "7DAYS" | "EXPIRED">("ALL");

  // Load All Permitted Real Data
  const loadDashboardData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const targetOrg = orgId || orgSubdomain || "ibh";

      // Always load analytics summary for permitted data
      const analyticsPromise = fetchOrganisationAnalytics(targetOrg, timeframe);

      // Only fetch clients if permitted
      const clientsPromise = canAccess("clients")
        ? fetchClients(targetOrg)
        : Promise.resolve([]);

      // Only fetch work orders if permitted
      const workOrdersPromise =
        canAccess("work_orders") || canAccess("tasks")
          ? fetchWorkOrders({
              organisationId: targetOrg,
              assignedStaffId: user?.role === "STAFF" ? user?.id : undefined,
            })
          : Promise.resolve([]);

      const [analyticsData, clientsData, workOrdersData] = await Promise.all([
        analyticsPromise,
        clientsPromise,
        workOrdersPromise,
      ]);

      if (analyticsData) setAnalytics(analyticsData);
      if (clientsData) setClients(clientsData);
      if (workOrdersData) setWorkOrders(workOrdersData);

      // Fetch Real Document Expiry Notifications if permitted
      if (canAccess("documents") || canAccess("alerts")) {
        try {
          const notifRes = await fetch(`/api/documents/notifications?organisationId=${encodeURIComponent(targetOrg)}`);
          if (notifRes.ok) {
            const notifJson = await notifRes.json();
            if (notifJson.success && notifJson.data?.notifications) {
              setNotifications(notifJson.data.notifications);
            }
          }
        } catch (err) {
          console.warn("Could not load expiry alerts:", err);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
  }, [orgId, orgSubdomain, timeframe, user?.role, user?.permittedModules]);

  // Filtered Notifications based on selected urgency tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (notificationFilter === "1DAY") return n.stage === "ONE_DAY" || n.daysRemaining === 1;
      if (notificationFilter === "3DAYS") return n.stage === "THREE_DAYS" || (n.daysRemaining > 1 && n.daysRemaining <= 3);
      if (notificationFilter === "7DAYS") return n.stage === "SEVEN_DAYS" || (n.daysRemaining > 3 && n.daysRemaining <= 7);
      if (notificationFilter === "EXPIRED") return n.stage === "EXPIRED_TODAY" || n.daysRemaining <= 0;
      return true;
    });
  }, [notifications, notificationFilter]);

  // Real Database Metrics
  const totalUsers = analytics?.kpis.totalUsers ?? 0;
  const activeUsers = analytics?.kpis.activeUsers ?? 0;
  const inactiveUsers = analytics?.kpis.inactiveUsers ?? 0;
  const totalClients = analytics?.kpis.totalClients ?? clients.length;
  const totalDocs = analytics?.kpis.totalDocuments ?? 0;
  const activeTasks = analytics?.kpis.activeTasks ?? workOrders.filter((w) => w.status !== "COMPLETED").length;
  const totalRevenue = analytics?.kpis.totalRevenue ?? 0;
  const totalWallet = analytics?.kpis.totalWalletBalance ?? 0;
  const avgRevPerClient = analytics?.kpis.avgRevenuePerClient ?? 0;
  const taskCompletionRate = analytics?.kpis.taskCompletionRate ?? 0;
  const complianceRate = analytics?.kpis.complianceRate ?? 100;

  // Real Recent Clients (top 5)
  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [clients]);

  // Real Recent Work Order Tasks (top 5, prioritized for staff)
  const recentWorkOrders = useMemo(() => {
    let list = [...workOrders];
    if (user?.role === "STAFF" && user?.id) {
      const myAssigned = list.filter((w) => w.assignedStaffId === user.id);
      if (myAssigned.length > 0) list = myAssigned;
    }
    return list
      .sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime())
      .slice(0, 5);
  }, [workOrders, user?.role, user?.id]);

  // Operational Deliverables Metrics for Staff & Execution roles
  const myAssignedDeliverables = useMemo(() => {
    if (user?.role === "STAFF" && user?.id) {
      const myAssigned = workOrders.filter((w) => w.assignedStaffId === user.id);
      if (myAssigned.length > 0) return myAssigned;
    }
    return workOrders;
  }, [workOrders, user?.role, user?.id]);

  const inProgressTasksCount = useMemo(() => {
    return myAssignedDeliverables.filter(
      (w) => w.status === "IN_PROGRESS" || w.status === "ASSIGNED"
    ).length;
  }, [myAssignedDeliverables]);

  const completedTasksCount = useMemo(() => {
    return myAssignedDeliverables.filter((w) => w.status === "COMPLETED").length;
  }, [myAssignedDeliverables]);

  const pendingTasksCount = useMemo(() => {
    return myAssignedDeliverables.filter(
      (w) => w.status === "READY_TO_ASSIGN" || w.status === "PENDING_PAYMENT"
    ).length;
  }, [myAssignedDeliverables]);

  const criticalExpiryCount = useMemo(() => {
    return (
      (analytics?.documentStatus.expiringSoon.count ?? 0) +
      (analytics?.documentStatus.expired.count ?? 0)
    );
  }, [analytics]);

  const activeDeliverablesTotal = myAssignedDeliverables.length || activeTasks;
  const operationalCompletionRate = activeDeliverablesTotal > 0
    ? Math.round((completedTasksCount / activeDeliverablesTotal) * 100)
    : taskCompletionRate;

  // Dynamic SVG Chart Coordinates for Client Growth Trend
  const chartData = useMemo(() => {
    const rawMonths = analytics?.clientGrowth || [];
    if (rawMonths.length === 0) {
      return [
        { month: "Jan", count: 0 },
        { month: "Feb", count: 0 },
        { month: "Mar", count: 0 },
        { month: "Apr", count: 0 },
        { month: "May", count: 0 },
        { month: "Jun", count: 0 },
      ];
    }
    return rawMonths.slice(-6);
  }, [analytics?.clientGrowth]);

  const maxChartCount = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.count), 5);
    return Math.ceil(maxVal / 5) * 5;
  }, [chartData]);

  // Compute SVG Points for Blue Line and Area
  const svgPoints = useMemo(() => {
    if (chartData.length <= 1) return "";
    const width = 360;
    const height = 110;
    const paddingX = 35;
    const stepX = (width - paddingX * 2) / (chartData.length - 1);

    return chartData
      .map((item, index) => {
        const x = paddingX + index * stepX;
        const normalizedY = maxChartCount > 0 ? item.count / maxChartCount : 0;
        const y = height - normalizedY * 85 + 15;
        return `${x},${y}`;
      })
      .join(" ");
  }, [chartData, maxChartCount]);

  const svgAreaPath = useMemo(() => {
    if (!svgPoints) return "";
    const pointsArr = svgPoints.split(" ");
    if (pointsArr.length === 0) return "";
    const firstX = pointsArr[0].split(",")[0];
    const lastX = pointsArr[pointsArr.length - 1].split(",")[0];
    return `M ${firstX},135 L ${pointsArr.join(" L ")} L ${lastX},135 Z`;
  }, [svgPoints]);

  // =========================================================
  // DYNAMIC ROLE-BASED KPI CARDS (Only permitted modules render)
  // =========================================================
  const kpiCards = useMemo(() => {
    const cards: KpiCardConfig[] = [];

    // Case 1: Roles with "users" permission (Super Admin, Platform Owner, Administrator)
    if (canAccess("users")) {
      cards.push({
        id: "total_users",
        title: "Total Users",
        value: totalUsers,
        subtext: `${activeUsers} Active members`,
        badge: "Team",
        badgeColor: "sky",
        icon: Users2,
        onClick: () => onNavigateTab?.("user-list"),
      });
      cards.push({
        id: "active_users",
        title: "Active Users",
        value: activeUsers,
        subtext: "Operational staff",
        badge: `${totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100}%`,
        badgeColor: "emerald",
        icon: UserCheck,
        onClick: () => onNavigateTab?.("user-list"),
      });
      cards.push({
        id: "inactive_users",
        title: "Inactive Users",
        value: inactiveUsers,
        subtext: inactiveUsers > 0 ? "Requires invite" : "All verified",
        badge: inactiveUsers > 0 ? "Pending" : "None",
        badgeColor: inactiveUsers > 0 ? "amber" : "slate",
        icon: UserX,
        onClick: () => onNavigateTab?.("user-list"),
      });

      if (canAccess("clients")) {
        cards.push({
          id: "total_clients",
          title: "Total Clients",
          value: totalClients,
          subtext: "Corporate accounts",
          badge: `+${analytics?.kpis.clientGrowthPct ?? 0}%`,
          badgeColor: "emerald",
          icon: UserPlus,
          onClick: () => onNavigateTab?.("client-list"),
        });
      }

      if (canAccess("documents")) {
        cards.push({
          id: "total_documents",
          title: "Total Documents",
          value: totalDocs,
          subtext: `${analytics?.documentStatus.valid.count ?? totalDocs} Compliant`,
          badge: `${complianceRate}%`,
          badgeColor: "emerald",
          icon: FileText,
          onClick: () => onNavigateTab?.("doc-list"),
        });
      }

      if (canAccess("work_orders") || canAccess("tasks")) {
        cards.push({
          id: "work_tasks",
          title: "Work Tasks",
          value: activeTasks,
          subtext: "Active deliverables",
          badge: `${taskCompletionRate}% done`,
          badgeColor: "emerald",
          icon: ClipboardCheck,
          onClick: () => onNavigateTab?.("work-orders"),
        });
      }
    } else {
      // Case 2: Restricted / Operational Roles (STAFF, ACCOUNTANT, SALES_STAFF, etc.)
      // Provide actionable, role-tailored operational KPIs to prevent awkward stretching or sparse metrics:

      // Operational Work Orders & Tasks Breakdown
      if (canAccess("work_orders") || canAccess("tasks")) {
        cards.push({
          id: "assigned_deliverables",
          title: user?.role === "STAFF" ? "My Work Orders" : "Work Deliverables",
          value: activeDeliverablesTotal,
          subtext: user?.role === "STAFF" ? "Assigned deliverable tasks" : "Active service deliverables",
          badge: `${activeDeliverablesTotal} Total`,
          badgeColor: "sky",
          icon: Briefcase,
          onClick: () => onNavigateTab?.("work-orders"),
        });

        cards.push({
          id: "in_progress_tasks",
          title: "In Progress Work",
          value: inProgressTasksCount,
          subtext: "Currently executing",
          badge: inProgressTasksCount > 0 ? "Active" : "Queue Ready",
          badgeColor: "amber",
          icon: Clock,
          onClick: () => onNavigateTab?.("work-orders"),
        });

        cards.push({
          id: "completed_tasks",
          title: "Completed Work",
          value: completedTasksCount,
          subtext: `${operationalCompletionRate}% completion rate`,
          badge: "Delivered",
          badgeColor: "emerald",
          icon: CheckCircle2,
          onClick: () => onNavigateTab?.("work-orders"),
        });
      }

      // Document Vault & Compliance Metrics
      if (canAccess("documents")) {
        cards.push({
          id: "total_documents",
          title: "Documents Vault",
          value: totalDocs,
          subtext: `${analytics?.documentStatus.valid.count ?? totalDocs} Valid / Compliant`,
          badge: `${complianceRate}% valid`,
          badgeColor: "emerald",
          icon: FileText,
          onClick: () => onNavigateTab?.("doc-list"),
        });

        cards.push({
          id: "compliance_alerts",
          title: "Compliance Alerts",
          value: criticalExpiryCount,
          subtext: `${analytics?.documentExpiryHorizon.next7Days ?? 0} critical in 7 days`,
          badge: criticalExpiryCount > 0 ? "Action Req." : "All Clear",
          badgeColor: criticalExpiryCount > 0 ? "amber" : "emerald",
          icon: Shield,
          onClick: () => onNavigateTab?.("doc-list"),
        });
      }

      // Client Management Metrics (e.g. for Accountant or Sales Staff)
      if (canAccess("clients")) {
        cards.push({
          id: "total_clients",
          title: "Corporate Clients",
          value: totalClients,
          subtext: "Corporate accounts",
          badge: `+${analytics?.kpis.clientGrowthPct ?? 0}%`,
          badgeColor: "emerald",
          icon: UserPlus,
          onClick: () => onNavigateTab?.("client-list"),
        });
      }
    }

    return cards;
  }, [
    canAccess,
    totalUsers,
    activeUsers,
    inactiveUsers,
    totalClients,
    totalDocs,
    activeTasks,
    activeDeliverablesTotal,
    inProgressTasksCount,
    completedTasksCount,
    criticalExpiryCount,
    complianceRate,
    taskCompletionRate,
    operationalCompletionRate,
    analytics,
    user?.role,
    onNavigateTab,
  ]);

  // Dynamic Grid Class for Top KPI Cards (no awkward spaces or gaps)
  const kpiGridClass = useMemo(() => {
    const count = kpiCards.length;
    if (count >= 6) return "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5";
    if (count === 5) return "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5";
    if (count === 4) return "grid grid-cols-2 lg:grid-cols-4 gap-3.5";
    if (count === 3) return "grid grid-cols-1 sm:grid-cols-3 gap-3.5";
    if (count === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-3.5";
    return "grid grid-cols-1 max-w-sm gap-3.5";
  }, [kpiCards.length]);

  // Visibility Flags for Major Sections
  const showFinancialStrip = canAccess("invoices");
  const showDocChart = canAccess("documents");
  const showClientChart = canAccess("clients");

  // Companion Operational Cards to eliminate empty whitespace when only one chart is permitted
  const showTaskExecutionCard =
    (canAccess("work_orders") || canAccess("tasks")) && !showClientChart;
  const showClientOverviewCard = canAccess("clients") && !showDocChart;

  const showChartsRow =
    showDocChart || showClientChart || showTaskExecutionCard;

  const showClientsTable = canAccess("clients");
  const showWorkOrdersTable = canAccess("work_orders") || canAccess("tasks");
  const showTablesRow = showClientsTable || showWorkOrdersTable;

  const showAlertsColumn = canAccess("documents") || canAccess("alerts");
  const showActivityColumn = isSuperAdmin || canAccess("reports");

  // Dynamic Permitted Quick Operations List
  const quickActions = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      icon: any;
      bgLight: string;
      bgDark: string;
      borderLight: string;
      borderDark: string;
      iconColor: string;
      tab: string;
    }> = [];

    if (canAccess("clients")) {
      list.push({
        id: "client-create",
        label: "+ Client",
        icon: UserPlus,
        bgLight: "bg-[#fff7ed]",
        bgDark: "dark:bg-amber-950/30",
        borderLight: "border-amber-200/80",
        borderDark: "dark:border-amber-800/40",
        iconColor: "text-orange-500",
        tab: "client-create",
      });
    }

    if (canAccess("work_orders") || canAccess("tasks")) {
      list.push({
        id: "work-orders",
        label: "Work Orders",
        icon: Briefcase,
        bgLight: "bg-[#f0f9ff]",
        bgDark: "dark:bg-sky-950/30",
        borderLight: "border-sky-200/80",
        borderDark: "dark:border-sky-800/40",
        iconColor: "text-sky-500",
        tab: "work-orders",
      });
    }

    if (canAccess("tasks")) {
      list.push({
        id: "task-list",
        label: "My Tasks",
        icon: ClipboardCheck,
        bgLight: "bg-[#ecfdf5]",
        bgDark: "dark:bg-emerald-950/30",
        borderLight: "border-emerald-200/80",
        borderDark: "dark:border-emerald-800/40",
        iconColor: "text-emerald-500",
        tab: "task-list",
      });
    }

    if (canAccess("documents")) {
      list.push({
        id: "doc-create",
        label: "+ Document",
        icon: FilePlus,
        bgLight: "bg-[#faf5ff]",
        bgDark: "dark:bg-purple-950/30",
        borderLight: "border-purple-200/80",
        borderDark: "dark:border-purple-800/40",
        iconColor: "text-purple-500",
        tab: "doc-create",
      });
      list.push({
        id: "doc-list",
        label: "Vault",
        icon: FileText,
        bgLight: "bg-slate-50",
        bgDark: "dark:bg-[#181c2a]",
        borderLight: "border-slate-200",
        borderDark: "dark:border-slate-800",
        iconColor: "text-amber-500",
        tab: "doc-list",
      });
    }

    if (canAccess("users")) {
      list.push({
        id: "user-create",
        label: "+ Create User",
        icon: UserCheck,
        bgLight: "bg-[#f0fdf4]",
        bgDark: "dark:bg-emerald-950/30",
        borderLight: "border-emerald-200/80",
        borderDark: "dark:border-emerald-800/40",
        iconColor: "text-emerald-500",
        tab: "user-create",
      });
    }

    if (canAccess("services")) {
      list.push({
        id: "services",
        label: "Services",
        icon: Layers,
        bgLight: "bg-slate-50",
        bgDark: "dark:bg-[#181c2a]",
        borderLight: "border-slate-200",
        borderDark: "dark:border-slate-800",
        iconColor: "text-amber-500",
        tab: "services",
      });
    }

    if (canAccess("tokens")) {
      list.push({
        id: "tokens",
        label: "Support",
        icon: LifeBuoy,
        bgLight: "bg-slate-50",
        bgDark: "dark:bg-[#181c2a]",
        borderLight: "border-slate-200",
        borderDark: "dark:border-slate-800",
        iconColor: "text-amber-500",
        tab: "tokens",
      });
    }

    return list;
  }, [canAccess]);

  const showQuickOpsColumn = quickActions.length > 0;
  const showBottomRow = showAlertsColumn || showActivityColumn || showQuickOpsColumn;

  // Bottom Grid Column Span Calculation
  const bottomColCount = [showAlertsColumn, showActivityColumn, showQuickOpsColumn].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-amber-500 selection:text-black">
      {/* ========================================================= */}
      {/* HEADER BAR: TITLE, ROLE BADGE & LIVE REFRESH               */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#12141c] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {orgName}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {isSuperAdmin
                  ? "Super Admin • Full Workspace"
                  : user?.role === "ACCOUNTANT"
                  ? "Accounts Manager Workspace"
                  : user?.role === "STAFF"
                  ? "Operational Staff Workspace"
                  : user?.role === "SALES_STAFF"
                  ? "Sales Pipeline Workspace"
                  : user?.role === "ADMIN"
                  ? "Administrator Workspace"
                  : "Workspace"}
              </span>

              {/* Indicator if user has custom permissions granted by Super Admin */}
              {!isSuperAdmin && user?.customPermissions && Object.keys(user.customPermissions).length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <Sliders className="h-2.5 w-2.5" />
                  Custom Permissions Granted
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isSuperAdmin
                ? "Full organizational metrics, financial ledgers, audit logs & team provisioning."
                : user?.role === "ACCOUNTANT"
                ? "Financial revenue, wallet transactions, client invoice management & balance summaries."
                : user?.role === "STAFF"
                ? "Your operational service deliverables, assigned tasks & document verification."
                : user?.role === "SALES_STAFF"
                ? "Client onboarding pipeline, quotations & commercial catalog services."
                : "Operational management, active service deliverables & compliance tracking."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadDashboardData(false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] hover:bg-slate-100 dark:hover:bg-[#1a1d2a] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh live data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          {/* Timeframe Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTimeframeDropdownOpen(!timeframeDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] hover:bg-slate-100 dark:hover:bg-[#1a1d2a] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Calendar className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {timeframe === "this_year"
                  ? "This Year"
                  : timeframe === "last_6_months"
                  ? "Last 6 Months"
                  : "This Month"}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {timeframeDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] p-1 text-xs shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setTimeframe("this_year");
                    setTimeframeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    timeframe === "this_year" ? "bg-amber-500/10 text-amber-500 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  This Year
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimeframe("last_6_months");
                    setTimeframeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    timeframe === "last_6_months" ? "bg-amber-500/10 text-amber-500 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Last 6 Months
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimeframe("this_month");
                    setTimeframeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    timeframe === "this_month" ? "bg-amber-500/10 text-amber-500 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  This Month
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 1: TOP KPI CARDS (Only Permitted Modules Render)      */}
      {/* ========================================================= */}
      {kpiCards.length > 0 && (
        <div className={kpiGridClass}>
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={card.onClick}
                className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-amber-500/40 cursor-pointer group"
                title={`Click to view ${card.title}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {card.title}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 group-hover:scale-110 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {card.value}
                    </span>
                    <span
                      className={`flex items-center text-[10px] font-bold ${
                        card.badgeColor === "emerald"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : card.badgeColor === "sky"
                          ? "text-sky-600 dark:text-sky-400"
                          : card.badgeColor === "amber"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400"
                      }`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {card.subtext}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* FINANCIAL & WORKFLOW STRIP (Only Permitted Roles)         */}
      {/* ========================================================= */}
      {showFinancialStrip && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-gradient-to-br from-white to-amber-500/[0.03] dark:from-[#12141c] dark:to-amber-500/[0.05] shadow-xs flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Package Revenue
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight font-mono">
                AED {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-gradient-to-br from-white to-emerald-500/[0.03] dark:from-[#12141c] dark:to-emerald-500/[0.05] shadow-xs flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Client Wallets Balance
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight font-mono">
                AED {totalWallet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-gradient-to-br from-white to-sky-500/[0.03] dark:from-[#12141c] dark:to-sky-500/[0.05] shadow-xs flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Avg. Value per Client
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight font-mono">
                AED {avgRevPerClient.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-gradient-to-br from-white to-purple-500/[0.03] dark:from-[#12141c] dark:to-purple-500/[0.05] shadow-xs flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Invoices Converted
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {analytics?.invoiceStatus.paid.count ?? 0} / {analytics?.kpis.totalInvoices ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ROW 2: ANALYTICS & OPERATIONAL CHARTS (No Whitespace)    */}
      {/* ========================================================= */}
      {showChartsRow && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Document Status Donut (Requires "documents") */}
          {showDocChart && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Compliance Status</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                      {totalDocs} total
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("doc-list")}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Repository</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2 pb-1">
                  {/* SVG Donut Circle */}
                  <div className="relative h-44 w-44 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="38" stroke="#e2e8f0" className="dark:stroke-slate-800" strokeWidth="13" fill="none" />

                      {totalDocs > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#10b981"
                          strokeWidth="13"
                          fill="none"
                          strokeDasharray={`${(238.7 * ((analytics?.documentStatus.valid.count ?? totalDocs) / totalDocs)).toFixed(1)} 238.7`}
                          strokeDashoffset="0"
                        />
                      )}

                      {(analytics?.documentStatus.expiringSoon.count ?? 0) > 0 && totalDocs > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#f59e0b"
                          strokeWidth="13"
                          fill="none"
                          strokeDasharray={`${(238.7 * ((analytics?.documentStatus.expiringSoon.count ?? 0) / totalDocs)).toFixed(1)} 238.7`}
                          strokeDashoffset={`-${(238.7 * ((analytics?.documentStatus.valid.count ?? 0) / totalDocs)).toFixed(1)}`}
                        />
                      )}

                      {(analytics?.documentStatus.expired.count ?? 0) > 0 && totalDocs > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#ef4444"
                          strokeWidth="13"
                          fill="none"
                          strokeDasharray={`${(238.7 * ((analytics?.documentStatus.expired.count ?? 0) / totalDocs)).toFixed(1)} 238.7`}
                          strokeDashoffset={`-${(238.7 * (((analytics?.documentStatus.valid.count ?? 0) + (analytics?.documentStatus.expiringSoon.count ?? 0)) / totalDocs)).toFixed(1)}`}
                        />
                      )}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                        {totalDocs}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Documents</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs w-full sm:w-52">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Valid / Compliant</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {analytics?.documentStatus.valid.count ?? totalDocs} ({analytics?.documentStatus.valid.percentage ?? (totalDocs > 0 ? 100 : 0)}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Expiring Soon</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {analytics?.documentStatus.expiringSoon.count ?? 0} ({analytics?.documentStatus.expiringSoon.percentage ?? 0}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Expired</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {analytics?.documentStatus.expired.count ?? 0} ({analytics?.documentStatus.expired.percentage ?? 0}%)
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>7-Day Critical Alerts:</span>
                      <span className="font-bold text-rose-500">
                        {analytics?.documentExpiryHorizon.next7Days ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Status Strip */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Compliance Rating: <strong className="text-emerald-500 font-bold">{complianceRate}%</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("doc-list")}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Manage Vault &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Client Growth Trend (Requires "clients") */}
          {showClientChart && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Client Growth Trend</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Monthly onboarding progression across organisation
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600 dark:text-slate-400 font-bold">New Clients</span>
                  </div>
                </div>

                <div className="relative h-48 w-full pt-4">
                  <svg viewBox="0 0 400 160" className="h-full w-full">
                    <line x1="30" y1="20" x2="390" y2="20" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeDasharray="3 3" />
                    <line x1="30" y1="55" x2="390" y2="55" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeDasharray="3 3" />
                    <line x1="30" y1="90" x2="390" y2="90" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeDasharray="3 3" />
                    <line x1="30" y1="125" x2="390" y2="125" stroke="currentColor" className="text-slate-100 dark:text-slate-800/80" strokeDasharray="3 3" />
                    <line x1="30" y1="140" x2="390" y2="140" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />

                    <text x="10" y="24" fill="#94a3b8" fontSize="9">{maxChartCount}</text>
                    <text x="10" y="60" fill="#94a3b8" fontSize="9">{Math.round(maxChartCount * 0.66)}</text>
                    <text x="10" y="95" fill="#94a3b8" fontSize="9">{Math.round(maxChartCount * 0.33)}</text>
                    <text x="15" y="144" fill="#94a3b8" fontSize="9">0</text>

                    <defs>
                      <linearGradient id="amberAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {svgAreaPath && (
                      <path d={svgAreaPath} fill="url(#amberAreaGradient)" />
                    )}

                    {svgPoints && (
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={svgPoints}
                      />
                    )}

                    {chartData.map((d, index) => {
                      const width = 360;
                      const height = 110;
                      const paddingX = 35;
                      const stepX = chartData.length > 1 ? (width - paddingX * 2) / (chartData.length - 1) : 0;
                      const x = paddingX + index * stepX;
                      const normalizedY = maxChartCount > 0 ? d.count / maxChartCount : 0;
                      const y = height - normalizedY * 85 + 15;

                      return (
                        <g key={d.month}>
                          <circle cx={x} cy={y} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                          {d.count > 0 && (
                            <text x={x} y={y - 8} fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">
                              {d.count}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  <div className="flex justify-between pl-8 pr-3 text-[10px] font-semibold text-slate-400">
                    {chartData.map((d) => (
                      <span key={d.month}>{d.month}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Quick Status Strip */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Growth Velocity: <strong className="text-amber-500 font-bold">+{analytics?.kpis.clientGrowthPct ?? 0}%</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("client-list")}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Client Directory &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Companion Card 1: Deliverables Execution & Progress Status (Rendered when Client Chart is hidden) */}
          {showTaskExecutionCard && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {user?.role === "STAFF" ? "My Deliverables Execution Status" : "Task Execution Pipeline"}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                        {activeDeliverablesTotal} total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {user?.role === "STAFF"
                        ? "Real-time execution velocity and work status of your assigned tasks"
                        : "Active operational deliverables across all corporate services"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("work-orders")}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Work Orders</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Multi-segment Progress Bar */}
                <div className="mb-4 pt-1">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">Execution Progress</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                      {operationalCompletionRate}% completed
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${operationalCompletionRate}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`Completed: ${completedTasksCount}`}
                    />
                    <div
                      style={{
                        width: `${
                          activeDeliverablesTotal > 0
                            ? Math.round((inProgressTasksCount / activeDeliverablesTotal) * 100)
                            : 0
                        }%`,
                      }}
                      className="bg-sky-500 h-full transition-all duration-500"
                      title={`In Progress: ${inProgressTasksCount}`}
                    />
                    <div
                      style={{
                        width: `${
                          activeDeliverablesTotal > 0
                            ? Math.round((pendingTasksCount / activeDeliverablesTotal) * 100)
                            : 0
                        }%`,
                      }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title={`Pending: ${pendingTasksCount}`}
                    />
                  </div>
                </div>

                {/* 3 Metric Status Cards */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50/40 dark:bg-sky-950/20 text-center">
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 block uppercase tracking-wider">
                      In Work
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {inProgressTasksCount}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Active tasks</span>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20 text-center">
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
                      Pending
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {pendingTasksCount}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Queue & advance</span>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20 text-center">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
                      Completed
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {completedTasksCount}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Verified delivery</span>
                  </div>
                </div>
              </div>

              {/* Quick Priority / Focus Banner */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] min-w-0">
                  <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                  <span className="truncate">
                    {inProgressTasksCount > 0
                      ? `${inProgressTasksCount} deliverables requiring active attention today`
                      : "All assigned deliverables currently on schedule"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("work-orders")}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                >
                  Open Queue &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Companion Card 2: Client Portfolio Overview (Rendered when Doc Chart is hidden) */}
          {showClientOverviewCard && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Client Portfolio Overview</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                        {totalClients} clients
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Account status distribution and active corporate onboarding
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("client-list")}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Directory</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-3">
                  <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20 text-center">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
                      Active Work
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {clients.filter((c) => c.status === "ACTIVE" || c.status === "CONVERTED_TO_WORK").length}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Executing</span>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20 text-center">
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
                      Pending Pay
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {clients.filter((c) => c.status === "WORK_PENDING_PAYMENT").length}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Advance needed</span>
                  </div>

                  <div className="p-3 rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50/40 dark:bg-sky-950/20 text-center">
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 block uppercase tracking-wider">
                      Completed
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {clients.filter((c) => c.status === "COMPLETED").length}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Finalized</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total Managed Accounts: <strong className="text-slate-900 dark:text-white font-bold">{totalClients}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("client-create")}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  + Onboard Client &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ROW 3: REAL DATA TABLES (Dynamically Adapts to Roles)     */}
      {/* ========================================================= */}
      {showTablesRow && (
        <div
          className={`grid gap-5 ${
            showClientsTable && showWorkOrdersTable
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {/* Table 1: Real Recent Clients (Requires "clients") */}
          {showClientsTable && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Clients</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Latest corporate clients registered in organisation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("client-list")}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({clients.length})</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="overflow-x-auto">
                {recentClients.length === 0 ? (
                  <div className="py-10 text-center">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Clients Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Get started by onboarding your first corporate client.</p>
                    <button
                      type="button"
                      onClick={() => onNavigateTab?.("client-create")}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      + Onboard Client
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-semibold">
                        <th className="pb-3 pr-2 w-6">#</th>
                        <th className="pb-3 px-2">Client / Company</th>
                        <th className="pb-3 px-2">Services</th>
                        {showFinancialStrip && <th className="pb-3 px-2">Wallet</th>}
                        <th className="pb-3 px-2">Status</th>
                        <th className="pb-3 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {recentClients.map((client, index) => {
                        const servicesCount = client.services?.length || 0;
                        const walletBal = Number(client.wallet?.balance || 0);

                        return (
                          <tr
                            key={client.id}
                            onClick={() => onNavigateTab?.("client-list")}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 pr-2 text-slate-400 font-medium">{index + 1}</td>
                            <td className="py-3 px-2">
                              <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate max-w-[150px]">
                                {client.companyName || client.contactPerson || "Unnamed Client"}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {client.contactPerson || client.email || "Primary Contact"}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {servicesCount} Task{servicesCount === 1 ? "" : "s"}
                              </span>
                            </td>
                            {showFinancialStrip && (
                              <td className="py-3 px-2 font-mono font-bold text-slate-900 dark:text-slate-200">
                                AED {walletBal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                            )}
                            <td className="py-3 px-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  client.status === "ACTIVE" || client.status === "CONVERTED_TO_WORK"
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : client.status === "COMPLETED"
                                    ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}
                              >
                                {client.status === "WORK_PENDING_PAYMENT"
                                  ? "Pending Payment"
                                  : client.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="text-amber-500 group-hover:underline text-[11px] font-semibold">
                                View &rarr;
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Table 2: Real Recent Work Orders (Requires "work_orders" or "tasks") */}
          {showWorkOrdersTable && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.role === "STAFF" ? "My Assigned Work Orders" : "Recent Work Orders"}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {user?.role === "STAFF"
                      ? "Operational tasks assigned to you for client execution"
                      : "Active deliverable tasks across client services"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.("work-orders")}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({workOrders.length})</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="overflow-x-auto">
                {recentWorkOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <Briefcase className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Work Orders</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {user?.role === "STAFF"
                        ? "You have no active deliverables assigned at the moment."
                        : "Convert client package to work to initiate operational tasks."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-semibold">
                        <th className="pb-3 pr-2 w-8">#</th>
                        <th className="pb-3 px-3">Deliverable Task</th>
                        <th className="pb-3 px-3">Category</th>
                        <th className="pb-3 px-3">Client / Organization</th>
                        <th className="pb-3 px-3">Assigned Staff</th>
                        <th className="pb-3 px-3">Status</th>
                        <th className="pb-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {recentWorkOrders.map((task, index) => {
                        const staffName = task.assignedStaff?.fullName || task.assignedStaff?.username;
                        const clientName = task.client?.companyName || task.client?.contactPerson || "Client";
                        const categoryName =
                          typeof task.serviceItem?.category === "object"
                            ? task.serviceItem.category?.name
                            : task.serviceItem?.category || "Trade License & Setup";

                        return (
                          <tr
                            key={task.id}
                            onClick={() => onNavigateTab?.("work-orders")}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 pr-2 text-slate-400 font-medium">{index + 1}</td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate max-w-[200px]">
                                {task.serviceItem?.name || "Corporate Deliverable"}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                Task Ref #{task.id.slice(0, 8)}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                                {categoryName}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                              {clientName}
                            </td>
                            <td className="py-3.5 px-3">
                              {staffName ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="h-5 w-5 rounded-md bg-amber-500/15 text-amber-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {staffName[0].toUpperCase()}
                                  </span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                                    {staffName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  task.status === "COMPLETED"
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : task.status === "IN_PROGRESS" || task.status === "ASSIGNED"
                                    ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                                    : "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                                }`}
                              >
                                {task.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <span className="text-amber-500 group-hover:underline text-[11px] font-bold">
                                Open &rarr;
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ROW 4: BOTTOM COLUMNS (ALERTS, ACTIVITY, QUICK OPS)       */}
      {/* ========================================================= */}
      {showBottomRow && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Column 1: Compliance Alerts (Requires "documents" or "alerts") */}
          {showAlertsColumn && (
            <div
              className={`rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between ${
                bottomColCount === 3
                  ? "lg:col-span-5"
                  : bottomColCount === 2
                  ? "lg:col-span-7"
                  : "lg:col-span-12"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Compliance Alerts</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                      {notifications.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("doc-list")}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
                  {[
                    { id: "ALL", label: `All (${notifications.length})` },
                    { id: "1DAY", label: "🚨 1 Day" },
                    { id: "3DAYS", label: "⚠️ 3 Days" },
                    { id: "7DAYS", label: "ℹ️ 7 Days" },
                    { id: "EXPIRED", label: "Expired" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setNotificationFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        notificationFilter === tab.id
                          ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                          : "bg-slate-100 dark:bg-[#1c202e] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-3 max-h-[310px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All Documents Compliant</p>
                      <p className="text-[11px] text-slate-400 mt-1">No upcoming expiry alerts for this filter criteria.</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const isExpired = notif.daysRemaining <= 0;
                      const is1Day = notif.daysRemaining === 1;

                      return (
                        <div
                          key={notif.id}
                          onClick={() => onNavigateTab?.("doc-list")}
                          className={`p-3 rounded-xl border text-xs transition-all cursor-pointer group flex items-start justify-between gap-3 ${
                            isExpired
                              ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60"
                              : is1Day
                              ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60"
                              : "border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#151824] hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                                isExpired
                                  ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-amber-500 transition-colors truncate">
                                {notif.documentName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {notif.companyName || notif.assignedPerson} • {notif.documentType.replace(/_/g, " ")}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isExpired
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                  : is1Day
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 animate-pulse"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                              }`}
                            >
                              {isExpired
                                ? "Expired"
                                : notif.daysRemaining === 1
                                ? "Tomorrow"
                                : `${notif.daysRemaining} Days`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Column 2: Live Activity Stream (Requires "reports" or Super Admin) */}
          {showActivityColumn && (
            <div
              className={`rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between ${
                bottomColCount === 3
                  ? "lg:col-span-4"
                  : bottomColCount === 2
                  ? "lg:col-span-5"
                  : "lg:col-span-12"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("reports")}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Audit</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-3 pt-1 max-h-[310px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                  {(analytics?.recentActivities || []).length === 0 ? (
                    <div className="py-10 text-center">
                      <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Recent Activities</p>
                      <p className="text-[11px] text-slate-400 mt-1">Actions performed across the organization appear here.</p>
                    </div>
                  ) : (
                    (analytics?.recentActivities || []).slice(0, 5).map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#151824] flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0 mt-0.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                              {act.activity}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {act.details} • by {act.user}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {act.date.split(",")[0]}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Column 3: Permitted Quick Operational Actions */}
          {showQuickOpsColumn && (
            <div
              className={`rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between ${
                bottomColCount === 3
                  ? "lg:col-span-3"
                  : bottomColCount === 2
                  ? "lg:col-span-5"
                  : "lg:col-span-12"
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Quick Operations</h3>

                <div className="grid grid-cols-2 gap-2.5">
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => onNavigateTab?.(action.tab)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl ${action.bgLight} ${action.bgDark} border ${action.borderLight} ${action.borderDark} hover:scale-[1.02] transition-all text-center group cursor-pointer shadow-xs`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 ${action.iconColor} mb-1.5 group-hover:scale-110 transition-transform`}>
                          <ActionIcon className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {action.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Workspace Operational Focus Hint */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#151824] border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>Workspace Focus</span>
                  </div>
                  <p className="leading-relaxed">
                    {user?.role === "STAFF"
                      ? "Keep task deliverables updated regularly. Verify document expiry alerts to ensure total corporate compliance."
                      : user?.role === "ACCOUNTANT"
                      ? "Reconcile wallet transactions against completed package service deliverables before invoicing."
                      : "Direct operational shortcuts for rapid workflow navigation and task execution."}
                  </p>
                </div>
              </div>

              {/* Direct Settings Shortcut if Permitted */}
              {canAccess("settings") ? (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("settings")}
                    className="w-full py-1.5 text-center text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer"
                  >
                    Organization Settings &rarr;
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
