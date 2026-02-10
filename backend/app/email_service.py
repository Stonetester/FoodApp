import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import current_app


def send_email(to, subject, content):
    """Send a transactional email via SendGrid without interrupting request handling on failure."""
    api_key = os.getenv('SENDGRID_API_KEY')
    from_email = os.getenv('FROM_EMAIL')

    if not api_key or not from_email:
        current_app.logger.warning(
            'Transactional email skipped: SENDGRID_API_KEY or FROM_EMAIL not configured.'
        )
        return False

    try:
        message = Mail(
            from_email=from_email,
            to_emails=to,
            subject=subject,
            plain_text_content=content
        )
        sg = SendGridAPIClient(api_key)
        sg.send(message)
        return True
    except Exception:
        current_app.logger.exception(
            'Transactional email send failed for recipient %s with subject %s.',
            to,
            subject
        )
        return False
