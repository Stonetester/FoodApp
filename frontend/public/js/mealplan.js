// Meal Planning with Calendar

let calendar = null;
let mealPlans = [];

document.addEventListener('DOMContentLoaded', () => {
    setupMealPlanListeners();
});

function setupMealPlanListeners() {
    // Add meal plan button
    document.getElementById('addMealPlanBtn')?.addEventListener('click', () => {
        openMealPlanModal();
    });

    // Meal plan form submission
    document.getElementById('mealPlanForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMealPlan();
    });

    // Cancel button
    document.getElementById('cancelMealPlanBtn')?.addEventListener('click', () => {
        closeMealPlanModal();
    });

    // Close day detail button
    document.getElementById('closeDayDetailBtn')?.addEventListener('click', () => {
        document.getElementById('dayDetailModal').classList.remove('active');
    });
}

async function loadMealPlan() {
    try {
        // Load meal plans for current month
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        mealPlans = await api.getMealPlan(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );
        
        initializeCalendar();
    } catch (error) {
        console.error('Error loading meal plan:', error);
        alert('Failed to load meal plan');
    }
}

function initializeCalendar() {
    const calendarEl = document.getElementById('mealPlanCalendar');
    if (!calendarEl) return;

    if (calendar) {
        calendar.destroy();
    }

    // Group meals by date
    const mealsByDate = {};
    mealPlans.forEach(plan => {
        const date = plan.planned_date;
        if (!mealsByDate[date]) {
            mealsByDate[date] = [];
        }
        mealsByDate[date].push(plan);
    });

    // Create events with meal type indicators
    const events = mealPlans.map(plan => {
        const mealTypeIcon = {
            'breakfast': '🌅',
            'lunch': '☀️',
            'dinner': '🌙',
            'snack': '🍎'
        }[plan.meal_type] || '🍽️';

        return {
            id: plan.id,
            title: `${mealTypeIcon} ${plan.recipe ? plan.recipe.title : 'Meal'}`,
            start: plan.planned_date,
            extendedProps: {
                mealType: plan.meal_type,
                recipeId: plan.recipe_id,
                recipe: plan.recipe,
                notes: plan.notes
            },
            backgroundColor: getMealTypeColor(plan.meal_type),
            borderColor: getMealTypeColor(plan.meal_type),
            display: 'block'
        };
    });

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventClick: (info) => {
            viewMealPlan(info.event.id);
        },
        dateClick: (info) => {
            // Show day detail modal instead of just adding meal
            showDayDetail(info.dateStr);
        },
        dayCellContent: (info) => {
            // Customize day cell to show meal count
            const dateStr = info.date.toISOString().split('T')[0];
            const dayMeals = mealsByDate[dateStr] || [];
            const mealCount = dayMeals.length;
            
            const dayNumber = info.dayNumberText;
            if (mealCount > 0) {
                return {
                    html: `<div style="position: relative;">
                        <span>${dayNumber}</span>
                        <span style="position: absolute; top: -5px; right: -5px; background: var(--primary); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center;">${mealCount}</span>
                    </div>`
                };
            }
            return { html: dayNumber };
        },
        editable: true,
        eventDrop: async (info) => {
            await updateMealPlanDate(info.event.id, info.event.startStr);
        }
    });

    calendar.render();
}

function getMealTypeColor(mealType) {
    const colors = {
        'breakfast': '#FFB74D',
        'lunch': '#81C784',
        'dinner': '#64B5F6',
        'snack': '#BA68C8'
    };
    return colors[mealType] || '#7A8471';
}

