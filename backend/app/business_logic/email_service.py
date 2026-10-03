import os
import random
import httpx

from app.business_logic.testi import testo

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("GMAIL_ADDRESS")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def generate_otp_code() -> str: #genera un numero casuale a 6 cifre
    return str(random.randint(100000, 999999))


async def send_otp_email(to_email: str, code: str, purpose: str, lingua: str | None = "it"):
    #nella lingua dell'utente: per la registrazione e' quella scelta nell'app prima dell'account
    subject = testo(lingua, "email_oggetto_verifica" if purpose == "email_verification" else "email_oggetto_reset")
    body = testo(lingua, "email_corpo", codice=code)

    #Render (piano gratuito) blocca le porte SMTP in uscita, quindi l'invio
    #via smtp.gmail.com andava sempre in timeout: Brevo manda l'email tramite
    #una chiamata HTTP, che non è bloccata
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            BREVO_URL,
            headers={"api-key": BREVO_API_KEY},
            json={
                "sender": {"email": SENDER_EMAIL, "name": "TrackIt"},
                "to": [{"email": to_email}],
                "subject": subject,
                "textContent": body,
            },
        )
    response.raise_for_status() #senza, un rifiuto di Brevo (chiave sbagliata, mittente non verificato) passerebbe inosservato
