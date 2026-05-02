/**
 * Batch Auto-Fix: Add error/loading state handling to tRPC queries
 * 
 * Strategy: For queries that destructure `data` but not `isLoading`/`isError`,
 * add those destructured properties. Then for pages that have queries without
 * error handling, add a generic error toast pattern.
 * 
 * This handles the most common pattern: `const { data } = trpc.x.useQuery(...)`
 * by adding `isLoading, isError` to the destructuring.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PAGES_DIR = '/home/ubuntu/manus-next-app/client/src/pages';
const pages = readdirSync(PAGES_DIR).filter(f => f.endsWith('.tsx'));

let totalFixes = 0;

for (const page of pages) {
  const filePath = join(PAGES_DIR, page);
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Pattern 1: Add isError to queries that have `data` but not `isError`
  // Match: const { data: xxx } = trpc.xxx.useQuery(...)
  // But NOT if isError is already there
  const queryRegex = /const\s*\{([^}]*)\}\s*=\s*(trpc\.[a-zA-Z.]+\.useQuery)/g;
  let match;
  const replacements = [];
  
  while ((match = queryRegex.exec(content)) !== null) {
    const destructured = match[1];
    const fullMatch = match[0];
    const startIdx = match.index;
    
    // Skip if already has isError
    if (destructured.includes('isError') || destructured.includes('error')) continue;
    
    // Check if this query variable name is used with .isError later
    const varNameMatch = destructured.match(/(\w+)Query/);
    if (varNameMatch) {
      const varName = varNameMatch[1] + 'Query';
      if (content.includes(`${varName}.isError`) || content.includes(`${varName}.error`)) continue;
    }
    
    // Add isError to the destructuring
    const newDestructured = destructured.trimEnd() + ', isError: _err' + page.replace('.tsx', '').replace(/[^a-zA-Z]/g, '') + totalFixes;
    // Actually, this approach is fragile. Let's just track what needs fixing.
    replacements.push({ line: content.slice(0, startIdx).split('\n').length, text: fullMatch.slice(0, 60) });
    totalFixes++;
  }
  
  if (replacements.length > 0) {
    console.log(`${page}: ${replacements.length} queries need error handling`);
  }
}

console.log(`\nTotal queries needing error state: ${totalFixes}`);
console.log(`\nNote: Auto-fixing destructuring is risky. Instead, we'll add a global error boundary.`);
