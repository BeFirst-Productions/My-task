"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Users2,
  CheckSquare,
  FolderOpen,
  Bell,
  BarChart3,
  Settings,
  ChevronDown,
  Receipt,
  FileCode2,
  Layers,
  Sparkles,
  Target,
  MessageSquare,
  Briefcase,
  Building2,
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
    const set =
      user?.permittedModules && user.permittedModules.length > 0
        ? new Set(user.permittedModules)
        : new Set(getPermittedModulesForRole(user?.role));

    // Ensure SUPER_ADMIN and ADMIN always have access to services
    if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
      set.add("services");
    }
    return set;
  }, [user]);

  const canAccess = (moduleId: string) => permittedSet.has(moduleId);

  const [clientMenuOpen, setClientMenuOpen] = useState(
    activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create"
  );
  const [userMenuOpen, setUserMenuOpen] = useState(
    activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
  );
  const [docMenuOpen, setDocMenuOpen] = useState(
    activeTab === "doc-create" || activeTab === "doc-list"
  );

  useEffect(() => {
    if (activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create") {
      setClientMenuOpen(true);
    }
    if (activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management") {
      setUserMenuOpen(true);
    }
  }, [activeTab]);

  return (
    <aside className="w-[260px] min-w-[260px] max-w-[260px] bg-[#0c0d12] border-r border-[#1a1d26] flex flex-col h-screen shrink-0 text-slate-300 select-none overflow-hidden box-border">
      {/* 1. Brand Logo Header */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-lg shadow-md shadow-amber-500/20">
            <Sparkles className="h-4 w-4 fill-slate-950" />
          </div>
          <span className="font-extrabold text-amber-400 text-xl tracking-tight leading-none">
            My Task
          </span>
        </div>

        {/* Organization Info Box */}
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
                {user?.role?.replace("_", " ") || "Super Admin"}
              </span>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0 ml-1" />
        </div>
      </div>

      {/* 2. Scrollable Middle Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav className="space-y-1 text-xs sm:text-[13px] font-medium">
          {/* Dashboard */}
          {canAccess("dashboard") && (
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
                <LayoutDashboard
                  className={`h-4 w-4 shrink-0 ${
                    activeTab === "dashboard" ? "text-slate-950" : "text-slate-400"
                  }`}
                />
                <span className="truncate">Dashboard</span>
              </div>
            </button>
          )}

          {/* Client Management (New Workflow) */}
          {canAccess("clients") && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setClientMenuOpen(!clientMenuOpen);
                  setActiveTab("client-list");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                    : "text-slate-400 hover:text-white hover:bg-[#151722]"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Building2
                    className={`h-4 w-4 shrink-0 ${
                      activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">Client Management</span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                    activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create"
                      ? "text-slate-950"
                      : "text-slate-400"
                  } ${clientMenuOpen ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  clientMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-7 space-y-1 text-xs border-l border-slate-800/80 pl-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("client-create")}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors ${
                        activeTab === "client-create"
                          ? "text-amber-400 bg-amber-500/10 font-bold"
                          : "text-slate-400 hover:text-white hover:bg-[#151722]"
                      }`}
                    >
                      + Onboard Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("client-list")}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors ${
                        activeTab === "client-list" || activeTab === "clients"
                          ? "text-amber-400 bg-amber-500/10 font-bold"
                          : "text-slate-400 hover:text-white hover:bg-[#151722]"
                      }`}
                    >
                      Client Directory
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Work Orders Module (New Workflow) */}
          {canAccess("work_orders") && (
            <button
              type="button"
              onClick={() => setActiveTab("work-orders")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === "work-orders"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Briefcase
                  className={`h-4 w-4 shrink-0 ${
                    activeTab === "work-orders" ? "text-slate-950" : "text-slate-400"
                  }`}
                />
                <span className="truncate">Work Orders</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  activeTab === "work-orders"
                    ? "bg-black/20 text-slate-950"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                Active
              </span>
            </button>
          )}

          {/* Invoices & Proforma Module */}
          {canAccess("invoices") && (
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === "invoices"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <Receipt
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "invoices" ? "text-slate-950" : "text-slate-400"
                }`}
              />
              <span className="truncate">Invoices & Proforma</span>
            </button>
          )}

          {/* Service Management */}
          {canAccess("services") && (
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === "services" || activeTab === "service-management"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Layers
                  className={`h-4 w-4 shrink-0 ${
                    activeTab === "services" || activeTab === "service-management"
                      ? "text-slate-950"
                      : "text-slate-400"
                  }`}
                />
                <span className="truncate">Service Management</span>
              </div>
            </button>
          )}

          {/* Intake & Tasks */}
          {canAccess("tasks") && (
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
                <CheckSquare
                  className={`h-4 w-4 shrink-0 ${
                    activeTab === "task-list" || activeTab === "task-create" || activeTab === "tasks"
                      ? "text-slate-950"
                      : "text-slate-400"
                  }`}
                />
                <span className="truncate">Intake & Tasks</span>
              </div>
            </button>
          )}

          {/* Document Management */}
          {canAccess("documents") && (
            <div>
              <button
                type="button"
                onClick={() => setDocMenuOpen(!docMenuOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === "doc-create" || activeTab === "doc-list"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                    : "text-slate-400 hover:text-white hover:bg-[#151722]"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <FolderOpen
                    className={`h-4 w-4 shrink-0 ${
                      activeTab === "doc-create" || activeTab === "doc-list"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
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
                      className={`w-full text-left py-1 px-2 rounded truncate transition-colors ${
                        activeTab === "doc-create"
                          ? "text-amber-400 font-bold bg-amber-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Document Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("doc-list")}
                      className={`w-full text-left py-1 px-2 rounded truncate transition-colors ${
                        activeTab === "doc-list"
                          ? "text-amber-400 font-bold bg-amber-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      List Document
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  <Users2
                    className={`h-4 w-4 shrink-0 ${
                      activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">User Management</span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
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
                      className={`w-full text-left py-1 px-2 rounded truncate transition-colors ${
                        activeTab === "user-create"
                          ? "text-amber-400 font-bold bg-amber-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      + Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("user-list")}
                      className={`w-full text-left py-1 px-2 rounded truncate transition-colors ${
                        activeTab === "user-list"
                          ? "text-amber-400 font-bold bg-amber-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Users List
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === "notifications"
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                : "text-slate-400 hover:text-white hover:bg-[#151722]"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <Bell
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "notifications" ? "text-slate-950" : "text-slate-400"
                }`}
              />
              <span className="truncate">Notifications</span>
            </div>
            {activeTab !== "notifications" && (
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/80 shrink-0" />
            )}
          </button>

          {/* Reports & Analytics */}
          {canAccess("reports") && (
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "reports"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="truncate">Reports & Analytics</span>
            </button>
          )}

          {/* Support Center */}
          <button
            type="button"
            onClick={() => setActiveTab("tokens")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === "tokens"
                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                : "text-slate-400 hover:text-white hover:bg-[#151722]"
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <MessageSquare
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "tokens" ? "text-slate-950" : "text-amber-500"
                }`}
              />
              <span className="truncate">Support Center</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                activeTab === "tokens" ? "bg-black/20 text-slate-950" : "bg-amber-500/20 text-amber-400"
              }`}
            >
              2-Way
            </span>
          </button>

          {/* Settings */}
          {canAccess("settings") && (
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left ${
                activeTab === "settings"
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-[#151722]"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="truncate">Settings</span>
            </button>
          )}
        </nav>
      </div>

      {/* 3. Bottom Dubai Skyline Banner Card */}
      <div className="p-3 shrink-0 bg-[#0c0d12]">
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-t from-black via-[#16141a] to-[#0c0d12] shadow-2xl">
          <div className="h-28 w-full relative overflow-hidden flex items-end">
            <img
              src="/dubai_skyline.jpg"
              alt="Dubai Skyline"
              className="absolute inset-0 w-full h-full object-cover object-bottom opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="relative z-10 p-3">
              <h4 className="text-xs font-black text-white tracking-tight leading-tight drop-shadow-md">
                Grow • Manage<br />Succeed Together
              </h4>
              <div className="mt-1.5 h-0.5 w-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-sm shadow-amber-400" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
