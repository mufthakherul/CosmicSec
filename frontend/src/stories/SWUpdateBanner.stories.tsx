import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SWUpdateBanner } from "../components/SWUpdateBanner";

function SWUpdatePreview() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("cosmicsec:sw-update-available"));
  }, []);

  return (
    <div className="min-h-[220px] bg-slate-950 p-4">
      <SWUpdateBanner />
    </div>
  );
}

const meta: Meta<typeof SWUpdateBanner> = {
  title: "PWA/SWUpdateBanner",
  component: SWUpdateBanner,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SWUpdateBanner>;

export const Visible: Story = {
  render: () => <SWUpdatePreview />,
};
