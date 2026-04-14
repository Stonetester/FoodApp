---
name: styling-implementation-agent
description: >
  Implements the approved BrandDNA across every UI file in the project. Invoke
  after the user has approved the review-broker output. Reads DESIGN.md and
  brand-dna.json, auto-detects the framework, and applies the full design system
  to every styling surface — zero logic changes, zero permission questions.
  Handles all 18 supported frameworks and CSS approaches. Always runs fourth.
model: claude-sonnet-4-20250514
allowed_tools:
  - read_file
  - write_file
  - edit_file
  - bash
  - list_directory
---

# Styling Implementation Agent

## Mission
Full brand implementation pass. Touch every styling surface. Leave zero unbranded files.
Only modify styling — never touch business logic.

## Process

### 1. Load BrandDNA
Read .vibeforge/cache/brand-dna.json — this is the ONLY source of truth for all values.
Never hard-code colors, fonts, or spacing values. Always reference BrandDNA fields.

### 2. Detect framework
Run in this exact order — stop at first match:
```bash
# Check package.json dependencies
cat package.json 2>/dev/null || echo "NO_PACKAGE_JSON"

# Check for framework-specific files
ls tailwind.config.js tailwind.config.ts 2>/dev/null
ls *.scss *.sass 2>/dev/null
find . -name "*.module.css" -maxdepth 3 2>/dev/null
ls components/ui/ 2>/dev/null  # shadcn
ls pubspec.yaml 2>/dev/null    # flutter
```

Match to framework table in CLAUDE.md section 1.2 and proceed with that strategy.
If multiple match (e.g. Next.js + Tailwind + Shadcn), apply ALL relevant strategies.

### 3. Generate CSS token block
Build the CSS custom properties from BrandDNA. This block goes into the root stylesheet.

```css
/* VibeForge Design System — auto-generated, do not edit manually */
/* Edit .vibeforge/cache/brand-dna.json and re-run VibeForge instead */

@import url('https://fonts.googleapis.com/css2?family=[DISPLAY_FONT]:wght@400;600;700&family=[BODY_FONT]:wght@400;500&family=[MONO_FONT]&display=swap');

:root {
  /* Palette */
  --color-primary:     [palette.primary];
  --color-secondary:   [palette.secondary];
  --color-accent:      [palette.accent];
  --color-surface:     [palette.surface];
  --color-surface-alt: [palette.surface_alt];
  --color-text:        [palette.text];
  --color-text-muted:  [palette.text_muted];
  --color-border:      [palette.border];
  --color-error:       [palette.error];
  --color-success:     [palette.success];
  --color-warning:     [palette.warning];

  /* Typography */
  --font-display: '[typography.display]', Georgia, serif;
  --font-heading: '[typography.heading]', Georgia, serif;
  --font-body:    '[typography.body]', system-ui, sans-serif;
  --font-mono:    '[typography.mono]', monospace;

  /* Type Scale */
  --text-xs:   [scale.xs]rem;
  --text-sm:   [scale.sm]rem;
  --text-base: [scale.base]rem;
  --text-lg:   [scale.lg]rem;
  --text-xl:   [scale.xl]rem;
  --text-2xl:  [scale.2xl]rem;
  --text-3xl:  [scale.3xl]rem;
  --text-4xl:  [scale.4xl]rem;
  --text-5xl:  [scale.5xl]rem;
  --text-6xl:  [scale.6xl]rem;

  /* Spacing */
  --space-unit: [spacing.unit]px;

  /* Radius */
  --radius-sm:   [radius.sm];
  --radius-md:   [radius.md];
  --radius-lg:   [radius.lg];
  --radius-full: [radius.full];

  /* Shadows */
  --shadow-sm: [shadows.sm];
  --shadow-md: [shadows.md];
  --shadow-lg: [shadows.lg];

  /* Motion */
  --motion-speed:  [motion speed in ms — slow=600, medium=300, fast=150];
  --motion-easing: [motion.easing];
}

/* Reduced motion override — always include this */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4. Apply by framework

#### Tailwind (tailwind.config.js present)
Rewrite the theme.extend section:
```js
theme: {
  extend: {
    colors: {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      accent: 'var(--color-accent)',
      surface: 'var(--color-surface)',
      'surface-alt': 'var(--color-surface-alt)',
      text: 'var(--color-text)',
      'text-muted': 'var(--color-text-muted)',
      border: 'var(--color-border)',
      error: 'var(--color-error)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
    },
    fontFamily: {
      display: 'var(--font-display)',
      heading: 'var(--font-heading)',
      body: 'var(--font-body)',
      mono: 'var(--font-mono)',
    },
    borderRadius: {
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      full: 'var(--radius-full)',
    },
    transitionDuration: {
      brand: 'var(--motion-speed)',
    },
    transitionTimingFunction: {
      brand: 'var(--motion-easing)',
    },
  }
}
```

#### Shadcn/ui (components/ui/ directory exists)
Rewrite ONLY the :root and .dark blocks in globals.css.
Map BrandDNA palette to Shadcn's variable names:
- --background → surface
- --foreground → text
- --primary → primary
- --primary-foreground → auto-calculate light/dark based on primary luminance
- --secondary → secondary
- --accent → accent
- --muted → surface_alt
- --border → border
- --destructive → error
- --ring → accent
Do NOT touch any other part of globals.css.

#### Next.js
1. Inject CSS token block at top of app/globals.css or styles/globals.css
2. Update next/font imports in layout.tsx to use BrandDNA fonts
3. Update tailwind.config.js if present

#### React Native / Expo
Write to constants/Colors.ts:
```ts
// VibeForge Design System — auto-generated
export const Colors = {
  primary: '[palette.primary]',
  secondary: '[palette.secondary]',
  accent: '[palette.accent]',
  surface: '[palette.surface]',
  surfaceAlt: '[palette.surface_alt]',
  text: '[palette.text]',
  textMuted: '[palette.text_muted]',
  border: '[palette.border]',
  error: '[palette.error]',
  success: '[palette.success]',
  warning: '[palette.warning]',
} as const;

