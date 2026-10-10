"""Abbonamenti, doppioni e rimborsi nelle righe importate."""
from datetime import date
from types import SimpleNamespace

from app.business_logic.import_confronto import (
    ABBONAMENTO, DOPPIONE, FORSE_DOPPIONE, RIMBORSO_PARZIALE, RIMBORSO_TOTALE, Entrata, RigaImport, confronta,
)


def riga(indice, giorno, importo, esercente="conad"):
    return RigaImport(indice=indice, data=date(2026, 9, giorno), testo=esercente.upper(),
                      esercente=esercente, tipo="pagamento", nome=esercente.title(), importo=importo)


def spesa(id, giorno, importo, subscription_id=None, original_currency=None, descrizione="Spesa"):
    return SimpleNamespace(id=id, date=date(2026, 9, giorno), amount=importo, description=descrizione,
                           subscription_id=subscription_id, original_currency=original_currency)


def test_abbonamento_entro_tre_giorni():
    r = riga(0, 12, 13.99, "netflix")
    confronta([r], [], [spesa(1, 9, 13.99, subscription_id=7)])
    assert (r.messaggio, r.selezionata) == (ABBONAMENTO, False)


def test_abbonamento_troppo_lontano_non_conta():
    r = riga(0, 13, 13.99, "netflix")
    confronta([r], [], [spesa(1, 9, 13.99, subscription_id=7)])
    assert r.messaggio is None


def test_abbonamento_in_altra_valuta_tollera_il_cinque_per_cento():
    r = riga(0, 9, 10.40, "chatgpt")
    confronta([r], [], [spesa(1, 9, 10.0, subscription_id=7, original_currency="USD")])
    assert r.messaggio == ABBONAMENTO


def test_doppione_entro_un_giorno():
    r = riga(0, 9, 55.0, "q8")
    confronta([r], [], [spesa(1, 8, 55.0)])
    assert (r.messaggio, r.selezionata) == (DOPPIONE, False)


def test_importo_diverso_non_e_doppione_sicuro():
    r = riga(0, 8, 55.01, "q8")
    confronta([r], [], [spesa(1, 8, 55.0)])
    assert r.messaggio == FORSE_DOPPIONE


def test_ogni_spesa_copre_una_sola_riga():
    #due pieni da 55 nel file, uno solo gia' inserito: l'altro e' nuovo
    prima, seconda = riga(0, 8, 55.0, "q8"), riga(1, 8, 55.0, "q8")
    confronta([prima, seconda], [], [spesa(1, 8, 55.0)])
    assert [prima.messaggio, seconda.messaggio] == [DOPPIONE, None]


def test_righe_uguali_nello_stesso_file_restano_entrambe():
    prima, seconda = riga(0, 8, 55.0, "q8"), riga(1, 8, 55.0, "q8")
    confronta([prima, seconda], [], [])
    assert [prima.messaggio, seconda.messaggio] == [None, None]


def test_stesso_nome_importo_diverso_e_forse_doppione():
    #la banca addebita 21,96 (18 + IVA), a mano si era scritto 20 due giorni dopo
    r = riga(0, 14, 21.96, "anthropic claude sub")
    confronta([r], [], [spesa(1, 16, 20.0, descrizione="Claude abbonamento")])
    assert (r.messaggio, r.selezionata) == (FORSE_DOPPIONE, False)
    assert (r.simile_nome, r.simile_data, r.simile_importo) == ("Claude abbonamento", date(2026, 9, 16), 20.0)


def test_importo_vicino_pochi_giorni_dopo_e_forse_doppione():
    #il bowling inserito la sera, la banca lo registra due giorni dopo e con qualche euro in piu'
    r = riga(0, 6, 8.0, "funny dreams srl")
    confronta([r], [], [spesa(1, 4, 7.0, descrizione="Bowling")])
    assert r.messaggio == FORSE_DOPPIONE


def test_importi_lontani_senza_nome_in_comune_restano_nuovi():
    caffe = riga(0, 8, 30.0, "ristorante da mario")
    confronta([caffe], [], [spesa(1, 8, 1.20, descrizione="Caffè")])
    assert caffe.messaggio is None


def test_nome_in_comune_ma_troppo_lontano_resta_nuovo():
    r = riga(0, 20, 21.96, "anthropic claude sub")
    confronta([r], [], [spesa(1, 14, 20.0, descrizione="Claude abbonamento")])
    assert r.messaggio is None


def test_parole_generiche_non_bastano():
    r = riga(0, 8, 50.0, "pagamento abbonamento palestra")
    confronta([r], [], [spesa(1, 8, 9.99, descrizione="Abbonamento Spotify")])
    assert r.messaggio is None


def test_il_doppione_sicuro_vince_sul_forse():
    #la prima riga somiglia per nome alla spesa, la seconda e' identica: la spesa va alla seconda
    simile, identica = riga(0, 8, 12.0, "q8 easy"), riga(1, 9, 50.0, "q8")
    confronta([simile, identica], [], [spesa(1, 9, 50.0, descrizione="Q8 easy benzina")])
    assert [simile.messaggio, identica.messaggio] == [None, DOPPIONE]


def test_rimborso_totale():
    r = riga(0, 6, 29.99, "amazon")
    confronta([r], [Entrata(date(2026, 9, 12), "amazon", 29.99)], [])
    assert (r.messaggio, r.selezionata, r.importo) == (RIMBORSO_TOTALE, False, 29.99)
    assert r.rimborso_data == date(2026, 9, 12)


def test_rimborso_parziale_riduce_l_importo():
    r = riga(0, 4, 59.90, "zalando")
    confronta([r], [Entrata(date(2026, 9, 20), "zalando", 35.0)], [])
    assert (r.messaggio, r.selezionata) == (RIMBORSO_PARZIALE, True)
    assert (r.importo, r.importo_originale, r.rimborso_importo) == (24.9, 59.9, 35.0)


def test_rimborso_sceglie_l_acquisto_piu_recente_che_lo_contiene():
    vecchio, recente, piccolo = riga(0, 1, 50.0, "zalando"), riga(1, 10, 40.0, "zalando"), riga(2, 15, 10.0, "zalando")
    confronta([vecchio, recente, piccolo], [Entrata(date(2026, 9, 20), "zalando", 40.0)], [])
    assert [vecchio.messaggio, recente.messaggio, piccolo.messaggio] == [None, RIMBORSO_TOTALE, None]


def test_rimborso_senza_acquisto_si_scarta():
    r = riga(0, 4, 20.0, "conad")
    confronta([r], [Entrata(date(2026, 9, 20), "zalando", 35.0)], [])
    assert (r.messaggio, r.importo) == (None, 20.0)


def test_rimborso_oltre_sessanta_giorni_si_scarta():
    r = RigaImport(indice=0, data=date(2026, 7, 1), testo="ZALANDO", esercente="zalando",
                   tipo="pagamento", nome="Zalando", importo=35.0)
    confronta([r], [Entrata(date(2026, 9, 20), "zalando", 35.0)], [])
    assert r.messaggio is None


def test_le_righe_gia_escluse_non_si_confrontano():
    r = riga(0, 8, 100.0, "prelievo bancomat")
    r.messaggio, r.selezionata = "non_spesa", False
    confronta([r], [], [spesa(1, 8, 100.0)])
    assert r.messaggio == "non_spesa"
