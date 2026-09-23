# Dati trattati da TrackIt — scheda tecnica

Documento di riferimento per redigere la privacy policy. **Non è una privacy
policy**: è l'inventario di ciò che l'app raccoglie, da far verificare a chi
redige il testo legale.

L'obbligo di informare gli utenti viene dal GDPR, non dagli store: vale anche
distribuendo l'APK direttamente o tramite Aptoide.

Aggiornato al 23/09/2026. Da rivedere a ogni modifica del modello dati.

---

## Titolare del trattamento

| | |
|---|---|
| Nome | Gabriele Fumarola |
| Email di contatto | gabrifu03@gmail.com |
| Paese | Italia |

---

## Dati raccolti

### Account (tabella `users`)

| Dato | Obbligatorio | Origine | Perché |
|---|---|---|---|
| Email | sì | inserita dall'utente o da Google | identificare l'account, inviare codici di verifica |
| Password (hash) | no | inserita dall'utente | autenticazione. Salvata come hash, mai in chiaro |
| ID Google | no | Google Sign-In | consentire l'accesso con Google |
| Nickname | no | inserito dall'utente o da Google | personalizzare l'interfaccia |
| Budget mensile | no | inserito dall'utente | funzione di budget |
| Giorno di inizio ciclo | no | inserito dall'utente | funzione di budget |
| Data di registrazione | sì | generata dal sistema | gestione account |
| Stato verifica email | sì | generato dal sistema | sicurezza |
| Versione dei token | sì | generata dal sistema | revoca delle sessioni |

### Spese e abbonamenti (tabelle `expenses`, `subscriptions`)

| Dato | Perché |
|---|---|
| Descrizione | funzione principale dell'app |
| Importo | funzione principale dell'app |
| Data | funzione principale dell'app |
| Categoria | classificazione delle spese |
| Frequenza e prossimo rinnovo (abbonamenti) | calcolo dei rinnovi |

**Nota:** sono dati di natura economica. Non sono dati particolari ai sensi
dell'art. 9 GDPR, ma le descrizioni inserite dall'utente possono rivelare
abitudini personali (es. spese mediche). Da menzionare nella policy.

### Codici di verifica (tabella `otp_codes`)

Codice a 6 cifre, scopo, scadenza, numero di tentativi.
Cancellati automaticamente dopo l'uso.

### Dati salvati solo sul dispositivo

Non lasciano mai il telefono e non raggiungono il server:

| Dato | Dove | Perché |
|---|---|---|
| Token di accesso | SecureStore (area cifrata del sistema) | restare autenticati |
| Preferenza promemoria | archivio locale dell'app | ricordare se le notifiche sono attive |
| File CSV esportati | cartella temporanea | condivisione, poi rimossi dal sistema |

### Notifiche locali

Se l'utente attiva i promemoria, l'app pianifica avvisi per gli abbonamenti in
scadenza. Sono **notifiche locali**: calcolate e mostrate dal telefono, senza
alcun invio dal server e senza token di notifica registrati presso terzi.

### Dati NON raccolti

- Nessun dato di geolocalizzazione
- Nessun identificativo pubblicitario
- Nessun dato di contatto oltre l'email
- Nessun dato biometrico o sanitario dichiarato
- **Nessuna analytics, nessun tracciamento, nessuna profilazione**
- Nessun accesso a rubrica, fotocamera, file o microfono

---

## Dove stanno i dati

| Servizio | Cosa | Dove | Ruolo |
|---|---|---|---|
| Supabase | database PostgreSQL | UE (eu-west-1, Irlanda) | responsabile del trattamento |
| Render | server applicativo | UE (Francoforte, Germania) | responsabile del trattamento |
| Google | autenticazione (solo per chi usa Sign-In) | USA | titolare autonomo |
| Groq UK Limited | elaborazione del testo dell'assistente | USA (Google Cloud) | responsabile del trattamento |
| Gmail SMTP | invio email di verifica | USA | responsabile del trattamento |

Database e server applicativo restano **entrambi nell'UE**: i dati delle spese
non lasciano l'Unione se non nei due casi indicati sotto (assistente ed email).

### Il punto più delicato: l'assistente

Quando l'utente scrive una frase nell'assistente (es. "Pizza 15 euro"), **il
testo viene inviato a Groq** per l'estrazione dei dati. Il testo può contenere
informazioni personali a discrezione dell'utente: "visita psichiatra 80 euro"
è un dato sanitario che lascia l'Unione.

È l'unico caso in cui dati inseriti dall'utente escono dall'infrastruttura, e
**solo per chi sceglie di usare l'assistente**: chi inserisce le spese dal form
manuale non invia nulla a Groq. La policy può dirlo esplicitamente.

Condizioni verificate sul Services Agreement e sul DPA (23/09/2026):

