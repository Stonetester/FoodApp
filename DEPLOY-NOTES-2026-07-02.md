# Deploy Notes — 2026-07-02 UI/UX Overhaul

**Branch:** `feature/modogusto-polish-planning-scanning-ai` (11 commits off `main`)
**Status:** DEPLOYED 2026-07-03 to CT 100 as merge `a6efeb5a` (includes the Fresh Ink retheme, `16b4d495`).
**Rollback:** clean revert = `git revert -m 1 a6efeb5a` + push + pull/restart on CT 100. Pre-merge main is tagged `pre-freshink-2026-07-03` (= `4fe3a98`); emergency CT-side: `git reset --hard 4fe3a98 && systemctl restart modogusto`. No destructive migrations — new tables/columns only.
Full per-file log: `DESIGN.md` → "File Manifest (Polish + Planning + Scanning + AI Pass — 2026-07-02)".

## What changed

### Fixed bugs (present on main today)
- **All barcode lookups were broken** — OpenFoodFacts 403-blocks the default python-requests User-Agent. Lookups now send an identifying UA. (`backend/app/utils.py`)
- `getMealHistory` built a broken URL (`\api\history`).

### New features
| Feature | Where |
|---|---|
| Shopping view in Meal Plan (ingredients for the week, grouped by category, matched against pantry, tap-to-check persists) | `mealplan.js`, `POST /api/mealplan/shopping-list` |
| Repeat Last Week / Clear Week / mark-meal-as-cooked → history | `mealplan.js`, `/api/mealplan/repeat-week`, `/clear-week`, `/<id>/cooked` |
| Continuous mass pantry scanning: camera stays live, green-check overlay, recent-5 undo stack, duplicate scan increments quantity, 2.5s per-barcode cooldown, unknown barcode → manual form → back to scanning; Pause/Torch/Finish controls. Old review-each-item flow available via Settings | `scanner.js`, `POST /api/pantry/scan-add` |
| "Meals Like This" AI suggestions: 6 modes (flavor/ingredients/healthier/cheaper/faster/use-pantry), review-before-save, `ai-generated` tag on saved recipes | `similar.js`, `backend/app/ai_service.py`, `POST /api/recipes/<id>/similar` |
| Grocery stores + aisle intelligence (beta): manual store list, item placement with honest source labels (`user`/`inferred`/`unknown` + confidence), shopper corrections remembered per store, walk-order Store Route view with collapsing stops | `mealplan.js`, `UserStore`/`AisleOverride` models, `/api/stores`, `/api/grocery/*` |
| Recipe detail: "Add to Plan" quick action | `users.js` |
| Accessibility settings: text size (3 levels), high contrast, reduced motion, larger buttons + pantry scan-mode preference (per-device, localStorage) | `settings.js`, Settings page |
| Pantry: "Expiring soon" strip (≤5 days) + category grouping; skeleton loading on recipe/pantry lists | `pantry.js`, `recipes.js` |

### UX cleanup
- Every raw browser `alert()`/`confirm()` replaced with styled toasts/confirm sheets (Escape closes, Cancel focused).
- First-run tip pointing at accessibility settings (suppressed while the tutorial is open).

### Security hardening (closes the 2026-06-19 audit findings)
- **CORS credentialed-wildcard removed** — same-origin only; cross-origin is opt-in via `CORS_ORIGINS` env.
- **SSRF guard** on recipe URL import — every hop resolved and private/loopback/link-local IPs rejected before connecting; redirects followed manually.
- **SECRET_KEY fallbacks removed** — prod refuses to boot with the dev key; reset-token signer has no fallback.
- `SESSION_COOKIE_SECURE` defaults ON in production.
- Auth rate limits: login 10/min, register 5/min, forgot-password 3/min, reset 5/min.
- Recipe `image_url` sanitized (no quotes/angle-brackets/`javascript:`); uploaded image bytes validated with Pillow (extension from detected format).
- Exception strings no longer returned to API clients (logged server-side only).
- Security headers on every response (CSP, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy).
- `GET /api/health` (unauthenticated) for reverse-proxy monitors; `backend/.env.example` added.

### Tests
`backend/tests/` — 14 focused tests, all passing: auth gating on every new endpoint, AI disabled-without-key + invalid mode, pantry CRUD + scan-add increment, meal plan CRUD/range/dupe-safe repeat, cross-user ownership 404s, aisle-correction precedence.
Run: `cd backend && venv\Scripts\python.exe -m pytest tests/`

Browser QA done with Playwright at 390/820/1440px (16 screenshots reviewed; 3 defects found and fixed on the branch).

## Deploy checklist (CT 100)

1. Merge this branch → `main`, push to GitHub.
2. On CT 100, in the app venv: `pip show flask-limiter Pillow` — **flask-limiter is newly load-bearing**; Pillow now validates uploads (both were already in local requirements — confirm prod has them, `pip install flask-limiter` if missing).
3. Confirm `/opt/app/FoodApp/backend/.env` has a real `SECRET_KEY` — **the app now refuses to start in production with the old dev fallback key** (intended fail-loud).
4. Optional — enable AI suggestions by adding to `.env`:
   ```
   FRONTIER_MODEL_API_KEY=ollama-local
   FRONTIER_MODEL_NAME=qwen3:14b
   FRONTIER_MODEL_BASE_URL=http://10.0.0.172:11434/v1
   ```
   (any OpenAI-compatible endpoint works; unset = feature shows a friendly disabled state)
5. Deploy: `ssh root@10.0.0.43 "cd /opt/app/FoodApp && git pull origin main && systemctl restart modogusto"`
6. Smoke test: `curl /api/health` → `{"status":"ok"}`; log in; scan a real barcode (the UA fix un-breaks lookups); open Meal Plan → Shopping tab.
7. New DB tables (`user_stores`, `aisle_overrides`) create themselves at startup via `db.create_all()` — no manual migration.

## Rollback
`git revert` the merge commit, or `git reset` main to `b2330af` before pulling on CT 100. No destructive migrations — new tables/columns only.
