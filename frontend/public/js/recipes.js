// Recipe Management

let recipes = [];
let currentFilters = { search: '', tags: [] };
let selectedRecipeImageFiles = [];

document.addEventListener('DOMContentLoaded', () => {
    setupRecipeListeners();
});

function setupRecipeListeners() {
    // Add recipe button
    document.getElementById('addRecipeBtn')?.addEventListener('click', () => {
        openRecipeModal();
    });

    // Import from URL button
    document.getElementById('importUrlBtn')?.addEventListener('click', () => {
        openImportUrlModal();
    });

    // Import from Image button
    document.getElementById('importImageBtn')?.addEventListener('click', () => {
        openImportImageModal();
    });

    // Import URL form
    document.getElementById('importUrlForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await importRecipeFromUrl();
    });

    // Import Image form
    document.getElementById('importImageForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await importRecipeFromImage();
    });

    // Cancel buttons
    document.getElementById('cancelImportUrlBtn')?.addEventListener('click', () => {
        document.getElementById('importUrlModal').classList.remove('active');
    });

    document.getElementById('cancelImportImageBtn')?.addEventListener('click', () => {
        document.getElementById('importImageModal').classList.remove('active');
    });

    // Image source buttons
    document.getElementById('takePhotoBtn')?.addEventListener('click', () => {
        document.getElementById('recipeImageCamera')?.click();
    });

    document.getElementById('choosePhotoBtn')?.addEventListener('click', () => {
        document.getElementById('recipeImageLibrary')?.click();
    });

    // Image preview
    document.getElementById('recipeImageCamera')?.addEventListener('change', (e) => {
        handleRecipeImageSelection([...e.target.files]);
    });

    document.getElementById('recipeImageLibrary')?.addEventListener('change', (e) => {
        handleRecipeImageSelection([...e.target.files]);
    });

    // Recipe photo buttons
    document.getElementById('captureRecipePhotoBtn')?.addEventListener('click', () => {
        document.getElementById('recipePhotoCamera')?.click();
    });

    document.getElementById('uploadRecipePhotoBtn')?.addEventListener('click', () => {
        document.getElementById('recipePhotoLibrary')?.click();
    });

    document.getElementById('recipePhotoCamera')?.addEventListener('change', (e) => {
        handleRecipePhotoSelection(e.target.files[0]);
    });

    document.getElementById('recipePhotoLibrary')?.addEventListener('change', (e) => {
        handleRecipePhotoSelection(e.target.files[0]);
    });

    // Recipe form submission
    document.getElementById('recipeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveRecipe();
    });

    // Cancel button
    document.getElementById('cancelRecipeBtn')?.addEventListener('click', () => {
        closeRecipeModal();
    });

    // Add ingredient button
    document.getElementById('addIngredientBtn')?.addEventListener('click', () => {
        addIngredientField();
    });

    // Scan nutrition label for recipe
    document.getElementById('scanRecipeNutritionLabelBtn')?.addEventListener('click', async () => {
        if (typeof window.initNutritionLabelScannerForRecipe !== 'function') {
            if (window.showToast) window.showToast('Nutrition label scanner is not available.', 'info');
            return;
        }
        try {
            await window.initNutritionLabelScannerForRecipe();
        } catch (err) {
            // User cancelled or error - already handled
        }
    });

    // Search input
    document.getElementById('recipeSearch')?.addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        loadRecipes();
    });

    // Tag filters
    document.querySelectorAll('.tag-filters input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateTagFilters();
        });
    });
}

