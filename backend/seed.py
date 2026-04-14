#!/usr/bin/env python3
"""
Seed the database with fake dev data for UI/UX testing.

Usage:
    cd backend
    python seed.py          # seed (skips if data already exists)
    python seed.py --reset  # wipe all data and reseed fresh
"""

import sys
import os
from datetime import date, datetime, timedelta
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import DevelopmentConfig
from app.models import (
    db, User, Recipe, RecipeIngredient, RecipeTag,
    PantryItem, MealPlan, MealHistory, FriendRequest, Friendship, RecipeReview
)
from werkzeug.security import generate_password_hash
from sqlalchemy import text

app = create_app(DevelopmentConfig)

# ── Helpers ──────────────────────────────────────────────────────────────────

def today():
    return date.today()

def days_ago(n):
    return date.today() - timedelta(days=n)

def days_ahead(n):
    return date.today() + timedelta(days=n)

def nutrition_json(**kwargs):
    return json.dumps(kwargs)

# ── Fake data ─────────────────────────────────────────────────────────────────

USERS = [
    {"username": "alexchef",  "email": "alex@test.com",  "password": "Test1234"},
    {"username": "samcooks",  "email": "sam@test.com",   "password": "Test1234"},
    {"username": "jordaneat", "email": "jordan@test.com","password": "Test1234"},
]

