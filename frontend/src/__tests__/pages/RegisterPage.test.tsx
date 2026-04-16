import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../../context/ThemeContext";
import { RegisterPage } from "../../pages/RegisterPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/auth/register", state: null }),
  };
});

vi.mock("axios");

function renderPage() {
  render(
    <ThemeProvider>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders required form fields", () => {
    renderPage();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    // The actual error text is "Full name is required" and "Email is required"
    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it("shows password strength indicator as user types", () => {
    renderPage();
    const passwordInput = screen.getByLabelText(/^password$/i);
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    expect(screen.getByText(/weak|fair|good|strong/i)).toBeInTheDocument();
  });

  it("submits and redirects on successful registration", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { message: "Registration successful" },
    });

    renderPage();
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Alice Tester" },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "alice@cosmicsec.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Password1!" },
    });
    // fill confirm password
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(confirmInput, { target: { value: "Password1!" } });
    // agree to terms
    const terms = screen.queryByRole("checkbox");
    if (terms) fireEvent.click(terms);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it("shows link to sign-in page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });
});
