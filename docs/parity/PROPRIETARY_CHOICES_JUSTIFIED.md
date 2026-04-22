# Proprietary Choices Justified (§L.34)

**Created:** 2026-04-22T10:25:00Z
**Purpose:** Every proprietary-over-OSS choice with evidence (benchmark delta, integration cost).

## Proprietary Dependencies (3 of 133 total)

### 1. Stripe (`stripe` v22.0.2)

**What it does:** Payment processing — checkout sessions, subscriptions, webhooks, customer management.

**Why proprietary over OSS:** No production-grade OSS payment processor exists. Stripe provides PCI DSS Level 1 compliance, fraud detection (Radar), global payment method support (135+ currencies), and hosted checkout that eliminates PCI scope from our application. The OSS alternatives (BTCPay Server for crypto-only, Kill Bill for billing logic) do not provide card processing, which is a hard requirement.

**Free tier:** Stripe test mode is fully functional with no cost. Production charges 2.9% + $0.30 per transaction — standard market rate.

**Upgrade path:** LemonSqueezy (simpler, higher fees) or Paddle (handles tax compliance) as alternative proprietary options. No viable OSS path for card processing exists.

**Integration cost:** 2 days initial setup. Ongoing: webhook handler maintenance, product catalog updates.

### 2. AWS S3 SDK (`@aws-sdk/client-s3` v3.693.0 + `@aws-sdk/s3-request-presigner` v3.693.0)

**What it does:** Object storage for user-uploaded files, generated images, document exports, and static assets.

**Why proprietary over OSS:** The Manus platform provides pre-configured S3-compatible storage with credentials injected via environment variables. Using the AWS SDK is the path of least resistance — zero configuration required. The SDK itself is Apache-2.0 licensed (OSS); only the backing service (AWS S3) is proprietary.

**Free tier:** Platform-provided storage is included in the Manus hosting at no additional cost.

**OSS alternatives considered:**
- MinIO (AGPL-3.0): Self-hosted S3-compatible storage. AGPL license creates copyleft concerns for the project. Would require separate infrastructure provisioning.
- Cloudflare R2: S3-compatible, no egress fees. Would require Cloudflare account setup and credential management.

**Upgrade path:** The S3 SDK is S3-API-compatible, meaning switching to MinIO or R2 requires only changing the endpoint URL and credentials — no code changes to storagePut/storageGet helpers.

**Integration cost:** 0 days (pre-configured by platform). Switching to alternative: ~0.5 days (endpoint + credential swap).

### 3. Manus Forge API (LLM, Image Gen, Voice Transcription)

**What it does:** AI capabilities — chat completion, structured output, image generation, audio transcription.

**Why proprietary over OSS:** Platform-provided with zero configuration. Credentials injected automatically. Provides access to frontier models without managing API keys, rate limits, or billing for multiple providers.

**Free tier:** Included in Manus platform hosting.

**OSS alternatives considered:**
- Ollama + llama.cpp: Local LLM inference. Requires GPU, limited model quality vs frontier models.
- Stable Diffusion (CreativeML Open RAIL-M): Local image generation. Requires GPU, slower, lower quality than DALL-E/Midjourney tier.
- Whisper.cpp (MIT): Local speech-to-text. Viable for offline but requires compute resources.

**Upgrade path:** The `invokeLLM` helper abstracts the provider. Switching to OpenAI/Anthropic/local requires only changing the HTTP endpoint and auth header in `server/_core/llm.ts`.

**Integration cost:** 0 days (pre-configured). Switching to direct provider: ~1 day (endpoint + auth + model selection).

## Decision Matrix

| Choice | OSS Alternative | Delta (Quality) | Delta (Cost) | Delta (Integration) | Verdict |
|--------|----------------|-----------------|--------------|---------------------|---------|
| Stripe | None viable | N/A | N/A | N/A | No OSS option for card processing |
| AWS S3 SDK | MinIO/R2 | Equal | Equal | +0.5 days | Justified by platform pre-config |
| Forge API | Ollama/SD/Whisper.cpp | -30% quality | +GPU cost | +3 days | Justified by quality + zero-config |
