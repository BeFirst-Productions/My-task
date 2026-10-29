"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { OrgSidebar } from "@/components/organization/OrgSidebar";
import { OrgTopHeader } from "@/components/organization/OrgTopHeader";
import { OrgDashboardView } from "@/components/organization/OrgDashboardView";
import { OrgUserManagementView } from "@/components/organization/OrgUserManagementView";
import { OrgCreateUserView } from "@/components/organization/OrgCreateUserView";
import { useAuth } from "@/context/AuthContext";
import { DocumentCreateView } from "@/components/organization/DocumentCreateView";
import { DocumentListView } from "@/components/organization/DocumentListView";
import { SettingsModule } from "@/components/settings/SettingsModule";
import { TaskListView } from "@/components/organization/TaskListView";
import { TaskCreateView } from "@/components/organization/TaskCreateView";
import { OrgTokensView } from "@/components/tokens/OrgTokensView";
import { ShieldAlert } from "lucide-react";
import { getAuthHeaders } from "@/services/auth.service";

// New Workflow Components
import { ClientCreateView } from "@/components/clients/ClientCreateView";
import { ClientListView } from "@/components/clients/ClientListView";
import { ClientDetailDashboardView } from "@/components/clients/ClientDetailDashboardView";
import { AdminWorkOrderView } from "@/components/work-orders/AdminWorkOrderView";
import { StaffWorkOrderView } from "@/components/work-orders/StaffWorkOrderView";
import { ProformaListView } from "@/components/proforma/ProformaListView";

interface OrgData {
  id: string;
  companyName: string;
  subdomain: string;
  primaryLocation: string;
  logo: string | null;
  status: string;
  superAdmin?: {
    fullName?: string;
    username?: string;
    email?: string;
  };
}

function DynamicOrgDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  // 1. Session and Authentication Verification Guard:
  // If not authenticated, redirect cleanly to login without revealing workspace
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = window.location.pathname + window.location.search;
      router.replace(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    }
  }, [authLoading, isAuthenticated, router]);

  const slug = (params?.slug as string) || "ibh";
  const initialTab = searchParams.get("tab") || "dashboard";

  // Selected client detail view state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Derive initial tab from search params or session storage
  const tabFromQuery = searchParams.get("tab");
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (tabFromQuery) return tabFromQuery;
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(`org_${slug}_active_tab`);
        if (saved) return saved;
      } catch (e) {}
    }
    return "dashboard";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync tab with URL search params changes
  useEffect(() => {
    if (tabFromQuery) {
      setActiveTabState(tabFromQuery);
      try {
        sessionStorage.setItem(`org_${slug}_active_tab`, tabFromQuery);
      } catch (e) {}
    } else {
      try {
        const saved = sessionStorage.getItem(`org_${slug}_active_tab`);
        if (saved && saved !== "dashboard") {
          setActiveTabState(saved);
          const url = new URL(window.location.href);
          url.searchParams.set("tab", saved);
          window.history.replaceState({ tab: saved }, "", url.toString());
        } else {
          setActiveTabState("dashboard");
        }
      } catch (e) {}
    }
  }, [tabFromQuery, slug]);

  // Listen to popstate event for instant browser back/forward sync
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get("tab") || "dashboard";
        setActiveTabState(tab);
        sessionStorage.setItem(`org_${slug}_active_tab`, tab);
      } catch (e) {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [slug]);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setMobileMenuOpen(false);
    if (tab !== "client-list" && tab !== "clients") {
      setSelectedClientId(null);
    }
    try {
      sessionStorage.setItem(`org_${slug}_active_tab`, tab);
      const url = new URL(window.location.href);
      if (tab === "dashboard") {
        url.searchParams.delete("tab");
        url.searchParams.delete("editUserId");
      } else {
        url.searchParams.set("tab", tab);
        if (tab !== "user-list" && tab !== "user-management") {
          url.searchParams.delete("editUserId");
        }
      }
      window.history.pushState({ tab }, "", url.toString());
    } catch (err) {
      console.error("Failed to sync tab to url:", err);
    }
  }, [slug]);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch(`/api/organisations/by-subdomain/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setOrgData(data.data);
          }
        }
      } catch (err) {
        console.error("Failed to load organization profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrg();
  }, [slug]);

  // Show secure verification screen while verifying session
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#07090e]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="text-xs font-bold text-slate-400">Verifying secure workspace session...</span>
        </div>
      </div>
    );
  }

  // Prevent flash of private dashboard content if unauthenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Multi-Tenant Authorization Guard:
  // Ensure user belongs to this organization (or is platform owner)
  const isAuthorizedForTenant =
    user.role === "PLATFORM_OWNER" ||
    user.organisation?.subdomain === slug ||
    (user.organisationId && orgData?.id && user.organisationId === orgData.id);

  if (!isLoading && orgData && !isAuthorizedForTenant) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#07090e] p-4 text-center">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-[#12141c] p-8 text-slate-200 shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-6 w-6 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-white">Cross-Tenant Access Restricted</h2>
          <p className="mt-2 text-xs text-slate-400">
            You do not have authorization to view this organization workspace.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => router.replace(user.organisation?.subdomain ? `/org/${user.organisation.subdomain}/dashboard` : "/login")}
              className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
            >
              Go to Your Workspace
            </button>
            <button
              onClick={() => logout()}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Sign In with Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resolvedOrgName = orgData?.companyName || (slug === "ibh" ? "International Business Hub" : `${slug.toUpperCase()} Hub`);
  const resolvedUserName = user?.fullName || orgData?.superAdmin?.fullName || "Super Admin";
  const resolvedRole = user?.role ? user.role.replace("_", " ") : "Super Admin";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6fa] dark:bg-[#07090e] text-slate-900 dark:text-slate-100 font-sans selection:bg-amber-500 selection:text-black transition-colors">
      {/* Desktop & Mobile Fixed Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 md:relative md:flex md:w-[260px] md:min-w-[260px] md:max-w-[260px] md:h-screen md:shrink-0 ${
          mobileMenuOpen ? "block" : "hidden md:block"
        }`}
      >
        <OrgSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab)}
          orgName={resolvedOrgName}
          orgSubdomain={slug}
          orgLogo={orgData?.logo}
        />
      </div>

      {/* Backdrop overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#f4f6fa] dark:bg-[#07090e]">
        <OrgTopHeader
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          orgName={resolvedOrgName}
          orgSubdomain={slug}
          orgId={orgData?.id}
          userName={resolvedUserName}
          userRole={resolvedRole}
          activeTab={activeTab}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />

        <main className={`flex-1 ${
          activeTab === "settings"
            ? "min-h-0 overflow-hidden flex flex-col pb-0"
            : "overflow-y-auto"
        } overflow-x-hidden p-4 sm:p-5 lg:p-6 max-w-[1600px] mx-auto w-full scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800`}>
          {activeTab === "dashboard" ? (
            <OrgDashboardView
              orgName={resolvedOrgName}
              orgSubdomain={slug}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          ) : activeTab === "client-create" ? (
            <ClientCreateView
              orgId={orgData?.id}
              orgSubdomain={slug}
              onBackToList={() => setActiveTab("client-list")}
              onClientCreated={() => setActiveTab("client-list")}
            />
          ) : activeTab === "client-list" || activeTab === "clients" ? (
            selectedClientId ? (
              <ClientDetailDashboardView
                clientId={selectedClientId}
                onBack={() => setSelectedClientId(null)}
              />
            ) : (
              <ClientListView
                orgId={orgData?.id}
                orgSubdomain={slug}
                onAddNewClient={() => setActiveTab("client-create")}
                onSelectClient={(c) => setSelectedClientId(c.id)}
              />
            )
          ) : activeTab === "work-orders" ? (
            user?.role === "STAFF" ? (
              <StaffWorkOrderView
                orgId={orgData?.id}
                orgSubdomain={slug}
              />
            ) : (
              <AdminWorkOrderView
                orgId={orgData?.id}
                orgSubdomain={slug}
              />
            )
          ) : activeTab === "invoices" ? (
            <ProformaListView
              orgId={orgData?.id}
              orgSubdomain={slug}
            />
          ) : activeTab === "doc-create" ? (
            <DocumentCreateView
              orgId={orgData?.id}
              orgName={resolvedOrgName}
              orgSubdomain={slug}
              onBackToList={() => setActiveTab("doc-list")}
              onSuccess={() => setActiveTab("doc-list")}
            />
          ) : activeTab === "doc-list" ? (
            <DocumentListView
              orgId={orgData?.id}
              orgName={resolvedOrgName}
              orgSubdomain={slug}
              onAddNewDocument={() => setActiveTab("doc-create")}
            />
          ) : activeTab === "task-create" ? (
            <TaskCreateView
              orgId={orgData?.id}
              orgSubdomain={slug}
              orgName={resolvedOrgName}
              onBackToList={() => setActiveTab("task-list")}
              onTaskCreated={() => setActiveTab("task-list")}
            />
          ) : activeTab === "task-list" || activeTab === "tasks" ? (
            <TaskListView
              orgId={orgData?.id}
              orgName={resolvedOrgName}
              orgSubdomain={slug}
              onAddNewTask={() => setActiveTab("task-create")}
            />
          ) : (activeTab === "user-create" || activeTab === "user-list" || activeTab === "user-management") &&
            !authLoading &&
            user?.role !== "SUPER_ADMIN" &&
            user?.role !== "PLATFORM_OWNER" ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Restricted Access
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                User and team roster management is restricted exclusively to Super Administrators.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors shadow-sm"
              >
                Return to Dashboard
              </button>
            </div>
          ) : activeTab === "user-create" ? (
            <OrgCreateUserView
              orgName={resolvedOrgName}
              orgSubdomain={slug}
              onBack={() => setActiveTab("user-list")}
              onSuccess={() => setActiveTab("user-list")}
            />
          ) : activeTab === "user-list" || activeTab === "user-management" ? (
            <OrgUserManagementView
              orgName={resolvedOrgName}
              orgSubdomain={slug}
              onNavigateToCreateUser={() => setActiveTab("user-create")}
            />
          ) : activeTab === "tokens" ? (
            <OrgTokensView
              orgSubdomain={slug}
              orgName={resolvedOrgName}
              onNavigateToSettings={() => setActiveTab("settings")}
            />
          ) : activeTab === "settings" ? (
            <SettingsModule
              scope="ORGANISATION"
              orgSubdomain={slug}
              orgId={orgData?.id}
              initialOrgName={resolvedOrgName}
              onBackToDashboard={() => setActiveTab("dashboard")}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {activeTab.replace("-", " ")} Module
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                This module is configured for {resolvedOrgName}. Select Dashboard to view overview and analytics.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors shadow-sm"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DynamicOrgDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#f4f6fa] dark:bg-[#07090e]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
            <span className="text-xs font-bold text-slate-400">Loading workspace...</span>
          </div>
        </div>
      }
    >
      <DynamicOrgDashboardContent />
    </Suspense>
  );
}
