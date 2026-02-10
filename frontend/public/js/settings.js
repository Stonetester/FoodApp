(function () {
    function setStatus(message, isError = false) {
        const status = document.getElementById('settingsStatus');
        if (!status) return;
        status.textContent = message;
        status.classList.add('show');
        if (isError) {
            status.style.backgroundColor = '#ffebee';
            status.style.color = 'var(--danger)';
        } else {
            status.style.backgroundColor = '#e8f5e9';
            status.style.color = '#2e7d32';
        }
    }

    function clearStatus() {
        const status = document.getElementById('settingsStatus');
        if (!status) return;
        status.textContent = '';
        status.classList.remove('show');
    }

    async function populateProfileForm() {
        const user = window.currentUser ? window.currentUser() : null;
        const usernameInput = document.getElementById('settingsUsername');
        const emailInput = document.getElementById('settingsEmail');
        if (!user || !usernameInput || !emailInput) return;
        usernameInput.value = user.username || '';
        emailInput.value = user.email || '';
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        clearStatus();

        const username = document.getElementById('settingsUsername').value.trim();
        const email = document.getElementById('settingsEmail').value.trim();

        try {
            const result = await api.updateProfileSettings(username, email);
            if (window.setCurrentUser && result.user) {
                window.setCurrentUser(result.user);
            }
            setStatus(result.message || 'Profile updated successfully');
        } catch (error) {
            setStatus(error.message || 'Failed to update profile', true);
        }
    }

    async function handlePasswordChange(event) {
        event.preventDefault();
        clearStatus();

        const currentPassword = document.getElementById('settingsCurrentPassword').value;
        const newPassword = document.getElementById('settingsNewPassword').value;

        try {
            const result = await api.changePassword(currentPassword, newPassword);
            document.getElementById('settingsCurrentPassword').value = '';
            document.getElementById('settingsNewPassword').value = '';
            setStatus(result.message || 'Password changed successfully');
        } catch (error) {
            setStatus(error.message || 'Failed to change password', true);
        }
    }

    async function handleDeleteAccount(event) {
        event.preventDefault();
        clearStatus();

        const password = document.getElementById('settingsDeletePassword').value;
        const confirmed = window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.');
        if (!confirmed) {
            return;
        }

        try {
            const result = await api.deleteAccount(password);
            setStatus(result.message || 'Account deleted successfully');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            setStatus(error.message || 'Failed to delete account', true);
        }
    }

    function setupSettingsPage() {
        const profileForm = document.getElementById('settingsProfileForm');
        const passwordForm = document.getElementById('settingsPasswordForm');
        const deleteForm = document.getElementById('settingsDeleteForm');

        if (profileForm) {
            profileForm.addEventListener('submit', handleProfileUpdate);
        }
        if (passwordForm) {
            passwordForm.addEventListener('submit', handlePasswordChange);
        }
        if (deleteForm) {
            deleteForm.addEventListener('submit', handleDeleteAccount);
        }

        document.querySelectorAll('[data-page="settings"]').forEach((el) => {
            el.addEventListener('click', () => {
                populateProfileForm();
                clearStatus();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', setupSettingsPage);
})();
