"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Building2,
  ShieldAlert,
  Users,
  BarChart3,
  Bell,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  ListFilter,
  CheckCircle2,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [orgMenuOpen, setOrgMenuOpen] = useState(true);

  return (
    <aside className="w-64 bg-[#0d0e13] border-r border-[#1e2029] flex flex-col justify-between shrink-0 h-screen overflow-y-auto text-slate-300 select-none">
      <div>
        {/* Brand Logo Header */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-[#1e2029]/80 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 font-sans">
              My Task
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3.5 space-y-1 text-sm font-medium">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* Organisation Management Dropdown */}
          <div>
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all ${
                activeTab.startsWith("org-")
                  ? "bg-[#181a24] text-amber-400 border border-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-[#161822]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 shrink-0 text-amber-500" />
                <span>Organisation Management</span>
              </div>
              {orgMenuOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {orgMenuOpen && (
              <div className="pl-9 pr-2 py-1.5 space-y-1 text-xs">
                <button
                  onClick={() => setActiveTab("org-create")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                    activeTab === "org-create"
                      ? "text-amber-400 bg-amber-500/10 font-medium"
                      : "text-slate-400 hover:text-white hover:bg-[#161822]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeTab === "org-create" ? "bg-amber-400 ring-2 ring-amber-400/30" : "bg-slate-600"
                    }`}
                  />
                  <span>Create</span>
                </button>
                <button
                  onClick={() => setActiveTab("org-listing")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                    activeTab === "org-listing"
                      ? "text-amber-400 bg-amber-500/10 font-medium"
                      : "text-slate-400 hover:text-white hover:bg-[#161822]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeTab === "org-listing" ? "bg-amber-400 ring-2 ring-amber-400/30" : "bg-slate-600"
                    }`}
                  />
                  <span>Listing</span>
                </button>
                <button
                  onClick={() => setActiveTab("org-status")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                    activeTab === "org-status"
                      ? "text-amber-400 bg-amber-500/10 font-medium"
                      : "text-slate-400 hover:text-white hover:bg-[#161822]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeTab === "org-status" ? "bg-amber-400 ring-2 ring-amber-400/30" : "bg-slate-600"
                    }`}
                  />
                  <span>Status</span>
                </button>
              </div>
            )}
          </div>

          {/* Super Admins (Commented)
          <button
            onClick={() => setActiveTab("super-admins")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
              activeTab === "super-admins"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Super Admins</span>
          </button>
          */}

          {/* User Management (Commented)
          <button
            onClick={() => setActiveTab("user-management")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
              activeTab === "user-management"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>User Management</span>
          </button>
          */}

          {/* Reports & Analytics (Commented)
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
              activeTab === "reports"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>Reports & Analytics</span>
          </button>
          */}

          {/* Notifications (Commented)
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all ${
              activeTab === "notifications"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 shrink-0" />
              <span>Notifications</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </button>
          */}

          {/* Audit Logs (Commented)
          <button
            onClick={() => setActiveTab("audit-logs")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
              activeTab === "audit-logs"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
          >
            <ScrollText className="h-4 w-4 shrink-0" />
            <span>Audit Logs</span>
          </button>
          */}

          {/* Platform Settings */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
              activeTab === "settings"
                ? "bg-amber-500 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Platform Settings</span>
          </button>
        </div>
      </div>

      {/* Sidebar Footer Graphic Banner */}
      <div className="p-4 border-t border-[#1e2029]/80 shrink-0">
        <div className="relative rounded-xl overflow-hidden border border-amber-500/20 bg-gradient-to-t from-black via-slate-950 to-amber-950/20 p-3 flex flex-col justify-end min-h-[160px]">
          {/* Dubai Skyline Background */}
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
            <Image
              src="/dubai_skyline.jpg"
              alt="Dubai Skyline"
              fill
              className="object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e13] via-[#0d0e13]/60 to-transparent z-0" />

          {/* Bottom text */}
          <div className="relative z-10 space-y-1">
            <div className="text-[11px] font-bold tracking-tight text-white leading-tight">
              One Platform
            </div>
            <div className="text-[11px] font-medium text-slate-400 leading-tight">
              Multiple Businesses
            </div>
            <div className="text-[11px] font-semibold text-amber-400 leading-tight">
              Greater Possibilities
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
