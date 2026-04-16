import { fireEvent, render, screen } from "@testing-library/react";
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

global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ScanPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("ScanPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    useScanStore.setState({ scans: [], activeScan: null, _hydrated: true });
  });

  it("renders the target input field", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/example\.com|target/i)).toBeInTheDocument();
  });

  it("renders scan type options", () => {
    renderPage();
    expect(screen.getByText(/quick/i)).toBeInTheDocument();
    expect(screen.getByText(/full/i)).toBeInTheDocument();
  });

  it("renders tool checkboxes", () => {
    renderPage();
    expect(screen.getByText(/nmap/i)).toBeInTheDocument();
    expect(screen.getByText(/nuclei/i)).toBeInTheDocument();
  });

  it("shows a scans heading", async () => {
    renderPage();
    // Use findByRole with level:1 to get just the h1
    expect(await screen.findByRole("heading", { level: 1, name: /scans/i })).toBeInTheDocument();
  });

  it("does not submit when target is empty", async () => {
    renderPage();
    // The submit button text is "Launch Scan"
    const submitBtn = screen.getByRole("button", { name: /launch scan/i });
    fireEvent.click(submitBtn);
    // fetch should NOT be called since target is empty
    await vi.waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it("populates scan list from store", () => {
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
    renderPage();
    expect(screen.getByText(/example\.com/i)).toBeInTheDocument();
  });
});
