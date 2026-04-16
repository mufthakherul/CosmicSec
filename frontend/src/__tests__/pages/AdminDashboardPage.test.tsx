import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminDashboardPage } from "../../pages/AdminDashboardPage";

const alertMock = vi.fn();

class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  close = vi.fn();
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? "GET";

  if (url.includes("/api/admin/users") && method === "GET") {
    return new Response(JSON.stringify({ items: [{ email: "admin@cosmicsec.dev", role: "admin" }] }), { status: 200 });
  }
  if (url.includes("/api/admin/audit-logs")) {
    return new Response(JSON.stringify({ items: [{ timestamp: "2026-01-01", action: "login", actor: "admin", detail: "ok" }] }), { status: 200 });
  }
  if (url.includes("/api/admin/config")) {
    return new Response(JSON.stringify({ config: { mode: "strict" } }), { status: 200 });
  }
  if (url.includes("/api/admin/users") && method === "POST") {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (url.includes("/api/admin/roles/assign")) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return new Response(JSON.stringify({}), { status: 200 });
});

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    globalThis.alert = alertMock;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  it("renders dashboard heading and loaded user data", async () => {
    render(<AdminDashboardPage />);
    expect(screen.getByRole("heading", { name: /advanced admin dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText(/admin@cosmicsec\.dev/i)).toBeInTheDocument();
  });

  it("creates a user and shows temporary password alert", async () => {
    render(<AdminDashboardPage />);

    fireEvent.change(screen.getByPlaceholderText(/new user email/i), {
      target: { value: "new@cosmicsec.dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(alertMock).toHaveBeenCalled();
    });
  });

  it("toggles module state labels", async () => {
    render(<AdminDashboardPage />);
    await screen.findByText(/admin@cosmicsec\.dev/i);
    const aiToggle = screen.getByRole("button", { name: /ai: enabled/i });
    fireEvent.click(aiToggle);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /ai: disabled/i })).toBeInTheDocument();
    });
  });
});
