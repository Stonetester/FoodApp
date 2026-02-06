// Meal Planning with Calendar

let calendar = null;
let mealPlans = [];
let currentCalendarView = 'dayGridMonth';
let sectionFocusDate = new Date();
const snackSlots = [
    { key: 'before-breakfast', label: 'Snacks before breakfast', note: 'Before breakfast' },
    { key: 'between-breakfast-lunch', label: 'Snacks between breakfast & lunch', note: 'Between breakfast & lunch' },
    { key: 'between-lunch-dinner', label: 'Snacks between lunch & dinner', note: 'Between lunch & dinner' },
    { key: 'after-dinner', label: 'Snacks after dinner', note: 'After dinner' }
];

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

    // Calendar view switcher
    document.querySelectorAll('.view-switcher .view-btn').forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.dataset.view;
            handleViewChange(viewName);
        });
    });

    const calendarTodayBtn = document.getElementById('calendarTodayBtn');
    if (calendarTodayBtn) {
        calendarTodayBtn.addEventListener('click', () => {
            handleToday();
        });
    }

    const calendarPrevBtn = document.getElementById('calendarPrevBtn');
    if (calendarPrevBtn) {
        calendarPrevBtn.addEventListener('click', () => {
            handlePrev();
        });
    }

    const calendarNextBtn = document.getElementById('calendarNextBtn');
    if (calendarNextBtn) {
        calendarNextBtn.addEventListener('click', () => {
            handleNext();
        });
    }
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

    const isMobile = window.innerWidth < 768;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: isMobile ? {
            left: 'prev,next',
            center: 'title',
            right: ''
        } : {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        events: events,
        eventContent: (info) => {
            const viewType = info.view.type;
            const recipe = info.event.extendedProps.recipe;
            const showImage = (viewType === 'timeGridWeek' || viewType === 'timeGridDay') && recipe && recipe.image_url;
            const title = info.event.title;
            return {
                html: `
                    <div class="calendar-event">
                        ${showImage ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="calendar-event-image" onerror="this.style.display='none'">` : ''}
                        <span class="calendar-event-title">${title}</span>
                    </div>
                `
            };
        },
        eventClick: (info) => {
            viewMealPlan(info.event.id);
        },
        dateClick: (info) => {
            // Show day detail modal instead of just adding meal
            showDayDetail(info.dateStr);
        },
        viewDidMount: (info) => {
            updateViewButtons(info.view.type);
        },
        editable: true,
        eventDrop: async (info) => {
            await updateMealPlanDate(info.event.id, info.event.startStr);
        }
    });

    calendar.render();
    updateViewButtons(currentCalendarView);
    handleViewChange(currentCalendarView);
}

function updateViewButtons(viewName) {
    document.querySelectorAll('.view-switcher .view-btn').forEach(button => {
        if (button.dataset.view === viewName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function getMealTypeColor(mealType) {
    const colors = {
        'breakfast': '#E6A556',
        'lunch': '#D78B3A',
        'dinner': '#6E7A44',
        'snack': '#C96A2B'
    };
    return colors[mealType] || '#7A8471';
}

async function openMealPlanModal(plan = null, date = null, mealType = null, defaultNotes = null) {
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
            if (defaultNotes) {
                document.getElementById('mealPlanNotes').value = defaultNotes;
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
                        <div class="meal-item" style="background: var(--surface); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid ${getMealTypeColor(meal.meal_type)};">
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

async function quickAddRecipe(dateStr, mealType, notes = null) {
    // Close day detail modal
    document.getElementById('dayDetailModal').classList.remove('active');
    
    // Open meal plan modal with pre-filled date and meal type
    await openMealPlanModal(null, dateStr, mealType, notes);
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

function handleViewChange(viewName) {
    currentCalendarView = viewName;
    const sectionsEl = document.getElementById('mealPlanSections');
    const calendarEl = document.getElementById('mealPlanCalendar');

    if (viewName === 'mealWeek' || viewName === 'mealDay') {
        sectionFocusDate = calendar ? calendar.getDate() : sectionFocusDate;
        if (calendarEl) {
            calendarEl.style.display = 'none';
        }
        if (sectionsEl) {
            sectionsEl.style.display = 'grid';
        }
        renderMealSections(viewName);
    } else {
        if (calendar) {
            calendar.changeView(viewName);
        }
        if (calendarEl) {
            calendarEl.style.display = 'block';
        }
        if (sectionsEl) {
            sectionsEl.style.display = 'none';
        }
    }

    updateViewButtons(viewName);
}

function handleToday() {
    if (currentCalendarView === 'mealWeek' || currentCalendarView === 'mealDay') {
        sectionFocusDate = new Date();
        renderMealSections(currentCalendarView);
    } else if (calendar) {
        calendar.today();
    }
}

function handlePrev() {
    if (currentCalendarView === 'mealWeek') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() - 7);
        renderMealSections(currentCalendarView);
    } else if (currentCalendarView === 'mealDay') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() - 1);
        renderMealSections(currentCalendarView);
    } else if (calendar) {
        calendar.prev();
    }
}

function handleNext() {
    if (currentCalendarView === 'mealWeek') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() + 7);
        renderMealSections(currentCalendarView);
    } else if (currentCalendarView === 'mealDay') {
        sectionFocusDate.setDate(sectionFocusDate.getDate() + 1);
        renderMealSections(currentCalendarView);
    } else if (calendar) {
        calendar.next();
    }
}

function renderMealSections(viewName) {
    const sectionsEl = document.getElementById('mealPlanSections');
    if (!sectionsEl) return;

    const dates = viewName === 'mealDay' ? [new Date(sectionFocusDate)] : getWeekDates(sectionFocusDate);
    sectionsEl.innerHTML = '';

    dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayMeals = mealPlans.filter(plan => plan.planned_date === dateStr);
        const mealsByType = {
            breakfast: dayMeals.find(m => m.meal_type === 'breakfast'),
            lunch: dayMeals.find(m => m.meal_type === 'lunch'),
            dinner: dayMeals.find(m => m.meal_type === 'dinner'),
            snacks: dayMeals.filter(m => m.meal_type === 'snack')
        };

        const card = document.createElement('div');
        card.className = 'meal-day-card';

        const header = document.createElement('div');
        header.className = 'meal-day-header';
        header.innerHTML = `
            <div>
                <h3>${date.toLocaleDateString('en-US', { weekday: 'long' })}</h3>
                <p>${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
            </div>
            <button class="btn btn-secondary" type="button" data-date="${dateStr}" data-action="add-main">
                + Add Meal
            </button>
        `;
        card.appendChild(header);

        const mealList = document.createElement('div');
        mealList.className = 'meal-day-list';

        const orderedBlocks = [
            { type: 'snack', slot: snackSlots[0] },
            { type: 'meal', meal: 'breakfast' },
            { type: 'snack', slot: snackSlots[1] },
            { type: 'meal', meal: 'lunch' },
            { type: 'snack', slot: snackSlots[2] },
            { type: 'meal', meal: 'dinner' },
            { type: 'snack', slot: snackSlots[3] }
        ];

        orderedBlocks.forEach(block => {
            if (block.type === 'meal') {
                const type = block.meal;
                const mealSlot = document.createElement('div');
                mealSlot.className = 'meal-section';
                const plannedMeal = mealsByType[type];

                mealSlot.innerHTML = `
                    <div class="meal-section-header">
                        <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                        <button class="btn-icon" type="button" data-date="${dateStr}" data-meal="${type}" title="Add ${type}">
                            +
                        </button>
                    </div>
                    ${plannedMeal && plannedMeal.recipe ? `
                        <div class="meal-section-item">
                            <div>
                                <strong>${plannedMeal.recipe.title}</strong>
                                ${plannedMeal.recipe.description ? `<p>${plannedMeal.recipe.description}</p>` : ''}
                            </div>
                            <div class="meal-section-actions">
                                <button class="btn-icon" type="button" data-edit="${plannedMeal.id}" title="Edit">✏️</button>
                                <button class="btn-icon" type="button" data-delete="${plannedMeal.id}" title="Delete">🗑️</button>
                            </div>
                        </div>
                    ` : '<p class="meal-empty">No meal planned</p>'}
                `;
                mealList.appendChild(mealSlot);
            } else if (block.type === 'snack') {
                const slot = block.slot;
                const snackContainer = document.createElement('div');
                snackContainer.className = 'snack-section';
                const snacks = mealsByType.snacks.filter(snack => normalizeNote(snack.notes) === normalizeNote(slot.note));
                snackContainer.innerHTML = `
                    <div class="snack-section-header">
                        <span>${slot.label}</span>
                        <button class="btn-icon" type="button" data-date="${dateStr}" data-snack-note="${slot.note}" title="Add snack">
                            +
                        </button>
                    </div>
                    ${snacks.length ? snacks.map(snack => `
                        <div class="snack-item">
                            <span>${snack.recipe ? snack.recipe.title : 'Snack'}</span>
                            <div class="meal-section-actions">
                                <button class="btn-icon" type="button" data-edit="${snack.id}" title="Edit">✏️</button>
                                <button class="btn-icon" type="button" data-delete="${snack.id}" title="Delete">🗑️</button>
                            </div>
                        </div>
                    `).join('') : '<p class="meal-empty">Add a snack</p>'}
                `;
                mealList.appendChild(snackContainer);
            }
        });

        const anytimeSnacks = mealsByType.snacks.filter(snack => {
            return !snackSlots.some(slot => normalizeNote(snack.notes) === normalizeNote(slot.note));
        });
        if (anytimeSnacks.length) {
            const snackContainer = document.createElement('div');
            snackContainer.className = 'snack-section';
            snackContainer.innerHTML = `
                <div class="snack-section-header">
                    <span>Anytime snacks</span>
                    <button class="btn-icon" type="button" data-date="${dateStr}" data-snack-note="" title="Add snack">
                        +
                    </button>
                </div>
                ${anytimeSnacks.map(snack => `
                    <div class="snack-item">
                        <span>${snack.recipe ? snack.recipe.title : 'Snack'}</span>
                        <div class="meal-section-actions">
                            <button class="btn-icon" type="button" data-edit="${snack.id}" title="Edit">✏️</button>
                            <button class="btn-icon" type="button" data-delete="${snack.id}" title="Delete">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            `;
            mealList.appendChild(snackContainer);
        }

        card.appendChild(mealList);
        sectionsEl.appendChild(card);
    });

    sectionsEl.querySelectorAll('[data-meal]').forEach(button => {
        button.addEventListener('click', async () => {
            await openMealPlanModal(null, button.dataset.date, button.dataset.meal);
        });
    });

    sectionsEl.querySelectorAll('[data-action="add-main"]').forEach(button => {
        button.addEventListener('click', async () => {
            await openMealPlanModal(null, button.dataset.date, 'breakfast');
        });
    });

    sectionsEl.querySelectorAll('[data-snack-note]').forEach(button => {
        button.addEventListener('click', async () => {
            const note = button.dataset.snackNote || null;
            await openMealPlanModal(null, button.dataset.date, 'snack', note);
        });
    });

    sectionsEl.querySelectorAll('[data-edit]').forEach(button => {
        button.addEventListener('click', () => {
            editMealPlanFromDay(parseInt(button.dataset.edit, 10));
        });
    });

    sectionsEl.querySelectorAll('[data-delete]').forEach(button => {
        button.addEventListener('click', () => {
            deleteMealPlanFromDay(parseInt(button.dataset.delete, 10));
        });
    });
}

function getWeekDates(referenceDate) {
    const dates = [];
    const start = new Date(referenceDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    for (let i = 0; i < 7; i += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function normalizeNote(note) {
    return (note || '').trim().toLowerCase();
}
