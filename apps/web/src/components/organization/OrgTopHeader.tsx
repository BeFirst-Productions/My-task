"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Calendar,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Settings,
  Shield,
  Building,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  RefreshCw,
  FileText,
  Check,
  CheckSquare,
  MessageSquare,
  Globe,
  LifeBuoy,
  Building2,
  Briefcase,
  Layers,
  CornerDownLeft,
  Command,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  fetchGlobalSearch,
  GlobalSearchResults,
  SearchResultClient,
  SearchResultTask,
  SearchResultDocument,
} from "@/services/search.service";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  fetchSystemNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllSystemNotifications,
  deleteSystemNotification,
  SystemNotificationItem,
} from "@/services/token.service";
import {
  clearAllNotificationsApi,
  clearAllDocumentExpiryNotificationsApi,
} from "@/services/notification.service";

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
  channel: "SYSTEM" | "WHATSAPP" | "EMAIL";
  status: string;
  createdAt: string;
}

interface OrgTopHeaderProps {
  onToggleMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
  orgName?: string;
  orgSubdomain?: string;
  orgId?: string;
  userRole?: string;
  userName?: string;
  activeTab?: string;
  onNavigateTab?: (tab: string, clientId?: string | null) => void;
}

export function OrgTopHeader({
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
  orgId,
  userRole = "Super Admin",
  userName = "Super Admin",
  activeTab = "dashboard",
  onNavigateTab,
}: OrgTopHeaderProps) {
  const { user, logout, isPlatformOwner, setAvailability } = useAuth();
  const isStaffUser = user?.role === "STAFF" || user?.role === "SALES_STAFF";
  const isOnline = user?.isAvailable !== false;

  // Support Center permission check:
  // Visible to Super Admin, Platform Owner, or members explicitly granted by Super Admin
  const canAccessSupport =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "PLATFORM_OWNER" ||
    Boolean(user?.permittedModules && user.permittedModules.includes("tokens"));
  const { theme, toggleTheme } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global Navbar Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"ALL" | "CLIENTS" | "TASKS" | "DOCUMENTS">("ALL");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // System Notifications State (7, 3, 1 days expiry checks)
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<DocumentExpiryNotification[]>([]);
  const [notifSummary, setNotifSummary] = useState({
    total: 0,
    expiringIn1Day: 0,
    expiringIn3Days: 0,
    expiringIn7Days: 0,
    expired: 0,
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [notifFilter, setNotifFilter] = useState<"ALL" | "1DAY" | "3DAYS" | "7DAYS" | "EXPIRED">("ALL");

  // System & Platform Token Notifications State
  const [systemNotifications, setSystemNotifications] = useState<SystemNotificationItem[]>([]);
  const [unreadSystemCount, setUnreadSystemCount] = useState(0);
  const [notifSectionTab, setNotifSectionTab] = useState<"DOCS" | "TASKS" | "SYSTEM">(
    isStaffUser ? "TASKS" : "DOCS"
  );
  const [taskFilter, setTaskFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [latestLiveAlert, setLatestLiveAlert] = useState<SystemNotificationItem | null>(null);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());

  // Segregate task/assignment notifications from support/domain requests
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

  const filteredTasks = useMemo(() => {
    return taskNotifications.filter((n) => {
      if (taskFilter === "UNREAD") return !n.isRead;
      return true;
    });
  }, [taskNotifications, taskFilter]);

  // Confirmation modal state for clearing header notifications
  const [headerClearConfirm, setHeaderClearConfirm] = useState<{
    open: boolean;
    type: "DOCS" | "TASKS" | "SUPPORT";
  } | null>(null);
  const [isHeaderClearing, setIsHeaderClearing] = useState(false);

  // Organization Time & Date Settings State (Driven by Time & Date Settings)
  const [timeSettings, setTimeSettings] = useState<{
    timezone: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
  }>({
    timezone: "Asia/Dubai",
    dateFormat: "MMM DD, YYYY",
    timeFormat: "12h",
  });
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Live Ticking Clock (updates every 1000ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Organization Time & Date Settings & Subscribe to Settings Changes
  useEffect(() => {
    async function loadOrgTimeSettings() {
      try {
        const queryParam = orgSubdomain || orgId || "ibh";
        const res = await fetch(`/api/settings/organisation/${encodeURIComponent(queryParam)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setTimeSettings({
            timezone: json.data.timezone || "Asia/Dubai",
            dateFormat: json.data.dateFormat || "MMM DD, YYYY",
            timeFormat: json.data.timeFormat || "12h",
          });
        }
      } catch (err) {
        console.warn("Could not load organization time settings:", err);
      }
    }

    loadOrgTimeSettings();

    // Instant real-time listener when superadmin updates settings in SettingsModule
    const handleSettingsUpdated = (e: any) => {
      if (e.detail) {
        setTimeSettings((prev) => ({
          timezone: e.detail.timezone || prev.timezone,
          dateFormat: e.detail.dateFormat || prev.dateFormat,
          timeFormat: e.detail.timeFormat || prev.timeFormat,
        }));
      }
    };

    window.addEventListener("org-settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("org-settings-updated", handleSettingsUpdated);
    };
  }, [orgSubdomain, orgId]);

  // Formatted Date & Time according to organization timezone and format
  const formattedDateTime = useMemo(() => {
    try {
      const tz = timeSettings.timezone || "Asia/Dubai";

      // Date formatter
      const dateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "short",
        day: "2-digit",
        weekday: "short",
      } as any).formatToParts(currentTime);

      const partsMap: Record<string, string> = {};
      dateParts.forEach((p) => {
        partsMap[p.type] = p.value;
      });

      // Calculate numeric month (01-12)
      const rawMonth = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        month: "2-digit",
      }).format(currentTime);

      let dateString = "";
      const year = partsMap["year"] || "";
      const monthShort = partsMap["month"] || "";
      const monthNum = rawMonth;
      const day = partsMap["day"] || "";
      const weekday = partsMap["weekday"] || "";

      switch (timeSettings.dateFormat) {
        case "DD/MM/YYYY":
          dateString = `${day}/${monthNum}/${year}`;
          break;
        case "MM/DD/YYYY":
          dateString = `${monthNum}/${day}/${year}`;
          break;
        case "YYYY-MM-DD":
          dateString = `${year}-${monthNum}-${day}`;
          break;
        case "DD MMM YYYY":
          dateString = `${day} ${monthShort} ${year}`;
          break;
        case "MMM DD, YYYY":
        default:
          dateString = `${monthShort} ${day}, ${year}`;
          break;
      }

      // Time formatter
      const is24h = timeSettings.timeFormat === "24h";
      const timeString = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: !is24h,
      }).format(currentTime);

      // Extract City or Short TZ
      const tzParts = tz.split("/");
      const tzLabel = tzParts.length > 1 ? tzParts[tzParts.length - 1].replace(/_/g, " ") : tz;

      return {
        dateString,
        timeString,
        weekday,
        tzLabel,
        fullTz: tz,
      };
    } catch {
      return {
        dateString: currentTime.toLocaleDateString(),
        timeString: currentTime.toLocaleTimeString(),
        weekday: "",
        tzLabel: timeSettings.timezone,
        fullTz: timeSettings.timezone,
      };
    }
  }, [currentTime, timeSettings]);

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => !dismissedIds.includes(n.id))
      .filter((n) => {
        if (notifFilter === "1DAY") return n.stage === "ONE_DAY";
        if (notifFilter === "3DAYS") return n.stage === "THREE_DAYS";
        if (notifFilter === "7DAYS") return n.stage === "SEVEN_DAYS";
        if (notifFilter === "EXPIRED") return n.stage === "EXPIRED_TODAY";
        return true;
      });
  }, [notifications, dismissedIds, notifFilter]);

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const queryParam = orgSubdomain || orgId || "";
      const res = await fetch(`/api/documents/notifications?organisationId=${encodeURIComponent(queryParam)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data.notifications || []);
          setNotifSummary(
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
      console.warn("Failed to fetch document expiry notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const loadSystemNotifications = async () => {
    try {
      const activeRole = user?.role || userRole || "SUPER_ADMIN";
      const data = await fetchSystemNotifications(activeRole, orgSubdomain || orgId, user?.id);
      const notifs = data.notifications || [];
      setSystemNotifications(notifs);
      setUnreadSystemCount(data.unreadCount || 0);

      // Detect incoming live notifications and trigger pop-up alert
      if (knownNotifIdsRef.current.size > 0) {
        const newlyArrived = notifs.find(
          (n) => !n.isRead && !knownNotifIdsRef.current.has(n.id)
        );
        if (newlyArrived) {
          setLatestLiveAlert(newlyArrived);
          setTimeout(() => {
            setLatestLiveAlert((curr) => (curr?.id === newlyArrived.id ? null : curr));
          }, 7000);
        }
      }
      knownNotifIdsRef.current = new Set(notifs.map((n) => n.id));
    } catch (err) {
      console.warn("Failed to fetch system notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    loadSystemNotifications();
    const docInterval = setInterval(fetchNotifications, 60000);
    // 4-second live polling interval for real-time notifications
    const sysInterval = setInterval(loadSystemNotifications, 4000);

    const handleClearEvent = () => {
      fetchNotifications();
      loadSystemNotifications();
    };
    window.addEventListener("org-notifications-cleared", handleClearEvent);

    return () => {
      clearInterval(docInterval);
      clearInterval(sysInterval);
      window.removeEventListener("org-notifications-cleared", handleClearEvent);
    };
  }, [orgSubdomain, orgId, user?.role, user?.id]);

  const handleExecuteHeaderClear = async () => {
    if (!headerClearConfirm) return;
    setIsHeaderClearing(true);
    try {
      if (headerClearConfirm.type === "DOCS") {
        await clearAllDocumentExpiryNotificationsApi(orgSubdomain);
        const allIds = notifications.map((n) => n.id);
        setDismissedIds((prev) => Array.from(new Set([...prev, ...allIds])));
        setNotifications([]);
      } else if (headerClearConfirm.type === "TASKS") {
        for (const task of taskNotifications) {
          await deleteSystemNotification(task.id);
        }
        setSystemNotifications((prev) => prev.filter((n) => isSupportNotif(n)));
      } else if (headerClearConfirm.type === "SUPPORT") {
        for (const supp of supportNotifications) {
          await deleteSystemNotification(supp.id);
        }
        setSystemNotifications((prev) => prev.filter((n) => isTaskNotif(n)));
      }
      window.dispatchEvent(new CustomEvent("org-notifications-cleared"));
    } catch (err) {
      console.error("Error executing header clear:", err);
    } finally {
      setIsHeaderClearing(false);
      setHeaderClearConfirm(null);
    }
  };

  const handleClearAllTaskNotifs = () => {
    setHeaderClearConfirm({ open: true, type: "TASKS" });
  };

  const handleClearAllSupportNotifs = () => {
    setHeaderClearConfirm({ open: true, type: "SUPPORT" });
  };

  const handleMarkSystemNotifRead = async (notif: SystemNotificationItem) => {
    await markNotificationAsRead(notif.id);
    setSystemNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setUnreadSystemCount((c) => Math.max(0, c - 1));
    if (onNavigateTab) {
      setNotifOpen(false);
      const isDomain = notif.title.toLowerCase().includes("domain") || notif.type === "DOMAIN_APPROVAL";
      if (isDomain) {
        onNavigateTab("settings");
      } else if (
        notif.type === "WORK_ORDER" ||
        notif.title.toLowerCase().includes("work order") ||
        notif.title.toLowerCase().includes("work assigned")
      ) {
        onNavigateTab("work-orders");
      } else if (
        notif.type === "TASK" ||
        notif.title.toLowerCase().includes("task")
      ) {
        onNavigateTab("task-list");
      } else if (
        notif.type === "STAFF_STATUS" ||
        notif.title.toLowerCase().includes("staff online") ||
        notif.title.toLowerCase().includes("staff offline")
      ) {
        onNavigateTab(user?.role === "STAFF" ? "work-orders" : "work-orders");
      } else {
        onNavigateTab("tokens");
      }
    }
  };

  const handleMarkAllSystemNotifsRead = async () => {
    const activeRole = user?.role || userRole || "SUPER_ADMIN";
    await markAllNotificationsAsRead(activeRole, orgSubdomain || orgId, user?.id);
    setSystemNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadSystemCount(0);
  };

  const handleOpenTaskNotif = async (notif: SystemNotificationItem) => {
    await markNotificationAsRead(notif.id);
    setSystemNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setUnreadSystemCount((c) => Math.max(0, c - 1));
    setNotifOpen(false);
    if (onNavigateTab) {
      if (isStaffUser) {
        onNavigateTab("work-orders");
      } else {
        onNavigateTab("task-list");
      }
    }
  };

  const handleDismissTaskNotif = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(notifId);
    setSystemNotifications((prev) => prev.filter((n) => n.id !== notifId));
    setUnreadSystemCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllTaskNotifsRead = async () => {
    const activeRole = user?.role || userRole || "SUPER_ADMIN";
    await markAllNotificationsAsRead(activeRole, orgSubdomain || orgId, user?.id);
    setSystemNotifications((prev) =>
      prev.map((n) => (isTaskNotif(n) || !isSupportNotif(n) ? { ...n, isRead: true } : n))
    );
    setUnreadSystemCount((c) => Math.max(0, c - unreadTaskCount));
  };

  // Close dropdowns and search palette on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchPaletteOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Global Search Handler
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await fetchGlobalSearch({
          q: trimmed,
          organisationId: orgId || orgSubdomain,
          userRole: user?.role || userRole,
          currentUserId: user?.id,
          permittedModules: user?.permittedModules,
        });
        setSearchResults(results);
        setSearchPaletteOpen(true);
        setFocusedIndex(0);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, orgId, orgSubdomain, user?.role, user?.id, user?.permittedModules, userRole]);

  // Global Keyboard shortcut listener (Cmd+K / Ctrl+K & Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchPaletteOpen(true);
      }
      if (e.key === "Escape" && searchPaletteOpen) {
        setSearchPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [searchPaletteOpen]);

  const isSuperAdminUser = user?.role === "SUPER_ADMIN" || user?.role === "PLATFORM_OWNER";

  // Category permissions (Super Admin has full access to all; others based on backend RBAC response or role defaults)
  const canSearchClients = isSuperAdminUser || (searchResults?.permissions?.canSearchClients ?? true);
  const canSearchTasks = isSuperAdminUser || (searchResults?.permissions?.canSearchTasks ?? true);
  const canSearchDocuments = isSuperAdminUser || (searchResults?.permissions?.canSearchDocuments ?? (user?.role !== "ACCOUNTANT"));

  const handleSelectClientResult = (clientId: string) => {
    setSearchPaletteOpen(false);
    setSearchQuery("");
    setMobileSearchOpen(false);
    if (onNavigateTab) {
      onNavigateTab("client-list", clientId);
    }
  };

  const handleSelectTaskResult = (clientId?: string) => {
    setSearchPaletteOpen(false);
    setSearchQuery("");
    setMobileSearchOpen(false);
    if (onNavigateTab) {
      if (clientId) {
        onNavigateTab("work-orders", clientId);
      } else {
        onNavigateTab("task-list");
      }
    }
  };

  const handleSelectDocumentResult = () => {
    setSearchPaletteOpen(false);
    setSearchQuery("");
    setMobileSearchOpen(false);
    if (onNavigateTab) {
      onNavigateTab("doc-list");
    }
  };

  const visibleItems = useMemo(() => {
    if (!searchResults) return [];
    const items: Array<{
      type: "client" | "task" | "document";
      id: string;
      title: string;
      item: any;
    }> = [];

    if (canSearchClients && (activeCategoryFilter === "ALL" || activeCategoryFilter === "CLIENTS")) {
      searchResults.clients.forEach((c) => items.push({ type: "client", id: c.id, title: c.companyName, item: c }));
    }
    if (canSearchTasks && (activeCategoryFilter === "ALL" || activeCategoryFilter === "TASKS")) {
      searchResults.tasks.forEach((t) => items.push({ type: "task", id: t.id, title: t.title, item: t }));
    }
    if (canSearchDocuments && (activeCategoryFilter === "ALL" || activeCategoryFilter === "DOCUMENTS")) {
      searchResults.documents.forEach((d) => items.push({ type: "document", id: d.id, title: d.documentName, item: d }));
    }
    return items;
  }, [searchResults, activeCategoryFilter, canSearchClients, canSearchTasks, canSearchDocuments]);

  const handleSearchInputKeyDown = (e: React.KeyboardEvent) => {
    if (!searchPaletteOpen || visibleItems.length === 0) {
      if (e.key === "ArrowDown") {
        setSearchPaletteOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % visibleItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + visibleItems.length) % visibleItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = visibleItems[focusedIndex];
      if (selected) {
        if (selected.type === "client") handleSelectClientResult(selected.id);
        else if (selected.type === "task") handleSelectTaskResult(selected.item.clientId);
        else if (selected.type === "document") handleSelectDocumentResult();
      }
    }
  };

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, id]);
    fetch(`/api/documents/notifications/${id}/read?organisationId=${encodeURIComponent(orgSubdomain || orgId || "")}`, {
      method: "PATCH",
    }).catch(() => {});
  };

  const handleClearAllNotifications = () => {
    setHeaderClearConfirm({ open: true, type: "DOCS" });
  };

  const displayName = user?.fullName || user?.username || userName || "Super Admin";

  const roleDisplayTitle = useMemo(() => {
    const rawRole = user?.role || userRole;
    if (!rawRole) return "Workspace";
    if (rawRole === "SUPER_ADMIN") return "Super Admin";
    if (rawRole === "PLATFORM_OWNER") return "Platform Owner";
    if (rawRole === "ACCOUNTANT") return "Accountant";
    if (rawRole === "ADMIN") return "Administrator";
    if (rawRole === "SALES_STAFF") return "Sales Staff";
    if (rawRole === "STAFF") return "Staff";
    return rawRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, [user?.role, userRole]);

  const initials = useMemo(() => {
    const raw = (user?.fullName || user?.username || userName || "SA").trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase() || "SA";
  }, [user?.fullName, user?.username, userName]);

  return (
    <header className="h-18 min-h-[72px] border-b border-slate-200/80 dark:border-[#1a1d26] bg-white/90 dark:bg-[#0c0d12]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors">
      {/* Left: Hamburger and Dynamic Breadcrumbs */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? "Expand Sidebar (3 lines)" : "Collapse Sidebar (3 lines)"}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>

        {activeTab === "task-create" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">{roleDisplayTitle}</span>
              <span className="text-slate-400 font-normal">›</span>
              <span
                onClick={() => onNavigateTab && onNavigateTab("task-list")}
                className="text-amber-500 hover:underline cursor-pointer"
              >
                Task Management
              </span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white">Create New Task</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              Assign a new task to a staff member for a client.
            </p>
          </div>
        ) : activeTab === "task-list" || activeTab === "tasks" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">{roleDisplayTitle}</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white">Task Management</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              Create, assign and track tasks across your organisation.
            </p>
          </div>
        ) : activeTab === "user-create" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">{roleDisplayTitle}</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-amber-500">User Management</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white">Create New User</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              Add a new user to your organisation with appropriate role and permissions.
            </p>
          </div>
        ) : activeTab === "user-list" || activeTab === "user-management" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">{roleDisplayTitle}</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white">User Management</span>
            </div>
            <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5 leading-tight font-semibold">
              {orgName}
            </p>
          </div>
        ) : activeTab === "services" || activeTab === "service-management" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">{roleDisplayTitle}</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white">Service Management</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">Catalog & Pricing</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              Manage main service headings and inner sub-services with dynamic customer pricing.
            </p>
          </div>
        ) : activeTab === "notifications" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">{roleDisplayTitle}</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white">Notifications</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              View and manage all system notifications sent to clients and staff.
            </p>
          </div>
        ) : activeTab && activeTab !== "dashboard" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">{roleDisplayTitle}</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white capitalize">
                {activeTab === "work-orders" && userRole === "STAFF"
                  ? "My Tasks"
                  : activeTab.replace(/-/g, " ")}
              </span>
            </div>
            <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5 leading-tight font-semibold">
              {orgName}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              {roleDisplayTitle} Dashboard
            </h1>
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1 leading-tight">
              {orgName}
            </p>
          </div>
        )}
      </div>

      {/* Right Controls: Date Range, Search, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Dynamic Organization Live Time & Date Pill (Driven by Time & Date Settings) */}
        <div
          onClick={() => onNavigateTab && onNavigateTab("settings")}
          className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/90 dark:bg-[#141620] hover:bg-slate-100 dark:hover:bg-[#1a1d2b] hover:border-amber-500/40 dark:hover:border-amber-500/40 transition-all cursor-pointer shadow-sm group select-none"
          title={`Organization Timezone: ${formattedDateTime.fullTz} • Format: ${timeSettings.dateFormat}. Click to configure in Settings.`}
        >
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 text-xs font-semibold">
            <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{formattedDateTime.dateString}</span>
          </div>
          <span className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{formattedDateTime.timeString}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-[#202434] text-slate-600 dark:text-slate-400 group-hover:text-amber-500 transition-colors">
            {formattedDateTime.tzLabel}
          </span>
        </div>

        {/* Global Search Input & Floating Palette */}
        <div className="relative" ref={searchContainerRef}>
          <div className="relative hidden md:flex items-center w-52 lg:w-72 xl:w-84">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (searchResults || searchQuery.trim().length > 0) {
                  setSearchPaletteOpen(true);
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="Search clients, tasks, documents..."
              className="w-full rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] pl-8 pr-16 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors shadow-xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setSearchPaletteOpen(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                title="Clear Search"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <div className="pointer-events-none absolute right-2 hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700/60">
                <span>⌘</span>
                <span>K</span>
              </div>
            )}
          </div>

          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(!mobileSearchOpen);
              if (!mobileSearchOpen) {
                setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
              }
            }}
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Floating Search Results Palette */}
          {searchPaletteOpen && searchQuery.trim().length > 0 && (
            <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[calc(100vw-32px)] sm:w-[500px] lg:w-[580px] max-w-[92vw] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] p-3 text-sm shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
              {/* Category Segmented Control Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl mb-2.5 text-xs font-semibold overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter("ALL")}
                  className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeCategoryFilter === "ALL"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>All</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-500 font-bold font-mono">
                    {searchResults?.totalCount ?? 0}
                  </span>
                </button>

                {canSearchClients && (
                  <button
                    type="button"
                    onClick={() => setActiveCategoryFilter("CLIENTS")}
                    className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategoryFilter === "CLIENTS"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                    <span>Clients</span>
                    {searchResults?.clients && searchResults.clients.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold font-mono">
                        {searchResults.clients.length}
                      </span>
                    )}
                  </button>
                )}

                {canSearchTasks && (
                  <button
                    type="button"
                    onClick={() => setActiveCategoryFilter("TASKS")}
                    className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategoryFilter === "TASKS"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 text-sky-500" />
                    <span>Tasks & Deliverables</span>
                    {searchResults?.tasks && searchResults.tasks.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold font-mono">
                        {searchResults.tasks.length}
                      </span>
                    )}
                  </button>
                )}

                {canSearchDocuments && (
                  <button
                    type="button"
                    onClick={() => setActiveCategoryFilter("DOCUMENTS")}
                    className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategoryFilter === "DOCUMENTS"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Documents</span>
                    {searchResults?.documents && searchResults.documents.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold font-mono">
                        {searchResults.documents.length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Results List */}
              <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {isSearching && (!searchResults || searchResults.totalCount === 0) ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    <span className="text-xs font-medium">Searching workspace modules...</span>
                  </div>
                ) : !searchResults || searchResults.totalCount === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="h-10 w-10 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2.5">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No matching results for &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Search across permitted modules by client name, client ID (CLI-...), service task, or document title.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Clients Section */}
                    {canSearchClients &&
                      (activeCategoryFilter === "ALL" || activeCategoryFilter === "CLIENTS") &&
                      searchResults.clients.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between px-2 py-1 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <Building2 className="h-3 w-3" />
                              <span>Clients ({searchResults.clients.length})</span>
                            </span>
                          </div>
                          <div className="space-y-1">
                            {searchResults.clients.map((c) => (
                              <div
                                key={c.id}
                                onClick={() => handleSelectClientResult(c.id)}
                                className="p-2.5 rounded-xl border border-transparent hover:border-amber-500/40 bg-slate-50/70 hover:bg-amber-500/5 dark:bg-slate-900/40 dark:hover:bg-amber-500/10 transition-all cursor-pointer flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                                    {c.companyName ? c.companyName.charAt(0).toUpperCase() : "C"}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                        {c.companyName}
                                      </span>
                                      {c.clientNumber && (
                                        <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                          {c.clientNumber}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                      <span>{c.contactPerson}</span>
                                      {c.email && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate">{c.email}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {c.status.replace(/_/g, " ")}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Tasks & Work Orders Section */}
                    {canSearchTasks &&
                      (activeCategoryFilter === "ALL" || activeCategoryFilter === "TASKS") &&
                      searchResults.tasks.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between px-2 py-1 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                              <Layers className="h-3 w-3" />
                              <span>Tasks & Deliverables ({searchResults.tasks.length})</span>
                            </span>
                          </div>
                          <div className="space-y-1">
                            {searchResults.tasks.map((t) => (
                              <div
                                key={t.id}
                                onClick={() => handleSelectTaskResult(t.clientId)}
                                className="p-2.5 rounded-xl border border-transparent hover:border-sky-500/40 bg-slate-50/70 hover:bg-sky-500/5 dark:bg-slate-900/40 dark:hover:bg-sky-500/10 transition-all cursor-pointer flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                                    <Layers className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                        {t.title}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                                        {t.category}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                      <span className="font-medium text-slate-600 dark:text-slate-300">
                                        {t.clientName}
                                      </span>
                                      {t.clientNumber && (
                                        <span className="font-mono text-[10px]">({t.clientNumber})</span>
                                      )}
                                      {t.assignedStaff && (
                                        <>
                                          <span>•</span>
                                          <span className="text-amber-600 dark:text-amber-400">
                                            Assigned: {t.assignedStaff}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      t.status === "COMPLETED"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                                        : t.status === "IN_PROGRESS" || t.status === "ASSIGNED"
                                        ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                                    }`}
                                  >
                                    {t.status.replace(/_/g, " ")}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Documents Section */}
                    {canSearchDocuments &&
                      (activeCategoryFilter === "ALL" || activeCategoryFilter === "DOCUMENTS") &&
                      searchResults.documents.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between px-2 py-1 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <FileText className="h-3 w-3" />
                              <span>Documents ({searchResults.documents.length})</span>
                            </span>
                          </div>
                          <div className="space-y-1">
                            {searchResults.documents.map((d) => (
                              <div
                                key={d.id}
                                onClick={handleSelectDocumentResult}
                                className="p-2.5 rounded-xl border border-transparent hover:border-emerald-500/40 bg-slate-50/70 hover:bg-emerald-500/5 dark:bg-slate-900/40 dark:hover:bg-emerald-500/10 transition-all cursor-pointer flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                        {d.documentName}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                        {d.documentType.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                      {d.clientName && <span>{d.clientName}</span>}
                                      {d.expiryDate && (
                                        <>
                                          <span>•</span>
                                          <span className="font-mono text-[10px]">
                                            Exp: {new Date(d.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    Open Vault
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>

              {/* Palette Footer: Keyboard guidance & RBAC Scope */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700 font-semibold">↵</kbd>
                    <span>select</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700 font-semibold">esc</kbd>
                    <span>close</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-[10px] text-amber-600 dark:text-amber-400">
                  <Shield className="h-3 w-3 shrink-0" />
                  <span>
                    {isSuperAdminUser
                      ? "Full Workspace Access"
                      : `${roleDisplayTitle} • Permitted Modules`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Search Overlay Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden fixed inset-x-0 top-0 h-18 bg-white dark:bg-[#0c0d12] z-50 px-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients, tasks, documents..."
                className="w-full rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(false);
                setSearchPaletteOpen(false);
              }}
              className="p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* 🌙 / ☀️ Dark & Light Mode Switcher Button (Requested Feature) */}
        <Tooltip content={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`} position="bottom">
          <button
            type="button"
            onClick={toggleTheme}
            className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] text-slate-600 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
            aria-label="Toggle Theme Mode"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 text-slate-600 hover:text-slate-900 transition-transform duration-200 hover:-rotate-12" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400 hover:text-amber-300 transition-transform duration-200 hover:rotate-45" />
            )}
          </button>
        </Tooltip>

        {/* Notification Bell with Live Expiry & System Alerts Dropdown */}
        <div className="relative" ref={notifRef}>
          <Tooltip content={`Notifications (${notifications.filter((n) => !dismissedIds.includes(n.id)).length + unreadSystemCount} alerts)`} position="bottom">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {(notifications.filter((n) => !dismissedIds.includes(n.id)).length + unreadSystemCount) > 0 && (
                <span
                  className={`absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${
                    notifSummary.expiringIn1Day > 0 || notifSummary.expired > 0 || unreadSystemCount > 0
                      ? "bg-rose-600 animate-pulse shadow-rose-600/40"
                      : "bg-orange-500 shadow-orange-500/40"
                  }`}
                >
                  {notifications.filter((n) => !dismissedIds.includes(n.id)).length + unreadSystemCount}
                </span>
              )}
            </button>
          </Tooltip>

          {/* Floating Notifications Panel */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] p-3 text-sm shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Category Segmented Control */}
              <div
                className={`grid ${
                  canAccessSupport ? "grid-cols-3" : "grid-cols-2"
                } gap-1 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl mb-2.5 text-xs font-semibold`}
              >
                <button
                  type="button"
                  onClick={() => setNotifSectionTab("DOCS")}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    notifSectionTab === "DOCS"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="truncate">Docs ({notifications.filter((n) => !dismissedIds.includes(n.id)).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifSectionTab("TASKS")}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    notifSectionTab === "TASKS"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Tasks</span>
                  {unreadTaskCount > 0 ? (
                    <span className="h-4 px-1.5 rounded-full bg-blue-500 text-white font-bold text-[9px] flex items-center justify-center shadow-sm shrink-0">
                      {unreadTaskCount}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      ({taskNotifications.length})
                    </span>
                  )}
                </button>
                {canAccessSupport && (
                  <button
                    type="button"
                    onClick={() => setNotifSectionTab("SYSTEM")}
                    className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      notifSectionTab === "SYSTEM"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <LifeBuoy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Support</span>
                    {unreadSupportCount > 0 && (
                      <span className="h-4 px-1.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center shrink-0">
                        {unreadSupportCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {notifSectionTab === "DOCS" ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Document Expiry Alerts</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                            {notifications.filter((n) => !dismissedIds.includes(n.id)).length}
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          7, 3, &amp; 1-day advance compliance notifications
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={fetchNotifications}
                        disabled={notifLoading}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        title="Refresh alerts"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${notifLoading ? "animate-spin text-orange-500" : ""}`} />
                      </button>
                      {notifications.filter((n) => !dismissedIds.includes(n.id)).length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllNotifications}
                          className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors font-medium px-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Urgency Filter Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800/60 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setNotifFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                        notifFilter === "ALL"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      All ({notifications.filter((n) => !dismissedIds.includes(n.id)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter("1DAY")}
                      className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                        notifFilter === "1DAY"
                          ? "bg-rose-600 text-white font-bold"
                          : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      }`}
                    >
                      <span>🚨 1 Day</span>
                      <span className="font-mono">({notifSummary.expiringIn1Day})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter("3DAYS")}
                      className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                        notifFilter === "3DAYS"
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      }`}
                    >
                      <span>⚠️ 3 Days</span>
                      <span className="font-mono">({notifSummary.expiringIn3Days})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter("7DAYS")}
                      className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                        notifFilter === "7DAYS"
                          ? "bg-orange-600 text-white font-bold"
                          : "text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                      }`}
                    >
                      <span>ℹ️ 7 Days</span>
                      <span className="font-mono">({notifSummary.expiringIn7Days})</span>
                    </button>
                  </div>

                  {/* Notification Items List */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          All Documents Compliant
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No documents are currently expiring within 7 days.
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map((notif) => {
                        const isExpired = notif.urgency === "expired" || notif.stage === "EXPIRED_TODAY" || notif.daysRemaining < 0;
                        const isCritical = notif.urgency === "critical" || notif.stage === "ONE_DAY" || notif.daysRemaining === 1;
                        const isWarning = notif.urgency === "warning" || notif.stage === "THREE_DAYS";
                        const isUrgent = isExpired || isCritical;

                        return (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-xl border transition-all text-xs relative group ${
                              isUrgent
                                ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70"
                                : isWarning
                                ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70"
                                : "border-orange-200 dark:border-orange-900/40 bg-orange-50/30 dark:bg-orange-950/15 hover:bg-orange-50/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full mt-1 shrink-0 ${
                                    isUrgent
                                      ? `bg-rose-500 ${isCritical ? "animate-pulse" : ""}`
                                      : isWarning
                                      ? "bg-amber-500"
                                      : "bg-orange-500"
                                  }`}
                                />
                                <div>
                                  <h5 className="font-bold text-slate-900 dark:text-white leading-tight">
                                    {notif.documentName}
                                  </h5>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {notif.documentType.replace(/_/g, " ")} • Assigned: {notif.assignedPerson}
                                  </p>
                                </div>
                              </div>

                              {/* Dismiss button */}
                              <button
                                type="button"
                                onClick={(e) => handleDismissNotification(notif.id, e)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 opacity-60 hover:opacity-100"
                                title="Dismiss notification"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                              <span
                                className={`font-semibold px-2 py-0.5 rounded-full border ${
                                  isExpired
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/80"
                                    : isCritical
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                                    : isWarning
                                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/80"
                                    : "bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800/80"
                                }`}
                              >
                                {notif.daysRemaining < 0
                                  ? "Expired"
                                  : notif.daysRemaining === 0
                                  ? "Expires Today"
                                  : notif.daysRemaining === 1
                                  ? "Expires Tomorrow (1 Day)"
                                  : `Expires in ${notif.daysRemaining} Days`}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {onNavigateTab && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotifOpen(false);
                                      onNavigateTab("doc-list");
                                    }}
                                    className="text-orange-600 dark:text-orange-400 hover:underline font-semibold"
                                  >
                                    View
                                  </button>
                                )}
                                {notif.documentUrl && (
                                  <a
                                    href={notif.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                    title="Open file from Bunny CDN"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        if (onNavigateTab) onNavigateTab("doc-list");
                      }}
                      className="w-full py-1.5 text-center text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-xl transition-colors"
                    >
                      Open Document Repository &rarr;
                    </button>
                  </div>
                </>
              ) : notifSectionTab === "TASKS" ? (
                <>
                  {/* Assigned Task Alerts Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                        <CheckSquare className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Assigned Tasks</span>
                          {unreadTaskCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500 text-white font-bold font-mono">
                              {unreadTaskCount} new
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isStaffUser ? "Your duty assignments & work orders" : "Team task assignments & updates"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={loadSystemNotifications}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        title="Refresh task notifications"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      {unreadTaskCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllTaskNotifsRead}
                          className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors font-medium px-1 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                      {taskNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllTaskNotifs}
                          className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors font-medium px-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task Filter Tabs (All / Unread) */}
                  <div className="flex items-center gap-1 pb-2 mb-2 text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => setTaskFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
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
                      className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                        taskFilter === "UNREAD"
                          ? "bg-blue-600 text-white font-bold"
                          : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      }`}
                    >
                      <span>Unread</span>
                      <span className="font-mono">({unreadTaskCount})</span>
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filteredTasks.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="h-10 w-10 mx-auto rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {taskFilter === "UNREAD" ? "No Unread Tasks" : "No Task Notifications"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 px-4">
                          {taskFilter === "UNREAD"
                            ? "All assigned tasks have been acknowledged."
                            : "When tasks or work orders are assigned to you, alerts will appear here."}
                        </p>
                      </div>
                    ) : (
                      filteredTasks.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleOpenTaskNotif(notif)}
                          className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer group relative ${
                            !notif.isRead
                              ? "border-blue-500/40 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50/90 dark:hover:bg-blue-950/50"
                              : "border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div
                                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  !notif.isRead
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-500 border border-slate-300/40 dark:border-slate-700/60"
                                }`}
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    {notif.title}
                                  </h5>
                                  {!notif.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                                  {notif.message}
                                </p>
                              </div>
                            </div>

                            {/* Dismiss button */}
                            <button
                              type="button"
                              onClick={(e) => handleDismissTaskNotif(notif.id, e)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 opacity-60 hover:opacity-100 shrink-0"
                              title="Dismiss notification"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notif.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              •{" "}
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 group-hover:underline font-semibold flex items-center gap-0.5">
                              View Task &rarr;
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        if (onNavigateTab) {
                          onNavigateTab(isStaffUser ? "work-orders" : "task-list");
                        }
                      }}
                      className="w-full py-1.5 text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <span>{isStaffUser ? "Open My Assigned Tasks" : "Open Task Board"} &rarr;</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Platform & Tokens Notifications */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                        <LifeBuoy className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Support Center Alerts</span>
                          {unreadSupportCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold">
                              {unreadSupportCount} new
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Domain approvals &amp; support replies
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={loadSystemNotifications}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        title="Refresh notifications"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      {unreadSupportCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllSystemNotifsRead}
                          className="text-[10px] text-slate-400 hover:text-amber-500 transition-colors font-medium px-1 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                      {supportNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllSupportNotifs}
                          className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors font-medium px-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Support Notifications List */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {supportNotifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="h-10 w-10 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          No Platform Alerts
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 px-4">
                          When Platform Owner responds to your tickets or approves domain changes, updates will appear here.
                        </p>
                      </div>
                    ) : (
                      supportNotifications.map((notif) => {
                        const isDomain = notif.title.toLowerCase().includes("domain");
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkSystemNotifRead(notif)}
                            className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer group ${
                              !notif.isRead
                                ? "border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/10 hover:bg-amber-500/15"
                                : "border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030]"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  isDomain
                                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                    : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                                }`}
                              >
                                {isDomain ? <Globe className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                                    {notif.title}
                                  </h5>
                                  {!notif.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                  {notif.message}
                                </p>
                                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                                  <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                  <span className="text-amber-500 group-hover:underline font-semibold flex items-center gap-0.5">
                                    {isDomain ? "Open Settings" : "View Ticket"} &rarr;
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        if (onNavigateTab) onNavigateTab("tokens");
                      }}
                      className="w-full py-1.5 text-center text-xs font-bold text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors"
                    >
                      Open Support Center &rarr;
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Staff Online/Offline Quick Toggle Pill */}
        {isStaffUser && (
          <button
            type="button"
            onClick={async () => {
              await setAvailability(!isOnline);
            }}
            title={isOnline ? "You are Online. Click to go Offline" : "You are Offline. Click to go Online"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs select-none ${
              isOnline
                ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30" : "bg-slate-400"
              }`}
            />
            <span>{isOnline ? "Online" : "Offline"}</span>
          </button>
        )}

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] hover:bg-slate-100 dark:hover:bg-[#1c1f2e] transition-all select-none shadow-sm"
          >
            {/* Brown/Orange Avatar from screenshot */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white font-bold text-xs shadow-sm">
              {initials}
            </div>

            <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[150px] truncate" title={displayName}>
              {displayName}
            </span>

            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d111a] p-2 text-sm shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={displayName}>
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || "superadmin@ibh.ae"}
                </p>
                <div className="mt-1 flex items-center justify-between gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <div className="flex items-center gap-1 min-w-0">
                    <Building className="h-3 w-3 shrink-0" />
                    <span className="truncate">{orgName}</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 text-[9px] uppercase tracking-wider font-bold shrink-0">
                    {user?.role?.replace("_", " ") || userRole}
                  </span>
                </div>
              </div>

              {/* Staff Online/Offline Toggle in Dropdown */}
              {isStaffUser && (
                <div className="p-2 mb-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>Staff Availability</span>
                    <span
                      className={`text-[10px] font-bold ${
                        isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {isOnline ? "Online (Available)" : "Offline (Away)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAvailability(true)}
                      className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        isOnline
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      ● Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailability(false)}
                      className={`py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        !isOnline
                          ? "bg-slate-700 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      ○ Offline
                    </button>
                  </div>
                </div>
              )}

              {isPlatformOwner && (
                <Link
                  href="/platform-owner"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Switch to Platform Owner</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  if (onNavigateTab) {
                    onNavigateTab("settings");
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Organization Settings</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Floating Live Notification Alert Toast */}
      {latestLiveAlert && (
        <div
          onClick={() => {
            handleMarkSystemNotifRead(latestLiveAlert);
            setLatestLiveAlert(null);
          }}
          className="fixed top-16 right-5 z-[9999] max-w-sm w-full p-4 rounded-2xl bg-white dark:bg-[#12141c] border-2 border-amber-500 shadow-2xl shadow-black/40 flex items-start gap-3 cursor-pointer animate-in slide-in-from-top-3 duration-200 hover:scale-[1.01] transition-transform"
          role="alert"
          aria-live="assertive"
        >
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                New Notification Alert
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLatestLiveAlert(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {latestLiveAlert.title}
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
              {latestLiveAlert.message}
            </p>
            <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mt-1 block">
              Click to view details ›
            </span>
          </div>
        </div>
      )}
      {/* Confirmation Modal for Clearing Header Alerts */}
      {headerClearConfirm?.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {headerClearConfirm.type === "DOCS"
                    ? "Clear Document Alerts?"
                    : headerClearConfirm.type === "TASKS"
                    ? "Clear Task Alerts?"
                    : "Clear Support Alerts?"}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This action clears only this alert category.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#161822] p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              {headerClearConfirm.type === "DOCS"
                ? "All document expiry alerts in this section will be cleared. Other notification categories will remain unchanged."
                : headerClearConfirm.type === "TASKS"
                ? "All assigned task alerts in this section will be cleared. Other notification categories will remain unchanged."
                : "All support center alerts in this section will be cleared. Other notification categories will remain unchanged."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setHeaderClearConfirm(null)}
                disabled={isHeaderClearing}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteHeaderClear}
                disabled={isHeaderClearing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isHeaderClearing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" />
                    <span>Yes, Clear</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
