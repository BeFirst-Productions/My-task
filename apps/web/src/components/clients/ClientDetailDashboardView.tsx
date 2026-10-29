"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Wallet,
  Receipt,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  FileText,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { ClientData, fetchClientDetails } from "@/services/client.service";
import { ConvertToWorkModal } from "./ConvertToWorkModal";
import { WalletTopUpModal } from "./WalletTopUpModal";
import { ProformaInvoiceModal } from "@/components/proforma/ProformaInvoiceModal";
import { useAuth } from "@/context/AuthContext";

interface ClientDetailDashboardViewProps {
  clientId: string;
  onBack: () => void;
}

export function ClientDetailDashboardView({
  clientId,
  onBack,
}: ClientDetailDashboardViewProps) {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"services" | "wallet" | "documents">("services");

  // Dialog States
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchClientDetails(clientId);
      if (data) setClient(data);
    } catch (err) {
      console.warn("Failed to load client details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  // Derived KPI Stats
  const stats = useMemo(() => {
    const services = client?.services || [];
    const walletBalance = Number(client?.wallet?.balance || 0);
    const totalPackageValue = services.reduce((acc, s) => acc + Number(s.totalPrice || 0), 0);
    const completedCount = services.filter((s) => s.status === "COMPLETED").length;
    const inProgressCount = services.filter((s) => s.status === "IN_PROGRESS" || s.status === "ASSIGNED").length;

    // Total credited amount
    const transactions = client?.wallet?.transactions || [];
    const totalCredited = transactions
      .filter((t) => t.type === "CREDIT_ADVANCE" || t.type === "CREDIT_TOPUP")
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    return {
      walletBalance,
      totalPackageValue,
      serviceCount: services.length,
      completedCount,
      inProgressCount,
      totalCredited,
    };
  }, [client]);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
        <p className="mt-3 text-xs text-slate-400">Loading client dashboard...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Client record not found</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 text-xs text-amber-500 hover:underline"
        >
          ← Return to Clients Directory
        </button>
      </div>
    );
  }

  const latestProforma = client.proformaInvoices?.[0];

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* 1. Header with Client Profile & Key Conversion / Top-Up Actions */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#12141c] p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-500 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Clients</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black text-xl shrink-0">
              {client.companyName ? client.companyName[0].toUpperCase() : "C"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {client.companyName}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                  {client.clientNumber || "CLI-AUTO"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {client.contactPerson}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {client.phoneNumber}
                </span>
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {client.email}
                  </span>
                )}
                {client.salesStaff && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Sales Rep: {client.salesStaff.fullName || client.salesStaff.username}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons on Top Right */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Prominent Convert to Work Button (Accounts Manager action) */}
          {client.status === "WORK_PENDING_PAYMENT" && (
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Convert to Work</span>
            </button>
          )}

          {/* Top-Up Wallet Button */}
          <button
            type="button"
            onClick={() => setShowTopUpModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-slate-950 dark:text-amber-400 font-bold text-xs border border-amber-500/20 transition-all shadow-xs"
          >
            <Wallet className="h-4 w-4" />
            <span>Top-Up Wallet</span>
          </button>

          {/* View / Print Proforma Invoice */}
          {latestProforma && (
            <button
              type="button"
              onClick={() => setShowProformaModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors"
            >
              <Receipt className="h-4 w-4 text-amber-500" />
              <span>Proforma ({latestProforma.proformaNumber})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Client Financial Wallet Balance */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Client Financial Wallet
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              AED {stats.walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${stats.walletBalance > 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span>{stats.walletBalance > 0 ? "Funds available for work orders" : "Deposit required for assignment"}</span>
            </p>
          </div>
        </div>

        {/* Card 2: Package Value */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Package Value
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              AED {stats.totalPackageValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.serviceCount} service task(s) selected
            </p>
          </div>
        </div>

        {/* Card 3: Total Credited Payments */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Payments Credited
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              AED {stats.totalCredited.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Advance & top-up receipts</p>
          </div>
        </div>

        {/* Card 4: Work Order Status */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Work Delivery Status
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.completedCount} / {stats.serviceCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.inProgressCount} task(s) currently active
            </p>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Services / Wallet Ledger / Documents) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`pb-3 px-3 text-xs font-bold transition-all relative ${
            activeTab === "services"
              ? "text-amber-500"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <span>Services & Work Tasks ({stats.serviceCount})</span>
          {activeTab === "services" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={`pb-3 px-3 text-xs font-bold transition-all relative ${
            activeTab === "wallet"
              ? "text-amber-500"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <span>Wallet Financial Ledger ({client.wallet?.transactions?.length || 0})</span>
          {activeTab === "wallet" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`pb-3 px-3 text-xs font-bold transition-all relative ${
            activeTab === "documents"
              ? "text-amber-500"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <span>Documents & Vault ({client.documents?.length || 0})</span>
          {activeTab === "documents" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {/* 4. Tab 1: Services & Work Tasks Table */}
      {activeTab === "services" && (
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Service & Category</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Base Fee</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Commission</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Total Price</th>
                <th className="py-3 px-4 text-center min-w-[130px]">Work Status</th>
                <th className="py-3 px-4 min-w-[160px]">Assigned Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {client.services && client.services.length > 0 ? (
                client.services.map((srv, idx) => {
                  const base = Number(srv.basePrice || 0);
                  const comm = Number(srv.commissionAmount || 0);
                  const total = Number(srv.totalPrice || base + comm);

                  return (
                    <tr key={srv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
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
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                        AED {base.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                        + AED {comm.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        AED {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            srv.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                              : srv.status === "IN_PROGRESS" || srv.status === "ASSIGNED"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200"
                              : srv.status === "READY_TO_ASSIGN"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200"
                          }`}
                        >
                          {srv.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {srv.assignedStaff ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {srv.assignedStaff.fullName || srv.assignedStaff.username}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No services configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Tab 2: Wallet Financial Ledger Table */}
      {activeTab === "wallet" && (
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#161924]">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Audit-Verified Financial Transactions
            </span>
            <button
              type="button"
              onClick={() => setShowTopUpModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Top-Up Deposit</span>
            </button>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[150px]">Transaction Type</th>
                <th className="py-3 px-4 min-w-[130px] text-right">Amount</th>
                <th className="py-3 px-4 min-w-[150px]">Balance Change</th>
                <th className="py-3 px-4 min-w-[130px]">Method & Ref</th>
                <th className="py-3 px-4 min-w-[200px]">Description</th>
                <th className="py-3 px-4 min-w-[120px]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {client.wallet?.transactions && client.wallet.transactions.length > 0 ? (
                client.wallet.transactions.map((tx, idx) => {
                  const isCredit = tx.type === "CREDIT_ADVANCE" || tx.type === "CREDIT_TOPUP";
                  const amt = Number(tx.amount || 0);
                  const before = Number(tx.balanceBefore || 0);
                  const after = Number(tx.balanceAfter || 0);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCredit
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200"
                          }`}
                        >
                          {tx.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {isCredit ? "+" : "-"} AED {amt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {before.toFixed(2)} → <span className="font-bold text-slate-900 dark:text-white">{after.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <span className="font-semibold block">{tx.paymentMethod?.replace(/_/g, " ") || "Internal"}</span>
                        {tx.referenceId && <span className="font-mono text-[10px] text-slate-400">{tx.referenceId}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No financial transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Tab 3: Documents Vault & Proforma Invoices */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Issued Proforma Invoices
            </h3>
            {client.proformaInvoices && client.proformaInvoices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {client.proformaInvoices.map((pi) => (
                  <div
                    key={pi.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-mono font-bold text-amber-500 block">
                        {pi.proformaNumber}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        AED {Number(pi.grandTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Status: {pi.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowProformaModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      View / Print
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No proforma invoices found.</p>
            )}
          </div>
        </div>
      )}

      {/* Convert to Work Modal */}
      {showConvertModal && (
        <ConvertToWorkModal
          isOpen={showConvertModal}
          client={client}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => loadData()}
        />
      )}

      {/* Wallet Top-Up Modal */}
      {showTopUpModal && (
        <WalletTopUpModal
          isOpen={showTopUpModal}
          client={client}
          onClose={() => setShowTopUpModal(false)}
          onSuccess={() => loadData()}
        />
      )}

      {/* Proforma Invoice Modal Preview */}
      {showProformaModal && latestProforma && (
        <ProformaInvoiceModal
          isOpen={showProformaModal}
          proformaId={latestProforma.id}
          onClose={() => setShowProformaModal(false)}
        />
      )}
    </div>
  );
}

