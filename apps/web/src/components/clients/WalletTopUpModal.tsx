"use client";

import React, { useState } from "react";
import {
  X,
  Wallet,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { topUpClientWallet, ClientData } from "@/services/client.service";
import { useAuth } from "@/context/AuthContext";

interface WalletTopUpModalProps {
  isOpen: boolean;
  client: ClientData | null;
  onClose: () => void;
  onSuccess: (updatedWalletData: any) => void;
}

export function WalletTopUpModal({
  isOpen,
  client,
  onClose,
  onSuccess,
}: WalletTopUpModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageFinance =
    user?.role === "ACCOUNTANT" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "PLATFORM_OWNER";

  if (!isOpen || !client || !canManageFinance) return null;

  // 1. Total Package Amount from services or proforma (strictly tax-inclusive with 5% VAT)
  const proformaTotal = Number(client.proformaInvoices?.[0]?.grandTotal || 0);
  const servicesSubtotal = (client.services || []).reduce(
    (acc, s) => acc + Number(s.totalPrice || 0),
    0
  );
  const servicesWithVat = Number((servicesSubtotal * 1.05).toFixed(2));
  const totalAmount = proformaTotal > 0 ? proformaTotal : servicesWithVat;

  // 2. Paid / Credited Amount
  const transactions = client.wallet?.transactions || [];
  const creditedFromTx = transactions
    .filter((t) => t.type === "CREDIT_ADVANCE" || t.type === "CREDIT_TOPUP")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const currentBalance = Number(client.wallet?.balance || 0);
  const totalPaid = creditedFromTx > 0 ? creditedFromTx : currentBalance;

  // 3. Necessary Amount Left to Complete Total Payment
  const leftAmountNeeded = Math.max(0, totalAmount - totalPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid top-up amount greater than zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await topUpClientWallet(client.id, {
        amount: amountNum,
        paymentMethod,
        referenceId: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
        createdById: user?.id,
      });

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || "Failed to top up wallet");
      }
    } catch (err: any) {
      setError(err.message || "Network error topping up client wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top-Up Client Financial Wallet
              </h3>
              <p className="text-[11px] text-slate-400">
                Deposit additional funds received offline to unlock work orders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Financial Status & Left Needed Overview Card ── */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161925] p-4 space-y-3 shadow-2xs">
            {/* Header: Client identity */}
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/70 pb-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Client Account
                </span>
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {client.companyName || client.contactPerson}
                </p>
              </div>
              {client.clientNumber && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                  {client.clientNumber}
                </span>
              )}
            </div>

            {/* 3-Column Metrics: Total, Paid to Date, Left Needed */}
            <div className="grid grid-cols-3 gap-2">
              {/* Metric 1: Total Cost (Tax Inclusive) */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#11131c] border border-slate-200/80 dark:border-slate-800">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Total (Incl. 5% VAT)
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                  AED {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Metric 2: Paid To Date */}
              <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                  Paid To Date
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                  AED {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Metric 3: Left Amount Needed to Complete */}
              <div
                className={`p-2.5 rounded-xl border ${
                  leftAmountNeeded > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider block mb-0.5 opacity-90">
                  {leftAmountNeeded > 0 ? "Left Needed" : "Payment Status"}
                </span>
                <span className="font-mono text-xs sm:text-sm font-black">
                  {leftAmountNeeded > 0 ? (
                    `AED ${leftAmountNeeded.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  ) : (
                    "Fully Settled"
                  )}
                </span>
              </div>
            </div>

            {/* Bottom Sub-strip: Current Wallet Balance & Quick Autofill Button */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                <Wallet className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Available in Wallet:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                  AED {currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </strong>
              </div>

              {leftAmountNeeded > 0 ? (
                <button
                  type="button"
                  onClick={() => setAmount(leftAmountNeeded.toFixed(2))}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  title="Click to auto-fill the exact remaining balance into the amount field"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Autofill Left: AED {leftAmountNeeded.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </button>
              ) : (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Full package fees covered</span>
                </span>
              )}
            </div>
          </div>

          {/* Top-Up Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Top-Up Amount (AED) <span className="text-rose-500">*</span>
              </label>
              {leftAmountNeeded > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(leftAmountNeeded.toFixed(2))}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/20 transition cursor-pointer"
                >
                  Fill Left Balance (AED {leftAmountNeeded.toLocaleString("en-US", { minimumFractionDigits: 2 })})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                AED
              </span>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={leftAmountNeeded > 0 ? leftAmountNeeded.toFixed(2) : "e.g. 1500"}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-14 pr-4 py-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Payment Method Received <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="BANK_TRANSFER">Bank Wire / Electronic Transfer</option>
              <option value="CASH">Cash Deposit</option>
              <option value="CHEQUE">Corporate Cheque</option>
              <option value="CREDIT_CARD">Credit / Debit Card</option>
              <option value="ONLINE_PAYMENT">Payment Gateway (Online)</option>
            </select>
          </div>

          {/* Reference ID */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. WIRE-884910 or CHQ-1049"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Ledger Note / Purpose
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared pending balance for visa processing."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Topping up...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Top-Up Wallet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
