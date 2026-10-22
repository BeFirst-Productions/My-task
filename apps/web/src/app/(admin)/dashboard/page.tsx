"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/org/dashboard");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Loading Organization Workspace...</span>
      </div>
    </div>
  );
}
