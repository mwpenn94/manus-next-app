import type { Meta, StoryObj } from "@storybook/react";
import { ManusDialog } from "@/components/ManusDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const ManusDialogWrapper = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <ManusDialog open={open} onOpenChange={setOpen} onLogin={() => alert("Login clicked")} />
    </>
  );
};

const meta: Meta = {
  title: "Components/ManusDialog",
  component: ManusDialogWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
