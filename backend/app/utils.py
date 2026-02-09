import qrcode
import io
import base64
import requests
import json
import re
from bs4 import BeautifulSoup

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
                    'nutritional_info': {}
                }
                
                # Extract nutritional information
                if 'nutriments' in product:
                    nutriments = product['nutriments']
                    result['nutritional_info'] = {
                        'energy_kcal': nutriments.get('energy-kcal_100g'),
                        'fat': nutriments.get('fat_100g'),
                        'saturated_fat': nutriments.get('saturated-fat_100g'),
                        'carbohydrates': nutriments.get('carbohydrates_100g'),
                        'sugars': nutriments.get('sugars_100g'),
                        'fiber': nutriments.get('fiber_100g'),
                        'proteins': nutriments.get('proteins_100g'),
                        'salt': nutriments.get('salt_100g'),
                    }
                
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

def lookup_nutrition_by_name(name):
    """Lookup nutritional information using OpenFoodFacts search API by product name"""
    if not name:
        return None

    try:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": name,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 1
        }
        response = requests.get(url, params=params, timeout=5)

        if response.status_code != 200:
            return None

        data = response.json()
        products = data.get('products', [])
        if not products:
            return None

        product = products[0]
        nutriments = product.get('nutriments', {})

        return {
            'energy_kcal': nutriments.get('energy-kcal_100g'),
            'fat': nutriments.get('fat_100g'),
            'saturated_fat': nutriments.get('saturated-fat_100g'),
            'carbohydrates': nutriments.get('carbohydrates_100g'),
            'sugars': nutriments.get('sugars_100g'),
            'fiber': nutriments.get('fiber_100g'),
            'proteins': nutriments.get('proteins_100g'),
            'salt': nutriments.get('salt_100g'),
        }
    except Exception as e:
        print(f"Error looking up nutrition by name: {e}")
        return None

