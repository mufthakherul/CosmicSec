import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { TimelinePage } from "../../pages/TimelinePage";

const navigateMock = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    token: "test-token",
    user: { id: "u-1", email: "admin@cosmicsec.dev", full_name: "Admin", role: "admin" },
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

vi.mock("../../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

describe("TimelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes("/api/scans")) {
        return jsonResponse([
          {
            id: "scan-9",
            target: "example.com",
            status: "completed",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            findings: [{ title: "Open redirect", severity: "medium", description: "test" }],
          },
        ]);
      }
      if (url.includes("/api/findings")) {
        return jsonResponse({
          items: [
            {
              id: "finding-1",
              title: "Example finding",
              severity: "high",
              description: "detail",
              source: "api",
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      if (url.includes("/api/plugins/audit")) {
        return jsonResponse({
          items: [
            {
              timestamp: new Date().toISOString(),
              action: "run",
              plugin: "hunter",
              detail: "target=example.com scan_id=scan-9 success=true",
              status: "ok",
              actor: "admin",
              actor_role: "admin",
              context: { scan_id: "scan-9", target: "example.com", success: true },
            },
          ],
        });
      }
      return jsonResponse([]);
    }) as typeof fetch;
  });

  it("renders plugin and scan drill-down links for timeline events", async () => {
    render(
      <MemoryRouter>
        <TimelinePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/event timeline/i)).toBeInTheDocument();
    const [scanButton] = await screen.findAllByRole("button", { name: /^scan$/i });
    const [pluginButton] = await screen.findAllByRole("button", { name: /^plugin$/i });

    fireEvent.click(scanButton);
    fireEvent.click(pluginButton);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/scans/scan-9");
      expect(navigateMock).toHaveBeenCalledWith("/plugins/hunter");
    });
  });
});
