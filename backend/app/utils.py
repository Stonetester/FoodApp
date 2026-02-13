import os
import qrcode
import io
import base64
import requests
import json
import re
from bs4 import BeautifulSoup

def parse_nutrition_value(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        match = re.search(r'[\d.]+', value)
        if match:
            try:
                return float(match.group(0))
            except ValueError:
                return None
    return None


def strip_trailing_price_annotation(text):
    """Remove trailing per-ingredient cost snippets like "($0.20)" from ingredient text."""
    if not isinstance(text, str):
        return text
    return re.sub(r'\s*\(\s*\$\s*\d+(?:\.\d{1,2})?\s*\)\s*$', '', text).strip()

def generate_qr_code(data):
    """Generate QR code image from data string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 string
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return img_str

def lookup_barcode(barcode):
    """Lookup product information from barcode using OpenFoodFacts API"""
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('status') == 1 and data.get('product'):
                product = data['product']
                
                # Extract relevant information
                result = {
                    'name': product.get('product_name', '') or product.get('product_name_en', '') or 'Unknown Product',
                    'brand': product.get('brands', ''),
                    'quantity': product.get('quantity', ''),
                    'nutritional_info': {},
                    'serving_size': None,
                    'servings_per_container': None,
                    'container_type': None,
                    'categories_tags': product.get('categories_tags', []),
                }

                # Extract nutritional information (full FDA label fields)
                if 'nutriments' in product:
                    nutriments = product['nutriments']
                    result['nutritional_info'] = {
                        'energy_kcal': nutriments.get('energy-kcal_100g'),
                        'fat': nutriments.get('fat_100g'),
                        'saturated_fat': nutriments.get('saturated-fat_100g'),
                        'trans_fat': nutriments.get('trans-fat_100g'),
                        'cholesterol': nutriments.get('cholesterol_100g'),
                        'sodium': nutriments.get('sodium_100g'),
                        'carbohydrates': nutriments.get('carbohydrates_100g'),
                        'fiber': nutriments.get('fiber_100g'),
                        'sugars': nutriments.get('sugars_100g'),
                        'added_sugars': nutriments.get('added-sugars_100g'),
                        'proteins': nutriments.get('proteins_100g'),
                        'vitamin_d': nutriments.get('vitamin-d_100g'),
                        'calcium': nutriments.get('calcium_100g'),
                        'iron': nutriments.get('iron_100g'),
                        'potassium': nutriments.get('potassium_100g'),
                        'salt': nutriments.get('salt_100g'),
                    }

                    # Also extract per-serving values when available
                    per_serving = {
                        'energy_kcal': nutriments.get('energy-kcal_serving'),
                        'fat': nutriments.get('fat_serving'),
                        'saturated_fat': nutriments.get('saturated-fat_serving'),
                        'trans_fat': nutriments.get('trans-fat_serving'),
                        'cholesterol': nutriments.get('cholesterol_serving'),
                        'sodium': nutriments.get('sodium_serving'),
                        'carbohydrates': nutriments.get('carbohydrates_serving'),
                        'fiber': nutriments.get('fiber_serving'),
                        'sugars': nutriments.get('sugars_serving'),
                        'added_sugars': nutriments.get('added-sugars_serving'),
                        'proteins': nutriments.get('proteins_serving'),
                        'vitamin_d': nutriments.get('vitamin-d_serving'),
                        'calcium': nutriments.get('calcium_serving'),
                        'iron': nutriments.get('iron_serving'),
                        'potassium': nutriments.get('potassium_serving'),
                        'salt': nutriments.get('salt_serving'),
                    }
                    # Only include if at least one per-serving value exists
                    if any(v is not None for v in per_serving.values()):
                        result['nutritional_info_per_serving'] = per_serving

                # Extract serving size
                serving_qty = product.get('serving_quantity')
                serving_unit = product.get('serving_size', '')
                if serving_unit:
                    result['serving_size'] = serving_unit
                elif serving_qty:
                    result['serving_size'] = f"{serving_qty} g"

                # Compute servings per container
                product_qty = product.get('product_quantity')
                if product_qty and serving_qty:
                    try:
                        result['servings_per_container'] = round(float(product_qty) / float(serving_qty), 1)
                    except (ValueError, ZeroDivisionError):
                        pass

                # Infer container type
                result['container_type'] = _infer_container_type(product)

                # Extract allergens and dietary info
                if 'allergens_tags' in product:
                    result['allergens'] = product['allergens_tags']
                
                if 'labels_tags' in product:
                    result['labels'] = product['labels_tags']
                
                return result
        
        return None
    except Exception as e:
        print(f"Error looking up barcode: {e}")
        return None

def _parse_ingredient_string(text):
    """Parse an ingredient string like '2 cups all-purpose flour' into quantity, unit, name."""
    if not text:
        return None, None, text

    text = strip_trailing_price_annotation(text.strip())

    # Common units (order matters – longer first to avoid partial matches)
    # Abbreviations may have trailing periods (tsp., tbsp., oz., lb., etc.)
    units = (
        'tablespoons?|tbsps?\\.?|teaspoons?|tsps?\\.?|cups?|ounces?|oz\\.?|pounds?|lbs?\\.?|'
        'grams?|g\\.?|kilograms?|kg\\.?|milliliters?|ml\\.?|liters?|l\\.?|'
        'pinch(?:es)?|dash(?:es)?|cloves?|cans?|packages?|pkgs?\\.?|packets?|pkts?\\.?|bags?|sticks?|'
        'slices?|pieces?|pcs?\\.?|heads?|bunches?|handfuls?|sprigs?|stalks?|'
        'quarts?|qts?\\.?|pints?|pts?\\.?|gallons?|gal\\.?|'
        'fl\\.?\\s*oz\\.?|'
        'whole|large|medium|small'
    )

    # Pattern: optional quantity (number, fraction, range) then optional unit then name
    pattern = re.compile(
        r'^'
        r'(?P<qty>'
        r'(?:\d+\s+)?\d+/\d+'   # fraction like "1 1/2"
        r'|\d+\.?\d*'            # decimal or int
        r'|\u00bd|\u2153|\u2154|\u00bc|\u00be'  # unicode fractions
        r')'
        r'(?:\s*[-–]\s*'        # optional range like "2-3"
        r'(?:\d+\.?\d*)'
        r')?'
        r'\s*'
        r'(?P<unit>' + units + r')?'
        r'(?:\s+of\s+|\s+)'     # "of" or space before name
        r'(?P<name>.+)$',
        re.IGNORECASE
    )

    m = pattern.match(text)
    if m:
        qty_str = m.group('qty')
        unit = m.group('unit')
        name = m.group('name').strip().strip(',').strip()

        # Convert quantity string to float
        quantity = _parse_quantity(qty_str)

        # Normalize unit
        if unit:
            # Strip trailing periods from abbreviations (tsp., tbsp., oz., etc.)
            unit = unit.lower().rstrip('.')
            # Handle "fl. oz." -> "fl oz"
            unit = unit.replace('.', '')
            unit = re.sub(r'\s+', ' ', unit).strip()
            unit = unit.rstrip('s') if unit not in ('oz', 'lbs', 'g', 'kg', 'ml', 'l', 'fl oz') else unit
            # Normalize common abbreviations
            unit_map = {
                'tbsp': 'tbsp', 'tablespoon': 'tbsp',
                'tsp': 'tsp', 'teaspoon': 'tsp',
                'cup': 'cup',
                'ounce': 'oz', 'oz': 'oz',
                'pound': 'lb', 'lb': 'lb', 'lbs': 'lb',
                'gram': 'g', 'g': 'g',
                'kilogram': 'kg', 'kg': 'kg',
                'milliliter': 'ml', 'ml': 'ml',
                'liter': 'l', 'l': 'l',
                'quart': 'qt', 'qt': 'qt',
                'pint': 'pt', 'pt': 'pt',
                'gallon': 'gal', 'gal': 'gal',
                'fl oz': 'fl oz',
                'package': 'pkg', 'pkg': 'pkg',
                'packet': 'pkt', 'pkt': 'pkt',
                'piece': 'pc', 'pc': 'pc',
            }
            unit = unit_map.get(unit, unit)

        return quantity, unit, name

    return None, None, text


def _parse_quantity(qty_str):
    """Parse a quantity string like '1 1/2' or '0.5' to a float."""
    if not qty_str:
        return None

    # Unicode fractions
    unicode_fracs = {'\u00bd': 0.5, '\u2153': 0.333, '\u2154': 0.667, '\u00bc': 0.25, '\u00be': 0.75}
    if qty_str in unicode_fracs:
        return unicode_fracs[qty_str]

    # Mixed fraction like "1 1/2"
    mixed = re.match(r'^(\d+)\s+(\d+)/(\d+)$', qty_str)
    if mixed:
        whole = int(mixed.group(1))
        num = int(mixed.group(2))
        den = int(mixed.group(3))
        return round(whole + num / den, 3) if den else float(whole)

    # Simple fraction like "1/2"
    frac = re.match(r'^(\d+)/(\d+)$', qty_str)
    if frac:
        num = int(frac.group(1))
        den = int(frac.group(2))
        return round(num / den, 3) if den else None

    try:
        return float(qty_str)
    except ValueError:
        return None


def _detect_dietary_tags(recipe_data, ingredients_text):
    """Detect dietary/allergy tags from structured data and ingredient list."""
    tags = set()

    # Check structured data keywords field
    for field in ('keywords', 'recipeCuisine', 'recipeCategory', 'suitableForDiet'):
        val = recipe_data.get(field)
        if not val:
            continue
        if isinstance(val, str):
            val = [val]
        if isinstance(val, list):
            text = ' '.join(str(v) for v in val).lower()
            if 'gluten' in text and 'free' in text:
                tags.add('gluten-free')
            if 'vegan' in text:
                tags.add('vegan')
            if 'vegetarian' in text:
                tags.add('vegetarian')
            if 'dairy' in text and 'free' in text:
                tags.add('dairy-free')
            if 'nut' in text and 'free' in text:
                tags.add('nut-free')

    # Schema.org diet enums
    diet_val = recipe_data.get('suitableForDiet')
    if diet_val:
        diet_str = str(diet_val).lower() if isinstance(diet_val, str) else ' '.join(str(v) for v in diet_val).lower()
        if 'glutenfree' in diet_str:
            tags.add('gluten-free')
        if 'vegan' in diet_str:
            tags.add('vegan')
        if 'vegetarian' in diet_str:
            tags.add('vegetarian')
        if 'dairyfree' in diet_str or 'lactosefree' in diet_str:
            tags.add('dairy-free')

    # Ingredient-based heuristic detection
    if ingredients_text:
        text_lower = ingredients_text.lower()
        # Meat/fish/poultry indicators
        meat_keywords = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage',
                         'ham', 'steak', 'ground meat', 'fish', 'salmon', 'tuna', 'shrimp',
                         'crab', 'lobster', 'anchov', 'sardine', 'prosciutto', 'pancetta']
        dairy_keywords = ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'whey',
                          'ghee', 'sour cream', 'half-and-half', 'half and half',
                          'heavy cream', 'whipping cream', 'parmesan', 'mozzarella',
                          'cheddar', 'ricotta', 'mascarpone', 'brie', 'gruyere']
        egg_keywords = ['egg', 'eggs', 'egg white', 'egg yolk']
        gluten_keywords = ['flour', 'bread', 'pasta', 'noodle', 'wheat', 'barley',
                           'rye', 'couscous', 'orzo', 'breadcrumb', 'crouton',
                           'tortilla', 'pita', 'soy sauce']
        nut_keywords = ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut',
                        'macadamia', 'peanut', 'pine nut', 'chestnut', 'nut butter',
                        'almond milk', 'almond flour']

        has_meat = any(kw in text_lower for kw in meat_keywords)
        has_dairy = any(kw in text_lower for kw in dairy_keywords)
        has_eggs = any(kw in text_lower for kw in egg_keywords)
        has_gluten = any(kw in text_lower for kw in gluten_keywords)
        has_nuts = any(kw in text_lower for kw in nut_keywords)

        if not has_meat and not has_dairy and not has_eggs:
            tags.add('vegan')
        if not has_meat:
            tags.add('vegetarian')
        if not has_dairy:
            tags.add('dairy-free')
        if not has_gluten:
            tags.add('gluten-free')
        if not has_nuts:
            tags.add('nut-free')

    return list(tags)


def _extract_nutrition_from_html(soup):
    """Try to extract nutrition data from HTML elements when JSON-LD has no nutrition."""
    nutrition = {}

    # Look for common nutrition label patterns in HTML
    for selector in [
        '[class*="nutrition"]', '[class*="recipe-nutrition"]',
        '[itemprop="nutrition"]', '.nutrition-info', '.recipe-nutrition',
        '#nutrition', '.wprm-nutrition-container'
    ]:
        container = soup.select_one(selector)
        if not container:
            continue
        text = container.get_text(' ', strip=True).lower()
        if len(text) < 10:
            continue

        def _find_value(pattern, txt):
            m = re.search(pattern, txt, re.IGNORECASE)
            if m:
                try:
                    return float(m.group(1))
                except (ValueError, TypeError):
                    return None
            return None

        nutrition['energy_kcal'] = _find_value(r'calories[:\s]*(\d+\.?\d*)', text)
        nutrition['fat'] = _find_value(r'(?:total\s*)?fat[:\s]*(\d+\.?\d*)\s*g', text)
        nutrition['saturated_fat'] = _find_value(r'saturated\s*fat[:\s]*(\d+\.?\d*)\s*g', text)
        nutrition['carbohydrates'] = _find_value(r'(?:total\s*)?carb(?:ohydrate)?s?[:\s]*(\d+\.?\d*)\s*g', text)
        nutrition['proteins'] = _find_value(r'protein[s]?[:\s]*(\d+\.?\d*)\s*g', text)
        nutrition['fiber'] = _find_value(r'fiber[:\s]*(\d+\.?\d*)\s*g', text)
        nutrition['sugars'] = _find_value(r'(?<!added\s)sugar[s]?[:\s]*(\d+\.?\d*)\s*g', text)
        nutrition['sodium'] = _find_value(r'sodium[:\s]*(\d+\.?\d*)\s*m?g', text)
        nutrition['cholesterol'] = _find_value(r'cholesterol[:\s]*(\d+\.?\d*)\s*m?g', text)

        # If we found at least calories, consider it a success
        if nutrition.get('energy_kcal') is not None:
            break

    # Only return if we found at least one value
    if any(v is not None for v in nutrition.values()):
        return nutrition
    return None


def _estimate_nutrition_from_ingredients(ingredients):
    """Estimate nutrition from parsed ingredients using Open Food Facts API."""
    from app.nutrition import lookup_ingredient_nutrition
    totals = {}
    keys = ['energy_kcal', 'fat', 'saturated_fat', 'trans_fat', 'cholesterol', 'sodium',
            'carbohydrates', 'fiber', 'sugars', 'added_sugars', 'proteins',
            'vitamin_d', 'calcium', 'iron', 'potassium']
    found = False

    for ing in (ingredients or []):
        name = ing.get('ingredient_name', '')
        if not name or name == '__nutrition__':
            continue
        try:
            nutrition = lookup_ingredient_nutrition(name)
        except Exception:
            nutrition = None
        if nutrition:
            found = True
            for k in keys:
                val = nutrition.get(k)
                if val is not None:
                    totals[k] = totals.get(k, 0) + val

    if not found:
        return None

    # Round values
    for k in keys:
        if k in totals:
            totals[k] = round(totals[k], 1)

    return totals


def extract_recipe_from_url(url):
    """Extract recipe information from a URL with deep parsing."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        # Check if response is HTML
        if not response.headers.get('content-type', '').startswith('text/html'):
            return None

        # Keep a copy of the full soup (before decomposing) for nutrition HTML search
        full_soup = BeautifulSoup(response.content, 'html.parser')
        soup = BeautifulSoup(response.content, 'html.parser')

        # Remove script and style elements to avoid parsing them
        for script in soup(["script", "style", "noscript"]):
            script.decompose()

        recipe_data = {}
        found_structured_data = False

        # Priority 1: Look for JSON-LD structured data (most reliable)
        json_scripts = full_soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                script_text = script.string
                if not script_text:
                    continue

                script_text = script_text.strip()
                if not script_text:
                    continue

                data = json.loads(script_text)

                # Handle both dict and list formats
                if isinstance(data, dict):
                    # Handle @type as list: e.g. ["Recipe"]
                    dtype = data.get('@type', '')
                    if isinstance(dtype, list):
                        dtype = ' '.join(dtype)
                    if 'Recipe' in str(dtype) or '@graph' in data:
                        if 'Recipe' in str(dtype):
                            recipe_data = data
                            found_structured_data = True
                            break
                        elif '@graph' in data:
                            for item in data.get('@graph', []):
                                if isinstance(item, dict):
                                    itype = item.get('@type', '')
                                    if isinstance(itype, list):
                                        itype = ' '.join(itype)
                                    if 'Recipe' in str(itype):
                                        recipe_data = item
                                        found_structured_data = True
                                        break
                            if found_structured_data:
                                break
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            itype = item.get('@type', '')
                            if isinstance(itype, list):
                                itype = ' '.join(itype)
                            if 'Recipe' in str(itype):
                                recipe_data = item
                                found_structured_data = True
                                break
                    if found_structured_data:
                        break
            except (json.JSONDecodeError, AttributeError):
                continue

        # If no structured data, try to extract from HTML
        if not found_structured_data:
            title_elem = None
            for selector in [
                'h1[class*="recipe"]', 'h1[class*="title"]',
                '[itemprop="name"]', '[class*="recipe-title"]',
                'h1'
            ]:
                title_elem = soup.select_one(selector)
                if title_elem:
                    title_text = title_elem.get_text().strip()
                    if title_text and len(title_text) < 200:
                        recipe_data['name'] = title_text
                        break

            ingredients = []
            ingredient_elems = soup.find_all(itemprop='recipeIngredient')
            if ingredient_elems:
                for elem in ingredient_elems:
                    text = elem.get_text().strip()
                    if text and len(text) < 200 and text not in ingredients:
                        ingredients.append(text)

            if not ingredients:
                for selector in [
                    '[class*="ingredient"] li',
                    '[class*="ingredient-list"] li',
                    '[class*="recipe-ingredient"]',
                    'ul[class*="ingredient"] li'
                ]:
                    elems = soup.select(selector)
                    for elem in elems[:30]:
                        text = elem.get_text().strip()
                        if (text and 5 < len(text) < 200 and
                            text not in ingredients and
                            not text.lower().startswith('recipe') and
                            not text.lower().startswith('ingredient')):
                            ingredients.append(text)
                    if ingredients:
                        break

            if ingredients:
                recipe_data['recipeIngredient'] = ingredients[:25]

            instructions = []
            instruction_elems = soup.find_all(itemprop='recipeInstructions')
            if instruction_elems:
                for elem in instruction_elems:
                    steps = elem.find_all(['li', 'p', 'div'], recursive=False)
                    if steps:
                        for step in steps:
                            text = step.get_text().strip()
                            if text and len(text) > 10:
                                instructions.append(text)
                    else:
                        text = elem.get_text().strip()
                        if text:
                            instructions.append(text)

            if not instructions:
                for selector in [
                    '[class*="instruction"] li',
                    '[class*="direction"] li',
                    '[class*="step"] li',
                    '[class*="method"] li',
                    'ol[class*="instruction"] li',
                    'ol[class*="direction"] li'
                ]:
                    elems = soup.select(selector)
                    for elem in elems[:50]:
                        text = elem.get_text().strip()
                        if (text and 15 < len(text) < 500 and
                            not re.match(r'^\d+$', text) and
                            len(text.split()) > 3):
                            instructions.append(text)
                    if instructions:
                        break

            if instructions:
                formatted_instructions = []
                for i, instruction in enumerate(instructions, 1):
                    instruction = re.sub(r'^\d+[\.\)]\s*', '', instruction)
                    formatted_instructions.append(f"{i}. {instruction}")
                recipe_data['recipeInstructions'] = '\n'.join(formatted_instructions)

            # Try to find prep/cook times from HTML
            for prop, key in [('prepTime', 'prepTime'), ('cookTime', 'cookTime'), ('totalTime', 'totalTime')]:
                el = soup.find(itemprop=prop)
                if el:
                    dt = el.get('datetime') or el.get('content') or el.get_text().strip()
                    if dt and key not in recipe_data:
                        recipe_data[key] = dt

            # Try to find servings from HTML
            yield_el = soup.find(itemprop='recipeYield')
            if yield_el and 'recipeYield' not in recipe_data:
                recipe_data['recipeYield'] = yield_el.get('content') or yield_el.get_text().strip()

        # Convert to our format
        result = {
            'title': recipe_data.get('name') or recipe_data.get('headline') or 'Imported Recipe',
            'description': recipe_data.get('description') or '',
            'ingredients': [],
            'instructions': '',
            'prep_time': None,
            'cook_time': None,
            'servings': None,
            'source_url': url,
            'image_url': None,
            'tags': [],
        }

        # ---- Extract and parse ingredients with quantity/unit ----
        if 'recipeIngredient' in recipe_data:
            for ing in recipe_data['recipeIngredient']:
                if isinstance(ing, str):
                    cleaned = strip_trailing_price_annotation(ing)
                    quantity, unit, name = _parse_ingredient_string(cleaned)
                    result['ingredients'].append({
                        'ingredient_name': name,
                        'quantity': quantity,
                        'unit': unit
                    })

        # ---- Extract nutrition from JSON-LD ----
        nutrition_data = recipe_data.get('nutrition')
        if isinstance(nutrition_data, dict):
            result['nutrition'] = {
                'energy_kcal': parse_nutrition_value(nutrition_data.get('calories')),
                'fat': parse_nutrition_value(nutrition_data.get('fatContent')),
                'saturated_fat': parse_nutrition_value(nutrition_data.get('saturatedFatContent')),
                'trans_fat': parse_nutrition_value(nutrition_data.get('transFatContent')),
                'cholesterol': parse_nutrition_value(nutrition_data.get('cholesterolContent')),
                'sodium': parse_nutrition_value(nutrition_data.get('sodiumContent')),
                'carbohydrates': parse_nutrition_value(nutrition_data.get('carbohydrateContent')),
                'fiber': parse_nutrition_value(nutrition_data.get('fiberContent')),
                'sugars': parse_nutrition_value(nutrition_data.get('sugarContent')),
                'proteins': parse_nutrition_value(nutrition_data.get('proteinContent')),
            }
            # Add serving size from nutrition block
            serving_size_val = nutrition_data.get('servingSize')
            if serving_size_val and isinstance(serving_size_val, str):
                result['nutrition']['serving_size'] = serving_size_val.strip()
                result['serving_size'] = serving_size_val.strip()
            # Only keep if at least one value is present
            if not any(v is not None for v in result['nutrition'].values()):
                result['nutrition'] = None

        # ---- Fallback: extract nutrition from HTML elements ----
        if not result.get('nutrition'):
            html_nutrition = _extract_nutrition_from_html(full_soup)
            if html_nutrition:
                result['nutrition'] = html_nutrition

        # ---- Fallback: estimate nutrition from parsed ingredients ----
        if not result.get('nutrition') and result['ingredients']:
            estimated = _estimate_nutrition_from_ingredients(result['ingredients'])
            if estimated:
                # Divide by servings if available
                servings_count = 1
                if 'recipeYield' in recipe_data:
                    try:
                        yield_val = recipe_data['recipeYield']
                        if isinstance(yield_val, (int, float)):
                            servings_count = max(int(yield_val), 1)
                        elif isinstance(yield_val, str):
                            numbers = re.findall(r'\d+', yield_val)
                            if numbers:
                                servings_count = max(int(numbers[0]), 1)
                    except Exception:
                        pass
                for k in estimated:
                    if estimated[k] is not None:
                        estimated[k] = round(estimated[k] / servings_count, 1)
                result['nutrition'] = estimated
                result['_nutrition_estimated'] = True

        # Extract instructions
        if 'recipeInstructions' in recipe_data:
            if isinstance(recipe_data['recipeInstructions'], list):
                parts = []
                for step in recipe_data['recipeInstructions']:
                    if isinstance(step, dict):
                        parts.append(step.get('text', ''))
                    elif isinstance(step, str):
                        parts.append(step)
                result['instructions'] = '\n'.join(parts)
            else:
                result['instructions'] = str(recipe_data['recipeInstructions'])

        # Extract times
        prep_time = None
        cook_time = None

        for field in ['prepTime', 'prepTimeInSeconds', 'prep', 'preparationTime']:
            if field in recipe_data:
                val = recipe_data[field]
                if isinstance(val, (int, float)):
                    prep_time = int(val) // 60 if val > 300 else int(val)  # Handle seconds
                else:
                    prep_time = parse_iso_duration(val)
                if prep_time:
                    break

        for field in ['cookTime', 'cookTimeInSeconds', 'cook', 'cookingTime']:
            if field in recipe_data:
                val = recipe_data[field]
                if isinstance(val, (int, float)):
                    cook_time = int(val) // 60 if val > 300 else int(val)
                else:
                    cook_time = parse_iso_duration(val)
                if cook_time:
                    break

        # If no cook time, try totalTime minus prepTime
        if not cook_time and 'totalTime' in recipe_data:
            total = parse_iso_duration(recipe_data['totalTime'])
            if total and prep_time:
                cook_time = max(total - prep_time, 0) or None
            elif total:
                cook_time = total

        result['prep_time'] = prep_time
        result['cook_time'] = cook_time

        # Extract servings
        if 'recipeYield' in recipe_data:
            try:
                yield_val = recipe_data['recipeYield']
                if isinstance(yield_val, list):
                    yield_val = yield_val[0] if yield_val else None
                if isinstance(yield_val, (int, float)):
                    result['servings'] = int(yield_val)
                elif isinstance(yield_val, str):
                    numbers = re.findall(r'\d+', yield_val)
                    if numbers:
                        result['servings'] = int(numbers[0])
            except Exception:
                pass

        # Extract description
        description = None
        for field in ['description', 'about', 'summary']:
            if field in recipe_data:
                desc_text = recipe_data[field]
                if isinstance(desc_text, str):
                    desc_text = desc_text.strip()
                    if (desc_text and 10 < len(desc_text) < 500 and
                        not desc_text.startswith('<') and
                        not desc_text.lower().startswith('ingredient') and
                        not desc_text.lower().startswith('instruction')):
                        description = desc_text
                        break

        result['description'] = description

        # Extract image
        image = recipe_data.get('image')
        if image:
            if isinstance(image, str):
                result['image_url'] = image
            elif isinstance(image, list) and image:
                result['image_url'] = image[0] if isinstance(image[0], str) else (image[0].get('url') if isinstance(image[0], dict) else None)
            elif isinstance(image, dict):
                result['image_url'] = image.get('url')

        # Clean up instructions
        if result['instructions']:
            result['instructions'] = re.sub(r'<[^>]+>', '', result['instructions'])
            result['instructions'] = re.sub(r'\n\s*\n', '\n', result['instructions'])
            result['instructions'] = result['instructions'].strip()

        # ---- Detect dietary / allergy tags ----
        all_ingredient_text = ' '.join(
            ing.get('ingredient_name', '') for ing in result['ingredients']
        )
        result['tags'] = _detect_dietary_tags(recipe_data, all_ingredient_text)

        return result

    except Exception as e:
        print(f"Error extracting recipe from URL: {e}")
        import traceback
        traceback.print_exc()
        return None

def parse_iso_duration(duration_str):
    """Parse ISO 8601 duration (PT30M, P0DT1H30M, etc.) to minutes"""
    try:
        if not duration_str:
            return None

        duration_str = str(duration_str).strip()

        # Handle plain number (already in minutes)
        if duration_str.isdigit():
            val = int(duration_str)
            return val if val > 0 else None

        # Must start with P (ISO 8601)
        if not duration_str.startswith('P'):
            # Try to parse plain text like "30 minutes" or "1 hour"
            m = re.search(r'(\d+)\s*(?:hour|hr)', duration_str, re.I)
            mins = 0
            if m:
                mins += int(m.group(1)) * 60
            m2 = re.search(r'(\d+)\s*(?:min|minute)', duration_str, re.I)
            if m2:
                mins += int(m2.group(1))
            return mins if mins > 0 else None

        minutes = 0
        # Extract days
        days_match = re.search(r'(\d+)D', duration_str)
        if days_match:
            minutes += int(days_match.group(1)) * 24 * 60

        # Extract hours
        hours_match = re.search(r'(\d+)H', duration_str)
        if hours_match:
            minutes += int(hours_match.group(1)) * 60

        # Extract minutes
        mins_match = re.search(r'(\d+)M', duration_str)
        if mins_match:
            minutes += int(mins_match.group(1))

        # Extract seconds (round up to a minute if present)
        secs_match = re.search(r'(\d+)S', duration_str)
        if secs_match:
            secs = int(secs_match.group(1))
            if secs >= 30:
                minutes += 1

        return minutes if minutes > 0 else None
    except Exception:
        return None

def extract_text_from_image(image_data):
    """Extract text from image using OCR (requires Tesseract)"""
    try:
        # Import PIL and pytesseract
        from PIL import Image
        import pytesseract
        import os
        
        # Set Tesseract command path from environment variable if available
        tesseract_cmd = os.environ.get('TESSERACT_CMD')
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        
        # Decode base64 image
        if ',' in image_data:
            # Remove data URL prefix if present
            image_data = image_data.split(',')[1]
        
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            return {
                'title': 'Recipe from Image',
                'description': None,
                'ingredients': [],
                'instructions': None,
                'prep_time': None,
                'cook_time': None,
                'servings': None,
                '_error': f'Invalid image data: {str(e)}'
            }
        
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if necessary (for PNG with transparency)
            if image.mode != 'RGB':
                image = image.convert('RGB')
        except Exception as e:
            return {
                'title': 'Recipe from Image',
                'description': None,
                'ingredients': [],
                'instructions': None,
                'prep_time': None,
                'cook_time': None,
                'servings': None,
                '_error': f'Could not open image: {str(e)}'
            }
        
        # Perform OCR with better configuration
        try:
            # Try multiple PSM modes for better results
            psm_modes = [
                (6, 'Assume uniform block of text'),
                (11, 'Sparse text'),
                (12, 'Sparse text with OSD'),
                (3, 'Fully automatic page segmentation')
            ]
            
            text = None
            for psm, desc in psm_modes:
                try:
                    custom_config = f'--oem 3 --psm {psm}'
                    text = pytesseract.image_to_string(image, config=custom_config)
                    if text and len(text.strip()) >= 20:  # At least 20 characters
                        print(f"OCR successful with PSM {psm}")
                        break
                except Exception as e:
                    print(f"OCR failed with PSM {psm}: {e}")
                    continue
            
            if not text or len(text.strip()) < 10:
                raise Exception("Could not extract sufficient text from image. Image may be too blurry or text too small.")
            
            # Try to parse recipe from text
            print(f"Extracted text length: {len(text)} characters")
            print(f"Extracted text preview (first 500 chars): {text[:500]}")
            recipe_data = parse_recipe_from_text(text)
            print(f"Parsed recipe data:")
            print(f"  Title: {recipe_data.get('title')}")
            print(f"  Description: {recipe_data.get('description')}")
            print(f"  Ingredients count: {len(recipe_data.get('ingredients', []))}")
            print(f"  Instructions length: {len(recipe_data.get('instructions', ''))}")
            print(f"  Prep time: {recipe_data.get('prep_time')}")
            print(f"  Cook time: {recipe_data.get('cook_time')}")
            print(f"  Servings: {recipe_data.get('servings')}")
            
            if not recipe_data.get('ingredients') and not recipe_data.get('instructions'):
                print("WARNING: No ingredients or instructions found in parsed data")
                recipe_data['_error'] = 'Could not identify recipe structure in extracted text. Please review and edit manually.'
            else:
                print("SUCCESS: Recipe structure identified")
            return recipe_data
            
        except ImportError:
            # pytesseract not installed
            return {
                'title': 'Recipe from Image',
                'description': None,
                'ingredients': [],
                'instructions': None,
                'prep_time': None,
                'cook_time': None,
                'servings': None,
                '_error': 'OCR requires pytesseract. Install with: pip install pytesseract. Also install Tesseract OCR on your system.'
            }
        except Exception as ocr_error:
            print(f"OCR error: {ocr_error}")
            error_msg = str(ocr_error)
            if 'tesseract' in error_msg.lower() or 'not found' in error_msg.lower():
                error_msg = 'Tesseract OCR not found. Please install Tesseract OCR on your system.'
            return {
                'title': 'Recipe from Image',
                'description': None,
                'ingredients': [],
                'instructions': None,
                'prep_time': None,
                'cook_time': None,
                'servings': None,
                '_error': f'OCR failed: {error_msg}'
            }
    except Exception as e:
        print(f"Error extracting text from image: {e}")
        import traceback
        traceback.print_exc()
        return {
            'title': 'Recipe from Image',
            'description': None,
            'ingredients': [],
            'instructions': None,
            'prep_time': None,
            'cook_time': None,
            'servings': None,
            '_error': f'Error processing image: {str(e)}'
        }


def parse_recipe_from_text(text):
    """Parse recipe information from extracted text - IMPROVED VERSION"""
    lines = text.split('\n')
    
    result = {
        'title': 'Recipe from Image',
        'description': '',
        'ingredients': [],
        'instructions': '',
        'prep_time': None,
        'cook_time': None,
        'servings': None
    }
    
    # Clean up lines - remove empty lines and excessive whitespace
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        # Skip very short lines that are likely OCR noise
        if line and len(line) >= 2:
            # Remove common OCR artifacts
            line = re.sub(r'[|}{><]', '', line)  # Remove stray symbols
            cleaned_lines.append(line)
    
    if not cleaned_lines:
        return result
    
    # === STEP 1: Extract Title ===
    for line in cleaned_lines[:10]:
        if len(line) < 100 and len(line) > 3:
            # Skip common OCR artifacts and section headers
            if not re.search(r'^(ingredient|instruction|direction|method|step|prep|cook|serving|time|yield|makes)', line, re.I):
                # Skip lines that look like measurements
                if not re.search(r'\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l)', line, re.I):
                    result['title'] = line
                    break
    
    # === STEP 2: Extract metadata (times, servings) ===
    full_text = ' '.join(cleaned_lines).lower()
    
    # Prep time
    prep_match = re.search(r'prep(?:\s*time)?[:\s]*(\d+)\s*(?:min|minute|m(?!l)|hour|hr|h(?!g))', full_text, re.I)
    if prep_match:
        time_val = int(prep_match.group(1))
        if 'hour' in prep_match.group(0).lower() or 'hr' in prep_match.group(0).lower():
            time_val *= 60
        result['prep_time'] = time_val
    
    # Cook time
    cook_match = re.search(r'cook(?:\s*time)?[:\s]*(\d+)\s*(?:min|minute|m(?!l)|hour|hr|h(?!g))', full_text, re.I)
    if not cook_match:
        cook_match = re.search(r'total(?:\s*time)?[:\s]*(\d+)\s*(?:min|minute|m(?!l)|hour|hr|h(?!g))', full_text, re.I)
    if cook_match:
        time_val = int(cook_match.group(1))
        if 'hour' in cook_match.group(0).lower() or 'hr' in cook_match.group(0).lower():
            time_val *= 60
        result['cook_time'] = time_val
    
    # Servings
    servings_patterns = [
        r'(?:serves?|servings?|yield)[:\s]*(\d+)',
        r'(\d+)\s*(?:serves?|servings?)',
        r'makes?[:\s]*(\d+)'
    ]
    for pattern in servings_patterns:
        servings_match = re.search(pattern, full_text, re.I)
        if servings_match:
            result['servings'] = int(servings_match.group(1))
            break
    
    # === STEP 3: Identify section boundaries ===
    ingredient_section_start = None
    instruction_section_start = None
    
    # Look for explicit section headers
    for i, line in enumerate(cleaned_lines):
        line_lower = line.lower().strip()
        
        # Ingredient header patterns
        if re.match(r'^ingredients?:?$', line_lower) or re.match(r'^what you need:?$', line_lower):
            ingredient_section_start = i + 1  # Start after header
            
        # Instruction header patterns
        elif re.match(r'^(?:instructions?|directions?|method|steps?|how to make|preparation):?$', line_lower):
            instruction_section_start = i + 1  # Start after header
            # If we found instructions, ingredients section ends here
            if ingredient_section_start is not None and instruction_section_start is None:
                pass
    
    # === STEP 4: Parse ingredients ===
    ingredient_lines = []
    
    if ingredient_section_start is not None:
        # We found an ingredients header
        for i in range(ingredient_section_start, len(cleaned_lines)):
            line = cleaned_lines[i]
            line_lower = line.lower().strip()
            
            # Stop at instruction header
            if re.match(r'^(?:instructions?|directions?|method|steps?|how to make|preparation):?$', line_lower):
                break
            
            # Check if this looks like an ingredient
            if is_ingredient_line(line):
                ingredient_lines.append(line)
    else:
        # No header found - try to identify ingredients by pattern
        for line in cleaned_lines[:50]:  # Check first 50 lines
            if is_ingredient_line(line):
                # Make sure it's not in the instructions section
                if instruction_section_start is None or cleaned_lines.index(line) < instruction_section_start:
                    ingredient_lines.append(line)
    
    # Clean and add ingredients
    for line in ingredient_lines:
        clean_line = clean_ingredient_line(line)
        if clean_line and len(clean_line) > 2 and len(clean_line) < 200:
            result['ingredients'].append({
                'ingredient_name': clean_line,
                'quantity': None,
                'unit': None
            })
    
    # === STEP 5: Parse instructions ===
    instruction_lines = []
    
    if instruction_section_start is not None:
        # We found an instructions header
        for i in range(instruction_section_start, len(cleaned_lines)):
            line = cleaned_lines[i]
            line_lower = line.lower().strip()
            
            # Skip obvious non-instruction lines
            if len(line) < 5:
                continue
            
            # Check if this looks like an instruction
            if is_instruction_line(line):
                instruction_lines.append(line)
    else:
        # No header found - try to identify instructions by pattern
        # Instructions typically:
        # 1. Start with verbs (Heat, Mix, Add, Combine, etc.)
        # 2. Are numbered or bulleted
        # 3. Are longer sentences
        # 4. Come after ingredients
        
        potential_instructions = []
        for i, line in enumerate(cleaned_lines):
            # Skip if we know this is in ingredients section
            if ingredient_section_start is not None and i < ingredient_section_start + len(ingredient_lines):
                continue
            
            if is_instruction_line(line) and not is_ingredient_line(line):
                potential_instructions.append(line)
        
        instruction_lines = potential_instructions
    
    # Format instructions
    if instruction_lines:
        formatted_steps = []
        step_num = 1
        
        for line in instruction_lines:
            clean_line = clean_instruction_line(line)
            if clean_line:
                # Check if already numbered
                if re.match(r'^\d+[\.\)]\s', clean_line):
                    formatted_steps.append(clean_line)
                else:
                    formatted_steps.append(f"{step_num}. {clean_line}")
                    step_num += 1
        
        result['instructions'] = '\n'.join(formatted_steps)
    
    # === STEP 6: Extract description ===
    # Description is text that appears before ingredients/instructions
    description_lines = []
    
    earliest_section = min(
        [x for x in [ingredient_section_start, instruction_section_start] if x is not None],
        default=len(cleaned_lines)
    )
    
    for i in range(min(earliest_section, 20)):  # Check up to 20 lines or first section
        line = cleaned_lines[i]
        line_lower = line.lower()
        
        # Skip title
        if i == 0 or line == result['title']:
            continue
        
        # Skip section headers
        if re.match(r'^(?:ingredients?|instructions?|directions?|method|steps?|prep|cook|serving|time|yield):?$', line_lower):
            continue
        
        # Skip lines that look like ingredients or instructions
        if is_ingredient_line(line) or (i > 3 and is_instruction_line(line)):
            continue
        
        # Skip very short or very long lines
        if len(line) < 20 or len(line) > 300:
            continue
        
        description_lines.append(line)
    
    if description_lines:
        desc_text = ' '.join(description_lines[:3]).strip()
        desc_text = re.sub(r'\s+', ' ', desc_text)
        if 20 < len(desc_text) < 500:
            result['description'] = desc_text
    
    return result


def is_ingredient_line(line):
    """Check if a line looks like an ingredient"""
    line_lower = line.lower()
    
    # Positive indicators
    has_measurement = bool(re.search(
        r'\b\d+[/\.\s]*\d*\s*(?:cup|cups|tbsp\.?|tablespoons?|tsp\.?|teaspoons?|'
        r'oz\.?|ounces?|lb\.?|lbs\.?|pounds?|g\.?|grams?|kg\.?|kilograms?|'
        r'ml\.?|milliliters?|l\.?|liters?|pinch|dash|cloves?|'
        r'qt\.?|quarts?|pt\.?|pints?|gal\.?|gallons?|fl\.?\s*oz\.?|pkg\.?|pkt\.?)\b',
        line_lower
    ))
    
    has_fraction = bool(re.search(r'\d+/\d+', line))
    
    # Common ingredient starters (cleaned of bullets/numbers)
    clean_line = re.sub(r'^[\d\-\•\*\u2022\u2023\u25E6\)\.\s]+', '', line).strip()
    starts_with_amount = bool(re.match(r'^\d', clean_line))
    
    # Negative indicators
    starts_with_verb = bool(re.match(
        r'^(?:add|mix|stir|heat|cook|bake|combine|blend|whisk|fold|pour|place|preheat|'
        r'set|remove|drain|season|serve|garnish|slice|chop|dice|mince|cut|spread|bring)\b',
        clean_line, re.I
    ))
    
    too_long = len(line) > 150
    
    # Decision
    if starts_with_verb and not has_measurement:
        return False  # Likely instruction
    
    if too_long:
        return False
    
    if has_measurement or has_fraction or starts_with_amount:
        return True
    
    # If short and simple, could be ingredient
    if len(clean_line) < 60 and not re.search(r'\b(?:then|until|before|after|when)\b', line_lower):
        # Check if it contains common ingredient words
        if re.search(r'\b(?:flour|sugar|salt|pepper|butter|oil|egg|milk|water|cream|'
                    r'cheese|chicken|beef|pork|fish|onion|garlic|tomato|potato|rice|'
                    r'pasta|bread|vanilla|cinnamon|basil|thyme|oregano)\b', line_lower):
            return True
    
    return False


def is_instruction_line(line):
    """Check if a line looks like an instruction"""
    line_lower = line.lower()
    
    # Remove leading bullets/numbers for analysis
    clean_line = re.sub(r'^[\d\-\•\*\u2022\u2023\u25E6\)\.\s]+', '', line).strip()
    
    # Positive indicators
    starts_with_verb = bool(re.match(
        r'^(?:add|mix|stir|heat|cook|bake|combine|blend|whisk|fold|pour|place|preheat|'
        r'set|remove|drain|season|serve|garnish|slice|chop|dice|mince|cut|spread|bring|'
        r'transfer|reduce|increase|cover|uncover|simmer|boil|fry|sauté|roast|grill|'
        r'brush|toss|sprinkle|drizzle|layer|arrange|refrigerate|freeze|let|allow|wait)\b',
        clean_line, re.I
    ))
    
    has_instruction_words = bool(re.search(
        r'\b(?:until|then|before|after|when|while|for about|approximately|should be|'
        r'degrees?|°|minutes?|hours?)\b',
        line_lower
    ))
    
    is_long_sentence = len(clean_line) > 40 and ',' in clean_line
    
    # Negative indicators
    has_measurement_only = bool(re.match(r'^\d+[/\.\s]*\d*\s*(?:cup|tbsp|tsp|oz|lb|g|kg|ml|l)\b', clean_line, re.I))
    
    # Decision
    if has_measurement_only:
        return False  # Likely ingredient
    
    if starts_with_verb or has_instruction_words or is_long_sentence:
        return True
    
    return False


def clean_ingredient_line(line):
    """Clean up an ingredient line"""
    # Remove bullets, numbers, and extra whitespace
    clean = re.sub(r'^[\d\-\•\*\u2022\u2023\u25E6\)\.\s]+', '', line)
    clean = re.sub(r'\s+', ' ', clean)
    clean = strip_trailing_price_annotation(clean)
    return clean.strip()


def clean_instruction_line(line):
    """Clean up an instruction line"""
    # Remove bullets and leading numbers/periods
    clean = re.sub(r'^[\-\•\*\u2022\u2023\u25E6\s]+', '', line)
    # Don't remove numbered steps like "1. Mix..."
    clean = re.sub(r'\s+', ' ', clean)
    clean = strip_trailing_price_annotation(clean)
    return clean.strip()


def _infer_container_type(product):
    """Infer container type from Open Food Facts packaging tags."""
    packaging = product.get('packaging_tags', []) or []
    packaging_text = ' '.join(packaging).lower()
    mapping = [
        ('bottle', 'bottle'),
        ('can', 'can'),
        ('box', 'box'),
        ('bag', 'bag'),
        ('jar', 'jar'),
        ('tub', 'tub'),
        ('wrap', 'wrap'),
        ('tube', 'tube'),
        ('pouch', 'bag'),
        ('carton', 'box'),
        ('tin', 'can'),
        ('packet', 'bag'),
        ('container', 'tub'),
    ]
    for keyword, container in mapping:
        if keyword in packaging_text:
            return container
    return None


PANTRY_CATEGORIES = [
    'Produce',
    'Meat & Poultry',
    'Seafood',
    'Dairy & Eggs',
    'Grains & Bread',
    'Canned Goods',
    'Snacks',
    'Beverages',
    'Frozen',
    'Condiments & Sauces',
    'Baking',
    'Spices & Seasonings',
    'Other',
]

_CATEGORY_KEYWORDS = {
    'Produce': ['fruit', 'vegetable', 'lettuce', 'tomato', 'potato', 'onion', 'garlic', 'pepper', 'carrot', 'broccoli', 'spinach', 'apple', 'banana', 'berry', 'lemon', 'lime', 'avocado', 'cucumber', 'celery', 'mushroom', 'corn', 'pea', 'bean sprout', 'fresh'],
    'Meat & Poultry': ['beef', 'chicken', 'pork', 'turkey', 'lamb', 'steak', 'ground meat', 'sausage', 'bacon', 'ham', 'meat', 'poultry', 'brisket', 'ribs', 'wing', 'thigh', 'breast'],
    'Seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'cod', 'tilapia', 'seafood', 'shellfish', 'clam', 'mussel', 'oyster', 'sardine', 'anchovy'],
    'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'dairy', 'sour cream', 'cottage cheese', 'whey', 'curd'],
    'Grains & Bread': ['bread', 'rice', 'pasta', 'noodle', 'flour', 'oat', 'cereal', 'grain', 'wheat', 'tortilla', 'wrap', 'bagel', 'roll', 'cracker', 'quinoa', 'couscous', 'barley'],
    'Canned Goods': ['canned', 'can of', 'soup', 'broth', 'stock', 'tomato sauce', 'tomato paste', 'diced tomato', 'crushed tomato', 'beans', 'chickpea', 'lentil'],
    'Snacks': ['chip', 'pretzel', 'popcorn', 'nut', 'trail mix', 'granola bar', 'snack', 'cookie', 'cracker', 'candy', 'chocolate', 'gummy'],
    'Beverages': ['juice', 'soda', 'water', 'coffee', 'tea', 'drink', 'beverage', 'milk', 'smoothie', 'energy drink', 'beer', 'wine', 'lemonade'],
    'Frozen': ['frozen', 'ice cream', 'popsicle', 'freezer', 'frost'],
    'Condiments & Sauces': ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'dressing', 'salsa', 'hot sauce', 'soy sauce', 'vinegar', 'oil', 'relish', 'bbq', 'teriyaki', 'sriracha', 'ranch', 'honey'],
    'Baking': ['baking', 'sugar', 'brown sugar', 'powdered sugar', 'vanilla extract', 'baking powder', 'baking soda', 'yeast', 'cocoa', 'chocolate chip', 'sprinkles', 'frosting'],
    'Spices & Seasonings': ['spice', 'seasoning', 'salt', 'pepper', 'cinnamon', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'rosemary', 'turmeric', 'ginger', 'chili powder', 'garlic powder', 'onion powder', 'nutmeg', 'cayenne'],
}


