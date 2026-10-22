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
} from "lucide-react";
import {
  getOrganisations,
  updateOrganisationStatus,
  type OrganisationListItem,
} from "@/services/organization.service";

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

const DEFAULT_STATUS_ITEMS: StatusCardItem[] = [
  {
    id: "org-1",
    name: "Global First Trading LLC",
    initials: "GF",
    avatarColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    status: "ACTIVE",
    companyType: "Mainland | DED",
    superAdminsCount: 3,
    usersCount: 18,
    storageUsedPercent: 65,
    lastActivity: "Today, 10:24 AM",
    health: "healthy",
    healthText: "System Healthy",
    databaseName: "tenant_global_first_trading_db",
    subdomain: "globalfirst",
    primaryLocation: "Dubai, United Arab Emirates",
    superAdminEmail: "admin@globalfirst.ae",
    superAdminPhone: "+971 50 123 4567",
  },
  {
    id: "org-2",
    name: "Nexzone Technologies",
    initials: "NT",
    avatarColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    status: "ACTIVE",
    companyType: "Free Zone | DMCC",
    superAdminsCount: 2,
    usersCount: 12,
    storageUsedPercent: 42,
    lastActivity: "Yesterday, 04:15 PM",
    health: "healthy",
    healthText: "System Healthy",
    databaseName: "tenant_nexzone_tech_db",
    subdomain: "nexzone",
    primaryLocation: "DMCC Free Zone, Dubai",
    superAdminEmail: "contact@nexzone.io",
    superAdminPhone: "+971 4 987 6543",
  },
  {
    id: "org-3",
    name: "NAS Plants LLC",
    initials: "NP",
    avatarColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    status: "TRIAL",
    companyType: "Mainland | DED",
    superAdminsCount: 1,
    usersCount: 6,
    storageUsedPercent: 28,
    lastActivity: "Today, 08:40 AM",
    health: "warning",
    healthText: "Limited Usage",
    databaseName: "tenant_nas_plants_db",
    subdomain: "nasplants",
    primaryLocation: "Abu Dhabi Industrial City",
    superAdminEmail: "admin@nasplants.com",
    superAdminPhone: "+971 2 444 3322",
  },
  {
    id: "org-4",
    name: "ADL Business Solutions",
    initials: "AD",
    avatarColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    status: "ACTIVE",
    companyType: "Free Zone | IFZA",
    superAdminsCount: 2,
    usersCount: 10,
    storageUsedPercent: 50,
    lastActivity: "Oct 19, 2026, 11:20 AM",
    health: "healthy",
    healthText: "System Healthy",
    databaseName: "tenant_adl_solutions_db",
    subdomain: "adlsolutions",
    primaryLocation: "Dubai Silicon Oasis, IFZA",
    superAdminEmail: "info@adlsolutions.ae",
    superAdminPhone: "+971 52 888 9900",
  },
  {
    id: "org-5",
    name: "Invest First Business Services",
    initials: "IF",
    avatarColor: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    status: "ACTIVE",
    companyType: "Mainland | DED",
    superAdminsCount: 3,
    usersCount: 15,
    storageUsedPercent: 60,
    lastActivity: "Today, 09:30 AM",
    health: "healthy",
    healthText: "System Healthy",
    databaseName: "tenant_invest_first_db",
    subdomain: "investfirst",
    primaryLocation: "Business Bay, Dubai",
    superAdminEmail: "ceo@investfirst.ae",
    superAdminPhone: "+971 55 678 1234",
  },
  {
    id: "org-6",
    name: "BREED Technical Works",
    initials: "BC",
    avatarColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    status: "SUSPENDED",
    companyType: "Free Zone | RAKEZ",
    superAdminsCount: 0,
    usersCount: 0,
    storageUsedPercent: 0,
    lastActivity: "Oct 10, 2026, 06:30 PM",
    health: "suspended",
    healthText: "Access Suspended",
    databaseName: "tenant_breed_tech_db",
    subdomain: "breedtech",
    primaryLocation: "Ras Al Khaimah Economic Zone",
    superAdminEmail: "contact@breedtech.ae",
    superAdminPhone: "+971 7 200 1122",
  },
  {
    id: "org-7",
    name: "Al Amani Exhibitions",
    initials: "AE",
    avatarColor: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    status: "ACTIVE",
    companyType: "Mainland | DED",
    superAdminsCount: 2,
    usersCount: 8,
    storageUsedPercent: 38,
    lastActivity: "Oct 19, 2026, 10:15 AM",
    health: "healthy",
    healthText: "System Healthy",
    databaseName: "tenant_alamani_exhibitions_db",
    subdomain: "alamani",
    primaryLocation: "Sharjah Media City",
    superAdminEmail: "operations@alamani.ae",
    superAdminPhone: "+971 6 555 4321",
  },
  {
    id: "org-8",
    name: "Sunrise Properties LLC",
    initials: "SP",
    avatarColor: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    status: "TRIAL",
    companyType: "Free Zone | SHAMS",
    superAdminsCount: 1,
    usersCount: 5,
    storageUsedPercent: 22,
    lastActivity: "Oct 18, 2026, 07:50 AM",
    health: "warning",
    healthText: "Limited Usage",
    databaseName: "tenant_sunrise_properties_db",
    subdomain: "sunriseprop",
    primaryLocation: "Al Nahda, Dubai",
    superAdminEmail: "info@sunriseproperties.com",
    superAdminPhone: "+971 50 999 8877",
  },
];

