"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Building2,
  FileText,
  Clock,
  Coffee,
  CheckCircle2,
  ChevronDown,
  Users,
  Armchair,
  ArrowUpDown,
  RefreshCw,
  X,
  Sparkles,
  UserCheck,
  Moon,
  TrendingUp,
  AlertTriangle,
  Flame,
} from "lucide-react";
import {
  fetchStaffManagement,
  StaffCardData,
  StaffLiveStatus,
} from "@/services/staff-management.service";
import { TaskCreateModal } from "@/components/organization/TaskCreateView";
import { useAuth } from "@/context/AuthContext";

function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

interface StaffManagementViewProps {
  orgId?: string;
  orgSubdomain?: string;
  userRole?: string;
  onNavigateTab?: (tab: string) => void;
}

export function StaffManagementView({
  orgId,
  orgSubdomain,
  userRole,
  onNavigateTab,
}: StaffManagementViewProps) {
  const { user } = useAuth();

  // State
  const [staffList, setStaffList] = useState<StaffCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");

  // Create Task Modal
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // 1. Fetch Staff Management Data from API
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetchStaffManagement(orgId || orgSubdomain, {
        search: searchQuery,
        status: selectedStatus,
        sortBy: sortBy,
      });

      if (res.success && Array.isArray(res.data)) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.error("Failed to load staff management data:", err);
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, orgSubdomain, selectedStatus, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Real-time Live Second Counter
  // Ticks every 1 second: advances task timer for working staff, and advances break timer for on-break staff
  useEffect(() => {
    const interval = setInterval(() => {
      setStaffList((prevList) =>
        prevList.map((item) => {
          // If staff is on break: tick break duration, hold task timer
          if (item.status === "ON_BREAK" || item.isOnBreak) {
            const currentBreakSec = (item.breakDurationSeconds || 0) + 1;
            const breakStr = formatSeconds(currentBreakSec);
            return {
              ...item,
              breakDurationSeconds: currentBreakSec,
              timer: {
                ...item.timer,
                statusSubtext: `Break active (${breakStr}) • Work paused`,
              },
            };
          }

          // If staff is actively working: tick elapsed task timer
          if (
            (item.status === "WORKING" ||
              item.status === "ALMOST_DUE" ||
              item.status === "OVERTIME") &&
            !item.isTimerPaused
          ) {
            const newElapsed = item.timer.elapsedSeconds + 1;
            const hours = Math.floor(newElapsed / 3600);
            const minutes = Math.floor((newElapsed % 3600) / 60);
            const seconds = newElapsed % 60;
            const pad = (n: number) => n.toString().padStart(2, "0");
            const formattedElapsed = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
            const displayString = `${formattedElapsed} / ${item.timer.formattedTarget}`;

            const targetSeconds = item.timer.targetMinutes * 60;
            let currentStatus = item.status;
            let statusLabel = item.statusLabel;
            let statusSubtext = item.timer.statusSubtext;

            if (newElapsed > targetSeconds) {
              currentStatus = "OVERTIME";
              statusLabel = "Overtime";
              statusSubtext = "Overtime";
            } else if (newElapsed >= targetSeconds * 0.6) {
              currentStatus = "ALMOST_DUE";
              statusLabel = "Almost Due";
              statusSubtext = "Almost due";
            }

            return {
              ...item,
              status: currentStatus,
              statusLabel,
              timer: {
                ...item.timer,
                elapsedSeconds: newElapsed,
                formattedElapsed,
                displayString,
                statusSubtext,
              },
            };
          }

          return item;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 3. Fast Auto-Refresh Polling (Every 3.5 seconds) for instant live updates
  useEffect(() => {
    const poll = setInterval(() => {
      loadData(true);
    }, 3500);
    return () => clearInterval(poll);
  }, [orgId, orgSubdomain, selectedStatus, sortBy]);

  // Compute live counts for KPI header
  const counts = useMemo(() => {
    const c = {
      TOTAL: staffList.length,
      WORKING: 0,
      ALMOST_DUE: 0,
      OVERTIME: 0,
      AVAILABLE: 0,
      ON_BREAK: 0,
      OFFLINE: 0,
    };
    staffList.forEach((s) => {
      if (s.isOffline || s.status === "OFFLINE") c.OFFLINE++;
      else if (s.isOnBreak || s.status === "ON_BREAK") c.ON_BREAK++;
      else if (s.status === "WORKING") c.WORKING++;
      else if (s.status === "ALMOST_DUE") c.ALMOST_DUE++;
      else if (s.status === "OVERTIME") c.OVERTIME++;
      else if (s.status === "AVAILABLE") c.AVAILABLE++;
    });
    return c;
  }, [staffList]);

  // Status Styling Configuration: Creative, rich gradients & polished dark/light themes
  const getStatusStyles = (status: StaffLiveStatus, isOffline?: boolean) => {
    if (isOffline || status === "OFFLINE") {
      return {
        cardBg:
          "bg-slate-50/80 dark:bg-[#0c101a]/80 border-dashed border-slate-300 dark:border-slate-800 opacity-65",
        badge:
          "bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700",
        dotColor: "bg-slate-400",
        seatPill:
          "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800",
        seatIcon: "text-slate-400",
        seatText: "text-slate-500 dark:text-slate-400",
        avatarGradient: "from-slate-400 to-slate-600 text-white ring-2 ring-slate-300 dark:ring-slate-700",
        progressBar: "bg-slate-400",
        timerBg: "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/60",
        timerText: "text-slate-500 dark:text-slate-400",
      };
    }

    switch (status) {
      case "WORKING":
        return {
          cardBg:
            "bg-gradient-to-b from-emerald-500/[0.08] via-emerald-500/[0.02] to-white dark:from-emerald-950/30 dark:via-[#0e1620] dark:to-[#0c1219] border-emerald-500/30 dark:border-emerald-500/20 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50",
          badge:
            "bg-emerald-500/15 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-700/50",
          dotColor: "bg-emerald-500 animate-pulse",
          seatPill:
            "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25",
          seatIcon: "text-emerald-600 dark:text-emerald-400",
          seatText: "text-emerald-800 dark:text-emerald-300",
          avatarGradient: "from-emerald-500 to-teal-700 text-white ring-2 ring-emerald-500/40",
          progressBar: "bg-emerald-500",
          timerBg: "bg-emerald-500/10 border-emerald-500/20",
          timerText: "text-emerald-700 dark:text-emerald-300",
        };
      case "ALMOST_DUE":
        return {
          cardBg:
            "bg-gradient-to-b from-amber-500/[0.09] via-amber-500/[0.03] to-white dark:from-amber-950/35 dark:via-[#16131d] dark:to-[#120f17] border-amber-500/30 dark:border-amber-500/20 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/50",
          badge:
            "bg-amber-500/15 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-500/30 dark:border-amber-700/50",
          dotColor: "bg-amber-500 animate-pulse",
          seatPill:
            "bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/25",
          seatIcon: "text-amber-600 dark:text-amber-400",
          seatText: "text-amber-900 dark:text-amber-300",
          avatarGradient: "from-amber-500 to-orange-600 text-white ring-2 ring-amber-500/40",
          progressBar: "bg-amber-500",
          timerBg: "bg-amber-500/10 border-amber-500/20",
          timerText: "text-amber-800 dark:text-amber-300",
        };
      case "OVERTIME":
        return {
          cardBg:
            "bg-gradient-to-b from-rose-500/[0.09] via-rose-500/[0.03] to-white dark:from-rose-950/35 dark:via-[#190e14] dark:to-[#140b10] border-rose-500/30 dark:border-rose-500/20 shadow-sm hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-500/50",
          badge:
            "bg-rose-500/15 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-500/30 dark:border-rose-700/50",
          dotColor: "bg-rose-500 animate-ping",
          seatPill:
            "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/25",
          seatIcon: "text-rose-600 dark:text-rose-400",
          seatText: "text-rose-800 dark:text-rose-300",
          avatarGradient: "from-rose-500 to-red-700 text-white ring-2 ring-rose-500/40",
          progressBar: "bg-rose-500",
          timerBg: "bg-rose-500/10 border-rose-500/20",
          timerText: "text-rose-800 dark:text-rose-300",
        };
      case "AVAILABLE":
        return {
          cardBg:
            "bg-gradient-to-b from-sky-500/[0.08] via-sky-500/[0.02] to-white dark:from-sky-950/30 dark:via-[#0c1524] dark:to-[#0a111c] border-sky-500/30 dark:border-sky-500/20 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-500/50",
          badge:
            "bg-sky-500/15 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-500/30 dark:border-sky-700/50",
          dotColor: "bg-sky-500",
          seatPill:
            "bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/25",
          seatIcon: "text-sky-600 dark:text-sky-400",
          seatText: "text-sky-800 dark:text-sky-300",
          avatarGradient: "from-blue-500 to-indigo-600 text-white ring-2 ring-sky-500/40",
          progressBar: "bg-sky-500",
          timerBg: "bg-sky-500/10 border-sky-500/20",
          timerText: "text-sky-700 dark:text-sky-300",
        };
      case "ON_BREAK":
        return {
          cardBg:
            "bg-gradient-to-b from-purple-500/[0.09] via-purple-500/[0.03] to-white dark:from-purple-950/35 dark:via-[#160f24] dark:to-[#120b1d] border-purple-500/30 dark:border-purple-500/20 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/50",
          badge:
            "bg-purple-500/15 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-500/30 dark:border-purple-700/50",
          dotColor: "bg-purple-500 animate-pulse",
          seatPill:
            "bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/25",
          seatIcon: "text-purple-600 dark:text-purple-400",
          seatText: "text-purple-800 dark:text-purple-300",
          avatarGradient: "from-purple-500 to-indigo-700 text-white ring-2 ring-purple-500/40",
          progressBar: "bg-purple-500",
          timerBg: "bg-purple-500/10 border-purple-500/20",
          timerText: "text-purple-800 dark:text-purple-300",
        };
      default:
        return {
          cardBg: "bg-white dark:bg-[#12141c] border-slate-200 dark:border-slate-800",
          badge: "bg-slate-100 text-slate-700 border border-slate-200",
          dotColor: "bg-slate-400",
          seatPill: "bg-slate-100 text-slate-600 border border-slate-200",
          seatIcon: "text-slate-400",
          seatText: "text-slate-600",
          avatarGradient: "from-slate-500 to-slate-700 text-white",
          progressBar: "bg-slate-400",
          timerBg: "bg-slate-100 border-slate-200",
          timerText: "text-slate-600",
        };
    }
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* ─── Header: Title, Live Sync Indicator & Create Task Button ─── */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Staff Management
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Monitor</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time operational dashboard of your team, task execution velocity, and workstation desks.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="Refresh staff status"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateTaskModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* ─── Executive KPI Status Counters Strip (Interactive 1-Click Filters) ─── */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* All Staff */}
        <button
          type="button"
          onClick={() => setSelectedStatus("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatus === "ALL"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-[#12141c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>All Team</span>
          <span className="px-1.5 py-0.2 rounded-md bg-black/15 dark:bg-black/10 text-[10px] font-mono">
            {counts.TOTAL}
          </span>
        </button>

        {/* Working */}
        <button
          type="button"
          onClick={() => setSelectedStatus("WORKING")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatus === "WORKING"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-500/30"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Working</span>
          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-[10px] font-mono">
            {counts.WORKING}
          </span>
        </button>

        {/* Almost Due */}
        <button
          type="button"
          onClick={() => setSelectedStatus("ALMOST_DUE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatus === "ALMOST_DUE"
              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30 ring-2 ring-amber-500/30"
              : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Almost Due</span>
          <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-[10px] font-mono">
            {counts.ALMOST_DUE}
          </span>
        </button>

        {/* Overtime */}
        <button
          type="button"
          onClick={() => setSelectedStatus("OVERTIME")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatus === "OVERTIME"
              ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30 ring-2 ring-rose-500/30"
              : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/25 hover:bg-rose-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span>Overtime</span>
          <span className="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-[10px] font-mono">
            {counts.OVERTIME}
          </span>
        </button>

        {/* Available (Free) */}
        <button
          type="button"
          onClick={() => setSelectedStatus("AVAILABLE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatus === "AVAILABLE"
              ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30 ring-2 ring-sky-500/30"
              : "bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/25 hover:bg-sky-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          <span>Available</span>
          <span className="px-1.5 py-0.2 rounded-md bg-sky-500/20 text-[10px] font-mono">
            {counts.AVAILABLE}
          </span>
        </button>

        {/* On Break */}
        <button
          type="button"
          onClick={() => setSelectedStatus("ON_BREAK")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatus === "ON_BREAK"
              ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30 ring-2 ring-purple-500/30"
              : "bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/25 hover:bg-purple-500/20"
          }`}
        >
          <Coffee className="h-3.5 w-3.5 text-purple-500" />
          <span>On Break</span>
          <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-[10px] font-mono">
            {counts.ON_BREAK}
          </span>
        </button>

        {/* Offline */}
        <button
          type="button"
          onClick={() => setSelectedStatus("OFFLINE")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            selectedStatus === "OFFLINE"
              ? "bg-slate-700 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span>Offline</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
            {counts.OFFLINE}
          </span>
        </button>
      </div>

      {/* ─── Search & Sort Bar ─── */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, seat number, client, service..."
            className="w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#12141c] pl-10 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="sm:col-span-4 relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#12141c] pl-3.5 pr-8 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="name">Sort by: Name (A-Z)</option>
            <option value="seat">Sort by: Workstation Seat</option>
            <option value="status">Sort by: Duty Status</option>
            <option value="duration">Sort by: Longest Active Timer</option>
          </select>
          <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ─── Main Staff Cards Grid ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#12141c] animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
              <div className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] p-8">
          <Users className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
            No staff members match the selected filters
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or status filter to see other members of your team.
          </p>
          {(searchQuery || selectedStatus !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("ALL");
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {staffList.map((staff) => {
            const isOffline = staff.status === "OFFLINE" || staff.isOffline;
            const isOnBreak = staff.status === "ON_BREAK" || staff.isOnBreak;
            const isAvailable = staff.status === "AVAILABLE" && !isOffline && !isOnBreak;
            const styles = getStatusStyles(staff.status, isOffline);

            // Compute elapsed progress percentage (target is 30 mins)
            const targetSec = (staff.timer.targetMinutes || 30) * 60;
            const elapsedSec = staff.timer.elapsedSeconds || 0;
            const progressPercent = Math.min(100, Math.round((elapsedSec / targetSec) * 100));

            return (
              <div
                key={staff.id}
                className={`rounded-3xl border p-5 transition-all duration-300 relative flex flex-col justify-between backdrop-blur-xs ${styles.cardBg}`}
              >
                {/* ── CARD TOP: Avatar, Name, Designation, Badge & Seat No ── */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar with attached live status bead */}
                      <div className="relative shrink-0">
                        {staff.avatar ? (
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
                          />
                        ) : (
                          <div
                            className={`h-12 w-12 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-black uppercase shadow-xs ${styles.avatarGradient}`}
                          >
                            {staff.initials}
                          </div>
                        )}

                        {/* Live micro-status indicator attached to avatar corner */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-[#0e121d] flex items-center justify-center ${
                            isOffline ? "bg-slate-400" : isOnBreak ? "bg-purple-400" : "bg-emerald-500"
                          }`}
                        />
                      </div>

                      {/* Name & Designation */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate tracking-tight leading-snug">
                          {staff.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate mb-1.5">
                          {staff.designation}
                        </p>

                        {/* Status Badge */}
                        <div className="inline-flex items-center gap-1.5 shadow-2xs">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-tight ${styles.badge}`}
                          >
                            {isOnBreak ? (
                              <Coffee className="h-3 w-3" />
                            ) : (
                              <span className={`h-1.5 w-1.5 rounded-full ${styles.dotColor}`} />
                            )}
                            <span>{isOffline ? "Not Online" : staff.statusLabel}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Workstation Seat No */}
                    <div className="shrink-0">
                      {staff.seatNo && staff.seatNo !== "—" ? (
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-2xs ${styles.seatPill}`}
                          title={`Assigned desk seat ${staff.seatNo}`}
                        >
                          <Armchair className={`h-3.5 w-3.5 ${styles.seatIcon}`} />
                          <div className="text-right">
                            <span className="text-[8.5px] uppercase tracking-wider block font-bold leading-none opacity-80">
                              Seat No.
                            </span>
                            <span className={`font-mono text-xs font-black leading-tight ${styles.seatText}`}>
                              {staff.seatNo}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 opacity-70">
                          <Armchair className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            No Desk
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── CARD MIDDLE: Task & Client Engagement ── */}
                  {!isAvailable && !isOffline && (staff.currentClient || staff.currentService) ? (
                    /* Active Work Assignment Details */
                    <div className="space-y-2 mb-4 p-3 rounded-2xl bg-white/75 dark:bg-black/20 border border-black/[0.04] dark:border-white/[0.04] shadow-2xs">
                      {/* Client Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                            <Building2 className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block leading-none">
                              Client
                            </span>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                              {staff.currentClient?.name || "Client Account"}
                            </p>
                          </div>
                        </div>

                        {staff.currentClient?.clientId && (
                          <div className="text-right shrink-0">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block leading-none">
                              Client ID
                            </span>
                            <span className="text-[11px] font-mono font-black text-slate-700 dark:text-slate-300 block mt-0.5">
                              {staff.currentClient.clientId}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Service Row */}
                      <div className="flex items-center gap-2 pt-1 border-t border-black/[0.03] dark:border-white/[0.03]">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                          <FileText className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block leading-none">
                            Assigned Service
                          </span>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                            {staff.currentService?.name || "Corporate Work Order"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isAvailable ? (
                    /* Creative Standby Showcase for Available Staff */
                    <div className="mb-4 p-3.5 rounded-2xl bg-sky-500/[0.08] dark:bg-sky-950/30 border border-sky-500/20 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 shrink-0">
                          <UserCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-sky-900 dark:text-sky-300 block leading-none">
                            Standby • Ready for Work
                          </span>
                          <span className="text-[10px] text-sky-700/80 dark:text-sky-300/80 mt-0.5 block">
                            Staff is online and available for new client assignments.
                          </span>
                        </div>
                      </div>

                      {/* Quick Assign Shortcut for Admin */}
                      <button
                        type="button"
                        onClick={() => setShowCreateTaskModal(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                        title="Assign work to this staff member"
                      >
                        + Assign
                      </button>
                    </div>
                  ) : isOnBreak ? (
                    /* On Break Information Box */
                    <div className="mb-4 p-3 rounded-2xl bg-purple-500/[0.08] dark:bg-purple-950/30 border border-purple-500/20 flex items-center gap-2.5 shadow-2xs">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 shrink-0">
                        <Coffee className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-purple-900 dark:text-purple-300 block leading-none">
                          Break Session Active
                        </span>
                        <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-0.5 block">
                          Operational task timer paused until staff resumes work.
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Offline Notice */
                    <div className="mb-4 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-center gap-2.5 shadow-2xs">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">
                        <Moon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block leading-none">
                          Shift Inactive / Signed Out
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                          Staff member is offline and not currently checked in.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── CARD BOTTOM: Timer & Execution Progress Bar ── */}
                <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                  {isOnBreak ? (
                    // ☕ On Break Status
                    <div className="flex items-center justify-between text-xs font-black text-purple-700 dark:text-purple-300">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400 animate-pulse" />
                        <div>
                          <span className="font-mono text-sm tracking-tight block font-black">
                            {formatSeconds(staff.breakDurationSeconds || 0)}
                          </span>
                          <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-medium block">
                            ⏸️ Task timer held & paused
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/30">
                        On Break
                      </span>
                    </div>
                  ) : isOffline ? (
                    // ⚫ Offline Status
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span className="text-xs font-bold">Shift Inactive</span>
                      <span className="text-[10px] opacity-75">Offline</span>
                    </div>
                  ) : isAvailable ? (
                    // 🔵 Available / Free Status
                    <div className="flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-sky-500" />
                        <span className="text-xs font-extrabold">Available for Duty</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-extrabold border border-sky-500/25">
                        Free
                      </span>
                    </div>
                  ) : (
                    // 🟢 / 🟠 / 🔴 Active Task Working Timer with Micro Progress Bar
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`flex items-center gap-2 font-mono text-xs font-black ${styles.timerText}`}>
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {staff.timer.formattedElapsed}{" "}
                            <span className="text-[11px] font-normal opacity-70">
                              / {staff.timer.formattedTarget}
                            </span>
                          </span>
                        </div>

                        <span className="text-[10px] font-extrabold capitalize text-slate-500 dark:text-slate-400">
                          {staff.timer.statusSubtext}
                        </span>
                      </div>

                      {/* Micro Execution Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${styles.progressBar}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Task Create Modal ─── */}
      {showCreateTaskModal && (
        <TaskCreateModal
          orgId={orgId}
          orgSubdomain={orgSubdomain}
          onClose={() => setShowCreateTaskModal(false)}
          onTaskCreated={() => {
            setShowCreateTaskModal(false);
            loadData(true);
          }}
        />
      )}
    </div>
  );
}
