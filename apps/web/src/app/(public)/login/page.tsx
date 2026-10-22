import React from "react";
import Link from "next/link";
import { DemoLoginCard } from "@/components/auth/DemoLoginCard";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Demo Login | OmniExpiry SaaS",
  description: "Sign in with demo accounts for First Admin, Super Admin, and Company",
};

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-sky-500/10 to-transparent blur-3xl" />

      <div className="mx-auto max-w-4xl w-full relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>

          <span className="text-xs text-slate-500">
            OmniExpiry Multi-Tenant Foundation
          </span>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Welcome to the Demo Portal
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">
            Select one of the 3 roles below to auto-fill mock credentials and launch directly into their designated section.
          </p>
        </div>

        <DemoLoginCard />
      </div>
    </div>
  );
}
