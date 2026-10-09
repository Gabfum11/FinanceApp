import { View, Pressable } from "react-native";
import { Text, Dialog, Portal, TextInput, ActivityIndicator, Snackbar, Switch, RadioButton } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { esportaCsv } from "@/utils/exportData";
import { impostaPromemoria, promemoriaAttivi, dimenticaDispositivo, NOTIFICHE_DISPONIBILI } from "@/utils/notifications";
import { contattaSupporto, SUPPORT_EMAIL } from "@/utils/support";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_URL } from "@/config";
import { useFocusEffect, useRouter } from "expo-router";
import { cancellaSessione, chiudiSessione } from "@/utils/session";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconaDialogo, PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";
import { creaStili, COLORI_RIGHE } from "@/styles/profile.styles";
import { Avatar } from "@/components/Avatar";
import { IconaCerchio } from "@/components/IconaCategoria";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useSpazioBarra } from "@/utils/barraSchede";
import { usePreferenze } from "@/utils/preferenze";
import { VALUTE, LINGUE, simbolo, type Valuta, type Lingua } from "@/utils/formato";
import { useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";
import { DIALOGO_LARGO, useSchermoLargo } from "@/utils/layout";



export default function ProfileScreen() {
  const styles = useStili(creaStili);
  const finestra = useStili(creaStiliFinestra);
  const { colors, scuro, impostaScuro } = useTema();
  //sul computer: account a sinistra, impostazioni a destra
  const largo = useSchermoLargo();
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

    async function handleLogout() {
        setShowLogoutDialog(false);
        //finché c'è il token di accesso: dopo il server non saprebbe di chi è il telefono
        await dimenticaDispositivo();
        //il server revoca il refresh token: copiato altrove, non varrebbe piu'
        await chiudiSessione();
        router.replace("/login");
    }

    //disconnetti ed elimina: sotto le sezioni sul telefono, sotto l'account sul computer.
    //In una card come le altre voci: prima erano due scritte sciolte, e "Disconnetti
    //tutti" in verde chiaro su grigio quasi non si leggeva
    const azioniAccount = (
        <>
        <Text style={[styles.sectionLabel, largo && styles.sezioneAccountLarga]}>{t("profilo.sezioneAccount")}</Text>
        <View style={styles.sectionCard}>
            {/* cancellare il token dal telefono non basta: quello emesso resta
                valido fino a 30 giorni, e un dispositivo perso resterebbe dentro */}
            <Riga
                icona="cellphone-remove"
                colore={COLORI_RIGHE.neutro}
                etichetta={t("profilo.disconnettiTutti")}
                onPress={confirmLogoutAll}
                disabilitata={isLoggingOutAll}
                destra={isLoggingOutAll ? <ActivityIndicator size={18} /> : undefined}
            />
            <View style={styles.rowDivider} />
            <Riga
                icona="account-remove"
                colore={COLORI_RIGHE.pericolo}
                etichetta={t("profilo.eliminaAccount")}
                onPress={() => setShowDeleteDialog(true)}
                distruttiva
            />
        </View>
        </>
    );

    return (
        <View style={styles.container}>
            <PaginaScorrevole style={styles.content} sopraBarra>
                <View style={styles.header}>
                    <Text style={styles.headerTitle} accessibilityRole="header">{t("profilo.titolo")}</Text>
                    {/* scritta e icona insieme: l'icona da sola non diceva cosa fa */}
                    <Pressable
                        onPress={() => setShowLogoutDialog(true)}
                        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPremuto]}
                        accessibilityRole="button"
                        accessibilityLabel={t("profilo.esci")}
                    >
                        <Text style={styles.logoutTesto}>{t("profilo.esciTitolo")}</Text>
                        <MaterialCommunityIcons name="logout" size={20} color={colors.dangerDark} />
                    </Pressable>
                </View>

                {/* sul computer: account a sinistra, impostazioni a destra */}
                <View style={largo ? styles.dueColonne : undefined}>
                <View style={largo ? styles.colonnaAccount : undefined}>
                {/* tutta la card porta alla modifica: il pulsante resta, ma il dito
                    puo' toccare anche il nome */}
                <Pressable
                    style={({ pressed }) => [styles.profCard, largo && styles.profCardLarga, pressed && styles.profCardPremuta]}
                    onPress={() => router.push("/modify_profile")}
                    accessibilityRole="button"
                    accessibilityLabel={`${nickname}, ${email}. ${t("modificaProfilo.titolo")}`}
                >
                    <Avatar nome={nickname} dimensione={largo ? 72 : 56} />
                    <View style={[styles.profileInfo, largo && styles.profileInfoLarga]}>
                        <Text style={[styles.profileName, largo && styles.testoCentrato]} numberOfLines={1}>{nickname}</Text>
                        <Text style={[styles.profileEmail, largo && styles.testoCentrato]} numberOfLines={1}>{email}</Text>
                    </View>
                    <View style={styles.modificaPillola}>
                        <MaterialCommunityIcons name="pencil" size={16} color={colors.primaryDark} />
                        <Text style={styles.modificaTesto}>{t("comune.modifica")}</Text>
                    </View>
                </Pressable>
                {largo && azioniAccount}
                </View>

                <View style={largo ? styles.colonnaImpostazioni : undefined}>
                <Text style={[styles.sectionLabel, largo && styles.primaSezioneLarga]}>{t("profilo.sezioneApp")}</Text>
                <View style={styles.sectionCard}>
                    {/* in Expo Go il modulo delle notifiche non esiste: uno switch
                        che non puo' funzionare e' peggio di una voce assente */}
                    {NOTIFICHE_DISPONIBILI && (
                    <>
                    <Riga
                        icona="bell"
                        colore={COLORI_RIGHE.promemoria}
                        etichetta={t("profilo.promemoria")}
                        dettaglio={promemoria ? t("profilo.promemoriaSi") : t("profilo.promemoriaNo")}
                        destra={
                            <Switch
                                value={promemoria}
                                onValueChange={handlePromemoria}
                                disabled={promemoriaInCorso}
                                accessibilityLabel={t("profilo.promemoria")}
                            />
                        }
                    />
                    <View style={styles.rowDivider} />
                    </>
                    )}
                    <Riga
                        icona="cash-multiple"
                        colore={COLORI_RIGHE.valuta}
                        etichetta={t("profilo.valuta")}
                        dettaglio={`${nomeValuta(valuta)} (${simbolo(valuta)})`}
                        onPress={() => setShowValutaDialog(true)}
                    />
                    <View style={styles.rowDivider} />
                    <Riga
                        icona="translate"
                        colore={COLORI_RIGHE.lingua}
                        etichetta={t("lingua.titolo")}
                        dettaglio={t(`lingua.${lingua}`)}
                        onPress={() => setShowLinguaDialog(true)}
                    />
                    <View style={styles.rowDivider} />
                    {/* cambia subito: niente da confermare, si torna indietro con lo stesso tocco */}
                    <Riga
                        icona="weather-night"
                        colore={COLORI_RIGHE.tema}
                        etichetta={t("profilo.temaScuro")}
                        destra={<Switch value={scuro} onValueChange={impostaScuro} accessibilityLabel={t("profilo.temaScuro")} />}
                    />
                </View>

                <Text style={styles.sectionLabel}>{t("profilo.sezioneDati")}</Text>
                <View style={styles.sectionCard}>
                    <Riga
                        icona="receipt"
                        colore={COLORI_RIGHE.esporta}
                        etichetta={t("profilo.esportaSpese")}
                        onPress={() => handleExport("expenses")}
                        disabilitata={esportazione !== null}
                        destra={esportazione === "expenses" ? <ActivityIndicator size={18} /> : <MaterialCommunityIcons name="download" size={22} color={colors.chevron} />}
                    />
                    <View style={styles.rowDivider} />
                    <Riga
                        icona="autorenew"
                        colore={COLORI_RIGHE.esporta}
                        etichetta={t("profilo.esportaAbbonamenti")}
                        onPress={() => handleExport("subscriptions")}
                        disabilitata={esportazione !== null}
                        destra={esportazione === "subscriptions" ? <ActivityIndicator size={18} /> : <MaterialCommunityIcons name="download" size={22} color={colors.chevron} />}
                    />
                </View>

                <Text style={styles.sectionLabel}>{t("profilo.sezioneSupporto")}</Text>
                <View style={styles.sectionCard}>
                    <Riga
                        icona="school"
                        colore={COLORI_RIGHE.tutorial}
                        etichetta={t("profilo.rivediTutorial")}
                        onPress={() => router.navigate({ pathname: "/(tabs)/home", params: { tour: "1" } })}
                    />
                    <View style={styles.rowDivider} />
                    <Riga
                        icona="help"
                        colore={COLORI_RIGHE.supporto}
                        etichetta={t("profilo.contattaci")}
                        onPress={() => setShowSupportDialog(true)}
                    />
                    <View style={styles.rowDivider} />
                    <Riga
                        icona="shield-lock"
                        colore={COLORI_RIGHE.neutro}
                        etichetta={t("profilo.privacy")}
                        onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
                        destra={<MaterialCommunityIcons name="open-in-new" size={20} color={colors.chevron} />}
                    />
                </View>

                {!largo && azioniAccount}
                </View>
                </View>

            </PaginaScorrevole>

            <Portal>
                <Dialog visible={showValutaDialog} onDismiss={() => setShowValutaDialog(false)} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
                    <Dialog.Title style={finestra.titolo}>{t("profilo.valuta")}</Dialog.Title>
                    <Dialog.Content style={styles.dialogScelte}>
                        <RadioButton.Group onValueChange={scegliValuta} value={valuta}>
                            {VALUTE.map((v) => (
                                <RadioButton.Item
                                    labelStyle={[styles.opzioneTesto, v === valuta && styles.opzioneTestoScelto]}
                                    style={[styles.opzione, v === valuta && styles.opzioneScelta]}
                                    key={v}
                                    value={v}
                                    label={`${nomeValuta(v)} (${simbolo(v)})`}
                                />
                            ))}
                        </RadioButton.Group>
                    </Dialog.Content>
                    <PulsantiDialogo conferma={t("comune.chiudi")} onConferma={() => setShowValutaDialog(false)} />
                </Dialog>
            </Portal>

            <Portal>
                <Dialog visible={showLinguaDialog} onDismiss={() => setShowLinguaDialog(false)} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
                    <Dialog.Title style={finestra.titolo}>{t("lingua.titolo")}</Dialog.Title>
                    <Dialog.Content style={styles.dialogScelte}>
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
                                    labelStyle={[styles.opzioneTesto, l === lingua && styles.opzioneTestoScelto]}
                                    style={[styles.opzione, l === lingua && styles.opzioneScelta]}
                                    key={l} value={l} label={t(`lingua.${l}`)} />
                            ))}
                        </RadioButton.Group>
                        <Text style={styles.dialogNota}>{t("lingua.nota")}</Text>
                    </Dialog.Content>
                    <PulsantiDialogo conferma={t("comune.chiudi")} onConferma={() => setShowLinguaDialog(false)} />
                </Dialog>
            </Portal>

            <Portal>
                <Dialog visible={valutaNuova !== null} onDismiss={() => !valutaInCorso && setValutaNuova(null)} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
                    <IconaDialogo nome="swap-horizontal" />
                    <Dialog.Title style={[finestra.titolo, finestra.titoloCentrato]}>
                        {valutaNuova ? t("profilo.passareA", { valuta: `${nomeValuta(valutaNuova)} (${simbolo(valutaNuova)})` }) : ""}
                    </Dialog.Title>
                    <Dialog.Content style={styles.dialogScelte}>
                        <RadioButton.Group
                            onValueChange={(scelta) => setConvertiPassate(scelta === "converti")}
                            value={convertiPassate ? "converti" : "mantieni"}
                        >
                            {/* ogni scelta in un riquadro con la sua spiegazione: si capisce
                                che la nota appartiene alla voce sopra e non a quella sotto */}
                            <View style={[styles.sceltaRiquadro, convertiPassate && styles.sceltaRiquadroScelto]}>
                                <RadioButton.Item
                                    labelStyle={[styles.opzioneTesto, styles.opzioneTestoScelto]}
                                    style={styles.opzioneInRiquadro}
                                    value="converti"
                                    label={t("profilo.converti")}
                                    disabled={valutaInCorso}
                                />
                                <Text style={styles.opzioneNota}>{t("profilo.convertiTesto")}</Text>
                            </View>
                            <View style={[styles.sceltaRiquadro, !convertiPassate && styles.sceltaRiquadroScelto]}>
                                <RadioButton.Item
                                    labelStyle={[styles.opzioneTesto, styles.opzioneTestoScelto]}
                                    style={styles.opzioneInRiquadro}
                                    value="mantieni"
                                    label={t("profilo.mantieni")}
                                    disabled={valutaInCorso}
                                />
                                <Text style={styles.opzioneNota}>{t("profilo.mantieniTesto")}</Text>
                            </View>
                        </RadioButton.Group>
                    </Dialog.Content>
                    <PulsantiDialogo
                        conferma={t("profilo.cambiaValuta")}
                        onConferma={confermaValuta}
                        onAnnulla={() => setValutaNuova(null)}
                        loading={valutaInCorso}
                    />
                </Dialog>
            </Portal>

            <ConfirmDialog
                visible={showLogoutDialog}
                title={t("profilo.esciTitolo")}
                message={t("profilo.esciTesto")}
                confirmLabel={t("profilo.esciTitolo")}
                destructive
                icon="logout"
                onConfirm={handleLogout}
                onDismiss={() => setShowLogoutDialog(false)}
            />

            <ConfirmDialog
                visible={showLogoutAllDialog}
                title={t("profilo.disconnettiTutti")}
                message={t("profilo.disconnettiTesto")}
                confirmLabel={t("profilo.disconnetti")}
                destructive
                icon="cellphone-remove"
                onConfirm={handleLogoutAll}
                onDismiss={() => setShowLogoutAllDialog(false)}
            />

            <Portal>
                <Dialog visible={showDeleteDialog} onDismiss={closeDeleteDialog} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
                    <IconaDialogo nome="account-remove" distruttivo />
                    <Dialog.Title style={[finestra.titolo, finestra.titoloCentrato]}>{t("profilo.eliminaAccount")}</Dialog.Title>
                    <Dialog.Content>
                        <Text style={[finestra.testo, finestra.testoCentrato, styles.deleteWarning]}>
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
                                error={!!deleteError}
                            />
                        ) : (
                            <Text style={[finestra.testo, finestra.testoCentrato]}>
                                {t("profilo.collegatoGoogle")}
                            </Text>
                        )}
                        {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
                    </Dialog.Content>
                    <PulsantiDialogo
                        conferma={t("comune.elimina")}
                        onConferma={handleDeleteAccount}
                        onAnnulla={closeDeleteDialog}
                        distruttivo
                        loading={isDeleting}
                        confermaDisattivata={hasPassword && password.length === 0}
                    />
                </Dialog>

                <Dialog
                    visible={showSupportDialog}
                    onDismiss={() => setShowSupportDialog(false)}
                    style={[finestra.finestra, largo && DIALOGO_LARGO]}
                >
                    <IconaDialogo nome="email" />
                    <Dialog.Title style={[finestra.titolo, finestra.titoloCentrato]}>{t("profilo.supportoTitolo")}</Dialog.Title>
                    <Dialog.Content>
                        <Text style={[finestra.testo, finestra.testoCentrato]}>
                            {t("profilo.supportoTesto")}
                        </Text>
                        <Text style={styles.supportEmail} selectable>{SUPPORT_EMAIL}</Text>
                    </Dialog.Content>
                    <PulsantiDialogo
                        conferma={t("profilo.mandaEmail")}
                        onConferma={handleContatta}
                        onAnnulla={() => setShowSupportDialog(false)}
                    />
                </Dialog>
            </Portal>

            <Snackbar
      wrapperStyle={{ marginBottom: spazioBarra }} visible={!!messaggio} onDismiss={() => setMessaggio("")}>
                {messaggio}
            </Snackbar>
        </View>
    );
}

