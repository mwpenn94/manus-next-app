# STORYBOOK_PLAN — Component Library Bootstrap

> Storybook configuration and component story plan per §L.10.

---

## Architecture

Storybook will serve as the component development and documentation environment, providing isolated rendering of all UI components with interactive controls.

## Installation

```bash
pnpm add -D @storybook/react-vite @storybook/addon-essentials @storybook/addon-a11y @storybook/blocks storybook
```

## Configuration

### `.storybook/main.ts`

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../client/src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/client/src',
      '@shared': '/shared',
    };
    return config;
  },
};

export default config;
```

### `.storybook/preview.ts`

```typescript
import type { Preview } from '@storybook/react';
import '../client/src/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f0f1a' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

## Story Plan

### Priority 1: Core Components

| Component | Story File | Variants |
|-----------|-----------|----------|
| Button | `button.stories.tsx` | default, outline, ghost, destructive, loading, disabled, sizes |
| Card | `card.stories.tsx` | default, with-header, with-footer, interactive |
| Dialog | `dialog.stories.tsx` | default, confirmation, form, full-screen |
| Input | `input.stories.tsx` | default, with-label, error, disabled, with-icon |
| Badge | `badge.stories.tsx` | default, secondary, destructive, outline |

### Priority 2: Custom Components

| Component | Story File | Variants |
|-----------|-----------|----------|
| ManusNextChat | `manus-next-chat.stories.tsx` | default, with-messages, loading, error, themes |
| ModeToggle | `mode-toggle.stories.tsx` | speed, quality, max, disabled |
| CostIndicator | `cost-indicator.stories.tsx` | low, medium, high, calculating |
| VoiceInput | `voice-input.stories.tsx` | idle, recording, processing, error |
| ShareDialog | `share-dialog.stories.tsx` | default, with-password, expired |
| NotificationCenter | `notification-center.stories.tsx` | empty, with-notifications, unread |

### Priority 3: Layout Components

| Component | Story File | Variants |
|-----------|-----------|----------|
| DashboardLayout | `dashboard-layout.stories.tsx` | collapsed, expanded, mobile |
| WorkspacePanel | `workspace-panel.stories.tsx` | browser, code, terminal, images |
| MemoryGraph | `memory-graph.stories.tsx` | empty, populated, large |

## Package Scripts

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

## A11y Addon

The `@storybook/addon-a11y` addon runs axe-core on every story, providing:
- Automated accessibility violation detection
- Color contrast checking
- ARIA attribute validation
- Keyboard navigation testing

## Current Status

**PLANNED** — Storybook configuration is documented and ready to execute. Installation deferred to avoid adding dev dependencies that increase `node_modules` size during active development.

## Execution Steps

1. Install Storybook dependencies
2. Create `.storybook/` configuration directory
3. Write Priority 1 stories (shadcn/ui components)
4. Write Priority 2 stories (custom components)
5. Write Priority 3 stories (layout components)
6. Run `pnpm storybook` to verify all stories render
7. Run a11y addon to check for violations
8. Build static Storybook for documentation hosting
