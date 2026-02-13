import requests
import re
import json


def _strip_quantity_and_unit(ingredient_name):
    """Strip leading quantity/unit from an ingredient name for search."""
    if not ingredient_name:
        return ingredient_name
    # Remove leading numbers, fractions, units
    cleaned = re.sub(
        r'^[\d./\s]+'
        r'(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|'
        r'g|grams?|kg|kilograms?|ml|milliliters?|liters?|l|pinch|dash|'
        r'cloves?|cans?|packages?|bags?|sticks?|slices?|pieces?|heads?|'
        r'bunches?|handfuls?|sprigs?|stalks?|medium|large|small)\s*',
        '',
        ingredient_name.strip(),
        flags=re.IGNORECASE
    )
    # Remove parenthetical notes like "(about 2 cups)" or "(drained)"
    cleaned = re.sub(r'\([^)]*\)', '', cleaned)
    # Remove trailing commas and extra whitespace
    cleaned = re.sub(r',\s*$', '', cleaned).strip()
    return cleaned or ingredient_name.strip()


def lookup_ingredient_nutrition(name):
    """Search Open Food Facts by ingredient name, return per-100g nutrition or None."""
    if not name:
        return None

    search_term = _strip_quantity_and_unit(name)
    if not search_term or search_term == '__nutrition__':
        return None

    try:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            'search_terms': search_term,
            'search_simple': 1,
            'action': 'process',
            'json': 1,
            'page_size': 3,
            'fields': 'product_name,nutriments',
        }
        response = requests.get(url, params=params, timeout=5)
        if response.status_code != 200:
            return None

        data = response.json()
        products = data.get('products', [])
        if not products:
            return None

        # Pick first product with nutriments
        for product in products:
            nutriments = product.get('nutriments', {})
            if not nutriments:
                continue
            energy = nutriments.get('energy-kcal_100g')
            if energy is None:
                continue
            return {
                'energy_kcal': _safe_float(energy),
                'fat': _safe_float(nutriments.get('fat_100g')),
                'saturated_fat': _safe_float(nutriments.get('saturated-fat_100g')),
                'trans_fat': _safe_float(nutriments.get('trans-fat_100g')),
                'cholesterol': _safe_float(nutriments.get('cholesterol_100g')),
                'sodium': _safe_float(nutriments.get('sodium_100g')),
                'carbohydrates': _safe_float(nutriments.get('carbohydrates_100g')),
                'fiber': _safe_float(nutriments.get('fiber_100g')),
                'sugars': _safe_float(nutriments.get('sugars_100g')),
                'added_sugars': _safe_float(nutriments.get('added-sugars_100g')),
                'proteins': _safe_float(nutriments.get('proteins_100g')),
                'vitamin_d': _safe_float(nutriments.get('vitamin-d_100g')),
                'calcium': _safe_float(nutriments.get('calcium_100g')),
                'iron': _safe_float(nutriments.get('iron_100g')),
                'potassium': _safe_float(nutriments.get('potassium_100g')),
                'salt': _safe_float(nutriments.get('salt_100g')),
            }

        return None
    except Exception as e:
        print(f"Nutrition lookup failed for '{name}': {e}")
        return None


def calculate_recipe_nutrition(ingredients, servings=1):
    """Sum ingredient nutrition and divide by servings.

    ``ingredients`` is a list of dicts, each with at least 'ingredient_name'.
    Returns a dict with per-serving nutrition or None if nothing found.
    """
    totals = {
        'energy_kcal': 0,
        'fat': 0,
        'saturated_fat': 0,
        'trans_fat': 0,
        'cholesterol': 0,
        'sodium': 0,
        'carbohydrates': 0,
        'fiber': 0,
        'sugars': 0,
        'added_sugars': 0,
        'proteins': 0,
        'vitamin_d': 0,
        'calcium': 0,
        'iron': 0,
        'potassium': 0,
        'salt': 0,
    }
    found_any = False

    for ing in (ingredients or []):
        name = ing.get('ingredient_name', '')
        if name == '__nutrition__':
            continue
        nutrition = lookup_ingredient_nutrition(name)
        if nutrition:
            found_any = True
            for key in totals:
                val = nutrition.get(key)
                if val is not None:
                    totals[key] += val

    if not found_any:
        return None

    servings = max(int(servings or 1), 1)
    return {
        key: round(value / servings, 1)
        for key, value in totals.items()
    }


