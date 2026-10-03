import { View, Pressable } from "react-native";
import { Text, IconButton, Button, Dialog, Portal, TextInput, ActivityIndicator, Snackbar, Switch, RadioButton } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { esportaCsv } from "@/utils/exportData";
import { impostaPromemoria, promemoriaAttivi, dimenticaDispositivo, NOTIFICHE_DISPONIBILI } from "@/utils/notifications";
import { contattaSupporto, SUPPORT_EMAIL } from "@/utils/support";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_URL } from "@/config";
import { useFocusEffect, useRouter } from "expo-router";
import { cancellaSessione, chiudiSessione } from "@/utils/session";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { styles } from "@/styles/profile.styles";
import { colors } from "@/styles/tokens";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { puoAggiungereAllaHome } from "@/utils/aggiuntaHome";
import { usePreferenze } from "@/utils/preferenze";
import { VALUTE, simbolo, type Valuta } from "@/utils/formato";

//il dispositivo non cambia mentre si usa l'app: non c'e' niente da ascoltare
const nessunaIscrizione = () => () => {};

const NOMI_VALUTE: Record<Valuta, string> = {
    EUR: "Euro",
    USD: "Dollaro statunitense",
    GBP: "Sterlina britannica",
    CHF: "Franco svizzero",
};