function updateTagFilters() {
    currentFilters.tags = Array.from(document.querySelectorAll('.tag-filters input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    loadRecipes();
}

async function loadRecipes() {
    try {
        recipes = await api.getRecipes(currentFilters);
        displayRecipes();
    } catch (error) {
        console.error('Error loading recipes:', error);
        if (window.showToast) window.showToast('Failed to load recipes', 'error');
    }
}

function displayRecipes() {
    const container = document.getElementById('recipesList');
    if (!container) return;

    container.innerHTML = '';

    if (recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card" style="grid-column: 1/-1; text-align: center; padding: 3rem 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📖</div>
                <h3 style="margin-bottom: 0.5rem;">No recipes found</h3>
                <p style="color: var(--muted); margin-bottom: 1.5rem;">Browse the community to discover recipes.</p>
                <button class="btn btn-primary page-link" type="button" data-page="userSearch">Browse Community Recipes</button>
            </div>
        `;
        container.querySelector('.page-link')?.addEventListener('click', () => {
            if (window.navigateToPage) window.navigateToPage('userSearch');
        });
        return;
    }

    recipes.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe));
    });
}

// Dietary tag emoji map
const DIETARY_TAG_ICONS = {
    'vegan': '🌱',
    'vegetarian': '🥦',
    'gluten-free': '🌾',
    'dairy-free': '🥛',
    'nut-free': '🥜',
    'high-protein': '💪',
    'low-carb': '⬇️',
    'keto': '🥑',
    'paleo': '🦴',
};

function buildRecipeNutritionStrip(recipe) {
    const nutrition = getRecipeNutrition(recipe);
    if (!nutrition) return '';
    const cal = nutrition.energy_kcal != null ? `${nutrition.energy_kcal}` : '—';
    const prot = nutrition.proteins != null ? `${nutrition.proteins}g` : '—';
    const carbs = nutrition.carbohydrates != null ? `${nutrition.carbohydrates}g` : '—';
    const fat = nutrition.fat != null ? `${nutrition.fat}g` : '—';
    if (cal === '—' && prot === '—' && carbs === '—' && fat === '—') return '';
    return `
        <div class="recipe-nutrition-strip" aria-label="Nutrition per serving">
            <div class="recipe-nutrition-cell">
                <span class="recipe-nutrition-cell__value">${cal}</span>
                <span class="recipe-nutrition-cell__label">Cal</span>
            </div>
            <div class="recipe-nutrition-cell">
                <span class="recipe-nutrition-cell__value">${prot}</span>
                <span class="recipe-nutrition-cell__label">Protein</span>
            </div>
            <div class="recipe-nutrition-cell">
                <span class="recipe-nutrition-cell__value">${carbs}</span>
                <span class="recipe-nutrition-cell__label">Carbs</span>
            </div>
            <div class="recipe-nutrition-cell">
                <span class="recipe-nutrition-cell__value">${fat}</span>
                <span class="recipe-nutrition-cell__label">Fat</span>
            </div>
        </div>
    `;
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const tagsHtml = recipe.tags.map(tag => {
        const icon = DIETARY_TAG_ICONS[tag.toLowerCase()] || '';
        return `<span class="recipe-tag">${icon ? icon + ' ' : ''}${tag}</span>`;
    }).join('');

    const nutritionStrip = buildRecipeNutritionStrip(recipe);

    card.innerHTML = `
        ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-card-image" onerror="this.style.display='none'">` : ''}
        <div class="recipe-card-content">
            ${tagsHtml ? `<div class="recipe-card-tags recipe-card-tags--top">${tagsHtml}</div>` : ''}
            <h3 class="recipe-card-title">${recipe.title}</h3>
            ${nutritionStrip}
            <p class="recipe-card-description">${recipe.description || ''}</p>
            ${recipe.source_url ? `<p class="recipe-card-source"><a href="${recipe.source_url}" target="_blank" rel="noopener noreferrer">🔗 Original recipe</a></p>` : ''}
            <div class="recipe-card-rating">
                ${buildRecipeRatingDisplay(recipe)}
            </div>
            <div class="recipe-card-actions">
                <button class="btn-icon" type="button" data-action="view" title="View recipe">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
                <button class="btn-icon" type="button" data-action="edit" title="Edit recipe">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                </button>
                <button class="btn-icon" type="button" data-action="delete" title="Delete recipe">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 6h18"/>
                        <path d="M8 6V4h8v2"/>
                        <path d="M6 6l1 14h10l1-14"/>
                    </svg>
                </button>
                <button class="btn-icon" type="button" data-action="share" title="Share QR">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 4h6v6H4z"/>
                        <path d="M14 4h6v6h-6z"/>
                        <path d="M4 14h6v6H4z"/>
                        <path d="M14 14h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    const viewBtn = card.querySelector('[data-action="view"]');
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    const shareBtn = card.querySelector('[data-action="share"]');

    viewBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        viewRecipeDetail(recipe.id);
    });
    editBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        editRecipe(recipe.id);
    });
    deleteBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteRecipe(recipe.id);
    });
    shareBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        shareRecipeQR(recipe.id);
    });

    return card;
}

function getRecipeNutrition(recipe) {
    if (!recipe) return null;
    if (recipe.nutrition) return recipe.nutrition;
    return getNutritionFromIngredients(recipe.ingredients || []);
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

function buildRecipeServingAndNutritionMeta(recipe) {
    const meta = [];
    const servings = parseInt(recipe.servings) || 1;
    if (recipe.servings) {
        meta.push(`🍽️ ${recipe.servings} servings`);
    }

    const nutrition = getRecipeNutrition(recipe);
    if (nutrition?.serving_size) {
        meta.push(`Serving size: ${nutrition.serving_size}`);
    }
    const nutritionSummary = formatNutritionPerServing(nutrition);
    if (nutritionSummary) {
        meta.push(`Per serving: ${nutritionSummary}`);
    }
    if (nutrition?.energy_kcal && servings > 1) {
        const totalCal = Math.round(nutrition.energy_kcal * servings);
        meta.push(`Total meal: ${totalCal} calories`);
    }

    return meta.map(item => `<p class="recipe-card-info">${item}</p>`).join('');
}

function buildRecipeRatingDisplay(recipe) {
    if (recipe.average_rating) {
        const rating = recipe.average_rating;
        const count = recipe.rating_count || 0;
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= Math.round(rating) ? '<span class="recipe-rating-star filled">★</span>' : '<span class="recipe-rating-star empty">☆</span>';
        }
        return `<span class="recipe-rating-stars">${stars}</span> <span class="recipe-rating-text">${rating} (${count} ${count === 1 ? 'review' : 'reviews'})</span>`;
    }
    return '<span class="recipe-rating-stars"><span class="recipe-rating-star empty">☆</span><span class="recipe-rating-star empty">☆</span><span class="recipe-rating-star empty">☆</span><span class="recipe-rating-star empty">☆</span><span class="recipe-rating-star empty">☆</span></span> <span class="recipe-rating-text">No ratings yet</span>';
}