RECIPES = [
    # ── Alex's recipes ────────────────────────────────────────────────────────
    {
        "owner": "alexchef",
        "title": "Classic Spaghetti Carbonara",
        "description": "A rich and creamy Roman pasta dish made with eggs, cheese, and pancetta.",
        "instructions": json.dumps([
            "Boil a large pot of salted water and cook spaghetti until al dente.",
            "Fry pancetta in a pan until crispy. Remove from heat.",
            "Whisk together eggs, Pecorino Romano, and Parmesan in a bowl.",
            "Drain pasta, reserving 1 cup of pasta water.",
            "Add pasta to pancetta pan off heat, pour egg mixture over, toss quickly.",
            "Add pasta water gradually to loosen the sauce. Season with black pepper.",
        ]),
        "prep_time": 10, "cook_time": 20, "servings": 4,
        "serving_size": "1 cup",
        "tags": ["Italian", "Pasta", "Quick"],
        "ingredients": [
            {"name": "Spaghetti", "quantity": 400, "unit": "g"},
            {"name": "Pancetta", "quantity": 150, "unit": "g"},
            {"name": "Eggs", "quantity": 4, "unit": "large"},
            {"name": "Pecorino Romano", "quantity": 50, "unit": "g"},
            {"name": "Parmesan", "quantity": 50, "unit": "g"},
            {"name": "Black pepper", "quantity": 1, "unit": "tsp"},
        ],
    },
    {
        "owner": "alexchef",
        "title": "Chicken Tikka Masala",
        "description": "Tender chicken in a spiced tomato cream sauce — a British-Indian classic.",
        "instructions": json.dumps([
            "Marinate chicken in yogurt, garlic, ginger, and spices for 1 hour.",
            "Grill or broil chicken until charred. Set aside.",
            "Sauté onions in butter, add garlic, ginger, and tomato paste.",
            "Add crushed tomatoes, cream, and garam masala. Simmer 15 minutes.",
            "Add chicken to sauce and simmer 10 more minutes.",
            "Garnish with fresh cilantro and serve with naan.",
        ]),
        "prep_time": 20, "cook_time": 40, "servings": 4,
        "serving_size": "1.5 cups",
        "tags": ["Indian", "Chicken", "Spicy"],
        "ingredients": [
            {"name": "Chicken breast", "quantity": 700, "unit": "g"},
            {"name": "Plain yogurt", "quantity": 200, "unit": "ml"},
            {"name": "Crushed tomatoes", "quantity": 400, "unit": "g"},
            {"name": "Heavy cream", "quantity": 150, "unit": "ml"},
            {"name": "Garam masala", "quantity": 2, "unit": "tsp"},
            {"name": "Onion", "quantity": 1, "unit": "large"},
            {"name": "Garlic", "quantity": 4, "unit": "cloves"},
            {"name": "Fresh ginger", "quantity": 1, "unit": "tbsp"},
        ],
    },
    {
        "owner": "alexchef",
        "title": "Avocado Toast with Poached Egg",
        "description": "A modern breakfast staple — creamy avocado on crusty toast topped with a perfect poached egg.",
        "instructions": json.dumps([
            "Toast sourdough bread slices until golden.",
            "Mash avocado with lemon juice, salt, and red pepper flakes.",
            "Bring a pot of water to a gentle simmer. Add vinegar.",
            "Crack egg into a small cup, swirl water, and gently drop in egg. Cook 3 minutes.",
            "Spread avocado on toast, top with poached egg.",
            "Season with salt, pepper, and everything bagel seasoning.",
        ]),
        "prep_time": 5, "cook_time": 10, "servings": 1,
        "serving_size": "1 slice",
        "tags": ["Breakfast", "Quick", "Vegetarian"],
        "ingredients": [
            {"name": "Sourdough bread", "quantity": 2, "unit": "slices"},
            {"name": "Avocado", "quantity": 1, "unit": "ripe"},
            {"name": "Egg", "quantity": 1, "unit": "large"},
            {"name": "Lemon juice", "quantity": 1, "unit": "tsp"},
            {"name": "Red pepper flakes", "quantity": 0.25, "unit": "tsp"},
        ],
    },
    {
        "owner": "alexchef",
        "title": "Black Bean Tacos",
        "description": "Quick weeknight tacos loaded with spiced black beans, salsa, and fresh toppings.",
        "instructions": json.dumps([
            "Heat oil in a pan, add black beans with cumin, smoked paprika, and salt.",
            "Cook 5 minutes until heated through, mashing some beans lightly.",
            "Warm tortillas in a dry pan or directly over a gas flame.",
            "Fill tortillas with beans, top with salsa, avocado, and cheese.",
            "Squeeze lime juice over and serve immediately.",
        ]),
        "prep_time": 5, "cook_time": 10, "servings": 2,
        "serving_size": "2 tacos",
        "tags": ["Mexican", "Vegetarian", "Quick"],
        "ingredients": [
            {"name": "Black beans", "quantity": 400, "unit": "g (canned)"},
            {"name": "Corn tortillas", "quantity": 4, "unit": "small"},
            {"name": "Cumin", "quantity": 1, "unit": "tsp"},
            {"name": "Smoked paprika", "quantity": 0.5, "unit": "tsp"},
            {"name": "Salsa", "quantity": 4, "unit": "tbsp"},
            {"name": "Avocado", "quantity": 1, "unit": "medium"},
        ],
    },
    {
        "owner": "alexchef",
        "title": "Overnight Oats",
        "description": "Effortless make-ahead breakfast with oats, milk, and your choice of toppings.",
        "instructions": json.dumps([
            "Combine oats, milk, chia seeds, and honey in a jar.",
            "Stir well, cover, and refrigerate overnight (or at least 4 hours).",
            "In the morning, stir and add more milk if too thick.",
            "Top with fresh berries, banana slices, and a drizzle of nut butter.",
        ]),
        "prep_time": 5, "cook_time": 0, "servings": 1,
        "serving_size": "1 jar",
        "tags": ["Breakfast", "Meal Prep", "Vegetarian"],
        "ingredients": [
            {"name": "Rolled oats", "quantity": 0.5, "unit": "cup"},
            {"name": "Milk", "quantity": 0.75, "unit": "cup"},
            {"name": "Chia seeds", "quantity": 1, "unit": "tbsp"},
            {"name": "Honey", "quantity": 1, "unit": "tsp"},
            {"name": "Mixed berries", "quantity": 0.5, "unit": "cup"},
        ],
    },
    # ── Sam's recipes ─────────────────────────────────────────────────────────
    {
        "owner": "samcooks",
        "title": "Beef Stir Fry",
        "description": "A quick, colorful stir fry with tender beef strips and crunchy vegetables.",
        "instructions": json.dumps([
            "Slice beef thinly against the grain. Marinate with soy sauce and cornstarch.",
            "Heat wok until smoking. Add oil and stir fry beef until browned. Remove.",
            "Stir fry broccoli, bell pepper, and snap peas 3-4 minutes.",
            "Return beef, add oyster sauce, sesame oil, and a splash of water.",
            "Toss everything together and serve over steamed rice.",
        ]),
        "prep_time": 15, "cook_time": 15, "servings": 3,
        "serving_size": "1.5 cups",
        "tags": ["Asian", "Beef", "Quick"],
        "ingredients": [
            {"name": "Beef sirloin", "quantity": 400, "unit": "g"},
            {"name": "Broccoli", "quantity": 200, "unit": "g"},
            {"name": "Bell pepper", "quantity": 1, "unit": "medium"},
            {"name": "Snap peas", "quantity": 100, "unit": "g"},
            {"name": "Soy sauce", "quantity": 3, "unit": "tbsp"},
            {"name": "Oyster sauce", "quantity": 2, "unit": "tbsp"},
            {"name": "Sesame oil", "quantity": 1, "unit": "tsp"},
        ],
    },
    {
        "owner": "samcooks",
        "title": "Greek Salad",
        "description": "A fresh Mediterranean salad with tomatoes, cucumber, olives, and feta.",
        "instructions": json.dumps([
            "Chop tomatoes, cucumber, and red onion into large chunks.",
            "Add kalamata olives and sliced green pepper.",
            "Whisk together olive oil, lemon juice, oregano, salt, and pepper.",
            "Pour dressing over salad and toss gently.",
            "Top with a block of feta cheese and a pinch of dried oregano.",
        ]),
        "prep_time": 10, "cook_time": 0, "servings": 2,
        "serving_size": "2 cups",
        "tags": ["Greek", "Salad", "Vegetarian", "Quick"],
        "ingredients": [
            {"name": "Tomatoes", "quantity": 3, "unit": "medium"},
            {"name": "Cucumber", "quantity": 1, "unit": "medium"},
            {"name": "Red onion", "quantity": 0.5, "unit": "medium"},
            {"name": "Kalamata olives", "quantity": 100, "unit": "g"},
            {"name": "Feta cheese", "quantity": 150, "unit": "g"},
            {"name": "Olive oil", "quantity": 3, "unit": "tbsp"},
        ],
    },
    {
        "owner": "samcooks",
        "title": "Banana Pancakes",
        "description": "Fluffy weekend pancakes with ripe bananas folded into the batter.",
        "instructions": json.dumps([
            "Mash banana in a bowl. Whisk in eggs, milk, and vanilla.",
            "Fold in flour, baking powder, and a pinch of salt — don't overmix.",
            "Heat a lightly oiled pan over medium heat.",
            "Pour 1/4 cup batter per pancake. Cook until bubbles form, flip.",
            "Cook 1-2 more minutes until golden. Serve with maple syrup.",
        ]),
        "prep_time": 5, "cook_time": 15, "servings": 2,
        "serving_size": "3 pancakes",
        "tags": ["Breakfast", "Sweet", "Vegetarian"],
        "ingredients": [
            {"name": "Ripe banana", "quantity": 1, "unit": "large"},
            {"name": "Eggs", "quantity": 2, "unit": "large"},
            {"name": "Milk", "quantity": 0.5, "unit": "cup"},
            {"name": "All-purpose flour", "quantity": 1, "unit": "cup"},
            {"name": "Baking powder", "quantity": 1, "unit": "tsp"},
            {"name": "Maple syrup", "quantity": 2, "unit": "tbsp"},
        ],
    },
    {
        "owner": "samcooks",
        "title": "Lentil Soup",
        "description": "Hearty, warming red lentil soup with cumin and a squeeze of lemon.",
        "instructions": json.dumps([
            "Sauté onion and garlic in olive oil until soft.",
            "Add cumin, turmeric, and coriander, toast 1 minute.",
            "Add rinsed red lentils and vegetable broth. Bring to boil.",
            "Simmer 20 minutes until lentils are fully soft.",
            "Blend half the soup for a creamy texture. Season with lemon juice and salt.",
        ]),
        "prep_time": 10, "cook_time": 30, "servings": 4,
        "serving_size": "1.5 cups",
        "tags": ["Soup", "Vegan", "Healthy", "Meal Prep"],
        "ingredients": [
            {"name": "Red lentils", "quantity": 300, "unit": "g"},
            {"name": "Onion", "quantity": 1, "unit": "large"},
            {"name": "Garlic", "quantity": 3, "unit": "cloves"},
            {"name": "Vegetable broth", "quantity": 1200, "unit": "ml"},
            {"name": "Cumin", "quantity": 1.5, "unit": "tsp"},
            {"name": "Turmeric", "quantity": 0.5, "unit": "tsp"},
            {"name": "Lemon juice", "quantity": 2, "unit": "tbsp"},
        ],
    },
    # ── Jordan's recipes ──────────────────────────────────────────────────────
    {
        "owner": "jordaneat",
        "title": "Margherita Pizza",
        "description": "Classic Neapolitan pizza with a blistered crust, San Marzano tomatoes, and fresh mozzarella.",
        "instructions": json.dumps([
            "Stretch pizza dough into a 12-inch round on a floured surface.",
            "Spread a thin layer of crushed San Marzano tomatoes.",
            "Tear fresh mozzarella and scatter over the sauce.",
            "Bake at maximum oven temperature (250°C/500°F) for 8-10 minutes.",
            "Top with fresh basil leaves and a drizzle of olive oil right before serving.",
        ]),
        "prep_time": 20, "cook_time": 10, "servings": 2,
        "serving_size": "3 slices",
        "tags": ["Italian", "Pizza", "Vegetarian"],
        "ingredients": [
            {"name": "Pizza dough", "quantity": 250, "unit": "g"},
            {"name": "San Marzano tomatoes", "quantity": 200, "unit": "g"},
            {"name": "Fresh mozzarella", "quantity": 200, "unit": "g"},
            {"name": "Fresh basil", "quantity": 10, "unit": "leaves"},
            {"name": "Olive oil", "quantity": 1, "unit": "tbsp"},
        ],
    },
    {
        "owner": "jordaneat",
        "title": "Salmon with Roasted Asparagus",
        "description": "Oven-roasted salmon fillet with lemon-garlic asparagus — ready in 20 minutes.",
        "instructions": json.dumps([
            "Preheat oven to 200°C/400°F.",
            "Toss asparagus with olive oil, garlic, salt, and pepper on a baking sheet.",
            "Place salmon skin-side down, season with salt, pepper, and lemon zest.",
            "Roast together 12-15 minutes until salmon flakes easily.",
            "Squeeze lemon juice over everything and serve.",
        ]),
        "prep_time": 5, "cook_time": 15, "servings": 2,
        "serving_size": "1 fillet + asparagus",
        "tags": ["Seafood", "Healthy", "Quick"],
        "ingredients": [
            {"name": "Salmon fillet", "quantity": 2, "unit": "pieces (150g each)"},
            {"name": "Asparagus", "quantity": 300, "unit": "g"},
            {"name": "Garlic", "quantity": 2, "unit": "cloves"},
            {"name": "Lemon", "quantity": 1, "unit": "whole"},
            {"name": "Olive oil", "quantity": 2, "unit": "tbsp"},
        ],
    },
    {
        "owner": "jordaneat",
        "title": "Chocolate Lava Cakes",
        "description": "Decadent individual chocolate cakes with a molten, gooey center.",
        "instructions": json.dumps([
            "Preheat oven to 220°C/425°F. Butter and flour 4 ramekins.",
            "Melt butter and dark chocolate together over a double boiler.",
            "Whisk in powdered sugar, eggs, egg yolks, and vanilla.",
            "Fold in flour until just combined.",
            "Pour into ramekins and bake 12 minutes — centers should still jiggle.",
            "Let rest 1 minute, then invert onto plates and serve immediately.",
        ]),
        "prep_time": 15, "cook_time": 12, "servings": 4,
        "serving_size": "1 cake",
        "tags": ["Dessert", "Chocolate", "Special Occasion"],
        "ingredients": [
            {"name": "Dark chocolate (70%)", "quantity": 170, "unit": "g"},
            {"name": "Unsalted butter", "quantity": 110, "unit": "g"},
            {"name": "Powdered sugar", "quantity": 220, "unit": "g"},
            {"name": "Eggs", "quantity": 2, "unit": "large"},
            {"name": "Egg yolks", "quantity": 2, "unit": ""},
            {"name": "All-purpose flour", "quantity": 60, "unit": "g"},
        ],
    },
    {
        "owner": "jordaneat",
        "title": "Veggie Fried Rice",
        "description": "A quick fried rice using leftover rice and whatever vegetables you have on hand.",
        "instructions": json.dumps([
            "Use day-old rice — fresh rice is too moist and will clump.",
            "Heat oil in a wok over high heat. Scramble eggs and set aside.",
            "Stir fry frozen peas, carrots, and corn for 2 minutes.",
            "Add rice and press flat into the wok. Let it toast 1-2 minutes.",
            "Add soy sauce, sesame oil, and eggs. Toss everything together.",
            "Garnish with green onions and serve immediately.",
        ]),
        "prep_time": 5, "cook_time": 10, "servings": 3,
        "serving_size": "1 cup",
        "tags": ["Asian", "Vegetarian", "Quick", "Meal Prep"],
        "ingredients": [
            {"name": "Cooked white rice (day-old)", "quantity": 3, "unit": "cups"},
            {"name": "Eggs", "quantity": 3, "unit": "large"},
            {"name": "Frozen mixed vegetables", "quantity": 200, "unit": "g"},
            {"name": "Soy sauce", "quantity": 3, "unit": "tbsp"},
            {"name": "Sesame oil", "quantity": 1, "unit": "tsp"},
            {"name": "Green onions", "quantity": 3, "unit": "stalks"},
        ],
    },
    {
        "owner": "jordaneat",
        "title": "Caesar Salad with Homemade Dressing",
        "description": "Crisp romaine with creamy anchovy-parmesan dressing and crunchy croutons.",
        "instructions": json.dumps([
            "Make dressing: blend garlic, anchovy paste, lemon, Dijon, mayo, and parmesan.",
            "Cube day-old bread and toss with olive oil, garlic powder, and salt.",
            "Bake croutons at 180°C/350°F for 10-12 minutes until golden.",
            "Chop romaine into bite-sized pieces.",
            "Toss romaine with dressing, top with croutons and extra parmesan.",
        ]),
        "prep_time": 15, "cook_time": 12, "servings": 2,
        "serving_size": "2 cups",
        "tags": ["Salad", "American", "Vegetarian"],
        "ingredients": [
            {"name": "Romaine lettuce", "quantity": 1, "unit": "large head"},
            {"name": "Parmesan", "quantity": 60, "unit": "g"},
            {"name": "Bread for croutons", "quantity": 2, "unit": "slices"},
            {"name": "Mayonnaise", "quantity": 3, "unit": "tbsp"},
            {"name": "Anchovy paste", "quantity": 1, "unit": "tsp"},
            {"name": "Lemon juice", "quantity": 2, "unit": "tbsp"},
            {"name": "Garlic", "quantity": 1, "unit": "clove"},
        ],
    },
]

