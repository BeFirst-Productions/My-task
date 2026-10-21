"use client";

import React from "react";
import {
  Building2,
  Users,
  UserCheck,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldAlert,
  PlusCircle,
  BarChart3,
  Settings,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface DashboardViewProps {
  onAddOrganisation: () => void;
  onViewListing: () => void;
}

export function DashboardView({
  onAddOrganisation,
  onViewListing,
}: DashboardViewProps) {
  const kpiCards = [
    {
      title: "Total Organisations",
      value: "12",
      change: "+2 this month",
      icon: Building2,
      sparkColor: "from-amber-500 to-amber-600",
      bars: [30, 45, 60, 50, 75, 90],
    },
    {
      title: "Active Super Admins",
      value: "18",
      change: "+3 this month",
      icon: UserCheck,
      sparkColor: "from-sky-500 to-blue-600",
      bars: [40, 55, 65, 70, 80, 100],
    },
    {
      title: "Total Users",
      value: "246",
      change: "+24 this month",
      icon: Users,
      sparkColor: "from-purple-500 to-indigo-600",
      bars: [25, 40, 55, 70, 85, 95],
    },
    {
      title: "System Health",
      value: "99.9%",
      change: "All Systems Operational",
      icon: ShieldCheck,
      sparkColor: "from-emerald-500 to-green-600",
      isHealth: true,
      bars: [100, 100, 100, 100, 100, 100],
    },
  ];

  const recentActivities = [
    {
      activity: "New organisation registered",
      organisation: "Business Setup CRM",
      performedBy: "Platform Owner",
      dateTime: "Today, 10:24 AM",
      status: "Completed",
      statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      activity: "Super admin assigned",
      organisation: "Document Clearing CRM",
      performedBy: "Platform Owner",
      dateTime: "Today, 09:40 AM",
      status: "Completed",
      statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      activity: "Permissions updated",
      organisation: "Nexpro CRM",
      performedBy: "Super Admin",
      dateTime: "Yesterday, 04:15 PM",
      status: "Completed",
      statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      activity: "User account suspended",
      organisation: "SPEEDQ CRM",
      performedBy: "Platform Owner",
      dateTime: "Yesterday, 11:30 AM",
      status: "Reviewed",
      statusColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      activity: "Organisation added",
      organisation: "Invest First CRM",
      performedBy: "Super Admin",
      dateTime: "Oct 28, 2026, 05:30 PM",
      status: "Completed",
      statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      activity: "Platform settings updated",
      organisation: "—",
      performedBy: "Platform Owner",
      dateTime: "Oct 27, 2026, 02:10 PM",
      status: "Updated",
      statusColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6 w-full max-w-[1750px] mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Welcome back,
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
            Platform Owner <span className="text-amber-400 text-2xl">👑</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage all organisations, super admins, users and platform activity from one place.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#151720] border border-[#232733] text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors">
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
            <span>Last 30 Days</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="bg-[#12141a] rounded-xl p-5 border border-[#1f232e] relative overflow-hidden transition-all hover:border-amber-500/30 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-400">{kpi.title}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mt-1.5 tracking-tight">
                    {kpi.value}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#191c25] border border-[#282d3c] text-amber-500 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              {/* Sparkline & Subtext */}
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-1.5 text-xs">
                  {kpi.isHealth ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {kpi.change}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {kpi.change}
                    </span>
                  )}
                </div>

                {/* Mini Bar Graph */}
                <div className="flex items-end gap-1 h-6">
                  {kpi.bars.map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className={`w-1 rounded-t-sm bg-gradient-to-t ${kpi.sparkColor} opacity-70`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Status Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Platform Activity Chart */}
        <div className="lg:col-span-1 bg-[#12141a] rounded-xl p-5 border border-[#1f232e] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Platform Activity</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  New organisations, users and key activities across the platform
                </p>
              </div>
            </div>

            {/* Custom Bar Chart Graphic */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2 border-b border-[#1f232e]">
              {[
                { date: "Oct 05", org: 40, usr: 60, act: 80 },
                { date: "Oct 10", org: 55, usr: 70, act: 45 },
                { date: "Oct 15", org: 30, usr: 85, act: 90 },
                { date: "Oct 20", org: 70, usr: 60, act: 65 },
                { date: "Oct 25", org: 45, usr: 95, act: 80 },
                { date: "Oct 30", org: 65, usr: 80, act: 70 },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="flex items-end gap-1 h-32 w-full justify-center">
                    <div
                      style={{ height: `${item.org}%` }}
                      className="w-1.5 rounded-t-sm bg-amber-500"
                    />
                    <div
                      style={{ height: `${item.usr}%` }}
                      className="w-1.5 rounded-t-sm bg-slate-300"
                    />
                    <div
                      style={{ height: `${item.act}%` }}
                      className="w-1.5 rounded-t-sm bg-amber-700"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-3 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Organisations
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" /> New Users
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-700" /> Activities
            </span>
          </div>
        </div>

        {/* Organisations by Status Donut Chart */}
        <div className="lg:col-span-1 bg-[#12141a] rounded-xl p-5 border border-[#1f232e] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Organisations by Status</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Current status of all registered organisations
            </p>

            {/* Donut Chart Visualization */}
            <div className="flex items-center justify-center my-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Active segment (75%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#10b981"
                    strokeWidth="11"
                    fill="transparent"
                    strokeDasharray="179 238"
                    strokeDashoffset="0"
                  />
                  {/* Trial segment (17%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#38bdf8"
                    strokeWidth="11"
                    fill="transparent"
                    strokeDasharray="40 238"
                    strokeDashoffset="-179"
                  />
                  {/* Suspended segment (8%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#f43f5e"
                    strokeWidth="11"
                    fill="transparent"
                    strokeDasharray="19 238"
                    strokeDashoffset="-219"
                  />
                </svg>

                {/* Center text */}
                <div className="absolute text-center flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white leading-tight">12</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">
                    Total
                  </span>
                  <span className="text-[9px] text-slate-500">Organisations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown legend */}
          <div className="space-y-1.5 border-t border-[#1f232e] pt-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">9</span>
                <span className="text-slate-500 text-[11px]">75%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span>Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">2</span>
                <span className="text-slate-500 text-[11px]">17%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span>Suspended</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">1</span>
                <span className="text-slate-500 text-[11px]">8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="lg:col-span-1 bg-[#12141a] rounded-xl p-5 border border-[#1f232e] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Critical Alerts</h3>
              </div>
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                3 Pending
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 flex items-start justify-between cursor-pointer hover:bg-rose-500/10 transition-colors">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-rose-300">
                      2 licences expiring soon
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Across 2 organisations</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>

              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start justify-between cursor-pointer hover:bg-amber-500/10 transition-colors">
                <div className="flex items-start gap-2.5">
                  <Users className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-300">
                      3 pending admin reviews
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      User requests awaiting approval
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>

              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-start justify-between cursor-pointer hover:bg-red-500/10 transition-colors">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-red-300">1 security alert</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Suspicious login attempt detected
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1f232e] text-center">
            <button className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors">
              View All Platform Notifications &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Platform Activity Table */}
        <div className="lg:col-span-2 bg-[#12141a] rounded-xl border border-[#1f232e] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1f232e] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Recent Platform Activity</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Latest actions across all organisations</p>
            </div>
            <button
              onClick={onViewListing}
              className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
            >
              View Organisations &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#161822] text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-[#1f232e]">
                <tr>
                  <th className="px-5 py-3">Activity</th>
                  <th className="px-5 py-3">Organisation</th>
                  <th className="px-5 py-3">Performed By</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f232e]/70">
                {recentActivities.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#161822]/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">{row.activity}</td>
                    <td className="px-5 py-3.5 text-slate-300">{row.organisation}</td>
                    <td className="px-5 py-3.5 text-slate-400">{row.performedBy}</td>
                    <td className="px-5 py-3.5 text-slate-400">{row.dateTime}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${row.statusColor}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Cards */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
            Quick Actions
          </div>

          {/* Primary Action: Add new Organisation (Gold gradient!) */}
          <button
            onClick={onAddOrganisation}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-bold flex items-center justify-between shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-black/20 text-slate-950">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-950">Add new Organisation</div>
                <div className="text-xs text-slate-900/80 font-medium">
                  Register a new organisation & DB
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-950 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Action 2: Create Super Admin */}
          <button className="w-full p-3.5 rounded-xl bg-[#12141a] border border-[#1f232e] text-slate-300 hover:text-white hover:border-slate-700 flex items-center justify-between transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#191c25] text-amber-400">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Create Super Admin</div>
                <div className="text-[11px] text-slate-400">Add and manage super admin</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Action 3: View Reports */}
          <button className="w-full p-3.5 rounded-xl bg-[#12141a] border border-[#1f232e] text-slate-300 hover:text-white hover:border-slate-700 flex items-center justify-between transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#191c25] text-sky-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">View Reports</div>
                <div className="text-[11px] text-slate-400">Platform-wide analytics</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Action 4: Platform Settings */}
          <button className="w-full p-3.5 rounded-xl bg-[#12141a] border border-[#1f232e] text-slate-300 hover:text-white hover:border-slate-700 flex items-center justify-between transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#191c25] text-purple-400">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Platform Settings</div>
                <div className="text-[11px] text-slate-400">Configure global settings</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