function openRecipeModal(recipe = null) {
    console.log('=== openRecipeModal CALLED ===');
    console.log('Recipe parameter:', recipe);
    console.log('Recipe type:', typeof recipe);
    console.log('Recipe is null?', recipe === null);
    console.log('Recipe keys:', recipe ? Object.keys(recipe) : 'null');
    
    const modal = document.getElementById('recipeModal');
    const form = document.getElementById('recipeForm');
    const title = document.getElementById('modalTitle');
    const photoPreview = document.getElementById('recipePhotoPreview');
    
    console.log('Modal element:', modal);
    console.log('Form element:', form);
    console.log('Title element:', title);
    
    if (!modal) {
        console.error('ERROR: recipeModal element not found!');
        return;
    }
    
    // Helper function to set placeholder if value is empty
    function setFieldWithPlaceholder(fieldId, value, placeholder) {
        const field = document.getElementById(fieldId);
        console.log(`Setting field ${fieldId}:`, { value, placeholder, hasValue: !!(value && value !== null && value !== '') });
        if (!field) {
            console.error(`Field ${fieldId} not found!`);
            return;
        }
        if (value && value !== null && value !== '') {
            field.value = value;
            field.style.color = 'var(--text)';
            field.placeholder = '';
            field.classList.remove('placeholder-text');
            console.log(`Field ${fieldId} set to:`, value);
        } else {
            field.value = '';
            field.style.color = '#999';
            field.style.fontStyle = 'italic';
            field.placeholder = placeholder;
            field.classList.add('placeholder-text');
            console.log(`Field ${fieldId} set to placeholder:`, placeholder);
        }
    }
    
    // Reset field styles when user starts typing
    function setupPlaceholderHandlers() {
        ['recipeDescription', 'recipePrepTime', 'recipeCookTime', 'recipeServings', 'recipeInstructions'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('focus', function() {
                    if (this.classList.contains('placeholder-text')) {
                        this.value = '';
                        this.style.color = 'var(--text)';
                        this.style.fontStyle = 'normal';
                        this.classList.remove('placeholder-text');
                    }
                });
                field.addEventListener('input', function() {
                    if (this.value) {
                        this.style.color = 'var(--text)';
                        this.style.fontStyle = 'normal';
                        this.classList.remove('placeholder-text');
                    }
                });
            }
        });
    }
    
    if (recipe) {
        console.log('=== POPULATING RECIPE FORM ===');
        console.log('Recipe has ID?', !!recipe.id);
        console.log('Recipe data:', {
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            instructions: recipe.instructions,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            ingredients_count: recipe.ingredients ? recipe.ingredients.length : 0
        });
        
        // We have recipe data - either editing existing or importing new
        if (recipe.id) {
            console.log('Editing existing recipe, ID:', recipe.id);
            title.textContent = 'Edit Recipe';
            document.getElementById('recipeId').value = recipe.id;
        } else {
            console.log('Adding new recipe (imported)');
            title.textContent = 'Add Recipe';
            document.getElementById('recipeId').value = '';
        }
        
        // Populate all fields with recipe data
        console.log('Populating title field...');
        const titleField = document.getElementById('recipeTitle');
        if (titleField) {
            titleField.value = recipe.title || '';
            console.log('Title field set to:', titleField.value);
        } else {
            console.error('Title field not found!');
        }
        
        console.log('Populating other fields...');
        setFieldWithPlaceholder('recipeDescription', recipe.description, 'No description found');
        setFieldWithPlaceholder('recipePrepTime', recipe.prep_time, 'No prep time found');
        setFieldWithPlaceholder('recipeCookTime', recipe.cook_time, 'No cook time found');
        setFieldWithPlaceholder('recipeServings', recipe.servings, 'No servings found');
        setFieldWithPlaceholder('recipeInstructions', recipe.instructions, 'No instructions found');
        
        const imageUrlField = document.getElementById('recipeImageUrl');
        if (imageUrlField) {
            imageUrlField.value = recipe.image_url || '';
        }
        const sourceUrlField = document.getElementById('recipeSourceUrl');
        if (sourceUrlField) {
            sourceUrlField.value = recipe.source_url || '';
        }
        if (photoPreview) {
            if (recipe.image_url) {
                photoPreview.src = recipe.image_url;
                photoPreview.hidden = false;
            } else {
                photoPreview.hidden = true;
                photoPreview.src = '';
            }
        }

        // Load nutrition data if present
        const nutrition = recipe.nutrition || getNutritionFromIngredients(recipe.ingredients || []);
        setNutritionFields(nutrition);

        // Set serving_size from recipe-level field if available
        if (recipe.serving_size) {
            document.getElementById('recipeNutritionServingSize').value = recipe.serving_size;
        }

        // Load ingredients
        console.log('Loading ingredients...');
        const ingredientsList = document.getElementById('ingredientsList');
        if (ingredientsList) {
            ingredientsList.innerHTML = '';
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                console.log(`Adding ${recipe.ingredients.length} ingredients...`);
                recipe.ingredients.filter(ing => !isNutritionIngredient(ing)).forEach((ing, index) => {
                    console.log(`Adding ingredient ${index + 1}:`, ing);
                    addIngredientField(ing);
                });
            } else {
                console.log('No ingredients found, adding empty field');
                // If no ingredients, add at least one empty field
                addIngredientField();
            }
        } else {
            console.error('Ingredients list element not found!');
        }

        // Load tags
        const tagCheckboxes = document.querySelectorAll('.tag-inputs input[type="checkbox"]');
        console.log(`Found ${tagCheckboxes.length} tag checkboxes`);
        tagCheckboxes.forEach(cb => {
            cb.checked = recipe.tags && recipe.tags.includes(cb.value);
        });
        
        console.log('=== FORM POPULATION COMPLETE ===');
    } else {
        console.log('No recipe data, resetting form');
        // No recipe data - fresh form
        title.textContent = 'Add Recipe';
        form.reset();
        document.getElementById('recipeId').value = '';
        document.getElementById('recipeSourceUrl').value = '';
        document.getElementById('ingredientsList').innerHTML = '';
        // Add one empty ingredient field
        addIngredientField();
        // Clear placeholders
        document.getElementById('recipeDescription').placeholder = '';
        document.getElementById('recipePrepTime').placeholder = '';
        document.getElementById('recipeCookTime').placeholder = '';
        document.getElementById('recipeServings').placeholder = '';
        document.getElementById('recipeInstructions').placeholder = '';
        setNutritionFields({});
        document.querySelectorAll('.tag-inputs input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        if (photoPreview) {
            photoPreview.hidden = true;
            photoPreview.src = '';
        }
    }

    console.log('Showing modal...');
    modal.classList.add('active');
    console.log('Modal active classes:', modal.classList.toString());
    console.log('Modal is visible?', modal.classList.contains('active'));
    
    // Set up placeholder handlers
    setupPlaceholderHandlers();
    console.log('=== openRecipeModal COMPLETE ===');
}

