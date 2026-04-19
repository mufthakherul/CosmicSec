import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SpecializedPanelsPage } from "../../pages/SpecializedPanelsPage";
import type { ReactNode } from "react";

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
    expect(screen.getAllByRole("link", { name: /open panel/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/pentest command center/i)).toBeInTheDocument();
    expect(screen.getByText(/soc operations/i)).toBeInTheDocument();
    expect(screen.getByText(/bug bounty desk/i)).toBeInTheDocument();
  });
});
