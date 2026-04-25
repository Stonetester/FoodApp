"""Resend email service for Modo Gusto.

All sends are fire-and-forget: errors are logged, never raised to the caller.
If RESEND_API_KEY is not configured, every send silently returns.
"""

import os
import logging

log = logging.getLogger(__name__)

def _from_email():
    from_email = os.environ.get('FROM_EMAIL', 'noreply@modogusto.com')
    from_name = os.environ.get('FROM_NAME', 'Modo Gusto')
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
    api_key = os.environ.get('RESEND_API_KEY')
    if not api_key:
        log.debug("Resend not configured — skipping email to %s", to_email)
        return
    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": _from_email(),
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        })
        log.info("Email sent to %s", to_email)
    except Exception as e:
        log.error("Failed to send email to %s: %s", to_email, e)


# ---- Public API ----

def send_welcome_email(user):
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
    body = f"""
    <p>You sent a friend request to <strong>{receiver.username}</strong>.</p>
    <p>We'll let you know when they respond. In the meantime, keep exploring recipes!</p>
    """
    html = _base_template("Friend Request Sent", body)
    _send(sender.email, f"Friend request sent to {receiver.username}", html)


def send_friend_request_received(sender, receiver):
    body = f"""
    <p><strong>{sender.username}</strong> wants to be your friend on Modo Gusto!</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="{_base_url()}" style="display:inline-block;padding:12px 32px;background:#2BAF90;color:#F4FFFC;border-radius:8px;text-decoration:none;font-weight:bold;">View Request</a>
    </p>
    """
    html = _base_template("New Friend Request", body)
    _send(receiver.email, f"{sender.username} sent you a friend request", html)


def send_maintenance_broadcast(subject, message, users):
    body = f"""
    <p>{message}</p>
    <p style="font-size:13px;color:#8a6b52;margin-top:24px;">This is an administrative announcement from Modo Gusto.</p>
    """
    html = _base_template(subject, body)
    for user in users:
        _send(user.email, subject, html)


def send_weekly_digest(user, stats):
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


def send_test_email(user):
    body = f"""
    <p>Hi <strong>{user.username}</strong>,</p>
    <p>This is a test email from <strong>Modo Gusto</strong>. If you can read this, your email configuration is working correctly!</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="{_base_url()}" style="display:inline-block;padding:12px 32px;background:#2BAF90;color:#F4FFFC;border-radius:8px;text-decoration:none;font-weight:bold;">Open Modo Gusto</a>
    </p>
    <p style="font-size:13px;color:#8a6b52;">Sent to: {user.email}</p>
    """
    html = _base_template("Test Email", body)
    _send(user.email, "Modo Gusto - Test Email", html)


def send_password_reset_email(user, reset_url):
    body = f"""
    <p>Hi <strong>{user.username}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to set a new password:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="{reset_url}" style="display:inline-block;padding:12px 32px;background:#c0672d;color:#F4FFFC;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
    </p>
    <p style="font-size:13px;color:#8a6b52;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    """
    html = _base_template("Reset Your Password", body)
    _send(user.email, "Modo Gusto - Password Reset", html)
