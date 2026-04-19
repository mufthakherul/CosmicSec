import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SpecializedPanelsPage } from "../../pages/SpecializedPanelsPage";
import type { ReactNode } from "react";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      email: "admin@cosmicsec.dev",
      full_name: "Admin User",
      role: "admin",
    },
    token: "test-token",
    refreshToken: null,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    updateTokens: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../../components/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("SpecializedPanelsPage", () => {
  it("renders premium operator panels and links", () => {
    render(
      <MemoryRouter>
        <SpecializedPanelsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /one command surface for pentest, soc, recon, and bounty workflows\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /launch scan/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open soc/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review bounty/i })).toBeInTheDocument();
    expect(screen.getByText(/quick launch playbooks/i)).toBeInTheDocument();
    expect(screen.getByText(/deep web pentest/i)).toBeInTheDocument();
    expect(screen.getByText(/onion stealth recon/i)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "Role: admin")).toBeInTheDocument();

    const pinButton = screen.getAllByRole("button", { name: /^pin$/i })[0];
    fireEvent.click(pinButton);
    expect(screen.getByRole("button", { name: /^unpin$/i })).toBeInTheDocument();
  });
});
