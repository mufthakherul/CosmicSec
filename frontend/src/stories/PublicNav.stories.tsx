import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { PublicNav } from "../components/PublicNav";

const meta: Meta<typeof PublicNav> = {
  title: "Navigation/PublicNav",
  component: PublicNav,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="min-h-[220px] bg-slate-950 p-4">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PublicNav>;

export const Default: Story = {};
