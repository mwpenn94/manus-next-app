import type { Meta, StoryObj } from "@storybook/react";
import ErrorBoundary from "@/components/ErrorBoundary";

const ThrowError = () => {
  throw new Error("Test error for Storybook");
};

const meta: Meta<typeof ErrorBoundary> = {
  title: "Components/ErrorBoundary",
  component: ErrorBoundary,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const WithError: Story = {
  render: () => (
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  ),
};

export const WithoutError: Story = {
  render: () => (
    <ErrorBoundary>
      <div className="p-4 text-foreground">Normal content renders fine</div>
    </ErrorBoundary>
  ),
};
