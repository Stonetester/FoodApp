"""Flask CLI commands for scheduled tasks."""

import click
from datetime import datetime, timedelta
from flask.cli import with_appcontext


def register_cli(app):
    """Register CLI commands with the Flask app."""
    app.cli.add_command(send_weekly_digest_cmd)


@click.command("send-weekly-digest")
@with_appcontext
def send_weekly_digest_cmd():
    """Send the weekly digest email to all users."""
    from app.models import db, User, Recipe, PantryItem, MealPlan, MealHistory
    from app.email_service import send_weekly_digest

    users = User.query.all()
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    week_ahead = today + timedelta(days=7)

    sent = 0
    for user in users:
        recipes_count = Recipe.query.filter_by(user_id=user.id).count()
        pantry_count = PantryItem.query.filter_by(user_id=user.id).count()
        meals_logged = MealHistory.query.filter(
            MealHistory.user_id == user.id,
            MealHistory.consumed_date >= week_ago,
        ).count()

        # Pantry items expiring in the next 7 days
        expiring = PantryItem.query.filter(
            PantryItem.user_id == user.id,
            PantryItem.expiry_date.isnot(None),
            PantryItem.expiry_date <= week_ahead,
            PantryItem.expiry_date >= today,
        ).all()
        expiring_items = [
            f"{item.item_name} (expires {item.expiry_date.isoformat()})"
            for item in expiring
        ]

        # Upcoming meal plan entries
        upcoming = MealPlan.query.filter(
            MealPlan.user_id == user.id,
            MealPlan.planned_date >= today,
            MealPlan.planned_date <= week_ahead,
        ).all()
        upcoming_meals = []
        for plan in upcoming:
            title = plan.recipe.title if plan.recipe else "Meal"
            upcoming_meals.append(
                f"{plan.planned_date.isoformat()} — {plan.meal_type}: {title}"
            )

        stats = {
            "recipes_count": recipes_count,
            "pantry_count": pantry_count,
            "meals_logged": meals_logged,
            "expiring_items": expiring_items,
            "upcoming_meals": upcoming_meals,
        }

        send_weekly_digest(user, stats)
        sent += 1

    click.echo(f"Weekly digest sent to {sent} user(s).")
