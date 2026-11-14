"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Sparkles,
  Globe,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getStoredToken } from "@/services/auth.service";

interface TenantInfo {
  companyName: string;
  subdomain: string;
  logo: string | null;
  primaryLocation?: string;
  primaryColor?: string;
}

function LoginFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tenant Branding State
  const [detectedSubdomain, setDetectedSubdomain] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);

  // Detect Subdomain and Fetch White-Label Branding
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname.toLowerCase();

    let sub: string | null = null;
    if (hostname.endsWith(".localhost")) {
      sub = hostname.replace(".localhost", "");
    } else if (hostname.endsWith(".lvh.me")) {
      sub = hostname.replace(".lvh.me", "");
    } else if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(hostname) &&
      !hostname.endsWith(".vercel.app")
    ) {
      const parts = hostname.split(".");
      if (parts.length >= 3 && parts[0] !== "www") {
        sub = parts[0];
      }
    }

    if (sub && sub !== "admin" && sub !== "platform") {
      setDetectedSubdomain(sub);

      const base =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

      fetch(`${base}/api/organisations/by-subdomain/${encodeURIComponent(sub)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data?.data) {
            setTenantInfo({
              companyName: data.data.companyName,
              subdomain: data.data.subdomain,
              logo: data.data.logo || null,
              primaryLocation: data.data.primaryLocation,
              primaryColor: data.data.setting?.primaryColor || undefined,
            });
          }
        })
        .catch((err) => {
          console.warn("[Login] Could not retrieve tenant branding:", err);
        });
    }
  }, []);

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
      const token = getStoredToken();

      if (typeof window !== "undefined") {
        const hostname = window.location.hostname.toLowerCase();
        const port = window.location.port ? `:${window.location.port}` : "";
        const protocol = window.location.protocol;

        const isLocal =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.endsWith(".localhost") ||
          hostname.endsWith(".lvh.me");

        // On fresh sign-in, clear any previous tab sessions so the workspace opens on the primary Dashboard
        try {
          sessionStorage.clear();
        } catch (e) {}

        // A fresh login always starts on the primary Dashboard module (not a last-visited sub-module)
        const cleanRedirect = "/dashboard";

        const tokenParam = token ? `?auth_token=${encodeURIComponent(token)}` : "";

        // Case A: Platform Owner Login
        if (user.role === "PLATFORM_OWNER") {
          if (detectedSubdomain) {
            if (isLocal) {
              window.location.href = `${protocol}//localhost${port}/platform-owner${tokenParam}`;
              return;
            } else {
              const parts = hostname.split(".");
              const rootDomain = parts.slice(-2).join(".");
              window.location.href = `${protocol}//${rootDomain}/platform-owner${tokenParam}`;
              return;
            }
          } else {
            window.location.href = `/platform-owner${tokenParam}`;
            return;
          }
        }

        // Case B: Organization Tenant User Login
        if (user.organisation?.subdomain) {
          const tenantSlug = user.organisation.subdomain.toLowerCase();

          // Subcase 1: Already on correct subdomain
          if (detectedSubdomain === tenantSlug) {
            window.location.href = `/dashboard${tokenParam}`;
            return;
          }

          // Subcase 2: Transfer session to correct subdomain on local development
          if (isLocal) {
            window.location.href = `${protocol}//${tenantSlug}.localhost${port}/dashboard${tokenParam}`;
            return;
          }

          // Subcase 3: Transfer session to correct subdomain in production
          const parts = hostname.split(".");
          const rootDomain = parts.length >= 2 ? parts.slice(-2).join(".") : "mytask.com";
          window.location.href = `${protocol}//${tenantSlug}.${rootDomain}/dashboard${tokenParam}`;
          return;
        }

        // Fallback: always route to main dashboard with full page navigation
        window.location.href = `/dashboard${tokenParam}`;
        return;
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = tenantInfo?.companyName || (detectedSubdomain ? detectedSubdomain.toUpperCase() : "My Task");
  const tenantBrandColor = tenantInfo?.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans relative overflow-hidden">
      {/* ── Background Subtle Glow & Pattern ── */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.07),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />

      {/* ── Top Header Navigation ── */}
      <header className="relative z-20 w-full border-b border-white/[0.06] bg-[#090c14]/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* SaaS Platform Brand Link */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            title="My Task Enterprise SaaS Platform"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4.5 w-4.5 fill-slate-950 stroke-slate-950" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                My Task
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 tracking-wider">
                Enterprise
              </span>
            </div>
          </Link>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {detectedSubdomain ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                <span className="capitalize">{detectedSubdomain} Portal</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <Globe className="h-3.5 w-3.5 text-amber-400" />
                <span>Universal Gateway</span>
              </span>
            )}

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Website</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Form Area: Centered, Focused, High-End Card ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[420px]">
          {/* Main Authentication Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c101d]/90 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/80">
            
            {/* Header: Organization or Platform Identity */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center mb-3.5">
                {tenantInfo?.logo ? (
                  <div className="h-16 w-16 rounded-2xl bg-[#141828] border border-white/10 p-2.5 shadow-xl flex items-center justify-center">
                    <img
                      src={tenantInfo.logo}
                      alt={displayName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/40"
                    style={{
                      backgroundColor: detectedSubdomain ? tenantBrandColor : "#f59e0b",
                    }}
                  >
                    {detectedSubdomain ? (
                      <span className="text-2xl font-black tracking-wider">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <Sparkles className="h-7 w-7 text-slate-950 fill-slate-950" />
                    )}
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-black text-white tracking-tight">
                {detectedSubdomain ? `Sign In to ${displayName}` : "Sign In to My Task"}
              </h1>
              <p className="mt-1.5 text-xs text-slate-400">
                {detectedSubdomain
                  ? "Enter your credentials to access your organization workspace"
                  : "Enter your credentials to access your dashboard"}
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username or Work Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      tenantInfo
                        ? `e.g. admin@${tenantInfo.subdomain}.ae or username`
                        : "e.g. user@example.com or username"
                    }
                    className="w-full rounded-xl border border-[#222739] bg-[#111422] pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:bg-[#141829] focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-[#222739] bg-[#111422] pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:bg-[#141829] focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: detectedSubdomain ? tenantBrandColor : "#f59e0b",
                  color: detectedSubdomain ? "#ffffff" : "#020617",
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all mt-6 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Portal Switcher & Co-Branding */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col items-center gap-3 text-xs text-slate-400">
              {detectedSubdomain ? (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Not your organization?</span>
                  <a
                    href={
                      typeof window !== "undefined" && window.location.hostname.includes("localhost")
                        ? `http://localhost:${window.location.port || "3000"}/login`
                        : "/login"
                    }
                    className="font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors inline-flex items-center gap-1"
                  >
                    <span>Switch Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 text-center">
                  Single Sign-On automatically routes you to your registered organization.
                </p>
              )}

              {/* SaaS Platform Co-branding Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] text-[10px] text-slate-400 font-medium">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Powered by <strong className="text-slate-300 font-semibold">My Task</strong> SaaS Platform</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Footer Bar ── */}
      <footer className="relative z-20 w-full border-t border-white/[0.06] bg-[#090c14]/80 py-3.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} My Task.</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Corporate Services & CRM Cloud</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" /> 256-Bit SSL Encrypted
            </span>
            <span className="text-slate-600">•</span>
            <span>Single Sign-On</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