def _safe_float(value):
    if value is None:
        return None
    try:
        return round(float(value), 2)
    except (ValueError, TypeError):
        return None


def parse_nutrition_label_text(text):
    """Parse OCR text from a nutrition facts label and return structured nutrition data.

    Returns a dict with keys:
        energy_kcal, proteins, carbohydrates, fat, saturated_fat,
        sodium, fiber, sugars, cholesterol, serving_size, servings_per_container
    Values are floats (or None when not found). serving_size is a string.
    """
    if not text:
        return {}

    # Normalize whitespace: collapse runs of spaces/tabs but keep newlines
    clean = re.sub(r'[^\S\n]+', ' ', text)

    result = {
        'energy_kcal': None,
        'proteins': None,
        'carbohydrates': None,
        'fat': None,
        'saturated_fat': None,
        'sodium': None,
        'fiber': None,
        'sugars': None,
        'cholesterol': None,
        'serving_size': None,
        'servings_per_container': None,
    }

    def _first_number(pattern, txt):
        """Search for *pattern* and return the first captured group as a float."""
        m = re.search(pattern, txt, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1))
            except (ValueError, TypeError):
                return None
        return None

    # --- Serving size (free-form text, e.g. "1 cup (228g)") ---
    serving_size_match = re.search(
        r'serving\s*size[:\s]*(.+?)(?:\n|$)',
        clean, re.IGNORECASE
    )
    if serving_size_match:
        result['serving_size'] = serving_size_match.group(1).strip().rstrip('|').strip()

    # --- Servings per container ---
    result['servings_per_container'] = _first_number(
        r'servings?\s*per\s*container[:\s]*(?:about\s*)?(\d+\.?\d*)', clean
    )

    # --- Calories ---
    result['energy_kcal'] = _first_number(
        r'calories[:\s]*(\d+\.?\d*)', clean
    )

    # --- Total Fat ---
    result['fat'] = _first_number(
        r'total\s*fat[:\s]*(\d+\.?\d*)\s*g', clean
    )

    # --- Saturated Fat ---
    result['saturated_fat'] = _first_number(
        r'saturated\s*fat[:\s]*(\d+\.?\d*)\s*g', clean
    )

    # --- Trans Fat (extracted but not stored in result — kept for completeness) ---
    # We don't have a trans_fat key in the requested output, skip.

    # --- Cholesterol ---
    result['cholesterol'] = _first_number(
        r'cholesterol[:\s]*(\d+\.?\d*)\s*m?g', clean
    )

    # --- Sodium ---
    result['sodium'] = _first_number(
        r'sodium[:\s]*(\d+\.?\d*)\s*m?g', clean
    )

    # --- Total Carbohydrate ---
    result['carbohydrates'] = _first_number(
        r'total\s*carbohydrate?s?[:\s]*(\d+\.?\d*)\s*g', clean
    )

    # --- Dietary Fiber ---
    result['fiber'] = _first_number(
        r'(?:dietary\s*)?fiber[:\s]*(\d+\.?\d*)\s*g', clean
    )

    # --- Sugars ---
    # Match "Sugars" but avoid "Added Sugars"
    result['sugars'] = _first_number(
        r'(?<!added\s)sugars?[:\s]*(\d+\.?\d*)\s*g', clean
    )

    # --- Protein ---
    result['proteins'] = _first_number(
        r'protein[s]?[:\s]*(\d+\.?\d*)\s*g', clean
    )

    return result
