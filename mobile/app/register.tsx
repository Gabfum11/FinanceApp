import { useState } from "react";
import { View, Image } from "react-native";
import { TextInput, Button, Text, Snackbar } from "react-native-paper";
import {styles} from "../styles/auth.styles";
import { Link } from "expo-router";
import { API_URL, PRIVACY_URL } from "@/config";
import { router } from "expo-router";
import { useGoogleLogin } from "@/utils/useGoogleLogin";
import { GoogleButton } from "@/components/GoogleButton";
import { messaggioErrore } from "@/utils/messaggioErrore";
import * as WebBrowser from "expo-web-browser";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useTranslation } from "react-i18next";
import { usePreferenze } from "@/utils/preferenze";

export default function RegisterScreen() {
    const { t } = useTranslation();
    //l'email con il codice parte subito: deve essere nella lingua scelta qui
    const { lingua } = usePreferenze();
    const[nickname,setnickName]=useState("");
    const[email,setEmail]=useState("");
    const[password,setPassword]=useState("")
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [showPassword,setShowPassword] =useState(false);
    const google = useGoogleLogin({
        onSuccess: () => router.replace("/(tabs)/home"),
        onError: (message: string) => {
            setErrorMessage(message);
            setSnackbarVisible(true);
        },
    });
    async function handleRegister() {
        //stesse regole del server (1-50 caratteri): senza, un nome troppo lungo
        //mostrerebbe il messaggio sulla password, che porta fuori strada
        if (nickname.trim() === "") {
            setErrorMessage(t("modificaProfilo.nomeVuoto"));
            setSnackbarVisible(true);
            return;
        }
        if (nickname.trim().length > 50) {
            setErrorMessage(t("modificaProfilo.nomeLungo"));
            setSnackbarVisible(true);
            return;
        }
        try {
            setLoading(true)
            const response = await fetch(`${API_URL}/auth/register`, {
                method:"POST",
                headers: {"Content-Type": "application/json"},
                body:JSON.stringify({nickname: nickname.trim(), email, password, language: lingua}),
            });
            if(!response.ok) {
                const messaggio = await messaggioErrore(response, t("registrazione.datiErrati"));
                setErrorMessage(messaggio)
                setSnackbarVisible(true)
                console.log("Registrazione fallita:", messaggio);
                return;
            }
            const data=await response.json();
            router.push({
                pathname:"/verify_email",
                params: {email:data.email},
            });
        } catch(error) {
            console.log("Errore di rete", error);
            setErrorMessage(t("errori.rete"));
            setSnackbarVisible(true);
        } finally{
            setLoading(false)
        }
    }
    return (
        <View style={styles.container}>
            <PaginaScorrevole style={styles.content} tastiera>
                <View style={styles.logoContainer}>
                    <Image source={require("../assets/images/logo/trackit-icon-rounded-180.png")} style={styles.logo} />
                    <Text style={styles.logoLabel}>TrackIt</Text>
                </View>
                <Text variant="headlineMedium" style={styles.title}>
                    {t("registrazione.titolo")}
                </Text>
                <TextInput
                    label={t("registrazione.nome")}
                    value={nickname}
                    onChangeText={setnickName}
                    mode="outlined"
                    outlineStyle={styles.inputOutline}
                    style={styles.input}
                />
                <TextInput
                    label={t("comune.email")}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none" //evita che la prima lettera sia scelta in maiuscolo
                    mode="outlined"
                    outlineStyle={styles.inputOutline}
                    keyboardType="email-address"
                    style={styles.input}
                />

                <TextInput
                    label={t("comune.password")}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword} //nasconde i caratteri(mostra pallini o asteriscghi)
                    mode="outlined"
                    outlineStyle={styles.inputOutline}
                    style={styles.input}
                    right={
            <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)} 
            />
        }
                />
                <Button 
                    mode="contained" 
                    onPress={handleRegister} 
                    style={styles.button}
                    labelStyle={styles.buttonLabel}
                    loading={loading}
                    disabled={loading}
                    >
                    {t("accesso.registrati")}
                </Button>

                {google.isReady && (
                    <>
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>{t("comune.oppure")}</Text>
                            <View style={styles.dividerLine} />
                        </View>
                        <GoogleButton
                            onPress={google.signIn}
                            disabled={google.isLoading || loading}
                        />
                    </>
                )}

                {/* vale per entrambi i pulsanti: anche "Continua con Google" crea l'account */}
                <Text style={styles.legal}>
                    {t("accesso.legaleRegistrazione")}
                    <Text style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                        {t("accesso.informativa")}
                    </Text>
                </Text>

                <Text style={styles.link}>
                    {t("accesso.haiAccount")}{" "}
                <Link href="/login">
                <Text style={styles.linkAction}>{t("accesso.accedi")}</Text>   
                </Link>
                </Text>
            </PaginaScorrevole>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
            >
                {errorMessage}
            </Snackbar>
        </View>
    );
}