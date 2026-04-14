# UX Audit — Modo Gusto
**Date:** 2026-03-27
**Auditor:** ux-audit-agent (VibeForge pipeline step 1)
**Scope:** Full codebase review — index.html, style.css, and all JS modules

---

## 1. App Structure Map

### Navigation Architecture

The app is a single-page application (SPA) with all pages living as `div.page` elements inside `#app`. Pages are shown/hidden by toggling the `.active` class, controlled by `navigateToPage()` in `main.js`.

**Page Inventory:**
| Page ID | Route Key | Loaded By |
|---|---|---|
| `loginPage` | (no key) | `showLogin()` |
| `dashboardPage` | `dashboard` | `loadDashboard()` |
| `recipesPage` | `recipes` | `loadRecipes()` |
| `pantryPage` | `pantry` | `loadPantry()` |
| `mealplanPage` | `mealplan` | `loadMealPlan()` |
| `historyPage` | `history` | `loadHistory()` |
| `userSearchPage` | `userSearch` | `loadDiscoverRecipes()` |
| `socialPage` | `social` | `loadSocialData()` |
| `friendsPage` | `friends` | (redirects to social, activates friends tab) |
| `accountPage` | `account` | `loadAccountPage()` |
| `settingsPage` | `settings` | `loadSettingsPage()` |
| `styleGuidePage` | `styleGuide` | (static) |

**Note:** `styleGuidePage` is duplicated in the HTML — the `<div id="styleGuidePage">` element appears twice (lines 1118 and 1214). Only the first one will ever be activated by `getElementById`.

### Navigation Systems (Three Parallel Systems)

1. **Top navbar** (desktop, `≥900px`): `.navbar` with `.nav-menu` slide-out drawer. Hidden on mobile via `display: none !important` at `max-width: 899px`.

2. **Bottom tab bar** (mobile): `.bottom-nav` with 6 tabs — Recipes, Pantry, Home (Dashboard), Meal Plan, Social, More. The "More" tab opens a `.bottom-sheet` with secondary links (Account, History, Discover, Settings, Logout). Tab bar hidden at `≥900px`.

3. **Mobile FAB** (2 floating action buttons in top-right corner, visible at `<900px` when authenticated): Quick Add Recipe and Quick Add Pantry (opens barcode scanner).

### Modal System
All forms open as `.modal` elements (full-screen overlay). On mobile (`<900px`) modals animate up from bottom as sheets (`border-radius: 18px 18px 0 0`). Swipe-to-dismiss is implemented.

### Major User Flows

**Add pantry item via barcode:**
Pantry page → "Scan Barcode" button (or FAB in top-right) → `scannerModal` opens → scan → product auto-fills `pantryModal` → Save

**Add recipe manually:**
Recipes page → "+ Add Recipe" (or FAB in top-right) → `recipeModal` opens → fill form → Save

**Meal plan — add meal:**
Bottom nav → Meal Plan → calendar auto-switches to Week view on mobile → tap a day → `dayDetailModal` opens → "+ Add Recipe" → `mealPlanModal` opens with pre-filled date/type → Save

**Discover community recipes:**
Bottom nav → More sheet → "Discover" → `userSearchPage` — search by name/tag, view recipes, copy to own collection

---

## 2. Critical UX Problems (P0 — Must Fix)

### P0-1: Scan barcode is NOT one tap from the pantry screen
**Problem:** The FAB buttons appear in the top-right corner of the screen at all times when authenticated. While the pantry FAB opens the scanner, its position is in the **top-right corner** — the hardest area to reach with one thumb on a phone. The dedicated "Scan Barcode" button on the pantry page header is also in the page-header area (top of page), which is equally far from thumb reach. There is no floating scan button anchored near the bottom of the pantry screen.

**Why bad on mobile:** Users scanning barcodes in the kitchen or grocery store hold their phone with one hand. Top-right is the opposite corner from the natural thumb rest position on any phone 5"+ in size.

