"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Sidebar } from "@/components/platform-owner/Sidebar";
import { TopHeader } from "@/components/platform-owner/TopHeader";
import { DashboardView } from "@/components/platform-owner/DashboardView";
import { CreateOrganisationView } from "@/components/platform-owner/CreateOrganisationView";
import { OrganisationListingView } from "@/components/platform-owner/OrganisationListingView";
import { OrganisationStatusView } from "@/components/platform-owner/OrganisationStatusView";
import { UserManagementView } from "@/components/platform-owner/UserManagementView";
import { SettingsModule } from "@/components/settings/SettingsModule";
import { PlatformTokensView } from "@/components/platform-owner/PlatformTokensView";

function PlatformOwnerContent() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Authentication & Platform Owner Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = window.location.pathname + window.location.search;
      router.replace(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    } else if (!authLoading && isAuthenticated && user?.role !== "PLATFORM_OWNER") {
      router.replace(user?.organisation?.subdomain ? `/org/${user.organisation.subdomain}/dashboard` : "/login");
    }
  }, [authLoading, isAuthenticated, user, router]);
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab");

  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (tabFromQuery) return tabFromQuery;
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("platform_owner_active_tab");
        if (saved) return saved;
      } catch (e) {}
    }
    return "dashboard";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Sync tab with URL search params changes
  useEffect(() => {
    if (tabFromQuery) {
      setActiveTabState(tabFromQuery);
      try {
        sessionStorage.setItem("platform_owner_active_tab", tabFromQuery);
      } catch (e) {}
    } else {
      try {
        const saved = sessionStorage.getItem("platform_owner_active_tab");
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
  }, [tabFromQuery]);

  // Listen to popstate event for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get("tab") || "dashboard";
        setActiveTabState(tab);
        sessionStorage.setItem("platform_owner_active_tab", tab);
      } catch (e) {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setMobileMenuOpen(false);
    try {
      sessionStorage.setItem("platform_owner_active_tab", tab);
      const url = new URL(window.location.href);
      if (tab === "dashboard") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.pushState({ tab }, "", url.toString());
    } catch (err) {
      console.error("Failed to sync platform tab to url:", err);
    }
  }, []);

  const getBreadcrumb = () => {
    switch (activeTab) {
      case "dashboard":
        return undefined;
      case "org-create":
        return "Create Organisation";
      case "org-listing":
        return "Organisation Listing";
      case "org-status":
        return "Status";
      case "super-admins":
        return "Super Admins";
      case "user-management":
        return "User Management";
      case "reports":
        return "Reports & Analytics";
      case "notifications":
        return "Notifications";
      case "tokens":
        return "Support Center";
      case "audit-logs":
        return "Audit Logs";
      case "settings":
        return "Platform Settings";
      default:
        return undefined;
    }
  };

  const isStatusView = activeTab === "org-status";

  return (
    <div className="flex min-h-screen bg-[#0b0c10] text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* Desktop & Mobile Fixed Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 h-screen ${
          mobileMenuOpen ? "block" : "hidden md:block"
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
        />
      </div>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Main Content Viewport */}
      <div
        className={`flex-1 flex flex-col min-w-0 md:pl-64 ${
          activeTab === "settings" ? "h-screen overflow-hidden" : "min-h-screen"
        } bg-[#0b0c10] text-slate-100`}
      >
        <TopHeader
          breadcrumb={getBreadcrumb()}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
          theme="dark"
        />

        <main
          className={`flex-1 ${
            activeTab === "settings"
              ? "min-h-0 overflow-hidden flex flex-col p-4 sm:p-6 pb-2"
              : "p-4 sm:p-6 lg:p-8"
          }`}
        >
          {activeTab === "dashboard" && (
            <DashboardView
              onAddOrganisation={() => setActiveTab("org-create")}
              onViewListing={() => setActiveTab("org-listing")}
            />
          )}

          {activeTab === "org-create" && (
            <CreateOrganisationView
              onBack={() => setActiveTab("dashboard")}
              onSuccess={() => setActiveTab("org-listing")}
            />
          )}

          {activeTab === "org-listing" && (
            <OrganisationListingView
              onCreateClick={() => setActiveTab("org-create")}
            />
          )}

          {activeTab === "user-management" && (
            <UserManagementView initialFilterRole="ALL" />
          )}

          {activeTab === "org-status" && (
            <OrganisationStatusView
              onViewDashboard={(org) => {
                // Navigate to organisation dashboard or details
                setActiveTab("org-listing");
              }}
              onEditOrganisation={(orgId) => {
                setActiveTab("org-listing");
              }}
              onCreateOrganisation={() => {
                setActiveTab("org-create");
              }}
            />
          )}

          {activeTab === "settings" && (
            <SettingsModule
              scope="PLATFORM"
              onBackToDashboard={() => setActiveTab("dashboard")}
            />
          )}

          {activeTab === "tokens" && (
            <PlatformTokensView />
          )}

          {activeTab !== "dashboard" &&
            activeTab !== "org-create" &&
            activeTab !== "org-listing" &&
            activeTab !== "org-status" &&
            activeTab !== "settings" &&
            activeTab !== "tokens" &&
            activeTab !== "user-management" &&
            activeTab !== "super-admins" && (
              <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-[#151720] border border-[#232733] text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
                  ⚡
                </div>
                <h2 className="text-xl font-bold text-slate-800 capitalize">
                  {activeTab.replace("-", " ")}
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  This section is active under the Platform Owner administration suite.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:brightness-110 transition-all"
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

export default function PlatformOwnerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0b0c10]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
            <span className="text-xs font-bold text-slate-400">Loading Platform Suite...</span>
          </div>
        </div>
      }
    >
      <PlatformOwnerContent />
    </Suspense>
  );
}
