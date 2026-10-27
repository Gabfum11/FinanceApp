import { View } from "react-native";
import { Text, Dialog, Portal, RadioButton } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { IconaDialogo, PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";
import { creaStili } from "@/styles/profile.styles";
import { usePreferenze } from "@/utils/preferenze";
import { VALUTE, LINGUE, simbolo, type Valuta, type Lingua } from "@/utils/formato";
import { useStili } from "@/utils/tema";
import { DIALOGO_LARGO, useSchermoLargo } from "@/utils/layout";

//l'elenco delle valute: la scelta passa poi da FinestraConversione
export function FinestraValuta({ visible, onScegli, onChiudi }: {
    visible: boolean;
    onScegli: (valuta: string) => void;
    onChiudi: () => void;
}) {
    const styles = useStili(creaStili);
    const finestra = useStili(creaStiliFinestra);
    const largo = useSchermoLargo();
    const { valuta } = usePreferenze();
    const { t } = useTranslation();
    const nomeValuta = (v: Valuta) => t(`valute.${v}`);

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onChiudi} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
                <Dialog.Title style={finestra.titolo}>{t("profilo.valuta")}</Dialog.Title>
                <Dialog.Content style={styles.dialogScelte}>
                    <RadioButton.Group onValueChange={onScegli} value={valuta}>
                        {VALUTE.map((v) => (
                            <RadioButton.Item
                                labelStyle={[styles.opzioneTesto, v === valuta && styles.opzioneTestoScelto]}
                                style={[styles.opzione, v === valuta && styles.opzioneScelta]}
                                key={v}
                                value={v}
                                label={`${nomeValuta(v)} (${simbolo(v)})`}
                            />
                        ))}
                    </RadioButton.Group>
                </Dialog.Content>
                <PulsantiDialogo conferma={t("comune.chiudi")} onConferma={onChiudi} />
            </Dialog>
        </Portal>
    );
}

//la lingua cambia subito alla scelta
export function FinestraLingua({ visible, onChiudi }: { visible: boolean; onChiudi: () => void }) {
    const styles = useStili(creaStili);
    const finestra = useStili(creaStiliFinestra);
    const largo = useSchermoLargo();
    const { lingua, impostaLingua } = usePreferenze();
    const { t } = useTranslation();

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onChiudi} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
                <Dialog.Title style={finestra.titolo}>{t("lingua.titolo")}</Dialog.Title>
                <Dialog.Content style={styles.dialogScelte}>
                    <RadioButton.Group
                        onValueChange={(scelta) => {
                            onChiudi();
                            impostaLingua(scelta as Lingua);
                        }}
                        value={lingua}
                    >
                        {/* ogni lingua nella sua lingua: chi non capisce l'italiano la riconosce */}
                        {LINGUE.map((l) => (
                            <RadioButton.Item
                                labelStyle={[styles.opzioneTesto, l === lingua && styles.opzioneTestoScelto]}
                                style={[styles.opzione, l === lingua && styles.opzioneScelta]}
                                key={l} value={l} label={t(`lingua.${l}`)} />
                        ))}
                    </RadioButton.Group>
                    <Text style={styles.dialogNota}>{t("lingua.nota")}</Text>
                </Dialog.Content>
                <PulsantiDialogo conferma={t("comune.chiudi")} onConferma={onChiudi} />
            </Dialog>
        </Portal>
    );
}

//scelta la nuova valuta: convertire le spese passate o lasciare i numeri come sono
export function FinestraConversione({ valutaNuova, convertiPassate, onConvertiPassate, inCorso, onConferma, onAnnulla }: {
    //null = finestra chiusa
    valutaNuova: Valuta | null;
    convertiPassate: boolean;
    onConvertiPassate: (converti: boolean) => void;
    inCorso: boolean;
    onConferma: () => void;
    onAnnulla: () => void;
}) {
    const styles = useStili(creaStili);
    const finestra = useStili(creaStiliFinestra);
    const largo = useSchermoLargo();
    const { t } = useTranslation();
    const nomeValuta = (v: Valuta) => t(`valute.${v}`);

    return (
        <Portal>
            <Dialog visible={valutaNuova !== null} onDismiss={() => !inCorso && onAnnulla()} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
                <IconaDialogo nome="swap-horizontal" />
                <Dialog.Title style={[finestra.titolo, finestra.titoloCentrato]}>
                    {valutaNuova ? t("profilo.passareA", { valuta: `${nomeValuta(valutaNuova)} (${simbolo(valutaNuova)})` }) : ""}
                </Dialog.Title>
                <Dialog.Content style={styles.dialogScelte}>
                    <RadioButton.Group
                        onValueChange={(scelta) => onConvertiPassate(scelta === "converti")}
                        value={convertiPassate ? "converti" : "mantieni"}
                    >
                        {/* ogni scelta in un riquadro con la sua spiegazione: si capisce
                            che la nota appartiene alla voce sopra e non a quella sotto */}
                        <View style={[styles.sceltaRiquadro, convertiPassate && styles.sceltaRiquadroScelto]}>
                            <RadioButton.Item
                                labelStyle={[styles.opzioneTesto, styles.opzioneTestoScelto]}
                                style={styles.opzioneInRiquadro}
                                value="converti"
                                label={t("profilo.converti")}
                                disabled={inCorso}
                            />
                            <Text style={styles.opzioneNota}>{t("profilo.convertiTesto")}</Text>
                        </View>
                        <View style={[styles.sceltaRiquadro, !convertiPassate && styles.sceltaRiquadroScelto]}>
                            <RadioButton.Item
                                labelStyle={[styles.opzioneTesto, styles.opzioneTestoScelto]}
                                style={styles.opzioneInRiquadro}
                                value="mantieni"
                                label={t("profilo.mantieni")}
                                disabled={inCorso}
                            />
                            <Text style={styles.opzioneNota}>{t("profilo.mantieniTesto")}</Text>
                        </View>
                    </RadioButton.Group>
                </Dialog.Content>
                <PulsantiDialogo
                    conferma={t("profilo.cambiaValuta")}
                    onConferma={onConferma}
                    onAnnulla={onAnnulla}
                    loading={inCorso}
                />
            </Dialog>
        </Portal>
    );
}
