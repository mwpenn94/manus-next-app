# Manus Next Companion

A lightweight Electron desktop app that connects your computer to Manus Next for AI-powered desktop control.

## Features

- **Native Desktop Control** — Mouse clicks, keyboard input, scrolling via nut.js
- **Screenshot Capture** — Full-screen screenshots via screenshot-desktop
- **CDP Browser Bridge** — Direct Chrome DevTools Protocol control for browser automation
- **WebSocket Relay** — Secure outbound connection to Manus Next (works through firewalls/NAT)
- **System Tray** — Runs in background with status indicator
- **Pairing Code** — Secure device pairing with 6-character code
- **Cross-Platform** — Windows, macOS, Linux builds via electron-builder

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build for your platform
npm run build:win    # Windows (NSIS + portable)
npm run build:mac    # macOS (DMG + ZIP)
npm run build:linux  # Linux (AppImage + DEB)
npm run build:all    # All platforms
```

## How It Works

1. Launch the companion app on your computer
2. Enter your Manus Next server URL (e.g., `wss://your-app.manus.space`)
3. Click "Connect" — the app establishes an outbound WebSocket connection
4. A pairing code is displayed — enter it on Manus Next → Settings → Connect Device
5. The AI agent can now control your computer: take screenshots, click, type, navigate

## Architecture

```
┌──────────────────┐     WebSocket      ┌──────────────────┐
│  Manus Next      │◄──────────────────►│  Companion App   │
│  (Web Server)    │   Commands/Results  │  (Electron)      │
│                  │                     │                  │
│  - Send commands │                     │  - screenshot    │
│  - View screen   │                     │  - click/type    │
│  - CDP eval      │                     │  - CDP bridge    │
└──────────────────┘                     └──────────────────┘
```

## Command Protocol

The companion app responds to JSON commands over WebSocket:

| Command | Parameters | Description |
|---------|-----------|-------------|
| `screenshot` | — | Capture full screen as PNG base64 |
| `click` | `x`, `y`, `button` | Click at coordinates |
| `type` | `text` | Type text via keyboard |
| `keypress` | `key`, `modifiers[]` | Press key combo (e.g., Ctrl+C) |
| `scroll` | `x`, `y`, `deltaX`, `deltaY` | Scroll at position |
| `eval` | `expression`, `cdpPort` | Evaluate JS in Chrome via CDP |
| `navigate` | `url`, `cdpPort` | Navigate Chrome tab via CDP |
| `get_info` | — | Get system info (OS, displays, CPU, RAM) |

## Security

- **Outbound-only connections** — No open ports on user's machine
- **Pairing code verification** — Device must be paired before accepting commands
- **Electron context isolation** — Renderer has no direct Node.js access
- **Local storage encryption** — Credentials stored via electron-store

## Requirements

- Node.js 18+
- Electron 33+
- For CDP bridge: Chrome/Chromium with `--remote-debugging-port=9222`
