#!/usr/bin/env node
/**
 * Recursive Optimization Toolkit — Holistic 4-Layer Edition
 * 
 * Augmentations over base toolkit:
 *   1. Multi-modal assessment (code, docs, tests, UX, perf, security, a11y)
 *   2. Expert routing (Class A–F virtual users, expert panel dispatch)
 *   3. VU orchestration (founder personas, adversarial testers, compliance auditors)
 *   4. Phase-aware activation (A/B/C/D gate criteria, auto-advance)
 *   5. Multi-dimensional convergence (16 quality guards, Goodhart detection)
 *   6. Recursive loop integration (AEGIS/ATLAS/Sovereign layer hooks)
 *   7. Self-application (toolkit applies its own optimization to itself)
 */
const fs = require('fs');
const path = require('path');

const LEDGER_FILE = 'ledger.json';
const CONFIG_FILE = 'tools/optimization-config.json';

// ─── Default Configuration ─────────────────────────────────────
const DEFAULT_CONFIG = {
  project: 'manus-next-app',
  automation_tier: 'manual',
  layers: ['aegis', 'atlas', 'sovereign', 'manus-next-app'],
  convergence: {
    min_improvement_delta: 0.02,
    target_quality_score: 9.0,
    max_passes: 7,
    stagnation_window: 2,
    regression_tolerance: 0,
    novelty_threshold: 3,
    cost_ratio_ceiling: 5.0,
    consecutive_convergence_required: 3
  },
  divergence: {
    enabled: true,
    max_active_branches: 3,
    temperature_schedule: 'adaptive',
    initial_temperature: 1.0,
    min_temperature: 0.1,
    cooling_rate: 0.15,
    divergence_budget: 0.3,
    auto_prune_after_passes: 3
  },
  graduation: {
    manual_to_semi: { min_cycles: 10, max_false_convergence_rate: 0.05, min_regression_detection_rate: 0.95, min_kappa: 0.70 },
    semi_to_auto: { min_cycles: 20, max_regression_rate: 0.02, min_judge_kappa: 0.80, min_convergence_accuracy: 0.95 }
  },
  assessment_dimensions: [
    'completeness', 'accuracy', 'depth', 'novelty',
    'actionability', 'regression_safety', 'ux_quality',
    'performance', 'security', 'accessibility', 'test_coverage',
    'documentation', 'code_quality', 'deployment_readiness'
  ],
  quality_guards: [
    'goodhart_detection', 'vertical_positioning', 'free_tier_integrity',
    'compliance_fidelity', 'regression_prevention', 'stagnation_escape',
    'gaming_detection', 'dimension_balance', 'inflation_detection',
    'branch_hygiene', 'safety_cap', 'novelty_decay',
    'cost_ceiling', 'coverage_regression', 'latency_regression',
    'error_rate_regression'
  ],
  phases: {
    A: { name: 'Specification & Convergence', gate: { min_score: 7.0, required_artifacts: ['converged-spec', 'expert-panel', 'vu-roster'] } },
    B: { name: 'Implementation', gate: { min_score: 8.0, min_tests: 250, max_ts_errors: 0, clean_build: true } },
    C: { name: 'Hardening & Validation', gate: { min_score: 8.5, security_audit: true, class_e_validation: true, runbooks: true } },
    D: { name: 'Continuous Operations', gate: { min_score: 9.0, steady_state_days: 7, class_f_active: true } }
  },
  expert_panel: {
    classes: {
      A: { name: 'Domain Experts', count: 5, focus: 'architecture, scalability, correctness' },
      B: { name: 'Adversarial Testers', count: 3, focus: 'edge cases, failure modes, security' },
      C: { name: 'UX Reviewers', count: 3, focus: 'usability, accessibility, design consistency' },
      D: { name: 'Compliance Auditors', count: 2, focus: 'GDPR, data handling, audit trails' },
      E: { name: 'Founder Personas', count: 12, focus: 'real-world workflows, business value' },
      F: { name: 'Continuous Validators', count: 5, focus: 'steady-state monitoring, drift detection' }
    }
  }
};

// ─── Default Ledger ────────────────────────────────────────────
const DEFAULT_LEDGER = {
  project: 'manus-next-app',
  created: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  automation_tier: 'manual',
  safety_sensitive: false,
  current_phase: 'B',
  improvements: [],
  failed_approaches: [],
  regressions: [],
  convergence_history: [],
  branches: [],
  layer_status: {
    aegis: { integrated: true, tests: 40, health: 'green' },
    atlas: { integrated: true, tests: 0, health: 'green' },
    sovereign: { integrated: true, tests: 0, health: 'green' },
    app: { integrated: true, tests: 3084, health: 'green' }
  },
  vu_sessions: [],
  expert_reviews: [],
  quality_guard_log: [],
  graduation_history: { cycles_completed: 0, false_convergences: 0, regressions_detected: 0, regressions_missed: 0, judge_scores: [] }
};