def auto_assign_category(item_name, off_categories_tags=None):
    """Auto-assign a pantry category based on the item name and optional OFF category tags."""
    if not item_name:
        return 'Other'

    text = item_name.lower()
    if off_categories_tags:
        text += ' ' + ' '.join(t.replace('en:', '') for t in off_categories_tags).lower()

    for category, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return category
    return 'Other'


def save_data_url_image(data_url):
    """Save a base64 data URL image to uploads and return the path."""
    import uuid
    match = re.match(r'^data:image/([a-zA-Z0-9.+-]+);base64,(.+)$', data_url)
    if not match:
        raise ValueError('Invalid image data')
    extension = match.group(1).lower()
    if extension == 'jpeg':
        extension = 'jpg'
    image_data = base64.b64decode(match.group(2))
    # Determine uploads dir
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(os.path.dirname(backend_dir), 'frontend', 'public')
    uploads_dir = os.path.join(frontend_dir, 'uploads', 'recipes')
    os.makedirs(uploads_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(uploads_dir, filename)
    with open(file_path, 'wb') as f:
        f.write(image_data)
    return f"/uploads/recipes/{filename}"


def normalize_image_url(image_url):
    """Normalize image URL - convert data URLs to saved files."""
    if not image_url:
        return None
    if isinstance(image_url, str) and image_url.startswith('data:image'):
        return save_data_url_image(image_url)
    return image_url
