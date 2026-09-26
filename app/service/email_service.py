import os
import smtplib
import logging
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def send_email_code(email: str, code: str) -> None:
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.error("SMTP_USER и SMTP_PASSWORD не настроены в .env")
        raise RuntimeError(
            "SMTP_USER and SMTP_PASSWORD must be set in .env"
        )

    message = EmailMessage()
    message["Subject"] = "Код подтверждения"
    message["From"] = SMTP_USER
    message["To"] = email
    message.set_content(
        f"Ваш код подтверждения: {code}\n\n"
        "Код действителен 5 минут."
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()       
            server.login(SMTP_USER, SMTP_PASSWORD)        
            server.send_message(message)
    except Exception:
        logger.exception(
            "Ошибка SMTP при отправке на email: %s (host: %s:%s)",
            email, SMTP_HOST, SMTP_PORT
        )
        raise
        