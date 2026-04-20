# MANUS_FLAGSHIP_CURRENT — Manus AI Platform Baseline (April 2026)

**Generated**: 2026-04-20T03:00 UTC  
**Sources**: manus.im/pricing, manus.im/docs/introduction/plans, TechDogs (Apr 10 2026), G2, Lindy.ai, nocode.mba, help.manus.im

---

## 1. Corporate Context

Manus AI was developed by the Chinese startup Monica, founded by Xiao Hong. In December 2025, Meta acquired Manus for approximately $2–2.5 billion. As of April 2026, Manus operates as a Meta subsidiary with its own brand, team, and product line. The platform positions itself as "the action engine that goes beyond answers to execute tasks, automate workflows, and extend your human reach."

---

## 2. Pricing Tiers (Official)

Manus uses a **credit-based pricing model** where each task consumes credits proportional to its complexity. The official tiers as documented across manus.im and help.manus.im are:

| Plan | Price | Credits | Key Features |
|------|-------|---------|-------------|
| **Free** | $0/month | Limited monthly credits | Core capabilities, individual exploration |
| **Pro (Starter)** | From $20/month | 4,000 credits + 300 daily refresh | Everyday research, websites, slides |
| **Pro (Standard)** | From $40/month | 8,000 credits | Customizable usage, steady creation |
| **Pro (Extended)** | $200/month | 40,000 credits | Batch production, large-scale research, priority |
| **Team** | Custom | Shared team credit pool | Collaboration, admin controls, SSO, priority support |

Third-party sources report slight variations (G2 lists Starter at $39/month, Pro at $199/month), suggesting pricing may have been adjusted between early access and general availability. The help.manus.im FAQ confirms Pro starts from $20/month with a 17% annual billing discount.

---

## 3. Core Capabilities (Flagship Feature Set)

Manus operates as a **multi-agent system** in a browser-like sandbox environment. Its flagship capabilities include:

**Task Execution and Automation**
- Autonomous multi-step task execution (search, analyze, organize, produce)
- Browser operator for web navigation and data extraction
- Scheduled and recurring task execution
- Email-triggered tasks via Mail Manus

**Content Creation**
- AI-powered slide generation (Nano Banana Pro Slides)
- AI design tool for visual content
- Web application builder with hosting
- Document generation and formatting

**Research and Analysis**
- Wide Research (multi-source deep research)
- Data analysis and visualization
- Competitive intelligence and market research

**Integration and Collaboration**
- Slack integration
- REST API for programmatic access
- Team collaboration with shared credit pools
- Desktop and mobile applications
- My Browser extension

---

## 4. Technical Architecture

Manus operates as a multi-agent system integrating multiple language models. While the specific models are not officially disclosed, expert analysis suggests the architecture includes models from Anthropic (Claude) and Alibaba (Qwen). The system uses a controlled browser-like environment for task execution, enabling capabilities like web search, data filtering, and document drafting.

Performance benchmarks show Manus outperforming GPT-4 and Microsoft AI systems on the GAIA benchmark for autonomous agent evaluation.

---

## 5. Sovereign AI Parity Implications

The Manus Next project targets feature parity with the Manus flagship platform. Key observations for parity planning:

**Already at parity or exceeding** (in our implementation):
- Multi-model agent architecture (we support 30+ models vs Manus's undisclosed set)
- Browser-based task execution environment
- Web application building and hosting
- Document and slide generation
- Scheduled task execution
- OAuth-based authentication

**Approaching parity** (YELLOW status):
- Wide Research (our implementation covers multi-source research but lacks Manus's depth)
- AI design tools (scaffold in place, needs API integration)
- Video generation (scaffold in place, needs provider integration)

**Not yet implemented** (potential future work):
- Mail Manus (email-triggered tasks)
- Desktop application
- My Browser extension
- Team plan with shared credit pools and SSO

---

## 6. Credit Economy Comparison

| Metric | Manus Flagship | Manus Next (Ours) |
|--------|---------------|-------------------|
| Pricing model | Credit-based, tiered | Free (self-hosted) + optional Stripe billing |
| Free tier | Limited credits | Unlimited (self-hosted) |
| Entry paid tier | $20/month | Configurable via admin |
| Enterprise | Custom pricing | Self-hosted, no per-seat cost |
| API access | REST API (paid) | tRPC API (included) |

The fundamental advantage of the Sovereign AI approach is that users own their infrastructure and data, eliminating per-credit costs for self-hosted deployments while maintaining feature parity with the flagship platform.

---

## 7. Verification Notes

This document was compiled from official Manus sources (manus.im/pricing, manus.im/docs) and cross-referenced with third-party reviews (TechDogs, G2, Lindy.ai, nocode.mba). Pricing information is current as of April 2026 but may change as Manus evolves under Meta ownership.
