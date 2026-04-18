/**
 * Memory Auto-Extractor
 *
 * After a task completes, this module calls the LLM to extract key facts,
 * preferences, and notable information from the conversation. Extracted
 * memories are stored with source="auto" for cross-session recall.
 *
 * Runs fire-and-forget — failures are logged but never block the user.
 */

interface ConversationMessage {
  role: string;
  content: string;
}

interface ExtractedMemory {
  key: string;
  value: string;
}

const EXTRACTION_PROMPT = `Analyze this conversation and extract key facts, preferences, and notable information about the user that would be useful to remember for future conversations.

Rules:
- Extract 0-5 memories (only extract what's genuinely useful)
- Each memory has a short "key" (label, max 100 chars) and a "value" (detail, max 500 chars)
- Focus on: user preferences, goals, projects they're working on, technical stack, personal details they shared, decisions made
- Do NOT extract: generic conversation flow, tool results, temporary task details
- If the conversation is purely informational with no personal context, return an empty array
- Return ONLY valid JSON, no markdown fences

Return JSON array: [{"key": "...", "value": "..."}]
If nothing worth remembering, return: []`;

/**
 * Extract memories from a completed task conversation.
 * Fire-and-forget — catches all errors internally.
 */
export async function extractMemories(
  userId: number,
  taskExternalId: string,
  messages: ConversationMessage[]
): Promise<void> {
  try {
    // Skip very short conversations (nothing to extract)
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return;

    // Build a condensed transcript (limit to avoid huge prompts)
    const transcript = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-20) // Last 20 messages max
      .map(m => `${m.role}: ${typeof m.content === "string" ? m.content.slice(0, 500) : "[non-text]"}`)
      .join("\n");

    if (transcript.length < 50) return; // Too short to extract from

    const { invokeLLM } = await import("./_core/llm");

    const response = await invokeLLM({
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `Conversation transcript:\n\n${transcript}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "memory_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              memories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string", description: "Short label for the memory" },
                    value: { type: "string", description: "Detailed value" },
                  },
                  required: ["key", "value"],
                  additionalProperties: false,
                },
              },
            },
            required: ["memories"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) return;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    let parsed: { memories: ExtractedMemory[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn("[MemoryExtractor] Failed to parse LLM response:", content.slice(0, 200));
      return;
    }

    if (!Array.isArray(parsed.memories) || parsed.memories.length === 0) return;

    // Store each extracted memory
    const { addMemoryEntry } = await import("./db");
    for (const mem of parsed.memories.slice(0, 5)) {
      if (!mem.key || !mem.value) continue;
      try {
        await addMemoryEntry({
          userId,
          key: mem.key.slice(0, 500),
          value: mem.value.slice(0, 2000),
          source: "auto",
          taskExternalId,
        });
        console.log(`[MemoryExtractor] Stored: "${mem.key}"`);
      } catch (err) {
        console.warn("[MemoryExtractor] Failed to store memory:", err);
      }
    }

    console.log(`[MemoryExtractor] Extracted ${parsed.memories.length} memories from task ${taskExternalId}`);
  } catch (err) {
    // Fire-and-forget — never throw
    console.warn("[MemoryExtractor] Extraction failed (non-blocking):", err);
  }
}
