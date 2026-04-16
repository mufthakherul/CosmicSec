import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "../components/Pagination";

const meta: Meta<typeof Pagination> = {
  title: "UI/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

function PaginationPreview({ totalPages }: { totalPages: number }) {
  const [page, setPage] = useState(1);
  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}

export const FivePages: Story = {
  render: () => <PaginationPreview totalPages={5} />,
};

export const LargeRange: Story = {
  render: () => <PaginationPreview totalPages={24} />,
};
