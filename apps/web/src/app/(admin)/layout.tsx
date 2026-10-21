import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  Building,
  FileText,
  CheckSquare,
  Bell,
  Settings,
  ExternalLink,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/50 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-semibold text-base tracking-tight text-white">OmniExpiry</span>
          </div>

          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tenant Dashboard
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Overview</span>
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed">
              <CheckSquare className="h-4 w-4" />
              <span>Staff Tasks</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </div>

            <div className="pt-6 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Platform Administration
            </div>
            <Link
              href="/platform-admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Building className="h-4 w-4 text-slate-400" />
              <span>Tenants & Billing</span>
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed">
              <Settings className="h-4 w-4" />
              <span>System Settings</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/80">
          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <span>Back to Public Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-md">
              Tenant: Global Corporate Advisory LLC
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="hidden sm:inline">Phase: Architecture Foundation</span>
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
