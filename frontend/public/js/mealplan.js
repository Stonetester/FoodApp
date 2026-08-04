// Meal Planning with Calendar

let calendar = null;
let mealPlans = [];
let currentCalendarView = 'mealWeek';
let sectionFocusDate = new Date();
let monthViewDate = new Date(); // tracks which month is shown in month view
const snackSlots = [
    { key: 'before-breakfast', label: 'Snacks before breakfast', note: 'Before breakfast' },
    { key: 'between-breakfast-lunch', label: 'Snacks between breakfast & lunch', note: 'Between breakfast & lunch' },
    { key: 'between-lunch-dinner', label: 'Snacks between lunch & dinner', note: 'Between lunch & dinner' },
    { key: 'after-dinner', label: 'Snacks after dinner', note: 'After dinner' }
];

document.addEventListener('DOMContentLoaded', () => {
    setupMealPlanListeners();
});

function setupMealPlanListeners() {
    // Add meal plan button
    document.getElementById('addMealPlanBtn')?.addEventListener('click', () => {
        openMealPlanModal();
    });

    // Meal plan form submission
    document.getElementById('mealPlanForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMealPlan();
    });

    // Cancel button
    document.getElementById('cancelMealPlanBtn')?.addEventListener('click', () => {
        closeMealPlanModal();
    });

    // Close day detail button
    document.getElementById('closeDayDetailBtn')?.addEventListener('click', () => {
        document.getElementById('dayDetailModal').classList.remove('active');
    });

    // Calendar view switcher
    document.querySelectorAll('.view-switcher .view-btn').forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.dataset.view;
            handleViewChange(viewName);
        });
    });

    const calendarTodayBtn = document.getElementById('calendarTodayBtn');
    if (calendarTodayBtn) {
        calendarTodayBtn.addEventListener('click', () => {
            handleToday();
        });
    }

    const calendarPrevBtn = document.getElementById('calendarPrevBtn');
    if (calendarPrevBtn) {
        calendarPrevBtn.addEventListener('click', () => {
            handlePrev();
        });
    }

    const calendarNextBtn = document.getElementById('calendarNextBtn');
    if (calendarNextBtn) {
        calendarNextBtn.addEventListener('click', () => {
            handleNext();
        });
    }

    document.getElementById('repeatWeekBtn')?.addEventListener('click', repeatLastWeek);
    document.getElementById('clearWeekBtn')?.addEventListener('click', clearCurrentWeek);
}

function currentWeekRange() {
    const dates = getWeekDates(sectionFocusDate);
    return {
        start: dates[0].toISOString().split('T')[0],
        end: dates[6].toISOString().split('T')[0],
    };
}

async function repeatLastWeek() {
    const { start } = currentWeekRange();
    const sourceStart = new Date(start + 'T00:00:00');
    sourceStart.setDate(sourceStart.getDate() - 7);
    try {
        const result = await api.repeatWeek(sourceStart.toISOString().split('T')[0], start);
        if (result.source_meals === 0) {
            window.showToast('Last week has no meals to repeat', 'info');
        } else {
            window.showToast(`Copied ${result.created} meal${result.created !== 1 ? 's' : ''} from last week`);
        }
        await loadMealPlan();
    } catch (error) {
        window.showToast('Failed to repeat week: ' + error.message, 'error');
    }
}

function clearCurrentWeek() {
    const { start, end } = currentWeekRange();
    window.showConfirm('Remove all meals planned this week?', async () => {
        try {
            const result = await api.clearWeek(start, end);
            window.showToast(`Removed ${result.deleted} meal${result.deleted !== 1 ? 's' : ''}`);
            await loadMealPlan();
        } catch (error) {
            window.showToast('Failed to clear week: ' + error.message, 'error');
        }
    }, 'Clear Week');
}

async function markMealCooked(planId) {
    try {
        await api.markMealCooked(planId);
        window.showToast('Logged to meal history');
        // Refresh day detail if open
        const modal = document.getElementById('dayDetailModal');
        if (modal && modal.classList.contains('active')) {
            const dateStr = document.getElementById('dayMealSlots')?.dataset.date;
            if (dateStr) showDayDetail(dateStr);
        }
    } catch (error) {
        window.showToast('Failed to log meal: ' + error.message, 'error');
    }
}

// ---- Shopping view ----

function shoppingCheckKey(dateRange) {
    return `mg_shopping_checked_${dateRange.start}`;
}

function getCheckedShoppingItems(dateRange) {
    try {
        return new Set(JSON.parse(localStorage.getItem(shoppingCheckKey(dateRange)) || '[]'));
    } catch (_) {
        return new Set();
    }
}

function saveCheckedShoppingItems(dateRange, checked) {
    try {
        localStorage.setItem(shoppingCheckKey(dateRange), JSON.stringify([...checked]));
    } catch (_) {}
}

function checkedShoppingItems(items, checked) {
    return items.filter(item => checked.has(item.name.toLowerCase()));
}

function buildShoppingTransferAction(items, checked) {
    const selected = checkedShoppingItems(items, checked);
    const label = selected.length
        ? `Add ${selected.length} checked item${selected.length === 1 ? '' : 's'} to pantry`
        : 'Add checked items to pantry';
    return `
        <div class="shopping-pantry-action">
            <button type="button" class="btn btn-primary" id="addCheckedToPantryBtn"${selected.length ? '' : ' disabled'}>
                ${label}
            </button>
        </div>
    `;
}

