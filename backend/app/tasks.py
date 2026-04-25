"""Flask CLI commands for scheduled tasks and admin ops."""

import click
from datetime import datetime, timedelta
from flask.cli import with_appcontext


def register_cli(app):
    """Register CLI commands with the Flask app."""
    app.cli.add_command(send_weekly_digest_cmd)
    app.cli.add_command(send_friend_digest_cmd)
    app.cli.add_command(list_users_cmd)
    app.cli.add_command(delete_user_cmd)
    app.cli.add_command(send_test_email_cmd)


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


@click.command("send-friend-digest")
@with_appcontext
def send_friend_digest_cmd():
    """Send friend recipe digest to users who have new friend recipes since their last digest."""
    from app.models import db, User, Recipe, Friendship
    from app.email_service import send_friend_recipe_digest

    now = datetime.utcnow()
    users = User.query.all()
    sent = 0
    skipped = 0

    for user in users:
        since = user.last_digest_sent_at or (now - timedelta(hours=1))

        # Collect friend IDs (friendships are stored directionally; check both sides)
        friend_ids = {f.friend_id for f in Friendship.query.filter_by(user_id=user.id).all()}
        friend_ids |= {f.user_id for f in Friendship.query.filter_by(friend_id=user.id).all()}

        if not friend_ids:
            skipped += 1
            continue

        new_recipes = (
            Recipe.query
            .filter(Recipe.user_id.in_(friend_ids), Recipe.created_at > since)
            .order_by(Recipe.created_at.desc())
            .all()
        )

        if not new_recipes:
            skipped += 1
            continue

        recipe_data = [
            {
                "title": r.title,
                "username": r.user.username,
                "added_at": r.created_at.strftime("%b %d"),
            }
            for r in new_recipes
        ]

        send_friend_recipe_digest(user, recipe_data)
        user.last_digest_sent_at = now
        sent += 1

    db.session.commit()
    click.echo(f"Friend digest sent to {sent} user(s), {skipped} skipped (no new recipes or no friends).")


@click.command("list-users")
@with_appcontext
def list_users_cmd():
    """List all registered users (id, username, email, is_admin, created_at)."""
    from app.models import User
    users = User.query.order_by(User.id).all()
    if not users:
        click.echo("No users found.")
        return
    click.echo(f"{'ID':<5} {'Username':<20} {'Email':<35} {'Admin':<7} {'Created'}")
    click.echo("-" * 80)
    for u in users:
        created = u.created_at.strftime("%Y-%m-%d") if u.created_at else "?"
        click.echo(f"{u.id:<5} {u.username:<20} {u.email:<35} {str(u.is_admin):<7} {created}")


@click.command("delete-user")
@click.argument("username")
@click.option("--confirm", is_flag=True, help="Skip interactive confirmation prompt.")
@with_appcontext
def delete_user_cmd(username, confirm):
    """Permanently delete a user account and all their data.

    \b
    Usage:
      flask delete-user testaccount
      flask delete-user testaccount --confirm   # skip prompt
    """
    from app.models import db, User
    user = User.query.filter_by(username=username).first()
    if not user:
        click.echo(f"No user found with username '{username}'.")
        return

    click.echo(f"User found: id={user.id}  email={user.email}  is_admin={user.is_admin}")

    if not confirm:
        confirmed = click.confirm(
            f"Permanently delete '{username}' and ALL their recipes, pantry items, "
            f"meal plans, history, reviews, and friendships?",
            default=False,
        )
        if not confirmed:
            click.echo("Aborted.")
            return

    db.session.delete(user)
    db.session.commit()
    click.echo(f"User '{username}' (id={user.id}) deleted successfully.")


@click.command("send-test-email")
@click.argument("to_email")
@with_appcontext
def send_test_email_cmd(to_email):
    """Send a test email to verify SendGrid delivery and check spam status.

    \b
    Usage:
      flask send-test-email you@gmail.com
    """
    import os
    from app.email_service import _from_email, _base_template

    api_key = os.environ.get('RESEND_API_KEY')
    if not api_key:
        click.echo("ERROR: RESEND_API_KEY is not set.")
        return

    from_addr = _from_email()
    subject = "Modo Gusto — Email Delivery Test"
    body_html = _base_template(
        "Email Delivery Test",
        f"""
        <p>This is a test email sent from the Modo Gusto Flask server.</p>
        <p>If you received this in your <strong>inbox</strong>, Resend delivery is working correctly.</p>
        <p>If you received this in <strong>spam</strong>, your domain authentication
        (SPF / DKIM / DMARC) still needs to be fixed.</p>
        <p style="margin-top:1.5rem;font-size:0.85rem;color:#8a6b52;">
            Sent at: {datetime.utcnow().isoformat()} UTC<br>
            From: {from_addr}<br>
            To: {to_email}
        </p>
        """,
    )

    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": body_html,
        })
        click.echo(f"Test email sent to {to_email}")
        click.echo("Resend accepted the message. Check inbox (and spam folder) to confirm delivery.")
    except Exception as e:
        click.echo(f"ERROR sending test email: {e}")
