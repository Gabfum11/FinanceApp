import os

import httpx

# Gli ID client ammessi: uno per piattaforma. Android e web (Expo Go) sono
# stringhe diverse, quindi il token va confrontato con tutte quelle configurate.
GOOGLE_CLIENT_IDS = [
    cid.strip()
    for cid in os.getenv("GOOGLE_CLIENT_IDS", "").split(",")
    if cid.strip()
]

GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")
TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class GoogleAuthError(Exception):
    """Il token non e' valido o non appartiene a questa app."""


def verify_google_token(id_token: str) -> dict:
    """Valida l'id_token presso Google e ne restituisce i dati dell'utente.

    Il token arriva dal client, quindi non e' affidabile finche' Google non
    conferma di averlo emesso: chiunque potrebbe inviarne uno costruito a mano.
    """
    if not GOOGLE_CLIENT_IDS:
        raise GoogleAuthError("Login con Google non configurato")

    try:
        response = httpx.get(TOKENINFO_URL, params={"id_token": id_token}, timeout=10)
    except httpx.HTTPError:
        raise GoogleAuthError("Verifica del token non riuscita")

    if response.status_code != 200:
        raise GoogleAuthError("Token non valido")

    payload = response.json()

    #aud dice per quale app il token e' stato emesso: senza questo controllo
    #andrebbe bene un token rilasciato a un'applicazione qualsiasi
    if payload.get("aud") not in GOOGLE_CLIENT_IDS:
        raise GoogleAuthError("Token non valido")

    if payload.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleAuthError("Token non valido")

    #Google marca le email non confermate: non possiamo fidarci per collegare un account
    if payload.get("email_verified") not in (True, "true"):
        raise GoogleAuthError("Email Google non verificata")

    email = (payload.get("email") or "").strip().lower()
    sub = payload.get("sub")
    if not email or not sub:
        raise GoogleAuthError("Token non valido")

    return {
        "google_id": sub,
        "email": email,
        "name": (payload.get("name") or "").strip() or email.split("@")[0],
    }
