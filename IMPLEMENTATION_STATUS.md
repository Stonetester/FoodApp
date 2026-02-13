# Modo Gusto - 5 Feature Implementation Status

## Branch: `mobile-glow-up`

---

## Overall Progress

| Task | Status | Backend | Frontend |
|------|--------|---------|----------|
| Task 4: Nutrition Auto-Population | DONE | Done | Done |
| Task 3: Recipe Rating & Reviews | DONE | Done | Done |
| Task 1: Email System (SendGrid) | DONE | Done | N/A |
| Task 2: Quick Action Buttons | DONE | N/A | Done |
| Task 5: Mobile UI Overhaul | DONE | N/A | Done |
| Bonus: Total Meal Nutrition | DONE | N/A | Done |

---

## Task 4: Nutrition Auto-Population — COMPLETE

### What was done
1. **Created `backend/app/nutrition.py`** (new file)
   - `lookup_ingredient_nutrition(name)` — searches Open Food Facts by ingredient name, strips qty/unit first, returns per-100g nutrition dict
   - `calculate_recipe_nutrition(ingredients, servings)` — sums all ingredient nutrition, divides by servings
   - `_strip_quantity_and_unit()` — helper to clean ingredient names for search
   - `_safe_float()` — safe number parser

2. **Modified `backend/app/routes.py`**
   - Added `from app.nutrition import lookup_ingredient_nutrition, calculate_recipe_nutrition` (line 7)
   - In `create_recipe()` (~line 249): when adding ingredients, if `nutritional_info` is empty and ingredient isn't `__nutrition__`, calls `lookup_ingredient_nutrition()` to auto-fill
   - In `update_recipe()` (~line 313): same auto-fill logic for updated ingredients
   - Added `GET /api/recipes/<id>/nutrition` endpoint (~line 1228) — returns aggregated per-serving nutrition

3. **Modified `frontend/public/js/recipes.js`**
   - Enhanced `getNutritionFromIngredients()` (~line 477): now falls back to summing individual ingredient `nutritional_info` when the `__nutrition__` meta-ingredient is missing

---

## Task 3: Recipe Rating & Reviews — BACKEND DONE, FRONTEND NOT STARTED

### What was done (backend)
1. **Modified `backend/app/models.py`** — added `RecipeReview` model at bottom:
   - Fields: `id`, `user_id`, `recipe_id`, `rating` (1-5), `review_text`, `created_at`, `updated_at`
   - Unique constraint on `(user_id, recipe_id)` — one review per user per recipe
   - Check constraint `rating >= 1 AND rating <= 5`
   - Relationships: `reviewer` (User), `recipe` (Recipe)
   - `to_dict()` includes `username`

2. **Modified `backend/app/__init__.py`**
   - Added `RecipeReview` to imports (line 8)
   - Added `_ensure_recipe_reviews_schema(conn)` function — creates `recipe_reviews` table if not exists
   - Called it inside `ensure_social_schema()`

3. **Modified `backend/app/routes.py`**
   - Added `RecipeReview` to model imports (line 6)
   - Added 3 endpoints at end of file:
     - `GET /api/recipes/<id>/reviews` — returns all reviews, aggregate stats (avg_rating, review_count, distribution), and current user's review (`my_review`)
     - `POST /api/recipes/<id>/reviews` — upsert: creates or updates review (one per user per recipe)
     - `DELETE /api/recipes/<id>/reviews/<review_id>` — delete own review only

### What still needs to be done (frontend)
1. **`frontend/public/js/api.js`** — add 3 methods:
   ```js
   async getRecipeReviews(recipeId) { return this.request(`/api/recipes/${recipeId}/reviews`); }
   async createRecipeReview(recipeId, data) { return this.request(`/api/recipes/${recipeId}/reviews`, { method: 'POST', body: JSON.stringify(data) }); }
   async deleteRecipeReview(recipeId, reviewId) { return this.request(`/api/recipes/${recipeId}/reviews/${reviewId}`, { method: 'DELETE' }); }
   ```

2. **`frontend/public/index.html`** — add review section inside `recipeDetailModal` (after the recipe actions div in `showRecipeDetailModal`). Needs:
   - Star picker (5 clickable stars)
   - Textarea for optional review text
   - Submit button
   - Review list area

3. **`frontend/public/css/style.css`** — add styles for:
   - `.star-picker` — row of 5 star buttons
   - `.star-picker .star` — individual star, gold on active/hover
   - `.review-card` — review display cards
   - `.review-meta` — username + date

4. **`frontend/public/js/recipes.js`** or **`frontend/public/js/users.js`** — in `showRecipeDetailModal()`:
   - After rendering recipe detail, call `getRecipeReviews(recipe.id)`
   - Render review section with star picker + textarea + submit
   - Handle submit → `createRecipeReview()`
   - Handle delete → `deleteRecipeReview()`
   - Show aggregate rating at top of recipe detail

