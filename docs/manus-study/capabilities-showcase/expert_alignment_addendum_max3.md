
---

# Part VI — Product, Legal, and Accessibility Deep Review

The following sections were added during a Pass 3 audit conducted from the combined perspectives of a product manager focused on growth and retention, an intellectual property attorney evaluating licensing posture, a brand strategist reviewing voice and tone, and an accessibility specialist auditing WCAG compliance.

## Expert Review Supplement 6.1: Product Analytics, Activation, Retention, and Customer Success

### Growth and Product Analytics Perspective

Product organizations measure platform health through a hierarchy of metrics. The **north star metric** is the single number that best captures whether customers are getting value; for an AI agent platform, this is typically something like "successful tasks completed per user per month" or "minutes of human work saved per user per month." Customers should not adopt Manus on the promise of capability alone — they should set their own internal north star metric for AI agent value and instrument their workflows to measure it.

Activation rate is the percentage of new users who reach a meaningful first-value moment within a defined window. For Manus, the activation moment is typically the first end-to-end task completion that the user judges as useful — research brief, slide deck, deployed app, or generated media. The platform's design philosophy of producing tangible artifacts (PDFs, videos, deployed apps) optimizes for activation by giving new users something concrete to share and judge.

Retention rate measures whether users keep coming back over time. Strong retention for an AI agent platform requires both reliability (the agent does what it promises) and breadth (the agent covers enough use cases that the user does not need to switch tools). Manus's 16-capability breadth and the multi-modal orchestration patterns documented in this expert replay are direct investments in retention.

Net Promoter Score (NPS) is the standard customer satisfaction metric (would you recommend this product to a friend or colleague). NPS for AI platforms is sensitive to whether the agent's outputs meet user expectations; the strongest NPS contributors are honest gap acknowledgment (the agent says what it cannot do rather than producing low-quality output and pretending otherwise) and clear progress communication during long tasks.

Customer success is the function that helps customers achieve their goals with the platform. For complex AI agent platforms, customer success typically includes onboarding workshops, use-case template libraries, office hours, and proactive outreach when usage patterns suggest the customer is stuck. Customers procuring Manus at scale should request a customer success engagement as part of the procurement.

The onboarding flow and first-run experience are the user's first impressions of the platform. Manus's first-run experience leans on the ability to ask any question and have the agent take action immediately, rather than requiring the user to learn a configuration UI before getting value. This "low floor, high ceiling" design pattern is one of the platform's strengths.

## Expert Review Supplement 6.2: UX States — Empty, Loading, Error, Offline

### UX Engineering Perspective

A polished application handles four state types with explicit design treatments. The **empty state** appears when no content yet exists — Manus's chat interface shows an empty state inviting the user to describe their task. Empty states are an opportunity to teach users what is possible. The **loading state** appears during long operations — Manus uses progressive `info` messages to keep the user informed during multi-minute tasks rather than showing a generic spinner, which is a more sophisticated loading state pattern that respects the user's need to understand what is happening. The **error state** appears when something goes wrong — Manus's error handling pattern (diagnose, attempt fix, try alternative, ask user after three failures) is itself a good error state design that avoids both silent failure and annoying loops. The **offline mode** is the rare state where the platform cannot reach its dependencies — for a cloud-hosted AI agent, the offline mode is essentially "platform unavailable," and customers should understand that there is no local fallback.

Navigation patterns in Manus's deployed web applications follow standard conventions: persistent sidebar for internal tools and dashboards, top navigation for public sites, contextual navigation for content-driven pages. The system prompt explicitly warns against navigation dead-ends and requires escape routes from every page, which is a good defensive UX pattern.

Dark patterns are deceptive UX practices designed to trick users into actions against their interests. The Manus platform itself does not use dark patterns; it bills transparently, surfaces costs in the Management UI, and does not auto-renew without notice. Customers building deployed applications on Manus inherit this responsibility — the platform does not enforce dark-pattern avoidance in user-built applications.

## Expert Review Supplement 6.3: Intellectual Property, Licensing, and Acceptable Use

### Intellectual Property Counsel Perspective

When a customer uses an AI platform to produce work product, the IP picture has several dimensions. The **license** terms govern what the customer can do with the output; for Manus, the standard pattern is that the customer owns the artifacts they produce, with the platform retaining no rights to those artifacts beyond what is needed to provide the service. Customers should review the current terms of service for the precise language and ensure it covers their use case.

The **acceptable use policy** governs what the customer cannot do with the platform. Standard prohibited uses include generating illegal content, generating content for fraud or scams, generating CSAM or other harmful content, and reverse-engineering the underlying models. These restrictions are model-level enforced (the underlying frontier models refuse such requests) and platform-level enforced (terms of service violations result in account termination).

