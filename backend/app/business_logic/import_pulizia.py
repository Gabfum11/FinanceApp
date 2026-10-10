"""Dal testo della banca a un nome leggibile, senza AI.

"POS 4521 03/09/26 15:42 GAMMA SRL MILANO CARTA *1234" contiene numero di
carta, data e ora: vanno tolti qui, prima che il nome arrivi all'AI.
"""
import re

PAGAMENTO = "pagamento"
BONIFICO = "bonifico"
NON_SPESA = "non_spesa"

#movimenti che spostano soldi senza essere spese: contarli farebbe doppio
#conto (il saldo della carta) o registrerebbe contanti ancora da spendere
_NON_SPESA = re.compile(
    r"\bPRELIEV|\bPRELEVAMENTO\b|\bGIROCONTO\b|\bGIROFONDI\b"
    r"|\bRICARICA\s+(?:CARTA|POSTEPAY|PREPAGATA|CONTO)\b"
    r"|\bSALDO\b.*\bCARTA\b|\bESTRATTO\s+CONTO\s+CARTA\b"
    #"Saldo finale" con la sua data in fondo all'elenco: e' un saldo, non una spesa
    r"|^\s*SALDO\b"
)
#ogni modo in cui le banche scrivono un bonifico: dentro c'e' quasi sempre una persona
_BONIFICO = re.compile(r"\bBONIFIC|\bBONIF\b|\bBON\.|\bSCT\b|\bCREDIT\s+TRANSFER\b|\bDISPOSIZIONE\b")
#Satispay e PayPal servono anche a pagare persone: "SATISPAY*MARIO ROSSI" e'
#un nome e un cognome, che non deve finire all'AI. Un negozio di due parole
#("SATISPAY*PANIFICIO ROSSI") finisce qui per prudenza: la categoria la sceglie l'utente
_PERSONA = re.compile(r"\b(?:SATISPAY|PAYPAL)\s*\*\s*[A-Z]+\s+[A-Z]+\s*$")
#P2P di Postepay: soldi mandati a una persona dall'app, come un bonifico
_P2P = re.compile(r"\bP2P\b")
#\b dopo la parola: "A ANDREA" non deve perdere la A di Andrea
_P2P_TESTA = re.compile(r"^.*?\bP2P\b(?:\s+(?:A|VERSO)\b)*\s*")
_PERSONA_TESTA = re.compile(r"^.*?\b(SATISPAY|PAYPAL)\s*\*?\s*")
_COMMISSIONI = re.compile(r"^\s*COMMISSIONI\b")
#il motivo di un pagamento a una persona: "... A VERDI ANGELO PER regalo"
_PER = re.compile(r"\s+PER\s+")
#"TRN BPPIITRRXXX": il BIC dopo il codice dell'operazione e' fatto di sole
#lettere, quindi _codice non lo riconosce
_TRN_BIC = re.compile(r"\bTRN\s+[A-Z0-9]{8}(?:[A-Z0-9]{3})?\b")
#da queste parole in poi la banca scrive codici: mandato, riferimento, IBAN
_RIFERIMENTI = re.compile(r"\b(?:CID|MANDATO|RIF|RIFERIMENTO|IBAN|CRO|TRN|COD|CODICE|ID\s+ADDEBITO)\b.*$")
#nella descrizione lunga si toglie solo la parola: il codice che segue lo
#scarta _codice, la causale di un bonifico dopo il riferimento resta
_PAROLE_RIFERIMENTO = re.compile(r"\b(?:CID|MANDATO|RIF|RIFERIMENTO|IBAN|CRO|TRN|COD|CODICE|ID\s+ADDEBITO)\b\.?:?")
#"NETFLIX.COM", "AMAZON.IT": il dominio non aggiunge niente al nome
_DOMINI = re.compile(r"\.(?:COM|IT|EU|NET|ORG)\b")
#"GOOGLE *YOUTUBE", "APPLE.COM/BILL": separatori tra due parole
_SEPARATORI = re.compile(r"[*/]")

#portafogli del telefono: dicono come si e' pagato, non dove. Vanno tolti
#prima dei marchi, se no "GOOGLE PAY SHAKE UP" diventerebbe "Google"
_PORTAFOGLI = re.compile(r"\b(?:GOOGLE\s*PAY|G\s*PAY|APPLE\s*PAY|SAMSUNG\s*PAY)\b")

