// Account page logic (public profile, avatar, bio, top meals)

let accountRecipesCache = [];

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('accountProfileForm');
    const topMealsForm = document.getElementById('accountTopMealsForm');

    if (profileForm) {
        profileForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await saveAccountProfile();
        });
    }

    if (topMealsForm) {
        topMealsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await saveAccountProfile();
        });
    }
});

function setAccountStatus(message, isError = false) {
    const status = document.getElementById('accountStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('status-error', isError);
}

function renderAccountPreview(user, profile, stats = {}) {
    const avatar = document.getElementById('accountPreviewAvatar');
    const usernameEl = document.getElementById('accountPreviewUsername');
    const bioEl = document.getElementById('accountPreviewBio');
    const emailEl = document.getElementById('accountPreviewEmail');
    const joinedEl = document.getElementById('accountPreviewJoined');
    const mealsEl = document.getElementById('accountPreviewMeals');
    const friendCountEl = document.getElementById('accountFriendCount');
    const recipeCountEl = document.getElementById('accountRecipeCount');

    if (!avatar || !usernameEl || !bioEl || !mealsEl) return;

    usernameEl.textContent = user?.username || 'Your username';
    avatar.src = profile.avatar_url || '/images/app-icon.svg';
    avatar.onerror = () => {
        avatar.src = '/images/app-icon.svg';
    };

    bioEl.textContent = profile.bio || 'No bio yet.';
    bioEl.classList.toggle('empty-state', !profile.bio);

    if (emailEl) {
        emailEl.textContent = user?.email ? `Email: ${user.email}` : 'Email hidden';
    }
    if (joinedEl) {
        joinedEl.textContent = user?.created_at ? `Joined: ${new Date(user.created_at).toLocaleDateString()}` : 'Joined: -';
    }
    if (friendCountEl) {
        friendCountEl.textContent = Number(stats.friend_count || 0);
    }
    if (recipeCountEl) {
        recipeCountEl.textContent = Number(stats.recipe_count || 0);
    }

    const mealIds = profile.top_meals || [];
    mealsEl.innerHTML = '';

    if (!mealIds.length) {
        mealsEl.innerHTML = '<li class="empty-state">No top meals selected.</li>';
        return;
    }

    mealIds.forEach((mealId) => {
        const recipe = accountRecipesCache.find((item) => item.id === Number(mealId));
        const li = document.createElement('li');
        li.textContent = recipe ? recipe.title : `Meal #${mealId}`;
        mealsEl.appendChild(li);
    });
}

function populateTopMealOptions(recipes, selectedIds = []) {
    ['topMeal1', 'topMeal2', 'topMeal3'].forEach((id, index) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Choose a meal</option>';
        recipes.forEach((recipe) => {
            const option = document.createElement('option');
            option.value = String(recipe.id);
            option.textContent = recipe.title;
            if (String(selectedIds[index] || '') === String(recipe.id)) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });
}

function readTopMealSelection() {
    return ['topMeal1', 'topMeal2', 'topMeal3']
        .map((id) => document.getElementById(id)?.value)
        .filter(Boolean)
        .map((value) => Number(value));
}

async function loadAccountPage() {
    try {
        const [accountData, recipes] = await Promise.all([
            api.getMyAccountProfile(),
            api.getRecipes()
        ]);

        const user = accountData.user || {};
        const profile = accountData.account_profile || {};

        accountRecipesCache = recipes || [];

        document.getElementById('accountAvatarUrl').value = profile.avatar_url || '';
        document.getElementById('accountBio').value = profile.bio || '';

        populateTopMealOptions(accountRecipesCache, profile.top_meals || []);
        renderAccountPreview(user, profile, accountData.stats || {});
        setAccountStatus('');
    } catch (error) {
        setAccountStatus(error.message || 'Failed to load account profile.', true);
    }
}

async function saveAccountProfile() {
    const avatarUrl = document.getElementById('accountAvatarUrl')?.value?.trim() || '';
    const bio = document.getElementById('accountBio')?.value?.trim() || '';
    const topMeals = readTopMealSelection();

    try {
        const result = await api.updateAccountProfile({
            avatar_url: avatarUrl,
            bio,
            top_meals: topMeals,
        });

        const accountData = await api.getMyAccountProfile();
        renderAccountPreview(accountData.user, result.profile || { avatar_url: avatarUrl, bio, top_meals: topMeals }, accountData.stats || {});
        setAccountStatus('Account profile saved. Friends can now see your updates.');
    } catch (error) {
        setAccountStatus(error.message || 'Failed to save account profile.', true);
    }
}

window.loadAccountPage = loadAccountPage;
