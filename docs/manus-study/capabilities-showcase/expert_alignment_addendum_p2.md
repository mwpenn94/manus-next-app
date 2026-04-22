---

# ALIGNMENT ADDENDUM PASS 2: Additional Topics from MANUS_COMPLETE_REFERENCE_FINAL

*This addendum covers topics identified in Pass 2 that are present in the reference document but not yet reflected in the expert replay.*

---

## Expert Review Supplement 2.21: Capability Decision Tree

### Product Perspective

The capability decision tree is the most important navigational tool for new users of Manus. Rather than requiring users to understand the full capability set before using the platform, the decision tree provides a structured path from "I want to accomplish X" to "here is the right capability and workflow for X."

The tree is organized around four primary user intents:

**"I need information"** → Research capabilities: `search` tool for quick lookups, `browser` for deep reading, `deep-research` skill for academic/technical research, `research-lookup` for cited analysis, `similarweb-analytics` for website intelligence, `stock-analysis` for financial research.

**"I need a document or presentation"** → Document capabilities: technical writing for Markdown/PDF, `docx` skill for Word documents, `pptx` skill for PowerPoint, `pdf` skill for PDF manipulation, `xlsx`/`excel-generator` for spreadsheets, `slide_initialize` for presentations.

**"I need software or a web application"** → Engineering capabilities: `webdev_init_project` for static or full-stack apps, `webdev_add_feature` for database/auth/Stripe, `webapp-testing` for QA, `schedule` for automation, `map` for parallel processing.

**"I need media"** → Media capabilities: `generate_image` for illustrations and diagrams, `generate_video` for video clips, `generate_speech` for narration, `generate_music` for background audio, `generate_image_variation` for editing existing images, `screenshot-annotator` for annotation.

The decision tree also handles cross-cutting concerns: when a task requires multiple capability types (e.g., "build a dashboard with real market data and a video walkthrough"), the tree guides users to combine capabilities in the correct sequence — research first, then data analysis, then web development, then video production.

---

## Expert Review Supplement 2.22: GitHub Integration

### Engineering Perspective

The GitHub integration is a critical feature for teams that need to maintain Manus-generated code in their own version control systems. The integration works bidirectionally:

**Export to GitHub:** From the Management UI Settings → GitHub panel, users can export the entire project to a new repository under any GitHub organization or personal account they own. This creates a clean git repository with the full project history, enabling standard development workflows (branching, pull requests, code review) on Manus-generated code.

**Import via `gh` CLI:** The sandbox has the GitHub CLI (`gh`) pre-installed and authenticated. This means Manus can clone existing repositories, read their code, make changes, and push commits — enabling Manus to contribute to existing projects rather than only creating new ones. This is particularly valuable for code review, bug fixing, and feature addition workflows.

**Privacy model:** All repositories created by Manus default to `--private` to protect user data. Users must explicitly choose to make repositories public.

The GitHub integration bridges the gap between AI-generated code and production engineering workflows. Code that Manus generates is not locked into the Manus platform — it can be exported, reviewed, modified, and deployed through standard engineering processes.

---

## Expert Review Supplement 2.23: Video Analysis Capability

### Engineering and Product Perspective

The `manus-analyze-video` CLI utility is a frequently overlooked capability that enables a fundamentally different type of task: understanding and extracting information from video content rather than generating it.

The utility accepts three input types: YouTube URLs, remote video file URLs, and local file paths. It uses a multimodal LLM to analyze the video content and respond to a natural language prompt about what it contains. This enables workflows such as:

**Meeting transcript extraction:** Analyze a recorded meeting video to extract action items, decisions, and key discussion points — without requiring a separate transcription step.

**Tutorial comprehension:** Analyze a technical tutorial video to extract the steps, code snippets, and concepts demonstrated — enabling Manus to replicate or adapt the tutorial's approach.

**Competitive intelligence:** Analyze a competitor's product demo video to extract feature descriptions, UI patterns, and positioning claims.

**Content repurposing:** Analyze a long-form video to extract the key points for a blog post, slide deck, or executive summary.

The combination of video analysis (understanding) and video generation (creating) makes Manus a complete video intelligence platform, not just a video production tool.

