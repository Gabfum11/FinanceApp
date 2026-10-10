"""Lettura dell'estratto conto scaricato dalla banca.

Ogni banca dispone le colonne a modo suo: qui si riconoscono da sole data,
descrizione e importo, e si restituiscono i movimenti in una forma unica.
Niente rete e niente database: entrano byte, escono movimenti.
"""
import csv
import io
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta

import openpyxl
import xlrd

#numeri seriali di Excel plausibili per un estratto: dal 1982 al 2064
_SERIALE_MIN, _SERIALE_MAX = 30000, 60000
_DATA_NUMERICA = re.compile(r"(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2}|\d{4}))?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?")
_DATA_ISO = re.compile(r"(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?")
#lettera del verso attaccata all'importo: D dare (uscita), C credito o A avere (entrata)
_LETTERA_VERSO = re.compile(r"(.*?)\s*([DCA])")


def leggi_importo(valore) -> tuple[float, bool | None] | None:
    """Importo positivo e verso (True uscita, False entrata, None non detto)."""
    if valore is None or isinstance(valore, bool):
        return None
    if isinstance(valore, (int, float)):
        if valore == 0:
            return None
        return round(abs(float(valore)), 2), (True if valore < 0 else None)
    if not isinstance(valore, str):
        return None
    testo = valore.upper().replace("€", "").replace("EUR", "").replace(" ", " ").strip()
    verso = None
    lettera = _LETTERA_VERSO.fullmatch(testo)
    if lettera and lettera.group(1):
        testo, verso = lettera.group(1).strip(), lettera.group(2) == "D"
    negativo = testo.startswith("-") or testo.endswith("-") or (testo.startswith("(") and testo.endswith(")"))
    testo = testo.strip("-+() ").replace(" ", "")
    if not re.fullmatch(r"[\d.,]+", testo):
        return None
    #il separatore dei decimali e' l'ultimo dei due che compare
    if "," in testo and "." in testo:
        if testo.rfind(",") > testo.rfind("."):
            testo = testo.replace(".", "").replace(",", ".")
        else:
            testo = testo.replace(",", "")
    elif "," in testo:
        testo = testo.replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(\.\d{3})+", testo):
        #"1.500" in un estratto italiano sono millecinquecento, non uno e mezzo
        testo = testo.replace(".", "")
    try:
        numero = float(testo)
    except ValueError:
        return None
    if numero == 0:
        return None
    if verso is None and negativo:
        verso = True
    return round(numero, 2), verso


def leggi_data(valore, oggi: date) -> date | None:
    """La data di un movimento. Senza anno, l'ultimo che non la mette nel futuro."""
    if isinstance(valore, datetime):
        return valore.date()
    if isinstance(valore, date):
        return valore
    if isinstance(valore, (int, float)) and not isinstance(valore, bool):
        if _SERIALE_MIN <= valore <= _SERIALE_MAX:
            return date(1899, 12, 30) + timedelta(days=int(valore))
        return None
    if not isinstance(valore, str):
        return None
    testo = valore.strip()
    numerica = _DATA_NUMERICA.fullmatch(testo)
    if numerica:
        giorno, mese, anno = int(numerica.group(1)), int(numerica.group(2)), numerica.group(3)
        if anno:
            anno_pieno = 2000 + int(anno) if len(anno) == 2 else int(anno)
            return _data_o_none(anno_pieno, mese, giorno)
        trovata = _data_o_none(oggi.year, mese, giorno)
        if trovata and trovata > oggi:
            trovata = _data_o_none(oggi.year - 1, mese, giorno)
        return trovata
    iso = _DATA_ISO.fullmatch(testo)
    if iso:
        return _data_o_none(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))
    return None


def _data_o_none(anno: int, mese: int, giorno: int) -> date | None:
    try:
        return date(anno, mese, giorno)
    except ValueError:
        return None


MAX_BYTE = 2 * 1024 * 1024
MAX_RIGHE = 2000
#le banche mettono intestatario, periodo e saldo prima della tabella
RIGHE_INTESTAZIONE = 30
#sotto questa quota di righe leggibili il file non e' quello che pensiamo
QUOTA_MINIMA = 0.8
#tetti di lettura: un estratto vero ne usa molte meno
MAX_RIGHE_FOGLIO = MAX_RIGHE + RIGHE_INTESTAZIONE + 50
MAX_COLONNE = 50

