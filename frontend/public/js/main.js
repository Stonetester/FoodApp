// Main Application Logic - Routing and Authentication

let currentUser = null;

const maintenanceAnnouncement = {
    enabled: true,
    message: 'We will be performing scheduled maintenance tonight from 11 PM–1 AM. Some features may be unavailable.'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupResponsiveClass();
    applyMaintenanceBanners();
});

async function initializeApp() {
    // Check if user is logged in
    try {
        const user = await api.getCurrentUser();
        currentUser = user;
        showApp();
        updateRecipesTitle();
    } catch (error) {
        console.log('User not logged in, showing login page');
        showLogin();
    }

    setupEventListeners();
}

// Fallback: If API is not available, show login page
if (typeof api === 'undefined') {
    console.error('API service not loaded!');
    // Show login page as fallback
    setTimeout(() => {
        const loginPage = document.getElementById('loginPage');
        if (loginPage) {
            loginPage.classList.add('active');
        }
    }, 100);
}

function setupEventListeners() {
    // Login/Register tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // Login form
    document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    // Register form
    document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRegister();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await handleLogout();
    });

    // Dashboard stat cards navigation
    document.querySelectorAll('.stat-card[data-page]').forEach(card => {
        card.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            if (page) {
                navigateToPage(page);
            }
        });
    });

    // Dashboard meal plan shortcuts
    const viewMealPlanBtn = document.getElementById('viewMealPlanBtn');
    if (viewMealPlanBtn) {
        viewMealPlanBtn.addEventListener('click', () => {
            navigateToPage('mealplan');
        });
    }
    document.querySelectorAll('.btn-link[data-day]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = e.currentTarget.dataset.day;
            const targetDate = new Date();
            if (day === 'tomorrow') {
                targetDate.setDate(targetDate.getDate() + 1);
            }
            navigateToPage('mealplan');
            const dateStr = targetDate.toISOString().split('T')[0];
            setTimeout(() => {
                if (window.showDayDetail) {
                    window.showDayDetail(dateStr);
                }
            }, 300);
        });
    });

    // Navigation
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            navigateToPage(page);
        });
    });

    document.querySelectorAll('.page-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            if (page) {
                navigateToPage(page);
            }
        });
    });

    document.querySelectorAll('.bottom-nav__link[data-page]').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            if (page) {
                navigateToPage(page);
            }
        });
    });

    document.querySelectorAll('.sheet-link[data-page]').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            if (page) {
                navigateToPage(page);
            }
        });
    });

    // Mobile menu toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    const moreTabBtn = document.getElementById('moreTabBtn');
    const moreSheetClose = document.getElementById('moreSheetClose');
    const moreSheetBackdrop = document.getElementById('moreSheetBackdrop');

    if (moreTabBtn) {
        moreTabBtn.addEventListener('click', () => {
            toggleMoreSheet();
        });
    }

    if (moreSheetClose) {
        moreSheetClose.addEventListener('click', () => {
            toggleMoreSheet(false);
        });
    }

    if (moreSheetBackdrop) {
        moreSheetBackdrop.addEventListener('click', () => {
            toggleMoreSheet(false);
        });
    }

    const logoutBtnSheet = document.getElementById('logoutBtnSheet');
    if (logoutBtnSheet) {
        logoutBtnSheet.addEventListener('click', async () => {
            await handleLogout();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            toggleMoreSheet(false);
        }
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.form-container').forEach(container => {
        container.classList.remove('active');
    });

    if (tab === 'login') {
        document.querySelector('.tab-btn[data-tab="login"]').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.tab-btn[data-tab="register"]').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const result = await api.login(username, password);
        currentUser = result.user;
        showApp();
        updateRecipesTitle();
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed';
        errorDiv.classList.add('show');
    }
}

async function handleRegister() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        await api.register(username, email, password);
        // Switch to login tab after successful registration
        switchTab('login');
        document.getElementById('loginUsername').value = username;
        errorDiv.textContent = 'Registration successful! Please login.';
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 3000);
    } catch (error) {
        errorDiv.textContent = error.message || 'Registration failed';
        errorDiv.classList.add('show');
    }
}

async function handleLogout() {
    try {
        await api.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        currentUser = null;
        showLogin();
    }
}

function showLogin() {
    hideAllPages();
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('navbar').style.display = 'none';
    document.body.classList.remove('app-authenticated');
    toggleMoreSheet(false);
}

function showApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('navbar').style.display = '';
    document.body.classList.add('app-authenticated');
    navigateToPage('dashboard');
    loadDashboard();
    handleSharedRecipeLink();
}

