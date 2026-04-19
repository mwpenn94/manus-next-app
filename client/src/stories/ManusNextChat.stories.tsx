import type { Meta, StoryObj } from "@storybook/react";
import ManusNextChat from "@/components/ManusNextChat";
import type { ChatMessage } from "@shared/ManusNextChat.types";

const sampleMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Research the latest developments in AI agent architectures",
    timestamp: new Date("2026-04-18T10:00:00"),
  },
  {
    id: "2",
    role: "assistant",
    content:
      "I'll research the latest AI agent architectures for you. Let me search for recent developments...\n\nBased on my research, here are the key trends:\n\n1. **Context Engineering** — Moving beyond prompt engineering to full context management\n2. **Tool-Use Agents** — Agents that can browse, code, and execute autonomously\n3. **Multi-Agent Systems** — Orchestrating multiple specialized agents\n4. **Memory Systems** — Long-term memory for persistent context across sessions",
    timestamp: new Date("2026-04-18T10:01:00"),
    actions: [
      { type: "searching", status: "done", query: "AI agent architectures 2026" },
      { type: "browsing", status: "done", url: "https://arxiv.org" },
    ],
  },
];

const meta: Meta<typeof ManusNextChat> = {
  title: "Components/ManusNextChat",
  component: ManusNextChat,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    config: {
      apiUrl: "/api/trpc",
      enableVoice: true,
      enableTTS: true,
    },
    theme: "manus-dark",
    style: { height: "600px" },
  },
};

export const WithMessages: Story = {
  args: {
    config: {
      apiUrl: "/api/trpc",
      enableVoice: true,
      enableTTS: true,
    },
    theme: "manus-dark",
    initialMessages: sampleMessages,
    style: { height: "600px" },
  },
};

export const LightTheme: Story = {
  args: {
    config: {
      apiUrl: "/api/trpc",
      enableVoice: true,
      enableTTS: true,
    },
    theme: "manus-light",
    initialMessages: sampleMessages,
    style: { height: "600px" },
  },
};

export const StewardlyTheme: Story = {
  args: {
    config: {
      apiUrl: "/api/trpc",
      enableVoice: true,
      enableTTS: true,
    },
    theme: "stewardly-dark",
    initialMessages: sampleMessages,
    style: { height: "600px" },
  },
};

export const Disabled: Story = {
  args: {
    config: {
      apiUrl: "/api/trpc",
    },
    theme: "manus-dark",
    disabled: true,
    placeholder: "Chat is disabled",
    style: { height: "400px" },
  },
};

export const NoHeader: Story = {
  args: {
    config: {
      apiUrl: "/api/trpc",
    },
    theme: "manus-dark",
    showHeader: false,
    initialMessages: sampleMessages,
    style: { height: "500px" },
  },
};