**Fix:** Place a prominent, bottom-anchored "Scan" CTA on the pantry page — either a fixed scan button above the bottom nav bar when the pantry tab is active, or a large scan zone card at the top of the pantry list that is visible without scrolling on load.

---

### P0-2: Meal plan calendar — month view is unreadable and default on first load
**Problem:** The `initializeCalendar()` function in `mealplan.js` initializes FullCalendar with `initialView: 'dayGridMonth'`. On mobile, the month grid makes each day cell approximately 45px tall × 50px wide. Recipe titles are truncated to `max-width: 120px` and display as tiny `.calendar-event-title` (`font-size: 0.85rem`). There is no slot visibility — you cannot tell at a glance whether breakfast/lunch/dinner/snack are planned or empty for a day.

**Why bad on mobile:** The month grid on a 390px-wide screen gives 7 columns, each ~55px wide. With multiple meals per day, events stack and overflow. The user cannot see what is planned without tapping each day. Empty vs. filled days are indistinct.

**Fix:** On mobile, default to "Week" view (`mealWeek`). `navigateToPage()` in `main.js` already does this at line 721–728 (`if (pageName === 'mealplan' && window.innerWidth < 768)`), but the calendar initializes in month view first, causing a flash. Initialize directly in the correct view: detect mobile in `initializeCalendar()` and set `initialView` to a custom day-grid or the week sections view.

---

### P0-3: Meal plan "add meal" requires 3+ taps, not 2
**Problem:** To add a meal to a specific slot:
1. Navigate to Meal Plan (tap 1)
2. Tap a day cell on the calendar to open `dayDetailModal` (tap 2)
3. Tap "+ Add Recipe" in the modal (tap 3)
4. Select recipe from dropdown in `mealPlanModal` (tap 4+ depending on list length)
5. Tap "Save Meal" (tap 5)

The requirement is 2 taps. The current flow has 3 taps minimum just to get to the recipe selector.

**Why bad on mobile:** Every extra tap adds friction. Users in the kitchen need to quickly slot a recipe. The flow buries the primary action behind two modals.

**Fix:** On the Week view, display a direct "+ Add" button per meal slot (breakfast/lunch/dinner/snack) that immediately opens `mealPlanModal` with date and meal type pre-filled. This achieves: tap slot button → select recipe → save (effectively 2 meaningful taps after navigating to the page).

---

### P0-4: Recipe cards show NO nutritional info or allergy badges at card level
**Problem:** The `createRecipeCard()` function in `recipes.js` builds cards with title, description, source link, meta (servings, nutrition summary as plain text), rating, dietary tags, and action buttons. Dietary tags (vegan, gluten-free, etc.) are shown as colored chips but are small (`font-size: 0.8rem`, `.recipe-tag` background). The nutrition summary is rendered as small `.recipe-card-info` lines at `font-size: 0.82rem, opacity: 0.85` — almost invisible on a warm-toned background.

The allergy information is essentially invisible at card level — it requires reading a small text line rather than prominent badge-level display. Calories, protein, carbs are shown as `"Per serving: 350 calories • 22g protein"` in a tiny gray line, not as scannable data blocks.

**Why bad on mobile:** Users with dietary restrictions (nut allergy, celiac) need to see allergy badges immediately without tapping into a recipe. Nutrition data in a tiny muted line cannot be read at a glance.

**Fix:** Redesign the recipe card to show:
- Allergy/dietary tags as prominent, colored pill badges with icons (not just text) near the top of the card
- A compact nutrition strip (cal / protein / carbs / fat) displayed as 4 mini stat blocks, not a prose sentence

---

### P0-5: Pantry action buttons are below minimum touch target size
**Problem:** `.pantry-action-btn` is defined in `style.css` at line 1440: `padding: 0.25rem 0.6rem; font-size: 0.8rem`. This produces buttons approximately 28-30px tall — well below the 44px minimum. These are the Edit and Delete buttons on every pantry card.

**Why bad on mobile:** Users constantly tap the wrong button or miss entirely. With ~80 pantry items in the seeded data, this is a frequent interaction point.

