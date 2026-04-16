import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios, { AxiosError } from "axios";
import { LoginPage } from "../../pages/LoginPage";

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

vi.mock("axios");

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders required form controls", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
  });

  it("submits credentials and redirects on success", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        token: "jwt-token",
        user: { id: "u1", email: "user@cosmicsec.dev", full_name: "User One", role: "user" },
      },
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@cosmicsec.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("jwt-token", expect.objectContaining({ id: "u1" }));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("shows API error details on failed login", async () => {
    const response = {
      data: { detail: "Invalid credentials" },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: {} as never,
    };
    vi.mocked(axios.post).mockRejectedValueOnce(
      new AxiosError("Request failed", "401", undefined, undefined, response),
    );

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@cosmicsec.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  });
});
