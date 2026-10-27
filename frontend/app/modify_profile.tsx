import { useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { TextInput, Text, Snackbar, Button, HelperText } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { apiFetch } from "@/utils/apiFetch";
import { creaStili } from "@/styles/modify-profile.styles";
import { useConfirmDiscard } from "@/utils/useConfirmDiscard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useTranslation } from "react-i18next";
import { traduciErrore } from "@/utils/messaggioErrore";
import { useStili, useTema } from "@/utils/tema";
import { FinestraComputer, contenutoInFinestra } from "@/components/FinestraComputer";
import { useSchermoLargo } from "@/utils/layout";
import { Avatar } from "@/components/Avatar";
import { IconaCerchio } from "@/components/IconaCategoria";
import { COLORI_RIGHE } from "@/styles/profile.styles";

/** Lunghezza massima del nome, la stessa che accetta il server. */
const NOME_MAX = 50;

export default function ModifyProfile() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
    const { t } = useTranslation();
    //sul computer il modulo e' una card sopra la pagina di partenza
    const largo = useSchermoLargo();
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    //errore del campo, sotto il campo: prima finiva nel messaggio in basso,
    //lontano dal punto da correggere
    const [erroreNome, setErroreNome] = useState("");
    //gli account Google non hanno password: "Cambia password" chiederebbe
    //quella attuale, che non esiste
    const [hasPassword, setHasPassword] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    //il nome letto dal server: serve a capire se l'utente l'ha cambiato
    const [nicknameOriginale, setNicknameOriginale] = useState("");
    const modificato = nickname.trim() !== nicknameOriginale;
    const { lasciaUscire, dialogo } = useConfirmDiscard(nickname !== nicknameOriginale); //se il nickname è cambiato, chiedo conferma prima di uscire

    useEffect(() => {
        async function loadUser() {
            const response = await apiFetch("/auth/me");
            if (response.ok) {
                const data = await response.json(); 
                setNickname((data.nickname ?? "").trim());
                setNicknameOriginale((data.nickname ?? "").trim());
                setEmail(data.email);
                setHasPassword(data.has_password);
            }
        }
        loadUser();
    }, []);

    async function handleSave() {
        if (nickname.trim() === "") {
            setErroreNome(t("modificaProfilo.nomeVuoto"));
            return;
        }
        if (nickname.length > NOME_MAX) {
            setErroreNome(t("modificaProfilo.nomeLungo"));
            return;
        }
        //niente da salvare: si esce e basta, invece di una chiamata inutile
        if (!modificato) {
            router.back();
            return;
        }
        try {
            setLoading(true);
            const response = await apiFetch("/auth/updateProfile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                //senza spazi ai lati: "Gabriele " diventava "Ciao Gabriele !"
                body: JSON.stringify({ nickname: nickname.trim() }),
            });
            if (response.ok) {
                lasciaUscire();
                router.back();
            } else {
                const detail = await response
                    .json()
                    .then((body) => (typeof body?.detail === "string" ? body.detail : null))
                    .catch(() => null);
                setErrorMessage(traduciErrore(detail, t("modificaProfilo.erroreSalvataggio")));
                setSnackbarVisible(true);
            }
        } catch (error) {
            setErrorMessage(t("errori.rete"));
            setSnackbarVisible(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <FinestraComputer onInvio={handleSave} conChiudi={false}>
        <View style={[styles.container, largo && contenutoInFinestra]}>
            <PaginaScorrevole style={styles.content} tastiera>
                {/* Annulla e Salva veri pulsanti: prima erano due scritte, e "Salva"
                    verde chiaro sullo sfondo arrivava a 2:1 */}
                <View style={styles.header}>
                    <Button
                        mode="text"
                        onPress={() => router.back()}
                        textColor={colors.text}
                        compact
                        contentStyle={styles.headerPulsante}
                        labelStyle={styles.headerEtichetta}
                    >
                        {t("comune.annulla")}
                    </Button>
                    <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
                        {t("modificaProfilo.titolo")}
                    </Text>
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={loading}
                        //attivo solo con qualcosa da salvare: dice anche che la modifica c'e'
                        disabled={loading || !modificato}
                        textColor={colors.surfaceDark}
                        compact
                        style={styles.salva}
                        contentStyle={styles.headerPulsante}
                        labelStyle={styles.headerEtichetta}
                    >
                        {t("comune.salva")}
                    </Button>
                </View>

                {/* le iniziali cambiano mentre si scrive: si vede subito l'effetto */}
                <View style={styles.anteprima}>
                    <Avatar nome={nickname} dimensione={72} />
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.label} nativeID="etichettaNome">{t("modificaProfilo.nome")}</Text>
                    <TextInput
                        value={nickname}
                        onChangeText={(testo) => {
                            setNickname(testo);
                            setErroreNome("");
                        }}
                        mode="outlined"
                        style={styles.input}
                        maxLength={NOME_MAX}
                        autoCapitalize="words"
                        autoComplete="name"
                        returnKeyType="done"
                        onSubmitEditing={handleSave}
                        error={erroreNome !== ""}
                        accessibilityLabelledBy="etichettaNome"
                        accessibilityLabel={t("modificaProfilo.nome")}
                    />
                    {/* l'errore se c'e', altrimenti il contatore solo vicino al limite:
                        un numero sempre visibile sarebbe rumore */}
                    {erroreNome !== "" ? (
                        <HelperText type="error" visible style={styles.helper}>{erroreNome}</HelperText>
                    ) : nickname.length >= NOME_MAX - 10 ? (
                        <HelperText type="info" visible style={styles.helper}>
                            {t("modificaProfilo.contatore", { n: nickname.length })}
                        </HelperText>
                    ) : null}

                    <Text style={[styles.label, styles.labelStaccata]}>{t("comune.email")}</Text>
                    <TextInput
                        value={email}
                        editable={false}
                        mode="outlined"
                        style={styles.inputDisabled}
                        textColor={colors.textSecondary}
                        outlineColor={colors.border}
                        right={<TextInput.Icon icon="lock" color={colors.textMuted} forceTextInputFocus={false} />}
                        accessibilityLabel={t("comune.email")}
                    />
                    <Text style={styles.helperText}>{t("modificaProfilo.emailFissa")}</Text>
                </View>

                {hasPassword && (
                <>
                <Text style={styles.sectionLabel}>{t("modificaProfilo.sezioneSicurezza")}</Text>
                <Pressable
                    style={({ pressed }) => [styles.settingsItem, pressed && styles.settingsItemPremuto]}
                    onPress={() => router.push("/changePassw")}
                    accessibilityRole="button"
                >
                    <IconaCerchio icona="lock" sfondo={COLORI_RIGHE.neutro} dimensione={32} />
                    <View style={styles.settingsInfo}>
                        <Text style={styles.settingsLabel}>{t("modificaProfilo.cambiaPassword")}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.chevron} />
                </Pressable>
                </>
                )}

            </PaginaScorrevole>

            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
                {errorMessage}
            </Snackbar>

            <ConfirmDialog {...dialogo} />
        </View>
        </FinestraComputer>
    );
}
