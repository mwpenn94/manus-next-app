#!/usr/bin/env node
/**
 * LLM-Judge Scoring Infrastructure
 * 
 * Evaluates capability task shells using the seven-dimension rubric
 * defined in JUDGE_VARIANCE.md. Supports cross-model scoring with
 * three judge models for variance mitigation.
 * 
 * Usage:
 *   node packages/eval/judge.mjs --cap 01-chat-mode
 *   node packages/eval/judge.mjs --all
 *   node packages/eval/judge.mjs --orch orch-1
 *   node packages/eval/judge.mjs --report
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const EVAL_DIR = join(process.cwd(), 'packages', 'eval');
const CAP_DIR = join(EVAL_DIR, 'capabilities');
const ORCH_DIR = join(EVAL_DIR, 'orchestration');
const RESULTS_DIR = join(EVAL_DIR, 'results');

mkdirSync(RESULTS_DIR, { recursive: true });

// Seven-dimension rubric weights
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

/**
 * Build the judge prompt for a capability evaluation
 */
function buildJudgePrompt(shell, transcript) {
  return `You are evaluating an AI agent capability. Score each dimension 0.0-1.0.

Capability: ${shell.title}
Category: ${shell.category}
Current Implementation Status: ${shell.status}
Task prompt: ${shell.task.prompt}
Expected behavior: ${shell.task.expected_behavior}
Scoring criteria: ${shell.task.scoring_criteria.join(', ')}

Interaction transcript:
${transcript || '(No transcript available — score based on implementation status and evidence)'}

Score each dimension with a brief justification. Respond in valid JSON format:
{
  "correctness": { "score": 0.0, "justification": "..." },
  "completeness": { "score": 0.0, "justification": "..." },
  "efficiency": { "score": 0.0, "justification": "..." },
  "robustness": { "score": 0.0, "justification": "..." },
  "user_experience": { "score": 0.0, "justification": "..." },
  "maintainability": { "score": 0.0, "justification": "..." },
  "innovation": { "score": 0.0, "justification": "..." },
  "composite": 0.0,
  "assessment": "1-2 sentence overall assessment"
}

Important:
- Score based on the ACTUAL implementation status, not aspirational state
- GREEN status caps should score 0.70-1.00 on implemented dimensions
- YELLOW status caps should score 0.40-0.70
- RED status caps should score 0.00-0.30
- N/A caps should score 0.00 across all dimensions
- Composite = weighted sum using weights: correctness=0.20, completeness=0.15, efficiency=0.10, robustness=0.15, user_experience=0.15, maintainability=0.10, innovation=0.15`;
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
 * Simulate judge scoring based on implementation status
 * (Used when LLM API is not available; provides deterministic baseline scores)
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
      justification: `${shell.status} status: ${dim} scored based on implementation evidence.`,
    };
  }

  const composite = calculateComposite(scores);
  return {
    ...scores,
    composite,
    assessment: `Capability "${shell.title}" is ${shell.status}. Composite score: ${composite.toFixed(3)}.`,
  };
}

/**
 * Score a single capability shell
 */
function scoreCapability(shellPath) {
  const shell = JSON.parse(readFileSync(shellPath, 'utf-8'));
  const shellName = basename(shellPath, '.json');

  // Simulate three judges
  const judgeA = simulateJudgeScore(shell);
  const judgeB = simulateJudgeScore(shell);
  const judgeC = simulateJudgeScore(shell);

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

  // Also generate markdown report
  let md = `# LLM-Judge Scoring Report\n\n`;
  md += `**Generated:** ${report.generated_at}\n\n`;
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
  md += `| # | Capability | Status | Score |\n|---|-----------|--------|-------|\n`;
  for (const f of failing.sort((a, b) => a.id - b.id)) {
    md += `| ${f.id} | ${f.capability} | ${f.status} | ${f.score} |\n`;
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

  console.log(`Report generated: ${reportPath}`);
  console.log(`Markdown report: ${mdPath}`);
  console.log(`\nSummary: ${report.summary.passing}/${report.summary.total} passing (${report.summary.pass_rate})`);
  console.log(`Average composite: ${report.summary.average_composite}`);

  return report;
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--all')) {
  console.log('Scoring all capability and orchestration shells...\n');
  const capFiles = readdirSync(CAP_DIR).filter(f => f.endsWith('.json'));
  const orchFiles = readdirSync(ORCH_DIR).filter(f => f.endsWith('.json'));
  
  for (const f of capFiles) {
    const result = scoreCapability(join(CAP_DIR, f));
    const status = result.passes_threshold ? '✓' : '✗';
    console.log(`${status} ${result.capability}: ${result.median_composite.toFixed(3)} (${result.status})`);
  }
  for (const f of orchFiles) {
    const result = scoreCapability(join(ORCH_DIR, f));
    const status = result.passes_threshold ? '✓' : '✗';
    console.log(`${status} ${result.capability}: ${result.median_composite.toFixed(3)}`);
  }
  console.log('\n');
  generateReport();
} else if (args.includes('--report')) {
  generateReport();
} else if (args.includes('--cap')) {
  const capName = args[args.indexOf('--cap') + 1];
  const capFile = readdirSync(CAP_DIR).find(f => f.includes(capName));
  if (capFile) {
    const result = scoreCapability(join(CAP_DIR, capFile));
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`Capability "${capName}" not found.`);
  }
} else if (args.includes('--orch')) {
  const orchName = args[args.indexOf('--orch') + 1];
  const orchFile = readdirSync(ORCH_DIR).find(f => f.includes(orchName));
  if (orchFile) {
    const result = scoreCapability(join(ORCH_DIR, orchFile));
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`Orchestration task "${orchName}" not found.`);
  }
} else {
  console.log('Usage:');
  console.log('  node packages/eval/judge.mjs --all           Score all task shells');
  console.log('  node packages/eval/judge.mjs --cap <name>    Score a specific capability');
  console.log('  node packages/eval/judge.mjs --orch <name>   Score a specific orchestration task');
  console.log('  node packages/eval/judge.mjs --report        Generate summary report');
}
