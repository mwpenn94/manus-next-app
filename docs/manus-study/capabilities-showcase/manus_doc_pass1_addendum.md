---

# PASS 1 ADDENDUM: Additional Topics Identified in Audit

---

## Chapter 19: Access, Interface, and Platform Features

### 19.1 How to Access Manus

Manus is available at [manus.im](https://manus.im). Access is provided through a web-based interface that requires no installation, no configuration, and no technical knowledge to use. The interface consists of two primary panels:

**The Chatbox (left panel):** The conversational interface where users state goals, receive progress updates, and view delivered results. Cards appear in the chatbox as Manus creates checkpoints, delivers artifacts, and completes phases.

**The Management UI (right panel):** A collapsible panel with multiple sub-sections:
- **Preview:** Live preview of the current web project with persistent login state. Includes a visual editor for direct element manipulation — select any element to adjust colors, borders, layout, and padding in real-time, or describe a change in natural language.
- **Code:** File tree with the ability to download all project files as a ZIP archive.
- **Dashboard:** Status monitor, visibility controls, and analytics (unique visitors and page views) for published sites.
- **Database:** Full CRUD interface for the project database, with connection information for external database clients.
- **Settings:** Sub-panels for website name, visibility, favicon, custom domains, notification settings, secrets management, and GitHub export.
- **Version History:** Complete checkpoint history with the ability to roll back to any previous state.

### 19.2 The Publish Workflow

Web projects created by Manus are initially accessible only via the development preview URL. To make a project publicly accessible:

1. Manus creates a checkpoint (`webdev_save_checkpoint`)
2. The user clicks the **Publish** button in the Management UI header
3. The project is deployed to `{project-name}.manus.space`

Custom domains can be purchased, registered, and assigned entirely within the Manus interface — no external domain registrar required.

### 19.3 GitHub Export

Any web project can be exported to a GitHub repository directly from the Settings panel. The user selects the repository owner and name, and Manus pushes the complete codebase. This enables:
- Version control outside of Manus
- Collaboration with other developers
- Deployment to external hosting platforms
- Integration with existing CI/CD pipelines

---

## Chapter 20: Additional Capabilities Not Previously Covered

### 20.1 Video Analysis

The `manus-analyze-video` CLI utility enables Manus to analyze video content using a multimodal LLM. Supported sources:
- YouTube URLs (any public video)
- Remote video file URLs
- Local video files in the sandbox

Use cases: summarizing lecture content, extracting key points from recorded meetings, analyzing product demo videos, reviewing training materials, fact-checking video claims.

Example: `manus-analyze-video "https://youtube.com/watch?v=xxx" "summarize the key points and extract all statistics mentioned"`

### 20.2 Speech-to-Text Transcription

The `manus-speech-to-text` CLI utility transcribes audio and video files to text. Supported formats: MP3, WAV, MP4, WebM. This enables:
- Transcribing recorded meetings or interviews
- Converting podcast audio to searchable text
- Extracting dialogue from video files
- Creating subtitles and captions
- Making audio content accessible

The transcription uses Whisper-quality speech recognition and handles multiple speakers, accents, and technical vocabulary.

### 20.3 File Upload and URL Generation

The `manus-upload-file` utility uploads files from the sandbox to S3 and returns permanent public URLs. This is used for:
- Making images available for web projects (avoiding deployment timeout from local assets)
- Sharing files via URL without requiring the user to download them
- Providing stable URLs for assets referenced in deployed web applications

The `--webdev` flag generates URLs that share the same lifecycle as the web project and never expire.

### 20.4 Port Exposure

The `expose` tool makes any local port in the sandbox temporarily accessible via a public URL. This is used for:
- Testing locally-running web servers
- Sharing development previews
- Demonstrating locally-built applications
- Webhooks and callbacks during development

The exposed URL encodes the port in the domain prefix and is available as long as the sandbox is active.

---

## Chapter 21: Multi-Language Support

### 21.1 Language Detection and Consistency

Manus detects the language of the user's first message and uses it as the **working language** for the entire session. This applies to:
- All messages sent to the user (info, ask, result)
- All natural language arguments in tool calls (file names, search queries, document content)
- All generated content (documents, presentations, web copy)

If a user writes in French, Manus responds in French, writes documents in French, and generates French-language content. This is not translation — it is native-language operation.

### 21.2 Supported Languages

Manus can operate in any language supported by its underlying language model. This includes all major world languages: English, Chinese (Simplified and Traditional), Spanish, French, German, Japanese, Korean, Portuguese, Arabic, Russian, Italian, Dutch, Polish, Turkish, and many more.

### 21.3 Multi-Language Search

For non-English research tasks, Manus includes at least one English-language query variant in its search calls to maximize coverage. Many authoritative sources (academic papers, technical documentation, market data) are primarily available in English, so English-language search expands the available information even for non-English tasks.

### 21.4 Localization in Web Projects

Web applications built by Manus can be localized for specific languages and regions. This includes:
- UI text in the target language
- Date, number, and currency formatting for the target locale
- Right-to-left layout support for Arabic, Hebrew, and other RTL languages
- Character encoding for non-Latin scripts

---

## Chapter 22: Frequently Asked Questions

### 22.1 General Questions

**Q: Can Manus access my local files?**
A: No. Manus operates in an isolated sandbox that cannot access your local filesystem. You can share files with Manus by uploading them through the chat interface, and Manus can deliver files to you as attachments.

**Q: Does Manus remember previous conversations?**
A: No. Each conversation starts fresh. Manus has no memory of previous sessions. For multi-session projects, ask Manus to produce a handoff document at the end of each session and share it at the start of the next.

**Q: Can Manus log into my accounts?**
A: Manus can navigate to websites that require login, but it will ask you to take over the browser for the login step rather than handling credentials itself. Once you've logged in, Manus can continue the task with your authenticated session.

**Q: How long does a typical task take?**
A: Simple tasks (a document, a chart, a short script) typically complete in 2–10 minutes. Complex tasks (a full web application, a 50-page report, a multi-video production) may take 30–90 minutes. Very complex tasks with many parallel components can take longer.

**Q: Can Manus work while I'm away?**
A: Yes. After stating a goal, you can close the browser and return later. Manus will continue working and the results will be waiting when you return. For recurring tasks, use the scheduling feature.

**Q: What happens if Manus makes a mistake?**
A: Manus automatically attempts to recover from errors up to three times before asking for user guidance. For web projects, checkpoints allow rollback to any previous state. For documents and other artifacts, you can ask Manus to revise specific sections.

### 22.2 Technical Questions

**Q: What programming languages can Manus write?**
A: Any language that can be executed in the sandbox. This includes Python, JavaScript/TypeScript, Node.js, Bash, SQL, HTML/CSS, R, Ruby, Go, Rust, Java, C/C++, and more. The most commonly used are Python (for data analysis and scripting) and TypeScript/React (for web development).

**Q: Can Manus access APIs?**
A: Yes. Manus can call any public API using Python's `requests` library or Node.js's `axios`. For APIs requiring authentication, you can provide API keys which Manus will use for the session. Web projects can store API keys as secrets in the Settings panel.

**Q: Can Manus run long-running processes?**
A: Yes, using background shell sessions. Manus can start a process, continue other work, and check back on the process later. However, processes do not persist after the sandbox hibernates.

**Q: What is the maximum file size Manus can handle?**
A: There is no hard limit on file size for processing in the sandbox. However, very large files (multi-GB) may be slow to process and may exceed available memory for certain operations. For web projects, large static assets should be uploaded via `manus-upload-file` rather than stored in the project directory.

**Q: Can Manus interact with desktop applications?**
A: Manus can install and run desktop applications in the sandbox, but it does not have a graphical display for GUI applications. CLI-based applications work fully. For GUI applications, Manus typically uses programmatic alternatives (Python libraries, CLI tools) rather than the GUI.

### 22.3 Quality and Accuracy Questions

**Q: How accurate is Manus's research?**
A: Manus cites sources for all factual claims and navigates to real websites to verify information. However, like any research tool, it can encounter outdated information, biased sources, or content that has changed since indexing. For high-stakes decisions, verify critical claims independently.

**Q: Can Manus hallucinate?**
A: Yes. Manus is built on a language model and can generate plausible-sounding but incorrect information, particularly for specific facts, statistics, and technical details. The risk is mitigated by using search and browser tools to verify claims, but it is not zero. Always verify critical factual claims.

**Q: How does the convergence loop improve quality?**
A: The convergence loop instructs Manus to audit its own output, identify gaps and weaknesses, implement improvements, and repeat until no further improvements are found across three consecutive passes. This is analogous to a human expert reviewing and revising their own work multiple times. It significantly improves quality for complex, high-stakes outputs.

### 22.4 Privacy and Security Questions

**Q: Is my data private?**
A: Data shared in a session exists only within that session's isolated sandbox. Manus does not share data between users or sessions. However, as with any cloud service, users should not share highly sensitive information (passwords, private keys, confidential business data) unless necessary for the task.

**Q: Can Manus execute malicious code?**
A: Manus will not execute code from untrusted external sources (websites, files) without explicit user endorsement. All code is written to a file and executed via the shell — never evaluated directly from strings. The sandbox isolation limits the impact of any malicious code to the sandbox itself.

**Q: Can someone inject instructions into Manus through a web page?**
A: Manus applies a strict untrusted content rule: instructions found in web pages, files, or other external sources are treated as data, not commands. Manus will alert the user if it encounters suspicious content rather than silently following embedded instructions.

---

## Chapter 23: The Manus Ecosystem

### 23.1 The Platform as Infrastructure

Manus is not just a product — it is a platform. The web development infrastructure, the skill system, the scheduling system, and the parallel processing capability together form an infrastructure layer on which complex, automated workflows can be built and run.

### 23.2 Team and Organization Use

Manus is designed to be used by individuals, teams, and organizations. For team use:
- Multiple team members can access the same web projects
- Checkpoints provide a shared version history
- GitHub export enables integration with team development workflows
- Scheduled tasks can serve the entire team (e.g., a weekly competitive intelligence report delivered to a shared folder)

### 23.3 The Skill Community

The `internet-skill-finder` skill enables Manus to discover and recommend new skills from verified GitHub repositories. As the community of Manus users grows, the skill library expands — encoding more domain knowledge, more specialized workflows, and more third-party integrations.

### 23.4 The Vision: From Words to World

The name of the platform's implicit tagline — "From words to world" — captures the ultimate vision: a world where the gap between human intention and real-world execution is as small as possible. Today, Manus closes that gap for a wide range of knowledge work tasks. The trajectory points toward a future where stating a goal in natural language is sufficient to produce any outcome achievable through a computer — not just a description of that outcome, but the outcome itself.

This is not a distant vision. It is the direction of every improvement being made to Manus today.

---