function closeRecipeModal() {
    document.getElementById('recipeModal').classList.remove('active');
}

function stripTrailingPriceAnnotation(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    return text.replace(/\s*\(\s*\$\s*\d+(?:\.\d{1,2})?\s*\)\s*$/, '').trim();
}

function addIngredientField(ingredient = null) {
    const container = document.getElementById('ingredientsList');
    const div = document.createElement('div');
    div.className = 'ingredient-item';

    div.innerHTML = `
        <input type="text" placeholder="Ingredient name" class="ingredient-name" value="${stripTrailingPriceAnnotation(ingredient?.ingredient_name || '')}" required>
        <input type="number" step="0.01" placeholder="Quantity" class="ingredient-quantity" value="${ingredient?.quantity || ''}">
        <input type="text" placeholder="Unit" class="ingredient-unit" value="${ingredient?.unit || ''}">
        <button type="button" class="btn-icon" onclick="this.parentElement.remove()">🗑️</button>
    `;

    container.appendChild(div);
}

function isNutritionIngredient(ingredient) {
    return ingredient?.ingredient_name === '__nutrition__';
}

function getNutritionFromIngredients(ingredients = []) {
    const nutritionItem = ingredients.find(ing => isNutritionIngredient(ing));
    if (nutritionItem?.nutritional_info && Object.keys(nutritionItem.nutritional_info).length > 0) {
        return nutritionItem.nutritional_info;
    }
    // Fallback: sum individual ingredient nutrition
    const keys = ['energy_kcal', 'fat', 'saturated_fat', 'trans_fat', 'cholesterol', 'sodium', 'carbohydrates', 'fiber', 'sugars', 'added_sugars', 'proteins', 'vitamin_d', 'calcium', 'iron', 'potassium', 'salt'];
    const totals = {};
    let found = false;
    for (const ing of ingredients) {
        if (isNutritionIngredient(ing)) continue;
        const info = ing.nutritional_info;
        if (!info || typeof info !== 'object') continue;
        for (const k of keys) {
            const v = parseFloat(info[k]);
            if (!isNaN(v)) {
                totals[k] = (totals[k] || 0) + v;
                found = true;
            }
        }
    }
    if (!found) return {};
    for (const k of keys) {
        if (totals[k] !== undefined) {
            totals[k] = Math.round(totals[k] * 10) / 10;
        }
    }
    return totals;
}

