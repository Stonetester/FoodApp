# Modo Gusto — UI Mobile Redesign Plan
## Branch: `claude/ui-mobile-redesign-analysis-0cWgz`

---

## SECTION 1: FULL APP AUDIT — Every Feature, Element & Detail

### 1.1 Brand Identity (PRESERVE EVERYTHING BELOW)

| Token | Value | Usage |
|---|---|---|
| App Name | **Modo Gusto** | Title, manifest, favicon |
| Tagline | *"Manage recipes, pantry, and meal planning with a retro vibe"* | Meta description, login motto |
| Theme Name | **Cosy Cottage / 70s Retro** | Overall aesthetic direction |
| Theme Color | `#c0672d` | Browser tab, PWA chrome |
| Primary | `#c0672d` (burnt orange) | Navbar, buttons, headings |
| Secondary | `#d2a34b` (golden amber) | Active states, badges |
| Accent | `#b6532c` (dark burnt orange) | Hover states |
| Primary Dark | `#8f4319` (deep sienna) | Destructive button bg |
| Background | `#A9D9D0` (warm sage teal) | Page background |
| Surface | `#D7ECE6` (light sage) | Cards, containers |
| Text | `#3b2416` (rich dark brown) | Body text |
| Muted | `#8a6b52` (warm medium brown) | Secondary text, icons |
| Border | `#c9a481` (sandy tan) | All borders, shadows |
| Highlight | `#E8B567` (warm gold) | Active nav, maintenance banner |
| Accent Teal | `#2BAF90` | Secondary buttons, focus rings |
| Accent Mint | `#A1DAB1` | Hover states on teal |
| Accent Gold | `#F1A512` | Nav hover, star ratings |
| Accent Red | `#DD4111` | Notifications |
| Accent Wine | `#8C0027` | Quick-action buttons |
| Success | `#6f7d52` (olive green) | Success states |
| Danger | `#b35a3a` (terracotta) | Delete/error |
| White | `#F4FFFC` (near-white with teal cast) | Text on dark backgrounds |
| Shadow | `rgba(59,36,22,0.18)` | Box shadows (warm-tinted) |

**Typography:**
- Headings: `Playfair Display` (wght 400/600/700) — editorial serif
- Logo: `Sitka Small` → fallback `Playfair Display`
- Body/UI: `DM Sans` (wght 400/500/700) — clean geometric sans
- Fallback body: `"Trebuchet MS", "Georgia", "Times New Roman", serif`

**Spacing Scale:** xs=4px · sm=8px · md=16px · lg=24px · xl=32px · 2xl=48px

**Radius Scale:** sm=8px · md=14px · lg=20px · xl=28px

**Design Signature (70s Neo-Brutalist):**
- Thick borders: 2–3px solid `var(--border)`
- Offset box-shadow: `4px 4px 0 var(--border)` → lifts to `6px 6px 0` on hover
- Cards hover with `translate(-2px, -2px)` (lifts toward top-left)
- ::before color strips on cards (gradient of 70s palette colors)
- 70s Extended Palette in use: burnt-orange `#CC5500`, avocado `#568203`, harvest-gold `#DA9100`, rust `#B7410E`, chocolate `#3B2414`, mustard `#FFDB58`, olive `#808000`, teal `#008080`

---

### 1.2 Pages & Features Inventory

#### Dashboard Page (`#dashboardPage`)
- **Stat Cards** (3): Recipe Count · Pantry Count · Meal Plan Count
  - ::before colored top-strip
  - Tappable → navigates to respective page
- **Recent Recipes** — horizontal scroll or grid of last 6 recipe cards
- **Upcoming Meals Today / Tomorrow** — meal-type badge + recipe title/image
- Quick view buttons on each meal item

