import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import client from "../../api/client";
import { SettingsPage } from "../../pages/SettingsPage";

const addNotification = vi.fn();
const logout = vi.fn();
const setTheme = vi.fn();
const setHighContrast = vi.fn();
const setReducedMotion = vi.fn();

vi.mock("../../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../api/client", () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      email: "user@cosmicsec.dev",
      full_name: "Demo User",
      role: "admin",
    },
    logout,
  }),
}));

vi.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme,
    highContrast: false,
    reducedMotion: false,
    setHighContrast,
    setReducedMotion,
  }),
}));

vi.mock("../../store/notificationStore", () => ({
  useNotificationStore: (selector: (s: { addNotification: typeof addNotification }) => unknown) =>
    selector({ addNotification }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders account information from auth context", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/demo user/i)).toBeInTheDocument();
    expect(screen.getAllByText(/user@cosmicsec\.dev/i).length).toBeGreaterThan(0);
  });

  it("updates accessibility appearance toggles", () => {
    render(<SettingsPage />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(switches[1]);

    expect(setHighContrast).toHaveBeenCalledWith(true);
    expect(setReducedMotion).toHaveBeenCalledWith(true);
  });

  it("saves scan defaults through API client", async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: {} });
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /save defaults/i }));

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith("/api/settings/scan-defaults", {
        scan_timeout_seconds: 300,
        auto_analyze: true,
      });
      expect(addNotification).toHaveBeenCalledWith({
        type: "success",
        message: "Scan defaults saved.",
      });
    });
  });

  it("keeps delete action disabled until email confirmation matches", () => {
    render(<SettingsPage />);
    const deleteButton = screen.getByRole("button", { name: /^delete$/i });

    expect(deleteButton).toBeDisabled();
    expect(client.delete).not.toHaveBeenCalled();
    expect(addNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "Email confirmation does not match." }),
    );
  });

  it("enables two-factor authentication and shows success message", async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: {} });
    render(<SettingsPage />);

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[switches.length - 1]);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith("/api/auth/2fa/enable");
      expect(addNotification).toHaveBeenCalledWith({
        type: "success",
        message: "Two-factor authentication enabled.",
      });
    });
  });
});
