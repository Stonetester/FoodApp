// Social features: friend requests and friends list

document.addEventListener('DOMContentLoaded', () => {
    setupSocialListeners();
    startSocialPolling();
});

let friendSearchTimeout = null;

function setupSocialListeners() {
    const sendBtn = document.getElementById('sendFriendRequestBtn');
    const friendInput = document.getElementById('friendUsernameInput');
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
                await api.sendFriendRequest(username);
                status.textContent = `Friend request sent to ${username}.`;
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
}

async function loadSocialData() {
    try {
        const [friends, requests] = await Promise.all([
            api.getFriends(),
            api.getFriendRequests()
        ]);
        renderFriendRequests(requests);
        renderFriendsList(friends);
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

function renderFriendsList(friends) {
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
        alert(error.message || 'Failed to update request.');
    }
}

async function removeFriend(friendId) {
    if (!confirm('Remove this friend?')) {
        return;
    }
    
    try {
        await api.removeFriend(friendId);
        await loadSocialData();
    } catch (error) {
        alert(error.message || 'Failed to remove friend.');
    }
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