#### Recipes Page (`#recipesPage`)
- Page header with title `{username}'s Recipes`
- **Header Actions:** Add Recipe · Import from URL · Import from Image
- Search bar + tag filter chips
- Recipe grid (recipe cards)
- **Recipe Card** anatomy:
  - Hero image (full-width, auto-hidden if none)
  - Title (Playfair Display)
  - Description text (2 lines max)
  - Tags (pill chips in `--muted` color)
  - ::before color strip (70s gradient)
  - Rating display (`.recipe-card-rating`) — BACKEND DONE, frontend pending
  - Source URL link
  - Action buttons (edit / delete)
- **Recipe Detail Modal** (full-screen):
  - Hero image
  - Title + metadata (prep/cook time, servings)
  - Ingredient list
  - Instructions
  - Nutrition info (auto-populated via Open Food Facts)
  - Tags
  - Source link
  - Edit / Delete / Share buttons
  - Reviews section — BACKEND DONE, frontend not built yet
- **Import URL Modal** — paste link → AI scrape → populate form
- **Import Image Modal** — camera or library → OCR recipe
- **Recipe Form Modal** — full CRUD form with ingredient builder

#### Pantry Page (`#pantryPage`)
- Item cards with barcode-scan entry
- Barcode scanner (html5-qrcode) modal
- Add/edit/delete pantry items

#### Meal Plan Page (`#mealplanPage`)
- **FullCalendar** integration (v5.11.5)
- View switcher: Week / Month
- Auto-switches to week view on mobile
- Add meals to days, link to recipes

#### History Page (`#historyPage`)
- Past meal records

#### Social Page (`#socialPage`)
- Friend requests (send / accept / reject)
- Social feed / activity
- Real-time polling (`startSocialPolling` / `stopSocialPolling`)

#### Discover Page (`#userSearchPage`)
- Browse public recipes from all users
- View recipe detail in read-only mode
- Share recipe via URL param (`?recipe=id`)

#### Account Page (`#accountPage`)
- Profile editing

#### Settings Page (`#settingsPage`)
- App preferences

---

### 1.3 Navigation Architecture

**Top Navbar** (72px, fixed, `var(--primary)` background):
- Logo: chef hat icon + "Modo Gusto" + italic motto
- Mobile: hamburger toggle → slide-in right panel (260px wide)
- Desktop: inline nav links with `box-shadow` neo-brutalist style
- Right controls: Help (?) button, nav toggle
- Dropdown menu for secondary pages (Account, Settings, etc.)

**Bottom Navigation** (72px, fixed bottom, `var(--surface)` background):
- 5 tabs: Dashboard · Recipes · Pantry · Meal Plan · [More]
- Active state: `rgba(192,103,45,0.15)` pill highlight + primary text color
- Inactive: `var(--muted)` color
- Top border: 70s gradient `border-image: linear-gradient(...)` — colorful rainbow strip
- Center tab slightly larger icon (28px vs 23px)
- "More" tab: dashed border, opens bottom sheet
- Icons: Lucide icons (SVG, 23px stroke)
- `env(safe-area-inset-bottom)` padding for iOS notch

**More Bottom Sheet** (slide-up from bottom):
- Handle bar (48×5px pill, rgba brown)
- Links to: Account · History · Discover · Style Guide · Settings · Logout
- Sheet backdrop (dark overlay, 40% opacity)
- Close via X button, backdrop tap, Escape key

**Mobile FAB** (`#mobileFabContainer`):
- Two buttons: Add Recipe + Add Pantry item
- Fixed position, iOS-aware bottom offset

---

### 1.4 Modals & Interactions

| Modal | Trigger | Behavior |
|---|---|---|
| Recipe Detail | Tap recipe card | Full-screen slide-up |
| Recipe Form | Add/Edit recipe | Full-screen form |
| Import URL | "Import from URL" | Centered dialog |
| Import Image | "Import from Image" | Camera/library picker |
| Barcode Scanner | FAB / Quick Action | html5-qrcode overlay |
| Quick Add Recipe | FAB / Nav button | Bottom sheet with options |
| Tutorial | First login / Help btn | Slides modal with dots |
| Nutrition Scan | In recipe form | Camera overlay |

