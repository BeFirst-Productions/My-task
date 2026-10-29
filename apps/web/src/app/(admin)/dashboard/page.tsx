"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace("/login?redirect=/dashboard");
      } else if (user?.organisation?.subdomain) {
        router.replace(`/org/${user.organisation.subdomain}/dashboard`);
      } else if (user?.role === "PLATFORM_OWNER") {
        router.replace("/platform-owner");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Verifying workspace authorization...</span>
      </div>
    </div>
  );
}
