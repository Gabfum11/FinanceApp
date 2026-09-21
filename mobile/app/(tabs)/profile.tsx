import { View } from "react-native";
import { Text, IconButton, Button, Dialog, Portal, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { styles } from "@/styles/profile.styles";
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
                <IconButton
                    icon="logout"
                    mode="outlined"
                    iconColor="#E74C3C"
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

            <Button
                mode="text"
                textColor="#C0392B"
                onPress={() => setShowDeleteDialog(true)}
                style={styles.deleteButton}
            >
                Elimina account
            </Button>

            <Portal>
                <Dialog visible={showDeleteDialog} onDismiss={closeDeleteDialog}>
                    <Dialog.Title>Elimina account</Dialog.Title>
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
                            textColor="#C0392B"
                            disabled={isDeleting || password.length === 0}
                            loading={isDeleting}
                        >
                            Elimina
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}
