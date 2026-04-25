import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { 
  createMeetingSession,
  getMeetingSession,
  getUserMeetingSessions,
  updateMeetingSession,
 } from "../db";

export const meetingRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserMeetingSessions(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getMeetingSession(input.id);
      }),
    /** Generate meeting notes from a text transcript (no audio required) */
    generateFromTranscript: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        transcript: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("../_core/llm");
        const { storagePut } = await import("../storage");
        const { nanoid } = await import("nanoid");

        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are a meeting notes assistant. Given a transcript, produce structured meeting notes as JSON: { summary: string, actionItems: string[], keyDecisions: string[], attendees: string[], topics: string[] }. Return ONLY valid JSON.` },
            { role: "user", content: input.transcript.slice(0, 30000) },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content ?? "{}";
        const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "Could not parse", actionItems: [], keyDecisions: [], attendees: [], topics: [] };

        const meetingTitle = input.title || "Meeting Notes";
        let markdown = `# ${meetingTitle}\n\n## Summary\n\n${parsed.summary}\n\n`;
        if (parsed.attendees?.length) markdown += `## Attendees\n\n${parsed.attendees.map((a: string) => `- ${a}`).join("\n")}\n\n`;
        if (parsed.topics?.length) markdown += `## Topics\n\n${parsed.topics.map((t: string) => `- ${t}`).join("\n")}\n\n`;
        if (parsed.keyDecisions?.length) markdown += `## Key Decisions\n\n${parsed.keyDecisions.map((d: string) => `- ${d}`).join("\n")}\n\n`;
        if (parsed.actionItems?.length) markdown += `## Action Items\n\n${parsed.actionItems.map((a: string) => `- [ ] ${a}`).join("\n")}\n\n`;

        const fileName = `meeting-notes-${nanoid(6)}.md`;
        const { url } = await storagePut(`meetings/${fileName}`, Buffer.from(markdown, "utf-8"), "text/markdown");

        const id = await createMeetingSession({
          userId: ctx.user.id,
          title: meetingTitle,
          audioUrl: url,
          taskId: null,
          transcript: input.transcript.slice(0, 50000),
          summary: parsed.summary,
          actionItems: parsed.actionItems,
          status: "ready",
        });

        return { id, title: meetingTitle, summary: parsed.summary, actionItems: parsed.actionItems, downloadUrl: url };
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        audioUrl: z.string(),
        taskId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createMeetingSession({
          userId: ctx.user.id,
          title: input.title ?? "Meeting " + new Date().toLocaleDateString(),
          audioUrl: input.audioUrl,
          taskId: input.taskId ?? null,
          status: "transcribing",
        });
        // Async transcription + summarization
        (async () => {
          try {
            const { transcribeAudio } = await import("../_core/voiceTranscription");
            const { invokeLLM } = await import("../_core/llm");
            const result = await transcribeAudio({ audioUrl: input.audioUrl });
            const transcript = ("text" in result ? result.text : "") ?? "";
            await updateMeetingSession(id, { transcript, status: "summarizing" });
            const summaryResponse = await invokeLLM({
              messages: [
                { role: "system", content: "You are a meeting notes assistant. Given a transcript, produce: 1) A concise summary (2-3 paragraphs), 2) A list of action items. Return as JSON: { summary: string, actionItems: string[] }" },
                { role: "user", content: transcript },
              ],
            });
            const rawSummary = summaryResponse.choices?.[0]?.message?.content ?? "{}";
            const summaryText = typeof rawSummary === "string" ? rawSummary : JSON.stringify(rawSummary);
            const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: transcript.slice(0, 500), actionItems: [] };
            await updateMeetingSession(id, {
              summary: parsed.summary,
              actionItems: parsed.actionItems,
              duration: Math.round(("segments" in result && result.segments?.slice(-1)?.[0]?.end) || 0),
              status: "ready",
            });
          } catch (err) {
            console.error("[Meeting] Processing failed:", err);
            await updateMeetingSession(id, { status: "error" });
          }
        })();
        return { id };
      }),
  });