---

## Expert Review Supplement 2.24: Speech-to-Text Transcription

### Engineering and Product Perspective

The `manus-speech-to-text` CLI utility provides Whisper-based speech transcription for audio and video files. It supports MP3, WAV, MP4, and WebM formats, covering the full range of common audio and video containers.

The transcription capability enables several high-value workflows:

**Meeting notes:** Upload a recorded meeting and receive a full transcript, which Manus can then analyze for action items, decisions, and key points using the `meeting-insights-analyzer` skill.

**Interview analysis:** Transcribe a user research interview and extract themes, quotes, and insights.

**Podcast processing:** Transcribe a podcast episode and generate show notes, a blog post, or a social media thread.

**Accessibility:** Generate captions or subtitles for video content by transcribing the audio track.

The speech-to-text capability is the input complement to the speech synthesis capability — together, they enable complete audio workflows: transcribe existing audio, process the text, and generate new audio from the processed content.

---

## Expert Review Supplement 2.25: Notifications, Secrets, and the Management UI Ecosystem

### Product and Engineering Perspective

The Management UI is a complete project management interface that goes far beyond a simple preview panel. Understanding its full scope is essential for enterprise deployment planning.

**Notifications system** (requires web-db-user upgrade): The built-in notification API enables push notifications to users' browsers. This is valuable for applications that need to alert users of asynchronous events — task completions, new messages, status changes. The notification system is integrated with the deployment infrastructure, meaning notifications work on the deployed public URL without any additional configuration.

**Secrets management** (requires web-db-user upgrade): The Secrets panel provides a secure interface for storing environment variables that should not be committed to the codebase — API keys, database credentials, third-party service tokens. Secrets are injected into the application at runtime and are never exposed in the client-side bundle. This is the correct pattern for handling sensitive configuration in production applications.

**Custom domains:** The Domains panel enables three domain workflows: modifying the auto-generated subdomain prefix (e.g., changing `abc123.manus.space` to `myapp.manus.space`), purchasing new domains directly within Manus (the platform handles registration, DNS configuration, and SSL certificate provisioning automatically), and binding existing custom domains (users point their DNS to Manus's infrastructure and the platform handles the rest). This makes Manus a complete hosting platform — not just a development environment.

**Analytics:** The Dashboard panel provides UV/PV (unique visitors/page views) analytics for published sites, powered by Umami. This gives teams immediate visibility into how their deployed applications are being used without requiring a separate analytics integration.

**Version history:** The three-dot menu provides access to the full checkpoint history, enabling teams to review what changed between versions, roll back to any previous state, and understand the evolution of the project over time.

---

## Expert Review Supplement 2.26: The Convergence Loop as a Quality System

### Product and Engineering Perspective

The convergence loop is not just a technique — it is a formal quality system. Understanding it as such reveals its broader applicability and its implications for how AI agents should be evaluated.

The loop has three formal properties:

**Completeness:** Each pass must audit every artifact, not just the ones that changed in the previous pass. This prevents the common failure mode where fixing one issue introduces a new issue elsewhere that goes undetected because subsequent passes only check the changed artifact.

**Independence:** Each pass must be conducted as if it were the first pass — with fresh eyes, no assumptions about what was checked before, and no bias toward confirming that previous work was correct. This is why the loop requires three consecutive zero-update passes rather than just one: a single zero-update pass might reflect a narrow audit; three consecutive passes with different audit strategies provide genuine confidence.

**Monotonicity:** Each pass can only add improvements, never remove them. This ensures that the quality of the output is strictly non-decreasing across passes.

From a product perspective, the convergence loop is the mechanism by which Manus achieves "good enough" quality on open-ended tasks where the definition of "done" is not specified in advance. Rather than requiring users to specify every requirement upfront, the loop allows Manus to iteratively discover and address gaps until no more gaps can be found.

From an engineering perspective, the convergence loop is analogous to a test suite with a coverage requirement: the loop continues until the coverage metric (zero new findings per pass) is satisfied. The three-pass requirement is analogous to a flakiness filter — it eliminates false positives from passes that happened to find nothing due to a narrow audit scope rather than genuine completeness.

---
