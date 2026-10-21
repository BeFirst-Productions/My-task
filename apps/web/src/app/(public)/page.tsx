import Link from "next/link";
import {
  BellRing,
  CalendarCheck2,
  FileCheck2,
  MessageSquare,
  Shield,
  Users2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-sky-500/10 to-transparent blur-3xl" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 mb-6">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          Multi-Tenant Expiry & Compliance Automation
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Never let a client <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">visa, license, or permit</span> expire unnoticed.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
          Centralize client document lifecycles, trigger automated WhatsApp and email reminders before critical deadlines, and streamline staff renewal tasks across all your tenants.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Start Free Foundation Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-base font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
          >
            Explore Dashboard Demo
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Multi-Tenant Company Isolation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Automated WhatsApp Reminders</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Staff Renewal Task Workflow</span>
          </div>
        </div>
      </section>

      {/* Architectural Pillars / Features Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-slate-800/60">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered for High-Reliability Operations
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            A modular Next.js and Fastify architecture built on PostgreSQL and Prisma for strict multi-tenant isolation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-6 transition-all hover:border-indigo-500/40">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Document Lifecycle Tracking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Maintain structured records of permits, visas, trade licences, and corporate certifications with proactive status tracking.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 transition-all hover:border-indigo-500/40">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Omnichannel Notifications</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated reminders via WhatsApp Business API and email at 90, 60, 30, and 7-day intervals before document expiry.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 transition-all hover:border-indigo-500/40">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Users2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Staff Renewal Tasks</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Auto-generate task queues for operations staff, assign compliance officers, and monitor renewal verification pipelines.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
