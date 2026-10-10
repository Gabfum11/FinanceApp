"""Le righe importate confrontate con quello che TrackIt sa gia'.

Nell'ordine: spese create dagli abbonamenti, spese gia' inserite, rimborsi
arrivati nello stesso file. Ogni spesa esistente copre al massimo una riga:
due pieni da 55 euro nel file e uno solo in TrackIt lasciano dentro l'altro.
"""
from dataclasses import dataclass
from datetime import date

CATEGORIA = "categoria"
RIMBORSO_PARZIALE = "rimborso_parziale"
RIMBORSO_TOTALE = "rimborso_totale"
DOPPIONE = "doppione"
ABBONAMENTO = "abbonamento"
NON_SPESA = "non_spesa"

GIORNI_ABBONAMENTO = 3
GIORNI_DOPPIONE = 1
GIORNI_RIMBORSO = 60
#il cambio della banca non e' mai identico al nostro
TOLLERANZA_VALUTA = 0.05


@dataclass
class RigaImport:
    indice: int
    data: date
    testo: str
    esercente: str
    tipo: str
    nome: str
    importo: float
    categoria_id: int | None = None
    messaggio: str | None = None
    selezionata: bool = True
    importo_originale: float | None = None
    rimborso_data: date | None = None
    rimborso_importo: float | None = None


@dataclass
class Entrata:
    data: date
    esercente: str
    importo: float


def _stesso_importo(a: float, b: float) -> bool:
    return abs(round(a, 2) - round(b, 2)) < 0.005


def _abbonamento(spesa, riga: RigaImport) -> bool:
    if spesa.subscription_id is None or abs((spesa.date - riga.data).days) > GIORNI_ABBONAMENTO:
        return False
    if _stesso_importo(spesa.amount, riga.importo):
        return True
    return bool(spesa.original_currency) and abs(spesa.amount - riga.importo) <= TOLLERANZA_VALUTA * spesa.amount


def _doppione(spesa, riga: RigaImport) -> bool:
    return _stesso_importo(spesa.amount, riga.importo) and abs((spesa.date - riga.data).days) <= GIORNI_DOPPIONE


def _piu_vicina(esistenti, usate: set, riga: RigaImport, regola):
    candidate = [s for s in esistenti if s.id not in usate and regola(s, riga)]
    return min(candidate, key=lambda s: abs((s.date - riga.data).days), default=None)


def confronta(righe: list[RigaImport], entrate: list[Entrata], esistenti: list) -> None:
    usate: set = set()
    for riga in sorted(righe, key=lambda r: (r.data, r.indice)):
        if riga.messaggio is not None:
            continue
        for regola, messaggio in ((_abbonamento, ABBONAMENTO), (_doppione, DOPPIONE)):
            trovata = _piu_vicina(esistenti, usate, riga, regola)
            if trovata:
                usate.add(trovata.id)
                riga.messaggio, riga.selezionata = messaggio, False
                break

    for entrata in sorted(entrate, key=lambda e: e.data):
        candidate = [
            r for r in righe
            if r.messaggio in (None, RIMBORSO_PARZIALE)
            and r.esercente == entrata.esercente
            and 0 <= (entrata.data - r.data).days <= GIORNI_RIMBORSO
            and r.importo >= entrata.importo - 0.005
        ]
        if not candidate:
            continue
        riga = max(candidate, key=lambda r: (r.data, r.indice))
        if riga.importo_originale is None:
            riga.importo_originale = riga.importo
        riga.rimborso_data = entrata.data
        riga.rimborso_importo = round((riga.rimborso_importo or 0) + entrata.importo, 2)
        riga.importo = round(riga.importo - entrata.importo, 2)
        if riga.importo < 0.005:
            #si mostra il prezzo pagato, barrato dalla casella vuota
            riga.importo, riga.importo_originale = riga.importo_originale, None
            riga.messaggio, riga.selezionata = RIMBORSO_TOTALE, False
        else:
            riga.messaggio = RIMBORSO_PARZIALE
