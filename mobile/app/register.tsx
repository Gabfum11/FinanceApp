import { useState } from "react";
import { View, Image } from "react-native";
import { TextInput, Button, Text, Snackbar } from "react-native-paper";
import {styles} from "../styles/auth.styles";
import { Link } from "expo-router";
import { API_URL } from "@/config";
import { router } from "expo-router";
import { useGoogleLogin } from "@/utils/useGoogleLogin";
import { GoogleButton } from "@/components/GoogleButton";

export default function RegisterScreen() {
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
        try {
            setLoading(true)
            const response = await fetch(`${API_URL}/auth/register`, {
                method:"POST",
                headers: {"Content-Type": "application/json"},
                body:JSON.stringify({nickname,email,password}),
            });
            if(!response.ok) {
                const error= await response.json();
                setErrorMessage(error.detail)
                setSnackbarVisible(true)
                console.log("Registrazione fallita:", error.detail);
                return;
            }
            const data=await response.json();
            router.push({
                pathname:"/verify_email",
                params: {email:data.email},
            });
        } catch(error) {
            console.log("Errore di rete", error);
        } finally{
            setLoading(false)
        }
    }
    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <Image source={require("../assets/images/logo/saldo-icon-180.png")} style={styles.logo} />
                <Text style={styles.logoLabel}>TrackIt</Text>
            </View>
            <Text variant="headlineMedium" style={styles.title}>
                Crea il tuo account
            </Text>
            <TextInput
                label="Name"
                value={nickname}
                onChangeText={setnickName}
                mode="outlined"
                outlineStyle={styles.inputOutline}
                style={styles.input}
            />
            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none" //evita che la prima lettera sia scelta in maiuscolo
                mode="outlined"
                outlineStyle={styles.inputOutline}
                keyboardType="email-address"
                style={styles.input}
            />

            <TextInput
                label="Password"
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
                Registrati
            </Button>

            {google.isReady && (
                <>
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>oppure</Text>
                        <View style={styles.dividerLine} />
                    </View>
                    <GoogleButton
                        onPress={google.signIn}
                        disabled={google.isLoading || loading}
                    />
                </>
            )}

            <Text style={styles.link}>
                Hai già un account?{" "}
            <Link href="/login">
            <Text style={styles.linkAction}>Accedi</Text>   
            </Link>
            </Text>
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
            >
                {errorMessage}
            </Snackbar>
        </View>
    );
}