"use client";

import React from "react";
import { Landmark, ShieldCheck } from "lucide-react";

export interface InvoiceLineItem {
  sl?: number;
  description: string;
  category?: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceDocumentTemplateProps {
  documentType?: "INVOICE" | "PROFORMA";
  invoiceNumber?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  organisation?: {
    companyName?: string;
    subdomain?: string;
    logo?: string | null;
    primaryLocation?: string;
    setting?: {
      companyAddress?: string | null;
      supportEmail?: string | null;
      supportPhone?: string | null;
      invoiceCurrency?: string | null;
      companyTagline?: string | null;
      primaryColor?: string | null;
    } | null;
  } | null;
  client?: {
    companyName?: string | null;
    contactPerson?: string | null;
    trnNumber?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    address?: string | null;
    clientNumber?: string | null;
  } | null;
  serviceReference?: {
    title?: string;
    description?: string;
  };
  items: InvoiceLineItem[];
  currency?: string;
  vatRate?: number; // e.g. 5
  vatAmount?: number;
  subTotal?: number;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  notes?: string | null;
  salesStaff?: {
    fullName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null;
  showBankDetails?: boolean;
}

export function InvoiceDocumentTemplate({
  documentType = "INVOICE",
  invoiceNumber,
  issueDate,
  dueDate,
  organisation,
  client,
  serviceReference,
  items = [],
  currency = "AED",
  vatRate = 5,
  vatAmount,
  subTotal,
  totalAmount,
  paidAmount = 0,
  balanceDue,
  notes,
  salesStaff,
  showBankDetails = true,
}: InvoiceDocumentTemplateProps) {
  // Format Date Helper (e.g. "5 Aug 2026")
  const formatDate = (dateInput?: string | Date) => {
    if (!dateInput) {
      return new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Helper to format money with thousands commas & 2 decimal places
  const formatMoney = (val?: number) => {
    const num = Number(val || 0);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Compute calculated amounts if not provided
  const computedSubTotal =
    subTotal !== undefined
      ? subTotal
      : items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

  // If VAT amount is not explicitly provided, calculate based on VAT rate
  const computedVat =
    vatAmount !== undefined ? vatAmount : (computedSubTotal * (vatRate || 0)) / 100;

  const computedTotal =
    totalAmount !== undefined ? totalAmount : computedSubTotal + computedVat;

  const computedBalanceDue =
    balanceDue !== undefined ? balanceDue : Math.max(0, computedTotal - (paidAmount || 0));

  // Determine dynamic sequential number
  const orgPrefix = (organisation?.subdomain || "IBH").toUpperCase();
  const currentYearShort = new Date().getFullYear().toString().slice(-2);
  const displayDocNumber =
    invoiceNumber ||
    (documentType === "PROFORMA"
      ? `PI-${orgPrefix}-17001/${currentYearShort}`
      : `${orgPrefix}-17001/${currentYearShort}`);

  const formattedDateStr = formatDate(issueDate || new Date());

  // Derive Service / Reference content
  const primaryServiceTitle =
    serviceReference?.title ||
    (items.length > 0 ? items[0].description : "CORPORATE SERVICES");

  const serviceScopeDesc =
    serviceReference?.description ||
    notes ||
    "Corporate services and related document processing charges";

  const clientDisplayName =
    client?.companyName?.trim() || client?.contactPerson?.trim() || "PREMIUM TOPS TRADING L.L.C";

  const clientTrnDisplay = client?.trnNumber?.trim()
    ? `TRN: ${client.trnNumber.trim()}`
    : "TRN: 104541674800003";

  return (
    <div className="w-full bg-white text-slate-900 font-sans p-6 sm:p-10 select-text max-w-4xl mx-auto print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black">
      {/* ── TOP SECTION: LOGO & DOCUMENT HEADER ──────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
        {/* Organization Brand & Logo */}
        <div className="flex items-start gap-3.5">
          {organisation?.logo ? (
            <img
              src={organisation.logo}
              alt={organisation.companyName || "Organization Logo"}
              className="h-16 w-auto max-w-[200px] object-contain shrink-0"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 font-black text-2xl shadow-sm shrink-0">
              {orgPrefix.slice(0, 3)}
            </div>
          )}

          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase leading-snug">
              {organisation?.companyName || "INTERNATIONAL BUSINESS HUB"}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium tracking-wide mt-0.5">
              {organisation?.setting?.companyTagline ||
                "Company Formation • PRO Services • Business Support"}
            </p>
            {organisation?.setting?.companyAddress && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {organisation.setting.companyAddress}
              </p>
            )}
          </div>
        </div>

        {/* Document Title & Number / Date */}
        <div className="sm:text-right shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0c1829] tracking-tight uppercase print:text-black">
            {documentType === "PROFORMA" ? "PROFORMA INVOICE" : "TAX INVOICE"}
          </h2>
          <div className="mt-2 space-y-1 text-xs text-slate-700 print:text-black">
            <p className="flex sm:justify-end gap-2 font-semibold">
              <span className="text-slate-900 font-bold">
                {documentType === "PROFORMA" ? "Proforma No." : "Invoice No."}
              </span>
              <span className="font-mono font-bold text-slate-950">{displayDocNumber}</span>
            </p>
            <p className="flex sm:justify-end gap-2 font-semibold">
              <span className="text-slate-900 font-bold">
                {documentType === "PROFORMA" ? "Proforma Date" : "Invoice Date"}
              </span>
              <span>{formattedDateStr}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── ELEGANT GOLD ACCENT DIVIDER ──────────────────────────────── */}
      <div className="w-full h-0.5 bg-[#C59B27] mt-3 mb-5" />

      {/* ── BILL TO & SERVICE / REFERENCE CARD ──────────────────────── */}
      <div className="w-full rounded-xl bg-[#F8FAFC] border border-slate-200/90 p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-5 print:bg-[#F8FAFC] print:border-slate-300">
        {/* Left: Bill To */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            BILL TO
          </span>
          <p className="text-sm font-black text-slate-950 uppercase tracking-tight">
            {clientDisplayName}
          </p>
          <p className="text-xs font-mono text-slate-600 mt-1">{clientTrnDisplay}</p>
          {client?.phoneNumber && (
            <p className="text-[11px] text-slate-500 mt-0.5">Tel: {client.phoneNumber}</p>
          )}
        </div>

        {/* Right: Service / Reference */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            SERVICE / REFERENCE
          </span>
          <p className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-tight">
            {primaryServiceTitle}
          </p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{serviceScopeDesc}</p>
        </div>
      </div>

      {/* ── LINE ITEMS TABLE ────────────────────────────────────────── */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 mb-6 print:border-black">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0c1829] text-white print:bg-[#0c1829] print:text-white">
              <th className="py-2.5 px-3 text-center text-[10px] sm:text-[11px] font-bold tracking-wider w-12">
                SL
              </th>
              <th className="py-2.5 px-4 text-left text-[10px] sm:text-[11px] font-bold tracking-wider">
                DESCRIPTION
              </th>
              <th className="py-2.5 px-3 text-center text-[10px] sm:text-[11px] font-bold tracking-wider w-16">
                QTY
              </th>
              <th className="py-2.5 px-4 text-right text-[10px] sm:text-[11px] font-bold tracking-wider w-36">
                UNIT AMOUNT ({currency})
              </th>
              <th className="py-2.5 px-4 text-right text-[10px] sm:text-[11px] font-bold tracking-wider w-36">
                TOTAL ({currency})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-slate-200">
            {items && items.length > 0 ? (
              items.map((item, idx) => (
                <tr
                  key={idx}
                  className={
                    idx % 2 === 0
                      ? "bg-white"
                      : "bg-[#F8FAFC] print:bg-[#F8FAFC]"
                  }
                >
                  <td className="py-3 px-3 text-center text-xs text-slate-500 font-medium font-mono">
                    {item.sl !== undefined ? item.sl : idx + 1}
                  </td>
                  <td className="py-3 px-4 text-left text-xs font-bold text-slate-900 uppercase">
                    {item.description}
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-slate-700 font-mono">
                    {item.qty || 1}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-mono text-slate-700">
                    {formatMoney(item.unitPrice)}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-mono font-bold text-slate-950">
                    {formatMoney(item.totalPrice)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  No line items listed on this document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS & SUMMARY SECTION ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start mb-8">
        {/* Left Side: VAT, Highlighted Total, Paid */}
        <div className="space-y-1.5 max-w-sm">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700 px-3 py-1">
            <span>VAT @ {vatRate}%</span>
            <span className="font-mono font-bold">{formatMoney(computedVat)}</span>
          </div>

          {/* Highlighted Total Box (Cream / Soft Gold Background) */}
          <div className="flex justify-between items-center text-xs font-black text-slate-950 py-2.5 px-4 rounded-lg bg-[#FAF4EB] border border-[#e8decb] shadow-sm print:bg-[#FAF4EB] print:border-[#e8decb]">
            <span className="uppercase tracking-wider">TOTAL</span>
            <span className="font-mono text-sm sm:text-base font-bold">
              {formatMoney(computedTotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs font-semibold text-slate-700 px-3 py-1">
            <span>PAID</span>
            <span className="font-mono font-bold">{formatMoney(paidAmount)}</span>
          </div>
        </div>

        {/* Right Side: Solid Dark Navy Balance Due Box */}
        <div className="rounded-xl bg-[#0c1829] text-white p-4 sm:p-5 flex items-center justify-between shadow-md print:bg-[#0c1829] print:text-white">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            BALANCE DUE
          </span>
          <span className="text-lg sm:text-2xl font-black font-mono text-white tracking-tight">
            {currency} {formatMoney(computedBalanceDue)}
          </span>
        </div>
      </div>

      {/* ── BANK REMITTANCE DETAILS (PRINTABLE / COMPLIANCE FOOTER) ──── */}
      {showBankDetails && (
        <div className="pt-5 border-t border-slate-200 print:border-slate-300">
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/60 print:bg-white print:border-slate-300">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                Official Bank Remittance Details
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Bank Name
                </span>
                <span className="font-bold text-slate-900">Emirates NBD Bank PJSC</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Account Name
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {organisation?.companyName || "International Business Hub LLC"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  IBAN Number
                </span>
                <span className="font-mono font-bold text-slate-950">
                  AE28026000010294820192
                </span>
              </div>
            </div>
          </div>

          {/* Dual Signatures / Compliance Seal */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 print:pt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Electronically Verified & Generated Document • Subject to UAE Federal Tax Regulations</span>
            </div>
            <span className="font-mono font-semibold">{displayDocNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
}
