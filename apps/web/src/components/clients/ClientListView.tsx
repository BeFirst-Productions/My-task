"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Building2,
  User,
  Phone,
  Wallet,
  Receipt,
  Eye,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ClientData, fetchClients } from "@/services/client.service";
import { ProformaInvoiceModal } from "@/components/proforma/ProformaInvoiceModal";

interface ClientListViewProps {
  orgId?: string;
  orgSubdomain?: string;
  onAddNewClient: () => void;
  onSelectClient: (client: ClientData) => void;
}

export function ClientListView({
  orgId,
  orgSubdomain,
  onAddNewClient,
  onSelectClient,
}: ClientListViewProps) {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Proforma for popup preview
  const [previewProformaId, setPreviewProformaId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchClients(orgId || orgSubdomain, searchQuery, statusFilter);
        if (mounted) setClients(data);
      } catch (err) {
        console.warn("Failed to load clients:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain, searchQuery, statusFilter]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.clientNumber && c.clientNumber.toLowerCase().includes(q)) ||
        (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WORK_APPROVED":
        return {
          label: "Work Approved",
          classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
        };
      case "IN_PROGRESS":
        return {
          label: "In Progress",
          classes: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-900/50",
        };
      case "COMPLETED":
        return {
          label: "Completed",
          classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300",
        };
      case "WORK_PENDING_PAYMENT":
      default:
        return {
          label: "Pending Payment",
          classes: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
        };
    }
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* 1. Header with Title & Action Button */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Client Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Directory of corporate clients, financial wallets, proforma invoicing, and service execution.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddNewClient}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Client & Service Intake</span>
        </button>
      </div>

      {/* 2. Search & Status Filter Bar */}
      <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#12141c] p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, contact, or CLI number..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {["ALL", "WORK_PENDING_PAYMENT", "WORK_APPROVED", "IN_PROGRESS", "COMPLETED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
              }`}
            >
              {st === "ALL" ? "All Clients" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Clients Table */}
      <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Company & Client ID</th>
                <th className="py-3 px-4 min-w-[160px]">Contact Person</th>
                <th className="py-3 px-4 min-w-[140px]">Sales Staff</th>
                <th className="py-3 px-4 min-w-[110px] text-center">Services</th>
                <th className="py-3 px-4 min-w-[130px] text-right">Wallet Balance</th>
                <th className="py-3 px-4 min-w-[130px] text-center">Status</th>
                <th className="py-3 px-4 min-w-[200px] text-right">Proforma & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <p className="mt-2 text-xs">Loading clients directory...</p>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No clients found</p>
                    <p className="text-xs text-slate-400 mt-1">Start by onboarding a client with service package.</p>
                    <button
                      type="button"
                      onClick={onAddNewClient}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Onboard First Client</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, idx) => {
                  const statusInfo = getStatusBadge(client.status);
                  const walletBalance = Number(client.wallet?.balance || 0);
                  const latestProforma = client.proformaInvoices?.[0];

                  return (
                    <tr
                      key={client.id}
                      onClick={() => onSelectClient(client)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* # */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Company & Client ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black text-xs shrink-0">
                            {client.companyName ? client.companyName[0].toUpperCase() : "C"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {client.companyName}
                            </span>
                            <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              {client.clientNumber || "CLI-AUTO"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{client.contactPerson}</div>
                        <div className="text-[11px] text-slate-400">{client.phoneNumber}</div>
                      </td>

                      {/* Sales Staff */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {client.salesStaff ? (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {client.salesStaff.fullName || client.salesStaff.username}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Services Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {client.services?.length || 0} Task(s)
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                            walletBalance > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <Wallet className="h-3 w-3" />
                          <span>AED {walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.classes}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Last Column: Generate Proforma Invoice Button & View */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                      >
                        <div className="flex items-center justify-end gap-2">
                          {latestProforma ? (
                            <button
                              type="button"
                              onClick={() => setPreviewProformaId(latestProforma.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-slate-950 dark:text-amber-400 font-bold text-[11px] border border-amber-500/30 transition-all shadow-xs"
                              title="Generate / Download Proforma Invoice"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>Proforma ({latestProforma.proformaNumber})</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">No Proforma</span>
                          )}

                          <button
                            type="button"
                            onClick={() => onSelectClient(client)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title="Open Client Dashboard"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pop-up Proforma Invoice Preview Modal */}
      {previewProformaId && (
        <ProformaInvoiceModal
          isOpen={Boolean(previewProformaId)}
          proformaId={previewProformaId}
          onClose={() => setPreviewProformaId(null)}
        />
      )}
    </div>
  );
}