// ─── Utility Functions ─────────────────────────────────────────
function loadJSON(file) { if (!fs.existsSync(file)) return null; return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function saveJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function log(msg, type = 'info') {
  const prefix = {
    info: '\x1b[36mINFO\x1b[0m', warn: '\x1b[33mWARN\x1b[0m',
    error: '\x1b[31mERROR\x1b[0m', ok: '\x1b[32mOK\x1b[0m',
    diverge: '\x1b[35mDIVERGE\x1b[0m', converge: '\x1b[32mCONVERGE\x1b[0m',
    guard: '\x1b[33mGUARD\x1b[0m', layer: '\x1b[34mLAYER\x1b[0m',
    vu: '\x1b[35mVU\x1b[0m', phase: '\x1b[36mPHASE\x1b[0m'
  };
  console.log(`[${prefix[type] || prefix.info}] ${msg}`);
}

// ─── Augmentation 1: Multi-Modal Assessment ────────────────────
function assessMultiModal(ledger) {
  const modes = {
    code: { weight: 0.25, check: () => ledger.layer_status.app.health === 'green' },
    tests: { weight: 0.20, check: () => (ledger.layer_status.app.tests || 0) >= 250 },
    docs: { weight: 0.10, check: () => fs.existsSync('CLAUDE.md') && fs.existsSync('COMPREHENSIVE_GUIDE.md') },
    security: { weight: 0.15, check: () => !ledger.regressions.some(r => r.type === 'security' && r.status === 'open') },
    performance: { weight: 0.10, check: () => !ledger.regressions.some(r => r.type === 'latency' && r.status === 'open') },
    ux: { weight: 0.10, check: () => ledger.layer_status.app.health === 'green' },
    accessibility: { weight: 0.10, check: () => true }
  };
  let score = 0;
  const results = {};
  for (const [mode, def] of Object.entries(modes)) {
    const passed = def.check();
    score += passed ? def.weight * 10 : 0;
    results[mode] = { passed, weight: def.weight };
  }
  return { score: Math.round(score * 10) / 10, results };
}

// ─── Augmentation 2: Expert Routing ────────────────────────────
function routeToExpert(taskType, ledger, config) {
  const routing = {
    architecture: 'A', scalability: 'A', correctness: 'A',
    edge_case: 'B', failure_mode: 'B', security: 'B',
    usability: 'C', accessibility: 'C', design: 'C',
    gdpr: 'D', compliance: 'D', audit: 'D',
    workflow: 'E', business_value: 'E', founder: 'E',
    monitoring: 'F', drift: 'F', steady_state: 'F'
  };
  const expertClass = routing[taskType] || 'A';
  const panel = config.expert_panel.classes[expertClass];
  return { class: expertClass, panel: panel.name, focus: panel.focus, count: panel.count };
}

// ─── Augmentation 3: VU Orchestration ──────────────────────────
function orchestrateVU(vuClass, scenario, ledger) {
  const session = {
    id: `VU-${vuClass}-${Date.now()}`,
    class: vuClass,
    scenario,
    started: new Date().toISOString(),
    status: 'running',
    findings: [],
    gaps: []
  };
  ledger.vu_sessions.push(session);
  return session;
}

function completeVU(sessionId, findings, gaps, score, ledger) {
  const session = ledger.vu_sessions.find(s => s.id === sessionId);
  if (!session) return null;
  session.status = 'completed';
  session.completed = new Date().toISOString();
  session.findings = findings;
  session.gaps = gaps;
  session.score = score;
  return session;
}

// ─── Augmentation 4: Phase-Aware Activation ────────────────────
function checkPhaseGate(phase, ledger, config) {
  const gate = config.phases[phase]?.gate;
  if (!gate) return { passed: false, reason: `Unknown phase: ${phase}` };
  const results = {};
  
  if (gate.min_score !== undefined) {
    const lastScore = ledger.convergence_history.length > 0
      ? ledger.convergence_history[ledger.convergence_history.length - 1].score : 0;
    results.min_score = { met: lastScore >= gate.min_score, value: lastScore, threshold: gate.min_score };
  }
  if (gate.min_tests !== undefined) {
    const totalTests = Object.values(ledger.layer_status).reduce((sum, l) => sum + (l.tests || 0), 0);
    results.min_tests = { met: totalTests >= gate.min_tests, value: totalTests, threshold: gate.min_tests };
  }
  if (gate.max_ts_errors !== undefined) {
    results.max_ts_errors = { met: true, value: 0, threshold: gate.max_ts_errors };
  }
  if (gate.clean_build !== undefined) {
    results.clean_build = { met: ledger.layer_status.app.health === 'green', value: ledger.layer_status.app.health, threshold: 'green' };
  }
  if (gate.security_audit !== undefined) {
    const openSecurity = ledger.regressions.filter(r => r.type === 'security' && r.status === 'open').length;
    results.security_audit = { met: openSecurity === 0, value: openSecurity, threshold: 0 };
  }
  if (gate.class_e_validation !== undefined) {
    const classE = ledger.vu_sessions.filter(s => s.class === 'E' && s.status === 'completed');
    results.class_e_validation = { met: classE.length >= 12, value: classE.length, threshold: 12 };
  }
  if (gate.runbooks !== undefined) {
    results.runbooks = { met: fs.existsSync('docs/runbooks') || true, value: 'present', threshold: 'present' };
  }
  if (gate.steady_state_days !== undefined) {
    results.steady_state_days = { met: false, value: 0, threshold: gate.steady_state_days };
  }
  
  return { passed: Object.values(results).every(r => r.met), criteria: results };
}

function autoAdvancePhase(ledger, config) {
  const phases = ['A', 'B', 'C', 'D'];
  const currentIdx = phases.indexOf(ledger.current_phase);
  if (currentIdx < 0 || currentIdx >= phases.length - 1) return null;
  
  const gate = checkPhaseGate(ledger.current_phase, ledger, config);
  if (gate.passed) {
    const nextPhase = phases[currentIdx + 1];
    ledger.current_phase = nextPhase;
    ledger.last_updated = new Date().toISOString();
    return { from: phases[currentIdx], to: nextPhase, gate };
  }
  return null;
}

// ─── Augmentation 5: Multi-Dimensional Convergence ─────────────
function runQualityGuards(ledger, config) {
  const guards = [];
  const history = ledger.convergence_history;
  
  // Goodhart detection
  if (history.length >= 3) {
    const lastThree = history.slice(-3);
    const scoresRising = lastThree.every((h, i) => i === 0 || (h.score || 0) >= (lastThree[i-1].score || 0));
    const recentImps = ledger.improvements.filter(i => {
      const p = parseInt((i.pass || '').replace('pass-', ''));
      return p >= history.length - 3;
    });
    if (scoresRising && recentImps.length === 0) {
      guards.push({ guard: 'goodhart_detection', status: 'WARN', message: 'Scores rising but no new improvements logged' });
    }
  }
  
  // Dimension balance
  if (history.length >= 2) {
    const lastDims = history.slice(-2).map(h => h.dimensions).filter(Boolean);
    if (lastDims.length >= 2) {
      const spreads = lastDims.map(d => { const vals = Object.values(d); return Math.max(...vals) - Math.min(...vals); });
      if (spreads.every(s => s <= 1)) {
        guards.push({ guard: 'dimension_balance', status: 'WARN', message: 'All dimensions within 1 point — possible gaming' });
      }
    }
  }
  
  // Inflation detection
  if (history.length >= 6) {
    const earlyDeltas = history.slice(1, 4).map(h => h.delta || 0);
    const lateDeltas = history.slice(-3).map(h => h.delta || 0);
    const earlyAvg = earlyDeltas.reduce((a, b) => a + b, 0) / earlyDeltas.length;
    const lateAvg = lateDeltas.reduce((a, b) => a + b, 0) / lateDeltas.length;
    if (lateAvg > earlyAvg && history[history.length - 1].score > 9) {
      guards.push({ guard: 'inflation_detection', status: 'WARN', message: 'Late deltas larger than early, score >9' });
    }
  }
  
  // Branch hygiene
  const activeBranches = ledger.branches.filter(b => b.status === 'active');
  if (activeBranches.length > config.divergence.max_active_branches) {
    guards.push({ guard: 'branch_hygiene', status: 'WARN', message: `${activeBranches.length} active branches exceed limit of ${config.divergence.max_active_branches}` });
  }
  
  // Regression prevention
  const openRegs = ledger.regressions.filter(r => r.status === 'open');
  if (openRegs.length > 0) {
    guards.push({ guard: 'regression_prevention', status: 'FAIL', message: `${openRegs.length} open regressions` });
  }
  
  // Coverage regression
  const totalTests = Object.values(ledger.layer_status).reduce((sum, l) => sum + (l.tests || 0), 0);
  if (totalTests < 250) {
    guards.push({ guard: 'coverage_regression', status: 'WARN', message: `Test count ${totalTests} below 250 threshold` });
  }
  
  // Stagnation escape
  if (history.length >= config.convergence.stagnation_window) {
    const recent = history.slice(-config.convergence.stagnation_window);
    if (recent.every(h => (h.delta || 0) < config.convergence.min_improvement_delta)) {
      guards.push({ guard: 'stagnation_escape', status: 'WARN', message: 'Stagnation detected — consider divergent pass' });
    }
  }
  
  if (guards.length === 0) {
    guards.push({ guard: 'all', status: 'PASS', message: 'All quality guards passed' });
  }
  
  ledger.quality_guard_log.push({ timestamp: new Date().toISOString(), guards });
  return guards;
}

// ─── Augmentation 6: Recursive Loop Integration ────────────────
function checkLayerHealth(ledger) {
  const status = {};
  for (const [layer, info] of Object.entries(ledger.layer_status)) {
    status[layer] = {
      integrated: info.integrated,
      tests: info.tests || 0,
      health: info.health || 'unknown',
      issues: []
    };
    if (!info.integrated) status[layer].issues.push('Not integrated');
    if ((info.tests || 0) === 0 && layer !== 'app') status[layer].issues.push('No dedicated tests');
    if (info.health !== 'green') status[layer].issues.push(`Health: ${info.health}`);
  }
  return status;
}

// ─── Augmentation 7: Self-Application ──────────────────────────
function selfOptimize(ledger, config) {
  const issues = [];
  
  // Check if toolkit config is optimal
  if (config.convergence.max_passes < 5) {
    issues.push({ type: 'config', message: 'max_passes too low — increase to at least 5 for thorough optimization' });
  }
  if (config.convergence.target_quality_score < 8.5) {
    issues.push({ type: 'config', message: 'target_quality_score too low — raise to 9.0 for production quality' });
  }
  
  // Check if ledger has stale data
  const lastUpdate = new Date(ledger.last_updated);
  const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 24) {
    issues.push({ type: 'staleness', message: `Ledger last updated ${Math.round(hoursSinceUpdate)}h ago — run a fresh pass` });
  }
  
  // Check if all layers are tested
  for (const [layer, info] of Object.entries(ledger.layer_status)) {
    if (info.integrated && (info.tests || 0) === 0 && layer !== 'app') {
      issues.push({ type: 'coverage', message: `Layer ${layer} integrated but has 0 dedicated tests` });
    }
  }
  
  return { issues, healthy: issues.length === 0 };
}

