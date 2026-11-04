"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  UserCheck,
  UserPlus,
  UserX,
  Wallet,
  Users2,
  AlertCircle,
  Plus,
  Send,
  ChevronDown,
  X,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Building2,
  FileCheck2,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  fetchWorkOrders,
  assignWorkOrderServices,
  WorkOrderItemData,
} from "@/services/work-order.service";
import { fetchCompanyStaff, StaffMember } from "@/services/task.service";
import { useAuth } from "@/context/AuthContext";

interface AdminWorkOrderViewProps {
  orgId?: string;
  orgSubdomain?: string;
  onSelectClient?: (clientId: string) => void;
}

export function AdminWorkOrderView({
  orgId,
  orgSubdomain,
  onSelectClient,
}: AdminWorkOrderViewProps) {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderItemData[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: "clients" (default) groups by client, "tasks" lists individual service items
  const [viewMode, setViewMode] = useState<"clients" | "tasks">("clients");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedDeliverableTask, setSelectedDeliverableTask] = useState<WorkOrderItemData | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [orders, staff] = await Promise.all([
        fetchWorkOrders({
          organisationId: orgId || orgSubdomain,
        }),
        fetchCompanyStaff(orgId || orgSubdomain, "STAFF"),
      ]);
      setWorkOrders(orders);
      setStaffList(staff);
    } catch (err) {
      console.warn("Failed to load work orders data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, orgSubdomain]);

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

  // Only users with role === 'STAFF' are assignable operational staff members
  const assignableStaffList = useMemo(() => {
    return staffList.filter((s) => s.role === "STAFF");
  }, [staffList]);

  // Client-side filtering for instantaneous tabs and search
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((w) => {
      if (statusFilter === "ALL") {
        // "ALL" shows all active work orders (ready to assign, assigned, in progress, completed)
        return w.status !== "PENDING_PAYMENT";
      }
      if (w.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient =
          w.client?.companyName?.toLowerCase().includes(q) ||
          w.client?.contactPerson?.toLowerCase().includes(q) ||
          w.client?.clientNumber?.toLowerCase().includes(q);
        const matchesService =
          w.serviceItem?.name?.toLowerCase().includes(q) ||
          w.serviceItem?.category?.name?.toLowerCase().includes(q);
        if (!matchesClient && !matchesService) return false;
      }
      return true;
    });
  }, [workOrders, statusFilter, searchQuery]);

  // Group work orders by client for organized Client Dashboard Navigation
  const clientWorkOrders = useMemo(() => {
    const map = new Map<
      string,
      {
        clientId: string;
        client: NonNullable<WorkOrderItemData["client"]>;
        services: WorkOrderItemData[];
        totalOrders: number;
        readyToAssignCount: number;
        inProgressCount: number;
        completedCount: number;
        totalPackageValue: number;
        walletBalance: number;
        convertDate: string | null;
      }
    >();

    for (const w of workOrders) {
      if (!w.clientId || !w.client) continue;
      if (w.status === "PENDING_PAYMENT") continue;

      const cId = w.clientId;
      if (!map.has(cId)) {
        // Derive conversion date: first credit advance transaction, or client/order creation date
        const convertDate =
          w.client.wallet?.transactions?.[0]?.createdAt ||
          w.client.createdAt ||
          w.createdAt ||
          null;

        map.set(cId, {
          clientId: cId,
          client: w.client,
          services: [],
          totalOrders: 0,
          readyToAssignCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          totalPackageValue: 0,
          walletBalance: Number(w.client?.wallet?.balance || 0),
          convertDate,
        });
      }
      const entry = map.get(cId)!;
      entry.services.push(w);
      entry.totalOrders += 1;
      if (w.status === "READY_TO_ASSIGN") entry.readyToAssignCount += 1;
      if (w.status === "ASSIGNED" || w.status === "IN_PROGRESS") entry.inProgressCount += 1;
      if (w.status === "COMPLETED") entry.completedCount += 1;
      entry.totalPackageValue += Number(w.totalPrice || 0);
    }

    return Array.from(map.values()).map((entry) => {
      const isAllCompleted = entry.completedCount === entry.totalOrders && entry.totalOrders > 0;
      const completionTimes = entry.services
        .map((s) => (s.completedAt ? new Date(s.completedAt).getTime() : 0))
        .filter((t) => t > 0);
      const completedDate =
        isAllCompleted && completionTimes.length > 0
          ? new Date(Math.max(...completionTimes)).toISOString()
          : null;

      return {
        ...entry,
        isAllCompleted,
        completedDate,
      };
    });
  }, [workOrders]);

  const filteredClients = useMemo(() => {
    return clientWorkOrders.filter((item) => {
      if (statusFilter === "READY_TO_ASSIGN" && item.readyToAssignCount === 0) return false;
      if (statusFilter === "IN_PROGRESS" && item.inProgressCount === 0) return false;
      if (
        statusFilter === "COMPLETED" &&
        (item.completedCount === 0 || item.completedCount !== item.totalOrders)
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient =
          item.client.companyName?.toLowerCase().includes(q) ||
          item.client.contactPerson?.toLowerCase().includes(q) ||
          item.client.clientNumber?.toLowerCase().includes(q) ||
          item.services.some(
            (s) =>
              s.serviceItem?.name?.toLowerCase().includes(q) ||
              s.serviceItem?.category?.name?.toLowerCase().includes(q)
          );
        if (!matchesClient) return false;
      }
      return true;
    });
  }, [clientWorkOrders, statusFilter, searchQuery]);

  // Handle Checkbox Selection
  const toggleSelectService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Derive selected items and compute wallet sufficiency
  const selectedItems = useMemo(() => {
    return filteredWorkOrders.filter((w) => selectedServiceIds.includes(w.id));
  }, [filteredWorkOrders, selectedServiceIds]);

  // Wallet Validation Analysis for Selected Items
  const walletAnalysis = useMemo(() => {
    if (selectedItems.length === 0) return null;

    // Group selected items by client
    const clientMap = new Map<
      string,
      {
        companyName: string;
        walletBalance: number;
        requiredTotal: number;
      }
    >();

    for (const item of selectedItems) {
      const cId = item.clientId;
      const cName = item.client?.companyName || "Client";
      const wBal = Number(item.client?.wallet?.balance || 0);
      const sTotal = Number(item.totalPrice || 0);

      if (!clientMap.has(cId)) {
        clientMap.set(cId, {
          companyName: cName,
          walletBalance: wBal,
          requiredTotal: 0,
        });
      }
      const entry = clientMap.get(cId)!;
      entry.requiredTotal += sTotal;
    }

    let hasInsufficient = false;
    let shortfallDetails = "";
    let totalRequiredSum = 0;

    for (const [, data] of clientMap.entries()) {
      totalRequiredSum += data.requiredTotal;
      if (data.walletBalance < data.requiredTotal) {
        hasInsufficient = true;
        const shortfall = data.requiredTotal - data.walletBalance;
        shortfallDetails += `${data.companyName}: Required AED ${data.requiredTotal.toFixed(
          2
        )}, Available AED ${data.walletBalance.toFixed(2)} (Shortfall: AED ${shortfall.toFixed(
          2
        )}). `;
      }
    }

    return {
      hasInsufficient,
      shortfallDetails,
      totalRequiredSum,
      clientCount: clientMap.size,
      clientEntries: Array.from(clientMap.values()),
    };
  }, [selectedItems]);

  // KPI Stats based on total active client packages
  const stats = useMemo(() => {
    const total = workOrders.filter((w) => w.status !== "PENDING_PAYMENT").length;
    const ready = workOrders.filter((w) => w.status === "READY_TO_ASSIGN").length;
    const assigned = workOrders.filter((w) => w.status === "ASSIGNED" || w.status === "IN_PROGRESS").length;
    const completed = workOrders.filter((w) => w.status === "COMPLETED").length;
    return { total, ready, assigned, completed };
  }, [workOrders]);

  // Submit Assignment
  const handleConfirmAssignment = async () => {
    if (!selectedStaffId) {
      setActionFeedback({ type: "error", message: "Please select an operational staff member." });
      return;
    }
    if (walletAnalysis?.hasInsufficient) {
      setActionFeedback({
        type: "error",
        message: "Assignment blocked: Insufficient client wallet balance.",
      });
      return;
    }

    setIsAssigning(true);
    setActionFeedback(null);

    try {
      const res = await assignWorkOrderServices({
        organisationId: orgId || orgSubdomain,
        serviceItemIds: selectedServiceIds,
        staffId: selectedStaffId,
        assignedById: user?.id,
      });

      if (res.success) {
        setActionFeedback({
          type: "success",
          message: res.message || "Services assigned and wallet debited successfully!",
        });
        setSelectedServiceIds([]);
        setIsAssignModalOpen(false);
        setSelectedStaffId("");
        loadData();
      } else {
        setActionFeedback({
          type: "error",
          message: res.message || "Failed to assign work order services.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err.message || "Network error occurred during assignment.",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* Feedback Banner */}
      {actionFeedback && (
        <div
          className={`mb-5 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Work Order Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign approved services to staff, verified by client wallet balance.
          </p>
        </div>

        {/* Selected Counter & Multi-Assign Trigger */}
        {selectedServiceIds.length > 0 && (
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
          >
            <Users2 className="h-4 w-4" />
            <span>Assign {selectedServiceIds.length} Service(s) to Staff</span>
          </button>
        )}
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">Total Work Orders</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-purple-500 block mb-1">Ready to Assign</span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.ready}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-sky-500 block mb-1">In Execution</span>
          <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{stats.assigned}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-500 block mb-1">Completed Tasks</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
        </div>
      </div>

      {/* 3. Real-Time Wallet Guard Indicator (When items are checked) */}
      {walletAnalysis && (
        <div
          className={`mb-6 p-4 rounded-2xl border transition-all animate-in fade-in duration-200 ${
            walletAnalysis.hasInsufficient
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              {walletAnalysis.hasInsufficient ? (
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">
                  {walletAnalysis.hasInsufficient
                    ? "Wallet Balance Restriction: Insufficient Client Funds"
                    : "Wallet Balance Guard Passed: Sufficient Funds"}
                </h4>
                <p className="text-xs mt-0.5 opacity-90">
                  {walletAnalysis.hasInsufficient
                    ? walletAnalysis.shortfallDetails
                    : `Total required: AED ${walletAnalysis.totalRequiredSum.toFixed(
                        2
                      )} across ${walletAnalysis.clientCount} client(s). All wallets have sufficient funds to debit.`}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={walletAnalysis.hasInsufficient}
              onClick={() => setIsAssignModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Assign to Available Staff
            </button>
          </div>
        </div>
      )}

      {/* 4. Filter Bar */}
      <div className="mb-6 flex flex-col lg:flex-row items-center justify-between gap-3 bg-white dark:bg-[#12141c] p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, contact, or service..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* View Mode Switcher: Clients (Default) vs All Task Items */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setViewMode("clients")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "clients"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              By Client ({clientWorkOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tasks")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "tasks"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Tasks ({workOrders.filter((w) => w.status !== "PENDING_PAYMENT").length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
          {["ALL", "READY_TO_ASSIGN", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
              }`}
            >
              {st === "ALL" ? "All Active Orders" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Work Orders Table: Clients Overview Mode (Default) */}
      {viewMode === "clients" ? (
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-12 text-center whitespace-nowrap">#</th>
                  <th className="py-3.5 px-4 min-w-[200px] text-center whitespace-nowrap">Company & Client ID</th>
                  <th className="py-3.5 px-4 min-w-[160px] text-center whitespace-nowrap">Contact Person</th>
                  <th className="py-3.5 px-4 min-w-[190px] text-center whitespace-nowrap">Work Order Services</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center whitespace-nowrap">Package Value</th>
                  <th className="py-3.5 px-4 min-w-[150px] text-center whitespace-nowrap">Financial Wallet</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center whitespace-nowrap">Convert Date</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center whitespace-nowrap">Work Status</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center whitespace-nowrap">Completed Date</th>
                  <th className="py-3.5 px-4 min-w-[170px] text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      <p className="mt-2 text-xs">Loading work order clients...</p>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400">
                      <Briefcase className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        No active work order clients
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Clients converted to work will appear here organized by client.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((item, idx) => {
                    const isAllCompleted =
                      item.completedCount === item.totalOrders && item.totalOrders > 0;
                    const hasReady = item.readyToAssignCount > 0;

                    return (
                      <tr
                        key={item.clientId}
                        onClick={() => onSelectClient?.(item.clientId)}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* # */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {idx + 1}
                        </td>

                        {/* Company & Client ID */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black text-xs shrink-0">
                              {item.client.companyName ? item.client.companyName[0].toUpperCase() : "C"}
                            </div>
                            <div className="text-left min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white truncate block group-hover:text-amber-500 transition-colors">
                                {item.client.companyName}
                              </span>
                              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                                {item.client.clientNumber || "CLI-AUTO"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Person */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{item.client.contactPerson}</div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 mt-0.5">
                            <span>{item.client.phoneNumber}</span>
                          </div>
                        </td>

                        {/* Work Order Services Breakdown (Fixed 3 Rows) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex justify-center">
                            <div className="flex flex-col gap-1 w-[165px]">
                              {/* Row 1: Ready to Assign */}
                              <div
                                className={`flex items-center justify-between px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                                  item.readyToAssignCount > 0
                                    ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/60"
                                    : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-800"
                                }`}
                              >
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                      item.readyToAssignCount > 0
                                        ? "bg-purple-500"
                                        : "bg-slate-300 dark:bg-slate-600"
                                    }`}
                                  />
                                  <span>Ready to Assign</span>
                                </span>
                                <span className="font-mono font-bold ml-1.5">
                                  {item.readyToAssignCount}
                                </span>
                              </div>

                              {/* Row 2: In Work */}
                              <div
                                className={`flex items-center justify-between px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                                  item.inProgressCount > 0
                                    ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800/60"
                                    : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-800"
                                }`}
                              >
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                      item.inProgressCount > 0
                                        ? "bg-sky-500 animate-pulse"
                                        : "bg-slate-300 dark:bg-slate-600"
                                    }`}
                                  />
                                  <span>In Work</span>
                                </span>
                                <span className="font-mono font-bold ml-1.5">
                                  {item.inProgressCount}
                                </span>
                              </div>

                              {/* Row 3: Completed */}
                              <div
                                className={`flex items-center justify-between px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                                  item.completedCount > 0
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                                    : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-800"
                                }`}
                              >
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                      item.completedCount > 0
                                        ? "bg-emerald-500"
                                        : "bg-slate-300 dark:bg-slate-600"
                                    }`}
                                  />
                                  <span>Completed</span>
                                </span>
                                <span className="font-mono font-bold ml-1.5">
                                  {item.completedCount}
                                  <span className="font-normal text-[9px] text-slate-400 dark:text-slate-500">
                                    /{item.totalOrders}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Package Total Value */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          AED {item.totalPackageValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Client Financial Wallet Balance */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                                item.walletBalance > 0
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              <Wallet className="h-3 w-3" />
                              <span>AED {item.walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </span>
                          </div>
                        </td>

                        {/* Convert Date */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>{formatDate(item.convertDate) || "—"}</span>
                          </div>
                        </td>

                        {/* Overall Work Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-2xs ${
                                isAllCompleted
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                                  : hasReady
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200"
                                  : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isAllCompleted
                                    ? "bg-emerald-500"
                                    : hasReady
                                    ? "bg-purple-500"
                                    : "bg-sky-500 animate-pulse"
                                }`}
                              />
                              <span>
                                {isAllCompleted
                                  ? "COMPLETED"
                                  : hasReady
                                  ? "READY TO ASSIGN"
                                  : "IN PROGRESS"}
                              </span>
                            </span>
                          </div>
                        </td>

                        {/* Completed Date */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex justify-center">
                            {isAllCompleted && item.completedDate ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono text-xs font-bold shadow-2xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>{formatDate(item.completedDate)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectClient?.(item.clientId);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-sm shadow-amber-500/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                              title="Open Client Dashboard"
                            >
                              <span className="whitespace-nowrap">Open Dashboard</span>
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Work Orders Table: All Tasks Mode */
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredWorkOrders.length > 0 &&
                        filteredWorkOrders.every((w) => selectedServiceIds.includes(w.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServiceIds(filteredWorkOrders.map((w) => w.id));
                        } else {
                          setSelectedServiceIds([]);
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[200px]">Service Task</th>
                  <th className="py-3 px-4 min-w-[180px]">Client & Wallet</th>
                  <th className="py-3 px-4 min-w-[120px] text-right">Service Cost</th>
                  <th className="py-3 px-4 min-w-[130px] text-center">Work Status</th>
                  <th className="py-3 px-4 min-w-[160px]">Assigned Staff</th>
                  <th className="py-3 px-4 min-w-[100px] text-right">Deliverable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      <p className="mt-2 text-xs">Loading work orders...</p>
                    </td>
                  </tr>
                ) : filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Briefcase className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        No work orders in this view
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Approved client packages will appear here for staff assignment.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((order) => {
                    const isChecked = selectedServiceIds.includes(order.id);
                    const walletBalance = Number(order.client?.wallet?.balance || 0);
                    const serviceCost = Number(order.totalPrice || 0);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => {
                          if (order.status !== "COMPLETED") {
                            toggleSelectService(order.id);
                          }
                        }}
                        className={`transition-colors select-none ${
                          order.status !== "COMPLETED" ? "cursor-pointer" : ""
                        } hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${
                          isChecked ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-3.5 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectService(order.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>

                        {/* Service Task */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {order.serviceItem?.name || "Corporate Service"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {order.serviceItem?.category?.name || "General"}
                          </span>
                        </td>

                        {/* Client & Live Wallet */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            {order.client?.companyName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-amber-500 font-bold">
                              {order.client?.clientNumber}
                            </span>
                            <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                walletBalance >= serviceCost
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-500"
                              }`}
                            >
                              Wallet: AED {walletBalance.toFixed(2)}
                            </span>
                          </div>
                        </td>

                        {/* Service Cost */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <span className="text-[10px] text-slate-400 mr-1 font-sans">AED</span>
                          <span>{serviceCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${
                              order.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                : order.status === "IN_PROGRESS" || order.status === "ASSIGNED"
                                ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/60"
                                : order.status === "READY_TO_ASSIGN"
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                order.status === "COMPLETED"
                                  ? "bg-emerald-500"
                                  : order.status === "IN_PROGRESS" || order.status === "ASSIGNED"
                                  ? "bg-sky-500 animate-pulse"
                                  : order.status === "READY_TO_ASSIGN"
                                  ? "bg-purple-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            <span>{order.status.replace(/_/g, " ")}</span>
                          </span>
                        </td>

                        {/* Assigned Staff */}
                        <td className="py-4 px-4">
                          {order.assignedStaff ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative shrink-0">
                                  <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs">
                                    {order.assignedStaff.fullName ? order.assignedStaff.fullName.charAt(0).toUpperCase() : "S"}
                                  </div>
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#12141c] ${
                                      order.assignedStaff.isAvailable ? "bg-emerald-500" : "bg-amber-500"
                                    }`}
                                    title={order.assignedStaff.isAvailable ? "Staff Active & Available" : "Staff Busy"}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 dark:text-white truncate block text-xs leading-tight">
                                    {order.assignedStaff.fullName || order.assignedStaff.username}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {order.assignedStaff.designation || "Assigned Specialist"}
                                  </span>
                                </div>
                              </div>
                              {order.status !== "COMPLETED" && (
                                <div className="relative group inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedServiceIds([order.id]);
                                      setSelectedStaffId(order.assignedStaff?.id || "");
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 flex items-center justify-center transition-all cursor-pointer shrink-0"
                                    title="Reassign staff"
                                    aria-label="Reassign staff"
                                  >
                                    <UserPlus className="h-3.5 w-3.5" />
                                  </button>
                                  <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-1.5 hidden group-hover:flex items-center z-50">
                                    <span className="whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xl border border-slate-700/60">
                                      Reassign staff
                                    </span>
                                    <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-800 rotate-45 -ml-0.5 border-r border-t border-slate-700/60" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="relative group inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedServiceIds([order.id]);
                                    setSelectedStaffId("");
                                    setIsAssignModalOpen(true);
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
                                  setSelectedServiceIds([order.id]);
                                  setSelectedStaffId("");
                                  setIsAssignModalOpen(true);
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
                          )}
                        </td>

                        {/* Deliverable Document */}
                        <td className="py-3.5 px-4 text-right">
                          {order.completionDoc || order.completionNotes || order.status === "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDeliverableTask(order);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs group cursor-pointer active:scale-95 ${
                                order.completionDoc
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100"
                                  : order.completionNotes
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100"
                                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                              title="Click to view deliverable document and staff remarks"
                            >
                              {order.completionDoc ? (
                                <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              )}
                              <span>
                                {order.completionDoc
                                  ? "Deliverable"
                                  : order.completionNotes
                                  ? "Remarks"
                                  : "Details"}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 ml-0.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Assign Staff Modal Popup */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Users2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assign Staff Member
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dispatch {selectedServiceIds.length} service(s) to an available operational staff member
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Wallet Summary in Modal */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">
                    Wallet Debit Amount
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedServiceIds.length} Service Task(s)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-sm text-amber-500">
                    AED {walletAnalysis?.totalRequiredSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Staff Selection Roster (Highlighting Available vs Busy) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Select Available Operational Staff Member <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {assignableStaffList.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      No staff role members found in this organisation.
                    </div>
                  ) : (
                    assignableStaffList.map((s) => {
                    const isSelected = selectedStaffId === s.id;
                    const isAvail = s.isAvailable !== false;

                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStaffId(s.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500"
                            : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedStaff"
                            checked={isSelected}
                            onChange={() => setSelectedStaffId(s.id)}
                            className="text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-xs">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {s.department || s.role || "Operational Staff"} • {s.seatNo || "Seat 101"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              !isAvail
                                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                !isAvail ? "bg-slate-400" : "bg-emerald-500 animate-pulse"
                              }`}
                            />
                            <span>{!isAvail ? "Offline" : "Online (Available)"}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isAssigning}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={isAssigning || !selectedStaffId}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isAssigning ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>Deducting Wallet & Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Confirm Assignment & Debit</span>
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

