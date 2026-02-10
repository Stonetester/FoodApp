// API Service - Handles all backend communication

const API_BASE_URL = '';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include', // Important for session cookies
        };

        try {
            const response = await fetch(url, config);
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Try to get text to see what we got
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error(`Server returned ${response.status}: ${response.statusText}. Expected JSON but got ${contentType || 'unknown'}`);
            }
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Request failed: ${response.status} ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            // If it's a JSON parse error, provide better message
            if (error.message && error.message.includes('JSON')) {
                throw new Error('Server returned invalid response. You may need to log in again or check your connection.');
            }
            throw error;
        }
    }

    // Authentication
    async login(username, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async register(username, email, password) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
    }

    async logout() {
        return this.request('/api/auth/logout', {
            method: 'POST',
        });
    }

    async getCurrentUser() {
        return this.request('/api/auth/me');
    }

    async updateProfile(profileData) {
        return this.request('/api/auth/settings/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    async changePassword(passwordData) {
        return this.request('/api/auth/settings/password', {
            method: 'PUT',
            body: JSON.stringify(passwordData),
        });
    }

    async deleteAccount(password) {
        return this.request('/api/auth/settings/account', {
            method: 'DELETE',
            body: JSON.stringify({ password, confirm: 'DELETE' }),
        });
    }


    async getAccountProfile() {
        return this.request('/api/auth/settings/account-profile');
    }

    async updateAccountProfile(profileData) {
        return this.request('/api/auth/settings/account-profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    // Recipes
    async getRecipes(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.tags) {
            filters.tags.forEach(tag => params.append('tags', tag));
        }
        const query = params.toString();
        return this.request(`/api/recipes${query ? '?' + query : ''}`);
    }

    async discoverRecipes(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.tags) {
            filters.tags.forEach(tag => params.append('tags', tag));
        }
        const query = params.toString();
        return this.request(`/api/recipes/discover${query ? '?' + query : ''}`);
    }

    async getDiscoverRecipe(id) {
        return this.request(`/api/recipes/discover/${id}`);
    }

    async getRecipe(id) {
        return this.request(`/api/recipes/${id}`);
    }

    async createRecipe(recipe) {
        return this.request('/api/recipes', {
            method: 'POST',
            body: JSON.stringify(recipe),
        });
    }

    async updateRecipe(id, recipe) {
        return this.request(`/api/recipes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(recipe),
        });
    }

    async deleteRecipe(id) {
        return this.request(`/api/recipes/${id}`, {
            method: 'DELETE',
        });
    }

    async getRecipeQR(id) {
        return this.request(`/api/recipes/${id}/qr`);
    }

    async importRecipeFromUrl(url) {
        return this.request('/api/recipes/import-url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
    }

    async importRecipeFromImage(imageData) {
        return this.request('/api/recipes/import-image', {
            method: 'POST',
            body: JSON.stringify({ image: imageData }),
        });
    }

    // Pantry
    async getPantryItems() {
        return this.request('/api/pantry');
    }

    async addPantryItem(item) {
        return this.request('/api/pantry', {
            method: 'POST',
            body: JSON.stringify(item),
        });
    }

    async updatePantryItem(id, item) {
        return this.request(`/api/pantry/${id}`, {
            method: 'PUT',
            body: JSON.stringify(item),
        });
    }

    async deletePantryItem(id) {
        return this.request(`/api/pantry/${id}`, {
            method: 'DELETE',
        });
    }

    async scanBarcode(barcode) {
        return this.request('/api/pantry/scan', {
            method: 'POST',
            body: JSON.stringify({ barcode }),
        });
    }

    // Meal Planning
    async getMealPlan(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const query = params.toString();
        return this.request(`/api/mealplan${query ? '?' + query : ''}`);
    }

    async addMealPlan(mealPlan) {
        return this.request('/api/mealplan', {
            method: 'POST',
            body: JSON.stringify(mealPlan),
        });
    }

    async updateMealPlan(id, mealPlan) {
        return this.request(`/api/mealplan/${id}`, {
            method: 'PUT',
            body: JSON.stringify(mealPlan),
        });
    }

    async deleteMealPlan(id) {
        return this.request(`/api/mealplan/${id}`, {
            method: 'DELETE',
        });
    }

    // Meal History
    async getMealHistory(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const query = params.toString();
        return this.request(`/api/history${query ? '?' + query : ''}`);
    }

    async logMeal(meal) {
        return this.request('/api/history', {
            method: 'POST',
            body: JSON.stringify(meal),
        });
    }

    // Friends & Social
    async getFriends() {
        return this.request('/api/friends');
    }

    async getUserRecipes(userId) {
        return this.request(`/api/users/${userId}/recipes`);
    }

    async getUserMealPlan(userId, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const query = params.toString();
        return this.request(`/api/users/${userId}/mealplan${query ? '?' + query : ''}`);
    }

    async getFriendRequests() {
        return this.request('/api/friends/requests');
    }

    async searchUsers(query) {
        const params = new URLSearchParams({ q: query });
        return this.request(`/api/users/search?${params.toString()}`);
    }

    async sendFriendRequest(receiverId) {
        return this.request('/api/friends/requests/send', {
            method: 'POST',
            body: JSON.stringify({ receiver_id: receiverId })
        });
    }

    async respondToFriendRequest(requestId, action) {
        return this.request('/api/friends/respond', {
            method: 'POST',
            body: JSON.stringify({ request_id: requestId, action })
        });
    }

    async removeFriend(friendId) {
        return this.request(`/api/friends/${friendId}`, {
            method: 'DELETE'
        });
    }
}

const api = new ApiService();
