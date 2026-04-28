/**
 * Document Generation Module
 * 
 * Converts markdown content to PDF and DOCX formats.
 * Uses pdfkit for PDF generation and docx for DOCX generation.
 * Pure Node.js — no browser or system dependencies required.
 */
import PDFDocument from "pdfkit";
import {
  Document,
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
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

// ── Markdown Parsing Helpers ──

interface ParsedBlock {
  type: "heading" | "paragraph" | "list_item" | "code" | "table" | "hr" | "blockquote";
  level?: number; // heading level 1-6
  text: string;
  bold?: boolean;
  rows?: string[][]; // for tables
}

/**
 * Parse markdown into structured blocks for rendering
 */
function parseMarkdownBlocks(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.split("\n");
  let i = 0;
  let inCodeBlock = false;
  let codeContent = "";

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "code", text: codeContent.trimEnd() });
        codeContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      i++;
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: stripMarkdownInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Horizontal rules
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr", text: "" });
      i++;
      continue;
    }

    // Tables
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1]?.match(/^\|?\s*[-:]+/)) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        const row = lines[i]
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell !== "" && !cell.match(/^[-:]+$/));
        if (row.length > 0 && !lines[i].match(/^\|?\s*[-:]+/)) {
          tableRows.push(row);
        }
        i++;
      }
      if (tableRows.length > 0) {
        blocks.push({ type: "table", text: "", rows: tableRows });
      }
      continue;
    }

    // Blockquotes
    if (line.startsWith(">")) {
      blocks.push({
        type: "blockquote",
        text: stripMarkdownInline(line.replace(/^>\s*/, "")),
      });
      i++;
      continue;
    }

    // List items
    if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
      const listText = line.replace(/^\s*[-*+]\s/, "").replace(/^\s*\d+\.\s/, "");
      blocks.push({
        type: "list_item",
        text: stripMarkdownInline(listText),
      });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: "paragraph",
      text: stripMarkdownInline(line),
    });
    i++;
  }

  return blocks;
}

/**
 * Strip inline markdown formatting and return plain text
 */
function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/__(.+?)__/g, "$1") // bold
    .replace(/_(.+?)_/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/!\[(.+?)\]\(.+?\)/g, "[Image: $1]") // images
    .trim();
}

/**
 * Parse inline markdown into TextRun segments for DOCX
 */
