"""L'informativa sulla privacy deve essere raggiungibile senza account.

Il Play Store verifica il link: se la pagina richiedesse un token, o sparisse
con un refactoring, la scheda dell'app verrebbe rifiutata.
"""


def test_pagina_pubblica_in_html(client):
    response = client.get("/privacy")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Informativa sulla privacy" in response.text


def test_nomina_i_fornitori_che_ricevono_dati(client):
    #se si aggiunge un fornitore, l'informativa va aggiornata insieme al codice
    testo = client.get("/privacy").text
    for fornitore in ("Render", "Groq", "Brevo", "Google"):
        assert fornitore in testo
