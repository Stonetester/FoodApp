// Friends page: view friends, recipes, and meal plans

document.addEventListener('DOMContentLoaded', () => {
    setupFriendsListeners();
});

let friendsCache = [];
let selectedFriendId = null;

function showFriendsList() {
    const listView = document.getElementById('friendsListView');
    const detailView = document.getElementById('friendDetailView');
    if (listView) listView.hidden = false;
    if (detailView) detailView.hidden = true;
    selectedFriendId = null;
}

function showFriendDetail() {
    const listView = document.getElementById('friendsListView');
    const detailView = document.getElementById('friendDetailView');
    if (listView) listView.hidden = true;
    if (detailView) detailView.hidden = false;
}

function setupFriendsListeners() {
    const refreshBtn = document.getElementById('refreshFriendsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.setAttribute('disabled', 'disabled');
            refreshBtn.classList.add('is-loading');
            try {
                await loadFriendsPage();
            } finally {
                refreshBtn.removeAttribute('disabled');
                refreshBtn.classList.remove('is-loading');
            }
        });
    }

    const backBtn = document.getElementById('friendBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showFriendsList();
        });
    }
}

async function loadFriendsPage() {
    showFriendsList();
    const listPanel = document.getElementById('friendsListPanel');
    if (!listPanel) return;

    listPanel.innerHTML = '<p class="empty-state">Loading friends...</p>';

    try {
        friendsCache = await api.getFriends();
        renderFriendsList(friendsCache);
    } catch (error) {
        console.error('Error loading friends:', error);
        listPanel.innerHTML = '<p class="error-message">Failed to load friends. Please try again.</p>';
    }
}

function renderFriendsList(friends) {
    const listPanel = document.getElementById('friendsListPanel');
    listPanel.innerHTML = '';

    if (!friends || friends.length === 0) {
        listPanel.innerHTML = '<p class="empty-state">No friends yet. Add some on the Social page!</p>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'friends-list';

    friends.forEach(friend => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'friends-list-item';
        if (friend.id === selectedFriendId) {
            item.classList.add('active');
        }
        const avatarUrl = friend.account_profile?.avatar_url || '/images/app-icon.svg';
        const bio = friend.account_profile?.bio || '';
        item.innerHTML = `
            <div class="friends-list-main">
                <img src="${avatarUrl}" alt="${friend.username} profile photo" class="friends-avatar" onerror="this.src='/images/app-icon.svg'">
                <div>
                    <strong>@${friend.username}</strong>
                    ${bio ? `<span class="friends-meta">${bio.slice(0, 70)}</span>` : ''}
                    ${friend.created_at ? `<span class="friends-meta">Joined ${new Date(friend.created_at).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
            <span class="friends-list-chevron">›</span>
        `;
        item.addEventListener('click', () => {
            selectFriend(friend);
        });
        list.appendChild(item);
    });

    listPanel.appendChild(list);
}

async function selectFriend(friend) {
    selectedFriendId = friend.id;
    showFriendDetail();

    const titleEl = document.getElementById('friendDetailTitle');
    const subtitleEl = document.getElementById('friendDetailSubtitle');
    const recipesEl = document.getElementById('friendRecipes');
    const mealPlanEl = document.getElementById('friendMealPlan');

    if (titleEl) titleEl.textContent = `@${friend.username}`;
    if (subtitleEl) {
        const topMeals = friend.account_profile?.top_meals || [];
        const topMealHint = topMeals.length ? `Top meals selected: ${topMeals.length}.` : 'No top meals selected yet.';
        subtitleEl.textContent = `${friend.account_profile?.bio || 'Loading recipes and meal plan...'} ${topMealHint}`;
    }

    if (recipesEl) {
        recipesEl.innerHTML = '<p class="empty-state">Loading recipes...</p>';
    }
    if (mealPlanEl) {
        mealPlanEl.innerHTML = '<p class="empty-state">Loading meal plan...</p>';
    }

    try {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const end = new Date(today);
        end.setDate(end.getDate() + 13);
        const endDate = end.toISOString().split('T')[0];

        const [recipes, mealPlans] = await Promise.all([
            api.getUserRecipes(friend.id),
            api.getUserMealPlan(friend.id, startDate, endDate)
        ]);

        renderFriendRecipes(recipes, friend.username);
        renderFriendMealPlan(mealPlans);
        if (subtitleEl) {
            const topIds = friend.account_profile?.top_meals || [];
            const topTitles = topIds
                .map((id) => recipes.find((recipe) => recipe.id === Number(id))?.title)
                .filter(Boolean)
                .slice(0, 3);
            const topMealsText = topTitles.length ? `Top meals: ${topTitles.join(', ')}` : 'No top meals selected yet.';
            const bioText = friend.account_profile?.bio || 'Recipes and upcoming meals (next 14 days).';
            subtitleEl.textContent = `${bioText} ${topMealsText}`;
        }
    } catch (error) {
        console.error('Error loading friend details:', error);
        if (subtitleEl) subtitleEl.textContent = 'Unable to load details. Please try again.';
        if (recipesEl) {
            recipesEl.innerHTML = '<p class="error-message">Failed to load recipes.</p>';
        }
        if (mealPlanEl) {
            mealPlanEl.innerHTML = '<p class="error-message">Failed to load meal plan.</p>';
        }
    }
}

function renderFriendRecipes(recipes, username) {
    const recipesEl = document.getElementById('friendRecipes');
    if (!recipesEl) return;

    recipesEl.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        recipesEl.innerHTML = `<p class="empty-state">${username} has not shared any recipes yet.</p>`;
        return;
    }

    recipes.forEach(recipe => {
        if (window.createUserRecipeCard) {
            recipesEl.appendChild(window.createUserRecipeCard(recipe));
        } else {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-card-image" onerror="this.style.display='none'">` : ''}
                <div class="recipe-card-content">
                    <h3 class="recipe-card-title">${recipe.title}</h3>
                    ${recipe.description ? `<p class="recipe-card-description">${recipe.description}</p>` : ''}
                </div>
            `;
            recipesEl.appendChild(card);
        }
    });
}

function renderFriendMealPlan(mealPlans) {
    const mealPlanEl = document.getElementById('friendMealPlan');
    if (!mealPlanEl) return;

    mealPlanEl.innerHTML = '';

    if (!mealPlans || mealPlans.length === 0) {
        mealPlanEl.innerHTML = '<p class="empty-state">No upcoming meals shared yet.</p>';
        return;
    }

    const grouped = mealPlans.reduce((acc, plan) => {
        const dateKey = plan.planned_date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(plan);
        return acc;
    }, {});

    Object.keys(grouped).sort().forEach(dateKey => {
        const dateBlock = document.createElement('div');
        dateBlock.className = 'friends-mealplan-day';
        const date = new Date(dateKey);
        dateBlock.innerHTML = `
            <h4>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
            <div class="friends-mealplan-items"></div>
        `;
        const itemsContainer = dateBlock.querySelector('.friends-mealplan-items');
        grouped[dateKey].forEach(plan => {
            const item = document.createElement('div');
            item.className = 'friends-mealplan-item';
            item.innerHTML = `
                <span class="friends-mealplan-type">${plan.meal_type}</span>
                <span class="friends-mealplan-recipe">${plan.recipe ? plan.recipe.title : 'Meal'}</span>
            `;
            itemsContainer.appendChild(item);
        });
        mealPlanEl.appendChild(dateBlock);
    });
}

window.loadFriendsPage = loadFriendsPage;
