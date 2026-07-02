// "Meals Like This" — AI similar-meal suggestions

let similarRecipeId = null;
let similarMode = 'similar_flavor';
let similarSuggestions = [];

const SIMILAR_MODE_OPTIONS = [
    { key: 'similar_flavor', icon: '🍲', label: 'Similar flavor' },
    { key: 'similar_ingredients', icon: '🧺', label: 'Similar ingredients' },
    { key: 'healthier', icon: '🥗', label: 'Healthier version' },
    { key: 'cheaper', icon: '💸', label: 'Cheaper version' },
    { key: 'faster', icon: '⏱️', label: 'Faster weeknight version' },
    { key: 'use_pantry', icon: '🏠', label: 'Use what is in my pantry' },
];

function escSim(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

function openSimilarMeals(recipeId) {
    similarRecipeId = recipeId;
    similarMode = 'similar_flavor';
    similarSuggestions = [];

    const modal = document.getElementById('similarMealsModal');
    document.getElementById('similarResults').innerHTML = '';
    renderSimilarModePicker();
    modal.classList.add('active');
}

function renderSimilarModePicker() {
    const picker = document.getElementById('similarModePicker');
    picker.innerHTML = SIMILAR_MODE_OPTIONS.map(opt => `
        <button type="button" class="similar-mode-btn${opt.key === similarMode ? ' active' : ''}" data-mode="${opt.key}">
            <span>${opt.icon}</span> ${opt.label}
        </button>
    `).join('');
    picker.querySelectorAll('.similar-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            similarMode = btn.dataset.mode;
            renderSimilarModePicker();
        });
    });
}

async function generateSimilarMeals() {
    const results = document.getElementById('similarResults');
    const genBtn = document.getElementById('similarGenerateBtn');
    genBtn.disabled = true;
    genBtn.textContent = 'Thinking…';
    results.innerHTML = `
        <div class="similar-skeleton"></div>
        <div class="similar-skeleton"></div>
        <div class="similar-skeleton"></div>
    `;

    try {
        const constraints = similarMode === 'use_pantry' ? { use_pantry: true } : {};
        const data = await api.getSimilarMeals(similarRecipeId, similarMode, constraints);

        if (data.enabled === false) {
            results.innerHTML = `<p class="similar-disabled">${escSim(data.message || 'AI suggestions are not available.')}</p>`;
            return;
        }

        similarSuggestions = data.suggestions || [];
        renderSimilarResults();
    } catch (error) {
        results.innerHTML = `<p class="similar-disabled">${escSim(error.message || 'Could not get suggestions. Try again.')}</p>`;
    } finally {
        genBtn.disabled = false;
        genBtn.textContent = 'Generate Ideas';
    }
}

function renderSimilarResults() {
    const results = document.getElementById('similarResults');
    if (!similarSuggestions.length) {
        results.innerHTML = '<p class="similar-disabled">No suggestions came back. Try a different option.</p>';
        return;
    }

    results.innerHTML = similarSuggestions.map((s, i) => `
        <div class="similar-card">
            <div class="similar-card-header">
                <h4>${escSim(s.title)}</h4>
                ${s.estimated_time_minutes ? `<span class="similar-time">⏱️ ${escSim(s.estimated_time_minutes)} min</span>` : ''}
            </div>
            ${s.description ? `<p class="similar-desc">${escSim(s.description)}</p>` : ''}
            ${s.why_similar ? `<p class="similar-why">💡 ${escSim(s.why_similar)}</p>` : ''}
            ${s.tags && s.tags.length ? `<div class="similar-tags">${s.tags.map(t => `<span class="recipe-tag">${escSim(t)}</span>`).join('')}</div>` : ''}
            <details class="similar-details">
                <summary>Ingredients &amp; steps</summary>
                <ul>${(s.ingredients || []).map(ing => `<li>${escSim(ing)}</li>`).join('')}</ul>
                <ol>${(s.instructions || []).map(st => `<li>${escSim(st)}</li>`).join('')}</ol>
            </details>
            <div class="similar-card-actions">
                <button class="btn btn-primary" type="button" data-save="${i}">Save Recipe</button>
                <button class="btn btn-secondary" type="button" data-save-plan="${i}">Save + Plan</button>
            </div>
        </div>
    `).join('');

    results.querySelectorAll('[data-save]').forEach(btn => {
        btn.addEventListener('click', () => saveSimilarSuggestion(parseInt(btn.dataset.save, 10), false, btn));
    });
    results.querySelectorAll('[data-save-plan]').forEach(btn => {
        btn.addEventListener('click', () => saveSimilarSuggestion(parseInt(btn.dataset.savePlan, 10), true, btn));
    });
}

async function saveSimilarSuggestion(index, addToPlan, btn) {
    const s = similarSuggestions[index];
    if (!s) return;
    btn.disabled = true;

    const payload = {
        title: s.title,
        description: s.description || null,
        instructions: (s.instructions || []).map((step, i) => `${i + 1}. ${step}`).join('\n') || null,
        cook_time: s.estimated_time_minutes || null,
        ingredients: (s.ingredients || []).map(ing => ({ ingredient_name: ing })),
        tags: [...(s.tags || []), 'ai-generated'],
    };

    try {
        const recipe = await api.createRecipe(payload);
        window.showToast(`"${recipe.title}" saved to your recipes`);
        if (window.loadRecipes) window.loadRecipes();

        if (addToPlan) {
            document.getElementById('similarMealsModal').classList.remove('active');
            document.getElementById('recipeDetailModal')?.classList.remove('active');
            await openMealPlanModal(null, new Date().toISOString().split('T')[0], 'dinner');
            const select = document.getElementById('mealPlanRecipe');
            if (select) select.value = recipe.id;
        }
    } catch (error) {
        window.showToast('Failed to save: ' + (error.message || error), 'error');
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('similarGenerateBtn')?.addEventListener('click', generateSimilarMeals);
    const modal = document.getElementById('similarMealsModal');
    document.getElementById('similarMealsClose')?.addEventListener('click', () => modal.classList.remove('active'));
    modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
});

window.openSimilarMeals = openSimilarMeals;