function wireShoppingTransferAction(container, range, items, checked) {
    container.querySelector('#addCheckedToPantryBtn')?.addEventListener('click', () => {
        const selected = checkedShoppingItems(items, checked);
        if (!selected.length) return;
        window.showConfirm(
            `Add ${selected.length} checked item${selected.length === 1 ? '' : 's'} to your pantry?`,
            async () => {
                try {
                    const result = await api.addPurchasedPantryItems(selected.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        unit: item.unit,
                    })));
                    selected.forEach(item => checked.delete(item.name.toLowerCase()));
                    saveCheckedShoppingItems(range, checked);
                    const changes = [
                        result.created ? `${result.created} added` : '',
                        result.updated ? `${result.updated} quantity updated` : '',
                    ].filter(Boolean).join(', ');
                    window.showToast(`Pantry updated: ${changes}`);
                    renderShoppingView();
                } catch (error) {
                    window.showToast('Failed to add items to pantry: ' + error.message, 'error');
                }
            },
            'Add to Pantry'
        );
    });
}

let shoppingSubView = 'list';   // 'list' | 'route'
let lastShoppingData = null;
let routeStoreId = null;
let routeAddingStore = false;

async function renderShoppingView() {
    const container = document.getElementById('shoppingListView');
    if (!container) return;

    const range = currentWeekRange();
    const titleEl = document.getElementById('calendarMonthTitle');
    if (titleEl) {
        const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        titleEl.textContent = `${fmt(range.start)} – ${fmt(range.end)}`;
    }

    container.style.display = 'block';
    container.innerHTML = '<div class="shopping-loading">Building your shopping list…</div>';

    let data;
    try {
        data = await api.getShoppingList(range.start, range.end);
    } catch (error) {
        container.innerHTML = '<p class="shopping-empty">Could not build the shopping list. Please try again.</p>';
        return;
    }
    lastShoppingData = data;

    if (!data.items.length) {
        container.innerHTML = `
            <div class="shopping-empty">
                <p>No meals planned this week yet.</p>
                <p class="shopping-empty-hint">Add meals to your plan and the shopping list builds itself.</p>
            </div>
        `;
        return;
    }

    if (shoppingSubView === 'route') {
        renderRouteView(container, range);
        return;
    }

    const checked = getCheckedShoppingItems(range);

    // Group by category
    const byCategory = {};
    data.items.forEach(item => {
        (byCategory[item.category] = byCategory[item.category] || []).push(item);
    });

    const needCount = data.items.filter(i => !i.in_pantry).length;
    let html = buildShoppingSubToggle();
    html += buildShoppingTransferAction(data.items, checked);
    html += `
        <div class="shopping-summary">
            <span><strong>${data.meal_count}</strong> meals planned</span>
            <span><strong>${needCount}</strong> items to buy</span>
            <span><strong>${data.items.length - needCount}</strong> already in pantry</span>
        </div>
    `;

    Object.keys(byCategory).sort().forEach(category => {
        html += `<div class="shopping-category"><h3>${category}</h3>`;
        byCategory[category].forEach(item => {
            const qty = item.quantity
                ? `${item.quantity}${item.unit ? ' ' + item.unit : ''}${item.has_unknown_quantity ? ' +' : ''}`
                : '';
            const id = `shop_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            const isChecked = checked.has(item.name.toLowerCase());
            html += `
                <label class="shopping-item${isChecked ? ' shopping-item--checked' : ''}${item.in_pantry ? ' shopping-item--have' : ''}" for="${id}">
                    <input type="checkbox" id="${id}" data-name="${item.name.toLowerCase()}" ${isChecked ? 'checked' : ''}>
                    <span class="shopping-item-name">${item.name}</span>
                    ${qty ? `<span class="shopping-item-qty">${qty}</span>` : ''}
                    ${item.in_pantry ? '<span class="shopping-item-badge">In pantry</span>' : ''}
                </label>
            `;
        });
        html += '</div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.addEventListener('change', () => {
            const name = box.dataset.name;
            if (box.checked) checked.add(name); else checked.delete(name);
            saveCheckedShoppingItems(range, checked);
            box.closest('.shopping-item').classList.toggle('shopping-item--checked', box.checked);
        });
    });

    wireShoppingSubToggle(container);
    wireShoppingTransferAction(container, range, data.items, checked);
}

// ---- Store route view (beta) ----

function buildShoppingSubToggle() {
    return `
        <div class="shopping-sub-toggle">
            <button type="button" class="view-btn${shoppingSubView === 'list' ? ' active' : ''}" data-subview="list">List</button>
            <button type="button" class="view-btn${shoppingSubView === 'route' ? ' active' : ''}" data-subview="route">Store Route <span class="beta-chip">Beta</span></button>
        </div>
    `;
}

function wireShoppingSubToggle(container) {
    container.querySelectorAll('[data-subview]').forEach(btn => {
        btn.addEventListener('click', () => {
            shoppingSubView = btn.dataset.subview;
            renderShoppingView();
        });
    });
}

function sourceChip(source, confidence) {
    if (source === 'user') return '<span class="aisle-chip aisle-chip--user" title="You confirmed this">✔ yours</span>';
    if (source === 'inferred') return `<span class="aisle-chip aisle-chip--guess" title="Guessed from item category (confidence ${Math.round((confidence || 0) * 100)}%)">~ guess</span>`;
    return '<span class="aisle-chip aisle-chip--unknown" title="No aisle data for this item">? unknown</span>';
}

async function renderRouteView(container, range) {
    container.innerHTML = buildShoppingSubToggle() + '<div class="shopping-loading">Loading stores…</div>';
    wireShoppingSubToggle(container);
    const body = container.querySelector('.shopping-loading');

    let stores = [];
    try {
        stores = await api.getStores();
    } catch (_) {}

    if (!routeStoreId && stores.length) {
        routeStoreId = (stores.find(s => s.is_default) || stores[0]).id;
    }

    const storePicker = `
        <div class="route-store-row">
            <select id="routeStoreSelect" aria-label="Choose store">
                ${stores.map(s => `<option value="${s.id}"${s.id === routeStoreId ? ' selected' : ''}>${s.name}${s.chain ? ` (${s.chain})` : ''}</option>`).join('')}
                <option value="__add__">+ Add a store…</option>
            </select>
        </div>
        <p class="route-beta-note">Beta: route order depends on store data availability. Tap "Fix" to correct an aisle — corrections are remembered for this store.</p>
    `;

    if (!stores.length || routeAddingStore) {
        body.outerHTML = `
            <div class="shopping-empty">
                <p>${stores.length ? 'Add another store.' : 'Add the store you shop at to build a walk-through route.'}</p>
                <div class="route-add-store">
                    <input type="text" id="newStoreName" placeholder="Store name (e.g. Giant on Main St)" maxlength="120">
                    <select id="newStoreChain">
                        <option value="">Chain (optional)</option>
                        <option>Giant</option><option>Safeway</option><option>Wegmans</option>
                        <option>Walmart</option><option>Target</option><option>Other</option>
                    </select>
                    <button class="btn btn-primary" id="addStoreBtn" type="button">Save Store</button>
                    ${stores.length ? '<button class="btn btn-secondary" id="cancelAddStoreBtn" type="button">Cancel</button>' : ''}
                </div>
            </div>
        `;
        container.querySelector('#addStoreBtn')?.addEventListener('click', async () => {
            const name = container.querySelector('#newStoreName').value.trim();
            if (!name) { window.showToast('Give the store a name', 'info'); return; }
            try {
                const store = await api.addStore({ name, chain: container.querySelector('#newStoreChain').value || null, is_default: !stores.length });
                routeStoreId = store.id;
                routeAddingStore = false;
                renderShoppingView();
            } catch (err) {
                window.showToast('Failed to save store: ' + err.message, 'error');
            }
        });
        container.querySelector('#cancelAddStoreBtn')?.addEventListener('click', () => {
            routeAddingStore = false;
            renderShoppingView();
        });
        return;
    }

    let route;
    try {
        route = await api.locateItems(routeStoreId, lastShoppingData.items.map(i => ({ name: i.name, category: i.category })));
    } catch (err) {
        body.outerHTML = '<p class="shopping-empty">Could not build the route. Please try again.</p>';
        return;
    }

    const checked = getCheckedShoppingItems(range);

    // Group into stops, preserving backend walk order
    const stops = [];
    route.items.forEach(item => {
        const label = item.aisle || 'Unknown location';
        let stop = stops[stops.length - 1];
        if (!stop || stop.label !== label) {
            stop = { label, items: [] };
            stops.push(stop);
        }
        stop.items.push(item);
    });

    let html = buildShoppingTransferAction(lastShoppingData.items, checked) + storePicker;
    stops.forEach((stop, si) => {
        const allDone = stop.items.every(i => checked.has(i.name.toLowerCase()));
        html += `
            <details class="route-stop${allDone ? ' route-stop--done' : ''}"${allDone ? '' : ' open'}>
                <summary><span class="route-stop-num">${si + 1}</span> ${stop.label} <span class="route-stop-count">${stop.items.length}</span></summary>
                ${stop.items.map(item => {
                    const isChecked = checked.has(item.name.toLowerCase());
                    return `
                        <div class="route-item${isChecked ? ' route-item--checked' : ''}" data-item="${item.name.toLowerCase()}">
                            <label class="route-item-main">
                                <input type="checkbox" data-name="${item.name.toLowerCase()}" ${isChecked ? 'checked' : ''}>
                                <span class="route-item-name">${item.name}</span>
                            </label>
                            ${sourceChip(item.source, item.confidence)}
                            <button type="button" class="btn-link route-fix-btn" data-fix="${item.name}">Fix</button>
                        </div>
                        <div class="route-fix-row" data-fix-row="${item.name}" hidden>
                            <input type="text" placeholder="Aisle (e.g. Aisle 7, Dairy)" maxlength="80">
                            <button type="button" class="btn btn-primary" data-fix-save="${item.name}">Save</button>
                        </div>
                    `;
                }).join('')}
            </details>
        `;
    });
    html += '<div class="route-stop route-stop--checkout"><span class="route-stop-num">🏁</span> Checkout</div>';

    body.outerHTML = html;

    // Store switcher
    container.querySelector('#routeStoreSelect')?.addEventListener('change', (e) => {
        if (e.target.value === '__add__') {
            routeAddingStore = true;
        } else {
            routeStoreId = parseInt(e.target.value, 10);
        }
        renderShoppingView();
    });

    wireShoppingTransferAction(container, range, lastShoppingData.items, checked);

    // Check-off (shared state with list view)
    container.querySelectorAll('.route-item input[type="checkbox"]').forEach(box => {
        box.addEventListener('change', () => {
            const name = box.dataset.name;
            if (box.checked) checked.add(name); else checked.delete(name);
            saveCheckedShoppingItems(range, checked);
            box.closest('.route-item').classList.toggle('route-item--checked', box.checked);
            const stop = box.closest('.route-stop');
            const done = [...stop.querySelectorAll('input[type="checkbox"]')].every(b => b.checked);
            stop.classList.toggle('route-stop--done', done);
            if (done) stop.removeAttribute('open');
        });
    });

    // Fix-aisle corrections
    container.querySelectorAll('.route-fix-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = container.querySelector(`[data-fix-row="${CSS.escape(btn.dataset.fix)}"]`);
            if (row) row.hidden = !row.hidden;
        });
    });
    container.querySelectorAll('[data-fix-save]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemName = btn.dataset.fixSave;
            const input = btn.closest('.route-fix-row').querySelector('input');
            const aisle = input.value.trim();
            if (!aisle) return;
            try {
                await api.saveAisleCorrection(routeStoreId, itemName, aisle);
                window.showToast(`Saved: ${itemName} → ${aisle}`);
                renderShoppingView();
            } catch (err) {
                window.showToast('Failed to save correction: ' + err.message, 'error');
            }
        });
    });
}


async function loadMealPlan() {
    try {
        // Load a wide window — 3 months back to 3 months forward — so week/month
        // navigation doesn't require a network round-trip for every page flip.
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 4, 0);

        mealPlans = await api.getMealPlan(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        handleViewChange(currentCalendarView);
    } catch (error) {
        console.error('Error loading meal plan:', error);
        if (window.showToast) window.showToast('Failed to load meal plan', 'error');
    }
}

function renderMonthView() {
    const calendarEl = document.getElementById('mealPlanCalendar');
    if (!calendarEl) return;

    const year = monthViewDate.getFullYear();
    const month = monthViewDate.getMonth();
    const todayStr = new Date().toISOString().split('T')[0];

    // Month header label
    const monthLabel = monthViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const titleEl = document.getElementById('calendarMonthTitle');
    if (titleEl) titleEl.textContent = monthLabel;

    // Build index: dateStr -> plans[]
    const mealsByDate = {};
    mealPlans.forEach(plan => {
        if (!mealsByDate[plan.planned_date]) mealsByDate[plan.planned_date] = [];
        mealsByDate[plan.planned_date].push(plan);
    });

    // First day of month, last day
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun

    const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = '<div class="month-grid">';

    // Day-of-week header row
    html += '<div class="month-grid__header">';
    DOW_LABELS.forEach(d => { html += `<div class="month-grid__dow">${d}</div>`; });
    html += '</div>';

    // Day cells
    html += '<div class="month-grid__body">';

    // Leading empty cells
    for (let i = 0; i < startOffset; i++) {
        html += '<div class="month-cell month-cell--empty"></div>';
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const plans = mealsByDate[dateStr] || [];
        const isToday = dateStr === todayStr;
        const hasMeals = plans.length > 0;

        const mealDots = plans.slice(0, 3).map(p => {
            const color = getMealTypeColor(p.meal_type);
            return `<span class="month-cell__dot" style="background:${color}" title="${p.meal_type}"></span>`;
        }).join('');
        const overflowDot = plans.length > 3
            ? `<span class="month-cell__dot month-cell__dot--more">+${plans.length - 3}</span>`
            : '';

        html += `
            <div class="month-cell${isToday ? ' month-cell--today' : ''}${hasMeals ? ' month-cell--has-meals' : ''}"
                 data-date="${dateStr}" role="button" tabindex="0" aria-label="${dateStr}${hasMeals ? ', ' + plans.length + ' meals' : ''}">
                <span class="month-cell__day">${d}</span>
                <div class="month-cell__dots">${mealDots}${overflowDot}</div>
            </div>
        `;
    }

    // Trailing empty cells to complete the last row
    const totalCells = startOffset + lastDay.getDate();
    const remainder = totalCells % 7;
    if (remainder !== 0) {
        for (let i = 0; i < (7 - remainder); i++) {
            html += '<div class="month-cell month-cell--empty"></div>';
        }
    }

    html += '</div></div>'; // month-grid__body + month-grid
    calendarEl.innerHTML = html;
    calendarEl.style.display = 'block';

    // Wire up click/keyboard on day cells
    calendarEl.querySelectorAll('.month-cell[data-date]').forEach(cell => {
        const handler = () => showDayDetail(cell.dataset.date);
        cell.addEventListener('click', handler);
        cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
    });
}

function updateViewButtons(viewName) {
    document.querySelectorAll('.view-switcher .view-btn').forEach(button => {
        if (button.dataset.view === viewName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function getMealTypeColor(mealType) {
    const colors = {
        'breakfast': '#E6A556',
        'lunch': '#D78B3A',
        'dinner': '#6E7A44',
        'snack': '#C96A2B'
    };
    return colors[mealType] || '#7A8471';
}

function getRecipeNutrition(recipe) {
    if (!recipe?.ingredients || !Array.isArray(recipe.ingredients)) {
        return null;
    }
    const nutritionIngredient = recipe.ingredients.find((ingredient) => ingredient.ingredient_name === '__nutrition__');
    return nutritionIngredient?.nutritional_info || null;
}

function formatNutritionPerServing(nutrition) {
    if (!nutrition) return '';
    const parts = [];
    if (nutrition.energy_kcal !== undefined && nutrition.energy_kcal !== null) parts.push(`${nutrition.energy_kcal} calories`);
    if (nutrition.proteins !== undefined && nutrition.proteins !== null) parts.push(`${nutrition.proteins}g protein`);
    if (nutrition.carbohydrates !== undefined && nutrition.carbohydrates !== null) parts.push(`${nutrition.carbohydrates}g carbs`);
    if (nutrition.fat !== undefined && nutrition.fat !== null) parts.push(`${nutrition.fat}g fat`);
    return parts.join(' • ');
}

function buildMealServingMeta(recipe) {
    if (!recipe) return '';
    const info = [];
    if (recipe.servings) {
        info.push(`🍽️ ${recipe.servings} servings`);
    }
    const nutrition = getRecipeNutrition(recipe);
    if (nutrition?.serving_size) {
        info.push(`Serving size: ${nutrition.serving_size}`);
    }
    const nutritionSummary = formatNutritionPerServing(nutrition);
    if (nutritionSummary) {
        info.push(`Per serving: ${nutritionSummary}`);
    }
    return info.map((text) => `<p style="margin: 0.25rem 0 0 0; font-size: 0.82rem; color: var(--text); opacity: 0.9;">${text}</p>`).join('');
}

async function openMealPlanModal(plan = null, date = null, mealType = null, defaultNotes = null) {
    const modal = document.getElementById('mealPlanModal');
    const form = document.getElementById('mealPlanForm');
    
    // Load recipes for dropdown
    try {
        const recipes = await api.getRecipes();
        const select = document.getElementById('mealPlanRecipe');
        select.innerHTML = '<option value="">Select a recipe</option>';
        
        recipes.forEach(recipe => {
            const option = document.createElement('option');
            option.value = recipe.id;
            option.textContent = recipe.title;
            select.appendChild(option);
        });

        if (plan) {
            document.getElementById('mealPlanId').value = plan.id;
            document.getElementById('mealPlanRecipe').value = plan.recipe_id;
            document.getElementById('mealPlanDate').value = plan.planned_date;
            document.getElementById('mealPlanType').value = plan.meal_type;
            document.getElementById('mealPlanNotes').value = plan.notes || '';
        } else {
            form.reset();
            document.getElementById('mealPlanId').value = '';
            if (date) {
                document.getElementById('mealPlanDate').value = date;
            } else {
                document.getElementById('mealPlanDate').value = new Date().toISOString().split('T')[0];
            }
            if (mealType) {
                document.getElementById('mealPlanType').value = mealType;
            }
            if (defaultNotes) {
                document.getElementById('mealPlanNotes').value = defaultNotes;
            }
        }
    } catch (error) {
        console.error('Error loading recipes:', error);
        if (window.showToast) window.showToast('Failed to load recipes', 'error');
        return;
    }

    modal.classList.add('active');
}

function closeMealPlanModal() {
    document.getElementById('mealPlanModal').classList.remove('active');
}

async function saveMealPlan() {
    const form = document.getElementById('mealPlanForm');
    const planId = document.getElementById('mealPlanId').value;

    const planData = {
        recipe_id: parseInt(document.getElementById('mealPlanRecipe').value),
        planned_date: document.getElementById('mealPlanDate').value,
        meal_type: document.getElementById('mealPlanType').value,
        notes: document.getElementById('mealPlanNotes').value || null
    };

    try {
        if (planId) {
            await api.updateMealPlan(planId, planData);
        } else {
            await api.addMealPlan(planData);
        }
        closeMealPlanModal();
        await loadMealPlan();
        
        // If day detail modal was open, refresh it
        const dayModal = document.getElementById('dayDetailModal');
        if (dayModal.classList.contains('active')) {
            showDayDetail(planData.planned_date);
        }
    } catch (error) {
        console.error('Error saving meal plan:', error);
        if (window.showToast) window.showToast('Failed to save meal plan: ' + error.message, 'error');
    }
}

async function updateMealPlanDate(planId, newDate) {
    try {
        const plan = mealPlans.find(p => p.id === planId);
        if (plan) {
            await api.updateMealPlan(planId, {
                ...plan,
                planned_date: newDate.split('T')[0]
            });
            loadMealPlan();
        }
    } catch (error) {
        console.error('Error updating meal plan date:', error);
        if (window.showToast) window.showToast('Failed to update meal plan', 'error');
        loadMealPlan(); // Reload to revert change
    }
}

async function viewMealPlan(planId) {
    const plan = mealPlans.find(p => p.id === planId);
    if (plan) {
        openMealPlanModal(plan);
    }
}

async function showDayDetail(dateStr) {
    const modal = document.getElementById('dayDetailModal');
    const titleEl = document.getElementById('dayDetailTitle');
    const dateEl = document.getElementById('dayDetailDate');
    const slotsEl = document.getElementById('dayMealSlots');
    
    // Format date
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    dateEl.textContent = formattedDate;
    
    // Get meals for this day
    const dayMeals = mealPlans.filter(plan => plan.planned_date === dateStr);
    
    // Group by meal type
    const mealsByType = {
        breakfast: dayMeals.find(m => m.meal_type === 'breakfast'),
        lunch: dayMeals.find(m => m.meal_type === 'lunch'),
        dinner: dayMeals.find(m => m.meal_type === 'dinner'),
        snack: dayMeals.filter(m => m.meal_type === 'snack')
    };
    
    // Load all recipes for quick add
    let allRecipes = [];
    try {
        allRecipes = await api.getRecipes();
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
    
    // Build meal slots HTML
    slotsEl.innerHTML = '';
    
    const mealTypes = [
        { key: 'breakfast', label: '🌅 Breakfast', icon: '🌅' },
        { key: 'lunch', label: '☀️ Lunch', icon: '☀️' },
        { key: 'dinner', label: '🌙 Dinner', icon: '🌙' }
    ];
    
    mealTypes.forEach(mealType => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'meal-slot day-detail-slot';

        const meals = mealType.multiple
            ? mealsByType[mealType.key] || []
            : mealsByType[mealType.key] ? [mealsByType[mealType.key]] : [];

        let slotContent = `
            <div class="day-detail-slot-header">
                <h3 class="day-detail-slot-title">${mealType.label}</h3>
                <button class="btn btn-secondary day-detail-add-btn" onclick="quickAddRecipe('${dateStr}', '${mealType.key}')">
                    + Add Recipe
                </button>
            </div>
        `;

        if (meals.length === 0) {
            slotContent += '<p class="day-detail-empty">No meal planned</p>';
        } else {
            meals.forEach(meal => {
                if (meal && meal.recipe) {
                    slotContent += `
                        <div class="day-detail-meal-item" style="border-left-color: ${getMealTypeColor(meal.meal_type)}">
                            ${meal.recipe.image_url ? `<img src="${meal.recipe.image_url}" alt="${meal.recipe.title}" class="day-detail-meal-photo" onerror="this.style.display='none'">` : ''}
                            <div class="day-detail-meal-row">
                                <div class="day-detail-meal-info">
                                    <h4 class="day-detail-meal-title">${meal.recipe.title}</h4>
                                    ${meal.recipe.description ? `<p class="day-detail-meal-desc">${meal.recipe.description}</p>` : ''}
                                    ${meal.notes ? `<p class="day-detail-meal-notes"><em>${meal.notes}</em></p>` : ''}
                                    ${meal.recipe.prep_time || meal.recipe.cook_time ? `
                                        <p class="day-detail-meal-time">
                                            ${meal.recipe.prep_time ? `Prep: ${meal.recipe.prep_time}min` : ''}
                                            ${meal.recipe.prep_time && meal.recipe.cook_time ? ' • ' : ''}
                                            ${meal.recipe.cook_time ? `Cook: ${meal.recipe.cook_time}min` : ''}
                                        </p>
                                    ` : ''}
                                    ${buildMealServingMeta(meal.recipe)}
                                </div>
                                <div class="day-detail-meal-actions">
                                    <button class="btn-icon" onclick="markMealCooked(${meal.id})" title="Mark as cooked">✅</button>
                                    <button class="btn-icon" onclick="editMealPlanFromDay(${meal.id})" title="Edit">✏️</button>
                                    <button class="btn-icon" onclick="deleteMealPlanFromDay(${meal.id})" title="Delete">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }
        
        slotDiv.innerHTML = slotContent;
        slotsEl.appendChild(slotDiv);
    });
    
    // Show existing snacks as muted text list
    const snackMeals = dayMeals.filter(m => m.meal_type === 'snack');
    if (snackMeals.length > 0) {
        const snackDiv = document.createElement('div');
        snackDiv.className = 'day-detail-snack-list';
        snackDiv.innerHTML = `
            <p class="day-detail-snack-label">🍎 Snacks</p>
            ${snackMeals.map(s => `<p class="day-detail-snack-item">${s.recipe ? s.recipe.title : 'Snack'}${s.notes ? ` <em>(${s.notes})</em>` : ''}</p>`).join('')}
        `;
        slotsEl.appendChild(snackDiv);
    }

    // Store recipes for quick add
    slotsEl.dataset.recipes = JSON.stringify(allRecipes);
    slotsEl.dataset.date = dateStr;
    
    modal.classList.add('active');
}

async function quickAddRecipe(dateStr, mealType, notes = null) {
    // Close day detail modal
    document.getElementById('dayDetailModal').classList.remove('active');
    
    // Open meal plan modal with pre-filled date and meal type
    await openMealPlanModal(null, dateStr, mealType, notes);
}

async function editMealPlanFromDay(planId) {
    const plan = mealPlans.find(p => p.id === planId);
    if (plan) {
        document.getElementById('dayDetailModal').classList.remove('active');
        await openMealPlanModal(plan);
    }
}

function deleteMealPlanFromDay(planId) {
    const doDelete = async () => {
        try {
            await api.deleteMealPlan(planId);
            await loadMealPlan();
            // Refresh day detail if modal is open
            const modal = document.getElementById('dayDetailModal');
            if (modal && modal.classList.contains('active')) {
                const dateStr = document.getElementById('dayMealSlots')?.dataset.date;
                if (dateStr) showDayDetail(dateStr);
            }
        } catch (error) {
            console.error('Error deleting meal plan:', error);
            if (window.showToast) window.showToast('Failed to delete meal', 'error');
        }
    };
    window.showConfirm('Remove this meal from your plan?', doDelete, 'Remove');
}

// Export functions
window.loadMealPlan = loadMealPlan;
window.quickAddRecipe = quickAddRecipe;
window.editMealPlanFromDay = editMealPlanFromDay;
window.deleteMealPlanFromDay = deleteMealPlanFromDay;
window.showDayDetail = showDayDetail;
window.markMealCooked = markMealCooked;

function handleViewChange(viewName) {
    currentCalendarView = viewName;
    const sectionsEl = document.getElementById('mealPlanSections');
    const calendarEl = document.getElementById('mealPlanCalendar');
    const monthTitleEl = document.getElementById('calendarMonthTitle');
    const shoppingEl = document.getElementById('shoppingListView');
    const weekActionsEl = document.getElementById('weekActions');

    if (shoppingEl && viewName !== 'shopping') shoppingEl.style.display = 'none';
    if (weekActionsEl) weekActionsEl.style.display = viewName === 'mealWeek' ? '' : 'none';

    if (viewName === 'shopping') {
        if (sectionsEl) sectionsEl.style.display = 'none';
        if (calendarEl) { calendarEl.style.display = 'none'; calendarEl.innerHTML = ''; }
        if (monthTitleEl) monthTitleEl.style.display = '';
        renderShoppingView();
    } else if (viewName === 'dayGridMonth') {
        if (sectionsEl) sectionsEl.style.display = 'none';
        if (monthTitleEl) monthTitleEl.style.display = '';
        renderMonthView();
    } else {
        if (calendarEl) {
            calendarEl.style.display = 'none';
            calendarEl.innerHTML = '';
        }
        if (monthTitleEl) monthTitleEl.style.display = 'none';
        if (sectionsEl) sectionsEl.style.display = 'grid';
        renderMealSections(viewName);
    }

    updateViewButtons(viewName);
}

function handleToday() {
    if (currentCalendarView === 'dayGridMonth') {
        monthViewDate = new Date();
        renderMonthView();
    } else if (currentCalendarView === 'shopping') {
        sectionFocusDate = new Date();
        renderShoppingView();
    } else {
        sectionFocusDate = new Date();
        renderMealSections(currentCalendarView);
    }
}

function handlePrev() {
    if (currentCalendarView === 'dayGridMonth') {
        monthViewDate = new Date(monthViewDate.getFullYear(), monthViewDate.getMonth() - 1, 1);
        renderMonthView();
    } else if (currentCalendarView === 'shopping') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() - 7);
        renderShoppingView();
    } else if (currentCalendarView === 'mealWeek') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() - 7);
        renderMealSections(currentCalendarView);
    } else if (currentCalendarView === 'mealDay') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() - 1);
        renderMealSections(currentCalendarView);
    }
}