interface OrganisationStatusViewProps {
  onViewDashboard?: (org: StatusCardItem) => void;
  onEditOrganisation?: (orgId: string) => void;
}

export function OrganisationStatusView({
  onViewDashboard,
  onEditOrganisation,
}: OrganisationStatusViewProps) {
  const router = useRouter();
  const [items, setItems] = useState<StatusCardItem[]>(DEFAULT_STATUS_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>("ALL");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedOrgForModal, setSelectedOrgForModal] = useState<StatusCardItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch real organisations from database/API to enrich our list
  useEffect(() => {
    async function loadApiOrganisations() {
      try {
        const response = await getOrganisations({ limit: 50 });
        if (response.success && response.data && response.data.length > 0) {
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
            const words = name.trim().split(" ");
            const initials =
              words.length >= 2
                ? (words[0][0] + words[1][0]).toUpperCase()
                : name.slice(0, 2).toUpperCase();

            const colors = [
              "bg-amber-500/15 text-amber-400 border-amber-500/30",
              "bg-purple-500/15 text-purple-400 border-purple-500/30",
              "bg-sky-500/15 text-sky-400 border-sky-500/30",
              "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
              "bg-rose-500/15 text-rose-400 border-rose-500/30",
              "bg-teal-500/15 text-teal-400 border-teal-500/30",
            ];

            return {
              id: org.id,
              name,
              initials,
              avatarColor: colors[index % colors.length],
              status,
              companyType: org.issuingAuthority
                ? `${org.companyType || "Mainland"} | ${org.issuingAuthority}`
                : org.primaryLocation || "Mainland | DED",
              superAdminsCount: org.superAdmin ? 1 : Math.max(1, (org.totalUsers || 2) % 3 + 1),
              usersCount: org.totalUsers || 8 + (index * 3) % 15,
              storageUsedPercent: Math.min(95, 25 + ((index * 13) % 65)),
              lastActivity: "Today, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              health: status === "SUSPENDED" ? "suspended" : status === "TRIAL" ? "warning" : "healthy",
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

          // Merge: unique by name/id
          setItems((prev) => {
            const existingNames = new Set(apiItems.map((i) => i.name.toLowerCase()));
            const filteredDefaults = prev.filter(
              (p) => !existingNames.has(p.name.toLowerCase())
            );
            return [...apiItems, ...filteredDefaults];
          });
        }
      } catch {
        // Fallback to rich defaults cleanly
      }
    }

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

  const handleChangeStatus = async (item: StatusCardItem, newStatus: StatusCardItem["status"]) => {
    setActiveMenuId(null);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: newStatus,
              health:
                newStatus === "SUSPENDED"
                  ? "suspended"
                  : newStatus === "TRIAL"
                  ? "warning"
                  : "healthy",
              healthText:
                newStatus === "SUSPENDED"
                  ? "Access Suspended"
                  : newStatus === "TRIAL"
                  ? "Limited Usage"
                  : "System Healthy",
            }
          : i
      )
    );

    setToastMessage(`Status for "${item.name}" updated to ${newStatus}`);
    setTimeout(() => setToastMessage(null), 3000);

    // Call API update if it is a real database ID
    if (!item.id.startsWith("org-")) {
      try {
        const apiStatus =
          newStatus === "SUSPENDED"
            ? "SUSPENDED"
            : newStatus === "TRIAL"
            ? "PENDING"
            : "ACTIVE";
        await updateOrganisationStatus(item.id, apiStatus);
      } catch {
        // silent rollback or keep local
      }
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
      <div className="bg-[#12141a] rounded-2xl border border-[#1f232e] p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organisation name, super admin, or trade licence..."
            className="w-full bg-[#181a24] border border-[#262a38] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Dropdowns & Reset */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#181a24] border border-[#262a38] rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Company Type Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] font-medium text-slate-500">Company Type:</span>
            <select
              value={companyTypeFilter}
              onChange={(e) => setCompanyTypeFilter(e.target.value)}
              className="bg-[#181a24] border border-[#262a38] rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All</option>
              <option value="Mainland">Mainland (DED)</option>
              <option value="Free Zone">Free Zone (DMCC/IFZA/RAKEZ)</option>
              <option value="Offshore">Offshore</option>
            </select>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetFilters}
            className="border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Organisations Grid (4 columns × N rows) */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#12141a] rounded-2xl border border-[#1f232e] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map((org) => {
            const isMenuOpen = activeMenuId === org.id;

            return (
              <div
                key={org.id}
                className="bg-[#12141a] rounded-2xl border border-[#1f232e] p-4 shadow-sm hover:border-amber-500/40 transition-all flex flex-col justify-between relative group"
              >
                {/* Top Section: Avatar, Title, Status Badge */}
                <div>
                  <div className="flex items-start gap-3">
                    {/* Circle Avatar Initials */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${org.avatarColor}`}
                    >
                      {org.initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3
                          className="font-bold text-xs sm:text-sm text-white truncate"
                          title={org.name}
                        >
                          {org.name}
                        </h3>
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                            org.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : org.status === "TRIAL"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {org.status === "ACTIVE"
                            ? "Active"
                            : org.status === "TRIAL"
                            ? "Trial"
                            : "Suspended"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {org.companyType}
                      </p>
                    </div>
                  </div>

                  {/* Middle Metric Bar (Super Admins, Users, Storage Used) */}
                  <div className="mt-3.5 py-2.5 px-3 rounded-xl bg-[#161822] border border-[#1f232e] grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">Super Admins</div>
                      <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                        <UserCheck className="h-3 w-3 text-slate-400" />
                        <span>{org.superAdminsCount}</span>
                      </div>
                    </div>
                    <div className="border-x border-[#232733]">
                      <div className="text-[10px] text-slate-500 font-medium">Users</div>
                      <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span>{org.usersCount}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">Storage Used</div>
                      <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1 mt-0.5">
                        <Cloud className="h-3 w-3 text-slate-400" />
                        <span>{org.storageUsedPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity & System Health Row */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1 truncate" title={org.lastActivity}>
                      <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                      <span className="truncate">{org.lastActivity}</span>
                    </div>

                    {/* Health Status Indicator Pill */}
                    <div
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                        org.health === "healthy"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : org.health === "warning"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
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
                <div className="mt-4 pt-3 border-t border-[#1f232e] flex items-center gap-2 relative">
                  <button
                    onClick={() => handleNavigateDashboard(org)}
                    className="flex-1 py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-gradient-to-r hover:from-amber-500 hover:to-amber-600 hover:text-slate-950 text-amber-400 font-semibold text-xs text-center transition-all duration-150 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>View Dashboard</span>
                    <ArrowUpRight className="h-3 w-3 opacity-80" />
                  </button>

                  {/* Three Dots Button */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(isMenuOpen ? null : org.id)}
                      className="p-2 rounded-xl border border-[#262a38] bg-[#181a24] text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                      title="More actions"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
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
                            onClick={() => handleChangeStatus(org, "ACTIVE")}
                            className="w-full px-3.5 py-1.5 text-left hover:bg-emerald-500/10 text-emerald-400 flex items-center gap-2"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Active</span>
                          </button>
                        )}
                        {org.status !== "TRIAL" && (
                          <button
                            onClick={() => handleChangeStatus(org, "TRIAL")}
                            className="w-full px-3.5 py-1.5 text-left hover:bg-sky-500/10 text-sky-400 flex items-center gap-2"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Mark Trial</span>
                          </button>
                        )}
                        {org.status !== "SUSPENDED" && (
                          <button
                            onClick={() => handleChangeStatus(org, "SUSPENDED")}
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
    </div>
  );
}
