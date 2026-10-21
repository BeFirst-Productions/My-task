"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/platform-owner/Sidebar";
import { TopHeader } from "@/components/platform-owner/TopHeader";
import { DashboardView } from "@/components/platform-owner/DashboardView";
import { CreateOrganisationView } from "@/components/platform-owner/CreateOrganisationView";
import { OrganisationListingView } from "@/components/platform-owner/OrganisationListingView";

export default function PlatformOwnerPage() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const getBreadcrumb = () => {
    switch (activeTab) {
      case "dashboard":
        return undefined;
      case "org-create":
        return "Create Organisation";
      case "org-listing":
        return "Organisation Listing";
      case "org-status":
        return "Organisation Status";
      case "super-admins":
        return "Super Admins";
      case "user-management":
        return "User Management";
      case "reports":
        return "Reports & Analytics";
      case "notifications":
        return "Notifications";
      case "audit-logs":
        return "Audit Logs";
      case "settings":
        return "Platform Settings";
      default:
        return undefined;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b0c10] text-slate-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* Desktop & Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 md:static ${mobileMenuOpen ? "block" : "hidden md:block"}`}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }} />
      </div>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0b0c10]">
        <TopHeader
          breadcrumb={getBreadcrumb()}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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

          {(activeTab === "org-listing" || activeTab === "org-status") && (
            <OrganisationListingView
              onCreateClick={() => setActiveTab("org-create")}
            />
          )}

          {activeTab !== "dashboard" &&
            activeTab !== "org-create" &&
            activeTab !== "org-listing" &&
            activeTab !== "org-status" && (
              <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-[#151720] border border-[#232733] text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
                  ⚡
                </div>
                <h2 className="text-xl font-bold text-white capitalize">
                  {activeTab.replace("-", " ")}
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
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
