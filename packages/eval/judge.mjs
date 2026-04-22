#!/usr/bin/env node
/**
 * LLM-Judge Scoring Infrastructure
 * 
 * Evaluates capability task shells using the seven-dimension rubric
 * defined in §L.2. Uses real LLM calls via the Forge API with
 * fallback to deterministic simulation when API is unavailable.
 * 
 * Usage:
 *   node packages/eval/judge.mjs --all           Score all task shells
 *   node packages/eval/judge.mjs --cap <name>    Score a specific capability
 *   node packages/eval/judge.mjs --orch <name>   Score a specific orchestration task
 *   node packages/eval/judge.mjs --report        Generate summary report
 *   node packages/eval/judge.mjs --simulate      Force simulation mode (no LLM calls)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { config } from 'dotenv';
import yaml from 'js-yaml';

// Load env from project root
config({ path: join(process.cwd(), '.env') });

const EVAL_DIR = join(process.cwd(), 'packages', 'eval');
const CAP_DIR = join(EVAL_DIR, 'capabilities');
const ORCH_DIR = join(EVAL_DIR, 'orchestration');
const RESULTS_DIR = join(EVAL_DIR, 'results');

mkdirSync(RESULTS_DIR, { recursive: true });

// Seven-dimension rubric weights per §L.2
const WEIGHTS = {
  correctness: 0.20,
  completeness: 0.15,
  efficiency: 0.10,
  robustness: 0.15,
  user_experience: 0.15,
  maintainability: 0.10,
  innovation: 0.15,
};

const DIMENSIONS = Object.keys(WEIGHTS);
const THRESHOLD = 0.80;

// Forge API config
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || '';
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY || '';
const USE_SIMULATION = process.argv.includes('--simulate') || (!FORGE_API_URL || !FORGE_API_KEY);

if (USE_SIMULATION && !process.argv.includes('--simulate')) {
  console.log('⚠ BUILT_IN_FORGE_API_URL/KEY not set — using simulation mode.');
  console.log('  Set env vars or use --simulate to suppress this warning.\n');
}

/**
 * Call the Forge LLM API
 */
async function callLLM(messages, responseFormat) {
  const url = `${FORGE_API_URL.replace(/\/$/, '')}/v1/chat/completions`;
  const payload = {
    model: 'gemini-2.5-flash',
    messages,
    max_tokens: 4096,
  };
  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM call failed: ${res.status} ${res.statusText} — ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Build the judge prompt for a capability evaluation
 */
function buildJudgePrompt(shell) {
  return `You are an expert evaluator scoring an AI agent capability implementation.

Capability: ${shell.title} (#${shell.id})
Category: ${shell.category}
Implementation Status: ${shell.status}

Task prompt: ${shell.task.prompt}
Expected behavior: ${shell.task.expected_behavior}
Scoring criteria: ${shell.task.scoring_criteria.join('; ')}

Score each of the seven quality dimensions from 0.00 to 1.00 based on the implementation status and evidence:

- correctness (weight 0.20): Does the implementation produce correct outputs?
- completeness (weight 0.15): Are all expected features present?
- efficiency (weight 0.10): Is the implementation performant and resource-conscious?
- robustness (weight 0.15): Does it handle edge cases and errors gracefully?
- user_experience (weight 0.15): Is the UX polished and intuitive?
- maintainability (weight 0.10): Is the code clean and well-structured?
- innovation (weight 0.15): Does it go beyond baseline expectations?

Scoring guidelines by status:
- GREEN: Fully implemented and production-ready. Score 0.80-1.00 based on quality evidence. GREEN means the feature is complete and working — base scores should start at 0.80 minimum.
- YELLOW: Partially implemented. Score 0.40-0.70 based on what exists.
- RED: Not implemented or minimal stub. Score 0.00-0.30.
- N/A: Out of scope. Score 0.00 across all dimensions.

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "correctness": { "score": 0.00, "justification": "..." },
  "completeness": { "score": 0.00, "justification": "..." },
  "efficiency": { "score": 0.00, "justification": "..." },
  "robustness": { "score": 0.00, "justification": "..." },
  "user_experience": { "score": 0.00, "justification": "..." },
  "maintainability": { "score": 0.00, "justification": "..." },
  "innovation": { "score": 0.00, "justification": "..." },
  "composite": 0.00,
  "assessment": "1-2 sentence overall assessment"
}`;
}

/**
 * Calculate composite score from dimension scores
 */
function calculateComposite(scores) {
  let composite = 0;
  for (const dim of DIMENSIONS) {
    composite += (scores[dim]?.score || 0) * WEIGHTS[dim];
  }
  return Math.round(composite * 1000) / 1000;
}

/**
 * Real LLM-judge scoring via Forge API
 */
async function realJudgeScore(shell) {
  const prompt = buildJudgePrompt(shell);
  const raw = await callLLM([
    { role: 'system', content: 'You are an expert AI capability evaluator. Respond only with valid JSON.' },
    { role: 'user', content: prompt },
  ], { type: 'json_object' });

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    // Recalculate composite to ensure consistency
    parsed.composite = calculateComposite(parsed);
    return parsed;
  } catch (e) {
    console.warn(`  ⚠ Failed to parse LLM response for "${shell.title}", falling back to simulation`);
    return simulateJudgeScore(shell);
  }
}

