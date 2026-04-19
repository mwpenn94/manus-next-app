import type { Meta, StoryObj } from "@storybook/react";
import MobileBottomNav from "@/components/MobileBottomNav";

const meta: Meta<typeof MobileBottomNav> = {
  title: "Components/MobileBottomNav",
  component: MobileBottomNav,
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
