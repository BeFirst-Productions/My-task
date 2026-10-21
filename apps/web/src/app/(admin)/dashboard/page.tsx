import {
  FileCheck2,
  Clock,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      title: "Active Documents",
      value: "1,248",
      detail: "Visas, permits, commercial licences",
      icon: FileCheck2,
      trend: "+12% this month",
    },
    {
      title: "Expiring in 30 Days",
      value: "42",
      detail: "Requires urgent renewal follow-up",
      icon: Clock,
      alert: true,
    },
    {
      title: "WhatsApp Reminders",
      value: "389",
      detail: "Dispatched automatically to clients",
      icon: MessageSquare,
      trend: "99.4% delivery rate",
    },
    {
      title: "Staff Renewal Tasks",
      value: "18",
      detail: "Assigned across 5 team members",
      icon: CheckCircle,
      trend: "6 completed today",
    },
  ];

  const recentDocuments = [
    {
      client: "Al-Noor Logistics Ltd",
      document: "Trade Licence #TL-9021",
      category: "Commercial Licence",
      expiry: "Nov 15, 2026",
      status: "Expiring Soon",
      statusColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
      assignedTo: "Sarah Jenkins",
    },
    {
      client: "Quantum Capital Partners",
      document: "Executive Residence Visa",
      category: "Immigration / Visa",
      expiry: "Dec 02, 2026",
      status: "In Renewal",
      statusColor: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
      assignedTo: "Marcus Chen",
    },
    {
      client: "Helios Engineering",
      document: "Municipality Environmental Permit",
      category: "Operating Permit",
      expiry: "Jan 28, 2027",
      status: "Compliant",
      statusColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      assignedTo: "Elena Rostova",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tenant Operational Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time tracking of client compliance milestones, notification schedules, and operational tasks.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 text-xs font-medium text-indigo-300">
          <AlertTriangle className="h-4 w-4 text-indigo-400" />
          <span>Placeholder Foundation View</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="glass-panel rounded-xl p-5 border border-slate-800 transition-all hover:border-slate-700"
            >
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">{stat.title}</span>
                <Icon className={`h-4 w-4 ${stat.alert ? "text-amber-400" : "text-indigo-400"}`} />
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</div>
              <div className="mt-2 text-xs text-slate-400">{stat.detail}</div>
            </div>
          );
        })}
      </div>

      {/* Document Expiry Queue Preview */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Upcoming Document Expiries & Tasks</h2>
          <span className="text-xs text-slate-400">Mock Data Preview</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase font-medium tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Client Organization</th>
                <th className="px-6 py-3">Document Title</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Expiry Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Assigned Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {recentDocuments.map((doc) => (
                <tr key={doc.document} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{doc.client}</td>
                  <td className="px-6 py-4">{doc.document}</td>
                  <td className="px-6 py-4 text-slate-400">{doc.category}</td>
                  <td className="px-6 py-4">{doc.expiry}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${doc.statusColor}`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{doc.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
