import { useState, useEffect } from "react";
import {
  Bug,
  Plus,
  Search,
  ExternalLink,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useNotificationStore } from "../store/notificationStore";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

interface BugBountyProgram {
  id: string;
  name: string;
  platform: string;
  url: string;
  max_reward: number;
  currency: string;
  scope: string[];
  active: boolean;
}

interface BugBountySubmission {
  id: string;
  program_id: string;
  program_name?: string;
  title: string;
  severity: string;
  status: "draft" | "submitted" | "triaged" | "accepted" | "rejected" | "paid";
  reward?: number;
  submitted_at: string;
}

interface BugBountySubmissionResponse {
  id?: string;
  submission_id?: string;
  program_id?: string;
  program_name?: string;
  title?: string;
  severity?: string;
  status?: BugBountySubmission["status"];
  reward_amount?: number;
  reward?: number;
  submitted_at?: string;
}

interface BugBountyOverview {
  programs: number;
  submissions: number;
  threads: number;
  pending_review: number;
  paid_submissions: number;
  total_paid: number;
  average_payout: number;
  status_breakdown: Record<string, number>;
  recent_activities: Array<{
    event?: string;
    actor?: string | null;
    detail?: string | null;
    created_at?: string | null;
  }>;
  updated_at?: string;
}

const PREVIEW_PROGRAMS: BugBountyProgram[] = [
  {
    id: "program-1",
    name: "CosmicSec Core Platform",
    platform: "web",
    url: "https://cosmicsec.example",
    max_reward: 5000,
    currency: "USD",
    scope: ["app.cosmicsec.example", "api.cosmicsec.example"],
    active: true,
  },
  {
    id: "program-2",
    name: "CosmicSec Mobile Companion",
    platform: "mobile",
    url: "https://mobile.cosmicsec.example",
    max_reward: 2500,
    currency: "USD",
    scope: ["iOS", "Android"],
    active: true,
  },
];

