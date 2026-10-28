"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users2,
  FolderOpen,
  CheckSquare,
  Bell,
  BarChart3,
  Settings,
  ChevronDown,
  Receipt,
  ShieldCheck,
  Building2,
  Sparkles,
  Target,
  FileCode2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPermittedModulesForRole } from "@/services/user.service";

interface OrgSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  orgName?: string;
  orgSubdomain?: string;
  orgLogo?: string | null;
}

export function OrgSidebar({
  activeTab,
  setActiveTab,
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
  orgLogo,
}: OrgSidebarProps) {
  const { user } = useAuth();

  const permittedSet = useMemo(() => {
    if (user?.permittedModules && user.permittedModules.length > 0) {
      return new Set(user.permittedModules);
    }
    return new Set(getPermittedModulesForRole(user?.role));
  }, [user]);

  const canAccess = (moduleId: string) => permittedSet.has(moduleId);

  const [userMenuOpen, setUserMenuOpen] = useState(
    activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
  );
  const [docMenuOpen, setDocMenuOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management") {
      setUserMenuOpen(true);
    }
  }, [activeTab]);

  return (
    <aside className="w-[260px] min-w-[260px] max-w-[260px] bg-[#0c0d12] border-r border-[#1a1d26] flex flex-col h-screen shrink-0 text-slate-300 select-none overflow-hidden box-border">
      {/* 1. Brand Logo Header */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          {orgLogo ? (
            <img
              src={orgLogo}
              alt={orgName}
              className="h-11 w-11 rounded-2xl object-contain bg-white/5 border border-amber-500/20 p-1 shrink-0 shadow-sm"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#14161f] border border-amber-500/30 text-amber-400 font-black text-2xl shadow-lg shadow-amber-500/10 shrink-0">
              <span className="tracking-tighter">b</span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-black text-amber-400 text-2xl tracking-tight leading-none">
              ibh
            </span>
            <span className="text-[9px] text-amber-500/80 tracking-widest uppercase font-bold mt-0.5">
              Business Platform
            </span>
          </div>
        </div>

        {/* Organization Info Box (matches screenshot) */}
        <div className="mt-4 flex items-center justify-between p-2.5 rounded-xl bg-[#151722] border border-[#222636]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Target className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate leading-tight">
                {orgName}
              </span>
              <span className="text-[10px] text-slate-400 truncate capitalize">
                {user?.role ? user.role.toLowerCase().replace(/_/g, " ") : "Member"}
              </span>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0 ml-1" />
        </div>
      </div>

      {/* 2. Scrollable Middle Navigation Menu (Zero Width Shift) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav className="space-y-1 text-xs sm:text-[13px] font-medium">
          {/* Dashboard (Golden active pill matching screenshot) */}
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                : "text-slate-400 hover:text-white hover:bg-[#151722]"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span className="truncate">Dashboard</span>
            </div>
          </button>

          {/* Clients */}
          {/* {canAccess("clients") && (
            <button
              type="button"
              onClick={() => setActiveTab("clients")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "clients"
                  ? "bg-[#171a26] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <Users2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Clients</span>
            </button>
          )} */}

          {/* User Management */}
          {canAccess("users") && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setActiveTab("user-list");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                    : "text-slate-400 hover:text-white hover:bg-[#151722]"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Users2 className={`h-4 w-4 shrink-0 ${
                    activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
                      ? "text-slate-950"
                      : "text-slate-400"
                  }`} />
                  <span className="truncate">User Management</span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                    activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
                      ? "text-slate-950"
                      : "text-slate-400"
                  } ${
                    userMenuOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  userMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-7 space-y-1 text-xs border-l border-slate-800/80 pl-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("user-create")}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors ${
                        activeTab === "user-create"
                          ? "text-amber-400 bg-amber-500/10 font-bold"
                          : "text-slate-400 hover:text-white hover:bg-[#151722]"
                      }`}
                    >
                      + Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("user-list")}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors ${
                        activeTab === "user-list" || activeTab === "user-management"
                          ? "text-amber-400 bg-amber-500/10 font-bold"
                          : "text-slate-400 hover:text-white hover:bg-[#151722]"
                      }`}
                    >
                      Users List
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task Management */}
          <button
            type="button"
            onClick={() => setActiveTab("task-list")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === "task-list" || activeTab === "task-create" || activeTab === "tasks"
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                : "text-slate-400 hover:text-white hover:bg-[#151722]"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <CheckSquare className={`h-4 w-4 shrink-0 ${
                activeTab === "task-list" || activeTab === "task-create" || activeTab === "tasks"
                  ? "text-slate-950"
                  : "text-slate-400"
              }`} />
              <span className="truncate">Task Management</span>
            </div>
          </button>

          {/* Document Management */}
          {canAccess("documents") && (
            <div>
              <button
                type="button"
                onClick={() => setDocMenuOpen(!docMenuOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#151722] transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <FolderOpen className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">Document Management</span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                    docMenuOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  docMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-7 space-y-1 text-xs border-l border-slate-800/80 pl-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("doc-create")}
                      className="w-full text-left py-1 px-2 rounded text-slate-400 hover:text-white truncate"
                    >
                      Document Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("doc-list")}
                      className="w-full text-left py-1 px-2 rounded text-slate-400 hover:text-white truncate"
                    >
                      List Document
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
         {/* {canAccess("alerts") && (
            <button
              type="button"
              onClick={() => setActiveTab("alerts")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "alerts"
                  ? "bg-[#171a26] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span className="truncate">Alerts</span>
            </button>
          )}  */}

          {/* Invoices */}
          {/* {canAccess("invoices") && (
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "invoices"
                  ? "bg-[#171a26] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="truncate">Invoices</span>
            </button>
          )} */}

          {/* Reports & Analytics */}
          {/* {canAccess("reports") && (
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "reports"
                  ? "bg-[#171a26] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="truncate">Reports & Analytics</span>
            </button>
          )} */}

          {/* Notifications (with active orange indicator dot) */}
          {/* <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors ${
              activeTab === "notifications"
                ? "bg-[#171a26] text-white font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#151722]"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <Bell className="h-4 w-4 shrink-0" />
              <span className="truncate">Notifications</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/80 shrink-0" />
          </button> */}

          {/* Settings */}
          {canAccess("settings") && (
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "settings"
                  ? "bg-[#171a26] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="truncate">Settings</span>
            </button>
          )}

          {/* Audit Logs */}
          {/* {canAccess("settings") && (
            <button
              type="button"
              onClick={() => setActiveTab("audit-logs")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "audit-logs"
                  ? "bg-[#171a26] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <FileCode2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Audit Logs</span>
            </button>
          )} */}
        </nav>
      </div>

      {/* 3. Bottom Dubai Burj Skyline Banner Card (Matching Screenshot exactly) */}
      <div className="p-3 shrink-0 bg-[#0c0d12]">
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-t from-black via-[#16141a] to-[#0c0d12] p-4 text-left shadow-2xl">
          {/* Dubai Burj Khalifa Skyline Graphic */}
          <div className="h-24 w-full relative overflow-hidden flex items-end">
            <svg viewBox="0 0 240 100" className="w-full h-full object-contain">
              <defs>
                <linearGradient id="goldGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {/* Burj Khalifa Silhouette */}
              <path
                d="M 180,95 L 180,45 L 183,45 L 183,25 L 185,25 L 185,5 L 186,0 L 187,5 L 187,25 L 189,25 L 189,45 L 192,45 L 192,95 Z"
                fill="url(#goldGlow)"
              />
              {/* Surrounding Dubai highrises */}
              <rect x="20" y="70" width="16" height="25" fill="#f59e0b" opacity="0.4" />
              <rect x="42" y="55" width="20" height="40" fill="#f59e0b" opacity="0.6" />
              <rect x="68" y="65" width="18" height="30" fill="#f59e0b" opacity="0.5" />
              <rect x="92" y="45" width="22" height="50" fill="#f59e0b" opacity="0.7" />
              <rect x="120" y="60" width="18" height="35" fill="#f59e0b" opacity="0.5" />
              <rect x="144" y="40" width="24" height="55" fill="#f59e0b" opacity="0.8" />
              <rect x="200" y="50" width="20" height="45" fill="#f59e0b" opacity="0.6" />
              <rect x="225" y="70" width="15" height="25" fill="#f59e0b" opacity="0.4" />
              {/* City ground line */}
              <line x1="0" y1="95" x2="240" y2="95" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />
            </svg>
          </div>

          {/* Slogan */}
          <div className="mt-3">
            <h4 className="text-sm font-black text-white tracking-tight leading-tight">
              Grow<br />Manage<br />Succeed Together
            </h4>
            {/* Glowing gold underline bar */}
            <div className="mt-2.5 h-1 w-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-sm shadow-amber-400" />
          </div>
        </div>
      </div>
    </aside>
  );
}
