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
}

async function loadPantry() {
    try {
        pantryItems = await api.getPantryItems();
        displayPantry();
    } catch (error) {
        console.error('Error loading pantry:', error);
        alert('Failed to load pantry items');
    }
}

function displayPantry() {
    const container = document.getElementById('pantryList');
    if (!container) return;

    container.innerHTML = '';

    if (pantryItems.length === 0) {
        container.innerHTML = '<p>Your pantry is empty. Add some items!</p>';
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
                ${servingSize ? `<p class="pantry-card-meta">Serving size: ${servingSize}</p>` : ''}
                ${addedDate ? `<p class="pantry-card-meta">Added: ${addedDate}</p>` : ''}
                ${item.expiry_date ? `<p class="pantry-card-meta">Expires: ${new Date(item.expiry_date).toLocaleDateString()}</p>` : ''}
                ${item.barcode ? `<p class="pantry-card-meta pantry-card-meta--muted">Barcode: ${item.barcode}</p>` : ''}
            </div>
            <div class="pantry-card__right">
                ${createNutritionMiniTable(item.nutritional_info)}
            </div>
        </div>
        <div class="pantry-card-actions">
            <button class="pantry-action-btn" onclick="editPantryItem(${item.id})">Edit</button>
            <button class="pantry-action-btn" onclick="deletePantryItem(${item.id})">Delete</button>
        </div>
    `;

    return card;
}

function createNutritionMiniTable(nutrition) {
    const normalized = nutrition || {};

    return `
        <div class="nutrition-mini" role="table" aria-label="Nutrition per serving">
            <div class="nutrition-mini__header">Per serving</div>
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
        document.getElementById('pantryServingSize').value = nutrition.serving_size || '';
        document.getElementById('pantryServingsPerItem').value = nutrition.servings_per_item ?? '';
        document.getElementById('pantryCalories').value = nutrition.energy_kcal ?? '';
        document.getElementById('pantryProtein').value = nutrition.proteins ?? '';
        document.getElementById('pantryCarbs').value = nutrition.carbohydrates ?? '';
        document.getElementById('pantryFat').value = nutrition.fat ?? '';
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
        nutritional_info: buildNutritionPayload({
            calories: document.getElementById('pantryCalories').value,
            protein: document.getElementById('pantryProtein').value,
            carbs: document.getElementById('pantryCarbs').value,
            fat: document.getElementById('pantryFat').value,
            servingSize: document.getElementById('pantryServingSize').value,
            servingsPerItem: document.getElementById('pantryServingsPerItem').value
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
        alert('Failed to save pantry item: ' + error.message);
    }
}

function buildNutritionPayload(values) {
    const calories = values.calories ? parseFloat(values.calories) : null;
    const protein = values.protein ? parseFloat(values.protein) : null;
    const carbs = values.carbs ? parseFloat(values.carbs) : null;
    const fat = values.fat ? parseFloat(values.fat) : null;
    const servingsPerItem = values.servingsPerItem ? parseFloat(values.servingsPerItem) : null;
    const servingSize = values.servingSize ? values.servingSize.trim() : '';

    const hasMacroValue = [calories, protein, carbs, fat].some(value => value !== null && !Number.isNaN(value));
    const hasServingValue = Boolean(servingSize) || (servingsPerItem !== null && !Number.isNaN(servingsPerItem));

    if (!hasMacroValue && !hasServingValue) {
        return null;
    }

    const normalizedServingSize = servingSize || '1 serving';
    const normalizedServingsPerItem = Number.isNaN(servingsPerItem) || servingsPerItem === null ? 1 : servingsPerItem;

    return {
        energy_kcal: Number.isNaN(calories) || calories === null ? 0 : calories,
        proteins: Number.isNaN(protein) || protein === null ? 0 : protein,
        carbohydrates: Number.isNaN(carbs) || carbs === null ? 0 : carbs,
        fat: Number.isNaN(fat) || fat === null ? 0 : fat,
        serving_size: normalizedServingSize,
        servings_per_item: normalizedServingsPerItem
    };
}

async function editPantryItem(id) {
    const item = pantryItems.find(i => i.id === id);
    if (item) {
        openPantryModal(item);
    }
}

async function deletePantryItem(id) {
    if (!confirm('Are you sure you want to delete this pantry item?')) {
        return;
    }

    try {
        await api.deletePantryItem(id);
        loadPantry();
        if (window.loadDashboard) {
            window.loadDashboard();
        }
    } catch (error) {
        console.error('Error deleting pantry item:', error);
        alert('Failed to delete pantry item');
    }
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
