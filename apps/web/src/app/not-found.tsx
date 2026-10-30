import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-4xl font-extrabold text-amber-500 mb-2">404</h2>
      <p className="text-lg font-bold text-slate-200 mb-4">Page Not Found</p>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        The requested page does not exist or has been moved.
      </p>
      <Link
        href="/org/ibh/dashboard?tab=notifications"
        className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

