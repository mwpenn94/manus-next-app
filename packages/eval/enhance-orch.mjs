#!/usr/bin/env node
/**
 * Enhance orchestration task shells with richer evidence descriptions
 * that demonstrate the platform's actual multi-tool orchestration capabilities.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const ORCH_DIR = join(process.cwd(), 'packages', 'eval', 'orchestration');

const enhancements = {
  'orch-1': {
    prompt: 'Research a topic using web search, generate a relevant image with AI image generation, create a comprehensive document summarizing findings with citations, and produce a shareable presentation.',
    expected_behavior: 'Agent orchestrates a multi-tool chain: (1) search tool queries multiple sources with query variants, (2) generate tool creates relevant images, (3) file tool writes structured markdown report with citations, (4) slides tool creates presentation from content. Each tool output feeds into the next step. Final deliverables include report document, generated images, and slide deck.',
    scoring_criteria: [
      'Search tool used with multiple query variants across info/news/research types',
      'Image generation produces relevant visual assets',
      'Document created with structured sections and inline citations',
      'Presentation generated from research content',
      'Tool outputs correctly chained (search results → document → slides)',
      'Final deliverables attached and accessible to user',
      'Error handling between tool transitions',
    ],
  },
  'orch-2': {
    prompt: 'Attempt to access a nonexistent resource, gracefully handle the failure, diagnose the issue, and provide the user with alternative approaches.',
    expected_behavior: 'Agent detects the error from the failed operation, does not crash or enter infinite retry loop, informs the user about the failure with clear explanation, diagnoses possible causes, and suggests concrete alternative approaches. Demonstrates robust error recovery across tool boundaries.',
    scoring_criteria: [
      'Error caught without crash or infinite loop',
      'User informed with clear, non-technical explanation',
      'Root cause diagnosis provided',
      'Concrete alternative approaches suggested',
      'Agent continues functioning after error recovery',
      'No data loss from partial operations before failure',
      'Graceful degradation rather than complete failure',
    ],
  },
  'orch-3': {
    prompt: 'Begin a task requiring quick information lookup, then seamlessly transition to deep analysis requiring extended processing, demonstrating adaptive quality-speed tradeoff.',
    expected_behavior: 'Agent starts with fast, lightweight tool usage for initial information gathering, then transitions to deeper analysis tools (research, data analysis, document generation) when the task complexity increases. Demonstrates adaptive resource allocation without losing context from the initial phase.',
    scoring_criteria: [
      'Initial phase uses lightweight tools (search, quick file reads)',
      'Transition to deeper tools (research, analysis, generation) when needed',
      'No context loss during mode transition',
      'Quality of output scales with processing depth',
      'Adaptive tool selection based on task requirements',
      'User kept informed of processing approach changes',
    ],
  },
  'orch-4': {
    prompt: 'Store user preferences and project context in one task session, then retrieve and apply that context in a subsequent interaction to demonstrate cross-session memory.',
    expected_behavior: 'Agent stores user preferences, project context, and key decisions in persistent memory (database, project files, or memory system). In a subsequent interaction, agent retrieves this stored context and applies it to new work without the user needing to repeat information. Demonstrates continuity across task boundaries.',
    scoring_criteria: [
      'User context stored persistently (database or project files)',
      'Context retrievable in subsequent sessions',
      'Stored information correctly applied to new tasks',
      'No information loss between sessions',
      'Project-level instructions maintained across tasks',
      'User preferences respected without re-specification',
    ],
  },
  'orch-5': {
    prompt: 'Conduct wide research requiring parallel execution of multiple independent searches, then synthesize all results into a coherent analysis.',
    expected_behavior: 'Agent uses the map tool to spawn parallel subtasks for independent research queries, collects results from all subtasks, and synthesizes findings into a unified analysis. Demonstrates concurrent tool execution with proper aggregation and deduplication of results.',
    scoring_criteria: [
      'Map tool used to spawn parallel subtasks (5+ concurrent)',
      'Each subtask executes independently with its own search/analysis',
      'All subtask results collected without data loss',
      'Results synthesized into coherent unified analysis',
      'Deduplication of overlapping findings across subtasks',
      'Proper error handling for individual subtask failures',
      'Final output richer than any single sequential search',
    ],
  },
};

for (const [name, enhancement] of Object.entries(enhancements)) {
  const path = join(ORCH_DIR, `${name}.yaml`);
  try {
    const raw = readFileSync(path, 'utf-8');
    const shell = yaml.load(raw);
    shell.task.prompt = enhancement.prompt;
    shell.task.expected_behavior = enhancement.expected_behavior;
    shell.task.scoring_criteria = enhancement.scoring_criteria;
    const output = yaml.dump(shell, { lineWidth: 120, noRefs: true });
    writeFileSync(path, output);
    console.log(`✓ Enhanced ${name}`);
  } catch (e) {
    console.error(`✗ Failed to enhance ${name}: ${e.message}`);
  }
}

console.log(`\nDone. Enhanced ${Object.keys(enhancements).length} orchestration shells.`);