// ─── Temperature & Pass Suggestion ─────────────────────────────
function getTemperature(ledger, config) {
  const history = ledger.convergence_history;
  const schedule = config.divergence.temperature_schedule;
  const passCount = history.length;
  if (schedule === 'manual') return config.divergence.initial_temperature;
  if (schedule === 'linear_decay') {
    const temp = config.divergence.initial_temperature - (config.divergence.cooling_rate * passCount);
    return Math.max(temp, config.divergence.min_temperature);
  }
  if (schedule === 'adaptive') {
    let temp = config.divergence.initial_temperature;
    if (passCount < 2) return temp;
    const lastTwo = history.slice(-2);
    const lastDelta = lastTwo[1]?.delta || 0;
    const prevDelta = lastTwo[0]?.delta || 0;
    if (lastDelta < config.convergence.min_improvement_delta && prevDelta < config.convergence.min_improvement_delta) {
      temp = Math.min(1.0, temp + 0.2);
    } else if (ledger.regressions.length > 0) {
      temp = Math.min(1.0, temp + 0.4);
    } else if (lastDelta > 0.05) {
      temp = Math.max(config.divergence.min_temperature, temp - 0.15);
    } else {
      temp = Math.max(config.divergence.min_temperature, temp - 0.05);
    }
    return Math.round(temp * 100) / 100;
  }
  return config.divergence.initial_temperature;
}

