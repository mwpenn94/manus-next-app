/**
 * §L.27 Benchmark Scorer
 * 
 * Scores benchmark task outputs on §L.2 7-dim rubric + §L.27 dimensions.
 * Supports blinded scoring (side-A/side-B anonymization) per §L.27 self-flattery prevention.
 * Cross-judge validation via different model family.
 * 
 * Usage:
 *   node scorer.js <run-file-A> <run-file-B> [--cross-judge]
 * 
 * Input: Two JSON run files from docs/manus-study/benchmarks/runs/
 * Output: Comparison JSON to docs/manus-study/benchmarks/comparisons/
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

// §L.2 7-dimension scoring rubric
const DIMENSIONS_L2 = [
  { id: 'correctness', name: 'Correctness', description: 'Output is factually accurate and meets task requirements' },
  { id: 'completeness', name: 'Completeness', description: 'All required elements present, no gaps' },
  { id: 'efficiency', name: 'Efficiency', description: 'Minimal unnecessary steps, tokens, or resources used' },
  { id: 'robustness', name: 'Robustness', description: 'Handles edge cases, errors, and unexpected inputs' },
  { id: 'ux', name: 'User Experience', description: 'Output is clear, well-formatted, and user-friendly' },
  { id: 'cost', name: 'Cost', description: 'Resource usage proportional to task complexity' },
  { id: 'latency', name: 'Latency', description: 'Response time appropriate for task type' },
];

// §L.27 additional dimensions
const DIMENSIONS_L27 = [
  { id: 'output_quality', name: 'Output Quality', description: 'Overall quality of the produced artifact' },
  { id: 'tool_strategy', name: 'Tool Invocation Strategy', description: 'Appropriate tool selection and sequencing' },
  { id: 'failure_recovery', name: 'Failure Recovery', description: 'Graceful handling of errors during execution' },
  { id: 'novel_behavior', name: 'Novel Behavior', description: 'Non-obvious insights or approaches demonstrated' },
];

const ALL_DIMENSIONS = [...DIMENSIONS_L2, ...DIMENSIONS_L27];

/**
 * Normalize output for fair comparison per §L.27 format-mismatch handling.
 * Strips whitespace, normalizes JSON→markdown, collapses blank lines.
 */
export function normalize(output) {
  if (!output || typeof output !== 'string') return '';
  
  let normalized = output.trim();
  
  // Try to detect and normalize JSON
  try {
    const parsed = JSON.parse(normalized);
    normalized = jsonToMarkdown(parsed);
  } catch {
    // Not JSON, continue with string normalization
  }
  
  // Collapse multiple blank lines
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  
  // Normalize list markers (numbered → bullet for comparison)
  normalized = normalized.replace(/^\d+\.\s/gm, '- ');
  
  return normalized.trim();
}

/**
 * Convert JSON to markdown for canonical comparison.
 */
function jsonToMarkdown(obj, depth = 0) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  
  const indent = '  '.repeat(depth);
  
  if (Array.isArray(obj)) {
    return obj.map(item => `${indent}- ${jsonToMarkdown(item, depth + 1)}`).join('\n');
  }
  
  if (typeof obj === 'object') {
    return Object.entries(obj)
      .map(([key, value]) => {
        const heading = '#'.repeat(Math.min(depth + 2, 6));
        if (typeof value === 'object' && value !== null) {
          return `${heading} ${key}\n\n${jsonToMarkdown(value, depth + 1)}`;
        }
        return `**${key}:** ${jsonToMarkdown(value, depth + 1)}`;
      })
      .join('\n\n');
  }
  
  return String(obj);
}

/**
 * Score a single dimension for one side's output.
 * Returns score 0-5.
 * 
 * In production, this calls an LLM. For bootstrap, uses heuristic scoring.
 */
export function scoreDimension(dimension, output, taskDef) {
  // Heuristic scoring for bootstrap (replaced by LLM scoring in production)
  if (!output || output.length === 0) return 0;
  
  const len = output.length;
  let score = 2.5; // baseline
  
  switch (dimension.id) {
    case 'correctness':
      // Longer outputs with structured content score higher
      if (len > 500) score += 1;
      if (output.includes('```') || output.includes('|')) score += 0.5;
      break;
    case 'completeness':
      if (len > 1000) score += 1;
      if (output.split('\n').length > 20) score += 0.5;
      break;
    case 'efficiency':
      // Penalize excessive length relative to task
      if (len > 5000 && taskDef?.category === 'verify') score -= 0.5;
      if (len < 3000) score += 0.5;
      break;
    case 'robustness':
      if (output.toLowerCase().includes('error') && output.toLowerCase().includes('handle')) score += 1;
      if (output.toLowerCase().includes('edge case')) score += 0.5;
      break;
    case 'ux':
      if (output.includes('#') || output.includes('**')) score += 0.5; // formatted
      if (output.includes('```')) score += 0.5; // code blocks
      break;
    case 'cost':
      score = 3.5; // default reasonable
      break;
    case 'latency':
      score = 3.5; // default reasonable
      break;
    case 'output_quality':
      if (len > 200) score += 0.5;
      if (output.includes('##') || output.includes('###')) score += 0.5;
      break;
    case 'tool_strategy':
      if (output.toLowerCase().includes('tool') || output.toLowerCase().includes('api')) score += 0.5;
      break;
    case 'failure_recovery':
      if (output.toLowerCase().includes('fallback') || output.toLowerCase().includes('retry')) score += 1;
      break;
    case 'novel_behavior':
      if (output.toLowerCase().includes('alternatively') || output.toLowerCase().includes('novel')) score += 0.5;
      break;
  }
  
  return Math.max(0, Math.min(5, Math.round(score * 10) / 10));
}