const PREVIEW_SUBMISSIONS: BugBountySubmission[] = [
  {
    id: "sub-1",
    program_id: "program-1",
    program_name: "CosmicSec Core Platform",
    title: "Security header hardening gap",
    severity: "medium",
    status: "triaged",
    reward: 450,
    submitted_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  info: "text-slate-400 bg-slate-700/40 border-slate-600/20",
};

const STATUS_ICON: Record<BugBountySubmission["status"], React.ElementType> = {
  draft: Clock,
  submitted: Loader2,
  triaged: AlertCircle,
  accepted: CheckCircle,
  rejected: AlertCircle,
  paid: DollarSign,
};

const STATUS_FLOW: Record<BugBountySubmission["status"], BugBountySubmission["status"][]> = {
  draft: ["submitted", "rejected"],
  submitted: ["triaged", "accepted", "rejected"],
  triaged: ["accepted", "rejected"],
  accepted: ["paid"],
  rejected: [],
  paid: [],
};

function normalizeSubmission(item: BugBountySubmissionResponse): BugBountySubmission {
  return {
    id: item.id ?? item.submission_id ?? `sub-${Date.now()}`,
    program_id: item.program_id ?? "unknown-program",
    program_name: item.program_name,
    title: item.title ?? "Untitled submission",
    severity: item.severity ?? "medium",
    status: item.status ?? "draft",
    reward: item.reward ?? item.reward_amount,
    submitted_at: item.submitted_at ?? new Date().toISOString(),
  };
}

export function BugBountyPage() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [programs, setPrograms] = useState<BugBountyProgram[]>([]);
  const [submissions, setSubmissions] = useState<BugBountySubmission[]>([]);
  const [overview, setOverview] = useState<BugBountyOverview | null>(null);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [activeTab, setActiveTab] = useState<"programs" | "submissions">("programs");
  const [searchQuery, setSearchQuery] = useState("");

  // New submission form
  const [showForm, setShowForm] = useState(false);
  const [formProgramId, setFormProgramId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formSeverity, setFormSeverity] = useState("high");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, BugBountySubmission["status"]>>(
    {},
  );
  const [rewardInputs, setRewardInputs] = useState<Record<string, string>>({});
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<string | null>(null);
  const isPreview =
    typeof window !== "undefined" &&
    window.localStorage.getItem("cosmicsec_token")?.startsWith("demo-preview");

  const token = localStorage.getItem("cosmicsec_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    void (async () => {
      setLoadingPrograms(true);
      if (isPreview) {
        setPrograms(PREVIEW_PROGRAMS);
        setSubmissions(PREVIEW_SUBMISSIONS);
        setLoadingPrograms(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/bugbounty/programs`, { headers });
        const data = (await res.json()) as { programs?: BugBountyProgram[] } | BugBountyProgram[];
        setPrograms(Array.isArray(data) ? data : (data.programs ?? []));
        const [overviewRes, submissionsRes] = await Promise.allSettled([
          fetch(`${API}/api/bugbounty/dashboard/overview`, { headers }),
          fetch(`${API}/api/bugbounty/submissions`, { headers }),
        ]);
        if (overviewRes.status === "fulfilled" && overviewRes.value.ok) {
          setOverview((await overviewRes.value.json()) as BugBountyOverview);
        }
        if (submissionsRes.status === "fulfilled" && submissionsRes.value.ok) {
          const payload = (await submissionsRes.value.json()) as {
            items?: BugBountySubmissionResponse[];
          };
          setSubmissions((payload.items ?? []).map(normalizeSubmission));
        }
      } catch {
        // silently use empty list — API may not be up
      } finally {
        setLoadingPrograms(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);

  const filteredPrograms = programs.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.platform.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formProgramId) return;
    setSubmitting(true);
    try {
      if (isPreview) {
        const newSub: BugBountySubmission = {
          id: `sub-${Date.now()}`,
          program_id: formProgramId,
          program_name: programs.find((p) => p.id === formProgramId)?.name,
          title: formTitle.trim(),
          severity: formSeverity,
          status: "draft",
          submitted_at: new Date().toISOString(),
        };
        setSubmissions((prev) => [newSub, ...prev]);
        setFormTitle("");
        setFormDescription("");
        setShowForm(false);
        setActiveTab("submissions");
        addNotification({ type: "success", message: "Submission saved as draft." });
        return;
      }

      const res = await fetch(`${API}/api/bugbounty/submissions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          program_id: formProgramId,
          title: formTitle.trim(),
          severity: formSeverity,
          description: formDescription.trim(),
        }),
      });
      const data = (await res.json()) as BugBountySubmissionResponse;
      const newSub: BugBountySubmission = normalizeSubmission({
        ...data,
        program_id: formProgramId,
        program_name: programs.find((p) => p.id === formProgramId)?.name,
        title: formTitle.trim(),
        severity: formSeverity,
        status: "draft",
        submitted_at: new Date().toISOString(),
      });
      setSubmissions((prev) => [newSub, ...prev]);
      setFormTitle("");
      setFormDescription("");
      setShowForm(false);
      setActiveTab("submissions");
      addNotification({ type: "success", message: "Submission saved as draft." });
    } catch {
      addNotification({ type: "error", message: "Failed to create submission." });
    } finally {
      setSubmitting(false);
    }
  };

  const updateSubmissionStatus = async (submission: BugBountySubmission) => {
    const nextStatus = statusUpdates[submission.id] ?? STATUS_FLOW[submission.status][0];
    if (!nextStatus || nextStatus === submission.status) return;

    const parsedReward = Number(rewardInputs[submission.id] ?? submission.reward ?? 0);
    if (nextStatus === "paid" && Number.isNaN(parsedReward)) {
      addNotification({ type: "error", message: "Enter a valid payout amount before paying." });
      return;
    }

    if (isPreview) {
      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === submission.id
            ? {
                ...item,
                status: nextStatus,
                reward: nextStatus === "paid" ? parsedReward : item.reward,
              }
            : item,
        ),
      );
      addNotification({ type: "success", message: `Submission moved to ${nextStatus}.` });
      return;
    }

    setUpdatingSubmissionId(submission.id);
    try {
      const res = await fetch(`${API}/api/bugbounty/submissions/${submission.id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: nextStatus,
          reward_amount: nextStatus === "paid" ? parsedReward : undefined,
          actor: "web-operator",
          note: `Updated from ${submission.status} to ${nextStatus} in web UI`,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "Status update failed");
      }

      const updated = normalizeSubmission((await res.json()) as BugBountySubmissionResponse);
      setSubmissions((prev) => prev.map((item) => (item.id === submission.id ? updated : item)));
      addNotification({ type: "success", message: `Submission moved to ${nextStatus}.` });
    } catch {
      addNotification({ type: "error", message: "Failed to update submission status." });
    } finally {
      setUpdatingSubmissionId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="h-6 w-6 text-amber-400" />
              <h1 className="text-2xl font-bold text-slate-100">Bug Bounty</h1>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              <Plus className="h-4 w-4" />
              New Submission
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Browse programs, track submissions, and manage vulnerability disclosures.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Programs",
              value: overview?.programs ?? programs.length,
              icon: ShieldCheck,
              accent: "text-emerald-300",
            },
            {
              label: "Submissions",
              value: overview?.submissions ?? submissions.length,
              icon: Bug,
              accent: "text-amber-300",
            },
            {
              label: "Pending Review",
              value: overview?.pending_review ?? 0,
              icon: Clock,
              accent: "text-cyan-300",
            },
            {
              label: "Total Paid",
              value: `$${overview?.total_paid ?? 0}`,
              icon: DollarSign,
              accent: "text-lime-300",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {card.label}
                </span>
                <card.icon className={`h-4 w-4 ${card.accent}`} />
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-100">{card.value}</div>
            </div>
          ))}
        </section>

        {overview?.recent_activities?.length ? (
          <section className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Activity className="h-4 w-4 text-cyan-300" />
              Recent Activity
            </div>
            <div className="space-y-3">
              {overview.recent_activities.slice(0, 4).map((activity, index) => (
                <article
                  key={`${activity.event ?? "activity"}-${index}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">
                      {activity.detail ?? activity.event ?? "Activity"}
                    </p>
                    <span className="text-xs text-slate-500">
                      {activity.created_at ? new Date(activity.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {activity.actor ? `Actor: ${activity.actor}` : "System event"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* New submission form */}
        {showForm && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h2 className="mb-4 text-sm font-semibold text-amber-300">New Bug Bounty Submission</h2>
            <form
              onSubmit={(e) => void handleSubmitReport(e)}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Program</label>
                <select
                  value={formProgramId}
                  onChange={(e) => setFormProgramId(e.target.value)}
                  required
                  aria-label="Bug bounty program"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-500/50"
                >
                  <option value="">— select a program —</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Severity</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value)}
                  aria-label="Bug severity"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-amber-500/50"
                >
                  {["critical", "high", "medium", "low", "info"].map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs text-slate-400">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Vulnerability title…"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs text-slate-400">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Steps to reproduce, impact, PoC…"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim() || !formProgramId}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bug className="h-4 w-4" />
                  )}
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-800">
          {(["programs", "submissions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "px-4 py-2 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-b-2 border-amber-400 text-amber-300"
                  : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Programs tab */}
        {activeTab === "programs" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search programs…"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/50"
              />
            </div>

            {loadingPrograms ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center text-sm text-slate-500">
                {searchQuery ? "No programs match your search." : "No programs available."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPrograms.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onSelect={(id) => {
                      setFormProgramId(id);
                      setShowForm(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submissions tab */}
        {activeTab === "submissions" && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 py-12 text-center text-sm text-slate-500">
                No submissions yet. Select a program and create your first report.
              </div>
            ) : (
              <ul className="space-y-2">
                {submissions.map((sub) => {
                  const StatusIcon = STATUS_ICON[sub.status];
                  const sevClass = SEVERITY_COLORS[sub.severity] ?? SEVERITY_COLORS.info;
                  const nextStatuses = STATUS_FLOW[sub.status];
                  const selectedStatus = statusUpdates[sub.id] ?? nextStatuses[0] ?? sub.status;
                  return (
                    <li
                      key={sub.id}
                      className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm lg:flex-row lg:items-start lg:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded border px-2 py-0.5 text-xs font-medium capitalize ${sevClass}`}
                          >
                            {sub.severity}
                          </span>
                          <p className="truncate text-sm font-medium text-slate-200">{sub.title}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {sub.program_name ?? sub.program_id} ·{" "}
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex min-w-[16rem] shrink-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 lg:max-w-[20rem]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 rounded-full bg-slate-800 px-2.5 py-1 text-xs capitalize text-slate-300">
                            <StatusIcon
                              className={`h-3 w-3 ${sub.status === "submitted" ? "animate-spin" : ""}`}
                            />
                            {sub.status}
                          </span>
                          {sub.reward !== undefined ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                              <DollarSign className="h-3 w-3" />
                              {sub.reward}
                            </span>
                          ) : null}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-xs text-slate-400 sm:col-span-2">
                            Move to status
                            <select
                              value={selectedStatus}
                              onChange={(event) =>
                                setStatusUpdates((prev) => ({
                                  ...prev,
                                  [sub.id]: event.target.value as BugBountySubmission["status"],
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50"
                            >
                              {nextStatuses.length === 0 ? (
                                <option value={sub.status}>No further transitions</option>
                              ) : null}
                              {nextStatuses.map((option) => (
                                <option key={option} value={option}>
                                  {option.charAt(0).toUpperCase() + option.slice(1)}
                                </option>
                              ))}
                            </select>
                          </label>

                          {selectedStatus === "paid" ? (
                            <label className="text-xs text-slate-400 sm:col-span-2">
                              Payout amount
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={rewardInputs[sub.id] ?? String(sub.reward ?? "")}
                                onChange={(event) =>
                                  setRewardInputs((prev) => ({
                                    ...prev,
                                    [sub.id]: event.target.value,
                                  }))
                                }
                                placeholder="Enter payout amount"
                                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/50"
                              />
                            </label>
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingSubmissionId === sub.id || selectedStatus === sub.status}
                            onClick={() => void updateSubmissionStatus(sub)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingSubmissionId === sub.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                            Apply Change
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Program card                                                                 */
/* -------------------------------------------------------------------------- */

function ProgramCard({
  program,
  onSelect,
}: {
  program: BugBountyProgram;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-200">{program.name}</p>
          <p className="text-xs text-slate-500">{program.platform}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${program.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-500"}`}
          >
            {program.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {program.max_reward > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-400">
          <DollarSign className="h-3.5 w-3.5" />
          Up to {program.max_reward.toLocaleString()} {program.currency}
        </p>
      )}

      {/* Scope accordion */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {program.scope.length} scope item{program.scope.length !== 1 ? "s" : ""}
      </button>
      {expanded && (
        <ul className="mt-1 space-y-0.5">
          {program.scope.map((s, i) => (
            <li key={i} className="truncate font-mono text-xs text-slate-400">
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <a
          href={program.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-600"
        >
          <ExternalLink className="h-3 w-3" />
          View Program
        </a>
        <button
          onClick={() => onSelect(program.id)}
          className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-xs text-amber-300 transition-colors hover:bg-amber-500/30"
        >
          <Bug className="h-3 w-3" />
          Submit Report
        </button>
      </div>
    </div>
  );
}
