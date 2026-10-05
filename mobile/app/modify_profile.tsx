import { useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { TextInput, Text, Snackbar } from "react-native-paper";
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
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    //il nome letto dal server: serve a capire se l'utente l'ha cambiato
    const [nicknameOriginale, setNicknameOriginale] = useState("");
    const { lasciaUscire, dialogo } = useConfirmDiscard(nickname !== nicknameOriginale); //se il nickname è cambiato, chiedo conferma prima di uscire

    useEffect(() => {
        async function loadUser() {
            const response = await apiFetch("/auth/me");
            if (response.ok) {
                const data = await response.json(); 
                setNickname((data.nickname ?? "").trim());
                setNicknameOriginale((data.nickname ?? "").trim());
                setEmail(data.email);
            }
        }
        loadUser();
    }, []);

    async function handleSave() {
        if (nickname.trim() === "") {
            setErrorMessage(t("modificaProfilo.nomeVuoto"));
            setSnackbarVisible(true);
            return;
        }
        if (nickname.length > 50) {
            setErrorMessage(t("modificaProfilo.nomeLungo"));
            setSnackbarVisible(true);
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
                <View style={styles.header}>
                    <Text onPress={() => router.back()} style={styles.headerAction}>{t("comune.annulla")}</Text>
                    <Text variant="titleMedium">{t("modificaProfilo.titolo")}</Text>
                    <Text onPress={loading ? undefined : handleSave} style={styles.headerActionPrimary}>
                        {loading ? t("comune.salvataggio") : t("comune.salva")}
                    </Text>
                </View>
                <View style={styles.formSection}>
                    <Text style={styles.label}>{t("modificaProfilo.nome")}</Text>
                    <TextInput value={nickname} onChangeText={setNickname} mode="outlined" style={styles.input} />
                    <Text style={styles.label}>{t("comune.email")}</Text>
                    <TextInput
                        value={email}
                        editable={false}
                        mode="outlined"
                        style={styles.inputDisabled}
                        textColor={colors.textMuted}
                        left={<TextInput.Icon icon="lock-outline" color={colors.textDisabled} />}
                    />
                    <Text style={styles.helperText}>{t("modificaProfilo.emailFissa")}</Text>
                </View>
                <View>
                    <Pressable style={styles.settingsItem} onPress={() => router.push("/changePassw")}>
                        <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />
                        <View style={styles.settingsInfo}>
                            <Text style={styles.settingsLabel}>{t("modificaProfilo.cambiaPassword")}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
                    </Pressable>
                </View>

            </PaginaScorrevole>

            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
                {errorMessage}
            </Snackbar>

            <ConfirmDialog {...dialogo} />
        </View>
        </FinestraComputer>
    );
}
