"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
} from "lucide-react";
import { ProformaInvoiceData, fetchProformaById } from "@/services/proforma.service";
import {
  InvoiceDocumentTemplate,
  InvoiceLineItem,
} from "@/components/invoices/InvoiceDocumentTemplate";

export interface ProformaInvoiceModalProps {
  isOpen: boolean;
  proformaId?: string | null;
  initialData?: ProformaInvoiceData | null;
  documentType?: "INVOICE" | "PROFORMA";
  onClose: () => void;
}

export function ProformaInvoiceModal({
  isOpen,
  proformaId,
  initialData,
  documentType = "PROFORMA",
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
      setIsLoading(false);
    } else if (proformaId && isOpen) {
      setIsLoading(true);
      setLoadError(null);
      fetchProformaById(proformaId)
        .then((res) => {
          if (res) {
            setData(res);
          } else {
            setLoadError("Unable to load document. Please verify your authentication.");
          }
        })
        .catch((err) => {
          setLoadError(err?.message || "Failed to load document.");
        })
        .finally(() => setIsLoading(false));
    } else if (!isOpen) {
      setData(null);
      setLoadError(null);
      setIsLoading(false);
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

  const docNumber = data?.proformaNumber || (documentType === "INVOICE" ? "IBH-17001/26" : "PI-IBH-17001/26");
  const isInvoice = documentType === "INVOICE";

  // Map service items to invoice line items
  const lineItems: InvoiceLineItem[] =
    data?.client?.services && data.client.services.length > 0
      ? data.client.services.map((s, idx) => {
          const unit = Number(
            s.totalPrice || Number(s.basePrice || 0) + Number(s.commissionAmount || 0)
          );
          return {
            sl: idx + 1,
            description: (s.serviceItem?.name || "Corporate Service").toUpperCase(),
            category: s.serviceItem?.category?.name,
            qty: 1,
            unitPrice: unit,
            totalPrice: unit,
          };
        })
      : [
          {
            sl: 1,
            description: (data?.client?.services?.[0]?.serviceItem?.name || "CORPORATE SERVICES & PROCESSING").toUpperCase(),
            qty: 1,
            unitPrice: Number(data?.grandTotal || 0),
            totalPrice: Number(data?.grandTotal || 0),
          },
        ];

  // Derive Service / Reference Header
  const primaryServiceName =
    data?.client?.services?.[0]?.serviceItem?.name || "CORPORATE SERVICES";
  const serviceScope =
    data?.notes || "Visa renewal and related document processing charges";

  const subTotal = Number(data?.subTotal || 0) + Number(data?.totalCommission || 0);
  const vatAmount = Number(data?.vatAmount || 0);
  const totalAmount = Number(data?.grandTotal || subTotal + vatAmount);
  // Paid amount calculation: if status is CONVERTED_TO_WORK or PAID, paid amount is total
  const isPaid = data?.status === "CONVERTED_TO_WORK";
  const paidAmount = isPaid ? totalAmount : 0;
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden print:p-0 print:bg-white print:overflow-visible animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:m-0 print:w-full print:rounded-none print:max-h-none">
        
        {/* Top Sticky Control Bar (Hidden during printing) */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131622] print:hidden z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider truncate">
                {isInvoice ? "Official Tax Invoice" : "Official Proforma Invoice"}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0">
                {docNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Copy Document Number */}
            <button
              type="button"
              onClick={() => copyToClipboard(docNumber, "doc")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              title="Copy Document Number"
            >
              {copiedField === "doc" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy {isInvoice ? "Invoice" : "PI"} No</span>
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
          className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-900 bg-white print:p-0 print:overflow-visible print:bg-white"
        >
          {isLoading ? (
            <div className="py-32 text-center">
              <div className="inline-block h-9 w-9 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-slate-400">Loading document...</p>
            </div>
          ) : loadError && !data ? (
            <div className="py-24 text-center max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs">
                <p className="font-bold">{loadError}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Could not retrieve the document from the server. Please check your network or sign-in status.
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
                        else setLoadError("Unable to load document. Please verify authentication.");
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
          ) : !data ? (
            <div className="py-32 text-center text-slate-400 text-xs">
              <FileText className="h-9 w-9 mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No Document Selected</p>
              <p className="mt-1 text-slate-400">Select a valid document from the list.</p>
            </div>
          ) : (
            <InvoiceDocumentTemplate
              documentType={documentType}
              invoiceNumber={docNumber}
              issueDate={data.createdAt}
              organisation={data.organisation}
              client={data.client}
              serviceReference={{
                title: primaryServiceName.toUpperCase(),
                description: serviceScope,
              }}
              items={lineItems}
              currency={data.currency || "AED"}
              vatRate={5}
              vatAmount={vatAmount}
              subTotal={subTotal}
              totalAmount={totalAmount}
              paidAmount={paidAmount}
              balanceDue={balanceDue}
              notes={data.notes}
              salesStaff={data.generatedBy}
              showBankDetails={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
