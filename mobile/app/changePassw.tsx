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

export default function changePassw() {
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
                setErrorMessage(await messaggioErrore(response, "La nuova password deve avere almeno 8 caratteri"));
                setSnackbarVisible(true);
            }
        } catch (error) {
            setErrorMessage("Errore di rete");
            setSnackbarVisible(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <IconButton icon="chevron-left" onPress={() => router.back()} />
            <Text variant="headlineMedium" style={styles.title}>Cambia password</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
                Inserisci la password attuale e quella nuova
            </Text>

            <View style={styles.formSection}>
                <Text style={styles.label}>Password attuale</Text>
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
                <Text style={styles.label}>Nuova password</Text>
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
                Aggiorna Password
            </Button>

            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
                {errorMessage}
            </Snackbar>

            <ConfirmDialog {...dialogo} />
        </View>
    );
}