**Fair use** in copyright law allows limited use of copyrighted material without permission for purposes like commentary, criticism, news reporting, teaching, and research. The research brief in this showcase quotes statistics from Gartner, McKinsey, and other sources with proper attribution, which falls within fair use for analytical commentary. Customers using Manus to produce works that incorporate quoted material should follow the same attribution discipline.

**Attribution** for AI-generated content is an emerging best practice. The default author label "Manus AI" used in the platform's documents is an honest disclosure that the content was AI-generated, which supports downstream consumers in evaluating provenance. Customers republishing AI-generated content under their own name should do so only after substantive human review and revision, both for quality and to honestly represent the production process.

**License terms for components** matter for software produced through the platform. The webdev template uses the MIT license by default for the project scaffold, and the shadcn/ui components used throughout the templates are also MIT-licensed. Other dependencies have their own licenses (typically MIT, Apache 2.0, or BSD), and customers shipping commercial software built on Manus should run a standard license audit before release.

**Open source posture**: the Manus platform itself is a proprietary commercial service, while the templates and patterns it generates are typically MIT-licensed open source. This hybrid model is common for commercial AI platforms and is well-understood by procurement teams.

**Trade secrets, patents, and trademarks**: customers running confidential information through Manus should treat the platform like any other cloud service — do not paste trade secrets into prompts unless covered by an enterprise agreement with appropriate confidentiality terms. Patent filings and trademark registrations require human attorney involvement; AI-generated drafts may be useful starting points but are not substitutes for filed legal work.

## Expert Review Supplement 6.4: Brand Guidelines, Voice and Tone, House Style

### Brand and Editorial Perspective

For organizations deploying Manus to produce customer-facing content, brand consistency matters. The platform's default voice is professional, helpful, and conservative — appropriate for B2B contexts and most professional content. Customers needing a different brand voice (more casual, more playful, more authoritative, industry-specific jargon) should provide explicit voice and tone guidance in their prompts or build a project-specific style guide that the agent can reference.

Brand guidelines typically specify color palettes, typography, logo usage, voice and tone, photography style, and iconography. Manus can produce content matching specified brand guidelines if those guidelines are shared with the agent at task start; the platform does not automatically infer brand guidelines from past sessions. For organizations producing high volumes of branded content, the recommended pattern is to maintain a brand guide document that gets attached to relevant tasks.

Writing style and house style govern the conventions for written content (Oxford comma, headline capitalization, em-dash usage, technical term spelling). Manus uses standard professional conventions by default; customers needing a specific house style (AP, Chicago, MLA, custom) should specify it in the task prompt. The format guidelines in the system prompt enforce a consistent baseline (GitHub-flavored Markdown, full sentences over bullets, blockquotes for citations) that produces readable output regardless of the underlying house style.

## Expert Review Supplement 6.5: Accessibility — WCAG AA, Alt Text, ARIA, Keyboard Navigation

### Accessibility Engineering Perspective

The Web Content Accessibility Guidelines (WCAG) 2.1 Level AA is the baseline accessibility target for most public-facing web content. WCAG AA covers four principles: perceivable (alt text for images, captions for video, sufficient color contrast), operable (keyboard navigation, no time limits, no seizure-inducing content), understandable (predictable behavior, error identification, plain language), and robust (compatible with assistive technologies).

Manus's webdev template is built on shadcn/ui and Radix UI components, which provide WCAG AA compliance out of the box for keyboard navigation, focus management, and ARIA attributes. The templates use semantic HTML (proper heading hierarchy, landmark regions, button vs. anchor distinction), which screen readers can navigate. Color contrast in the default themes meets WCAG AA at 4.5:1 for normal text and 3:1 for large text and graphical objects.

Alt text for images is a frequent accessibility gap in AI-generated content. The hero image, chart, and diagram produced in this session would need alt text added if they were to be embedded in a public web page; the platform does not automatically generate alt text but can do so on request. For documents produced through this session, the convention is to embed alt text as a caption beneath the image, which serves both visual readers and screen reader users.

ARIA (Accessible Rich Internet Applications) attributes provide additional semantics for assistive technologies when standard HTML is not sufficient. The shadcn/ui components used in webdev templates include appropriate ARIA roles, states, and properties for complex widgets like dialogs, comboboxes, and menus. Custom interactions added on top should follow ARIA Authoring Practices.

Keyboard navigation must allow every interactive element to be reached and operated via keyboard alone, with visible focus indicators showing the current focus position. The platform's CSS includes default focus ring styles that meet WCAG AA contrast requirements, and the components inherit standard tab order from semantic HTML. Custom interactions that hijack default keyboard behavior (such as custom modal traps) need explicit focus management.

Beyond technical compliance, accessibility is a craft of writing in plain language, using consistent navigation, and providing multiple ways to access the same content (text alongside images, captions alongside video, transcripts alongside audio). Manus's design philosophy of producing artifacts in multiple complementary formats (research brief plus slide deck plus video plus audio narration) directly supports accessibility by giving users multiple paths to the same information.

---