**Fix:** Set `.pantry-action-btn` to `min-height: 44px; padding: 0.6rem 1rem` and give them more visual weight. Alternatively, replace text buttons with icon buttons that have 44×44px tap targets.

---

## 3. High Priority Issues (P1 — Should Fix)

### P1-1: Font stack falls back to "Trebuchet MS" on body — not a designed choice
**Problem:** `body { font-family: "Trebuchet MS", "Georgia", "Times New Roman", serif; }` (style.css line 59). Playfair Display and DM Sans are loaded from Google Fonts (line 17 of index.html) but never applied to body text — only `logo-title` uses `Playfair Display`. DM Sans is used for `.nav-motto` only. The entire app body text renders in Trebuchet MS (a Windows system font) or Georgia/TNR as fallbacks.

**Fix:** Apply `font-family: 'DM Sans', "Trebuchet MS", sans-serif` to `body` and `font-family: 'Playfair Display', Georgia, serif` to all `h1, h2, h3` headings.

---

### P1-2: Dual navigation systems create confusion — FABs conflict with bottom nav
**Problem:** Mobile users have THREE ways to quickly add content:
- The bottom nav's "More" sheet (secondary)
- The page header's action buttons (e.g., "+ Add Item" in pantry header)
- Two floating FAB buttons in the top-right corner

The FABs (`mobileFabRecipe`, `mobileFabPantry`) overlap content and are identical to the header buttons in function. The FABs are `position: fixed; top: 12px; right: 12px` — they sit in the top-right over page content and can visually clash with the page header.

**Fix:** Remove the redundant FAB buttons. The bottom nav scan flow (via "More" → scan action, or a dedicated scan tab) should be the primary quick-add path. The page-level header buttons are sufficient for add actions.

---

### P1-3: Duplicate HTML — `styleGuidePage` appears twice in index.html
**Problem:** The `<div id="styleGuidePage" class="page">` block is duplicated at lines 1118 and 1214 in index.html. Having duplicate IDs is invalid HTML. `getElementById('styleGuidePage')` will always return the first occurrence; the second is dead weight. Both contain identical content, suggesting a copy-paste error.

**Fix:** Remove the second instance of `styleGuidePage`.

---

### P1-4: Maintenance banner is hardcoded and always visible
**Problem:** `maintenanceAnnouncement.enabled = true` in `main.js` (line 5). The current message is `'IMPORTANT: Check spam folder in email for notifications!'`. The banner is 64px tall (`--maintenance-banner-height: 64px`) and takes up 16% of a 400px screen. The CSS at line 2318-2320 pushes `body.has-maintenance-banner .page` padding to include the banner height, which works, but the banner is always present even when there's no maintenance.

**Fix:** Default `enabled` to `false` and only show when there is an active message. Add a dismiss mechanism (`×` button) so users can close it.

---

### P1-5: Recipe card action buttons are icon-only with no visible label on mobile
**Problem:** `.recipe-card-actions` contains 4 `.btn-icon` buttons (view, edit, delete, share) each 18×18px SVG icons with no text label. The `.btn-icon` class sets `padding: 0.5rem` which gives approximately 34px total — still under 44px minimum.

**Fix:** Increase `.btn-icon` to `min-width: 44px; min-height: 44px`. On mobile, show 2 primary actions (View, Add to Meal Plan) as labeled buttons and put Edit/Delete/Share behind a "..." menu.

---

### P1-6: `alert()` and `confirm()` used extensively throughout the codebase
**Problem:** Multiple JS files use `alert('Failed to load recipes')`, `alert('Failed to load pantry items')`, `confirm('Are you sure you want to delete this meal?')`, etc. (found in mealplan.js, pantry.js, recipes.js). Browser `alert()` and `confirm()` dialogs block the main thread, have no styling, and are poor UX on mobile.

**Fix:** Create a simple toast/snackbar system for errors and a styled confirmation sheet/modal for destructive actions.

---

