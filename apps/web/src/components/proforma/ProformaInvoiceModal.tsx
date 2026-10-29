"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Download,
  Building2,
  FileText,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ProformaInvoiceData, fetchProformaById } from "@/services/proforma.service";

interface ProformaInvoiceModalProps {
  isOpen: boolean;
  proformaId?: string | null;
  initialData?: ProformaInvoiceData | null;
  onClose: () => void;
}

export function ProformaInvoiceModal({
  isOpen,
  proformaId,
  initialData,
  onClose,
}: ProformaInvoiceModalProps) {
  const [data, setData] = useState<ProformaInvoiceData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    } else if (proformaId && isOpen) {
      setIsLoading(true);
      fetchProformaById(proformaId)
        .then((res) => {
          if (res) setData(res);
        })
        .finally(() => setIsLoading(false));
    }
  }, [proformaId, initialData, isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const org = data?.organisation;
  const client = data?.client;
  const salesStaff = data?.generatedBy;

  const subTotal = Number(data?.subTotal || 0);
  const totalCommission = Number(data?.totalCommission || 0);
  const grandTotal = Number(data?.grandTotal || 0);
  const currency = data?.currency || "AED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0e1118] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:m-0 print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden during printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823] print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Official Proforma Invoice Preview
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div id="printable-invoice" className="p-8 sm:p-12 text-slate-900 dark:text-slate-100 font-sans print:text-black">
          {isLoading ? (
            <div className="py-24 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-xs text-slate-400">Loading invoice data...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Header: Company Info & Proforma Badge */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
                <div className="flex items-start gap-4">
                  {org?.logo ? (
                    <img
                      src={org.logo}
                      alt={org.companyName}
                      className="h-16 w-16 rounded-2xl object-contain bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-slate-700 p-1"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-black text-3xl">
                      IBH
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                      {org?.companyName || "International Business Hub LLC"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                      {org?.setting?.companyAddress || "Sheikh Zayed Road, Business Bay, Dubai, United Arab Emirates"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Tel: {org?.setting?.supportPhone || "+971 4 000 0000"}</span>
                      <span>Email: {org?.setting?.supportEmail || "contact@ibh.ae"}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
                    Proforma Invoice
                  </span>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {data?.proformaNumber || "PI-2026-1001"}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p>
                      <span className="font-semibold">Date:</span>{" "}
                      {data?.createdAt
                        ? new Date(data.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "Today"}
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span>{" "}
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {data?.status?.replace(/_/g, " ") || "ISSUED"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Billed To & Sales Representative Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-[#141724] border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Billed To / Client
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {client?.companyName || "Client Company Name"}
                  </h3>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{client?.contactPerson || "Contact Person"}</span>
                      {client?.clientNumber && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold ml-1">
                          {client.clientNumber}
                        </span>
                      )}
                    </p>
                    {client?.phoneNumber && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{client.phoneNumber}</span>
                      </p>
                    )}
                    {client?.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{client.email}</span>
                      </p>
                    )}
                    {client?.trnNumber && (
                      <p className="text-[11px] font-mono text-slate-500">
                        TRN: {client.trnNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-6">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Sales Representative
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {salesStaff?.fullName || salesStaff?.username || "Designated Sales Consultant"}
                  </h4>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{salesStaff?.email || "sales@company.ae"}</span>
                    </p>
                    {salesStaff?.phoneNumber && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{salesStaff.phoneNumber}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
                    <p className="font-semibold">Next Step:</p>
                    <p className="text-[10px] opacity-90">
                      Submit this Proforma ID to Accounts to register advance payment and authorize work.
                    </p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#171a26] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Service Description</th>
                      <th className="py-3 px-4 text-right">Base Fee ({currency})</th>
                      <th className="py-3 px-4 text-right">Commission ({currency})</th>
                      <th className="py-3 px-4 text-right">Line Total ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {client?.services && client.services.length > 0 ? (
                      client.services.map((srv, idx) => {
                        const b = Number(srv.basePrice || 0);
                        const c = Number(srv.commissionAmount || 0);
                        const t = Number(srv.totalPrice || b + c);
                        return (
                          <tr key={srv.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {srv.serviceItem?.name || "Corporate Service"}
                              </span>
                              {srv.serviceItem?.category?.name && (
                                <span className="text-[10px] text-slate-400">
                                  {srv.serviceItem.category.name}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600 dark:text-slate-300">
                              {b.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                              {c.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {t.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Package services details
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                <div className="max-w-sm text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">Payment Notice</h5>
                  <p className="text-[11px] leading-relaxed">
                    This document is a formal quotation and proforma statement. Work orders are
                    initiated upon receipt of advance deposit and confirmation by Accounts Management.
                  </p>
                </div>

                <div className="w-full sm:w-72 space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#141724] border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Base Services Subtotal:</span>
                    <span className="font-mono font-semibold">
                      {currency} {subTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span>Total Service Commission:</span>
                    <span className="font-mono font-semibold">
                      + {currency} {totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-slate-900 dark:text-white font-black text-sm">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base text-amber-500">
                      {currency} {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