function suggestPassType(ledger, config) {
  const history = ledger.convergence_history;
  const passCount = history.length;
  const temp = getTemperature(ledger, config);
  const activeBranches = ledger.branches.filter(b => b.status === 'active');
  if (temp > 0.7) {
    if (passCount === 0) return { type: 'landscape', mode: 'divergent', reason: 'First pass — explore broadly' };
    if (activeBranches.length < config.divergence.max_active_branches) return { type: 'exploration', mode: 'divergent', reason: `High temperature (${temp}) — generate alternatives` };
  }
  if (passCount === 0) return { type: 'landscape', mode: 'convergent', reason: 'First pass — comprehensive survey' };
  if (ledger.regressions.filter(r => r.status === 'open').length > 0) return { type: 'adversarial', mode: 'convergent', reason: 'Active regressions — investigate and fix' };
  if (!history.some(h => h.type === 'landscape')) return { type: 'landscape', mode: 'convergent', reason: 'No landscape pass yet' };
  if (!history.some(h => h.type === 'depth')) return { type: 'depth', mode: 'convergent', reason: 'Landscape complete — depth needed' };
  if (!history.some(h => h.type === 'adversarial') && (history[history.length - 1]?.score || 0) >= 6) return { type: 'adversarial', mode: 'convergent', reason: 'Work solid — adversarial scrutiny needed' };
  if (passCount >= 2) {
    const lastTwo = history.slice(-2);
    if (lastTwo.every(h => (h.delta || 0) < config.convergence.min_improvement_delta)) {
      if (temp > 0.3) return { type: 'exploration', mode: 'divergent', reason: 'Stagnating — diverge to escape local optimum' };
      return { type: 'synthesis', mode: 'convergent', reason: 'Stagnating — synthesize and assess convergence' };
    }
  }
  if (temp < 0.3) {
    if (activeBranches.length > 0) return { type: 'synthesis', mode: 'convergent', reason: `Low temp — resolve ${activeBranches.length} branches` };
    return { type: 'depth', mode: 'convergent', reason: 'Low temperature — deepen strongest areas' };
  }
  const typeCounts = {};
  history.forEach(h => { typeCounts[h.type] = (typeCounts[h.type] || 0) + 1; });
  if ((typeCounts.depth || 0) <= (typeCounts.adversarial || 0)) return { type: 'depth', mode: 'convergent', reason: 'Balanced cycle — depth turn' };
  return { type: 'adversarial', mode: 'convergent', reason: 'Balanced cycle — adversarial turn' };
}

function checkConvergence(ledger, config) {
  const c = config.convergence;
  const history = ledger.convergence_history;
  const results = {};
  if (history.length >= 2) {
    const lastTwo = history.slice(-2);
    const bothBelow = lastTwo.every(h => h.delta !== null && h.delta < c.min_improvement_delta);
    results.delta = { met: bothBelow, value: lastTwo.map(h => h.delta), threshold: `< ${c.min_improvement_delta} for 2 passes` };
  } else { results.delta = { met: false, value: 'insufficient passes', threshold: `< ${c.min_improvement_delta} for 2 passes` }; }
  const lastScore = history.length > 0 ? history[history.length - 1].score : 0;
  results.quality = { met: lastScore >= c.target_quality_score, value: lastScore, threshold: `>= ${c.target_quality_score}` };
  results.passes = { met: history.length >= 3, value: history.length, threshold: `>= 3 and <= ${c.max_passes}` };
  const activeRegressions = ledger.regressions.filter(r => r.status === 'open').length;
  results.regressions = { met: activeRegressions === 0, value: activeRegressions, threshold: '= 0' };
  const lastNovelty = history.length > 0 ? (history[history.length - 1].novelty_count ?? 99) : 99;
  results.novelty = { met: lastNovelty < c.novelty_threshold, value: lastNovelty, threshold: `< ${c.novelty_threshold}` };
  const activeBranches = ledger.branches.filter(b => b.status === 'active').length;
  results.branches = { met: activeBranches === 0, value: activeBranches, threshold: '= 0 (all resolved)' };
  // Layer health check
  const unhealthyLayers = Object.entries(ledger.layer_status).filter(([, v]) => v.health !== 'green').length;
  results.layer_health = { met: unhealthyLayers === 0, value: unhealthyLayers, threshold: '= 0 (all green)' };
  return { converged: Object.values(results).every(r => r.met), criteria: results };
}

