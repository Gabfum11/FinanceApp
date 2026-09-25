import os
import random
import httpx

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("GMAIL_ADDRESS")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def generate_otp_code() -> str: #genera un numero casuale a 6 cifre
    return str(random.randint(100000, 999999))


async def send_otp_email(to_email: str, code: str, purpose: str):
    subject = "Verifica il tuo account" if purpose == "email_verification" else "Reimposta la tua password"
    body = f"Il tuo codice è: {code}\n\nScade tra 10 minuti."

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
