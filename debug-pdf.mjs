import { generatePDF } from "./server/documentGeneration.ts";

const paragraphs = Array.from({ length: 60 }, (_, i) =>
  `Paragraph ${i+1}: Content that fills multiple pages for page number testing.`
).join("\n\n");

const buf = await generatePDF("Numbered Pages", paragraphs);
const pdfStr = buf.toString("latin1");

const idx = pdfStr.indexOf("Page");
if (idx > -1) {
  console.log("Found Page at index", idx, ":", JSON.stringify(pdfStr.slice(idx, idx+30)));
} else {
  console.log("Page not found in PDF latin1");
}

// Count actual pages
const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
console.log("Page count:", pageMatches?.length || 0);

// Write to file for inspection
import fs from "fs";
fs.writeFileSync("/tmp/test.pdf", buf);
console.log("Written to /tmp/test.pdf");
