// Pantry Management

let pantryItems = [];
let pendingPantryNutrition = null;

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

    document.getElementById('pantryFetchNutritionBtn')?.addEventListener('click', async () => {
        await fetchPantryNutrition();
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
    const nutritionHtml = item.nutritional_info ? renderNutritionHighlights(item.nutritional_info) : '';

    card.innerHTML = `
        <h3 class="pantry-card-title">${item.item_name}</h3>
        ${item.quantity ? `<p class="pantry-card-info">Quantity: ${item.quantity} ${item.unit || ''}</p>` : ''}
        ${item.barcode ? `<p class="pantry-card-info">Barcode: ${item.barcode}</p>` : ''}
        ${expiryInfo}
        ${nutritionHtml}
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
    const nutritionPreview = document.getElementById('pantryNutritionPreview');

    if (item) {
        title.textContent = 'Edit Pantry Item';
        document.getElementById('pantryItemId').value = item.id;
        document.getElementById('pantryItemName').value = item.item_name;
        document.getElementById('pantryBarcode').value = item.barcode || '';
        document.getElementById('pantryQuantity').value = item.quantity || '';
        document.getElementById('pantryUnit').value = item.unit || '';
        document.getElementById('pantryExpiryDate').value = item.expiry_date || '';
        pendingPantryNutrition = item.nutritional_info || null;
    } else {
        title.textContent = 'Add Pantry Item';
        form.reset();
        document.getElementById('pantryItemId').value = '';
        pendingPantryNutrition = null;
    }

    if (nutritionPreview) {
        nutritionPreview.innerHTML = pendingPantryNutrition
            ? renderNutritionHighlights(pendingPantryNutrition)
            : '<p class="empty-state">No nutrition data yet.</p>';
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
        nutritional_info: pendingPantryNutrition
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

function renderNutritionHighlights(nutrition) {
    if (!nutrition) return '';
    const parts = [];
    if (nutrition.energy_kcal) parts.push(`🔥 ${nutrition.energy_kcal} kcal`);
    if (nutrition.proteins) parts.push(`💪 ${nutrition.proteins}g protein`);
    if (nutrition.carbohydrates) parts.push(`🍞 ${nutrition.carbohydrates}g carbs`);
    if (nutrition.fat) parts.push(`🥑 ${nutrition.fat}g fat`);
    if (!parts.length) return '';
    return `<div class="nutrition-inline">${parts.join(' • ')}</div>`;
}

async function fetchPantryNutrition() {
    const barcode = document.getElementById('pantryBarcode').value.trim();
    const name = document.getElementById('pantryItemName').value.trim();
    const preview = document.getElementById('pantryNutritionPreview');

    if (!barcode && !name) {
        if (preview) {
            preview.innerHTML = '<p class="error-message">Add a barcode or item name first.</p>';
        }
        return;
    }

    if (preview) {
        preview.innerHTML = '<p class="empty-state">Looking up nutrition...</p>';
    }

    try {
        if (barcode) {
            const data = await api.scanBarcode(barcode);
            if (data && data.nutritional_info) {
                pendingPantryNutrition = data.nutritional_info;
                if (data.name && !name) {
                    document.getElementById('pantryItemName').value = data.name;
                }
            }
        }

        if (!pendingPantryNutrition && preview) {
            preview.innerHTML = '<p class="empty-state">Nutrition data will be pulled when you save.</p>';
            return;
        }
    } catch (error) {
        console.error('Error fetching nutrition:', error);
        if (preview) {
            preview.innerHTML = '<p class="error-message">Unable to fetch nutrition data.</p>';
        }
        return;
    }

    if (preview) {
        preview.innerHTML = pendingPantryNutrition
            ? renderNutritionHighlights(pendingPantryNutrition)
            : '<p class="empty-state">Nutrition data will be pulled when you save.</p>';
    }
}

// Export functions
window.editPantryItem = editPantryItem;
window.deletePantryItem = deletePantryItem;
window.loadPantry = loadPantry;
