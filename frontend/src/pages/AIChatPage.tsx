import { FormEvent, useMemo, useState } from "react";
import { BrainCircuit, Loader2, MessageSquare, Play, RotateCcw, ShieldAlert } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useNotificationStore } from "../store/notificationStore";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface AIQueryResponse {
  query: string;
  response_mode?: string;
  guidance?: string[];
  actions?: string[];
  source?: string;
  timestamp?: string;
  llm_response?: string | null;
  execution?: {
    client_type?: string;
    intent?: string;
    command?: string | null;
    executor?: string;
    should_execute?: boolean;
  };
  command_result?: {
    status?: string;
    command?: string;
    executor?: string;
    target?: string;
    reason?: string;
    result?: Record<string, unknown>;
  } | null;
  model?: {
    provider?: string;
    preferred_model?: string;
    active?: boolean;
    reason?: string;
  };
}

interface AIStreamEvent {
  type?: string;
  message?: string;
  detail?: string;
  guidance?: string;
  action?: string;
  delta?: string;
  execution?: AIQueryResponse["execution"];
  command_result?: AIQueryResponse["command_result"];
  payload?: AIQueryResponse;
}

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
        "AI service ready. Send natural language prompts. Command-like prompts are routed through AI service execution policy (web: server tools, cli: local tools).",
    },
  ]);

  const token = useMemo(() => localStorage.getItem("cosmicsec_token"), []);

  const appendMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role, content }]);
  };

  const appendMessageWithId = (role: ChatRole, content: string): string => {
    const id = nextId();
    setMessages((prev) => [...prev, { id, role, content }]);
    return id;
  };

  const updateMessage = (id: string, content: string) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, content } : msg)));
  };

  const formatAssistantReply = (payload: AIQueryResponse): string => {
    const blocks: string[] = [];
    const isCommandResponse = Boolean(payload.command_result?.status);

    if (payload.command_result?.status) {
      const result = payload.command_result.result ?? {};
      const scanId = typeof result.id === "string" ? result.id : undefined;

      blocks.push(
        [
          `Execution: ${payload.command_result.status}`,
          `Command: ${payload.command_result.command ?? payload.execution?.command ?? "n/a"}`,
          `Executor: ${payload.command_result.executor ?? payload.execution?.executor ?? "n/a"}`,
          `Target: ${payload.command_result.target ?? "n/a"}`,
          scanId ? `Scan ID: ${scanId}` : null,
          payload.command_result.reason ? `Reason: ${payload.command_result.reason}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );

      if (
        payload.command_result.command === "whois_lookup" ||
        payload.command_result.command === "recon_lookup"
      ) {
        const reconBody = result as {
          rdap?: { handle?: string; status?: string[]; nameservers?: string[]; error?: string };
        };
        if (reconBody.rdap) {
          blocks.push(
            [
              "Recon Summary:",
              `Handle: ${reconBody.rdap.handle ?? "n/a"}`,
              `Status: ${Array.isArray(reconBody.rdap.status) ? reconBody.rdap.status.join(", ") : "n/a"}`,
              `Nameservers: ${Array.isArray(reconBody.rdap.nameservers) ? reconBody.rdap.nameservers.join(", ") : "n/a"}`,
              reconBody.rdap.error ? `RDAP Error: ${reconBody.rdap.error}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          );
        }
      }
    }

    if (payload.llm_response && payload.llm_response.trim()) {
      blocks.push(`Model Response:\n${payload.llm_response.trim()}`);
    }

    if (!isCommandResponse) {
      const guidance = Array.isArray(payload.guidance) ? payload.guidance.slice(0, 6) : [];
      if (guidance.length > 0) {
        blocks.push(`Guidance:\n${guidance.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}`);
      }

      const actions = Array.isArray(payload.actions) ? payload.actions.slice(0, 6) : [];
      if (actions.length > 0) {
        blocks.push(`Actions:\n${actions.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}`);
      }
    }

    if (blocks.length === 0) {
      blocks.push(
        "No actionable output returned. Add target/context or use a command-style prompt.",
      );
    }

    return blocks.join("\n\n");
  };

  const applyStreamEvent = (current: AIQueryResponse, event: AIStreamEvent): AIQueryResponse => {
    if (event.type === "final" && event.payload) {
      return event.payload;
    }

    const guidance = current.guidance ? [...current.guidance] : [];
    const actions = current.actions ? [...current.actions] : [];
    const llmResponse = current.llm_response ?? "";

    if (event.type === "guidance" && event.guidance) {
      guidance.push(event.guidance);
    }

    if (event.type === "action" && event.action) {
      actions.push(event.action);
    }

    return {
      ...current,
      execution: event.execution ?? current.execution,
      command_result: event.command_result ?? current.command_result,
      guidance,
      actions,
      llm_response:
        event.type === "llm_chunk" && event.delta
          ? `${llmResponse}${event.delta}`
          : current.llm_response,
    };
  };

  const streamQuery = async (text: string, ctx: string, messageId: string) => {
    const res = await fetch(`${API}/api/ai/query/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CosmicSec-Client": "web",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: text,
        context: ctx.trim() || undefined,
        source: "web",
        preferred_model: "phi3:mini",
        enable_model_response: true,
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `AI stream failed with status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assembled: AIQueryResponse = { query: text };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let event: AIStreamEvent;
        try {
          event = JSON.parse(trimmed) as AIStreamEvent;
        } catch {
          continue;
        }

        if (event.type === "error") {
          throw new Error(event.detail || event.message || "AI streaming failed");
        }

        assembled = applyStreamEvent(assembled, event);
        updateMessage(messageId, formatAssistantReply(assembled));
      }
    }

    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim()) as AIStreamEvent;
        assembled = applyStreamEvent(assembled, event);
      } catch {
        // Ignore malformed trailing data from interrupted streams.
      }
    }

    updateMessage(messageId, formatAssistantReply(assembled));
  };

  const sendQuery = async (input: string, ctx = context) => {
    const text = input.trim();
    if (!text || loading) return;

    appendMessage("user", text);
    setQuery("");
    setLoading(true);
    const assistantMessageId = appendMessageWithId(
      "assistant",
      "Analyzing request and preparing live response...",
    );

    try {
      await streamQuery(text, ctx, assistantMessageId);
      addNotification({ type: "success", message: "AI response received." });
    } catch {
      updateMessage(
        assistantMessageId,
        "AI service request failed. Verify ai-service/api-gateway health and local model runtime if you expect model output.",
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
            Clean chat mode with AI-service orchestration and channel-aware execution.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                Optional Context
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={12}
                placeholder="Add supporting logs, findings, or constraints for better responses."
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

              {loading ? (
                <div className="mr-auto inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              ) : null}
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Example: whois lookup for mufthakherul.me domain"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Send
              </button>
              <button
                type="button"
                onClick={() => setMessages((prev) => prev.slice(0, 1))}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </form>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
