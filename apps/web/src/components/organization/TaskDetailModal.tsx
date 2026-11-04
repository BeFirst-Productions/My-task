"use client";

import React, { useEffect } from "react";
import {
  X,
  Eye,
  User,
  Mail,
  Phone,
  Calendar,
  Layers,
  FileText,
  Clock,
  ShieldCheck,
  Edit3,
} from "lucide-react";
import { TaskItem } from "@/services/task.service";

interface TaskDetailModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onEdit?: (task: TaskItem) => void;
}

export function TaskDetailModal({
  isOpen,
  task,
  onClose,
  onEdit,
}: TaskDetailModalProps) {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  // Extract all services
  const servicesList: string[] =
    task.services && task.services.length > 0
      ? task.services
      : task.service
      ? task.service
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : task.title
      ? [task.title]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-task-modal-title"
    >
      <div className="w-full max-w-3xl my-auto rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/40 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#161822]/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="view-task-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Task Details
                </h3>
                {task.clientId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {task.clientId}
                  </span>
                )}
                {task.status && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      task.status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                        : task.status === "In Progress"
                        ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50"
                        : task.status === "Overdue"
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                    }`}
                  >
                    {task.status}
                  </span>
                )}
                {task.priority && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      task.priority === "High"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                        : task.priority === "Medium"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400"
                    }`}
                  >
                    {task.priority} Priority
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overview of client request, assigned sales staff, and service schedule.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-6 max-h-[72vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {/* Top 2-Column Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Client Card */}
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Client Information</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Client / Company Name</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {task.client}
                  </span>
                </div>
                {task.clientId && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Client Identifier</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {task.clientId}
                    </span>
                  </div>
                )}
                {task.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${task.email}`}
                      className="text-amber-600 hover:underline truncate"
                    >
                      {task.email}
                    </a>
                  </div>
                )}
                {task.phoneNumber && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${task.phoneNumber.replace(/\s+/g, "")}`}
                      className="font-medium text-slate-800 dark:text-slate-200 hover:text-amber-600"
                    >
                      {task.phoneNumber}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Assigned Sales Staff Card */}
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Assigned Sales Staff</span>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    task.assignedTo?.avatarColor || "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  }`}
                >
                  {task.assignedTo?.initials || "ST"}
                </div>
                <div className="space-y-1 text-xs min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {task.assignedTo?.name || "Unassigned"}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {task.department || task.assignedTo?.role || "Sales Department"}
                  </div>
                  {task.assignedTo?.email && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {task.assignedTo.email}
                    </div>
                  )}
                  {task.seatNo && task.seatNo !== "Auto assigned" && (
                    <div className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Workstation: {task.seatNo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Scheduled Services Card */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Scheduled Services / Categories</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {servicesList.length} service{servicesList.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {servicesList.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No specific service assigned</span>
              ) : (
                servicesList.map((srv, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 shadow-2xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{srv}</span>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* 4. Schedule & Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Due Date</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {task.dueDate || "Standard (7 Days)"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Created On</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  }) : "Recent"}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Task Details / Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Task Details / Instructions</span>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[90px]">
              {task.details && task.details.trim() ? (
                task.details
              ) : (
                <span className="text-slate-400 italic">No additional notes or instructions provided.</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#161822]/60">
          <div className="text-[11px] text-slate-400">
            Task ID: <span className="font-mono">{task.id}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-2xs cursor-pointer"
            >
              Close
            </button>
            {task.status !== "Completed" && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#b85817] hover:bg-[#a14b12] shadow-md shadow-orange-950/20 transition-all cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Task</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