**Swipe-to-Dismiss:** All `.modal` elements support swipe-down gesture:
- `touchstart` / `touchmove` / `touchend`
- Translate + fade on drag
- Snaps back if swipe < 120px
- Dismisses if swipe > 120px

**Tutorial:** Multi-slide modal with prev/next buttons + dot indicators. Stores seen state in `localStorage('mg_tutorial_seen')`.

---

### 1.5 Existing Mobile Optimizations (Already Live)

- `is-mobile` class on `<body>` at `<768px` (via `setupResponsiveClass()`)
- `app-authenticated` class controls nav/bottom-nav visibility
- `has-maintenance-banner` class shifts nav down 64px
- All touch targets: `min-height: 44px–48px`
- All form inputs: `font-size: 1rem` (prevents iOS zoom)
- Bottom nav padding uses `env(safe-area-inset-bottom)`
- Page padding accounts for bottom nav: `calc(var(--bottom-nav-height) + 2.5rem + ...)`
- Meal plan auto-switches to week view on mobile
- `@media (max-width: 899px)` — heavy mobile overrides block
- `@media (max-width: 767px)` — additional breakpoints
- `@media (max-width: 640px)` — small phone overrides
- Bottom nav gradient top-border (70s color strip)
- Card `::before` pseudo-element color strips (avocado, harvest-gold, rust, chocolate)
- Cards have `:active` press-scale animation on mobile
- Modals slide up with `sheetUp` keyframe animation

---

## SECTION 2: MEALIE REFERENCE ANALYSIS

URL Referenced: `https://demo.mealie.io/g/home/r/four-alarm-chili`

### Mealie Color Palette (for reference only — NOT to replace ours):
- Primary: `#E58325` (orange — similar to our `#c0672d`)
- Accent: `#007A99` (teal — similar to our `#2BAF90`)
- Secondary: `#973542` (burgundy — similar to our `#8C0027`)
- Dark mode bg: `#1E1E1E`

> **KEY INSIGHT:** Mealie's palette is nearly identical in spirit to Modo Gusto's existing brand. We can safely borrow Mealie's mobile UX patterns while keeping 100% of our own color tokens.

### Mealie Mobile Features Worth Adopting:

1. **Full-bleed hero image** at top of recipe detail (image fills entire screen width, tall, with gradient overlay showing recipe title on top)
2. **Ingredient checklist** — tap ingredient row to cross it off while cooking
3. **Cooking mode / Step view** — one step at a time, large readable text, phone stays awake
4. **Servings scaler** — `+/-` stepper adjusts ingredient quantities proportionally
5. **Horizontal tag pills** — scrollable row of category chips at top
6. **Star rating on cards** — visible avg rating in corner of recipe card
7. **Print / Share sheet** — native share API + print layout
8. **Recipe quick-info row** — prep time · cook time · servings in a horizontal bar below title
9. **Nutrition panel** — expandable collapsible nutrition facts
10. **Add to shopping list** — one-tap adds all ingredients

---

## SECTION 3: REDESIGN PLAN — Keep Brand, Add Mobile Power

### Guiding Principles:
1. **NEVER change** the color tokens in `:root` — they are the brand
2. **NEVER change** the font stack — Playfair Display + DM Sans stays
3. **NEVER change** the neo-brutalist signature (thick borders, offset shadows, color strips)
4. Every new feature gets styled with existing CSS variables
5. Mobile-first within the existing 70s Cosy Cottage aesthetic

---

### PHASE 1: Recipe Detail — Hero Image & Quick-Info Bar
**Files:** `frontend/public/index.html`, `frontend/public/css/style.css`, `frontend/public/js/recipes.js`

