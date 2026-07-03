# Modo Gusto — Project Instructions
# Claude Code reads this file automatically every session.

---

## PROJECT RULES — READ BEFORE TOUCHING ANY FILE

### 1. Keep every feature working
When making UI or UX changes, ALL existing features must continue to work.
Do not remove, disable, or break any backend API call, form submission, navigation
action, or user flow. If a UI change risks breaking a feature, flag it before
proceeding and find a non-breaking approach.

### 2. Mobile-first — always
Every layout, component, spacing decision, and interaction pattern must be
designed for a mobile phone screen first (375px–430px wide).
Desktop is secondary. If it looks great on mobile and merely good on desktop,
that is the correct outcome. If it looks great on desktop but crowded on mobile,
that is wrong — fix it.

### 3. Document every change
Every file you modify must be logged. For UI/UX changes, add an entry to
DESIGN.md under the File Manifest section:
  path/to/file | what changed | why | date

If DESIGN.md does not yet exist, create it.

### 4. Touch targets and readability
Minimum touch target size: 44×44px for all interactive elements.
Minimum body text: 16px. Minimum label/caption text: 13px.
Numbers and nutritional data must be clearly readable at a glance.

---

# VibeForge — Full UX & UI Branding Agent
# Claude Code reads this file automatically every session.
# DO NOT DELETE OR RENAME THIS FILE.

---

## ORCHESTRATOR — PIPELINE SEQUENCE

When the user provides a branding job (any message containing REPO: and VIBE:),
run the pipeline the user selected. Never skip steps. Never ask for permission
between steps. The two PAUSE points are the only moments the user steers.

### FULL PIPELINE (UX restructure + visual rebrand)
Use when user selects PIPELINE: FULL or says "full redesign"

1.  ux-audit-agent            — maps current app structure, finds UX problems
2.  brand-dna-extractor       — builds BrandDNA from vibe input (runs alongside audit)
3.  review-broker mode=ux     — PAUSE: show UX proposal, wait for approval
4.  layout-redesign-agent     — restructures nav, flows, layouts, adds missing patterns
5.  stitch-wireframe-agent    — generates branded screens from approved BrandDNA
6.  review-broker mode=visual — PAUSE: show visual decisions, wait for approval
7.  styling-implementation-agent — injects design tokens into every UI file
8.  accessibility-qa-agent    — WCAG checks, auto-fixes critical failures
9.  connection-test-agent     — live Playwright test, confirms nothing broke
10. Print final summary

### VISUAL ONLY PIPELINE (rebrand look only, do not touch structure)
Use when user selects PIPELINE: VISUAL ONLY or says "just rebrand" or "visuals only"

1.  brand-dna-extractor
2.  stitch-wireframe-agent
3.  review-broker mode=visual
4.  styling-implementation-agent
5.  accessibility-qa-agent
6.  connection-test-agent
7.  Print final summary

### Pipeline rules
- NEVER skip any step
- NEVER ask for permission between steps
- NEVER start any implementation agent before both relevant review gates pass
- Steps 1 and 2 of the full pipeline can run in parallel
- If any agent fails: log to .vibeforge/history/errors.md, attempt recovery once,
  then surface the specific failure to the user clearly

---

## FRAMEWORK AUTO-DETECTION TABLE

Detect from package.json and file structure. Apply correct strategy automatically.

Framework         | Detection signal              | CSS entry point              | Token targets
------------------|-------------------------------|------------------------------|------------------------------------------
Next.js           | "next" in deps                | src/app/globals.css          | globals.css + tailwind.config + layout.tsx
React + Vite      | "vite" + "react"              | src/index.css                | index.css + tailwind.config
Vue 3 / Nuxt      | "vue" or "nuxt"               | src/assets/main.css          | main.css + UnoCSS/Tailwind preset
Svelte/SvelteKit  | "svelte"                      | src/app.css                  | app.css + theme.js
Angular           | "@angular/core"               | src/styles.scss              | styles.scss + angular.json
Astro             | "astro"                       | src/styles/global.css        | global.css + astro.config
React Native/Expo | "react-native" or "expo"      | n/a (native)                 | constants/Colors.ts + ThemeProvider
Tailwind          | tailwind.config.js present    | wherever :root lives         | ALSO rewrite tailwind.config theme.extend
Shadcn            | components/ui/ exists         | globals.css :root block      | ONLY rewrite :root vars, never touch components/ui/
SCSS              | .scss files exist             | variables/_brand.scss        | SCSS vars + @import chain update
Vanilla JS        | no package.json / no framework| frontend/public/css/style.css| style.css :root block only

