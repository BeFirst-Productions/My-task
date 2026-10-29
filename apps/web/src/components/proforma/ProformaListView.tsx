"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, Printer, Eye, Building2, User } from "lucide-react";
import { ProformaInvoiceData, fetchProformas } from "@/services/proforma.service";
import { ProformaInvoiceModal } from "./ProformaInvoiceModal";

interface ProformaListViewProps {
  orgId?: string;
  orgSubdomain?: string;
}

export function ProformaListView({ orgId, orgSubdomain }: ProformaListViewProps) {
  const [invoices, setInvoices] = useState<ProformaInvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProformaId, setSelectedProformaId] = useState<string | null>(null);

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
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain]);

  const filtered = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      inv.proformaNumber.toLowerCase().includes(q) ||
      (inv.client?.companyName && inv.client.companyName.toLowerCase().includes(q)) ||
      (inv.client?.clientNumber && inv.client.clientNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* 1. Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Invoices & Proforma Statements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse official proforma quotes generated on client intake and track payment conversions.
          </p>
        </div>
      </div>

      {/* 2. Search */}
      <div className="mb-6 max-w-md bg-white dark:bg-[#12141c] p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Proforma Number or Client..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4 min-w-[150px]">Proforma Number</th>
              <th className="py-3 px-4 min-w-[180px]">Client</th>
              <th className="py-3 px-4 min-w-[130px] text-right">Base Subtotal</th>
              <th className="py-3 px-4 min-w-[130px] text-right">Commission</th>
              <th className="py-3 px-4 min-w-[140px] text-right">Grand Total</th>
              <th className="py-3 px-4 min-w-[120px] text-center">Status</th>
              <th className="py-3 px-4 min-w-[100px] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <p className="mt-2 text-xs">Loading proforma statements...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No proforma invoices found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When sales staff onboard a client, a proforma invoice will automatically generate here.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((inv, idx) => {
                const sub = Number(inv.subTotal || 0);
                const comm = Number(inv.totalCommission || 0);
                const grand = Number(inv.grandTotal || 0);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-500">
                      {inv.proformaNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                      <span className="font-bold block">{inv.client?.companyName}</span>
                      <span className="text-[10px] text-slate-400">{inv.client?.contactPerson}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      AED {sub.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                      + AED {comm.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                      AED {grand.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.status === "CONVERTED_TO_WORK"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200"
                        }`}
                      >
                        {inv.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedProformaId(inv.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-xs"
                      >
                        <Printer className="h-3 w-3" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Proforma Modal */}
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

