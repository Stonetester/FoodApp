// User Search and Recipe Discovery - Frontend Implementation
// File: frontend/public/js/users.js

let currentUserRecipes = [];
let selectedUser = null;
let discoverFilters = { search: '', tags: [] };

document.addEventListener('DOMContentLoaded', () => {
    setupUserSearchListeners();
});

function setupUserSearchListeners() {
    // Search button
    const searchBtn = document.getElementById('searchUsersBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchUsers);
    }

    // Search on Enter key
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchUsers();
            }
        });
    }

    // Close user recipes modal
    const closeUserRecipesBtn = document.getElementById('closeUserRecipesBtn');
    if (closeUserRecipesBtn) {
        closeUserRecipesBtn.addEventListener('click', () => {
            document.getElementById('userRecipesModal').classList.remove('active');
        });
    }

    // Discover recipes search
    const discoverSearchBtn = document.getElementById('discoverSearchBtn');
    if (discoverSearchBtn) {
        discoverSearchBtn.addEventListener('click', () => {
            discoverFilters.search = document.getElementById('discoverSearchInput').value.trim();
            loadDiscoverRecipes();
        });
    }

    const discoverSearchInput = document.getElementById('discoverSearchInput');
    if (discoverSearchInput) {
        discoverSearchInput.addEventListener('input', () => {
            discoverFilters.search = discoverSearchInput.value.trim();
            loadDiscoverRecipes();
        });
        discoverSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                discoverFilters.search = discoverSearchInput.value.trim();
                loadDiscoverRecipes();
            }
        });
    }

    document.querySelectorAll('#discoverTagFilters input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            discoverFilters.tags = Array.from(document.querySelectorAll('#discoverTagFilters input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            loadDiscoverRecipes();
        });
    });
}

async function loadDiscoverRecipes() {
    const resultsContainer = document.getElementById('discoverResults');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '<p style="text-align: center;">Loading meals...</p>';
    
    try {
        const recipes = await api.discoverRecipes(discoverFilters);
        displayDiscoverRecipes(recipes);
    } catch (error) {
        console.error('Error loading discover recipes:', error);
        resultsContainer.innerHTML = '<p class="error-message">Failed to load recipes. Please try again.</p>';
    }
}

function displayDiscoverRecipes(recipes) {
    const resultsContainer = document.getElementById('discoverResults');
    resultsContainer.innerHTML = '';
    
    if (!recipes || recipes.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text); padding: 2rem;">No recipes found. Try a different search.</p>';
        return;
    }
    
    recipes.forEach(recipe => {
        resultsContainer.appendChild(createDiscoverRecipeCard(recipe));
    });
}

function createDiscoverRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card discover-recipe-card';
    
    const tagsHtml = recipe.tags && recipe.tags.length > 0
        ? `<div class="recipe-card-tags">${recipe.tags.map(tag => `<span class="recipe-tag">${tag}</span>`).join('')}</div>`
        : '';
    
    card.innerHTML = `
        ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-card-image" onerror="this.style.display='none'">` : ''}
        <div class="recipe-card-content">
            <h3 class="recipe-card-title">${recipe.title}</h3>
            ${recipe.owner ? `<p class="recipe-owner">By ${recipe.owner.username}</p>` : ''}
            ${recipe.description ? `<p class="recipe-card-description">${recipe.description}</p>` : ''}
            ${tagsHtml}
            <div class="recipe-card-actions">
                <button class="btn btn-secondary" onclick="viewDiscoverRecipeDetail(${recipe.id})">View Details</button>
                ${recipe.is_owner ? '' : `<button class="btn btn-primary" onclick="copyRecipeToMyCollection(${recipe.id})">Copy Recipe</button>`}
            </div>
        </div>
    `;
    
    return card;
}

async function viewDiscoverRecipeDetail(recipeId) {
    try {
        const recipe = await api.getDiscoverRecipe(recipeId);
        const isOtherUser = recipe.owner && !recipe.is_owner;
        showRecipeDetailModal(recipe, isOtherUser);
    } catch (error) {
        console.error('Error loading discover recipe details:', error);
        alert('Failed to load recipe details');
    }
}

async function searchUsers() {
    const searchInput = document.getElementById('userSearchInput');
    const query = searchInput.value.trim();
    const resultsContainer = document.getElementById('userSearchResults');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '<p class="error-message">Please enter at least 2 characters to search</p>';
        return;
    }
    
    // Show loading
    resultsContainer.innerHTML = '<p>🔍 Searching...</p>';
    
    try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        
        const users = await response.json();
        displayUserSearchResults(users);
    } catch (error) {
        console.error('Error searching users:', error);
        resultsContainer.innerHTML = '<p class="error-message">Failed to search users. Please try again.</p>';
    }
}

function displayUserSearchResults(users) {
    const resultsContainer = document.getElementById('userSearchResults');
    resultsContainer.innerHTML = '';
    
    if (users.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text); padding: 2rem;">No users found matching your search.</p>';
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'user-grid';
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <div class="user-card-content">
                <h3 class="user-card-name">👤 ${user.username}</h3>
                <p class="user-card-info">📚 ${user.recipe_count} recipe${user.recipe_count !== 1 ? 's' : ''}</p>
                ${user.created_at ? `<p class="user-card-info" style="font-size: 0.85rem; opacity: 0.7;">Joined ${new Date(user.created_at).toLocaleDateString()}</p>` : ''}
            </div>
            <div class="user-card-actions">
                <button class="btn btn-primary" onclick="viewUserRecipes(${user.id}, '${user.username.replace(/'/g, "\\'")}')">
                    View Recipes
                </button>
            </div>
        `;
        grid.appendChild(userCard);
    });
    
    resultsContainer.appendChild(grid);
}

