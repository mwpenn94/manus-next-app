## Chapter 7: Presentation Authoring

### 7.1 The Slide System Architecture

Manus has a dedicated, multi-tool pipeline for creating presentation decks. The pipeline is distinct from web development — it produces self-contained HTML/CSS/JavaScript slide files that render as pixel-perfect presentations, or alternatively generates each slide as an AI image for maximum visual impact.

The pipeline tools are:

| Tool | Purpose |
|------|---------|
| `slide_initialize` | Creates the project directory, establishes the design system, and scaffolds all slide files from an outline |
| `slide_edit` | Writes the HTML/CSS/Chart.js content for a single slide |
| `slide_organize` | Adds, deletes, or reorders slides in an existing project |
| `slide_edit_notes` | Generates speaker notes for any or all slides |
| `image_slide_generate` | Generates a slide as an AI image (for "nano banana" / image-based mode) |
| `slide_present` | Renders the complete deck and delivers it to the user |

### 7.2 HTML Mode vs. Image Mode

**HTML mode** (default) produces slides as HTML/CSS files with embedded JavaScript. This mode:
- Supports Chart.js and D3.js for live data visualizations
- Is fully editable after delivery
- Produces crisp text at any resolution
- Supports the visual editor in the Management UI
- Is ideal for data-heavy, business, and technical presentations

**Image mode** (`generate_mode: "image"`) generates each slide as an AI-rendered image. This mode:
- Produces visually stunning, artistic slides
- Is not editable after generation
- Is ideal for creative, marketing, and brand presentations
- Is triggered by user requests for "nano banana slides" or "slides as images"

### 7.3 The Design System Approach

Every presentation begins with a complete design system defined in `slide_initialize`:

- **Aesthetic direction:** A single distinctive sentence describing the visual philosophy (e.g., "Editorial command center with high-contrast amber and cyan on deep navy, structured by Fraunces serif display type")
- **Color palette:** Background, title, body text, and 1–2 accent colors with hex codes
- **Typography:** Font families and sizes for front page and content pages, sourced from Google Fonts

This design system is applied consistently across all slides, creating visual coherence. Manus actively avoids generic corporate aesthetics — each presentation has a distinct visual identity.

### 7.4 Slide Content Principles

Manus follows strict content principles for slides:

- **Real data only:** Charts and statistics use verified data from research, never fabricated numbers
- **Visual hierarchy:** Typography and spacing guide reader attention, not bullet lists
- **Layout variety:** Each slide has a different structural approach — no two slides look identical
- **Chart integration:** Chart.js and D3.js charts are embedded directly in slides with live rendering
- **Image discipline:** Only local, verified images are used — no broken links, no watermarked stock photos

### 7.5 Speaker Notes

The `slide_edit_notes` tool generates speaker notes for any or all slides. Notes can be:
- Full narrative paragraphs for reading aloud
- Bullet-point talking points for reference
- Technical annotations for expert audiences
- Conversational scripts for informal presentations

Notes are stored in `slide_notes.json` and displayed alongside slides in the presenter view.

### 7.6 Export Options

Completed decks can be exported to PDF or PPT/PPTX format using `manus-export-slides`. The `pptx` skill handles all PowerPoint-specific operations for cases where `.pptx` is the required output format.

---

## Chapter 8: Audio, Video, and Music Generation

### 8.1 Speech Synthesis

The `generate_speech` tool converts text to broadcast-quality audio using AI voice synthesis. Key characteristics:

- **Voice options:** `male_voice` or `female_voice`
- **Output format:** WAV (lossless, suitable for post-processing)
- **Text limit:** 50,000 characters per call; longer content is split into segments and concatenated with ffmpeg
- **Quality:** Broadcast-quality prosody, natural sentence rhythm, appropriate emphasis
- **Language:** Follows the working language of the session

Best practices for optimal speech quality:
- Use well-punctuated, complete sentences
- Structure text in clear paragraphs
- Avoid overly long sentences or dense technical jargon
- Use commas and periods to control pacing

Speech synthesis is used for: narration tracks for videos, audio versions of documents, podcast scripts, accessibility alternatives, voice-over for presentations, and language learning content.

### 8.2 Music Generation

The `generate_music` tool composes original music from descriptive prompts. Key characteristics:

- **Output formats:** WAV or MP3
- **Maximum duration:** ~184 seconds per generation
- **Genres:** Any — ambient, electronic, classical, jazz, cinematic, lo-fi, pop, rock, and more
- **Structure control:** Use tags like `[Intro]`, `[Verse]`, `[Chorus]`, `[Bridge]`, `[Outro]` or timestamps to control arrangement
- **Vocals:** Original lyrics can be requested in any language; instrumental-only is also supported
- **No copyright issues:** All generated music is original — no artist names, song titles, or recognizable melodies are used

The `bgm-prompter` skill provides a prompt crafting framework, structure syntax, and multi-clip strategy for professional music generation results.

Effective music prompts specify:
- Genre and style (e.g., "ambient electronic with cinematic depth")
- Mood and emotion (e.g., "tense, building, resolving")
- Instrumentation (e.g., "synthesizer pads, sparse piano, electronic drums")
- Tempo and rhythm (e.g., "slow 80 BPM, syncopated hi-hats")
- Structure (e.g., "[0:00-0:20] sparse intro → [0:20-1:00] build → [1:00-2:00] full texture")

### 8.3 Video Generation

The `generate_video` tool generates short AI video clips from text prompts and/or reference images. Key characteristics:

- **Aspect ratios:** Landscape (16:9), portrait (9:16), square (1:1)
- **Duration:** 4, 6, or 8 seconds per clip
- **Audio:** Optional AI-generated audio (narration, dialogue, music, sound effects) described in the prompt
- **Keyframes:** First and last frame images can be provided for precise control over start and end states
- **References:** Reference images guide visual style and character consistency

For longer videos, Manus generates multiple shots separately and concatenates them using ffmpeg. The `video-generator` skill provides a professional AI video production workflow for multi-shot productions.

### 8.4 Video Post-Production with ffmpeg

Manus has full ffmpeg capability for video post-production:

- **Concatenation:** Join multiple clips into a single video
- **Audio mixing:** Mix narration, music, and sound effects with independent volume control
- **Transitions:** Crossfades, dissolves, and cuts between clips
- **Lower thirds:** Text overlays with timed appearance
- **Speed adjustment:** Time-lapse and slow-motion effects
- **Color grading:** Brightness, contrast, saturation adjustments
- **Format conversion:** Any input format → MP4, WebM, GIF, etc.
- **Frame extraction:** Extract individual frames as images
- **Thumbnail generation:** Extract poster frames for video previews

### 8.5 The Complete Video Production Workflow

A full video production session follows this workflow:

1. **Script writing:** Narration script with timing notes
2. **Storyboard:** Frame-by-frame description of visual content
3. **Asset generation:** AI images for each scene (using `generate_image`)
4. **Narration recording:** Speech synthesis from the script
5. **Music composition:** Background music matched to mood and duration
6. **Frame rendering:** Python/PIL rendering of animated frames (for screen-recording-style content)
7. **Shot generation:** AI video clips for dynamic scenes (using `generate_video`)
8. **Assembly:** ffmpeg concatenation, audio mixing, transition application
9. **Quality check:** Duration verification, audio level check, visual inspection

---

## Chapter 9: Scheduling, Automation, and Parallel Processing

### 9.1 Task Scheduling

The `schedule` tool enables Manus to set up tasks that execute at specific times or recurring intervals. This transforms Manus from a reactive assistant into a proactive automation system.

**Schedule types:**

| Type | Use Case | Example |
|------|---------|---------|
| `cron` with `repeat: true` | Recurring tasks on a fixed schedule | "Run every Monday at 9am" |
| `cron` with `repeat: false` | One-time execution at a specific time | "Run at 3pm tomorrow" |
| `interval` with `repeat: true` | Periodic tasks at fixed intervals | "Run every 6 hours" |
| `interval` with `repeat: false` | Delayed one-time execution | "Run in 30 minutes" |

**Cron expression format:** Manus uses a 6-field format: `seconds minutes hours day-of-month month day-of-week`. Examples:
- `0 0 9 * * 1-5` — Weekdays at 9:00 AM
- `0 */30 * * * *` — Every 30 minutes
- `0 0 8,12,17 * * *` — Daily at 8 AM, noon, and 5 PM

**Minimum interval:** 5 minutes for recurring tasks (no minimum for one-time tasks).

**Playbook support:** Scheduled tasks can include a `playbook` — a summary of the process and best practices from the current task — ensuring consistent, repeatable execution when the task runs in the future.

### 9.2 What Can Be Scheduled

Any task Manus can perform can be scheduled:
- Daily research reports on a topic
- Weekly competitive intelligence briefs
- Automated data collection and visualization
- Periodic website monitoring and alerts
- Recurring document generation (invoices, reports, summaries)
- Scheduled social media content preparation
- Regular data backups or exports
- Timed notifications or reminders

### 9.3 Parallel Processing with the Map Tool

The `map` tool enables Manus to spawn up to **2,000 parallel subtasks** simultaneously. This is the most powerful scaling mechanism in Manus's toolkit.

**How it works:** The `map` tool takes:
- A `prompt_template` with an `{{input}}` placeholder
- An `inputs` array (one entry per subtask)
- An `output_schema` defining what each subtask returns
- A `target_count` specifying the expected number of subtasks

Each subtask runs independently and in parallel. Results are aggregated into a CSV or JSON file.

**Use cases:**
- Research 100 companies simultaneously (competitive intelligence)
- Generate 50 variations of a marketing image
- Analyze 200 customer reviews in parallel
- Process 1,000 rows of data with the same transformation
- Generate personalized content for 500 recipients
- Scrape 300 product pages simultaneously

**File sharing:** Files can be passed from the main task to subtasks using `<file>` tags in the prompt template. Subtasks can return files back to the main task via `file` type output fields.

**Constraints:** All subtasks must share the same output schema (they differ only in input data). The tool dispatches and collects results but does not aggregate or post-process them — that step happens in the main task after collection.

### 9.4 The Invoice Organizer Skill

The `invoice-organizer` skill demonstrates a complete automation workflow: it reads messy invoice and receipt files, extracts key information (vendor, date, amount, category), renames files consistently, and sorts them into logical folders. This turns hours of manual bookkeeping into minutes of automated organization — a concrete example of Manus as a workflow automation system.

### 9.5 GitHub Integration

When GitHub integration is enabled, Manus can:
- Clone repositories: `gh repo clone <repo-name>`
- Create new private repositories: `gh repo create <name> --private`
- Commit and push changes
- Create pull requests
- Read and write repository files
- Interact with GitHub Actions

This enables Manus to participate in software development workflows — not just writing code, but managing it through version control.

### 9.6 MCP (Model Context Protocol) Integration

Manus supports the Model Context Protocol via `manus-mcp-cli`, enabling integration with external MCP servers. This is an extensibility mechanism that allows Manus to connect to third-party tools and services that expose MCP interfaces — expanding its capabilities beyond the built-in tool set.

---