function setNutritionFields(nutrition = {}) {
    document.getElementById('recipeCalories').value = nutrition.energy_kcal ?? '';
    document.getElementById('recipeProtein').value = nutrition.proteins ?? '';
    document.getElementById('recipeCarbs').value = nutrition.carbohydrates ?? '';
    document.getElementById('recipeFat').value = nutrition.fat ?? '';
    document.getElementById('recipeSatFat').value = nutrition.saturated_fat ?? '';
    document.getElementById('recipeTransFat').value = nutrition.trans_fat ?? '';
    document.getElementById('recipeCholesterol').value = nutrition.cholesterol ?? '';
    document.getElementById('recipeSodium').value = nutrition.sodium ?? '';
    document.getElementById('recipeFiber').value = nutrition.fiber ?? '';
    document.getElementById('recipeSugars').value = nutrition.sugars ?? '';
    document.getElementById('recipeAddedSugars').value = nutrition.added_sugars ?? '';
    document.getElementById('recipeVitaminD').value = nutrition.vitamin_d ?? '';
    document.getElementById('recipeCalcium').value = nutrition.calcium ?? '';
    document.getElementById('recipeIron').value = nutrition.iron ?? '';
    document.getElementById('recipePotassium').value = nutrition.potassium ?? '';
    document.getElementById('recipeNutritionServingSize').value = nutrition.serving_size ?? '';
}

function buildRecipeNutrition() {
    const fields = {
        energy_kcal: document.getElementById('recipeCalories').value,
        proteins: document.getElementById('recipeProtein').value,
        carbohydrates: document.getElementById('recipeCarbs').value,
        fat: document.getElementById('recipeFat').value,
        saturated_fat: document.getElementById('recipeSatFat').value,
        trans_fat: document.getElementById('recipeTransFat').value,
        cholesterol: document.getElementById('recipeCholesterol').value,
        sodium: document.getElementById('recipeSodium').value,
        fiber: document.getElementById('recipeFiber').value,
        sugars: document.getElementById('recipeSugars').value,
        added_sugars: document.getElementById('recipeAddedSugars').value,
        vitamin_d: document.getElementById('recipeVitaminD').value,
        calcium: document.getElementById('recipeCalcium').value,
        iron: document.getElementById('recipeIron').value,
        potassium: document.getElementById('recipePotassium').value,
    };
    const servingSize = document.getElementById('recipeNutritionServingSize').value.trim();

    const parsed = {};
    let hasMacroValue = false;
    for (const [key, val] of Object.entries(fields)) {
        const num = val ? parseFloat(val) : null;
        parsed[key] = num;
        if (num !== null && !Number.isNaN(num)) hasMacroValue = true;
    }

    const hasValue = hasMacroValue || Boolean(servingSize);
    if (!hasValue) return null;

    const result = {};
    for (const [key, num] of Object.entries(parsed)) {
        result[key] = (num === null || Number.isNaN(num)) ? 0 : num;
    }
    result.serving_size = servingSize || '1 serving';
    return result;
}

let _recipeSaving = false;

