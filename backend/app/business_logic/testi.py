"""Testi che partono dal server, nella lingua dell'utente (User.language).

L'app ha i suoi in mobile/locales; qui ci sono solo quelli che l'utente legge
senza passare dall'app: email, notifiche, file esportati. Una lingua che non
e' in elenco ricade sull'italiano.
"""

TESTI = {
    "it": {
        "email_oggetto_verifica": "Verifica il tuo account",
        "email_oggetto_reset": "Reimposta la tua password",
        "email_corpo": "Il tuo codice è: {codice}\n\nScade tra 10 minuti.",
        "notifica_titolo": "{nome} si rinnova domani",
        "frequenza_monthly": "mensile",
        "frequenza_weekly": "settimanale",
        "frequenza_yearly": "annuale",
        "csv_frequenza_monthly": "Mensile",
        "csv_frequenza_weekly": "Settimanale",
        "csv_frequenza_yearly": "Annuale",
        "csv_data": "Data",
        "csv_descrizione": "Descrizione",
        "csv_importo": "Importo",
        "csv_importo_valuta": "Importo ({valuta})",
        "csv_importo_originale": "Importo originale",
        "csv_valuta_originale": "Valuta originale",
        "csv_valuta": "Valuta",
        "csv_categoria": "Categoria",
        "csv_gruppo": "Gruppo",
        "csv_frequenza": "Frequenza",
        "csv_prossimo": "Prossimo addebito",
        "csv_stato": "Stato",
        "csv_rinnovo": "Rinnovo",
        "csv_attivo": "Attivo",
        "csv_in_pausa": "In pausa",
        "csv_automatico": "Automatico",
        "csv_manuale": "Manuale",
        "file_spese": "spese",
        "file_abbonamenti": "abbonamenti",
    },
    "en": {
        "email_oggetto_verifica": "Verify your account",
        "email_oggetto_reset": "Reset your password",
        "email_corpo": "Your code is: {codice}\n\nIt expires in 10 minutes.",
        "notifica_titolo": "{nome} renews tomorrow",
        "frequenza_monthly": "monthly",
        "frequenza_weekly": "weekly",
        "frequenza_yearly": "yearly",
        "csv_frequenza_monthly": "Monthly",
        "csv_frequenza_weekly": "Weekly",
        "csv_frequenza_yearly": "Yearly",
        "csv_data": "Date",
        "csv_descrizione": "Description",
        "csv_importo": "Amount",
        "csv_importo_valuta": "Amount ({valuta})",
        "csv_importo_originale": "Original amount",
        "csv_valuta_originale": "Original currency",
        "csv_valuta": "Currency",
        "csv_categoria": "Category",
        "csv_gruppo": "Group",
        "csv_frequenza": "Frequency",
        "csv_prossimo": "Next charge",
        "csv_stato": "Status",
        "csv_rinnovo": "Renewal",
        "csv_attivo": "Active",
        "csv_in_pausa": "Paused",
        "csv_automatico": "Automatic",
        "csv_manuale": "Manual",
        "file_spese": "expenses",
        "file_abbonamenti": "subscriptions",
    },
}

#i nomi delle categorie restano in italiano nel database (sono anche la chiave
#della categorizzazione): si traducono solo dove l'utente li legge. Gli stessi
#di mobile/locales/en.json
_CATEGORIE_EN = {
    "Cibo e bevande": "Food & drink", "Spesa alimentare": "Grocery shopping", "Pranzi e cene": "Lunch & dinner",
    "Bar e caffè": "Bars & coffee", "Acquisti": "Shopping", "Abbigliamento": "Clothing", "Scarpe": "Shoes",
    "Tecnologia": "Tech", "Regali": "Gifts", "Tabacchi": "Tobacco", "Trasporti": "Transport", "Carburante": "Fuel",
    "Mezzi pubblici": "Public transport", "Automobile": "Car", "Assicurazione auto": "Car insurance",
    "Parcheggi e pedaggi": "Parking & tolls", "Casa": "Home", "Affitto o mutuo": "Rent or mortgage",
    "Bolletta energia": "Energy bill", "Bolletta acqua": "Water bill", "Bolletta rifiuti": "Waste bill",
    "Internet e telefono": "Internet & phone", "Spese condominiali": "Building fees", "Salute": "Health",
    "Visite mediche": "Doctor visits", "Farmacia": "Pharmacy", "Cura personale": "Personal care",
    "Parrucchiere": "Hairdresser", "Estetista": "Beauty treatments", "Svago": "Leisure",
    "Libri e giornali": "Books & newspapers", "Cinema e spettacoli": "Cinema & shows",
    "Abbonamenti digitali": "Digital subscriptions", "Sport": "Sport", "Palestra": "Gym",
    "Attrezzatura sportiva": "Sports gear", "Viaggi": "Travel", "Alloggio": "Accommodation",
    "Trasporti viaggio": "Travel transport", "Famiglia": "Family", "Bambini": "Children", "Istruzione": "Education",
    "Animali": "Pets", "Cibo animali": "Pet food", "Veterinario": "Vet", "Altro": "Other",
}


def lingua_valida(lingua: str | None) -> str:
    return lingua if lingua in TESTI else "it"


def testo(lingua: str | None, chiave: str, **valori) -> str:
    return TESTI[lingua_valida(lingua)][chiave].format(**valori)


def nome_categoria(nome: str | None, lingua: str | None) -> str:
    if not nome or lingua_valida(lingua) == "it":
        return nome or ""
    if nome.endswith(" (generico)"):
        gruppo = nome.removesuffix(" (generico)")
        return f"{_CATEGORIE_EN.get(gruppo, gruppo)} (general)"
    return _CATEGORIE_EN.get(nome, nome)