async function openMealPlanModal(plan = null, date = null, mealType = null) {
    const modal = document.getElementById('mealPlanModal');
    const form = document.getElementById('mealPlanForm');
    
    // Load recipes for dropdown
    try {
        const recipes = await api.getRecipes();
        const select = document.getElementById('mealPlanRecipe');
        select.innerHTML = '<option value="">Select a recipe</option>';
        
        recipes.forEach(recipe => {
            const option = document.createElement('option');
            option.value = recipe.id;
            option.textContent = recipe.title;
            select.appendChild(option);
        });

        if (plan) {
            document.getElementById('mealPlanId').value = plan.id;
            document.getElementById('mealPlanRecipe').value = plan.recipe_id;
            document.getElementById('mealPlanDate').value = plan.planned_date;
            document.getElementById('mealPlanType').value = plan.meal_type;
            document.getElementById('mealPlanNotes').value = plan.notes || '';
        } else {
            form.reset();
            document.getElementById('mealPlanId').value = '';
            if (date) {
                document.getElementById('mealPlanDate').value = date;
            } else {
                document.getElementById('mealPlanDate').value = new Date().toISOString().split('T')[0];
            }
            if (mealType) {
                document.getElementById('mealPlanType').value = mealType;
            }
        }
    } catch (error) {
        console.error('Error loading recipes:', error);
        alert('Failed to load recipes');
        return;
    }

    modal.classList.add('active');
}

function closeMealPlanModal() {
    document.getElementById('mealPlanModal').classList.remove('active');
}

async function saveMealPlan() {
    const form = document.getElementById('mealPlanForm');
    const planId = document.getElementById('mealPlanId').value;

    const planData = {
        recipe_id: parseInt(document.getElementById('mealPlanRecipe').value),
        planned_date: document.getElementById('mealPlanDate').value,
        meal_type: document.getElementById('mealPlanType').value,
        notes: document.getElementById('mealPlanNotes').value || null
    };

    try {
        if (planId) {
            await api.updateMealPlan(planId, planData);
        } else {
            await api.addMealPlan(planData);
        }
        closeMealPlanModal();
        await loadMealPlan();
        
        // If day detail modal was open, refresh it
        const dayModal = document.getElementById('dayDetailModal');
        if (dayModal.classList.contains('active')) {
            showDayDetail(planData.planned_date);
        }
    } catch (error) {
        console.error('Error saving meal plan:', error);
        alert('Failed to save meal plan: ' + error.message);
    }
}

async function updateMealPlanDate(planId, newDate) {
    try {
        const plan = mealPlans.find(p => p.id === planId);
        if (plan) {
            await api.updateMealPlan(planId, {
                ...plan,
                planned_date: newDate.split('T')[0]
            });
            loadMealPlan();
        }
    } catch (error) {
        console.error('Error updating meal plan date:', error);
        alert('Failed to update meal plan');
        loadMealPlan(); // Reload to revert change
    }
}

async function viewMealPlan(planId) {
    const plan = mealPlans.find(p => p.id === planId);
    if (plan) {
        openMealPlanModal(plan);
    }
}