function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))|([^*`\[]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[4]) {
      // Italic
      runs.push(new TextRun({ text: match[4], italics: true }));
    } else if (match[6]) {
      // Inline code
      runs.push(new TextRun({ text: match[6], font: "Courier New", size: 20 }));
    } else if (match[8]) {
      // Link — show text only
      runs.push(new TextRun({ text: match[8], color: "2563EB" }));
    } else if (match[10]) {
      // Plain text
      runs.push(new TextRun({ text: match[10] }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: text }));
  }

  return runs;
}

// ── PDF Generation ──

/** Usable height on a single page (A4 minus top+bottom margins) */
const PAGE_TOP = 72;
const PAGE_BOTTOM = 72;
const PAGE_LEFT = 72;
const PAGE_RIGHT = 72;
const A4_HEIGHT = 841.89;
const A4_WIDTH = 595.28;
const PAGE_WIDTH = A4_WIDTH - PAGE_LEFT - PAGE_RIGHT; // ~451.28
const USABLE_BOTTOM = A4_HEIGHT - PAGE_BOTTOM; // y must stay above this

/**
 * Ensure there is at least `needed` points of vertical space remaining on the
 * current page.  If not, add a new page and return the new y position.
 */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > USABLE_BOTTOM) {
    doc.addPage();
  }
}

/**
 * Generate a PDF buffer from markdown content
 */
export async function generatePDF(title: string, markdownContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: PAGE_TOP, bottom: PAGE_BOTTOM, left: PAGE_LEFT, right: PAGE_RIGHT },
        info: {
          Title: title,
          Author: "Manus",
          Creator: "Manus",
        },
        // Enable auto first page — PDFKit creates the first page automatically
        autoFirstPage: true,
        // Enable buffering for proper page count
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const blocks = parseMarkdownBlocks(markdownContent);

      for (const block of blocks) {
        switch (block.type) {
          case "heading": {
            const sizes: Record<number, number> = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 11 };
            const size = sizes[block.level || 1] || 14;
            // Reserve space for heading + a bit of following content
            ensureSpace(doc, size + 30);
            doc.moveDown(block.level === 1 ? 0.5 : 0.3);
            // Always reset x to left margin before rendering heading
            doc.x = PAGE_LEFT;
            doc.font("Helvetica-Bold").fontSize(size).text(block.text, { width: PAGE_WIDTH });
            doc.moveDown(0.3);
            if (block.level === 1) {
              const lineY = doc.y;
              doc.moveTo(PAGE_LEFT, lineY).lineTo(PAGE_LEFT + PAGE_WIDTH, lineY).stroke("#cccccc");
              doc.moveDown(0.3);
            }
            break;
          }
          case "paragraph": {
            // Estimate height: ~14pt per line, rough estimate of lines
            const estLines = Math.ceil((block.text.length * 6) / PAGE_WIDTH) + 1;
            const estHeight = estLines * 15;
            ensureSpace(doc, Math.min(estHeight, 60)); // at least ensure first few lines fit
            // Always reset x to left margin before rendering paragraph
            doc.x = PAGE_LEFT;
            doc.font("Helvetica").fontSize(11).text(block.text, {
              width: PAGE_WIDTH,
              lineGap: 4,
            });
            doc.moveDown(0.5);
            break;
          }
          case "list_item": {
            ensureSpace(doc, 20);
            // Always reset x to left margin before rendering list item
            doc.x = PAGE_LEFT;
            doc.font("Helvetica").fontSize(11).text(`  \u2022  ${block.text}`, {
              width: PAGE_WIDTH - 20,
              lineGap: 3,
            });
            doc.moveDown(0.2);
            break;
          }
          case "code": {
            const codeLines = block.text.split("\n");
            const lineHeight = 13;
            const padding = 12;
            const totalHeight = codeLines.length * lineHeight + padding * 2;

            // If the code block is very tall, we need to split it across pages
            if (totalHeight > USABLE_BOTTOM - PAGE_TOP) {
              // Large code block — render line by line, adding pages as needed
              ensureSpace(doc, lineHeight + padding * 2);
              doc.moveDown(0.2);
              for (let li = 0; li < codeLines.length; li++) {
                ensureSpace(doc, lineHeight + 4);
                const bgY = doc.y - 2;
                doc.save();
                doc.rect(PAGE_LEFT, bgY, PAGE_WIDTH, lineHeight + 2).fill("#f5f5f5");
                doc.restore();
                doc.fill("#333333").font("Courier").fontSize(9)
                  .text(codeLines[li], PAGE_LEFT + 8, doc.y, { width: PAGE_WIDTH - 16 });
              }
              doc.moveDown(0.5);
            } else {
              ensureSpace(doc, totalHeight + 8);
              doc.moveDown(0.2);
              const codeY = doc.y;
              // Draw background rectangle
              doc.save();
              doc.roundedRect(PAGE_LEFT, codeY - 4, PAGE_WIDTH, totalHeight, 3)
                .fill("#f5f5f5");
              doc.restore();
              // Draw border
              doc.save();
              doc.roundedRect(PAGE_LEFT, codeY - 4, PAGE_WIDTH, totalHeight, 3)
                .stroke("#e0e0e0");
              doc.restore();
              // Render code text
              doc.fill("#333333").font("Courier").fontSize(9)
                .text(block.text, PAGE_LEFT + 8, codeY + padding - 4, { width: PAGE_WIDTH - 16 });
              doc.y = codeY + totalHeight + 4;
              doc.moveDown(0.5);
            }
            break;
          }
          case "blockquote": {
            const estLines = Math.ceil((block.text.length * 6) / (PAGE_WIDTH - 24)) + 1;
            const estHeight = estLines * 15 + 8;
            ensureSpace(doc, Math.min(estHeight, 40));
            doc.moveDown(0.2);
            // Always reset x to left margin before rendering blockquote
            doc.x = PAGE_LEFT;
            const bqY = doc.y;
            // Draw accent bar
            doc.save();
            doc.rect(PAGE_LEFT + 4, bqY - 2, 3, Math.min(estHeight, 14)).fill("#3b82f6");
            doc.restore();
            doc.fill("#555555").font("Helvetica-Oblique").fontSize(11)
              .text(block.text, PAGE_LEFT + 16, bqY, { width: PAGE_WIDTH - 24 });
            doc.moveDown(0.5);
            break;
          }
          case "table": {
            if (block.rows && block.rows.length > 0) {
              const cols = block.rows[0].length;
              const colWidth = PAGE_WIDTH / cols;
              const rowHeight = 18;
              doc.moveDown(0.3);

              for (let r = 0; r < block.rows.length; r++) {
                const row = block.rows[r];
                const isHeader = r === 0;

                // Ensure space for this row
                ensureSpace(doc, rowHeight + 4);

                const rowY = doc.y;

                if (isHeader) {
                  doc.save();
                  doc.rect(PAGE_LEFT, rowY - 2, PAGE_WIDTH, rowHeight).fill("#f0f0f0");
                  doc.restore();
                }

                // Reset fill color for text
                doc.fill("#000000");

                for (let c = 0; c < row.length; c++) {
                  doc.font(isHeader ? "Helvetica-Bold" : "Helvetica")
                    .fontSize(9)
                    .text(row[c] || "", PAGE_LEFT + c * colWidth + 4, rowY, {
                      width: colWidth - 8,
                      height: rowHeight - 2,
                      ellipsis: true,
                    });
                }
                // Reset x position after table cells to prevent drift
                doc.x = PAGE_LEFT;
                doc.y = rowY + rowHeight;
                // Draw row separator line
                doc.save();
                doc.moveTo(PAGE_LEFT, doc.y).lineTo(PAGE_LEFT + PAGE_WIDTH, doc.y).stroke("#e0e0e0");
                doc.restore();
              }
              // Reset x position after table to prevent drift into subsequent blocks
              doc.x = PAGE_LEFT;
              doc.moveDown(0.5);
            }
            break;
          }
          case "hr": {
            ensureSpace(doc, 10);
            doc.moveDown(0.3);
            doc.save();
            doc.moveTo(PAGE_LEFT, doc.y).lineTo(PAGE_LEFT + PAGE_WIDTH, doc.y).stroke("#cccccc");
            doc.restore();
            doc.moveDown(0.3);
            break;
          }
        }
      }

      // Add page numbers
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.save();
        doc.font("Helvetica").fontSize(8).fill("#999999")
          .text(
            `Page ${i + 1} of ${pageCount}`,
            PAGE_LEFT,
            A4_HEIGHT - PAGE_BOTTOM + 20,
            { width: PAGE_WIDTH, align: "center" }
          );
        doc.restore();
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── DOCX Generation ──

/**
 * Generate a DOCX buffer from markdown content
 */
export async function generateDOCX(title: string, markdownContent: string): Promise<Buffer> {
  const blocks = parseMarkdownBlocks(markdownContent);
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 48, font: "Calibri" })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const headingLevels: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6,
        };
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.text, bold: true })],
            heading: headingLevels[block.level || 1] || HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );
        break;
      }
      case "paragraph":
        children.push(
          new Paragraph({
            children: parseInlineMarkdown(block.text),
            spacing: { after: 200, line: 276 },
          })
        );
        break;
      case "list_item":
        children.push(
          new Paragraph({
            children: parseInlineMarkdown(block.text),
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
        break;
      case "code":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.text,
                font: "Courier New",
                size: 18,
              }),
            ],
            spacing: { before: 120, after: 120 },
            shading: { fill: "F5F5F5" },
          })
        );
        break;
      case "blockquote":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.text,
                italics: true,
                color: "555555",
              }),
            ],
            indent: { left: 720 },
            spacing: { before: 120, after: 120 },
          })
        );
        break;
      case "table":
        if (block.rows && block.rows.length > 0) {
          const cols = block.rows[0].length;
          const tableRows = block.rows.map(
            (row, rowIdx) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cell,
                              bold: rowIdx === 0,
                              size: 20,
                            }),
                          ],
                        }),
                      ],
                      width: { size: Math.floor(9000 / cols), type: WidthType.DXA },
                      shading: rowIdx === 0 ? { fill: "F0F0F0" } : undefined,
                    })
                ),
              })
          );
          children.push(
            new Table({
              rows: tableRows,
              width: { size: 9000, type: WidthType.DXA },
            })
          );
          children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        }
        break;
      case "hr":
        children.push(
          new Paragraph({
            children: [],
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            },
            spacing: { before: 200, after: 200 },
          })
        );
        break;
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ── CSV Generation ──

/**
 * Generate a CSV buffer from markdown content.
 * Extracts tables from the markdown; if no tables are found, treats each line as a row.
 */
export function generateCSV(title: string, markdownContent: string): Buffer {
  const blocks = parseMarkdownBlocks(markdownContent);
  const csvLines: string[] = [];

  // First try to extract tables
  const tableBlocks = blocks.filter((b) => b.type === "table" && b.rows && b.rows.length > 0);

  if (tableBlocks.length > 0) {
    for (const table of tableBlocks) {
      for (const row of table.rows!) {
        csvLines.push(row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","));
      }
      csvLines.push(""); // blank line between tables
    }
  } else {
    // Fallback: try to parse content as structured data
    // Split by lines and treat pipe-delimited or comma-delimited content
    const lines = markdownContent.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      if (line.includes("|")) {
        const cells = line
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c && !c.match(/^[-:]+$/));
        if (cells.length > 0) {
          csvLines.push(cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(","));
        }
      } else if (line.includes(",")) {
        csvLines.push(line);
      } else {
        csvLines.push(`"${line.replace(/"/g, '""')}"`);
      }
    }
  }

  return Buffer.from(csvLines.join("\n"), "utf-8");
}

