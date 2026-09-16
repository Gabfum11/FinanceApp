import { View } from "react-native";
import { Text, IconButton, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { styles } from "@/styles/profile.styles";
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function ProfileScreen() {
    const router = useRouter();
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");

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
        </View>
    );
}
