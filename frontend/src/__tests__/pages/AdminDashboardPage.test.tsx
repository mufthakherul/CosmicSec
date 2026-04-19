import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDashboardPage } from "../../pages/AdminDashboardPage";

const navigateMock = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    token: "test-token",
    user: {
      id: "admin-1",
      email: "admin@cosmicsec.dev",
      full_name: "Admin User",
      role: "admin",
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const alertMock = vi.fn();

class MockWebSocket {
  onmessage: ((event: MessageEvent) => void) | null = null;
  close = vi.fn();
}

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? "GET";

  if (url.includes("/api/admin/users") && method === "GET") {
    return new Response(
      JSON.stringify({ items: [{ email: "admin@cosmicsec.dev", role: "admin" }] }),
      { status: 200 },
    );
  }
  if (url.includes("/api/admin/audit-logs")) {
    return new Response(
      JSON.stringify({
        items: [{ timestamp: "2026-01-01", action: "login", actor: "admin", detail: "ok" }],
      }),
      { status: 200 },
    );
  }
  if (url.includes("/api/admin/config")) {
    return new Response(JSON.stringify({ config: { mode: "strict" } }), { status: 200 });
  }
  if (url.includes("/api/plugins") && method === "GET" && !url.includes("/api/plugins/audit")) {
    return new Response(
      JSON.stringify({
        plugins: [
          {
            name: "hunter",
            version: "1.0.0",
            description: "Plugin hunter",
            author: "team",
            tags: ["audit"],
            permissions: ["scan:read"],
            signature_verified: true,
            enabled: true,
          },
        ],
      }),
      { status: 200 },
    );
  }
  if (url.includes("/api/plugins/audit")) {
    return new Response(
      JSON.stringify({
        items: [
          {
            timestamp: "2026-01-01",
            action: "run",
            plugin: "hunter",
            detail: "target=example.com scan_id=scan-9 success=true",
            actor: "admin",
            actor_role: "admin",
            context: { scan_id: "scan-9", target: "example.com", success: true },
            status: "ok",
          },
        ],
        scope: "admin",
      }),
      { status: 200 },
    );
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
  function renderPage() {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    globalThis.alert = alertMock;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  it("renders dashboard heading and loaded user data", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /advanced admin dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText(/admin@cosmicsec\.dev/i)).toBeInTheDocument();
  });

  it("creates a user and shows temporary password alert", async () => {
    renderPage();

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
    renderPage();
    await screen.findByText(/admin@cosmicsec\.dev/i);
    const aiToggle = screen.getByRole("button", { name: /ai: enabled/i });
    fireEvent.click(aiToggle);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /ai: disabled/i })).toBeInTheDocument();
    });
  });

  it("links plugin audit entries to plugin and scan records", async () => {
    renderPage();
    await screen.findByRole("link", { name: /^hunter$/i });

    const pluginButton = screen.getAllByRole("button", { name: /^plugin$/i })[0];
    const scanButton = screen.getByRole("button", { name: /^scan$/i });

    fireEvent.click(pluginButton);
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/plugins/hunter");
      expect(navigateMock).toHaveBeenCalledWith("/scans/scan-9");
    });
  });
});