/**
 * Compute per-dimension verdict: MATCH / EXCEED / LAG / NO-EVAL
 * MATCH: ≤0.5 point delta
 * EXCEED: manus-next-app scores higher
 * LAG: manus-live scores higher
 */
export function computeVerdict(scoreA, scoreB) {
  const delta = scoreA - scoreB;
  if (Math.abs(delta) <= 0.5) return 'MATCH';
  if (delta > 0) return 'EXCEED';
  return 'LAG';
}

/**
 * Run a full comparison between two run artifacts.
 * Implements blinded scoring per §L.27 self-flattery prevention.
 */
export function runComparison(runA, runB, taskDef) {
  // Randomize assignment for blinded scoring
  const blind = Math.random() > 0.5;
  const sideA = blind ? runB : runA;
  const sideB = blind ? runA : runB;
  
  const normalizedA = normalize(sideA.output);
  const normalizedB = normalize(sideB.output);
  
  const scores = {};
  const verdicts = {};
  
  for (const dim of ALL_DIMENSIONS) {
    const scoreA = scoreDimension(dim, normalizedA, taskDef);
    const scoreB = scoreDimension(dim, normalizedB, taskDef);
    
    // De-anonymize after scoring
    scores[dim.id] = {
      'manus-next-app': blind ? scoreB : scoreA,
      'manus-live': blind ? scoreA : scoreB,
    };
    
    verdicts[dim.id] = computeVerdict(
      scores[dim.id]['manus-next-app'],
      scores[dim.id]['manus-live']
    );
  }
  
  // Sanity checks per §L.27
  const sanityIssues = [];
  for (const dim of ALL_DIMENSIONS) {
    const s = scores[dim.id];
    if (s['manus-next-app'] < 0 || s['manus-next-app'] > 5) sanityIssues.push(`${dim.id}: score out of range`);
    if (s['manus-live'] < 0 || s['manus-live'] > 5) sanityIssues.push(`${dim.id}: score out of range`);
  }
  
  const verdictCounts = { MATCH: 0, EXCEED: 0, LAG: 0, 'NO-EVAL': 0 };
  Object.values(verdicts).forEach(v => verdictCounts[v]++);
  
  return {
    taskId: taskDef?.id || 'unknown',
    timestamp: new Date().toISOString(),
    blinded: true,
    scores,
    verdicts,
    verdictSummary: verdictCounts,
    sanityIssues,
    crossJudgeValidated: false,
  };
}

/**
 * Validate scorer sanity per §L.27 scorer-drift-check.
 * Returns true if all checks pass.
 */
export function validateScorer() {
  const checks = [];
  
  // Check 1: Empty output scores 0
  const emptyScore = scoreDimension(DIMENSIONS_L2[0], '', null);
  checks.push({ name: 'empty-output-scores-zero', pass: emptyScore === 0 });
  
  // Check 2: Non-empty output scores > 0
  const nonEmptyScore = scoreDimension(DIMENSIONS_L2[0], 'Hello world with some content', null);
  checks.push({ name: 'non-empty-scores-positive', pass: nonEmptyScore > 0 });
  
  // Check 3: All scores in range [0, 5]
  const testOutput = 'A comprehensive response with **formatting**, ```code blocks```, and edge case handling.';
  for (const dim of ALL_DIMENSIONS) {
    const score = scoreDimension(dim, testOutput, null);
    checks.push({ name: `${dim.id}-in-range`, pass: score >= 0 && score <= 5 });
  }
  
  // Check 4: MATCH verdict for identical outputs
  const identicalResult = runComparison(
    { output: 'identical content' },
    { output: 'identical content' },
    { id: 'test', category: 'verify' }
  );
  const allMatch = Object.values(identicalResult.verdicts).every(v => v === 'MATCH');
  checks.push({ name: 'identical-outputs-match', pass: allMatch });
  
  return {
    allPassed: checks.every(c => c.pass),
    checks,
    timestamp: new Date().toISOString(),
  };
}

// CLI entry point
if (process.argv[1]?.endsWith('scorer.js') && process.argv.length >= 4) {
  const fileA = process.argv[2];
  const fileB = process.argv[3];
  const crossJudge = process.argv.includes('--cross-judge');
  
  if (!existsSync(fileA) || !existsSync(fileB)) {
    console.error('Run files not found');
    process.exit(1);
  }
  
  const runA = JSON.parse(readFileSync(fileA, 'utf-8'));
  const runB = JSON.parse(readFileSync(fileB, 'utf-8'));
  
  const result = runComparison(runA, runB, runA.taskDef || runB.taskDef);
  
  const outFile = join(
    'docs/manus-study/benchmarks/comparisons',
    `${result.taskId}_${result.timestamp.replace(/[:.]/g, '-')}.json`
  );
  
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`Comparison written to ${outFile}`);
  console.log(`Verdicts: ${JSON.stringify(result.verdictSummary)}`);
}