function updateRecipesTitle() {
    const titleEl = document.getElementById('recipesTitle');
    if (!titleEl) return;
    const username = currentUser?.username || 'Your';
    titleEl.textContent = `${username}'s Recipes`;
}

function handleSharedRecipeLink() {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get('recipe');
    if (!recipeId) {
        return;
    }
    
    const recipeIdNumber = parseInt(recipeId, 10);
    if (Number.isNaN(recipeIdNumber)) {
        return;
    }
    
    navigateToPage('userSearch');
    setTimeout(() => {
        if (window.viewDiscoverRecipeDetail) {
            window.viewDiscoverRecipeDetail(recipeIdNumber);
        }
    }, 400);
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

function navigateToPage(pageName) {
    hideAllPages();
    if (window.stopSocialPolling) window.stopSocialPolling();
    
    const pageMap = {
        'dashboard': 'dashboardPage',
        'recipes': 'recipesPage',
        'pantry': 'pantryPage',
        'mealplan': 'mealplanPage',
        'history': 'historyPage',
        'userSearch': 'userSearchPage',
        'social': 'socialPage',
        'friends': 'friendsPage',
        'settings': 'settingsPage'
    };

    const pageId = pageMap[pageName];
    if (pageId) {
        document.getElementById(pageId).classList.add('active');
        
        // Load page-specific data
        if (pageName === 'recipes') {
            loadRecipes();
        } else if (pageName === 'userSearch') {
            if (window.loadDiscoverRecipes) {
                window.loadDiscoverRecipes();
            }
        } else if (pageName === 'social') {
            if (window.loadSocialData) window.loadSocialData();
            if (window.startSocialPolling) window.startSocialPolling();
        } else if (pageName === 'friends') {
            if (window.loadFriendsPage) window.loadFriendsPage();
        } else if (pageName === 'pantry') {
            loadPantry();
        } else if (pageName === 'mealplan') {
            loadMealPlan();
        } else if (pageName === 'history') {
            loadHistory();
        } else if (pageName === 'settings') {
            if (window.loadSettingsPage) window.loadSettingsPage();
        }
    }

    // Close mobile menu
    document.getElementById('navMenu').classList.remove('active');
    closeAllSheetsAndModals();
    updateActiveNav(pageName);

    if (pageName === 'mealplan' && window.innerWidth < 768) {
        setTimeout(() => {
            const activeView = document.querySelector('.view-switcher .view-btn.active')?.dataset.view;
            if (activeView === 'dayGridMonth') {
                document.querySelector('.view-switcher .view-btn[data-view="mealWeek"]')?.click();
            }
        }, 120);
    }
}

async function loadDashboard() {
    try {
        const recipes = await api.getRecipes();
        const pantryItems = await api.getPantryItems();
        const mealPlans = await api.getMealPlan();
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const upcomingMeals = await api.getMealPlan(
            today.toISOString().split('T')[0],
            tomorrow.toISOString().split('T')[0]
        );

        document.getElementById('recipeCount').textContent = recipes.length;
        document.getElementById('pantryCount').textContent = pantryItems.length;
        document.getElementById('mealPlanCount').textContent = mealPlans.length;

        // Show recent recipes
        const recentRecipes = recipes.slice(0, 6);
        const recentRecipesContainer = document.getElementById('recentRecipes');
        recentRecipesContainer.innerHTML = '';

        if (recentRecipes.length === 0) {
            recentRecipesContainer.innerHTML = '<p>No recipes yet. Add your first recipe!</p>';
        } else {
            recentRecipes.forEach(recipe => {
                recentRecipesContainer.appendChild(createRecipeCard(recipe));
            });
        }

        renderUpcomingMeals(upcomingMeals, today, tomorrow);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function renderUpcomingMeals(upcomingMeals, today, tomorrow) {
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const todayContainer = document.getElementById('upcomingMealsToday');
    const tomorrowContainer = document.getElementById('upcomingMealsTomorrow');
    
    if (!todayContainer || !tomorrowContainer) {
        return;
    }
    
    const mealsByDate = {
        [todayStr]: [],
        [tomorrowStr]: []
    };
    
    upcomingMeals.forEach(meal => {
        const dateKey = meal.planned_date;
        if (mealsByDate[dateKey]) {
            mealsByDate[dateKey].push(meal);
        }
    });
    
    const renderList = (container, meals) => {
        container.innerHTML = '';
        if (!meals || meals.length === 0) {
            container.innerHTML = '<p class="empty-state">No meals planned yet.</p>';
            return;
        }
        
        meals.forEach(meal => {
            const item = document.createElement('div');
            item.className = 'upcoming-meal-item';
            item.innerHTML = `
                <div class="upcoming-meal-info">
                    <span class="meal-type-badge">${meal.meal_type}</span>
                    <h4>${meal.recipe ? meal.recipe.title : 'Meal'}</h4>
                    ${meal.recipe && meal.recipe.image_url ? `<img src="${meal.recipe.image_url}" alt="${meal.recipe.title}" class="upcoming-meal-image">` : ''}
                    ${meal.notes ? `<p class="upcoming-notes">${meal.notes}</p>` : ''}
                </div>
                <button class="btn btn-secondary" data-recipe-id="${meal.recipe_id}">View Recipe</button>
            `;
            const button = item.querySelector('button');
            button.addEventListener('click', () => {
                viewRecipe(meal.recipe_id);
            });
            container.appendChild(item);
        });
    };
    
    renderList(todayContainer, mealsByDate[todayStr]);
    renderList(tomorrowContainer, mealsByDate[tomorrowStr]);
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.addEventListener('click', () => viewRecipe(recipe.id));

    const tagsHtml = recipe.tags.map(tag => 
        `<span class="recipe-tag">${tag}</span>`
    ).join('');

    card.innerHTML = `
        ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-card-image" onerror="this.style.display='none'">` : ''}
        <div class="recipe-card-content">
            <h3 class="recipe-card-title">${recipe.title}</h3>
            <p class="recipe-card-description">${recipe.description || ''}</p>
            <div class="recipe-card-tags">${tagsHtml}</div>
        </div>
    `;

    return card;
}

function viewRecipe(id) {
    navigateToPage('recipes');
    // This will be handled by recipes.js
    setTimeout(() => {
        if (window.viewRecipeDetail) {
            window.viewRecipeDetail(id);
        }
    }, 100);
}

function setupResponsiveClass() {
    const apply = () => {
        document.body.classList.toggle('is-mobile', window.innerWidth < 768);
    };
    apply();
    window.addEventListener('resize', apply);
}

function closeAllSheetsAndModals() {
    toggleMoreSheet(false);
    document.querySelectorAll('.modal.active').forEach((modal) => {
        modal.classList.remove('active');
    });
}

function toggleMoreSheet(shouldOpen) {
    const sheet = document.getElementById('moreSheet');
    const backdrop = document.getElementById('moreSheetBackdrop');
    const moreTabBtn = document.getElementById('moreTabBtn');
    if (!sheet || !backdrop || !moreTabBtn) return;
    const isOpen = shouldOpen ?? !sheet.classList.contains('is-open');
    sheet.classList.toggle('is-open', isOpen);
    backdrop.classList.toggle('is-open', isOpen);
    sheet.setAttribute('aria-hidden', String(!isOpen));
    backdrop.setAttribute('aria-hidden', String(!isOpen));
    moreTabBtn.setAttribute('aria-expanded', String(isOpen));
}

function updateActiveNav(pageName) {
    const navLinks = document.querySelectorAll('.nav-link[data-page], .nav-link-inline[data-page]');
    const bottomLinks = document.querySelectorAll('.bottom-nav__link[data-page]');
    const moreTabBtn = document.getElementById('moreTabBtn');
    navLinks.forEach(link => link.classList.toggle('is-active', link.dataset.page === pageName));
    bottomLinks.forEach(link => link.classList.toggle('is-active', link.dataset.page === pageName));
    const morePages = ['history', 'friends', 'userSearch', 'settings'];
    if (moreTabBtn) {
        moreTabBtn.classList.toggle('is-active', morePages.includes(pageName));
    }

    document.querySelectorAll('.sheet-link[data-page]').forEach((sheetLink) => {
        sheetLink.classList.toggle('is-active', sheetLink.dataset.page === pageName);
    });
}

function applyMaintenanceBanners() {
    const banners = document.querySelectorAll('[data-maintenance-banner]');
    const isEnabled = maintenanceAnnouncement.enabled;
    banners.forEach((banner) => {
        const messageEl = banner.querySelector('[data-maintenance-message]');
        if (messageEl) {
            messageEl.textContent = maintenanceAnnouncement.message;
        }
        banner.classList.toggle('is-hidden', !isEnabled);
    });
    document.body.classList.toggle('has-maintenance-banner', isEnabled);
}


// Export for use in other modules
window.navigateToPage = navigateToPage;
window.currentUser = () => currentUser;