// ── XLSX Generation ──

/**
 * Generate an XLSX buffer from markdown content.
 * Extracts tables from the markdown and creates worksheets.
 */
export async function generateXLSX(title: string, markdownContent: string): Promise<Buffer> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  workbook.creator = "Manus";
  workbook.created = new Date();

  const blocks = parseMarkdownBlocks(markdownContent);
  const tableBlocks = blocks.filter((b) => b.type === "table" && b.rows && b.rows.length > 0);

  if (tableBlocks.length > 0) {
    tableBlocks.forEach((table, idx) => {
      const sheetName = tableBlocks.length === 1 ? title.slice(0, 31) : `Sheet ${idx + 1}`;
      const worksheet = workbook.addWorksheet(sheetName.replace(/[\\/*?[\]:]/g, ""));

      for (let r = 0; r < table.rows!.length; r++) {
        const row = table.rows![r];
        const excelRow = worksheet.addRow(row);

        if (r === 0) {
          // Style header row
          excelRow.eachCell((cell) => {
            cell.font = { bold: true, size: 11 };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE8E8E8" },
            };
            cell.border = {
              bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            };
          });
        }
      }

      // Auto-fit column widths
      worksheet.columns.forEach((col) => {
        let maxLen = 10;
        col.eachCell?.({ includeEmpty: false }, (cell) => {
          const len = String(cell.value || "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 50);
      });
    });
  } else {
    // No tables found — put content as rows in a single sheet
    const worksheet = workbook.addWorksheet(title.slice(0, 31).replace(/[\\/*?[\]:]/g, ""));
    const lines = markdownContent.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      if (line.includes(",")) {
        worksheet.addRow(line.split(",").map((c) => c.trim()));
      } else {
        worksheet.addRow([stripMarkdownInline(line)]);
      }
    }
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value || "").length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 50);
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
