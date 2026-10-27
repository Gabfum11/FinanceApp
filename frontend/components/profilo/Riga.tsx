import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { creaStili } from "@/styles/profile.styles";
import { IconaCerchio } from "@/components/IconaCategoria";
import { useStili, useTema } from "@/utils/tema";

//una riga dell'elenco: cerchio colorato, testo, e a destra freccia o
//interruttore. Tutte uguali, cosi' le sezioni si leggono come un elenco solo
export function Riga({ icona, colore, etichetta, dettaglio, onPress, destra, distruttiva, disabilitata }: {
    icona: string;
    colore: string;
    etichetta: string;
    dettaglio?: string;
    onPress?: () => void;
    destra?: ReactNode;
    distruttiva?: boolean;
    disabilitata?: boolean;
}) {
    const styles = useStili(creaStili);
    const { colors } = useTema();
    const contenuto = (
        <>
            <IconaCerchio icona={icona} sfondo={colore} dimensione={32} />
            <View style={styles.rowTextGroup}>
                <Text style={[styles.rowLabelInGroup, distruttiva && styles.rowLabelDistruttiva]}>{etichetta}</Text>
                {dettaglio !== undefined && <Text style={styles.rowHint}>{dettaglio}</Text>}
            </View>
            {destra ?? (onPress && <MaterialCommunityIcons name="chevron-right" size={22} color={colors.chevron} />)}
        </>
    );
    if (!onPress) return <View style={styles.row}>{contenuto}</View>;
    return (
        <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPremuta]}
            onPress={onPress}
            disabled={disabilitata}
            accessibilityRole="button"
        >
            {contenuto}
        </Pressable>
    );
}
