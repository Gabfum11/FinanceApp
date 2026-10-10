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
#da queste parole in poi la banca scrive codici: mandato, riferimento, IBAN
_RIFERIMENTI = re.compile(r"\b(?:CID|MANDATO|RIF|RIFERIMENTO|IBAN|CRO|TRN|COD|CODICE|ID\s+ADDEBITO)\b.*$")

#marchi noti: il nome giusto vince su qualunque pulizia
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
    (re.compile(r"\bMCDONALD"), "McDonald's"),
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
             "OPERAZIONE", "DEL", "ORE", "EUR", "PRESSO", "C/O", "TRAMITE", "ESERCENTE", "STORNO"}
#e in coda
_SUFFISSI = {"CARTA", "EUR", "ORE", "DEL"}
_BONIFICO_TESTA = re.compile(
    r"^.*?(?:\bBONIFIC\w*|\bBONIF\b\.?|\bBON\.|\bSCT\b|\bSEPA\s+CREDIT\s+TRANSFER\b"
    r"|\bCREDIT\s+TRANSFER\b|\bDISPOSIZIONE\b)"
    r"(?:\s+(?:SEPA|ISTANTANEO|ESTERO|DISPOSTO|TO|A\s+FAVORE\s+DI|A\s+FAVORE|A|PER|VERSO|BENEFICIARIO))*\s*"
)


def tipo_movimento(testo: str) -> str:
    maiuscolo = " ".join(testo.upper().split())
    if _NON_SPESA.search(maiuscolo):
        return NON_SPESA
    if _BONIFICO.search(maiuscolo) or _PERSONA.search(maiuscolo):
        return BONIFICO
    return PAGAMENTO


def _codice(parola: str) -> bool:
    """Numeri di carta, mandati, riferimenti: tre cifre, o una cifra in una parola lunga."""
    cifre = sum(c.isdigit() for c in parola)
    return cifre >= 3 or (cifre > 0 and len(parola) >= 6)


def pulisci_nome(testo: str) -> str:
    maiuscolo = " ".join(testo.upper().split())
    for regola, nome in ALIAS:
        if regola.search(maiuscolo):
            return nome
    pulito = _INTERMEDIARI.sub(" ", _RIFERIMENTI.sub("", maiuscolo))
    #l'ordine conta: prima le date ("08.09.26"), poi orari e importi
    for regola in (_DATE, _ORARI, _IMPORTI, _CARTE, _NUMERI):
        pulito = regola.sub(" ", pulito)
    if _BONIFICO.search(pulito):
        resto = " ".join(p for p in _BONIFICO_TESTA.sub("", pulito).split() if not _codice(p))
        return f"Bonifico a {_maiuscole(resto)}" if resto else "Bonifico"
    parole = [p for p in pulito.split() if re.search(r"\w", p) and not _codice(p)]
    while parole and parole[0] in _PREFISSI:
        parole.pop(0)
    while parole and parole[-1] in _SUFFISSI:
        parole.pop()
    if not parole:
        return _maiuscole(" ".join(testo.split()))[:60]
    return _maiuscole(" ".join(parole))


def chiave_esercente(nome: str) -> str:
    return " ".join(nome.lower().split())


def _maiuscole(testo: str) -> str:
    return " ".join(parola.capitalize() for parola in testo.split())
