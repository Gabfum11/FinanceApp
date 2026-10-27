import { useTranslation } from "react-i18next";
import { useState } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { salvaSessione } from "@/utils/session";
import { View } from "react-native";
import { styles } from "@/styles/change-password.styles";
import { Text, TextInput, Button, IconButton, Snackbar } from "react-native-paper";
import { router } from "expo-router";
import { useConfirmDiscard } from "@/utils/useConfirmDiscard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { FinestraComputer, contenutoInFinestra } from "@/components/FinestraComputer";
import { useSchermoLargo } from "@/utils/layout";

export default function ChangePassword() {
    const { t } = useTranslation();
    //sul computer il modulo e' una card sopra la pagina di partenza
    const largo = useSchermoLargo();
    const [pass, setPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const { lasciaUscire, dialogo } = useConfirmDiscard(pass !== "" || newPass !== "");

    async function handleModPass() {
        try {
            setLoading(true);
            const response = await apiFetch("/auth/change-password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ current_password: pass, new_password: newPass }),
            });
            if (response.ok) {
                //il server ha chiuso tutte le sessioni, compresa questa:
                //senza i token nuovi la richiesta successiva manderebbe al login
                await salvaSessione(await response.json());
                lasciaUscire();
                router.back();
            } else {
                setErrorMessage(await messaggioErrore(response, t("cambiaPassword.troppoCorta")));
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
        <FinestraComputer onInvio={handleModPass}>
        <View style={[styles.container, largo && contenutoInFinestra]}>
            <PaginaScorrevole style={styles.content} tastiera>
                {/* sul computer chiude la ✕ della finestra */}
                {!largo && <IconButton icon="chevron-left" onPress={() => router.back()} />}
                <Text variant="headlineMedium" style={styles.title}>{t("cambiaPassword.titolo")}</Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                    {t("cambiaPassword.sottotitolo")}
                </Text>

                <View style={styles.formSection}>
                    <Text style={styles.label}>{t("cambiaPassword.attuale")}</Text>
                    <TextInput
                        value={pass}
                        onChangeText={setPass}
                        secureTextEntry={!showPass}
                        mode="outlined"
                        outlineStyle={styles.inputOutline}
                        style={styles.input}
                        right={
                            <TextInput.Icon
                                icon={showPass ? "eye-off" : "eye"}
                                onPress={() => setShowPass(!showPass)}
                            />
                        }
                    />
                    <Text style={styles.label}>{t("cambiaPassword.nuova")}</Text>
                    <TextInput
                        value={newPass}
                        onChangeText={setNewPass}
                        secureTextEntry={!showNewPass}
                        mode="outlined"
                        outlineStyle={styles.inputOutline}
                        style={styles.input}
                        right={
                            <TextInput.Icon
                                icon={showNewPass ? "eye-off" : "eye"}
                                onPress={() => setShowNewPass(!showNewPass)}
                            />
                        }
                    />
                </View>

                <Button
                    mode="contained"
                    onPress={handleModPass}
                    style={styles.button}
                    labelStyle={styles.buttonLabel}
                    loading={loading}
                    disabled={loading}
                >
                    {t("cambiaPassword.aggiorna")}
                </Button>

            </PaginaScorrevole>

            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
                {errorMessage}
            </Snackbar>

            <ConfirmDialog {...dialogo} />
        </View>
        </FinestraComputer>
    );
}
