"""Frontier-model integration for AI features (similar meals).

Provider-agnostic: talks to any OpenAI-compatible chat-completions endpoint
(OpenAI, Anthropic compat layer, Ollama, vLLM, ...) configured via env vars:

    FRONTIER_MODEL_API_KEY   - bearer token (never hardcode, never log)
    FRONTIER_MODEL_NAME      - model id, e.g. "claude-sonnet-5" or "qwen3:14b"
    FRONTIER_MODEL_BASE_URL  - default "https://api.openai.com/v1"

If unset, callers should surface a friendly disabled state, not an error.
"""

import json
import os
import re

import requests


class AIServiceError(Exception):
    """The model call failed or returned something unusable."""


SIMILAR_MODES = {
    'similar_flavor': 'Suggest meals with a similar flavor profile and comfort level.',
    'similar_ingredients': 'Suggest meals that reuse most of the same core ingredients.',
    'healthier': 'Suggest healthier versions or alternatives: less fat/sugar/sodium, more vegetables, similar satisfaction.',
    'cheaper': 'Suggest cheaper versions or alternatives using budget-friendly ingredients.',
    'faster': 'Suggest faster weeknight versions that take significantly less total time.',
    'use_pantry': 'Suggest similar meals that can be made mostly from the pantry items listed.',
}


def is_configured():
    return bool(os.environ.get('FRONTIER_MODEL_API_KEY')) and bool(os.environ.get('FRONTIER_MODEL_NAME'))


def _chat_endpoint():
    base = os.environ.get('FRONTIER_MODEL_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    return base + '/chat/completions'


def _extract_json(text):
    """Parse a JSON object out of a model reply.

    Tolerates reasoning-model <think> blocks, code fences, and prose around
    the object: scans every '{' and returns the first balanced object that
    parses and contains a 'suggestions' key (or the first that parses at all).
    """
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
    fence = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if fence:
        text = fence.group(1)

    decoder = json.JSONDecoder()
    fallback = None
    for match in re.finditer(r'\{', text):
        try:
            obj, _ = decoder.raw_decode(text, match.start())
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and 'suggestions' in obj:
            return obj
        if fallback is None and isinstance(obj, dict):
            fallback = obj
    if fallback is not None:
        return fallback
    raise AIServiceError('Model reply contained no valid JSON object')


def _clean_suggestion(raw):
    """Validate/coerce one suggestion; return None if unusable."""
    if not isinstance(raw, dict):
        return None
    title = str(raw.get('title') or '').strip()
    if not title:
        return None

    def str_list(value):
        if not isinstance(value, list):
            return []
        return [str(v).strip() for v in value if str(v).strip()][:40]

    minutes = raw.get('estimated_time_minutes')
    try:
        minutes = int(minutes) if minutes is not None else None
    except (TypeError, ValueError):
        minutes = None

    confidence = raw.get('confidence')
    try:
        confidence = max(0.0, min(1.0, float(confidence))) if confidence is not None else None
    except (TypeError, ValueError):
        confidence = None

    return {
        'title': title[:200],
        'description': str(raw.get('description') or '').strip()[:1000],
        'why_similar': str(raw.get('why_similar') or '').strip()[:1000],
        'estimated_time_minutes': minutes,
        'ingredients': str_list(raw.get('ingredients')),
        'instructions': str_list(raw.get('instructions')),
        'tags': str_list(raw.get('tags'))[:10],
        'confidence': confidence,
    }


def generate_similar_recipes(recipe, mode, constraints=None, pantry_names=None):
    """Ask the configured model for meals similar to `recipe`.

    recipe: dict from Recipe.to_dict(); constraints: whitelisted dict;
    pantry_names: list of item names (names only — no quantities/private data).
    Returns a list of cleaned suggestion dicts. Raises AIServiceError on failure.
    """
    if not is_configured():
        raise AIServiceError('AI service is not configured')

    constraints = constraints or {}
    ingredients = [
        i.get('ingredient_name') for i in recipe.get('ingredients', [])
        if i.get('ingredient_name') and i.get('ingredient_name') != '__nutrition__'
    ]

    constraint_lines = []
    if constraints.get('max_time_minutes'):
        constraint_lines.append(f"- Total time must be under {int(constraints['max_time_minutes'])} minutes")
    if constraints.get('dietary_tags'):
        tags = ', '.join(str(t) for t in constraints['dietary_tags'][:10])
        constraint_lines.append(f"- Must respect dietary needs: {tags}")
    if constraints.get('budget'):
        constraint_lines.append(f"- Budget level: {constraints['budget']}")
    if pantry_names:
        constraint_lines.append('- Prefer ingredients from this pantry: ' + ', '.join(pantry_names[:60]))

    user_prompt = f"""Source recipe:
Title: {recipe.get('title')}
Description: {recipe.get('description') or '(none)'}
Ingredients: {', '.join(ingredients) or '(none listed)'}
Tags: {', '.join(recipe.get('tags', [])) or '(none)'}
Prep time: {recipe.get('prep_time') or '?'} min, Cook time: {recipe.get('cook_time') or '?'} min

Task: {SIMILAR_MODES[mode]}
{chr(10).join(constraint_lines)}

Return ONLY a JSON object, no prose, exactly this shape:
{{"suggestions": [{{"title": str, "description": str, "why_similar": str, "estimated_time_minutes": int, "ingredients": [str], "instructions": [str], "tags": [str], "confidence": float 0-1}}]}}
Give 3 suggestions. Ingredients as plain strings like "2 cups flour". Instructions as ordered step strings."""

    headers = {
        'Authorization': f"Bearer {os.environ['FRONTIER_MODEL_API_KEY']}",
        'Content-Type': 'application/json',
    }
    payload = {
        'model': os.environ['FRONTIER_MODEL_NAME'],
        'messages': [
            {'role': 'system', 'content': 'You are a helpful home-cooking assistant. Reply with valid JSON only.'},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': 0.7,
        'max_tokens': 3000,
    }

    try:
        response = requests.post(_chat_endpoint(), headers=headers, json=payload, timeout=90)
    except requests.RequestException as e:
        raise AIServiceError(f'Could not reach the AI service: {e.__class__.__name__}')

    if response.status_code != 200:
        # Log status only — never the body, which could echo prompt/user data
        print(f'ai_service: model call failed with HTTP {response.status_code}')
        raise AIServiceError('The AI service returned an error')

    try:
        content = response.json()['choices'][0]['message']['content']
    except (KeyError, IndexError, ValueError):
        raise AIServiceError('Unexpected response shape from the AI service')

    parsed = _extract_json(content)
    suggestions = [s for s in (_clean_suggestion(r) for r in parsed.get('suggestions', [])) if s]
    if not suggestions:
        raise AIServiceError('The model returned no usable suggestions')
    return suggestions
