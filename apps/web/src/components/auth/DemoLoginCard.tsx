"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Shield,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  LogIn,
  AlertCircle,
  Laptop,
} from "lucide-react";

export interface DemoPersona {
  id: "first-admin" | "super-admin" | "company";
  title: "First Admin" | "Super Admin" | "Company";
  subtitle: string;
  roleBadge: string;
  roleDescription: string;
  email: string;
  password: string;
  targetSection: string;
  targetName: string;
  themeColor: "amber" | "indigo" | "emerald";
  accentBorder: string;
  accentBg: string;
  accentText: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "first-admin",
    title: "First Admin",
    subtitle: "Platform Owner & Master Controller",
    roleBadge: "Master / Platform Owner",
    roleDescription: "Complete platform control: register tenants, approve databases, and oversee all organisations.",
    email: "owner.admin@omniexpiry.io",
    password: "FirstAdmin@2026!",
    targetSection: "/platform-owner",
    targetName: "Platform Owner Console",
    themeColor: "amber",
    accentBorder: "border-amber-500/50 hover:border-amber-400",
    accentBg: "bg-amber-500/10",
    accentText: "text-amber-400",
  },
  {
    id: "super-admin",
    title: "Super Admin",
    subtitle: "Tenant & Organisation Admin",
    roleBadge: "Tenant Super Admin",
    roleDescription: "Manage company settings, configure WhatsApp & email alerts, and oversee staff users.",
    email: "superadmin@apexadvisory.ae",
    password: "SuperAdmin@2026!",
    targetSection: "/dashboard",
    targetName: "Tenant Super Admin Section",
    themeColor: "indigo",
    accentBorder: "border-indigo-500/50 hover:border-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentText: "text-indigo-400",
  },
  {
    id: "company",
    title: "Company",
    subtitle: "Company Staff & Operations User",
    roleBadge: "Company Admin / Staff",
    roleDescription: "Track visas, licences, upload compliance documents, and update day-to-day renewal tasks.",
    email: "company.ops@apexadvisory.ae",
    password: "CompanyStaff@2026!",
    targetSection: "/dashboard",
    targetName: "Company Operations Section",
    themeColor: "emerald",
    accentBorder: "border-emerald-500/50 hover:border-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentText: "text-emerald-400",
  },
];

interface DemoLoginCardProps {
  onSuccessRedirect?: (url: string) => void;
  compact?: boolean;
}