PANTRY_TEMPLATES = [
    # (item_name, quantity, unit, category, days_until_expiry)
    ("Spaghetti",         500,  "g",    "Grains & Pasta",   365),
    ("Rolled oats",       750,  "g",    "Grains & Pasta",   180),
    ("All-purpose flour", 1000, "g",    "Baking",           180),
    ("White rice",        2000, "g",    "Grains & Pasta",   365),
    ("Black beans",       2,    "cans", "Canned Goods",     730),
    ("Crushed tomatoes",  3,    "cans", "Canned Goods",     730),
    ("Vegetable broth",   1,    "carton","Soups & Stocks",  90),
    ("Olive oil",         750,  "ml",   "Oils & Condiments",365),
    ("Sesame oil",        200,  "ml",   "Oils & Condiments",180),
    ("Soy sauce",         500,  "ml",   "Oils & Condiments",365),
    ("Honey",             350,  "g",    "Baking",           999),
    ("Maple syrup",       250,  "ml",   "Baking",           365),
    ("Cumin",             50,   "g",    "Spices & Herbs",   365),
    ("Turmeric",          30,   "g",    "Spices & Herbs",   365),
    ("Smoked paprika",    40,   "g",    "Spices & Herbs",   365),
    ("Garam masala",      35,   "g",    "Spices & Herbs",   365),
    ("Red pepper flakes", 20,   "g",    "Spices & Herbs",   365),
    ("Milk",              1000, "ml",   "Dairy",            7),
    ("Eggs",              12,   "count","Dairy",            21),
    ("Butter",            250,  "g",    "Dairy",            30),
    ("Parmesan",          200,  "g",    "Dairy",            60),
    ("Greek yogurt",      500,  "g",    "Dairy",            14),
    ("Chicken breast",    600,  "g",    "Meat & Seafood",   3),
    ("Salmon fillet",     300,  "g",    "Meat & Seafood",   2),
    ("Avocado",           3,    "count","Produce",          5),
    ("Bananas",           6,    "count","Produce",          6),
    ("Garlic",            1,    "bulb", "Produce",          30),
    ("Lemon",             4,    "count","Produce",          14),
    ("Broccoli",          400,  "g",    "Produce",          7),
    ("Mixed berries",     200,  "g",    "Frozen",           180),
    ("Frozen peas",       500,  "g",    "Frozen",           180),
    ("Dark chocolate",    200,  "g",    "Baking",           180),
    ("Chia seeds",        250,  "g",    "Health Foods",     365),
]

MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"]


# ── Seed logic ────────────────────────────────────────────────────────────────

def clear_all():
    print("  Clearing existing data...")
    db.session.execute(text("SET FOREIGN_KEY_CHECKS=0") if db.engine.dialect.name == 'mysql' else text("PRAGMA foreign_keys=OFF"))
    for model in [RecipeReview, MealHistory, MealPlan, Friendship, FriendRequest,
                  RecipeTag, RecipeIngredient, Recipe, PantryItem]:
        db.session.query(model).delete()
    # Delete non-demo users only (keep any manual test accounts)
    demo_emails = [u["email"] for u in USERS]
    db.session.query(User).filter(User.email.in_(demo_emails)).delete(synchronize_session=False)
    if db.engine.dialect.name == 'mysql':
        db.session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    else:
        db.session.execute(text("PRAGMA foreign_keys=ON"))
    # Clear account_profiles for demo users
    try:
        db.session.execute(text("DELETE FROM account_profiles WHERE 1=1"))
    except Exception:
        pass
    db.session.commit()


def seed():
    # ── Users ─────────────────────────────────────────────────────────────────
    print("  Creating users...")
    users = {}
    for u in USERS:
        user = User(
            username=u["username"],
            email=u["email"],
            password_hash=generate_password_hash(u["password"]),
        )
        db.session.add(user)
        users[u["username"]] = user
    db.session.flush()  # get IDs

    # Account profiles
    for username, user in users.items():
        bios = {
            "alexchef":  "Home cook obsessed with Italian food and pasta-making.",
            "samcooks":  "I meal prep every Sunday and love quick weeknight dinners.",
            "jordaneat": "Baking enthusiast who also loves a good salad.",
        }
        try:
            db.session.execute(text(
                "INSERT INTO account_profiles (user_id, bio, avatar_url) VALUES (:uid, :bio, :avatar)"
            ), {"uid": user.id, "bio": bios[username], "avatar": None})
        except Exception:
            pass

    # ── Recipes ───────────────────────────────────────────────────────────────
    print("  Creating recipes...")
    recipe_objs = {}
    for r in RECIPES:
        owner = users[r["owner"]]
        recipe = Recipe(
            user_id=owner.id,
            title=r["title"],
            description=r["description"],
            instructions=r["instructions"],
            prep_time=r["prep_time"],
            cook_time=r["cook_time"],
            servings=r["servings"],
            serving_size=r.get("serving_size"),
        )
        db.session.add(recipe)
        db.session.flush()

        for ing in r["ingredients"]:
            db.session.add(RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_name=ing["name"],
                quantity=ing.get("quantity"),
                unit=ing.get("unit"),
            ))

        for tag in r.get("tags", []):
            db.session.add(RecipeTag(recipe_id=recipe.id, tag=tag))

        recipe_objs[r["title"]] = recipe

    db.session.flush()

    # ── Pantry items (for alexchef and samcooks) ──────────────────────────────
    print("  Creating pantry items...")
    pantry_owners = ["alexchef", "samcooks"]
    for username in pantry_owners:
        user = users[username]
        for item_name, qty, unit, category, days_exp in PANTRY_TEMPLATES:
            expiry = days_ahead(days_exp) if days_exp < 900 else None
            db.session.add(PantryItem(
                user_id=user.id,
                item_name=item_name,
                quantity=qty,
                unit=unit,
                category=category,
                expiry_date=expiry,
            ))

    # Jordan has a smaller pantry
    jordan = users["jordaneat"]
    for item_name, qty, unit, category, days_exp in PANTRY_TEMPLATES[:15]:
        db.session.add(PantryItem(
            user_id=jordan.id,
            item_name=item_name,
            quantity=qty,
            unit=unit,
            category=category,
            expiry_date=days_ahead(days_exp) if days_exp < 900 else None,
        ))

    db.session.flush()

    # ── Meal plans (this week) ────────────────────────────────────────────────
    print("  Creating meal plans...")
    all_recipes = list(recipe_objs.values())
    plan_data = [
        # (username, days_ahead, meal_type, recipe_index)
        ("alexchef",  0, "breakfast", 4),   # Overnight Oats
        ("alexchef",  0, "dinner",    0),   # Carbonara
        ("alexchef",  1, "breakfast", 2),   # Avocado Toast
        ("alexchef",  1, "dinner",    1),   # Tikka Masala
        ("alexchef",  2, "lunch",     3),   # Black Bean Tacos
        ("alexchef",  3, "dinner",    0),   # Carbonara again
        ("samcooks",  0, "breakfast", 7),   # Banana Pancakes
        ("samcooks",  0, "lunch",     6),   # Greek Salad
        ("samcooks",  1, "dinner",    5),   # Beef Stir Fry
        ("samcooks",  2, "lunch",     8),   # Lentil Soup
        ("samcooks",  2, "dinner",    5),   # Beef Stir Fry
        ("jordaneat", 0, "dinner",    9),   # Margherita Pizza
        ("jordaneat", 1, "lunch",    13),   # Caesar Salad
        ("jordaneat", 2, "dinner",   10),   # Salmon + Asparagus
    ]
    for username, offset, meal_type, recipe_idx in plan_data:
        if recipe_idx < len(all_recipes):
            db.session.add(MealPlan(
                user_id=users[username].id,
                recipe_id=all_recipes[recipe_idx].id,
                planned_date=days_ahead(offset),
                meal_type=meal_type,
            ))

    # ── Meal history (last 14 days) ───────────────────────────────────────────
    print("  Creating meal history...")
    history_data = [
        ("alexchef",  1, "dinner",    0,  4, "Super creamy, nailed it!"),
        ("alexchef",  2, "breakfast", 2,  5, "Fast and filling."),
        ("alexchef",  3, "dinner",    1,  5, "Restaurant quality at home."),
        ("alexchef",  5, "lunch",     3,  4, "Quick and tasty."),
        ("alexchef",  7, "breakfast", 4,  4, "Perfect for busy mornings."),
        ("alexchef",  9, "dinner",    0,  5, "Even better the second time."),
        ("samcooks",  1, "dinner",    5,  4, "Nice and quick."),
        ("samcooks",  2, "lunch",     6,  5, "So fresh!"),
        ("samcooks",  4, "dinner",    8,  5, "Comforting and healthy."),
        ("samcooks",  6, "breakfast", 7,  4, "Kids loved them."),
        ("samcooks",  8, "lunch",     8,  4, "Great for meal prep."),
        ("jordaneat", 1, "dinner",    9,  5, "Perfect crust!"),
        ("jordaneat", 3, "dinner",   10,  5, "Light and delicious."),
        ("jordaneat", 5, "dessert",  11,  5, "Everyone was impressed."),
        ("jordaneat", 7, "lunch",    13,  4, "Crunchy croutons made it."),
    ]
    for username, days_back, meal_type, recipe_idx, rating, notes in history_data:
        if recipe_idx < len(all_recipes):
            db.session.add(MealHistory(
                user_id=users[username].id,
                recipe_id=all_recipes[recipe_idx].id,
                consumed_date=days_ago(days_back),
                meal_type=meal_type,
                rating=rating,
                notes=notes,
            ))

    db.session.flush()

    # ── Friendships ───────────────────────────────────────────────────────────
    print("  Creating friendships...")
    alex, sam, jordan = users["alexchef"], users["samcooks"], users["jordaneat"]

    # alex ↔ sam are friends
    for uid, fid in [(alex.id, sam.id), (sam.id, alex.id)]:
        db.session.add(Friendship(user_id=uid, friend_id=fid))

    # jordan sent a request to alex (pending)
    db.session.add(FriendRequest(sender_id=jordan.id, receiver_id=alex.id, status="pending"))

    # sam sent a request to jordan (accepted — requires friendship rows + accepted status)
    db.session.add(FriendRequest(sender_id=sam.id, receiver_id=jordan.id, status="accepted"))
    for uid, fid in [(sam.id, jordan.id), (jordan.id, sam.id)]:
        db.session.add(Friendship(user_id=uid, friend_id=fid))

    db.session.flush()

    # ── Reviews ───────────────────────────────────────────────────────────────
    print("  Creating recipe reviews...")
    reviews = [
        # (reviewer_username, recipe_title, rating, text)
        ("samcooks",  "Classic Spaghetti Carbonara",   5, "Tried this on a Friday night — absolutely perfect. The technique with the pasta water is key!"),
        ("jordaneat", "Classic Spaghetti Carbonara",   4, "Delicious but I found it a bit rich. I'll use a little less pancetta next time."),
        ("alexchef",  "Beef Stir Fry",                 5, "Super fast and better than takeout. I added some chili for heat."),
        ("jordaneat", "Beef Stir Fry",                 4, "Really good! I used chicken instead of beef and it worked great."),
        ("alexchef",  "Margherita Pizza",              5, "The simplicity is the whole point. High oven temp is everything."),
        ("samcooks",  "Margherita Pizza",              5, "Finally a homemade pizza that actually tastes like Naples."),
        ("alexchef",  "Lentil Soup",                   5, "Made a big batch Sunday, ate it all week. Freezes great too."),
        ("jordaneat", "Lentil Soup",                   4, "Warming and healthy. I added a bit of cayenne for kick."),
        ("samcooks",  "Salmon with Roasted Asparagus", 5, "20-minute dinner that feels fancy. My go-to weeknight meal now."),
        ("alexchef",  "Chocolate Lava Cakes",          5, "Made these for a dinner party and everyone lost their minds. 10/10."),
        ("samcooks",  "Chocolate Lava Cakes",          4, "Amazing flavour but tricky timing — mine were slightly overdone."),
    ]
    recipe_by_title = {r.title: r for r in recipe_objs.values()}
    added_reviews = set()
    for reviewer_name, recipe_title, rating, text in reviews:
        if recipe_title not in recipe_by_title:
            continue
        recipe = recipe_by_title[recipe_title]
        reviewer = users[reviewer_name]
        key = (reviewer.id, recipe.id)
        if key in added_reviews:
            continue
        # Don't let users review their own recipes
        if recipe.user_id == reviewer.id:
            continue
        added_reviews.add(key)
        db.session.add(RecipeReview(
            user_id=reviewer.id,
            recipe_id=recipe.id,
            rating=rating,
            review_text=text,
        ))

    db.session.commit()
    print()
    print("  Done! Seeded:")
    print(f"    {len(users)} users")
    print(f"    {len(recipe_objs)} recipes  (with ingredients & tags)")
    print(f"    {len(PANTRY_TEMPLATES) * 2 + 15} pantry items")
    print(f"    {len(history_data)} meal history entries")
    print(f"    {len(plan_data)} upcoming meal plans")
    print(f"    {len(added_reviews)} recipe reviews")
    print()
    print("  Login credentials (all passwords: Test1234):")
    for u in USERS:
        print(f"    {u['email']}  /  {u['username']}")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    reset = '--reset' in sys.argv

    with app.app_context():
        if reset:
            print("\nResetting data...")
            clear_all()
        else:
            # Check if already seeded
            existing = User.query.filter_by(email=USERS[0]["email"]).first()
            if existing and '--force' not in sys.argv:
                print(f"\nDemo data already exists (user: {existing.username}).")
                print("Run with --reset to wipe and reseed, or --force to add on top.\n")
                sys.exit(0)

        print("\nSeeding database...\n")
        seed()
        print("Seed complete.\n")
