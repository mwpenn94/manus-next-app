/**
 * Data Analysis Router — CSV parsing, statistical summary, and chart generation
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

export const dataAnalysisRouter = router({
  /** Parse CSV text and return structured data */
  parseCSV: protectedProcedure
    .input(z.object({
      csvText: z.string().max(500000),
      delimiter: z.string().default(","),
      hasHeader: z.boolean().default(true),
    }))
    .mutation(({ input }) => {
      const lines = input.csvText.trim().split("\n");
      if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };

      const headers = input.hasHeader
        ? lines[0].split(input.delimiter).map((h) => h.trim().replace(/^"|"$/g, ""))
        : lines[0].split(input.delimiter).map((_, i) => `Column ${i + 1}`);

      const dataLines = input.hasHeader ? lines.slice(1) : lines;
      const rows = dataLines.map((line) =>
        line.split(input.delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""))
      );

      return { headers, rows: rows.slice(0, 1000), rowCount: rows.length };
    }),

  /** Generate statistical summary of parsed data */
  summarize: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    }))
    .mutation(({ input }) => {
      const { headers, rows } = input;
      const stats = headers.map((header, colIdx) => {
        const values = rows.map((r) => r[colIdx]).filter(Boolean);
        const numericValues = values.map(Number).filter((n) => !isNaN(n));
        const isNumeric = numericValues.length > values.length * 0.5;

        if (isNumeric && numericValues.length > 0) {
          const sorted = numericValues.sort((a, b) => a - b);
          const sum = numericValues.reduce((a, b) => a + b, 0);
          const mean = sum / numericValues.length;
          const median = sorted[Math.floor(sorted.length / 2)];
          const stdDev = Math.sqrt(
            numericValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / numericValues.length
          );
          return {
            column: header,
            type: "numeric" as const,
            count: numericValues.length,
            missing: values.length - numericValues.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: Math.round(mean * 100) / 100,
            median,
            stdDev: Math.round(stdDev * 100) / 100,
          };
        } else {
          const uniqueValues = new Map<string, number>();
          values.forEach((v) => uniqueValues.set(v, (uniqueValues.get(v) || 0) + 1));
          const topValues: { value: string; count: number }[] = [];
          uniqueValues.forEach((count, value) => topValues.push({ value, count }));
          topValues.sort((a, b) => b.count - a.count);
          return {
            column: header,
            type: "categorical" as const,
            count: values.length,
            missing: rows.length - values.length,
            uniqueCount: uniqueValues.size,
            topValues: topValues.slice(0, 5),
          };
        }
      });

      return {
        totalRows: rows.length,
        totalColumns: headers.length,
        columns: stats,
      };
    }),

  /** Generate chart configuration from data */
  chartConfig: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())).max(200),
      chartType: z.enum(["bar", "line", "pie", "scatter"]),
      xColumn: z.string(),
      yColumn: z.string(),
      title: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const xIdx = input.headers.indexOf(input.xColumn);
      const yIdx = input.headers.indexOf(input.yColumn);
      if (xIdx === -1 || yIdx === -1) throw new Error("Column not found");

      const labels = input.rows.map((r) => r[xIdx]);
      const data = input.rows.map((r) => parseFloat(r[yIdx]) || 0);

      return {
        type: input.chartType,
        data: {
          labels: labels.slice(0, 50),
          datasets: [{
            label: input.yColumn,
            data: data.slice(0, 50),
            backgroundColor: input.chartType === "pie"
              ? ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]
              : "rgba(245, 158, 11, 0.6)",
            borderColor: "rgba(245, 158, 11, 1)",
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: !!input.title, text: input.title || "" },
            legend: { display: input.chartType === "pie" },
          },
        },
      };
    }),

  /** AI-powered data analysis */
  analyze: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      sampleRows: z.array(z.array(z.string())).max(20),
      question: z.string().max(500),
      totalRows: z.number(),
    }))
    .mutation(async ({ input }) => {
      const dataPreview = [
        input.headers.join(" | "),
        input.headers.map(() => "---").join(" | "),
        ...input.sampleRows.map((r) => r.join(" | ")),
      ].join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a data analyst. Analyze the provided dataset sample and answer the user's question. Provide specific insights, patterns, and recommendations. Use markdown formatting.",
          },
          {
            role: "user",
            content: `Dataset (${input.totalRows} total rows, showing first ${input.sampleRows.length}):\n\n${dataPreview}\n\nQuestion: ${input.question}`,
          },
        ],
      });

      return { analysis: String(response.choices[0].message.content || "") };
    }),
});
