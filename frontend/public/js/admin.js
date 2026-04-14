// Admin panel — only reachable by users with is_admin=true
// Routes: GET /api/admin/users, DELETE /api/admin/users/:id, POST /api/admin/users/:id/toggle-admin

let adminAllUsers = [];

function loadAdminPage() {
    fetchAdminUsers();
    setupAdminSearch();
}

async function fetchAdminUsers() {
    const listEl = document.getElementById('adminUserList');
    const statsEl = document.getElementById('adminStats');
    if (!listEl) return;

    listEl.innerHTML = '<div class="empty-state">Loading…</div>';

    try {
        const data = await api.request('/api/admin/users');
        adminAllUsers = Array.isArray(data) ? data : (data.users || []);
        renderAdminStats(statsEl, adminAllUsers);
        renderAdminUsers(listEl, adminAllUsers);
    } catch (err) {
        listEl.innerHTML = '<div class="empty-state">Failed to load users.</div>';
    }
}

function renderAdminStats(el, users) {
    if (!el) return;
    const total = users.length;
    const admins = users.filter(u => u.is_admin).length;
    const totalRecipes = users.reduce((s, u) => s + (u.recipe_count || 0), 0);
    el.innerHTML = `
        <div class="admin-stat-card">
            <span class="admin-stat-value">${total}</span>
            <span class="admin-stat-label">Users</span>
        </div>
        <div class="admin-stat-card">
            <span class="admin-stat-value">${admins}</span>
            <span class="admin-stat-label">Admins</span>
        </div>
        <div class="admin-stat-card">
            <span class="admin-stat-value">${totalRecipes}</span>
            <span class="admin-stat-label">Recipes</span>
        </div>
    `;
}

function renderAdminUsers(el, users) {
    if (!el) return;
    if (users.length === 0) {
        el.innerHTML = '<div class="empty-state">No users found.</div>';
        return;
    }

    el.innerHTML = users.map(u => `
        <div class="admin-user-row" data-user-id="${u.id}">
            <div class="admin-user-info">
                <span class="admin-user-name">${escapeHtml(u.username)}</span>
                <span class="admin-user-email">${escapeHtml(u.email)}</span>
                <span class="admin-user-meta">${u.recipe_count} recipes · ${u.pantry_count} pantry items · joined ${formatAdminDate(u.created_at)}</span>
            </div>
            <div class="admin-user-badges">
                ${u.is_admin ? '<span class="admin-badge">Admin</span>' : ''}
            </div>
            <div class="admin-user-actions">
                <button class="btn btn-ghost admin-toggle-btn" data-user-id="${u.id}" data-username="${escapeHtml(u.username)}" data-is-admin="${u.is_admin}" aria-label="Toggle admin for ${escapeHtml(u.username)}">
                    ${u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                </button>
                <button class="btn btn-destructive admin-delete-btn" data-user-id="${u.id}" data-username="${escapeHtml(u.username)}" aria-label="Delete ${escapeHtml(u.username)}">
                    Delete
                </button>
            </div>
        </div>
    `).join('');

    el.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAdminDelete(parseInt(btn.dataset.userId), btn.dataset.username));
    });
    el.querySelectorAll('.admin-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAdminToggle(parseInt(btn.dataset.userId), btn.dataset.username, btn.dataset.isAdmin === 'true'));
    });
}

function handleAdminDelete(userId, username) {
    showConfirm(
        `Permanently delete "${username}"? This removes all their recipes, pantry items, and meal plans. This cannot be undone.`,
        () => {
            api.request(`/api/admin/users/${userId}`, { method: 'DELETE' })
                .then(() => {
                    showToast(`Account "${username}" deleted.`, 'success');
                    adminAllUsers = adminAllUsers.filter(u => u.id !== userId);
                    applyAdminFilter();
                })
                .catch(err => {
                    showToast(err.message || 'Failed to delete account.', 'error');
                });
        },
        'Delete Account',
        true
    );
}

function handleAdminToggle(userId, username, currentlyAdmin) {
    const label = currentlyAdmin ? 'Revoke Admin' : 'Make Admin';
    const msg = currentlyAdmin
        ? `Revoke admin privileges from "${username}"?`
        : `Grant admin privileges to "${username}"?`;

    showConfirm(msg, () => {
        api.request(`/api/admin/users/${userId}/toggle-admin`, { method: 'POST' })
            .then(result => {
                showToast(result.message || 'Updated.', 'success');
                const user = adminAllUsers.find(u => u.id === userId);
                if (user) user.is_admin = result.is_admin;
                applyAdminFilter();
            })
            .catch(err => {
                showToast(err.message || 'Failed to update admin status.', 'error');
            });
    }, label, false);
}

function applyAdminFilter() {
    const val = (document.getElementById('adminSearchInput')?.value || '').trim().toLowerCase();
    const filtered = val
        ? adminAllUsers.filter(u => u.username.toLowerCase().includes(val) || u.email.toLowerCase().includes(val))
        : adminAllUsers;
    renderAdminStats(document.getElementById('adminStats'), adminAllUsers);
    renderAdminUsers(document.getElementById('adminUserList'), filtered);
}

function setupAdminSearch() {
    const input = document.getElementById('adminSearchInput');
    if (!input || input.dataset.adminSearchBound) return;
    input.dataset.adminSearchBound = 'true';
    input.addEventListener('input', applyAdminFilter);
}

function formatAdminDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

window.loadAdminPage = loadAdminPage;
