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

    // Rating display (inline stars matching buildRecipeRatingDisplay style from recipes.js)
    let ratingHtml = '';
    if (recipe.average_rating) {
        const rating = recipe.average_rating;
        const count = recipe.review_count || recipe.rating_count || 0;
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= Math.round(rating) ? '<span class="recipe-rating-star filled">&#9733;</span>' : '<span class="recipe-rating-star empty">&#9734;</span>';
        }
        ratingHtml = `
            <div class="recipe-card-rating">
                <span class="recipe-rating-stars">${stars}</span>
                <span class="recipe-rating-text">${rating}/5 (${count} ${count === 1 ? 'review' : 'reviews'})</span>
            </div>
        `;
    } else {
        ratingHtml = `
            <div class="recipe-card-rating">
                <span class="recipe-rating-stars"><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span></span>
                <span class="recipe-rating-text">No ratings yet</span>
            </div>
        `;
    }

    card.innerHTML = `
        ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-card-image" onerror="this.style.display='none'">` : ''}
        <div class="recipe-card-content">
            <h3 class="recipe-card-title">${recipe.title}</h3>
            ${recipe.owner ? `<p class="recipe-owner">By ${recipe.owner.username}</p>` : ''}
            ${recipe.description ? `<p class="recipe-card-description">${recipe.description}</p>` : ''}
            ${tagsHtml}
            ${ratingHtml}
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
    
    // Rating display (inline stars matching buildRecipeRatingDisplay style from recipes.js)
    let ratingDisplay = '';
    if (recipe.average_rating) {
        const rating = recipe.average_rating;
        const count = recipe.review_count || recipe.rating_count || 0;
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= Math.round(rating) ? '<span class="recipe-rating-star filled">&#9733;</span>' : '<span class="recipe-rating-star empty">&#9734;</span>';
        }
        ratingDisplay = `
            <div class="recipe-card-rating">
                <span class="recipe-rating-stars">${stars}</span>
                <span class="recipe-rating-text">${rating}/5 (${count} ${count === 1 ? 'review' : 'reviews'})</span>
            </div>
        `;
    } else {
        ratingDisplay = `
            <div class="recipe-card-rating">
                <span class="recipe-rating-stars"><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span><span class="recipe-rating-star empty">&#9734;</span></span>
                <span class="recipe-rating-text">No ratings yet</span>
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

function stripTrailingPriceAnnotation(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    return text.replace(/\s*\(\s*\$\s*\d+(?:\.\d{1,2})?\s*\)\s*$/, '').trim();
}

function buildRecipeNutritionSection(nutrition, servings) {
    if (!nutrition) return '';
    const n = nutrition;
    const rows = [
        { label: 'Calories', per: n.energy_kcal, unit: '' },
        { label: 'Protein', per: n.proteins, unit: 'g' },
        { label: 'Carbs', per: n.carbohydrates, unit: 'g' },
        { label: 'Fat', per: n.fat, unit: 'g' },
        { label: 'Sat. Fat', per: n.saturated_fat, unit: 'g' },
        { label: 'Trans Fat', per: n.trans_fat, unit: 'g' },
        { label: 'Cholesterol', per: n.cholesterol, unit: 'mg' },
        { label: 'Sodium', per: n.sodium, unit: 'mg' },
        { label: 'Fiber', per: n.fiber, unit: 'g' },
        { label: 'Sugars', per: n.sugars, unit: 'g' },
        { label: 'Vitamin D', per: n.vitamin_d, unit: 'mcg' },
        { label: 'Calcium', per: n.calcium, unit: 'mg' },
        { label: 'Iron', per: n.iron, unit: 'mg' },
        { label: 'Potassium', per: n.potassium, unit: 'mg' },
    ];
    const hasAny = rows.some(r => r.per !== undefined && r.per !== null && r.per !== 0);
    if (!hasAny) return '';

    const fmt = (val, unit) => {
        if (val === undefined || val === null) return '—';
        return `${Math.round(val * 10) / 10}${unit}`;
    };

    const rowsHtml = rows
        .filter(r => r.per !== undefined && r.per !== null && r.per !== 0)
        .map(r => `
            <tr>
                <td class="recipe-nutr__label">${r.label}</td>
                <td class="recipe-nutr__value">${fmt(r.per, r.unit)}</td>
                <td class="recipe-nutr__value">${fmt(r.per * servings, r.unit)}</td>
            </tr>
        `).join('');

    const servingSizeText = n.serving_size ? ` (${n.serving_size})` : '';

    return `
        <div class="recipe-section">
            <h3>Nutrition</h3>
            ${n.serving_size ? `<p class="recipe-nutr__serving-size">Serving size: ${n.serving_size}</p>` : ''}
            <table class="recipe-nutr-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Per Serving${servingSizeText}</th>
                        <th>Total Meal (${servings} serving${servings !== 1 ? 's' : ''})</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
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
                let line = stripTrailingPriceAnnotation(ing.ingredient_name);
                if (ing.quantity && ing.unit) {
                    line = `${ing.quantity} ${ing.unit} ${stripTrailingPriceAnnotation(ing.ingredient_name)}`;
                } else if (ing.quantity) {
                    line = `${ing.quantity} ${stripTrailingPriceAnnotation(ing.ingredient_name)}`;
                }
                return `<li>${line}</li>`;
            }).join('')}
           </ul>`
        : '<p>No ingredients listed</p>';

    const nutritionMeta = (recipe.ingredients || []).find(ing => ing.ingredient_name === '__nutrition__')?.nutritional_info;
    const nutrition = nutritionMeta || (typeof getNutritionFromIngredients === 'function' ? getNutritionFromIngredients(recipe.ingredients || []) : null);
    const servings = parseInt(recipe.servings) || 1;
    const hasNutrition = nutrition && Object.keys(nutrition).length > 0;
    const nutritionHtml = hasNutrition ? buildRecipeNutritionSection(nutrition, servings) : '';
    
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
            
            ${recipe.source_url ? `
                <div class="recipe-section" style="margin-top: 1rem;">
                    <p style="font-size: 0.85rem;"><a href="${recipe.source_url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">🔗 Original recipe URL</a></p>
                </div>
            ` : ''}

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
            <div class="review-section" id="reviewSection" data-recipe-id="${recipe.id}">
                <h3>Reviews</h3>
                <div class="review-form">
                    <div class="star-picker" id="starPicker">
                        ${[1,2,3,4,5].map(n => `<button type="button" class="star" data-rating="${n}" title="${n} star${n>1?'s':''}">&#9733;</button>`).join('')}
                    </div>
                    <textarea id="reviewText" placeholder="Write a review (optional)..." rows="2"></textarea>
                    <button class="btn btn-primary" id="submitReviewBtn" type="button">Submit Review</button>
                </div>
                <div id="reviewsList" class="reviews-list">
                    <p style="text-align:center;opacity:.6;">Loading reviews...</p>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');

    // Initialize reviews
    initReviewSection(recipe.id);
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

