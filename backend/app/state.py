import os

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

#su Render va impostata a 1: in locale resta spenta, cosi' l'intestazione non e' falsificabile
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "").strip().lower() in ("1", "true", "yes")


def client_ip(request: Request) -> str:
    """IP reale del chiamante, per contare i limiti per utente e non per proxy.

    Dietro un proxy (Render, Cloudflare) get_remote_address restituisce sempre
    l'indirizzo del proxy: tutti gli utenti verrebbero contati come uno solo e
    si bloccherebbero a vicenda. Il proxy pero' allega l'IP di partenza in
    X-Forwarded-For, che e' quello che leggiamo qui.

    L'intestazione e' falsificabile da chiunque, quindi ci fidiamo solo quando
    sappiamo di stare dietro un proxy (TRUST_PROXY_HEADERS=1): in locale
    resta valido get_remote_address, altrimenti basterebbe dichiarare un IP
    inventato a ogni richiesta per non superare mai un limite.
    """
    if TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            #la catena e' "client, proxy1, proxy2": il primo e' il chiamante originale
            first = forwarded.split(",")[0].strip()
            if first:
                return first
    return get_remote_address(request)


def user_or_ip(request: Request) -> str:
    """Identita' per i limiti sugli endpoint autenticati che costano denaro.

    L'IP da solo non basta: dietro la stessa rete (casa, ufficio, rete mobile)
    utenti diversi condividerebbero il contatore, e un solo account potrebbe
    consumare la quota di tutti.

    La chiave e' l'id dell'account scritto nel token, non il token stesso: il
    token cambia ogni 15 minuti e ogni dispositivo ha il suo, quindi contando
    per token il limite ripartirebbe a ogni rinnovo e varrebbe per dispositivo.
    La firma va verificata: senza, chiunque potrebbe scriverci un id inventato.
    Un token non valido ricade sull'IP, come una richiesta senza login.
    """
    #importato qui: security legge la configurazione del database, che a chi
    #importa solo il limiter (main.py all'avvio) non serve ancora
    from app.business_logic.security import decode_access_token

    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        payload = decode_access_token(auth[7:].strip())
        #i token per reimpostare la password hanno "purpose": non sono un accesso
        if payload and payload.get("sub") and payload.get("purpose") is None:
            return f"utente:{payload['sub']}"
    return client_ip(request)


# Istanza unica condivisa tra main.py (che la registra sull'app) e i router
# (che la usano per decorare gli endpoint con @limiter.limit(...))
limiter = Limiter(key_func=client_ip)
