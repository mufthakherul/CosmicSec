import { FormEvent, useMemo, useState } from "react";
import { BrainCircuit, Loader2, MessageSquare, Send, ShieldAlert, Sparkles } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useNotificationStore } from "../store/notificationStore";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

interface AIQueryResponse {
  query: string;
  response_mode?: string;
  guidance?: string[];
  actions?: string[];
  source?: string;
  timestamp?: string;
}

const STARTER_PROMPTS = [
  "Summarize my latest scan failures and likely root causes.",
  "Give me a prioritized remediation plan for high-risk findings.",
  "Create a hardening checklist for API gateway and recon service.",
  "Explain what to monitor for Tor and onion egress reliability.",
];

function nextId() {
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function AIChatPage() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: "assistant",
      content:
        "Security Copilot online. Ask about findings, recon data, exploit chains, defense-in-depth, or incident response playbooks.",
      createdAt: new Date().toISOString(),
    },
  ]);

  const token = useMemo(() => localStorage.getItem("cosmicsec_token"), []);

  const appendMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role,
        content,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const formatAssistantReply = (payload: AIQueryResponse): string => {
    const guidance = Array.isArray(payload.guidance) ? payload.guidance.slice(0, 6) : [];
    const actions = Array.isArray(payload.actions) ? payload.actions.slice(0, 6) : [];
    const chunks: string[] = [];

    if (guidance.length > 0) {
      chunks.push("Guidance:\n" + guidance.map((item, idx) => `${idx + 1}. ${item}`).join("\n"));
    }

    if (actions.length > 0) {
      chunks.push("Recommended Actions:\n" + actions.map((item, idx) => `${idx + 1}. ${item}`).join("\n"));
    }

    if (chunks.length === 0) {
      chunks.push("No structured guidance returned. Try adding more context from findings, logs, or target details.");
    }

    const source = payload.source ? `\n\nSource: ${payload.source}` : "";
    const mode = payload.response_mode ? ` | Mode: ${payload.response_mode}` : "";
    return chunks.join("\n\n") + source + mode;
  };

  const sendQuery = async (input: string, ctx = context) => {
    const text = input.trim();
    if (!text || loading) return;

    appendMessage("user", text);
    setLoading(true);
    setQuery("");

    try {
      const res = await fetch(`${API}/api/ai/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: text, context: ctx.trim() || undefined }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `AI query failed with status ${res.status}`);
      }

      const data = (await res.json()) as AIQueryResponse;
      appendMessage("assistant", formatAssistantReply(data));
      addNotification({ type: "success", message: "AI response received." });
    } catch {
      appendMessage(
        "assistant",
        "I could not reach the AI service right now. Verify gateway/AI health and try again.",
      );
      addNotification({ type: "error", message: "AI chat request failed." });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendQuery(query);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="rounded-2xl border border-cyan-900/40 bg-linear-to-r from-slate-900 via-slate-900 to-cyan-950/40 p-5">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-6 w-6 text-cyan-300" />
            <h1 className="text-2xl font-bold text-slate-100">AI Security Chat</h1>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Conversational cyber assistant for triage, remediation strategy, and security playbooks.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Prompt Starters
              </h2>
              <div className="space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendQuery(prompt)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                Optional Context
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={8}
                placeholder="Paste scan summaries, logs, stack traces, or threat intel for more precise responses."
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          <div className="flex min-h-155 flex-col rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm lg:col-span-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <MessageSquare className="h-4 w-4 text-cyan-300" />
              Conversation
            </div>

            <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={[
                    "max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-auto bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-500/30"
                      : "mr-auto bg-slate-800 text-slate-100 ring-1 ring-slate-700",
                  ].join(" ")}
                >
                  {message.content}
                </article>
              ))}
              {loading && (
                <div className="mr-auto inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating response...
                </div>
              )}
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about vulnerabilities, attack paths, mitigations, or SOC response..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </form>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
