import type { ElementType } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Command,
  FileText,
  Globe,
  Layers3,
  Lock,
  Radar,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { FormInput } from "../components/FormInput";
import { Pagination } from "../components/Pagination";
import { PublicNav } from "../components/PublicNav";
import { ScanCard } from "../components/ScanCard";

const metrics = [
  { label: "Services", value: "12" },
  { label: "Scan Modes", value: "3" },
  { label: "Integrations", value: "10+" },
  { label: "Reports", value: "PDF / DOCX / HTML" },
];

const pillars = [
  {
    icon: Radar,
    title: "Continuous scanning",
    copy:
      "Distributed recon, vulnerability discovery, and structured findings for cloud, internal, and external targets.",
  },
  {
    icon: Brain,
    title: "AI-assisted analysis",
    copy:
      "Correlation, prioritization, and remediation guidance powered by the platform's analysis pipeline.",
  },
  {
    icon: FileText,
    title: "Executive reporting",
    copy:
      "Professional outputs that translate raw findings into board-ready, compliance-friendly deliverables.",
  },
  {
    icon: Users,
    title: "Team workflow",
    copy:
      "Shared dashboards, collaboration primitives, and role-aware views that work across operators and admins.",
  },
  {
    icon: Globe,
    title: "Public and private surfaces",
    copy:
      "A modern marketing front-end, authenticated workspace, and demo sandbox all shipped from the same app.",
  },
  {
    icon: Lock,
    title: "Deployment flexibility",
    copy:
      "Run cloud-hosted, self-hosted, or locally with a stack that stays modular and easy to extend.",
  },
];

const pipeline = [
  {
    step: "01",
    title: "Discover",
    text: "Enumerate assets, targets, and attack surface with active and passive collection.",
  },
  {
    step: "02",
    title: "Scan",
    text: "Run scanners, fuzzers, and checks in a controlled workflow with progress visibility.",
  },
  {
    step: "03",
    title: "Correlate",
    text: "Group the noisy results into meaningful findings with severity and context.",
  },
  {
    step: "04",
    title: "Report",
    text: "Export branded deliverables and compliance-ready summaries for stakeholders.",
  },
];

const stack = ["React 19", "Vite", "Tailwind CSS", "Storybook", "React Router", "Zustand", "React Query"];

const scanItems = [
  {
    target: "api.cosmicsec.local",
    tool: "nuclei • authenticated",
    findings: 4,
    startedAt: "14m ago",
    status: "running" as const,
  },
  {
    target: "192.168.10.0/24",
    tool: "nmap • service discovery",
    findings: 18,
    startedAt: "32m ago",
    status: "completed" as const,
  },
];

function ShowcaseCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: ElementType;
  title: string;
  copy: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:border-cyan-500/40">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
    </article>
  );
}

