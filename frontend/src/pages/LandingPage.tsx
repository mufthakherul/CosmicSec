import { Link } from "react-router-dom";
import {
  Activity,
  Brain,
  Bug,
  FileText,
  Globe,
  Lock,
  Radar,
  Shield,
  Terminal,
  Users,
  Zap,
} from "lucide-react";
import { PublicNav } from "../components/PublicNav";

const FEATURES = [
  {
    icon: Radar,
    title: "Deep Scan Engine",
    description:
      "Distributed scanner with nmap, nikto, nuclei and 10+ tools. Smart rate limiting & continuous monitoring.",
    color: "text-cyan-400",
  },
  {
    icon: Globe,
    title: "OSINT & Recon",
    description:
      "DNS enumeration, Shodan, VirusTotal, crt.sh, RDAP — all in one unified recon pipeline.",
    color: "text-blue-400",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "LangChain + LangGraph workflows, MITRE ATT&CK mapping, zero-day prediction, and RAG knowledge base.",
    color: "text-purple-400",
  },
  {
    icon: FileText,
    title: "Professional Reports",
    description:
      "Generate PDF, DOCX, HTML reports with compliance templates (SOC2, PCI-DSS, HIPAA) and visual heatmaps.",
    color: "text-emerald-400",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Real-time WebSocket rooms, shared scan state, @mentions, threaded report editing.",
    color: "text-amber-400",
  },
  {
    icon: Bug,
    title: "Bug Bounty Platform",
    description:
      "Integrated with HackerOne, Bugcrowd & Intigriti. Automate recon, prioritise findings, and track earnings.",
    color: "text-rose-400",
  },
];

const STATS = [
  { label: "CVEs Analysed", value: "500K+" },
  { label: "Integrations", value: "12+" },
  { label: "Deployment Modes", value: "3" },
  { label: "Services", value: "12" },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden">
      <PublicNav
        brand={
          <>
            <Shield className="h-7 w-7 text-cyan-400" />
            <span className="text-xl font-bold tracking-tight">CosmicSec</span>
          </>
        }
        links={[
          { label: "Demo", to: "/demo" },
          { label: "Pricing", to: "/pricing" },
          { label: "GitHub", to: "https://github.com/mufthakherul/CosmicSec", external: true },
        ]}
        actions={[
          { label: "Sign In", to: "/auth/login", variant: "ghost" },
          { label: "Start Free", to: "/auth/register", variant: "primary" },
        ]}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* Gradient blobs */}
        <div
          aria-hidden
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute top-0 right-0 w-[500px] h-[300px] rounded-full bg-purple-500/10 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs font-medium text-cyan-400 mb-8">
            <Zap className="h-3 w-3" />
            Universal Cybersecurity Intelligence Platform
          </span>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Scan. Recon.{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Analyse.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-10">
            CosmicSec combines an AI-powered analysis engine, distributed scanning, OSINT
            reconnaissance, and team collaboration into one platform — cloud, self-hosted, or
            fully local.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/register"
              className="rounded-xl bg-cyan-500 px-8 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
            >
              Get Started Free
            </Link>
            <Link
              to="/demo"
              className="rounded-xl border border-slate-700 px-8 py-3 text-base font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
            >
              <Terminal className="inline h-4 w-4 mr-2" />
              Try Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stats bar */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-800">
          {STATS.map((s) => (
            <div key={s.label} className="py-8 px-6 text-center">
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="mt-1 text-sm text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Feature grid */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-4xl font-bold mb-4">
            Everything in one platform
          </h2>
          <p className="text-center text-slate-400 mb-16 max-w-2xl mx-auto">
            Purpose-built services for every layer of security operations — scanning, recon,
            AI analysis, reporting, collaboration, and compliance.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm hover:border-slate-600 hover:bg-slate-900 transition-all"
                >
                  <Icon className={`h-8 w-8 ${f.color} mb-4`} />
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Architecture / How it works */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 px-6 bg-slate-900/40">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">Three deployment modes</h2>
          <p className="text-slate-400 mb-12">
            Cloud SaaS, self-hosted Docker, or fully air-gapped local agent — all supported.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Globe,
                mode: "Cloud / SaaS",
                desc: "Zero setup. Full platform in your browser. Register and start scanning in minutes.",
                color: "from-cyan-500/20",
              },
              {
                icon: Activity,
                mode: "Self-Hosted Docker",
                desc: "Run on your own infrastructure with Docker Compose. Full data sovereignty.",
                color: "from-purple-500/20",
              },
              {
                icon: Lock,
                mode: "Local CLI Agent",
                desc: "Install cosmicsec-agent on your machine. Runs nmap, nuclei, nikto locally. Optionally syncs to cloud.",
                color: "from-emerald-500/20",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.mode}
                  className={`rounded-2xl border border-slate-800 bg-gradient-to-b ${m.color} to-transparent p-6`}
                >
                  <Icon className="h-6 w-6 text-slate-300 mb-3" />
                  <h3 className="font-semibold mb-2">{m.mode}</h3>
                  <p className="text-sm text-slate-400">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-4xl font-bold mb-4">
            Ready to level up your security?
          </h2>
          <p className="text-slate-400 mb-8">
            Free tier available. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/register"
              className="rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-slate-950 hover:bg-cyan-400 transition-all"
            >
              Create Free Account
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-slate-700 px-8 py-3 font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            <span className="font-semibold">CosmicSec</span>
            <span className="text-slate-500 text-sm ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link to="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/demo" className="hover:text-white transition-colors">
              Demo
            </Link>
            <a
              href="https://github.com/mufthakherul/CosmicSec"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
