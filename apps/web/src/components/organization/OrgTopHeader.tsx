"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Calendar,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Settings,
  Shield,
  Building,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface OrgTopHeaderProps {
  onToggleMobileMenu: () => void;
  orgName?: string;
  userRole?: string;
  userName?: string;
  activeTab?: string;
}

export function OrgTopHeader({
  onToggleMobileMenu,
  orgName = "Invest First Business Services",
  userRole = "Super Admin",
  userName = "Super Admin",
  activeTab = "dashboard",
}: OrgTopHeaderProps) {
  const { user, logout, isPlatformOwner } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SA";

  return (
    <header className="h-18 min-h-[72px] border-b border-slate-200/80 dark:border-[#1a1d26] bg-white/90 dark:bg-[#0c0d12]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors">
      {/* Left: Hamburger and Dashboard Title with Org Subtitle */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          title="Toggle Sidebar Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {activeTab === "doc-create" ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <span className="text-slate-500 dark:text-slate-400">Super Admin</span>
            <span className="text-slate-400">&gt;</span>
            <span className="text-slate-600 dark:text-slate-300">Document Management</span>
            <span className="text-slate-400">&gt;</span>
            <span className="text-slate-900 dark:text-white font-semibold">Add New Document</span>
          </div>
        ) : activeTab === "doc-list" ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <span className="text-slate-500 dark:text-slate-400">Super Admin</span>
            <span className="text-slate-400">&gt;</span>
            <span className="text-slate-900 dark:text-white font-semibold">Document Management</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              Super Admin Dashboard
            </h1>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1 leading-tight">
              {orgName}
            </p>
          </div>
        )}
      </div>

      {/* Right Controls: Date Range, Search, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Date Filter Pill from Screenshot */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] text-xs font-medium text-slate-600 dark:text-slate-300 select-none shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>Oct 01, 2026 - Oct 31, 2026</span>
          <ChevronsUpDown className="h-3 w-3 text-slate-400 ml-0.5" />
        </div>

        {/* Search Input from Screenshot */}
        <div className="relative hidden md:block w-48 xl:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab.startsWith("doc-")
                ? "Search documents by client name, number..."
                : "Search clients, documents, tasks..."
            }
            className="w-full rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors shadow-sm"
          />
        </div>

        {/* 🌙 / ☀️ Dark & Light Mode Switcher Button (Requested Feature) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] text-slate-600 dark:text-amber-400 hover:text-slate-900 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          aria-label="Toggle Theme Mode"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 text-slate-600 hover:text-slate-900 transition-transform duration-200 hover:-rotate-12" />
          ) : (
            <Sun className="h-4 w-4 text-amber-400 hover:text-amber-300 transition-transform duration-200 hover:rotate-45" />
          )}
        </button>

        {/* Notification Bell with Badge */}
        <button
          type="button"
          className="relative p-2 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm shadow-rose-500/50">
            3
          </span>
        </button>

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50 dark:bg-[#151722] hover:bg-slate-100 dark:hover:bg-[#1c1f2e] transition-all select-none shadow-sm"
          >
            {/* Brown/Orange Avatar from screenshot */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b45309] text-white font-bold text-xs shadow-sm">
              {initials}
            </div>

            <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200">
              Super Admin
            </span>

            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d111a] p-2 text-sm shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || userName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || "superadmin@ibh.ae"}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Building className="h-3 w-3" />
                  <span className="truncate">{orgName}</span>
                </div>
              </div>

              {isPlatformOwner && (
                <Link
                  href="/platform-owner"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Switch to Platform Owner</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  alert("Organization configuration & preferences.");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Organization Settings</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
