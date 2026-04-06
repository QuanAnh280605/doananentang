from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from functools import lru_cache
from app.core.config import get_settings

@lru_cache()
def get_mail_config() -> ConnectionConfig:
    settings = get_settings()
    return ConnectionConfig(
        MAIL_USERNAME=settings.smtp_username,
        MAIL_PASSWORD=settings.smtp_password,
        MAIL_FROM=settings.smtp_from_email,
        MAIL_PORT=settings.smtp_port,
        MAIL_SERVER=settings.smtp_host,
        MAIL_STARTTLS=settings.smtp_use_starttls,
        MAIL_SSL_TLS=settings.smtp_use_tls,
        MAIL_DEBUG=True,
    )


async def send_email(
    recipients: list[EmailStr],
    subject: str,
    body: str,
):
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=body,
        subtype="html",
    )
    fm = FastMail(get_mail_config())
    await fm.send_message(message)