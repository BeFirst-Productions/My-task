import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const tiers = [
    {
      name: "Starter",
      description: "Ideal for boutique advisory and visa consultancies.",
      price: "$49",
      period: "per month",
      features: [
        "Up to 250 active client documents",
        "Automated email notifications",
        "Standard expiry dashboard",
        "2 staff user seats",
        "Community support",
      ],
      highlighted: false,
      ctaText: "Start Starter Plan",
    },
    {
      name: "Professional",
      description: "For established corporate agencies managing high volume.",
      price: "$149",
      period: "per month",
      features: [
        "Up to 2,000 active client documents",
        "WhatsApp Business notifications",
        "Automated renewal task pipelines",
        "10 staff user seats with role permissions",
        "Priority email & chat support",
      ],
      highlighted: true,
      ctaText: "Start Free Trial",
    },
    {
      name: "Enterprise",
      description: "For multi-branch corporate providers and franchise networks.",
      price: "Custom",
      period: "billed annually",
      features: [
        "Unlimited client documents",
        "Dedicated WhatsApp sending channel",
        "Multi-company tenancy hierarchy",
        "Unlimited staff users & SSO",
        "SLA & dedicated account manager",
      ],
      highlighted: false,
      ctaText: "Contact Sales",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Transparent, Scalable Pricing
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-400">
          Choose a plan that fits your firm&apos;s client volume. Upgrade or adjust subscriptions as your agency scales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-2xl p-8 flex flex-col justify-between transition-all ${
              tier.highlighted
                ? "bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20"
                : "glass-panel"
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">{tier.name}</h2>
                {tier.highlighted && (
                  <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-3 py-0.5 text-xs font-semibold text-indigo-300">
                    Most Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 min-h-[40px]">{tier.description}</p>

              <div className="mt-6 mb-8 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                <span className="text-sm text-slate-400">{tier.period}</span>
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Included capabilities
                </p>
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <Link
                href="/register"
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all ${
                  tier.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {tier.ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
