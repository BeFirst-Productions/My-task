"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Crown,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter your username/email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await login({ identifier, password });
      
      // Intelligent redirection based on user role and organization
      const targetUrl = user.dashboardRedirect || (user.role === "PLATFORM_OWNER" ? "/platform-owner" : "/org/dashboard");
      router.push(targetUrl);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (type: "platform_owner" | "ibh_superadmin") => {
    if (type === "platform_owner") {
      setIdentifier("platform_owner");
      setPassword("Admin@123456");
    } else {
      setIdentifier("ibh_superadmin");
      setPassword("Admin@123456");
    }
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[500px] rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Card Container */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/60">
          {/* Brand & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 text-white shadow-lg shadow-indigo-600/30 mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to Your Portal</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Access Platform Management or your Organization Dashboard
            </p>
          </div>

          {/* Quick-fill testing helper pills */}
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
              <span className="flex items-center gap-1 text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Quick Test Accounts:
              </span>
              <span className="text-[10px] text-slate-500">1-click autofill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("platform_owner")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-all text-left truncate"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Platform Owner</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("ibh_superadmin")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition-all text-left truncate"
              >
                <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">IBH Super Admin</span>
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username or Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@mytask.com or ibh_superadmin"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Password reset is managed by your Platform Owner or Super Admin.");
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all mt-6"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-500">
              Need to register a new company?{" "}
              <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                Register Organisation
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