5. **`backend/app/routes.py`** — update `discover_recipes()` to include `average_rating` and `review_count` from `RecipeReview` (currently it doesn't query reviews). Look at ~line 748 `discover_recipes()` function.

---

## Task 1: Email System (SendGrid) — NOT STARTED

### Files to create
- **`backend/app/email_service.py`** — SendGrid wrapper with branded HTML templates:
  - `send_welcome_email(user)`
  - `send_friend_request_sent(sender, receiver)`
  - `send_friend_request_received(sender, receiver)`
  - `send_maintenance_broadcast(subject, message, users)`
  - `send_weekly_digest(user, stats)`
  - `_base_template(title, body)` — branded HTML email template
  - All sends are fire-and-forget (errors logged, never raised)
  - If `SENDGRID_API_KEY` not set, silently skip

- **`backend/app/tasks.py`** — Flask CLI command `send-weekly-digest`

### Files to modify
- **`backend/requirements.txt`** — add `sendgrid==6.11.0`
- **`backend/app/config.py`** — add to `Config` class:
  ```python
  SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
  SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@modogusto.com')
  SENDGRID_FROM_NAME = os.environ.get('SENDGRID_FROM_NAME', 'Modo Gusto')
  ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
  APP_BASE_URL = os.environ.get('APP_BASE_URL', 'http://localhost:5000')
  ```
- **`backend/app/auth.py`** — after `db.session.commit()` in `register()` (~line 83), call `send_welcome_email(user)`
- **`backend/app/routes.py`** — after friend request commit (~line 979 area), call `send_friend_request_sent()` and `send_friend_request_received()`. Add `/admin/broadcast` endpoint.
- **`backend/app/__init__.py`** — register CLI command from tasks.py

---

## Task 2: Quick Action Buttons in Title Bar — NOT STARTED

### Files to modify
- **`frontend/public/index.html`** — replace `.nav-top-links` (lines 40-44) with:
  - 2 quick-action buttons: "Quick Add Recipe" + "Quick Add to Pantry"
  - Dropdown chevron button containing the 3 original nav links
  - Add quick-add-recipe modal HTML (2 options: "Scan QR Code" / "Paste Link")

- **`frontend/public/css/style.css`** — add styles:
  - `.btn-quick-action` — bg: `--accent-wine` (#8C0027), color: `--accent-gold` (#F1A512)
  - `.nav-dropdown`, `.nav-dropdown-menu`
  - `.quick-add-options`

- **`frontend/public/js/main.js`** (or new `frontend/public/js/quick-actions.js`):
  - Dropdown toggle logic (click chevron opens/closes)
  - Click outside closes dropdown
  - "Quick Add Recipe" → opens modal with "Scan QR Code" / "Paste Link" options
  - "Paste Link" → tries `navigator.clipboard.readText()` to auto-fill, falls back to text input
  - URL import reuses existing `importRecipeFromUrl` flow
  - "Quick Add to Pantry" → directly opens existing barcode scanner modal (calls `initScanner()`)

---

## Task 5: Mobile UI/UX Overhaul — NOT STARTED (do this LAST)

### Files to modify
- **`frontend/public/index.html`** — add Google Fonts in `<head>`:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  ```

- **`frontend/public/css/style.css`** — extensive additions mostly within `@media (max-width: 899px)`:
  1. Typography: Playfair Display for headings, DM Sans for body
  2. New CSS variables: 70s palette (`--70s-burnt-orange`, `--70s-avocado`, `--70s-harvest-gold`, etc.)
  3. Bottom nav: 70s color strip gradient on top edge
  4. Touch targets: all buttons/inputs min 48px height, 16px font on inputs
  5. Centered layouts: page headers centered, stat cards symmetrical grid
  6. Card enhancements: 70s color strip on top (::before), warm box-shadows, 20px+ radius, :active press feedback
  7. Bottom sheet modals: blur backdrop, handle bar, accent stripe
  8. Animations: fadeSlideUp for pages, staggered cardEntrance, button press scale
  9. Visual hierarchy: section dividers with gradient stripe, larger spacing
  10. Login page: centered Wes Anderson style with color strip header

- **`frontend/public/js/main.js`** — add swipe-to-dismiss for bottom sheet modals (touchstart/touchmove/touchend)

---

## Key Architecture Notes

- **Database**: MySQL via PyMySQL + SQLAlchemy. Schema changes use manual `_ensure_*_schema()` functions in `__init__.py` (not auto-migrations).
- **Auth**: Flask-Login with session cookies. `@login_required` on all API routes.
- **Frontend**: Vanilla JS SPA. All pages in single `index.html`. Navigation via `navigateToPage()`. Modals use `.active` class toggle.
- **Existing patterns**:
  - API methods go in `frontend/public/js/api.js` as methods on `ApiService` class
  - Backend endpoints go in `routes.py` on `api_bp` blueprint
  - Modals: add HTML in `index.html`, toggle with `.classList.add/remove('active')`
  - CSS variables defined in `:root` in `style.css`
- **The `__nutrition__` meta-ingredient**: Recipe nutrition is stored as a special ingredient with name `__nutrition__` and nutrition data in `nutritional_info`. This is how per-recipe nutrition is persisted separately from individual ingredient nutrition.
- **`ensure_social_schema()`** in `__init__.py` is currently commented out at startup (line 400). New tables need to be created manually or by uncommenting that call.

---

## How to Resume

1. Start with **Task 3 frontend** — it's the most self-contained remaining piece
2. Then **Task 1** (Email) — all new files + small hooks
3. Then **Task 2** (Quick Actions) — navbar HTML + JS
4. Finally **Task 5** (Mobile UI) — do last since it's CSS-heavy and should be applied after all HTML is stable
5. After all tasks, uncomment `ensure_social_schema()` in `__init__.py` line 400 (or run it manually) to create the `recipe_reviews` table
