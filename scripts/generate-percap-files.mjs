#!/usr/bin/env node
/**
 * Generates individual per-cap note files from PER_CAP_NOTES.md
 * Output: docs/manus-study/per-cap-notes/cap-N.md (one per capability)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'docs/parity/PER_CAP_NOTES.md');
const OUT_DIR = join(process.cwd(), 'docs/manus-study/per-cap-notes');

mkdirSync(OUT_DIR, { recursive: true });

const content = readFileSync(SRC, 'utf-8');
const lines = content.split('\n');

let currentCap = null;
let currentContent = [];
let capCount = 0;

function flush() {
  if (currentCap !== null && currentContent.length > 0) {
    const filename = `cap-${currentCap}.md`;
    const body = currentContent.join('\n').trim();
    writeFileSync(join(OUT_DIR, filename), body + '\n');
    capCount++;
  }
}

for (const line of lines) {
  // Match "### Cap N:" pattern
  const match = line.match(/^### Cap (\d+):/);
  if (match) {
    flush();
    currentCap = parseInt(match[1]);
    currentContent = [`# Cap ${currentCap} — Per-Capability Note`, '', line.replace('### ', '## ')];
  } else if (currentCap !== null) {
    currentContent.push(line);
  }
}
flush();

console.log(`Generated ${capCount} per-cap note files in ${OUT_DIR}`);
