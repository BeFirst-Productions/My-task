"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Wallet,
  Sparkles,
} from "lucide-react";
import { convertClientToWork, ClientData } from "@/services/client.service";
import { useAuth } from "@/context/AuthContext";

interface ConvertToWorkModalProps {
  isOpen: boolean;
  client: ClientData | null;
  onClose: () => void;
  onSuccess: (updatedClient: any) => void;
}

export function ConvertToWorkModal({
  isOpen,
  client,
  onClose,
  onSuccess,
}: ConvertToWorkModalProps) {
  const { user } = useAuth();
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !client) return null;

  // Compute total package amount
  const packageTotal = (client.services || []).reduce(
    (acc, s) => acc + Number(s.totalPrice || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(advanceAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid advance payment amount greater than zero.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await convertClientToWork(client.id, {
        advanceAmount: amountNum,
        paymentMethod,
        referenceId: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
        createdById: user?.id,
      });

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || "Failed to convert client to work");
      }
    } catch (err: any) {
      setError(err.message || "Network error converting client to work");
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Convert to Work & Record Advance
              </h3>
              <p className="text-[11px] text-slate-400">
                Accounts verification & client financial wallet deposit
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

          {/* Client & Package Context Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161924] border border-slate-200/80 dark:border-slate-800 text-xs flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {client.companyName}
              </span>
              <span className="text-[10px] text-amber-500 block font-mono font-bold">
                {client.clientNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Package Total</span>
              <span className="font-mono font-black text-sm text-amber-500">
                AED {packageTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Advance Amount (AED) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Advance Payment Amount (AED) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                AED
              </span>
              <input
                type="number"
                required
                min="1"
                step="50"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-14 pr-4 py-2.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              This amount is deposited directly into the Client Wallet to fund service assignments.
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Payment Method <span className="text-rose-500">*</span>
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

          {/* Reference / Transaction ID */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Transaction / Cheque / Bank Reference ID
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. TRX-99214 or CHQ-0045"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Payment Notes & Allocation
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Initial 50% advance received, approved for work orders."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Approve & Credit Wallet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

