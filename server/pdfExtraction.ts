/**
 * PDF Text Extraction — Real server-side PDF parsing
 * 
 * Extracts text content from PDF files (URLs or buffers).
 * Uses pdf-parse v2 (PDFParse class) for text extraction with metadata.
 */
import { PDFParse } from "pdf-parse";

export interface PdfExtractionResult {
  text: string;
  numPages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
  };
  truncated: boolean;
}

const MAX_TEXT_LENGTH = 100_000; // ~100k chars

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPdfBuffer(
  buffer: Buffer
): Promise<PdfExtractionResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const [textResult, infoResult] = await Promise.all([
      parser.getText(),
      parser.getInfo(),
    ]);

    const fullText = textResult.text || "";
    const truncated = fullText.length > MAX_TEXT_LENGTH;
    const text = truncated ? fullText.slice(0, MAX_TEXT_LENGTH) : fullText;

    return {
      text,
      numPages: infoResult.total ?? 0,
      metadata: {
        title: infoResult.info?.Title || undefined,
        author: infoResult.info?.Author || undefined,
        subject: infoResult.info?.Subject || undefined,
        creator: infoResult.info?.Creator || undefined,
        producer: infoResult.info?.Producer || undefined,
      },
      truncated,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/**
 * Extract text from a PDF at a URL
 */
export async function extractTextFromPdfUrl(
  url: string
): Promise<PdfExtractionResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ManusNext/2.0; +https://manus.im)",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: HTTP ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Enforce size limit: 50MB
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error("PDF file is too large (max 50MB)");
  }

  return extractTextFromPdfBuffer(buffer);
}
