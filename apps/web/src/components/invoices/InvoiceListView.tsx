"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Download,
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RotateCcw,
  Calendar,
  Eye,
  Trash2,
} from "lucide-react";
import {
  ProformaInvoiceData,
  fetchProformas,
  deleteProforma,
} from "@/services/proforma.service";
import { ProformaInvoiceModal } from "@/components/proforma/ProformaInvoiceModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAuth } from "@/context/AuthContext";

interface InvoiceListViewProps {
  orgId?: string;
  orgSubdomain?: string;
  userRole?: string;
  onCreateInvoice?: () => void;
}

type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Draft" | "ALL";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Derive a display status from the proforma status.
 * In a real app this would come from a dedicated invoice status field.
 */
function deriveStatus(inv: ProformaInvoiceData): InvoiceStatus {
  switch (inv.status) {
    case "CONVERTED_TO_WORK":
      return "Paid";
    case "ISSUED":
      return "Pending";
    case "CANCELLED":
      return "Overdue";
    default:
      return "Draft";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function addDays(iso: string, days: number): string {
  try {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return formatDate(d.toISOString());
  } catch {
    return "—";
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, string> = {
    Paid: "bg-green-100 text-green-700 border-green-200",
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Overdue: "bg-red-100 text-red-600 border-red-200",
    Draft: "bg-slate-100 text-slate-500 border-slate-200",
    ALL: "",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}
    >
      {status}
    </span>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  trend?: { value: string; up: boolean };
  sub: string;
}

function StatCard({ icon, iconBg, label, value, trend, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start gap-3 min-w-0">
      <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
          <span className="text-2xl font-black text-slate-900 tracking-tight">{value}</span>
          {trend && (
            <span
              className={`text-[11px] font-bold flex items-center gap-0.5 ${
                trend.up ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export function InvoiceListView({
  orgId,
  orgSubdomain,
  userRole: userRoleProp,
  onCreateInvoice,
}: InvoiceListViewProps) {
  const { user } = useAuth();
  const effectiveRole = userRoleProp || user?.role;
  const isSuperAdmin = effectiveRole === "SUPER_ADMIN" || effectiveRole === "PLATFORM_OWNER";

  const [invoices, setInvoices] = useState<ProformaInvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>("ALL");
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [staffFilter, setStaffFilter] = useState("All Staff");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProformaId, setSelectedProformaId] = useState<string | null>(null);

  // Actions dropdown & delete state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<ProformaInvoiceData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss feedback message after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleConfirmDelete = async () => {
    if (!deletingInvoice) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteProforma(deletingInvoice.id);
      if (res.success) {
        setInvoices((prev) => prev.filter((i) => i.id !== deletingInvoice.id));
        setFeedback({
          message: `Invoice "${deletingInvoice.proformaNumber}" was deleted successfully.`,
          type: "success",
        });
        setDeletingInvoice(null);
      } else {
        setDeleteError(res.message || "Failed to delete invoice");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchProformas(orgId || orgSubdomain);
        if (mounted) setInvoices(data);
      } catch (err) {
        console.warn("Failed to load invoices:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter((i) => deriveStatus(i) === "Paid").length;
    const pending = invoices.filter((i) => deriveStatus(i) === "Pending").length;
    const overdue = invoices.filter((i) => deriveStatus(i) === "Overdue").length;
    const totalAmount = invoices.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
    return { total, paid, pending, overdue, totalAmount };
  }, [invoices]);

  // ── Unique services / staff ────────────────────────────────────────────────
  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) =>
      inv.client?.services?.forEach((s) => {
        if (s.serviceItem?.name) set.add(s.serviceItem.name);
      })
    );
    return ["All Services", ...Array.from(set)];
  }, [invoices]);

  const staffOptions = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      const name = inv.generatedBy?.fullName || inv.generatedBy?.username;
      if (name) set.add(name);
    });
    return ["All Staff", ...Array.from(set)];
  }, [invoices]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return invoices.filter((inv) => {
      const clientName = inv.client?.contactPerson || "";
      const company = inv.client?.companyName || "";
      const proformaNum = inv.proformaNumber || "";
      const status = deriveStatus(inv);
      const staffName = inv.generatedBy?.fullName || inv.generatedBy?.username || "";

      const matchesSearch =
        !q ||
        clientName.toLowerCase().includes(q) ||
        company.toLowerCase().includes(q) ||
        proformaNum.toLowerCase().includes(q) ||
        inv.client?.clientNumber?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      const matchesService =
        serviceFilter === "All Services" ||
        inv.client?.services?.some((s) => s.serviceItem?.name === serviceFilter);

      const matchesStaff =
        staffFilter === "All Staff" ||
        staffName === staffFilter;

      return matchesSearch && matchesStatus && matchesService && matchesStaff;
    });
  }, [invoices, searchQuery, statusFilter, serviceFilter, staffFilter]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedInvoices = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleReset = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setServiceFilter("All Services");
    setStaffFilter("All Staff");
    setDateFilter("All Dates");
    setCurrentPage(1);
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    }
    return pages;
  }, [totalPages]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="w-full pb-20 select-none font-sans">
      {/* ── Header ── */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage client invoices, payments and outstanding amounts.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
            title="Export invoices list"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          {/* Create Invoice button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            onClick={onCreateInvoice}
            title="Create a new invoice"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* ── Feedback Notification ── */}
      {feedback && (
        <div
          className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs ml-4 cursor-pointer"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
        <StatCard
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50 border border-blue-100"
          label="Total Invoices"
          value={stats.total}
          trend={{ value: "12%", up: true }}
          sub="All invoices"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50 border border-emerald-100"
          label="Paid Invoices"
          value={stats.paid}
          trend={{ value: "8%", up: true }}
          sub="Successfully paid"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          iconBg="bg-amber-50 border border-amber-100"
          label="Pending Invoices"
          value={stats.pending}
          trend={{ value: "5%", up: false }}
          sub="Awaiting payment"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}
          iconBg="bg-rose-50 border border-rose-100"
          label="Overdue Invoices"
          value={stats.overdue}
          trend={{ value: "12%", up: true }}
          sub="Payment overdue"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50 border border-purple-100"
          label="Total Amount (AED)"
          value={stats.totalAmount.toLocaleString("en-US")}
          sub="Invoice value"
        />
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by client name, invoice no. or company..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as InvoiceStatus);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-orange-400 focus:outline-none"
        >
          {(["ALL", "Paid", "Pending", "Overdue", "Draft"] as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All Status" : s}
            </option>
          ))}
        </select>

        {/* Service filter */}
        <select
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-orange-400 focus:outline-none"
        >
          {serviceOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Staff filter */}
        <select
          value={staffFilter}
          onChange={(e) => {
            setStaffFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 font-medium focus:border-orange-400 focus:outline-none"
        >
          {staffOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Date filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
          >
            {["All Dates", "Today", "This Week", "This Month", "Last 3 Months"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[130px]">Invoice No.</th>
                <th className="py-3 px-4 min-w-[180px]">Client Name</th>
                <th className="py-3 px-4 min-w-[120px]">Client ID</th>
                <th className="py-3 px-4 min-w-[140px]">Service</th>
                <th className="py-3 px-4 min-w-[110px] text-right">Amount (AED)</th>
                <th className="py-3 px-4 min-w-[110px]">Issue Date</th>
                <th className="py-3 px-4 min-w-[110px]">Due Date</th>
                <th className="py-3 px-4 min-w-[100px] text-center">Status</th>
                <th className="py-3 px-4 min-w-[130px]">Staff</th>
                <th className="py-3 px-4 w-12 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    <p className="mt-2 text-xs">Loading invoices...</p>
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const status = deriveStatus(inv);
                  const clientName = inv.client?.contactPerson || "—";
                  const company = inv.client?.companyName || "";
                  const clientId = inv.client?.clientNumber || "—";
                  const amount = Number(inv.grandTotal || 0);
                  const serviceName =
                    inv.client?.services?.[0]?.serviceItem?.name || "—";
                  const issueDate = formatDate(inv.createdAt);
                  const dueDate = addDays(inv.createdAt, 10);
                  const staffName =
                    inv.generatedBy?.fullName || inv.generatedBy?.username || "—";
                  const staffInitials = getInitials(staffName);
                  const clientInitials = getInitials(clientName);
                  const clientColor = avatarColor(inv.clientId || clientName);
                  const staffColor = avatarColor(staffName);

                  // Service badge colour
                  const serviceBadgeColor =
                    serviceName === "—"
                      ? "bg-slate-100 text-slate-500"
                      : serviceName.toLowerCase().includes("visa") ||
                        serviceName.toLowerCase().includes("immigration") ||
                        serviceName.toLowerCase().includes("sponsor")
                      ? "bg-purple-100 text-purple-700"
                      : serviceName.toLowerCase().includes("banking") ||
                        serviceName.toLowerCase().includes("document")
                      ? "bg-blue-100 text-blue-700"
                      : serviceName.toLowerCase().includes("pro") ||
                        serviceName.toLowerCase().includes("license")
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700";

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedProformaId(inv.id)}
                    >
                      {/* # */}
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {globalIdx}
                      </td>

                      {/* Invoice No. */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 text-[11px] whitespace-nowrap">
                        {inv.proformaNumber}
                      </td>

                      {/* Client Name — FIRST COLUMN after invoice no. */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${clientColor}`}
                          >
                            {clientInitials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 leading-tight">
                              {clientName}
                            </div>
                            {company && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                {company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-500">{clientId}</span>
                      </td>

                      {/* Service */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${serviceBadgeColor}`}
                        >
                          {serviceName}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {amount.toLocaleString("en-US")}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{issueDate}</td>

                      {/* Due Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{dueDate}</td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={status} />
                      </td>

                      {/* Staff */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${staffColor}`}
                          >
                            {staffInitials}
                          </div>
                          <span className="text-slate-700 font-medium">{staffName}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSuperAdmin ? (
                          <div className="relative inline-flex items-center justify-center">
                            <button
                              type="button"
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                activeMenuId === inv.id
                                  ? "bg-slate-100 text-slate-800 ring-2 ring-slate-200"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === inv.id ? null : inv.id);
                              }}
                              title="Actions"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeMenuId === inv.id && (
                              <>
                                {/* Fixed transparent backdrop to capture clicks anywhere outside */}
                                <div
                                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                  }}
                                />

                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className={`absolute right-0 ${
                                    idx >= paginatedInvoices.length - 2 && paginatedInvoices.length > 2
                                      ? "bottom-full mb-1"
                                      : "top-full mt-1"
                                  } w-44 rounded-xl bg-white dark:bg-[#161822] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 text-left`}
                                >
                                  {/* Preview Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setSelectedProformaId(inv.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Preview invoice quotation"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                    <span>Preview Invoice</span>
                                  </button>

                                  {/* Delete Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setDeleteError(null);
                                      setDeletingInvoice(inv);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Delete invoice quotation"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span>Delete Invoice</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            onClick={() => setSelectedProformaId(inv.id)}
                            title="Preview Invoice"
                            aria-label="Preview Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white">
            {/* Count */}
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * pageSize, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">{filtered.length}</span> invoices
            </p>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageNumbers.map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p as number)}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === p
                        ? "bg-orange-500 text-white border border-orange-500"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Per-page */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Show
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-orange-400"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              per page
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deletingInvoice && (
        <ConfirmationModal
          isOpen={Boolean(deletingInvoice)}
          onClose={() => {
            setDeletingInvoice(null);
            setDeleteError(null);
          }}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          title="Delete Invoice"
          subtitle={`Are you sure you want to permanently delete invoice ${deletingInvoice.proformaNumber}?`}
          variant="danger"
          confirmText="Delete Invoice"
          cancelText="Cancel"
          isLoading={isDeleting}
          entityPreview={{
            avatarText: "INV",
            title: deletingInvoice.proformaNumber,
            subtitle: `${
              deletingInvoice.client?.companyName ||
              deletingInvoice.client?.contactPerson ||
              "Client"
            } • AED ${Number(deletingInvoice.grandTotal || 0).toLocaleString()}`,
            badges: [
              {
                text: deriveStatus(deletingInvoice),
                variant:
                  deriveStatus(deletingInvoice) === "Paid"
                    ? "success"
                    : deriveStatus(deletingInvoice) === "Pending"
                    ? "warning"
                    : "danger",
              },
            ],
          }}
          consequences={[
            {
              text: "This invoice quotation will be permanently deleted from the database.",
              type: "danger",
            },
            {
              text: "Associated quotation data and reference numbers will no longer be available.",
              type: "warning",
            },
          ]}
        />
      )}

      {/* ── Modal ── */}
      {selectedProformaId && (
        <ProformaInvoiceModal
          isOpen={Boolean(selectedProformaId)}
          proformaId={selectedProformaId}
          onClose={() => setSelectedProformaId(null)}
        />
      )}
    </div>
  );
}

