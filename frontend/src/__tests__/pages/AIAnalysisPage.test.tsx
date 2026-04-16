import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AIAnalysisPage } from "../../pages/AIAnalysisPage";

const addNotification = vi.fn();

vi.mock("../../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../store/notificationStore", () => ({
  useNotificationStore: (selector: (s: { addNotification: typeof addNotification }) => unknown) =>
    selector({ addNotification }),
}));

vi.mock("../../store/scanStore", () => ({
  useScanStore: () => ({
    scans: [
      {
        id: "scan-1",
        target: "example.com",
        findings: [
          {
            id: "f1",
            title: "Open SSH",
            severity: "high",
            description: "SSH port exposed",
            evidence: "",
            tool: "nmap",
            target: "example.com",
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
  }),
}));

describe("AIAnalysisPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("cosmicsec_token", "token-123");
  });

  it("renders disabled submit button when input is empty", () => {
    render(<AIAnalysisPage />);
    expect(screen.getByRole("button", { name: /run analysis/i })).toBeDisabled();
  });

  it("loads findings from selected scan", () => {
    render(<AIAnalysisPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "scan-1" } });

    expect(screen.getByRole("textbox")).toHaveValue("[HIGH] Open SSH: SSH port exposed");
  });

  it("submits analysis and renders results", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            summary: "High risk exposure",
            risk_score: 84,
            recommendations: ["Restrict SSH access"],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            mappings: [{ technique_id: "T1078", technique_name: "Valid Accounts", tactic: "Initial Access" }],
          }),
          { status: 200 },
        ),
      ) as unknown as typeof fetch;

    render(<AIAnalysisPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "[high] Open SSH: SSH port exposed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run analysis/i }));

    expect(await screen.findByText(/high risk exposure/i)).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText(/T1078/i)).toBeInTheDocument();
    expect(screen.getByText(/Restrict SSH access/i)).toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith({
      type: "success",
      message: "AI analysis complete.",
    });
  });

  it("shows error notification when request fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<AIAnalysisPage />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "[high] Open SSH: SSH port exposed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run analysis/i }));

    await waitFor(() => {
      expect(addNotification).toHaveBeenCalledWith({
        type: "error",
        message: "AI analysis request failed.",
      });
    });
  });
});
