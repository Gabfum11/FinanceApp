import os
import secrets
import httpx

from app.business_logic.testi import testo

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("GMAIL_ADDRESS")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def generate_otp_code() -> str: #6 cifre da un generatore crittografico: random.randint e' prevedibile
    return str(secrets.randbelow(900000) + 100000)


async def send_otp_email(to_email: str, code: str, purpose: str, lingua: str | None = "it"):
    #nella lingua dell'utente: per la registrazione e' quella scelta nell'app prima dell'account
    subject = testo(lingua, "email_oggetto_verifica_email" if purpose == "email_verification" else "email_oggetto_reset_password")
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
    response.raise_for_status() #controlla che la chiamata HTTP sia andata a buon fine: se no lancia un'eccezione


#dove arrivano i messaggi del modulo «Scrivici»: se non e' impostata, alla
#casella che manda i codici, che e' la stessa del supporto
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL") or SENDER_EMAIL

ARGOMENTI = {"problema": "Problema", "idea": "Idea", "domanda": "Domanda", "altro": "Altro"}


async def send_contact_email(email: str, argomento: str, messaggio: str, browser: str | None):
    #l'inizio del messaggio nell'oggetto: nella casella si capisce di cosa si
    #tratta senza aprirlo
    anteprima = " ".join(messaggio.split())[:60]
    subject = f"TrackIt — [{ARGOMENTI[argomento]}] {anteprima}"
    body = "\n".join([
        messaggio,
        "",
        "---",
        f"Da: {email}",
        f"Browser: {browser or '?'}",
    ])

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            BREVO_URL,
            headers={"api-key": BREVO_API_KEY},
            json={
                #il mittente resta quello verificato su Brevo: con l'indirizzo di
                #chi scrive Brevo rifiuterebbe l'invio. «Rispondi» va a lui
                "sender": {"email": SENDER_EMAIL, "name": "TrackIt — Scrivici"},
                "to": [{"email": SUPPORT_EMAIL}],
                "replyTo": {"email": email},
                "subject": subject,
                "textContent": body,
            },
        )
    response.raise_for_status()
