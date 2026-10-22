"use client";

import React from "react";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";

interface TopHeaderProps {
  breadcrumb?: string;
  onMenuToggle?: () => void;
  theme?: "light" | "dark";
}

export function TopHeader({ breadcrumb, onMenuToggle, theme = "dark" }: TopHeaderProps) {
  const isLight = theme === "light";

  return (
    <header
      className={`h-16 border-b sticky top-0 z-30 flex items-center justify-between px-6 transition-colors duration-200 ${
        isLight
          ? "border-slate-200 bg-white/95 backdrop-blur-md text-slate-800"
          : "border-[#1e2029] bg-[#0d0e13]/80 backdrop-blur-md text-slate-200"
      }`}
    >
      {/* Left: Breadcrumbs or Title */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-[#1a1c25]"
            }`}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {breadcrumb ? (
          <div
            className={`text-xs font-medium flex items-center gap-2 ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <span>Organisation Management</span>
            <span className={isLight ? "text-slate-300" : "text-slate-600"}>&gt;</span>
            <span className={isLight ? "text-slate-900 font-bold" : "text-amber-400 font-semibold"}>
              {breadcrumb}
            </span>
          </div>
        ) : (
          <div className={`text-xs font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Platform Management &gt;{" "}
            <span className={isLight ? "text-slate-900 font-semibold" : "text-white"}>
              Overview
            </span>
          </div>
        )}
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-3.5">
        {/* Search Input */}
        <div className="relative hidden sm:block w-72 lg:w-80">
          <Search
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
              isLight ? "text-slate-400" : "text-slate-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search organisations, trade licence, contact..."
            className={`w-full border rounded-xl pl-9 pr-4 py-1.5 text-xs placeholder-slate-400 focus:outline-none transition-all ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-amber-500"
                : "bg-[#151720] border-[#232733] text-slate-200 placeholder-slate-500 focus:border-amber-500/60"
            }`}
          />
        </div>

        {/* Notification Bell */}
        <button
          className={`relative p-2 rounded-xl transition-colors ${
            isLight
              ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              : "text-slate-400 hover:text-white hover:bg-[#161822]"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Switch Role / Home */}
        <a
          href="/#login"
          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
            isLight
              ? "text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
              : "text-amber-400/80 hover:text-amber-300 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
          }`}
          title="Switch demo account"
        >
          Switch Role
        </a>

        {/* Profile Pill */}
        <div
          className={`flex items-center gap-2.5 pl-1.5 py-1 pr-3 rounded-full border cursor-pointer transition-colors ${
            isLight
              ? "bg-slate-50 border-slate-200 hover:border-slate-300"
              : "bg-[#151720] border-[#232733] hover:border-slate-700"
          }`}
        >
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
            PO
          </div>
          <span
            className={`text-xs font-semibold hidden sm:inline ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`}
          >
            Platform Owner
          </span>
          <ChevronDown
            className={`h-3 w-3 ${isLight ? "text-slate-500" : "text-slate-400"}`}
          />
        </div>
      </div>
    </header>
  );
}