async function saveRecipe() {
    // Prevent duplicate saves from button spamming
    if (_recipeSaving) return;

    const form = document.getElementById('recipeForm');
    const recipeId = document.getElementById('recipeId').value;
    const titleField = document.getElementById('recipeTitle');

    // Validate title
    if (!titleField.value || !titleField.value.trim()) {
        if (window.showToast) window.showToast('Please enter a recipe title', 'info');
        titleField.focus();
        return;
    }

    // Lock saving and show overlay
    _recipeSaving = true;
    const saveBtn = document.getElementById('saveRecipeBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.dataset.originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
    }
    showSavingOverlay(true);

    // Collect ingredients (only if they have a name)
    const ingredients = [];
    document.querySelectorAll('.ingredient-item').forEach(item => {
        const name = item.querySelector('.ingredient-name').value;
        const quantity = item.querySelector('.ingredient-quantity').value;
        const unit = item.querySelector('.ingredient-unit').value;

        if (name && name.trim()) {
            ingredients.push({
                ingredient_name: stripTrailingPriceAnnotation(name.trim()),
                quantity: quantity && quantity.trim() ? parseFloat(quantity) : null,
                unit: unit && unit.trim() ? unit.trim() : null
            });
        }
    });

    const nutrition = buildRecipeNutrition();
    if (nutrition) {
        ingredients.push({
            ingredient_name: '__nutrition__',
            nutritional_info: nutrition
        });
    }

    // Collect tags
    const tags = Array.from(document.querySelectorAll('.tag-inputs input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    // Get field values, but only include non-empty/non-placeholder values
    const descriptionField = document.getElementById('recipeDescription');
    const prepTimeField = document.getElementById('recipePrepTime');
    const cookTimeField = document.getElementById('recipeCookTime');
    const servingsField = document.getElementById('recipeServings');
    const instructionsField = document.getElementById('recipeInstructions');
    const imageUrlField = document.getElementById('recipeImageUrl');

    const sourceUrlField = document.getElementById('recipeSourceUrl');
    const recipeData = {
        title: titleField.value.trim(),
        description: descriptionField.value && !descriptionField.classList.contains('placeholder-text') ? descriptionField.value.trim() : null,
        prep_time: prepTimeField.value && !prepTimeField.classList.contains('placeholder-text') && prepTimeField.value.trim() ? parseInt(prepTimeField.value) : null,
        cook_time: cookTimeField.value && !cookTimeField.classList.contains('placeholder-text') && cookTimeField.value.trim() ? parseInt(cookTimeField.value) : null,
        servings: servingsField.value && !servingsField.classList.contains('placeholder-text') && servingsField.value.trim() ? parseInt(servingsField.value) : null,
        instructions: instructionsField.value && !instructionsField.classList.contains('placeholder-text') ? instructionsField.value.trim() : null,
        image_url: imageUrlField.value && imageUrlField.value.trim() ? imageUrlField.value.trim() : null,
        source_url: sourceUrlField && sourceUrlField.value.trim() ? sourceUrlField.value.trim() : null,
        ingredients: ingredients,
        tags: tags,
        serving_size: document.getElementById('recipeNutritionServingSize').value.trim() || null
    };

    try {
        const recipeIdValue = recipeId && recipeId.trim() ? recipeId : null;
        let savedRecipe;
        if (recipeIdValue) {
            savedRecipe = await api.updateRecipe(parseInt(recipeIdValue), recipeData);
        } else {
            savedRecipe = await api.createRecipe(recipeData);
        }
        showSavingOverlay(false);
        closeRecipeModal();
        await loadRecipes();
        if (window.loadDashboard) {
            window.loadDashboard();
        }
        // Show confirmation toast
        showSaveConfirmation(recipeData.title || 'Recipe');
    } catch (error) {
        console.error('Error saving recipe:', error);
        let errorMsg = 'Failed to save recipe';
        if (error.message) {
            errorMsg += ': ' + error.message;
        }
        if (window.showToast) window.showToast(errorMsg, 'error');
    } finally {
        // Always unlock saving state
        _recipeSaving = false;
        showSavingOverlay(false);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = saveBtn.dataset.originalText || 'Save Recipe';
        }
    }
}

function showSavingOverlay(show) {
    let overlay = document.getElementById('recipeSavingOverlay');
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'recipeSavingOverlay';
            overlay.className = 'recipe-saving-overlay';
            overlay.innerHTML = '<div class="recipe-saving-content"><div class="loading"></div><p>Saving recipe...</p></div>';
            const modalContent = document.querySelector('#recipeModal .modal-content');
            if (modalContent) {
                modalContent.appendChild(overlay);
            }
        }
        overlay.classList.add('active');
    } else {
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
}

