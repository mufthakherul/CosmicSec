import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageSkeleton } from "../components/PageSkeleton";

const meta: Meta<typeof PageSkeleton> = {
  title: "UI/PageSkeleton",
  component: PageSkeleton,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PageSkeleton>;

export const Default: Story = {};
