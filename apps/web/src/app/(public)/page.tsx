import React from "react";
import { ShieldCheck } from "lucide-react";
import { DemoLoginCard } from "@/components/auth/DemoLoginCard";

export const metadata = {
  title: "Sign In | OmniExpiry SaaS Portal",
  description: "Sign in with demo accounts for First Admin, Super Admin, and Company",
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-sky-500/10 to-transparent blur-3xl" />

      <div className="mx-auto max-w-4xl w-full relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 mb-4 shadow-xl shadow-indigo-600/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Sign In to Your Workspace
          </h1>
          
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Choose a demo account below to instantly auto-fill credentials and enter your designated section.
          </p>
        </div>

        {/* Demo Login Card with First Admin, Super Admin, and Company buttons */}
        <DemoLoginCard />
      </div>
    </div>
  );
}
