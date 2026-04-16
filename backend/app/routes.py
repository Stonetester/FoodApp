from flask import Blueprint, request, jsonify, send_from_directory, send_file, current_app
import requests
from flask_login import login_required, current_user
from sqlalchemy.exc import IntegrityError
from app.account_profile import get_account_profile
from app.models import db, Recipe, RecipeIngredient, RecipeTag, PantryItem, MealPlan, MealHistory, User, FriendRequest, Friendship, RecipeReview
from app.utils import generate_qr_code, lookup_barcode, extract_recipe_from_url, extract_text_from_image, extract_text_from_images, auto_assign_category
from app.nutrition import lookup_ingredient_nutrition, calculate_recipe_nutrition, parse_nutrition_label_text
from datetime import datetime, date
from collections import Counter
import json
import os
import base64
import re
import uuid

main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__)

# Get the frontend directory path
# Get the backend directory (where this file is)
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Go up one level to FoodApp root, then into frontend/public
FRONTEND_DIR = os.path.join(os.path.dirname(BACKEND_DIR), 'frontend', 'public')
UPLOADS_DIR = os.path.join(FRONTEND_DIR, 'uploads', 'recipes')
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Debug: Verify path exists
if not os.path.exists(FRONTEND_DIR):
    print(f"ERROR: Frontend directory not found at: {FRONTEND_DIR}")
    print(f"Backend directory: {BACKEND_DIR}")
    print(f"Current working directory: {os.getcwd()}")
else:
    print(f"Frontend directory found: {FRONTEND_DIR}")

# Serve frontend static files
@main_bp.route('/')
def index():
    return send_file(os.path.join(FRONTEND_DIR, 'index.html'))

@main_bp.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

@main_bp.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

@main_bp.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'images'), filename)

@main_bp.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'uploads'), filename)

def ensure_recipe_image_url(recipe):
    """
    Ensure recipe.image_url is a valid URL/path.
    Returns True if it changed anything, otherwise False.
    """
    if not getattr(recipe, "image_url", None):
        return False

    url = recipe.image_url.strip()

    # If already absolute or already a root path, leave it alone
    if url.startswith(("http://", "https://", "/")):
        return False

    # Otherwise normalize to a root-relative path
    recipe.image_url = f"/{url.lstrip('/')}"
    return True


def normalize_image_url(image_url):
    if not image_url:
        return None
    if isinstance(image_url, str) and image_url.startswith('data:image'):
        return save_data_url_image(image_url)
    return image_url

def save_data_url_image(data_url):
    match = re.match(r'^data:image/([a-zA-Z0-9.+-]+);base64,(.+)$', data_url)
    if not match:
        raise ValueError('Invalid image data')
    extension = match.group(1).lower()
    if extension == 'jpeg':
        extension = 'jpg'
    image_data = base64.b64decode(match.group(2))
    filename = f"{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(UPLOADS_DIR, filename)
    with open(file_path, 'wb') as file_handle:
        file_handle.write(image_data)
    return f"/uploads/recipes/{filename}"

# Catch-all route for frontend routing (SPA)
@main_bp.route('/<path:path>')
def serve_frontend(path):
    # Don't serve API routes or static files through this route
    if path.startswith('api/') or path.startswith('css/') or path.startswith('js/') or path.startswith('images/'):
        return jsonify({'error': 'Not found'}), 404
    # For SPA routing, serve index.html
    return send_file(os.path.join(FRONTEND_DIR, 'index.html'))

# Recipe endpoints
@api_bp.route('/recipes', methods=['GET'])
@login_required
def get_recipes():
    """Get all recipes for current user with optional filters"""
    filters = {}
    
    # Filter by dietary tags
    tags = request.args.getlist('tags')
    search = request.args.get('search', '')
    
    query = Recipe.query.filter_by(user_id=current_user.id)
    
    if search:
        query = query.filter(
            Recipe.title.contains(search) | 
            Recipe.description.contains(search)
        )
    
    if tags:
        # Filter recipes that have any of the specified tags
        query = query.join(RecipeTag).filter(RecipeTag.tag.in_(tags))
    
    recipes = query.all()
    updated = False
    for recipe in recipes:
        if ensure_recipe_image_url(recipe):
            updated = True
    if updated:
        db.session.commit()

    # Add rating data from RecipeReview
    result = []
    for recipe in recipes:
        recipe_dict = recipe.to_dict()
        review_stats = db.session.query(
            db.func.avg(RecipeReview.rating),
            db.func.count(RecipeReview.id)
        ).filter(RecipeReview.recipe_id == recipe.id).first()
        recipe_dict['average_rating'] = round(float(review_stats[0]), 1) if review_stats[0] else None
        recipe_dict['rating_count'] = review_stats[1] or 0
        result.append(recipe_dict)

    return jsonify(result), 200

@api_bp.route('/recipes/<int:recipe_id>', methods=['GET'])
@login_required
def get_recipe(recipe_id):
    """Get a specific recipe (any user's recipe is viewable)"""
    recipe = Recipe.query.get(recipe_id)

    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404

    if ensure_recipe_image_url(recipe):
        db.session.commit()

    recipe_dict = recipe.to_dict()
    recipe_dict['is_owner'] = recipe.user_id == current_user.id
    if recipe.user_id != current_user.id:
        recipe_dict['owner'] = {
            'id': recipe.user_id,
            'username': recipe.user.username
        }
    return jsonify(recipe_dict), 200