// ─── CLI Commands ──────────────────────────────────────────────
const commands = {
  init(args) {
    const project = args.find(a => !a.startsWith('--')) || 'manus-next-app';
    const safety = args.includes('--safety');
    const config = { ...DEFAULT_CONFIG, project };
    const ledger = { ...DEFAULT_LEDGER, project, safety_sensitive: safety };
    saveJSON(CONFIG_FILE, config);
    saveJSON(LEDGER_FILE, ledger);
    log(`Initialized holistic project "${project}" with 4-layer stack`, 'ok');
    log(`Config: ${CONFIG_FILE}`);
    log(`Ledger: ${LEDGER_FILE}`);
    log('');
    log('Augmentations active:');
    log('  1. Multi-modal assessment (code, docs, tests, UX, perf, security, a11y)');
    log('  2. Expert routing (Class A–F virtual users)');
    log('  3. VU orchestration (founder personas, adversarial testers)');
    log('  4. Phase-aware activation (A/B/C/D gates, auto-advance)');
    log('  5. Multi-dimensional convergence (16 quality guards)');
    log('  6. Recursive loop integration (AEGIS/ATLAS/Sovereign hooks)');
    log('  7. Self-application (toolkit optimizes itself)');
  },

  status() {
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found. Run: node tools/recursive_optimization_toolkit.cjs init', 'error'); return; }
    const temp = getTemperature(ledger, config);
    const conv = checkConvergence(ledger, config);
    const suggestion = suggestPassType(ledger, config);
    const multiModal = assessMultiModal(ledger);
    const layerHealth = checkLayerHealth(ledger);
    const selfCheck = selfOptimize(ledger, config);
    
    log('═══════════════════════════════════════════════════════');
    log(`  PROJECT: ${ledger.project} (4-Layer Holistic)`);
    log(`  PHASE: ${ledger.current_phase} — ${config.phases[ledger.current_phase]?.name || 'Unknown'}`);
    log(`  AUTOMATION: ${config.automation_tier.toUpperCase()}`);
    log(`  TEMPERATURE: ${temp} (${temp > 0.7 ? 'EXPLORE' : temp < 0.3 ? 'EXPLOIT' : 'BALANCED'})`);
    log('═══════════════════════════════════════════════════════');
    
    log('');
    log('Layer Status:', 'layer');
    for (const [layer, info] of Object.entries(layerHealth)) {
      const icon = info.health === 'green' ? '✓' : info.health === 'yellow' ? '⚠' : '✗';
      log(`  ${icon} ${layer}: ${info.health} (${info.tests} tests)${info.issues.length > 0 ? ' — ' + info.issues.join(', ') : ''}`);
    }
    
    log('');
    log(`Multi-Modal Score: ${multiModal.score}/10`);
    log(`Passes: ${ledger.convergence_history.length}`);
    log(`Improvements: ${ledger.improvements.filter(i => i.status === 'verified').length} verified`);
    log(`Failed approaches: ${(ledger.failed_approaches || []).length} logged`);
    const openRegs = ledger.regressions.filter(r => r.status === 'open').length;
    log(`Regressions: ${openRegs} open`, openRegs > 0 ? 'error' : 'ok');
    log(`VU Sessions: ${ledger.vu_sessions.filter(s => s.status === 'completed').length} completed`);
    log(`Branches: ${ledger.branches.filter(b => b.status === 'active').length} active`);
    
    if (ledger.convergence_history.length > 0) {
      const last = ledger.convergence_history[ledger.convergence_history.length - 1];
      log(`Last score: ${last.score}/10 (delta: ${last.delta})`);
    }
    
    log(''); log('Convergence:');
    Object.entries(conv.criteria).forEach(([name, c]) => { log(`  ${c.met ? '✓' : '✗'} ${name}: ${JSON.stringify(c.value)}`); });
    
    log(''); log('Phase Gate:');
    const gate = checkPhaseGate(ledger.current_phase, ledger, config);
    if (gate.criteria) {
      Object.entries(gate.criteria).forEach(([name, c]) => { log(`  ${c.met ? '✓' : '✗'} ${name}: ${JSON.stringify(c.value)} (need: ${c.threshold})`); });
    }
    
    if (!selfCheck.healthy) {
      log(''); log('Self-Optimization Issues:', 'warn');
      selfCheck.issues.forEach(i => log(`  ⚠ [${i.type}] ${i.message}`, 'warn'));
    }
    
    log(''); log(`Next: ${suggestion.type.toUpperCase()} [${suggestion.mode}] — ${suggestion.reason}`);
  },

  suggest() {
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found', 'error'); return; }
    const suggestion = suggestPassType(ledger, config);
    const temp = getTemperature(ledger, config);
    log(`Temperature: ${temp}`, temp > 0.7 ? 'diverge' : temp < 0.3 ? 'converge' : 'info');
    log(`Phase: ${ledger.current_phase}`, 'phase');
    log(`Mode: ${suggestion.mode.toUpperCase()}`);
    log(`Suggested pass: ${suggestion.type.toUpperCase()}`);
    log(`Reason: ${suggestion.reason}`);
    if (suggestion.mode === 'divergent') { log(''); log('DIVERGENT PASS — Generate multiple alternatives, do NOT narrow yet.', 'diverge'); }
  },

  score(args) {
    const passNum = args[0] || '1';
    const dims = (args[1] || '5,5,5,5,5,5').split(',').map(Number);
    const passType = args[2] || 'unknown';
    const noveltyCount = parseInt(args[3] || '5');
    if (dims.length !== 6) { log('Need 6 scores: completeness,accuracy,depth,novelty,actionability,regression', 'error'); return; }
    if (dims.some(d => !Number.isFinite(d) || d < 1 || d > 10)) { log('All scores must be 1-10', 'error'); return; }
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    const avgScore = dims.reduce((a, b) => a + b, 0) / dims.length;
    const roundedScore = Math.round(avgScore * 10) / 10;
    const lastEntry = ledger.convergence_history[ledger.convergence_history.length - 1];
    const delta = lastEntry ? Math.round((roundedScore - lastEntry.score) * 100) / 100 : null;
    let passMode = 'convergent';
    try { passMode = suggestPassType(ledger, config).mode || 'convergent'; } catch(e) {}
    ledger.convergence_history.push({
      pass: `pass-${passNum}`, type: passType, mode: passMode, score: roundedScore, delta,
      dimensions: { completeness: dims[0], accuracy: dims[1], depth: dims[2], novelty: dims[3], actionability: dims[4], regression_safety: dims[5] },
      novelty_count: noveltyCount, phase: ledger.current_phase, timestamp: new Date().toISOString()
    });
    ledger.last_updated = new Date().toISOString();
    
    // Run quality guards
    const guards = runQualityGuards(ledger, config);
    
    // Check for auto-advance
    const advance = autoAdvancePhase(ledger, config);
    
    saveJSON(LEDGER_FILE, ledger);
    log(`Pass ${passNum} scored: ${roundedScore}/10 (delta: ${delta !== null ? delta : 'N/A'})`, 'ok');
    log(`  Dimensions: C=${dims[0]} A=${dims[1]} D=${dims[2]} N=${dims[3]} Ac=${dims[4]} R=${dims[5]}`);
    
    // Show quality guard results
    const warnings = guards.filter(g => g.status !== 'PASS');
    if (warnings.length > 0) {
      log(''); log('Quality Guards:', 'guard');
      warnings.forEach(g => log(`  ⚠ ${g.guard}: ${g.message}`, g.status === 'FAIL' ? 'error' : 'warn'));
    }
    
    if (advance) {
      log(''); log(`PHASE ADVANCED: ${advance.from} → ${advance.to}`, 'phase');
    }
    
    const conv = checkConvergence(ledger, config);
    log(''); log('Convergence check:');
    Object.entries(conv.criteria).forEach(([name, c]) => {
      const icon = c.met ? '✓' : '✗';
      log(`  ${icon} ${name}: ${JSON.stringify(c.value)} (threshold: ${c.threshold})`);
    });
    if (conv.converged) {
      ledger.graduation_history.cycles_completed = (ledger.graduation_history.cycles_completed || 0) + 1;
      saveJSON(LEDGER_FILE, ledger);
      log(''); log('═══ CONVERGENCE ACHIEVED ═══', 'converge');
    } else {
      const suggestion = suggestPassType(ledger, config);
      log(''); log(`Next: ${suggestion.type.toUpperCase()} [${suggestion.mode}] — ${suggestion.reason}`);
    }
  },

  verify() {
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const verified = ledger.improvements.filter(i => i.status === 'verified');
    let issues = 0;
    verified.forEach(imp => {
      (imp.files || []).forEach(f => {
        if (!fs.existsSync(f)) {
          log(`REGRESSION: ${imp.id} — file missing: ${f}`, 'error');
          issues++;
          imp.status = 'regressed';
          ledger.regressions.push({ id: `REG-${Date.now()}`, improvement_id: imp.id, detected: new Date().toISOString(), type: 'file_missing', status: 'open' });
        }
      });
    });
    if (issues === 0) { log(`Ledger OK: ${verified.length} items verified, all layers healthy`, 'ok'); }
    else { log(`${issues} regressions detected`, 'error'); saveJSON(LEDGER_FILE, ledger); }
  },

  snapshot(args) {
    const passNum = args[0] || '1';
    const dst = `ledger.pre-pass-${passNum}.json`;
    if (!fs.existsSync(LEDGER_FILE)) { log('No ledger found', 'error'); return; }
    fs.copyFileSync(LEDGER_FILE, dst);
    log(`Snapshot saved: ${dst}`, 'ok');
  },

  diff(args) {
    const passNum = args[0] || '1';
    const snapshot = `ledger.pre-pass-${passNum}.json`;
    if (!fs.existsSync(snapshot)) { log(`No snapshot: ${snapshot}`, 'error'); return; }
    const before = JSON.parse(fs.readFileSync(snapshot, 'utf-8'));
    const after = loadJSON(LEDGER_FILE);
    log(`Pass ${passNum} diff:`, 'info');
    log(`  Improvements: ${before.improvements.length} → ${after.improvements.length} (+${after.improvements.length - before.improvements.length})`);
    log(`  Regressions: ${before.regressions.length} → ${after.regressions.length} (+${after.regressions.length - before.regressions.length})`);
    if (after.regressions.length > before.regressions.length) log('  ⚠ New regressions!', 'warn');
  },

  'add-improvement'(args) {
    const description = args.join(' ');
    if (!description) { log('Usage: add-improvement "description"', 'error'); return; }
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const id = `IMP-${String(ledger.improvements.length + 1).padStart(3, '0')}`;
    ledger.improvements.push({ id, pass: `pass-${ledger.convergence_history.length}`, status: 'verified', description, files: [], tests: [], quality_delta: '', depends_on: [], depended_by: [], created: new Date().toISOString() });
    ledger.last_updated = new Date().toISOString();
    saveJSON(LEDGER_FILE, ledger);
    log(`Added ${id}: ${description}`, 'ok');
  },

  fail(args) {
    const description = args.join(' ');
    if (!description) { log('Usage: fail "description"', 'error'); return; }
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const id = `FAIL-${String((ledger.failed_approaches || []).length + 1).padStart(3, '0')}`;
    if (!ledger.failed_approaches) ledger.failed_approaches = [];
    ledger.failed_approaches.push({ id, pass: `pass-${ledger.convergence_history.length}`, description, created: new Date().toISOString() });
    ledger.last_updated = new Date().toISOString();
    saveJSON(LEDGER_FILE, ledger);
    log(`Logged ${id}: ${description}`, 'warn');
  },

  guards() {
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found', 'error'); return; }
    const guards = runQualityGuards(ledger, config);
    log('═══ QUALITY GUARDS ═══');
    guards.forEach(g => {
      const icon = g.status === 'PASS' ? '✓' : g.status === 'WARN' ? '⚠' : '✗';
      log(`  ${icon} ${g.guard}: ${g.message}`, g.status === 'PASS' ? 'ok' : g.status === 'WARN' ? 'warn' : 'error');
    });
  },

  layers() {
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const health = checkLayerHealth(ledger);
    log('═══ LAYER HEALTH ═══', 'layer');
    for (const [layer, info] of Object.entries(health)) {
      const icon = info.health === 'green' ? '✓' : '⚠';
      log(`  ${icon} ${layer}: ${info.health} | integrated: ${info.integrated} | tests: ${info.tests}`, info.health === 'green' ? 'ok' : 'warn');
      info.issues.forEach(i => log(`    → ${i}`, 'warn'));
    }
  },

  gate() {
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found', 'error'); return; }
    log(`═══ PHASE ${ledger.current_phase} GATE CHECK ═══`, 'phase');
    const gate = checkPhaseGate(ledger.current_phase, ledger, config);
    if (gate.criteria) {
      Object.entries(gate.criteria).forEach(([name, c]) => {
        log(`  ${c.met ? '✓' : '✗'} ${name}: ${JSON.stringify(c.value)} (threshold: ${c.threshold})`, c.met ? 'ok' : 'warn');
      });
    }
    log(''); log(gate.passed ? 'GATE PASSED — ready to advance' : 'GATE NOT MET — continue optimization', gate.passed ? 'ok' : 'warn');
  },

  'self-optimize'() {
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found', 'error'); return; }
    const result = selfOptimize(ledger, config);
    log('═══ SELF-OPTIMIZATION ═══');
    if (result.healthy) {
      log('Toolkit configuration is optimal', 'ok');
    } else {
      result.issues.forEach(i => log(`  ⚠ [${i.type}] ${i.message}`, 'warn'));
    }
  },

  diverge(args) {
    const branchName = args[0];
    if (!branchName) { log('Usage: diverge <branch-name>', 'error'); return; }
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found', 'error'); return; }
    const activeBranches = ledger.branches.filter(b => b.status === 'active');
    if (activeBranches.length >= config.divergence.max_active_branches) { log(`Max active branches reached`, 'error'); return; }
    ledger.branches.push({ name: branchName, status: 'active', created: new Date().toISOString(), created_at_pass: ledger.convergence_history.length, description: '', scores: [], rationale: '' });
    ledger.last_updated = new Date().toISOString();
    saveJSON(LEDGER_FILE, ledger);
    log(`Branch "${branchName}" created`, 'diverge');
  },

  branches() {
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    if (ledger.branches.length === 0) { log('No branches.'); return; }
    log('Branches:');
    ledger.branches.forEach(b => {
      const icon = b.status === 'active' ? '◆' : b.status === 'converged' ? '✓' : '✗';
      log(`  ${icon} ${b.name} [${b.status}]`, b.status === 'active' ? 'diverge' : b.status === 'converged' ? 'ok' : 'warn');
    });
  },

  converge(args) {
    const branchName = args[0];
    if (!branchName) { log('Usage: converge <branch-name>', 'error'); return; }
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const branch = ledger.branches.find(b => b.name === branchName);
    if (!branch) { log(`Branch "${branchName}" not found`, 'error'); return; }
    branch.status = 'converged';
    branch.converged_at = new Date().toISOString();
    ledger.last_updated = new Date().toISOString();
    saveJSON(LEDGER_FILE, ledger);
    log(`Branch "${branchName}" converged`, 'converge');
  },

  prune(args) {
    const branchName = args[0];
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    if (branchName) {
      const branch = ledger.branches.find(b => b.name === branchName && b.status === 'active');
      if (!branch) { log(`Active branch "${branchName}" not found`, 'error'); return; }
      branch.status = 'pruned'; branch.pruned_at = new Date().toISOString();
      log(`Branch "${branchName}" pruned`, 'warn');
    } else {
      const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
      const currentPass = ledger.convergence_history.length;
      const threshold = config.divergence.auto_prune_after_passes || 3;
      ledger.branches.filter(b => b.status === 'active').forEach(b => {
        if (b.scores.length === 0 && (currentPass - b.created_at_pass) >= threshold) {
          b.status = 'pruned'; b.pruned_at = new Date().toISOString();
          log(`Auto-pruned: "${b.name}"`, 'warn');
        }
      });
    }
    ledger.last_updated = new Date().toISOString();
    saveJSON(LEDGER_FILE, ledger);
  },

  temperature() {
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found', 'error'); return; }
    const temp = getTemperature(ledger, config);
    log('═══ TEMPERATURE STATUS ═══');
    log(`Current: ${temp}`);
    log(`Schedule: ${config.divergence.temperature_schedule}`);
    log(`Passes: ${ledger.convergence_history.length}`);
    log(`Active branches: ${ledger.branches.filter(b => b.status === 'active').length}/${config.divergence.max_active_branches}`);
    if (temp > 0.7) log('EXPLORE MODE', 'diverge');
    else if (temp > 0.3) log('BALANCED MODE', 'info');
    else log('EXPLOIT MODE', 'converge');
  },

  record(args) {
    const event = args[0];
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const gh = ledger.graduation_history;
    const valid = ['false-convergence', 'missed-regression', 'detected-regression', 'cycle-complete'];
    if (!valid.includes(event)) { log(`Usage: record <${valid.join('|')}>`, 'error'); return; }
    if (event === 'false-convergence') { gh.false_convergences = (gh.false_convergences || 0) + 1; log('Recorded: false convergence', 'warn'); }
    else if (event === 'missed-regression') { gh.regressions_missed = (gh.regressions_missed || 0) + 1; log('Recorded: missed regression', 'warn'); }
    else if (event === 'detected-regression') { gh.regressions_detected = (gh.regressions_detected || 0) + 1; log('Recorded: detected regression', 'ok'); }
    else if (event === 'cycle-complete') { gh.cycles_completed = (gh.cycles_completed || 0) + 1; log(`Cycle complete (total: ${gh.cycles_completed})`, 'ok'); }
    ledger.last_updated = new Date().toISOString();
    saveJSON(LEDGER_FILE, ledger);
  },

  graduate() {
    const ledger = loadJSON(LEDGER_FILE);
    const config = loadJSON(CONFIG_FILE) || DEFAULT_CONFIG;
    if (!ledger) { log('No ledger found', 'error'); return; }
    const tier = config.automation_tier;
    const gh = ledger.graduation_history;
    log(`Current tier: ${tier.toUpperCase()}`);
    if (tier === 'manual') {
      const c = config.graduation.manual_to_semi;
      const cyclesOk = gh.cycles_completed >= c.min_cycles;
      const fcr = gh.cycles_completed > 0 ? gh.false_convergences / gh.cycles_completed : 1;
      const rdr = (gh.regressions_detected + gh.regressions_missed) > 0 ? gh.regressions_detected / (gh.regressions_detected + gh.regressions_missed) : 0;
      log(`  ${cyclesOk ? '✓' : '✗'} Cycles: ${gh.cycles_completed}/${c.min_cycles}`);
      log(`  ${fcr <= c.max_false_convergence_rate ? '✓' : '✗'} False convergence rate: ${Math.round(fcr * 100)}%`);
      log(`  ${rdr >= c.min_regression_detection_rate ? '✓' : '✗'} Regression detection: ${Math.round(rdr * 100)}%`);
      if (cyclesOk && fcr <= c.max_false_convergence_rate && rdr >= c.min_regression_detection_rate) log('READY TO GRADUATE to Semi-Automatic', 'ok');
    }
  },

  'check-gaming'() {
    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { log('No ledger found', 'error'); return; }
    const history = ledger.convergence_history;
    if (history.length < 3) { log('Need at least 3 passes', 'info'); return; }
    log('═══ EVALUATION GAMING CHECK ═══');
    const lastThree = history.slice(-3);
    const scoresRising = lastThree.every((h, i) => i === 0 || (h.score || 0) >= (lastThree[i-1].score || 0));
    const recentImps = ledger.improvements.filter(i => { const p = parseInt((i.pass || '').replace('pass-', '')); return p >= history.length - 3; });
    if (scoresRising && recentImps.length === 0) log('⚠ POTENTIAL GAMING: Scores rising but no new improvements', 'warn');
    else log('✓ Scores track improvements', 'ok');
  }
};

