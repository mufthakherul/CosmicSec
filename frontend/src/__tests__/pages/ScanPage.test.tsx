import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../../context/ThemeContext";
import { ScanPage } from "../../pages/ScanPage";
import { useScanStore } from "../../store/scanStore";

vi.mock("../../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("../../context/AuthContext")>(
    "../../context/AuthContext",
  );
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      token: "test-token",
      user: { id: "u-1", email: "user@cosmicsec.dev", full_name: "Demo User", role: "analyst" },
      login: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock("../../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

async function renderPage() {
  render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ScanPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
}

describe("ScanPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
    useScanStore.setState({ scans: [], activeScan: null, _hydrated: true });
  });

  it("renders the target input field", async () => {
    await renderPage();
    expect(screen.getByPlaceholderText(/example\.com|target/i)).toBeInTheDocument();
  });

  it("renders scan type options", async () => {
    await renderPage();
    expect(screen.getByText(/quick/i)).toBeInTheDocument();
    expect(screen.getByText(/full/i)).toBeInTheDocument();
  });

  it("renders tool checkboxes", async () => {
    await renderPage();
    expect(screen.getByText(/nmap/i)).toBeInTheDocument();
    expect(screen.getByText(/nuclei/i)).toBeInTheDocument();
  });

  it("shows a scans heading", async () => {
    await renderPage();
    // Use findByRole with level:1 to get just the h1
    expect(await screen.findByRole("heading", { level: 1, name: /scans/i })).toBeInTheDocument();
  });

  it("does not submit when target is empty", async () => {
    await renderPage();
    // The submit button text is "Launch Scan"
    const submitBtn = screen.getByRole("button", { name: /launch scan/i });
    fireEvent.click(submitBtn);
    // Page bootstrap may fetch existing scans; ensure no scan-create POST was sent.
    await vi.waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const postedToScans = calls.some(([url, init]) => {
        const requestUrl = String(url);
        const method = (init as RequestInit | undefined)?.method ?? "GET";
        return requestUrl.includes("/api/scans") && method.toUpperCase() === "POST";
      });
      expect(postedToScans).toBe(false);
    });
  });

  it("populates scan list from store", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "scan-1",
          target: "example.com",
          scan_types: ["network"],
          status: "completed",
          progress: 100,
          findings_count: 0,
          severity_breakdown: {},
          source: "web_scan",
          created_at: new Date().toISOString(),
        },
      ],
    } as Response);

    useScanStore.setState({
      scans: [
        {
          id: "scan-1",
          target: "example.com",
          tool: "nmap",
          status: "completed",
          progress: 100,
          findings: [],
          createdAt: new Date().toISOString(),
        },
      ],
      activeScan: null,
      _hydrated: true,
    });
    await renderPage();
    expect(screen.getByText(/^example\.com$/i)).toBeInTheDocument();
  });

  it("applies red team preset defaults from query parameters", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/scans?preset=redteam-chain"]}>
            <ScanPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const targetInput = await screen.findByPlaceholderText(/example\.com|target/i);
    expect(targetInput).toHaveValue("engagement-scope.local");
  });

  it("applies malware preset defaults from query parameters", async () => {
    render(
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/scans?preset=malware-surface"]}>
            <ScanPage />
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const targetInput = await screen.findByPlaceholderText(/example\.com|target/i);
    expect(targetInput).toHaveValue("suspicious-endpoint.local");
  });
});