async function initReviewSection(recipeId) {
    const section = document.getElementById('reviewSection');
    if (!section) return;

    let selectedRating = 0;

    // Star picker
    const stars = section.querySelectorAll('.star-picker .star');
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            const r = parseInt(star.dataset.rating);
            stars.forEach(s => s.classList.toggle('hovered', parseInt(s.dataset.rating) <= r));
        });
        star.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('hovered'));
        });
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.rating) <= selectedRating));
        });
    });

    // Submit
    const submitBtn = section.querySelector('#submitReviewBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (selectedRating < 1) {
                alert('Please select a star rating.');
                return;
            }
            try {
                const reviewText = section.querySelector('#reviewText')?.value || '';
                await api.createRecipeReview(recipeId, { rating: selectedRating, review_text: reviewText });
                loadReviews(recipeId);
            } catch (err) {
                alert('Failed to submit review: ' + err.message);
            }
        });
    }

    loadReviews(recipeId);
}

async function loadReviews(recipeId) {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    try {
        const data = await api.getRecipeReviews(recipeId);
        let html = '';
        if (data.average_rating) {
            html += `<div class="review-summary"><strong>${data.average_rating}</strong>/5 from ${data.review_count} review${data.review_count !== 1 ? 's' : ''}</div>`;
        }

        // Pre-fill star picker if user already reviewed
        if (data.my_review) {
            const stars = document.querySelectorAll('#starPicker .star');
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.rating) <= data.my_review.rating));
            const textArea = document.getElementById('reviewText');
            if (textArea) textArea.value = data.my_review.review_text || '';
        }

        if (data.reviews && data.reviews.length > 0) {
            const currentUserId = window.currentUser ? window.currentUser().id : null;
            html += data.reviews.map(r => `
                <div class="review-card">
                    <div class="review-header">
                        <span class="review-stars">${'&#9733;'.repeat(r.rating)}${'&#9734;'.repeat(5 - r.rating)}</span>
                        <strong>${r.username || 'User'}</strong>
                        <span class="review-date">${r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                        ${r.user_id === currentUserId ? `<button class="btn-icon review-delete" data-review-id="${r.id}" data-recipe-id="${r.recipe_id}" title="Delete review">&#128465;</button>` : ''}
                    </div>
                    ${r.review_text ? `<p class="review-text">${r.review_text}</p>` : ''}
                </div>
            `).join('');
        } else {
            html += '<p style="text-align:center;opacity:.6;margin-top:1rem;">No reviews yet. Be the first!</p>';
        }
        container.innerHTML = html;

        // Wire up delete buttons
        container.querySelectorAll('.review-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Delete your review?')) return;
                try {
                    await api.deleteRecipeReview(btn.dataset.recipeId, btn.dataset.reviewId);
                    loadReviews(recipeId);
                } catch (err) {
                    alert('Failed to delete review: ' + err.message);
                }
            });
        });
    } catch (err) {
        container.innerHTML = '<p class="error-message">Failed to load reviews.</p>';
    }
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
window.showRecipeDetailModal = showRecipeDetailModal;
window.buildRecipeNutritionSection = buildRecipeNutritionSection;
window.createUserRecipeCard = createUserRecipeCard;
window.initReviewSection = initReviewSection;
window.loadReviews = loadReviews;