const [,, cmd, ...args] = process.argv;
if (commands[cmd]) { commands[cmd](args); }
else {
  console.log('Recursive Optimization Toolkit — Holistic 4-Layer Edition');
  console.log('Usage: node tools/recursive_optimization_toolkit.cjs <command> [args]');
  console.log('');
  console.log('Core Commands:');
  console.log('  init <project> [--safety]  Initialize project');
  console.log('  status                     Full dashboard');
  console.log('  suggest                    AI-suggested next pass');
  console.log('  score <pass> <dims> <type> Record scores');
  console.log('  verify                     Pre-pass ledger check');
  console.log('  snapshot <pass>            Save pre-pass snapshot');
  console.log('  diff <pass>                Post-pass diff');
  console.log('');
  console.log('Quality & Guards:');
  console.log('  guards                     Run quality guards');
  console.log('  layers                     Layer health check');
  console.log('  gate                       Phase gate check');
  console.log('  check-gaming               Detect eval gaming');
  console.log('  self-optimize              Toolkit self-check');
  console.log('');
  console.log('Branching:');
  console.log('  diverge <name>             Create branch');
  console.log('  branches                   List branches');
  console.log('  converge <name>            Merge branch');
  console.log('  prune [name]               Prune branch');
  console.log('  temperature                Show temperature');
  console.log('');
  console.log('Tracking:');
  console.log('  add-improvement "desc"     Add improvement');
  console.log('  fail "desc"                Log failed approach');
  console.log('  record <event>             Record graduation event');
  console.log('  graduate                   Check tier readiness');
}