#marchi noti, scritti come li scrive il marchio. Nella chiave del negozio
#il marchio vince su tutto; nella descrizione prende solo il suo posto
ALIAS = [
    (re.compile(r"\bAMZN\b|\bAMAZON\b"), "Amazon"),
    (re.compile(r"\bEBAY\b"), "eBay"),
    (re.compile(r"\bNETFLIX\b"), "Netflix"),
    (re.compile(r"\bSPOTIFY\b"), "Spotify"),
    (re.compile(r"\bDISNEY\s*PLUS\b|\bDISNEYPLUS\b"), "Disney+"),
    (re.compile(r"\bUBER\s*EATS\b"), "Uber Eats"),
    (re.compile(r"\bUBER\b"), "Uber"),
    (re.compile(r"\bAPPLE\.COM\b|\bITUNES\b"), "Apple"),
    (re.compile(r"\bGOOGLE\b"), "Google"),
    (re.compile(r"\bMC\s*DONALD\w*(?:'S)?"), "McDonald's"),
    (re.compile(r"\bESSELUNGA\b"), "Esselunga"),
    (re.compile(r"\bTRENITALIA\b"), "Trenitalia"),
    (re.compile(r"\bITALO\b"), "Italo"),
    (re.compile(r"\bRYANAIR\b"), "Ryanair"),
    (re.compile(r"\bTELEPASS\b"), "Telepass"),
]

#intermediari di pagamento: l'esercente vero e' dopo l'asterisco
_INTERMEDIARI = re.compile(r"\b(?:SUMUP|SUM\s+UP|NEXI|SATISPAY|PAYPAL|I?ZETTLE|SQ|STRIPE)\s*\*\s*")
_DATE = re.compile(r"\b\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?\b")
_ORARI = re.compile(r"\b\d{1,2}[:.]\d{2}\b")
_IMPORTI = re.compile(r"\b\d+[,.]\d{2}\b\s*(?:EUR|€)?")
_CARTE = re.compile(r"\bCARTA\s*\*+\s*\d+|\*+\d{3,}")
_NUMERI = re.compile(r"\b\d{3,}\b")
#parole della banca, non dell'esercente: si tolgono in testa
_PREFISSI = {"PAGAMENTO", "PAG", "POS", "CARTA", "WEB", "ADDEBITO", "SDD", "DIRETTO", "ACQUISTO",
             "OPERAZIONE", "DEL", "ORE", "EUR", "PRESSO", "C/O", "TRAMITE", "ESERCENTE", "STORNO",
             "E-COMMERCE", "ECOMMERCE"}
#e in coda
#"OP.": Postepay chiude ogni riga con "Op. 673184", il numero dell'operazione
_SUFFISSI = {"CARTA", "EUR", "ORE", "DEL", "OP", "OP."}
_BONIFICO_TESTA = re.compile(
    r"^.*?(?:\bBONIFIC\w*|\bBONIF\b\.?|\bBON\.|\bSCT\b|\bSEPA\s+CREDIT\s+TRANSFER\b"
    r"|\bCREDIT\s+TRANSFER\b|\bDISPOSIZIONE\b)"
    r"(?:\s+(?:SEPA|ISTANTANEO|ESTERO|DISPOSTO|TO|A\s+FAVORE\s+DI|A\s+FAVORE|A|PER|VERSO|BENEFICIARIO)\b)*\s*"
)


def tipo_movimento(testo: str) -> str:
    maiuscolo = " ".join(testo.upper().split())
    if _NON_SPESA.search(maiuscolo):
        return NON_SPESA
    if _BONIFICO.search(maiuscolo) or _PERSONA.search(maiuscolo) or _P2P.search(maiuscolo):
        return BONIFICO
    return PAGAMENTO


def _codice(parola: str) -> bool:
    """Numeri di carta, mandati, riferimenti: tre cifre, o una cifra in una parola lunga."""
    cifre = sum(c.isdigit() for c in parola)
    return cifre >= 3 or (cifre > 0 and len(parola) >= 6)


def pulisci_nome(testo: str) -> str:
    """La descrizione della spesa: il testo della banca senza codici, date,
    importi e parole della banca. Resta tutto quello che fa ricordare l'acquisto."""
    return _pulisci(testo, corto=False)


def esercente(testo: str) -> str:
    """Chiave del negozio, uguale da un acquisto all'altro: la usano memoria,
    rimborsi e "le altre spese di". Qui il marchio noto vince sul resto."""
    return chiave_esercente(_pulisci(testo, corto=True))


