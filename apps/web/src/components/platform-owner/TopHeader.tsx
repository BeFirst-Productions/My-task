"use client";

import React from "react";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";

interface TopHeaderProps {
  breadcrumb?: string;
  onMenuToggle?: () => void;
}

export function TopHeader({ breadcrumb, onMenuToggle }: TopHeaderProps) {
  return (
    <header className="h-16 border-b border-[#1e2029] bg-[#0d0e13]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Left: Breadcrumbs or Title */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1c25]"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {breadcrumb ? (
          <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <span>Organisation Management</span>
            <span className="text-slate-600">&gt;</span>
            <span className="text-amber-400 font-semibold">{breadcrumb}</span>
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-400">
            Platform Management &gt; <span className="text-white">Overview</span>
          </div>
        )}
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative hidden sm:block w-72 lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search organisations, users, or anything..."
            className="w-full bg-[#151720] border border-[#232733] rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
          />
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#161822] transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0d0e13]" />
        </button>

        {/* Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-full bg-[#151720] border border-[#232733] cursor-pointer hover:border-slate-700 transition-colors">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
            PO
          </div>
          <span className="text-xs font-semibold text-slate-200 hidden sm:inline">Platform Owner</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