| Aspetto | Situazione |
|---|---|
| Conservazione | le richieste di inferenza non vengono conservate; resta un log tecnico fino a 30 giorni per guasti e abusi |
| Addestramento | vietato dal Services Agreement (sez. 4.2) salvo permesso esplicito |
| DPA | incluso nel Services Agreement accettato all'iscrizione, nessuna firma separata |
| Trasferimento extra-UE | coperto dalle Clausole Contrattuali Standard UE (Modulo 2, titolare → responsabile) |
| Violazioni dei dati | notifica entro 72 ore |
| Controparte contrattuale | Groq UK Limited (per clienti in Italia), non Groq LLC |
| Sub-responsabili | elenco su trust.groq.com/subprocessors |

**Azione consigliata:** attivare la **Zero Data Retention** in Console → Settings
→ Data Controls. Elimina anche il log di 30 giorni, e non comporta perdite:
serve solo a chi usa batch o fine-tuning, funzioni che TrackIt non utilizza.

**Testo per la policy** — con ZDR attiva:

> Il testo inserito nell'assistente viene inviato a Groq (USA) per l'estrazione
> dei dati. Groq agisce come responsabile del trattamento in base al proprio
> Data Processing Addendum; il trasferimento extra-UE è coperto dalle Clausole
> Contrattuali Standard. Con la Zero Data Retention attiva, il testo non viene
> conservato dopo l'elaborazione e non viene mai usato per addestrare modelli.

Senza ZDR, sostituire l'ultima frase con: "il testo può essere conservato fino a
30 giorni esclusivamente per sicurezza e affidabilità del servizio, e non viene
mai usato per addestrare modelli".

**Obbligo contrattuale:** la sezione 6.2 del Services Agreement impegna a
fornire agli utenti le informative necessarie — cioè esattamente la privacy
policy e l'avviso nella schermata dell'assistente.

---

## Conservazione e cancellazione

- I dati restano finché l'account esiste
- L'utente può cancellare l'account dall'app (Profilo → Elimina account)
- La cancellazione rimuove **immediatamente e definitivamente** utente, spese,
  abbonamenti e codici di verifica
- I codici OTP scadono dopo 10 minuti e vengono rimossi dopo l'uso

**Backup:** il piano Free di Supabase non prevede backup automatici (retention
0 giorni). La cancellazione dell'account è quindi definitiva nel senso pieno:
non restano copie da cui i dati possano essere recuperati.

*Nota operativa, non di privacy:* l'assenza di backup significa anche che un
guasto o un errore comporterebbe la perdita dei dati di tutti gli utenti.
Passando a un piano con backup, la policy va aggiornata indicando i giorni di
conservazione, perché la cancellazione non sarebbe più immediata nei fatti.

---

## Diritti dell'utente (GDPR)

| Diritto | Come è soddisfatto oggi |
|---|---|
| Accesso ai dati | sì: l'app li mostra, ed esistono esportazioni CSV |
| Rettifica | sì: modifica di profilo, spese e abbonamenti |
| Cancellazione | sì: Profilo → Elimina account |
| Portabilità | sì: Profilo → Esporta spese / Esporta abbonamenti (CSV) |
| Opposizione / limitazione | da gestire via email (Profilo → Contattaci) |

---

## Sicurezza

- Password salvate come hash (mai in chiaro)
- Comunicazione cifrata (HTTPS)
- Autenticazione a token con scadenza
- Limiti di frequenza su login, registrazione e assistente
- Ogni query filtra per utente: nessun endpoint espone dati di altri
- Le sessioni sono revocabili: cambio password e "disconnetti tutti i
  dispositivi" invalidano immediatamente i token già emessi
- API REST di Supabase disattivata: il database è raggiungibile solo dal backend
- Documentazione delle API non esposta in produzione
- Accesso amministrativo al database limitato allo sviluppatore

---

## Per la scheda Play Store ("Sicurezza dei dati")

Serve solo pubblicando su Google Play. Su Aptoide o distribuendo l'APK
direttamente questa sezione non viene richiesta, ma la privacy policy sì.

Risposte suggerite, **da verificare** con il modulo effettivo:

| Domanda | Risposta |
|---|---|
| L'app raccoglie dati? | Sì |
| I dati sono cifrati in transito? | Sì |
| L'utente può chiedere la cancellazione? | Sì |
| I dati sono condivisi con terzi? | Sì — Groq per l'elaborazione del testo dell'assistente |
| Tipi di dati raccolti | Info personali (email, nome), Info finanziarie (spese inserite dall'utente) |
| Uso per pubblicità o profilazione | No |

---

## Cosa manca prima di distribuire l'app

Necessario in ogni caso, anche senza Play Store:

1. Attivare le **Inference APIs ZDR** su Groq (Console → Settings → Data
   Controls), e allineare di conseguenza il testo della policy
2. Far redigere o generare la privacy policy a partire da questo documento
3. Pubblicarla a un URL raggiungibile pubblicamente
4. Aggiungere il link nella schermata Profilo dell'app

Solo per Google Play:

5. Compilare la scheda "Sicurezza dei dati"
6. Inserire l'URL della policy nella scheda dell'app
