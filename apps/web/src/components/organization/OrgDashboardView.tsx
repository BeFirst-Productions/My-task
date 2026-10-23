"use client";

import React, { useState } from "react";
import {
  Users2,
  UserCheck,
  UserX,
  UserPlus,
  FileText,
  ClipboardCheck,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  MoreVertical,
  ArrowRight,
  FileClock,
  User,
  CheckCircle2,
  Receipt,
  ShieldAlert,
  PlusCircle,
  FilePlus,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface OrgDashboardViewProps {
  orgName?: string;
  orgSubdomain?: string;
  onNavigateTab?: (tab: string) => void;
}

export function OrgDashboardView({
  orgName = "Invest First Business Services",
  orgSubdomain = "ibh",
  onNavigateTab,
}: OrgDashboardViewProps) {
  const [notificationFilter, setNotificationFilter] = useState("All");

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ========================================================= */}
      {/* ROW 1: 6 TOP KPI CARDS (Matches Screenshot Exactly)        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Total Users */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">24</span>
              <span className="flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                12%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">+3 this month</p>
          </div>
        </div>

        {/* Card 2: Active Users */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">18</span>
              <span className="flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                20%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">75% of total</p>
          </div>
        </div>

        {/* Card 3: Inactive Users */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inactive Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">6</span>
              <span className="flex items-center text-[11px] font-bold text-rose-600 dark:text-rose-400">
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
                25%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">Need attention</p>
          </div>
        </div>

        {/* Card 4: Total Clients */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Clients</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">156</span>
              <span className="flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                8%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">+12 this month</p>
          </div>
        </div>

        {/* Card 5: Total Documents */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Documents</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">320</span>
              <span className="flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                10%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">280 Active</p>
          </div>
        </div>

        {/* Card 6: Total Tasks */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Tasks</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">48</span>
              <span className="flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                15%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">32 Pending</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 2: 2 SIDE-BY-SIDE ANALYTICS CHARTS (50% / 50%)        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Chart: Document Status Donut */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Status</h3>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#222636] rounded-xl px-2.5 py-1 bg-slate-50 dark:bg-[#151722] cursor-pointer">
              <span>This Month</span>
              <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2 pb-1">
            {/* SVG Donut Circle */}
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                {/* Background Track */}
                <circle cx="50" cy="50" r="38" stroke="#e2e8f0" className="dark:stroke-slate-800" strokeWidth="13" fill="none" />
                {/* Active: 88% (circumference ~ 238.7 -> 88% is 210) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#10b981"
                  strokeWidth="13"
                  fill="none"
                  strokeDasharray="208 238.7"
                  strokeDashoffset="0"
                />
                {/* Expiring Soon: 8% (19) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f59e0b"
                  strokeWidth="13"
                  fill="none"
                  strokeDasharray="18 238.7"
                  strokeDashoffset="-208"
                />
                {/* Expired: 3% (7) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#ef4444"
                  strokeWidth="13"
                  fill="none"
                  strokeDasharray="8 238.7"
                  strokeDashoffset="-226"
                />
                {/* Renewed: 2% (5) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#94a3b8"
                  strokeWidth="13"
                  fill="none"
                  strokeDasharray="5 238.7"
                  strokeDashoffset="-234"
                />
              </svg>
              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">320</span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Total Documents</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-3 text-xs w-full sm:w-48">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Active</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">280 (88%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Expiring Soon</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">24 (8%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Expired</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">10 (3%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Renewed</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">6 (2%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chart: Clients Overview Line/Area Chart */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clients Overview</h3>
            <div className="flex items-center gap-3">
              {/* Chart Legend */}
              <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <span className="text-slate-600 dark:text-slate-400">New Clients</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <span className="text-slate-600 dark:text-slate-400">Total Clients</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#222636] rounded-xl px-2.5 py-1 bg-slate-50 dark:bg-[#151722] cursor-pointer">
                <span>This Month</span>
                <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* SVG Line / Area Chart matching screenshot */}
          <div className="relative h-48 w-full pt-4">
            <svg viewBox="0 0 400 160" className="h-full w-full">
              {/* Horizontal Gridlines */}
              <line x1="30" y1="20" x2="390" y2="20" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 3" />
              <line x1="30" y1="50" x2="390" y2="50" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 3" />
              <line x1="30" y1="80" x2="390" y2="80" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 3" />
              <line x1="30" y1="110" x2="390" y2="110" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 3" />
              <line x1="30" y1="140" x2="390" y2="140" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />

              {/* Y Axis Numbers */}
              <text x="10" y="24" fill="#94a3b8" fontSize="9">80</text>
              <text x="10" y="54" fill="#94a3b8" fontSize="9">60</text>
              <text x="10" y="84" fill="#94a3b8" fontSize="9">40</text>
              <text x="10" y="114" fill="#94a3b8" fontSize="9">20</text>
              <text x="15" y="144" fill="#94a3b8" fontSize="9">0</text>

              <defs>
                <linearGradient id="skyArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Blue Line: Total Clients */}
              <path
                d="M 45,120 L 110,115 L 175,125 L 245,110 L 315,90 L 380,75 L 380,140 L 45,140 Z"
                fill="url(#skyArea)"
              />
              <path
                d="M 45,120 L 110,115 L 175,125 L 245,110 L 315,90 L 380,75"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />

              {/* Orange Line: New Clients */}
              <path
                d="M 45,95 L 110,80 L 175,90 L 245,75 L 315,70 L 380,50"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.5"
              />

              {/* Dots on Blue Line */}
              <circle cx="45" cy="120" r="3" fill="#0284c7" />
              <circle cx="110" cy="115" r="3" fill="#0284c7" />
              <circle cx="175" cy="125" r="3" fill="#0284c7" />
              <circle cx="245" cy="110" r="3" fill="#0284c7" />
              <circle cx="315" cy="90" r="3" fill="#0284c7" />
              <circle cx="380" cy="75" r="3" fill="#0284c7" />

              {/* Dots on Orange Line */}
              <circle cx="45" cy="95" r="3" fill="#ea580c" />
              <circle cx="110" cy="80" r="3" fill="#ea580c" />
              <circle cx="175" cy="90" r="3" fill="#ea580c" />
              <circle cx="245" cy="75" r="3" fill="#ea580c" />
              <circle cx="315" cy="70" r="3" fill="#ea580c" />
              <circle cx="380" cy="50" r="3" fill="#ea580c" />
            </svg>

            {/* X Axis Months */}
            <div className="flex justify-between pl-9 pr-4 text-[10px] font-semibold text-slate-400">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 3: 2 DATA TABLES SIDE-BY-SIDE (50% / 50%)              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Table 1: Recent Clients */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Clients</h3>
            <button
              type="button"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-semibold">
                  <th className="pb-3 pr-2 w-6">#</th>
                  <th className="pb-3 px-2">Client Name</th>
                  <th className="pb-3 px-2">Company</th>
                  <th className="pb-3 px-2">Service</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 pl-2 w-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">1</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Ahmed Riyas</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Al Noor Trading</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Mainland</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 28, 2026</td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">2</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Fatima Noor</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Sky Line FZ</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Freezone</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 28, 2026</td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">3</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Salman K</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">K Tech Solutions</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Offshore</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 27, 2026</td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">4</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Reema Ali</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Blue Ocean LLC</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Mainland</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 27, 2026</td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">5</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Hussain M</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Global Link FZE</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Freezone</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 26, 2026</td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Recent Tasks */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Tasks</h3>
            <button
              type="button"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-semibold">
                  <th className="pb-3 pr-2 w-6">#</th>
                  <th className="pb-3 px-2">Task</th>
                  <th className="pb-3 px-2">Assigned To</th>
                  <th className="pb-3 px-2">Due Date</th>
                  <th className="pb-3 px-2">Priority</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 pl-2 w-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">1</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Follow up new lead</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Rameez</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 28, 2026</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      High
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">2</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Prepare quotation</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Fatima</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 28, 2026</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      Medium
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                      In Progress
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">3</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Client meeting</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Salman</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 27, 2026</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      High
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">4</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Send invoice</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Huda</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 27, 2026</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                      Low
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Completed
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2 text-slate-400 font-medium">5</td>
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">Update CRM data</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Rameez</td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Oct 26, 2026</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      Medium
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                      In Progress
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 4: BOTTOM 3-COLUMN GRID: NOTIFS, ACTIVITY, ACTIONS     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Recent Notifications (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Notifications</h3>
              <button
                type="button"
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Filter Pills from Screenshot */}
            <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
              {["All", "Document", "Task", "Client", "User", "System"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setNotificationFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    notificationFilter === tab
                      ? "bg-amber-800 text-white font-bold shadow-sm"
                      : "bg-slate-100 dark:bg-[#1c202e] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Notification List Items matching screenshot */}
            <div className="space-y-3.5 pt-3">
              {/* Notif 1 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400 shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      Trade License expiring in 15 days
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Sky Line FZ</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-[11px] text-slate-400 font-medium">10:24 AM</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                </div>
              </div>

              {/* Notif 2 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500 dark:bg-sky-950/50 dark:text-sky-400 shrink-0 mt-0.5">
                    <UserPlus className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      New lead assigned to you
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Rashid Group</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-[11px] text-slate-400 font-medium">09:10 AM</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                </div>
              </div>

              {/* Notif 3 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400 shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      Document expired
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Residence Visa - Ahmed Riyas</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-[11px] text-slate-400 font-medium">Yesterday, 04:15 PM</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                </div>
              </div>

              {/* Notif 4 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0 mt-0.5">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      New user registered
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Fatima Noor (Admin)</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-[11px] text-slate-400 font-medium">Yesterday, 02:30 PM</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                </div>
              </div>

              {/* Notif 5 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400 shrink-0 mt-0.5">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      Task reminder
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Client meeting - Green Way</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-[11px] text-slate-400 font-medium">Oct 27, 03:10 PM</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Recent Activity (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
              <button
                type="button"
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-4 pt-1">
              {/* Activity 1 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0 mt-0.5">
                    <UserPlus className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      New client created
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Ahmed Riyas - Al Noor Trading
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0">10:24 AM</span>
              </div>

              {/* Activity 2 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      Document expiring soon
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Trade License - Sky Line FZ
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0">09:10 AM</span>
              </div>

              {/* Activity 3 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      Task assigned
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Prepare quotation - Fatima
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Yesterday, 04:15 PM</span>
              </div>

              {/* Activity 4 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 shrink-0 mt-0.5">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    Invoice generated
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    INV-2026-032 - K Tech Solutions
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Yesterday, 02:30 PM</span>
              </div>

              {/* Activity 5 */}
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    User login
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Rameez Ali (Admin)
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Oct 27, 03:10 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Quick Actions (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/90 dark:border-[#1e2230] bg-white dark:bg-[#12141c] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Action 1: Add New Client */}
              <button
                type="button"
                onClick={() => alert("Add New Client dialog")}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#fff7ed] dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Add New Client
                </span>
              </button>

              {/* Action 2: Create Task */}
              <button
                type="button"
                onClick={() => alert("Create Task dialog")}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#f0f9ff] dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/40 hover:bg-sky-100/70 dark:hover:bg-sky-900/40 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 mb-2 group-hover:scale-110 transition-transform">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Create Task
                </span>
              </button>

              {/* Action 3: Add Document */}
              <button
                type="button"
                onClick={() => onNavigateTab ? onNavigateTab("doc-create") : alert("Add Document dialog")}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#faf5ff] dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 mb-2 group-hover:scale-110 transition-transform">
                  <FilePlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Add Document
                </span>
              </button>

              {/* Action 4: Create User */}
              <button
                type="button"
                onClick={() => alert("Create User dialog")}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#f0fdf4] dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-2 group-hover:scale-110 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Create User
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
