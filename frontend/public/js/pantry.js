// Pantry Management

let pantryItems = [];

document.addEventListener('DOMContentLoaded', () => {
    setupPantryListeners();
});

function setupPantryListeners() {
    // Add pantry item button
    document.getElementById('addPantryItemBtn')?.addEventListener('click', () => {
        openPantryModal();
    });

    // Scan barcode button
    document.getElementById('scanBarcodeBtn')?.addEventListener('click', () => {
        openScanner();
    });

    // Pantry form submission
    document.getElementById('pantryForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePantryItem();
    });

    // Cancel button
    document.getElementById('cancelPantryBtn')?.addEventListener('click', () => {
        closePantryModal();
    });

    // Scan Nutrition Label button (inside pantry modal)
    document.getElementById('scanNutritionLabelBtn')?.addEventListener('click', () => {
        if (window.initNutritionLabelScanner) {
            window.initNutritionLabelScanner().catch(() => {
                // User cancelled or error already shown via alert
            });
        }
    });

    // Scan Nutrition Label button (pantry page header)
    document.getElementById('scanNutritionLabelPageBtn')?.addEventListener('click', () => {
        // Open the pantry modal first, then trigger the nutrition label scanner
        openPantryModal();
        setTimeout(() => {
            if (window.initNutritionLabelScanner) {
                window.initNutritionLabelScanner().catch(() => {});
            }
        }, 200);
    });
}

async function loadPantry() {
    try {
        pantryItems = await api.getPantryItems();
        displayPantry();
    } catch (error) {
        console.error('Error loading pantry:', error);
        if (window.showToast) window.showToast('Failed to load pantry items', 'error');
    }
}

