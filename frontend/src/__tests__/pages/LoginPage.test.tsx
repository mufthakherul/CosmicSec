import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../../pages/LoginPage";
import { api } from "../../services/api";

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/auth/login", state: null }),
  };
});

vi.mock("../../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("../../context/AuthContext")>(
    "../../context/AuthContext",
  );
  return {
    ...actual,
    useAuth: () => ({ login: mockLogin }),
  };
});

vi.mock("../../services/api", () => ({
  api: {
    auth: {
      login: vi.fn(),
    },
  },
}));

describe("LoginPage", () => {
  const submitSignInButton = () => screen.getByRole("button", { name: /^sign in$/i });

  function renderPage() {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders required form controls", () => {
    renderPage();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(submitSignInButton()).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    renderPage();
    fireEvent.click(submitSignInButton());

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
  });

  it("submits credentials and redirects on success", async () => {
    vi.mocked(api.auth.login).mockResolvedValueOnce({
        token: "jwt-token",
        user: { id: "u1", email: "user@cosmicsec.dev", full_name: "User One", role: "user" },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@cosmicsec.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Password1" },
    });
    fireEvent.click(submitSignInButton());

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "jwt-token",
        expect.objectContaining({ id: "u1" }),
        expect.objectContaining({ remember: false }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("shows API error details on failed login", async () => {
    vi.mocked(api.auth.login).mockRejectedValueOnce(
      new AxiosError("Invalid credentials"),
    );

    renderPage();
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@cosmicsec.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Password1" },
    });
    fireEvent.click(submitSignInButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid/i);
  });
});
