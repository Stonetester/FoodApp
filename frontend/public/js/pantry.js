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

    card.innerHTML = `
        <h3 class="pantry-card-title">${item.item_name}</h3>
        ${item.quantity ? `<p class="pantry-card-info">Quantity: ${item.quantity} ${item.unit || ''}</p>` : ''}
        ${item.barcode ? `<p class="pantry-card-info">Barcode: ${item.barcode}</p>` : ''}
        ${expiryInfo}
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
        expiry_date: document.getElementById('pantryExpiryDate').value || null
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

// Export functions
window.editPantryItem = editPantryItem;
window.deletePantryItem = deletePantryItem;
window.loadPantry = loadPantry;