def motivo(testo: str) -> str | None:
    """Per cosa sono stati mandati i soldi a una persona ("per cocktail").

    E' l'unica parte di un bonifico che puo' andare all'AI: dice la categoria
    senza il nome di chi li ha ricevuti. None per i negozi e senza motivo.
    """
    if tipo_movimento(testo) != BONIFICO:
        return None
    maiuscolo = " ".join(_TRN_BIC.sub(" ", testo.upper()).split())
    parti = _PER.split(maiuscolo, maxsplit=1)
    if len(parti) < 2:
        return None
    parole = _parole_pulite(parti[1])
    while parole and parole[-1] in _SUFFISSI:
        parole.pop()
    return " ".join(parole).lower() or None


def _parole_pulite(testo: str) -> list[str]:
    pulito = _PAROLE_RIFERIMENTO.sub(" ", testo)
    for regola in (_DATE, _ORARI, _IMPORTI, _CARTE, _NUMERI):
        pulito = regola.sub(" ", pulito)
    return [p for p in pulito.split() if re.search(r"\w", p) and not _codice(p)]


def _a_persona(maiuscolo: str, corto: bool) -> str:
    """"Bonifico a Verdi Angelo per regalo": il canale, la persona e il motivo.

    Nella chiave il motivo non c'e': cambia ogni volta, la persona no.
    """
    #prima via i codici: tra "ISTANTANEO" e "A VERDI" c'e' il numero dell'operazione
    testa = " ".join(_parole_pulite(_PER.split(_TRN_BIC.sub(" ", maiuscolo), maxsplit=1)[0]))
    if _P2P.search(testa):
        canale, persona = "P2P", _P2P_TESTA.sub("", testa)
    elif _BONIFICO.search(testa):
        canale, persona = "bonifico", _BONIFICO_TESTA.sub("", testa)
    else:
        trovato = _PERSONA_TESTA.search(testa)
        canale = "Satispay" if trovato and trovato.group(1) == "SATISPAY" else "PayPal"
        persona = _PERSONA_TESTA.sub("", testa)
    if _COMMISSIONI.match(testa):
        canale = f"Commissioni {canale}"
    canale = canale[0].upper() + canale[1:]
    persona = _maiuscole(persona)
    nome = f"{canale} a {persona}" if persona else canale
    perche = None if corto else motivo(maiuscolo)
    return f"{nome} per {perche}" if perche else nome


def _pulisci(testo: str, corto: bool) -> str:
    maiuscolo = " ".join(_PORTAFOGLI.sub(" ", testo.upper()).split())
    if tipo_movimento(maiuscolo) == BONIFICO:
        return _a_persona(maiuscolo, corto)
    if corto:
        for regola, nome in ALIAS:
            if regola.search(maiuscolo):
                return nome
        pulito = _RIFERIMENTI.sub("", maiuscolo)
    else:
        pulito = _PAROLE_RIFERIMENTO.sub(" ", maiuscolo)
    pulito = _INTERMEDIARI.sub(" ", pulito)
    #l'ordine conta: prima le date ("08.09.26"), poi orari e importi
    for regola in (_DATE, _ORARI, _IMPORTI, _CARTE, _NUMERI):
        pulito = regola.sub(" ", pulito)
    parole = [p for p in pulito.split() if not _codice(p)]
    if not corto:
        #i codici sono gia' fuori: "IT*2K3" e' sparito intero prima di dividerlo
        unito = _SEPARATORI.sub(" ", " ".join(parole))
        for regola, nome in ALIAS:
            unito = regola.sub(nome, unito)
        parole = _DOMINI.sub("", unito).split()
    parole = [p for p in parole if re.search(r"\w", p)]
    while parole and parole[0] in _PREFISSI:
        parole.pop(0)
    #"SHAKE UP 3": un numero corto in coda e' il punto vendita, non il nome
    while parole and (parole[-1] in _SUFFISSI or (parole[-1].isdigit() and len(parole) > 1)):
        parole.pop()
    if not parole:
        return _maiuscole(" ".join(testo.split()))[:60]
    return _maiuscole(" ".join(parole))


def chiave_esercente(nome: str) -> str:
    return " ".join(nome.lower().split())


def _maiuscole(testo: str) -> str:
    #solo le parole tutte maiuscole: "eBay" e "McDonald's" restano come sono
    return " ".join(_maiuscola(parola) if parola.isupper() else parola for parola in testo.split())


def _maiuscola(parola: str) -> str:
    #"D'ANGELO" -> "D'Angelo", non "D'angelo"
    return "'".join(pezzo.capitalize() for pezzo in parola.split("'"))
