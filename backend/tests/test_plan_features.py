"""Focused tests for the 2026-07-02 UI/UX plan features (plan Phase 10).

Covers: AI endpoint auth + disabled state, pantry add/update + scan-add
increment, meal plan CRUD + new range endpoints, ownership checks, and
grocery endpoint auth + aisle-correction precedence.
"""

from datetime import date, timedelta

from conftest import switch_user

TODAY = date.today().isoformat()
WEEK_END = (date.today() + timedelta(days=6)).isoformat()


def make_recipe(client, title='Test Pasta', ingredients=None):
    resp = client.post('/api/recipes', json={
        'title': title,
        'ingredients': ingredients if ingredients is not None else [
            {'ingredient_name': 'penne pasta', 'quantity': 200, 'unit': 'g'},
            {'ingredient_name': 'whole milk', 'quantity': 1, 'unit': 'cup'},
        ],
    })
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


# ---- health ----

def test_health_unauthenticated(client):
    assert client.get('/api/health').status_code == 200


# ---- auth gating on every new endpoint ----

def test_new_endpoints_require_login(client):
    checks = [
        ('post', '/api/mealplan/shopping-list'),
        ('post', '/api/mealplan/repeat-week'),
        ('post', '/api/mealplan/clear-week'),
        ('post', '/api/mealplan/1/cooked'),
        ('post', '/api/pantry/scan-add'),
        ('post', '/api/recipes/1/similar'),
        ('get', '/api/stores'),
        ('post', '/api/stores'),
        ('post', '/api/grocery/locate-items'),
        ('post', '/api/grocery/aisle-correction'),
    ]
    for method, path in checks:
        resp = getattr(client, method)(path, json={})
        assert resp.status_code == 401, f'{path} returned {resp.status_code}, expected 401'


# ---- AI: similar meals ----

def test_similar_disabled_without_key(alice, monkeypatch):
    monkeypatch.delenv('FRONTIER_MODEL_API_KEY', raising=False)
    monkeypatch.delenv('FRONTIER_MODEL_NAME', raising=False)
    recipe = make_recipe(alice, 'AI Source Recipe')
    resp = alice.post(f"/api/recipes/{recipe['id']}/similar", json={'mode': 'similar_flavor'})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['enabled'] is False
    assert body['suggestions'] == []


def test_similar_invalid_mode_rejected(alice, monkeypatch):
    monkeypatch.setenv('FRONTIER_MODEL_API_KEY', 'test-key')
    monkeypatch.setenv('FRONTIER_MODEL_NAME', 'test-model')
    recipe = make_recipe(alice, 'AI Mode Recipe')
    resp = alice.post(f"/api/recipes/{recipe['id']}/similar", json={'mode': 'evil_mode'})
    assert resp.status_code == 400


# ---- pantry ----

def test_pantry_add_update_delete(alice):
    resp = alice.post('/api/pantry', json={'item_name': 'Cheddar cheese', 'quantity': 1, 'unit': 'block'})
    assert resp.status_code == 201
    item = resp.get_json()
    assert item['category'] == 'Dairy & Eggs'  # auto-assigned

    resp = alice.put(f"/api/pantry/{item['id']}", json={'quantity': 3})
    assert resp.status_code == 200
    assert resp.get_json()['quantity'] == 3

    assert alice.delete(f"/api/pantry/{item['id']}").status_code == 200


def test_pantry_ownership(alice):
    item = alice.post('/api/pantry', json={'item_name': 'Private jam'}).get_json()

    bob = switch_user(alice, 'bob')
    assert bob.put(f"/api/pantry/{item['id']}", json={'quantity': 99}).status_code == 404
    assert bob.delete(f"/api/pantry/{item['id']}").status_code == 404

    alice = switch_user(bob, 'alice')
    assert alice.delete(f"/api/pantry/{item['id']}").status_code == 200


def test_scan_add_increments_existing_barcode(alice):
    created = alice.post('/api/pantry', json={
        'item_name': 'Oat bar', 'barcode': '111222333', 'quantity': 1, 'unit': 'item',
    }).get_json()

    resp = alice.post('/api/pantry/scan-add', json={'barcode': '111222333'})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['action'] == 'incremented'
    assert body['previous_quantity'] == 1
    assert body['item']['quantity'] == 2
    alice.delete(f"/api/pantry/{created['id']}")


def test_scan_add_unknown_barcode_404(alice, monkeypatch):
    import app.routes as routes
    monkeypatch.setattr(routes, 'lookup_barcode', lambda b: None)
    resp = alice.post('/api/pantry/scan-add', json={'barcode': '000000000000'})
    assert resp.status_code == 404


# ---- meal plan CRUD + range endpoints ----

def test_meal_plan_crud_and_range(alice):
    recipe = make_recipe(alice, 'Plan Recipe')

    plan = alice.post('/api/mealplan', json={
        'recipe_id': recipe['id'], 'planned_date': TODAY, 'meal_type': 'dinner',
    }).get_json()

    listed = alice.get(f'/api/mealplan?start_date={TODAY}&end_date={TODAY}').get_json()
    assert any(p['id'] == plan['id'] for p in listed)

    resp = alice.put(f"/api/mealplan/{plan['id']}", json={'meal_type': 'lunch'})
    assert resp.get_json()['meal_type'] == 'lunch'

    assert alice.delete(f"/api/mealplan/{plan['id']}").status_code == 200


