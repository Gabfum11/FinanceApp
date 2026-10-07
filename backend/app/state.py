import os

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

#su Render va impostata a 1: in locale resta spenta, cosi' l'intestazione non e' falsificabile
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "").strip().lower() in ("1", "true", "yes")
#quanti proxy fidati aggiungono un indirizzo in coda a X-Forwarded-For. Su Render
#va impostata a 3: la catena arriva come "client, Cloudflare, bilanciatore di
#Render", e tutto quello che sta prima del client lo ha scritto il chiamante
TRUSTED_PROXY_HOPS = max(1, int(os.getenv("TRUSTED_PROXY_HOPS", "1")))


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

    Anche dietro il proxy l'inizio della catena e' falsificabile: il client
    puo' inviare un suo X-Forwarded-For e il proxy aggiunge in coda l'indirizzo
    vero, senza cancellare il resto. Si legge quindi da destra: le voci scritte
    dai proxy fidati sono le uniche che il chiamante non controlla.
    """
    if TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For", "")
        catena = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        #meno voci dei proxy attesi: la catena non e' quella che conosciamo,
        #meglio contare tutti come il proxy che fidarsi di un valore inventato
        if len(catena) >= TRUSTED_PROXY_HOPS:
            return catena[-TRUSTED_PROXY_HOPS]
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


#tetto complessivo delle richieste a Groq, condiviso da tutti gli endpoint che
#lo chiamano. Il piano gratuito concede ~8000 token al minuto: con un prompt da
#~940 token sono circa 8 richieste
GROQ_AL_MINUTO = "8/minute"
GROQ_AMBITO = "groq-globale"


def chiave_groq_globale(request: Request) -> str:
    #la stessa per tutti: e' un contatore unico, non per utente
    return GROQ_AMBITO


def consuma_quota_groq() -> bool:
    """Conta una richiesta a Groq in piu' sul tetto globale. False = tetto raggiunto.

    Il decoratore conta una richiesta per chiamata all'endpoint, ma una domanda
    sulle spese puo' interrogare Groq piu' volte: le successive passano di qui.
    Gli argomenti ricalcano quelli con cui slowapi conta un shared_limit
    (prefisso, chiave, ambito), cosi' i due conteggi finiscono nello stesso
    contatore; test_assistente verifica che sia davvero cosi'.
    """
    if not limiter.enabled:
        return True
    from limits import parse

    identificativi = [chiave_groq_globale(None), GROQ_AMBITO]
    if limiter._key_prefix:
        identificativi = [limiter._key_prefix] + identificativi
    return limiter.limiter.hit(parse(GROQ_AL_MINUTO), *identificativi)
