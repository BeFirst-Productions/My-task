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
} from "lucide-react";
import {
  getPlatformUsers,
  updatePlatformUserStatus,
  type UserItem,
} from "@/services/user.service";

interface UserManagementViewProps {
  initialFilterRole?: "SUPER_ADMIN" | "ALL";
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

  // Handle status toggle (e.g. Suspend or Activate)
  const handleToggleStatus = async (user: UserItem) => {
    if (user.role === "PLATFORM_OWNER") return; // Cannot suspend platform owner
    const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    setUpdatingId(user.id);
    try {
      await updatePlatformUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user status");
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232733] bg-[#12141c] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
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
                {filteredUsers.map((item) => {
                  const isOwner = item.role === "PLATFORM_OWNER";
                  const isSuperAdmin = item.role === "SUPER_ADMIN";
                  const isUpdating = updatingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-[#1a1d28]/60 transition-colors">
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
                            onClick={() => handleToggleStatus(item)}
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
        )}
      </div>
    </div>
  );
}
