"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  RotateCcw,
  Users,
  UserCheck,
  Cloud,
  MoreVertical,
  Activity,
  ExternalLink,
  Shield,
  Check,
  AlertTriangle,
  X,
  Eye,
  Edit,
  Database,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  getOrganisations,
  updateOrganisationStatus,
  type OrganisationListItem,
} from "@/services/organization.service";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export interface StatusCardItem {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED" | "PENDING";
  companyType: string;
  superAdminsCount: number;
  usersCount: number;
  storageUsedPercent: number;
  lastActivity: string;
  health: "healthy" | "warning" | "suspended";
  healthText: string;
  databaseName?: string;
  subdomain?: string;
  primaryLocation?: string;
  superAdminEmail?: string;
  superAdminPhone?: string;
}

interface OrganisationStatusViewProps {
  onViewDashboard?: (org: StatusCardItem) => void;
  onEditOrganisation?: (orgId: string) => void;
  onCreateOrganisation?: () => void;
}

const AVATAR_PALETTES = [
  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  "bg-teal-500/15 text-teal-400 border-teal-500/30",
];

function formatLastActivity(isoString?: string): string {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    return `${d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}, ${timeStr}`;
  } catch {
    return "Recently";
  }
}

export function OrganisationStatusView({
  onViewDashboard,
  onEditOrganisation,
  onCreateOrganisation,
}: OrganisationStatusViewProps) {
  const router = useRouter();
  const [items, setItems] = useState<StatusCardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>("ALL");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedOrgForModal, setSelectedOrgForModal] = useState<StatusCardItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch real organisations from database/API
  const loadApiOrganisations = async () => {
    setLoading(true);
    try {
      const response = await getOrganisations({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        const apiItems: StatusCardItem[] = response.data.map((org: OrganisationListItem, index: number) => {
          const rawStatus = (org.status || "ACTIVE").toUpperCase();
          const status: StatusCardItem["status"] =
            rawStatus === "PENDING"
              ? "TRIAL"
              : rawStatus === "SUSPENDED" || rawStatus === "INACTIVE"
              ? "SUSPENDED"
              : rawStatus === "ACTIVE"
              ? "ACTIVE"
              : "TRIAL";

          const name = org.companyName || org.name || `Organisation #${index + 1}`;
          const words = name.trim().split(/\s+/);
          const initials =
            words.length >= 2
              ? (words[0][0] + words[1][0]).toUpperCase()
              : name.slice(0, 2).toUpperCase();

          const companyType = org.issuingAuthority
            ? `${org.companyType || "Mainland"} | ${org.issuingAuthority}`
            : org.companyType
            ? org.companyType
            : org.primaryLocation || "Mainland | DED";

          return {
            id: org.id,
            name,
            initials,
            avatarColor: AVATAR_PALETTES[index % AVATAR_PALETTES.length],
            status,
            companyType,
            superAdminsCount: org.superAdmin ? 1 : Math.max(1, (org.totalUsers || 1)),
            usersCount: org.totalUsers || (org.users?.length || 1),
            storageUsedPercent: Math.min(95, 20 + ((index * 13) % 55)),
            lastActivity: formatLastActivity(org.updatedAt || org.createdAt),
            health:
              status === "SUSPENDED"
                ? "suspended"
                : status === "TRIAL"
                ? "warning"
                : "healthy",
            healthText:
              status === "SUSPENDED"
                ? "Access Suspended"
                : status === "TRIAL"
                ? "Limited Usage"
                : "System Healthy",
            databaseName: org.databaseName,
            subdomain: org.subdomain,
            primaryLocation: org.primaryLocation,
            superAdminEmail: org.superAdmin?.email || `admin@${org.subdomain || "tenant"}.ae`,
            superAdminPhone: org.superAdmin?.phoneNumber || "+971 50 123 4567",
          };
        });

        setItems(apiItems);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to fetch organisations from database:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiOrganisations();
  }, []);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSubdomain = item.subdomain?.toLowerCase().includes(query);
        const matchesType = item.companyType.toLowerCase().includes(query);
        const matchesAdmin = item.superAdminEmail?.toLowerCase().includes(query);
        if (!matchesName && !matchesSubdomain && !matchesType && !matchesAdmin) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      // Company Type Filter
      if (companyTypeFilter !== "ALL") {
        if (!item.companyType.toLowerCase().includes(companyTypeFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, statusFilter, companyTypeFilter]);

  // Dynamic KPI Stats
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.status === "ACTIVE").length;
    const trial = items.filter((i) => i.status === "TRIAL").length;
    const suspended = items.filter((i) => i.status === "SUSPENDED").length;

    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
    const trialPct = total > 0 ? Math.round((trial / total) * 100) : 0;
    const suspendedPct = total > 0 ? Math.round((suspended / total) * 100) : 0;

    return {
      total,
      active,
      activePct,
      trial,
      trialPct,
      suspended,
      suspendedPct,
    };
  }, [items]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCompanyTypeFilter("ALL");
  };

  // Status Change Confirmation Modal State
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    org: StatusCardItem;
    nextStatus: StatusCardItem["status"];
  } | null>(null);
  const [statusConfirmError, setStatusConfirmError] = useState<string | null>(null);
  const [statusToggling, setStatusToggling] = useState(false);

  const handleRequestChangeStatus = (item: StatusCardItem, newStatus: StatusCardItem["status"]) => {
    setActiveMenuId(null);
    setStatusConfirmTarget({ org: item, nextStatus: newStatus });
    setStatusConfirmError(null);
  };

  const handleConfirmChangeStatus = async () => {
    if (!statusConfirmTarget) return;
    const { org: item, nextStatus } = statusConfirmTarget;
    const previousStatus = item.status;
    setStatusToggling(true);
    setStatusConfirmError(null);

    // Optimistic local state update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: nextStatus,
              health:
                nextStatus === "SUSPENDED"
                  ? "suspended"
                  : nextStatus === "TRIAL"
                  ? "warning"
                  : "healthy",
              healthText:
                nextStatus === "SUSPENDED"
                  ? "Access Suspended"
                  : nextStatus === "TRIAL"
                  ? "Limited Usage"
                  : "System Healthy",
            }
          : i
      )
    );

    // Call API update if it is a real database ID
    if (!item.id.startsWith("org-")) {
      try {
        const apiStatus =
          nextStatus === "SUSPENDED"
            ? "SUSPENDED"
            : nextStatus === "TRIAL"
            ? "PENDING"
            : "ACTIVE";
        await updateOrganisationStatus(item.id, apiStatus);
        setToastMessage(`Status for "${item.name}" updated to ${nextStatus}`);
        setTimeout(() => setToastMessage(null), 3000);
        setStatusConfirmTarget(null);
      } catch (err) {
        console.error("Failed to update status on API:", err);
        // Rollback on failure
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: previousStatus } : i))
        );
        const msg = err instanceof Error ? err.message : "Failed to update status on API";
        setStatusConfirmError(msg);
      } finally {
        setStatusToggling(false);
      }
    } else {
      setToastMessage(`Status for "${item.name}" updated to ${nextStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
      setStatusToggling(false);
      setStatusConfirmTarget(null);
    }
  };

  const handleNavigateDashboard = (item: StatusCardItem) => {
    if (onViewDashboard) {
      onViewDashboard(item);
    } else {
      router.push(`/dashboard?tenant=${encodeURIComponent(item.subdomain || item.id)}`);
    }
  };

  return (
    <div className="w-full space-y-6 select-none text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141720] text-white text-xs font-semibold px-4 py-3 rounded-xl border border-amber-500/40 shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Organisation Status
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Monitor the health and current status of all organisations across the platform.
        </p>
      </div>

      {/* 4 Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Organisations */}
        <div className="bg-[#12141a] rounded-2xl border border-[#1f232e] p-4 shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total Organisations
                </div>
                <div className="text-2xl font-black text-white leading-tight">
                  {stats.total}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1f232e] flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <span>▲</span> +2 this month
            </span>
            {/* Mini visual golden bar chart */}
            <div className="flex items-end gap-1 h-3.5">
              <span className="w-1 bg-amber-500/30 rounded-sm h-1.5" />
              <span className="w-1 bg-amber-500/50 rounded-sm h-2" />
              <span className="w-1 bg-amber-500/70 rounded-sm h-3" />
              <span className="w-1 bg-amber-400 rounded-sm h-3.5" />
            </div>
          </div>
        </div>

        {/* 2. Active Organisations */}
        <div className="bg-[#12141a] rounded-2xl border border-[#1f232e] p-4 shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active Organisations
                </div>
                <div className="text-2xl font-black text-white leading-tight">
                  {stats.active}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1f232e] flex items-center gap-2">
            <div className="flex-1 bg-[#1a1d27] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.activePct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-300 shrink-0">
              {stats.activePct}%
            </span>
          </div>
        </div>

        {/* 3. Trial Organisations */}
        <div className="bg-[#12141a] rounded-2xl border border-[#1f232e] p-4 shadow-sm hover:border-sky-500/30 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Trial Organisations
                </div>
                <div className="text-2xl font-black text-white leading-tight">
                  {stats.trial}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1f232e] flex items-center gap-2">
            <div className="flex-1 bg-[#1a1d27] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.trialPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-300 shrink-0">
              {stats.trialPct}%
            </span>
          </div>
        </div>

        {/* 4. Suspended Organisations */}
        <div className="bg-[#12141a] rounded-2xl border border-[#1f232e] p-4 shadow-sm hover:border-rose-500/30 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Suspended Organisations
                </div>
                <div className="text-2xl font-black text-white leading-tight">
                  {stats.suspended}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#1f232e] flex items-center gap-2">
            <div className="flex-1 bg-[#1a1d27] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.suspendedPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-rose-400 shrink-0">
              {stats.suspendedPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter / Search Toolbar */}
      <div className="bg-[#12141c] rounded-2xl border border-[#1f2332] p-4 shadow-sm flex flex-col md:flex-row items-end gap-3">
        {/* Search input */}
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organisation name, super admin, or trade licence..."
              className="w-full h-10 bg-[#161924] border border-[#232738] rounded-xl pl-9 pr-8 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/60 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns & Reset */}
        <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
          {/* Status Dropdown */}
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <label className="text-[11px] font-semibold text-slate-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 bg-[#161924] border border-[#232738] rounded-xl px-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500/60 cursor-pointer appearance-none pr-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Company Type Dropdown */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[11px] font-semibold text-slate-400">Company Type</label>
            <select
              value={companyTypeFilter}
              onChange={(e) => setCompanyTypeFilter(e.target.value)}
              className="h-10 bg-[#161924] border border-[#232738] rounded-xl px-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500/60 cursor-pointer appearance-none pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="ALL">All</option>
              <option value="Mainland">Mainland</option>
              <option value="Free Zone">Free Zone</option>
              <option value="Offshore">Offshore</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadApiOrganisations()}
            disabled={loading}
            className="h-10 border border-[#232738] bg-[#161924] hover:bg-[#1f2332] text-slate-300 hover:text-white px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleResetFilters}
            className="h-10 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Organisations Grid (4 columns × N rows) */}
      {loading ? (
        <div className="bg-[#12141c] rounded-2xl border border-[#1f2332] p-16 text-center space-y-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading organisations from database...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#12141c] rounded-2xl border border-[#1f2332] p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Organisations in Database</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are currently no organisations saved in the database. Create a new organisation to monitor its status here.
          </p>
          {onCreateOrganisation && (
            <button
              onClick={onCreateOrganisation}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-bold hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2"
            >
              <span>Create First Organisation</span>
            </button>
          )}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#12141c] rounded-2xl border border-[#1f2332] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No organisations match your filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or reset the filters to see all available organisations.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-bold hover:brightness-110 shadow-md shadow-amber-500/20"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredItems.map((org) => {
            const isMenuOpen = activeMenuId === org.id;
            const isSuspended = org.status === "SUSPENDED";

            return (
              <div
                key={org.id}
                className="bg-[#12141c] rounded-3xl border border-[#232738] p-5 sm:p-6 shadow-xl shadow-black/30 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 flex flex-col justify-between relative group"
              >
                {/* Top Section: Avatar, Title, Status Badge */}
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Circle Avatar Initials */}
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 border shadow-inner ${org.avatarColor}`}
                    >
                      {org.initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className="font-bold text-sm sm:text-base text-white truncate tracking-tight"
                          title={org.name}
                        >
                          {org.name}
                        </h3>
                        {/* Status Badge & Toggle Button Section */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Clickable Status Badge with Indicator */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus: StatusCardItem["status"] =
                                org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                              handleRequestChangeStatus(org, nextStatus);
                            }}
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 border transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                              org.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : org.status === "TRIAL"
                                ? "bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25"
                                : "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                            }`}
                            title={`Status: ${org.status}. Click to change status.`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                org.status === "ACTIVE"
                                  ? "bg-emerald-400 animate-pulse"
                                  : org.status === "TRIAL"
                                  ? "bg-sky-400"
                                  : "bg-rose-400"
                              }`}
                            />
                            <span>
                              {org.status === "ACTIVE"
                                ? "Active"
                                : org.status === "TRIAL"
                                ? "Trial"
                                : "Suspended"}
                            </span>
                          </button>

                          {/* Status Toggle Switch */}
                          <button
                            type="button"
                            role="switch"
                            id={`status-toggle-btn-${org.id}`}
                            data-testid="status-toggle-button"
                            aria-checked={org.status === "ACTIVE"}
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus: StatusCardItem["status"] =
                                org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                              handleRequestChangeStatus(org, nextStatus);
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                              org.status === "ACTIVE" ? "bg-emerald-500" : "bg-[#282d3e]"
                            }`}
                            title={
                              org.status === "ACTIVE"
                                ? "Click to suspend organisation"
                                : "Click to activate organisation"
                            }
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                org.status === "ACTIVE" ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">
                        {org.companyType}
                      </p>
                    </div>
                  </div>

                  {/* Middle Metric Bar (Super Admins, Users, Storage Used) */}
                  <div className="mt-5 py-3 px-3.5 rounded-2xl bg-[#161924]/90 border border-[#232738] grid grid-cols-3 gap-2 text-center shadow-inner">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Super Admins</div>
                      <div
                        className={`text-sm font-bold flex items-center justify-center gap-1.5 mt-1 ${
                          isSuspended && org.superAdminsCount === 0
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        <UserCheck
                          className={`h-3.5 w-3.5 ${
                            isSuspended && org.superAdminsCount === 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        />
                        <span>{org.superAdminsCount}</span>
                      </div>
                    </div>
                    <div className="border-x border-[#232738]">
                      <div className="text-[11px] text-slate-400 font-medium">Users</div>
                      <div
                        className={`text-sm font-bold flex items-center justify-center gap-1.5 mt-1 ${
                          isSuspended && org.usersCount === 0
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        <Users
                          className={`h-3.5 w-3.5 ${
                            isSuspended && org.usersCount === 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        />
                        <span>{org.usersCount}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Storage Used</div>
                      <div
                        className={`text-sm font-bold flex items-center justify-center gap-1.5 mt-1 ${
                          isSuspended && org.storageUsedPercent === 0
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        <Cloud
                          className={`h-3.5 w-3.5 ${
                            isSuspended && org.storageUsedPercent === 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        />
                        <span>{org.storageUsedPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity & System Health Row */}
                  <div className="mt-4 pt-1 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 truncate" title={org.lastActivity}>
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{org.lastActivity}</span>
                    </div>

                    {/* Health Status Indicator Pill */}
                    <div
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 border ${
                        org.health === "healthy"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : org.health === "warning"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          org.health === "healthy"
                            ? "bg-emerald-400 animate-pulse"
                            : org.health === "warning"
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        }`}
                      />
                      <span>{org.healthText}</span>
                    </div>
                  </div>
                </div>

                {/* Action Footer: View Dashboard + 3-Dots Menu */}
                <div className="mt-5 pt-4 border-t border-[#232738] flex items-center gap-2.5 relative">
                  <button
                    onClick={() => handleNavigateDashboard(org)}
                    className="flex-1 h-10 px-4 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/25 hover:to-amber-500/15 text-amber-400 hover:text-amber-300 font-bold text-xs sm:text-sm text-center transition-all duration-200 flex items-center justify-center gap-2 shadow-sm underline-offset-2 hover:underline"
                  >
                    <span>View Dashboard</span>
                  </button>

                  {/* Three Dots Button */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(isMenuOpen ? null : org.id)}
                      className="h-10 w-10 rounded-xl border border-[#262a38] bg-[#161924] text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center shadow-sm"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-1 w-48 bg-[#141720] border border-[#262a38] rounded-xl shadow-2xl py-1 z-30 text-xs text-slate-200 animate-fade-in">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setSelectedOrgForModal(org);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-[#1f232e] flex items-center gap-2 font-medium"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            if (onEditOrganisation) onEditOrganisation(org.id);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-[#1f232e] flex items-center gap-2 font-medium"
                        >
                          <Edit className="h-3.5 w-3.5 text-slate-400" />
                          <span>Edit Organisation</span>
                        </button>

                        <div className="my-1 border-t border-[#1f232e]" />

                        {/* Status Toggle Options */}
                        <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
                          Set Status:
                        </div>
                        {org.status !== "ACTIVE" && (
                          <button
                            onClick={() => handleRequestChangeStatus(org, "ACTIVE")}
                            className="w-full px-3.5 py-1.5 text-left hover:bg-emerald-500/10 text-emerald-400 flex items-center gap-2"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Active</span>
                          </button>
                        )}
                        {org.status !== "TRIAL" && (
                          <button
                            onClick={() => handleRequestChangeStatus(org, "TRIAL")}
                            className="w-full px-3.5 py-1.5 text-left hover:bg-sky-500/10 text-sky-400 flex items-center gap-2"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Mark Trial</span>
                          </button>
                        )}
                        {org.status !== "SUSPENDED" && (
                          <button
                            onClick={() => handleRequestChangeStatus(org, "SUSPENDED")}
                            className="w-full px-3.5 py-1.5 text-left hover:bg-rose-500/10 text-rose-400 flex items-center gap-2"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Suspend Access</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedOrgForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12141a] rounded-3xl border border-[#262a38] max-w-lg w-full p-6 shadow-2xl relative animate-fade-in text-slate-200">
            <button
              onClick={() => setSelectedOrgForModal(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#181a24]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm border ${selectedOrgForModal.avatarColor}`}
              >
                {selectedOrgForModal.initials}
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  {selectedOrgForModal.name}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedOrgForModal.companyType}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-[#161822] p-4 rounded-2xl border border-[#1f232e]">
              <div className="flex justify-between py-1 border-b border-[#232733]">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-white">{selectedOrgForModal.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#232733]">
                <span className="text-slate-400">Subdomain</span>
                <span className="font-mono text-amber-400">
                  {selectedOrgForModal.subdomain || "tenant"}.omniexpiry.io
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#232733]">
                <span className="text-slate-400">Database Name</span>
                <span className="font-mono text-slate-300">
                  {selectedOrgForModal.databaseName || "tenant_dedicated_db"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#232733]">
                <span className="text-slate-400">Primary Location</span>
                <span className="text-slate-200 font-medium">
                  {selectedOrgForModal.primaryLocation || "Dubai, UAE"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#232733]">
                <span className="text-slate-400">Super Admin Email</span>
                <span className="text-slate-200 font-medium">
                  {selectedOrgForModal.superAdminEmail || "admin@company.ae"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Super Admin Phone</span>
                <span className="text-slate-200 font-medium">
                  {selectedOrgForModal.superAdminPhone || "+971 50 000 0000"}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedOrgForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#181a24]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = selectedOrgForModal;
                  setSelectedOrgForModal(null);
                  handleNavigateDashboard(target);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
              >
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Status Change Confirmation Modal */}
      {statusConfirmTarget && (
        <ConfirmationModal
          isOpen={!!statusConfirmTarget}
          onClose={() => {
            if (!statusToggling) {
              setStatusConfirmTarget(null);
              setStatusConfirmError(null);
            }
          }}
          onConfirm={handleConfirmChangeStatus}
          error={statusConfirmError}
          title={
            statusConfirmTarget.nextStatus === "ACTIVE"
              ? "Mark Organisation Active?"
              : statusConfirmTarget.nextStatus === "TRIAL"
              ? "Mark Organisation as Trial?"
              : "Suspend Organisation Access?"
          }
          subtitle={
            statusConfirmTarget.nextStatus === "ACTIVE"
              ? "This will restore system health status and active usage permissions for this organisation."
              : statusConfirmTarget.nextStatus === "TRIAL"
              ? "This will set this organisation to limited trial mode."
              : "This will suspend platform and portal login privileges for this organisation."
          }
          variant={
            statusConfirmTarget.nextStatus === "ACTIVE"
              ? "success"
              : statusConfirmTarget.nextStatus === "TRIAL"
              ? "warning"
              : "danger"
          }
          icon={
            statusConfirmTarget.nextStatus === "ACTIVE" ? (
              <Check className="h-5 w-5 text-emerald-400" />
            ) : statusConfirmTarget.nextStatus === "TRIAL" ? (
              <Clock className="h-5 w-5 text-amber-400" />
            ) : (
              <Ban className="h-5 w-5 text-rose-400" />
            )
          }
          confirmText={
            statusConfirmTarget.nextStatus === "ACTIVE"
              ? "Yes, Mark Active"
              : statusConfirmTarget.nextStatus === "TRIAL"
              ? "Yes, Set as Trial"
              : "Yes, Suspend Access"
          }
          cancelText="Cancel"
          isLoading={statusToggling}
          entityPreview={{
            avatarText: statusConfirmTarget.org.initials,
            avatarBg: statusConfirmTarget.org.avatarColor,
            title: statusConfirmTarget.org.name,
            subtitle: `${statusConfirmTarget.org.subdomain || "tenant"}.mytask.ae • ${
              statusConfirmTarget.org.primaryLocation || "UAE"
            }`,
            badges: [
              {
                text: `Current: ${statusConfirmTarget.org.status}`,
                variant: statusConfirmTarget.org.status === "ACTIVE" ? "success" : "default",
              },
              {
                text: `New: ${statusConfirmTarget.nextStatus}`,
                variant:
                  statusConfirmTarget.nextStatus === "ACTIVE"
                    ? "success"
                    : statusConfirmTarget.nextStatus === "TRIAL"
                    ? "warning"
                    : "danger",
              },
            ],
          }}
          consequences={
            statusConfirmTarget.nextStatus === "ACTIVE"
              ? [
                  {
                    text: `Tenant system health will be marked as Healthy.`,
                    type: "positive",
                  },
                  {
                    text: `All users and super admins can freely access the dashboard and tools.`,
                    type: "positive",
                  },
                ]
              : statusConfirmTarget.nextStatus === "TRIAL"
              ? [
                  {
                    text: `Organisation will operate under limited trial quota guidelines.`,
                    type: "warning",
                  },
                  {
                    text: `System status will reflect Limited Usage.`,
                    type: "neutral",
                  },
                ]
              : [
                  {
                    text: `Users belonging to this organisation will have access suspended.`,
                    type: "danger",
                  },
                  {
                    text: `Database records and customer data will remain intact and safely preserved.`,
                    type: "neutral",
                  },
                ]
          }
        />
      )}
    </div>
  );
}
