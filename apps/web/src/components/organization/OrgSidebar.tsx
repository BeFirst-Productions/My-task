"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  FileText,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPermittedModulesForRole } from "@/services/user.service";

interface OrgSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  orgName?: string;
  orgSubdomain?: string;
  orgLogo?: string | null;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  onCloseMobile?: () => void;
}

interface HoveredItemData {
  id: string;
  name: string;
  icon: any;
  badge?: string;
  defaultTab: string;
  subItems?: { id: string; label: string }[];
  top: number;
}

export function OrgSidebar({
  activeTab,
  setActiveTab,
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
  orgLogo,
  isCollapsed = false,
  setIsCollapsed,
  onCloseMobile,
}: OrgSidebarProps) {
  const { user } = useAuth();

  const permittedSet = useMemo(() => {
    const set =
      user?.permittedModules && user.permittedModules.length > 0
        ? new Set(user.permittedModules)
        : new Set(getPermittedModulesForRole(user?.role));

    // Ensure SUPER_ADMIN and PLATFORM_OWNER always have unrestricted access to all core modules
    if (user?.role === "SUPER_ADMIN" || user?.role === "PLATFORM_OWNER") {
      set.add("services");
      set.add("tokens");
    }
    if (user?.role === "ADMIN") {
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
  const [invoiceMenuOpen, setInvoiceMenuOpen] = useState(
    activeTab === "invoices" || activeTab === "proforma" || activeTab === "invoice-create" || activeTab === "proforma-create"
  );
  const [docMenuOpen, setDocMenuOpen] = useState(
    activeTab === "doc-create" || activeTab === "doc-list"
  );

  // Floating hover flyout state in collapsed mode
  const [hoveredItem, setHoveredItem] = useState<HoveredItemData | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create") {
      setClientMenuOpen(true);
    }
    if (activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management") {
      setUserMenuOpen(true);
    }
    if (activeTab === "invoices" || activeTab === "proforma" || activeTab === "invoice-create" || activeTab === "proforma-create") {
      setInvoiceMenuOpen(true);
    }
    if (activeTab === "doc-create" || activeTab === "doc-list") {
      setDocMenuOpen(true);
    }
    setHoveredItem(null);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const handleItemHover = (item: any, e: React.MouseEvent<HTMLElement>) => {
    if (!isCollapsed) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem({
      ...item,
      top: rect.top,
    });
  };

  const handleItemLeave = () => {
    if (!isCollapsed) return;
    leaveTimerRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 180);
  };

  const cancelItemLeave = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setHoveredItem(null);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`${
        isCollapsed
          ? "w-[72px] min-w-[72px] max-w-[72px]"
          : "w-[260px] min-w-[260px] max-w-[260px]"
      } bg-[#0c0d12] border-r border-[#1a1d26] flex flex-col h-screen shrink-0 text-slate-300 select-none overflow-hidden box-border transition-all duration-300 ease-in-out relative z-30`}
    >
      {/* 1. Brand & Organization Logos Header */}
      {!isCollapsed ? (
        // Expanded Header View
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
                {orgLogo ? (
                  <img src={orgLogo} alt={orgName} className="h-5 w-5 rounded object-contain" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
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
      ) : (
        // Collapsed Header View: SaaS Platform Logo + Organization Logo below it
        <div className="pt-4 pb-2 shrink-0 flex flex-col items-center">
          {/* SaaS Platform Logo (My Task) */}
          <div
            onClick={() => handleNavClick("dashboard")}
            onMouseEnter={(e) =>
              handleItemHover(
                {
                  id: "saas-brand",
                  name: "My Task Platform",
                  icon: Sparkles,
                  defaultTab: "dashboard",
                },
                e
              )
            }
            onMouseLeave={handleItemLeave}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-lg shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title="My Task Platform"
          >
            <Sparkles className="h-4.5 w-4.5 fill-slate-950" />
          </div>

          {/* Organization Logo below SaaS Platform Logo */}
          <div
            onMouseEnter={(e) =>
              handleItemHover(
                {
                  id: "org-brand",
                  name: orgName,
                  icon: Target,
                  badge: user?.role?.replace("_", " ") || "Super Admin",
                  defaultTab: "dashboard",
                },
                e
              )
            }
            onMouseLeave={handleItemLeave}
            className="mt-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#151722] border border-amber-500/30 text-amber-400 hover:border-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer relative shadow-sm"
            title={`${orgName} (${user?.role?.replace("_", " ") || "Super Admin"})`}
          >
            {orgLogo ? (
              <img src={orgLogo} alt={orgName} className="h-5.5 w-5.5 rounded-lg object-contain" />
            ) : (
              <Target className="h-4.5 w-4.5 text-amber-400" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#0c0d12]" />
          </div>

          {/* Subtle Divider Line */}
          <div className="my-2.5 h-px w-8 bg-[#1f2333]" />
        </div>
      )}

      {/* 2. Scrollable Middle Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav className="space-y-1 text-xs sm:text-[13px] font-medium">
          {/* Dashboard */}
          {canAccess("dashboard") && (
            <div>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("dashboard")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("dashboard")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "dashboard",
                        name: "Dashboard",
                        icon: LayoutDashboard,
                        defaultTab: "dashboard",
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "dashboard"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Dashboard"
                >
                  <LayoutDashboard className={`h-4.5 w-4.5 ${activeTab === "dashboard" ? "text-slate-950" : "text-slate-400"}`} />
                </button>
              )}
            </div>
          )}

          {/* Client Management */}
          {canAccess("clients") && (
            <div>
              {!isCollapsed ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setClientMenuOpen(!clientMenuOpen);
                      handleNavClick("client-list");
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
                          onClick={() => handleNavClick("client-create")}
                          className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors cursor-pointer ${
                            activeTab === "client-create"
                              ? "text-amber-400 bg-amber-500/10 font-bold"
                              : "text-slate-400 hover:text-white hover:bg-[#151722]"
                          }`}
                        >
                          + Onboard Client
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavClick("client-list")}
                          className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("client-list")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "clients",
                        name: "Client Management",
                        icon: Building2,
                        defaultTab: "client-list",
                        subItems: [
                          { id: "client-create", label: "+ Onboard Client" },
                          { id: "client-list", label: "Client Directory" },
                        ],
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Client Management"
                >
                  <Building2
                    className={`h-4.5 w-4.5 ${
                      activeTab === "clients" || activeTab === "client-list" || activeTab === "client-create"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          {/* Work Orders */}
          {canAccess("work_orders") && (
            <div>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("work-orders")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("work-orders")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "work-orders",
                        name: "Work Orders",
                        icon: Briefcase,
                        badge: "Active",
                        defaultTab: "work-orders",
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "work-orders"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Work Orders"
                >
                  <Briefcase className={`h-4.5 w-4.5 ${activeTab === "work-orders" ? "text-slate-950" : "text-slate-400"}`} />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 shadow-sm" />
                </button>
              )}
            </div>
          )}

          {/* Invoices */}
          {canAccess("invoices") && (
            <div>
              {!isCollapsed ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceMenuOpen(!invoiceMenuOpen);
                      if (!invoiceMenuOpen) handleNavClick("invoices");
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                      activeTab === "invoices" || activeTab === "proforma" || activeTab === "invoice-create" || activeTab === "proforma-create"
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                        : "text-slate-400 hover:text-white hover:bg-[#151722]"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Receipt
                        className={`h-4 w-4 shrink-0 ${
                          activeTab === "invoices" || activeTab === "proforma" || activeTab === "invoice-create" || activeTab === "proforma-create"
                            ? "text-slate-950"
                            : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">Invoices</span>
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                        activeTab === "invoices" || activeTab === "proforma" || activeTab === "invoice-create" || activeTab === "proforma-create"
                          ? "text-slate-950"
                          : "text-slate-400"
                      } ${invoiceMenuOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-200 ease-in-out ${
                      invoiceMenuOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-7 space-y-1 text-xs border-l border-slate-800/80 pl-2 py-0.5">
                        <button
                          type="button"
                          onClick={() => handleNavClick("invoices")}
                          className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors cursor-pointer ${
                            activeTab === "invoices" || activeTab === "invoice-create"
                              ? "text-amber-400 bg-amber-500/10 font-bold"
                              : "text-slate-400 hover:text-white hover:bg-[#151722]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span>Invoices</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavClick("proforma")}
                          className={`w-full text-left py-1.5 px-2.5 rounded-lg truncate transition-colors cursor-pointer ${
                            activeTab === "proforma" || activeTab === "proforma-create"
                              ? "text-amber-400 bg-amber-500/10 font-bold"
                              : "text-slate-400 hover:text-white hover:bg-[#151722]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Receipt className="h-3 w-3 shrink-0" />
                            <span>Proforma Invoices</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("invoices")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "invoices",
                        name: "Invoices & Billing",
                        icon: Receipt,
                        defaultTab: "invoices",
                        subItems: [
                          { id: "invoices", label: "Tax Invoices" },
                          { id: "proforma", label: "Proforma Invoices" },
                        ],
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "invoices" || activeTab === "proforma" || activeTab === "invoice-create" || activeTab === "proforma-create"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Invoices"
                >
                  <Receipt
                    className={`h-4.5 w-4.5 ${
                      activeTab === "invoices" || activeTab === "proforma" || activeTab === "invoice-create" || activeTab === "proforma-create"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          {/* Service Management */}
          {canAccess("services") && (
            <div>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("services")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("services")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "services",
                        name: "Service Management",
                        icon: Layers,
                        defaultTab: "services",
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "services" || activeTab === "service-management"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Service Management"
                >
                  <Layers
                    className={`h-4.5 w-4.5 ${
                      activeTab === "services" || activeTab === "service-management"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          {/* Intake & Tasks */}
          {canAccess("tasks") && (
            <div>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("task-list")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("task-list")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "tasks",
                        name: "Intake & Tasks",
                        icon: CheckSquare,
                        defaultTab: "task-list",
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "task-list" || activeTab === "task-create" || activeTab === "tasks"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Intake & Tasks"
                >
                  <CheckSquare
                    className={`h-4.5 w-4.5 ${
                      activeTab === "task-list" || activeTab === "task-create" || activeTab === "tasks"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          {/* Document Management */}
          {canAccess("documents") && (
            <div>
              {!isCollapsed ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setDocMenuOpen(!docMenuOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
                          onClick={() => handleNavClick("doc-create")}
                          className={`w-full text-left py-1 px-2 rounded truncate transition-colors cursor-pointer ${
                            activeTab === "doc-create"
                              ? "text-amber-400 font-bold bg-amber-500/10"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Document Create
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavClick("doc-list")}
                          className={`w-full text-left py-1 px-2 rounded truncate transition-colors cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("doc-list")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "documents",
                        name: "Document Management",
                        icon: FolderOpen,
                        defaultTab: "doc-list",
                        subItems: [
                          { id: "doc-create", label: "Document Create" },
                          { id: "doc-list", label: "List Document" },
                        ],
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "doc-create" || activeTab === "doc-list"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Document Management"
                >
                  <FolderOpen
                    className={`h-4.5 w-4.5 ${
                      activeTab === "doc-create" || activeTab === "doc-list"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          {/* User Management */}
          {canAccess("users") && (
            <div>
              {!isCollapsed ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(!userMenuOpen);
                      handleNavClick("user-list");
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
                        activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
                          ? "text-slate-950"
                          : "text-slate-400"
                      } ${userMenuOpen ? "rotate-0" : "-rotate-90"}`}
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
                          onClick={() => handleNavClick("user-create")}
                          className={`w-full text-left py-1 px-2 rounded truncate transition-colors cursor-pointer ${
                            activeTab === "user-create"
                              ? "text-amber-400 font-bold bg-amber-500/10"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          + Create User
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavClick("user-list")}
                          className={`w-full text-left py-1 px-2 rounded truncate transition-colors cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("user-list")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "users",
                        name: "User Management",
                        icon: Users2,
                        defaultTab: "user-list",
                        subItems: [
                          { id: "user-create", label: "+ Create User" },
                          { id: "user-list", label: "Users List" },
                        ],
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="User Management"
                >
                  <Users2
                    className={`h-4.5 w-4.5 ${
                      activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management"
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          {/* Notifications */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => handleNavClick("notifications")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick("notifications")}
                onMouseEnter={(e) =>
                  handleItemHover(
                    {
                      id: "notifications",
                      name: "Notifications",
                      icon: Bell,
                      defaultTab: "notifications",
                    },
                    e
                  )
                }
                onMouseLeave={handleItemLeave}
                className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                  activeTab === "notifications"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-[#151722]"
                }`}
                title="Notifications"
              >
                <Bell className={`h-4.5 w-4.5 ${activeTab === "notifications" ? "text-slate-950" : "text-slate-400"}`} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 shadow-sm" />
              </button>
            )}
          </div>

          {/* Reports & Analytics */}
          {canAccess("reports") && (
            <div>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("reports")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left cursor-pointer ${
                    activeTab === "reports"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 shrink-0" />
                  <span className="truncate">Reports & Analytics</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("reports")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "reports",
                        name: "Reports & Analytics",
                        icon: BarChart3,
                        defaultTab: "reports",
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "reports"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Reports & Analytics"
                >
                  <BarChart3 className={`h-4.5 w-4.5 ${activeTab === "reports" ? "text-slate-950" : "text-slate-400"}`} />
                </button>
              )}
            </div>
          )}

          {/* Support Center */}
          {canAccess("tokens") && (
            <div>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("tokens")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
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
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("tokens")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "tokens",
                        name: "Support Center",
                        icon: MessageSquare,
                        badge: "2-Way",
                        defaultTab: "tokens",
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "tokens"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Support Center"
                >
                  <MessageSquare className={`h-4.5 w-4.5 ${activeTab === "tokens" ? "text-slate-950" : "text-amber-500"}`} />
                </button>
              )}
            </div>
          )}

          {/* Settings */}
          {canAccess("settings") && (
            <div>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("settings")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors truncate text-left cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="truncate">Settings</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick("settings")}
                  onMouseEnter={(e) =>
                    handleItemHover(
                      {
                        id: "settings",
                        name: "Settings",
                        icon: Settings,
                        defaultTab: "settings",
                      },
                      e
                    )
                  }
                  onMouseLeave={handleItemLeave}
                  className={`relative flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#151722]"
                  }`}
                  title="Settings"
                >
                  <Settings className={`h-4.5 w-4.5 ${activeTab === "settings" ? "text-slate-950" : "text-slate-400"}`} />
                </button>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* 3. Bottom Dubai Skyline Banner Card */}
      {!isCollapsed ? (
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
      ) : (
        <div className="p-2 shrink-0 bg-[#0c0d12] flex justify-center">
          <div
            className="h-9 w-9 rounded-xl overflow-hidden border border-amber-500/30 relative shadow-md group cursor-pointer"
            title="Grow • Manage • Succeed Together"
          >
            <img
              src="/dubai_skyline.jpg"
              alt="Dubai Skyline"
              className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-amber-500/10 group-hover:bg-transparent transition-colors" />
          </div>
        </div>
      )}

      {/* 4. Professional Floating Flyout / Tooltip on Hover in Collapsed State */}
      {isCollapsed && hoveredItem && (
        <div
          style={{
            top: Math.max(12, Math.min(typeof window !== "undefined" ? window.innerHeight - 200 : 800, hoveredItem.top - 4)),
          }}
          onMouseEnter={cancelItemLeave}
          onMouseLeave={handleItemLeave}
          className="fixed left-[76px] z-[9999] min-w-[200px] max-w-[240px] rounded-2xl border border-slate-700/80 bg-[#10121a]/95 backdrop-blur-xl p-2.5 shadow-2xl shadow-black/80 text-xs text-white animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Pointer Arrow */}
          <div className="absolute -left-1.5 top-4 h-3 w-3 -translate-y-1/2 rotate-45 border-l border-b border-slate-700/80 bg-[#10121a]" />

          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <hoveredItem.icon className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-slate-100 truncate text-[12px]">
                {hoveredItem.name}
              </span>
            </div>
            {hoveredItem.badge && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                {hoveredItem.badge}
              </span>
            )}
          </div>

          {/* Submenu Links if Present */}
          {hoveredItem.subItems && hoveredItem.subItems.length > 0 ? (
            <div className="space-y-1">
              {hoveredItem.subItems.map((sub) => {
                const isSubActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleNavClick(sub.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isSubActive
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                    {isSubActive && <Check className="h-3.5 w-3.5 text-slate-950 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNavClick(hoveredItem.defaultTab)}
              className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 text-[11px] transition-colors cursor-pointer group"
            >
              <span>Open module</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