#nomi delle colonne per ruolo, gia' normalizzati (minuscoli, senza punteggiatura).
#L'ordine conta: "data valuta" va ignorata prima che "data" la prenda
RUOLI = [
    ("ignora", ["data valuta", "valuta", "divisa", "currency", "saldo", "saldo contabile",
                "saldo disponibile", "balance"]),
    ("data", ["data operazione", "data contabile", "data registrazione", "data contabilizzazione",
              "data", "date", "giorno"]),
    ("uscite", ["addebiti", "addebito", "dare", "uscite", "uscita", "importo dare"]),
    ("entrate", ["accrediti", "accredito", "avere", "entrate", "entrata", "importo avere"]),
    ("verso", ["segno", "d/a", "dare/avere", "verso", "tipo movimento"]),
    ("importo", ["importo", "importo eur", "importo euro", "amount", "ammontare"]),
    ("descrizione", ["descrizione", "descrizione operazione", "descrizione operazioni",
                     "descrizione completa", "causale", "dettagli", "dettaglio", "operazione",
                     "esercente", "beneficiario", "description", "movimento"]),
]
_VERSO_USCITA = {"d", "-", "dare", "addebito", "uscita", "debit"}


class FileNonLeggibile(Exception):
    """Il file non si legge: motivo "non_riconosciuto" o "troppe_righe"."""

    def __init__(self, motivo: str):
        super().__init__(motivo)
        self.motivo = motivo


@dataclass
class Movimento:
    data: date
    testo: str
    #sempre positivo: il verso sta in "uscita"
    importo: float
    uscita: bool


def leggi_estratto(contenuto: bytes, oggi: date) -> list[Movimento]:
    """I movimenti del file, nell'ordine in cui compaiono."""
    celle = celle_da_file(contenuto)
    indice, colonne = _trova_intestazione(celle)
    righe = _righe_dati(celle[indice + 1:], colonne, oggi)
    colonne = _verifica_colonne(righe, colonne, oggi)

    positivi_uscite = _positivi_sono_uscite(righe, colonne)
    movimenti = [m for m in (_movimento(r, colonne, oggi, positivi_uscite) for r in righe) if m]
    #le righe senza data (note in fondo, avvertenze) non sono movimenti mancati
    con_data = sum(1 for r in righe if leggi_data(_cella(r, colonne["data"][0]), oggi) is not None)
    if not movimenti or len(movimenti) < QUOTA_MINIMA * con_data:
        raise FileNonLeggibile("non_riconosciuto")
    if len(movimenti) > MAX_RIGHE:
        raise FileNonLeggibile("troppe_righe")
    return movimenti


# --- dal file alle celle ------------------------------------------------------

