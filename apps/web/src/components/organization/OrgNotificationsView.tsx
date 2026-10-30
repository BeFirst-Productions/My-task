"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mail,
  AlertTriangle,
  Search,
  Calendar,
  X,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  NotificationItem,
  NotificationStats,
  fetchNotificationsFromApi,
  updateNotificationStatusApi,
  resendNotificationApi,
} from "@/services/notification.service";

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

interface OrgNotificationsViewProps {
  orgName?: string;
  orgSubdomain?: string;
}

export function OrgNotificationsView({
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
}: OrgNotificationsViewProps) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDocType, setSelectedDocType] = useState("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dynamic Data States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    totalTrend: "0%",
    whatsappSent: 0,
    whatsappTrend: "0%",
    emailSent: 0,
    emailTrend: "0%",
    failed: 0,
    failedTrend: "0%",
  });

  // Action status message
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Selected row for Notification Details Drawer
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);

  // Load dynamic notifications from backend API
  const loadNotifications = useCallback(
    async (showRefreshIndicator = false) => {
      try {
        if (showRefreshIndicator) setIsRefreshing(true);
        else setIsLoading(true);

        const data = await fetchNotificationsFromApi({
          search: searchQuery,
          channel: selectedChannel,
          status: selectedStatus,
          documentType: selectedDocType,
          dateRange: selectedDateRange,
          page: currentPage,
          limit: itemsPerPage,
          orgSubdomain,
        });

        setNotifications(data.notifications);
        setTotalCount(data.total);
        setTotalPages(data.totalPages);
        setStats(data.stats);

        // Keep selected notification updated
        if (data.notifications.length > 0) {
          const stillExists = data.notifications.some((n) => n.id === selectedNotificationId);
          if (!stillExists) {
            setSelectedNotificationId(data.notifications[0].id);
            setSelectedRowIds([data.notifications[0].id]);
          }
        } else {
          setSelectedNotificationId(null);
          setSelectedRowIds([]);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      searchQuery,
      selectedChannel,
      selectedStatus,
      selectedDocType,
      selectedDateRange,
      currentPage,
      itemsPerPage,
      orgSubdomain,
      selectedNotificationId,
    ]
  );

  // Debounced search & filter reload
  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications();
    }, 200);

    return () => clearTimeout(timer);
  }, [loadNotifications]);

  // Selected Notification for the Details Panel
  const activeNotification = useMemo(() => {
    if (!selectedNotificationId) return notifications[0] || null;
    return (
      notifications.find((n) => n.id === selectedNotificationId) ||
      notifications[0] ||
      null
    );
  }, [notifications, selectedNotificationId]);

  // Checkbox Selection
  const isAllSelected =
    notifications.length > 0 &&
    notifications.every((item) => selectedRowIds.includes(item.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(notifications.map((n) => n.id));
    }
  };

  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRowClick = (item: NotificationItem) => {
    setSelectedNotificationId(item.id);
    setDetailsPanelOpen(true);
    if (!selectedRowIds.includes(item.id)) {
      setSelectedRowIds([item.id]);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedChannel("ALL");
    setSelectedStatus("ALL");
    setSelectedDocType("ALL");
    setSelectedDateRange("ALL");
    setCurrentPage(1);
  };

  // Dynamic actions: Resend
  const handleResendNotification = async (id: string) => {
    setActionNotice("Resending notification...");
    const success = await resendNotificationApi(id, orgSubdomain);
    if (success) {
      setActionNotice("Notification dispatched successfully!");
      // Optimistically update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "Sent" } : n))
      );
      setTimeout(() => setActionNotice(null), 3000);
      loadNotifications(true);
    } else {
      setActionNotice("Failed to resend notification. Please try again.");
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  // Helper for Document Type Badge color
  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case "Trade License":
        return "bg-[#e8f1fd] text-[#1d5ec9] border border-[#d2e3fc] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60";
      case "Employment Visa":
        return "bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff] dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60";
      case "Residence Visa":
        return "bg-[#fce7f3] text-[#be185d] border border-[#fbcfe8] dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60";
      case "Establishment Card":
        return "bg-[#e0f7f1] text-[#0d9488] border border-[#ccfbf1] dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60";
      case "Activity Permit":
        return "bg-[#fef3c7] text-[#b45309] border border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Sent":
      case "Delivered":
        return "bg-[#ebf8ee] text-[#16a34a] border border-[#bbf7d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
      case "Failed":
        return "bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
      case "Pending":
      default:
        return "bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Page Title & Subtitle + Live Dynamic Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#111827] dark:text-white tracking-tight leading-tight">
              Notifications
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Database Connected
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            View, filter and manage all notifications sent to clients via WhatsApp and Email.
          </p>
        </div>

        {/* Action / Refresh Notification Banner */}
        {actionNotice && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Top Summary KPI Cards (4 Cards with Dynamic Database Totals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Notifications Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef5ff] text-[#2563eb] dark:bg-blue-950/50 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-[#059669] dark:text-emerald-400 border border-[#a7f3d0] dark:border-emerald-800/60">
              <TrendingUp className="h-3 w-3" />
              {stats.totalTrend}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Notifications
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {isLoading && totalCount === 0 ? (
                <span className="inline-block w-12 h-7 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              ) : (
                stats.total
              )}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              All notifications
            </p>
          </div>
        </div>

        {/* WhatsApp Sent Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#16a34a] dark:bg-emerald-950/50 dark:text-emerald-400">
              <WhatsAppIcon className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-[#059669] dark:text-emerald-400 border border-[#a7f3d0] dark:border-emerald-800/60">
              <TrendingUp className="h-3 w-3" />
              {stats.whatsappTrend}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              WhatsApp Sent
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {isLoading && totalCount === 0 ? (
                <span className="inline-block w-12 h-7 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              ) : (
                stats.whatsappSent
              )}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Successfully delivered
            </p>
          </div>
        </div>

        {/* Email Sent Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fffbeb] text-[#d97706] dark:bg-amber-950/50 dark:text-amber-400">
              <Mail className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fef2f2] dark:bg-rose-950/40 px-2 py-0.5 text-[11px] font-bold text-[#dc2626] dark:text-rose-400 border border-[#fecaca] dark:border-rose-800/60">
              <TrendingUp className="h-3 w-3" />
              {stats.emailTrend}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Email Sent
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {isLoading && totalCount === 0 ? (
                <span className="inline-block w-12 h-7 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              ) : (
                stats.emailSent
              )}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Successfully delivered
            </p>
          </div>
        </div>

        {/* Failed Notifications Card */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef2f2] text-[#dc2626] dark:bg-rose-950/50 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fef2f2] dark:bg-rose-950/40 px-2 py-0.5 text-[11px] font-bold text-[#dc2626] dark:text-rose-400 border border-[#fecaca] dark:border-rose-800/60">
              <TrendingDown className="h-3 w-3" />
              {stats.failedTrend}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Failed Notifications
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {isLoading && totalCount === 0 ? (
                <span className="inline-block w-12 h-7 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              ) : (
                stats.failed
              )}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Delivery failed
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Bar (Matching Screenshot) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by client name, document number or message..."
              className="w-full rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* All Channels Dropdown */}
            <div className="relative">
              <select
                value={selectedChannel}
                onChange={(e) => {
                  setSelectedChannel(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Channels</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* All Status Dropdown */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="Sent">Sent</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Delivered">Delivered</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* All Document Types Dropdown */}
            <div className="relative">
              <select
                value={selectedDocType}
                onChange={(e) => {
                  setSelectedDocType(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Document Types</option>
                <option value="Trade License">Trade License</option>
                <option value="Employment Visa">Employment Visa</option>
                <option value="Residence Visa">Residence Visa</option>
                <option value="Establishment Card">Establishment Card</option>
                <option value="Activity Permit">Activity Permit</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* All Dates Dropdown */}
            <div className="relative">
              <div className="flex items-center">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={selectedDateRange}
                  onChange={(e) => {
                    setSelectedDateRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] pl-8 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Dates</option>
                  <option value="TODAY">Today</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#161822] hover:bg-slate-100 dark:hover:bg-[#1e2330] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="h-3 w-3 text-slate-400" />
              <span>Reset</span>
            </button>

            {/* Live Refresh Button */}
            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#161822] hover:bg-slate-100 dark:hover:bg-[#1e2330] text-slate-600 dark:text-slate-300 transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh notifications from database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Content: Table + Docked Notification Details Panel */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Table Section */}
        <div
          className={`transition-all duration-300 ${
            detailsPanelOpen ? "w-full lg:w-[68%] xl:w-[70%]" : "w-full"
          }`}
        >
          <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-[#1e2330] bg-slate-50/75 dark:bg-[#161822] text-slate-500 dark:text-slate-400 font-semibold select-none">
                    <th className="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer h-3.5 w-3.5"
                      />
                    </th>
                    <th className="py-3 px-2 w-8 text-center">#</th>
                    <th className="py-3 px-3">Client Name</th>
                    <th className="py-3 px-3">Document Type</th>
                    <th className="py-3 px-3">Document No.</th>
                    <th className="py-3 px-3">Notification Type</th>
                    <th className="py-3 px-3 text-center">Channel</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#181a24]">
                  {isLoading && notifications.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-7 w-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Loading dynamic notifications...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : notifications.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            No notifications match your filters
                          </p>
                          <p className="text-xs text-slate-400">
                            Try searching with different keywords or resetting filters.
                          </p>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
                          >
                            Reset Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    notifications.map((item) => {
                      const isSelected = selectedRowIds.includes(item.id);
                      const isActiveInDrawer = selectedNotificationId === item.id;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleRowClick(item)}
                          className={`cursor-pointer transition-colors duration-150 select-none ${
                            isActiveInDrawer
                              ? "bg-[#edf5ff] dark:bg-blue-950/25"
                              : isSelected
                              ? "bg-slate-50/80 dark:bg-slate-800/30"
                              : "hover:bg-slate-50/70 dark:hover:bg-[#151824]"
                          }`}
                        >
                          {/* Checkbox */}
                          <td
                            className="py-3 px-3.5 text-center"
                            onClick={(e) => toggleSelectRow(item.id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer h-3.5 w-3.5"
                            />
                          </td>

                          {/* Item Number */}
                          <td className="py-3 px-2 text-center text-slate-400 font-medium text-[11px]">
                            {item.itemNumber}
                          </td>

                          {/* Client Name with Avatar Circle */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs shrink-0 shadow-2xs ${item.avatarColor.bg} ${item.avatarColor.text}`}
                              >
                                {item.clientInitials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white truncate leading-tight">
                                  {item.clientName}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {item.clientCompany}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Document Type Badge */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${getDocTypeBadge(
                                item.documentType
                              )}`}
                            >
                              {item.documentType}
                            </span>
                          </td>

                          {/* Document Number */}
                          <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap font-mono text-[11px]">
                            {item.documentNumber}
                          </td>

                          {/* Notification Type */}
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                            {item.notificationType}
                          </td>

                          {/* Channel Icon */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {item.channel === "WhatsApp" ? (
                              <div
                                className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                title="WhatsApp"
                              >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                              </div>
                            ) : (
                              <div
                                className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                                title="Email"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </td>

                          {/* Date & Time */}
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap text-[11px]">
                            {item.dateTime}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Showing X to Y of Z + Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-200/80 dark:border-[#1e2330] bg-white dark:bg-[#11131a] text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to{" "}
                {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} notifications
              </span>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {/* Page numbers (up to 5 and last page) */}
                {[1, 2, 3, 4, 5].map((pageNum) => {
                  if (pageNum > totalPages) return null;
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 6 && (
                  <>
                    <span className="px-1 text-slate-400 font-bold">...</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        currentPage === totalPages
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Show per page dropdown */}
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span>Show</span>
                <div className="relative">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-2 pr-6 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                </div>
                <span>per page</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Docked Panel: Notification Details (Matches Screenshot exactly) */}
        {detailsPanelOpen && activeNotification && (
          <div className="w-full lg:w-[32%] xl:w-[30%] shrink-0 rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] shadow-xs p-4 sm:p-5 transition-all animate-in slide-in-from-right-3 duration-200">
            {/* Header with Title and Close X */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#181a24]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Notification Details
              </h3>
              <button
                type="button"
                onClick={() => setDetailsPanelOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Client Card */}
            <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-[#161822] border border-slate-100 dark:border-[#1e2330]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shrink-0 shadow-2xs ${activeNotification.avatarColor.bg} ${activeNotification.avatarColor.text}`}
                >
                  {activeNotification.clientInitials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {activeNotification.clientName}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {activeNotification.clientCompany}
                  </span>
                </div>
              </div>

              {/* Status Pill with checkmark */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${getStatusBadge(
                  activeNotification.status
                )}`}
              >
                {activeNotification.status === "Sent" ||
                activeNotification.status === "Delivered" ? (
                  <Check className="h-3 w-3" />
                ) : null}
                {activeNotification.status}
              </span>
            </div>

            {/* Metadata Rows */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100/80 dark:border-[#181a24]">
                <span className="text-slate-500 dark:text-slate-400">Document Type</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {activeNotification.documentType}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/80 dark:border-[#181a24]">
                <span className="text-slate-500 dark:text-slate-400">Document No.</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {activeNotification.documentNumber}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/80 dark:border-[#181a24]">
                <span className="text-slate-500 dark:text-slate-400">Notification Type</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {activeNotification.notificationType}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/80 dark:border-[#181a24]">
                <span className="text-slate-500 dark:text-slate-400">Channel</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                  {activeNotification.channel === "WhatsApp" ? (
                    <>
                      <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      <span>Email</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                  {activeNotification.dateTime}
                </span>
              </div>
            </div>

            {/* Message Content Section */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {activeNotification.channel === "WhatsApp" ? (
                    <WhatsAppIcon className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Mail className="h-4 w-4 text-blue-600" />
                  )}
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Message Content
                  </h4>
                </div>

                {/* Resend / Retry button for failed or pending notifications */}
                {(activeNotification.status === "Failed" || activeNotification.status === "Pending") && (
                  <button
                    type="button"
                    onClick={() => handleResendNotification(activeNotification.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition-colors shadow-2xs"
                  >
                    <Send className="h-2.5 w-2.5" />
                    <span>Retry Dispatch</span>
                  </button>
                )}
              </div>

              {/* Message Bubble Card */}
              <div className="rounded-2xl p-4 bg-[#eef9f2] dark:bg-emerald-950/20 border border-[#c3eed1] dark:border-emerald-800/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line shadow-2xs font-sans">
                {activeNotification.message}
              </div>
            </div>

            {/* Delivery Status Vertical Timeline */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#181a24]">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
                Delivery Status
              </h4>

              <div className="space-y-4 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-emerald-500 dark:before:bg-emerald-600">
                {activeNotification.deliveryTimeline.map((step, idx) => {
                  const isSuccess = step.status === "completed";
                  const isFailed = step.status === "failed";

                  return (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white ${
                          isSuccess
                            ? "bg-emerald-500"
                            : isFailed
                            ? "bg-rose-500"
                            : "bg-amber-500 animate-pulse"
                        }`}
                      >
                        {isSuccess ? (
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        ) : isFailed ? (
                          <X className="h-2.5 w-2.5 stroke-[3]" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {step.title}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {step.timestamp}
                        </span>
                        {step.details && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 leading-normal">
                            {step.details}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
