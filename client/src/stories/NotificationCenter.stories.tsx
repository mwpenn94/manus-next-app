import type { Meta, StoryObj } from "@storybook/react";
import NotificationCenter from "@/components/NotificationCenter";

const meta: Meta<typeof NotificationCenter> = {
  title: "Components/NotificationCenter",
  component: NotificationCenter,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
