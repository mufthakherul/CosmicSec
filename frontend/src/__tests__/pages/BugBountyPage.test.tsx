import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BugBountyPage } from "../../pages/BugBountyPage";

const addNotification = vi.fn();

vi.mock("../../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../store/notificationStore", () => ({
  useNotificationStore: (selector: (state: { addNotification: typeof addNotification }) => unknown) =>
    selector({ addNotification }),
}));

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

describe("BugBountyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem("cosmicsec_token", "test-token");

    globalThis.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.includes("/api/bugbounty/programs")) {
        return jsonResponse([
          {
            id: "program-1",
            name: "Acme Public Program",
            platform: "hackerone",
            url: "https://example.com",
            max_reward: 5000,
            currency: "USD",
            scope: ["acme.com"],
            active: true,
          },
        ]);
      }

      if (url.includes("/api/bugbounty/dashboard/overview")) {
        return jsonResponse({
          programs: 1,
          submissions: 1,
          threads: 0,
          pending_review: 1,
          paid_submissions: 0,
          total_paid: 0,
          average_payout: 0,
          status_breakdown: { draft: 1 },
          recent_activities: [],
          updated_at: new Date().toISOString(),
        });
      }

      if (url.includes("/api/bugbounty/submissions") && method === "GET") {
        return jsonResponse({
          items: [
            {
              submission_id: "sub-1",
              program_id: "program-1",
              program_name: "Acme Public Program",
              title: "Critical RCE",
              severity: "critical",
              status: "draft",
              reward_amount: 0,
              submitted_at: new Date().toISOString(),
            },
          ],
          total: 1,
          limit: 25,
          offset: 0,
        });
      }

      if (url.includes("/api/bugbounty/submissions/sub-1/status") && method === "PATCH") {
        return jsonResponse({
          submission_id: "sub-1",
          program_id: "program-1",
          program_name: "Acme Public Program",
          title: "Critical RCE",
          severity: "critical",
          status: "submitted",
          reward_amount: 0,
          submitted_at: new Date().toISOString(),
        });
      }

      return jsonResponse({});
    }) as typeof fetch;
  });

  it("renders overview metrics and allows status transitions", async () => {
    render(<BugBountyPage />);

    expect(await screen.findByText(/bug bounty/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /submissions/i }));
    expect(await screen.findByText(/critical rce/i)).toBeInTheDocument();

    const statusSelect = await screen.findByLabelText(/move to status/i);
    fireEvent.change(statusSelect, { target: { value: "submitted" } });
    fireEvent.click(screen.getByRole("button", { name: /apply change/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/bugbounty/submissions/sub-1/status"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    expect(addNotification).toHaveBeenCalled();
  });
});
