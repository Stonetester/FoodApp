// Social features: friend requests and friends list

document.addEventListener('DOMContentLoaded', () => {
    setupSocialListeners();
});

function setupSocialListeners() {
    const sendBtn = document.getElementById('sendFriendRequestBtn');
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
                await loadSocialData();
            } catch (error) {
                status.textContent = error.message || 'Failed to send request.';
                status.classList.add('status-error');
            }
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
