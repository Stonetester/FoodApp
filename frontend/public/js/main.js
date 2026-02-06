// Main Application Logic - Routing and Authentication

let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Check if user is logged in
    try {
        const user = await api.getCurrentUser();
        currentUser = user;
        showApp();
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

    // Navigation
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            navigateToPage(page);
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
        currentUser = null;
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showLogin() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('navbar').style.display = 'none';
    hideAllPages();
}

function showApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('navbar').style.display = 'block';
    navigateToPage('dashboard');
    loadDashboard();
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

function navigateToPage(pageName) {
    hideAllPages();
    
    const pageMap = {
        'dashboard': 'dashboardPage',
        'recipes': 'recipesPage',
        'pantry': 'pantryPage',
        'mealplan': 'mealplanPage',
        'history': 'historyPage'
    };

    const pageId = pageMap[pageName];
    if (pageId) {
        document.getElementById(pageId).classList.add('active');
        
        // Load page-specific data
        if (pageName === 'recipes') {
            loadRecipes();
        } else if (pageName === 'pantry') {
            loadPantry();
        } else if (pageName === 'mealplan') {
            loadMealPlan();
        } else if (pageName === 'history') {
            loadHistory();
        }
    }

    // Close mobile menu
    document.getElementById('navMenu').classList.remove('active');
}

async function loadDashboard() {
    try {
        const recipes = await api.getRecipes();
        const pantryItems = await api.getPantryItems();
        const mealPlans = await api.getMealPlan();

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
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
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

// Export for use in other modules
window.navigateToPage = navigateToPage;
window.currentUser = () => currentUser;