---

## BRANDDNA JSON SCHEMA

Every branding session produces this object.
Save to: .vibeforge/cache/brand-dna.json
This is the single source of truth for all visual agents.
Never deviate from this schema — add fields if needed but never rename or remove.

{
  "aesthetic_refs": [],
  "vibe_summary": "",
  "palette": {
    "primary": "",
    "secondary": "",
    "accent": "",
    "surface": "",
    "surface_alt": "",
    "text": "",
    "text_muted": "",
    "border": "",
    "error": "",
    "success": "",
    "warning": ""
  },
  "typography": {
    "display": "",
    "heading": "",
    "body": "",
    "mono": "",
    "scale": {
      "xs":"0.75","sm":"0.875","base":"1","lg":"1.125",
      "xl":"1.25","2xl":"1.5","3xl":"1.875","4xl":"2.25",
      "5xl":"3","6xl":"3.75"
    }
  },
  "spacing": { "unit": "4", "density": "comfortable" },
  "motion": { "speed": "medium", "easing": "cubic-bezier(0.4,0,0.2,1)", "style": "fade" },
  "radius": { "sm":"4px","md":"8px","lg":"16px","full":"9999px" },
  "shadows": { "sm":"","md":"","lg":"" },
  "motifs": [],
  "textures": [],
  "mood_keywords": [],
  "do_not": [],
  "reference_urls": [],
  "wiki_urls": []
}

---

## DESIGN.md SCHEMA

Write to the project root after every pass.
APPEND to Review History and File Manifest — never overwrite existing entries.

# DESIGN.md — [Project Name]

## Brand DNA
[BrandDNA JSON]

## UX Decisions
[Timestamped log of UX proposal approvals and adjustments from Gate 1]

## Layout Architecture
[Current nav structure, page hierarchy, and flow map — updated by layout-redesign-agent]

## Token Map
[CSS custom property name to BrandDNA field mapping]

## File Manifest
[Every file touched: path | what changed | timestamp]

## Review History
[Timestamped log of visual review decisions from Gate 2]

## Anti-Patterns
[Options explicitly rejected — never reintroduce these]

---

## SEVEN LAWS — NON-NEGOTIABLE

1. INTENTIONALITY    Every decision traceable to BrandDNA or a UX audit finding
2. CONSISTENCY       Same pattern everywhere. No one-off exceptions anywhere
3. PERSONALITY       Generic is failure. One memorable element per project minimum
4. ACCESSIBILITY     WCAG AA on all color pairs. Focus states on all interactive elements.
                     44px minimum touch targets
5. NO REGRESSIONS    Layout and styling changes never break business logic
6. STRUCTURE FIRST   UX and layout are finalized before colors and fonts are applied
7. TRUST             Consistent behavior builds user trust.
                     Same action must work identically everywhere in the app

---

## TYPOGRAPHY RULES

- NEVER use Inter, Roboto, Arial, or system fonts as the primary display font
- ALWAYS pair a distinctive display font with a refined body font
- ALWAYS import from Google Fonts or Fontsource — never rely on system fallbacks
- Display font must be justified by the aesthetic reference — cite it
- Body font must be readable at 16px with line-height 1.5 minimum

Aesthetic-appropriate font pairings for this project (Fresh Ink food-zine editorial):
- Display/Headings: Fraunces (soft-serif ink-trap character — the editorial voice)
- Body/UI: Inter (crisp UI clarity at small sizes; allowed as BODY, display stays Fraunces)
- Mono/Data: Space Mono (nutritional values, quantities, dates — print-catalog energy)

---

## COLOR RULES

- Palette must have clear hierarchy: primary > secondary > accent > surface > text
- Dominant base with sharp accent always outperforms evenly distributed palettes
- Derive every hex from Aesthetics Wiki references — never invent generic palettes
- Every foreground/background pair must pass 4.5:1 WCAG AA contrast
- Accent used ONLY for CTAs, key data points, and critical interactions
- Color is NEVER the only way to communicate meaning — always pair with icon or label
- Spot colors stay flat and confident — no gradients, no glassy translucency
- Base palette (Fresh Ink, 2026-07-03): ink #191613, warm paper #FAF6EE, chili red #BE3315,
  basil green #2F6B33, marigold #F5A80C, wine #9E1B32 — marigold is a highlight, never a text color

