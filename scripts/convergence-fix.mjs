/**
 * Convergence Fix Script — Batch fixes for common patterns across all pages:
 * 1. Add error handling for trpc useQuery calls that lack it
 * 2. Add loading state handling for trpc useQuery calls that lack it
 * 3. Remove unsafe `as any` casts where possible
 * 
 * This script analyzes files and reports what needs manual fixing.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PAGES_DIR = '/home/ubuntu/manus-next-app/client/src/pages';

const pages = readdirSync(PAGES_DIR).filter(f => f.endsWith('.tsx'));

let totalFixable = 0;

for (const page of pages) {
  const content = readFileSync(join(PAGES_DIR, page), 'utf-8');
  const lines = content.split('\n');
  
  // Find useQuery calls without isLoading/isError handling
  const queryMatches = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('useQuery') && !line.includes('//')) {
      // Check if the destructured result includes isLoading or isError
      const contextWindow = lines.slice(Math.max(0, i-2), Math.min(lines.length, i+5)).join('\n');
      const hasLoading = contextWindow.includes('isLoading') || contextWindow.includes('isPending');
      const hasError = contextWindow.includes('isError') || contextWindow.includes('error');
      if (!hasLoading || !hasError) {
        queryMatches.push({ line: i + 1, hasLoading, hasError, text: line.trim().slice(0, 80) });
      }
    }
  }
  
  // Find `as any` casts
  const anyCasts = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('as any') && !lines[i].includes('//')) {
      anyCasts.push({ line: i + 1, text: lines[i].trim().slice(0, 80) });
    }
  }
  
  if (queryMatches.length > 0 || anyCasts.length > 0) {
    console.log(`\n=== ${page} ===`);
    if (queryMatches.length > 0) {
      console.log(`  Queries missing states (${queryMatches.length}):`);
      for (const q of queryMatches.slice(0, 3)) {
        console.log(`    L${q.line}: ${!q.hasLoading ? 'NO LOADING' : ''} ${!q.hasError ? 'NO ERROR' : ''} — ${q.text}`);
      }
    }
    if (anyCasts.length > 0) {
      console.log(`  Unsafe 'as any' (${anyCasts.length}):`);
      for (const a of anyCasts.slice(0, 3)) {
        console.log(`    L${a.line}: ${a.text}`);
      }
    }
    totalFixable += queryMatches.length + anyCasts.length;
  }
}

console.log(`\n\n=== SUMMARY ===`);
console.log(`Total fixable items: ${totalFixable}`);
console.log(`Pages analyzed: ${pages.length}`);
