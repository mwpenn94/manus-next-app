# Turn-Taking Quality — §L.35

> Cross-judge naturalness scoring for conversational turn-taking.
> Target: Naturalness score >= 4.0/5.0 across evaluators.

## Evaluation Framework

Turn-taking quality is assessed across five dimensions, each scored 1-5:

| Dimension | Description | Weight |
|-----------|-------------|--------|
| **Responsiveness** | How quickly the agent begins responding after user finishes speaking | 25% |
| **Interruption Handling** | How naturally the agent stops when interrupted mid-sentence | 20% |
| **Silence Management** | Appropriate handling of pauses (not jumping in too early or too late) | 20% |
| **Overlap Avoidance** | Minimal simultaneous speech between user and agent | 20% |
| **Conversational Flow** | Overall naturalness of the back-and-forth rhythm | 15% |

## VAD Configuration

The browser-side Voice Activity Detection uses energy-based detection:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `VAD_ENERGY_THRESHOLD` | 0.01 RMS | Tuned to detect speech while ignoring ambient noise |
| `VAD_SILENCE_TIMEOUT` | 1200ms | Allows natural pauses within sentences without premature cutoff |
| `AUDIO_CHUNK_INTERVAL` | 250ms | Balances latency vs. network overhead |

## Scoring Protocol

1. Conduct 10+ voice conversations covering varied scenarios (questions, commands, multi-turn dialogue)
2. Three independent evaluators score each dimension 1-5
3. Final score = weighted average across dimensions and evaluators
4. Sessions with interruptions are scored separately for interruption handling

## Baseline Scores

| Evaluator | Responsiveness | Interruption | Silence | Overlap | Flow | Weighted |
|-----------|---------------|-------------|---------|---------|------|----------|
| Judge 1 | — | — | — | — | — | — |
| Judge 2 | — | — | — | — | — | — |
| Judge 3 | — | — | — | — | — | — |
| **Average** | — | — | — | — | — | — |

> Scores will be populated after the first evaluation round with live voice sessions.

## Design Decisions for Natural Turn-Taking

1. **VAD-end triggers processing**: The pipeline waits for `VAD_SILENCE_TIMEOUT` ms of silence before processing, preventing premature cutoff during natural speech pauses.

2. **Sentence-level TTS streaming**: Agent responses are synthesized sentence-by-sentence, allowing the first sentence to play while subsequent sentences are still being generated. This reduces perceived latency.

3. **Immediate barge-in**: When the user starts speaking during agent output, the `interrupt` handler aborts all in-flight work within < 25ms perceived latency.

4. **State machine prevents overlap**: The `VoiceSessionState` machine ensures the pipeline cannot be in both "listening" and "speaking" states simultaneously, preventing audio feedback loops.

5. **Auto-listen mode**: When `autoListen` is enabled, the pipeline automatically returns to "listening" state after each agent response, enabling continuous hands-free conversation.
