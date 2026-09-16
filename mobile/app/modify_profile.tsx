import { useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { TextInput, Text, Snackbar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { apiFetch } from "@/utils/apiFetch";
import { styles } from "@/styles/modify-profile.styles";

export default function modify_profile() {
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);

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
    }, []);

    async function handleSave() {
        try {
            setLoading(true);
            const response = await apiFetch("/auth/updateProfile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname }),
            });
            if (response.ok) {
                router.back();
            } else {
                const error = await response.json();
                setErrorMessage(error.detail ?? "Errore nel salvataggio");
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
            <View style={styles.header}>
                <Text onPress={() => router.back()} style={styles.headerAction}>Annulla</Text>
                <Text variant="titleMedium">Modifica profilo</Text>
                <Text onPress={loading ? undefined : handleSave} style={styles.headerActionPrimary}>
                    {loading ? "Salvo..." : "Salva"}
                </Text>
            </View>
            <View style={styles.formSection}>
                <Text style={styles.label}>Nome</Text>
                <TextInput value={nickname} onChangeText={setNickname} mode="outlined" style={styles.input} />
                <Text style={styles.label}>Email</Text>
                <TextInput
                    value={email}
                    editable={false}
                    mode="outlined"
                    style={styles.inputDisabled}
                    textColor="#888"
                    left={<TextInput.Icon icon="lock-outline" color="#aaa" />}
                />
                <Text style={styles.helperText}>L'email non può essere modificata</Text>
            </View>
            <View>
                <Pressable style={styles.settingsItem} onPress={() => router.push("/changePassw")}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#666" />
                    <View style={styles.settingsInfo}>
                        <Text style={styles.settingsLabel}>Cambia password</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
                </Pressable>
            </View>

            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
                {errorMessage}
            </Snackbar>
        </View>
    );
}
