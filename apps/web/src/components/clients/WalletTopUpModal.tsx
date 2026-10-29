"use client";

import React, { useState } from "react";
import {
  X,
  Wallet,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  DollarSign,
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

  if (!isOpen || !client) return null;

  const currentBalance = Number(client.wallet?.balance || 0);

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

          {/* Current Balance Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                Current Wallet Balance
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {client.companyName}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-base text-amber-600 dark:text-amber-400">
                AED {currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Top-Up Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Top-Up Amount (AED) <span className="text-rose-500">*</span>
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1500"
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
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
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