### P1-7: Empty state messages are plain text with no CTA
**Problem:** Empty states throughout the app use `<p>No recipes found. Add your first recipe!</p>` or `<p class="empty-state">No meals planned for today yet.</p>` (pantry.js line 69, recipes.js line 149). There are no icons, no visual treatment, and no action button embedded in the empty state.

**Fix:** Every empty state should have:
- A relevant icon or illustration
- A brief, friendly message
- An embedded CTA button (e.g., "Scan your first item" on empty pantry, "Browse recipes" on empty meal plan)

---

### P1-8: The "Friends" page is functionally dead — it redirects to Social
**Problem:** `navigateToPage('friends')` in main.js (lines 679-685) immediately redirects to `social` page and activates the friends tab via `window.activateSocialFriendsTab()`. The `friendsPage` HTML element (line 921) is hidden with `style="display:none"` as an inline style. There are also duplicate element IDs: `friendsListPanel`, `friendDetailTitle`, `friendDetailSubtitle`, `friendRecipes`, `friendMealPlan`, and `refreshFriendsBtn` all appear in BOTH `socialPage` (Social → Friends tab) and `friendsPage`. This will cause JS bugs as `getElementById` returns the first match.

**Fix:** Remove the `friendsPage` HTML entirely. The social page with tabs is the correct approach. Audit all duplicate IDs and ensure only one exists.

---

## 4. Lower Priority Issues (P2 — Nice to Fix)

### P2-1: The `nav-help-btn` (?) button is only 32×32px
**Problem:** `.nav-help-btn` in style.css line 214: `width: 32px; height: 32px`. This is below the 44px minimum touch target requirement. It appears in the top navbar (desktop only), but it still fails accessibility standards.

**Fix:** Increase to `width: 44px; height: 44px`.

---

### P2-2: Filter tag checkboxes are too small on mobile
**Problem:** `.filter-tag` chips have a nested `input[type="checkbox"]` that renders at browser default size (~13×13px). The `.filter-tag` label itself has `padding: 0.5rem 1rem` which may give ~40px height but the clickable checkbox area inside is tiny.

**Fix:** Hide the native checkbox visually and use CSS `:checked` + styled pseudo-elements for the active state. The entire chip area should be the tap target.

---

### P2-3: Dashboard stat cards have `font-size: 3rem` numbers — too large on mobile
**Problem:** `.stat-card h3 { font-size: 3rem }` (style.css line 874). On mobile this is reduced to `font-size: 2rem` (style.css line 3889) which is better, but the stat cards still use `padding: 2rem` which wastes vertical space on a small screen showing only 3 stat tiles before the user reaches "Upcoming Meals".

**Fix:** Reduce stat card padding to `1rem` on mobile, and display all 3 stat cards in a single row (3-column grid) on mobile for compact density.

---

### P2-4: The login card uses `padding: 3rem` — too wide/tall on small screens
**Problem:** `.login-card { padding: 3rem }` (style.css line 716). On a 375px screen with `padding: 2rem` on the container, the card content area is 375 - 64px - 4px border = ~307px with 6rem of padding leaving only 211px of usable width for inputs.

**Fix:** On mobile, reduce login card padding to `1.5rem 1.25rem`.

---

### P2-5: Nutrition label scanner uses inline `style.cssText` heavily
**Problem:** `showDayDetail()` in `mealplan.js` (lines 392-435) uses extensive `style.cssText` and inline `style=` strings to build UI. This makes the code hard to maintain and overrides the design system. Example: `slotDiv.style.cssText = 'margin-bottom: 1.5rem; padding: 1rem; background: var(--light-cream); border-radius: 8px;'`

**Fix:** Move all inline styles in `showDayDetail()` to CSS classes.

---

### P2-6: Week view on mobile hides action buttons via CSS
**Problem:** `style.css` at line 2386: `.meal-section-actions { display: none; }` within `@media (max-width: 767px)`. The week view on mobile hides edit/delete buttons for meal items, also hiding add buttons: `.week-column > .btn.btn-secondary { display: none; }`. Users cannot edit or add meals from the week view on mobile — they can only view.

