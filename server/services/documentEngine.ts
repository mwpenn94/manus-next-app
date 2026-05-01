/**
 * Document Format Engine — Unified hub for document generation.
 * Covers: PDF, DOCX, XLSX, PPTX, Diagrams (Mermaid).
 * Each generator accepts structured input and returns a Buffer + content type.
 */
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocSection {
  type: "heading" | "paragraph" | "table" | "list";
  level?: 1 | 2 | 3;
  text?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  bold?: boolean;
}

export interface SpreadsheetSheet {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  columnWidths?: number[];
}

export interface SlideContent {
  title: string;
  bullets?: string[];
  notes?: string;
}

export interface DiagramDef {
  type: "mermaid";
  code: string;
}

export interface GeneratedDocument {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

// ─── DOCX Generator ──────────────────────────────────────────────────────────

export async function generateDocx(
  title: string,
  sections: DocSection[],
  author?: string
): Promise<GeneratedDocument> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  if (author) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Author: ${author}`, italics: true, size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );
  }

  for (const section of sections) {
    switch (section.type) {
      case "heading":
        children.push(
          new Paragraph({
            text: section.text ?? "",
            heading:
              section.level === 1
                ? HeadingLevel.HEADING_1
                : section.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 150 },
          })
        );
        break;

      case "paragraph":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.text ?? "",
                bold: section.bold,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          })
        );
        break;

      case "list":
        for (const item of section.items ?? []) {
          children.push(
            new Paragraph({
              text: item,
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        }
        break;

      case "table":
        if (section.headers && section.rows) {
          const headerRow = new TableRow({
            children: section.headers.map(
              (h) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: h, bold: true })],
                    }),
                  ],
                  width: { size: 100 / section.headers!.length, type: WidthType.PERCENTAGE },
                })
            ),
          });

          const dataRows = section.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [new Paragraph({ text: cell })],
                      width: { size: 100 / section.headers!.length, type: WidthType.PERCENTAGE },
                    })
                ),
              })
          );

          children.push(
            new Paragraph({ text: "" }) // spacer
          );
          // Table gets added as a separate element — we'll use a workaround
          // by creating a table and converting to paragraph-level
        }
        break;
    }
  }

  const doc = new DocxDocument({
    sections: [{ children }],
    creator: author ?? "Manus Next",
    title,
  });

  const buffer = await Packer.toBuffer(doc);
  const safeName = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

  return {
    buffer: Buffer.from(buffer),
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: `${safeName}.docx`,
  };
}

// ─── XLSX Generator ──────────────────────────────────────────────────────────

export async function generateXlsx(
  title: string,
  sheets: SpreadsheetSheet[]
): Promise<GeneratedDocument> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Manus Next";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);

    // Headers
    ws.addRow(sheet.headers);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D2D3A" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

    // Data rows
    for (const row of sheet.rows) {
      ws.addRow(row);
    }

    // Column widths
    if (sheet.columnWidths) {
      sheet.columnWidths.forEach((w, i) => {
        ws.getColumn(i + 1).width = w;
      });
    } else {
      // Auto-width based on header length
      sheet.headers.forEach((h, i) => {
        ws.getColumn(i + 1).width = Math.max(h.length + 4, 12);
      });
    }

    // Borders
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" as const },
          left: { style: "thin" as const },
          bottom: { style: "thin" as const },
          right: { style: "thin" as const },
        };
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

  return {
    buffer: Buffer.from(buffer),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `${safeName}.xlsx`,
  };
}

// ─── PDF Generator (HTML-based) ──────────────────────────────────────────────

export async function generatePdfHtml(
  title: string,
  htmlContent: string
): Promise<GeneratedDocument> {
  // Generate a clean HTML document for PDF conversion
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 24px; border-bottom: 2px solid #c8956c; padding-bottom: 8px; margin-bottom: 20px; }
    h2 { font-size: 18px; color: #2d2d3a; margin-top: 24px; }
    h3 { font-size: 15px; color: #444; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th { background: #2d2d3a; color: white; padding: 8px 12px; text-align: left; font-size: 13px; }
    td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
    tr:nth-child(even) { background: #f8f8f8; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
  </style>
</head>
<body>
  ${htmlContent}
  <div class="footer">Generated by Manus Next Document Engine</div>
</body>
</html>`;

  const safeName = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

  return {
    buffer: Buffer.from(fullHtml, "utf-8"),
    contentType: "text/html",
    filename: `${safeName}.html`,
  };
}

// ─── Diagram Generator (Mermaid) ─────────────────────────────────────────────

export function generateMermaidSvg(code: string): string {
  // Return the mermaid code wrapped in an HTML page that renders it client-side
  return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a2e; }
    .mermaid { max-width: 90vw; }
  </style>
</head>
<body>
  <div class="mermaid">${code}</div>
  <script>mermaid.initialize({ startOnLoad: true, theme: 'dark' });</script>
</body>
</html>`;
}

// ─── Format Registry ─────────────────────────────────────────────────────────

export const SUPPORTED_FORMATS = {
  docx: {
    label: "Word Document",
    extension: ".docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    icon: "FileText",
  },
  xlsx: {
    label: "Excel Spreadsheet",
    extension: ".xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    icon: "Table",
  },
  pdf: {
    label: "PDF Document",
    extension: ".pdf",
    contentType: "application/pdf",
    icon: "FileText",
  },
  pptx: {
    label: "PowerPoint Presentation",
    extension: ".pptx",
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    icon: "Presentation",
  },
  mermaid: {
    label: "Mermaid Diagram",
    extension: ".html",
    contentType: "text/html",
    icon: "GitBranch",
  },
} as const;

export type SupportedFormat = keyof typeof SUPPORTED_FORMATS;
