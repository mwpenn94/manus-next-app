# I18N_PLAN — Internationalization Wiring

> Internationalization architecture and implementation plan per §L.10.

---

## Current State

The application is English-only. All user-facing strings are hardcoded in JSX. The `lang="en"` attribute is set on the HTML element.

## Architecture Decision

**Approach:** Extract strings to JSON locale files, use `react-i18next` for runtime translation.

**Rationale:**
- `react-i18next` is the most widely adopted React i18n library
- JSON locale files are easy for translators to work with
- Supports lazy loading of locale bundles
- Supports interpolation, pluralization, and context

## Implementation Plan

### Phase 1: String Extraction (Foundation)

1. Install dependencies:
   ```bash
   pnpm add i18next react-i18next i18next-browser-languagedetector
   ```

2. Create locale structure:
   ```
   client/src/locales/
     en/
       common.json     # Shared strings (buttons, labels, errors)
       home.json        # Home page strings
       task.json        # Task view strings
       settings.json    # Settings page strings
       nav.json         # Navigation strings
     es/
       common.json
       ...
   ```

3. Initialize i18next in `main.tsx`:
   ```tsx
   import i18n from 'i18next';
   import { initReactI18next } from 'react-i18next';
   import LanguageDetector from 'i18next-browser-languagedetector';
   
   i18n
     .use(LanguageDetector)
     .use(initReactI18next)
     .init({
       fallbackLng: 'en',
       ns: ['common', 'home', 'task', 'settings', 'nav'],
       defaultNS: 'common',
       interpolation: { escapeValue: false },
     });
   ```

4. Replace hardcoded strings:
   ```tsx
   // Before:
   <h1>Hello.</h1>
   
   // After:
   const { t } = useTranslation('home');
   <h1>{t('greeting')}</h1>
   ```

### Phase 2: Locale Support

| Language | Code | Priority | Status |
|----------|------|----------|--------|
| English | `en` | P0 | CURRENT |
| Spanish | `es` | P1 | PLANNED |
| French | `fr` | P1 | PLANNED |
| German | `de` | P2 | PLANNED |
| Japanese | `ja` | P2 | PLANNED |
| Chinese (Simplified) | `zh-CN` | P2 | PLANNED |

### Phase 3: RTL Support

For Arabic, Hebrew, and other RTL languages:
- Add `dir="rtl"` attribute based on locale
- Use CSS logical properties (`margin-inline-start` instead of `margin-left`)
- Mirror layout for sidebar navigation

## String Count Estimate

| Area | Estimated Strings | Priority |
|------|-------------------|----------|
| Navigation | ~20 | P0 |
| Home page | ~30 | P0 |
| Task view | ~50 | P0 |
| Settings | ~40 | P1 |
| Error messages | ~25 | P0 |
| Toast messages | ~15 | P0 |
| Dialogs | ~30 | P1 |
| **Total** | **~210** | |

## Date/Number Formatting

Use `Intl` API for locale-aware formatting:

```tsx
// Dates
new Intl.DateTimeFormat(locale).format(date);

// Numbers
new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount);

// Relative time
new Intl.RelativeTimeFormat(locale).format(-5, 'minutes');
```

## Current Blockers

- String extraction is a manual process across ~30 component files
- No translation management platform configured
- RTL support requires CSS audit of all components

## Recommendation

Defer full i18n implementation until after Gate A. The architecture is documented and ready to execute. Priority is:
1. Extract English strings to JSON (enables translation without code changes)
2. Add language selector to Settings page
3. Commission translations for P1 languages
