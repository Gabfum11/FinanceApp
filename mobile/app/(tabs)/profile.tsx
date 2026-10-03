import { View, Pressable } from "react-native";
import { Text, Button, Dialog, Portal, TextInput, ActivityIndicator, Snackbar, Switch, RadioButton } from "react-native-paper";
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
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useSpazioBarra } from "@/utils/barraSchede";
import { usePreferenze } from "@/utils/preferenze";
import { VALUTE, LINGUE, simbolo, type Valuta, type Lingua } from "@/utils/formato";
import { useTranslation } from "react-i18next";



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
    const { valuta, impostaValuta, lingua, impostaLingua } = usePreferenze();
    const { t } = useTranslation();
    //i messaggi in basso compaiono sopra la barra delle schede, non sotto
    const spazioBarra = useSpazioBarra();
    const nomeValuta = (v: Valuta) => t(`valute.${v}`);
    const [showLinguaDialog, setShowLinguaDialog] = useState(false);
    const [showValutaDialog, setShowValutaDialog] = useState(false);
    const [valutaInCorso, setValutaInCorso] = useState(false);
    //scelta la nuova valuta, si chiede cosa fare delle spese passate
    const [valutaNuova, setValutaNuova] = useState<Valuta | null>(null);
    const [convertiPassate, setConvertiPassate] = useState(true);

    function scegliValuta(nuova: string) {
        setShowValutaDialog(false);
        if (nuova === valuta) return;
        setConvertiPassate(true);
        setValutaNuova(nuova as Valuta);
    }

    async function confermaValuta() {
        if (!valutaNuova) return;
        setValutaInCorso(true);
        const esito = await impostaValuta(valutaNuova, convertiPassate);
        setValutaInCorso(false);
        const nome = nomeValuta(valutaNuova);
        setValutaNuova(null);
        if (esito === "ok") {
            setMessaggio(convertiPassate ? t("profilo.valutaConvertita", { nome }) : t("profilo.valutaCambiata", { nome }));
        } else if (esito === "cambio") {
            //il server non ha cambiato niente: si puo' riprovare o scegliere l'altra opzione
            setMessaggio(t("profilo.valutaSenzaTassi"));
        } else {
            setMessaggio(t("profilo.valutaErrore"));
        }
    }

    async function handleContatta() {
        setShowSupportDialog(false);
        const esito = await contattaSupporto();
        if (esito === "copiato") {
            setMessaggio(t("profilo.nessunaEmail", { email: SUPPORT_EMAIL }));
        } else if (esito === "errore") {
            setMessaggio(t("profilo.scrivici", { email: SUPPORT_EMAIL }));
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
            setMessaggio(t("profilo.promemoriaPermesso"));
        } else {
            //errore: lo switch resta com'era, perché il server ha ancora lo stato precedente
            setMessaggio(attivi
                ? t("profilo.promemoriaErroreOn")
                : t("profilo.promemoriaErroreOff"));
        }
    }

    async function handleExport(tipo: "expenses" | "subscriptions") {
        setEsportazione(tipo);
        const risultato = await esportaCsv(tipo);
        setEsportazione(null);
        if (risultato.esito === "vuoto") {
            setMessaggio(tipo === "expenses"
                ? t("profilo.nienteSpese")
                : t("profilo.nienteAbbonamenti"));
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
                        ? t("profilo.passwordErrata")
                        : t("profilo.eliminaErrore")
                );
                return;
            }
            await dimenticaDispositivo(false);
            //l'account non esiste piu': i token vanno buttati anche qui
            await cancellaSessione();
            router.replace("/login");
        } catch {
            setDeleteError(t("errori.rete"));
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
            <PaginaScorrevole style={styles.content} sopraBarra>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t("profilo.titolo")}</Text>
                    {/* scritta e icona insieme: l'icona da sola non diceva cosa fa */}
                    <Pressable
                        onPress={() => setShowLogoutDialog(true)}
                        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPremuto]}
                        accessibilityRole="button"
                        accessibilityLabel={t("profilo.esci")}
                        hitSlop={4}
                    >
                        <Text style={styles.logoutTesto}>{t("profilo.esciTitolo")}</Text>
                        <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
                    </Pressable>
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
                        {t("comune.modifica")}
                    </Button>
                    <View></View>
                </View>

                <Text style={styles.sectionLabel}>{t("profilo.sezioneApp")}</Text>
                <View style={styles.sectionCard}>
                    {/* in Expo Go il modulo delle notifiche non esiste: uno switch
                        che non puo' funzionare e' peggio di una voce assente */}
                    {NOTIFICHE_DISPONIBILI && (
                    <>
                    <View style={styles.row}>
                        <MaterialCommunityIcons name="bell-outline" size={20} color={colors.accent} />
                        <View style={styles.rowTextGroup}>
                            <Text style={styles.rowLabelInGroup}>{t("profilo.promemoria")}</Text>
                            <Text style={styles.rowHint}>
                                {promemoria ? t("profilo.promemoriaSi") : t("profilo.promemoriaNo")}
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
                            <Text style={styles.rowLabelInGroup}>{t("profilo.valuta")}</Text>
                            <Text style={styles.rowHint}>{nomeValuta(valuta)} ({simbolo(valuta)})</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                    <View style={styles.rowDivider} />
                    <Pressable style={styles.row} onPress={() => setShowLinguaDialog(true)}>
                        <MaterialCommunityIcons name="translate" size={20} color={colors.primary} />
                        <View style={styles.rowTextGroup}>
                            <Text style={styles.rowLabelInGroup}>{t("lingua.titolo")}</Text>
                            <Text style={styles.rowHint}>{t(`lingua.${lingua}`)}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                </View>

                <Text style={styles.sectionLabel}>{t("profilo.sezioneDati")}</Text>
                <View style={styles.sectionCard}>
                    <Pressable
                        style={styles.row}
                        onPress={() => handleExport("expenses")}
                        disabled={esportazione !== null}
                    >
                        <MaterialCommunityIcons name="file-download-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>{t("profilo.esportaSpese")}</Text>
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
                        <Text style={styles.rowLabel}>{t("profilo.esportaAbbonamenti")}</Text>
                        {esportazione === "subscriptions"
                            ? <ActivityIndicator size={18} />
                            : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />}
                    </Pressable>
                </View>

                <Text style={styles.sectionLabel}>{t("profilo.sezioneSupporto")}</Text>
                <View style={styles.sectionCard}>
                    <Pressable style={styles.row} onPress={() => router.navigate({ pathname: "/(tabs)/home", params: { tour: "1" } })}>
                        <MaterialCommunityIcons name="school-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>{t("profilo.rivediTutorial")}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                    <View style={styles.rowDivider} />
                    <Pressable style={styles.row} onPress={() => setShowSupportDialog(true)}>
                        <MaterialCommunityIcons name="help-circle-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>{t("profilo.contattaci")}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                    <View style={styles.rowDivider} />
                    <Pressable style={styles.row} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                        <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
                        <Text style={styles.rowLabel}>{t("profilo.privacy")}</Text>
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
                    {t("profilo.disconnettiTutti")}
                </Button>

                <Button
                    mode="text"
                    textColor={colors.dangerDark}
                    onPress={() => setShowDeleteDialog(true)}
                    style={styles.deleteButton}
                >
                    {t("profilo.eliminaAccount")}
                </Button>

            </PaginaScorrevole>

            <Portal>
                <Dialog visible={showValutaDialog} onDismiss={() => setShowValutaDialog(false)} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>{t("profilo.valuta")}</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group onValueChange={scegliValuta} value={valuta}>
                            {VALUTE.map((v) => (
                                <RadioButton.Item
                                    labelStyle={styles.opzioneTesto}
                                    style={styles.opzione}
                                    key={v}
                                    value={v}
                                    label={`${nomeValuta(v)} (${simbolo(v)})`}
                                />
                            ))}
                        </RadioButton.Group>
                    </Dialog.Content>
                </Dialog>
            </Portal>

            <Portal>
                <Dialog visible={showLinguaDialog} onDismiss={() => setShowLinguaDialog(false)} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>{t("lingua.titolo")}</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group
                            onValueChange={(scelta) => {
                                setShowLinguaDialog(false);
                                impostaLingua(scelta as Lingua);
                            }}
                            value={lingua}
                        >
                            {/* ogni lingua nella sua lingua: chi non capisce l'italiano la riconosce */}
                            {LINGUE.map((l) => (
                                <RadioButton.Item
                                    labelStyle={styles.opzioneTesto}
                                    style={styles.opzione} key={l} value={l} label={t(`lingua.${l}`)} />
                            ))}
                        </RadioButton.Group>
                        <Text style={styles.dialogNota}>{t("lingua.nota")}</Text>
                    </Dialog.Content>
                </Dialog>
            </Portal>

            <Portal>
                <Dialog visible={valutaNuova !== null} onDismiss={() => !valutaInCorso && setValutaNuova(null)} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>
                        {valutaNuova ? t("profilo.passareA", { valuta: `${nomeValuta(valutaNuova)} (${simbolo(valutaNuova)})` }) : ""}
                    </Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group
                            onValueChange={(scelta) => setConvertiPassate(scelta === "converti")}
                            value={convertiPassate ? "converti" : "mantieni"}
                        >
                            <RadioButton.Item
                                    labelStyle={styles.opzioneTesto}
                                    style={styles.opzione}
                                value="converti"
                                label={t("profilo.converti")}
                                disabled={valutaInCorso}
                            />
                            <Text style={[styles.opzioneNota, styles.opzioneNotaStaccata]}>
                                {t("profilo.convertiTesto")}
                            </Text>
                            <RadioButton.Item
                                    labelStyle={styles.opzioneTesto}
                                    style={styles.opzione}
                                value="mantieni"
                                label={t("profilo.mantieni")}
                                disabled={valutaInCorso}
                            />
                            <Text style={styles.opzioneNota}>
                                {t("profilo.mantieniTesto")}
                            </Text>
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setValutaNuova(null)} disabled={valutaInCorso}>{t("comune.annulla")}</Button>
                        <Button mode="contained" onPress={confermaValuta} loading={valutaInCorso} disabled={valutaInCorso}>
                            {t("profilo.cambiaValuta")}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <ConfirmDialog
                visible={showLogoutDialog}
                title={t("profilo.esciTitolo")}
                message={t("profilo.esciTesto")}
                confirmLabel={t("profilo.esciTitolo")}
                destructive
                onConfirm={handleLogout}
                onDismiss={() => setShowLogoutDialog(false)}
            />

            <ConfirmDialog
                visible={showLogoutAllDialog}
                title={t("profilo.disconnettiTutti")}
                message={t("profilo.disconnettiTesto")}
                confirmLabel={t("profilo.disconnetti")}
                destructive
                onConfirm={handleLogoutAll}
                onDismiss={() => setShowLogoutAllDialog(false)}
            />

            <Portal>
                <Dialog visible={showDeleteDialog} onDismiss={closeDeleteDialog} style={styles.dialog}>
                    <Dialog.Title style={styles.dialogTitle}>{t("profilo.eliminaAccount")}</Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.deleteWarning}>
                            {t("profilo.eliminaTesto")}
                        </Text>
                        {hasPassword ? (
                            <TextInput
                                label={t("profilo.confermaPassword")}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                mode="outlined"
                                autoCapitalize="none"
                            />
                        ) : (
                            <Text style={styles.deleteWarning}>
                                {t("profilo.collegatoGoogle")}
                            </Text>
                        )}
                        {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeDeleteDialog} disabled={isDeleting}>
                            {t("comune.annulla")}
                        </Button>
                        <Button
                            onPress={handleDeleteAccount}
                            textColor={colors.dangerDark}
                            disabled={isDeleting || (hasPassword && password.length === 0)}
                            loading={isDeleting}
                        >
                            {t("comune.elimina")}
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                <Dialog
                    visible={showSupportDialog}
                    onDismiss={() => setShowSupportDialog(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title style={styles.dialogTitle}>{t("profilo.supportoTitolo")}</Dialog.Title>
                    <Dialog.Content>
                        <Text style={styles.dialogText}>
                            {t("profilo.supportoTesto")}
                        </Text>
                        <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowSupportDialog(false)} textColor={colors.textMuted}>
                            {t("comune.annulla")}
                        </Button>
                        <Button onPress={handleContatta} textColor={colors.primary}>
                            {t("profilo.mandaEmail")}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Snackbar
      wrapperStyle={{ marginBottom: spazioBarra }} visible={!!messaggio} onDismiss={() => setMessaggio("")}>
                {messaggio}
            </Snackbar>
        </View>
    );
}
