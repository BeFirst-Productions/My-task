"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Ban,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  getPlatformUsers,
  updatePlatformUserStatus,
  type UserItem,
} from "@/services/user.service";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface UserManagementViewProps {
  initialFilterRole?: "SUPER_ADMIN" | "ALL";
}

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

export function UserManagementView({
  initialFilterRole = "ALL",
}: UserManagementViewProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(initialFilterRole);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOrg, setSelectedOrg] = useState<string>("ALL");

  // Action status loading
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlatformUsers({
        limit: 100,
      });
      setUsers(data.users);
    } catch (err) {
      console.error("Failed to load platform users:", err);
      setError(err instanceof Error ? err.message : "Failed to load platform users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Unique organizations list for filter
  const organizations = useMemo(() => {
    const orgMap = new Map<string, string>();
    users.forEach((u) => {
      if (u.organisation) {
        orgMap.set(u.organisation.id, u.organisation.companyName);
      }
    });
    return Array.from(orgMap.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName?.toLowerCase().includes(q) ?? false;
        const matchUser = u.username.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchOrg = u.organisation?.companyName.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchUser && !matchEmail && !matchOrg) return false;
      }

      if (selectedRole !== "ALL" && u.role !== selectedRole) return false;
      if (selectedStatus !== "ALL" && u.status !== selectedStatus) return false;
      if (selectedOrg !== "ALL" && u.organisationId !== selectedOrg) return false;

      return true;
    });
  }, [users, searchQuery, selectedRole, selectedStatus, selectedOrg]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      superAdmins: users.filter((u) => u.role === "SUPER_ADMIN").length,
      active: users.filter((u) => u.status === "ACTIVE").length,
      suspended: users.filter((u) => u.status === "SUSPENDED").length,
    };
  }, [users]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedStatus, selectedOrg, pageSize]);

  // Total pages and auto-clamp
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  }, [filteredUsers.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Paginated slice
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Status Modal State
  const [statusModalUser, setStatusModalUser] = useState<{
    user: UserItem;
    nextStatus: "ACTIVE" | "SUSPENDED";
  } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Handle status toggle click - triggers confirmation modal
  const handleToggleClick = (user: UserItem) => {
    if (user.role === "PLATFORM_OWNER") return; // Cannot suspend platform owner
    setStatusModalUser({
      user,
      nextStatus: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
    });
    setStatusError(null);
  };

  // Execute confirmed status change
  const handleConfirmStatus = async () => {
    if (!statusModalUser) return;
    const { user, nextStatus } = statusModalUser;

    setUpdatingId(user.id);
    setStatusError(null);
    try {
      await updatePlatformUserStatus(user.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      );
      setStatusModalUser(null);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#232733]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Platform Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Global User Management & Super Admins
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-tenant user monitoring, tenant Super Admin oversight, and account security controls.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-[#151720] border border-[#232733] hover:border-slate-600 transition-all shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Platform Users */}
        <div className="p-4 rounded-2xl bg-[#151720] border border-[#232733] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Total Global Users</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.total}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Across all registered tenants</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Super Admins */}
        <div className="p-4 rounded-2xl bg-[#151720] border border-[#232733] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Tenant Super Admins</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{stats.superAdmins}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Organization account owners</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        {/* Active Accounts */}
        <div className="p-4 rounded-2xl bg-[#151720] border border-[#232733] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Active Status</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Authorized for login</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Suspended Accounts */}
        <div className="p-4 rounded-2xl bg-[#151720] border border-[#232733] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Restricted / Suspended</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">{stats.suspended}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Login blocked by platform</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
            <Ban className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#151720] border border-[#232733] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user, email, username, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#0b0c10] border border-[#232733] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Organization filter */}
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#0b0c10] border border-[#232733] text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="ALL">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          {/* Role filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#0b0c10] border border-[#232733] text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="ALL">All Roles</option>
            <option value="PLATFORM_OWNER">Platform Owner</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#0b0c10] border border-[#232733] text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* 4. Global Users Table */}
      <div className="rounded-2xl bg-[#151720] border border-[#232733] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
            <span className="text-xs">Loading platform directory...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-500 space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No users match criteria</p>
          </div>
        ) : (
          <>
            {/* Table Directory Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b border-[#232733] bg-[#12141c]/60">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-white text-xs">
                  Platform Directory
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  <Users className="h-3 w-3" />
                  <span>{filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}</span>
                </span>
                {filteredUsers.length !== stats.total && (
                  <span className="text-[11px] text-slate-500">
                    (filtered from {stats.total} total)
                  </span>
                )}
              </div>
              {filteredUsers.length > 0 && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>Page</span>
                  <span className="font-bold text-white px-1.5 py-0.5 rounded bg-[#1c1f2b] border border-[#282d3e]">
                    {currentPage}
                  </span>
                  <span>of</span>
                  <span className="font-bold text-white">
                    {totalPages}
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#232733] bg-[#12141c] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-3 text-center w-12 font-bold text-slate-500">
                      #
                    </th>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Organization Tenant</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Registered</th>
                    <th className="py-3.5 px-4 text-right">Account Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232733]/60">
                  {paginatedUsers.map((item, index) => {
                    const itemNumber = (currentPage - 1) * pageSize + index + 1;
                    const isOwner = item.role === "PLATFORM_OWNER";
                    const isSuperAdmin = item.role === "SUPER_ADMIN";
                    const isUpdating = updatingId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-[#1a1d28]/60 transition-colors">
                        {/* Number Count (#) */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-[#1a1d28] text-slate-400 font-mono text-[11px] font-semibold border border-[#282d3e]">
                            {itemNumber}
                          </span>
                        </td>
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isOwner
                                ? "bg-amber-400 text-slate-950 ring-2 ring-amber-400/30"
                                : isSuperAdmin
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "bg-[#232733] text-slate-300"
                            }`}
                          >
                            {(item.fullName || item.username).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">
                              {item.fullName || item.username}
                            </span>
                            <span className="text-[11px] text-slate-500">@{item.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Organization Tenant */}
                      <td className="py-3 px-4">
                        {item.organisation ? (
                          <div>
                            <span className="font-semibold text-slate-200 block truncate">
                              {item.organisation.companyName}
                            </span>
                            <span className="text-[10px] text-amber-500/80 font-mono">
                              {item.organisation.subdomain}.mytask.ae
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Platform Root</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-950">
                            Platform Owner
                          </span>
                        ) : isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Super Admin
                          </span>
                        ) : item.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Staff
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        <div>{item.email}</div>
                        <div className="text-slate-500">{item.phoneNumber}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {item.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : item.status === "SUSPENDED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Registered */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>

                      {/* Governance Actions */}
                      <td className="py-3 px-4 text-right">
                        {!isOwner && (
                          <button
                            type="button"
                            onClick={() => handleToggleClick(item)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                              item.status === "ACTIVE"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            }`}
                          >
                            {isUpdating ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : item.status === "ACTIVE" ? (
                              <>
                                <Ban className="h-3 w-3" />
                                <span>Suspend</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[#232733] bg-[#12141c]/60 text-xs">
              {/* Left: Summary & Rows per page */}
              <div className="flex flex-wrap items-center gap-3 text-slate-400">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-white">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-white">
                    {Math.min(currentPage * pageSize, filteredUsers.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-white">
                    {filteredUsers.length}
                  </span>{" "}
                  users
                </div>

                <div className="flex items-center gap-1.5 pl-3 border-l border-[#232733]">
                  <span className="text-[11px] font-medium text-slate-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg bg-[#0b0c10] border border-[#232733] text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[#232733] text-slate-400 hover:text-white hover:bg-[#1f232e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#232733] text-slate-300 hover:text-white hover:bg-[#1f232e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
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
                          className="px-1.5 py-1 text-slate-500 text-xs select-none"
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
                            : "text-slate-400 hover:bg-[#1f232e] hover:text-white"
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#232733] text-slate-300 hover:text-white hover:bg-[#1f232e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[#232733] text-slate-400 hover:text-white hover:bg-[#1f232e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* User Status Confirmation Modal */}
    {statusModalUser && (
      <ConfirmationModal
        isOpen={!!statusModalUser}
        onClose={() => {
          setStatusModalUser(null);
          setStatusError(null);
        }}
        onConfirm={handleConfirmStatus}
        title={
          statusModalUser.nextStatus === "SUSPENDED"
            ? "Suspend User Account?"
            : "Reactivate User Account?"
        }
        subtitle={
          statusModalUser.nextStatus === "SUSPENDED"
            ? "Temporarily revoke platform login and restrict access across organizations."
            : "Restore login credentials and full platform access for this user."
        }
        variant={statusModalUser.nextStatus === "SUSPENDED" ? "warning" : "success"}
        confirmText={
          statusModalUser.nextStatus === "SUSPENDED"
            ? "Yes, Suspend Account"
            : "Yes, Reactivate Account"
        }
        cancelText="Cancel"
        isLoading={!!updatingId}
        error={statusError}
        entityPreview={{
          avatarText: (statusModalUser.user.fullName || statusModalUser.user.username)
            .slice(0, 2)
            .toUpperCase(),
          avatarBg:
            statusModalUser.user.role === "SUPER_ADMIN"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "bg-[#232733] text-slate-300",
          title: statusModalUser.user.fullName || statusModalUser.user.username,
          subtitle: `${statusModalUser.user.email} • @${statusModalUser.user.username}`,
          badges: [
            {
              text: statusModalUser.user.role,
              variant: statusModalUser.user.role === "SUPER_ADMIN" ? "purple" : "blue",
            },
            {
              text: statusModalUser.user.status,
              variant: statusModalUser.user.status === "ACTIVE" ? "success" : "danger",
            },
          ],
        }}
        consequences={
          statusModalUser.nextStatus === "SUSPENDED"
            ? [
                {
                  text: "User's session will be terminated immediately across all devices.",
                  type: "warning",
                },
                {
                  text: "Login attempts will be blocked until reactivated by platform owner.",
                  type: "warning",
                },
                {
                  text: "All existing tenant database associations and logs are retained.",
                  type: "neutral",
                },
              ]
            : [
                {
                  text: "Platform login and session creation will be re-enabled immediately.",
                  type: "positive",
                },
                {
                  text: "User will be able to access their assigned organization dashboard.",
                  type: "positive",
                },
              ]
        }
      />
    )}
    </div>
  );
}