def extract_recipe_from_url(url):
    """Extract recipe information from a URL with improved precision"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Check if response is HTML
        if not response.headers.get('content-type', '').startswith('text/html'):
            return None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements to avoid parsing them
        for script in soup(["script", "style", "noscript"]):
            script.decompose()
        
        recipe_data = {}
        found_structured_data = False
        
        # Priority 1: Look for JSON-LD structured data (most reliable)
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                script_text = script.string
                if not script_text:
                    continue
                
                # Clean the JSON string
                script_text = script_text.strip()
                if not script_text:
                    continue
                
                data = json.loads(script_text)
                
                # Handle both dict and list formats
                if isinstance(data, dict):
                    if data.get('@type') == 'Recipe' or '@graph' in data:
                        if data.get('@type') == 'Recipe':
                            recipe_data = data
                            found_structured_data = True
                            break
                        elif '@graph' in data:
                            # Look for Recipe in @graph
                            for item in data.get('@graph', []):
                                if isinstance(item, dict) and item.get('@type') == 'Recipe':
                                    recipe_data = item
                                    found_structured_data = True
                                    break
                            if found_structured_data:
                                break
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get('@type') == 'Recipe':
                            recipe_data = item
                            found_structured_data = True
                            break
                    if found_structured_data:
                        break
            except (json.JSONDecodeError, AttributeError) as e:
                # Skip invalid JSON
                continue
        
        # If no structured data, try to extract from HTML with more precision
        if not found_structured_data:
            # Try to find title - look for specific recipe title patterns
            title_elem = None
            for selector in [
                'h1[class*="recipe"]', 'h1[class*="title"]',
                '[itemprop="name"]', '[class*="recipe-title"]',
                'h1'
            ]:
                title_elem = soup.select_one(selector)
                if title_elem:
                    title_text = title_elem.get_text().strip()
                    # Filter out generic titles
                    if title_text and len(title_text) < 200 and 'recipe' not in title_text.lower():
                        recipe_data['name'] = title_text
                        break
            
            # Try to find ingredients list - be more specific
            ingredients = []
            # Look for structured data first
            ingredient_elems = soup.find_all(itemprop='recipeIngredient')
            if ingredient_elems:
                for elem in ingredient_elems:
                    text = elem.get_text().strip()
                    if text and len(text) < 200 and text not in ingredients:
                        ingredients.append(text)
            
            # If no structured ingredients, try class-based
            if not ingredients:
                for selector in [
                    '[class*="ingredient"] li',
                    '[class*="ingredient-list"] li',
                    '[class*="recipe-ingredient"]',
                    'ul[class*="ingredient"] li'
                ]:
                    elems = soup.select(selector)
                    for elem in elems[:30]:  # Limit to 30
                        text = elem.get_text().strip()
                        # Filter: must be reasonable length, not empty, not duplicate
                        if (text and 5 < len(text) < 200 and 
                            text not in ingredients and
                            not text.lower().startswith('recipe') and
                            not text.lower().startswith('ingredient')):
                            ingredients.append(text)
                    if ingredients:
                        break
            
            if ingredients:
                recipe_data['recipeIngredient'] = ingredients[:25]  # Limit to 25
            
            # Try to find instructions - be more specific
            instructions = []
            # Look for structured data first
            instruction_elems = soup.find_all(itemprop='recipeInstructions')
            if instruction_elems:
                for elem in instruction_elems:
                    # Get all step elements or paragraphs
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
            
            # If no structured instructions, try class-based
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
                    for elem in elems[:50]:  # Limit to 50 steps
                        text = elem.get_text().strip()
                        # Filter: must be reasonable length, not just numbers or single words
                        if (text and 15 < len(text) < 500 and
                            not re.match(r'^\d+$', text) and
                            len(text.split()) > 3):  # At least 4 words
                            instructions.append(text)
                    if instructions:
                        break
            
            if instructions:
                # Format instructions nicely
                formatted_instructions = []
                for i, instruction in enumerate(instructions, 1):
                    # Remove step numbers if present
                    instruction = re.sub(r'^\d+[\.\)]\s*', '', instruction)
                    formatted_instructions.append(f"{i}. {instruction}")
                recipe_data['recipeInstructions'] = '\n'.join(formatted_instructions)
        
        # Detect dietary tags like gluten-free based on page text and URL
        page_text = soup.get_text(separator=' ', strip=True).lower()
        gluten_positive = (
            re.search(r'\bgluten[-\s]?free\b', page_text) or
            re.search(r'\bgf\b', page_text) or
            re.search(r'\bgluten[-\s]?free\b', url.lower())
        )
        gluten_negative = re.search(r'\b(not|contains|with)\s+gluten\b', page_text) or re.search(r'\bnot\s+gluten[-\s]?free\b', page_text)
        dietary_tags = []
        if gluten_positive and not gluten_negative:
            dietary_tags.append('gluten-free')

        # Convert to our format
        result = {
            'title': recipe_data.get('name') or recipe_data.get('headline') or 'Imported Recipe',
            'description': recipe_data.get('description') or '',
            'ingredients': [],
            'instructions': '',
            'prep_time': None,
            'cook_time': None,
            'servings': None,
            'tags': dietary_tags
        }
        
        # Extract ingredients
        if 'recipeIngredient' in recipe_data:
            for ing in recipe_data['recipeIngredient']:
                if isinstance(ing, str):
                    result['ingredients'].append({
                        'ingredient_name': ing,
                        'quantity': None,
                        'unit': None
                    })
        
        # Extract instructions
        if 'recipeInstructions' in recipe_data:
            if isinstance(recipe_data['recipeInstructions'], list):
                result['instructions'] = '\n'.join([
                    step.get('text', '') if isinstance(step, dict) else str(step)
                    for step in recipe_data['recipeInstructions']
                ])
            else:
                result['instructions'] = str(recipe_data['recipeInstructions'])
        
        # Extract times - try multiple field names
        prep_time = None
        cook_time = None
        
        # Try different field names for prep time
        for field in ['prepTime', 'prepTimeInSeconds', 'prep', 'preparationTime']:
            if field in recipe_data:
                prep_time = parse_iso_duration(recipe_data[field])
                if prep_time:
                    break
        
        # Try different field names for cook time
        for field in ['cookTime', 'cookTimeInSeconds', 'cook', 'cookingTime', 'totalTime']:
            if field in recipe_data:
                cook_time = parse_iso_duration(recipe_data[field])
                if cook_time:
                    break
        
        result['prep_time'] = prep_time
        result['cook_time'] = cook_time
        
        # Extract servings
        if 'recipeYield' in recipe_data:
            try:
                yield_val = recipe_data['recipeYield']
                if isinstance(yield_val, (int, float)):
                    result['servings'] = int(yield_val)
                elif isinstance(yield_val, str):
                    # Try to extract number
                    numbers = re.findall(r'\d+', yield_val)
                    if numbers:
                        result['servings'] = int(numbers[0])
            except:
                pass
        
        # Extract description - be more careful
        description = None
        for field in ['description', 'about', 'summary']:
            if field in recipe_data:
                desc_text = recipe_data[field]
                if isinstance(desc_text, str):
                    desc_text = desc_text.strip()
                    # Filter out very long descriptions, HTML tags, and common webpage noise
                    if (desc_text and 10 < len(desc_text) < 500 and
                        not desc_text.startswith('<') and
                        'recipe' not in desc_text.lower()[:20] and  # Avoid "recipe description" headers
                        not desc_text.lower().startswith('ingredient') and
                        not desc_text.lower().startswith('instruction')):
                        description = desc_text
                        break
        
        result['description'] = description
        
        # Clean up instructions - remove HTML if present
        if result['instructions']:
            # Remove any remaining HTML tags
            result['instructions'] = re.sub(r'<[^>]+>', '', result['instructions'])
            # Clean up extra whitespace
            result['instructions'] = re.sub(r'\n\s*\n', '\n', result['instructions'])
            result['instructions'] = result['instructions'].strip()
        
        return result
        
    except Exception as e:
        print(f"Error extracting recipe from URL: {e}")
        return None

def parse_iso_duration(duration_str):
    """Parse ISO 8601 duration (PT30M) to minutes"""
    try:
        if not duration_str or not duration_str.startswith('PT'):
            return None
        
        minutes = 0
        # Extract hours
        hours_match = re.search(r'(\d+)H', duration_str)
        if hours_match:
            minutes += int(hours_match.group(1)) * 60
        
        # Extract minutes
        mins_match = re.search(r'(\d+)M', duration_str)
        if mins_match:
            minutes += int(mins_match.group(1))
        
        return minutes if minutes > 0 else None
    except:
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
        r'\b\d+[/\.\s]*\d*\s*(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|'
        r'oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|kilogram|kilograms|'
        r'ml|milliliter|milliliters|l|liter|liters|pinch|dash|clove|cloves)\b',
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
    return clean.strip()


def clean_instruction_line(line):
    """Clean up an instruction line"""
    # Remove bullets and leading numbers/periods
    clean = re.sub(r'^[\-\•\*\u2022\u2023\u25E6\s]+', '', line)
    # Don't remove numbered steps like "1. Mix..."
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()