function ShowcasePage() {
  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-[12rem] h-[26rem] w-[26rem] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-8rem] h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <MemoryRouter>
        <div className="border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
          <PublicNav
            brand={
              <>
                <Shield className="h-7 w-7 text-cyan-400" />
                <span className="text-xl font-bold tracking-tight text-white">CosmicSec</span>
              </>
            }
            links={[
              { label: "Platform", to: "#platform" },
              { label: "Workflow", to: "#workflow" },
              { label: "Design System", to: "#design-system" },
            ]}
            actions={[
              { label: "Live Demo", to: "/demo", variant: "ghost" },
              { label: "Open App", to: "/auth/register", variant: "primary" },
            ]}
          />
        </div>

        <main className="mx-auto flex max-w-7xl flex-col gap-20 px-6 py-12 md:px-8 lg:px-10">
          <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                GitHub Pages Showcase
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-7xl">
                  A premium cyber intelligence platform, presented like a product launch.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
                  CosmicSec combines scanning, recon, analysis, collaboration, and reporting into a
                  single modern stack. This published page is designed to show the project as a real
                  product instead of a default Storybook shell.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="bg-cyan-400 px-5 py-3 text-slate-950 hover:bg-cyan-300">
                  <span className="inline-flex items-center gap-2">
                    Explore the platform <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
                <Button className="border border-white/10 bg-white/5 px-5 py-3 text-white hover:bg-white/10">
                  <span className="inline-flex items-center gap-2">
                    View code lab <Command className="h-4 w-4" />
                  </span>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/6 bg-white/[0.03] p-4 backdrop-blur"
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{metric.label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-cyan-500/20 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20">
                <div className="mb-5 flex items-center justify-between text-sm text-slate-400">
                  <span className="inline-flex items-center gap-2 text-cyan-300">
                    <BadgeCheck className="h-4 w-4" />
                    Public preview
                  </span>
                  <span>Optimized for GitHub Pages</span>
                </div>

                <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-indigo-500/10 p-6">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live surfaces</p>
                  <div className="mt-5 grid gap-4">
                    <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
                      <p className="text-sm font-medium text-white">Landing experience</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Hero, feature grid, deployment modes, and platform positioning.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
                      <p className="text-sm font-medium text-white">Operations UI</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Dashboard, scans, recon, AI analysis, reports, and team workflow.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
                      <p className="text-sm font-medium text-white">Design system</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Buttons, forms, cards, skeletons, notifications, and responsive primitives.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <Layers3 className="h-5 w-5 text-cyan-300" />
                    <h2 className="font-semibold text-white">Modular by design</h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    The repo already separates services, shared components, SDKs, and UI pages, so this
                    showcase can highlight the product without introducing a separate static site.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-emerald-300" />
                    <h2 className="font-semibold text-white">Ready for evolution</h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    The design language can keep growing with richer pages, motion, analytics cards, and
                    product-specific demos while staying consistent.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="platform" className="space-y-8">
            <div className="max-w-3xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Platform</p>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                The project now presents itself like a complete product page, not a placeholder.
              </h2>
              <p className="text-slate-400">
                These sections make the GitHub Pages experience useful to visitors who want to
                understand what CosmicSec does before they ever log in.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pillars.map((pillar) => (
                <ShowcaseCard key={pillar.title} {...pillar} />
              ))}
            </div>
          </section>

          <section id="workflow" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="rounded-[2rem] border border-white/8 bg-slate-900/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Workflow</p>
              <h2 className="mt-3 text-3xl font-bold text-white">Operational flow</h2>
              <p className="mt-3 text-slate-400">
                The project already has the core pieces for a full security workflow. This layout makes
                that story easy to follow.
              </p>

              <div className="mt-6 space-y-4">
                {pipeline.map((item) => (
                  <div key={item.step} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-sm font-bold text-cyan-300">
                        {item.step}
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        <p className="text-sm text-slate-400">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                {scanItems.map((item) => (
                  <ScanCard key={item.target} {...item} />
                ))}
              </div>

              <div className="rounded-[2rem] border border-white/8 bg-slate-900/70 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
                      Design system
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">A cleaner visual language</h2>
                  </div>
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Ready for expansion
                  </div>
                </div>

                <div id="design-system" className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-3xl border border-white/8 bg-slate-950/70 p-5">
                    <p className="text-sm font-medium text-white">Interactive controls</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">Primary</Button>
                      <Button className="border border-white/10 bg-white/5 text-white hover:bg-white/10">
                        Secondary
                      </Button>
                      <FormInput label="Target" id="showcase-target" placeholder="example.com" />
                      <FormInput label="Scope" id="showcase-scope" placeholder="192.168.1.0/24" />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-slate-950/70 p-5">
                    <p className="text-sm font-medium text-white">Navigation preview</p>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-slate-900 p-4">
                      <Pagination page={4} totalPages={12} onPageChange={() => undefined} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {stack.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 rounded-[2rem] border border-white/8 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-cyan-500/[0.06] p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Delivery</p>
              <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                Published pages should feel intentional, not incidental.
              </h2>
              <p className="mt-4 max-w-2xl text-slate-400">
                This showcase highlights the product story, while Storybook continues to document the
                underlying components and page patterns for the team.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/80 p-6">
              <div className="flex items-center gap-3 text-cyan-300">
                <Zap className="h-5 w-5" />
                <span className="font-semibold">Included in this public preview</span>
              </div>
              <ul className="mt-5 space-y-3 text-sm text-slate-300">
                {[
                  "Full-screen product narrative",
                  "Real project components and layouts",
                  "Responsive cards, controls, and navigation",
                  "GitHub Pages root redirect to the showcase",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
                >
                  Open showcase <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Explore demo <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </MemoryRouter>
    </div>
  );
}

const meta: Meta<typeof ShowcasePage> = {
  title: "Welcome/CosmicSec Showcase",
  component: ShowcasePage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A full-page showcase that turns the GitHub Pages Storybook deployment into a polished product landing experience.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ShowcasePage>;

export const Overview: Story = {
  render: () => <ShowcasePage />,
};
