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
  Trash2,
  FileText,
  CheckSquare,
  LifeBuoy,
  ExternalLink,
  Layers,
  Globe,
  Building2,
  Filter,
  CheckCheck,
  Shield,
  Eye,
  Info,
} from "lucide-react";
import {
  NotificationItem,
  NotificationStats,
  fetchNotificationsFromApi,
  updateNotificationStatusApi,
  resendNotificationApi,
  clearAllNotificationsApi,
  deleteNotificationApi,
  clearAllDocumentExpiryNotificationsApi,
  deleteDocumentExpiryNotificationApi,
} from "@/services/notification.service";
import {
  fetchSystemNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllSystemNotifications,
  deleteSystemNotification,
  SystemNotificationItem,
} from "@/services/token.service";

export interface DocumentExpiryNotification {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  assignedPerson: string;
  companyName: string;
  documentUrl?: string;
  expiryDate: string;
  daysRemaining: number;
  stage: string;
  urgency: "critical" | "warning" | "notice" | "expired";
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export type NotificationCategoryTab = "ALL" | "DOCS" | "TASKS" | "SUPPORT" | "CLIENT_DISPATCHES";

interface OrgNotificationsViewProps {
  orgName?: string;
  orgSubdomain?: string;
  userRole?: string;
  userId?: string;
  onNavigateTab?: (tab: string) => void;
}

export function OrgNotificationsView({
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
  userRole = "SUPER_ADMIN",
  userId,
  onNavigateTab,
}: OrgNotificationsViewProps) {
  // 1. Active Category Tab State
  const [activeCategory, setActiveCategory] = useState<NotificationCategoryTab>("DOCS");

  // 2. Client Dispatches Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDocType, setSelectedDocType] = useState("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 3. Category Specific Sub-filters
  const [docFilter, setDocFilter] = useState<"ALL" | "1DAY" | "3DAYS" | "7DAYS" | "EXPIRED">("ALL");
  const [taskFilter, setTaskFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [supportFilter, setSupportFilter] = useState<"ALL" | "UNREAD" | "DOMAIN" | "TOKEN">("ALL");

  // 4. Data States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Client notifications
  const [clientNotifications, setClientNotifications] = useState<NotificationItem[]>([]);
  const [clientTotalCount, setClientTotalCount] = useState<number>(0);
  const [clientTotalPages, setClientTotalPages] = useState<number>(1);
  const [clientStats, setClientStats] = useState<NotificationStats>({
    total: 0,
    totalTrend: "0%",
    whatsappSent: 0,
    whatsappTrend: "0%",
    emailSent: 0,
    emailTrend: "0%",
    failed: 0,
    failedTrend: "0%",
  });

  // Document Expiry notifications
  const [docNotifications, setDocNotifications] = useState<DocumentExpiryNotification[]>([]);
  const [docSummary, setDocSummary] = useState({
    total: 0,
    expiringIn1Day: 0,
    expiringIn3Days: 0,
    expiringIn7Days: 0,
    expired: 0,
  });

  // System notifications (Tasks + Support)
  const [systemNotifications, setSystemNotifications] = useState<SystemNotificationItem[]>([]);

  // 5. User action notices & modal confirmation
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [clearConfirmModal, setClearConfirmModal] = useState<{
    open: boolean;
    target: "DOCS" | "TASKS" | "SUPPORT" | "CLIENT_DISPATCHES" | "SELECTED";
  }>({
    open: false,
    target: "DOCS",
  });
  const [isClearing, setIsClearing] = useState(false);

  // Single-item delete confirmation dialog state
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    open: boolean;
    id: string;
    type: "DOC" | "TASK" | "SUPPORT" | "CLIENT";
    title?: string;
    subtitle?: string;
  } | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // 6. Selected Row & Details Panel
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [selectedNotificationType, setSelectedNotificationType] = useState<
    "CLIENT" | "DOC" | "TASK" | "SUPPORT" | null
  >(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);

  // Helper partition for Task vs Support Notifications
  const isTaskNotif = (n: SystemNotificationItem) => {
    const type = (n.type || "").toUpperCase();
    const title = (n.title || "").toLowerCase();
    const msg = (n.message || "").toLowerCase();
    return (
      type === "TASK" ||
      type === "WORK_ORDER" ||
      type === "STAFF_STATUS" ||
      title.includes("task") ||
      title.includes("work order") ||
      title.includes("work assigned") ||
      title.includes("scheduled") ||
      msg.includes("task") ||
      msg.includes("work order") ||
      msg.includes("assigned to")
    );
  };

  const isSupportNotif = (n: SystemNotificationItem) => {
    const type = (n.type || "").toUpperCase();
    const title = (n.title || "").toLowerCase();
    return (
      type === "TOKEN" ||
      type === "DOMAIN" ||
      type === "DOMAIN_APPROVAL" ||
      type === "SUPPORT" ||
      type === "SUPPORT_TICKET" ||
      title.includes("token #") ||
      title.includes("domain") ||
      title.includes("support")
    );
  };

  const taskNotifications = useMemo(() => {
    return systemNotifications.filter((n) => isTaskNotif(n) || !isSupportNotif(n));
  }, [systemNotifications]);

  const supportNotifications = useMemo(() => {
    return systemNotifications.filter((n) => isSupportNotif(n));
  }, [systemNotifications]);

  const unreadTaskCount = useMemo(() => {
    return taskNotifications.filter((n) => !n.isRead).length;
  }, [taskNotifications]);

  const unreadSupportCount = useMemo(() => {
    return supportNotifications.filter((n) => !n.isRead).length;
  }, [supportNotifications]);

  // Load Document Expiry Notifications
  const loadDocNotifications = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/documents/notifications?organisationId=${encodeURIComponent(orgSubdomain || "ibh")}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDocNotifications(json.data.notifications || []);
          setDocSummary(
            json.data.summary || {
              total: 0,
              expiringIn1Day: 0,
              expiringIn3Days: 0,
              expiringIn7Days: 0,
              expired: 0,
            }
          );
        }
      }
    } catch (err) {
      console.warn("Failed to load document expiry notifications:", err);
    }
  }, [orgSubdomain]);

  // Load System Notifications (Tasks + Support)
  const loadSysNotifications = useCallback(async () => {
    try {
      const data = await fetchSystemNotifications(userRole || "SUPER_ADMIN", orgSubdomain, userId);
      setSystemNotifications(data.notifications || []);
    } catch (err) {
      console.warn("Failed to load system notifications:", err);
    }
  }, [userRole, orgSubdomain, userId]);

  // Load Client Dispatches
  const loadClientNotifications = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setIsRefreshing(true);
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

        setClientNotifications(data.notifications || []);
        setClientTotalCount(data.total || 0);
        setClientTotalPages(data.totalPages || 1);
        setClientStats(data.stats);
      } catch (err) {
        console.error("Failed to load client notifications:", err);
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
    ]
  );

  // Unified Refresh Function
  const refreshAll = useCallback(
    async (showIndicator = true) => {
      if (showIndicator) setIsRefreshing(true);
      await Promise.all([loadClientNotifications(false), loadDocNotifications(), loadSysNotifications()]);
      setIsRefreshing(false);
    },
    [loadClientNotifications, loadDocNotifications, loadSysNotifications]
  );

  useEffect(() => {
    refreshAll(false);
  }, [refreshAll]);

  // Filtered Docs
  const filteredDocs = useMemo(() => {
    let result = docNotifications;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.documentName.toLowerCase().includes(q) ||
          d.documentType.toLowerCase().includes(q) ||
          d.assignedPerson.toLowerCase().includes(q) ||
          d.companyName.toLowerCase().includes(q)
      );
    }
    if (docFilter === "1DAY") result = result.filter((d) => d.stage === "ONE_DAY" || d.urgency === "critical");
    else if (docFilter === "3DAYS") result = result.filter((d) => d.stage === "THREE_DAYS" || d.urgency === "warning");
    else if (docFilter === "7DAYS") result = result.filter((d) => d.stage === "SEVEN_DAYS" || d.urgency === "notice");
    else if (docFilter === "EXPIRED") result = result.filter((d) => d.stage === "EXPIRED_TODAY" || d.daysRemaining < 0);
    return result;
  }, [docNotifications, searchQuery, docFilter]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    let result = taskNotifications;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.message.toLowerCase().includes(q) ||
          (t.type && t.type.toLowerCase().includes(q))
      );
    }
    if (taskFilter === "UNREAD") result = result.filter((t) => !t.isRead);
    else if (taskFilter === "READ") result = result.filter((t) => t.isRead);
    return result;
  }, [taskNotifications, searchQuery, taskFilter]);

  // Filtered Support
  const filteredSupport = useMemo(() => {
    let result = supportNotifications;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.message.toLowerCase().includes(q) ||
          (s.type && s.type.toLowerCase().includes(q))
      );
    }
    if (supportFilter === "UNREAD") result = result.filter((s) => !s.isRead);
    else if (supportFilter === "DOMAIN")
      result = result.filter((s) => s.title.toLowerCase().includes("domain") || s.type === "DOMAIN");
    else if (supportFilter === "TOKEN")
      result = result.filter((s) => s.title.toLowerCase().includes("token") || s.type === "TOKEN");
    return result;
  }, [supportNotifications, searchQuery, supportFilter]);

  // Unified "ALL" Feed
  const unifiedAllFeed = useMemo(() => {
    const list: Array<{
      id: string;
      category: "DOCS" | "TASKS" | "SUPPORT" | "CLIENT";
      title: string;
      subtitle: string;
      date: string;
      status: string;
      urgency?: string;
      raw: any;
    }> = [];

    docNotifications.forEach((d) => {
      list.push({
        id: `doc-${d.id}`,
        category: "DOCS",
        title: d.documentName,
        subtitle: `${d.documentType.replace(/_/g, " ")} • ${d.companyName} (${d.daysRemaining < 0 ? "Expired" : `Expires in ${d.daysRemaining}d`})`,
        date: d.createdAt,
        status: d.daysRemaining < 0 ? "Expired" : "Active Alert",
        urgency: d.urgency,
        raw: d,
      });
    });

    taskNotifications.forEach((t) => {
      list.push({
        id: `task-${t.id}`,
        category: "TASKS",
        title: t.title,
        subtitle: t.message,
        date: String(t.createdAt),
        status: t.isRead ? "Read" : "Unread",
        raw: t,
      });
    });

    supportNotifications.forEach((s) => {
      list.push({
        id: `supp-${s.id}`,
        category: "SUPPORT",
        title: s.title,
        subtitle: s.message,
        date: String(s.createdAt),
        status: s.isRead ? "Read" : "Unread",
        raw: s,
      });
    });

    clientNotifications.forEach((c) => {
      list.push({
        id: `cli-${c.id}`,
        category: "CLIENT",
        title: `${c.clientName} (${c.documentType})`,
        subtitle: c.message,
        date: c.dateIso || c.dateTime,
        status: c.status,
        raw: c,
      });
    });

    let result = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [docNotifications, taskNotifications, supportNotifications, clientNotifications, searchQuery]);

  // Selected item across all types for details drawer
  const activeDetails = useMemo(() => {
    if (selectedNotificationType === "DOC") {
      return docNotifications.find((d) => d.id === selectedNotificationId) || docNotifications[0] || null;
    }
    if (selectedNotificationType === "TASK") {
      return taskNotifications.find((t) => t.id === selectedNotificationId) || taskNotifications[0] || null;
    }
    if (selectedNotificationType === "SUPPORT") {
      return supportNotifications.find((s) => s.id === selectedNotificationId) || supportNotifications[0] || null;
    }
    // Default to client
    return clientNotifications.find((c) => c.id === selectedNotificationId) || clientNotifications[0] || null;
  }, [
    selectedNotificationType,
    selectedNotificationId,
    docNotifications,
    taskNotifications,
    supportNotifications,
    clientNotifications,
  ]);

  // Total count for current active view
  const currentCategoryCount = useMemo(() => {
    if (activeCategory === "DOCS") return docNotifications.length;
    if (activeCategory === "TASKS") return taskNotifications.length;
    if (activeCategory === "SUPPORT") return supportNotifications.length;
    if (activeCategory === "CLIENT_DISPATCHES") return clientTotalCount;
    return unifiedAllFeed.length;
  }, [activeCategory, docNotifications, taskNotifications, supportNotifications, clientTotalCount, unifiedAllFeed]);

  // Selection Checkboxes
  const isAllSelected = useMemo(() => {
    if (currentCategoryCount === 0) return false;
    if (activeCategory === "DOCS") {
      return filteredDocs.length > 0 && filteredDocs.every((d) => selectedRowIds.includes(d.id));
    }
    if (activeCategory === "TASKS") {
      return filteredTasks.length > 0 && filteredTasks.every((t) => selectedRowIds.includes(t.id));
    }
    if (activeCategory === "SUPPORT") {
      return filteredSupport.length > 0 && filteredSupport.every((s) => selectedRowIds.includes(s.id));
    }
    if (activeCategory === "CLIENT_DISPATCHES") {
      return clientNotifications.length > 0 && clientNotifications.every((c) => selectedRowIds.includes(c.id));
    }
    return unifiedAllFeed.length > 0 && unifiedAllFeed.every((u) => selectedRowIds.includes(u.id));
  }, [
    currentCategoryCount,
    activeCategory,
    filteredDocs,
    filteredTasks,
    filteredSupport,
    clientNotifications,
    unifiedAllFeed,
    selectedRowIds,
  ]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds([]);
    } else {
      if (activeCategory === "DOCS") setSelectedRowIds(filteredDocs.map((d) => d.id));
      else if (activeCategory === "TASKS") setSelectedRowIds(filteredTasks.map((t) => t.id));
      else if (activeCategory === "SUPPORT") setSelectedRowIds(filteredSupport.map((s) => s.id));
      else if (activeCategory === "CLIENT_DISPATCHES") setSelectedRowIds(clientNotifications.map((c) => c.id));
      else setSelectedRowIds(unifiedAllFeed.map((u) => u.id));
    }
  };

  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRowIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Execute Clearing Logic (Section by section)
  const handleExecuteClear = async () => {
    setIsClearing(true);
    const target = clearConfirmModal.target;
    try {
      if (target === "DOCS") {
        await clearAllDocumentExpiryNotificationsApi(orgSubdomain);
        setDocNotifications([]);
        setDocSummary({ total: 0, expiringIn1Day: 0, expiringIn3Days: 0, expiringIn7Days: 0, expired: 0 });
        setActionNotice("Document expiry notifications cleared successfully!");
      } else if (target === "TASKS") {
        for (const task of taskNotifications) {
          await deleteSystemNotification(task.id);
        }
        setSystemNotifications((prev) => prev.filter((n) => isSupportNotif(n)));
        setActionNotice("Task alerts cleared successfully!");
      } else if (target === "SUPPORT") {
        for (const supp of supportNotifications) {
          await deleteSystemNotification(supp.id);
        }
        setSystemNotifications((prev) => prev.filter((n) => isTaskNotif(n)));
        setActionNotice("Support Center alerts cleared successfully!");
      } else if (target === "CLIENT_DISPATCHES") {
        await clearAllNotificationsApi(orgSubdomain);
        setClientNotifications([]);
        setClientTotalCount(0);
        setActionNotice("Client dispatch notifications cleared successfully!");
      } else if (target === "SELECTED") {
        // Delete selected items
        for (const id of selectedRowIds) {
          if (id.startsWith("sys-") || activeCategory === "DOCS") {
            await deleteDocumentExpiryNotificationApi(id, orgSubdomain);
          } else if (activeCategory === "TASKS" || activeCategory === "SUPPORT") {
            await deleteSystemNotification(id);
          } else {
            await deleteNotificationApi(id, orgSubdomain);
          }
        }
        setSelectedRowIds([]);
        await refreshAll(false);
        setActionNotice("Selected notifications cleared successfully!");
      }

      // Dispatch real-time global event so OrgTopHeader bell icon updates instantly
      window.dispatchEvent(new CustomEvent("org-notifications-cleared"));
    } catch (err) {
      console.error("Error clearing notifications:", err);
      setActionNotice("Failed to clear notifications. Please try again.");
    } finally {
      setIsClearing(false);
      setClearConfirmModal({ open: false, target: "DOCS" });
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  // Request single notification delete (opens confirmation dialog)
  const handleRequestDeleteSingle = (
    id: string,
    type: "DOC" | "TASK" | "SUPPORT" | "CLIENT",
    title?: string,
    subtitle?: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setDeleteConfirmItem({
      open: true,
      id,
      type,
      title: title || "Notification",
      subtitle,
    });
  };

  // Confirm and execute single notification delete
  const handleConfirmDeleteSingle = async () => {
    if (!deleteConfirmItem) return;
    const { id, type, title } = deleteConfirmItem;
    setIsDeletingSingle(true);
    try {
      if (type === "DOC") {
        await deleteDocumentExpiryNotificationApi(id, orgSubdomain);
        setDocNotifications((prev) => prev.filter((d) => d.id !== id));
        setDocSummary((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
      } else if (type === "TASK" || type === "SUPPORT") {
        await deleteSystemNotification(id);
        setSystemNotifications((prev) => prev.filter((s) => s.id !== id));
      } else {
        await deleteNotificationApi(id, orgSubdomain);
        setClientNotifications((prev) => prev.filter((c) => c.id !== id));
        setClientTotalCount((prev) => Math.max(0, prev - 1));
      }
      setSelectedRowIds((prev) => prev.filter((i) => i !== id));
      if (selectedNotificationId === id) setSelectedNotificationId(null);
      window.dispatchEvent(new CustomEvent("org-notifications-cleared"));
      setActionNotice(`Notification deleted successfully.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.warn("Could not delete notification:", err);
      setActionNotice("Failed to delete notification.");
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsDeletingSingle(false);
      setDeleteConfirmItem(null);
    }
  };

  // Backwards compatible alias if any callers use handleDeleteSingle
  const handleDeleteSingle = (
    id: string,
    type: "DOC" | "TASK" | "SUPPORT" | "CLIENT",
    e: React.MouseEvent
  ) => {
    handleRequestDeleteSingle(id, type, undefined, undefined, e);
  };

  // Mark task/support read
  const handleMarkItemRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
    setSystemNotifications((prev) => prev.map((s) => (s.id === id ? { ...s, isRead: true } : s)));
    window.dispatchEvent(new CustomEvent("org-notifications-cleared"));
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedChannel("ALL");
    setSelectedStatus("ALL");
    setSelectedDocType("ALL");
    setSelectedDateRange("ALL");
    setDocFilter("ALL");
    setTaskFilter("ALL");
    setSupportFilter("ALL");
    setCurrentPage(1);
  };

  // Helper for Document Type Badge color
  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case "Trade License":
      case "TRADE_LICENSE":
        return "bg-[#e8f1fd] text-[#1d5ec9] border border-[#d2e3fc] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60";
      case "Employment Visa":
      case "VISA":
        return "bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff] dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60";
      case "Residence Visa":
        return "bg-[#fce7f3] text-[#be185d] border border-[#fbcfe8] dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60";
      case "Establishment Card":
      case "LABOUR_ESTABLISHMENT_CARD":
        return "bg-[#e0f7f1] text-[#0d9488] border border-[#ccfbf1] dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60";
      case "Activity Permit":
      case "COMMERCIAL_PERMIT":
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
      case "DELIVERED":
        return "bg-[#ebf8ee] text-[#16a34a] border border-[#bbf7d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
      case "Failed":
      case "FAILED":
        return "bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
      case "Pending":
      case "PENDING":
      default:
        return "bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header with Title, Live Indicator & Master Clear All Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#111827] dark:text-white tracking-tight leading-tight">
              Notifications
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Database Connected
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            Super Admin notification control center: Manage Document Expiry alerts, Task assignments, Support
            tokens, and Client reminders.
          </p>
        </div>

        {/* Top Action & Refresh Button Group */}
        <div className="flex items-center gap-2">
          {actionNotice && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Live Refresh Button */}
          <button
            type="button"
            onClick={() => refreshAll(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#161822] hover:bg-slate-100 dark:hover:bg-[#1e2330] text-slate-600 dark:text-slate-300 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh all notification feeds from database"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Primary Category Segmented Control (DOCS, TASKS, SUPPORT, CLIENT DISPATCHES, ALL) */}
      <div className="p-1.5 bg-slate-100/90 dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#222636] flex flex-wrap items-center gap-1">
        {/* Docs Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory("DOCS");
            setSelectedRowIds([]);
          }}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold ${
            activeCategory === "DOCS"
              ? "bg-white dark:bg-[#1e2230] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700/60"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
          }`}
        >
          <FileText className="h-4 w-4 text-orange-500 shrink-0" />
          <span>Docs</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              docSummary.expiringIn1Day > 0
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {docNotifications.length}
          </span>
        </button>

        {/* Tasks Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory("TASKS");
            setSelectedRowIds([]);
          }}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold ${
            activeCategory === "TASKS"
              ? "bg-white dark:bg-[#1e2230] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700/60"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
          }`}
        >
          <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" />
          <span>Tasks</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              unreadTaskCount > 0
                ? "bg-blue-600 text-white font-bold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {unreadTaskCount > 0 ? `${unreadTaskCount} new` : taskNotifications.length}
          </span>
        </button>

        {/* Support Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory("SUPPORT");
            setSelectedRowIds([]);
          }}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold ${
            activeCategory === "SUPPORT"
              ? "bg-white dark:bg-[#1e2230] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700/60"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
          }`}
        >
          <LifeBuoy className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Support</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              unreadSupportCount > 0
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {unreadSupportCount > 0 ? `${unreadSupportCount} new` : supportNotifications.length}
          </span>
        </button>

        {/* Client Dispatches Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory("CLIENT_DISPATCHES");
            setSelectedRowIds([]);
          }}
          className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold ${
            activeCategory === "CLIENT_DISPATCHES"
              ? "bg-white dark:bg-[#1e2230] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700/60"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
          }`}
        >
          <Send className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Client Dispatches</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {clientTotalCount}
          </span>
        </button>

        {/* All Combined Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory("ALL");
            setSelectedRowIds([]);
          }}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold ${
            activeCategory === "ALL"
              ? "bg-white dark:bg-[#1e2230] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700/60"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
          }`}
        >
          <Layers className="h-4 w-4 text-purple-500 shrink-0" />
          <span>All Feeds</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {docNotifications.length + taskNotifications.length + supportNotifications.length + clientTotalCount}
          </span>
        </button>
      </div>

      {/* 3. Dynamic Summary KPI Cards based on current category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {activeCategory === "DOCS" ? (
          <>
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-400">Total</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expiring Documents</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {docNotifications.length}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Tracked within 7-day compliance window</p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                  Urgent
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">1-Day / Critical</span>
                <h3 className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-300 tracking-tight mt-0.5">
                  {docSummary.expiringIn1Day}
                </h3>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">Requires immediate renewal</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">3 Days</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">Expiring in 3 Days</span>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300 tracking-tight mt-0.5">
                  {docSummary.expiringIn3Days}
                </h3>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Advance preparation stage</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-400">7 Days</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">7-Day Notice</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {docSummary.expiringIn7Days}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Notice period for client alert</p>
              </div>
            </div>
          </>
        ) : activeCategory === "TASKS" ? (
          <>
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-400">Total</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned Tasks</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {taskNotifications.length}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Scheduled team tasks & updates</p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">New</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Unread Task Alerts</span>
                <h3 className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-300 tracking-tight mt-0.5">
                  {unreadTaskCount}
                </h3>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">Pending acknowledgment</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Acknowledged</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Read / Acknowledged</span>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight mt-0.5">
                  {taskNotifications.length - unreadTaskCount}
                </h3>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Processed tasks</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-400">Live</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sync Frequency</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  4 sec
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Continuous real-time dispatch</p>
              </div>
            </div>
          </>
        ) : activeCategory === "SUPPORT" ? (
          <>
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-400">Total</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Support Center Alerts</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {supportNotifications.length}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Domain requests & tickets</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">New</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">Unread Tickets</span>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300 tracking-tight mt-0.5">
                  {unreadSupportCount}
                </h3>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Platform Owner replies</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Domains</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Domain Approvals</span>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight mt-0.5">
                  {supportNotifications.filter((s) => s.title.toLowerCase().includes("domain")).length}
                </h3>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Approved or updated</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-400">Workspace</span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tenant Workspace</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                  {orgSubdomain}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Linked organization profile</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Standard Overview KPIs */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef5ff] text-[#2563eb] dark:bg-blue-950/50 dark:text-blue-400">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-[#059669] dark:text-emerald-400 border border-[#a7f3d0] dark:border-emerald-800/60">
                  <TrendingUp className="h-3 w-3" />
                  {clientStats.totalTrend}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Client Alerts</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {clientTotalCount}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">WhatsApp and Email reminders</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#16a34a] dark:bg-emerald-950/50 dark:text-emerald-400">
                  <WhatsAppIcon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-[#059669] dark:text-emerald-400 border border-[#a7f3d0] dark:border-emerald-800/60">
                  <TrendingUp className="h-3 w-3" />
                  {clientStats.whatsappTrend}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">WhatsApp Sent</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {clientStats.whatsappSent}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Successfully delivered</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fffbeb] text-[#d97706] dark:bg-amber-950/50 dark:text-amber-400">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fef2f2] dark:bg-rose-950/40 px-2 py-0.5 text-[11px] font-bold text-[#dc2626] dark:text-rose-400 border border-[#fecaca] dark:border-rose-800/60">
                  <TrendingUp className="h-3 w-3" />
                  {clientStats.emailTrend}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email Sent</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {clientStats.emailSent}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Successfully delivered</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef2f2] text-[#dc2626] dark:bg-rose-950/50 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fef2f2] dark:bg-rose-950/40 px-2 py-0.5 text-[11px] font-bold text-[#dc2626] dark:text-rose-400 border border-[#fecaca] dark:border-rose-800/60">
                  <TrendingDown className="h-3 w-3" />
                  {clientStats.failedTrend}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Failed Dispatches</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {clientStats.failed}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Delivery failed</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Category-Specific Filters Bar */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeCategory === "DOCS"
                  ? "Search by document name, client, document type..."
                  : activeCategory === "TASKS"
                  ? "Search by task title, client, assigned staff..."
                  : activeCategory === "SUPPORT"
                  ? "Search by ticket number, domain, subject..."
                  : "Search client name, document number, or message..."
              }
              className="w-full rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sub-Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {activeCategory === "DOCS" ? (
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setDocFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    docFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  All ({docNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDocFilter("1DAY")}
                  className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                    docFilter === "1DAY"
                      ? "bg-rose-600 text-white font-bold shadow-2xs"
                      : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  }`}
                >
                  <span>🚨 1 Day</span>
                  <span className="font-mono">({docSummary.expiringIn1Day})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocFilter("3DAYS")}
                  className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                    docFilter === "3DAYS"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-2xs"
                      : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  }`}
                >
                  <span>⚠️ 3 Days</span>
                  <span className="font-mono">({docSummary.expiringIn3Days})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocFilter("7DAYS")}
                  className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                    docFilter === "7DAYS"
                      ? "bg-orange-600 text-white font-bold shadow-2xs"
                      : "text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                  }`}
                >
                  <span>ℹ️ 7 Days</span>
                  <span className="font-mono">({docSummary.expiringIn7Days})</span>
                </button>
              </div>
            ) : activeCategory === "TASKS" ? (
              <div className="flex items-center gap-1 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setTaskFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    taskFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  All ({taskNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("UNREAD")}
                  className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                    taskFilter === "UNREAD"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  }`}
                >
                  <span>Unread</span>
                  <span className="font-mono">({unreadTaskCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("READ")}
                  className={`px-2.5 py-1.5 rounded-xl transition-all ${
                    taskFilter === "READ"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Acknowledged ({taskNotifications.length - unreadTaskCount})
                </button>
              </div>
            ) : activeCategory === "SUPPORT" ? (
              <div className="flex items-center gap-1 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSupportFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    supportFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  All ({supportNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSupportFilter("UNREAD")}
                  className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                    supportFilter === "UNREAD"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  }`}
                >
                  <span>Unread</span>
                  <span className="font-mono">({unreadSupportCount})</span>
                </button>
              </div>
            ) : (
              <>
                {/* Client Dispatches Dropdowns */}
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">All Channels</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/60 dark:bg-[#161822] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">All Status</option>
                  <option value="Sent">Sent</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>
              </>
            )}

            {/* Clear Selected Action */}
            {selectedRowIds.length > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmModal({ open: true, target: "SELECTED" })}
                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Selected ({selectedRowIds.length})</span>
              </button>
            )}

            {/* Separate Clear Button For Each Section (No global button) */}
            {activeCategory === "DOCS" && docNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmModal({ open: true, target: "DOCS" })}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold text-rose-700 dark:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Clear all document expiry alerts"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Docs</span>
              </button>
            )}

            {activeCategory === "TASKS" && taskNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmModal({ open: true, target: "TASKS" })}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold text-rose-700 dark:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Clear all task alerts"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Tasks</span>
              </button>
            )}

            {activeCategory === "SUPPORT" && supportNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmModal({ open: true, target: "SUPPORT" })}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold text-rose-700 dark:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Clear all support center alerts"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Support</span>
              </button>
            )}

            {activeCategory === "CLIENT_DISPATCHES" && clientTotalCount > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirmModal({ open: true, target: "CLIENT_DISPATCHES" })}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold text-rose-700 dark:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Clear all client dispatches"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Dispatches</span>
              </button>
            )}

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#161822] hover:bg-slate-100 dark:hover:bg-[#1e2330] text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Content Area: Table / List + Docked Notification Details Panel */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Table View */}
        <div className={`transition-all duration-300 ${detailsPanelOpen ? "w-full lg:w-[68%] xl:w-[70%]" : "w-full"}`}>
          <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              {activeCategory === "DOCS" ? (
                /* --- DOCS TABLE --- */
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
                      <th className="py-3 px-3">Document Name</th>
                      <th className="py-3 px-3">Document Type</th>
                      <th className="py-3 px-3">Client / Company</th>
                      <th className="py-3 px-3">Assigned Person</th>
                      <th className="py-3 px-3">Expiry Date</th>
                      <th className="py-3 px-3.5 text-center">Urgency</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#181a24]">
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 dark:text-slate-300">All Documents Compliant</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">No document expiry alerts match current filter.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc) => {
                        const isSelected = selectedRowIds.includes(doc.id);
                        const isExpired = doc.urgency === "expired" || doc.daysRemaining < 0;
                        const isCritical = doc.urgency === "critical" || doc.daysRemaining === 1;
                        const isWarning = doc.urgency === "warning";

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => {
                              setSelectedNotificationId(doc.id);
                              setSelectedNotificationType("DOC");
                              setDetailsPanelOpen(true);
                            }}
                            className={`cursor-pointer transition-colors select-none ${
                              selectedNotificationId === doc.id
                                ? "bg-orange-50/70 dark:bg-orange-950/20"
                                : isSelected
                                ? "bg-slate-50 dark:bg-slate-800/40"
                                : "hover:bg-slate-50/70 dark:hover:bg-[#151824]"
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center" onClick={(e) => toggleSelectRow(doc.id, e)}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-amber-500 cursor-pointer h-3.5 w-3.5"
                              />
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-[180px] truncate">
                              {doc.documentName}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getDocTypeBadge(doc.documentType)}`}>
                                {doc.documentType.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[150px] truncate">
                              {doc.companyName}
                            </td>
                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                              {doc.assignedPerson}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {new Date(doc.expiryDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isExpired
                                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800"
                                    : isCritical
                                    ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300"
                                    : isWarning
                                    ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
                                    : "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300"
                                }`}
                              >
                                {doc.daysRemaining < 0
                                  ? "Expired"
                                  : doc.daysRemaining === 0
                                  ? "Today"
                                  : doc.daysRemaining === 1
                                  ? "1 Day"
                                  : `${doc.daysRemaining} Days`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {doc.documentUrl && (
                                  <a
                                    href={doc.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                    title="Open file from Bunny CDN"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleRequestDeleteSingle(
                                      doc.id,
                                      "DOC",
                                      doc.documentName,
                                      `${doc.companyName} • ${doc.assignedPerson}`,
                                      e
                                    )
                                  }
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete notification"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : activeCategory === "TASKS" ? (
                /* --- TASKS TABLE --- */
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-[#1e2330] bg-slate-50/75 dark:bg-[#161822] text-slate-500 dark:text-slate-400 font-semibold select-none">
                      <th className="py-3 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-700 text-amber-500 cursor-pointer h-3.5 w-3.5"
                        />
                      </th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Task Title</th>
                      <th className="py-3 px-4">Message / Assignment Details</th>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#181a24]">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <CheckSquare className="h-8 w-8 text-blue-500 mx-auto mb-2 opacity-60" />
                          <p className="font-bold text-slate-700 dark:text-slate-300">No Task Notifications</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">All task updates and assignments have been acknowledged.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const isSelected = selectedRowIds.includes(task.id);
                        return (
                          <tr
                            key={task.id}
                            onClick={() => {
                              setSelectedNotificationId(task.id);
                              setSelectedNotificationType("TASK");
                              setDetailsPanelOpen(true);
                            }}
                            className={`cursor-pointer transition-colors select-none ${
                              selectedNotificationId === task.id
                                ? "bg-blue-50/70 dark:bg-blue-950/20"
                                : isSelected
                                ? "bg-slate-50 dark:bg-slate-800/40"
                                : !task.isRead
                                ? "bg-blue-50/30 dark:bg-blue-950/10 font-semibold"
                                : "hover:bg-slate-50/70 dark:hover:bg-[#151824]"
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center" onClick={(e) => toggleSelectRow(task.id, e)}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-amber-500 cursor-pointer h-3.5 w-3.5"
                              />
                            </td>
                            <td className="py-3 px-3">
                              {!task.isRead ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                  New
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  <Check className="h-3 w-3" />
                                  Read
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                              {task.title}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[300px] truncate">
                              {task.message}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {new Date(task.createdAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {!task.isRead && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleMarkItemRead(task.id, e)}
                                    className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                                    title="Mark as read"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleRequestDeleteSingle(
                                      task.id,
                                      "TASK",
                                      task.title,
                                      task.message,
                                      e
                                    )
                                  }
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete task notification"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : activeCategory === "SUPPORT" ? (
                /* --- SUPPORT TABLE --- */
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-[#1e2330] bg-slate-50/75 dark:bg-[#161822] text-slate-500 dark:text-slate-400 font-semibold select-none">
                      <th className="py-3 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-700 text-amber-500 cursor-pointer h-3.5 w-3.5"
                        />
                      </th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Subject / Ticket</th>
                      <th className="py-3 px-4">Message from Platform Owner</th>
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#181a24]">
                    {filteredSupport.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <LifeBuoy className="h-8 w-8 text-amber-500 mx-auto mb-2 opacity-60" />
                          <p className="font-bold text-slate-700 dark:text-slate-300">No Support Alerts</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">When Platform Owner responds to your tickets or domain requests, updates appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredSupport.map((supp) => {
                        const isSelected = selectedRowIds.includes(supp.id);
                        return (
                          <tr
                            key={supp.id}
                            onClick={() => {
                              setSelectedNotificationId(supp.id);
                              setSelectedNotificationType("SUPPORT");
                              setDetailsPanelOpen(true);
                            }}
                            className={`cursor-pointer transition-colors select-none ${
                              selectedNotificationId === supp.id
                                ? "bg-amber-50/70 dark:bg-amber-950/20"
                                : isSelected
                                ? "bg-slate-50 dark:bg-slate-800/40"
                                : !supp.isRead
                                ? "bg-amber-50/30 dark:bg-amber-950/10 font-semibold"
                                : "hover:bg-slate-50/70 dark:hover:bg-[#151824]"
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center" onClick={(e) => toggleSelectRow(supp.id, e)}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-amber-500 cursor-pointer h-3.5 w-3.5"
                              />
                            </td>
                            <td className="py-3 px-3">
                              {!supp.isRead ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                                  New
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Read
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                              {supp.title}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[300px] truncate">
                              {supp.message}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {new Date(supp.createdAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleRequestDeleteSingle(
                                      supp.id,
                                      "SUPPORT",
                                      supp.title,
                                      supp.message,
                                      e
                                    )
                                  }
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete support notification"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : activeCategory === "ALL" ? (
                /* --- ALL COMBINED FEEDS TABLE --- */
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-[#1e2330] bg-slate-50/75 dark:bg-[#161822] text-slate-500 dark:text-slate-400 font-semibold select-none">
                      <th className="py-3 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-700 text-amber-500 cursor-pointer h-3.5 w-3.5"
                        />
                      </th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Title / Subject</th>
                      <th className="py-3 px-4">Summary Description</th>
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#181a24]">
                    {unifiedAllFeed.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Layers className="h-8 w-8 text-purple-500 mx-auto mb-2 opacity-60" />
                          <p className="font-bold text-slate-700 dark:text-slate-300">No Notifications</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">All notifications across all feeds have been cleared.</p>
                        </td>
                      </tr>
                    ) : (
                      unifiedAllFeed.map((item) => {
                        const isSelected = selectedRowIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              setSelectedNotificationId(item.raw.id);
                              setSelectedNotificationType(
                                item.category === "DOCS"
                                  ? "DOC"
                                  : item.category === "TASKS"
                                  ? "TASK"
                                  : item.category === "SUPPORT"
                                  ? "SUPPORT"
                                  : "CLIENT"
                              );
                              setDetailsPanelOpen(true);
                            }}
                            className={`cursor-pointer transition-colors select-none ${
                              selectedNotificationId === item.raw.id
                                ? "bg-purple-50/70 dark:bg-purple-950/20"
                                : isSelected
                                ? "bg-slate-50 dark:bg-slate-800/40"
                                : "hover:bg-slate-50/70 dark:hover:bg-[#151824]"
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center" onClick={(e) => toggleSelectRow(item.id, e)}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-amber-500 cursor-pointer h-3.5 w-3.5"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.category === "DOCS"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                                    : item.category === "TASKS"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    : item.category === "SUPPORT"
                                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                }`}
                              >
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                              {item.title}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[300px] truncate">
                              {item.subtitle}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {new Date(item.date).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleRequestDeleteSingle(
                                      item.raw.id,
                                      item.category === "DOCS"
                                        ? "DOC"
                                        : item.category === "TASKS"
                                        ? "TASK"
                                        : item.category === "SUPPORT"
                                        ? "SUPPORT"
                                        : "CLIENT",
                                      item.title,
                                      item.subtitle,
                                      e
                                    )
                                  }
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete notification"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                /* --- CLIENT DISPATCHES TABLE (Original Preserved) --- */
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-[#1e2330] bg-slate-50/75 dark:bg-[#161822] text-slate-500 dark:text-slate-400 font-semibold select-none">
                      <th className="py-3 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-700 text-amber-500 cursor-pointer h-3.5 w-3.5"
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
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#181a24]">
                    {isLoading && clientNotifications.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-7 w-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Loading client notifications...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : clientNotifications.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                              No notifications match your filters
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      clientNotifications.map((item) => {
                        const isSelected = selectedRowIds.includes(item.id);
                        const isActiveInDrawer = selectedNotificationId === item.id;

                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              setSelectedNotificationId(item.id);
                              setSelectedNotificationType("CLIENT");
                              setDetailsPanelOpen(true);
                              if (!selectedRowIds.includes(item.id)) setSelectedRowIds([item.id]);
                            }}
                            className={`cursor-pointer transition-colors select-none ${
                              isActiveInDrawer
                                ? "bg-[#edf5ff] dark:bg-blue-950/25"
                                : isSelected
                                ? "bg-slate-50/80 dark:bg-slate-800/30"
                                : "hover:bg-slate-50/70 dark:hover:bg-[#151824]"
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center" onClick={(e) => toggleSelectRow(item.id, e)}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300 text-amber-500 cursor-pointer h-3.5 w-3.5"
                              />
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-400">
                              {item.itemNumber}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-[10px] shrink-0 ${item.avatarColor.bg} ${item.avatarColor.text}`}>
                                  {item.clientInitials}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {item.clientName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 truncate">
                                    {item.clientCompany}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getDocTypeBadge(item.documentType)}`}>
                                {item.documentType}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {item.documentNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                              {item.notificationType}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.channel === "WhatsApp" ? (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                                  <WhatsAppIcon className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                  <Mail className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                              {item.dateTime}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(item.status)}`}>
                                {item.status === "Sent" || item.status === "Delivered" ? <Check className="h-2.5 w-2.5" /> : null}
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleRequestDeleteSingle(
                                      item.id,
                                      "CLIENT",
                                      item.clientName,
                                      `${item.documentType} • ${item.documentNumber}`,
                                      e
                                    )
                                  }
                                  className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete notification"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls for Client Dispatches */}
            {activeCategory === "CLIENT_DISPATCHES" && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-[#1e2330] bg-slate-50/40 dark:bg-[#161822] text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Showing {clientNotifications.length} of {clientTotalCount} notifications
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Page {currentPage} of {clientTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(clientTotalPages, p + 1))}
                    disabled={currentPage === clientTotalPages}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Docked Panel: Notification Details (Matches screenshot perfectly) */}
        {detailsPanelOpen && activeDetails && (
          <div className="w-full lg:w-[32%] xl:w-[30%] shrink-0 rounded-2xl border border-slate-200/90 dark:border-[#1e2330] bg-white dark:bg-[#11131a] shadow-xs p-4 sm:p-5 transition-all animate-in slide-in-from-right-3 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#181a24]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Details</h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    if (activeDetails) {
                      const itemTitle =
                        "title" in activeDetails
                          ? (activeDetails as any).title
                          : "documentName" in activeDetails
                          ? (activeDetails as any).documentName
                          : (activeDetails as any).clientName;
                      const itemSub =
                        "message" in activeDetails
                          ? (activeDetails as any).message
                          : "companyName" in activeDetails
                          ? (activeDetails as any).companyName
                          : (activeDetails as any).documentType;
                      handleRequestDeleteSingle(
                        activeDetails.id,
                        selectedNotificationType || "DOC",
                        itemTitle,
                        itemSub,
                        e
                      );
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Delete this notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsPanelOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Context Card */}
            {selectedNotificationType === "DOC" ? (
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Document Expiry Alert
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {(activeDetails as DocumentExpiryNotification).documentName}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {(activeDetails as DocumentExpiryNotification).companyName}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Document Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {(activeDetails as DocumentExpiryNotification).documentType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Assigned Person</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {(activeDetails as DocumentExpiryNotification).assignedPerson}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Expiry Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date((activeDetails as DocumentExpiryNotification).expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Days Remaining</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {(activeDetails as DocumentExpiryNotification).daysRemaining} Days
                    </span>
                  </div>
                </div>

                {/* Bunny CDN URL action */}
                {(activeDetails as DocumentExpiryNotification).documentUrl && (
                  <div className="pt-2">
                    <a
                      href={(activeDetails as DocumentExpiryNotification).documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View File on Bunny CDN</span>
                    </a>
                  </div>
                )}

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab("doc-list")}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Open Document Repository &rarr;
                  </button>
                )}
              </div>
            ) : selectedNotificationType === "TASK" ? (
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Task Assignment Notification
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {(activeDetails as SystemNotificationItem).title}
                  </h4>
                </div>

                <div className="rounded-xl p-3 bg-slate-50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {(activeDetails as SystemNotificationItem).message}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Created At</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {new Date((activeDetails as SystemNotificationItem).createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Status</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {(activeDetails as SystemNotificationItem).isRead ? "Acknowledged" : "Unread"}
                    </span>
                  </div>
                </div>

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab("task-list")}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs mt-2"
                  >
                    <span>Open Task Board &rarr;</span>
                  </button>
                )}
              </div>
            ) : selectedNotificationType === "SUPPORT" ? (
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Support Center &amp; Platform Update
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {(activeDetails as SystemNotificationItem).title}
                  </h4>
                </div>

                <div className="rounded-xl p-3 bg-slate-50 dark:bg-[#161822] border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {(activeDetails as SystemNotificationItem).message}
                </div>

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab("tokens")}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs mt-2"
                  >
                    <span>Open Support Center &rarr;</span>
                  </button>
                )}
              </div>
            ) : (
              /* Client Notification Details */
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-[#161822] border border-slate-100 dark:border-[#1e2330]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shrink-0 shadow-2xs ${(activeDetails as NotificationItem).avatarColor?.bg} ${(activeDetails as NotificationItem).avatarColor?.text}`}>
                      {(activeDetails as NotificationItem).clientInitials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {(activeDetails as NotificationItem).clientName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {(activeDetails as NotificationItem).clientCompany}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${getStatusBadge((activeDetails as NotificationItem).status)}`}>
                    {(activeDetails as NotificationItem).status}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-[#181a24]">
                    <span className="text-slate-500 dark:text-slate-400">Document Type</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {(activeDetails as NotificationItem).documentType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-[#181a24]">
                    <span className="text-slate-500 dark:text-slate-400">Document No.</span>
                    <span className="font-semibold text-slate-900 dark:text-white font-mono">
                      {(activeDetails as NotificationItem).documentNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-[#181a24]">
                    <span className="text-slate-500 dark:text-slate-400">Channel</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {(activeDetails as NotificationItem).channel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                      {(activeDetails as NotificationItem).dateTime}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Message Content</h4>
                  <div className="rounded-2xl p-4 bg-[#eef9f2] dark:bg-emerald-950/20 border border-[#c3eed1] dark:border-emerald-800/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line shadow-2xs font-sans">
                    {(activeDetails as NotificationItem).message}
                  </div>
                </div>

                {/* Delivery Timeline if present */}
                {(activeDetails as NotificationItem).deliveryTimeline && (
                  <div className="pt-3 border-t border-slate-100 dark:border-[#181a24]">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">Delivery Status</h4>
                    <div className="space-y-4 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-emerald-500">
                      {(activeDetails as NotificationItem).deliveryTimeline.map((step, idx) => (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white ${step.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`}>
                            <Check className="h-2.5 w-2.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              {step.title}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {step.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Confirmation Modal for Clear All */}
      {clearConfirmModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {clearConfirmModal.target === "DOCS"
                    ? "Clear All Document Notifications?"
                    : clearConfirmModal.target === "TASKS"
                    ? "Clear All Task Notifications?"
                    : clearConfirmModal.target === "SUPPORT"
                    ? "Clear All Support Alerts?"
                    : clearConfirmModal.target === "CLIENT_DISPATCHES"
                    ? "Clear All Client Dispatches?"
                    : `Clear Selected (${selectedRowIds.length}) Notifications?`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This action only clears this section.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#161822] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {clearConfirmModal.target === "DOCS"
                ? "You are about to clear all document compliance and expiry alerts. Your task assignments and support tickets will remain unchanged."
                : clearConfirmModal.target === "TASKS"
                ? "You are about to clear all assigned task and work order notifications. Your document alerts and support tickets will remain unchanged."
                : clearConfirmModal.target === "SUPPORT"
                ? "You are about to clear all support center notifications and domain updates. Your document and task alerts will remain unchanged."
                : clearConfirmModal.target === "CLIENT_DISPATCHES"
                ? "You are about to clear all client notification dispatch records (WhatsApp & Email). Other sections will not be affected."
                : `You are about to permanently delete the ${selectedRowIds.length} selected notifications.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClearConfirmModal({ open: false, target: "DOCS" })}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                disabled={isClearing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>
                      {clearConfirmModal.target === "DOCS"
                        ? "Yes, Clear Docs"
                        : clearConfirmModal.target === "TASKS"
                        ? "Yes, Clear Tasks"
                        : clearConfirmModal.target === "SUPPORT"
                        ? "Yes, Clear Support"
                        : clearConfirmModal.target === "CLIENT_DISPATCHES"
                        ? "Yes, Clear Dispatches"
                        : "Yes, Clear Selected"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Confirmation Modal for Single Notification Delete */}
      {deleteConfirmItem?.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Notification?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to delete this notification?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#161822] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                {deleteConfirmItem.title}
              </p>
              {deleteConfirmItem.subtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {deleteConfirmItem.subtitle}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This notification will be permanently removed from your dashboard and notifications feed. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                disabled={isDeletingSingle}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeletingSingle ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