async function viewUserRecipes(userId, username) {
    const modal = document.getElementById('userRecipesModal');
    const title = document.getElementById('userRecipesTitle');
    const container = document.getElementById('userRecipesList');
    
    selectedUser = { id: userId, username: username };
    
    // Show modal with loading state
    title.textContent = `${username}'s Recipes`;
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading recipes...</p>';
    modal.classList.add('active');
    
    try {
        const response = await fetch(`/api/users/${userId}/recipes`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load recipes: ${response.status}`);
        }
        
        currentUserRecipes = await response.json();
        displayUserRecipes(currentUserRecipes, username);
    } catch (error) {
        console.error('Error loading user recipes:', error);
        container.innerHTML = '<p class="error-message">Failed to load recipes. Please try again.</p>';
    }
}

function displayUserRecipes(recipes, username) {
    const container = document.getElementById('userRecipesList');
    container.innerHTML = '';
    
    if (recipes.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text); padding: 2rem;">${username} hasn't shared any recipes yet.</p>`;
        return;
    }
    
    recipes.forEach(recipe => {
        const card = createUserRecipeCard(recipe);
        container.appendChild(card);
    });
}

function createUserRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card user-recipe-card';
    
    // Rating display
    let ratingDisplay = '';
    if (recipe.average_rating) {
        const stars = '⭐'.repeat(Math.round(recipe.average_rating));
        ratingDisplay = `
            <div class="recipe-rating">
                <span class="stars">${stars}</span>
                <span class="rating-text">${recipe.average_rating} (${recipe.rating_count} rating${recipe.rating_count !== 1 ? 's' : ''})</span>
            </div>
        `;
    } else {
        ratingDisplay = `
            <div class="recipe-rating">
                <span class="rating-text" style="opacity: 0.6;">No ratings yet</span>
            </div>
        `;
    }
    
    // Servings display
    const servingsDisplay = recipe.servings 
        ? `<span class="recipe-info-item">🍽️ Serves ${recipe.servings}</span>`
        : '';
    
    // Time display
    const timeDisplay = [];
    if (recipe.prep_time) {
        timeDisplay.push(`⏱️ Prep: ${recipe.prep_time}min`);
    }
    if (recipe.cook_time) {
        timeDisplay.push(`🍳 Cook: ${recipe.cook_time}min`);
    }
    const timeHtml = timeDisplay.length > 0 
        ? `<div class="recipe-time-info">${timeDisplay.join(' • ')}</div>`
        : '';
    
    // Tags display
    const tagsHtml = recipe.tags && recipe.tags.length > 0
        ? `<div class="recipe-card-tags">${recipe.tags.map(tag => `<span class="recipe-tag">${tag}</span>`).join('')}</div>`
        : '';
    
    card.innerHTML = `
        ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-card-image" onerror="this.style.display='none'">` : ''}
        <div class="recipe-card-content">
            <h3 class="recipe-card-title">${recipe.title}</h3>
            ${recipe.description ? `<p class="recipe-card-description">${recipe.description}</p>` : ''}
            ${ratingDisplay}
            ${tagsHtml}
            <div class="recipe-info-bar">
                ${servingsDisplay}
                ${servingsDisplay && timeDisplay.length > 0 ? '<span style="opacity: 0.3;">•</span>' : ''}
                ${timeHtml}
            </div>
            <div class="recipe-card-actions">
                <button class="btn btn-secondary" onclick="viewRecipeDetail(${recipe.id}, true)">
                    📖 View Details
                </button>
                <button class="btn btn-primary" onclick="copyRecipeToMyCollection(${recipe.id})">
                    📥 Copy Recipe
                </button>
            </div>
        </div>
    `;
    
    return card;
}

async function viewRecipeDetail(recipeId, isOtherUser = false) {
    // Close user recipes modal if open
    if (isOtherUser) {
        document.getElementById('userRecipesModal').classList.remove('active');
    }
    
    try {
        const response = await fetch(`/api/recipes/${recipeId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load recipe: ${response.status}`);
        }
        
        const recipe = await response.json();
        
        // Show recipe detail modal
        showRecipeDetailModal(recipe, isOtherUser);
    } catch (error) {
        console.error('Error loading recipe details:', error);
        alert('Failed to load recipe details');
    }
}

function showRecipeDetailModal(recipe, isOtherUser) {
    const modal = document.getElementById('recipeDetailModal');
    const content = document.getElementById('recipeDetailContent');
    
    // Rating display
    let ratingSection = '';
    if (recipe.average_rating) {
        ratingSection = `
            <div class="detail-rating">
                <h3>⭐ Rating: ${recipe.average_rating} / 5</h3>
                <p>${recipe.rating_count} people have tried this recipe</p>
            </div>
        `;
    }
    
    // Format ingredients
    const filteredIngredients = (recipe.ingredients || []).filter(ing => ing.ingredient_name !== '__nutrition__');
    const ingredientsHtml = filteredIngredients.length > 0
        ? `<ul class="ingredients-list">
            ${filteredIngredients.map(ing => {
                let line = ing.ingredient_name;
                if (ing.quantity && ing.unit) {
                    line = `${ing.quantity} ${ing.unit} ${ing.ingredient_name}`;
                } else if (ing.quantity) {
                    line = `${ing.quantity} ${ing.ingredient_name}`;
                }
                return `<li>${line}</li>`;
            }).join('')}
           </ul>`
        : '<p>No ingredients listed</p>';

    const nutrition = (recipe.ingredients || []).find(ing => ing.ingredient_name === '__nutrition__')?.nutritional_info;
    const nutritionHtml = nutrition ? `
        <div class="recipe-section">
            <h3>🍎 Nutrition (per serving)</h3>
            <p>
                ${nutrition.energy_kcal ? `${nutrition.energy_kcal} kcal` : ''}
                ${nutrition.proteins ? `${nutrition.proteins}g protein` : ''}
                ${nutrition.carbohydrates ? `${nutrition.carbohydrates}g carbs` : ''}
                ${nutrition.fat ? `${nutrition.fat}g fat` : ''}
            </p>
        </div>
    ` : '';
    
    // Format instructions
    const instructionsHtml = recipe.instructions
        ? `<div class="instructions-text">${recipe.instructions.replace(/\n/g, '<br>')}</div>`
        : '<p>No instructions provided</p>';
    
    content.innerHTML = `
        <div class="recipe-detail">
            ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-detail-image">` : ''}
            
            <h2>${recipe.title}</h2>
            
            ${isOtherUser && recipe.owner ? `<p class="recipe-owner">By: ${recipe.owner.username}</p>` : ''}
            
            ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
            
            <div class="recipe-meta">
                ${recipe.prep_time ? `<span class="meta-item">⏱️ Prep: ${recipe.prep_time}min</span>` : ''}
                ${recipe.cook_time ? `<span class="meta-item">🍳 Cook: ${recipe.cook_time}min</span>` : ''}
                ${recipe.servings ? `<span class="meta-item servings-badge">🍽️ Serves ${recipe.servings}</span>` : ''}
            </div>
            
            ${ratingSection}
            
            ${recipe.tags && recipe.tags.length > 0 ? `
                <div class="recipe-tags-section">
                    <strong>Tags:</strong>
                    ${recipe.tags.map(tag => `<span class="recipe-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="recipe-section">
                <h3>📝 Ingredients</h3>
                ${ingredientsHtml}
            </div>
            
            <div class="recipe-section">
                <h3>👩‍🍳 Instructions</h3>
                ${instructionsHtml}
            </div>
            
            ${nutritionHtml}
            
            <div class="recipe-actions">
                <button class="btn btn-secondary" onclick="shareRecipeLink(${recipe.id}, '${recipe.title.replace(/'/g, "\\'")}')">
                    📤 Share
                </button>
                <button class="btn btn-secondary" onclick="shareRecipeQR(${recipe.id})">
                    📱 QR Code
                </button>
                ${isOtherUser ? `
                    <button class="btn btn-primary" onclick="copyRecipeFromDetail(${recipe.id})">
                        📥 Copy to My Recipes
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

async function shareRecipeLink(recipeId, title) {
    const shareUrl = `${window.location.origin}?recipe=${recipeId}`;
    const shareText = `Check out this recipe: ${title}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Cosy Cottage Recipe',
                text: shareText,
                url: shareUrl
            });
            return;
        } catch (error) {
            console.error('Share failed:', error);
        }
    }
    
    try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('Recipe link copied to clipboard!');
    } catch (error) {
        alert('Could not copy the share link. Please copy it manually from the address bar.');
    }
}

