"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  FileText,
  User,
  Armchair,
  Send,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";
import {
  TaskItem,
  StaffMember,
  AVAILABLE_SERVICES,
  fetchCompanyStaff,
} from "@/services/task.service";

interface TaskCreateViewProps {
  orgId?: string;
  orgSubdomain?: string;
  orgName?: string;
  onBackToList: () => void;
  onTaskCreated: (newTask: TaskItem) => void;
}

export function TaskCreateView({
  orgId,
  orgSubdomain,
  orgName = "Invest First Business Services",
  onBackToList,
  onTaskCreated,
}: TaskCreateViewProps) {
  // Staff list fetched from users table created by Super Admin for this particular company
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Form State
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [service, setService] = useState("");
  const [customService, setCustomService] = useState("");
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [seatNo, setSeatNo] = useState("");
  const [currentSeatNo, setCurrentSeatNo] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch all staff members belonging to this specific company from the users table
  useEffect(() => {
    let mounted = true;
    async function loadStaff() {
      setIsLoadingStaff(true);
      try {
        const staff = await fetchCompanyStaff(orgId || orgSubdomain);
        if (mounted) {
          setStaffList(staff || []);
        }
      } catch (err) {
        console.warn("Could not load company staff:", err);
      } finally {
        if (mounted) setIsLoadingStaff(false);
      }
    }
    loadStaff();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain]);

  // Handle Staff Selection (links to user in users table for this company)
  const handleStaffChange = (sId: string) => {
    setSelectedStaffId(sId);
    const staff = staffList.find((s) => s.id === sId);
    if (staff) {
      setStaffName(staff.name);
      setSeatNo(staff.seatNo || "Auto assigned");
      setCurrentSeatNo(staff.seatNo || "Auto assigned");
    } else {
      setStaffName("");
      setSeatNo("");
      setCurrentSeatNo("");
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setFeedback({ type: "error", message: "Please enter a client name." });
      return;
    }

    if (!service) {
      setFeedback({ type: "error", message: "Please select a service for this task." });
      return;
    }

    if (!selectedStaffId) {
      setFeedback({ type: "error", message: "Please select a staff member from the dropdown." });
      return;
    }

    if (!taskDetails.trim()) {
      setFeedback({ type: "error", message: "Please provide task details or instructions." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (!staff) {
      setFeedback({ type: "error", message: "Selected staff member was not found." });
      setIsSubmitting(false);
      return;
    }

    // Calculate due date (e.g. 7 days from now)
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const dueDateStr = due.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      taskNumber: Math.floor(Math.random() * 900) + 11,
      title: customService.trim() || service,
      client: clientName,
      clientId: clientId || `CLI-${Math.floor(Math.random() * 9000) + 1000}`,
      assignedToUserId: staff.id, // Relation with users table created by Super Admin
      assignedTo: {
        id: staff.id,
        name: staff.name,
        initials: staff.initials,
        avatarColor: staff.avatarColor,
        email: staff.email,
        role: staff.role,
      },
      department: staff.department || "Business Setup",
      priority,
      status: "Pending",
      dueDate: dueDateStr,
      service,
      customService: customService.trim() || undefined,
      phoneNumber: phoneNumber ? `${countryCode} ${phoneNumber}` : undefined,
      seatNo: seatNo || "Auto assigned",
      currentSeatNo: currentSeatNo || "Auto assigned",
      details: taskDetails.trim(),
      dotColor: "blue",
      organisationId: orgId || orgSubdomain,
      createdAt: new Date().toISOString(),
    };

    // Attempt to persist to API scoped to this organisation
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      }).catch(() => {});
    } catch {
      // In-memory fallback
    }

    setFeedback({
      type: "success",
      message: `Task created and assigned to ${staff.name} successfully!`,
    });

    setTimeout(() => {
      onTaskCreated(newTask);
      onBackToList();
    }, 1000);
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & BACK BUTTON (Frame 132 in Screenshot)      */}
      {/* ========================================================= */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create New Task
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign a new task to a staff member for a client.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Task List</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MAIN FORM CARD (2-Column Grid matching Screenshot)    */}
      {/* ========================================================= */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* ---------------- LEFT COLUMN ---------------- */}
            <div className="space-y-5">
              {/* Client * */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Client <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientName(val);
                      if (!clientId && val.trim()) {
                        setClientId(`CLI-${Math.floor(1000 + Math.random() * 9000)}`);
                      }
                    }}
                    placeholder="Enter client or company name"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs transition-colors"
                  />
                </div>
              </div>

              {/* Client ID (Auto generated or custom) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Client ID
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Auto generated or enter ID (e.g. CLI-1001)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs transition-colors"
                  />
                </div>
              </div>

              {/* Service * */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Service <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                  >
                    <option value="">Select service</option>
                    {AVAILABLE_SERVICES.map((srv) => (
                      <option key={srv} value={srv}>
                        {srv}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Custom Service */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Custom Service
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    placeholder="Enter custom service (optional)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs transition-colors"
                  />
                </div>
              </div>

              {/* Phone Number with UAE Flag */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Phone Number
                </label>
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
                  <div className="flex items-center gap-1.5 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    <span className="text-sm">🇦🇪</span>
                    <span>{countryCode}</span>
                    <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ---------------- RIGHT COLUMN ---------------- */}
            <div className="space-y-5">
              {/* Staff * (Fetched from users table created by Super Admin for this company) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Staff <span className="text-rose-500">*</span>
                  </label>
                  {isLoadingStaff && (
                    <span className="text-[10px] text-amber-600 animate-pulse font-medium">
                      Loading staff...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedStaffId}
                    onChange={(e) => handleStaffChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                  >
                    <option value="">Select staff member</option>
                    {staffList.length === 0 && !isLoadingStaff && (
                      <option value="" disabled>
                        No staff members found in this company
                      </option>
                    )}
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department || s.role || "Staff"})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Seat No. (Auto assigned) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Seat No.
                </label>
                <div className="relative">
                  <Armchair className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    readOnly
                    value={seatNo}
                    placeholder="Auto assigned"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 placeholder-slate-400 focus:outline-none cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Current Seat No. (Auto assigned) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Current Seat No.
                </label>
                <div className="relative">
                  <Armchair className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    readOnly
                    value={currentSeatNo}
                    placeholder="Auto assigned"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 placeholder-slate-400 focus:outline-none cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Task Details / Notes * */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Task Details / Notes <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={taskDetails}
                    onChange={(e) => setTaskDetails(e.target.value)}
                    placeholder="Add task details, instructions or notes..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs resize-none transition-colors"
                  />
                  <div className="flex justify-end text-[10px] text-slate-400 mt-1">
                    {taskDetails.length}/500
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. BOTTOM ACTION BAR (Cancel / Create Task)              */}
        {/* ========================================================= */}
        <div className="mt-8 flex items-center justify-end gap-3.5">
          <button
            type="button"
            onClick={onBackToList}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#b85817] hover:bg-[#a14b12] text-white font-bold text-xs shadow-md shadow-orange-950/20 active:scale-98 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Task...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Create Task</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
