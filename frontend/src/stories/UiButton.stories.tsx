import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../components/ui/button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "Run Scan",
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    className: "bg-slate-700 hover:bg-slate-600",
    children: "Secondary",
  },
};

export const Danger: Story = {
  args: {
    className: "bg-rose-600 hover:bg-rose-500",
    children: "Delete",
  },
};

export const Ghost: Story = {
  args: {
    className: "bg-transparent border border-slate-500 text-slate-200 hover:bg-slate-800",
    children: "Ghost",
  },
};
