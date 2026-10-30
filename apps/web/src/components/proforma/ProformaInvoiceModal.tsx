"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Building2,
  FileText,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Landmark,
  Receipt,
  Clock,
  MapPin,
  Globe,
  Briefcase,
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoadError(null);
    }
    if (proformaId && isOpen) {
      if (!initialData || initialData.id !== proformaId) {
        setIsLoading(true);
        setLoadError(null);
        fetchProformaById(proformaId)
          .then((res) => {
            if (res) {
              setData(res);
            } else {
              setLoadError("Unable to load proforma invoice. Please verify your authentication.");
            }
          })
          .catch((err) => {
            setLoadError(err?.message || "Failed to load proforma invoice.");
          })
          .finally(() => setIsLoading(false));
      }
    }
  }, [proformaId, initialData, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const org = data?.organisation;
  const client = data?.client;
  const salesStaff = data?.generatedBy || (data?.client as any)?.salesStaff;

  const subTotal = Number(data?.subTotal || 0);
  const totalCommission = Number(data?.totalCommission || 0);
  const vatAmount = Number(data?.vatAmount || 0);
  const grandTotal = Number(data?.grandTotal || (subTotal + totalCommission + vatAmount));
  const currency = data?.currency || "AED";

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Calculate validity date (30 days from creation)
  const getValidityDate = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  const proformaNumber = data?.proformaNumber || "PI-2026-1001";
  const defaultBankIban = "AE28026000010294820192";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden print:p-0 print:bg-white print:overflow-visible animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:m-0 print:w-full print:rounded-none print:max-h-none">
        
        {/* Top Sticky Control Bar (Hidden during printing) */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131622] print:hidden z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider truncate">
                Official Proforma Invoice
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0">
                {proformaNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Copy PI Number */}
            <button
              type="button"
              onClick={() => copyToClipboard(proformaNumber, "pi")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              title="Copy Proforma Number"
            >
              {copiedField === "pi" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy PI No</span>
                </>
              )}
            </button>

            {/* Print / Download Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-sm shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div
          id="printable-invoice"
          className="flex-1 overflow-y-auto p-6 sm:p-10 text-slate-900 dark:text-slate-100 font-sans print:p-0 print:overflow-visible print:text-black print:bg-white"
        >
          {isLoading ? (
            <div className="py-32 text-center">
              <div className="inline-block h-9 w-9 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-slate-400">Loading official proforma invoice...</p>
            </div>
          ) : loadError && !data ? (
            <div className="py-24 text-center max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs">
                <p className="font-bold">{loadError}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Could not retrieve the proforma invoice from the server. Please check your network or sign-in status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (proformaId) {
                    setIsLoading(true);
                    setLoadError(null);
                    fetchProformaById(proformaId)
                      .then((res) => {
                        if (res) setData(res);
                        else setLoadError("Unable to load proforma invoice. Please verify authentication.");
                      })
                      .catch((err) => setLoadError(err?.message || "Failed to load."))
                      .finally(() => setIsLoading(false));
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 print:space-y-6">

              {/* SECTION 1: HEADER & CORPORATE IDENTITY */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-200 dark:border-slate-800 pb-7 print:border-black">
                {/* Organization Brand */}
                <div className="flex items-start gap-4">
                  {org?.logo ? (
                    <img
                      src={org.logo}
                      alt={org.companyName}
                      className="h-16 w-16 rounded-2xl object-contain bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 p-1 shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-2xl tracking-tight shadow-md shrink-0 print:border print:border-black">
                      IBH
                    </div>
                  )}

                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white print:text-black">
                      {org?.companyName || "International Business Hub LLC"}
                    </h1>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                      Corporate Services & Business Formation Advisory
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                      {org?.setting?.companyAddress || "Sheikh Zayed Road, Business Bay, Dubai, United Arab Emirates"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-800">
                      <span><strong className="text-slate-800 dark:text-slate-300">TRN:</strong> 100482910000003</span>
                      <span><strong className="text-slate-800 dark:text-slate-300">Tel:</strong> {org?.setting?.supportPhone || "+971 4 220 8899"}</span>
                      <span><strong className="text-slate-800 dark:text-slate-300">Email:</strong> {org?.setting?.supportEmail || "contact@ibh.ae"}</span>
                    </div>
                  </div>
                </div>

                {/* Proforma Identification Badge */}
                <div className="sm:text-right shrink-0 w-full sm:w-auto p-4 sm:p-0 rounded-2xl bg-slate-50 dark:bg-[#131622] sm:bg-transparent sm:dark:bg-transparent border border-slate-200/80 dark:border-slate-800 sm:border-none">
                  <div className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-2">
                    Proforma Invoice
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950 dark:text-white print:text-black">
                    {proformaNumber}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1 print:text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Date Issued:</span>{" "}
                      {formatDate(data?.createdAt)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Valid Until:</span>{" "}
                      {getValidityDate(data?.createdAt)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Status:</span>{" "}
                      <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">
                        {data?.status?.replace(/_/g, " ") || "ISSUED / PENDING ADVANCE"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: BILLED TO & ACCOUNT COORDINATOR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 sm:p-6 rounded-2xl bg-slate-50/80 dark:bg-[#111420] border border-slate-200 dark:border-slate-800 print:bg-slate-50 print:border-slate-300">
                {/* Client / Billed To */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 print:text-slate-600">
                      Billed To / Client Details
                    </span>
                    {client?.clientNumber && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        {client.clientNumber}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-black text-slate-950 dark:text-white print:text-black">
                    {client?.companyName || "Client Corporate Name"}
                  </h2>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 print:text-slate-800">
                    <p className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-900 dark:text-slate-200 print:text-black">
                        Attn: {client?.contactPerson || "Primary Representative"}
                      </span>
                    </p>
                    {client?.phoneNumber && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{client.phoneNumber}</span>
                        {client.whatsappNumber && client.whatsappNumber !== client.phoneNumber && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            (WA: {client.whatsappNumber})
                          </span>
                        )}
                      </p>
                    )}
                    {client?.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{client.email}</span>
                      </p>
                    )}
                    {client?.address && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{client.address}</span>
                      </p>
                    )}
                    <p className="text-[11px] font-mono text-slate-500 pt-0.5">
                      <strong className="font-semibold text-slate-700 dark:text-slate-300">Client TRN:</strong>{" "}
                      {client?.trnNumber || "Non-VAT / Unregistered"}
                    </p>
                  </div>
                </div>

                {/* Issued By / Engagement Coordinator */}
                <div className="sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-6 print:border-slate-300">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1.5">
                    Designated Sales Consultant & Terms
                  </span>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white print:text-black">
                    {salesStaff?.fullName || salesStaff?.username || "Designated Corporate Consultant"}
                  </h3>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 print:text-slate-800">
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{salesStaff?.email || "sales@ibh.ae"}</span>
                    </p>
                    {salesStaff?.phoneNumber && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{salesStaff.phoneNumber}</span>
                      </p>
                    )}
                    <p className="pt-1 text-[11px]">
                      <strong className="text-slate-800 dark:text-slate-300">Payment Terms:</strong> Advance Deposit Required
                    </p>
                    <p className="text-[11px]">
                      <strong className="text-slate-800 dark:text-slate-300">Billing Currency:</strong> {currency} (UAE Dirham)
                    </p>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 print:bg-amber-50">
                    <p className="font-bold flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>Onboarding Notice:</span>
                    </p>
                    <p className="text-[10px] opacity-90 mt-0.5">
                      Work orders commence promptly upon receipt of advance remittance referencing this Proforma ID.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ITEMIZED SERVICES TABLE */}
              <div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-black">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-[#151825] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] print:bg-slate-100 print:text-black">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Service Description & Scope</th>
                        <th className="py-3 px-4 text-center w-24">Scope / Qty</th>
                        <th className="py-3 px-4 text-right">Base / Gov Fee</th>
                        <th className="py-3 px-4 text-right">Service Facilitation</th>
                        <th className="py-3 px-4 text-right">Line Total ({currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 print:divide-slate-300">
                      {client?.services && client.services.length > 0 ? (
                        client.services.map((srv, idx) => {
                          const b = Number(srv.basePrice || 0);
                          const c = Number(srv.commissionAmount || 0);
                          const t = Number(srv.totalPrice || b + c);
                          return (
                            <tr key={srv.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px] print:text-slate-600">
                                {String(idx + 1).padStart(2, "0")}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-950 dark:text-white print:text-black block text-xs">
                                  {srv.serviceItem?.name || "Corporate Advisory Service"}
                                </span>
                                {srv.serviceItem?.category?.name && (
                                  <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                    {srv.serviceItem.category.name}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center text-slate-500 font-medium text-[11px]">
                                1 Unit
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600 dark:text-slate-300 print:text-black">
                                {b.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-medium text-amber-600 dark:text-amber-400 print:text-black">
                                {c.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-950 dark:text-white print:text-black">
                                {t.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No service items registered for this client.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 4: FINANCIAL SUMMARY & TOTALS */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-1">
                {/* Important Commercial Statement */}
                <div className="max-w-sm space-y-2 text-xs text-slate-500 dark:text-slate-400 print:text-slate-700">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] print:text-black">
                    Commercial Notice & Terms
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    This document is a formal quotation and proforma payment notice. Official work order
                    registration and statutory submissions commence once advance payment is settled into our corporate account.
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    * All government & authority fees are charged at actual regulatory cost and are subject to official ministerial revisions.
                  </p>
                </div>

                {/* Calculation Summary Box */}
                <div className="w-full sm:w-80 space-y-2.5 p-5 rounded-2xl bg-slate-50 dark:bg-[#121522] border border-slate-200 dark:border-slate-800 text-xs print:bg-slate-50 print:border-black">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 print:text-black">
                    <span>Base Government / Filing Fees:</span>
                    <span className="font-mono font-semibold">
                      {currency} {subTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 print:text-black">
                    <span>Corporate Service & Facilitation:</span>
                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 print:text-black">
                      + {currency} {totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>UAE VAT (0% / Exempt):</span>
                    <span className="font-mono">
                      {currency} {vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t-2 border-slate-200 dark:border-slate-700 pt-3 flex justify-between items-center text-slate-950 dark:text-white print:text-black font-black">
                    <span className="text-sm uppercase tracking-wider">Grand Total:</span>
                    <span className="font-mono text-lg text-amber-500 dark:text-amber-400 print:text-black">
                      {currency} {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="text-[10px] text-right font-medium text-slate-400 print:text-slate-600">
                    Figures in United Arab Emirates Dirham
                  </div>
                </div>
              </div>

              {/* SECTION 5: BANK REMITTANCE INSTRUCTIONS */}
              <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/50 dark:bg-[#141620] border border-amber-200/80 dark:border-amber-500/20 text-xs print:border-slate-300 print:bg-white">
                <div className="flex items-center justify-between mb-3 border-b border-amber-200/60 dark:border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 print:text-black">
                      Official Bank Wire & Remittance Details
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    Domestic & International Wire
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-slate-700 dark:text-slate-300 print:text-black">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Name</span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-black text-xs">
                      Emirates NBD Bank PJSC
                    </span>
                    <span className="text-[10px] text-slate-500 block">Business Bay Branch, Dubai</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Beneficiary Name</span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-black text-xs">
                      {org?.companyName || "International Business Hub LLC"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Account: 10294820192</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">SWIFT / BIC</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white print:text-black text-xs">
                      EBILAEAD
                    </span>
                    <span className="text-[10px] text-slate-500 block">Currency: AED</span>
                  </div>

                  <div className="sm:col-span-2 md:col-span-3 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">IBAN Number</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-950 dark:text-white print:text-black tracking-wide">
                        {defaultBankIban}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(defaultBankIban, "iban")}
                        className="p-1 rounded text-slate-400 hover:text-amber-500 transition-colors print:hidden"
                        title="Copy IBAN"
                      >
                        {copiedField === "iban" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                      * Please mention Proforma Reference <strong>{proformaNumber}</strong> in the bank payment narration.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 6: TERMS & CONDITIONS */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 print:border-slate-300 print:text-slate-600">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block mb-1">
                  Standard Commercial Conditions:
                </span>
                <ol className="list-decimal pl-4 space-y-0.5 leading-relaxed">
                  <li>This Proforma Invoice constitutes an official quotation and is valid for thirty (30) days from the issue date.</li>
                  <li>Execution of service milestones commences upon receipt of the agreed advance payment and required compliance documents.</li>
                  <li>Official Tax Invoice will be issued in accordance with UAE Federal Decree-Law No. (8) on VAT upon finalization of services.</li>
                </ol>
              </div>

              {/* SECTION 7: DUAL SIGNATORY & ENDORSEMENT BLOCK */}
              <div className="pt-8 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-8 print:border-black">
                {/* Prepared & Authorized By */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 print:text-slate-600 block">
                    Authorized Signatory & Seal
                  </span>
                  
                  {/* Digital Seal Graphic */}
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-amber-500/40 dark:border-amber-400/30 flex flex-col items-center justify-center text-center p-1">
                      <ShieldCheck className="h-4 w-4 text-amber-500 mb-0.5" />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-amber-600 dark:text-amber-400">
                        OFFICIAL SEAL
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="w-44 border-b border-slate-300 dark:border-slate-700 pb-1">
                        <span className="font-serif italic text-xs text-slate-800 dark:text-slate-200">
                          {salesStaff?.fullName || "Operations Director"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        International Business Hub Management
                      </p>
                      <p className="text-[9px] text-slate-400">
                        Date: {formatDate(data?.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client Acceptance Block */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 print:text-slate-600 block">
                    Client Acceptance & Authorization
                  </span>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 italic mb-2">
                      Accepted by Client Authorized Representative:
                    </p>
                    <div className="w-full max-w-xs border-b border-slate-300 dark:border-slate-700 h-8" />
                    <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                      <span>Signature & Corporate Stamp</span>
                      <span>Date: ____________</span>
                    </div>
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
