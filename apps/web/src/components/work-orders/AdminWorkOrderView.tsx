"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
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
}

export function AdminWorkOrderView({
  orgId,
  orgSubdomain,
}: AdminWorkOrderViewProps) {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderItemData[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
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
          status: statusFilter,
          search: searchQuery,
        }),
        fetchCompanyStaff(orgId || orgSubdomain),
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
  }, [orgId, orgSubdomain, statusFilter, searchQuery]);

  // Handle Checkbox Selection
  const toggleSelectService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Derive selected items and compute wallet sufficiency
  const selectedItems = useMemo(() => {
    return workOrders.filter((w) => selectedServiceIds.includes(w.id));
  }, [workOrders, selectedServiceIds]);

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

  // KPI Stats
  const stats = useMemo(() => {
    const total = workOrders.length;
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
      <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#12141c] p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, contact, or service..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
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
              {st === "ALL" ? "All Tasks" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Work Orders Table */}
      <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      workOrders.length > 0 &&
                      workOrders.every((w) => selectedServiceIds.includes(w.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServiceIds(workOrders.map((w) => w.id));
                      } else {
                        setSelectedServiceIds([]);
                      }
                    }}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500"
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
              ) : workOrders.length === 0 ? (
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
                workOrders.map((order) => {
                  const isChecked = selectedServiceIds.includes(order.id);
                  const walletBalance = Number(order.client?.wallet?.balance || 0);
                  const serviceCost = Number(order.totalPrice || 0);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${
                        isChecked ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
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
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        AED {serviceCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            order.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                              : order.status === "IN_PROGRESS" || order.status === "ASSIGNED"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200"
                              : order.status === "READY_TO_ASSIGN"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3.5 px-4">
                        {order.assignedStaff ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                order.assignedStaff.isAvailable ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {order.assignedStaff.fullName || order.assignedStaff.username}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {order.assignedStaff.designation || "Staff"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Deliverable Document */}
                      <td className="py-3.5 px-4 text-right">
                        {order.completionDoc ? (
                          <a
                            href={order.completionDoc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:underline"
                          >
                            <span>View Doc</span>
                          </a>
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
                  {staffList.map((s) => {
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
                              isAvail
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isAvail ? "bg-emerald-500" : "bg-amber-500"}`} />
                            <span>{isAvail ? "Available" : "Busy (In Task)"}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
    </div>
  );
}

