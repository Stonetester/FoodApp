# DESIGN.md — Modo Gusto

## Brand DNA

```json
{
  "aesthetic_refs": ["Cottagecore", "1970s Retro", "Cabin Core", "Wes Anderson"],
  "vibe_summary": "A cozy cabin meets retro 50s homestead aesthetic blended with Wes Anderson's whimsical film palettes. The design embraces warm earth tones from the 1970s era—burnt orange, avocado green, rust, and sage—paired with cream surfaces and dusty rose accents. The overall feeling is grown-up, tactile, and hand-crafted without being childish, creating a cartoon-like warmth that feels lived-in and trustworthy. Colors are muted and easy on the eyes, providing strong contrast where needed for usability while maintaining the cozy, nostalgic atmosphere of a well-loved kitchen.",
  "palette": {
    "primary": "#BF5700",
    "secondary": "#568203",
    "accent": "#D67236",
    "surface": "#F1E6D3",
    "surface_alt": "#E8DCC6",
    "text": "#2C1810",
    "text_muted": "#5D4F3A",
    "border": "#C4B5A0",
    "error": "#B7410E",
    "success": "#6B7A42",
    "warning": "#CC7722"
  },
  "typography": {
    "display": "Playfair Display",
    "heading": "Lora",
    "body": "Source Serif 4",
    "mono": "DM Mono",
    "scale": {
      "xs": "0.75",
      "sm": "0.875",
      "base": "1",
      "lg": "1.125",
      "xl": "1.25",
      "2xl": "1.5",
      "3xl": "1.875",
      "4xl": "2.25",
      "5xl": "3",
      "6xl": "3.75"
    }
  },
  "spacing": {
    "unit": "4",
    "density": "comfortable"
  },
  "motion": {
    "speed": "medium",
    "easing": "cubic-bezier(0.4,0,0.2,1)",
    "style": "fade"
  },
  "radius": {
    "sm": "4px",
    "md": "8px",
    "lg": "16px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "0 1px 3px rgba(44, 24, 16, 0.12), 0 1px 2px rgba(44, 24, 16, 0.24)",
    "md": "0 4px 6px rgba(44, 24, 16, 0.15), 0 2px 4px rgba(44, 24, 16, 0.12)",
    "lg": "0 10px 15px rgba(44, 24, 16, 0.1), 0 4px 6px rgba(44, 24, 16, 0.1)"
  },
  "motifs": [
    "hand-drawn recipe card borders",
    "subtle wood grain textures",
    "vintage label and badge shapes",
    "soft rounded corners on containers",
    "grid patterns reminiscent of recipe notebooks",
    "illustration-style icons with organic shapes"
  ],
  "textures": [
    "canvas or linen background texture",
    "subtle paper grain for recipe cards",
    "wood grain for navigation elements",
    "soft fabric texture for buttons"
  ],
  "mood_keywords": [
    "cozy",
    "warm",
    "nostalgic",
    "handcrafted",
    "lived-in",
    "trustworthy",
    "organic",
    "earthy",
    "tactile",
    "wholesome",
    "editorial",
    "vintage"
  ],
  "do_not": [
    "bright yellow or neon colors",
    "pure white backgrounds",
    "cold blue tones",
    "sharp geometric modern tech aesthetic",
    "childish cartoon style",
    "dark mode treatments",
    "bright saturated colors that hurt readability",
    "Inter, Roboto, or Arial fonts as display",
    "overly glossy or plastic-looking elements",
    "harsh drop shadows or stark contrasts"
  ],
  "reference_urls": [],
  "wiki_urls": [
    "https://aesthetics.fandom.com/wiki/Cottagecore",
    "https://aesthetics.fandom.com/wiki/1970s",
    "https://aesthetics.fandom.com/wiki/Cabin_Core"
  ]
}
```

## UX Decisions
*[Will be populated by UX audit agent and review broker]*

## Layout Architecture
*[Will be populated by layout redesign agent]*

## Token Map

CSS custom property name → BrandDNA field mapping:

