"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
  Phone,
  Mail,
  User,
  ShieldAlert,
  UserX,
  Clock,
  Crown,
  Sliders,
  RotateCcw,
  Sparkles,
  CheckCheck,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Hash,
} from "lucide-react";
import {
  getTenantUsers,
  createTenantUser,
  updateTenantUser,
  updateTenantUserStatus,
  deleteTenantUser,
  fetchAvailableRoles,
  ORGANISATION_AVAILABLE_ROLES,
  CRM_MODULES,
  ROLE_DEFAULT_PERMISSIONS,
  type UserItem,
  type CreateTenantUserPayload,
  type UpdateTenantUserPayload,
  type CrmModule,
  type ModuleAction,
  type OrgRole,
} from "@/services/user.service";
import { useAuth } from "@/context/AuthContext";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { OrgEditUserView } from "./OrgEditUserView";

interface OrgUserManagementViewProps {
  orgName: string;
  orgSubdomain: string;
  initialOpenCreateModal?: boolean;
  onNavigateToCreateUser?: () => void;
}

/**
 * Calculates page numbers with smart ellipsis for pagination display
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export function OrgUserManagementView({
  orgName,
  orgSubdomain,
  initialOpenCreateModal = false,
  onNavigateToCreateUser,
}: OrgUserManagementViewProps) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialOpenCreateModal);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<{
    user: UserItem;
    nextStatus: "ACTIVE" | "SUSPENDED";
  } | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Close 3-dots action menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Action loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states for Create
  const [formData, setFormData] = useState<CreateTenantUserPayload>({
    fullName: "",
    email: "",
    username: "",
    phoneNumber: "",
    password: "",
    role: "STAFF",
    designation: "",
  });

  // Open full-page edit view and synchronize editUserId to URL
  const openEditUser = useCallback((user: UserItem) => {
    setEditingUser(user);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("editUserId", user.id);
      window.history.pushState({ editUserId: user.id }, "", url.toString());
    } catch (e) {}
  }, []);

  // Close full-page edit view and remove editUserId from URL
  const closeEditUser = useCallback((shouldReload = false) => {
    setEditingUser(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("editUserId");
      window.history.pushState(null, "", url.toString());
    } catch (e) {}
    if (shouldReload) {
      loadUsers();
    }
  }, []);

  // Load users from API
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTenantUsers({
        limit: 100,
      });
      setUsers(data.users);

      // Check if URL specifies an editUserId on initial mount or reload
      if (typeof window !== "undefined") {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const editId = urlParams.get("editUserId");
          if (editId) {
            const match = data.users.find((u) => u.id === editId);
            if (match) {
              setEditingUser(match);
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle popstate for browser back/forward navigation within edit view
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get("editUserId");
        if (editId) {
          setUsers((currentUsers) => {
            const match = currentUsers.find((u) => u.id === editId);
            if (match) setEditingUser(match);
            return currentUsers;
          });
        } else {
          setEditingUser(null);
        }
      } catch (e) {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Derived filter options
  // Filtered users list - does not show currently logged-in superadmin / user
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Exclude logged-in superadmin / user from user management roster
      if (currentUser?.id && u.id === currentUser.id) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = u.fullName?.toLowerCase().includes(query) ?? false;
        const matchUsername = u.username.toLowerCase().includes(query);
        const matchEmail = u.email.toLowerCase().includes(query);
        const matchPhone = u.phoneNumber.toLowerCase().includes(query);
        const matchDesignation = u.designation?.toLowerCase().includes(query) ?? false;
        if (!matchName && !matchUsername && !matchEmail && !matchPhone && !matchDesignation) {
          return false;
        }
      }

      // Role filter
      if (selectedRole !== "ALL" && u.role !== selectedRole) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL" && u.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [users, currentUser?.id, searchQuery, selectedRole, selectedStatus]);

  // Statistics reflecting managed accounts
  const stats = useMemo(() => {
    const managed = users.filter((u) => !currentUser?.id || u.id !== currentUser.id);
    return {
      total: managed.length,
      admins: managed.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length,
      staff: managed.filter((u) => u.role === "STAFF").length,
      active: managed.filter((u) => u.status === "ACTIVE").length,
    };
  }, [users, currentUser?.id]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset to first page when any search or filter criteria changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedStatus, pageSize]);

  // Total pages calculation and auto-clamp
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  }, [filteredUsers.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Paginated records for current view
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await createTenantUser(formData);
      setIsCreateModalOpen(false);
      setFormData({
        fullName: "",
        email: "",
        username: "",
        phoneNumber: "",
        password: "",
        role: "STAFF",
        designation: "",
      });
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await deleteTenantUser(deletingUser.id);
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Suspend / Activate confirm
  const handleConfirmStatusChange = async () => {
    if (!statusModalUser) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await updateTenantUserStatus(statusModalUser.user.id, statusModalUser.nextStatus);
      const actionLabel = statusModalUser.nextStatus === "SUSPENDED" ? "suspended" : "reactivated";
      setActionSuccessMessage(
        `User "${statusModalUser.user.fullName || statusModalUser.user.username}" was successfully ${actionLabel}.`
      );
      setStatusModalUser(null);
      await loadUsers();
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper avatar initials
  const getInitials = (name?: string | null, username?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return (username || "US").slice(0, 2).toUpperCase();
  };

  if (editingUser) {
    return (
      <OrgEditUserView
        user={editingUser}
        orgName={orgName}
        orgSubdomain={orgSubdomain}
        onBack={() => closeEditUser(false)}
        onSuccess={() => closeEditUser(true)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
            <Users className="h-3.5 w-3.5" />
            <span>Organization Workspace</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Team & User Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage staff accounts, assign roles and track access for {orgName}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Tooltip content="Reload organization user roster" position="bottom">
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={onNavigateToCreateUser ? onNavigateToCreateUser : () => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 active:scale-95 transition-all shadow-md shadow-amber-500/20"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Members */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Team</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Assigned to {orgSubdomain.toUpperCase()}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Administrators */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Administrators</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.admins}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Super Admin & Admins</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Staff Members */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Staff Members</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.staff}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Operations & Execution</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Active Accounts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Accounts</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Ready for task assignment</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, username, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          {searchQuery && (
            <Tooltip content="Clear search" position="left">
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="SALES_STAFF">Sales Staff</option>
            <option value="ACCOUNTANT">Accounts Manager</option>
            <option value="STAFF">Staff</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Feedback banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4. Table / Team Roster */}
      <div className="rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
            <span className="text-xs">Loading organization roster...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={loadUsers}
              className="text-xs text-amber-500 hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No team members found
            </p>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? "Try adjusting your search criteria or filters."
                : "Add your first internal team member to get started."}
            </p>
          </div>
        ) : (
          <>
            {/* Table Directory Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#151722]/60">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  Members Directory
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                  <Users className="h-3 w-3" />
                  <span>{filteredUsers.length} {filteredUsers.length === 1 ? "member" : "members"}</span>
                </span>
                {filteredUsers.length !== stats.total && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    (filtered from {stats.total} total)
                  </span>
                )}
              </div>
              {filteredUsers.length > 0 && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Page</span>
                  <span className="font-bold text-slate-900 dark:text-white px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1a1d28] border border-slate-200 dark:border-slate-800">
                    {currentPage}
                  </span>
                  <span>of</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {totalPages}
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-[#161822]/75 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-3 text-center w-12 font-bold text-slate-400 dark:text-slate-500">
                      #
                    </th>
                    <th className="py-3.5 px-4">Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created</th>
                    <th className="py-3.5 px-4">Last Updated</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedUsers.map((item, index) => {
                    const itemNumber = (currentPage - 1) * pageSize + index + 1;
                    const isSuperAdmin = item.role === "SUPER_ADMIN";
                    const isAdmin = item.role === "ADMIN";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-[#151722]/60 transition-colors"
                      >
                        {/* Number Count (#) */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-slate-100 dark:bg-[#181b26] text-slate-500 dark:text-slate-400 font-mono text-[11px] font-semibold border border-slate-200/80 dark:border-slate-800">
                            {itemNumber}
                          </span>
                        </td>
                      {/* Member Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuperAdmin
                                ? "bg-amber-500 text-slate-950 ring-2 ring-amber-400/30"
                                : isAdmin
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {getInitials(item.fullName, item.username)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {item.fullName || item.username}
                              </span>
                              {isSuperAdmin && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                                  Owner
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                              @{item.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            <ShieldAlert className="h-3 w-3" />
                            Super Admin
                          </span>
                        ) : isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </span>
                        ) : item.role === "SALES_STAFF" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                            <User className="h-3 w-3" />
                            Sales Staff
                          </span>
                        ) : item.role === "ACCOUNTANT" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30">
                            <ShieldCheck className="h-3 w-3" />
                            Accounts Manager
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
                            <User className="h-3 w-3" />
                            Staff
                          </span>
                        )}
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                            {item.designation || "Executive"}
                          </span>

                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 truncate">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-500 truncate">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.phoneNumber}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {item.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : item.status === "INACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        <Tooltip
                          content={`Last modified: ${new Date(item.updatedAt || item.createdAt).toLocaleString()}`}
                          position="top"
                        >
                          <div className="flex items-center gap-1.5 cursor-default">
                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>
                              {new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </Tooltip>
                      </td>

                      {/* Actions with 3-dots menu */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <Tooltip content="Actions menu" position="left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] transition-colors"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </Tooltip>

                          {activeDropdownId === item.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-[#161822] border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-40 animate-in fade-in zoom-in-95 text-left"
                            >
                              {/* Edit Details */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  openEditUser(item);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                                <span>Edit Details</span>
                              </button>

                              {/* Suspend or Reactivate (Only for non-super_admin accounts) */}
                              {!isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setStatusModalUser({
                                      user: item,
                                      nextStatus: item.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                                    });
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                                    item.status === "SUSPENDED"
                                      ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                      : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                  }`}
                                >
                                  {item.status === "SUSPENDED" ? (
                                    <>
                                      <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                      <span>Activate User</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="h-3.5 w-3.5 text-amber-500" />
                                      <span>Suspend User</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Delete User */}
                              {!isSuperAdmin && item.id !== currentUser?.id && (
                                <>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setDeletingUser(item);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                    <span>Delete User</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141620]/60 text-xs">
              {/* Left: Summary & Rows per page selector */}
              <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {Math.min(currentPage * pageSize, filteredUsers.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {filteredUsers.length}
                  </span>{" "}
                  team members
                </div>

                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-medium">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-[#191c28] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <Tooltip content="First Page" position="top">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="First Page"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Numeric Page Buttons */}
                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1.5 py-1 text-slate-400 dark:text-slate-500 text-xs select-none"
                        >
                          ...
                        </span>
                      );
                    }
                    const pageNum = Number(p);
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                {/* Last Page */}
                <Tooltip content="Last Page" position="top">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Last Page"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* ======================================================== */}
      {/* 5. ADD TEAM MEMBER MODAL */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161822]/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add Organization Team Member
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Create an internal account for {orgName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setFormError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Al Mansoori"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              {/* Email & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tariq@ibh.ae"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="tariq_ops"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Phone & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+971 50 123 4567"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="At least 8 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Role <span className="text-amber-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ORGANISATION_AVAILABLE_ROLES.map((r) => {
                    const isSelected = formData.role === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r.role })}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white ring-1 ring-amber-500/30"
                            : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            {r.role === "SUPER_ADMIN" ? (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            ) : r.role === "ADMIN" ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-blue-500" />
                            )}
                            <span>{r.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                            {r.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Business Consultant"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold hover:brightness-105 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {deletingUser && (
        <ConfirmationModal
          isOpen={!!deletingUser}
          onClose={() => {
            setDeletingUser(null);
            setFormError(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Remove Team Member"
          subtitle={`Permanently remove this account and revoke platform access for ${orgName}.`}
          variant="danger"
          icon={<Trash2 className="h-5 w-5" />}
          confirmText="Yes, Remove Member"
          cancelText="Cancel"
          isLoading={isSubmitting}
          error={formError}
          entityPreview={{
            avatarText: getInitials(deletingUser.fullName, deletingUser.username),
            avatarBg:
              deletingUser.role === "ADMIN"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
            title: deletingUser.fullName || deletingUser.username,
            subtitle: `${deletingUser.email} • @${deletingUser.username}`,
            badges: [
              {
                text: deletingUser.role === "ADMIN" ? "Admin" : "Staff",
                variant: deletingUser.role === "ADMIN" ? "purple" : "blue",
              },
            ],
          }}
          consequences={[
            {
              text: "The user will be immediately unlinked and removed from this organization.",
              type: "danger",
            },
            {
              text: "All active sessions and dedicated tenant database credentials will be terminated.",
              type: "danger",
            },
            {
              text: "Historical audit logs and previous task assignments will be safely preserved for records.",
              type: "neutral",
            },
          ]}
        />
      )}

      {/* ======================================================== */}
      {/* 8. SUSPEND / REACTIVATE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {statusModalUser && (
        <ConfirmationModal
          isOpen={!!statusModalUser}
          onClose={() => {
            setStatusModalUser(null);
            setFormError(null);
          }}
          onConfirm={handleConfirmStatusChange}
          title={
            statusModalUser.nextStatus === "SUSPENDED"
              ? "Suspend User Account"
              : "Reactivate User Account"
          }
          subtitle={
            statusModalUser.nextStatus === "SUSPENDED"
              ? "Temporarily restrict platform access and pause active task assignments."
              : "Restore platform login access and active team collaboration for this user."
          }
          variant={statusModalUser.nextStatus === "SUSPENDED" ? "warning" : "success"}
          icon={
            statusModalUser.nextStatus === "SUSPENDED" ? (
              <ShieldAlert className="h-5 w-5" />
            ) : (
              <UserCheck className="h-5 w-5" />
            )
          }
          confirmText={
            statusModalUser.nextStatus === "SUSPENDED"
              ? "Yes, Suspend Account"
              : "Yes, Reactivate Account"
          }
          cancelText="Cancel"
          isLoading={isSubmitting}
          error={formError}
          entityPreview={{
            avatarText: getInitials(
              statusModalUser.user.fullName,
              statusModalUser.user.username
            ),
            avatarBg:
              statusModalUser.user.role === "ADMIN"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
            title: statusModalUser.user.fullName || statusModalUser.user.username,
            subtitle: `${statusModalUser.user.email} • @${statusModalUser.user.username}`,
            badges: [
              {
                text: statusModalUser.user.role === "ADMIN" ? "Admin" : "Staff",
                variant: statusModalUser.user.role === "ADMIN" ? "purple" : "blue",
              },
              {
                text: statusModalUser.user.status,
                variant: statusModalUser.user.status === "ACTIVE" ? "success" : "warning",
              },
            ],
          }}
          consequences={
            statusModalUser.nextStatus === "SUSPENDED"
              ? [
                  {
                    text: "Active user sessions will be invalidated immediately.",
                    type: "warning",
                  },
                  {
                    text: "The user cannot log in to the platform until explicitly reactivated.",
                    type: "warning",
                  },
                  {
                    text: "All existing workflows, task logs, and user records remain completely secure.",
                    type: "neutral",
                  },
                ]
              : [
                  {
                    text: "Platform login access and assigned module permissions will be restored immediately.",
                    type: "positive",
                  },
                  {
                    text: "The user can receive notifications and resume task assignments normally.",
                    type: "positive",
                  },
                ]
          }
        />
      )}
    </div>
  );
}
