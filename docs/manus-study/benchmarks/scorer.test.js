/**
 * §L.27 Scorer Test Suite
 * Validates scorer correctness per §L.27 scorer-drift-check requirements.
 * Run: node scorer.test.js
 */

import { normalize, scoreDimension, computeVerdict, runComparison, validateScorer } from './scorer.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.error(`  \u2717 ${name}`);
  }
}

console.log('\n\u00a7L.27 Scorer Tests\n');

// --- normalize tests ---
console.log('normalize():');

assert(normalize('') === '', 'empty string returns empty');
assert(normalize('  hello  ') === 'hello', 'trims whitespace');
assert(normalize('line1\n\n\n\nline2') === 'line1\n\nline2', 'collapses multiple blank lines');
assert(normalize('1. item\n2. item') === '- item\n- item', 'normalizes numbered lists to bullets');

// JSON normalization
const jsonInput = JSON.stringify({ name: 'Alice', age: 30 });
const jsonNorm = normalize(jsonInput);
assert(jsonNorm.includes('**name:**'), 'JSON keys become bold');
assert(jsonNorm.includes('Alice'), 'JSON values preserved');

// Null/undefined
assert(normalize(null) === '', 'null returns empty');
assert(normalize(undefined) === '', 'undefined returns empty');

// --- scoreDimension tests ---
console.log('\nscoreDimension():');

const dims = [
  { id: 'correctness', name: 'Correctness', description: '' },
  { id: 'completeness', name: 'Completeness', description: '' },
  { id: 'efficiency', name: 'Efficiency', description: '' },
  { id: 'robustness', name: 'Robustness', description: '' },
  { id: 'ux', name: 'User Experience', description: '' },
  { id: 'cost', name: 'Cost', description: '' },
  { id: 'latency', name: 'Latency', description: '' },
  { id: 'output_quality', name: 'Output Quality', description: '' },
  { id: 'tool_strategy', name: 'Tool Strategy', description: '' },
  { id: 'failure_recovery', name: 'Failure Recovery', description: '' },
  { id: 'novel_behavior', name: 'Novel Behavior', description: '' },
];

// Empty output always scores 0
for (const dim of dims) {
  assert(scoreDimension(dim, '', null) === 0, `${dim.id}: empty output = 0`);
}

// Non-empty output scores > 0
for (const dim of dims) {
  const score = scoreDimension(dim, 'Some meaningful content here', null);
  assert(score > 0, `${dim.id}: non-empty output > 0 (got ${score})`);
}

// All scores in range [0, 5]
const longOutput = 'A '.repeat(3000) + '```code``` **bold** ## heading error handle edge case fallback retry alternatively novel tool api';
for (const dim of dims) {
  const score = scoreDimension(dim, longOutput, null);
  assert(score >= 0 && score <= 5, `${dim.id}: score in range [0,5] (got ${score})`);
}

// --- computeVerdict tests ---
console.log('\ncomputeVerdict():');

assert(computeVerdict(3.0, 3.0) === 'MATCH', 'equal scores = MATCH');
assert(computeVerdict(3.2, 3.0) === 'MATCH', '0.2 delta = MATCH');
assert(computeVerdict(3.5, 3.0) === 'MATCH', '0.5 delta = MATCH');
assert(computeVerdict(4.0, 3.0) === 'EXCEED', '1.0 delta = EXCEED');
assert(computeVerdict(2.0, 3.0) === 'LAG', '-1.0 delta = LAG');
assert(computeVerdict(0, 5) === 'LAG', '0 vs 5 = LAG');
assert(computeVerdict(5, 0) === 'EXCEED', '5 vs 0 = EXCEED');

// --- runComparison tests ---
console.log('\nrunComparison():');

const taskDef = { id: 'TASK-TEST', category: 'verify' };

// Identical outputs should all MATCH
const identicalResult = runComparison(
  { output: 'identical content here' },
  { output: 'identical content here' },
  taskDef
);
assert(identicalResult.verdictSummary.MATCH === Object.keys(identicalResult.verdicts).length, 'identical outputs: all MATCH');
assert(identicalResult.blinded === true, 'comparison is blinded');
assert(identicalResult.sanityIssues.length === 0, 'no sanity issues');

// Empty vs non-empty should show differences
const asymResult = runComparison(
  { output: 'A comprehensive response with **formatting**, ```code blocks```, error handling, edge cases, fallback, retry, alternatively novel tool api. '.repeat(10) },
  { output: '' },
  taskDef
);
const hasExceedOrLag = asymResult.verdictSummary.EXCEED > 0 || asymResult.verdictSummary.LAG > 0;
assert(hasExceedOrLag, 'asymmetric outputs: has EXCEED or LAG verdicts');

// --- validateScorer tests ---
console.log('\nvalidateScorer():');

const validation = validateScorer();
assert(validation.allPassed === true, 'all scorer validation checks pass');
assert(validation.checks.length >= 10, `sufficient checks run (${validation.checks.length})`);

// --- formatNormalizer golden pairs (§L.27 requirement: >=20 assertions) ---
console.log('\nformatNormalizer golden pairs:');

// Pair 1: JSON vs markdown equivalent
const json1 = normalize(JSON.stringify({ title: 'Report', items: ['A', 'B', 'C'] }));
assert(json1.includes('Report') && json1.includes('A'), 'JSON to markdown preserves content');

// Pair 2: Numbered vs bullet list
const numList = '1. First\n2. Second';
const bulList = '- First\n- Second';
assert(normalize(numList) === normalize(bulList), 'numbered and bullet lists normalize equal');

// Pair 3: Extra whitespace
assert(normalize('  hello  world  ') === 'hello  world', 'extra whitespace trimmed');

// Pair 4: Multiple blank lines
const multiBlank = 'a\n\n\n\nb';
const expectedBlank = 'a\n\nb';
assert(normalize(multiBlank) === expectedBlank, 'multiple blanks collapsed');

// Pair 5: Single item list
assert(normalize('1. Only item') === '- Only item', 'single numbered item normalized');

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
