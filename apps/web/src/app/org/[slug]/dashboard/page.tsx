"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { OrgSidebar } from "@/components/organization/OrgSidebar";
import { OrgTopHeader } from "@/components/organization/OrgTopHeader";
import { OrgDashboardView } from "@/components/organization/OrgDashboardView";
import { useAuth } from "@/context/AuthContext";

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

export default function DynamicOrgDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const slug = (params?.slug as string) || "ibh";

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
          orgName={resolvedOrgName}
          orgSubdomain={slug}
          orgLogo={orgData?.logo}
        />
      </div>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/75 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Main Content Area: Only right side scrolls! */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#f4f6fa] dark:bg-[#07090e] transition-colors">
        <OrgTopHeader
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          orgName={resolvedOrgName}
          userName={resolvedUserName}
          userRole={resolvedRole}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6 max-w-[1600px] mx-auto w-full scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          {activeTab === "dashboard" ? (
            <OrgDashboardView
              orgName={resolvedOrgName}
              orgSubdomain={slug}
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
