/**
 * Document Router — tRPC procedures for document generation.
 * Covers: DOCX, XLSX, PDF (HTML), Mermaid diagrams.
 * Each procedure generates a document and uploads to S3, returning the URL.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  generateDocx,
  generateXlsx,
  generatePdfHtml,
  generateMermaidSvg,
  SUPPORTED_FORMATS,
  type DocSection,
  type SpreadsheetSheet,
} from "../services/documentEngine";
import { storagePut } from "../storage";

const docSectionSchema = z.object({
  type: z.enum(["heading", "paragraph", "table", "list"]),
  level: z.number().min(1).max(3).optional(),
  text: z.string().max(50000).optional(),
  items: z.array(z.string().max(10000)).optional(),
  rows: z.array(z.array(z.string().max(10000))).optional(),
  headers: z.array(z.string().max(10000)).optional(),
  bold: z.boolean().optional(),
});

const sheetSchema = z.object({
  name: z.string().max(1000),
  headers: z.array(z.string().max(10000)),
  rows: z.array(z.array(z.union([z.string().max(10000), z.number(), z.boolean(), z.null()]))),
  columnWidths: z.array(z.number()).optional(),
});

export const documentRouter = router({
  /** List supported document formats */
  listFormats: protectedProcedure.query(() => {
    return Object.entries(SUPPORTED_FORMATS).map(([key, val]) => ({
      id: key,
      ...val,
    }));
  }),

  /** Generate a DOCX document */
  generateDocx: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        sections: z.array(docSectionSchema),
        author: z.string().max(10000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generateDocx(
        input.title,
        input.sections as DocSection[],
        input.author
      );

      const suffix = Math.random().toString(36).slice(2, 8);
      const key = `documents/${ctx.user.id}/${result.filename}-${suffix}`;
      const { url } = await storagePut(key, result.buffer, result.contentType);

      return { url, filename: result.filename, format: "docx" as const };
    }),

  /** Generate an XLSX spreadsheet */
  generateXlsx: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        sheets: z.array(sheetSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generateXlsx(
        input.title,
        input.sheets as SpreadsheetSheet[]
      );

      const suffix = Math.random().toString(36).slice(2, 8);
      const key = `documents/${ctx.user.id}/${result.filename}-${suffix}`;
      const { url } = await storagePut(key, result.buffer, result.contentType);

      return { url, filename: result.filename, format: "xlsx" as const };
    }),

  /** Generate a PDF (as styled HTML for client-side rendering or server conversion) */
  generatePdf: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        htmlContent: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generatePdfHtml(input.title, input.htmlContent);

      const suffix = Math.random().toString(36).slice(2, 8);
      const key = `documents/${ctx.user.id}/${result.filename}-${suffix}`;
      const { url } = await storagePut(key, result.buffer, result.contentType);

      return { url, filename: result.filename, format: "pdf" as const };
    }),

  /** Generate a Mermaid diagram (as renderable HTML) */
  generateDiagram: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        mermaidCode: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const html = generateMermaidSvg(input.mermaidCode);
      const buffer = Buffer.from(html, "utf-8");

      const safeName = input.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
      const suffix = Math.random().toString(36).slice(2, 8);
      const key = `documents/${ctx.user.id}/${safeName}-${suffix}.html`;
      const { url } = await storagePut(key, buffer, "text/html");

      return { url, filename: `${safeName}.html`, format: "mermaid" as const };
    }),

  /** Generate a document via AI — the AI decides format and content */
  generateWithAI: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(5000),
        format: z.enum(["docx", "xlsx", "pdf", "auto"]).default("auto"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Use LLM to generate structured document content
      const { invokeLLM } = await import("../_core/llm");

      const systemPrompt = `You are a document generation assistant. Based on the user's request, generate structured content for a ${input.format === "auto" ? "document (choose the best format)" : input.format} document.

Return a JSON object with:
- "format": "docx" | "xlsx" | "pdf"
- "title": document title
- For docx: "sections": array of { type: "heading"|"paragraph"|"table"|"list", text?, level?, items?, headers?, rows? }
- For xlsx: "sheets": array of { name, headers: string[], rows: (string|number)[][] }
- For pdf: "htmlContent": styled HTML content string`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "document_spec",
            strict: true,
            schema: {
              type: "object",
              properties: {
                format: { type: "string", enum: ["docx", "xlsx", "pdf"] },
                title: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      text: { type: "string" },
                      level: { type: "number" },
                      items: { type: "array", items: { type: "string" } },
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                    },
                    required: ["type"],
                    additionalProperties: false,
                  },
                },
                sheets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      headers: { type: "array", items: { type: "string" } },
                      rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                    },
                    required: ["name", "headers", "rows"],
                    additionalProperties: false,
                  },
                },
                htmlContent: { type: "string" },
              },
              required: ["format", "title"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0].message.content;
      const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const spec = JSON.parse(contentStr ?? "{}");
      const suffix = Math.random().toString(36).slice(2, 8);

      if (spec.format === "docx" && spec.sections) {
        const result = await generateDocx(spec.title, spec.sections, ctx.user.name ?? undefined);
        const key = `documents/${ctx.user.id}/${result.filename}-${suffix}`;
        const { url } = await storagePut(key, result.buffer, result.contentType);
        return { url, filename: result.filename, format: "docx" as const, title: spec.title };
      }

      if (spec.format === "xlsx" && spec.sheets) {
        const result = await generateXlsx(spec.title, spec.sheets);
        const key = `documents/${ctx.user.id}/${result.filename}-${suffix}`;
        const { url } = await storagePut(key, result.buffer, result.contentType);
        return { url, filename: result.filename, format: "xlsx" as const, title: spec.title };
      }

      // Default to PDF
      const result = await generatePdfHtml(spec.title, spec.htmlContent ?? `<h1>${spec.title}</h1><p>Document generated.</p>`);
      const key = `documents/${ctx.user.id}/${result.filename}-${suffix}`;
      const { url } = await storagePut(key, result.buffer, result.contentType);
      return { url, filename: result.filename, format: "pdf" as const, title: spec.title };
    }),
});