**What to build:**
```
┌──────────────────────────────────┐
│  [←] Back          [Share] [♡]  │  ← sticky action bar
├──────────────────────────────────┤
│                                  │
│     HERO IMAGE (full-width,      │  ← 280px tall, object-fit: cover
│     200px+ tall)                 │     gradient overlay bottom
│     ░░░░ Recipe Title ░░░░       │     title in Playfair Display
│     ★★★★☆  4.2  (18 reviews)   │     rating overlay on image
│                                  │
├──────────────────────────────────┤
│  🕐 15 min  🍳 30 min  👥 4 srv │  ← quick-info bar
├──────────────────────────────────┤
│  Tags: [Spicy] [Chili] [Beef]   │  ← horizontal scroll chips
├──────────────────────────────────┤
│  INGREDIENTS             [Scale] │
│  ○ 1 lb ground beef             │  ← checkable rows
│  ○ 2 cans kidney beans          │
│  ○ ...                          │
├──────────────────────────────────┤
│  INSTRUCTIONS                    │
│  Step 1  ──────────────────────  │  ← numbered steps
│  ...                             │
├──────────────────────────────────┤
│  NUTRITION (tap to expand) ▼    │
│  Calories: 420 | Fat: 18g | ... │
└──────────────────────────────────┘
```

**CSS additions (using brand variables):**
```css
.recipe-detail-hero {
  width: 100%;
  height: 280px;
  object-fit: cover;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-bottom: 3px solid var(--border);
}
.recipe-detail-hero-wrapper {
  position: relative;
  background: var(--surface);
}
.recipe-detail-hero-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 2rem 1.25rem 1rem;
  background: linear-gradient(transparent, rgba(59,36,22,0.75));
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.recipe-detail-hero-title {
  color: var(--white);
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
.recipe-quick-info {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--surface);
  border-bottom: 2px solid var(--border);
  overflow-x: auto;
}
.recipe-quick-info-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text);
  white-space: nowrap;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.6rem;
  box-shadow: 2px 2px 0 var(--border);
}
```

---

### PHASE 2: Ingredient Checklist Mode
**Files:** `frontend/public/css/style.css`, `frontend/public/js/recipes.js`

**What to build:**
- Ingredient list items become tappable rows
- Checked items show strikethrough + opacity reduction
- State stored in `sessionStorage` (resets when you close modal)
- "Start Cooking" button at bottom of ingredients section

**CSS:**
```css
.ingredient-check-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid rgba(201,164,129,0.3);
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;
}
.ingredient-check-row.is-checked {
  opacity: 0.45;
  text-decoration: line-through;
}
.ingredient-check-box {
  width: 22px;
  height: 22px;
  border: 2.5px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.ingredient-check-row.is-checked .ingredient-check-box {
  background: var(--accent-teal);
  border-color: var(--accent-teal);
}
```

---

### PHASE 3: Servings Scaler
**Files:** `frontend/public/index.html`, `frontend/public/css/style.css`, `frontend/public/js/recipes.js`

**What to build:**
- In recipe detail, add `[−] 4 servings [+]` inline stepper next to "INGREDIENTS"
- On value change, re-render all ingredient quantities proportionally
- Display scaled values (e.g. `2 cups` → `3 cups` at 1.5x)

**CSS:**
```css
.servings-scaler {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--highlight);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.3rem 0.6rem;
  box-shadow: 3px 3px 0 var(--border);
}
.servings-scaler__btn {
  width: 32px;
  height: 32px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--border);
}
.servings-scaler__value {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-size: 1.1rem;
  min-width: 60px;
  text-align: center;
  color: var(--text);
}
```

---

### PHASE 4: Cooking Mode (Step View)
**Files:** `frontend/public/index.html`, `frontend/public/css/style.css`, `frontend/public/js/recipes.js`

**What to build:**
- "Start Cooking" button → enters full-screen step-by-step mode
- Each step shown one at a time with large readable text
- Prev / Next buttons, step counter "Step 2 of 7"
- Wake lock API (`navigator.wakeLock.request('screen')`) to keep phone awake
- Exit cooking mode button

**CSS:**
```css
.cooking-mode {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  padding: 2rem 1.5rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
}
.cooking-mode__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.cooking-mode__progress {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
  color: var(--muted);
  font-weight: 500;
}
.cooking-mode__step-text {
  flex: 1;
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  line-height: 1.7;
  color: var(--text);
  overflow-y: auto;
}
.cooking-mode__nav {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}
.cooking-mode__nav .btn {
  flex: 1;
  font-size: 1.1rem;
  min-height: 56px;
  box-shadow: 5px 5px 0 var(--border);
}
```

