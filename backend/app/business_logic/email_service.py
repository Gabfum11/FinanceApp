import os
import random
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

conf = ConnectionConfig( #dice alla libreria come collegarsi al server SMTP di gmail
    MAIL_USERNAME=os.getenv("GMAIL_ADDRESS"),
    MAIL_PASSWORD=os.getenv("GMAIL_APP_PASSWORD"),
    MAIL_FROM=os.getenv("GMAIL_ADDRESS"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
)


def generate_otp_code() -> str: #genera un numero casuale a 6 cifre
    return str(random.randint(100000, 999999))


async def send_otp_email(to_email: str, code: str, purpose: str):
    subject = "Verifica il tuo account" if purpose == "email_verification" else "Reimposta la tua password"
    body = f"Il tuo codice è: {code}\n\nScade tra 10 minuti."

    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=body,
        subtype=MessageType.plain,
    )

    fm = FastMail(conf)
    await fm.send_message(message)
