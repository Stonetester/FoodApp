// Settings page logic

document.addEventListener('DOMContentLoaded', () => {
    setupSettingsListeners();
});

function setupSettingsListeners() {
    const profileForm = document.getElementById('settingsProfileForm');
    const passwordForm = document.getElementById('settingsPasswordForm');
    const deleteForm = document.getElementById('deleteAccountForm');

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveProfileSettings();
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await savePasswordSettings();
        });
    }

    if (deleteForm) {
        deleteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleDeleteAccount();
        });
    }
}

function showSettingsStatus(message, isError = false) {
    const status = document.getElementById('settingsStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('status-error', isError);
}

async function hydrateSettingsProfile() {
    const usernameInput = document.getElementById('settingsUsername');
    const emailInput = document.getElementById('settingsEmail');
    if (!usernameInput || !emailInput) return;

    try {
        const user = await api.getCurrentUser();
        usernameInput.value = user.username || '';
        emailInput.value = user.email || '';
    } catch {
        showSettingsStatus('Could not load your profile details.', true);
    }
}

async function saveProfileSettings() {
    const username = document.getElementById('settingsUsername')?.value?.trim();
    const email = document.getElementById('settingsEmail')?.value?.trim();

    try {
        await api.updateProfile({ username, email });
        showSettingsStatus('Profile updated successfully.');
    } catch (error) {
        showSettingsStatus(error.message || 'Failed to update profile.', true);
    }
}

async function savePasswordSettings() {
    const currentPassword = document.getElementById('settingsCurrentPassword')?.value || '';
    const newPassword = document.getElementById('settingsNewPassword')?.value || '';

    try {
        await api.changePassword({ current_password: currentPassword, new_password: newPassword });
        document.getElementById('settingsPasswordForm')?.reset();
        showSettingsStatus('Password updated successfully.');
    } catch (error) {
        showSettingsStatus(error.message || 'Failed to update password.', true);
    }
}

async function handleDeleteAccount() {
    const password = document.getElementById('deleteAccountPassword')?.value || '';
    const confirmText = document.getElementById('deleteAccountConfirm')?.value || '';

    if (confirmText !== 'DELETE') {
        showSettingsStatus('Type DELETE exactly to confirm account deletion.', true);
        return;
    }

    const sure = window.confirm('This will permanently delete your account and all associated data. Continue?');
    if (!sure) {
        return;
    }

    try {
        await api.deleteAccount(password);
        window.location.reload();
    } catch (error) {
        showSettingsStatus(error.message || 'Failed to delete account.', true);
    }
}

window.loadSettingsPage = hydrateSettingsProfile;
