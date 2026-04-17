import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ReconPage } from "../../pages/ReconPage";

const addNotification = vi.fn();

vi.mock("../../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../store/notificationStore", () => ({
  useNotificationStore: (selector: (s: { addNotification: typeof addNotification }) => unknown) =>
    selector({ addNotification }),
}));

const SAMPLE_RESULT = {
  target: "example.com",
  timestamp: "2026-01-01T00:00:00Z",
  dns: { ips: ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"], errors: [] },
  shodan: { enabled: true, subdomains: ["mail.example.com"], data_preview: [{}] },
  virustotal: { enabled: true, analysis_stats: { harmless: 70, malicious: 2, suspicious: 0 } },
  crtsh: { enabled: true, subdomains: ["www.example.com", "api.example.com"] },
  rdap: {
    enabled: true,
    handle: "EXAMPLE-NET",
    status: ["active"],
    nameservers: ["ns1.example.com"],
  },
};

describe("ReconPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("cosmicsec_token", "tok");
  });

  it("renders empty state when no results", () => {
    render(<ReconPage />);
    expect(screen.getByText(/enter a target above to begin reconnaissance/i)).toBeInTheDocument();
  });

  it("renders search input and submit button", () => {
    render(<ReconPage />);
    expect(screen.getByPlaceholderText(/target domain or ip/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run recon/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while request is in flight", async () => {
    let resolvePromise!: (value: Response) => void;
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((res) => {
          resolvePromise = res;
        }),
    ) as unknown as typeof fetch;

    render(<ReconPage />);
    fireEvent.change(screen.getByPlaceholderText(/target domain or ip/i), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run recon/i }));

    // While in-flight the skeleton panels appear
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    // Resolve so the component doesn't leak an async state update
    resolvePromise(new Response(JSON.stringify(SAMPLE_RESULT), { status: 200 }));
    await waitFor(() => expect(addNotification).toHaveBeenCalled());
  });

  it("renders DNS IPs in result panels after successful recon", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE_RESULT), { status: 200 }),
      ) as unknown as typeof fetch;

    render(<ReconPage />);
    fireEvent.change(screen.getByPlaceholderText(/target domain or ip/i), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run recon/i }));

    expect(await screen.findByText(/93\.184\.216\.34/)).toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Recon complete for example.com",
    });
  });

  it("renders RDAP and VirusTotal section labels", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE_RESULT), { status: 200 }),
      ) as unknown as typeof fetch;

    render(<ReconPage />);
    fireEvent.change(screen.getByPlaceholderText(/target domain or ip/i), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run recon/i }));

    // CollapsiblePanel headings
    expect(await screen.findByText(/rdap registration/i)).toBeInTheDocument();
    expect(screen.getByText(/virustotal analysis/i)).toBeInTheDocument();
  });

  it("shows error notification when fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("net fail")) as unknown as typeof fetch;

    render(<ReconPage />);
    fireEvent.change(screen.getByPlaceholderText(/target domain or ip/i), {
      target: { value: "bad-host.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run recon/i }));

    await waitFor(() => {
      expect(addNotification).toHaveBeenCalledWith({
        type: "error",
        message: "Recon request failed. Check API connection.",
      });
    });
  });

  it("does not submit when target is empty (required guard)", () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    render(<ReconPage />);
    // do NOT type into the input — leave it blank
    fireEvent.click(screen.getByRole("button", { name: /run recon/i }));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("renders Export JSON button after results load", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(SAMPLE_RESULT), { status: 200 }),
      ) as unknown as typeof fetch;

    render(<ReconPage />);
    fireEvent.change(screen.getByPlaceholderText(/target domain or ip/i), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run recon/i }));

    expect(await screen.findByRole("button", { name: /export json/i })).toBeInTheDocument();
  });
});
