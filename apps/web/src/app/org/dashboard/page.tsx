"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function OrgDashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user?.organisation?.subdomain) {
        router.replace(`/org/${user.organisation.subdomain}/dashboard`);
      } else if (user?.role === "PLATFORM_OWNER") {
        router.replace("/platform-owner");
      } else {
        // Fallback default organization
        router.replace("/org/ibh/dashboard");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Loading Organization Dashboard...</span>
      </div>
    </div>
  );
}
