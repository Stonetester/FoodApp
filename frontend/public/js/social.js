// Social features: friend requests and friends list

document.addEventListener('DOMContentLoaded', () => {
    setupSocialListeners();
});

let friendSearchTimeout = null;
let socialPollInterval = null;


function setupSocialListeners() {
    const sendBtn = document.getElementById('sendFriendRequestBtn');
    const friendInput = document.getElementById('friendUsernameInput');
    const refreshBtn = document.getElementById('refreshSocialBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const input = document.getElementById('friendUsernameInput');
            const status = document.getElementById('friendRequestStatus');
            const username = input.value.trim();

            if (!username) {
                status.textContent = 'Please enter a username.';
                status.classList.add('status-error');
                return;
            }

            status.textContent = 'Sending request...';
            status.classList.remove('status-error');

            try {
                const matches = await api.searchUsers(username);

                const exact = (matches || []).find(u => (u.username || '').toLowerCase() === username.toLowerCase());
                const target = exact || (matches && matches[0]);

                if (!target) {
                    throw new Error(`User "${username}" not found.`);
                }

                await api.sendFriendRequest(target.id);

                status.textContent = `Friend request sent to ${target.username}.`;
                status.classList.remove('status-error');
                input.value = '';
                renderFriendSearchResults([]);
                await loadSocialData();
            } catch (error) {
                status.textContent = error.message || 'Failed to send request.';
                status.classList.add('status-error');
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.setAttribute('disabled', 'disabled');
            refreshBtn.classList.add('is-loading');
            try {
                await loadSocialData();
            } finally {
                refreshBtn.removeAttribute('disabled');
                refreshBtn.classList.remove('is-loading');
            }
        });
    }

    if (friendInput) {
        friendInput.addEventListener('input', () => {
            const query = friendInput.value.trim();
            if (friendSearchTimeout) {
                clearTimeout(friendSearchTimeout);
            }
            friendSearchTimeout = setTimeout(() => {
                loadFriendSearchResults(query);
            }, 250);
        });
    }

    setupSocialTabs();
}

function setupSocialTabs() {
    document.querySelectorAll('.social-tab[data-social-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            // Update tab buttons
            document.querySelectorAll('.social-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update tab content
            document.querySelectorAll('.social-tab-content').forEach(c => c.classList.remove('active'));
            const target = tab.dataset.socialTab;
            if (target === 'activity') {
                document.getElementById('socialActivityTab')?.classList.add('active');
            } else if (target === 'friends') {
                document.getElementById('socialFriendsTab')?.classList.add('active');
                if (window.loadFriendsPage) window.loadFriendsPage();
            }
        });
    });
}

function activateSocialFriendsTab() {
    const friendsTab = document.querySelector('.social-tab[data-social-tab="friends"]');
    if (friendsTab) friendsTab.click();
}
window.activateSocialFriendsTab = activateSocialFriendsTab;

async function handleFriendRequestSubmit() {
    const input = document.getElementById('friendUsernameInput');
    const status = document.getElementById('friendRequestStatus');
    if (!input || !status) {
        return;
    }
    const username = input.value.trim();

    if (!username) {
        status.textContent = 'Please enter a username.';
        status.classList.add('status-error');
        return;
    }

    status.textContent = 'Sending request...';
    status.classList.remove('status-error');

    try {
        await sendFriendRequestSafe(username);
        status.textContent = `Friend request sent to ${username}.`;
        status.classList.remove('status-error');
        input.value = '';
        renderFriendSearchResults([]);
        await loadSocialData();
    } catch (error) {
        status.textContent = error.message || 'Failed to send request.';
        status.classList.add('status-error');
    }
}

function stopSocialPolling() {
    if (socialPollInterval) {
        clearInterval(socialPollInterval);
        socialPollInterval = null;
    }
}

window.startSocialPolling = startSocialPolling;
window.stopSocialPolling = stopSocialPolling;


function startSocialPolling() {
    if (socialPollInterval) {
        return;
    }
    const socialPage = document.getElementById('socialPage');
    if (socialPage && socialPage.classList.contains('active')) {
        loadSocialData();
    }
    socialPollInterval = setInterval(() => {
        const activePage = document.getElementById('socialPage');
        if (activePage && activePage.classList.contains('active')) {
            loadSocialData();
        }
    }, 10000);
}

async function sendFriendRequestSafe(username) {
    const matches = await api.searchUsers(username);
    const exact = (matches || []).find(u => (u.username || '').toLowerCase() === username.toLowerCase());
    const target = exact || (matches && matches[0]);

    if (!target) {
        throw new Error(`User "${username}" not found.`);
    }

    return api.sendFriendRequest(target.id);
}

