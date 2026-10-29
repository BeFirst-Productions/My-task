"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  UploadCloud,
  Check,
  AlertCircle,
  ExternalLink,
  Phone,
  User,
  Sparkles,
  X,
} from "lucide-react";
import {
  fetchWorkOrders,
  updateWorkOrderStatus,
  WorkOrderItemData,
} from "@/services/work-order.service";
import { useAuth } from "@/context/AuthContext";

interface StaffWorkOrderViewProps {
  orgId?: string;
  orgSubdomain?: string;
}

export function StaffWorkOrderView({
  orgId,
  orgSubdomain,
}: StaffWorkOrderViewProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WorkOrderItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Completion Dialog State
  const [completingTask, setCompletingTask] = useState<WorkOrderItemData | null>(null);
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadTasks = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const orders = await fetchWorkOrders({
        organisationId: orgId || orgSubdomain,
        userRole: "STAFF",
        currentUserId: user.id,
      });
      setTasks(orders);
    } catch (err) {
      console.warn("Failed to load staff tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [orgId, orgSubdomain, user]);

  // Handle Start Work (ASSIGNED -> IN_PROGRESS)
  const handleStartWork = async (taskId: string) => {
    try {
      const res = await updateWorkOrderStatus(taskId, {
        status: "IN_PROGRESS",
        userId: user?.id,
      });
      if (res.success) {
        setActionFeedback({
          type: "success",
          message: "Task is now In Progress. Work on it and submit upon completion.",
        });
        loadTasks();
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err.message || "Failed to update task status",
      });
    }
  };

  // Handle Confirm Complete (IN_PROGRESS -> COMPLETED)
  const handleConfirmCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const res = await updateWorkOrderStatus(completingTask.id, {
        status: "COMPLETED",
        completionDocName: docName.trim() || undefined,
        completionDocUrl: docUrl.trim() || undefined,
        completionNotes: completionNotes.trim() || undefined,
        userId: user?.id,
      });

      if (res.success) {
        setActionFeedback({
          type: "success",
          message: `Task completed successfully! Your availability status has been restored to Available.`,
        });
        setCompletingTask(null);
        setDocName("");
        setDocUrl("");
        setCompletionNotes("");
        loadTasks();
      } else {
        setActionFeedback({
          type: "error",
          message: res.message || "Failed to complete task",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err.message || "Network error completing task",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group tasks by status
  const pendingTasks = tasks.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

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
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Personal Work Queue
            </span>
            <span className="text-xs text-slate-400">Operational Delivery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Assigned Work Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            View tasks assigned strictly to you by the Administrator. Update status and upload deliverables.
          </p>
        </div>

        {/* Availability Badge */}
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white block">
              {pendingTasks.length === 0 ? "Status: Available" : `Status: Working (${pendingTasks.length} Active)`}
            </span>
            <span className="text-[10px] text-slate-400">
              {pendingTasks.length === 0 ? "Ready for new work orders" : "Will restore to Available on complete"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Active Tasks Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Active & In-Progress Tasks ({pendingTasks.length})</span>
          </h2>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-2 text-xs">Loading assigned tasks...</p>
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Queue Clean — No Active Tasks
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                You currently have no pending service work orders. The Administrator will assign approved client tasks to you when available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Top status & category */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {task.serviceItem?.category?.name || "Corporate Service"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          task.status === "IN_PROGRESS"
                            ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200"
                        }`}
                      >
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      {task.serviceItem?.name}
                    </h3>

                    {/* Client Information */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161924] border border-slate-200/60 dark:border-slate-800/80 text-xs space-y-1 mb-4">
                      <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                        <span>{task.client?.companyName}</span>
                        <span className="font-mono text-[10px] text-amber-500 font-bold">
                          {task.client?.clientNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span>{task.client?.contactPerson}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <Phone className="h-3 w-3" />
                        <span>{task.client?.phoneNumber}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Assigned: {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString() : "Recent"}
                    </span>

                    {task.status === "ASSIGNED" ? (
                      <button
                        type="button"
                        onClick={() => handleStartWork(task.id)}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                      >
                        Start Work
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCompletingTask(task)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Mark as Completed</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Completed Deliverables Archive */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Completed Deliverables ({completedTasks.length})</span>
            </h2>

            <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Service Task</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Completed Date</th>
                    <th className="py-3 px-4 text-right">Vault Deliverable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {completedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {task.serviceItem?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {task.client?.companyName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : "Completed"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {task.completionDoc ? (
                          <a
                            href={task.completionDoc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:underline"
                          >
                            <span>{task.completionDoc.documentName}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Completed (No document)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Complete Task Confirmation & Optional Document Upload Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Confirm Work Order Completion
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Optionally upload the client deliverable document
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCompletion} className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161924] border border-slate-200/80 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  {completingTask.serviceItem?.name}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Client: {completingTask.client?.companyName} ({completingTask.client?.clientNumber})
                </span>
              </div>

              {/* Optional Deliverable Document Upload */}
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <UploadCloud className="h-4 w-4 text-amber-500" />
                  <span>Attach Deliverable Document (Optional)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  You can attach the issued Trade License, Visa copy, or Attestation certificate. This will be automatically archived in the Client's Document Vault.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Document Title / File Name
                  </label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Issued Trade License 2026.pdf"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Document Storage URL / CDN Link
                  </label>
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://omniexpiry.b-cdn.net/deliverables/sample.pdf (Optional)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Completion Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Service finalized with DED approval, client notified."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
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
                      <span>Completing Task...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm & Mark Completed</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

