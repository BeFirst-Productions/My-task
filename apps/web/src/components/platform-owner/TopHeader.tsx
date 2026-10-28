"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, ChevronDown, Menu, LogOut, User, Shield, Check, MessageSquare, Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchSystemNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  SystemNotificationItem,
} from "@/services/token.service";

interface TopHeaderProps {
  breadcrumb?: string;
  onMenuToggle?: () => void;
  theme?: "light" | "dark";
  onNavigateTab?: (tab: string) => void;
}

export function TopHeader({ breadcrumb, onMenuToggle, theme = "dark", onNavigateTab }: TopHeaderProps) {
  const isLight = theme === "light";
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // System Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await fetchSystemNotifications("PLATFORM_OWNER");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn("Failed to fetch system notifications:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.fullName || user?.username || "Platform Owner";
  const displayEmail = user?.email || "owner@mytask.ae";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PO";

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
            type="button"
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

      {/* Right: Search + Notifications + Profile + Sign Out */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative hidden sm:block w-64 lg:w-72">
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

        {/* Notification Bell with Real-time Token & System Alerts */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className={`relative p-2 rounded-xl transition-colors ${
              isLight
                ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-[#161822]"
            }`}
            title="System & Token Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0d0e13]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div
              className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 ${
                isLight
                  ? "bg-white border-slate-200 text-slate-800"
                  : "bg-[#11131c] border-[#262a3a] text-slate-200 shadow-black/80"
              }`}
            >
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Platform Notifications
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await markAllNotificationsAsRead("PLATFORM_OWNER");
                      loadNotifications();
                    }}
                    className="text-[10px] text-amber-500 hover:underline font-bold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        if (!n.isRead) {
                          await markNotificationAsRead(n.id);
                          loadNotifications();
                        }
                        if (onNavigateTab) {
                          onNavigateTab("tokens");
                          setNotifOpen(false);
                        }
                      }}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-[#161824] transition-colors cursor-pointer flex items-start gap-3 ${
                        !n.isRead ? "bg-amber-500/5 dark:bg-amber-500/5" : ""
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                        {n.type === "DOMAIN" ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 ml-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[9px] text-slate-400 block pt-0.5">
                          {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab("tokens");
                    setNotifOpen(false);
                  }}
                  className="text-[11px] font-bold text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Open Support Center →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Pill & Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className={`flex items-center gap-2.5 pl-1.5 py-1 pr-3 rounded-full border cursor-pointer transition-colors ${
              isLight
                ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                : "bg-[#151720] border-[#232733] hover:border-slate-700"
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
              {initials}
            </div>
            <span
              className={`text-xs font-semibold hidden md:inline ${
                isLight ? "text-slate-800" : "text-slate-200"
              }`}
            >
              {displayName}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${profileOpen ? "rotate-180" : ""} ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div
              className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                isLight
                  ? "bg-white border-slate-200 text-slate-800"
                  : "bg-[#12141c] border-[#262938] text-slate-200 shadow-2xl shadow-black/80"
              }`}
            >
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                    Platform Owner
                  </span>
                </div>
                <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
              </div>

              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Sign Out Button on the Right Top Corner */}
        <button
          type="button"
          onClick={() => logout()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
            isLight
              ? "text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300"
              : "text-rose-400 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/40"
          }`}
          title="Sign Out of Platform Owner"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