---

### PHASE 5: Recipe Rating UI (Frontend Complete)
**Files:** `frontend/public/index.html`, `frontend/public/css/style.css`, `frontend/public/js/recipes.js`, `frontend/public/js/api.js`

> Backend already done. This completes IMPLEMENTATION_STATUS.md Task 3.

**Star Rating Component:**
```css
.star-picker {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}
.star-picker .star {
  font-size: 1.8rem;
  cursor: pointer;
  color: var(--border);
  transition: color 0.15s, transform 0.1s;
  line-height: 1;
}
.star-picker .star.active,
.star-picker .star:hover ~ .star { color: var(--border); }
.star-picker:hover .star { color: var(--accent-gold); }
.star-picker .star.active { color: var(--accent-gold); }
.star-picker .star:active { transform: scale(0.88); }

.review-card {
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  box-shadow: 3px 3px 0 var(--border);
  margin-bottom: 0.75rem;
}
.review-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.82rem;
  color: var(--muted);
}
.review-stars {
  color: var(--accent-gold);
  font-size: 0.95rem;
}
.review-text {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--text);
}
```

**Rating on Recipe Cards (top-right badge):**
```css
.recipe-card-rating {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(59,36,22,0.72);
  color: var(--accent-gold);
  border-radius: var(--radius-sm);
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  backdrop-filter: blur(4px);
}
```

---

### PHASE 6: Native Share + Print
**Files:** `frontend/public/js/recipes.js`, `frontend/public/css/style.css`

**What to build:**
- Share button in recipe detail header uses `navigator.share()` API
- Falls back to clipboard copy if Web Share not available
- Print button applies print-specific CSS hiding nav/bottom-bar

**CSS:**
```css
@media print {
  .navbar, .bottom-nav, .mobile-fab-container,
  .sheet-backdrop, .bottom-sheet { display: none !important; }
  .page { padding: 0 !important; display: block !important; }
  .recipe-detail-actions { display: none !important; }
  .recipe-card { break-inside: avoid; }
}
```

---

### PHASE 7: Add to Shopping List
**Files:** `frontend/public/index.html`, `frontend/public/css/style.css`, `frontend/public/js/recipes.js`

**What to build:**
- In recipe detail, "Add All to Pantry List" button
- Generates a plain-text or share-able list of ingredients
- Uses `navigator.share()` → shares ingredient list as text
- Or copies to clipboard

---

### PHASE 8: Horizontal Category Chips on Recipe List
**Files:** `frontend/public/css/style.css`, `frontend/public/js/recipes.js`

**What to build:**
- Replace/enhance the existing tag filter with a horizontal scrollable chip row
- Pinned below page header, above recipe grid
- Active chip: `var(--primary)` background + white text + shadow
- Inactive chip: `var(--surface)` + border

**CSS:**
```css
.tag-filter-strip {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0 0.75rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.tag-filter-strip::-webkit-scrollbar { display: none; }
.tag-chip {
  flex-shrink: 0;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--border);
  transition: background 0.15s, color 0.15s, transform 0.1s;
  white-space: nowrap;
  min-height: 36px;
  display: flex;
  align-items: center;
}
.tag-chip.is-active {
  background: var(--primary);
  color: var(--white);
  border-color: var(--primary-dark);
  box-shadow: 3px 3px 0 var(--primary-dark);
}
.tag-chip:active {
  transform: scale(0.95);
}
```

---

### PHASE 9: Collapsible Nutrition Panel
**Files:** `frontend/public/css/style.css`, `frontend/public/js/recipes.js`

**What to build:**
- Nutrition section in recipe detail is collapsed by default
- Tap to expand — smooth height animation
- Shows macros in a 2-column grid with branded styling

