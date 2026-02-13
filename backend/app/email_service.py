"""SendGrid email service for Modo Gusto.

All sends are fire-and-forget: errors are logged, never raised to the caller.
If SENDGRID_API_KEY is not configured, every send silently returns.
"""

import os
import logging

log = logging.getLogger(__name__)

def _get_sg_client():
    api_key = os.environ.get('SENDGRID_API_KEY')
    if not api_key:
        return None
    try:
        from sendgrid import SendGridAPIClient
        return SendGridAPIClient(api_key)
    except Exception as e:
        log.warning("SendGrid client init failed: %s", e)
        return None

def _from_email():
    from_email = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@modogusto.com')
    from_name = os.environ.get('SENDGRID_FROM_NAME', 'Modo Gusto')
    return f"{from_name} <{from_email}>"

def _base_url():
    return os.environ.get('APP_BASE_URL', 'http://localhost:5000')

def _base_template(title, body_html):
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#A9D9D0;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#A9D9D0;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#F4FFFC;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(59,36,22,0.12);">
  <tr><td style="background:linear-gradient(90deg,#8C0027,#c0672d,#F1A512,#2BAF90,#A1DAB1,#d2a34b,#DD4111);height:6px;"></td></tr>
  <tr><td style="padding:32px 32px 16px;text-align:center;">
    <h1 style="margin:0;font-size:28px;color:#3b2416;">Modo Gusto</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#8a6b52;font-style:italic;">meal prepping with passion</p>
  </td></tr>
  <tr><td style="padding:0 32px;">
    <hr style="border:none;border-top:1px solid #c9a481;margin:16px 0;">
  </td></tr>
  <tr><td style="padding:8px 32px 8px;">
    <h2 style="margin:0 0 16px;font-size:22px;color:#3b2416;">{title}</h2>
  </td></tr>
  <tr><td style="padding:0 32px 32px;font-size:15px;line-height:1.6;color:#3b2416;">
    {body_html}
  </td></tr>
  <tr><td style="background:linear-gradient(90deg,#8C0027,#c0672d,#F1A512,#2BAF90,#A1DAB1,#d2a34b,#DD4111);height:4px;"></td></tr>
  <tr><td style="padding:16px 32px;text-align:center;font-size:12px;color:#8a6b52;">
    &copy; Modo Gusto &middot; <a href="{_base_url()}" style="color:#2BAF90;">Open App</a>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>"""

def _send(to_email, subject, html_content):
    sg = _get_sg_client()
    if not sg:
        log.debug("SendGrid not configured — skipping email to %s", to_email)
        return
    try:
        from sendgrid.helpers.mail import Mail
        message = Mail(
            from_email=_from_email(),
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        response = sg.send(message)
        log.info("Email sent to %s — status %s", to_email, response.status_code)
    except Exception as e:
        log.error("Failed to send email to %s: %s", to_email, e)


# ---- Public API ----

def send_welcome_email(user):
    """Send a welcome email after registration."""
    body = f"""
    <p>Welcome aboard, <strong>{user.username}</strong>!</p>
    <p>Your Modo Gusto account is ready. Start by adding your first recipe or scanning a pantry item.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="{_base_url()}" style="display:inline-block;padding:12px 32px;background:#c0672d;color:#F4FFFC;border-radius:8px;text-decoration:none;font-weight:bold;">Open Modo Gusto</a>
    </p>
    <p>Happy cooking!</p>
    """
    html = _base_template("Welcome to Modo Gusto!", body)
    _send(user.email, "Welcome to Modo Gusto!", html)


def send_friend_request_sent(sender, receiver):
    """Confirmation to the sender that their friend request was sent."""
    body = f"""
    <p>You sent a friend request to <strong>{receiver.username}</strong>.</p>
    <p>We'll let you know when they respond. In the meantime, keep exploring recipes!</p>
    """
    html = _base_template("Friend Request Sent", body)
    _send(sender.email, f"Friend request sent to {receiver.username}", html)


def send_friend_request_received(sender, receiver):
    """Notification to the receiver that they got a friend request."""
    body = f"""
    <p><strong>{sender.username}</strong> wants to be your friend on Modo Gusto!</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="{_base_url()}" style="display:inline-block;padding:12px 32px;background:#2BAF90;color:#F4FFFC;border-radius:8px;text-decoration:none;font-weight:bold;">View Request</a>
    </p>
    """
    html = _base_template("New Friend Request", body)
    _send(receiver.email, f"{sender.username} sent you a friend request", html)


def send_maintenance_broadcast(subject, message, users):
    """Send a maintenance/broadcast email to a list of users."""
    body = f"""
    <p>{message}</p>
    <p style="font-size:13px;color:#8a6b52;margin-top:24px;">This is an administrative announcement from Modo Gusto.</p>
    """
    html = _base_template(subject, body)
    for user in users:
        _send(user.email, subject, html)


def send_weekly_digest(user, stats):
    """Send a weekly digest with stats, expiring pantry items, and upcoming meals."""
    expiring_html = ""
    if stats.get("expiring_items"):
        items = "".join(f"<li>{item}</li>" for item in stats["expiring_items"])
        expiring_html = f"""
        <h3 style="color:#DD4111;margin:20px 0 8px;">Expiring Soon</h3>
        <ul style="margin:0;padding-left:20px;">{items}</ul>
        """

    upcoming_html = ""
    if stats.get("upcoming_meals"):
        meals = "".join(f"<li>{meal}</li>" for meal in stats["upcoming_meals"])
        upcoming_html = f"""
        <h3 style="color:#2BAF90;margin:20px 0 8px;">Upcoming Meals</h3>
        <ul style="margin:0;padding-left:20px;">{meals}</ul>
        """

    body = f"""
    <p>Here's your week in review, <strong>{user.username}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr>
        <td style="padding:12px;text-align:center;background:#D7ECE6;border-radius:8px 0 0 8px;">
          <strong style="font-size:24px;color:#c0672d;">{stats.get('recipes_count', 0)}</strong><br>
          <span style="font-size:12px;color:#8a6b52;">Recipes</span>
        </td>
        <td style="padding:12px;text-align:center;background:#D7ECE6;">
          <strong style="font-size:24px;color:#c0672d;">{stats.get('pantry_count', 0)}</strong><br>
          <span style="font-size:12px;color:#8a6b52;">Pantry Items</span>
        </td>
        <td style="padding:12px;text-align:center;background:#D7ECE6;border-radius:0 8px 8px 0;">
          <strong style="font-size:24px;color:#c0672d;">{stats.get('meals_logged', 0)}</strong><br>
          <span style="font-size:12px;color:#8a6b52;">Meals Logged</span>
        </td>
      </tr>
    </table>
    {expiring_html}
    {upcoming_html}
    <p style="text-align:center;margin:24px 0;">
      <a href="{_base_url()}" style="display:inline-block;padding:12px 32px;background:#c0672d;color:#F4FFFC;border-radius:8px;text-decoration:none;font-weight:bold;">Open Modo Gusto</a>
    </p>
    """
    html = _base_template("Your Weekly Digest", body)
    _send(user.email, "Your Modo Gusto Weekly Digest", html)
