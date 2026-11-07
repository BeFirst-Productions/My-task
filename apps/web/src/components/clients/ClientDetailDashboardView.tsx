"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  User,
  UserX,
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
  MessageCircle,
  MapPin,
  UserPlus,
  ShieldAlert,
  X,
  Users2,
  Check,
  Calendar,
} from "lucide-react";
import {
  ClientData,
  fetchClientDetails,
  generateClientProforma,
  ClientServiceItemData,
} from "@/services/client.service";
import { ConvertToWorkModal } from "./ConvertToWorkModal";
import { WalletTopUpModal } from "./WalletTopUpModal";
import { ProformaInvoiceModal } from "@/components/proforma/ProformaInvoiceModal";
import { useAuth } from "@/context/AuthContext";
import { fetchCompanyStaff, StaffMember } from "@/services/task.service";
import { assignWorkOrderServices } from "@/services/work-order.service";

interface ClientDetailDashboardViewProps {
  clientId: string;
  onBack: () => void;
  backLabel?: string;
  isWorkOrder?: boolean;
}

export function ClientDetailDashboardView({
  clientId,
  onBack,
  backLabel,
  isWorkOrder,
}: ClientDetailDashboardViewProps) {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);

  // Role permissions:
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "PLATFORM_OWNER";
  const isAdmin = user?.role === "ADMIN";
  const isAccountant = user?.role === "ACCOUNTANT";

  // Converted to work status:
  // Client is converted to work when status is no longer WORK_PENDING_PAYMENT (e.g. IN_PROGRESS or COMPLETED)
  const isConvertedToWork = Boolean(client && client.status !== "WORK_PENDING_PAYMENT");
  const isConvertPending = Boolean(client && client.status === "WORK_PENDING_PAYMENT");

  // Staff assignment permission:
  // Strictly permitted for Super Admin and Administrator ONLY AFTER client has been converted to work.
  // Accountant / Accounts Manager does NOT have staff assignment capabilities.
  const canAssignStaff = (isSuperAdmin || isAdmin) && isConvertedToWork;

  // Work order module mode: strictly active when accessed via Work Orders module
  const isWorkOrderMode = Boolean(
    isWorkOrder === true ||
    backLabel === "Back to Work Orders" ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "work-orders")
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"services" | "wallet" | "documents">("services");

  // Dialog States
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [selectedProformaId, setSelectedProformaId] = useState<string | null>(null);
  const [isGeneratingProforma, setIsGeneratingProforma] = useState(false);

  // Staff Assignment Dialog & Multi-Select Checkbox State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Deliverable & Remarks Modal State
  const [selectedDeliverableTask, setSelectedDeliverableTask] = useState<ClientServiceItemData | null>(null);

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

  const handleGenerateProforma = async () => {
    if (!client) return;
    setIsGeneratingProforma(true);
    try {
      const res = await generateClientProforma(client.id);
      if (res.success && res.data) {
        await loadData();
        setSelectedProformaId(res.data.id);
        setShowProformaModal(true);
      } else {
        alert(res.message || "Failed to generate proforma invoice.");
      }
    } catch (err: any) {
      console.error("Failed to generate proforma invoice:", err);
      alert(err.message || "An unexpected error occurred while generating proforma invoice.");
    } finally {
      setIsGeneratingProforma(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  // Load operational staff list for assignment (Admin / Super Admin only)
  useEffect(() => {
    async function loadStaff() {
      if (!isSuperAdmin && !isAdmin) return;
      try {
        const staff = await fetchCompanyStaff(client?.organisationId || "ibh", "STAFF");
        setStaffList(staff);
      } catch (err) {
        console.warn("Failed to load staff list:", err);
      }
    }
    loadStaff();
  }, [client?.organisationId, isSuperAdmin, isAdmin]);

  // Only users with role === 'STAFF' are assignable operational staff members
  const assignableStaffList = useMemo(() => {
    return staffList.filter((s) => s.role === "STAFF");
  }, [staffList]);

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  }

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

    // Conversion date: first credit advance transaction, or client creation date
    const advanceTx = transactions.slice().reverse().find((t) => t.type === "CREDIT_ADVANCE");
    const convertDate = advanceTx?.createdAt || client?.createdAt || null;

    // Completed date: when all services completed and at least 1 service exists
    const isAllCompleted = services.length > 0 && services.every((s) => s.status === "COMPLETED");
    const completionTimes = services
      .map((s) => (s.completedAt ? new Date(s.completedAt).getTime() : 0))
      .filter((t) => t > 0);
    const completedDate =
      isAllCompleted && completionTimes.length > 0
        ? new Date(Math.max(...completionTimes)).toISOString()
        : null;

    return {
      walletBalance,
      totalPackageValue,
      serviceCount: services.length,
      completedCount,
      inProgressCount,
      totalCredited,
      convertDate,
      completedDate,
      isAllCompleted,
    };
  }, [client]);

  // Helper to check if a service already has a staff assigned
  const isServiceAssigned = (srv: ClientServiceItemData) => {
    return Boolean(
      srv.assignedStaffId ||
      srv.assignedStaff ||
      srv.status === "ASSIGNED" ||
      srv.status === "IN_PROGRESS"
    );
  };

  // Only genuinely UNASSIGNED & non-completed services are assignable
  const assignableServices = useMemo(() => {
    return (client?.services || []).filter(
      (s) => s.status !== "COMPLETED" && !isServiceAssigned(s)
    );
  }, [client?.services]);

  // Selected services strictly filtered to unassigned services
  const selectedServices = useMemo(() => {
    return (client?.services || []).filter(
      (s) => selectedServiceIds.includes(s.id) && s.status !== "COMPLETED" && !isServiceAssigned(s)
    );
  }, [client?.services, selectedServiceIds]);

  const selectedTotalRequired = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
      const price = Number(s.totalPrice || 0);
      return sum + (s.status === "READY_TO_ASSIGN" || s.status === "PENDING_PAYMENT" ? price : 0);
    }, 0);
  }, [selectedServices]);

  const walletBalance = Number(client?.wallet?.balance || 0);
  const isWalletSufficient = walletBalance >= selectedTotalRequired;

  const toggleSelectService = (id: string) => {
    const srv = client?.services?.find((s) => s.id === id);
    // Ignore if completed or already assigned to a staff member
    if (!srv || srv.status === "COMPLETED" || isServiceAssigned(srv)) {
      return;
    }
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (assignableServices.length === 0) return;
    if (selectedServices.length === assignableServices.length) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(assignableServices.map((s) => s.id));
    }
  };

  // Submit Assignment
  const handleConfirmAssign = async () => {
    if (!selectedStaffId || selectedServiceIds.length === 0 || !client) return;
    setIsAssigning(true);
    setAssignFeedback(null);
    try {
      const res = await assignWorkOrderServices({
        organisationId: client.organisationId,
        serviceItemIds: selectedServiceIds,
        staffId: selectedStaffId,
        assignedById: user?.id,
      });

      if (res.success) {
        const assignedStaffObj = assignableStaffList.find((s) => s.id === selectedStaffId);
        const staffName = assignedStaffObj?.name || "Staff Member";
        setAssignFeedback({
          type: "success",
          message: `${selectedServiceIds.length} service task(s) successfully assigned to ${staffName}!`,
        });
        setAssignModalOpen(false);
        setSelectedServiceIds([]);
        setSelectedStaffId("");
        await loadData();
      } else {
        setAssignFeedback({
          type: "error",
          message: res.message || "Failed to assign work order tasks.",
        });
      }
    } catch (err: any) {
      setAssignFeedback({
        type: "error",
        message: err.message || "An unexpected error occurred during assignment.",
      });
    } finally {
      setIsAssigning(false);
    }
  };

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
      {/* Assignment Feedback Banner */}
      {assignFeedback && (
        <div
          className={`mb-5 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
            assignFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {assignFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{assignFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAssignFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header with Client Profile & Key Conversion / Top-Up Actions */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#12141c] p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-500 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel || "Back to All Clients"}</span>
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
                {client.whatsappNumber && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                    {client.whatsappNumber}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {client.email}
                  </span>
                )}
                {client.address && (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {client.address}
                  </span>
                )}
                {client.salesStaff && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Sales Rep: {client.salesStaff.fullName || client.salesStaff.username}
                  </span>
                )}
                {stats.convertDate && (
                  <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Convert Date: {formatDate(stats.convertDate)}</span>
                  </span>
                )}
                {stats.isAllCompleted && stats.completedDate && (
                  <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Completed: {formatDate(stats.completedDate)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons on Top Right */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Prominent Convert to Work Button (Accounts Manager action - not in work orders) */}
          {!isWorkOrderMode && isConvertPending && (
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Convert to Work</span>
            </button>
          )}

          {/* Top-Up Wallet Button (Hidden in Work Orders module; Disabled while Convert to Work is pending) */}
          {!isWorkOrderMode && (
            <button
              type="button"
              disabled={isConvertPending}
              onClick={() => {
                if (isConvertPending) return;
                setShowTopUpModal(true);
              }}
              title={
                isConvertPending
                  ? "Please 'Convert to Work' first with initial advance deposit before topping up wallet"
                  : "Add funds to client financial wallet"
              }
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                isConvertPending
                  ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 shadow-none pointer-events-auto"
                  : "cursor-pointer bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-slate-950 dark:text-amber-400 border border-amber-500/20 shadow-xs active:scale-95"
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Top-Up Wallet</span>
            </button>
          )}

          {/* View / Print Proforma Invoice or Generate (Only in Client Management / Pre-Conversion, NOT in Work Orders) */}
          {!isWorkOrderMode && (
            latestProforma ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedProformaId(latestProforma.id);
                  setShowProformaModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors"
              >
                <Receipt className="h-4 w-4 text-amber-500" />
                <span>Proforma ({latestProforma.proformaNumber})</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isGeneratingProforma}
                onClick={handleGenerateProforma}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-sm shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isGeneratingProforma ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    <span>Generating Proforma...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    <span>Generate Proforma</span>
                  </>
                )}
              </button>
            )
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
              {stats.isAllCompleted && stats.completedDate ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Completed on {formatDate(stats.completedDate)}
                </span>
              ) : (
                `${stats.inProgressCount} task(s) currently active`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Services / Wallet Ledger / Documents) */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={`pb-3.5 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "services"
              ? "text-amber-500"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Services & Work Tasks</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors ${
              activeTab === "services"
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            }`}
          >
            {stats.serviceCount}
          </span>
          {activeTab === "services" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={`pb-3.5 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "wallet"
              ? "text-amber-500"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Wallet Financial Ledger</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors ${
              activeTab === "wallet"
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            }`}
          >
            {client.wallet?.transactions?.length || 0}
          </span>
          {activeTab === "wallet" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`pb-3.5 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "documents"
              ? "text-amber-500"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Documents & Vault</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors ${
              activeTab === "documents"
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            }`}
          >
            {client.documents?.length || 0}
          </span>
          {activeTab === "documents" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {/* 4. Tab 1: Services & Work Tasks Table */}
      {activeTab === "services" && (
        <div className="space-y-3">
          {/* Action Toolbar on Top of Table */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#12141c] p-4 px-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Services & Deliverables
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                  {client.services?.length || 0}
                </span>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              {canAssignStaff ? (
                selectedServices.length > 0 ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-in fade-in zoom-in-95">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>
                      {selectedServices.length} Unassigned Task{selectedServices.length > 1 ? "s" : ""} Selected
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="font-mono font-bold">
                      AED {selectedTotalRequired.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </span>
                ) : assignableServices.length > 0 ? (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Select unassigned tasks using checkboxes to assign operational staff
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>All services are currently assigned to operational staff</span>
                  </span>
                )
              ) : (
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {!isConvertedToWork
                    ? "Pending Convert to Work — Advance payment required before staff assignment"
                    : isAccountant
                    ? "Financial & operational deliverable status"
                    : "Staff assignment managed by Administrator"}
                </span>
              )}
            </div>

            {canAssignStaff && (
              <div className="flex items-center gap-2 shrink-0">
                {selectedServices.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffId("");
                      setAssignModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/25 active:scale-95 cursor-pointer ring-2 ring-amber-500/30 transition-all animate-in fade-in zoom-in-95"
                  >
                    <Users2 className="h-4 w-4" />
                    <span>
                      Assign Selected ({selectedServices.length}) to Staff
                    </span>
                  </button>
                ) : assignableServices.length > 0 ? (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Select All Unassigned ({assignableServices.length})</span>
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Itemized Services Table */}
          <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    {/* Select All Checkbox - Only for Super Admin / Admin after conversion when unassigned tasks exist */}
                    {canAssignStaff && (
                      <th className="py-3.5 px-3 w-12 text-center">
                        <input
                          type="checkbox"
                          disabled={assignableServices.length === 0}
                          checked={
                            assignableServices.length > 0 &&
                            selectedServices.length === assignableServices.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded-md border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 h-4 w-4"
                          title={
                            assignableServices.length > 0
                              ? "Select / Unselect all unassigned tasks"
                              : "All tasks are already assigned"
                          }
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-3 w-12 text-center font-mono">#</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Service & Category</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px] whitespace-nowrap">Base Fee</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px] whitespace-nowrap">Commission</th>
                    <th className="py-3.5 px-4 text-right min-w-[140px] whitespace-nowrap">Total Price</th>
                    <th className="py-3.5 px-4 text-center min-w-[150px] whitespace-nowrap">Work Status</th>
                    <th className="py-3.5 px-4 min-w-[210px]">Assigned Staff</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Deliverable & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {client.services && client.services.length > 0 ? (
                    client.services.map((srv, idx) => {
                      const base = Number(srv.basePrice || 0);
                      const comm = Number(srv.commissionAmount || 0);
                      const total = Number(srv.totalPrice || base + comm);
                      const isCompleted = srv.status === "COMPLETED";
                      const isAssigned = isServiceAssigned(srv);
                      const isChecked = selectedServiceIds.includes(srv.id) && !isAssigned;

                      return (
                        <tr
                          key={srv.id}
                          onClick={() => {
                            if (canAssignStaff && !isCompleted && !isAssigned) {
                              toggleSelectService(srv.id);
                            }
                          }}
                          className={`transition-colors select-none ${
                            canAssignStaff && !isCompleted && !isAssigned ? "cursor-pointer" : ""
                          } ${
                            isChecked
                              ? "bg-amber-500/[0.08] dark:bg-amber-500/[0.12]"
                              : "hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                          }`}
                        >
                          {/* Checkbox - Only when staff assignment is enabled */}
                          {canAssignStaff && (
                            <td
                              className="py-4 px-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isCompleted ? (
                                <div
                                  title="Task Completed"
                                  className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold mx-auto"
                                >
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </div>
                              ) : isAssigned ? (
                                <div
                                  title={`Staff already assigned: ${srv.assignedStaff?.fullName || srv.assignedStaff?.username || "Assigned specialist"}`}
                                  className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold mx-auto"
                                >
                                  <Users2 className="h-3 w-3" />
                                </div>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectService(srv.id)}
                                  className="rounded-md border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500/40 cursor-pointer h-4 w-4 transition-all"
                                  title="Select unassigned task for staff assignment"
                                />
                              )}
                            </td>
                          )}

                          {/* # */}
                          <td className="py-4 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Service & Category */}
                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-900 dark:text-white block text-xs leading-snug">
                              {srv.serviceItem?.name || "Corporate Service"}
                            </span>
                            {srv.serviceItem?.category?.name && (
                              <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {srv.serviceItem.category.name}
                              </span>
                            )}
                          </td>

                          {/* Base Fee */}
                          <td className="py-4 px-4 text-right font-mono font-medium text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <span className="text-[10px] text-slate-400 mr-1 font-sans">AED</span>
                            <span>{base.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                          </td>

                          {/* Commission */}
                          <td className="py-4 px-4 text-right font-mono font-medium text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            <span className="text-[10px] text-amber-500/80 mr-1 font-sans">+ AED</span>
                            <span>{comm.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                          </td>

                          {/* Total Price */}
                          <td className="py-4 px-4 text-right font-mono font-black text-xs text-slate-900 dark:text-white whitespace-nowrap">
                            <span className="text-[10px] text-slate-400 mr-1 font-sans">AED</span>
                            <span>{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                          </td>

                          {/* Work Status */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${
                                srv.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                  : srv.status === "IN_PROGRESS" || srv.status === "ASSIGNED"
                                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800/60"
                                  : srv.status === "READY_TO_ASSIGN"
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  srv.status === "COMPLETED"
                                    ? "bg-emerald-500"
                                    : srv.status === "IN_PROGRESS" || srv.status === "ASSIGNED"
                                    ? "bg-sky-500 animate-pulse"
                                    : srv.status === "READY_TO_ASSIGN"
                                    ? "bg-purple-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              <span>{srv.status.replace(/_/g, " ")}</span>
                            </span>
                          </td>

                          {/* Assigned Staff */}
                          <td className="py-4 px-4">
                            {srv.assignedStaff ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs">
                                      {srv.assignedStaff.fullName ? srv.assignedStaff.fullName.charAt(0).toUpperCase() : "S"}
                                    </div>
                                    <span
                                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#12141c] ${
                                        srv.assignedStaff.isAvailable ? "bg-emerald-500" : "bg-amber-500"
                                      }`}
                                      title={srv.assignedStaff.isAvailable ? "Staff Active & Available" : "Staff Busy"}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 dark:text-white truncate block text-xs leading-tight">
                                      {srv.assignedStaff.fullName || srv.assignedStaff.username}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {srv.assignedStaff.designation || "Assigned Specialist"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : isAssigned ? (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold text-xs">
                                  <Users2 className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 dark:text-white truncate block text-xs leading-tight">
                                    Assigned Specialist
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    Operational Task Active
                                  </span>
                                </div>
                              </div>
                            ) : canAssignStaff ? (
                              <div className="flex items-center gap-2.5">
                                <div className="relative group inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedServiceIds([srv.id]);
                                      setSelectedStaffId("");
                                      setAssignModalOpen(true);
                                    }}
                                    title="Assign staff here"
                                    aria-label="Assign staff here"
                                    className="h-8 w-8 rounded-xl border border-dashed border-amber-500/50 hover:border-amber-500 bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 flex items-center justify-center transition-all duration-150 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </button>
                                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex items-center z-50">
                                    <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-800 rotate-45 -mr-0.5 border-l border-b border-slate-700/60" />
                                    <span className="whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl border border-slate-700/60">
                                      Assign staff here
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedServiceIds([srv.id]);
                                    setSelectedStaffId("");
                                    setAssignModalOpen(true);
                                  }}
                                  className="text-left group cursor-pointer"
                                >
                                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-amber-500 transition-colors block leading-tight">
                                    Not Assigned
                                  </span>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 group-hover:underline block font-medium">
                                    Click to assign
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0">
                                  <UserX className="h-3.5 w-3.5 text-slate-400" />
                                </div>
                                <div>
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block leading-tight">
                                    Not Assigned
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                                    {!isConvertedToWork ? "Pending Convert to Work" : "Awaiting Admin Assignment"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Deliverable & Notes */}
                          <td className="py-4 px-4">
                            {srv.status === "COMPLETED" ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDeliverableTask(srv);
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs group cursor-pointer active:scale-95 ${
                                  srv.completionDoc
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-950/70"
                                    : srv.completionNotes
                                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-950/70"
                                    : "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/60"
                                }`}
                                title="Click to view deliverable document and staff remarks"
                              >
                                {srv.completionDoc ? (
                                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                                ) : srv.completionNotes ? (
                                  <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                )}
                                <span className="truncate max-w-[130px]">
                                  {srv.completionDoc
                                    ? srv.completionDoc.documentName
                                    : srv.completionNotes
                                    ? "View Remarks"
                                    : "View Completion"}
                                </span>
                                <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0 ml-0.5" />
                              </button>
                            ) : srv.completionNotes ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDeliverableTask(srv);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                title={srv.completionNotes}
                              >
                                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[120px] text-[11px]">{srv.completionNotes}</span>
                              </button>
                            ) : srv.status === "IN_PROGRESS" || srv.status === "ASSIGNED" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 text-xs font-medium">
                                <Clock className="h-3.5 w-3.5 text-sky-500" />
                                <span>In Execution</span>
                              </span>
                            ) : srv.status === "READY_TO_ASSIGN" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 text-xs font-medium">
                                <Clock className="h-3.5 w-3.5 text-purple-400" />
                                <span>Awaiting Staff</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-xs">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Pending Advance</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={canAssignStaff ? 9 : 8} className="py-8 text-center text-slate-400">
                        No services configured.
                      </td>
                    </tr>
                  )}
                </tbody>
                {client.services && client.services.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#161924] font-bold">
                    <tr>
                      <td colSpan={canAssignStaff ? 3 : 2} className="py-4 px-4 text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400">
                            Package Total:
                          </span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                            {client.services.length} Services
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <span className="text-[10px] text-slate-400 mr-1 font-sans">AED</span>
                        <span>
                          {client.services
                            .reduce((acc, s) => acc + Number(s.basePrice || 0), 0)
                            .toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        <span className="text-[10px] text-amber-500/80 mr-1 font-sans">+ AED</span>
                        <span>
                          {client.services
                            .reduce((acc, s) => acc + Number(s.commissionAmount || 0), 0)
                            .toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs font-black text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="text-[10px] text-slate-400 mr-1 font-sans">AED</span>
                        <span>
                          {stats.totalPackageValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td colSpan={3} className="py-4 px-4 text-right text-slate-400 text-[11px] font-normal whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{stats.completedCount} of {stats.serviceCount} completed</span>
                          {stats.inProgressCount > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-sky-600 dark:text-sky-400 font-semibold">{stats.inProgressCount} active</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Wallet Financial Ledger Table */}
      {activeTab === "wallet" && (
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#161924]">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Audit-Verified Financial Transactions
            </span>
            {!isWorkOrderMode && (
              <button
                type="button"
                disabled={isConvertPending}
                onClick={() => {
                  if (isConvertPending) return;
                  setShowTopUpModal(true);
                }}
                title={
                  isConvertPending
                    ? "Please 'Convert to Work' first with initial advance deposit before adding top-up deposits"
                    : "Add top-up deposit"
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  isConvertPending
                    ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 shadow-none pointer-events-auto"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer active:scale-95"
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Add Top-Up Deposit</span>
              </button>
            )}
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
          {!isWorkOrderMode && (
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
                        onClick={() => {
                          setSelectedProformaId(pi.id);
                          setShowProformaModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-amber-400"
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
          )}

          {/* Client Documents & Deliverables Vault */}
          <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Client Documents & Deliverables Vault
            </h3>
            {client.documents && client.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {client.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {doc.documentName}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Type: {doc.documentType}
                      </span>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-amber-400"
                    >
                      View File
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No client documents found in vault.</p>
            )}
          </div>
        </div>
      )}

      {/* Convert to Work Modal (Not in Work Orders module) */}
      {!isWorkOrderMode && showConvertModal && (
        <ConvertToWorkModal
          isOpen={showConvertModal}
          client={client}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => loadData()}
        />
      )}

      {/* Wallet Top-Up Modal (Not in Work Orders module, only when converted to work) */}
      {!isWorkOrderMode && !isConvertPending && showTopUpModal && (
        <WalletTopUpModal
          isOpen={showTopUpModal}
          client={client}
          onClose={() => setShowTopUpModal(false)}
          onSuccess={() => loadData()}
        />
      )}

      {/* Proforma Invoice Modal Preview */}
      {showProformaModal && (selectedProformaId || latestProforma?.id) && (
        <ProformaInvoiceModal
          isOpen={showProformaModal}
          proformaId={selectedProformaId || latestProforma?.id}
          onClose={() => {
            setShowProformaModal(false);
            setSelectedProformaId(null);
          }}
        />
      )}

      {/* 7. Staff Assignment Modal with Card-like Structure & Visual Color Status Indications */}
      {assignModalOpen && canAssignStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Assign Selected Task(s) to Staff
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select an active operational staff member from the cards below
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedStaffId("");
                }}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Selected Tasks & Financial Wallet Overview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161924] border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Selected Tasks ({selectedServices.length}):
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      AED {selectedTotalRequired.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Wallet Check Chip */}
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                    <Wallet className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-500">Wallet:</span>
                    <span
                      className={
                        isWalletSufficient
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      AED {walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* List of Selected Task Titles */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedServices.map((srv) => (
                    <span
                      key={srv.id}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <span>{srv.serviceItem?.name || "Service Task"}</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 text-[10px]">
                        AED {Number(srv.totalPrice || 0).toFixed(2)}
                      </span>
                    </span>
                  ))}
                </div>

                {/* Insufficient Funds Warning */}
                {!isWalletSufficient && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <span className="font-bold block">Insufficient Client Wallet Balance</span>
                      <span>
                        Client wallet needs AED {(selectedTotalRequired - walletBalance).toFixed(2)} top-up to fund this assignment.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Staff Cards Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Staff Directory ({assignableStaffList.length} Team Members)
                  </h4>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active & Available
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Busy / Max Load
                    </span>
                  </div>
                </div>

                {assignableStaffList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No staff role members found in this organisation.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[340px] overflow-y-auto pr-1">
                    {assignableStaffList.map((staff) => {
                      const isStaffActive =
                        staff.isAvailable !== false && (staff.activeTasksCount ?? 0) < 4;
                      const isSelected = selectedStaffId === staff.id;

                      return (
                        <div
                          key={staff.id}
                          onClick={() => {
                            if (isStaffActive) {
                              setSelectedStaffId(staff.id);
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all relative select-none ${
                            isSelected
                              ? "border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-md shadow-amber-500/20 ring-2 ring-amber-500/30 cursor-pointer scale-[1.01]"
                              : isStaffActive
                              ? "border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.08] dark:bg-emerald-500/[0.02] dark:hover:bg-emerald-500/[0.07] cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5"
                              : "border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 opacity-55 cursor-not-allowed"
                          }`}
                        >
                          {/* Header row of card */}
                          <div className="flex items-start justify-between gap-2.5 mb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  staff.avatarColor || "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {staff.initials || "ST"}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                  {staff.name}
                                </h5>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {staff.designation || staff.role?.replace(/_/g, " ") || "Operational Staff"}
                                </span>
                              </div>
                            </div>

                            {/* Status badge or checkmark */}
                            <div className="shrink-0">
                              {isSelected ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                                  <Check className="h-3 w-3" /> Selected
                                </span>
                              ) : isStaffActive ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Available
                                </span>
                              ) : staff.isAvailable === false ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  Offline
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Busy
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle row: Department & Workload */}
                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                            <span className="text-slate-500 truncate max-w-[130px]">
                              {staff.department || "Operations"}
                            </span>
                            <span
                              className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-md ${
                                (staff.activeTasksCount || 0) >= 4
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              }`}
                            >
                              {staff.activeTasksCount || 0} active task(s)
                            </span>
                          </div>

                          {/* Footer info: Email or Seat */}
                          <div className="mt-2 text-[10px] text-slate-400 truncate">
                            {staff.email || staff.phoneNumber || staff.seatNo}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823]">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {selectedStaffId ? (
                  <span>
                    Selected:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {staffList.find((s) => s.id === selectedStaffId)?.name}
                    </strong>
                  </span>
                ) : (
                  <span>Click an active staff card to select</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAssignModalOpen(false);
                    setSelectedStaffId("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedStaffId || !isWalletSufficient || isAssigning}
                  onClick={handleConfirmAssign}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isAssigning ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      <span>Assigning Tasks...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm & Assign ({selectedServices.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Deliverable Document & Remarks Modal */}
      {selectedDeliverableTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Deliverable & Staff Remarks
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedDeliverableTask.serviceItem?.name || "Corporate Service"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDeliverableTask(null)}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Task Meta Row */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161924] border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                    {selectedDeliverableTask.assignedStaff?.fullName
                      ? selectedDeliverableTask.assignedStaff.fullName.charAt(0).toUpperCase()
                      : "S"}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {selectedDeliverableTask.assignedStaff?.fullName || selectedDeliverableTask.assignedStaff?.username || "Operational Staff"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {selectedDeliverableTask.assignedStaff?.designation || "Assigned Specialist"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>{selectedDeliverableTask.status.replace(/_/g, " ")}</span>
                  </span>
                  {selectedDeliverableTask.completedAt && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Completed: {new Date(selectedDeliverableTask.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Section 1: Deliverable Document */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-emerald-500" />
                    <span>Deliverable File</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Optional upload by staff)</span>
                  </label>
                  {selectedDeliverableTask.completionDoc?.documentUrl && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Document Attached
                    </span>
                  )}
                </div>

                {selectedDeliverableTask.completionDoc?.documentUrl ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <FileCheck2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {selectedDeliverableTask.completionDoc.documentName || "Official Deliverable Document"}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Click to open and inspect verified file
                        </p>
                      </div>
                    </div>

                    <a
                      href={selectedDeliverableTask.completionDoc.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      <span>View File</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      No deliverable document attached
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Document upload was optional for this task. See completion remarks below.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Staff Completion Remarks / Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span>Staff Completion Remarks</span>
                </label>

                {selectedDeliverableTask.completionNotes ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161924] border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedDeliverableTask.completionNotes}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                    No specific remarks were entered for this task.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