//una riga dell'elenco: cerchio colorato, testo, e a destra freccia o
//interruttore. Tutte uguali, cosi' le sezioni si leggono come un elenco solo
function Riga({ icona, colore, etichetta, dettaglio, onPress, destra, distruttiva, disabilitata }: {
    icona: string;
    colore: string;
    etichetta: string;
    dettaglio?: string;
    onPress?: () => void;
    destra?: ReactNode;
    distruttiva?: boolean;
    disabilitata?: boolean;
}) {
    const styles = useStili(creaStili);
    const { colors } = useTema();
    const contenuto = (
        <>
            <IconaCerchio icona={icona} sfondo={colore} dimensione={32} />
            <View style={styles.rowTextGroup}>
                <Text style={[styles.rowLabelInGroup, distruttiva && styles.rowLabelDistruttiva]}>{etichetta}</Text>
                {dettaglio !== undefined && <Text style={styles.rowHint}>{dettaglio}</Text>}
            </View>
            {destra ?? (onPress && <MaterialCommunityIcons name="chevron-right" size={22} color={colors.chevron} />)}
        </>
    );
    if (!onPress) return <View style={styles.row}>{contenuto}</View>;
    return (
        <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPremuta]}
            onPress={onPress}
            disabled={disabilitata}
            accessibilityRole="button"
        >
            {contenuto}
        </Pressable>
    );
}
