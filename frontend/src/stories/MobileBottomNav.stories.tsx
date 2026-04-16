import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { MobileBottomNav } from "../components/MobileBottomNav";

const meta: Meta<typeof MobileBottomNav> = {
  title: "Navigation/MobileBottomNav",
  component: MobileBottomNav,
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/dashboard"]}>
        <div className="min-h-[420px] bg-slate-950">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MobileBottomNav>;

export const Default: Story = {};