function handleNext() {
    if (currentCalendarView === 'dayGridMonth') {
        monthViewDate = new Date(monthViewDate.getFullYear(), monthViewDate.getMonth() + 1, 1);
        renderMonthView();
    } else if (currentCalendarView === 'shopping') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() + 7);
        renderShoppingView();
    } else if (currentCalendarView === 'mealWeek') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() + 7);
        renderMealSections(currentCalendarView);
    } else if (currentCalendarView === 'mealDay') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() + 1);
        renderMealSections(currentCalendarView);
    }
}

function renderMealSections(viewName) {
    const sectionsEl = document.getElementById('mealPlanSections');
    if (!sectionsEl) return;

    const isDayView = viewName === 'mealDay';
    const isWeekView = viewName === 'mealWeek';
    const dates = isDayView ? [new Date(sectionFocusDate)] : getWeekDates(sectionFocusDate);
    sectionsEl.innerHTML = '';

    if (isWeekView) {
        sectionsEl.className = 'meal-plan-sections week-grid';
        dates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const dayMeals = mealPlans.filter(plan => plan.planned_date === dateStr);
            const mealsByType = {
                breakfast: dayMeals.find(m => m.meal_type === 'breakfast'),
                lunch: dayMeals.find(m => m.meal_type === 'lunch'),
                dinner: dayMeals.find(m => m.meal_type === 'dinner'),
                snacks: dayMeals.filter(m => m.meal_type === 'snack')
            };

            const col = document.createElement('div');
            col.className = 'week-column';

            // Day header
            const header = document.createElement('div');
            header.className = 'week-column-header';
            header.innerHTML = `
                <strong>${date.toLocaleDateString('en-US', { weekday: 'short' })}</strong>
                <span>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            `;
            col.appendChild(header);

            // Helper to render a snack drop zone
            function buildSnackZone(slotNote) {
                const zone = document.createElement('div');
                zone.className = 'week-snack-zone';
                zone.dataset.date = dateStr;
                zone.dataset.slotNote = slotNote;

                // Drag & drop handlers
                zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
                zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
                zone.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    zone.classList.remove('drag-over');
                    const snackId = e.dataTransfer.getData('text/plain');
                    if (snackId) {
                        try {
                            await api.updateMealPlan(parseInt(snackId), { notes: slotNote || null });
                            await loadMealPlan();
                        } catch (err) {
                            console.error('Error moving snack:', err);
                        }
                    }
                });

                // Render snacks assigned to this slot
                const matchingSnacks = mealsByType.snacks.filter(s => normalizeNote(s.notes) === normalizeNote(slotNote));
                matchingSnacks.forEach(snack => {
                    const block = document.createElement('div');
                    block.className = 'week-snack-block';
                    block.draggable = true;
                    block.dataset.snackId = snack.id;
                    block.innerHTML = `
                        <span>🍎 ${snack.recipe ? snack.recipe.title : 'Snack'}</span>
                        <div class="meal-section-actions">
                            <button class="btn-icon" type="button" data-edit="${snack.id}" title="Edit">✏️</button>
                            <button class="btn-icon" type="button" data-delete="${snack.id}" title="Delete">🗑️</button>
                        </div>
                    `;
                    block.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', String(snack.id));
                    });
                    zone.appendChild(block);
                });

                return zone;
            }

            // Only render snack zones and meal blocks that have actual content
            const hasBeforeBreakfastSnacks = mealsByType.snacks.some(s => normalizeNote(s.notes) === normalizeNote(snackSlots[0].note));
            if (hasBeforeBreakfastSnacks) {
                col.appendChild(buildSnackZone(snackSlots[0].note));
            }

            // Breakfast - only if populated
            const bfMeal = mealsByType.breakfast;
            if (bfMeal && bfMeal.recipe) {
                const bfBlock = document.createElement('div');
                bfBlock.className = 'week-meal-block';
                bfBlock.innerHTML = `
                    <div class="week-meal-label">🌅 Breakfast</div>
                    <div class="week-meal-content">
                        <strong>${bfMeal.recipe.title}</strong>
                        <div class="meal-section-actions">
                            <button class="btn-icon" type="button" data-edit="${bfMeal.id}" title="Edit">✏️</button>
                            <button class="btn-icon" type="button" data-delete="${bfMeal.id}" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
                col.appendChild(bfBlock);
            }

            const hasBfLnSnacks = mealsByType.snacks.some(s => normalizeNote(s.notes) === normalizeNote(snackSlots[1].note));
            if (hasBfLnSnacks) {
                col.appendChild(buildSnackZone(snackSlots[1].note));
            }

            // Lunch - only if populated
            const lnMeal = mealsByType.lunch;
            if (lnMeal && lnMeal.recipe) {
                const lnBlock = document.createElement('div');
                lnBlock.className = 'week-meal-block';
                lnBlock.innerHTML = `
                    <div class="week-meal-label">☀️ Lunch</div>
                    <div class="week-meal-content">
                        <strong>${lnMeal.recipe.title}</strong>
                        <div class="meal-section-actions">
                            <button class="btn-icon" type="button" data-edit="${lnMeal.id}" title="Edit">✏️</button>
                            <button class="btn-icon" type="button" data-delete="${lnMeal.id}" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
                col.appendChild(lnBlock);
            }

            const hasLnDnSnacks = mealsByType.snacks.some(s => normalizeNote(s.notes) === normalizeNote(snackSlots[2].note));
            if (hasLnDnSnacks) {
                col.appendChild(buildSnackZone(snackSlots[2].note));
            }

            // Dinner - only if populated
            const dnMeal = mealsByType.dinner;
            if (dnMeal && dnMeal.recipe) {
                const dnBlock = document.createElement('div');
                dnBlock.className = 'week-meal-block';
                dnBlock.innerHTML = `
                    <div class="week-meal-label">🌙 Dinner</div>
                    <div class="week-meal-content">
                        <strong>${dnMeal.recipe.title}</strong>
                        <div class="meal-section-actions">
                            <button class="btn-icon" type="button" data-edit="${dnMeal.id}" title="Edit">✏️</button>
                            <button class="btn-icon" type="button" data-delete="${dnMeal.id}" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
                col.appendChild(dnBlock);
            }

            const hasAfterDinnerSnacks = mealsByType.snacks.some(s => normalizeNote(s.notes) === normalizeNote(snackSlots[3].note));
            if (hasAfterDinnerSnacks) {
                col.appendChild(buildSnackZone(snackSlots[3].note));
            }

            // Anytime snacks (unmatched)
            const anytimeSnacks = mealsByType.snacks.filter(s => !snackSlots.some(slot => normalizeNote(s.notes) === normalizeNote(slot.note)));
            if (anytimeSnacks.length) {
                const anyZone = buildSnackZone('');
                anytimeSnacks.forEach(snack => {
                    const block = document.createElement('div');
                    block.className = 'week-snack-block';
                    block.draggable = true;
                    block.dataset.snackId = snack.id;
                    block.innerHTML = `
                        <span>🍎 ${snack.recipe ? snack.recipe.title : 'Snack'}</span>
                        <div class="meal-section-actions">
                            <button class="btn-icon" type="button" data-edit="${snack.id}" title="Edit">✏️</button>
                            <button class="btn-icon" type="button" data-delete="${snack.id}" title="Delete">🗑️</button>
                        </div>
                    `;
                    block.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', String(snack.id));
                    });
                    anyZone.appendChild(block);
                });
                col.appendChild(anyZone);
            }

            // Add Meal button
            const addBtn = document.createElement('button');
            addBtn.className = 'btn btn-secondary';
            addBtn.style.cssText = 'width: 100%; margin-top: 0.5rem; font-size: 0.85rem;';
            addBtn.textContent = '+ Add Meal';
            addBtn.dataset.date = dateStr;
            addBtn.dataset.action = 'add-main';
            col.appendChild(addBtn);

            sectionsEl.appendChild(col);
        });
    } else {
        // Day view - keep existing details-based layout
        sectionsEl.className = 'meal-plan-sections';
        dates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const dayMeals = mealPlans.filter(plan => plan.planned_date === dateStr);
            const mealsByType = {
                breakfast: dayMeals.find(m => m.meal_type === 'breakfast'),
                lunch: dayMeals.find(m => m.meal_type === 'lunch'),
                dinner: dayMeals.find(m => m.meal_type === 'dinner'),
                snacks: dayMeals.filter(m => m.meal_type === 'snack')
            };

            const card = document.createElement('details');
            card.className = 'meal-day-card';
            card.setAttribute('open', '');

            const header = document.createElement('summary');
            header.className = 'meal-day-summary';
            header.innerHTML = `
                <div>
                    <h3>${date.toLocaleDateString('en-US', { weekday: 'long' })}</h3>
                    <p>${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                </div>
                <button class="btn btn-secondary" type="button" data-date="${dateStr}" data-action="add-main">
                    + Add Meal
                </button>
            `;
            card.appendChild(header);

            const mealList = document.createElement('div');
            mealList.className = 'meal-day-list';

            // Only main meals (breakfast, lunch, dinner) - no snack sections
            ['breakfast', 'lunch', 'dinner'].forEach(type => {
                const mealSlot = document.createElement('details');
                mealSlot.className = 'meal-section';
                const plannedMeal = mealsByType[type];
                if (plannedMeal) {
                    mealSlot.setAttribute('open', '');
                }

                mealSlot.innerHTML = `
                    <summary class="meal-section-header">
                        <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                        <button class="btn-icon" type="button" data-date="${dateStr}" data-meal="${type}" title="Add ${type}">
                            +
                        </button>
                    </summary>
                    <div class="meal-section-body">
                        ${plannedMeal && plannedMeal.recipe ? `
                            <div class="meal-section-item">
                                <div>
                                    <strong>${plannedMeal.recipe.title}</strong>
                                    ${plannedMeal.recipe.description ? `<p>${plannedMeal.recipe.description}</p>` : ''}
                                    ${buildMealServingMeta(plannedMeal.recipe)}
                                </div>
                                <div class="meal-section-actions">
                                    <button class="btn-icon" type="button" data-edit="${plannedMeal.id}" title="Edit">✏️</button>
                                    <button class="btn-icon" type="button" data-delete="${plannedMeal.id}" title="Delete">🗑️</button>
                                </div>
                            </div>
                        ` : '<p class="meal-empty">No meal planned</p>'}
                    </div>
                `;
                mealList.appendChild(mealSlot);
            });

            // Show existing snacks as muted text list (no action buttons)
            if (mealsByType.snacks.length > 0) {
                const snackList = document.createElement('div');
                snackList.className = 'day-snack-list';
                snackList.innerHTML = `
                    <p class="day-snack-label">Snacks:</p>
                    ${mealsByType.snacks.map(s => `<p class="day-snack-item">🍎 ${s.recipe ? s.recipe.title : 'Snack'}${s.notes ? ` <em>(${s.notes})</em>` : ''}</p>`).join('')}
                `;
                mealList.appendChild(snackList);
            }

            card.appendChild(mealList);
            sectionsEl.appendChild(card);
        });
    }

    // Wire up event listeners for both views
    sectionsEl.querySelectorAll('[data-meal]').forEach(button => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await openMealPlanModal(null, button.dataset.date, button.dataset.meal);
        });
    });

    sectionsEl.querySelectorAll('[data-action="add-main"]').forEach(button => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await openMealPlanModal(null, button.dataset.date, 'breakfast');
        });
    });

    sectionsEl.querySelectorAll('[data-snack-note]').forEach(button => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const note = button.dataset.snackNote || null;
            await openMealPlanModal(null, button.dataset.date, 'snack', note);
        });
    });

    sectionsEl.querySelectorAll('[data-edit]').forEach(button => {
        button.addEventListener('click', () => {
            editMealPlanFromDay(parseInt(button.dataset.edit, 10));
        });
    });

    sectionsEl.querySelectorAll('[data-delete]').forEach(button => {
        button.addEventListener('click', () => {
            deleteMealPlanFromDay(parseInt(button.dataset.delete, 10));
        });
    });
}

function getWeekDates(referenceDate) {
    const dates = [];
    const start = new Date(referenceDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    for (let i = 0; i < 7; i += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function normalizeNote(note) {
    return (note || '').trim().toLowerCase();
}
