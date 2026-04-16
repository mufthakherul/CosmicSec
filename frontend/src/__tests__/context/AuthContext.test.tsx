import { render, screen, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../context/AuthContext";

function AuthProbe() {
  const { isAuthenticated, token, user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? "authenticated" : "anonymous"}</div>
      <div data-testid="token">{token ?? "none"}</div>
      <div data-testid="user">{user?.email ?? "none"}</div>
      <button
        type="button"
        onClick={() =>
          login("token-123", {
            id: "u-1",
            email: "tester@cosmicsec.dev",
            full_name: "Test User",
            role: "analyst",
          })
        }
      >
        Login
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts unauthenticated when storage is empty", () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("hydrates from localStorage on initial render", () => {
    localStorage.setItem("cosmicsec_token", "persisted-token");
    localStorage.setItem(
      "cosmicsec_user",
      JSON.stringify({
        id: "persisted-id",
        email: "persisted@cosmicsec.dev",
        full_name: "Persisted User",
        role: "admin",
      }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("token")).toHaveTextContent("persisted-token");
    expect(screen.getByTestId("user")).toHaveTextContent("persisted@cosmicsec.dev");
  });

  it("persists login and clears storage on logout", () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
    expect(localStorage.getItem("cosmicsec_token")).toBe("token-123");
    expect(localStorage.getItem("cosmicsec_user")).toContain("tester@cosmicsec.dev");

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous");
    expect(localStorage.getItem("cosmicsec_token")).toBeNull();
    expect(localStorage.getItem("cosmicsec_user")).toBeNull();
  });
});
