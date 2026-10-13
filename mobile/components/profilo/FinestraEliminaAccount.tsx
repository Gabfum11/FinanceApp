import { useState } from "react";
import { Text, Dialog, Portal, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { IconaDialogo, PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";
import { creaStili } from "@/styles/profile.styles";
import { apiFetch } from "@/utils/apiFetch";
import { useStili } from "@/utils/tema";
import { DIALOGO_LARGO, useSchermoLargo } from "@/utils/layout";

//chiede la password (se l'account ne ha una) e cancella l'account sul server
export function FinestraEliminaAccount({ visible, hasPassword, onChiudi, onEliminato }: {
    visible: boolean;
    //gli account creati con Google non hanno password: chiedergliela farebbe
    //sembrare valida qualsiasi cosa scritta, perche' il server la ignora
    hasPassword: boolean;
    onChiudi: () => void;
    //account cancellato: la schermata chiude la sessione ed esce
    onEliminato: () => Promise<void>;
}) {
    const styles = useStili(creaStili);
    const finestra = useStili(creaStiliFinestra);
    const largo = useSchermoLargo();
    const { t } = useTranslation();
    const [password, setPassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function chiudi() {
        onChiudi();
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
            await onEliminato();
        } catch {
            setDeleteError(t("errori.rete"));
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={chiudi} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
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
                    onAnnulla={chiudi}
                    distruttivo
                    loading={isDeleting}
                    confermaDisattivata={hasPassword && password.length === 0}
                />
            </Dialog>
        </Portal>
    );
}
