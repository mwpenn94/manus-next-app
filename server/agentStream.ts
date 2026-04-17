/**
 * Agentic Stream Handler
 *
 * Transforms the simple single-shot LLM call into a multi-turn agentic loop:
 * 1. Send user message + tool definitions to LLM
 * 2. If LLM returns tool_calls, execute each tool server-side
 * 3. Stream tool execution progress as SSE events
 * 4. Feed tool results back to LLM for next turn
 * 5. Repeat until LLM produces a final text response (no more tool_calls)
 *
 * SSE Event Types:
 * - data: { delta: string }         — Text content chunk
 * - data: { tool_start: {...} }     — Tool execution beginning
 * - data: { tool_result: {...} }    — Tool execution completed
 * - data: { image: string }         — Generated image URL (inline display)
 * - data: { done: true, content }   — Stream complete
 * - data: { error: string }         — Error occurred
 */
import type { Message, Tool, ToolCall, InvokeResult } from "./_core/llm";
import { AGENT_TOOLS, executeTool, type ToolResult } from "./agentTools";
import type { Response } from "express";

const MAX_TOOL_TURNS = 8; // Prevent infinite loops

const DEFAULT_SYSTEM_PROMPT = `You are Manus Next, an advanced AI agent. You don't just answer questions — you take action.

You have access to these tools:
- **web_search**: Search the web for current information, news, and research
- **generate_image**: Create images from text descriptions
- **analyze_data**: Analyze structured data and produce insights
- **execute_code**: Run JavaScript code for calculations and data processing

When a user asks you to do something:
1. Think about what tools you need to accomplish the task
2. Use tools proactively — don't just describe what you would do
3. Combine multiple tools when needed (e.g., search then analyze)
4. Present results clearly with the tool outputs integrated into your response

Be proactive, thorough, and action-oriented. Show your work by using tools rather than just talking about what you could do.`;

export interface AgentStreamOptions {
  messages: Message[];
  taskExternalId?: string;
  resolvedSystemPrompt?: string | null;
  safeWrite: (data: string) => boolean;
  safeEnd: () => void;
  /** Optional callback when an artifact is produced (for workspace persistence) */
  onArtifact?: (artifact: {
    type: string;
    label: string;
    content?: string;
    url?: string;
  }) => void;
}

function sendSSE(safeWrite: (d: string) => boolean, event: Record<string, unknown>): boolean {
  return safeWrite(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Run the agentic streaming loop
 */
export async function runAgentStream(options: AgentStreamOptions): Promise<void> {
  const { messages, resolvedSystemPrompt, safeWrite, safeEnd, onArtifact } = options;

  try {
    const { invokeLLM } = await import("./_core/llm");

    // Build conversation with system prompt
    let conversation: Message[] = [...messages];

    // Inject or replace system prompt
    const systemPrompt = resolvedSystemPrompt || DEFAULT_SYSTEM_PROMPT;
    if (conversation.length > 0 && conversation[0].role === "system") {
      conversation[0] = { role: "system", content: systemPrompt };
    } else {
      conversation = [{ role: "system", content: systemPrompt }, ...conversation];
    }

    let turn = 0;
    let finalContent = "";

    while (turn < MAX_TOOL_TURNS) {
      turn++;
      console.log(`[Agent] Turn ${turn}/${MAX_TOOL_TURNS}, messages: ${conversation.length}`);

      // Call LLM with tools
      const response: InvokeResult = await invokeLLM({
        messages: conversation,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices?.[0];
      if (!choice) {
        sendSSE(safeWrite, { error: "No response from LLM" });
        break;
      }

      const assistantMessage = choice.message;
      const toolCalls = assistantMessage.tool_calls;
      const textContent = typeof assistantMessage.content === "string" ? assistantMessage.content : "";

      // If there's text content, stream it immediately
      if (textContent) {
        // Stream in sentence chunks for natural feel
        const sentencePattern = /([^.!?\n]+[.!?\n]+\s*)/g;
        const chunks = textContent.match(sentencePattern) || [textContent];
        const captured = chunks.join("");
        if (captured.length < textContent.length) {
          chunks.push(textContent.slice(captured.length));
        }
        for (const chunk of chunks) {
          if (!sendSSE(safeWrite, { delta: chunk })) return;
        }
        finalContent += textContent;
      }

      // If no tool calls, we're done
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      // Add assistant message with tool_calls to conversation
      conversation.push({
        role: "assistant",
        content: textContent || "",
        // @ts-ignore - tool_calls is part of the message but not in our Message type
        tool_calls: toolCalls,
      } as any);

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        // Parse args for display
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(toolArgs);
        } catch { /* ignore */ }

        // Send tool_start event
        sendSSE(safeWrite, {
          tool_start: {
            id: toolCall.id,
            name: toolName,
            args: parsedArgs,
            display: getToolDisplayInfo(toolName, parsedArgs),
          },
        });

        // Execute the tool
        console.log(`[Agent] Executing tool: ${toolName}`, parsedArgs);
        const result: ToolResult = await executeTool(toolName, toolArgs);

        // Send tool_result event
        sendSSE(safeWrite, {
          tool_result: {
            id: toolCall.id,
            name: toolName,
            success: result.success,
            preview: result.result.slice(0, 500),
            url: result.url,
          },
        });

        // If it's an image, send a special image event for inline display
        if (result.url && toolName === "generate_image") {
          sendSSE(safeWrite, { image: result.url });
        }

        // Persist artifact if callback provided
        if (onArtifact && result.artifactType) {
          onArtifact({
            type: result.artifactType,
            label: result.artifactLabel || toolName,
            content: result.artifactType === "terminal" ? result.result : undefined,
            url: result.url,
          });
        }

        // Add tool result to conversation for next LLM turn
        conversation.push({
          role: "tool",
          content: result.result,
          tool_call_id: toolCall.id,
          name: toolName,
        });
      }

      // If finish_reason is "stop", the LLM is done even with tool calls
      if (choice.finish_reason === "stop" && !toolCalls.length) {
        break;
      }
    }

    if (turn >= MAX_TOOL_TURNS) {
      console.log("[Agent] Max tool turns reached");
      sendSSE(safeWrite, {
        delta: "\n\n*[Reached maximum number of tool execution steps]*",
      });
      finalContent += "\n\n*[Reached maximum number of tool execution steps]*";
    }

    // Send done event
    sendSSE(safeWrite, { done: true, content: finalContent });
    safeEnd();
    console.log("[Agent] Stream complete after", turn, "turns");
  } catch (err: any) {
    console.error("[Agent] Error:", err);
    sendSSE(safeWrite, { error: err.message || "Agent execution failed" });
    safeEnd();
  }
}

/**
 * Get human-readable display info for a tool call
 */
function getToolDisplayInfo(
  toolName: string,
  args: any
): { type: string; label: string } {
  switch (toolName) {
    case "web_search":
      return { type: "searching", label: `Searching "${args.query}"` };
    case "generate_image":
      return { type: "generating", label: `Generating image: ${(args.prompt || "").slice(0, 60)}...` };
    case "analyze_data":
      return { type: "thinking", label: `Analyzing data (${args.analysis_type})` };
    case "execute_code":
      return { type: "executing", label: args.description || "Running code" };
    default:
      return { type: "thinking", label: `Using ${toolName}` };
  }
}