@api_bp.route('/recipes', methods=['POST'])
@login_required
def create_recipe():
    """Create a new recipe"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        if not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400
        
        image_url = normalize_image_url(data.get('image_url'))

        recipe = Recipe(
            user_id=current_user.id,
            title=data.get('title', '').strip(),
            description=data.get('description') if data.get('description') else None,
            instructions=data.get('instructions') if data.get('instructions') else None,
            prep_time=int(data.get('prep_time')) if data.get('prep_time') else None,
            cook_time=int(data.get('cook_time')) if data.get('cook_time') else None,
            servings=int(data.get('servings')) if data.get('servings') else None,
            image_url=image_url,
            source_url=data.get('source_url') if data.get('source_url') else None,
            serving_size=data.get('serving_size')
        )
        
        db.session.add(recipe)
        db.session.flush()
        
        # Add ingredients (use provided nutrition only — skip slow per-ingredient API lookups)
        for ing_data in data.get('ingredients', []):
            if ing_data and ing_data.get('ingredient_name'):
                nutritional_info = ing_data.get('nutritional_info')
                ingredient = RecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_name=ing_data.get('ingredient_name', '').strip(),
                    quantity=float(ing_data.get('quantity')) if ing_data.get('quantity') else None,
                    unit=ing_data.get('unit') if ing_data.get('unit') else None,
                    nutritional_info=json.dumps(nutritional_info) if nutritional_info else None
                )
                db.session.add(ingredient)

        # Add tags
        for tag_name in data.get('tags', []):
            if tag_name:
                tag = RecipeTag(recipe_id=recipe.id, tag=tag_name)
                db.session.add(tag)

        db.session.commit()

        return jsonify(recipe.to_dict()), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error creating recipe: {e}")
        return jsonify({'error': f'Failed to create recipe: {str(e)}'}), 500

@api_bp.route('/recipes/<int:recipe_id>', methods=['PUT'])
@login_required
def update_recipe(recipe_id):
    """Update a recipe"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        recipe = Recipe.query.filter_by(id=recipe_id, user_id=current_user.id).first()
        
        if not recipe:
            return jsonify({'error': 'Recipe not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        recipe.title = data.get('title', recipe.title).strip() if data.get('title') else recipe.title
        recipe.description = data.get('description') if data.get('description') else recipe.description
        recipe.instructions = data.get('instructions') if data.get('instructions') else recipe.instructions
        recipe.prep_time = int(data.get('prep_time')) if data.get('prep_time') else recipe.prep_time
        recipe.cook_time = int(data.get('cook_time')) if data.get('cook_time') else recipe.cook_time
        recipe.servings = int(data.get('servings')) if data.get('servings') else recipe.servings
        if 'image_url' in data:
            recipe.image_url = normalize_image_url(data.get('image_url'))
        if 'source_url' in data:
            recipe.source_url = data.get('source_url') if data.get('source_url') else None
        recipe.updated_at = datetime.utcnow()
        if 'serving_size' in data:
            recipe.serving_size = data.get('serving_size')

        # Update ingredients
        if 'ingredients' in data:
            # Delete existing ingredients
            RecipeIngredient.query.filter_by(recipe_id=recipe.id).delete()
            
            # Add new ingredients (use provided nutrition only — skip slow per-ingredient API lookups)
            for ing_data in data.get('ingredients', []):
                if ing_data and ing_data.get('ingredient_name'):
                    nutritional_info = ing_data.get('nutritional_info')
                    ingredient = RecipeIngredient(
                        recipe_id=recipe.id,
                        ingredient_name=ing_data.get('ingredient_name', '').strip(),
                        quantity=float(ing_data.get('quantity')) if ing_data.get('quantity') else None,
                        unit=ing_data.get('unit') if ing_data.get('unit') else None,
                        nutritional_info=json.dumps(nutritional_info) if nutritional_info else None
                    )
                    db.session.add(ingredient)
        
        # Update tags
        if 'tags' in data:
            # Delete existing tags
            RecipeTag.query.filter_by(recipe_id=recipe.id).delete()
            
            # Add new tags
            for tag_name in data.get('tags', []):
                if tag_name:
                    tag = RecipeTag(recipe_id=recipe.id, tag=tag_name)
                    db.session.add(tag)
        
        db.session.commit()
        
        return jsonify(recipe.to_dict()), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error updating recipe: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to update recipe: {str(e)}'}), 500

@api_bp.route('/recipes/<int:recipe_id>', methods=['DELETE'])
@login_required
def delete_recipe(recipe_id):
    """Delete a recipe"""
    recipe = Recipe.query.filter_by(id=recipe_id, user_id=current_user.id).first()

    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404

    try:
        # Delete all records referencing this recipe (from ANY user)
        RecipeReview.query.filter_by(recipe_id=recipe_id).delete()
        MealHistory.query.filter_by(recipe_id=recipe_id).delete()
        MealPlan.query.filter_by(recipe_id=recipe_id).delete()
        db.session.delete(recipe)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Failed to delete recipe %s: %s", recipe_id, e)
        return jsonify({'error': 'Failed to delete recipe'}), 500

    return jsonify({'message': 'Recipe deleted'}), 200

@api_bp.route('/recipes/<int:recipe_id>/qr', methods=['GET'])
@login_required
def get_recipe_qr(recipe_id):
    """Generate QR code for a recipe"""
    recipe = Recipe.query.get(recipe_id)

    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404

    # Build shareable URL
    recipe_url = f"{request.host_url}?recipe={recipe.id}"

    # Generate QR code from URL
    qr_image = generate_qr_code(recipe_url)

    return jsonify({'qr_code': qr_image, 'recipe_url': recipe_url, 'source_url': recipe.source_url}), 200

@api_bp.route('/recipes/import-url', methods=['POST'])
@login_required
def import_recipe_from_url():
    """Import recipe from URL"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request data'}), 400
            
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            return jsonify({'error': 'URL must start with http:// or https://'}), 400
        
        print(f"Attempting to extract recipe from URL: {url}")
        recipe_data = extract_recipe_from_url(url)
        
        if not recipe_data:
            return jsonify({'error': 'Could not extract recipe from URL. The page may not contain recipe data or may be blocking access.'}), 400
        
        if not recipe_data.get('title') or recipe_data.get('title') == 'Imported Recipe':
            # Still return data but with a warning
            recipe_data['_warning'] = 'Could not extract recipe title. You may need to enter it manually.'
        
        print(f"Successfully extracted recipe: {recipe_data.get('title', 'Unknown')}")
        return jsonify(recipe_data), 200
    except requests.exceptions.RequestException as e:
        print(f"Request exception: {e}")
        return jsonify({'error': f'Failed to fetch URL: {str(e)}. The website may be blocking requests or the URL may be invalid.'}), 500
    except Exception as e:
        print(f"Error in import_recipe_from_url: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error extracting recipe: {str(e)}'}), 500

@api_bp.route('/recipes/import-image', methods=['POST'])
@login_required
def import_recipe_from_image():
    """Import recipe from image using OCR"""
    try:
        # Get image data from request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request data'}), 400
            
        # Accept either 'images' (array) or legacy 'image' (single)
        images = data.get('images') or ([data['image']] if data.get('image') else None)

        if not images:
            return jsonify({'error': 'Image data is required'}), 400

        print("=== IMAGE IMPORT REQUEST RECEIVED ===")
        print(f"Number of images: {len(images)}")
        print("Attempting to extract recipe from image(s)...")

        recipe_data = extract_text_from_images(images)
        
        print("=== EXTRACTION COMPLETE ===")
        print(f"Recipe data returned: {recipe_data is not None}")
        
        if not recipe_data:
            print("ERROR: extract_text_from_image returned None")
            return jsonify({
                'title': 'Recipe from Image',
                'description': None,
                'ingredients': [],
                'instructions': None,
                'prep_time': None,
                'cook_time': None,
                'servings': None,
                '_error': 'Could not extract recipe from image. Tesseract OCR may not be installed or configured.'
            }), 200
        
        # Return recipe data (may include _error field)
        print(f"Successfully extracted recipe: {recipe_data.get('title', 'Unknown')}")
        print(f"Recipe has error: {recipe_data.get('_error', 'None')}")
        print(f"Recipe ingredients count: {len(recipe_data.get('ingredients', []))}")
        print(f"Recipe instructions length: {len(recipe_data.get('instructions', '') or '')}")
        print("=== RETURNING RECIPE DATA TO FRONTEND ===")
        return jsonify(recipe_data), 200
    except Exception as e:
        print(f"Error in import_recipe_from_image: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'title': 'Recipe from Image',
            'description': None,
            'ingredients': [],
            'instructions': None,
            'prep_time': None,
            'cook_time': None,
            'servings': None,
            '_error': f'Error processing image: {str(e)}'
        }), 200  # Return 200 so frontend can show the error message

# Pantry endpoints
@api_bp.route('/pantry', methods=['GET'])
@login_required
def get_pantry():
    """Get all pantry items for current user"""
    items = PantryItem.query.filter_by(user_id=current_user.id).all()
    return jsonify([item.to_dict() for item in items]), 200

@api_bp.route('/pantry', methods=['POST'])
@login_required
def add_pantry_item():
    """Add a new pantry item"""
    data = request.get_json()
    
    expiry_date = None
    if data.get('expiry_date'):
        expiry_date = datetime.strptime(data.get('expiry_date'), '%Y-%m-%d').date()
    
    # Auto-assign category if not provided
    category = data.get('category') or auto_assign_category(data.get('item_name', ''))

    item = PantryItem(
        user_id=current_user.id,
        item_name=data.get('item_name'),
        barcode=data.get('barcode'),
        quantity=data.get('quantity'),
        unit=data.get('unit'),
        expiry_date=expiry_date,
        nutritional_info=json.dumps(data.get('nutritional_info', {})) if data.get('nutritional_info') else None,
        category=category,
        serving_size=data.get('serving_size'),
        servings_per_container=float(data.get('servings_per_container')) if data.get('servings_per_container') else None,
        container_type=data.get('container_type')
    )
    
    db.session.add(item)
    db.session.commit()
    
    return jsonify(item.to_dict()), 201

@api_bp.route('/pantry/<int:item_id>', methods=['PUT'])
@login_required
def update_pantry_item(item_id):
    """Update a pantry item"""
    item = PantryItem.query.filter_by(id=item_id, user_id=current_user.id).first()
    
    if not item:
        return jsonify({'error': 'Pantry item not found'}), 404
    
    data = request.get_json()
    
    item.item_name = data.get('item_name', item.item_name)
    item.barcode = data.get('barcode', item.barcode)
    item.quantity = data.get('quantity', item.quantity)
    item.unit = data.get('unit', item.unit)
    if 'category' in data:
        item.category = data['category']
    if 'serving_size' in data:
        item.serving_size = data['serving_size']
    if 'servings_per_container' in data:
        item.servings_per_container = float(data['servings_per_container']) if data['servings_per_container'] else None
    if 'container_type' in data:
        item.container_type = data['container_type']

    if data.get('expiry_date'):
        item.expiry_date = datetime.strptime(data.get('expiry_date'), '%Y-%m-%d').date()
    
    if data.get('nutritional_info'):
        item.nutritional_info = json.dumps(data.get('nutritional_info'))
    
    db.session.commit()
    
    return jsonify(item.to_dict()), 200

@api_bp.route('/pantry/<int:item_id>', methods=['DELETE'])
@login_required
def delete_pantry_item(item_id):
    """Delete a pantry item"""
    item = PantryItem.query.filter_by(id=item_id, user_id=current_user.id).first()
    
    if not item:
        return jsonify({'error': 'Pantry item not found'}), 404
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Pantry item deleted'}), 200

@api_bp.route('/pantry/scan', methods=['POST'])
@login_required
def scan_barcode():
    """Process barcode scan and lookup product info"""
    data = request.get_json()
    barcode = data.get('barcode')
    
    if not barcode:
        return jsonify({'error': 'Barcode required'}), 400
    
    product_info = lookup_barcode(barcode)
    
    if product_info:
        return jsonify(product_info), 200
    else:
        return jsonify({'error': 'Product not found'}), 404

@api_bp.route('/pantry/scan-nutrition-label', methods=['POST'])
@login_required
def scan_nutrition_label():
    """Extract nutrition facts from a photo of a nutrition label using OCR."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request data'}), 400

        image_data = data.get('image')
        if not image_data:
            return jsonify({'error': 'Image data is required'}), 400

        # Reuse the same OCR pipeline from recipe image import
        from PIL import Image
        import pytesseract

        tesseract_cmd = os.environ.get('TESSERACT_CMD')
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

        # Strip data-URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        import io as _io
        image = Image.open(_io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Run OCR optimised for dense text blocks (PSM 6)
        custom_config = '--oem 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config)

        if not text or len(text.strip()) < 10:
            # Fallback to fully automatic segmentation
            text = pytesseract.image_to_string(image, config='--oem 3 --psm 3')

        if not text or len(text.strip()) < 10:
            return jsonify({
                'error': 'Could not extract text from image. The photo may be too blurry or the label too small.',
                'raw_text': ''
            }), 200

        print(f"[scan-nutrition-label] OCR text ({len(text)} chars): {text[:300]}")

        nutrition = parse_nutrition_label_text(text)

        return jsonify({
            'nutrition': nutrition,
            'raw_text': text
        }), 200

    except ImportError:
        return jsonify({
            'error': 'OCR requires pytesseract and Pillow. Install with: pip install pytesseract Pillow'
        }), 500
    except Exception as e:
        print(f"Error in scan_nutrition_label: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error processing nutrition label: {str(e)}'}), 500

# Meal planning endpoints
@api_bp.route('/mealplan', methods=['GET'])
@login_required
def get_meal_plan():
    """Get meal plan for date range"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = MealPlan.query.filter_by(user_id=current_user.id)
    
    if start_date:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        query = query.filter(MealPlan.planned_date >= start)
    
    if end_date:
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        query = query.filter(MealPlan.planned_date <= end)
    
    plans = query.all()
    updated = False
    for plan in plans:
        if ensure_recipe_image_url(plan.recipe):
            updated = True
    if updated:
        db.session.commit()
    return jsonify([plan.to_dict() for plan in plans]), 200

@api_bp.route('/mealplan', methods=['POST'])
@login_required
def add_meal_plan():
    """Add meal to plan"""
    data = request.get_json()
    
    planned_date = datetime.strptime(data.get('planned_date'), '%Y-%m-%d').date()
    
    plan = MealPlan(
        user_id=current_user.id,
        recipe_id=data.get('recipe_id'),
        planned_date=planned_date,
        meal_type=data.get('meal_type'),
        notes=data.get('notes')
    )
    
    db.session.add(plan)
    db.session.commit()
    
    return jsonify(plan.to_dict()), 201

@api_bp.route('/mealplan/<int:plan_id>', methods=['PUT'])
@login_required
def update_meal_plan(plan_id):
    """Update meal plan"""
    plan = MealPlan.query.filter_by(id=plan_id, user_id=current_user.id).first()
    
    if not plan:
        return jsonify({'error': 'Meal plan not found'}), 404
    
    data = request.get_json()
    
    if data.get('planned_date'):
        plan.planned_date = datetime.strptime(data.get('planned_date'), '%Y-%m-%d').date()
    plan.recipe_id = data.get('recipe_id', plan.recipe_id)
    plan.meal_type = data.get('meal_type', plan.meal_type)
    plan.notes = data.get('notes', plan.notes)
    
    db.session.commit()
    
    return jsonify(plan.to_dict()), 200

@api_bp.route('/mealplan/<int:plan_id>', methods=['DELETE'])
@login_required
def delete_meal_plan(plan_id):
    """Delete meal plan"""
    plan = MealPlan.query.filter_by(id=plan_id, user_id=current_user.id).first()
    
    if not plan:
        return jsonify({'error': 'Meal plan not found'}), 404
    
    db.session.delete(plan)
    db.session.commit()
    
    return jsonify({'message': 'Meal plan deleted'}), 200

# Meal history endpoints
@api_bp.route('/history', methods=['GET'])
@login_required
def get_meal_history():
    """Get meal history"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = MealHistory.query.filter_by(user_id=current_user.id)
    
    if start_date:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        query = query.filter(MealHistory.consumed_date >= start)
    
    if end_date:
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        query = query.filter(MealHistory.consumed_date <= end)
    
    history = query.order_by(MealHistory.consumed_date.desc()).all()
    return jsonify([h.to_dict() for h in history]), 200

@api_bp.route('/history', methods=['POST'])
@login_required
def log_meal():
    """Log a consumed meal"""
    data = request.get_json()
    
    consumed_date = datetime.strptime(data.get('consumed_date'), '%Y-%m-%d').date()
    
    history = MealHistory(
        user_id=current_user.id,
        recipe_id=data.get('recipe_id'),
        consumed_date=consumed_date,
        meal_type=data.get('meal_type'),
        rating=data.get('rating'),
        notes=data.get('notes')
    )
    
    db.session.add(history)
    db.session.commit()
    
    return jsonify(history.to_dict()), 201


# ==================== USER SEARCH AND DISCOVERY ENDPOINTS ====================

@api_bp.route('/users/search', methods=['GET'])
@login_required
def search_users():
    """Search for users by username"""
    query = request.args.get('q', '')
    
    if len(query) < 2:
        return jsonify({'error': 'Query must be at least 2 characters'}), 400
    
    # Search for users (case-insensitive)
    users = User.query.filter(
        User.username.ilike(f'%{query}%'),
        User.id != current_user.id  # Don't include current user
    ).limit(20).all()
    
    result = []
    for user in users:
        result.append({
            'id': user.id,
            'username': user.username,
            'recipe_count': len(user.recipes),
            'created_at': user.created_at.isoformat() if user.created_at else None
        })
    
    return jsonify(result), 200

# ==================== PUBLIC RECIPE DISCOVERY ====================
@api_bp.route('/recipes/discover', methods=['GET'])
@login_required
def discover_recipes():
    """Search recipes across all users"""
    search = request.args.get('search', '').strip()
    tags = request.args.getlist('tags')
    
    query = Recipe.query.join(User, Recipe.user_id == User.id)
    
    if search:
        query = query.filter(
            Recipe.title.ilike(f"%{search}%") |
            Recipe.description.ilike(f"%{search}%")
        )
    
    if tags:
        query = query.join(RecipeTag).filter(RecipeTag.tag.in_(tags))
    
    recipes = query.order_by(Recipe.created_at.desc()).all()
    
    results = []
    for recipe in recipes:
        recipe_dict = recipe.to_dict()
        recipe_dict['owner'] = {
            'id': recipe.user_id,
            'username': recipe.user.username
        }
        recipe_dict['is_owner'] = recipe.user_id == current_user.id
        # Add review stats
        review_stats = db.session.query(
            db.func.avg(RecipeReview.rating),
            db.func.count(RecipeReview.id)
        ).filter(RecipeReview.recipe_id == recipe.id).first()
        recipe_dict['average_rating'] = round(float(review_stats[0]), 1) if review_stats[0] else None
        recipe_dict['review_count'] = review_stats[1] or 0
        results.append(recipe_dict)
    
    return jsonify(results), 200

@api_bp.route('/recipes/discover/<int:recipe_id>', methods=['GET'])
@login_required
def get_discover_recipe(recipe_id):
    """Get a single recipe from any user (for discovery view)"""
    recipe = Recipe.query.get(recipe_id)
    
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    recipe_dict = recipe.to_dict()
    recipe_dict['owner'] = {
        'id': recipe.user_id,
        'username': recipe.user.username
    }
    recipe_dict['is_owner'] = recipe.user_id == current_user.id
    
    return jsonify(recipe_dict), 200


@api_bp.route('/users/<int:user_id>/recipes', methods=['GET'])
@login_required
def get_user_recipes(user_id):
    """Get recipes from a specific user with ratings"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    recipes = Recipe.query.filter_by(user_id=user_id).all()
    
    # Add average ratings to each recipe
    result = []
    for recipe in recipes:
        recipe_dict = recipe.to_dict()
        
        # Calculate average rating from meal history
        ratings = db.session.query(MealHistory.rating).filter(
            MealHistory.recipe_id == recipe.id,
            MealHistory.rating.isnot(None)
        ).all()
        
        if ratings:
            rating_values = [r[0] for r in ratings]
            avg_rating = sum(rating_values) / len(rating_values)
            recipe_dict['average_rating'] = round(avg_rating, 1)
            recipe_dict['rating_count'] = len(ratings)
            
            # Also include rating distribution
            rating_counts = Counter(rating_values)
            recipe_dict['rating_distribution'] = {
                '5': rating_counts.get(5, 0),
                '4': rating_counts.get(4, 0),
                '3': rating_counts.get(3, 0),
                '2': rating_counts.get(2, 0),
                '1': rating_counts.get(1, 0)
            }
        else:
            recipe_dict['average_rating'] = None
            recipe_dict['rating_count'] = 0
            recipe_dict['rating_distribution'] = {}
        
        # Add owner info
        recipe_dict['owner'] = {
            'id': user.id,
            'username': user.username
        }
        
        result.append(recipe_dict)
    
    return jsonify(result), 200

@api_bp.route('/users/<int:user_id>/mealplan', methods=['GET'])
@login_required
def get_user_meal_plan(user_id):
    """Get meal plan for a specific user (friends only)"""
    if user_id != current_user.id:
        is_friend = Friendship.query.filter(
            db.or_(
                db.and_(Friendship.user_id == current_user.id, Friendship.friend_id == user_id),
                db.and_(Friendship.user_id == user_id, Friendship.friend_id == current_user.id)
            )
        ).first()
        if not is_friend:
            return jsonify({'error': 'You do not have access to this meal plan'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = MealPlan.query.filter_by(user_id=user_id)

    if start_date:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        query = query.filter(MealPlan.planned_date >= start)

    if end_date:
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        query = query.filter(MealPlan.planned_date <= end)

    plans = query.order_by(MealPlan.planned_date.asc()).all()
    return jsonify([plan.to_dict() for plan in plans]), 200

@api_bp.route('/friends/activity', methods=['GET'])
@login_required
def get_friends_activity():
    """Recent recipes added by friends (for dashboard feed)"""
    friend_ids_q = db.session.query(Friendship.friend_id).filter_by(user_id=current_user.id).all()
    reverse_ids_q = db.session.query(Friendship.user_id).filter_by(friend_id=current_user.id).all()
    friend_ids = list({row[0] for row in friend_ids_q + reverse_ids_q})

    if not friend_ids:
        return jsonify([]), 200

    recent = (
        Recipe.query
        .filter(Recipe.user_id.in_(friend_ids))
        .order_by(Recipe.created_at.desc())
        .limit(10)
        .all()
    )
    results = []
    for recipe in recent:
        d = recipe.to_dict()
        d['owner'] = {'id': recipe.user_id, 'username': recipe.user.username}
        results.append(d)
    return jsonify(results), 200

# ==================== FRIENDS & SOCIAL ====================
@api_bp.route('/friends', methods=['GET'])
@login_required
def get_friends():
    """Get current user's friends list (both directions of the friendship row)"""
    forward = (
        Friendship.query.filter_by(user_id=current_user.id)
        .with_entities(Friendship.friend_id)
        .all()
    )
    reverse = (
        Friendship.query.filter_by(friend_id=current_user.id)
        .with_entities(Friendship.user_id)
        .all()
    )
    friend_ids = list({row[0] for row in forward + reverse})
    friends = User.query.filter(User.id.in_(friend_ids)).all() if friend_ids else []
    
    return jsonify([
        {
            'id': friend.id,
            'username': friend.username,
            'email': friend.email,
            'created_at': friend.created_at.isoformat() if friend.created_at else None,
            'account_profile': get_account_profile(friend.id)
        }
        for friend in friends
    ]), 200

@api_bp.route('/friends/requests', methods=['GET'])
@login_required
def get_friend_requests():
    """Get incoming and outgoing friend requests"""
    incoming = FriendRequest.query.filter_by(receiver_id=current_user.id, status='pending').all()
    outgoing = FriendRequest.query.filter_by(sender_id=current_user.id, status='pending').all()
    
    return jsonify({
        'incoming': [
            {
                'id': req.id,
                'user': {
                    'id': req.sender.id,
                    'username': req.sender.username
                },
                'created_at': req.created_at.isoformat() if req.created_at else None
            }
            for req in incoming
        ],
        'outgoing': [
            {
                'id': req.id,
                'user': {
                    'id': req.receiver.id,
                    'username': req.receiver.username
                },
                'created_at': req.created_at.isoformat() if req.created_at else None
            }
            for req in outgoing
        ]
    }), 200

@api_bp.route('/friends/requests/send', methods=['POST'])
@login_required
def send_friend_request():
    """Send a friend request by user id"""
    data = request.get_json() or {}
    receiver_id = data.get('receiver_id')

    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        return jsonify({'error': 'Valid receiver_id is required'}), 400

    if receiver_id == current_user.id:
        return jsonify({'error': 'You cannot add yourself as a friend'}), 400

    recipient = User.query.get(receiver_id)
    if not recipient:
        return jsonify({'error': 'User not found'}), 404

    existing_friendship = (
        Friendship.query.filter_by(user_id=current_user.id, friend_id=receiver_id)
        .with_entities(Friendship.user_id)
        .first()
    )
    if not existing_friendship:
        existing_friendship = (
            Friendship.query.filter_by(user_id=receiver_id, friend_id=current_user.id)
            .with_entities(Friendship.user_id)
            .first()
        )
    if existing_friendship:
        return jsonify({'error': 'You are already friends'}), 400

    existing_request = FriendRequest.query.filter_by(
        sender_id=current_user.id,
        receiver_id=receiver_id
    ).order_by(FriendRequest.id.desc()).first()
    if existing_request:
        if existing_request.status == 'pending':
            return jsonify({'friend_request': existing_request.to_dict()}), 200
        return jsonify({'error': 'Friend request already exists'}), 409

    reverse_request = FriendRequest.query.filter_by(
        sender_id=receiver_id,
        receiver_id=current_user.id,
        status='pending'
    ).first()
    if reverse_request:
        return jsonify({'error': 'This user already sent you a request'}), 409

    friend_request = FriendRequest(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        status='pending'
    )

    db.session.add(friend_request)
    try:
        db.session.commit()
        current_app.logger.info(
           "FRIEND REQUEST COMMITTED: id=%s sender=%s receiver=%s",
           friend_request.id, current_user.id, receiver_id
        )
        # Send email notifications (fire-and-forget)
        try:
            from app.email_service import send_friend_request_sent, send_friend_request_received
            send_friend_request_sent(current_user, recipient)
            send_friend_request_received(current_user, recipient)
        except Exception as e:
            current_app.logger.warning("Friend request email failed: %s", e)
    except IntegrityError:
        db.session.rollback()
        current_app.logger.warning(
            "Friend request already exists for sender %s -> receiver %s",
            current_user.id,
            receiver_id
        )
        return jsonify({'error': 'Friend request already exists'}), 409
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Failed to create friend request for sender %s -> receiver %s",
            current_user.id,
            receiver_id
        )
        return jsonify({'error': 'Unable to send friend request'}), 500

    return jsonify({'friend_request': friend_request.to_dict()}), 201

@api_bp.route('/friends/respond', methods=['POST'])
@login_required
def respond_to_friend_request():
    """Accept or decline a friend request"""
    data = request.get_json() or {}
    request_id = data.get('request_id')
    action = (data.get('action') or '').strip().lower()
    
    if not request_id or action not in {'accept', 'decline'}:
        return jsonify({'error': 'Request ID and valid action are required'}), 400
    
    friend_request = FriendRequest.query.filter_by(id=request_id, receiver_id=current_user.id).first()
    if not friend_request or friend_request.status != 'pending':
        return jsonify({'error': 'Friend request not found'}), 404
    
    if action == 'decline':
        friend_request.status = 'declined'
        db.session.commit()
        return jsonify({'message': 'Friend request declined'}), 200
    
    friend_request.status = 'accepted'
    
    friendships = [
        Friendship(user_id=friend_request.sender_id, friend_id=friend_request.receiver_id),
        Friendship(user_id=friend_request.receiver_id, friend_id=friend_request.sender_id)
    ]
    
    for friendship in friendships:
        existing = (
            Friendship.query.filter_by(user_id=friendship.user_id, friend_id=friendship.friend_id)
            .with_entities(Friendship.user_id)
            .first()
        )
        if not existing:
            db.session.add(friendship)
    
    db.session.commit()
    
    return jsonify({'message': 'Friend request accepted'}), 200

@api_bp.route('/friends/<int:friend_id>', methods=['DELETE'])
@login_required
def remove_friend(friend_id):
    """Remove a friend connection"""
    Friendship.query.filter_by(user_id=current_user.id, friend_id=friend_id).delete()
    Friendship.query.filter_by(user_id=friend_id, friend_id=current_user.id).delete()
    
    db.session.commit()
    
    return jsonify({'message': 'Friend removed'}), 200


@api_bp.route('/users/<int:user_id>', methods=['GET'])
@login_required
def get_user_profile(user_id):
    """Get user profile information"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get user stats
    recipe_count = len(user.recipes)
    
    # Get total ratings received
    total_ratings = db.session.query(MealHistory).join(Recipe).filter(
        Recipe.user_id == user_id,
        MealHistory.rating.isnot(None)
    ).count()
    
    # Calculate average rating across all recipes
    all_ratings = db.session.query(MealHistory.rating).join(Recipe).filter(
        Recipe.user_id == user_id,
        MealHistory.rating.isnot(None)
    ).all()
    
    avg_rating = None
    if all_ratings:
        rating_values = [r[0] for r in all_ratings]
        avg_rating = round(sum(rating_values) / len(rating_values), 1)
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email if user.id == current_user.id else None,  # Only show email to self
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'stats': {
            'recipe_count': recipe_count,
            'total_ratings': total_ratings,
            'average_rating': avg_rating
        },
        'account_profile': get_account_profile(user.id)
    }), 200


@api_bp.route('/recipes/<int:recipe_id>/copy', methods=['POST'])
@login_required
def copy_recipe(recipe_id):
    """Copy another user's recipe to your own collection"""
    original_recipe = Recipe.query.get(recipe_id)
    
    if not original_recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    # Check if user is trying to copy their own recipe
    if original_recipe.user_id == current_user.id:
        return jsonify({'error': 'Cannot copy your own recipe'}), 400
    
    try:
        # Create a copy for current user
        new_recipe = Recipe(
            user_id=current_user.id,
            title=original_recipe.title,
            description=f"Copied from {original_recipe.user.username}: {original_recipe.description or ''}",
            instructions=original_recipe.instructions,
            prep_time=original_recipe.prep_time,
            cook_time=original_recipe.cook_time,
            servings=original_recipe.servings,
            image_url=original_recipe.image_url
        )
        
        db.session.add(new_recipe)
        db.session.flush()
        
        # Copy ingredients
        for ingredient in original_recipe.ingredients:
            new_ingredient = RecipeIngredient(
                recipe_id=new_recipe.id,
                ingredient_name=ingredient.ingredient_name,
                quantity=ingredient.quantity,
                unit=ingredient.unit,
                nutritional_info=ingredient.nutritional_info
            )
            db.session.add(new_ingredient)
        
        # Copy tags
        for tag in original_recipe.tags:
            new_tag = RecipeTag(recipe_id=new_recipe.id, tag=tag.tag)
            db.session.add(new_tag)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Recipe copied successfully',
            'recipe': new_recipe.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error copying recipe: {e}")
        return jsonify({'error': 'Failed to copy recipe'}), 500


@api_bp.route('/recipes/<int:recipe_id>/ratings', methods=['GET'])
@login_required
def get_recipe_ratings(recipe_id):
    """Get all ratings and reviews for a recipe"""
    recipe = Recipe.query.get(recipe_id)
    
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    # Get all meal history entries with ratings for this recipe
    history_entries = MealHistory.query.filter(
        MealHistory.recipe_id == recipe_id,
        MealHistory.rating.isnot(None)
    ).order_by(MealHistory.consumed_date.desc()).all()
    
    ratings_list = []
    for entry in history_entries:
        # Get the user who rated
        user = User.query.get(entry.user_id)
        
        ratings_list.append({
            'rating': entry.rating,
            'notes': entry.notes,
            'consumed_date': entry.consumed_date.isoformat() if entry.consumed_date else None,
            'user': {
                'id': user.id,
                'username': user.username
            } if user else None
        })
    
    # Calculate statistics
    if history_entries:
        rating_values = [e.rating for e in history_entries]
        avg_rating = round(sum(rating_values) / len(rating_values), 1)
        rating_counts = Counter(rating_values)
    else:
        avg_rating = None
        rating_counts = Counter()
    
    return jsonify({
        'recipe_id': recipe_id,
        'recipe_title': recipe.title,
        'average_rating': avg_rating,
        'total_ratings': len(history_entries),
        'rating_distribution': {
            '5': rating_counts.get(5, 0),
            '4': rating_counts.get(4, 0),
            '3': rating_counts.get(3, 0),
            '2': rating_counts.get(2, 0),
            '1': rating_counts.get(1, 0)
        },
        'ratings': ratings_list
    }), 200


@api_bp.route('/recipes/<int:recipe_id>/nutrition', methods=['GET'])
@login_required
def get_recipe_nutrition(recipe_id):
    """Get aggregated per-serving nutrition for a recipe."""
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404

    ingredients_data = [ing.to_dict() for ing in recipe.ingredients]
    nutrition = calculate_recipe_nutrition(ingredients_data, recipe.servings)
    return jsonify({
        'recipe_id': recipe_id,
        'servings': recipe.servings,
        'per_serving': nutrition
    }), 200


# ==================== RECIPE REVIEWS ====================

@api_bp.route('/recipes/<int:recipe_id>/reviews', methods=['GET'])
@login_required
def get_recipe_reviews(recipe_id):
    """Get all reviews for a recipe + aggregate stats + current user's review."""
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404

    reviews = RecipeReview.query.filter_by(recipe_id=recipe_id)\
        .order_by(RecipeReview.created_at.desc()).all()

    my_review = None
    review_list = []
    rating_values = []

    for r in reviews:
        d = r.to_dict()
        review_list.append(d)
        rating_values.append(r.rating)
        if r.user_id == current_user.id:
            my_review = d

    avg_rating = round(sum(rating_values) / len(rating_values), 1) if rating_values else None
    rating_counts = Counter(rating_values)

    return jsonify({
        'recipe_id': recipe_id,
        'average_rating': avg_rating,
        'review_count': len(review_list),
        'rating_distribution': {
            '5': rating_counts.get(5, 0),
            '4': rating_counts.get(4, 0),
            '3': rating_counts.get(3, 0),
            '2': rating_counts.get(2, 0),
            '1': rating_counts.get(1, 0),
        },
        'my_review': my_review,
        'reviews': review_list,
    }), 200


@api_bp.route('/recipes/<int:recipe_id>/reviews', methods=['POST'])
@login_required
def create_or_update_review(recipe_id):
    """Create or update (upsert) a review for a recipe."""
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404

    data = request.get_json() or {}
    rating = data.get('rating')

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify({'error': 'Rating (1-5) is required'}), 400

    if rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400

    review_text = (data.get('review_text') or '').strip() or None

    existing = RecipeReview.query.filter_by(
        user_id=current_user.id, recipe_id=recipe_id
    ).first()

    if existing:
        existing.rating = rating
        existing.review_text = review_text
        existing.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(existing.to_dict()), 200
    else:
        review = RecipeReview(
            user_id=current_user.id,
            recipe_id=recipe_id,
            rating=rating,
            review_text=review_text,
        )
        db.session.add(review)
        db.session.commit()
        return jsonify(review.to_dict()), 201


@api_bp.route('/recipes/<int:recipe_id>/reviews/<int:review_id>', methods=['DELETE'])
@login_required
def delete_review(recipe_id, review_id):
    """Delete own review."""
    review = RecipeReview.query.filter_by(
        id=review_id, recipe_id=recipe_id, user_id=current_user.id
    ).first()
    if not review:
        return jsonify({'error': 'Review not found'}), 404

    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Review deleted'}), 200


@api_bp.route('/admin/broadcast', methods=['POST'])
@login_required
def admin_broadcast():
    """Send a maintenance broadcast email to all users. Restricted to admin."""
    admin_email = current_app.config.get('ADMIN_EMAIL')
    if not admin_email or current_user.email != admin_email:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json() or {}
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    if not subject or not message:
        return jsonify({'error': 'Subject and message are required'}), 400

    try:
        from app.email_service import send_maintenance_broadcast
        users = User.query.all()
        send_maintenance_broadcast(subject, message, users)
        return jsonify({'message': f'Broadcast sent to {len(users)} users'}), 200
    except Exception as e:
        return jsonify({'error': f'Broadcast failed: {str(e)}'}), 500


@api_bp.route('/test-email', methods=['POST'])
@login_required
def test_email():
    """Send a test email to the current user to verify email delivery."""
    try:
        from app.email_service import send_test_email
        send_test_email(current_user)
        return jsonify({'message': f'Test email sent to {current_user.email}'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to send test email: {str(e)}'}), 500


# ==================== ADMIN ====================

def admin_required(f):
    """Decorator: requires current user to have is_admin=True."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

@api_bp.route('/admin/users', methods=['GET'])
@login_required
@admin_required
def admin_list_users():
    """List all users with stats."""
    users = User.query.order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        result.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'is_admin': u.is_admin,
            'created_at': u.created_at.isoformat() if u.created_at else None,
            'recipe_count': Recipe.query.filter_by(user_id=u.id).count(),
            'pantry_count': PantryItem.query.filter_by(user_id=u.id).count(),
        })
    return jsonify(result), 200

@api_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def admin_delete_user(user_id):
    """Delete any user account (admin only). Cannot delete yourself."""
    if user_id == current_user.id:
        return jsonify({'error': 'You cannot delete your own account from the admin panel. Use Settings instead.'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        FriendRequest.query.filter(
            (FriendRequest.sender_id == user_id) | (FriendRequest.receiver_id == user_id)
        ).delete(synchronize_session=False)
        Friendship.query.filter(
            (Friendship.user_id == user_id) | (Friendship.friend_id == user_id)
        ).delete(synchronize_session=False)
        RecipeReview.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': f'User {user.username} deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500

@api_bp.route('/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
@login_required
@admin_required
def admin_toggle_admin(user_id):
    """Promote or demote a user's admin status."""
    if user_id == current_user.id:
        return jsonify({'error': 'You cannot change your own admin status'}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.is_admin = not user.is_admin
    db.session.commit()
    return jsonify({'message': f'{user.username} is now {"an admin" if user.is_admin else "a regular user"}', 'is_admin': user.is_admin}), 200