async function copyRecipeToMyCollection(recipeId) {
    if (!confirm('Copy this recipe to your collection?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/recipes/${recipeId}/copy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to copy recipe');
        }
        
        const result = await response.json();
        alert('✅ Recipe copied successfully!');
        
        // Optionally navigate to recipes page
        if (confirm('Would you like to view your recipes now?')) {
            document.getElementById('userRecipesModal').classList.remove('active');
            if (window.navigateToPage) {
                window.navigateToPage('recipes');
            }
        }
    } catch (error) {
        console.error('Error copying recipe:', error);
        alert('❌ Failed to copy recipe: ' + error.message);
    }
}

async function copyRecipeFromDetail(recipeId) {
    // Close detail modal first
    document.getElementById('recipeDetailModal').classList.remove('active');
    
    await copyRecipeToMyCollection(recipeId);
}

// Export functions for global access
window.searchUsers = searchUsers;
window.viewUserRecipes = viewUserRecipes;
window.viewRecipeDetail = viewRecipeDetail;
window.copyRecipeToMyCollection = copyRecipeToMyCollection;
window.copyRecipeFromDetail = copyRecipeFromDetail;
window.loadDiscoverRecipes = loadDiscoverRecipes;
window.viewDiscoverRecipeDetail = viewDiscoverRecipeDetail;
window.shareRecipeLink = shareRecipeLink;
window.createUserRecipeCard = createUserRecipeCard;
