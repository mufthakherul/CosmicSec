import { Check, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicNav } from "../components/PublicNav";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for individual researchers and learners.",
    cta: "Start Free",
    ctaTo: "/auth/register",
    highlight: false,
    features: [
      "5 scans per month",
      "Basic recon (DNS, Shodan)",
      "PDF reports",
      "Demo sandbox",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "For professional pentesters and small teams.",
    cta: "Start Pro Trial",
    ctaTo: "/auth/register",
    highlight: true,
    features: [
      "Unlimited scans",
      "Full OSINT suite",
      "AI analysis & MITRE mapping",
      "All report formats",
      "Team collaboration (5 seats)",
      "Bug bounty integrations",
      "API access",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large teams, MSSPs, and compliance-driven orgs.",
    cta: "Contact Sales",
    ctaTo: "mailto:contact@cosmicsec.io",
    highlight: false,
    features: [
      "Everything in Pro",
      "Unlimited seats",
      "Self-hosted deployment",
      "SOC2 / ISO27001 compliance reports",
      "SIEM integrations",
      "LangGraph multi-agent workflows",
      "Dedicated support SLA",
      "Custom integrations",
    ],
  },
];

export function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <PublicNav
        brand={
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Shield className="h-6 w-6 text-cyan-400" />
            CosmicSec
          </Link>
        }
        links={[
          { label: "Home", to: "/" },
          { label: "Demo", to: "/demo" },
          { label: "GitHub", to: "https://github.com/mufthakherul/CosmicSec", external: true },
        ]}
        actions={[
          { label: "Sign In", to: "/auth/login", variant: "ghost" },
          { label: "Get Started", to: "/auth/register", variant: "primary" },
        ]}
        sticky={false}
      />

      {/* Header */}
      <div className="text-center py-20 px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs font-medium text-cyan-400 mb-6">
          <Zap className="h-3 w-3" />
          Simple, transparent pricing
        </span>
        <h1 className="text-5xl font-extrabold mb-4">Choose your plan</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Start free, scale when you need to. No hidden fees. Cancel anytime.
        </p>
      </div>

      {/* Tiers */}
      <div className="mx-auto max-w-6xl px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-2xl border p-8 flex flex-col gap-6 ${
              tier.highlight
                ? "border-cyan-500/60 bg-cyan-500/5 shadow-xl shadow-cyan-500/10"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            {tier.highlight && (
              <span className="self-start rounded-full bg-cyan-500 px-3 py-0.5 text-xs font-bold text-slate-950">
                Most Popular
              </span>
            )}

            <div>
              <h2 className="text-xl font-bold">{tier.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{tier.price}</span>
                {tier.period && (
                  <span className="text-sm text-slate-400">/ {tier.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-400">{tier.description}</p>
            </div>

            <ul className="space-y-3 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              to={tier.ctaTo}
              className={`w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                tier.highlight
                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ-style comparison note */}
      <div className="border-t border-slate-800 py-12 px-6 text-center">
        <p className="text-slate-400 text-sm">
          All plans include a 14-day free trial of Pro features. No credit card required for
          the Free tier.
        </p>
      </div>
    </div>
  );
}
