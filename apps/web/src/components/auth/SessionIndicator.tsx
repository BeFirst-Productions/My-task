"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Shield, Building2, LogOut, RefreshCw } from "lucide-react";

interface SessionData {
  id: "first-admin" | "super-admin" | "company";
  roleTitle: string;
  roleBadge: string;
  email: string;
  targetSection: string;
  targetName: string;
}

export function SessionIndicator() {
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("omni_auth_session");
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/#login"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-all"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Switch Role</span>
        </Link>
      </div>
    );
  }

  const isOwner = session.id === "first-admin";
  const isSuper = session.id === "super-admin";

  const Icon = isOwner ? Crown : isSuper ? Shield : Building2;
  const badgeColor = isOwner
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : isSuper
    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

  return (
    <div className="flex items-center gap-2.5">
      <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium ${badgeColor}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="font-semibold">{session.roleTitle}</span>
        <span className="text-slate-400">({session.email})</span>
      </div>

      <Link
        href="/#login"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        title="Switch to another demo role"
      >
        <RefreshCw className="h-3 w-3 text-slate-400" />
        <span className="hidden md:inline">Switch Role</span>
      </Link>
    </div>
  );
}
