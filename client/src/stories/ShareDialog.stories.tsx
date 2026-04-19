import type { Meta, StoryObj } from "@storybook/react";
import ShareDialog from "@/components/ShareDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const ShareDialogWrapper = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Share Dialog</Button>
      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        taskExternalId="demo-task-123"
        taskTitle="Demo Research Task"
      />
    </>
  );
};

const meta: Meta = {
  title: "Components/ShareDialog",
  component: ShareDialogWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