async function loadSocialData() {
    try {
        const [friends, requests] = await Promise.all([
            api.getFriends(),
            api.getFriendRequests()
        ]);
        renderFriendRequests(requests);
        renderSocialFriendsList(friends);
    } catch (error) {
        console.error('Error loading social data:', error);
    }
}

function renderFriendRequests(requests) {
    const incomingContainer = document.getElementById('incomingRequests');
    const outgoingContainer = document.getElementById('outgoingRequests');
    
    if (incomingContainer) {
        incomingContainer.innerHTML = '';
        if (!requests.incoming || requests.incoming.length === 0) {
            incomingContainer.innerHTML = '<p class="empty-state">No pending requests.</p>';
        } else {
            requests.incoming.forEach(req => {
                const item = document.createElement('div');
                item.className = 'social-list-item';
                item.innerHTML = `
                    <span>@${req.user.username}</span>
                    <div class="action-buttons">
                        <button class="btn btn-primary" data-action="accept">Accept</button>
                        <button class="btn btn-secondary" data-action="decline">Decline</button>
                    </div>
                `;
                item.querySelector('[data-action="accept"]').addEventListener('click', () => respondToRequest(req.id, 'accept'));
                item.querySelector('[data-action="decline"]').addEventListener('click', () => respondToRequest(req.id, 'decline'));
                incomingContainer.appendChild(item);
            });
        }
    }
    
    if (outgoingContainer) {
        outgoingContainer.innerHTML = '';
        if (!requests.outgoing || requests.outgoing.length === 0) {
            outgoingContainer.innerHTML = '<p class="empty-state">No outgoing requests.</p>';
        } else {
            requests.outgoing.forEach(req => {
                const item = document.createElement('div');
                item.className = 'social-list-item';
                item.innerHTML = `
                    <span>@${req.user.username}</span>
                    <span class="status-message">Pending</span>
                `;
                outgoingContainer.appendChild(item);
            });
        }
    }
}

function renderSocialFriendsList(friends) {
    const friendsContainer = document.getElementById('friendsList');
    if (!friendsContainer) return;
    
    friendsContainer.innerHTML = '';
    
    if (!friends || friends.length === 0) {
        friendsContainer.innerHTML = '<p class="empty-state">No friends added yet.</p>';
        return;
    }
    
    friends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'social-list-item';
        item.innerHTML = `
            <span>@${friend.username}</span>
            <button class="btn btn-secondary" data-action="remove">Remove</button>
        `;
        item.querySelector('[data-action="remove"]').addEventListener('click', () => removeFriend(friend.id));
        friendsContainer.appendChild(item);
    });
}

async function respondToRequest(requestId, action) {
    try {
        await api.respondToFriendRequest(requestId, action);
        await loadSocialData();
    } catch (error) {
        if (window.showToast) window.showToast(error.message || 'Failed to update request.', 'error');
    }
}

async function removeFriend(friendId) {
    window.showConfirm('Remove this friend?', async () => {
        try {
            await api.removeFriend(friendId);
            await loadSocialData();
        } catch (error) {
            if (window.showToast) window.showToast(error.message || 'Failed to remove friend.', 'error');
        }
    }, 'Remove', true);
}

window.loadSocialData = loadSocialData;

async function loadFriendSearchResults(query) {
    const resultsContainer = document.getElementById('friendSearchResults');
    if (!resultsContainer) return;

    if (!query || query.length < 2) {
        renderFriendSearchResults([]);
        return;
    }

    resultsContainer.innerHTML = '<p class="status-message">Searching users...</p>';
    try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const users = await response.json();
        renderFriendSearchResults(users);
    } catch (error) {
        console.error('Error searching users for friends:', error);
        resultsContainer.innerHTML = '<p class="status-message status-error">Unable to load suggestions.</p>';
    }
}

function renderFriendSearchResults(users) {
    const resultsContainer = document.getElementById('friendSearchResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    if (!users || users.length === 0) {
        return;
    }

    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'friend-search-item';
        item.innerHTML = `
            <span>@${user.username}</span>
            <button class="btn btn-secondary" type="button" data-username="${user.username}">Select</button>
        `;
        item.querySelector('button')?.addEventListener('click', () => {
            const input = document.getElementById('friendUsernameInput');
            if (input) {
                input.value = user.username;
                renderFriendSearchResults([]);
            }
        });
        resultsContainer.appendChild(item);
    });
}