function showSaveConfirmation(recipeName) {
    // Remove existing toast if any
    const existing = document.querySelector('.recipe-save-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'recipe-save-toast';
    toast.innerHTML = `<span>Recipe "${recipeName}" saved!</span>`;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function viewRecipeDetail(id) {
    try {
        const recipe = await api.getRecipe(id);
        const isOtherUser = recipe.is_owner === false;
        if (typeof showRecipeDetailModal === 'function') {
            showRecipeDetailModal(recipe, isOtherUser);
        } else {
            openRecipeModal(recipe);
        }
    } catch (error) {
        console.error('Error loading recipe:', error);
        if (window.showToast) window.showToast('Failed to load recipe', 'error');
    }
}

async function editRecipe(id) {
    try {
        // Fetch the recipe data
        const recipe = await api.getRecipe(id);
        
        // Open the modal with the recipe data
        openRecipeModal(recipe);
    } catch (error) {
        console.error('Error loading recipe for edit:', error);
        if (window.showToast) window.showToast('Failed to load recipe', 'error');
    }
}

function deleteRecipe(id) {
    const doDelete = async () => {
        try {
            await api.deleteRecipe(id);
            loadRecipes();
            if (window.loadDashboard) {
                window.loadDashboard();
            }
            if (window.loadMealPlan) {
                window.loadMealPlan();
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            if (window.showToast) window.showToast('Failed to delete recipe', 'error');
        }
    };
    if (window.showConfirm) {
        window.showConfirm('Delete this recipe permanently?', doDelete);
    } else {
        if (confirm('Are you sure you want to delete this recipe?')) doDelete();
    }
}

async function shareRecipeQR(id) {
    try {
        const result = await api.getRecipeQR(id);
        const modal = document.getElementById('qrModal');
        const container = document.getElementById('qrCodeContainer');

        container.innerHTML = `
            <img src="data:image/png;base64,${result.qr_code}" alt="Recipe QR Code">
            ${result.recipe_url ? `<p style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text); word-break: break-all; text-align: center;"><a href="${result.recipe_url}" style="color: var(--primary);">${result.recipe_url}</a></p>` : ''}
            ${result.source_url ? `<p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text); word-break: break-all; text-align: center;"><a href="${result.source_url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">🔗 Original recipe: ${result.source_url}</a></p>` : ''}
        `;
        modal.classList.add('active');
    } catch (error) {
        console.error('Error generating QR code:', error);
        if (window.showToast) window.showToast('Failed to generate QR code', 'error');
    }
}

async function openImportUrlModal() {
    const modal = document.getElementById('importUrlModal');
    document.getElementById('recipeUrl').value = '';
    document.getElementById('importUrlResult').innerHTML = '';
    modal.classList.add('active');
}

async function importRecipeFromUrl() {
    const url = document.getElementById('recipeUrl').value;
    const resultDiv = document.getElementById('importUrlResult');
    
    if (!url) {
        resultDiv.innerHTML = '<p class="error-message">Please enter a URL</p>';
        return;
    }

    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        resultDiv.innerHTML = '<p class="error-message">Please enter a valid URL (must start with http:// or https://)</p>';
        return;
    }

    resultDiv.innerHTML = '<p style="text-align: center;">Extracting recipe from URL... This may take a moment.</p>';

    try {
        const recipeData = await api.importRecipeFromUrl(url);
        
        console.log('Received recipe data from backend:', recipeData);
        
        if (recipeData) {
            // Check for error in response
            if (recipeData.error) {
                resultDiv.innerHTML = `<p class="error-message">${recipeData.error}</p>`;
                return;
            }
            
            // Check if we got a title (even if it's a default)
            if (recipeData.title) {
                // Close import modal
                document.getElementById('importUrlModal').classList.remove('active');
                
                // Show warning if present
                if (recipeData._warning) {
                    if (window.showToast) window.showToast(recipeData._warning, 'info');
                }
                
                // Ensure ingredients is an array
                let ingredients = recipeData.ingredients || [];
                if (!Array.isArray(ingredients)) {
                    ingredients = [];
                }
                
                console.log('Opening recipe modal with:', {
                    title: recipeData.title,
                    description: recipeData.description,
                    instructions: recipeData.instructions,
                    prep_time: recipeData.prep_time,
                    cook_time: recipeData.cook_time,
                    servings: recipeData.servings,
                    nutrition: recipeData.nutrition,
                    ingredients: ingredients
                });
                
                // Open recipe modal with imported data (no ID = new recipe)
                openRecipeModal({
                    id: undefined,  // Explicitly set to undefined for new recipe
                    title: recipeData.title || 'Imported Recipe',
                    description: recipeData.description || null,
                    instructions: recipeData.instructions || null,
                    prep_time: recipeData.prep_time || null,
                    cook_time: recipeData.cook_time || null,
                    servings: recipeData.servings || null,
                    nutrition: recipeData.nutrition || null,
                    image_url: recipeData.image_url || null,
                    source_url: recipeData.source_url || url,
                    ingredients: ingredients,
                    tags: recipeData.tags || []
                });
            } else {
                resultDiv.innerHTML = '<p class="error-message">Could not extract recipe from URL. The page may not contain recipe data, or it may be in an unsupported format. Please try another URL or add manually.</p>';
            }
        } else {
            resultDiv.innerHTML = '<p class="error-message">Could not extract recipe from URL. The page may not contain recipe data, or it may be in an unsupported format. Please try another URL or add manually.</p>';
        }
    } catch (error) {
        console.error('Error importing from URL:', error);
        let errorMsg = 'Error importing recipe';
        if (error.message && error.message.includes('JSON')) {
            errorMsg = 'Error: Invalid response from server. The URL may not be accessible or may not contain recipe data.';
        } else if (error.message) {
            errorMsg = `Error: ${error.message}`;
        }
        resultDiv.innerHTML = `<p class="error-message">${errorMsg}</p>`;
    }
}

function openImportImageModal() {
    const modal = document.getElementById('importImageModal');
    document.getElementById('recipeImageCamera').value = '';
    document.getElementById('recipeImageLibrary').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('importImageResult').innerHTML = '';
    selectedRecipeImageFiles = [];
    modal.classList.add('active');
}

function handleRecipeImageSelection(files) {
    const preview = document.getElementById('imagePreview');
    const resultDiv = document.getElementById('importImageResult');

    if (resultDiv) resultDiv.innerHTML = '';
    if (!files || files.length === 0) return;

    const errors = [];
    const valid = [];
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            errors.push(`${file.name}: not an image`);
        } else if (file.size > 10 * 1024 * 1024) {
            errors.push(`${file.name}: too large (max 10MB)`);
        } else {
            valid.push(file);
        }
    }

    if (errors.length && preview) {
        preview.innerHTML = `<p class="error-message">${errors.join('<br>')}</p>`;
    }
    if (!valid.length) return;

    // Accumulate — don't replace what's already there
    selectedRecipeImageFiles = selectedRecipeImageFiles.concat(valid);
    renderImagePreviews(preview);
}

function handleRecipePhotoSelection(file) {
    const preview = document.getElementById('recipePhotoPreview');
    const imageUrlField = document.getElementById('recipeImageUrl');

    if (!file) {
        if (preview) {
            preview.hidden = true;
            preview.src = '';
        }
        return;
    }

    if (!file.type.startsWith('image/')) {
        if (window.showToast) window.showToast('Please select a valid image file.', 'info');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        if (window.showToast) window.showToast('Image is too large (max 10MB).', 'info');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (imageUrlField) {
            imageUrlField.value = dataUrl;
        }
        if (preview) {
            preview.src = dataUrl;
            preview.hidden = false;
        }
    };
    reader.readAsDataURL(file);
}

function renderImagePreviews(container) {
    if (!container) return;
    container.innerHTML = '';
    if (!selectedRecipeImageFiles.length) return;

    const strip = document.createElement('div');
    strip.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.5rem;margin:0.75rem 0;';

    selectedRecipeImageFiles.forEach((file, i) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;width:80px;flex-shrink:0;';

        const img = document.createElement('img');
        img.alt = `Page ${i + 1}`;
        img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:6px;display:block;';

        const label = document.createElement('span');
        label.textContent = `${i + 1}`;
        label.style.cssText = 'position:absolute;top:3px;left:3px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:1px 5px;border-radius:4px;';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:13px;line-height:1;cursor:pointer;padding:0;';
        removeBtn.addEventListener('click', () => {
            selectedRecipeImageFiles.splice(i, 1);
            renderImagePreviews(container);
        });

        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(file);

        wrapper.appendChild(img);
        wrapper.appendChild(label);
        wrapper.appendChild(removeBtn);
        strip.appendChild(wrapper);
    });

    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:0.85rem;color:var(--color-text-muted);margin:0.25rem 0 0;';
    hint.textContent = `${selectedRecipeImageFiles.length} image${selectedRecipeImageFiles.length > 1 ? 's' : ''} selected — tap × to remove one, or choose more.`;

    container.appendChild(strip);
    container.appendChild(hint);
}

async function importRecipeFromImage() {
    console.log('=== IMAGE IMPORT STARTED ===');
    const files = selectedRecipeImageFiles;
    const resultDiv = document.getElementById('importImageResult');

    if (!files || files.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">Please select at least one image</p>';
        return;
    }

    const count = files.length;
    resultDiv.innerHTML = `<p style="text-align:center;color:var(--accent);">📸 Reading ${count} image${count > 1 ? 's' : ''}... This may take 10–30 seconds.</p>`;

    try {
        // Convert all files to base64 in parallel
        const imageDataArray = await Promise.all(files.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })));

        resultDiv.innerHTML = `<p style="text-align:center;color:var(--accent);">🔍 Running OCR on ${count} image${count > 1 ? 's' : ''}... Please wait.</p>`;

        const recipeData = await api.importRecipeFromImage(imageDataArray);

        if (!recipeData) {
            resultDiv.innerHTML = `
                <div style="text-align:center;">
                    <p class="error-message">Could not extract recipe from image. Please add manually.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                </div>
            `;
            return;
        }

        if (recipeData._error) {
            resultDiv.innerHTML = `
                <div style="text-align:center;">
                    <p class="error-message">${recipeData._error}</p>
                    <p style="margin-top:1rem;color:var(--color-text-muted);">You can still manually enter the recipe details.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                </div>
            `;
            return;
        }

        if (!recipeData.title) {
            resultDiv.innerHTML = `
                <div style="text-align:center;">
                    <p class="error-message">Could not extract recipe title from image. Please add manually.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                </div>
            `;
            return;
        }

        const ingredients = Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [];

        document.getElementById('importImageModal')?.classList.remove('active');
        setTimeout(() => {
            openRecipeModal({
                id: undefined,
                title: recipeData.title || 'Recipe from Image',
                description: recipeData.description || null,
                instructions: recipeData.instructions || null,
                prep_time: recipeData.prep_time || null,
                cook_time: recipeData.cook_time || null,
                servings: recipeData.servings || null,
                ingredients,
                tags: []
            });
        }, 100);

    } catch (error) {
        resultDiv.innerHTML = `
            <div style="text-align:center;">
                <p class="error-message">Error: ${error.message || 'Unknown error occurred while reading image'}</p>
                <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
            </div>
        `;
    }
}

// Export functions for global access
window.viewRecipeDetail = viewRecipeDetail;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipe;
window.shareRecipeQR = shareRecipeQR;
window.loadRecipes = loadRecipes;
window.openRecipeModal = openRecipeModal;
