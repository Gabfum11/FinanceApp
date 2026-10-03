"""Importi scritti come li legge l'utente, nella sua valuta e nella sua lingua.

Serve ai testi che partono dal server (notifiche): quelli dell'app li scrive
l'app stessa, con Intl.NumberFormat. Le regole qui seguono le stesse.
"""

#solo le valute che l'app offre (schemas.Valuta): per le altre si mostra il codice
SIMBOLI = {"EUR": "€", "USD": "$", "GBP": "£", "CHF": "CHF"}


def formatta_importo(valore: float, valuta: str = "EUR", lingua: str = "it") -> str:
    simbolo = SIMBOLI.get(valuta, valuta)
    if lingua == "en":
        #1,234.50: virgola per le migliaia, punto per i decimali, simbolo davanti
        numero = f"{valore:,.2f}"
        #un simbolo fatto di lettere (CHF) va staccato dal numero, uno grafico no
        return f"{simbolo} {numero}" if simbolo.isalpha() else f"{simbolo}{numero}"
    #in italiano le migliaia si separano solo da 10.000 in su, come fa Intl:
    #1234,50 ma 12.345,00
    numero = f"{valore:,.2f}" if abs(valore) >= 10000 else f"{valore:.2f}"
    numero = numero.replace(",", "_").replace(".", ",").replace("_", ".")
    return f"{numero} {simbolo}"
