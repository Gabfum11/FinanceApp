import { View } from "react-native";
import { Text, TextInput, Button, Snackbar, IconButton } from "react-native-paper";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferenze } from "@/utils/preferenze";
import { simbolo, IMPORTO_MASSIMO } from "@/utils/formato";
import { router } from "expo-router";
import { apiFetch } from "@/utils/apiFetch";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { styles } from "@/styles/set-budget.styles";
import { useConfirmDiscard } from "@/utils/useConfirmDiscard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FinestraComputer, contenutoInFinestra } from "@/components/FinestraComputer";
import { useSchermoLargo } from "@/utils/layout";

export default function SetBudgetScreen() {
    const { t } = useTranslation();
    //sul computer il modulo e' una card sopra la pagina di partenza
    const largo = useSchermoLargo();
    const { valuta, importo } = usePreferenze();
    const [amount, setAmount] = useState("");
    const [startDay, setStartDay] = useState("1");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const { lasciaUscire, dialogo } = useConfirmDiscard(amount !== "" || startDay !== "1");

    async function handleSave() {
        //la tastiera italiana scrive la virgola: "1200,50" senza questo diventava 1200
        const parsedAmount = parseFloat(amount.replace(",", "."));
        const parsedStartDay = parseInt(startDay, 10);

        if (!parsedAmount || parsedAmount <= 0) {
            setErrorMessage(t("budgetNuovo.importoNonValido"));
            setSnackbarVisible(true);
            return;
        }
        if (parsedAmount > IMPORTO_MASSIMO) {
            setErrorMessage(t("budgetNuovo.importoTroppoAlto", { massimo: importo(IMPORTO_MASSIMO) }));
            setSnackbarVisible(true);
            return;
        }
        if (!parsedStartDay || parsedStartDay < 1 || parsedStartDay > 31) {
            setErrorMessage(t("budgetNuovo.giornoNonValido"));
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
                lasciaUscire();
                router.back();
            } else {
                setErrorMessage(await messaggioErrore(response, t("budgetNuovo.erroreSalvataggio")));
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
        <FinestraComputer onInvio={handleSave}>
        <View style={[styles.container, largo && contenutoInFinestra, largo && { paddingTop: 28 }]}>
            {/* sul computer chiude la ✕ della finestra */}
            {!largo && <IconButton icon="chevron-left" onPress={() => router.back()} />}
            <Text variant="headlineMedium" style={styles.title}>{t("budgetNuovo.titolo")}</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
                {t("budgetNuovo.sottotitolo")}
            </Text>

            <Text style={styles.label}>{t("budgetNuovo.mensile")}</Text>
            <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder={t("budgetNuovo.esempioImporto")}
                keyboardType="decimal-pad"
                mode="outlined"
                outlineStyle={styles.inputOutline}
                style={styles.input}
                left={<TextInput.Affix text={simbolo(valuta)} />}
            />

            <Text style={styles.label}>{t("budgetNuovo.giorno")}</Text>
            <TextInput
                value={startDay}
                onChangeText={(text) => setStartDay(text.replace(/[^0-9]/g, "").slice(0, 2))}
                placeholder={t("budgetNuovo.esempioGiorno")}
                keyboardType="number-pad"
                mode="outlined"
                outlineStyle={styles.inputOutline}
                style={styles.input}
            />
            <Text style={styles.helperText}>
                {t("budgetNuovo.spiegazione")}
            </Text>
            {/* i periodi si ritagliano tutti con il giorno attuale, anche quelli chiusi */}
            <Text style={styles.helperText}>
                {t("budgetNuovo.ricalcolo")}
            </Text>

            <Button
                mode="contained"
                onPress={handleSave}
                style={styles.button}
                labelStyle={styles.buttonLabel}
                loading={loading}
                disabled={loading}
            >
                {t("budgetNuovo.salva")}
            </Button>

            <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
                {errorMessage}
            </Snackbar>

            <ConfirmDialog {...dialogo} />
        </View>
        </FinestraComputer>
    );
}