def celle_da_file(contenuto: bytes) -> list[list]:
    """Le celle del foglio piu' pieno, riga per riga. Il tipo si capisce dai byte."""
    if contenuto[:2] == b"PK":
        return _celle_xlsx(contenuto)
    if contenuto[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        return _celle_xls(contenuto)
    return _celle_csv(contenuto)


def _celle_xlsx(contenuto: bytes) -> list[list]:
    #un .xlsx e' compresso: 2 MB possono diventare milioni di celle. Si legge
    #a righe, con un tetto, senza mai caricare il foglio intero
    try:
        libro = openpyxl.load_workbook(io.BytesIO(contenuto), read_only=True, data_only=True)
        fogli = []
        for foglio in libro.worksheets:
            righe = []
            #alcune banche (Postepay) dichiarano il foglio grande A1:A1: senza
            #questo si leggerebbe solo la prima riga. Il tetto sotto resta
            foglio.reset_dimensions()
            for riga in foglio.iter_rows(max_col=MAX_COLONNE, values_only=True):
                if len(righe) >= MAX_RIGHE_FOGLIO:
                    raise FileNonLeggibile("troppe_righe")
                righe.append(list(riga))
            fogli.append(righe)
        libro.close()
    except FileNonLeggibile:
        raise
    except Exception as errore:
        raise FileNonLeggibile("non_riconosciuto") from errore
    return _foglio_piu_pieno(fogli)


def _celle_xls(contenuto: bytes) -> list[list]:
    try:
        libro = xlrd.open_workbook(file_contents=contenuto)
        fogli = []
        for foglio in libro.sheets():
            if foglio.nrows > MAX_RIGHE_FOGLIO:
                raise FileNonLeggibile("troppe_righe")
            righe = []
            for r in range(foglio.nrows):
                riga = []
                for cella in foglio.row(r)[:MAX_COLONNE]:
                    if cella.ctype == xlrd.XL_CELL_DATE:
                        riga.append(xlrd.xldate_as_datetime(cella.value, libro.datemode))
                    elif cella.ctype == xlrd.XL_CELL_EMPTY:
                        riga.append(None)
                    else:
                        riga.append(cella.value)
                righe.append(riga)
            fogli.append(righe)
    except FileNonLeggibile:
        raise
    except Exception as errore:
        #anche una data seriale fuori scala: il file non e' quello che pensiamo
        raise FileNonLeggibile("non_riconosciuto") from errore
    return _foglio_piu_pieno(fogli)


def _celle_csv(contenuto: bytes) -> list[list]:
    testo = None
    for codifica in ("utf-8-sig", "cp1252"):
        try:
            testo = contenuto.decode(codifica)
            break
        except UnicodeDecodeError:
            continue
    if not testo or "\x00" in testo:
        raise FileNonLeggibile("non_riconosciuto")
    righe = testo.splitlines()
    campione = "\n".join(righe[:40])
    separatore = max([";", ",", "\t"], key=campione.count)
    if campione.count(separatore) == 0:
        raise FileNonLeggibile("non_riconosciuto")
    if len(righe) > MAX_RIGHE_FOGLIO:
        raise FileNonLeggibile("troppe_righe")
    try:
        return [[valore if valore.strip() else None for valore in riga[:MAX_COLONNE]]
                for riga in csv.reader(righe, delimiter=separatore)]
    except csv.Error as errore:
        #virgolette aperte e mai chiuse: un campo che inghiotte il resto del file
        raise FileNonLeggibile("non_riconosciuto") from errore


def _foglio_piu_pieno(fogli: list[list[list]]) -> list[list]:
    #il foglio con piu' righe di almeno tre celle: gli altri sono copertine o grafici
    if not fogli:
        raise FileNonLeggibile("non_riconosciuto")
    return max(fogli, key=lambda righe: sum(1 for r in righe if sum(v is not None for v in r) >= 3))


# --- intestazione e colonne ---------------------------------------------------

def _testo(valore) -> str:
    return "" if valore is None else str(valore).strip()


def _normalizza(valore) -> str:
    #"Data_Operazione" e "DATA OPERAZIONE:" diventano "data operazione"
    return " ".join(re.sub(r"[^a-z0-9àèéìòù/]+", " ", _testo(valore).lower()).split())


def _ruolo(intestazione: str) -> str | None:
    for ruolo, nomi in RUOLI:
        if intestazione in nomi:
            return ruolo
    if intestazione.startswith("data") and "valuta" not in intestazione:
        return "data"
    if intestazione.startswith("descrizione"):
        return "descrizione"
    if intestazione.startswith("importo"):
        return "importo"
    return None


def _trova_intestazione(celle: list[list]) -> tuple[int, dict[str, list[int]]]:
    for indice, riga in enumerate(celle[:RIGHE_INTESTAZIONE]):
        colonne: dict[str, list[int]] = {}
        for posizione, valore in enumerate(riga):
            ruolo = _ruolo(_normalizza(valore))
            if ruolo:
                colonne.setdefault(ruolo, []).append(posizione)
        if "data" in colonne and "descrizione" in colonne and ("importo" in colonne or "uscite" in colonne):
            return indice, colonne
    raise FileNonLeggibile("non_riconosciuto")


def _cella(riga: list, posizione: int):
    return riga[posizione] if posizione < len(riga) else None


def _righe_dati(righe: list[list], colonne: dict[str, list[int]], oggi: date) -> list[list]:
    """Le righe della tabella: si salta il vuoto, ci si ferma a saldo o totale finale."""
    dati = []
    data_colonna = colonne["data"][0]
    for riga in righe:
        if all(_testo(v) == "" for v in riga):
            continue
        #"Saldo finale" chiude la tabella, ma solo se la riga non ha una data:
        #"ADDEBITO SALDO CARTA DI CREDITO" del 10/09 e' un movimento come gli altri.
        #Prima del primo movimento c'e' il saldo iniziale, che si salta
        if leggi_data(_cella(riga, data_colonna), oggi) is None and any(
            _normalizza(v).startswith(("saldo", "totale")) for v in riga
        ):
            if dati:
                break
            continue
        dati.append(riga)
    return dati


def _quota(righe: list[list], posizione: int, leggi) -> float:
    piene = [_cella(r, posizione) for r in righe if _testo(_cella(r, posizione))]
    if not piene:
        return 0.0
    return sum(1 for v in piene if leggi(v) is not None) / len(piene)


def _verifica_colonne(righe: list[list], colonne: dict[str, list[int]], oggi: date) -> dict[str, list[int]]:
    """Il nome della colonna puo' mentire: se il contenuto non torna, vince il contenuto."""
    if not righe:
        raise FileNonLeggibile("non_riconosciuto")
    larghezza = max(len(r) for r in righe)
    occupate = {p for posizioni in colonne.values() for p in posizioni}

    def per_data(v):
        return leggi_data(v, oggi)

    buone = [p for p in colonne["data"] if _quota(righe, p, per_data) >= QUOTA_MINIMA]
    if not buone:
        buone = [p for p in range(larghezza) if p not in occupate and _quota(righe, p, per_data) >= QUOTA_MINIMA]
    if not buone:
        raise FileNonLeggibile("non_riconosciuto")
    colonne = {**colonne, "data": buone[:1]}

    if "importo" in colonne and "uscite" not in colonne:
        buone = [p for p in colonne["importo"] if _quota(righe, p, leggi_importo) >= QUOTA_MINIMA]
        if not buone:
            buone = [p for p in range(larghezza)
                     if p not in occupate and _quota(righe, p, leggi_importo) >= QUOTA_MINIMA]
        if not buone:
            raise FileNonLeggibile("non_riconosciuto")
        colonne["importo"] = buone[:1]
    return colonne


def _positivi_sono_uscite(righe: list[list], colonne: dict[str, list[int]]) -> bool:
    """Una sola colonna Importo, quasi tutta positiva: l'elenco delle spese di una carta.

    Li' i numeri positivi sono le spese e i pochi negativi i rimborsi. In un
    conto corrente e' il contrario: le uscite, negative, sono la maggioranza.
    """
    if "uscite" in colonne or "verso" in colonne or "importo" not in colonne:
        return False
    positivi = negativi = 0
    for riga in righe:
        letto = leggi_importo(_cella(riga, colonne["importo"][0]))
        if not letto:
            continue
        if letto[1] is False:
            #una lettera C/A dice gia' il verso di ogni riga
            return False
        if letto[1] is None:
            positivi += 1
        else:
            negativi += 1
    return positivi > negativi


def _movimento(riga: list, colonne: dict[str, list[int]], oggi: date, positivi_uscite: bool) -> Movimento | None:
    data = leggi_data(_cella(riga, colonne["data"][0]), oggi)
    testo = " ".join(_testo(_cella(riga, p)) for p in colonne["descrizione"] if _testo(_cella(riga, p)))
    if data is None or not testo:
        return None
    if "uscite" in colonne:
        uscita = leggi_importo(_cella(riga, colonne["uscite"][0]))
        entrata = leggi_importo(_cella(riga, colonne["entrate"][0])) if "entrate" in colonne else None
        if uscita:
            return Movimento(data, testo, uscita[0], True)
        if entrata:
            return Movimento(data, testo, entrata[0], False)
        return None
    letto = leggi_importo(_cella(riga, colonne["importo"][0]))
    if letto is None:
        return None
    importo, verso = letto
    if positivi_uscite:
        #carta di credito: positivo = spesa, negativo = rimborso
        return Movimento(data, testo, importo, verso is None)
    if verso is None and "verso" in colonne:
        verso = _normalizza(_cella(riga, colonne["verso"][0])) in _VERSO_USCITA
    if verso is None:
        verso = False
    return Movimento(data, testo, importo, verso)
