import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormInput } from "../components/FormInput";

const meta: Meta<typeof FormInput> = {
  title: "Forms/FormInput",
  component: FormInput,
  parameters: {
    layout: "centered",
  },
  render: (args) => (
    <div className="w-90 bg-slate-950 p-4">
      <FormInput {...args} />
    </div>
  ),
  args: {
    label: "Target URL",
    placeholder: "https://example.com",
  },
};

export default meta;
type Story = StoryObj<typeof FormInput>;

export const Empty: Story = {};

export const Filled: Story = {
  args: {
    defaultValue: "https://acme.internal",
    helperText: "We will validate SSL, DNS, and open ports.",
  },
};

export const Error: Story = {
  args: {
    defaultValue: "acme.internal",
    error: "Please enter a valid URL with protocol.",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "https://readonly.example",
    disabled: true,
  },
};
