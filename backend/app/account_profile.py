import json
from sqlalchemy import text
from app.models import db, Recipe


def ensure_account_profiles_table():
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS account_profiles (
            user_id INTEGER PRIMARY KEY,
            avatar_url TEXT,
            bio TEXT,
            top_meals_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """))


def _normalize_top_meals(user_id, top_meals):
    if not isinstance(top_meals, list):
        return []
    ids = []
    for item in top_meals:
        try:
            ids.append(int(item))
        except (TypeError, ValueError):
            continue
    ids = ids[:3]
    if not ids:
        return []
    owned = (
        Recipe.query.filter(Recipe.user_id == user_id, Recipe.id.in_(ids))
        .with_entities(Recipe.id)
        .all()
    )
    owned_ids = {row[0] for row in owned}
    return [meal_id for meal_id in ids if meal_id in owned_ids][:3]


def get_account_profile(user_id):
    ensure_account_profiles_table()
    row = db.session.execute(
        text("SELECT avatar_url, bio, top_meals_json FROM account_profiles WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).fetchone()

    if not row:
        return {
            "avatar_url": "",
            "bio": "",
            "top_meals": [],
        }

    top_meals = []
    if row[2]:
        try:
            parsed = json.loads(row[2])
            if isinstance(parsed, list):
                top_meals = parsed[:3]
        except (TypeError, ValueError, json.JSONDecodeError):
            top_meals = []

    return {
        "avatar_url": row[0] or "",
        "bio": row[1] or "",
        "top_meals": top_meals,
    }


def save_account_profile(user_id, avatar_url, bio, top_meals):
    ensure_account_profiles_table()
    normalized_meals = _normalize_top_meals(user_id, top_meals)

    existing = db.session.execute(
        text("SELECT user_id FROM account_profiles WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).fetchone()

    payload = {
        "user_id": user_id,
        "avatar_url": (avatar_url or "").strip(),
        "bio": (bio or "").strip(),
        "top_meals_json": json.dumps(normalized_meals),
    }

    if existing:
        db.session.execute(
            text(
                """
                UPDATE account_profiles
                SET avatar_url = :avatar_url,
                    bio = :bio,
                    top_meals_json = :top_meals_json,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                """
            ),
            payload,
        )
    else:
        db.session.execute(
            text(
                """
                INSERT INTO account_profiles (user_id, avatar_url, bio, top_meals_json)
                VALUES (:user_id, :avatar_url, :bio, :top_meals_json)
                """
            ),
            payload,
        )

    return normalized_meals
