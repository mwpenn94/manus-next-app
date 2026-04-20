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

/**
 * Generate a PDF buffer from markdown content
 */
export async function generatePDF(title: string, markdownContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: title,
          Author: "Sovereign AI",
          Creator: "Manus Next",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const blocks = parseMarkdownBlocks(markdownContent);
      const pageWidth = 595.28 - 144; // A4 width minus margins

      for (const block of blocks) {
        switch (block.type) {
          case "heading": {
            const sizes: Record<number, number> = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 11 };
            const size = sizes[block.level || 1] || 14;
            doc.moveDown(block.level === 1 ? 0.5 : 0.3);
            doc.font("Helvetica-Bold").fontSize(size).text(block.text, { width: pageWidth });
            doc.moveDown(0.3);
            if (block.level === 1) {
              doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).stroke("#cccccc");
              doc.moveDown(0.3);
            }
            break;
          }
          case "paragraph":
            doc.font("Helvetica").fontSize(11).text(block.text, { width: pageWidth, lineGap: 4 });
            doc.moveDown(0.5);
            break;
          case "list_item":
            doc.font("Helvetica").fontSize(11).text(`  •  ${block.text}`, { width: pageWidth - 20, lineGap: 3 });
            doc.moveDown(0.2);
            break;
          case "code":
            doc.moveDown(0.2);
            const codeY = doc.y;
            doc.rect(72, codeY - 4, pageWidth, 14 + block.text.split("\n").length * 13).fill("#f5f5f5").stroke("#e0e0e0");
            doc.fill("#333333").font("Courier").fontSize(9).text(block.text, 80, codeY, { width: pageWidth - 16 });
            doc.moveDown(0.5);
            break;
          case "blockquote":
            doc.moveDown(0.2);
            const bqY = doc.y;
            doc.rect(76, bqY - 2, 3, 14).fill("#3b82f6");
            doc.fill("#555555").font("Helvetica-Oblique").fontSize(11).text(block.text, 88, bqY, { width: pageWidth - 24 });
            doc.moveDown(0.5);
            break;
          case "table":
            if (block.rows && block.rows.length > 0) {
              const cols = block.rows[0].length;
              const colWidth = pageWidth / cols;
              doc.moveDown(0.3);
              for (let r = 0; r < block.rows.length; r++) {
                const row = block.rows[r];
                const rowY = doc.y;
                const isHeader = r === 0;
                if (isHeader) {
                  doc.rect(72, rowY - 2, pageWidth, 16).fill("#f0f0f0");
                  doc.fill("#000000");
                }
                for (let c = 0; c < row.length; c++) {
                  doc.font(isHeader ? "Helvetica-Bold" : "Helvetica")
                    .fontSize(9)
                    .text(row[c] || "", 72 + c * colWidth + 4, rowY, {
                      width: colWidth - 8,
                      height: 14,
                      ellipsis: true,
                    });
                }
                doc.y = rowY + 16;
                doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).stroke("#e0e0e0");
              }
              doc.moveDown(0.5);
            }
            break;
          case "hr":
            doc.moveDown(0.3);
            doc.moveTo(72, doc.y).lineTo(72 + pageWidth, doc.y).stroke("#cccccc");
            doc.moveDown(0.3);
            break;
        }
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