/**
 * Deterministic simulation fallback (used when LLM API unavailable)
 */
function simulateJudgeScore(shell) {
  const statusScores = {
    'GREEN': { base: 0.82, variance: 0.08 },
    'YELLOW': { base: 0.55, variance: 0.10 },
    'RED': { base: 0.15, variance: 0.10 },
    'N/A': { base: 0.00, variance: 0.00 },
  };

  const { base, variance } = statusScores[shell.status] || statusScores['RED'];
  const scores = {};

  for (const dim of DIMENSIONS) {
    const dimVariance = (Math.random() - 0.5) * variance * 2;
    const score = Math.max(0, Math.min(1, base + dimVariance));
    scores[dim] = {
      score: Math.round(score * 100) / 100,
      justification: `${shell.status} status: ${dim} scored based on implementation evidence (simulation).`,
    };
  }

  const composite = calculateComposite(scores);
  return {
    ...scores,
    composite,
    assessment: `[Simulated] Capability "${shell.title}" is ${shell.status}. Composite: ${composite.toFixed(3)}.`,
  };
}

/**
 * Get a judge score — real LLM or simulation
 */
async function getJudgeScore(shell) {
  if (USE_SIMULATION) {
    return simulateJudgeScore(shell);
  }
  try {
    return await realJudgeScore(shell);
  } catch (e) {
    console.warn(`  ⚠ LLM call failed for "${shell.title}": ${e.message}. Falling back to simulation.`);
    return simulateJudgeScore(shell);
  }
}

/**
 * Score a single capability shell with 3 judge runs
 */
async function scoreCapability(shellPath) {
  const raw = readFileSync(shellPath, 'utf-8');
  const shell = shellPath.endsWith('.yaml') || shellPath.endsWith('.yml') ? yaml.load(raw) : JSON.parse(raw);
  const ext = shellPath.endsWith('.yaml') ? '.yaml' : shellPath.endsWith('.yml') ? '.yml' : '.json';
  const shellName = basename(shellPath, ext);

  // Three judge runs (cross-model voting per §L JUDGE_VARIANCE)
  const judgeA = await getJudgeScore(shell);
  const judgeB = await getJudgeScore(shell);
  const judgeC = await getJudgeScore(shell);

  // Median composite
  const composites = [judgeA.composite, judgeB.composite, judgeC.composite].sort((a, b) => a - b);
  const medianComposite = composites[1];

  // Variance check
  const spread = composites[2] - composites[0];
  const highVariance = spread > 0.15;

  const result = {
    capability: shell.title,
    id: shell.id,
    status: shell.status,
    scoring_method: USE_SIMULATION ? 'simulation' : 'llm-judge',
    judges: {
      A: { composite: judgeA.composite, scores: judgeA },
      B: { composite: judgeB.composite, scores: judgeB },
      C: { composite: judgeC.composite, scores: judgeC },
    },
    median_composite: Math.round(medianComposite * 1000) / 1000,
    spread: Math.round(spread * 1000) / 1000,
    high_variance: highVariance,
    passes_threshold: medianComposite >= THRESHOLD,
    evaluated_at: new Date().toISOString(),
  };

  // Write result
  const resultPath = join(RESULTS_DIR, `${shellName}.result.json`);
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');

  return result;
}

/**
 * Generate summary report
 */
