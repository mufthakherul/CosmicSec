import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { AuthProvider } from "../context/AuthContext";

function SeededAuth({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.setItem("cosmicsec_token", "storybook-token");
    localStorage.setItem(
      "cosmicsec_user",
      JSON.stringify({
        id: "story-user",
        email: "admin@cosmicsec.local",
        full_name: "Storybook Admin",
        role: "admin",
      }),
    );
    return () => {
      localStorage.removeItem("cosmicsec_token");
      localStorage.removeItem("cosmicsec_user");
    };
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}

function SidebarHarness({ mobileOpen, collapsed }: { mobileOpen: boolean; collapsed: boolean }) {
  const [isCollapsed, setCollapsed] = useState(collapsed);
  return (
    <div className="relative min-h-[560px] bg-slate-950">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => undefined}
        collapsed={isCollapsed}
        onCollapsedChange={setCollapsed}
      />
    </div>
  );
}

const meta: Meta<typeof SidebarHarness> = {
  title: "Layout/Sidebar",
  component: SidebarHarness,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SeededAuth>
          <Story />
        </SeededAuth>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarHarness>;

export const Expanded: Story = {
  args: {
    mobileOpen: true,
    collapsed: false,
  },
};

export const Collapsed: Story = {
  args: {
    mobileOpen: true,
    collapsed: true,
  },
};