export default function ProfileScreen() {
    const router = useRouter();
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [password, setPassword] = useState("");
    //gli account creati con Google non hanno password: chiedergliela farebbe
    //sembrare valida qualsiasi cosa scritta, perche' il server la ignora
    const [hasPassword, setHasPassword] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
    //quale esportazione e' in corso: disabilita entrambe le voci e mostra
    //l'indicatore solo su quella toccata
    const [esportazione, setEsportazione] = useState<"expenses" | "subscriptions" | null>(null);
    const [messaggio, setMessaggio] = useState("");
    const [promemoria, setPromemoria] = useState(false);
    const [promemoriaInCorso, setPromemoriaInCorso] = useState(false);
    const [showSupportDialog, setShowSupportDialog] = useState(false);
    const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);
    //l'icona di logout e' piccola e in alto: un tocco per sbaglio non deve buttare fuori
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    //solo su iPhone, nel browser: chi ha chiuso l'invito iniziale ci puo' ripensare.
    //Il terzo argomento vale durante la build del sito, dove non c'e' un browser
    const aggiungibile = useSyncExternalStore(nessunaIscrizione, puoAggiungereAllaHome, () => false);
    const [showHomeDialog, setShowHomeDialog] = useState(false);
    const { valuta, impostaValuta } = usePreferenze();
    const [showValutaDialog, setShowValutaDialog] = useState(false);
    const [valutaInCorso, setValutaInCorso] = useState(false);

    //cambia solo come si leggono gli importi: quelli gia' salvati restano gli stessi numeri
    async function scegliValuta(nuova: string) {
        if (nuova === valuta) {
            setShowValutaDialog(false);
            return;
        }
        setValutaInCorso(true);
        const riuscito = await impostaValuta(nuova as Valuta);
        setValutaInCorso(false);
        setShowValutaDialog(false);
        if (!riuscito) setMessaggio("Impossibile cambiare la valuta. Controlla la connessione.");
    }

    async function handleContatta() {
        setShowSupportDialog(false);
        const esito = await contattaSupporto();
        if (esito === "copiato") {
            setMessaggio(`Nessuna app email trovata. Indirizzo copiato: ${SUPPORT_EMAIL}`);
        } else if (esito === "errore") {
            setMessaggio(`Scrivici a ${SUPPORT_EMAIL}`);
        }
    }

    async function handlePromemoria(attivi: boolean) {
        setPromemoriaInCorso(true);
        //lo stato lo decide la funzione, non lo switch: se il permesso viene
        //negato o il server non risponde, mostrerebbe uno stato non vero
        const esito = await impostaPromemoria(attivi);
        setPromemoriaInCorso(false);
        if (esito === "attivi") setPromemoria(true);
        else if (esito === "spenti") setPromemoria(false);
        else if (esito === "permesso_negato") {
            setPromemoria(false);
            setMessaggio("Per i promemoria servono le notifiche: attivale dalle impostazioni del telefono.");
        } else {
            //errore: lo switch resta com'era, perché il server ha ancora lo stato precedente
            setMessaggio(attivi
                ? "Non è stato possibile attivare i promemoria. Riprova."
                : "Non è stato possibile disattivare i promemoria. Riprova.");
        }
    }

    async function handleExport(tipo: "expenses" | "subscriptions") {
        setEsportazione(tipo);
        const risultato = await esportaCsv(tipo);
        setEsportazione(null);
        if (risultato.esito === "vuoto") {
            setMessaggio(tipo === "expenses"
                ? "Non ci sono spese da esportare."
                : "Non ci sono abbonamenti da esportare.");
        } else if (risultato.esito === "errore") {
            setMessaggio(risultato.messaggio);
        }
    }

    function confirmLogoutAll() {
        setShowLogoutAllDialog(true);
    }

    async function handleLogoutAll() {
        setShowLogoutAllDialog(false);
        setIsLoggingOutAll(true);
        try {
            const response = await apiFetch("/auth/logout-all", { method: "POST" });
            if (!response.ok) return;
            //il server ha gia' tolto anche il push token: resta da spegnere lo stato locale
            await dimenticaDispositivo(false);
            //i token in uso sono appena stati invalidati: vanno buttati anche qui
            await cancellaSessione();
            router.replace("/login");
        } catch {
            //senza rete la revoca non parte: l'utente resta dov'e'
        } finally {
            setIsLoggingOutAll(false);
        }
    }

    function closeDeleteDialog() {
        setShowDeleteDialog(false);
        setPassword("");
        setDeleteError(null);
    }

    async function handleDeleteAccount() {
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const response = await apiFetch("/auth/me", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (!response.ok) {
                setDeleteError(
                    response.status === 401
                        ? "Password non corretta."
                        : "Non è stato possibile eliminare l'account. Riprova."
                );
                return;
            }
            await dimenticaDispositivo(false);
            //l'account non esiste piu': i token vanno buttati anche qui
            await cancellaSessione();
            router.replace("/login");
        } catch {
            setDeleteError("Errore di rete. Riprova.");
        } finally {
            setIsDeleting(false);
        }
    }

    //a ogni ritorno sulla scheda, non solo alla prima apertura:
    //cosi' il nome cambiato in "Modifica profilo" compare subito
    useFocusEffect(
        useCallback(() => {
            async function loadUser() {
                const response = await apiFetch("/auth/me");
                if (response.ok) {
                    const data = await response.json();
                    setNickname(data.nickname);
                    setEmail(data.email);
                    setHasPassword(data.has_password);
                }
            }
            loadUser();
        }, [])
    );

    useEffect(() => {
        promemoriaAttivi().then(setPromemoria);
    }, []);

    const initials = nickname
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    async function handleLogout() {
        setShowLogoutDialog(false);
        //finché c'è il token di accesso: dopo il server non saprebbe di chi è il telefono
        await dimenticaDispositivo();
        //il server revoca il refresh token: copiato altrove, non varrebbe piu'
        await chiudiSessione();
        router.replace("/login");
    }

    return (
        <View style={styles.container}>
            <PaginaScorrevole style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profilo</Text>
                    <IconButton
                        icon="logout"
                        mode="outlined"
                        iconColor={colors.danger}
                        onPress={() => setShowLogoutDialog(true)}
                        style={styles.logoutButton}
                    />
                </View>

                <View style={styles.profCard}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{nickname}</Text>
                        <Text style={styles.profileEmail}>{email}</Text>
                    </View>
                    <Button mode="outlined" onPress={() => router.push("/modify_profile")} style={styles.button}>
                        Modifica
                    </Button>
                    <View></View>
                </View>

                <Text style={styles.sectionLabel}>APP</Text>
                <View style={styles.sectionCard}>
                    {/* in Expo Go il modulo delle notifiche non esiste: uno switch
                        che non puo' funzionare e' peggio di una voce assente */}
                    {NOTIFICHE_DISPONIBILI && (
                    <>
                    <View style={styles.row}>
                        <MaterialCommunityIcons name="bell-outline" size={20} color={colors.accent} />
                        <View style={styles.rowTextGroup}>
                            <Text style={styles.rowLabelInGroup}>Promemoria abbonamenti</Text>
                            <Text style={styles.rowHint}>
                                {promemoria ? "Il giorno prima del rinnovo, alle 9:00" : "Disattivati"}
                            </Text>
                        </View>
                        <Switch
                            value={promemoria}
                            onValueChange={handlePromemoria}
                            disabled={promemoriaInCorso}
                        />
                    </View>
                    <View style={styles.rowDivider} />
                    </>
                    )}
                    <Pressable style={styles.row} onPress={() => setShowValutaDialog(true)}>
                        <MaterialCommunityIcons name="cash-multiple" size={20} color={colors.primary} />
                        <View style={styles.rowTextGroup}>
                            <Text style={styles.rowLabelInGroup}>Valuta</Text>
                            <Text style={styles.rowHint}>{NOMI_VALUTE[valuta]} ({simbolo(valuta)})</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                </View>

                <Text style={styles.sectionLabel}>DATI</Text>
                <View style={styles.sectionCard}>
                    <Pressable
                        style={styles.row}
                        onPress={() => handleExport("expenses")}
                        disabled={esportazione !== null}
                    >
                        <MaterialCommunityIcons name="file-download-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>Esporta spese</Text>
                        {esportazione === "expenses"
                            ? <ActivityIndicator size={18} />
                            : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />}
                    </Pressable>
                    <View style={styles.rowDivider} />
                    <Pressable
                        style={styles.row}
                        onPress={() => handleExport("subscriptions")}
                        disabled={esportazione !== null}
                    >
                        <MaterialCommunityIcons name="file-download-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>Esporta abbonamenti</Text>
                        {esportazione === "subscriptions"
                            ? <ActivityIndicator size={18} />
                            : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />}
                    </Pressable>
                </View>

                <Text style={styles.sectionLabel}>SUPPORTO</Text>
                <View style={styles.sectionCard}>
                    {aggiungibile && (
                        <>
                            <Pressable style={styles.row} onPress={() => setShowHomeDialog(true)}>
                                <MaterialCommunityIcons name="cellphone-arrow-down" size={20} color={colors.primary} />
                                <Text style={styles.rowLabel}>Aggiungi alla Home</Text>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                            </Pressable>
                            <View style={styles.rowDivider} />
                        </>
                    )}
                    <Pressable style={styles.row} onPress={() => router.navigate({ pathname: "/(tabs)/home", params: { tour: "1" } })}>
                        <MaterialCommunityIcons name="school-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>Rivedi il tutorial</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                    <View style={styles.rowDivider} />
                    <Pressable style={styles.row} onPress={() => setShowSupportDialog(true)}>
                        <MaterialCommunityIcons name="help-circle-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>Contattaci</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                    <View style={styles.rowDivider} />
                    <Pressable style={styles.row} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                        <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>Privacy policy</Text>
                        <MaterialCommunityIcons name="open-in-new" size={20} color={colors.chevron} />
                    </Pressable>
                </View>

                {/* cancellare il token dal telefono non basta: quello emesso resta
                    valido fino a 30 giorni, e un dispositivo perso resterebbe dentro */}
                <Button
                    mode="text"
                    onPress={confirmLogoutAll}
                    loading={isLoggingOutAll}
                    disabled={isLoggingOutAll}
                    style={styles.logoutAllButton}
                >
                    Disconnetti tutti i dispositivi
                </Button>

                <Button
                    mode="text"
                    textColor={colors.dangerDark}
                    onPress={() => setShowDeleteDialog(true)}
                    style={styles.deleteButton}
                >
                    Elimina account
                </Button>

            </PaginaScorrevole>

            <Portal>
                <Dialog visible={showValutaDialog} onDismiss={() => setShowValutaDialog(false)}>
                    <Dialog.Title>Valuta</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group onValueChange={scegliValuta} value={valuta}>
                            {VALUTE.map((v) => (
                                <RadioButton.Item
                                    key={v}
                                    value={v}
                                    label={`${NOMI_VALUTE[v]} (${simbolo(v)})`}
                                    disabled={valutaInCorso}
                                />
                            ))}
                        </RadioButton.Group>
                        <Text style={{ marginTop: 8, color: colors.textMuted }}>
                            Gli importi già registrati non vengono convertiti.
                        </Text>
                    </Dialog.Content>
                </Dialog>
            </Portal>

            {/* un solo pulsante: non c'e' niente da confermare, solo istruzioni */}
            <Portal>
                <Dialog visible={showHomeDialog} onDismiss={() => setShowHomeDialog(false)}>
                    <Dialog.Title>Aggiungi TrackIt alla Home</Dialog.Title>
                    <Dialog.Content>
                        <Text>1. Tocca Condividi nella barra di Safari.</Text>
                        <Text>2. Scegli «Aggiungi alla schermata Home».</Text>
                        {/* l'icona ha dati suoi, separati da Safari: la sessione non passa */}
                        <Text style={{ marginTop: 12, color: colors.textMuted }}>
                            Dall&apos;icona dovrai accedere di nuovo: per iPhone è un&apos;app separata da Safari.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowHomeDialog(false)}>Ho capito</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <ConfirmDialog
                visible={showLogoutDialog}
                title="Esci"
                message="Vuoi uscire dal tuo account su questo dispositivo?"
                confirmLabel="Esci"
                destructive
                onConfirm={handleLogout}
                onDismiss={() => setShowLogoutDialog(false)}
            />

            <ConfirmDialog
                visible={showLogoutAllDialog}
                title="Disconnetti tutti i dispositivi"
                message="Dovrai accedere di nuovo su ogni dispositivo, questo compreso. Usalo se hai perso il telefono."
                confirmLabel="Disconnetti"
                destructive
                onConfirm={handleLogoutAll}
                onDismiss={() => setShowLogoutAllDialog(false)}
            />

            <Portal>
                <Dialog visible={showDeleteDialog} onDismiss={closeDeleteDialog} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>Elimina account</Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.deleteWarning}>
                            Verranno eliminati definitivamente il tuo profilo, le tue spese e i tuoi
                            abbonamenti. L'operazione non è reversibile.
                        </Text>
                        {hasPassword ? (
                            <TextInput
                                label="Conferma la password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                mode="outlined"
                                autoCapitalize="none"
                            />
                        ) : (
                            <Text style={styles.deleteWarning}>
                                Il tuo account è collegato a Google.
                            </Text>
                        )}
                        {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeDeleteDialog} disabled={isDeleting}>
                            Annulla
                        </Button>
                        <Button
                            onPress={handleDeleteAccount}
                            textColor={colors.dangerDark}
                            disabled={isDeleting || (hasPassword && password.length === 0)}
                            loading={isDeleting}
                        >
                            Elimina
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog
                    visible={showSupportDialog}
                    onDismiss={() => setShowSupportDialog(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title style={styles.dialogTitle}>Feedback e supporto</Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.dialogText}>
                            Contattaci per qualsiasi domanda all'indirizzo
                        </Text>
                        <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowSupportDialog(false)} textColor={colors.textMuted}>
                            Annulla
                        </Button>
                        <Button onPress={handleContatta} textColor={colors.primary}>
                            Manda email
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Snackbar visible={!!messaggio} onDismiss={() => setMessaggio("")}>
                {messaggio}
            </Snackbar>
        </View>
    );
}
