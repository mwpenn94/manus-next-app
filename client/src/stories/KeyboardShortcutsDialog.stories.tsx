import type { Meta, StoryObj } from "@storybook/react";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog";
import { useState } from "react";

const KeyboardShortcutsWrapper = () => {
  const [open, setOpen] = useState(true);
  return <KeyboardShortcutsDialog open={open} onClose={() => setOpen(false)} />;
};

const meta: Meta = {
  title: "Components/KeyboardShortcutsDialog",
  component: KeyboardShortcutsWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button onClick={() => setOpen(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded">
          Open Shortcuts
        </button>
        <KeyboardShortcutsDialog open={open} onClose={() => setOpen(false)} />
      </div>
    );
  },
};