function displayPantry() {
    const container = document.getElementById('pantryList');
    if (!container) return;

    container.innerHTML = '';

    if (pantryItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card" style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🥫</div>
                <h3 style="margin-bottom: 0.5rem;">Your pantry is empty</h3>
                <p style="color: var(--muted); margin-bottom: 1.5rem;">Scan a barcode to add your first item.</p>
                <button class="btn btn-primary" id="emptyPantryScanBtn" type="button">📷 Scan Your First Item</button>
            </div>
        `;
        document.getElementById('emptyPantryScanBtn')?.addEventListener('click', () => {
            openScanner();
        });
        return;
    }

    pantryItems.forEach(item => {
        container.appendChild(createPantryCard(item));
    });
}

function createPantryCard(item) {
    const card = document.createElement('div');
    card.className = 'pantry-card';

    const servingSize = getPantryServingSize(item);
    const addedDate = formatPantryAddedDate(item.added_at || item.created_at);

    card.innerHTML = `
        <div class="pantry-card__content">
            <div class="pantry-card__left">
                <h3 class="pantry-card-title">${item.item_name}</h3>
                ${item.category && item.category !== 'Other' ? `<span class="pantry-category-badge" data-category="${item.category}">${item.category}</span>` : ''}
                ${servingSize ? `<p class="pantry-card-meta">Serving size: ${servingSize}</p>` : ''}
                ${item.servings_per_container ? `<p class="pantry-card-meta">Servings/container: ${item.servings_per_container}</p>` : ''}
                ${item.container_type ? `<p class="pantry-card-meta">Container: ${item.container_type}</p>` : ''}
                ${addedDate ? `<p class="pantry-card-meta">Added: ${addedDate}</p>` : ''}
                ${item.expiry_date ? `<p class="pantry-card-meta">Expires: ${new Date(item.expiry_date).toLocaleDateString()}</p>` : ''}
                ${item.barcode ? `<p class="pantry-card-meta pantry-card-meta--muted">Barcode: ${item.barcode}</p>` : ''}
            </div>
            <div class="pantry-card__right">
                ${createNutritionMiniTable(item.nutritional_info, item)}
            </div>
        </div>
        <div class="pantry-card-actions">
            <button class="pantry-action-btn" onclick="editPantryItem(${item.id})">Edit</button>
            <button class="pantry-action-btn" onclick="deletePantryItem(${item.id})">Delete</button>
        </div>
    `;

    return card;
}

function createNutritionMiniTable(nutrition, item) {
    const normalized = nutrition || {};
    // Prefer item-level serving_size (descriptive text from barcode scan)
    // over the one embedded in nutritional_info
    const servingSize = (item && item.serving_size) || normalized.serving_size;
    const source = normalized._source;
    let headerText = 'Per serving';
    if (source === 'per_100g' && !servingSize) {
        headerText = 'Per 100g';
    } else if (servingSize) {
        headerText = `Per serving (${servingSize})`;
    }

    return `
        <div class="nutrition-mini" role="table" aria-label="${headerText}">
            <div class="nutrition-mini__header">${headerText}</div>
            <div class="nutrition-mini__grid">
                ${createNutritionMiniCell('Calories', normalized.energy_kcal, '')}
                ${createNutritionMiniCell('Protein', normalized.proteins, 'g')}
                ${createNutritionMiniCell('Carbs', normalized.carbohydrates, 'g')}
                ${createNutritionMiniCell('Fat', normalized.fat, 'g')}
            </div>
        </div>
    `;
}

function createNutritionMiniCell(label, value, suffix) {
    const hasValue = value !== undefined && value !== null && !Number.isNaN(Number(value));
    const displayValue = hasValue ? `${value}${suffix}` : '—';

    return `
        <div class="nutrition-mini__cell" role="row">
            <span class="nutrition-mini__label">${label}</span>
            <span class="nutrition-mini__value">${displayValue}</span>
        </div>
    `;
}

function getPantryServingSize(item) {
    // Prefer the top-level serving_size (from barcode scan / Open Food Facts)
    // which contains descriptive text like "2 cookies (30g)" or "1 cup (28g)"
    if (item.serving_size) {
        return item.serving_size;
    }
    const servingSize = item.nutritional_info?.serving_size;
    if (servingSize) {
        return servingSize;
    }
    if (item.quantity) {
        return `${item.quantity} ${item.unit || ''}`.trim();
    }
    return '';
}

function formatPantryAddedDate(isoDate) {
    if (!isoDate) return '';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return '';

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(parsed);
}

function openPantryModal(item = null) {
    const modal = document.getElementById('pantryModal');
    const form = document.getElementById('pantryForm');
    const title = document.getElementById('pantryModalTitle');

    if (item) {
        title.textContent = 'Edit Pantry Item';
        document.getElementById('pantryItemId').value = item.id;
        document.getElementById('pantryItemName').value = item.item_name;
        document.getElementById('pantryBarcode').value = item.barcode || '';
        document.getElementById('pantryQuantity').value = item.quantity || '';
        document.getElementById('pantryUnit').value = item.unit || '';
        document.getElementById('pantryExpiryDate').value = item.expiry_date || '';
        const nutrition = item.nutritional_info || {};
        document.getElementById('pantryServingSize').value = item.serving_size || nutrition.serving_size || '';
        document.getElementById('pantryServingsPerContainer').value = item.servings_per_container ?? '';
        document.getElementById('pantryCalories').value = nutrition.energy_kcal ?? '';
        document.getElementById('pantryProtein').value = nutrition.proteins ?? '';
        document.getElementById('pantryCarbs').value = nutrition.carbohydrates ?? '';
        document.getElementById('pantryFat').value = nutrition.fat ?? '';
        document.getElementById('pantrySatFat').value = nutrition.saturated_fat ?? '';
        document.getElementById('pantryTransFat').value = nutrition.trans_fat ?? '';
        document.getElementById('pantryCholesterol').value = nutrition.cholesterol ?? '';
        document.getElementById('pantrySodium').value = nutrition.sodium ?? '';
        document.getElementById('pantryFiber').value = nutrition.fiber ?? '';
        document.getElementById('pantrySugars').value = nutrition.sugars ?? '';
        document.getElementById('pantryAddedSugars').value = nutrition.added_sugars ?? '';
        document.getElementById('pantryVitaminD').value = nutrition.vitamin_d ?? '';
        document.getElementById('pantryCalcium').value = nutrition.calcium ?? '';
        document.getElementById('pantryIron').value = nutrition.iron ?? '';
        document.getElementById('pantryPotassium').value = nutrition.potassium ?? '';
        document.getElementById('pantryCategory').value = item.category || '';
        document.getElementById('pantryContainerType').value = item.container_type || '';
        document.getElementById('pantryServingsPerContainer').value = item.servings_per_container ?? '';
    } else {
        title.textContent = 'Add Pantry Item';
        form.reset();
        document.getElementById('pantryItemId').value = '';
    }

    modal.classList.add('active');
}

function closePantryModal() {
    document.getElementById('pantryModal').classList.remove('active');
}

async function savePantryItem() {
    const form = document.getElementById('pantryForm');
    const itemId = document.getElementById('pantryItemId').value;

    const itemData = {
        item_name: document.getElementById('pantryItemName').value,
        barcode: document.getElementById('pantryBarcode').value || null,
        quantity: document.getElementById('pantryQuantity').value ? parseFloat(document.getElementById('pantryQuantity').value) : null,
        unit: document.getElementById('pantryUnit').value || null,
        expiry_date: document.getElementById('pantryExpiryDate').value || null,
        category: document.getElementById('pantryCategory').value || null,
        serving_size: document.getElementById('pantryServingSize').value || null,
        servings_per_container: document.getElementById('pantryServingsPerContainer').value ? parseFloat(document.getElementById('pantryServingsPerContainer').value) : null,
        container_type: document.getElementById('pantryContainerType').value || null,
        nutritional_info: buildNutritionPayload({
            calories: document.getElementById('pantryCalories').value,
            protein: document.getElementById('pantryProtein').value,
            carbs: document.getElementById('pantryCarbs').value,
            fat: document.getElementById('pantryFat').value,
            saturated_fat: document.getElementById('pantrySatFat').value,
            trans_fat: document.getElementById('pantryTransFat').value,
            cholesterol: document.getElementById('pantryCholesterol').value,
            sodium: document.getElementById('pantrySodium').value,
            fiber: document.getElementById('pantryFiber').value,
            sugars: document.getElementById('pantrySugars').value,
            added_sugars: document.getElementById('pantryAddedSugars').value,
            vitamin_d: document.getElementById('pantryVitaminD').value,
            calcium: document.getElementById('pantryCalcium').value,
            iron: document.getElementById('pantryIron').value,
            potassium: document.getElementById('pantryPotassium').value,
            servingSize: document.getElementById('pantryServingSize').value,
            servingsPerItem: document.getElementById('pantryServingsPerContainer').value
        })
    };

    try {
        if (itemId) {
            await api.updatePantryItem(itemId, itemData);
        } else {
            await api.addPantryItem(itemData);
        }
        closePantryModal();
        loadPantry();
        if (window.loadDashboard) {
            window.loadDashboard();
        }
    } catch (error) {
        console.error('Error saving pantry item:', error);
        if (window.showToast) window.showToast('Failed to save pantry item: ' + error.message, 'error');
    }
}

function buildNutritionPayload(values) {
    const calories = values.calories ? parseFloat(values.calories) : null;
    const protein = values.protein ? parseFloat(values.protein) : null;
    const carbs = values.carbs ? parseFloat(values.carbs) : null;
    const fat = values.fat ? parseFloat(values.fat) : null;
    const saturated_fat = values.saturated_fat ? parseFloat(values.saturated_fat) : null;
    const trans_fat = values.trans_fat ? parseFloat(values.trans_fat) : null;
    const cholesterol = values.cholesterol ? parseFloat(values.cholesterol) : null;
    const sodium = values.sodium ? parseFloat(values.sodium) : null;
    const fiber = values.fiber ? parseFloat(values.fiber) : null;
    const sugars = values.sugars ? parseFloat(values.sugars) : null;
    const added_sugars = values.added_sugars ? parseFloat(values.added_sugars) : null;
    const vitamin_d = values.vitamin_d ? parseFloat(values.vitamin_d) : null;
    const calcium = values.calcium ? parseFloat(values.calcium) : null;
    const iron = values.iron ? parseFloat(values.iron) : null;
    const potassium = values.potassium ? parseFloat(values.potassium) : null;
    const servingsPerItem = values.servingsPerItem ? parseFloat(values.servingsPerItem) : null;
    const servingSize = values.servingSize ? values.servingSize.trim() : '';

    const allValues = [calories, protein, carbs, fat, saturated_fat, trans_fat, cholesterol, sodium, fiber, sugars, added_sugars, vitamin_d, calcium, iron, potassium];
    const hasMacroValue = allValues.some(v => v !== null && !Number.isNaN(v));
    const hasServingValue = Boolean(servingSize) || (servingsPerItem !== null && !Number.isNaN(servingsPerItem));

    if (!hasMacroValue && !hasServingValue) {
        return null;
    }

    function norm(v) { return (v === null || Number.isNaN(v)) ? 0 : v; }

    return {
        energy_kcal: norm(calories),
        proteins: norm(protein),
        carbohydrates: norm(carbs),
        fat: norm(fat),
        saturated_fat: norm(saturated_fat),
        trans_fat: norm(trans_fat),
        cholesterol: norm(cholesterol),
        sodium: norm(sodium),
        fiber: norm(fiber),
        sugars: norm(sugars),
        added_sugars: norm(added_sugars),
        vitamin_d: norm(vitamin_d),
        calcium: norm(calcium),
        iron: norm(iron),
        potassium: norm(potassium),
        serving_size: servingSize || '1 serving',
        servings_per_item: Number.isNaN(servingsPerItem) || servingsPerItem === null ? 1 : servingsPerItem
    };
}

function formatServingInfo(item) {
    const parts = [];
    if (item.quantity) {
        parts.push(`${item.quantity} ${item.unit || ''}`.trim());
    }
    if (item.nutritional_info?.serving_size) {
        parts.push(`Serving size: ${item.nutritional_info.serving_size}`);
    }
    if (item.nutritional_info?.servings_per_item !== undefined && item.nutritional_info?.servings_per_item !== null) {
        parts.push(`Servings/item: ${item.nutritional_info.servings_per_item}`);
    }
    return parts.length ? parts.join(' • ') : '';
}

function formatNutritionInfo(nutrition) {
    if (!nutrition) return '';
    const parts = [];
    if (nutrition.energy_kcal !== undefined && nutrition.energy_kcal !== null) parts.push(`${nutrition.energy_kcal} calories`);
    if (nutrition.proteins !== undefined && nutrition.proteins !== null) parts.push(`${nutrition.proteins}g protein`);
    if (nutrition.carbohydrates !== undefined && nutrition.carbohydrates !== null) parts.push(`${nutrition.carbohydrates}g carbs`);
    if (nutrition.fat !== undefined && nutrition.fat !== null) parts.push(`${nutrition.fat}g fat`);
    return parts.length ? `Nutrition (per serving): ${parts.join(' • ')}` : '';
}

async function editPantryItem(id) {
    const item = pantryItems.find(i => i.id === id);
    if (item) {
        openPantryModal(item);
    }
}

function deletePantryItem(id) {
    const doDelete = async () => {
        try {
            await api.deletePantryItem(id);
            loadPantry();
            if (window.loadDashboard) {
                window.loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting pantry item:', error);
            if (window.showToast) window.showToast('Failed to delete pantry item', 'error');
        }
    };
    window.showConfirm('Remove this item from your pantry?', doDelete, 'Remove');
}

function openScanner() {
    const modal = document.getElementById('scannerModal');
    modal.classList.add('active');
    
    // Initialize scanner will be handled by scanner.js
    if (window.initScanner) {
        window.initScanner();
    }
}

// Export functions
window.editPantryItem = editPantryItem;
window.deletePantryItem = deletePantryItem;
window.loadPantry = loadPantry;
window.openPantryModal = openPantryModal;
window.openScanner = openScanner;