**Fix:** Replace the hidden action buttons with swipe-to-reveal gestures or a context menu (long-press) on mobile, rather than hiding them entirely.

---

### P2-7: Both `.btn-ghost` and `.btn-destructive` are defined twice in style.css
**Problem:** `.btn-ghost` is defined at lines 668-673 AND 684-689. `.btn-destructive` is defined at lines 679-682 AND 695-698 in style.css. This is a copy-paste duplication likely from CSS merging. The second definitions override the first.

**Fix:** Remove the duplicate rule sets.

---

### P2-8: The `body` background color `--bg: #A9D9D0` is a teal/mint color
**Problem:** The design intent is "warm earth tones — burnt orange, avocado green, rust, warm cream, deep brown." However, `--bg: #A9D9D0` is a light teal/aqua — a cool blue-green that conflicts with the warm earth-tone direction specified in the brand brief. This will be addressed in the brand-dna pass, but noted here as it contradicts the stated color rules.

---

## 5. What's Working Well

**Bottom navigation architecture is solid.** The 5-tab + "More" sheet pattern is the right approach for a mobile app with many sections. The bottom sheet implementation (`.bottom-sheet`) with handle, backdrop, keyboard dismiss, and swipe-to-close is well implemented.

**Swipe-to-dismiss on modals works correctly.** The `touchstart/touchmove/touchend` logic in `main.js` (lines 391-438) properly handles dismiss threshold (120px) and snap-back, with passive event listeners for performance.

**Touch targets on buttons are mostly correct.** `.btn { min-height: 44px }`, `.nav-link { min-height: 44px }`, `.bottom-nav__link { min-height: 48px }`, `.sheet-link { min-height: 48px }` — the main interactive elements meet the 44px minimum. The exceptions (`.btn-icon`, `.pantry-action-btn`, `.nav-help-btn`) are noted above.

**Nutrition data architecture is solid.** The `createNutritionMiniTable()` pantry card component and `buildRecipeServingAndNutritionMeta()` recipe function correctly surface nutritional data. The display needs better visual prominence but the data pipeline is working.

**Modal-as-bottom-sheet pattern is correct for mobile.** The CSS at `@media (max-width: 899px)` correctly converts modals to bottom sheets with `border-radius: 18px 18px 0 0` and `align-items: flex-end`. Good mobile UX pattern.

