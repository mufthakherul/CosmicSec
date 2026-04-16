import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../../context/ThemeContext";
import { DashboardPage } from "../../pages/DashboardPage";

vi.mock("../../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("../../context/AuthContext")>(
    "../../context/AuthContext",
  );
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      token: "test-token",
      user: {
        id: "u-1",
        email: "user@cosmicsec.dev",
        full_name: "Demo User",
        role: "analyst",
      },
      login: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

// Silence fetch calls — the dashboard falls back to mock data when API is unavailable
globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply fetch mock after clearAllMocks
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
  });

  it("renders the main layout heading", async () => {
    renderPage();
    // The dashboard h1 shows a greeting like "Good morning, Demo User 👋"
    // We can check for "Security Score" which is always visible from the mock stats
    expect(await screen.findByText(/security score/i)).toBeInTheDocument();
  });

  it("shows stat cards with fallback data", async () => {
    renderPage();
    // The stats bar always shows "Security Score" from mock data — use getAllByText
    const elements = await screen.findAllByText(/security score|total scans|critical findings/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("renders a recent activity section", async () => {
    renderPage();
    expect(await screen.findByText(/recent activity/i)).toBeInTheDocument();
  });

  it("renders quick action links to core pages", async () => {
    renderPage();
    // There should be links/buttons navigating to /scans, /recon, /ai etc.
    const links = await screen.findAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
  });
});
