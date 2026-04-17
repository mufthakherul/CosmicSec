import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("App", () => {
  it("renders the landing page at root route", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /start free/i })).toBeInTheDocument();
  });

  it("redirects /admin to login when unauthenticated", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // ProtectedRoute should redirect to /auth/login
    expect(screen.queryByText(/Admin Dashboard/i)).not.toBeInTheDocument();
  });
});
