# Implementation Guide: RED Capabilities #42, #43, #47

> **Scope:** This document defines concrete implementation paths — including failover workarounds, CDP integration, and hardware allocation — for the three RED capabilities that can be driven to GREEN with available or acquirable infrastructure: **#42 App Publishing (Mobile)**, **#43 Mobile Development**, and **#47 My Computer (Virtual Desktop)**.

---

## Executive Summary

The five RED capabilities in the Manus Next parity backlog are blocked on external infrastructure. Three of them (#42, #43, #47) are actionable with current technology and modest investment. This guide presents multiple implementation tiers for each — from zero-cost failover workarounds to production-grade solutions — so you can choose the path that matches your timeline, budget, and ambition.

| Capability | Fastest Path to GREEN | Estimated Cost | Estimated Time |
|---|---|---|---|
| #42 Mobile Publishing | PWA-to-Store via TWA + PWABuilder | $124 one-time | 8–12 hours |
| #43 Mobile Development | Capacitor wrap of existing web app | $0–49/mo | 16–24 hours |
| #47 My Computer | BYOD via Electron companion app | $0 | 20–30 hours |

---

## Capability #42: App Publishing (Mobile)

### The Problem

Manus Next currently has no pipeline to publish the application to the Apple App Store or Google Play Store. The web app already functions as a PWA with a service worker, `manifest.json`, and offline fallback — but it is not packaged for native distribution.

### Tier 1: PWA-to-Store (Failover — Lowest Effort)

The existing PWA can be published to app stores without writing any native code. This is the fastest path to GREEN status.

**Google Play via Trusted Web Activity (TWA).** A TWA wraps a PWA inside a Chrome Custom Tab, giving it a native app shell with no browser UI chrome. Google officially supports this pattern. The tooling is mature: **Bubblewrap CLI** (by Google) or **PWABuilder** (by Microsoft) can generate a signed APK from a PWA URL in minutes [1]. The resulting app passes Play Store review and supports push notifications, offline mode, and full-screen display. The only requirement is a Google Play Developer account ($25 one-time).

**Apple App Store via PWABuilder.** Apple is more restrictive — they have historically rejected thin PWA wrappers. However, PWABuilder generates an Xcode project that embeds a `WKWebView` with native navigation chrome, which has been accepted by App Store review when the app provides genuine value [2]. An Apple Developer account ($99/year) is required. If Apple rejects the PWA wrapper, the fallback is Tier 2 (Capacitor).

**Microsoft Store.** PWAs can be submitted directly to the Microsoft Store via Partner Center with zero code changes [3]. This is essentially free and takes under an hour.

| Store | Tool | Native Code Required | Cost | Review Risk |
|---|---|---|---|---|
| Google Play | Bubblewrap / PWABuilder | None | $25 | Low |
| Apple App Store | PWABuilder | Minimal (Xcode project) | $99/yr | Medium |
| Microsoft Store | Partner Center | None | $0 | Very Low |

**Implementation steps:**

1. Ensure the PWA scores 100 on Lighthouse PWA audit (service worker, manifest, icons, offline).
2. Run `npx @nicolo-ribaudo/pwabuilder` or use [pwabuilder.com](https://www.pwabuilder.com/) to generate store packages.
3. For Google Play: generate TWA APK, sign with upload key, submit via Play Console.
4. For Apple: generate Xcode project, build via Xcode Cloud or a Mac, submit via App Store Connect.
5. For Microsoft: submit PWA URL directly in Partner Center.

### Tier 2: Capacitor Wrap (Production-Grade)

Capacitor by Ionic wraps the existing React web app into a native iOS/Android shell with access to native APIs (camera, biometrics, push notifications, file system) [4]. This is the recommended production path because it preserves the entire existing codebase while adding genuine native capabilities.

**Cloud builds eliminate the need for a local Mac.** Services like **Capawesome Cloud** ($49/month) and **Ionic Appflow** ($499/month) handle iOS and Android builds in the cloud, including code signing [5]. GitHub Actions with `capacitor-assets` and `fastlane` is a free alternative if you have access to a Mac runner.

**Implementation steps:**

1. Install Capacitor: `npm install @capacitor/core @capacitor/cli && npx cap init`.
2. Add platforms: `npx cap add ios && npx cap add android`.
3. Configure `capacitor.config.ts` with app ID, name, and web directory (`dist`).
4. Build the web app (`pnpm build`) and sync: `npx cap sync`.
5. For cloud builds: connect to Capawesome Cloud or Appflow, upload signing certificates.
6. For local builds: `npx cap open ios` (requires Xcode) or `npx cap open android` (requires Android Studio).
7. Submit to stores via respective developer consoles.

### Tier 3: Expo / React Native (Maximum Capability)

If the goal is to eventually build a fully native mobile experience with shared business logic, Expo with EAS Build provides the most capable path. **EAS Build** compiles React Native apps in the cloud and **EAS Submit** automates store submission [6]. This approach requires rewriting the UI layer in React Native components but can share the tRPC client, authentication logic, and business types with the web app.

This tier is recommended only if the mobile app needs capabilities that Capacitor cannot provide (e.g., complex native animations, ARKit/ARCore, or native module bridging).

### CDP Failover for Mobile Testing

Even without native builds, **Playwright's device emulation** can validate the mobile experience programmatically. Playwright supports over 100 device profiles (iPhone, Pixel, Galaxy) and can emulate viewport, user agent, touch events, and geolocation [7]. This does not produce a store-publishable app, but it provides automated mobile QA that can run in CI/CD and catch responsive design regressions.

```typescript
// Playwright mobile emulation example
const { devices } = require('playwright');
const iPhone = devices['iPhone 14 Pro'];
const browser = await chromium.launch();
const context = await browser.newContext({ ...iPhone });
const page = await context.newPage();
await page.goto('https://manusnext-mlromfub.manus.space');
await page.screenshot({ path: 'mobile-home.png' });
```

---

## Capability #43: Mobile Development

### The Problem

The agent cannot generate mobile applications. When a user asks "build me a mobile app," the system has no pipeline to produce an installable native artifact.

### Tier 1: Capacitor Code Generation (Recommended)

The most practical approach extends the existing **WebApp Builder** (#27) to output Capacitor-wrapped projects. The agent already generates React web apps; adding Capacitor configuration is a thin layer on top.

**How it works:** When the agent detects a mobile app request, it generates a standard React web app plus a `capacitor.config.ts`, platform-specific configuration files, and build instructions. The generated project can be built locally or via cloud services.

**Implementation steps:**

1. Add a "Mobile App" template to the WebApp Builder that includes Capacitor scaffolding.
2. Extend the `webapp.create` tRPC procedure to accept a `platform` parameter (`web`, `ios`, `android`, `both`).
3. Generate `capacitor.config.ts`, `android/` and `ios/` directory stubs, and a `README.md` with build instructions.
4. Store the generated project in S3 via `webapp.publish` and provide a download link.
5. Optionally trigger a cloud build via Capawesome API and return the APK/IPA directly.

### Tier 2: Expo Managed Workflow

For users who need a more native experience, the agent can generate Expo projects using the managed workflow. Expo's `create-expo-app` scaffolds a complete React Native project that can be built via EAS Build without any local native tooling [6].

**Implementation steps:**

1. Add an Expo project template with `app.json`, navigation structure, and common components.
2. The agent generates screens, navigation, and API integration code in React Native syntax.
3. Output includes EAS Build configuration and instructions for `eas build --platform all`.
4. The user runs one command to get iOS and Android binaries.

### Tier 3: CDP-Based Mobile Web App Testing (Failover)

As a failover that requires no native infrastructure, the agent can generate mobile-optimized web apps and validate them using CDP-connected mobile device emulation. Playwright's `connectOverCDP()` method can connect to a remote Chrome instance running on an actual Android device via USB debugging [8], providing real-device testing without a native build pipeline.

This approach produces a mobile-optimized web app (not a native app) but validates it against real mobile browser behavior, which is significantly more rigorous than desktop-only testing.

---

## Capability #47: My Computer (Virtual Desktop)

### The Problem

The current `ComputerUsePage` provides a client-side simulation of a desktop environment (terminal, text editor, browser, file manager with window management), but it does not provide real OS-level control. The agent cannot actually interact with a real desktop, run native applications, or manipulate files on a real file system.

### Tier 0: BYOD — User's Own Device (Free, No Server Infrastructure)

The most cost-effective path to GREEN requires **zero server infrastructure**. Instead of provisioning a cloud VM or mini PC, the user connects their own computer — the machine already sitting on their desk — to the Manus Next agent. The agent controls the user's real desktop remotely, using the user's own hardware, software, and login sessions. Three sub-approaches serve different tradeoffs between capability and installation friction.

#### Approach A: Electron Companion App (Recommended)

The user downloads and installs a lightweight **"Manus Desktop Agent"** — an Electron application of approximately 50–100 MB. Once launched, the app establishes an outbound WebSocket connection to the Manus Next backend, which means it works through firewalls, NAT, and corporate networks without any port forwarding or tunnel configuration. The agent sends structured commands (`screenshot`, `click(x, y)`, `type("text")`, `shell("cmd")`) and the Electron app executes them using **platform-native automation**: PowerShell and Win32 APIs on Windows, CoreGraphics and `osascript` on macOS, and `xdotool` on Linux [16]. For browser-specific tasks, the app uses **Puppeteer-core over CDP** to control Chrome with sub-second precision — no screenshots needed for web automation.

This architecture is proven in production. The **Open Computer Use** project (Apache 2.0 license) implements exactly this pattern: an Electron overlay with a floating always-on-top UI, platform-native automation modules, and a WebSocket bridge to a FastAPI backend [16]. The **Contop** project takes the same approach but adds a mobile app so users can control their desktop from their phone [17].

**Architecture:**

```
┌─────────────────────────────────────────────┐
│  User's Own PC / Mac / Linux Machine        │
│  ┌───────────────────────────────────┐      │
│  │  Manus Desktop Agent (Electron)   │      │
│  │  ┌─────────────────────────────┐  │      │
│  │  │ Native Automation Layer     │  │      │
│  │  │ Win32 / CoreGraphics / xdo  │  │      │
│  │  ├─────────────────────────────┤  │      │
│  │  │ CDP Bridge (Puppeteer-core) │  │      │
│  │  │ Controls user's Chrome      │  │      │
│  │  ├─────────────────────────────┤  │      │
│  │  │ WebSocket Client (outbound) │  │      │
│  │  └──────────┬──────────────────┘  │      │
│  └─────────────┼─────────────────────┘      │
└────────────────┼────────────────────────────┘
                 │ WSS (outbound, NAT-friendly)
                 ▼
┌─────────────────────────────────────────────┐
│  Manus Next Backend                         │
│  computer.execute tRPC procedure            │
│  Sends: screenshot, click, type, shell      │
│  Receives: screenshots, command output      │
│  LLM reasons about UI → returns actions     │
└─────────────────────────────────────────────┘
```

**Why this is superior to VNC for BYOD:** Native OS automation is faster and more precise than VNC screenshot-based control. The Electron app can read the accessibility tree, enumerate windows, and invoke OS-level APIs — capabilities that VNC cannot provide. For browser tasks specifically, CDP control is approximately 10x faster than screenshot→click loops because it operates on the DOM directly rather than pixel coordinates.

**Privacy controls:** The user retains full control. The Electron app can be configured to restrict which applications the agent can interact with, require confirmation before executing shell commands, and operate in a "browser-only" mode that limits control to Chrome via CDP. For maximum privacy, the app can use the accessibility tree and headless browser mode so that no screenshots ever leave the machine — the agent receives structured UI element descriptions instead of pixel data [17].

**Implementation steps:**

1. Fork the Open Computer Use Electron app [16] or build a minimal Electron shell with `electron-builder`.
2. Implement the automation layer: `win32-api` (Windows), `node-mac-permissions` + `robotjs` (macOS), `xdotool` child process (Linux).
3. Add a WebSocket client that connects to the Manus Next backend on startup.
4. Create a `computer.execute` tRPC procedure on the backend that receives agent commands and forwards them to the connected Electron app via WebSocket.
5. Build the agent tool loop: send `screenshot` command → receive image → send to LLM → receive action → send action command → repeat.
6. Package with `electron-builder` for Windows (.exe), macOS (.dmg), and Linux (.AppImage).
7. Distribute via the Manus Next UI: a "Connect Your Computer" page with download links and a pairing code.

#### Approach B: Cloudflare Tunnel + VNC (Zero App Install)

For users who prefer not to install a desktop application, **Cloudflare Tunnel** provides a completely free path that requires only a CLI tool and the operating system's built-in VNC server. Cloudflare's free tier has no bandwidth limits, no usage restrictions, and no time limits [18]. The tunnel creates a secure, encrypted connection from the user's machine to a Cloudflare-assigned URL, and Cloudflare renders the VNC session directly in the browser — no VNC client software is needed on the viewing side [19].

**User setup (one-time, ~10 minutes):**

1. Install `cloudflared` (single binary, available for Windows/macOS/Linux).
2. Enable the OS built-in VNC server: macOS has Screen Sharing built in; Windows has Remote Desktop (Pro) or TightVNC (free); Linux has `x11vnc`.
3. Run: `cloudflared tunnel --url tcp://localhost:5900` (or the appropriate VNC port).
4. Cloudflare assigns a URL (e.g., `https://random-words.trycloudflare.com`).
5. Paste the URL into Manus Next settings.

The Manus Next backend connects to the Cloudflare URL and controls the desktop via VNC protocol. Cloudflare Access policies can restrict connections to only the Manus Next backend's IP range for security [19].

**Limitations:** VNC is slower than native automation (Approach A) because it operates on pixel-level screenshots rather than OS APIs. It also cannot access the accessibility tree or enumerate windows programmatically. However, it works on any OS without installing any application beyond the `cloudflared` CLI.

#### Approach C: CDP-Only Browser Control (Zero Install)

For users who only need the agent to control their web browser (which covers an estimated 80% of "computer use" tasks), **Chrome's built-in CDP** requires zero additional software. The user launches Chrome with a remote debugging flag, creates a tunnel, and the agent connects.

**User setup:**

1. Close all Chrome windows.
2. Relaunch Chrome: `chrome --remote-debugging-port=9222`.
3. Run: `cloudflared tunnel --url http://localhost:9222` (free).
4. Paste the tunnel URL into Manus Next settings.

The agent connects via Playwright's `connectOverCDP()` and has full programmatic control over every tab, form, and page — with zero latency, zero screenshots, and zero vision model costs. This is the fastest and most precise control method available, but it is limited to browser-based tasks.

| BYOD Approach | User Installs | Desktop Control | Browser Control | Speed | Privacy | Cost |
|---|---|---|---|---|---|---|
| A: Electron App | ~50 MB app | Full (native OS) | Full (CDP) | Fastest | Configurable | $0 |
| B: Cloudflare + VNC | cloudflared CLI | Full (VNC) | Via VNC | Medium | Screenshots sent | $0 |
| C: CDP-Only | Nothing (Chrome flag) | None | Full (CDP) | Fastest | DOM data only | $0 |

### Tier 1: Docker + noVNC (Self-Hosted, Lowest Cost)

The most straightforward approach runs a containerized Linux desktop accessible via web browser. This is the same pattern used by OpenAI's CUA reference implementation and Anthropic's computer use demo [9] [10].

**Architecture:**

```
┌─────────────────────────────────────────────┐
│  Mini PC / Server (Docker Host)             │
│  ┌───────────────────────────────────┐      │
│  │  Docker Container                 │      │
│  │  Ubuntu 22.04 + XFCE Desktop     │      │
│  │  Xvfb (virtual framebuffer)      │      │
│  │  x11vnc → noVNC (WebSocket)      │      │
│  │  xdotool (mouse/keyboard input)  │      │
│  │  Firefox / Chromium               │      │
│  └───────────────────────────────────┘      │
│         ↕ Port 6080 (noVNC WebSocket)       │
│         ↕ Port 5900 (VNC, optional)         │
└─────────────────────────────────────────────┘
         ↕ HTTPS tunnel / reverse proxy
┌─────────────────────────────────────────────┐
│  Manus Next Web App                         │
│  ComputerUsePage.tsx                         │
│  ┌───────────────────────────────────┐      │
│  │  <iframe src="noVNC endpoint">   │      │
│  │  Real desktop streaming in UI     │      │
│  └───────────────────────────────────┘      │
│  Agent sends xdotool commands via API       │
└─────────────────────────────────────────────┘
```

**The agent interacts with the desktop through a control API** that wraps `xdotool` for mouse/keyboard input and `import` (ImageMagick) or `scrot` for screenshots. The LLM receives screenshots, reasons about the UI, and returns action commands — exactly the pattern established by Anthropic's computer use tool and OpenAI's CUA [9] [10].

**Implementation steps:**

1. Create a Dockerfile based on OpenAI's CUA reference (Ubuntu 22.04 + XFCE + Xvfb + x11vnc + noVNC + xdotool + Firefox).
2. Add a REST API layer (Express or FastAPI) that exposes endpoints: `POST /screenshot`, `POST /click`, `POST /type`, `POST /scroll`, `POST /shell`.
3. Deploy the container on a mini PC or cloud VM.
4. Create a `computer.execute` tRPC procedure that proxies agent commands to the container API.
5. Update `ComputerUsePage.tsx` to embed the noVNC stream in an iframe and display the real desktop.
6. Wire the `computer_use` agent tool to send screenshot→action loops through the container API.

### Tier 2: Kasm Workspaces (Self-Hosted VDI Platform)

Kasm Workspaces is a container streaming platform purpose-built for virtual desktop infrastructure [11]. It provides a full management API for programmatic session creation, destruction, and interaction — making it ideal for an agent that needs to spin up desktops on demand.

**Advantages over raw Docker + noVNC:**

| Feature | Docker + noVNC | Kasm Workspaces |
|---|---|---|
| Session management API | Custom-built | Built-in REST API |
| Multi-user isolation | Manual | Automatic |
| Persistent profiles | Manual volumes | Built-in |
| Clipboard sync | Manual | Built-in |
| File upload/download | Manual | Built-in |
| Audio streaming | Not included | Built-in |
| GPU acceleration | Manual passthrough | Supported |
| Monitoring/logging | Manual | Dashboard |

**Hardware requirements:** Kasm requires 2768 MB RAM and 2 CPU cores per session [11]. A mini PC with 32 GB RAM can support approximately 8–10 concurrent desktop sessions. A 64 GB machine can support 16–20.

**Implementation steps:**

1. Install Kasm Workspaces on a dedicated mini PC or cloud VM (single-server install takes ~15 minutes).
2. Configure workspace images (Ubuntu Desktop, Windows via WINE, or custom images).
3. Use the Kasm Developer API to create sessions programmatically from the Manus Next backend.
4. Embed the Kasm session URL in `ComputerUsePage.tsx`.
5. Wire the agent's `computer_use` tool to Kasm's API for screenshot and input control.

### Tier 3: Cua.ai Platform (Managed Cloud Desktops)

**Cua** (13.5k GitHub stars) is an open-source platform specifically designed for computer-use agents [12]. It provides cloud desktops (Linux, Windows, macOS, Android) with hot-start under 1 second, a Computer SDK for screenshots/clicks/typing/shell/file I/O, and an Agent SDK for observe-reason-act loops.

**Key differentiator:** Cua is built from the ground up for AI agent interaction, not repurposed from human VDI. It includes snapshot/restore (save and fork desktop state), task environments (pre-built app replicas for testing), and an MCP server (use Cua desktops as tools in any MCP-compatible agent).

**Implementation steps:**

1. Sign up for Cua Cloud or self-host the open-source version.
2. Use the Computer SDK to create sandboxes: `sandbox = await cua.create({ os: "linux", image: "ubuntu-desktop" })`.
3. Wire the Manus Next agent to Cua's Agent SDK for the observe-reason-act loop.
4. Embed the sandbox display in `ComputerUsePage.tsx` via Cua's streaming endpoint.
5. Use snapshot API to save/restore desktop state between sessions.

### Tier 4: CDP Hybrid (Browser Automation + Desktop)

For tasks that are primarily browser-based, a **CDP hybrid approach** avoids the overhead of a full virtual desktop. Chrome DevTools Protocol provides precise, programmatic control over a browser instance — clicks, navigation, form filling, JavaScript execution, network interception — without the latency of screenshot-based interaction [13].

**Architecture:** Run a headless Chrome instance in a Docker container. The agent connects via Playwright's `connectOverCDP()` method and controls the browser programmatically. For tasks that require desktop interaction beyond the browser, fall back to the VNC-based approach.

```typescript
// CDP connection from Manus Next backend
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://mini-pc:9222');
const context = browser.contexts()[0];
const page = context.pages()[0];

// Precise, fast browser control — no screenshots needed
await page.goto('https://example.com');
await page.fill('#search', 'query');
await page.click('button[type="submit"]');
const results = await page.textContent('.results');
```

**When to use CDP vs. VNC:**

| Scenario | Use CDP | Use VNC/Desktop |
|---|---|---|
| Web browsing and form filling | Yes | Overkill |
| Web scraping and data extraction | Yes | Overkill |
| Desktop application interaction | No | Yes |
| File manager operations | No | Yes |
| Multi-app workflows | Partial | Yes |
| Speed-critical automation | Yes (10x faster) | Slower |

The recommended production architecture combines both: **CDP for browser tasks** (fast, precise, no vision model needed) and **VNC desktop for everything else** (full OS control via screenshot-action loop). The agent's tool router decides which path to use based on the task description.

### Hardware Recommendations for Self-Hosting #47

The virtual desktop capability requires a machine to host the Docker containers. Here are concrete hardware recommendations based on the expected workload.

**Option A: Mini PC (Best Value)**

A modern mini PC provides excellent performance for virtual desktop hosting at a fraction of the cost of a cloud VM. Recommended configurations:

| Use Case | CPU | RAM | Storage | GPU | Approx. Cost | Concurrent Sessions |
|---|---|---|---|---|---|---|
| Light (1–2 sessions) | Intel N100/N150 | 16 GB | 256 GB NVMe | Integrated | $150–200 | 1–3 |
| Medium (4–8 sessions) | AMD Ryzen 7 8845HS | 32 GB | 512 GB NVMe | Integrated Radeon | $300–400 | 4–8 |
| Heavy (10+ sessions) | Intel i7-13700H | 64 GB | 1 TB NVMe | Integrated Iris Xe | $500–700 | 10–16 |

**Beelink, Minisforum, and Intel NUC** are well-regarded brands for this use case. A $150 Beelink with an Intel N100 and 16 GB RAM can run 12 Docker containers without breaking a sweat [14]. For virtual desktops specifically, RAM is the primary bottleneck (each session needs ~2.5–3 GB), so prioritize RAM over CPU.

**Option B: Mini PC + External GPU**

If you plan to run local vision models (for screenshot analysis without cloud API calls) or need GPU-accelerated rendering in the virtual desktop, Beelink offers a docking station that supports desktop GPUs via OCuLink/Thunderbolt [15]. This lets you pair a $200 mini PC with a dedicated GPU for local AI inference.

| Configuration | GPU | Local Vision Model | Cost |
|---|---|---|---|
| Mini PC only | Integrated | No (use cloud API) | $150–400 |
| Mini PC + RTX 3060 | NVIDIA RTX 3060 12GB | Yes (Qwen-VL, LLaVA) | $400–650 |
| Mini PC + RTX 4090 | NVIDIA RTX 4090 24GB | Yes (large models) | $1,500–2,000 |

**Note:** A GPU is **not required** for the virtual desktop itself. The GPU is only needed if you want to run vision models locally instead of calling Claude/GPT APIs for screenshot analysis. For most use cases, the cloud API approach (send screenshot to Claude/GPT, receive actions) is simpler and more cost-effective.

**Option C: Cloud VM (No Hardware to Manage)**

If you prefer not to manage physical hardware, a cloud VM provides the same capability with zero maintenance.

| Provider | Instance | RAM | vCPUs | Monthly Cost |
|---|---|---|---|---|
| AWS | t3.xlarge | 16 GB | 4 | ~$120/mo |
| GCP | e2-standard-4 | 16 GB | 4 | ~$100/mo |
| Hetzner | CPX31 | 16 GB | 4 | ~$25/mo |
| Oracle Cloud | VM.Standard.A1.Flex | 24 GB | 4 | Free tier |

**Hetzner and Oracle Cloud** offer exceptional value. Oracle's Always Free tier includes an ARM instance with 24 GB RAM — enough for 6–8 concurrent desktop sessions at zero cost.

---

## Recommended Implementation Order

Based on effort-to-impact ratio, the recommended sequence is:

1. **#42 Mobile Publishing (Tier 1: PWA-to-Store)** — 8–12 hours, $124. The existing PWA is already 90% of the way there. Generating TWA and PWABuilder packages is largely automated. This is the fastest path to closing a RED capability.

2. **#47 My Computer (Tier 1: Docker + noVNC on mini PC)** — 20–30 hours, $150–400. This unlocks the most transformative capability: real desktop control. Start with a single Docker container on a mini PC, wire it to the agent's tool system, and iterate. The CDP hybrid approach can be added later for browser-specific speed optimization.

3. **#43 Mobile Development (Tier 1: Capacitor generation)** — 16–24 hours, $0–49/mo. This builds on #42's infrastructure. Once Capacitor is integrated for publishing, extending the WebApp Builder to generate Capacitor projects is incremental.

---

## References

[1]: https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2 "Trusted Web Activities Quick Start Guide — Android Developers"
[2]: https://www.pwabuilder.com/ "PWABuilder — Ship your PWA to app stores"
[3]: https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/microsoft-store "Publish a PWA to the Microsoft Store — Microsoft Learn"
[4]: https://capacitorjs.com/ "Capacitor by Ionic — Cross-platform apps with web technology"
[5]: https://cloud.capawesome.io/native-builds/ "Capawesome Cloud — Native Builds for Capacitor"
[6]: https://docs.expo.dev/build/introduction/ "EAS Build — Expo Documentation"
[7]: https://playwright.dev/docs/emulation "Emulation — Playwright Documentation"
[8]: https://testdino.com/blog/playwright-mobile-testing/ "Playwright Mobile Testing: Test on Real Devices"
[9]: https://developers.openai.com/api/docs/guides/tools-computer-use "Computer use — OpenAI API Documentation"
[10]: https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool "Computer use tool — Anthropic Claude API Documentation"
[11]: https://docs.kasm.com/docs/develop/install/system_requirements.html "Kasm Workspaces System Requirements"
[12]: https://cua.ai/ "Cua — The Computer Use Agent Platform"
[13]: https://chromedevtools.github.io/devtools-protocol/ "Chrome DevTools Protocol"
[14]: https://www.xda-developers.com/my-150-mini-pc-runs-12-docker-containers-and-hasnt-broken-a-sweat/ "My $150 mini PC runs 12 Docker containers — XDA Developers"
[15]: https://news.ycombinator.com/item?id=42141519 "Beelink mini-PC docking station supports desktop GPU — Hacker News"
[16]: https://github.com/coasty-ai/open-computer-use "Open Computer Use — AI agents that control computers like humans do (Apache 2.0)"
[17]: https://github.com/slopedrop/contop "Contop — Your Desktop, From Anywhere. AI-powered remote desktop agent"
[18]: https://www.reddit.com/r/CloudFlare/comments/1on16xd/free_tier_tunnel_zero_trust_limitation/ "Cloudflare Tunnel free tier — no bandwidth limits or usage restrictions"
[19]: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/vnc-browser-rendering/ "Render a VNC client in the browser — Cloudflare One docs"
