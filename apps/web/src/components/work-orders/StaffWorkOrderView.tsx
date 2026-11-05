"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Power,
  Wifi,
  WifiOff,
  Trash2,
  Loader2,
  Play,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  fetchWorkOrders,
  updateWorkOrderStatus,
  WorkOrderItemData,
} from "@/services/work-order.service";
import { useAuth } from "@/context/AuthContext";
import { getAuthHeaders } from "@/services/auth.service";

interface StaffWorkOrderViewProps {
  orgId?: string;
  orgSubdomain?: string;
}

export function StaffWorkOrderView({
  orgId,
  orgSubdomain,
}: StaffWorkOrderViewProps) {
  const { user, setAvailability } = useAuth();
  const [tasks, setTasks] = useState<WorkOrderItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [taskTab, setTaskTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [displayLayout, setDisplayLayout] = useState<"grid" | "table">("grid");

  // Availability / Duty Status (Online / Offline)
  const isOnline = user?.isAvailable !== false;

  const handleToggleOnline = async (targetStatus: boolean) => {
    setIsUpdatingStatus(true);
    const success = await setAvailability(targetStatus);
    setIsUpdatingStatus(false);
    if (success) {
      setActionFeedback({
        type: "success",
        message: targetStatus
          ? "You are now ONLINE and marked Available for new work assignments."
          : "You are now OFFLINE. New client task assignments will be paused.",
      });
    } else {
      setActionFeedback({
        type: "error",
        message: "Failed to update availability status. Please try again.",
      });
    }
  };

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

  // Deliverable File Upload State for Bunny Storage
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    type: string;
  } | null>(null);
  const [isUploadingToBunny, setIsUploadingToBunny] = useState(false);
  const [bunnyUploadedUrl, setBunnyUploadedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds maximum allowed size of 25 MB.");
      return;
    }

    setUploadError(null);
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    setSelectedFile({ name: file.name, size: sizeStr, type: file.type });

    setDocName(file.name);

    setIsUploadingToBunny(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const clientCompany =
          completingTask?.client?.companyName ||
          completingTask?.client?.contactPerson ||
          undefined;

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            file: base64Data,
            fileName: file.name,
            clientName: clientCompany,
            folder: "task_management_doc",
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.url) {
          setBunnyUploadedUrl(data.url);
          setDocUrl(data.url);
        } else {
          setDocUrl(base64Data);
        }
      } catch (err: any) {
        console.warn("Direct Bunny upload fallback to completion handler:", err);
        setDocUrl(base64Data);
      } finally {
        setIsUploadingToBunny(false);
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read the selected file.");
      setIsUploadingToBunny(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setBunnyUploadedUrl(null);
    setDocUrl("");
    setDocName("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCloseCompletionModal = () => {
    setCompletingTask(null);
    setDocName("");
    setDocUrl("");
    setCompletionNotes("");
    setSelectedFile(null);
    setBunnyUploadedUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadTasks = async (silent: boolean = false) => {
    if (!user?.id) return;
    if (!silent) setIsLoading(true);
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
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // Live polling: check for newly assigned tasks every 4 seconds
    const interval = setInterval(() => {
      if (!user?.id) return;
      fetchWorkOrders({
        organisationId: orgId || orgSubdomain,
        userRole: "STAFF",
        currentUserId: user.id,
      })
        .then((orders) => {
          setTasks((prev) => {
            if (orders.length > prev.length) {
              const diff = orders.length - prev.length;
              setActionFeedback({
                type: "success",
                message: `⚡ Live Alert: You have ${diff} newly assigned task(s) in your queue!`,
              });
            }
            return orders;
          });
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [orgId, orgSubdomain, user?.id]);

  // Handle Start Work (ASSIGNED -> IN_PROGRESS)
  const handleStartWork = async (taskId: string) => {
    setStartingTaskId(taskId);
    try {
      const res = await updateWorkOrderStatus(taskId, {
        status: "IN_PROGRESS",
        userId: user?.id,
      });
      if (res.success) {
        // Optimistically update status locally so UI transitions immediately without section flicker
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "IN_PROGRESS" as const,
                  updatedAt: new Date().toISOString(),
                }
              : t
          )
        );
        setActionFeedback({
          type: "success",
          message: "Task is now In Progress. Work on it and submit upon completion.",
        });
        // Background silent sync without unmounting active tasks
        loadTasks(true);
      } else {
        setActionFeedback({
          type: "error",
          message: res.message || "Failed to update task status",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err.message || "Failed to update task status",
      });
    } finally {
      setStartingTaskId(null);
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
        // Optimistically update tasks array
        setTasks((prev) =>
          prev.map((t) =>
            t.id === completingTask.id
              ? {
                  ...t,
                  status: "COMPLETED" as const,
                  completedAt: new Date().toISOString(),
                  completionNotes: completionNotes.trim() || undefined,
                }
              : t
          )
        );
        handleCloseCompletionModal();
        loadTasks(true);
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

  // Group and sort tasks by status: started work (IN_PROGRESS) ALWAYS appears first!
  const pendingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS")
      .sort((a, b) => {
        // 1. IN_PROGRESS ("started work") comes first
        if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
        if (b.status === "IN_PROGRESS" && a.status !== "IN_PROGRESS") return 1;

        // 2. Secondary sort: newest updated/assigned first
        const timeA = new Date(a.updatedAt || a.assignedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.assignedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "COMPLETED")
      .sort((a, b) => {
        const timeA = new Date(a.completedAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.completedAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
  }, [tasks]);

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
            My Assigned Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            View tasks assigned strictly to you by the Administrator. Update status and upload deliverables.
          </p>
        </div>

        {/* Quick Online / Offline Status Badge in Header */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span
            className={`h-3 w-3 rounded-full ${
              isOnline ? "bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" : "bg-slate-400"
            }`}
          />
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{isOnline ? "Status: Online" : "Status: Offline"}</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                  isOnline
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {isOnline ? "Available" : "Off Duty"}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              {isOnline
                ? pendingTasks.length === 0
                  ? "Ready for new tasks"
                  : `Working (${pendingTasks.length} active)`
                : "Away from queue"}
            </span>
          </div>
        </div>
      </div>

      {/* Staff Duty & Availability Switch Section */}
      <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-white via-slate-50/70 to-white dark:from-[#12141c] dark:via-[#161824] dark:to-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
              isOnline
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10"
                : "bg-slate-500/10 border-slate-500/30 text-slate-500 dark:text-slate-400"
            }`}
          >
            {isOnline ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Staff Duty Mode
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {isOnline ? "ONLINE — On Duty" : "OFFLINE — Away / Off Duty"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              {isOnline
                ? "You are marked as Online. The Administrator can assign pending client tasks to your queue."
                : "You are marked as Offline. The Administrator will see you as unavailable and will not assign new tasks until you switch back to Online."}
            </p>
          </div>
        </div>

        {/* Toggle Switch Controls */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-2xl flex items-center gap-1 shadow-inner border border-slate-300/40 dark:border-slate-700/50">
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleToggleOnline(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isOnline
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-white" : "bg-emerald-500"}`} />
              <span>Online</span>
            </button>

            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleToggleOnline(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isOnline
                  ? "bg-slate-700 dark:bg-slate-700 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${!isOnline ? "bg-white" : "bg-slate-400"}`} />
              <span>Offline</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tasks View Toggle Switching (Active vs Completed) & Layout Mode (Grid / Table) */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        {/* Left: Active vs Completed Tabs */}
        <div className="bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-2xl flex items-center gap-1 shadow-inner border border-slate-300/40 dark:border-slate-700/50 self-start">
          <button
            type="button"
            onClick={() => setTaskTab("ACTIVE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              taskTab === "ACTIVE"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/70 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${taskTab === "ACTIVE" ? "text-amber-500" : "text-slate-400"}`} />
            <span>Active & In-Progress</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors ${
                taskTab === "ACTIVE"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : "bg-slate-300/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400"
              }`}
            >
              {pendingTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTaskTab("COMPLETED")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              taskTab === "COMPLETED"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/70 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${taskTab === "COMPLETED" ? "text-emerald-500" : "text-slate-400"}`} />
            <span>Completed Deliverables</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors ${
                taskTab === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-300/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400"
              }`}
            >
              {completedTasks.length}
            </span>
          </button>
        </div>

        {/* Right: Grid / Table Layout Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-2xl flex items-center gap-1 shadow-inner border border-slate-300/40 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setDisplayLayout("grid")}
              title="Grid Card View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                displayLayout === "grid"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/70 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayLayout("table")}
              title="Table List View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                displayLayout === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/70 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Task Content depending on Toggle Switch & Display Layout */}
      <div className="space-y-6">
        {taskTab === "ACTIVE" ? (
          <div>
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
                  You currently have no pending tasks. The Administrator will assign approved client tasks to you when available.
                </p>
              </div>
            ) : displayLayout === "grid" ? (
              /* ACTIVE TASKS: GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-5 rounded-3xl bg-white dark:bg-[#12141c] border shadow-xs flex flex-col justify-between transition-all ${
                      task.status === "IN_PROGRESS"
                        ? "border-sky-500/50 dark:border-sky-500/40 ring-1 ring-sky-500/20 shadow-sky-500/5"
                        : "border-slate-200/90 dark:border-slate-800"
                    }`}
                  >
                    <div>
                      {/* Top status & category */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {task.serviceItem?.category?.name || "Corporate Service"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                            task.status === "IN_PROGRESS"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                              : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                          }`}
                        >
                          {task.status === "IN_PROGRESS" && (
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                          )}
                          {task.status === "IN_PROGRESS" ? "In Progress" : "Assigned"}
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
                          disabled={startingTaskId === task.id}
                          onClick={() => handleStartWork(task.id)}
                          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {startingTaskId === task.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" />
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 fill-current" />
                              <span>Start Work</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCompletingTask(task)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Mark as Completed</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ACTIVE TASKS: TABLE VIEW */
              <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 min-w-[200px]">Service Task</th>
                        <th className="py-3 px-4 min-w-[180px]">Client</th>
                        <th className="py-3 px-4 min-w-[120px] text-center">Work Status</th>
                        <th className="py-3 px-4 min-w-[120px]">Assigned Date</th>
                        <th className="py-3 px-4 min-w-[140px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {pendingTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div>{task.serviceItem?.name}</div>
                            <div className="text-[10px] font-normal text-slate-400">
                              {task.serviceItem?.category?.name || "Corporate Service"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{task.client?.companyName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span>{task.client?.contactPerson}</span>
                              {task.client?.phoneNumber && (
                                <>
                                  <span>•</span>
                                  <span>{task.client?.phoneNumber}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                task.status === "IN_PROGRESS"
                                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                                  : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                              }`}
                            >
                              {task.status === "IN_PROGRESS" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                              )}
                              {task.status === "IN_PROGRESS" ? "In Progress" : "Assigned"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString() : "Recent"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {task.status === "ASSIGNED" ? (
                              <button
                                type="button"
                                disabled={startingTaskId === task.id}
                                onClick={() => handleStartWork(task.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {startingTaskId === task.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin text-slate-950" />
                                    <span>Starting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 fill-current" />
                                    <span>Start Work</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCompletingTask(task)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Complete</span>
                              </button>
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
        ) : (
          <div>
            {completedTasks.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 text-center">
                <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Completed Deliverables Yet
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When you finalize tasks and upload client deliverables, they will be archived here.
                </p>
              </div>
            ) : displayLayout === "table" ? (
              /* COMPLETED TASKS: TABLE VIEW */
              <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
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
                            <div>{task.serviceItem?.name}</div>
                            <div className="text-[10px] font-normal text-slate-400">
                              {task.serviceItem?.category?.name || "Corporate Service"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <div>{task.client?.companyName}</div>
                            <div className="text-[10px] text-slate-400">{task.client?.contactPerson}</div>
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
            ) : (
              /* COMPLETED TASKS: GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-5 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {task.serviceItem?.category?.name || "Corporate Service"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Completed</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                        {task.serviceItem?.name}
                      </h3>

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

                      {task.completionNotes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-4 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                          &ldquo;{task.completionNotes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Completed: {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : "Recent"}
                      </span>

                      {task.completionDoc ? (
                        <a
                          href={task.completionDoc.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[140px]">{task.completionDoc.documentName}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">Completed (No document)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    Confirm Task Completion
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Optionally upload the client deliverable document
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseCompletionModal}
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

              {/* Optional Deliverable Document Upload to Bunny Storage */}
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <UploadCloud className="h-4 w-4 text-amber-500" />
                    <span>Attach Deliverable Document (Optional)</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Bunny Storage
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upload the issued Trade License, Visa copy, or Attestation certificate. The document will be uploaded directly to Bunny CDN and archived in the client&apos;s Document Vault.
                </p>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />

                {/* File Upload Box / File Info Card */}
                {selectedFile ? (
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {selectedFile.name}
                          </p>
                          {isUploadingToBunny ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-semibold shrink-0">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Uploading to Bunny...</span>
                            </span>
                          ) : bunnyUploadedUrl ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Stored in Bunny</span>
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Size: {selectedFile.size} • {bunnyUploadedUrl ? "Ready for task completion" : "Prepared for Bunny CDN"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {bunnyUploadedUrl && (
                        <a
                          href={bunnyUploadedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Open document in Bunny CDN"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-slate-300 dark:border-slate-700 hover:border-amber-500/70 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Click to browse document or drag and drop here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PDF, PNG, JPG, or DOC (Max 25 MB) • Stored in Bunny CDN
                    </p>
                  </div>
                )}

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
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
                  onClick={handleCloseCompletionModal}
                  disabled={isSubmitting || isUploadingToBunny}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingToBunny}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>Completing Task...</span>
                    </>
                  ) : isUploadingToBunny ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading to Bunny...</span>
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