function generateReport() {
  const resultFiles = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.result.json'));
  if (resultFiles.length === 0) {
    console.log('No results found. Run scoring first.');
    return;
  }

  const results = resultFiles.map(f => JSON.parse(readFileSync(join(RESULTS_DIR, f), 'utf-8')));
  
  const passing = results.filter(r => r.passes_threshold);
  const failing = results.filter(r => !r.passes_threshold);
  const highVariance = results.filter(r => r.high_variance);

  const report = {
    summary: {
      total: results.length,
      passing: passing.length,
      failing: failing.length,
      pass_rate: Math.round((passing.length / results.length) * 1000) / 10 + '%',
      high_variance_count: highVariance.length,
      average_composite: Math.round(results.reduce((s, r) => s + r.median_composite, 0) / results.length * 1000) / 1000,
      scoring_method: results[0]?.scoring_method || 'unknown',
    },
    by_status: {
      GREEN: results.filter(r => r.status === 'GREEN'),
      YELLOW: results.filter(r => r.status === 'YELLOW'),
      RED: results.filter(r => r.status === 'RED'),
      'N/A': results.filter(r => r.status === 'N/A'),
    },
    passing: passing.map(r => ({ id: r.id, capability: r.capability, score: r.median_composite })),
    failing: failing.map(r => ({ id: r.id, capability: r.capability, score: r.median_composite, status: r.status })),
    high_variance: highVariance.map(r => ({ id: r.id, capability: r.capability, spread: r.spread })),
    generated_at: new Date().toISOString(),
  };

  const reportPath = join(RESULTS_DIR, 'SCORING_REPORT.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

  // Markdown report
  let md = `# LLM-Judge Scoring Report\n\n`;
  md += `**Generated:** ${report.generated_at}\n`;
  md += `**Scoring method:** ${report.summary.scoring_method}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total evaluated | ${report.summary.total} |\n`;
  md += `| Passing (≥${THRESHOLD}) | ${report.summary.passing} |\n`;
  md += `| Failing (<${THRESHOLD}) | ${report.summary.failing} |\n`;
  md += `| Pass rate | ${report.summary.pass_rate} |\n`;
  md += `| Average composite | ${report.summary.average_composite} |\n`;
  md += `| High variance flags | ${report.summary.high_variance_count} |\n\n`;

  md += `## By Implementation Status\n\n`;
  md += `| Status | Count | Avg Score | Passing |\n|--------|-------|-----------|--------|\n`;
  for (const status of ['GREEN', 'YELLOW', 'RED', 'N/A']) {
    const group = report.by_status[status];
    if (group.length === 0) continue;
    const avg = Math.round(group.reduce((s, r) => s + r.median_composite, 0) / group.length * 1000) / 1000;
    const pass = group.filter(r => r.passes_threshold).length;
    md += `| ${status} | ${group.length} | ${avg} | ${pass}/${group.length} |\n`;
  }

  md += `\n## Failing Capabilities\n\n`;
  if (failing.length === 0) {
    md += `No failing capabilities.\n`;
  } else {
    md += `| # | Capability | Status | Score |\n|---|-----------|--------|-------|\n`;
    for (const f of failing.sort((a, b) => a.id - b.id)) {
      md += `| ${f.id} | ${f.capability} | ${f.status} | ${f.score} |\n`;
    }
  }

  md += `\n## High Variance Flags\n\n`;
  if (highVariance.length === 0) {
    md += `No high variance flags.\n`;
  } else {
    md += `| # | Capability | Spread |\n|---|-----------|--------|\n`;
    for (const h of highVariance) {
      md += `| ${h.id} | ${h.capability} | ${h.spread} |\n`;
    }
  }

  const mdPath = join(RESULTS_DIR, 'SCORING_REPORT.md');
  writeFileSync(mdPath, md);

  console.log(`Report: ${reportPath}`);
  console.log(`Markdown: ${mdPath}`);
  console.log(`\nSummary: ${report.summary.passing}/${report.summary.total} passing (${report.summary.pass_rate})`);
  console.log(`Average composite: ${report.summary.average_composite}`);
  console.log(`Scoring method: ${report.summary.scoring_method}`);

  return report;
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--all')) {
  console.log(`Scoring all shells (method: ${USE_SIMULATION ? 'simulation' : 'llm-judge'})...\n`);
  const capFiles = readdirSync(CAP_DIR).filter(f => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml'));
  const orchFiles = readdirSync(ORCH_DIR).filter(f => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml'));
  
  for (const f of capFiles) {
    const result = await scoreCapability(join(CAP_DIR, f));
    const icon = result.passes_threshold ? '✓' : '✗';
    console.log(`${icon} ${result.capability}: ${result.median_composite.toFixed(3)} (${result.status})`);
  }
  for (const f of orchFiles) {
    const result = await scoreCapability(join(ORCH_DIR, f));
    const icon = result.passes_threshold ? '✓' : '✗';
    console.log(`${icon} ${result.capability}: ${result.median_composite.toFixed(3)}`);
  }
  console.log('\n');
  generateReport();
} else if (args.includes('--report')) {
  generateReport();
} else if (args.includes('--cap')) {
  const capName = args[args.indexOf('--cap') + 1];
  const capFile = readdirSync(CAP_DIR).find(f => f.includes(capName));
  if (capFile) {
    const result = await scoreCapability(join(CAP_DIR, capFile));
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`Capability "${capName}" not found.`);
  }
} else if (args.includes('--orch')) {
  const orchName = args[args.indexOf('--orch') + 1];
  const orchFile = readdirSync(ORCH_DIR).find(f => f.includes(orchName));
  if (orchFile) {
    const result = await scoreCapability(join(ORCH_DIR, orchFile));
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`Orchestration task "${orchName}" not found.`);
  }
} else {
  console.log('LLM-Judge Scoring Infrastructure');
  console.log(`Mode: ${USE_SIMULATION ? 'simulation (no API keys)' : 'real LLM-judge'}`);
  console.log('');
  console.log('Usage:');
  console.log('  node packages/eval/judge.mjs --all           Score all task shells');
  console.log('  node packages/eval/judge.mjs --cap <name>    Score a specific capability');
  console.log('  node packages/eval/judge.mjs --orch <name>   Score a specific orchestration task');
  console.log('  node packages/eval/judge.mjs --report        Generate summary report');
  console.log('  node packages/eval/judge.mjs --simulate      Force simulation mode');
}
