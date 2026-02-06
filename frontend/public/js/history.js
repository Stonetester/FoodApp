// Meal History

let mealHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    setupHistoryListeners();
});

function setupHistoryListeners() {
    // Log meal button
    document.getElementById('logMealBtn')?.addEventListener('click', () => {
        openLogMealModal();
    });

    // Log meal form submission
    document.getElementById('logMealForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveLoggedMeal();
    });

    // Cancel button
    document.getElementById('cancelLogMealBtn')?.addEventListener('click', () => {
        closeLogMealModal();
    });

    // Filter button
    document.getElementById('filterHistoryBtn')?.addEventListener('click', () => {
        loadHistory();
    });
}

async function loadHistory() {
    try {
        const startDate = document.getElementById('historyStartDate')?.value;
        const endDate = document.getElementById('historyEndDate')?.value;

        mealHistory = await api.getMealHistory(startDate, endDate);
        displayHistory();
    } catch (error) {
        console.error('Error loading meal history:', error);
        alert('Failed to load meal history');
    }
}

function displayHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;

    container.innerHTML = '';

    if (mealHistory.length === 0) {
        container.innerHTML = '<p>No meal history found. Log your first meal!</p>';
        return;
    }

    mealHistory.forEach(meal => {
        container.appendChild(createHistoryItem(meal));
    });
}

function createHistoryItem(meal) {
    const item = document.createElement('div');
    item.className = 'history-item';

    const ratingStars = meal.rating ? '⭐'.repeat(meal.rating) : '';

    item.innerHTML = `
        <div class="history-item-info">
            <h3>${meal.recipe ? meal.recipe.title : 'Unknown Recipe'}</h3>
            <p><strong>Date:</strong> ${new Date(meal.consumed_date).toLocaleDateString()}</p>
            <p><strong>Meal Type:</strong> ${meal.meal_type}</p>
            ${meal.notes ? `<p><strong>Notes:</strong> ${meal.notes}</p>` : ''}
        </div>
        <div class="history-item-rating">${ratingStars}</div>
    `;

    return item;
}

async function openLogMealModal() {
    const modal = document.getElementById('logMealModal');
    const form = document.getElementById('logMealForm');

    // Load recipes for dropdown
    try {
        const recipes = await api.getRecipes();
        const select = document.getElementById('logMealRecipe');
        select.innerHTML = '<option value="">Select a recipe</option>';

        recipes.forEach(recipe => {
            const option = document.createElement('option');
            option.value = recipe.id;
            option.textContent = recipe.title;
            select.appendChild(option);
        });

        form.reset();
        document.getElementById('logMealDate').value = new Date().toISOString().split('T')[0];
    } catch (error) {
        console.error('Error loading recipes:', error);
        alert('Failed to load recipes');
        return;
    }

    modal.classList.add('active');
}

function closeLogMealModal() {
    document.getElementById('logMealModal').classList.remove('active');
}

async function saveLoggedMeal() {
    const form = document.getElementById('logMealForm');

    const mealData = {
        recipe_id: parseInt(document.getElementById('logMealRecipe').value),
        consumed_date: document.getElementById('logMealDate').value,
        meal_type: document.getElementById('logMealType').value,
        rating: document.getElementById('logMealRating').value ? parseInt(document.getElementById('logMealRating').value) : null,
        notes: document.getElementById('logMealNotes').value || null
    };

    try {
        await api.logMeal(mealData);
        closeLogMealModal();
        loadHistory();
    } catch (error) {
        console.error('Error logging meal:', error);
        alert('Failed to log meal: ' + error.message);
    }
}

// Export functions
window.loadHistory = loadHistory;