---

## MOTION RULES

- Motion reinforces mood: slow warm transitions suit the cozy/cabin aesthetic
- One orchestrated page-load reveal is better than scattered micro-interactions
- ALWAYS include prefers-reduced-motion: reduce override
- Ease-out for elements entering the view. Ease-in for elements leaving.
- NEVER animate layout-triggering properties — use transform and opacity only
- Keep motion subtle — users are here to manage food and meals, not watch animations

---

## UX PRINCIPLES FOR THIS APP
(applied automatically by layout-redesign-agent)

Mobile-first density
  Users are on their phone in the kitchen or grocery store.
  Show MORE items per screen, not fewer. Compact cards, not bloated tiles.
  Primary actions reachable with one thumb without scrolling.

Progressive disclosure
  Summary -> breakdown -> detail. Never dump everything on one screen.
  Recipe card shows title + time + rating. Detail only on tap.

Camera-first quick-add
  Barcode and nutrition label scan must be ONE tap from the pantry screen.
  This is the most frequent action — it must be the fastest path.

Calendar clarity
  Meal plan calendar must show all 4 slots (breakfast/lunch/dinner/snack) per day.
  At a glance the user must see: what is planned, what slots are empty.
  Adding a meal to any slot must be possible in 2 taps.

Zero ambiguous states
  Empty pantry → show empty state with "Scan your first item" CTA
  Empty meal plan → show empty state with "Find a recipe" CTA
  Loading → skeleton screens, never blank space
  Errors → message + recovery action, never silent failure

Social features are discoverable but not dominant
  Friends, reviews, and community recipes are important but secondary.
  They surface inside recipe cards and a dedicated social tab — not in primary nav.

Nutritional info is a first-class citizen
  Allergy badges and macros must be visible on the recipe card level.
  Not hidden behind a "Nutrition" expand button.

Consistency builds trust
  If one delete action confirms, every delete action confirms.
  Every quantity always shows its unit. Every date always shows its format.

---

## BRANDING JOB TEMPLATE
(what the user sends to start a job)

VibeForge, run a full branding pass on this project:

REPO: C:\Users\keato\FoodApp

VIBE: Fresh Ink — modern food-zine editorial. Ink-on-paper: warm paper grounds,
near-black ink lines and hard offset "sticker" shadows, chili red CTAs, basil green
actives, flat marigold highlights. Confident, tactile, print-inspired — a food
magazine you'd pin to the fridge. High contrast, zero murk.

AESTHETICS: Editorial print, risograph zine, modern food magazine (Fraunces + Inter)

APP TYPE: Mobile food and meal planning app (vanilla JS + Flask, no framework)

FRAMEWORK: Vanilla JS — single CSS file at frontend/public/css/style.css

PIPELINE: FULL

DO NOT: No gradients or glassy blur effects. No cold blue tones. No muted/murky
pastels as text. No soft blurry shadows (hard offset only). No childish cartoon style.

