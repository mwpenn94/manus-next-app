import type { Meta, StoryObj } from "@storybook/react";
import ModeToggle from "@/components/ModeToggle";
import { useState } from "react";

type AgentMode = "speed" | "quality" | "max";

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
