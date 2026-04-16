import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanCard } from "../components/ScanCard";

const meta: Meta<typeof ScanCard> = {
  title: "Cards/ScanCard",
  component: ScanCard,
  parameters: {
    layout: "centered",
  },
  render: (args) => (
    <div className="w-[360px] bg-slate-950 p-4">
      <ScanCard {...args} />
    </div>
  ),
  args: {
    target: "api.cosmicsec.dev",
    tool: "Nuclei + Custom templates",
    findings: 7,
    startedAt: "2m ago",
  },
};

export default meta;
type Story = StoryObj<typeof ScanCard>;

export const Running: Story = {
  args: {
    status: "running",
  },
};

export const Completed: Story = {
  args: {
    status: "completed",
    findings: 2,
  },
};

export const Failed: Story = {
  args: {
    status: "failed",
    findings: 0,
  },
};