### Colors
- `--color-primary` → `palette.primary` (#BF5700)
- `--color-secondary` → `palette.secondary` (#568203)
- `--color-accent` → `palette.accent` (#D67236)
- `--color-surface` → `palette.surface` (#F1E6D3)
- `--color-surface-alt` → `palette.surface_alt` (#E8DCC6)
- `--color-text` → `palette.text` (#2C1810)
- `--color-text-muted` → `palette.text_muted` (#5D4F3A)
- `--color-border` → `palette.border` (#C4B5A0)
- `--color-error` → `palette.error` (#B7410E)
- `--color-success` → `palette.success` (#6B7A42)
- `--color-warning` → `palette.warning` (#CC7722)

### Typography
- `--font-display` → `typography.display` (Playfair Display)
- `--font-heading` → `typography.heading` (Lora)
- `--font-body` → `typography.body` (Source Serif 4)
- `--font-mono` → `typography.mono` (DM Mono)
- `--text-xs` through `--text-6xl` → `typography.scale.*`

### Layout
- `--space-1` through `--space-12` → `spacing.unit` (4px base)
- `--radius-sm` → `radius.sm` (4px)
- `--radius-md` → `radius.md` (8px)
- `--radius-lg` → `radius.lg` (16px)
- `--radius-full` → `radius.full` (9999px)
- `--shadow-sm/md/lg` → `shadows.sm/md/lg` (warm brown-based)

### Motion
- `--motion-speed` → `motion.speed` (300ms)
- `--motion-easing` → `motion.easing` (cubic-bezier(0.4,0,0.2,1))
- `--transition-fast/base/slow` → derived from motion values

### Legacy Compatibility
- `--bg`, `--surface`, `--text`, `--primary` etc. → mapped to new color tokens
- Preserves existing variable references while introducing systematic naming

## File Manifest

| Path | What changed | Why | Date |
|------|-------------|-----|------|
| frontend/public/css/style.css | --bg changed from teal #A9D9D0 to warm cream #F1E6D3 | P2-8: Replace cold teal background with brand-aligned warm cream | 2026-03-27 |
| frontend/public/css/style.css | body font-family set to DM Sans; h1-h4 set to Playfair Display | P1-1: Apply correct brand typography | 2026-03-27 |
| frontend/public/css/style.css | nav-help-btn width/height 32px → 44px | P2-1: Touch target compliance | 2026-03-27 |
| frontend/public/css/style.css | Removed duplicate .btn-ghost and .btn-destructive rule sets | P2-7: Remove duplicate CSS | 2026-03-27 |
| frontend/public/css/style.css | btn-icon min-width/min-height 44px, display inline-flex | P1-5: Touch target compliance | 2026-03-27 |
| frontend/public/css/style.css | filter-tag checkbox hidden absolutely; label is full tap target | P2-2: Chip-style tap targets | 2026-03-27 |
| frontend/public/css/style.css | pantry-action-btn min-height 44px, padding 0.6rem 1rem, font-size 0.9rem | P0-5: Touch target compliance | 2026-03-27 |
| frontend/public/css/style.css | meal-section-actions display restored on mobile; meal-empty restored; week add button visible | P0-3/P2-6: Show slot actions on mobile | 2026-03-27 |
| frontend/public/css/style.css | stats-grid 3-column on mobile, stat-card h3 1.5rem, padding 1rem | P2-3: Compact dashboard on mobile | 2026-03-27 |
| frontend/public/css/style.css | Added pantry-scan-fab fixed bottom FAB with pantry-tab-active toggle | P0-1: Pantry-specific scan FAB | 2026-03-27 |
| frontend/public/css/style.css | Added mg-toast, mg-confirm-backdrop/sheet classes | P1-6: Styled toast/confirm dialog | 2026-03-27 |
| frontend/public/css/style.css | Added recipe-nutrition-strip, recipe-nutrition-cell classes | P0-4: Recipe card nutrition strip | 2026-03-27 |
| frontend/public/css/style.css | Added login-card mobile padding 1.5rem 1.25rem at max-width 480px | P2-4: Login card mobile padding | 2026-03-27 |
| frontend/public/css/style.css | Added maintenance-banner__dismiss button styling | P1-4: Banner dismiss button style | 2026-03-27 |
| frontend/public/css/style.css | Added day-detail-slot and related classes | P2-5: Remove inline styles from showDayDetail | 2026-03-27 |
| frontend/public/css/style.css | recipe-tag font-size 0.85rem; recipe-card-tags--top class added | P0-4: Dietary badge improvements | 2026-03-27 |
| frontend/public/index.html | Removed mobileFabRecipe and mobileFabPantry FAB buttons | P0-1/P1-2: Remove old FABs | 2026-03-27 |
| frontend/public/index.html | Added pantry-scan-fab button | P0-1: Pantry scan FAB | 2026-03-27 |
| frontend/public/index.html | Added maintenance-banner__dismiss button to banner | P1-4: Banner dismiss button | 2026-03-27 |
| frontend/public/index.html | Removed first duplicate friendsPage block (style=display:none) | P1-8: Remove dead page | 2026-03-27 |
| frontend/public/index.html | Removed second duplicate styleGuidePage block | P1-3: Remove duplicate styleGuide | 2026-03-27 |
| frontend/public/index.html | Removed second friendsPage block (duplicate IDs eliminated) | P1-8: Remove duplicate IDs | 2026-03-27 |
| frontend/public/js/main.js | maintenanceAnnouncement.enabled false | P1-4: Disable banner by default | 2026-03-27 |
| frontend/public/js/main.js | applyMaintenanceBanners: added dismiss button handler, removed banner-click dismiss | P1-4: Dedicated dismiss button | 2026-03-27 |
| frontend/public/js/main.js | navigateToPage: removed post-init mobile view flash; added pantry-tab-active body class toggle | P0-1/P0-2: FAB toggle + no flash | 2026-03-27 |
| frontend/public/js/main.js | Replaced mobileFabRecipe/mobileFabPantry handlers with pantryScanFab handler | P0-1: New pantry scan FAB | 2026-03-27 |
| frontend/public/js/main.js | Added showToast() and showConfirm() helper functions, exported to window | P1-6: Styled toast/confirm | 2026-03-27 |
| frontend/public/js/mealplan.js | currentCalendarView defaults to mealWeek on mobile | P0-2: Default week view on mobile | 2026-03-27 |
| frontend/public/js/mealplan.js | initializeCalendar: initialView determined by viewport width | P0-2: No flash on mobile | 2026-03-27 |
| frontend/public/js/mealplan.js | All alert() replaced with showToast; confirm() replaced with showConfirm | P1-6: Styled notifications | 2026-03-27 |
| frontend/public/js/mealplan.js | showDayDetail: inline cssText replaced with CSS classes | P2-5: Class-based day detail styles | 2026-03-27 |
| frontend/public/js/pantry.js | loadPantry alert → showToast | P1-6: Styled notifications | 2026-03-27 |
| frontend/public/js/pantry.js | Empty pantry state: icon + message + "Scan Your First Item" CTA | P1-7: Meaningful empty state | 2026-03-27 |
| frontend/public/js/pantry.js | savePantryItem alert → showToast | P1-6: Styled notifications | 2026-03-27 |
| frontend/public/js/pantry.js | deletePantryItem confirm → showConfirm, alert → showToast | P1-6: Styled notifications | 2026-03-27 |
| frontend/public/js/recipes.js | All alert() → showToast; confirm() → showConfirm | P1-6: Styled notifications | 2026-03-27 |
| frontend/public/js/recipes.js | Empty recipes state: icon + message + "Browse Community Recipes" CTA | P1-7: Meaningful empty state | 2026-03-27 |
| frontend/public/js/recipes.js | createRecipeCard: added nutrition strip, dietary tag icons, tags moved to top | P0-4: Recipe card nutrition + badges | 2026-03-27 |
| frontend/public/css/style.css | Complete :root CSS custom property system implemented | VibeForge styling implementation: BrandDNA design tokens | 2026-03-27 |
| frontend/public/index.html | Google Fonts import updated to include Playfair Display, Lora, Source Serif 4, DM Mono | VibeForge typography implementation | 2026-03-27 |
| frontend/public/css/style.css | All typography updated to use var(--font-*) tokens | VibeForge typography implementation | 2026-03-27 |
| frontend/public/css/style.css | Button styles updated with new design system | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Card styles updated with consistent shadow/border treatment | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Form input and label styles updated with new color/font tokens | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Recipe nutrition strip updated with monospace values and structured layout | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Dietary tag badges redesigned with vintage label style | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Meal plan calendar cards updated with new surface/border treatment | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Pantry scan FAB redesigned with new primary color and shadow system | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Modal and dialog styles updated with new design tokens | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Toast notification styles updated with brand color system | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Empty state styling implemented with consistent text treatment | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Stat card styling updated with monospace numbers and muted labels | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Filter chip/tag styles redesigned with pill shape and active states | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Login card and page styles updated with warm surface treatment | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Page titles and section headers updated with display/heading fonts | VibeForge component implementation | 2026-03-27 |
| frontend/public/css/style.css | Reduced motion media query added for accessibility | VibeForge accessibility implementation | 2026-03-27 |

## Review History
*[Will be populated by visual review broker]*

---

## Figma Translation Pass — 2026-04-14

### Changes applied

#### Bottom nav
- Background changed from deep walnut `#2C1810` to cream `var(--color-surface-alt)` matching Figma
- Border-top changed from 3px burnt orange to 2px tan `var(--color-border)` matching Figma
- Active icon color changed from `--color-primary` (burnt orange) to `--color-secondary` (teal #4A9D8F) matching Figma
- Nav label font set to `var(--font-heading)` (Lora) at 10px matching Figma
- Added explicit `.bottom-nav__label` rule

#### Page headers
- Background changed from sage-mint surface to cream `var(--color-surface-alt)` matching Figma
- Border-bottom changed from 1px faint to 2px tan `var(--color-border)` matching Figma
- Title color changed from `--color-text` (deep brown) to `--color-primary` (burnt orange) matching Figma
- Title font-size reduced from 2.5rem to 1.875rem for mobile-first proportion
- Padding unified to horizontal 1rem + top/bottom 0.75rem/0.85rem

#### Cards
- `.recipe-card`, `.pantry-card`, `.social-card`, `.meal-day-card` border changed from 1px to 2px `var(--color-border)` matching Figma
- Background normalised to `var(--color-surface-alt)` (warm cream) matching Figma
- `.meal-day-card` gets `overflow: hidden` and `.is-today` class support

#### Recipe tags
- Changed from avocado-green pill style to sage-mint bg, rounded-md, dark text matching Figma
- Border now uses `var(--color-border)`, background uses `var(--color-surface)`

#### Buttons
- Primary button text now uses `var(--color-surface-alt)` for better warmth matching Figma
- Secondary button now transparent bg with 2px tan border matching Figma

#### Form inputs
- Background changed from sage-mint to cream `var(--color-surface-alt)` matching Figma
- Border changed from 1.5px to 2px matching Figma

#### Filter tags
- Redesigned to match Figma: sage-mint bg, rounded-md (not full pill), 2px tan border, dark text
- Active state: burnt orange bg, cream text

#### Quick-add floating bubbles (NEW FEATURE)
- Two 48×48px circular buttons fixed top-right of screen
- Above all content (z-index 1150), always visible when authenticated
- Bubble 1 (Package icon): Scan Barcode → `openScanner()`, Add Manually → `openPantryModal()`
- Bubble 2 (BookOpen icon): Import from URL → `openImportUrlModal()`, Import from Image → `openImportImageModal()`, Add Manually → `openRecipeModal()`
- Popovers appear to the LEFT of each bubble
- Tap-outside (backdrop) dismisses any open popover
- Full accessibility: aria-haspopup, aria-expanded, role=menu, role=menuitem

## File Manifest (Figma Translation Pass)
| File | What changed | Why | Date |
|------|-------------|-----|------|
| frontend/public/css/style.css | Bottom nav: cream bg, tan border, teal active, Lora labels | Match Figma design | 2026-04-14 |
| frontend/public/css/style.css | Page headers: cream bg, 2px tan border-bottom, burnt-orange title | Match Figma design | 2026-04-14 |
| frontend/public/css/style.css | Cards: 2px tan border, cream bg | Match Figma design | 2026-04-14 |
| frontend/public/css/style.css | Recipe tags: sage-mint bg, rounded-md, dark text | Match Figma design | 2026-04-14 |
| frontend/public/css/style.css | Buttons: primary cream text, secondary transparent/outlined | Match Figma design | 2026-04-14 |
| frontend/public/css/style.css | Form inputs: cream bg, 2px tan border | Match Figma design | 2026-04-14 |
| frontend/public/css/style.css | Filter tags: sage-mint bg, rounded-md, tan border | Match Figma design | 2026-04-14 |
| frontend/public/css/style.css | Mobile FAB redesign: cream bg, tan border, burnt-orange icon, 48px | Figma bubble spec | 2026-04-14 |
| frontend/public/css/style.css | Added .fab-popover, .fab-popover__item, .fab-backdrop, .fab-popover__divider | Quick-add bubble popovers | 2026-04-14 |
| frontend/public/css/style.css | Added .bottom-nav__label explicit rule | Lora 10px label font | 2026-04-14 |
| frontend/public/index.html | Added #fabBackdrop, #mobileFabContainer with 2 FAB buttons + popovers | Quick-add bubbles | 2026-04-14 |
| frontend/public/js/main.js | Added setupQuickAddFabs() and wired to existing JS functions | Quick-add bubble logic | 2026-04-14 |
| frontend/public/js/main.js | Call setupQuickAddFabs() inside showApp() | Initialize on login | 2026-04-14 |

## Bug Fix Pass — 2026-04-16

### Issues fixed

| # | Bug | File(s) | Fix |
|---|-----|---------|-----|
| 1 | `is_admin` column missing on CT 100 — admin panel broken | `backend/app/__init__.py` | Added `is_admin` to `_migrate_columns()` — runs automatically on next deploy, safe to re-run |
| 2 | `requests` not imported in routes.py — `NameError` on URL import network failure | `backend/app/routes.py` | Added `import requests` at top of file |
| 3 | `getFriends()` only queried one direction — friends list incomplete for users who accepted requests | `backend/app/routes.py` | Query both `user_id` and `friend_id` columns, union into a set |
| 4 | `loadDashboard` not exported to `window` — dashboard didn't refresh after saving/deleting a recipe | `frontend/public/js/main.js` | Added `window.loadDashboard = loadDashboard` to exports block |
| 5 | `alert()` / `confirm()` in social.js — native browser dialogs, broken on mobile | `frontend/public/js/social.js` | Replaced with `showToast` / `showConfirm` throughout |
| 6 | 25+ debug `console.log` statements left in `openRecipeModal` — console spam | `frontend/public/js/recipes.js` | Removed all debug logs; cleaned up `importRecipeFromUrl` and `importRecipeFromImage` logs too |

### Bonus fixes
| Fix | File | Detail |
|-----|------|--------|
| deploy.sh values filled in | `backend/deploy.sh` | `APP_USER=root`, `APP_DIR=/opt/app/FoodApp`, `SERVICE_NAME=modogusto` |
| `navigateToPage('friends')` comment cleanup | `frontend/public/js/main.js` | Removed stale comment from friends→social remap block |

### File Manifest (Bug Fix Pass)
| File | What changed | Why | Date |
|------|-------------|-----|------|
| backend/app/__init__.py | Added `is_admin` column to `_migrate_columns()` | Auto-migrate missing column on CT 100 | 2026-04-16 |
| backend/app/routes.py | Added `import requests` | Fix NameError on URL import network failures | 2026-04-16 |
| backend/app/routes.py | `get_friends()` now queries both Friendship directions | Friends list was incomplete | 2026-04-16 |
| frontend/public/js/main.js | Exported `loadDashboard` to `window` | Dashboard refresh broken after recipe save/delete | 2026-04-16 |
| frontend/public/js/social.js | Replaced `alert`/`confirm` with `showToast`/`showConfirm` | Consistent UX, mobile-safe | 2026-04-16 |
| frontend/public/js/recipes.js | Stripped all debug `console.log` from `openRecipeModal`, `importRecipeFromUrl`, `importRecipeFromImage` | Console spam, accidental debug code | 2026-04-16 |
| backend/deploy.sh | Filled in correct CT 100 values | Script was placeholder-only | 2026-04-16 |

### File Manifest (FAB Redesign + Meal Plan Fix — 2026-04-17)
| File | What changed | Why | Date |
|------|-------------|-----|------|
| frontend/public/index.html | Replaced dual floating FAB circles with single bottom-center + FAB + fan menu | Old circles cluttered top of every page, clashed with header | 2026-04-17 |
| frontend/public/index.html | Removed `+ Quick Recipe` and `+ Quick Pantry` from navbar top-links | These buttons duplicated FAB actions and polluted every page header | 2026-04-17 |
| frontend/public/index.html | Updated tutorial text to reference new + FAB instead of old circle bubbles | Kept help text accurate | 2026-04-17 |
| frontend/public/js/main.js | Rewrote `setupQuickAddFabs()` for single-FAB pattern | Matches new HTML | 2026-04-17 |
| frontend/public/js/main.js | Removed `quickAddRecipeBtn` / `quickAddPantryBtn` event listeners | Those elements removed from HTML | 2026-04-17 |
| frontend/public/js/mealplan.js | Added `waitForFullCalendar()` guard in `loadMealPlan()` | FullCalendar CDN loads deferred — was crashing on navigation before it loaded | 2026-04-17 |
| frontend/public/js/mealplan.js | Mobile view defaults to `mealWeek` section view, skipping FullCalendar entirely | FullCalendar not needed on mobile; section view is better UX | 2026-04-17 |
| frontend/public/css/style.css | Replaced `.mobile-fab-container` / `.mobile-fab` / `.fab-popover` CSS with `.quick-add-fab` + `.quick-add-fab-menu` | New single-FAB pattern | 2026-04-17 |
| backend/app/tasks.py | Added `list-users`, `delete-user`, `send-test-email` CLI commands | Admin ops without exposing a UI panel | 2026-04-17 |

## Anti-Patterns
| Pattern | Why rejected |
|---------|-------------|
| Floating circle FAB bubbles at top-right | Overlap header, visually noisy, confusing placement — replaced with bottom-center single + FAB |
| Inline Import/Add buttons at top of every page | Duplicate of FAB actions, bloat every page header, not mobile-friendly |
| Admin panel visible to all users | Admin features should be CLI-only; no in-app panel needed for delete/test ops |