**Meal plan calendar has a custom Week section view.** `renderMealSections()` in `mealplan.js` builds a custom week/day view using structured `meal-day-card` elements with `<details>` accordion pattern — this is the right approach for mobile (not FullCalendar's native grid which is desktop-oriented).

**Auto-switch to week view on mobile is implemented** (`main.js` lines 721-728). The intent is good but timing needs improvement (see P0-2).

**Focus states are globally implemented**: `*:focus-visible { outline: 3px solid var(--focus-ring); }` (style.css line 3046).

**Form inputs have `font-size: 16px`** globally (style.css line 3043) which prevents iOS auto-zoom on focus.

**The bottom nav active state** now uses `background: var(--primary); color: #fff` which gives clear visual feedback. The `inset 0 -5px 0 var(--accent-gold)` accent line is a nice touch.

---

## 6. Mobile-Specific Findings

### Touch Targets Below 44px
| Element | Class | Approximate Size | Issue |
|---|---|---|---|
| Recipe card action buttons | `.btn-icon` | ~34px (0.5rem × 2 + 18px icon) | Under minimum |
| Pantry edit/delete buttons | `.pantry-action-btn` | ~28-30px (0.25rem padding + 0.8rem font) | Significantly under minimum |
| Navigation help button | `.nav-help-btn` | 32×32px | Under minimum |
| `.close` (modal close) | `.close` | 44×44px | Meets minimum |
| Bottom nav tabs | `.bottom-nav__link` | 48px+ | Correct |

### Text Below 16px
| Element | Class | Size | Issue |
|---|---|---|---|
| Recipe card info lines | `.recipe-card-info` | `0.82rem` (~13px) | Too small |
| Recipe description | `.recipe-card-description` | `0.9rem` (~14px) | Borderline |
| Nutrition mini label | `.nutrition-mini__label` | `0.66rem` (~10.5px) | Critical — far too small |
| Pantry card meta | `.pantry-card-meta` | `0.82rem` (~13px) | Too small |
| Recipe tag chips | `.recipe-tag` | `0.8rem` (~13px) | At minimum |
| Meal type badge | `.meal-type-badge` | `0.75rem` (~12px) | Below minimum |
| Friends meta text | `.friends-meta` | `0.8rem` (~13px) | At minimum |
| Week column header | `.week-column-header strong` | `0.85rem` (~14px) | Borderline |
| Week meal label | `.week-meal-label` | `0.75rem` (~12px) | Below minimum |
| Week snack block | `.week-snack-block` | `0.78rem` (~12px) | Below minimum |

### Spacing Too Generous
- `.stat-card { padding: 2rem }` — reduces to `2rem` on desktop, `2rem` still on tablets. Should be 1rem on mobile.
- `.container { padding: 2rem }` on desktop, `1rem` on mobile (correct for mobile, but the nested `.social-card { padding: 1.5rem }` inside the container adds ~2.5rem total padding on card content).
- `.meal-slot { margin-bottom: 1.5rem }` inline style — three meal slots take 4.5rem of vertical space in spacing alone.

### Scroll Depth Issues
- On the pantry page, the barcode scan button is at the top of the page header. With 80 pantry items, users are scrolled far down. The FAB helps partially but is not pantry-contextual.
- The recipe form in `recipeModal` is extremely long — 15+ form groups including 14 individual nutrition fields. This requires extensive scrolling on mobile. The modal already uses `max-height: 92vh; overflow-y: auto` which is correct, but the form length is daunting.

### Thumb Reach Problems
- "Scan Barcode" in pantry page header: top of page, far from thumb zone
- Mobile FABs: top-right corner, worst possible thumb reach zone
- Calendar "Prev/Next" navigation: calendar-nav rendered at top of calendar section (reaches more easily with scrolling, but ideally should be thumb-accessible)

---

## 7. Calendar-Specific Findings

### Slot Visibility
The meal plan has two rendering paths:

**FullCalendar Month View (`dayGridMonth`):** Shows colored dot events per day with meal type icon. No slot visibility — cannot see which meal types are planned vs. empty. On mobile, events clip and only 1-2 show per day cell with "+N more". Empty days look identical to days with no data. **Not usable as a planning tool on mobile.**

**Custom Week/Day Sections View (`mealWeek`/`mealDay`):** This is a proper structured view showing breakfast/lunch/dinner as named sections. Snacks have 4 dedicated drag-drop zones (before breakfast, between breakfast-lunch, between lunch-dinner, after dinner). The `<details>` accordion pattern per day shows a summary line. **This view is far more appropriate for mobile but:**
  - The day summary shows a count like "3 meals" but not which slots are filled/empty
  - The `meal-section-actions` buttons are hidden on mobile (`display: none` at max-width: 767px) — users cannot add or edit from this view on mobile
  - The "add meal" button per column is also hidden on mobile (`display: none`)
  - Empty meal slots show `.meal-empty { display: none }` on mobile — there is literally no visual indication of empty slots

### Add Flow Analysis
Current flow to add a breakfast on a specific day from Week view on mobile:
1. See the day column (no "add" button visible on mobile)
2. Must scroll to the day card in Day view, or use the "+ Add Meal" button at the top of the page
3. The page-level "+ Add Meal" button opens `mealPlanModal` without a pre-selected date or meal type — user must manually pick both
4. This is 4+ taps: navigate → tap add → select date → select type → select recipe → save

The `dayDetailModal` path (tap day cell on month view → "+ Add Recipe") is better (pre-fills date and type) but requires going to month view which is hard to use on mobile.

### Empty States in Calendar
- Empty pantry: `<p>Your pantry is empty. Add some items!</p>` — text only, no action
- Empty meal plan: Calendar renders empty on no meals, no empty state message shown
- The day detail modal for a day with no meals shows each meal slot with "No meal planned" text and an "+ Add Recipe" button — this is actually good, but only accessible from month view

### What Needs to Change for 2-Tap Add
The target flow:
1. Bottom nav → Meal Plan → Week view is default and shows today's week
2. Each day column shows 4 slot buttons (Breakfast + / Lunch + / Dinner + / Snack +) always visible
3. Tapping a slot button opens `mealPlanModal` pre-filled with date + meal type
4. User selects recipe, taps Save

This requires:
- Default week view on mobile (partially done, see P0-2)
- Slot buttons always visible on mobile (currently hidden)
- Direct open of `mealPlanModal` from slot button (bypassing `dayDetailModal`)

---

## 8. Proposed UX Changes Summary

### P0 — Must fix before any visual work
- [ ] **P0-1** Move barcode scan CTA to a fixed bottom-anchored position on the pantry screen (above bottom nav bar, only when pantry tab is active). Remove or relocate top-right FABs.
- [ ] **P0-2** Default calendar to Week view on mobile. Fix initialization to avoid month→week flash. Set `initialView` dynamically based on viewport width in `initializeCalendar()`.
- [ ] **P0-3** Show "+ Add" buttons per meal slot (breakfast/lunch/dinner/snack) directly in the Week view on mobile. Bypass `dayDetailModal` — tap slot → `mealPlanModal` pre-filled.
- [ ] **P0-4** Redesign recipe card: dietary tags as prominent pill badges with icons near the card top; nutrition as a 4-cell grid (cal/protein/carbs/fat) not a prose sentence.
- [ ] **P0-5** Fix `.pantry-action-btn` to `min-height: 44px; padding: 0.6rem 1rem`.

### P1 — Should fix as part of layout redesign
- [ ] **P1-1** Apply Playfair Display to all headings, DM Sans to body text — replace Trebuchet MS as the body font.
- [ ] **P1-2** Remove duplicate FAB buttons. Consolidate quick-add actions to page-level header or bottom nav context.
- [ ] **P1-3** Remove the second duplicate `styleGuidePage` HTML block.
- [ ] **P1-4** Default `maintenanceAnnouncement.enabled = false`. Add a dismiss button to the banner.
- [ ] **P1-5** Increase `.btn-icon` to `min-width: 44px; min-height: 44px`.
- [ ] **P1-6** Replace all `alert()` / `confirm()` calls with styled toast notifications and confirmation bottom sheets.
- [ ] **P1-7** Add icon + CTA to all empty states (pantry, recipes, meal plan, history).
- [ ] **P1-8** Remove `friendsPage` HTML (dead page). Fix duplicate IDs (`friendsListPanel`, `friendDetailTitle`, `friendDetailSubtitle`, `friendRecipes`, `friendMealPlan`, `refreshFriendsBtn`).

### P2 — Nice to have
- [ ] **P2-1** Increase `.nav-help-btn` to 44×44px.
- [ ] **P2-2** Style filter tag checkboxes as full-chip tap targets (hide native checkbox).
- [ ] **P2-3** Reduce dashboard stat card padding on mobile; show all 3 stats in one row.
- [ ] **P2-4** Reduce login card padding to `1.5rem 1.25rem` on mobile.
- [ ] **P2-5** Replace inline `style.cssText` in `showDayDetail()` with CSS classes.
- [ ] **P2-6** Add swipe-to-reveal or long-press context menu for meal item actions on mobile week view instead of hiding buttons.
- [ ] **P2-7** Remove duplicate CSS rule sets for `.btn-ghost` and `.btn-destructive`.
- [ ] **P2-8** Replace `--bg: #A9D9D0` (teal) with a warm cream/earth tone per brand brief (will be handled by brand-dna-extractor).

---

*Audit complete. Ready for review-broker (Gate 1).*
