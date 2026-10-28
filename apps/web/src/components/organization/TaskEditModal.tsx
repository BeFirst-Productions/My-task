"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Edit3,
  Search,
  FileText,
  User,
  Armchair,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Calendar,
  Loader2,
  Save,
} from "lucide-react";
import {
  TaskItem,
  StaffMember,
  AVAILABLE_SERVICES,
} from "@/services/task.service";

interface TaskEditModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  staffList: StaffMember[];
  onClose: () => void;
  onSave: (updatedTask: TaskItem) => Promise<void> | void;
}

export function TaskEditModal({
  isOpen,
  task,
  staffList,
  onClose,
  onSave,
}: TaskEditModalProps) {
  // Form fields
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [clientId, setClientId] = useState("");
  const [service, setService] = useState("");
  const [customService, setCustomService] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+971");

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [seatNo, setSeatNo] = useState("");
  const [currentSeatNo, setCurrentSeatNo] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<TaskItem["status"]>("Pending");
  const [dueDate, setDueDate] = useState("");
  const [details, setDetails] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setClient(task.client || "");
      setClientId(task.clientId || "");
      setService(task.service || (AVAILABLE_SERVICES.includes(task.title) ? task.title : "Other / Custom Service"));
      setCustomService(task.customService || (!AVAILABLE_SERVICES.includes(task.title) ? task.title : ""));

      // Parse phone number if present
      if (task.phoneNumber) {
        const parts = task.phoneNumber.trim().split(" ");
        if (parts.length > 1 && parts[0].startsWith("+")) {
          setCountryCode(parts[0]);
          setPhoneNumber(parts.slice(1).join(" "));
        } else {
          setPhoneNumber(task.phoneNumber);
        }
      } else {
        setPhoneNumber("");
      }

      // Match staff
      const matchedStaff = staffList.find(
        (s) =>
          s.id === task.assignedToUserId ||
          s.id === task.assignedTo?.id ||
          s.name.toLowerCase() === task.assignedTo?.name?.toLowerCase()
      );

      if (matchedStaff) {
        setSelectedStaffId(matchedStaff.id);
      } else if (task.assignedToUserId || task.assignedTo?.id) {
        setSelectedStaffId(task.assignedToUserId || task.assignedTo?.id || "");
      } else {
        setSelectedStaffId("");
      }

      setSeatNo(task.seatNo || matchedStaff?.seatNo || "Auto assigned");
      setCurrentSeatNo(task.currentSeatNo || matchedStaff?.seatNo || "Auto assigned");
      setDepartment(task.department || matchedStaff?.department || "Business Setup");
      setPriority(task.priority || "Medium");
      setStatus(task.status || "Pending");
      setDueDate(task.dueDate || "");
      setDetails(task.details || "");
      setError(null);
    }
  }, [task, staffList, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
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
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !task) return null;

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    const staff = staffList.find((s) => s.id === staffId);
    if (staff) {
      setSeatNo(staff.seatNo || "Auto assigned");
      setCurrentSeatNo(staff.seatNo || "Auto assigned");
      if (staff.department) {
        setDepartment(staff.department);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (task.status === "Completed") {
      setError("Completed tasks cannot be modified.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide a task title.");
      return;
    }
    if (!client.trim()) {
      setError("Please enter a client name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const staff = staffList.find((s) => s.id === selectedStaffId);

    const updatedTask: TaskItem = {
      ...task,
      title: title.trim(),
      client: client.trim(),
      clientId: clientId.trim() || task.clientId,
      service: service || task.service,
      customService: customService.trim() || undefined,
      phoneNumber: phoneNumber.trim()
        ? `${countryCode} ${phoneNumber.trim()}`
        : undefined,
      department: department || staff?.department || task.department,
      priority,
      status,
      dueDate: dueDate.trim() || task.dueDate,
      seatNo: seatNo || task.seatNo,
      currentSeatNo: currentSeatNo || task.currentSeatNo,
      details: details.trim(),
      assignedToUserId: staff?.id || task.assignedToUserId,
      assignedTo: staff
        ? {
            id: staff.id,
            name: staff.name,
            initials: staff.initials,
            avatarColor: staff.avatarColor,
            email: staff.email,
            role: staff.role,
          }
        : task.assignedTo,
    };

    try {
      await onSave(updatedTask);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task updates.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-modal-title"
    >
      <div className="w-full max-w-2xl my-auto rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/40 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#161822]/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="edit-task-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Edit Task
                </h3>
                {task.taskNumber && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    #{task.taskNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update task details, reassign staff member, or change status.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {/* Error banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Task Title */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. License Renewal Follow Up"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs transition-colors"
              />
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Client <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="Client or Company Name"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Client ID
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="CLI-1001"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Service */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Service
                </label>
                <div className="relative">
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 pr-8 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                  >
                    <option value="">Select service</option>
                    {AVAILABLE_SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Assigned Staff */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Assigned Staff <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedStaffId}
                    onChange={(e) => handleStaffChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                  >
                    <option value="">Select staff</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department || s.role || "Staff"})
                      </option>
                    ))}
                    {/* Fallback if current task assignee is not in staffList */}
                    {task.assignedTo?.name &&
                      !staffList.some((s) => s.id === selectedStaffId) && (
                        <option value={selectedStaffId || "current"}>
                          {task.assignedTo.name} (Current)
                        </option>
                      )}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. PRO Services"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Low", "Medium", "High"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                        priority === p
                          ? p === "High"
                            ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                            : p === "Medium"
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                            : "bg-sky-500 text-white border-sky-600 shadow-xs"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskItem["status"])}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 pr-8 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs font-semibold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="e.g. Oct 25, 2026"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Seat No. */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Seat No.
                </label>
                <div className="relative">
                  <Armchair className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={seatNo}
                    onChange={(e) => setSeatNo(e.target.value)}
                    placeholder="Auto assigned"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Phone Number
                </label>
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs focus-within:border-amber-500">
                  <div className="flex items-center gap-1 px-2.5 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                    <span>🇦🇪</span>
                    <span>{countryCode}</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="50 123 4567"
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Task Details / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Task Details / Notes
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Additional instructions or notes..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs resize-none"
              />
              <div className="flex justify-end text-[10px] text-slate-400 mt-1">
                {details.length}/500
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#161822]/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#b85817] hover:bg-[#a14b12] shadow-md shadow-orange-950/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
