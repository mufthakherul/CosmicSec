import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "../components/Header";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

function SeededProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.setItem("cosmicsec_token", "storybook-token");
    localStorage.setItem(
      "cosmicsec_user",
      JSON.stringify({
        id: "story-user",
        email: "operator@cosmicsec.local",
        full_name: "Storybook Operator",
        role: "admin",
      }),
    );
    return () => {
      localStorage.removeItem("cosmicsec_token");
      localStorage.removeItem("cosmicsec_user");
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SeededProviders>
          <div className="min-h-45 bg-slate-950 p-4">
            <Story />
          </div>
        </SeededProviders>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {};