**CSS:**
```css
.nutrition-panel {
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: 3px 3px 0 var(--border);
  margin-top: 1rem;
}
.nutrition-panel__toggle {
  width: 100%;
  padding: 0.85rem 1rem;
  background: var(--highlight);
  border: none;
  text-align: left;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  min-height: 48px;
}
.nutrition-panel__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--surface);
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
}
.nutrition-panel.is-open .nutrition-panel__body {
  max-height: 400px;
  padding: 1rem;
}
.nutrition-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 2px 2px 0 var(--border);
}
.nutrition-item__label {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.nutrition-item__value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  font-family: 'Playfair Display', serif;
}
```

---

### PHASE 10: Pull-to-Refresh on Recipe List
**Files:** `frontend/public/js/recipes.js`, `frontend/public/css/style.css`

**What to build:**
- Native-feeling pull-to-refresh on the recipes grid
- Shows a "Refreshing..." indicator in `--primary` color
- Calls `loadRecipes()` on release

**JS Pattern:**
```js
// touchstart → record startY
// touchmove → if scrollTop === 0 and pulling down, show indicator and translate list
// touchend → if pulled > 60px, call loadRecipes(), snap back
```

---

## SECTION 4: IMPLEMENTATION ORDER

| Priority | Phase | Effort | Impact |
|---|---|---|---|
| 1 | Phase 5: Recipe Ratings UI | Medium | High — completes existing backend |
| 2 | Phase 1: Hero Image + Quick Info | Medium | High — biggest visual upgrade |
| 3 | Phase 2: Ingredient Checklist | Low | High — core cooking utility |
| 4 | Phase 3: Servings Scaler | Low | High — very useful mobile feature |
| 5 | Phase 8: Tag Chips Horizontal | Low | Medium — improves browsing |
| 6 | Phase 9: Nutrition Panel Collapse | Low | Medium — cleaner recipe detail |
| 7 | Phase 6: Native Share + Print | Low | Medium — mobile must-have |
| 8 | Phase 4: Cooking Mode | High | High — flagship mobile feature |
| 9 | Phase 7: Add to Shopping List | Low | Medium |
| 10 | Phase 10: Pull-to-Refresh | Low | Low-Medium |

---

## SECTION 5: WHAT TO KEEP (DO NOT CHANGE)

- All CSS custom properties in `:root` — **the entire color palette stays**
- `Playfair Display` + `DM Sans` — **font stack stays**
- Neo-brutalist design: thick borders, offset shadows, translate-on-hover — **stays**
- 70s color strips on cards via `::before` — **stays**
- Bottom navigation (5 tabs + More sheet) — **stays and improves**
- Mobile FAB buttons — **stays**
- Swipe-to-dismiss modals — **stays, extend to new modals**
- `has-maintenance-banner` / `is-mobile` / `app-authenticated` class pattern — **stays**
- All existing breakpoints — **stays, new CSS adds within existing `@media` blocks**
- App name "Modo Gusto" — **stays**
- Logo (chef hat SVG + logo-chef-hat.png) — **stays**
- All existing page IDs and JS function names — **stays** (no breaking changes)

---

## SECTION 6: CSS ARCHITECTURE NOTES

All new CSS **must follow these rules**:
1. New variables go in `:root` only if truly reusable — otherwise use existing tokens
2. New `@media` overrides go inside existing `@media (max-width: 899px)` block
3. Class names follow existing BEM-lite pattern: `.block`, `.block__element`, `.block--modifier`
4. All interactive elements: `min-height: 44px`
5. All new modals support swipe-to-dismiss (add to loop in `setupEventListeners()`)
6. All new sections get 70s card treatment: `border: 2px solid var(--border)` + `box-shadow: 3px 3px 0 var(--border)`
7. No new font imports needed — reuse `Playfair Display` and `DM Sans`
8. No new color values — always reference existing `var(--*)` tokens

---

*Generated by Claude on the `claude/ui-mobile-redesign-analysis-0cWgz` branch.*
*Inspiration reference: `https://demo.mealie.io` (Mealie recipe app)*
