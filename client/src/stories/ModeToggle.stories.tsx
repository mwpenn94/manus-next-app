import type { Meta, StoryObj } from "@storybook/react";
import ModeToggle from "@/components/ModeToggle";
import type { AgentMode } from "@/components/ModeToggle";
import { useState } from "react";

const ModeToggleWrapper = () => {
  const [mode, setMode] = useState<AgentMode>("quality");
  return <ModeToggle mode={mode} onChange={setMode} />;
};

const meta: Meta = {
  title: "Components/ModeToggle",
  component: ModeToggleWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SpeedMode: Story = {
  render: () => {
    const [mode, setMode] = useState<AgentMode>("speed");
    return <ModeToggle mode={mode} onChange={setMode} />;
  },
};

export const MaxMode: Story = {
  render: () => {
    const [mode, setMode] = useState<AgentMode>("max");
    return <ModeToggle mode={mode} onChange={setMode} />;
  },
};

export const LimitlessMode: Story = {
  render: () => {
    const [mode, setMode] = useState<AgentMode>("limitless");
    return <ModeToggle mode={mode} onChange={setMode} />;
  },
};
