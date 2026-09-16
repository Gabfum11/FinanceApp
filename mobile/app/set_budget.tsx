import { View } from "react-native";
import { Text, TextInput, Button, Snackbar, IconButton } from "react-native-paper";
import { useState } from "react";
import { router } from "expo-router";
import { apiFetch } from "@/utils/apiFetch";
import { styles } from "@/styles/set-budget.styles";

export default function SetBudgetScreen() {
    const [amount, setAmount] = useState("");
    const [startDay, setStartDay] = useState("1");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);

    async function handleSave() {
        const parsedAmount = parseFloat(amount);
        const parsedStartDay = parseInt(startDay, 10);

        if (!parsedAmount || parsedAmount <= 0) {
            setErrorMessage("Inserisci un importo valido");
            setSnackbarVisible(true);
            return;
        }
        if (!parsedStartDay || parsedStartDay < 1 || parsedStartDay > 31) {
            setErrorMessage("Il giorno deve essere tra 1 e 31");
            setSnackbarVisible(true);
            return;
        }

        try {
            setLoading(true);
            const response = await apiFetch("/auth/updateBudget", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    monthly_budget: parsedAmount,
                    budget_start_day: parsedStartDay,
                }),
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
            <IconButton icon="chevron-left" onPress={() => router.back()} />
            <Text variant="headlineMedium" style={styles.title}>Nuovo budget</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
                Imposta quanto vuoi spendere ogni mese e da quale giorno far partire il ciclo
            </Text>

            <Text style={styles.label}>Budget mensile</Text>
            <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Es. 1200"
                keyboardType="numeric"
                mode="outlined"
                outlineStyle={styles.inputOutline}
                style={styles.input}
                left={<TextInput.Icon icon="currency-eur" />}
            />

            <Text style={styles.label}>Giorno di inizio ciclo</Text>
            <TextInput
                value={startDay}
                onChangeText={(text) => setStartDay(text.replace(/[^0-9]/g, "").slice(0, 2))}
                placeholder="Es. 1"
                keyboardType="number-pad"
                mode="outlined"
                outlineStyle={styles.inputOutline}
                style={styles.input}
            />
            <Text style={styles.helperText}>
                Il ciclo del budget riparte ogni mese da questo giorno (es. imposta 27 se ricevi lo stipendio il 27 di ogni mese). Se lasci 1, il budget segue il mese solare.
            </Text>

            <Button
                mode="contained"
                onPress={handleSave}
                style={styles.button}
                labelStyle={styles.buttonLabel}
                loading={loading}
                disabled={loading}
            >
                Salva budget
            </Button>

            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
                {errorMessage}
            </Snackbar>
        </View>
    );
}
