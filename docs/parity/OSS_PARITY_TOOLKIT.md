# OSS Parity Toolkit (§L.34)

**Created:** 2026-04-22T10:20:00Z
**Purpose:** Canonical OSS catalog per §L subsection with license tags and upgrade paths.

## Summary

97% of dependencies (130/133) are OSS. 3 proprietary dependencies: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (Apache-2.0 licensed but proprietary service), stripe (Apache-2.0 licensed but proprietary service).

## OSS Catalog by §L Subsection

### §L.22 AI Reasoning — LLM Infrastructure

| Component | OSS Package | License | Version | Upgrade Path |
|-----------|-------------|---------|---------|--------------|
| LLM API Client | Built-in Forge API (platform) | N/A | N/A | OpenAI SDK / Anthropic SDK / LiteLLM for multi-provider |
| Structured Output | JSON Schema via Forge | N/A | N/A | Instructor.js / Zod-to-JSON-Schema |
| Streaming | Native SSE (EventSource) | MIT | Built-in | Vercel AI SDK for unified streaming |

### §L.23 Automation — Browser & Device

| Component | OSS Package | License | Version | Upgrade Path |
|-----------|-------------|---------|---------|--------------|
| E2E Testing | @playwright/test | Apache-2.0 | 1.52.0 | Current — no upgrade needed |
| Accessibility | @axe-core/playwright | MPL-2.0 | 4.10.3 | Current — no upgrade needed |
| Browser Automation | playwright | Apache-2.0 | 1.52.0 | Puppeteer (Apache-2.0) as fallback |

### §L.27 Benchmarks — Scoring & Evaluation

| Component | OSS Package | License | Version | Upgrade Path |
|-----------|-------------|---------|---------|--------------|
| Judge/Scorer | Custom judge.mjs | Project | N/A | OpenAI Evals / Braintrust for managed eval |
| YAML Parsing | js-yaml | MIT | 4.1.0 | Current |
| Test Runner | vitest | MIT | 3.2.1 | Current |

### §L.28 Personas — Virtual User Testing

| Component | OSS Package | License | Version | Upgrade Path |
|-----------|-------------|---------|---------|--------------|
| Persona Engine | Custom YAML + judge.mjs | Project | N/A | Playwright + custom harness |
| HTTP Client | undici (Node built-in) | MIT | Built-in | axios for complex scenarios |

### §L.30 Live Build/Deploy

| Component | OSS Package | License | Version | Upgrade Path |
|-----------|-------------|---------|---------|--------------|
| Build Tool | vite | MIT | 7.1.7 | Current |
| Bundler | esbuild | MIT | 0.25.4 | Current |
| Server | express | MIT | 4.21.2 | Fastify (MIT) for performance |
| ORM | drizzle-orm | Apache-2.0 | 0.44.5 | Current |
| Migrations | drizzle-kit | Apache-2.0 | 0.31.4 | Current |

### §L.33 In-App Validation

| Component | OSS Package | License | Version | Upgrade Path |
|-----------|-------------|---------|---------|--------------|
| Component Testing | @testing-library/react | MIT | 16.3.0 | Current |
| DOM Testing | @testing-library/jest-dom | MIT | 6.6.3 | Current |
| Mocking | vitest (built-in) | MIT | 3.2.1 | MSW for API mocking |

### §L.34 OSS Parity — Payment & Storage

| Component | OSS Package | License | Proprietary? | Upgrade Path |
|-----------|-------------|---------|--------------|--------------|
| Payments | stripe | Apache-2.0 | Service is proprietary | LemonSqueezy / Paddle for OSS-friendlier alternatives |
| Object Storage | @aws-sdk/client-s3 | Apache-2.0 | Service is proprietary | MinIO (AGPL — check compatibility) / Cloudflare R2 SDK |
| Presigned URLs | @aws-sdk/s3-request-presigner | Apache-2.0 | Service is proprietary | Same as above |

### §L.35 Conversational Interaction

| Component | OSS Package | License | Version | Upgrade Path |
|-----------|-------------|---------|---------|--------------|
| TTS | Browser SpeechSynthesis API | Built-in | N/A | Coqui TTS (MPL-2.0) / Piper (MIT) for offline |
| STT | Whisper API via Forge | N/A | N/A | whisper.cpp (MIT) / Vosk (Apache-2.0) for offline |
| Voice Recording | MediaRecorder API | Built-in | N/A | RecordRTC (MIT) for cross-browser |

### Frontend Framework Stack

| Component | OSS Package | License | Version |
|-----------|-------------|---------|---------|
| UI Framework | react | MIT | 19.2.1 |
| Routing | wouter | ISC | 3.7.1 |
| State/Data | @tanstack/react-query | MIT | 5.90.2 |
| RPC | @trpc/client + @trpc/react-query | MIT | 11.6.0 |
| Styling | tailwindcss | MIT | 4.1.5 |
| Components | shadcn/ui (radix-ui) | MIT | Various |
| Animation | framer-motion | MIT | 12.9.4 |
| Icons | lucide-react | ISC | 0.511.0 |
| Markdown | streamdown | MIT | 0.0.18 |
| Auth | jose (JWT) | MIT | 6.1.0 |

## License Compatibility

No AGPL, SSPL, or Commons Clause dependencies detected. All OSS dependencies use permissive licenses (MIT, Apache-2.0, ISC, MPL-2.0). The MPL-2.0 license on @axe-core is file-level copyleft only and compatible with the project's MIT-style licensing.
