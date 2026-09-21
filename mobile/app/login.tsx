import { useState } from "react";
import { View, Image } from "react-native";
import { TextInput, Button, Text, Checkbox,Snackbar } from "react-native-paper";
import {styles} from "../styles/auth.styles";
import { Link } from "expo-router";
import { API_URL } from "@/config";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useGoogleLogin } from "@/utils/useGoogleLogin";
import { GoogleButton } from "@/components/GoogleButton";


export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const[remember_me, setRememberMe]=useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [showPassword, setShowPassword]=useState(false)
  const router=useRouter();
  const google = useGoogleLogin({
    onSuccess: () => router.replace("/(tabs)/home"),
    onError: (message) => {
      setErrorMessage(message);
      setSnackbarVisible(true);
    },
  });
 async function handleLogin() {
  try {
    setLoading(true);
    const response = await fetch(`${API_URL}/auth/login`, { //apiurl serve per non scrivere ogni volta l'url completo, ma solo la parte finale
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember_me }), //è una scorciatoia JavaScript per scrivere { email: email, password: password } (quando il nome della chiave coincide col nome della variabile, puoi ometterlo)
    });

    if (!response.ok) {
      const error= await response.json();
      setErrorMessage(error.detail)
      setSnackbarVisible(true)
      console.log("errore", error);
      return;
    }

    const data = await response.json(); //json decodifica la rispota in un oggetto js utilizzabile
    await SecureStore.setItemAsync("token", data.access_token); //permette la persistenza del token al riavvio
    console.log("Login riuscito, token salvato"); //il token è necessario per una navigazione automatica post login
    router.replace("/(tabs)/home")
  } catch (error) {
    console.log("Errore di rete:", error);
  } finally {
    setLoading(false)
  }
}

  return (
    <View style={styles.container}>{/*container di tutta la schermata*/}
      <View style={styles.logoContainer}>
        <Image source={require("../assets/images/logo/saldo-icon-180.png")} style={styles.logo} />
        <Text style={styles.logoLabel}>TrackIt</Text>
      </View>
      <Text variant="headlineMedium" style={styles.title}>
        Bentornato
      </Text>

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
      <Text style={styles.linkAction} onPress={()=>router.push('/resetPassword')}>Password dimenticata?</Text>
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
      <View style={styles.checkboxRow}>
        <Checkbox status={remember_me ? "checked" : "unchecked"} onPress={() => setRememberMe(!remember_me)} /> 
        <Text> Ricordami su questo dispositivo</Text>
      </View>
      <Button 
        mode="contained" 
        onPress={handleLogin} 
        style={styles.button}
        labelStyle={styles.buttonLabel}
        loading={loading}
        disabled={loading}
        >
        Accedi
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
        Non hai un account?{" "}
        <Link href="/register"> 
         <Text style={styles.linkAction}> Registrati </Text>
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