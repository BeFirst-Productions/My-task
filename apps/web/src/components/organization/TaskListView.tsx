"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users2,
  MoreVertical,
  ChevronDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Check,
  Edit3,
  AlertCircle,
} from "lucide-react";
import {
  TaskItem,
  DEFAULT_TASKS,
  DEFAULT_TASK_STATS,
  AVAILABLE_STAFF,
  StaffMember,
  fetchCompanyStaff,
  fetchTasks,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
} from "@/services/task.service";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { TaskEditModal } from "./TaskEditModal";
import { useAuth } from "@/context/AuthContext";

interface TaskListViewProps {
  orgId?: string;
  orgName?: string;
  orgSubdomain?: string;
  tasks?: TaskItem[];
  onAddNewTask: () => void;
  onDeleteTask?: (id: string) => void;
  onUpdateTaskStatus?: (id: string, status: TaskItem["status"]) => void;
}

export function TaskListView({
  orgId,
  orgSubdomain,
  orgName = "Invest First Business Services",
  tasks: initialTasks = [],
  onAddNewTask,
  onDeleteTask,
  onUpdateTaskStatus,
}: TaskListViewProps) {
  const { user } = useAuth();
  const isStaff = Boolean(
    user &&
    user.role !== "SUPER_ADMIN" &&
    user.role !== "PLATFORM_OWNER" &&
    user.role !== "ADMIN"
  );

  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Edit and Delete dialog states
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [loadedTasks, loadedStaff] = await Promise.all([
          fetchTasks(orgId || orgSubdomain, isStaff ? user?.id : undefined),
          fetchCompanyStaff(orgId || orgSubdomain),
        ]);
        if (mounted) {
          setTasks(loadedTasks || []);
          setStaffList(loadedStaff || []);
        }
      } catch (err) {
        console.warn("Could not load company tasks and staff:", err);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain, isStaff, user?.id]);

  // If user is a staff member, restrict view strictly to tasks assigned to them
  const visibleTasks = useMemo(() => {
    if (!isStaff || !user) return tasks;

    return tasks.filter((task) => {
      // 1. Direct user id matching
      if (task.assignedToUserId && task.assignedToUserId === user.id) return true;
      if (task.assignedTo?.id && task.assignedTo.id === user.id) return true;

      // 2. Email matching
      if (
        user.email &&
        task.assignedTo?.email &&
        task.assignedTo.email.toLowerCase() === user.email.toLowerCase()
      ) {
        return true;
      }

      // 3. Name / Username matching
      const userFull = user.fullName?.trim().toLowerCase();
      const userUname = user.username?.trim().toLowerCase();
      const taskAssignee = task.assignedTo?.name?.trim().toLowerCase();

      if (taskAssignee) {
        if (userFull && taskAssignee === userFull) return true;
        if (userUname && taskAssignee === userUname) return true;
      }

      return false;
    });
  }, [tasks, user, isStaff]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return visibleTasks.filter((task) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        task.client.toLowerCase().includes(q) ||
        task.assignedTo.name.toLowerCase().includes(q) ||
        task.department.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
      const matchesAssignee =
        assigneeFilter === "ALL" || task.assignedTo.name === assigneeFilter;
      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;
      const matchesDept =
        departmentFilter === "ALL" || task.department === departmentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAssignee &&
        matchesPriority &&
        matchesDept
      );
    });
  }, [
    visibleTasks,
    searchQuery,
    statusFilter,
    assigneeFilter,
    priorityFilter,
    departmentFilter,
  ]);

  // Pagination calculation
  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Dynamic stats calculated from real visible tasks
  const stats = useMemo(() => {
    const total = visibleTasks.length;
    const completed = visibleTasks.filter((t) => t.status === "Completed").length;
    const pending = visibleTasks.filter((t) => t.status === "Pending").length;
    const overdue = visibleTasks.filter((t) => t.status === "Overdue").length;
    const assigned = visibleTasks.filter((t) => t.assignedTo?.name || t.assignedToUserId).length;
    const completionRate = total > 0 ? `${Math.round((completed / total) * 100)}% completion` : "0% completion";
    const staffPercentage = total > 0 ? `${Math.round((assigned / total) * 100)}% of total` : "0% of total";
    return {
      total,
      completed,
      pending,
      overdue,
      assigned,
      completionRate,
      staffPercentage,
    };
  }, [visibleTasks]);

  // Close menu on click outside
  useEffect(() => {
    if (!activeMenuId) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest?.(".task-action-menu-container")) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [activeMenuId]);

  // Auto dismiss feedback banner after 4 seconds
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => {
        setActionFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setAssigneeFilter("ALL");
    setPriorityFilter("ALL");
    setDepartmentFilter("ALL");
    setCurrentPage(1);
  };

  const handleStatusChange = async (id: string, newStatus: TaskItem["status"]) => {
    setActiveMenuId(null);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    if (newStatus === "Completed") {
      setActionFeedback({
        type: "success",
        message: "Task marked as completed.",
      });
    }
    if (onUpdateTaskStatus) onUpdateTaskStatus(id, newStatus);
    try {
      await updateTaskService(id, { status: newStatus });
    } catch (err) {
      console.warn("Failed to update status on API:", err);
    }
  };

  const handleEditTask = (task: TaskItem) => {
    if (task.status === "Completed") {
      setActionFeedback({
        type: "error",
        message: `Task "${task.title}" is completed and cannot be edited.`,
      });
      setActiveMenuId(null);
      return;
    }
    setEditingTask(task);
    setActiveMenuId(null);
  };

  const handleSaveEditedTask = async (updatedTask: TaskItem) => {
    try {
      await updateTaskService(updatedTask.id, updatedTask);
    } catch (err) {
      console.warn("Failed to persist task edit to server:", err);
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setActionFeedback({
      type: "success",
      message: `Task "${updatedTask.title}" was updated successfully.`,
    });
  };

  const handleRequestDelete = (task: TaskItem) => {
    setDeletingTask(task);
    setDeleteError(null);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const success = await deleteTaskService(deletingTask.id);
      if (!success) {
        console.warn("API delete returned false, removing locally");
      }
      setTasks((prev) => prev.filter((t) => t.id !== deletingTask.id));
      if (onDeleteTask) onDeleteTask(deletingTask.id);
      setActionFeedback({
        type: "success",
        message: `Task "${deletingTask.title}" was successfully deleted.`,
      });
      setDeletingTask(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setDeleteError("Failed to delete task. Please check your network connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`mb-5 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
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

      {/* ========================================================= */}
      {/* 1. TOP HEADER & CREATE NEW TASK BUTTON                   */}
      {/* ========================================================= */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isStaff ? "My Assigned Tasks" : "Task Management"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isStaff
              ? `Tasks assigned to ${user?.fullName || user?.username || "you"}.`
              : "Create, assign and track tasks across your organisation."}
          </p>
        </div>

        {!isStaff && (
          <button
            type="button"
            onClick={onAddNewTask}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b85817] hover:bg-[#a14b12] text-white font-bold text-xs transition-all shadow-md shadow-orange-950/20 active:scale-98 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Task</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. 5 TOP KPI STATS CARDS (Dynamic from real data)        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        {/* Card 1: Total Tasks */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <ListTodo className="h-4 w-4" />
            </div>
            {stats.total > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                Active
              </span>
            )}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total Tasks
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.total}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">All tasks</p>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Completed
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.completed}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.completionRate}</p>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Pending
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.pending}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Need attention</p>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Overdue
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.overdue}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Action required</p>
          </div>
        </div>

        {/* Card 5: Assigned to Staff */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isStaff ? "Assigned to Me" : "Assigned to Staff"}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.assigned}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.staffPercentage}</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. FILTER BAR (Matches Screenshot Exactly)               */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px] sm:min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by task title, client name, assignee..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Right: Dropdowns & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Assignees Dropdown (Hidden for Staff) */}
          {!isStaff && (
            <div className="relative">
              <select
                value={assigneeFilter}
                onChange={(e) => {
                  setAssigneeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Assignees</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.name}>
                    {staff.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Priority Dropdown */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Departments Dropdown */}
          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Departments</option>
              <option value="PRO Services">PRO Services</option>
              <option value="Documentation">Documentation</option>
              <option value="Business Setup">Business Setup</option>
              <option value="Banking Support">Banking Support</option>
              <option value="Compliance">Compliance</option>
              <option value="Sales">Sales</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors shadow-2xs"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. TASKS TABLE (Matches Screenshot Columns & Styling)     */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="overflow-x-auto min-h-[340px] pb-32">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[220px]">Task Title</th>
                <th className="py-3 px-4 min-w-[170px]">Client</th>
                <th className="py-3 px-4 min-w-[170px]">Assigned To</th>
                <th className="py-3 px-4 min-w-[140px]">Department</th>
                <th className="py-3 px-3.5 min-w-[100px] text-center">Priority</th>
                <th className="py-3 px-3.5 min-w-[110px] text-center">Status</th>
                <th className="py-3 px-4 min-w-[120px]">Due Date</th>
                <th className="py-3 px-4 min-w-[120px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      {isStaff ? "No tasks assigned to you" : "No tasks found"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isStaff
                        ? "You currently do not have any tasks assigned to your queue."
                        : "Try adjusting your search criteria or create a new task."}
                    </p>
                    {!isStaff && (
                      <button
                        type="button"
                        onClick={onAddNewTask}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b85817] text-white font-bold text-xs shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create New Task</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task, idx) => {
                  const displayIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isNearBottom = idx >= paginatedTasks.length - 2 && paginatedTasks.length >= 3;
                  const isMenuActive = activeMenuId === task.id;

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group ${
                        isMenuActive ? "relative z-30 bg-slate-50/60 dark:bg-slate-800/40" : "relative z-0"
                      }`}
                    >
                      {/* # */}
                      <td className="py-3.5 px-3.5 text-center text-slate-400 font-medium text-[11px]">
                        {displayIndex}
                      </td>

                      {/* Task Title with Colored Dot */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              task.status === "Completed"
                                ? "bg-emerald-500"
                                : task.status === "Overdue"
                                ? "bg-rose-500"
                                : task.priority === "High"
                                ? "bg-blue-600"
                                : "bg-sky-500"
                            }`}
                          />
                          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[240px]">
                            {task.title}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {task.client}
                      </td>

                      {/* Assigned To (Avatar + Name) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${
                              task.assignedTo.avatarColor || "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {task.assignedTo.initials}
                          </div>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">
                            {task.assignedTo.name}
                          </span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-normal">
                        {task.department}
                      </td>

                      {/* Priority Badge */}
                      <td className="py-3.5 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            task.priority === "High"
                              ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50"
                              : task.priority === "Medium"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                              : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            task.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                              : task.status === "In Progress"
                              ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50"
                              : task.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {task.dueDate}
                      </td>

                      {/* Actions: Quick Edit/Delete & More Dropdown */}
                      <td
                        className={`py-3.5 px-4 text-right relative task-action-menu-container ${
                          isMenuActive ? "z-40" : "z-10"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Edit Action Button (Only for non-completed tasks) */}
                          {task.status !== "Completed" && (
                            <button
                              type="button"
                              onClick={() => handleEditTask(task)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Edit task"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Quick Delete Action Button (Always available) */}
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(task)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {/* More Options Dropdown Trigger (Removed when task is Completed) */}
                          {task.status !== "Completed" && (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId((prev) => (prev === task.id ? null : task.id));
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isMenuActive
                                    ? "text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800"
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                                title="More options"
                                aria-expanded={isMenuActive}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuActive && (
                                <div
                                  className={`absolute right-0 ${
                                    isNearBottom ? "bottom-9" : "top-8"
                                  } w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] p-1.5 shadow-xl z-50 text-left animate-in fade-in duration-150`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleEditTask(task)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Edit Task</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task.id, "Completed")}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Mark Completed</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task.id, "In Progress")}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Set In Progress</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task.id, "Pending")}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Set Pending</span>
                                  </button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDelete(task)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete Task</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================= */}
        {/* 5. PAGINATION BAR (Matches Screenshot Exactly)           */}
        {/* ========================================================= */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {totalItems}
            </span>{" "}
            tasks
          </div>

          <div className="flex items-center gap-4">
            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).slice(0, 5).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                    currentPage === pageNum
                      ? "bg-[#b85817] text-white shadow-xs"
                      : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Page Size dropdown */}
            <div className="flex items-center gap-1 text-[11px]">
              <span>Show</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-2 pr-6 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span>per page</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Task Confirmation Modal */}
      {deletingTask && (
        <ConfirmationModal
          isOpen={!!deletingTask}
          onClose={() => {
            if (!isDeleting) {
              setDeletingTask(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Task?"
          subtitle={`Are you sure you want to delete task #${deletingTask.taskNumber || ""} "${deletingTask.title}"?`}
          variant="danger"
          icon={<Trash2 className="h-5 w-5 text-rose-500" />}
          confirmText="Yes, Delete Task"
          cancelText="Cancel"
          isLoading={isDeleting}
          error={deleteError}
          entityPreview={{
            avatarText: (deletingTask.title || "T").slice(0, 2).toUpperCase(),
            avatarBg: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
            title: deletingTask.title,
            subtitle: `Client: ${deletingTask.client} • Assigned: ${
              deletingTask.assignedTo?.name || "Unassigned"
            }`,
            badges: [
              {
                text: deletingTask.status,
                variant:
                  deletingTask.status === "Completed"
                    ? "success"
                    : deletingTask.status === "Overdue"
                    ? "danger"
                    : "warning",
              },
              {
                text: deletingTask.priority,
                variant: deletingTask.priority === "High" ? "danger" : "default",
              },
            ],
          }}
          consequences={[
            {
              text: "This task record will be permanently deleted from this organisation.",
              type: "danger",
            },
            {
              text: "The assigned staff member will no longer have this task assigned to them.",
              type: "warning",
            },
          ]}
        />
      )}

      {/* Edit Task Modal */}
      <TaskEditModal
        isOpen={!!editingTask}
        task={editingTask}
        staffList={staffList}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditedTask}
      />
    </div>
  );
}

