"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Printer,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Building2,
  Plus,
} from "lucide-react";
import { ProformaInvoiceData, fetchProformas } from "@/services/proforma.service";
import { ProformaInvoiceModal } from "./ProformaInvoiceModal";

interface ProformaListViewProps {
  onCreateProforma?: () => void;
  orgId?: string;
  orgSubdomain?: string;
}

type PFStatus = "ALL" | "DRAFT" | "ISSUED" | "CONVERTED_TO_WORK" | "CANCELLED";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: {
      label: "Draft",
      cls: "bg-slate-100 text-slate-600 border-slate-200",
    },
    ISSUED: {
      label: "Issued",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
    },
    CONVERTED_TO_WORK: {
      label: "Converted",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    CANCELLED: {
      label: "Cancelled",
      cls: "bg-rose-50 text-rose-600 border-rose-200",
    },
  };
  const info = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${info.cls}`}>
      {info.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  sub: string;
}
function StatCard({ icon, iconBg, label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start gap-3 min-w-0">
      <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProformaListView({ orgId, orgSubdomain, onCreateProforma }: ProformaListViewProps) {
  const [invoices, setInvoices] = useState<ProformaInvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PFStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProformaId, setSelectedProformaId] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchProformas(orgId || orgSubdomain);
        if (mounted) setInvoices(data);
      } catch (err) {
        console.warn("Failed to load proforma invoices:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [orgId, orgSubdomain]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = invoices.length;
    const draft = invoices.filter((i) => i.status === "DRAFT").length;
    const issued = invoices.filter((i) => i.status === "ISSUED").length;
    const converted = invoices.filter((i) => i.status === "CONVERTED_TO_WORK").length;
    const cancelled = invoices.filter((i) => i.status === "CANCELLED").length;
    const totalValue = invoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    return { total, draft, issued, converted, cancelled, totalValue };
  }, [invoices]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.proformaNumber.toLowerCase().includes(q) ||
        (inv.client?.companyName?.toLowerCase().includes(q) ?? false) ||
        (inv.client?.contactPerson?.toLowerCase().includes(q) ?? false) ||
        (inv.client?.clientNumber?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    }
    return pages;
  }, [totalPages]);

  const STATUS_TABS: { key: PFStatus; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "DRAFT", label: "Draft" },
    { key: "ISSUED", label: "Issued" },
    { key: "CONVERTED_TO_WORK", label: "Converted" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full pb-20 select-none font-sans">
      {/* ── Header ── */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Proforma Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official proforma quotations generated for client service packages.
          </p>
        </div>
        {onCreateProforma && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCreateProforma}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Proforma Invoice</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
        <StatCard
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50 border border-blue-100"
          label="Total Proformas"
          value={stats.total}
          sub="All records"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-slate-500" />}
          iconBg="bg-slate-50 border border-slate-200"
          label="Draft"
          value={stats.draft}
          sub="Pending issue"
        />
        <StatCard
          icon={<Receipt className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50 border border-blue-100"
          label="Issued"
          value={stats.issued}
          sub="Sent to client"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50 border border-emerald-100"
          label="Converted"
          value={stats.converted}
          sub="To work order"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-rose-500" />}
          iconBg="bg-rose-50 border border-rose-100"
          label="Cancelled"
          value={stats.cancelled}
          sub="Void / cancelled"
        />
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Status tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-slate-100 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                statusFilter === tab.key
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.key !== "ALL" && (
                <span
                  className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    statusFilter === tab.key
                      ? "bg-orange-100 text-orange-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.key === "DRAFT"
                    ? stats.draft
                    : tab.key === "ISSUED"
                    ? stats.issued
                    : tab.key === "CONVERTED_TO_WORK"
                    ? stats.converted
                    : stats.cancelled}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + reset row */}
        <div className="flex items-center gap-3 p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by proforma no., client name, or company..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setCurrentPage(1);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[150px]">Proforma No.</th>
                <th className="py-3 px-4 min-w-[190px]">Client</th>
                <th className="py-3 px-4 min-w-[120px]">Client ID</th>
                <th className="py-3 px-4 min-w-[110px] text-right">Subtotal</th>
                <th className="py-3 px-4 min-w-[110px] text-right">Commission</th>
                <th className="py-3 px-4 min-w-[120px] text-right">Grand Total</th>
                <th className="py-3 px-4 min-w-[100px]">Issue Date</th>
                <th className="py-3 px-4 min-w-[110px] text-center">Status</th>
                <th className="py-3 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    <p className="mt-2 text-xs">Loading proforma invoices…</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No proforma invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || statusFilter !== "ALL"
                        ? "Try adjusting your filters."
                        : "Proforma invoices are generated when onboarding a client or creating a quote."}
                    </p>
                    {onCreateProforma && (
                      <button
                        type="button"
                        onClick={onCreateProforma}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Proforma Invoice</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((inv, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const sub = Number(inv.subTotal || 0);
                  const comm = Number(inv.totalCommission || 0);
                  const grand = Number(inv.grandTotal || 0);
                  const clientName = inv.client?.contactPerson || inv.client?.companyName || "—";
                  const company = inv.client?.companyName || "";
                  const clientId = inv.client?.clientNumber || "—";
                  const clientColor = avatarColor(inv.clientId || clientName);
                  const clientInitials = getInitials(clientName);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedProformaId(inv.id)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {globalIdx}
                      </td>

                      {/* Proforma No */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-amber-600 text-[11px]">
                          {inv.proformaNumber}
                        </span>
                      </td>

                      {/* Client */}
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
                            {company && clientName !== company && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                {company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client ID */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-slate-500">{clientId}</span>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {sub.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Commission */}
                      <td className="py-3 px-4 text-right font-mono text-amber-600">
                        + {comm.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {grand.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>

                      {/* Action */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProformaId(inv.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm transition-all"
                        >
                          <Printer className="h-3 w-3" />
                          Print
                        </button>
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
              <span className="font-semibold text-slate-700">{filtered.length}</span> proformas
            </p>

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
                  <span key={`e-${i}`} className="px-2 text-slate-400 text-xs">
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
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              per page
            </div>
          </div>
        )}
      </div>

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
