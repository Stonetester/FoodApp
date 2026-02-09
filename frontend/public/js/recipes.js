// Recipe Management

let recipes = [];
let currentFilters = { search: '', tags: [] };
let selectedRecipeImageFile = null;

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
        handleRecipeImageSelection(e.target.files[0]);
    });

    document.getElementById('recipeImageLibrary')?.addEventListener('change', (e) => {
        handleRecipeImageSelection(e.target.files[0]);
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
        alert('Failed to load recipes');
    }
}

function displayRecipes() {
    const container = document.getElementById('recipesList');
    if (!container) return;

    container.innerHTML = '';

    if (recipes.length === 0) {
        container.innerHTML = '<p>No recipes found. Add your first recipe!</p>';
        return;
    }

    recipes.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe));
    });
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const tagsHtml = recipe.tags.map(tag => 
        `<span class="recipe-tag">${tag}</span>`
    ).join('');

    card.innerHTML = `
        ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-card-image" onerror="this.style.display='none'">` : ''}
        <div class="recipe-card-content">
            <h3 class="recipe-card-title">${recipe.title}</h3>
            <p class="recipe-card-description">${recipe.description || ''}</p>
            <div class="recipe-card-tags">${tagsHtml}</div>
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

function addIngredientField(ingredient = null) {
    const container = document.getElementById('ingredientsList');
    const div = document.createElement('div');
    div.className = 'ingredient-item';

    div.innerHTML = `
        <input type="text" placeholder="Ingredient name" class="ingredient-name" value="${ingredient?.ingredient_name || ''}" required>
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
    return nutritionItem?.nutritional_info || {};
}

function setNutritionFields(nutrition = {}) {
    document.getElementById('recipeCalories').value = nutrition.energy_kcal ?? '';
    document.getElementById('recipeProtein').value = nutrition.proteins ?? '';
    document.getElementById('recipeCarbs').value = nutrition.carbohydrates ?? '';
    document.getElementById('recipeFat').value = nutrition.fat ?? '';
}

function buildRecipeNutrition() {
    const calories = document.getElementById('recipeCalories').value;
    const protein = document.getElementById('recipeProtein').value;
    const carbs = document.getElementById('recipeCarbs').value;
    const fat = document.getElementById('recipeFat').value;

    const parsed = {
        energy_kcal: calories ? parseFloat(calories) : null,
        proteins: protein ? parseFloat(protein) : null,
        carbohydrates: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null
    };

    const hasValue = Object.values(parsed).some(value => value !== null && !Number.isNaN(value));
    if (!hasValue) {
        return null;
    }

    return parsed;
}

async function saveRecipe() {
    const form = document.getElementById('recipeForm');
    const recipeId = document.getElementById('recipeId').value;
    const titleField = document.getElementById('recipeTitle');
    
    // Validate title
    if (!titleField.value || !titleField.value.trim()) {
        alert('Please enter a recipe title');
        titleField.focus();
        return;
    }

    // Collect ingredients (only if they have a name)
    const ingredients = [];
    document.querySelectorAll('.ingredient-item').forEach(item => {
        const name = item.querySelector('.ingredient-name').value;
        const quantity = item.querySelector('.ingredient-quantity').value;
        const unit = item.querySelector('.ingredient-unit').value;

        if (name && name.trim()) {
            ingredients.push({
                ingredient_name: name.trim(),
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
    
    const recipeData = {
        title: titleField.value.trim(),
        description: descriptionField.value && !descriptionField.classList.contains('placeholder-text') ? descriptionField.value.trim() : null,
        prep_time: prepTimeField.value && !prepTimeField.classList.contains('placeholder-text') && prepTimeField.value.trim() ? parseInt(prepTimeField.value) : null,
        cook_time: cookTimeField.value && !cookTimeField.classList.contains('placeholder-text') && cookTimeField.value.trim() ? parseInt(cookTimeField.value) : null,
        servings: servingsField.value && !servingsField.classList.contains('placeholder-text') && servingsField.value.trim() ? parseInt(servingsField.value) : null,
        instructions: instructionsField.value && !instructionsField.classList.contains('placeholder-text') ? instructionsField.value.trim() : null,
        image_url: imageUrlField.value && imageUrlField.value.trim() ? imageUrlField.value.trim() : null,
        ingredients: ingredients,
        tags: tags
    };

    try {
        const recipeIdValue = recipeId && recipeId.trim() ? recipeId : null;
        if (recipeIdValue) {
            await api.updateRecipe(parseInt(recipeIdValue), recipeData);
        } else {
            await api.createRecipe(recipeData);
        }
        closeRecipeModal();
        await loadRecipes();
        if (window.loadDashboard) {
            window.loadDashboard();
        }
    } catch (error) {
        console.error('Error saving recipe:', error);
        let errorMsg = 'Failed to save recipe';
        if (error.message) {
            errorMsg += ': ' + error.message;
        }
        alert(errorMsg);
    }
}

async function viewRecipeDetail(id) {
    try {
        const recipe = await api.getRecipe(id);
        openRecipeModal(recipe);
    } catch (error) {
        console.error('Error loading recipe:', error);
        alert('Failed to load recipe');
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
        alert('Failed to load recipe');
    }
}

async function deleteRecipe(id) {
    if (!confirm('Are you sure you want to delete this recipe?')) {
        return;
    }

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
        alert('Failed to delete recipe');
    }
}

async function shareRecipeQR(id) {
    try {
        const result = await api.getRecipeQR(id);
        const modal = document.getElementById('qrModal');
        const container = document.getElementById('qrCodeContainer');
        
        container.innerHTML = `<img src="data:image/png;base64,${result.qr_code}" alt="Recipe QR Code">`;
        modal.classList.add('active');
    } catch (error) {
        console.error('Error generating QR code:', error);
        alert('Failed to generate QR code');
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
                    alert(recipeData._warning);
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
                    ingredients: ingredients,
                    tags: []
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
    selectedRecipeImageFile = null;
    modal.classList.add('active');
}

function handleRecipeImageSelection(file) {
    const preview = document.getElementById('imagePreview');
    const resultDiv = document.getElementById('importImageResult');
    
    if (resultDiv) {
        resultDiv.innerHTML = '';
    }
    
    if (!file) {
        selectedRecipeImageFile = null;
        if (preview) preview.innerHTML = '';
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        if (preview) preview.innerHTML = '<p class="error-message">Please select a valid image file</p>';
        return;
    }
    
    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
        if (preview) preview.innerHTML = '<p class="error-message">Image is too large (max 10MB)</p>';
        return;
    }
    
    selectedRecipeImageFile = file;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        if (preview) {
            preview.innerHTML = `
                <img src="${event.target.result}" 
                     style="max-width: 100%; max-height: 300px; border-radius: 8px; display: block; margin: 0 auto;"
                     alt="Recipe preview">
                <p style="text-align: center; margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                    Ready to extract recipe text
                </p>
            `;
        }
    };
    reader.onerror = () => {
        if (preview) preview.innerHTML = '<p class="error-message">Error loading image preview</p>';
    };
    reader.readAsDataURL(file);
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
        alert('Please select a valid image file.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('Image is too large (max 10MB).');
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

async function importRecipeFromImage() {
    console.log('=== IMAGE IMPORT STARTED ===');
    const file = selectedRecipeImageFile;
    const resultDiv = document.getElementById('importImageResult');

    console.log('Selected file:', file);
    
    if (!file) {
        console.warn('No file selected');
        resultDiv.innerHTML = '<p class="error-message">Please select or take an image</p>';
        return;
    }

    console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        resultDiv.innerHTML = '<p class="error-message">Please select a valid image file</p>';
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        console.error('File too large:', file.size);
        resultDiv.innerHTML = '<p class="error-message">Image file is too large. Please use an image smaller than 10MB.</p>';
        return;
    }

    console.log('File validation passed, starting to read file...');
    // Show loading state
    resultDiv.innerHTML = '<p style="text-align: center; color: var(--accent);">📸 Reading image... This may take 10-30 seconds.</p>';

    try {
        // Convert image to base64
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                console.log('FileReader onload triggered');
                let imageData = event.target.result;
                console.log('Image data length:', imageData ? imageData.length : 0);
                console.log('Image data preview:', imageData ? imageData.substring(0, 100) + '...' : 'null');
                
                // Update loading message
                resultDiv.innerHTML = '<p style="text-align: center; color: var(--accent);">🔍 Processing image with OCR... Please wait.</p>';
                
                console.log('=== SENDING TO BACKEND ===');
                console.log('Calling api.importRecipeFromImage()...');
                const recipeData = await api.importRecipeFromImage(imageData);
                
                console.log('=== BACKEND RESPONSE RECEIVED ===');
                console.log('Full recipe data object:', recipeData);
                console.log('Recipe data type:', typeof recipeData);
                console.log('Recipe data keys:', recipeData ? Object.keys(recipeData) : 'null');
                
                if (recipeData) {
                    console.log('Recipe data exists, checking for errors...');
                    console.log('Has _error field?', '_error' in recipeData);
                    console.log('_error value:', recipeData._error);
                    
                    // Check for error message
                    if (recipeData._error) {
                        console.error('Backend returned error:', recipeData._error);
                        console.log('Showing error message to user');
                        resultDiv.innerHTML = `
                            <div style="text-align: center;">
                                <p class="error-message">${recipeData._error}</p>
                                <p style="margin-top: 1rem; color: var(--text-secondary);">You can still manually enter the recipe details.</p>
                                <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                            </div>
                        `;
                        return;
                    }
                    
                    console.log('No error found, checking for title...');
                    console.log('Title value:', recipeData.title);
                    console.log('Title type:', typeof recipeData.title);
                    console.log('Title truthy?', !!recipeData.title);
                    
                    // Ensure we have at least a title (backend always provides one)
                    if (recipeData.title) {
                        console.log('=== EXTRACTED DATA SUMMARY ===');
                        console.log('Title:', recipeData.title);
                        console.log('Description:', recipeData.description);
                        console.log('Instructions:', recipeData.instructions);
                        console.log('Prep time:', recipeData.prep_time);
                        console.log('Cook time:', recipeData.cook_time);
                        console.log('Servings:', recipeData.servings);
                        console.log('Ingredients count:', recipeData.ingredients ? recipeData.ingredients.length : 0);
                        console.log('Ingredients:', recipeData.ingredients);
                        
                        // Ensure ingredients is an array
                        let ingredients = recipeData.ingredients || [];
                        if (!Array.isArray(ingredients)) {
                            console.warn('Ingredients is not an array, converting...', ingredients);
                            ingredients = [];
                        }
                        console.log('Final ingredients array:', ingredients);
                        console.log('Ingredients array length:', ingredients.length);
                        
                        console.log('=== PREPARING TO OPEN MODAL ===');
                        console.log('Recipe data to pass to modal:', {
                            id: undefined,
                            title: recipeData.title || 'Recipe from Image',
                            description: recipeData.description || null,
                            instructions: recipeData.instructions || null,
                            prep_time: recipeData.prep_time || null,
                            cook_time: recipeData.cook_time || null,
                            servings: recipeData.servings || null,
                            ingredients: ingredients,
                            tags: []
                        });
                        
                        // Close import modal first
                        const importModal = document.getElementById('importImageModal');
                        console.log('Import modal element:', importModal);
                        if (importModal) {
                            console.log('Closing import modal...');
                            importModal.classList.remove('active');
                            console.log('Import modal closed, active classes:', importModal.classList.toString());
                        } else {
                            console.error('Import modal element not found!');
                        }
                        
                        // Small delay to ensure modal closes before opening new one
                        console.log('Waiting 100ms before opening recipe modal...');
                        setTimeout(() => {
                            console.log('=== OPENING RECIPE MODAL ===');
                            try {
                                // Open recipe modal with extracted data (no ID = new recipe)
                                openRecipeModal({
                                    id: undefined,  // Explicitly set to undefined for new recipe
                                    title: recipeData.title || 'Recipe from Image',
                                    description: recipeData.description || null,
                                    instructions: recipeData.instructions || null,
                                    prep_time: recipeData.prep_time || null,
                                    cook_time: recipeData.cook_time || null,
                                    servings: recipeData.servings || null,
                                    ingredients: ingredients,
                                    tags: []
                                });
                                console.log('Recipe modal opened successfully!');
                                console.log('=== IMAGE IMPORT COMPLETE ===');
                            } catch (modalError) {
                                console.error('Error opening recipe modal:', modalError);
                                console.error('Stack trace:', modalError.stack);
                                resultDiv.innerHTML = `
                                    <div style="text-align: center;">
                                        <p class="error-message">Error opening recipe form: ${modalError.message}</p>
                                        <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                                    </div>
                                `;
                            }
                        }, 100);
                    } else {
                        console.error('No title found in recipe data!');
                        console.log('Full recipe data:', JSON.stringify(recipeData, null, 2));
                        resultDiv.innerHTML = `
                            <div style="text-align: center;">
                                <p class="error-message">Could not extract recipe title from image. Please add manually.</p>
                                <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">Extracted data: ${JSON.stringify(recipeData).substring(0, 200)}...</p>
                                <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                            </div>
                        `;
                    }
                } else {
                    console.error('Recipe data is null or undefined!');
                    resultDiv.innerHTML = `
                        <div style="text-align: center;">
                            <p class="error-message">Could not extract recipe from image. Please add manually.</p>
                            <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('=== ERROR IN READER.ONLOAD ===');
                console.error('Error type:', error.constructor.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                console.error('Full error object:', error);
                
                let errorMsg = 'Error extracting recipe from image';
                if (error.message && error.message.includes('JSON')) {
                    errorMsg = 'Error: Invalid response from server. The OCR service may not be available.';
                } else if (error.message) {
                    errorMsg = `Error: ${error.message}`;
                }
                resultDiv.innerHTML = `
                    <div style="text-align: center;">
                        <p class="error-message">${errorMsg}</p>
                        <p style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">Check console for details (F12)</p>
                        <button class="btn btn-primary" onclick="document.getElementById('importImageModal').classList.remove('active'); openRecipeModal();">Add Recipe Manually</button>
                    </div>
                `;
            }
        };
        
        reader.onerror = (error) => {
            console.error('=== FILEREADER ERROR ===');
            console.error('FileReader error:', error);
            console.error('Error type:', error.type);
            resultDiv.innerHTML = '<p class="error-message">Error reading image file. Please try a different image or check file permissions.</p>';
        };
        
        reader.onabort = () => {
            console.warn('FileReader aborted');
            resultDiv.innerHTML = '<p class="error-message">Image reading was cancelled.</p>';
        };
        
        console.log('Starting FileReader.readAsDataURL()...');
        // Read file as data URL (base64)
        reader.readAsDataURL(file);
        console.log('FileReader.readAsDataURL() called');
    } catch (error) {
        console.error('=== ERROR IN TRY BLOCK ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', error);
        resultDiv.innerHTML = `<p class="error-message">Error: ${error.message || 'Unknown error occurred while reading image'}</p>`;
    }
}

// Export functions for global access
window.viewRecipeDetail = viewRecipeDetail;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipe;
window.shareRecipeQR = shareRecipeQR;
window.loadRecipes = loadRecipes;
