"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  FileText,
  CheckSquare,
  Receipt,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  FileJson,
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  ExternalLink,
  Minus,
  Briefcase,
  TrendingUp,
  Sparkles,
  BarChart3,
  PieChart,
  Wallet,
  UserCheck,
  Layers,
  Award,
  CreditCard,
  AlertTriangle,
  FolderLock,
  ChevronRight,
  BadgePercent,
  Check,
} from "lucide-react";
import {
  fetchOrganisationAnalytics,
  AnalyticsSummaryData,
} from "@/services/report.service";

interface OrgReportsAnalyticsViewProps {
  orgId?: string;
  orgSubdomain?: string;
  orgName?: string;
  onNavigateTab?: (tab: string) => void;
}

export type ReportWidgetId =
  | "financial_trajectory"
  | "document_compliance"
  | "staff_performance"
  | "top_services"
  | "operations_pipeline"
  | "client_growth"
  | "top_clients"
  | "recent_activities";

interface WidgetConfig {
  id: ReportWidgetId;
  title: string;
  module: "Finance" | "Documents" | "Operations" | "Clients" | "Audit";
  description: string;
  enabled: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: "financial_trajectory",
    title: "Financial Trajectory & Invoicing Realization",
    module: "Finance",
    description: "Revenue trajectory curve, monthly collections, and invoice settlement rates",
    enabled: true,
  },
  {
    id: "document_compliance",
    title: "Document Vault & Expiry Horizon",
    module: "Documents",
    description: "Corporate document validity ratio, expiry warnings, and category breakdown",
    enabled: true,
  },
  {
    id: "staff_performance",
    title: "Staff Performance & Workload Allocation",
    module: "Operations",
    description: "Team task assignments, completion rates, and active operational capacity",
    enabled: true,
  },
  {
    id: "top_services",
    title: "Top In-Demand Corporate Services",
    module: "Operations",
    description: "Most requested corporate services, order volume, and revenue generation",
    enabled: true,
  },
  {
    id: "operations_pipeline",
    title: "Operations & Service Delivery",
    module: "Operations",
    description: "Work order execution pipeline, active assignments, and completion velocity",
    enabled: true,
  },
  {
    id: "client_growth",
    title: "Client Acquisition & Velocity",
    module: "Clients",
    description: "New client signups and onboarding trajectory across billing periods",
    enabled: true,
  },
  {
    id: "top_clients",
    title: "Top Grossing Corporate Clients",
    module: "Clients",
    description: "Ranked list of highest revenue clients with volume indicators",
    enabled: true,
  },
  {
    id: "recent_activities",
    title: "Live Operations & Audit Stream",
    module: "Audit",
    description: "Real-time timeline of operational milestones, deposits, and task completions",
    enabled: true,
  },
];

// Helper: Generates smooth cubic bezier path for silky fluid SVG curves
function getSmoothSplinePath(
  points: Array<{ x: number; y: number }>,
  closeToBottom = false,
  bottomY = 100
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  if (closeToBottom) {
    const last = points[points.length - 1];
    d += ` L ${last.x.toFixed(1)},${bottomY} L ${points[0].x.toFixed(1)},${bottomY} Z`;
  }

  return d;
}

