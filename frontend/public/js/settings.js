// Settings page logic

// ---- Device preferences (accessibility + scan mode) ----
// Stored in localStorage; applied as <body> classes so CSS does the work.

function applyDevicePrefs() {
    const body = document.body;
    const textSize = localStorage.getItem('mg_text_size');
    body.classList.remove('pref-text-large', 'pref-text-extra-large');
    if (textSize === 'large' || textSize === 'extra-large') {
        body.classList.add(`pref-text-${textSize}`);
    }
    body.classList.toggle('pref-high-contrast', localStorage.getItem('mg_high_contrast') === '1');
    body.classList.toggle('pref-reduced-motion', localStorage.getItem('mg_reduced_motion') === '1');
    body.classList.toggle('pref-large-buttons', localStorage.getItem('mg_large_buttons') === '1');
}

function setupPrefControls() {
    document.querySelectorAll('[data-pref]').forEach(el => {
        const key = el.dataset.pref;
        const saved = localStorage.getItem(key);
        if (el.type === 'checkbox') {
            el.checked = saved === '1';
            el.addEventListener('change', () => {
                localStorage.setItem(key, el.checked ? '1' : '0');
                applyDevicePrefs();
            });
        } else {
            if (saved) el.value = saved;
            el.addEventListener('change', () => {
                localStorage.setItem(key, el.value);
                applyDevicePrefs();
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupSettingsListeners();
    setupPrefControls();
    applyDevicePrefs();
});

// First-run nudge: point new users at the comfort settings once.
function maybeShowFirstRunTip() {
    if (localStorage.getItem('mg_first_run_done')) return;
    localStorage.setItem('mg_first_run_done', '1');
    setTimeout(() => {
        if (window.showToast) window.showToast('Tip: adjust text size, contrast, and scan mode in Settings ⚙️', 'info');
    }, 1500);
}
window.maybeShowFirstRunTip = maybeShowFirstRunTip;

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

    window.showConfirm('This will permanently delete your account and all associated data. Continue?', async () => {
        try {
            await api.deleteAccount(password);
            window.location.reload();
        } catch (error) {
            showSettingsStatus(error.message || 'Failed to delete account.', true);
        }
    }, 'Delete Account');
}

window.loadSettingsPage = hydrateSettingsProfile;
