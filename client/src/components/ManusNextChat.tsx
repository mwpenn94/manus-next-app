/**
 * ManusNextChat — Reusable Embeddable Chat Component
 *
 * This component implements the public API defined in shared/ManusNextChat.types.ts.
 * It wraps the existing TaskView chat functionality into a self-contained,
 * theme-aware component that can be extracted into @mwpenn94/manus-next-core.
 *
 * Usage:
 *   import { ManusNextChat } from "@mwpenn94/manus-next-core";
 *   <ManusNextChat config={{ apiUrl: "/api/trpc" }} theme="manus-dark" />
 *
 * Or with ref for imperative control:
 *   const chatRef = useRef<ManusNextChatHandle>(null);
 *   <ManusNextChat ref={chatRef} config={...} />
 *   chatRef.current?.sendMessage("Hello");
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import type {
  ManusNextChatProps,
  ManusNextChatHandle,
  ChatMessage,
  AgentMode,
} from "@shared/ManusNextChat.types";
import { THEME_PRESETS } from "@shared/ManusNextChat.themes";
import { cn } from "@/lib/utils";
import { ArrowUp, Paperclip, Mic, Square, Volume2, Zap, Sparkles, Crown } from "lucide-react";

/**
 * Resolve theme from preset ID or custom theme object
 */
function resolveTheme(theme: ManusNextChatProps["theme"]) {
  if (!theme) return THEME_PRESETS["manus-dark"];
  if (typeof theme === "string") return THEME_PRESETS[theme] ?? THEME_PRESETS["manus-dark"];
  return theme;
}

/**
 * ManusNextChat — The reusable, embeddable chat component.
 *
 * Implements the full ManusNextChatProps interface with imperative handle
 * for programmatic control via ref.
 */
const ManusNextChat = forwardRef<ManusNextChatHandle, ManusNextChatProps>(
  (
    {
      config,
      theme: themeProp,
      initialMessages = [],
      events,
      className,
      style,
      showHeader = true,
      headerContent,
      placeholder = "Give Manus Next a task to work on...",
      loading = false,
      disabled = false,
    },
    ref
  ) => {
    const theme = resolveTheme(themeProp);
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [mode, setMode] = useState<AgentMode>(config.defaultMode ?? "quality");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    const scrollToBottom = useCallback(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, scrollToBottom]);

    // Auto-resize textarea
    useEffect(() => {
      const el = inputRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
      }
    }, [input]);

    // Imperative handle for external control
    useImperativeHandle(ref, () => ({
      sendMessage: (content: string) => {
        handleSend(content);
      },
      clearMessages: () => {
        setMessages([]);
      },
      getMessages: () => messages,
      setMode: (newMode: AgentMode) => {
        setMode(newMode);
        events?.onModeChange?.(newMode);
      },
      stopGeneration: () => {
        setIsStreaming(false);
        events?.onStop?.();
      },
      focusInput: () => {
        inputRef.current?.focus();
      },
      scrollToBottom,
    }));

    const handleSend = useCallback(
      (content?: string) => {
        const text = content ?? input.trim();
        if (!text || isStreaming || disabled) return;

        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsStreaming(true);
        events?.onSend?.(text);
        events?.onAgentStart?.();

        // In the extracted package, this would call config.apiUrl
        // For now, simulate the agent response pattern
        setTimeout(() => {
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "This is the ManusNextChat component shell. Connect to a real agent backend via `config.apiUrl` to enable full functionality.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsStreaming(false);
          events?.onAgentComplete?.(assistantMessage);
        }, 1000);
      },
      [input, isStreaming, disabled, events]
    );

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const modeIcon = mode === "speed" ? Zap : mode === "max" ? Crown : Sparkles;
    const ModeIcon = modeIcon;

    return (
      <div
        className={cn("flex flex-col h-full", className)}
        style={{
          ...style,
          "--mnc-primary": theme.colors.primary,
          "--mnc-bg": theme.colors.background,
          "--mnc-fg": theme.colors.foreground,
          "--mnc-muted": theme.colors.muted,
          "--mnc-border": theme.colors.border,
          "--mnc-card": theme.colors.card,
          fontFamily: theme.fontBody ?? "system-ui, sans-serif",
        } as React.CSSProperties}
      >
        {/* Header */}
        {showHeader && (
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              color: theme.colors.foreground,
            }}
          >
            {headerContent ?? (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: theme.colors.primaryForeground }} />
                </div>
                <span className="text-sm font-medium">Manus Next</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {(["speed", "quality", "max"] as AgentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    events?.onModeChange?.(m);
                  }}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md transition-colors capitalize",
                    mode === m ? "font-medium" : "opacity-60 hover:opacity-100"
                  )}
                  style={{
                    backgroundColor: mode === m ? theme.colors.primary : "transparent",
                    color: mode === m ? theme.colors.primaryForeground : theme.colors.foreground,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ backgroundColor: theme.colors.background }}
        >
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: theme.colors.mutedForeground }}>
                Start a conversation...
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                )}
                style={{
                  backgroundColor: msg.role === "user" ? theme.colors.primary : theme.colors.card,
                  color: msg.role === "user" ? theme.colors.primaryForeground : theme.colors.foreground,
                  border: msg.role === "assistant" ? `1px solid ${theme.colors.border}` : undefined,
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-4 py-2.5 text-sm rounded-bl-sm"
                style={{
                  backgroundColor: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.mutedForeground,
                }}
              >
                <div className="flex items-center gap-2">
                  <ModeIcon className="w-3.5 h-3.5 animate-pulse" />
                  <span>
                    {mode === "speed" ? "Processing..." : mode === "max" ? "Deep researching..." : "Thinking..."}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 pb-4 pt-2"
          style={{ backgroundColor: theme.colors.background }}
        >
          <div
            className="relative rounded-xl border"
            style={{
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isStreaming}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-10 text-sm leading-relaxed focus:outline-none min-h-[48px]"
              style={{ color: theme.colors.foreground }}
              aria-label="Chat input"
            />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {config.enableVoice !== false && (
                  <>
                    <button
                      className="p-1.5 rounded-md transition-colors opacity-60 hover:opacity-100"
                      style={{ color: theme.colors.foreground }}
                      aria-label="Attach file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-md transition-colors opacity-60 hover:opacity-100"
                      style={{ color: theme.colors.foreground }}
                      aria-label="Voice input"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </>
                )}
                {config.enableTTS !== false && (
                  <button
                    className="p-1.5 rounded-md transition-colors opacity-60 hover:opacity-100"
                    style={{ color: theme.colors.foreground }}
                    aria-label="Text to speech"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isStreaming ? (
                <button
                  onClick={() => {
                    setIsStreaming(false);
                    events?.onStop?.();
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.destructive, color: "#fff" }}
                  aria-label="Stop generation"
                >
                  <Square className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || disabled}
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center transition-opacity",
                    input.trim() && !disabled ? "opacity-100" : "opacity-40"
                  )}
                  style={{
                    backgroundColor: input.trim() && !disabled ? theme.colors.primary : theme.colors.muted,
                    color: input.trim() && !disabled ? theme.colors.primaryForeground : theme.colors.mutedForeground,
                  }}
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ManusNextChat.displayName = "ManusNextChat";

export default ManusNextChat;
export type { ManusNextChatProps, ManusNextChatHandle };