export function OrgReportsAnalyticsView({
  orgId,
  orgSubdomain,
  orgName = "Business Hub",
  onNavigateTab,
}: OrgReportsAnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>("this_year");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Interactive Hover Tooltips
  const [hoveredRevenueIndex, setHoveredRevenueIndex] = useState<number | null>(null);
  const [hoveredClientIndex, setHoveredClientIndex] = useState<number | null>(null);
  const [hoveredDocStatus, setHoveredDocStatus] = useState<string | null>(null);

  // Widget Layout Customization State
  const storageKey = `org_report_widgets_v3_${orgSubdomain || "default"}`;
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return DEFAULT_WIDGETS;
  });

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetchOrganisationAnalytics(orgId || orgSubdomain, timeframe);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.warn("Failed to load reports data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [orgId, orgSubdomain, timeframe]);

  // Widget helper check with Category Filter support
  const isWidgetVisible = (id: ReportWidgetId) => {
    const w = widgets.find((item) => item.id === id);
    if (!w || !w.enabled) return false;

    if (activeCategoryFilter === "all") return true;
    if (activeCategoryFilter === "finance") return w.module === "Finance";
    if (activeCategoryFilter === "compliance") return w.module === "Documents";
    if (activeCategoryFilter === "operations") return w.module === "Operations";
    if (activeCategoryFilter === "clients") return w.module === "Clients";
    return true;
  };

  const toggleWidget = (id: ReportWidgetId) => {
    setWidgets((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const applyPreset = (preset: "ALL" | "OPERATIONS" | "FINANCE" | "DOCUMENTS") => {
    let updated = [...widgets];
    if (preset === "ALL") {
      updated = updated.map((w) => ({ ...w, enabled: true }));
    } else if (preset === "OPERATIONS") {
      updated = updated.map((w) => ({
        ...w,
        enabled: w.module === "Operations" || w.module === "Audit" || w.id === "client_growth",
      }));
    } else if (preset === "FINANCE") {
      updated = updated.map((w) => ({
        ...w,
        enabled: w.module === "Finance" || w.id === "top_clients" || w.id === "recent_activities",
      }));
    } else if (preset === "DOCUMENTS") {
      updated = updated.map((w) => ({
        ...w,
        enabled: w.module === "Documents" || w.id === "recent_activities",
      }));
    }
    setWidgets(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const resetWidgets = () => {
    setWidgets(DEFAULT_WIDGETS);
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Executive Analytics Report", orgName, new Date().toLocaleDateString()],
      ["Reporting Timeframe", timeframe],
      [],
      ["Primary KPI Metric", "Value", "Growth vs Prior Period"],
      ["Total Clients", data.kpis.totalClients, `${data.kpis.clientGrowthPct}%`],
      ["Total Documents", data.kpis.totalDocuments, `${data.kpis.documentGrowthPct}%`],
      ["Active Tasks", data.kpis.activeTasks, `${data.kpis.taskGrowthPct}%`],
      ["Total Invoices", data.kpis.totalInvoices, `${data.kpis.invoiceGrowthPct}%`],
      ["Total Revenue (AED)", data.kpis.totalRevenue, `${data.kpis.revenueGrowthPct}%`],
      ["Client Escrow Wallet Balance (AED)", data.kpis.totalWalletBalance, "Liquid deposit funds"],
      ["Average Revenue Per Client (AED)", data.kpis.avgRevenuePerClient, "ARPU"],
      ["Task Completion Rate", `${data.kpis.taskCompletionRate}%`, "Delivery efficiency"],
      [],
      ["Document Compliance Status", "Count", "Percentage"],
      ["Valid Documents", data.documentStatus.valid.count, `${data.documentStatus.valid.percentage}%`],
      ["Expiring Soon (<30d)", data.documentStatus.expiringSoon.count, `${data.documentStatus.expiringSoon.percentage}%`],
      ["Expired / Urgent", data.documentStatus.expired.count, `${data.documentStatus.expired.percentage}%`],
      [],
      ["Top In-Demand Service", "Orders", "Revenue (AED)"],
      ...data.topServices.map((s) => [s.serviceName, s.orderCount, s.totalRevenue]),
      [],
      ["Staff Member", "Assigned Work Orders", "Completed Tasks", "Completion Rate"],
      ...data.staffPerformance.map((st) => [st.staffName, st.assignedTasks, st.completedTasks, `${st.completionRate}%`]),
      [],
      ["Top Client Leaderboard", "Total Invoices", "Revenue (AED)"],
      ...data.topClients.map((c) => [c.clientName, c.totalInvoices, c.revenue]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${orgSubdomain || "organisation"}_executive_report_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  // JSON Export Handler
  const handleExportJSON = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `${orgSubdomain || "organisation"}_analytics_${timeframe}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  const renderGrowthBadge = (pct: number) => {
    if (pct > 0) {
      return (
        <span
          className="inline-flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/60"
          title={`+${pct}% compared to previous month`}
        >
          <ArrowUpRight className="h-3 w-3 mr-0.5 stroke-[2.5]" />
          +{pct}%
        </span>
      );
    }
    if (pct < 0) {
      return (
        <span
          className="inline-flex items-center text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/80 dark:border-rose-800/60"
          title={`${pct}% compared to previous month`}
        >
          <ArrowDownRight className="h-3 w-3 mr-0.5 stroke-[2.5]" />
          {pct}%
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60"
        title="0% change vs previous month"
      >
        <Minus className="h-3 w-3 mr-0.5" />
        0%
      </span>
    );
  };

  // Spline Curve Points
  const revenuePoints = useMemo(() => {
    if (!data?.monthlyRevenue || data.monthlyRevenue.length === 0) return [];
    const max = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1000);
    const count = data.monthlyRevenue.length;
    const width = 360;

    return data.monthlyRevenue.map((item, idx) => {
      const x = count > 1 ? (idx / (count - 1)) * width : width / 2;
      const y = Math.round(92 - (item.revenue / max) * 78);
      return { x, y, month: item.month, revenue: item.revenue };
    });
  }, [data?.monthlyRevenue]);

  const maxRevenueVal = useMemo(() => {
    if (!data?.monthlyRevenue || data.monthlyRevenue.length === 0) return 0;
    return Math.max(...data.monthlyRevenue.map((m) => m.revenue), 0);
  }, [data?.monthlyRevenue]);

  const maxClientVal = useMemo(() => {
    if (!data?.clientGrowth || data.clientGrowth.length === 0) return 5;
    return Math.max(...data.clientGrowth.map((c) => c.count), 5);
  }, [data?.clientGrowth]);

  const splineAreaPath = useMemo(() => {
    return getSmoothSplinePath(revenuePoints, true, 100);
  }, [revenuePoints]);

  const splineLinePath = useMemo(() => {
    return getSmoothSplinePath(revenuePoints, false);
  }, [revenuePoints]);

  return (
    <div className="space-y-6 pb-24 font-sans select-none animate-fade-in print:p-0 print:m-0">
      {/* ========================================================= */}
      {/* 1. Header with Compact Unified Toolbar                    */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#11131a] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs print:border-none print:shadow-none">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Report & Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {orgName}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            360° operational metrics, staff performance, compliance horizon, and financial analytics.
          </p>
        </div>

        {/* Compact Right Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start lg:justify-end print:hidden">
          {/* Timeframe Selector Pill */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setTimeframe("this_year")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === "this_year"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              This Year
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("last_6_months")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === "last_6_months"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Last 6 Months
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("this_month")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === "this_month"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              This Month
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Refresh Live Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
          </button>

          {/* Customize Layout */}
          <button
            type="button"
            onClick={() => setShowCustomizeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shrink-0"
            title="Configure widgets layout"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Customize</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 stroke-[3]" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-[#161924] border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span>Export as CSV (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-left cursor-pointer"
                >
                  <FileJson className="h-4 w-4 text-sky-500" />
                  <span>Export as JSON (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-left cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1"
                >
                  <Printer className="h-4 w-4 text-purple-500" />
                  <span>Print Official Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Domain Category Navigator Filter Tabs                  */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
        {[
          { id: "all", label: "Executive Overview (All)", icon: BarChart3 },
          { id: "finance", label: "Finance & Invoicing", icon: Coins },
          { id: "compliance", label: "Compliance & Expiries", icon: ShieldCheck },
          { id: "operations", label: "Operations & Staff Workload", icon: Briefcase },
          { id: "clients", label: "Client Intelligence", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeCategoryFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategoryFilter(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm"
                  : "bg-white dark:bg-[#11131a] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 3. Top Primary Metric KPI Cards                           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Total Clients */}
        <div className="bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Total Clients
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {data ? data.kpis.totalClients : 0}
            </span>
            {data && renderGrowthBadge(data.kpis.clientGrowthPct)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">Registered enterprise accounts</p>
        </div>

        {/* Card 2: Total Documents */}
        <div className="bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Total Documents
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {data ? data.kpis.totalDocuments : 0}
            </span>
            {data && renderGrowthBadge(data.kpis.documentGrowthPct)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">Licenses, visas & permits</p>
        </div>

        {/* Card 3: Active Tasks */}
        <div className="bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Active Tasks
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {data ? data.kpis.activeTasks : 0}
            </span>
            {data && renderGrowthBadge(data.kpis.taskGrowthPct)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">Services in operational work</p>
        </div>

        {/* Card 4: Total Invoices */}
        <div className="bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Total Invoices
            </span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {data ? data.kpis.totalInvoices : 0}
            </span>
            {data && renderGrowthBadge(data.kpis.invoiceGrowthPct)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">Issued proformas & tax invoices</p>
        </div>

        {/* Card 5: Realized Revenue */}
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Revenue (AED)
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono whitespace-nowrap">
              {data ? data.kpis.totalRevenue.toLocaleString("en-US") : "0"}
            </span>
            {data && renderGrowthBadge(data.kpis.revenueGrowthPct)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">Gross packages & deposits</p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. Secondary Operational Health Ribbon                    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-[#11131a] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
        {/* Wallet Escrow Held */}
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Escrow Wallet Funds
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              AED {data ? data.kpis.totalWalletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
            </span>
          </div>
        </div>

        {/* Avg Revenue Per Client */}
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
          <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            <BadgePercent className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Average Revenue / Client
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              AED {data ? data.kpis.avgRevenuePerClient.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
            </span>
          </div>
        </div>

        {/* Task Delivery Efficiency */}
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Service Delivery Rate
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {data ? data.kpis.taskCompletionRate : 0}% Completed
            </span>
          </div>
        </div>

        {/* Compliance Health */}
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Compliance Vault Health
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {data ? data.kpis.complianceRate : 100}% In Good Standing
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. SECTION: Financial Trajectory & Invoicing Realization   */}
      {/* ========================================================= */}
      {isWidgetVisible("financial_trajectory") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Financial Spline Chart (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Monthly Revenue Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified cash inflows from package conversions and advance wallet credits
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
                  Peak: AED {maxRevenueVal.toLocaleString("en-US")}
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Total: AED {data ? data.kpis.totalRevenue.toLocaleString("en-US") : "0"}
                </span>
              </div>
            </div>

            {/* Smooth SVG Spline Curve */}
            <div className="relative w-full h-48 flex flex-col justify-end pt-4 select-none">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-25">
                <div className="border-b border-slate-400 text-[10px] text-slate-400 font-mono">
                  {maxRevenueVal >= 1000
                    ? `${(maxRevenueVal / 1000).toFixed(1)}k`
                    : maxRevenueVal > 0
                    ? maxRevenueVal
                    : "1k"}
                </div>
                <div className="border-b border-slate-400 text-[10px] text-slate-400 font-mono">
                  {maxRevenueVal >= 1000
                    ? `${((maxRevenueVal * 0.5) / 1000).toFixed(1)}k`
                    : maxRevenueVal > 0
                    ? Math.round(maxRevenueVal * 0.5)
                    : "500"}
                </div>
                <div className="border-b border-slate-400 text-[10px] text-slate-400 font-mono">0</div>
              </div>

              {revenuePoints.length > 0 ? (
                <div className="relative w-full h-36">
                  {/* Floating Tooltip */}
                  {hoveredRevenueIndex !== null && revenuePoints[hoveredRevenueIndex] && (
                    <div
                      style={{
                        left: `${(revenuePoints[hoveredRevenueIndex].x / 360) * 100}%`,
                        top: "-28px",
                      }}
                      className="absolute transform -translate-x-1/2 z-30 bg-slate-950 text-white text-[11px] py-1.5 px-3 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none"
                    >
                      <p className="font-bold text-amber-400 flex items-center gap-1.5">
                        <span>{revenuePoints[hoveredRevenueIndex].month}</span>
                        <span className="text-[10px] font-normal text-slate-300">
                          (
                          {maxRevenueVal > 0
                            ? Math.round(
                                (revenuePoints[hoveredRevenueIndex].revenue /
                                  (data?.kpis.totalRevenue || 1)) *
                                  100
                              )
                            : 0}
                          %)
                        </span>
                      </p>
                      <p className="font-mono text-xs font-black">
                        AED{" "}
                        {revenuePoints[hoveredRevenueIndex].revenue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}

                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 360 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="splineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <path fill="url(#splineAreaGradient)" d={splineAreaPath} />
                    <path
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={splineLinePath}
                    />

                    {hoveredRevenueIndex !== null && revenuePoints[hoveredRevenueIndex] && (
                      <line
                        x1={revenuePoints[hoveredRevenueIndex].x}
                        y1="10"
                        x2={revenuePoints[hoveredRevenueIndex].x}
                        y2="100"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="opacity-75"
                      />
                    )}

                    {revenuePoints.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="14"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredRevenueIndex(i)}
                          onMouseLeave={() => setHoveredRevenueIndex(null)}
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredRevenueIndex === i ? "6" : "3.5"}
                          fill="#ffffff"
                          stroke="#f59e0b"
                          strokeWidth={hoveredRevenueIndex === i ? "3" : "2"}
                          className="transition-all duration-150 pointer-events-none"
                        />
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="w-full h-36 flex items-center justify-center text-xs text-slate-400">
                  No revenue history available
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-3 px-1">
                {revenuePoints.map((item, idx) => (
                  <span
                    key={idx}
                    className={`cursor-pointer transition-colors ${
                      hoveredRevenueIndex === idx ? "text-amber-500 font-bold" : ""
                    }`}
                    onMouseEnter={() => setHoveredRevenueIndex(idx)}
                    onMouseLeave={() => setHoveredRevenueIndex(null)}
                  >
                    {item.month}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Invoicing Settlement & Payment Channels (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-rose-500" />
                  Invoicing Realization
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Billing
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Proforma issuance, converted work orders, and payment collection channels
              </p>

              {/* Status Breakdown */}
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Converted / Paid
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {data ? data.invoiceStatus.paid.count : 0} ({data ? data.invoiceStatus.paid.percentage : 0}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${data ? data.invoiceStatus.paid.percentage : 0}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Pending Settlement
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {data ? data.invoiceStatus.pending.count : 0} ({data ? data.invoiceStatus.pending.percentage : 0}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-amber-200/50 dark:bg-amber-900/40 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${data ? data.invoiceStatus.pending.percentage : 0}%` }}
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                      Cancelled / Lapsed
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {data ? data.invoiceStatus.overdue.count : 0} ({data ? data.invoiceStatus.overdue.percentage : 0}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-rose-200/50 dark:bg-rose-900/40 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${data ? data.invoiceStatus.overdue.percentage : 0}%` }}
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods Sub-Block */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  Primary Payment Channels
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {data?.paymentMethods.slice(0, 4).map((pm) => (
                    <div
                      key={pm.method}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-[10px] text-slate-400 block truncate">{pm.method}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        AED {pm.amount.toLocaleString("en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Invoices Tracked</span>
              <span className="font-mono font-black text-slate-900 dark:text-white">
                {data ? data.invoiceStatus.total : 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. SECTION: Document Compliance & Expiry Horizon Suite    */}
      {/* ========================================================= */}
      {isWidgetVisible("document_compliance") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Document Compliance Health Donut (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Document Compliance Health
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Vault Expiries
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Active valid documents vs licenses & visas requiring prompt renewal
              </p>

              <div className="flex items-center justify-around gap-6 py-2">
                {/* SVG Segmented Donut */}
                <div className="relative flex items-center justify-center w-36 h-36 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#e2e8f0"
                      className="dark:stroke-slate-800"
                      strokeWidth="12"
                      fill="transparent"
                    />
                    {data && data.documentStatus.total > 0 && (
                      <>
                        {/* Valid (Emerald) */}
                        {data.documentStatus.valid.percentage > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#10b981"
                            strokeWidth={hoveredDocStatus === "valid" ? "15" : "12"}
                            fill="transparent"
                            strokeDasharray="238.76"
                            strokeDashoffset={
                              238.76 - (238.76 * data.documentStatus.valid.percentage) / 100
                            }
                            strokeLinecap="round"
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredDocStatus("valid")}
                            onMouseLeave={() => setHoveredDocStatus(null)}
                          />
                        )}
                        {/* Expiring Soon (Amber) */}
                        {data.documentStatus.expiringSoon.percentage > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#f59e0b"
                            strokeWidth={hoveredDocStatus === "expiringSoon" ? "15" : "12"}
                            fill="transparent"
                            strokeDasharray="238.76"
                            strokeDashoffset={
                              238.76 -
                              (238.76 *
                                (data.documentStatus.valid.percentage +
                                  data.documentStatus.expiringSoon.percentage)) /
                                100
                            }
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredDocStatus("expiringSoon")}
                            onMouseLeave={() => setHoveredDocStatus(null)}
                          />
                        )}
                        {/* Expired (Rose) */}
                        {data.documentStatus.expired.percentage > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#f43f5e"
                            strokeWidth={hoveredDocStatus === "expired" ? "15" : "12"}
                            fill="transparent"
                            strokeDasharray="238.76"
                            strokeDashoffset={
                              238.76 -
                              (238.76 *
                                (data.documentStatus.valid.percentage +
                                  data.documentStatus.expiringSoon.percentage +
                                  data.documentStatus.expired.percentage)) /
                                100
                            }
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredDocStatus("expired")}
                            onMouseLeave={() => setHoveredDocStatus(null)}
                          />
                        )}
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono leading-tight">
                      {data ? data.documentStatus.total : 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Vault Docs</span>
                  </div>
                </div>

                {/* Slices Legend */}
                <div className="space-y-2.5 min-w-0 flex-1 text-xs">
                  <div
                    onMouseEnter={() => setHoveredDocStatus("valid")}
                    onMouseLeave={() => setHoveredDocStatus(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                      hoveredDocStatus === "valid" ? "bg-emerald-500/10 scale-102" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Valid Documents</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {data ? data.documentStatus.valid.count : 0}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({data ? data.documentStatus.valid.percentage : 0}%)
                      </span>
                    </span>
                  </div>

                  <div
                    onMouseEnter={() => setHoveredDocStatus("expiringSoon")}
                    onMouseLeave={() => setHoveredDocStatus(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                      hoveredDocStatus === "expiringSoon" ? "bg-amber-500/10 scale-102" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Expiring Soon (&lt;30d)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {data ? data.documentStatus.expiringSoon.count : 0}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({data ? data.documentStatus.expiringSoon.percentage : 0}%)
                      </span>
                    </span>
                  </div>

                  <div
                    onMouseEnter={() => setHoveredDocStatus("expired")}
                    onMouseLeave={() => setHoveredDocStatus(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                      hoveredDocStatus === "expired" ? "bg-rose-500/10 scale-102" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Expired / Urgent</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {data ? data.documentStatus.expired.count : 0}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({data ? data.documentStatus.expired.percentage : 0}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Automatic reminders cadence</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Monitored Daily
              </span>
            </div>
          </div>

          {/* Expiry Horizon & Vault Classifications (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Upcoming Expiry Horizon & Types
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Renewal Timetable
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Proactive compliance forecast: documents reaching critical expiry thresholds
              </p>

              {/* Expiry Horizon Alert Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">
                    &le; 7 Days
                  </span>
                  <span className="font-mono text-base font-black text-rose-600 dark:text-rose-400">
                    {data?.documentExpiryHorizon.next7Days || 0}
                  </span>
                  <span className="text-[9px] text-rose-500 block">Critical</span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase">
                    8–15 Days
                  </span>
                  <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                    {data?.documentExpiryHorizon.next15Days || 0}
                  </span>
                  <span className="text-[9px] text-amber-500 block">Attention</span>
                </div>

                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block uppercase">
                    16–30 Days
                  </span>
                  <span className="font-mono text-base font-black text-sky-600 dark:text-sky-400">
                    {data?.documentExpiryHorizon.next30Days || 0}
                  </span>
                  <span className="text-[9px] text-sky-500 block">Upcoming</span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                    &gt; 60 Days
                  </span>
                  <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                    {data?.documentExpiryHorizon.beyond60Days || 0}
                  </span>
                  <span className="text-[9px] text-emerald-500 block">Compliant</span>
                </div>
              </div>

              {/* Horizontal Ranked Progress Bars for Document Categories */}
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                Vault Categorical Breakdown
              </span>
              <div className="space-y-3">
                {data && data.documentTypes.length > 0 ? (
                  data.documentTypes.map((item) => {
                    const totalDocs = data.documentStatus.total || 1;
                    const pct = data.documentStatus.total > 0 ? Math.round((item.count / totalDocs) * 100) : 0;

                    return (
                      <div key={item.type} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                            {item.type}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {item.count}{" "}
                              <span className="text-[10px] text-slate-400 font-normal">doc(s)</span>
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md min-w-[34px] text-center">
                              {pct}%
                            </span>
                          </div>
                        </div>

                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${pct > 0 ? pct : item.count > 0 ? 5 : 0}%`,
                              backgroundColor: item.color,
                            }}
                            className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    No documents currently registered in this organization.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>All corporate documents encrypted</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {data ? data.documentStatus.total : 0} Total Tracked
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. SECTION: Staff Performance & Service Demand Suite       */}
      {/* ========================================================= */}
      {(isWidgetVisible("staff_performance") || isWidgetVisible("top_services")) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Staff Performance & Operational Capacity Leaderboard (6 cols) */}
          {isWidgetVisible("staff_performance") && (
            <div className="lg:col-span-6 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-sky-500" />
                    Staff Workload & Performance
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    HR & Capacity
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Work order allocation, task delivery volume, and specialist completion rates
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-2">Staff Member</th>
                        <th className="py-2.5 px-2 text-center">Assigned</th>
                        <th className="py-2.5 px-2 text-center">Completed</th>
                        <th className="py-2.5 px-2 text-right">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {data?.staffPerformance && data.staffPerformance.length > 0 ? (
                        data.staffPerformance.map((staff) => (
                          <tr
                            key={staff.staffId}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-2.5 px-2 font-semibold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-xs shrink-0">
                                  {staff.staffName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate max-w-[130px]">
                                    {staff.staffName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                                    {staff.email || "Operational Staff"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                              {staff.assignedTasks}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {staff.completedTasks}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                  staff.completionRate >= 80
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : staff.completionRate > 0
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                }`}
                              >
                                {staff.completionRate}%
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                            No active staff members found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Active team members</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {data ? data.staffPerformance.length : 0} Specialists
                </span>
              </div>
            </div>
          )}

          {/* Top In-Demand Corporate Services (6 cols) */}
          {isWidgetVisible("top_services") && (
            <div className="lg:col-span-6 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Top In-Demand Services
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    Popularity & Revenue
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Most frequently ordered business setup, visa, and legal compliance services
                </p>

                <div className="space-y-3">
                  {data?.topServices && data.topServices.length > 0 ? (
                    data.topServices.map((svc, idx) => {
                      const maxOrders = data.topServices[0]?.orderCount || 1;
                      const orderShare = Math.round((svc.orderCount / maxOrders) * 100);

                      return (
                        <div
                          key={svc.serviceId || idx}
                          className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:border-amber-500/40 transition-all"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                              {svc.serviceName}
                            </span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              AED {svc.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mt-1">
                            <span>{svc.orderCount} order(s) processed</span>
                            <div className="flex-1 max-w-[120px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${orderShare}%` }}
                                className="h-full bg-amber-500 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No service catalog orders registered yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Top revenue generating offerings</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {data ? data.topServices.length : 0} Featured
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. SECTION: Client Velocity & Enterprise Leaderboard      */}
      {/* ========================================================= */}
      {(isWidgetVisible("client_growth") || isWidgetVisible("top_clients")) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Client Growth Velocity (6 cols) */}
          {isWidgetVisible("client_growth") && (
            <div className="lg:col-span-6 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-500" />
                    Client Onboarding Velocity
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    Registrations
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  Monthly trajectory of new enterprise companies and individual clients onboarded
                </p>

                <div className="h-44 flex items-end justify-between gap-1.5 pt-4 pb-2 px-1 select-none">
                  {data && data.clientGrowth.length > 0 ? (
                    data.clientGrowth.map((item, idx) => {
                      const heightPct =
                        item.count > 0 ? Math.round((item.count / maxClientVal) * 100) : 4;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative"
                          onMouseEnter={() => setHoveredClientIndex(idx)}
                          onMouseLeave={() => setHoveredClientIndex(null)}
                        >
                          {hoveredClientIndex === idx && (
                            <div className="absolute -top-11 z-20 bg-slate-950 text-white text-[11px] py-1.5 px-3 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                              <span className="font-bold text-amber-400">{item.month}</span>:{" "}
                              {item.count} new client(s)
                            </div>
                          )}

                          <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-hidden flex flex-col justify-end h-32">
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 rounded-lg transition-all group-hover:brightness-110 ${
                                hoveredClientIndex === idx ? "ring-2 ring-amber-400 shadow-md" : ""
                              }`}
                            />
                          </div>
                          <span
                            className={`text-[10px] font-mono transition-colors ${
                              hoveredClientIndex === idx
                                ? "text-amber-500 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            {item.month}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      No onboarding records for this timeframe
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Total Onboarded Clients</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {data ? data.kpis.totalClients : 0} Active
                </span>
              </div>
            </div>
          )}

          {/* Top 10 Clients by Revenue (6 cols) */}
          {isWidgetVisible("top_clients") && (
            <div className="lg:col-span-6 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-500" />
                    Top Grossing Clients Leaderboard
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    Ranked
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Highest grossing accounts ranked by service order value and deposits
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-2 w-8 text-center font-mono">#</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Client / Company</th>
                        <th className="py-2.5 px-3 text-center min-w-[80px]">Invoices</th>
                        <th className="py-2.5 px-3 text-right min-w-[120px] whitespace-nowrap">Revenue (AED)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {data?.topClients && data.topClients.length > 0 ? (
                        data.topClients.map((client, idx) => {
                          const topRev = data.topClients[0]?.revenue || 1;
                          const shareWidth = Math.min(
                            Math.max(Math.round((client.revenue / topRev) * 100), 5),
                            100
                          );

                          return (
                            <tr
                              key={client.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                            >
                              <td className="py-2.5 px-2 text-center font-mono text-[11px]">
                                {idx === 0 ? (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                                    1
                                  </span>
                                ) : idx === 1 ? (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-black text-[10px]">
                                    2
                                  </span>
                                ) : idx === 2 ? (
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-700/80 text-white font-black text-[10px]">
                                    3
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px]">
                                    {idx + 1}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                <div className="truncate max-w-[190px]">{client.clientName}</div>
                                <div className="h-1 w-24 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                                  <div
                                    style={{ width: `${shareWidth}%` }}
                                    className="h-full bg-amber-500 rounded-full"
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                                  {client.totalInvoices}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {client.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Building2 className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                No client revenue records for this period
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Converted client work orders and advance wallet deposits will be ranked here.
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Ranked by cumulative value</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {data ? data.topClients.length : 0} Clients
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. SECTION: Live Audit Stream                             */}
      {/* ========================================================= */}
      {isWidgetVisible("recent_activities") && (
        <div className="bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Live Operations & Audit Stream
            </h3>
            <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Live Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Cryptographically timestamped operational actions, client deposits, and staff service completions
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-2 w-8 text-center font-mono">#</th>
                  <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">Timestamp</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Activity Event</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Details & Subject</th>
                  <th className="py-2.5 px-3 min-w-[100px] text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data?.recentActivities && data.recentActivities.length > 0 ? (
                  data.recentActivities.map((act, idx) => (
                    <tr
                      key={act.id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {act.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {act.activity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[250px]">
                        {act.details}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                        {act.user}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Clock className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          No recent activity logs recorded yet
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Operations, task assignments, and financial transactions will stream here in real time.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. Super Admin Customizer Modal                          */}
      {/* ========================================================= */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161924]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Customize Report & Analytics Modules
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enable, disable, or apply layout presets for {orgName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Presets Row */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Quick Layout Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("ALL")}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-900/60 text-left transition-all cursor-pointer active:scale-95 group"
                  >
                    <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500">
                      🌟 Full Suite
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">All sections enabled</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("OPERATIONS")}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-900/60 text-left transition-all cursor-pointer active:scale-95 group"
                  >
                    <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500">
                      💼 Operations
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Staff & service tasks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("FINANCE")}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-900/60 text-left transition-all cursor-pointer active:scale-95 group"
                  >
                    <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500">
                      💰 Finance
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Revenue & billing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("DOCUMENTS")}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-900/60 text-left transition-all cursor-pointer active:scale-95 group"
                  >
                    <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500">
                      📑 Compliance
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Vault & expiry horizon</span>
                  </button>
                </div>
              </div>

              {/* Individual Section Toggles */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Individual Section Toggles ({widgets.filter((w) => w.enabled).length} of {widgets.length} active)
                </label>
                <div className="space-y-2.5">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      onClick={() => toggleWidget(widget.id)}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        widget.enabled
                          ? "bg-amber-500/[0.04] border-amber-500/40 dark:bg-amber-500/[0.08]"
                          : "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/70 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {widget.title}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              widget.module === "Finance"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                                : widget.module === "Documents"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                : widget.module === "Operations"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {widget.module}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{widget.description}</p>
                      </div>

                      <div
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                          widget.enabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`bg-white dark:bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            widget.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161924]">
              <button
                type="button"
                onClick={resetWidgets}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Reset to Default
              </button>

              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
