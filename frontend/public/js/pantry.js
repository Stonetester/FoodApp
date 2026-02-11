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

    const expiryInfo = item.expiry_date ? 
        `<p class="pantry-card-info">Expires: ${new Date(item.expiry_date).toLocaleDateString()}</p>` : '';
    const servingInfo = formatServingInfo(item);
    const nutrition = formatNutritionInfo(item.nutritional_info);

    card.innerHTML = `
        <h3 class="pantry-card-title">${item.item_name}</h3>
        ${servingInfo ? `<p class="pantry-card-info"><strong>Serving info:</strong> ${servingInfo}</p>` : ''}
        ${item.barcode ? `<p class="pantry-card-info">Barcode: ${item.barcode}</p>` : ''}
        ${expiryInfo}
        ${nutrition ? `<p class="pantry-card-info">${nutrition}</p>` : ''}
        <div class="pantry-card-actions">
            <button class="btn btn-secondary" onclick="editPantryItem(${item.id})">Edit</button>
            <button class="btn btn-secondary" onclick="deletePantryItem(${item.id})">Delete</button>
        </div>
    `;

    return card;
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