async function showDayDetail(dateStr) {
    const modal = document.getElementById('dayDetailModal');
    const titleEl = document.getElementById('dayDetailTitle');
    const dateEl = document.getElementById('dayDetailDate');
    const slotsEl = document.getElementById('dayMealSlots');
    
    // Format date
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    dateEl.textContent = formattedDate;
    
    // Get meals for this day
    const dayMeals = mealPlans.filter(plan => plan.planned_date === dateStr);
    
    // Group by meal type
    const mealsByType = {
        breakfast: dayMeals.find(m => m.meal_type === 'breakfast'),
        lunch: dayMeals.find(m => m.meal_type === 'lunch'),
        dinner: dayMeals.find(m => m.meal_type === 'dinner'),
        snack: dayMeals.filter(m => m.meal_type === 'snack')
    };
    
    // Load all recipes for quick add
    let allRecipes = [];
    try {
        allRecipes = await api.getRecipes();
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
    
    // Build meal slots HTML
    slotsEl.innerHTML = '';
    
    const mealTypes = [
        { key: 'breakfast', label: '🌅 Breakfast', icon: '🌅' },
        { key: 'lunch', label: '☀️ Lunch', icon: '☀️' },
        { key: 'dinner', label: '🌙 Dinner', icon: '🌙' },
        { key: 'snack', label: '🍎 Snacks', icon: '🍎', multiple: true }
    ];
    
    mealTypes.forEach(mealType => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'meal-slot';
        slotDiv.style.cssText = 'margin-bottom: 1.5rem; padding: 1rem; background: var(--light-cream); border-radius: 8px;';
        
        const meals = mealType.multiple 
            ? mealsByType[mealType.key] || []
            : mealsByType[mealType.key] ? [mealsByType[mealType.key]] : [];
        
        let slotContent = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h3 style="margin: 0; color: var(--primary);">${mealType.label}</h3>
                <button class="btn btn-secondary" onclick="quickAddRecipe('${dateStr}', '${mealType.key}')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    + Add Recipe
                </button>
            </div>
        `;
        
        if (meals.length === 0) {
            slotContent += '<p style="color: var(--text); opacity: 0.6; margin: 0.5rem 0;">No meal planned</p>';
        } else {
            meals.forEach(meal => {
                if (meal && meal.recipe) {
                    slotContent += `
                        <div class="meal-item" style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid ${getMealTypeColor(meal.meal_type)};">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div style="flex: 1;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: var(--primary);">${meal.recipe.title}</h4>
                                    ${meal.recipe.description ? `<p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text);">${meal.recipe.description}</p>` : ''}
                                    ${meal.notes ? `<p style="margin: 0; font-size: 0.85rem; color: var(--text); opacity: 0.8;"><em>${meal.notes}</em></p>` : ''}
                                    ${meal.recipe.prep_time || meal.recipe.cook_time ? `
                                        <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: var(--text);">
                                            ${meal.recipe.prep_time ? `Prep: ${meal.recipe.prep_time}min` : ''}
                                            ${meal.recipe.prep_time && meal.recipe.cook_time ? ' • ' : ''}
                                            ${meal.recipe.cook_time ? `Cook: ${meal.recipe.cook_time}min` : ''}
                                        </p>
                                    ` : ''}
                                </div>
                                <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                                    <button class="btn-icon" onclick="editMealPlanFromDay(${meal.id})" title="Edit">✏️</button>
                                    <button class="btn-icon" onclick="deleteMealPlanFromDay(${meal.id})" title="Delete">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }
        
        slotDiv.innerHTML = slotContent;
        slotsEl.appendChild(slotDiv);
    });
    
    // Store recipes for quick add
    slotsEl.dataset.recipes = JSON.stringify(allRecipes);
    slotsEl.dataset.date = dateStr;
    
    modal.classList.add('active');
}

async function quickAddRecipe(dateStr, mealType) {
    // Close day detail modal
    document.getElementById('dayDetailModal').classList.remove('active');
    
    // Open meal plan modal with pre-filled date and meal type
    await openMealPlanModal(null, dateStr, mealType);
}

async function editMealPlanFromDay(planId) {
    const plan = mealPlans.find(p => p.id === planId);
    if (plan) {
        document.getElementById('dayDetailModal').classList.remove('active');
        await openMealPlanModal(plan);
    }
}

async function deleteMealPlanFromDay(planId) {
    if (!confirm('Are you sure you want to delete this meal?')) {
        return;
    }
    
    try {
        await api.deleteMealPlan(planId);
        await loadMealPlan();
        // Refresh day detail if modal is open
        const modal = document.getElementById('dayDetailModal');
        if (modal.classList.contains('active')) {
            const dateStr = document.getElementById('dayMealSlots').dataset.date;
            showDayDetail(dateStr);
        }
    } catch (error) {
        console.error('Error deleting meal plan:', error);
        alert('Failed to delete meal');
    }
}

// Export functions
window.loadMealPlan = loadMealPlan;
window.quickAddRecipe = quickAddRecipe;
window.editMealPlanFromDay = editMealPlanFromDay;
window.deleteMealPlanFromDay = deleteMealPlanFromDay;
window.showDayDetail = showDayDetail;

