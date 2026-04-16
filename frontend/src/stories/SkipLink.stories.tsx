import type { Meta, StoryObj } from "@storybook/react-vite";
import { SkipLink } from "../components/ui/SkipLink";

const meta: Meta<typeof SkipLink> = {
  title: "Accessibility/SkipLink",
  component: SkipLink,
  parameters: {
    layout: "fullscreen",
  },
  render: () => (
    <div className="relative min-h-[220px] bg-slate-950 p-4 text-slate-200">
      <SkipLink />
      <p className="text-sm text-slate-400">
        Press <kbd className="rounded bg-slate-800 px-1 py-0.5">Tab</kbd> to reveal the skip link.
      </p>
      <main id="main-content" className="mt-20 rounded-lg border border-slate-800 p-4 text-sm">
        Main content target
      </main>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof SkipLink>;

export const Default: Story = {};
