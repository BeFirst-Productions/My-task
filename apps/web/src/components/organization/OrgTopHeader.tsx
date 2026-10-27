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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Tooltip } from "@/components/ui/Tooltip";

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
  orgName?: string;
  orgSubdomain?: string;
  orgId?: string;
  userRole?: string;
  userName?: string;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export function OrgTopHeader({
  onToggleMobileMenu,
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
  orgId,
  userRole = "Super Admin",
  userName = "Super Admin",
  activeTab = "dashboard",
  onNavigateTab,
}: OrgTopHeaderProps) {
  const { user, logout, isPlatformOwner } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 minute auto-sync
    return () => clearInterval(interval);
  }, [orgSubdomain, orgId]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, id]);
    fetch(`/api/documents/notifications/${id}/read?organisationId=${encodeURIComponent(orgSubdomain || orgId || "")}`, {
      method: "PATCH",
    }).catch(() => {});
  };

  const handleClearAllNotifications = () => {
    const allIds = notifications.map((n) => n.id);
    setDismissedIds((prev) => Array.from(new Set([...prev, ...allIds])));
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SA";

  return (
    <header className="h-18 min-h-[72px] border-b border-slate-200/80 dark:border-[#1a1d26] bg-white/90 dark:bg-[#0c0d12]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors">
      {/* Left: Hamburger and Dynamic Breadcrumbs */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          title="Toggle Sidebar Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {activeTab === "user-create" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">Super Admin</span>
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
              <span className="text-amber-500">Super Admin</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white">User Management</span>
            </div>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 leading-tight font-semibold">
              {orgName}
            </p>
          </div>
        ) : activeTab && activeTab !== "dashboard" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-amber-500">Super Admin</span>
              <span className="text-slate-400 font-normal">›</span>
              <span className="text-slate-900 dark:text-white capitalize">
                {activeTab.replace(/-/g, " ")}
              </span>
            </div>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 leading-tight font-semibold">
              {orgName}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              Super Admin Dashboard
            </h1>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1 leading-tight">
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

        {/* Search Input from Screenshot */}
        <div className="relative hidden md:block w-48 xl:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab.includes("user")
                ? "Search users by name, email or phone..."
                : "Search clients, documents, tasks..."
            }
            className="w-full rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors shadow-sm"
          />
        </div>

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

        {/* Notification Bell with Live Expiry Alerts Dropdown */}
        <div className="relative" ref={notifRef}>
          <Tooltip content={`Document Expiry Alerts (${notifications.filter((n) => !dismissedIds.includes(n.id)).length} alerts)`} position="bottom">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              aria-label="Document Expiry Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.filter((n) => !dismissedIds.includes(n.id)).length > 0 && (
                <span
                  className={`absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ${
                    notifSummary.expiringIn1Day > 0
                      ? "bg-rose-600 animate-pulse shadow-rose-600/50"
                      : notifSummary.expiringIn3Days > 0
                      ? "bg-amber-500 shadow-amber-500/50"
                      : "bg-sky-500 shadow-sky-500/50"
                  }`}
                >
                  {notifications.filter((n) => !dismissedIds.includes(n.id)).length}
                </span>
              )}
            </button>
          </Tooltip>

          {/* Floating Expiry Notifications Panel */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e111a] p-3 text-sm shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                  className={`px-2 py-1 rounded-lg transition-colors shrink-0 ${
                    notifFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  All ({notifications.filter((n) => !dismissedIds.includes(n.id)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter("1DAY")}
                  className={`px-2 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                    notifFilter === "1DAY"
                      ? "bg-rose-500 text-white font-bold"
                      : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                  }`}
                >
                  <span>🚨 1 Day</span>
                  <span className="font-mono">({notifSummary.expiringIn1Day})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter("3DAYS")}
                  className={`px-2 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                    notifFilter === "3DAYS"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  <span>⚠️ 3 Days</span>
                  <span className="font-mono">({notifSummary.expiringIn3Days})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter("7DAYS")}
                  className={`px-2 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                    notifFilter === "7DAYS"
                      ? "bg-sky-500 text-white font-bold"
                      : "text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                  }`}
                >
                  <span>ℹ️ 7 Days</span>
                  <span className="font-mono">({notifSummary.expiringIn7Days})</span>
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
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
                    const isCritical = notif.urgency === "critical";
                    const isWarning = notif.urgency === "warning";
                    const isNotice = notif.urgency === "notice";

                    return (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-xl border transition-all text-xs relative group ${
                            isCritical
                              ? "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                              : isWarning
                              ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                              : isNotice
                              ? "border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10"
                              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span
                                className={`h-2 w-2 rounded-full mt-1 shrink-0 ${
                                  isCritical
                                    ? "bg-rose-500 animate-pulse"
                                    : isWarning
                                    ? "bg-amber-500"
                                    : "bg-sky-500"
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
                              className={`font-bold px-2 py-0.5 rounded-md ${
                                isCritical
                                  ? "bg-rose-500 text-white"
                                  : isWarning
                                  ? "bg-amber-500 text-slate-950"
                                  : isNotice
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
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
            </div>
          )}
        </div>

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

            <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200">
              Super Admin
            </span>

            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d111a] p-2 text-sm shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || userName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || "superadmin@ibh.ae"}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Building className="h-3 w-3" />
                  <span className="truncate">{orgName}</span>
                </div>
              </div>

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
                  alert("Organization configuration & preferences.");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
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
    </header>
  );
}