USER CONTEXT: Users open this app in the kitchen or at the grocery store on their
phone. The most common actions are: scan a barcode to add a pantry item, browse
community recipes, and add meals to the weekly calendar. The biggest pain points
are that everything is too big and bulky on mobile (can't see enough at once),
small UI glitches make it look unfinished, and the meal plan calendar is hard
to use on a small screen. Nutritional values and allergy information need to be
clearly visible at the recipe card level, not hidden. Friends, reviews, and
social discovery are important secondary features.

---

## SESSION HANDOFF — 2026-03-29
## Read this before starting. Everything below is the current state.

### CURRENT STATE
The VibeForge FULL pipeline has been completed. All changes are on the
**main** branch, UNCOMMITTED (working tree dirty). Do NOT run the pipeline
again — the branding is done. Pick up from here.

To start the app: python backend/run.py → http://127.0.0.1:5000
Test login: alexchef / Test1234  (or samcooks / Test1234, jordaneat / Test1234)

---

### WHAT WAS DONE THIS SESSION (2026-03-28 → 2026-03-29)

#### VibeForge FULL pipeline completed (all 9 steps)
Step 1 — UX Audit: wrote .vibeforge/history/ux-audit.md
Step 2 — Brand DNA: wrote .vibeforge/cache/brand-dna.json + initial DESIGN.md
Step 3 — UX Review Gate: user approved all P0/P1/P2 changes
Step 4 — Layout Redesign: all 21 UX fixes applied (see below)
Step 5 — Stitch Wireframes: 5 local HTML wireframes in .vibeforge/designs/
          (Stitch MCP had auth issues — HTML wireframes used instead)
Step 6 — Visual Review Gate: user approved full BrandDNA palette + typography
Step 7 — Styling Implementation: full design system injected into style.css
Step 8 — Accessibility QA: 7 critical auto-fixes, score 92/100
Step 9 — Connection Test: Flask server + Playwright — PASS

#### Post-pipeline fixes (2026-03-29)
User reported two issues:
1. CONTENT BLEED BUG: Recipe names from the list were visible behind the
   sticky "Discover Recipes" section header when scrolling.
   Fix: .page-header top: 0 (was 0.75rem), z-index: 20 (was 5),
        background-color: var(--color-surface) direct value (not alias).
2. PALETTE TOO PLAIN: Post-brand palette was monotone cream/brown with no
   Wes Anderson character.
   Fix: Dark bottom nav (#2C1810 + burnt orange border), per-section card
        tints (recipe=cream, pantry=terracotta-light, social=sage-light),
        colored stat cards (terracotta/sage/dusty-rose tints, each with a
        matching colored top bar), burnt orange top accent bars on recipe
        cards.

---

### CURRENT DESIGN SYSTEM (locked — do not re-run pipeline)

#### Palette
--color-primary:          #BF5700  (Burnt Orange — CTAs, active states)
--color-secondary:        #568203  (Avocado Green — success, vegan badges)
--color-accent:           #D67236  (Dusty Orange — hover, highlights)
--color-surface:          #F1E6D3  (Warm Cream — page background)
--color-surface-alt:      #E8DCC6  (Parchment — input backgrounds, alt cards)
--color-text:             #2C1810  (Deep Brown — primary text)
--color-text-muted:       #5D4F3A  (Warm Brown — secondary text)
--color-border:           #C4B5A0  (Tan — card borders, dividers)
--color-error:            #B7410E  (Rust Red)
--color-success:          #566235  (Sage Green)
--color-warning:          #8f5318  (Amber)
--color-sage-light:       #D0DBC0  (Sage tint — social cards bg)
--color-terracotta-light: #EDD0B4  (Terracotta tint — pantry cards bg)
--color-dusty-rose-light: #E4CEC6  (Dusty rose tint — stat card 3 bg)
--color-nav-dark:         #2C1810  (Deep walnut — bottom nav bg)
--color-nav-inactive:     #C4B5A0  (Warm tan — inactive nav icons)

#### Typography
Display: Playfair Display (h1, h2, h3, page titles, recipe names)
Heading: Lora (h4-h6, section headers, card titles)
Body:    Source Serif 4 (all body text, descriptions, labels)
Mono:    DM Mono (all numeric data — nutrition, quantities, dates)
Google Fonts imported in index.html.

#### Section color identity (Wes Anderson color-blocking)
Recipes page:     cream cards + burnt orange top bar on each card
Pantry page:      terracotta-light cards + orange top border
Social/Discover:  sage-light cards + avocado green top border
Dashboard stats:  card 1=terracotta-peach / card 2=sage / card 3=dusty-rose
Bottom nav:       deep walnut bg + burnt orange top border + cream active text

---

### MODIFIED FILES (uncommitted on main)
- frontend/public/css/style.css  — full design system + all post-pipeline fixes
- frontend/public/index.html     — Google Fonts import updated
- frontend/public/js/main.js     — showToast/showConfirm helpers, scan FAB logic,
                                   maintenance banner dismissed, friendsPage removed
- frontend/public/js/mealplan.js — calendar initialView fix, inline styles to CSS
- frontend/public/js/pantry.js   — empty state CTA, confirm() replaced
- frontend/public/js/recipes.js  — nutrition strip, dietary badge icons, empty state
- backend/app/__init__.py        — cleaned (from 2026-03-27 session)
- backend/app/config.py          — cleaned (from 2026-03-27 session)
- backend/run.py                 — cleaned (from 2026-03-27 session)

### UNTRACKED FILES (new, uncommitted)
- CLAUDE.md, DESIGN.md, backend/seed.py
- .claude/agents/* (6 VibeForge agent files)
- .vibeforge/cache/brand-dna.json
- .vibeforge/designs/* (5 HTML wireframes + screenshots/)
- .vibeforge/history/* (ux-audit, layout-changes, accessibility-report, connection-test)

---

### WHAT THE FULL PIPELINE DID (reference — already complete)

#### Dev environment rebuilt
- backend/app/config.py — rewrote: removed class-level ValueError raise,
  added SQLite fallback if no DATABASE_URL, simplified DevelopmentConfig
- backend/app/__init__.py — rewrote: removed 350-line MySQL migration blob,
  removed dead schema_check import, removed Cloudflare ProxyFix middleware,
  removed rate limiter, simplified to ~110 clean lines
- backend/run.py — rewrote: moved production SECRET_KEY guard to run.py,
  cleaned startup banner, kept Waitress for prod / Flask dev server for dev
- backend/seed.py — created new: populates 3 test users (alexchef/samcooks/
  jordaneat, all password Test1234), 14 recipes with ingredients and tags,
  81 pantry items across categories, 14 meal plans, 15 meal history entries,
  friendships, and 11 recipe reviews. Run with: python seed.py --reset

#### VibeForge installed
- C:\Users\keato\FoodApp\CLAUDE.md — created (this file)
- C:\Users\keato\FoodApp\.claude\agents\ — created with 5 agent files:
    brand-dna-extractor.md
    stitch-wireframe-agent.md
    review-broker.md
    styling-implementation-agent.md
    accessibility-qa-agent.md
    connection-test-agent.md
- C:\Users\keato\FoodApp\.vibeforge\cache\     — created (empty, agents fill this)
- C:\Users\keato\FoodApp\.vibeforge\designs\   — created (empty, agents fill this)
- C:\Users\keato\FoodApp\.vibeforge\history\   — created (empty, agents fill this)
- C:\Users\keato\FoodApp\.vibeforge\project-context.json — written

#### Skills installed globally (C:\Users\keato\.claude\skills\)
- contrast-checker.md    (from accesslint/claude-marketplace)
- link-purpose.md        (from accesslint/claude-marketplace)
- refactor.md            (from accesslint/claude-marketplace)
- use-of-color.md        (from accesslint/claude-marketplace)
- web-design-guidelines.md (from vercel-labs/agent-skills)
- stitch-design.md       (from google-labs-code/stitch-skills)
- design-md.md           (from google-labs-code/stitch-skills)
NOTE: browser-use skill repo not found on GitHub. Playwright 1.58.2 is
installed and the connection-test-agent uses it directly via bash.

#### Stitch MCP
- Already configured in user MCP config before this session
- Status confirmed: stitch MCP ✓ Connected to https://stitch.googleapis.com/mcp
- API key is in the MCP config — do not re-add it

---

### WHAT THE FULL PIPELINE WILL DO (in order, no skipping)

Step 1+2 (parallel):
  ux-audit-agent      — reads all HTML/JS/CSS, maps current structure,
                        finds UX problems specific to mobile food app use
  brand-dna-extractor — fetches Aesthetics Wiki pages for Cottagecore,
                        1970s Retro, Cabin Core, builds BrandDNA JSON,
                        writes initial DESIGN.md

Step 3 — PAUSE (you respond here):
  review-broker mode=ux — presents UX problems found and proposed fixes.
  Reply Y to approve all, or letter: adjustment for specific changes.

Step 4:
  layout-redesign-agent — restructures nav, flows, layouts based on
                          approved UX proposal. Mobile-first. All features
                          must keep working.

Step 5:
  stitch-wireframe-agent — generates 3-5 branded screen designs via
                           Google Stitch MCP using approved BrandDNA.
                           Saves to .vibeforge/designs/

Step 6 — PAUSE (you respond here):
  review-broker mode=visual — shows palette, fonts, motifs, density.
  Reply Y to approve all, or number: adjustment for specific changes.

Step 7:
  styling-implementation-agent — injects full design system into
  frontend/public/css/style.css and all HTML/JS files. Zero logic changes.

Step 8:
  accessibility-qa-agent — WCAG AA contrast checks, focus states,
  touch targets, font size minimums. Auto-fixes critical failures.

Step 9:
  connection-test-agent — starts Flask dev server (python run.py),
  uses Playwright to navigate the app, screenshots key screens,
  confirms nothing broke.

Step 10: Final summary printed.