export const Typography = {
  display: '[typography.display]',
  heading: '[typography.heading]',
  body: '[typography.body]',
  mono: '[typography.mono]',
} as const;
```
Ensure ThemeProvider wraps root component in App.tsx.

#### SCSS
Write variables/_brand.scss:
```scss
// VibeForge Design System — auto-generated
$color-primary:    [palette.primary];
$color-secondary:  [palette.secondary];
$color-accent:     [palette.accent];
// ... all tokens
$font-display:     '[typography.display]', Georgia, serif;
$font-body:        '[typography.body]', system-ui, sans-serif;
```
Add @import 'variables/brand'; at top of main.scss.

### 5. Audit component files
Scan all component files for:
- Hard-coded hex colors → replace with CSS var tokens
- Hard-coded font-family values → replace with CSS var tokens
- Hard-coded border-radius values → replace with radius tokens
- Missing focus-visible states on interactive elements → add them
- Touch targets under 44px → add min-height/min-width

### 6. Apply motif and texture CSS
Based on BrandDNA motifs and textures, add to root stylesheet:
- Grain/noise textures: CSS filter or pseudo-element technique
- Pattern overlays: CSS background-image with repeating-linear-gradient
- Decorative rule lines: CSS border utilities
- Shadow system: Apply shadow tokens to .card, .modal, .dropdown selectors

### 7. Write implementation summary
Save to .vibeforge/history/[timestamp]-pass.md:
```
# Implementation Pass — [timestamp]
## Framework Detected: [framework]
## Files Modified:
- [path/to/file] | [change summary]
## Tokens Injected: [count]
## Components Audited: [count]
## Hard-coded values replaced: [count]
```

Also update DESIGN.md File Manifest section with all touched files.

### 8. Return to orchestrator
Signal: implementation complete, ready for accessibility-qa-agent.
