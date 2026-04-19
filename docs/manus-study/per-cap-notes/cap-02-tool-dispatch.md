# Cap #2: Tool Dispatch (8-Tool Action Space)
**Status:** GREEN
**Implementation:** `server/agentTools.ts` — 8 tools: chat, web_search, wide_research, code_execute, file_write, schedule_task, create_artifact, knowledge_query.
**Manus Alignment:** Follows "Mask, Don't Remove" principle — all tools are always defined in the prompt; mode controls which are available via turn limits rather than removal.
**Quality Note:** Tool names use consistent prefixes for potential logit masking. Schema validation via Zod on all inputs.
