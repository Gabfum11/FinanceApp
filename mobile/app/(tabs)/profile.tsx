import { View, Pressable } from "react-native";
import { Text, IconButton, Button, Dialog, Portal, TextInput, ActivityIndicator, Snackbar, Switch } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { esportaCsv } from "@/utils/exportData";
import { impostaPromemoria, promemoriaAttivi, NOTIFICHE_DISPONIBILI } from "@/utils/notifications";
import { contattaSupporto, SUPPORT_EMAIL } from "@/utils/support";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { styles } from "@/styles/profile.styles";
import { colors } from "@/styles/tokens";
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function ProfileScreen() {
    const router = useRouter();
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [password, setPassword] = useState("");
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
        //negato resta spento, altrimenti mostrerebbe "attivo" senza esserlo
        const effettivo = await impostaPromemoria(attivi);
        setPromemoria(effettivo);
        setPromemoriaInCorso(false);
        if (attivi && !effettivo) {
            setMessaggio("Per i promemoria servono le notifiche: attivale dalle impostazioni del telefono.");
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
            //il token in uso e' appena stato invalidato: va buttato anche qui
            await SecureStore.deleteItemAsync("token");
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
            //l'account non esiste piu': il token va buttato, non solo la sessione
            await SecureStore.deleteItemAsync("token");
            router.replace("/login");
        } catch {
            setDeleteError("Errore di rete. Riprova.");
        } finally {
            setIsDeleting(false);
        }
    }

    useEffect(() => {
        async function loadUser() {
            const response = await apiFetch("/auth/me");
            if (response.ok) {
                const data = await response.json();
                setNickname(data.nickname);
                setEmail(data.email);
            }
        }
        loadUser();
        promemoriaAttivi().then(setPromemoria);
    }, []);

    const initials = nickname
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    async function handleLogout() {
        await SecureStore.deleteItemAsync("token");
        router.replace("/login");
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profilo</Text>
                <IconButton
                    icon="logout"
                    mode="outlined"
                    iconColor={colors.danger}
                    onPress={handleLogout}
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

            {/* in Expo Go il modulo delle notifiche non esiste: uno switch
                che non puo' funzionare e' peggio di una voce assente */}
            {NOTIFICHE_DISPONIBILI && (
            <>
            <Text style={styles.sectionLabel}>APP</Text>
            <View style={styles.sectionCard}>
                <View style={styles.row}>
                    <MaterialCommunityIcons name="bell-outline" size={20} color={colors.accent} />
                    <View style={styles.rowTextGroup}>
                        <Text style={styles.rowLabel}>Promemoria abbonamenti</Text>
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
            </View>
            </>
            )}

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
                <Pressable style={styles.row} onPress={() => setShowSupportDialog(true)}>
                    <MaterialCommunityIcons name="help-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.rowLabel}>Contattaci</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
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
                        <TextInput
                            label="Conferma la password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            mode="outlined"
                            autoCapitalize="none"
                        />
                        {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeDeleteDialog} disabled={isDeleting}>
                            Annulla
                        </Button>
                        <Button
                            onPress={handleDeleteAccount}
                            textColor={colors.dangerDark}
                            disabled={isDeleting || password.length === 0}
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