def test_meal_plan_ownership(alice):
    recipe = make_recipe(alice, 'Owned Recipe')
    plan = alice.post('/api/mealplan', json={
        'recipe_id': recipe['id'], 'planned_date': TODAY, 'meal_type': 'dinner',
    }).get_json()

    bob = switch_user(alice, 'bob')
    assert bob.put(f"/api/mealplan/{plan['id']}", json={'meal_type': 'snack'}).status_code == 404
    assert bob.delete(f"/api/mealplan/{plan['id']}").status_code == 404
    assert bob.post(f"/api/mealplan/{plan['id']}/cooked").status_code == 404

    alice = switch_user(bob, 'alice')
    assert alice.delete(f"/api/mealplan/{plan['id']}").status_code == 200


def test_shopping_list_aggregates_and_matches_pantry(alice):
    recipe = make_recipe(alice, 'Shop Recipe', ingredients=[
        {'ingredient_name': 'penne pasta', 'quantity': 200, 'unit': 'g'},
        {'ingredient_name': 'whole milk', 'quantity': 1, 'unit': 'cup'},
    ])
    pantry_item = alice.post('/api/pantry', json={'item_name': 'whole milk', 'quantity': 2, 'unit': 'cup'}).get_json()
    plan = alice.post('/api/mealplan', json={
        'recipe_id': recipe['id'], 'planned_date': TODAY, 'meal_type': 'dinner',
    }).get_json()

    resp = alice.post('/api/mealplan/shopping-list', json={'start_date': TODAY, 'end_date': WEEK_END})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['meal_count'] >= 1
    by_name = {i['name'].lower(): i for i in body['items']}
    assert by_name['whole milk']['in_pantry'] is True
    assert by_name['penne pasta']['in_pantry'] is False
    assert by_name['penne pasta']['category'] == 'Grains & Bread'

    resp = alice.post('/api/mealplan/shopping-list', json={'start_date': 'garbage', 'end_date': WEEK_END})
    assert resp.status_code == 400

    alice.delete(f"/api/mealplan/{plan['id']}")
    alice.delete(f"/api/pantry/{pantry_item['id']}")


def test_repeat_week_skips_duplicates_and_clear_week(alice):
    recipe = make_recipe(alice, 'Repeat Recipe')
    next_week = (date.today() + timedelta(days=7)).isoformat()
    next_week_end = (date.today() + timedelta(days=13)).isoformat()

    alice.post('/api/mealplan', json={
        'recipe_id': recipe['id'], 'planned_date': TODAY, 'meal_type': 'dinner',
    })

    first = alice.post('/api/mealplan/repeat-week', json={
        'source_start': TODAY, 'target_start': next_week,
    }).get_json()
    assert first['created'] == 1

    second = alice.post('/api/mealplan/repeat-week', json={
        'source_start': TODAY, 'target_start': next_week,
    }).get_json()
    assert second['created'] == 0  # dupe-safe

    cleared = alice.post('/api/mealplan/clear-week', json={
        'start_date': TODAY, 'end_date': next_week_end,
    }).get_json()
    assert cleared['deleted'] == 2


def test_mark_cooked_logs_history(alice):
    recipe = make_recipe(alice, 'Cooked Recipe')
    plan = alice.post('/api/mealplan', json={
        'recipe_id': recipe['id'], 'planned_date': TODAY, 'meal_type': 'lunch',
    }).get_json()

    resp = alice.post(f"/api/mealplan/{plan['id']}/cooked")
    assert resp.status_code == 201
    entry = resp.get_json()
    assert entry['meal_type'] == 'lunch'
    assert entry['consumed_date'] == TODAY
    alice.delete(f"/api/mealplan/{plan['id']}")


# ---- grocery stores + aisles ----

def test_store_and_aisle_correction_flow(alice):
    store = alice.post('/api/stores', json={'name': 'Test Giant', 'chain': 'Giant'}).get_json()
    assert store['is_default'] is True  # first store becomes default

    located = alice.post('/api/grocery/locate-items', json={
        'store_id': store['id'],
        'items': [{'name': 'whole milk'}, {'name': 'mystery gadget'}],
    }).get_json()
    by_name = {i['name']: i for i in located['items']}
    assert by_name['whole milk']['source'] == 'inferred'
    assert by_name['mystery gadget']['source'] == 'unknown'
    assert by_name['mystery gadget']['aisle'] is None

    alice.post('/api/grocery/aisle-correction', json={
        'store_id': store['id'], 'item_name': 'whole milk', 'aisle_label': 'Aisle 12',
    })
    relocated = alice.post('/api/grocery/locate-items', json={
        'store_id': store['id'], 'items': [{'name': 'whole milk'}],
    }).get_json()
    assert relocated['items'][0]['aisle'] == 'Aisle 12'
    assert relocated['items'][0]['source'] == 'user'
    assert relocated['items'][0]['confidence'] == 1.0

    # Bob can't use or correct Alice's store
    bob = switch_user(alice, 'bob')
    assert bob.post('/api/grocery/locate-items', json={
        'store_id': store['id'], 'items': [{'name': 'milk'}],
    }).status_code == 404
    assert bob.post('/api/grocery/aisle-correction', json={
        'store_id': store['id'], 'item_name': 'milk', 'aisle_label': 'X',
    }).status_code == 404

    alice = switch_user(bob, 'alice')
    assert alice.delete(f"/api/stores/{store['id']}").status_code == 200
