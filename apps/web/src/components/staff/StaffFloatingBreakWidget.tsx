"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Armchair,
  X,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StaffDailySeatModal } from "./StaffDailySeatModal";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

// ── Minimalist Clean Coffee Break Icon matching reference screenshot ──
function CoffeeBreakIcon({ className = "h-7 w-7 sm:h-8.5 sm:w-8.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 3 Steam Dashes */}
      <line x1="8" y1="2.5" x2="8" y2="5" />
      <line x1="12" y1="1.5" x2="12" y2="5" />
      <line x1="16" y1="2.5" x2="16" y2="5" />
      {/* Coffee Cup Body */}
      <path d="M4 8.5h12v5.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8.5Z" />
      {/* Cup Handle */}
      <path d="M16 10h1.5a2.2 2.2 0 0 1 0 4.4H16" />
    </svg>
  );
}

interface StaffFloatingBreakWidgetProps {
  onStatusChange?: () => void;
}

export function StaffFloatingBreakWidget({ onStatusChange }: StaffFloatingBreakWidgetProps) {
  const { user, toggleBreak, releaseSeat } = useAuth();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);

  // Auto-stretch on login / mount for 5 seconds, then collapse; and stretch on hover
  const [autoShowPill, setAutoShowPill] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Show stretched on login, then collapse after 5 seconds
    const timer = setTimeout(() => {
      setAutoShowPill(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Break state & live stopwatch timer
  const isOnBreak = Boolean(user?.isOnBreak);
  const [breakSeconds, setBreakSeconds] = useState(0);

  useEffect(() => {
    if (!isOnBreak || !user?.breakStartedAt) {
      setBreakSeconds(0);
      return;
    }

    const startTs = new Date(user.breakStartedAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTs) / 1000));
      setBreakSeconds(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isOnBreak, user?.breakStartedAt]);

  const handleToggleBreakAction = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const action = isOnBreak ? "end" : "start";
      const success = await toggleBreak(action);
      if (success && onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      console.error("Failed to toggle break status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReleaseSeat = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const success = await releaseSeat();
      if (success && onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      console.error("Failed to release seat:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Close widget when clicking outside
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPillVisible = autoShowPill || isHovered;

  return (
    <>
      <div
        ref={containerRef}
        className="fixed bottom-4 right-4 sm:bottom-7 sm:right-7 z-40 select-none font-sans"
      >
        {/* ── EXPANDED DETAILS CARD (WHEN CLICKED) ── */}
        {isExpanded ? (
          <div className="w-84 max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/98 dark:bg-[#0c101d]/98 backdrop-blur-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/75 p-5 text-slate-900 dark:text-white animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-xs ${
                    isOnBreak
                      ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <CoffeeBreakIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white leading-none">
                    Shift Break & Workstation
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Operational controls</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Collapse"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Work Break Section */}
            <div
              className={`rounded-2xl border p-4 mb-3.5 transition-all ${
                isOnBreak
                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 shadow-inner"
                  : "bg-slate-50 dark:bg-[#141928] border-slate-200/70 dark:border-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Duty Status
                </span>
                {isOnBreak ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/40 animate-pulse">
                    <CoffeeBreakIcon className="h-3 w-3" />
                    <span>On Break</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Active at Work</span>
                  </span>
                )}
              </div>

              {/* Stopwatch when break is active */}
              {isOnBreak ? (
                <div className="mb-3 text-center p-3 rounded-xl bg-purple-100/70 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-500/30">
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 uppercase tracking-wider block font-bold">
                    Elapsed Break Time
                  </span>
                  <span className="font-mono text-2xl font-black text-purple-900 dark:text-purple-200 tracking-tight">
                    {formatDuration(breakSeconds)}
                  </span>
                  <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 block mt-0.5">
                    ⏸️ Task timer held • Paused until work resumes
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Taking a break holds your active task timer and updates your live status on the team board.
                </p>
              )}

              {/* Break Action Button */}
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleToggleBreakAction}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  isOnBreak
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isOnBreak ? (
                  <>
                    <Play className="h-3.5 w-3.5 fill-slate-950" />
                    <span>Resume Work (Finish Break)</span>
                  </>
                ) : (
                  <>
                    <CoffeeBreakIcon className="h-3.5 w-3.5" />
                    <span>Take a Break</span>
                  </>
                )}
              </button>
            </div>

            {/* Workstation Seat Section (STRICT RELEASE-FIRST FLOW) */}
            <div className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50 dark:bg-[#141928] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Armchair className="h-4 w-4 text-amber-500" />
                  <span>Workstation Seat</span>
                </span>
                <span className="text-[10px] text-slate-400">Shift Desk (8 Seats)</span>
              </div>

              {/* Current Seat Display */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#0e121d] border border-slate-200/80 dark:border-white/5 mb-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Armchair className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-black text-slate-900 dark:text-amber-300 block">
                      {user?.seatNumber ? `Occupying Seat ${user.seatNumber}` : "No Seat Assigned"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {user?.seatNumber ? "Active on Shift Board" : "Vacant • Ready to check in"}
                    </span>
                  </div>
                </div>

                {user?.seatNumber ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Live</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                )}
              </div>

              {/* Strict Release-First Workflow Buttons */}
              {user?.seatNumber ? (
                <div>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleReleaseSeat}
                    className="w-full py-2.5 px-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Release Seat {user.seatNumber}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2 leading-tight">
                    You must release Seat {user.seatNumber} first to select or change to another desk.
                  </p>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSeatModal(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-98"
                  >
                    <Armchair className="h-3.5 w-3.5" />
                    <span>Select Workstation Seat</span>
                  </button>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2 leading-tight">
                    Select your desk from the 8 available workstation seats.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── COLLAPSED / HOVER-STRETCHED FLOATING BAR (MATCHING REFERENCE EXACTLY) ── */
          <div
            className="relative flex items-center justify-end group cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsExpanded(true)}
          >
            {/* 1. Stretched Black/Dark Background Pill (Stretched on first login & on hover) */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out flex items-center shrink-0 ${
                isPillVisible
                  ? "max-w-72 opacity-100 mr-2.5 sm:mr-3 translate-x-0"
                  : "max-w-0 opacity-0 mr-0 translate-x-4 pointer-events-none group-hover:max-w-72 group-hover:opacity-100 group-hover:mr-2.5 sm:group-hover:mr-3 group-hover:translate-x-0 group-hover:pointer-events-auto"
              }`}
            >
              <div
                style={{
                  backgroundColor: isOnBreak ? "#2e1065" : "#0f172a",
                  color: "#ffffff",
                }}
                className="whitespace-nowrap px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-full text-xs sm:text-sm font-extrabold shadow-2xl border border-slate-700/60 dark:border-white/20 select-none flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.02]"
              >
                <span className="text-white font-extrabold tracking-wide drop-shadow-xs">
                  {isOnBreak ? "On Break • Resume" : "Take a break"}
                </span>
              </div>
            </div>

            {/* 2. Clean White Circular Break Icon Button */}
            <button
              type="button"
              aria-label="Shift break hub"
              className={`relative flex items-center justify-center h-14 w-14 sm:h-[68px] sm:w-[68px] rounded-full transition-all duration-300 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 shrink-0 ${
                isOnBreak
                  ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-600/40 border-2 border-purple-300 animate-pulse"
                  : "bg-white text-[#78350f] dark:bg-[#141824] dark:text-amber-400 border-2 border-slate-200/90 dark:border-white/15 shadow-slate-900/15 dark:shadow-black/80 hover:shadow-2xl hover:border-amber-500/50"
              }`}
            >
              <CoffeeBreakIcon className="h-7 w-7 sm:h-8.5 sm:w-8.5 transition-transform group-hover:scale-110" />
            </button>
          </div>
        )}
      </div>

      {/* Daily Seat Selection Modal (Enforcing 8 Seats & Strict Release-First) */}
      {showSeatModal && (
        <StaffDailySeatModal
          isOpen={showSeatModal}
          onClose={() => setShowSeatModal(false)}
          onConfirmed={() => {
            if (onStatusChange) onStatusChange();
          }}
          canDismiss={true}
        />
      )}
    </>
  );
}
