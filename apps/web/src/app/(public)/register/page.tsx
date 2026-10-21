import Link from "next/link";
import { Building2, ShieldCheck, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="glass-panel rounded-2xl p-8 sm:p-10 border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create Company Account
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Register your agency to start managing tenant clients and document expiry notifications.
          </p>
        </div>

        {/* Informative Foundation Phase Banner */}
        <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-300 leading-relaxed flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
          <div>
            <strong className="font-semibold block text-indigo-200 mb-0.5">Project Foundation Phase</strong>
            This is an architectural placeholder. Authentication, tenant provisioning, and billing will be hooked up in subsequent development phases.
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
              Company / Agency Name
            </label>
            <input
              type="text"
              placeholder="Apex Visa & Corporate Services"
              disabled
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-400 placeholder-slate-600 focus:outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
              Work Email Address
            </label>
            <input
              type="email"
              placeholder="admin@apexservices.com"
              disabled
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-400 placeholder-slate-600 focus:outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
              Desired Workspace Subdomain
            </label>
            <div className="flex rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-sm text-slate-400">
              <input
                type="text"
                placeholder="apex-services"
                disabled
                className="w-full bg-transparent px-4 py-2.5 placeholder-slate-600 focus:outline-none cursor-not-allowed"
              />
              <span className="bg-slate-800/80 px-3 py-2.5 text-slate-500 border-l border-slate-800 select-none">
                .omniexpiry.io
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              Continue to Dashboard Preview
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/dashboard" className="text-indigo-400 hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