export function DemoLoginCard({ onSuccessRedirect, compact = false }: DemoLoginCardProps) {
  const router = useRouter();
  const [selectedPersonaId, setSelectedPersonaId] = useState<DemoPersona["id"]>("first-admin");
  const [email, setEmail] = useState<string>(DEMO_PERSONAS[0].email);
  const [password, setPassword] = useState<string>(DEMO_PERSONAS[0].password);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [justAutoFilled, setJustAutoFilled] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const currentPersona = DEMO_PERSONAS.find((p) => p.id === selectedPersonaId) || DEMO_PERSONAS[0];

  const handleSelectPersona = (persona: DemoPersona, immediateLogin = false) => {
    setSelectedPersonaId(persona.id);
    setEmail(persona.email);
    setPassword(persona.password);
    setJustAutoFilled(true);
    setTimeout(() => setJustAutoFilled(false), 1200);

    if (immediateLogin) {
      executeLogin(persona.email, persona.password, persona);
    }
  };

  const executeLogin = (userEmail: string, userPass: string, persona: DemoPersona) => {
    if (!userEmail.trim()) {
      alert("Please enter an email address");
      return;
    }
    if (!userPass.trim()) {
      alert("Please enter a password");
      return;
    }

    setIsLoading(true);
    setSuccessToast(`Signed in as ${persona.title}. Redirecting to ${persona.targetName}...`);

    // Save session in localStorage for client-side persistence
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "omni_auth_session",
          JSON.stringify({
            id: persona.id,
            roleTitle: persona.title,
            roleBadge: persona.roleBadge,
            email: userEmail,
            targetSection: persona.targetSection,
            targetName: persona.targetName,
            loggedInAt: new Date().toISOString(),
          })
        );
      } catch {
        // storage disabled or unavailable
      }
    }

    setTimeout(() => {
      if (onSuccessRedirect) {
        onSuccessRedirect(persona.targetSection);
      } else {
        router.push(persona.targetSection);
      }
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password, currentPersona);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-[#0f1118]/90 backdrop-blur-xl shadow-2xl shadow-indigo-950/20 overflow-hidden">
      {/* Top Banner Notice */}
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-amber-950/40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
          <span>Interactive Demo Login Portal</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Click any role button below to auto-fill credentials & enter section</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            Fastify API Ready
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8 lg:p-10">
        {/* Step 1: Demo Role Selector Buttons */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-2">
              <span>Choose Demo Account to Test:</span>
            </label>
            <span className="text-[11px] text-slate-500">Auto-fills email & password</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_PERSONAS.map((persona) => {
              const isSelected = selectedPersonaId === persona.id;
              const Icon =
                persona.id === "first-admin"
                  ? Crown
                  : persona.id === "super-admin"
                  ? Shield
                  : Building2;

              return (
                <div
                  key={persona.id}
                  className={`relative group rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? `${persona.accentBorder} ${persona.accentBg} ring-1 ${persona.accentText}`
                      : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                  onClick={() => handleSelectPersona(persona, false)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? persona.id === "first-admin"
                            ? "bg-amber-500/20 text-amber-300"
                            : persona.id === "super-admin"
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-white mb-0.5">{persona.title}</div>
                  <div className="text-xs text-slate-400 line-clamp-1 mb-2">{persona.subtitle}</div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 truncate">{persona.email}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPersona(persona, true);
                      }}
                      className="ml-2 font-semibold text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
                    >
                      Enter →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Selected Role Preview & Description Banner */}
        <div
          className={`mb-8 p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            currentPersona.id === "first-admin"
              ? "bg-amber-500/5 border-amber-500/20 text-amber-200"
              : currentPersona.id === "super-admin"
              ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-200"
              : "bg-emerald-500/5 border-emerald-500/20 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                currentPersona.id === "first-admin"
                  ? "bg-amber-500/20 text-amber-400"
                  : currentPersona.id === "super-admin"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {currentPersona.id === "first-admin" ? (
                <Crown className="h-5 w-5" />
              ) : currentPersona.id === "super-admin" ? (
                <Shield className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{currentPersona.title} Access</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    currentPersona.id === "first-admin"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : currentPersona.id === "super-admin"
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {currentPersona.roleBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentPersona.roleDescription}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <span className="text-xs text-slate-400">Target section:</span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-black/40 border border-slate-700/80 text-white">
              {currentPersona.targetSection}
            </span>
          </div>
        </div>

        {/* Step 3: Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full bg-[#141620] border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all duration-200 ${
                    justAutoFilled
                      ? "border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full bg-[#141620] border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all duration-200 ${
                    justAutoFilled
                      ? "border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Remember me & auto-fill feedback */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember demo credentials</span>
            </label>

            {justAutoFilled && (
              <span className="text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Credentials filled for {currentPersona.title}!
              </span>
            )}
          </div>

          {/* Toast Notification */}
          {successToast && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full sm:flex-1 py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all duration-200 ${
                currentPersona.id === "first-admin"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20"
                  : currentPersona.id === "super-admin"
                  ? "bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white shadow-indigo-600/30"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30"
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Entering {currentPersona.targetName}...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>
                    Login & Enter {currentPersona.title} Section ({currentPersona.targetSection})
                  </span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectPersona(currentPersona, true)}
              disabled={isLoading}
              className="w-full sm:w-auto py-3.5 px-5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0"
              title="Skip typing and instantly enter"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>1-Click Instant Enter</span>
            </button>
          </div>
        </form>

        {/* Quick Help Summary */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="flex items-start gap-2.5">
            <Crown className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-medium">First Admin</strong>
              <span className="text-[11px] text-slate-500">Goes to /platform-owner to configure SaaS tenants and systems.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-medium">Super Admin</strong>
              <span className="text-[11px] text-slate-500">Goes to /dashboard to configure tenant notifications & staff.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Building2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-medium">Company</strong>
              <span className="text-[11px] text-slate-500">Goes to /dashboard to review expiry records & task queues.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
