import { useState } from "react";
import { View } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { API_URL, PRIVACY_URL } from "@/config";
import { salvaSessione } from "@/utils/session"; //salva i token in modo persistente al riavvio dell'app
import { useGoogleLogin } from "@/utils/useGoogleLogin";
import { GoogleButton } from "@/components/GoogleButton";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { usePreferenze } from "@/utils/preferenze";
import { useStili } from "@/utils/tema";
import { creaStili } from "@/styles/auth.styles";

// I moduli di accesso e registrazione, senza la pagina intorno: li usano le
// schermate /login e /register e, sul computer, la finestra che si apre sopra
// la landing (FinestraAccesso).

type Props = {
  /** come mostrare un errore: la pagina usa la Snackbar, la finestra una riga sotto il pulsante */
  onErrore: (messaggio: string) => void;
  /** nella finestra si passa all'altro modulo senza cambiare pagina; senza, e' un link */
  onCambia?: () => void;
};

export function ModuloAccesso({ onErrore, onCambia }: Props) {
  const styles = useStili(creaStili);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const google = useGoogleLogin({
    onSuccess: () => router.replace("/(tabs)/home"),
    onError: onErrore,
  });

  async function handleLogin() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, { //apiurl serve per non scrivere ogni volta l'url completo, ma solo la parte finale
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }), //è una scorciatoia JavaScript per scrivere { email: email, password: password } (quando il nome della chiave coincide col nome della variabile, puoi ometterlo)
      });

      if (!response.ok) {
        const messaggio = await messaggioErrore(response, t("login.nonRiuscito"));
        onErrore(messaggio);
        console.log("errore", messaggio);
        return;
      }

      const data = await response.json(); //json decodifica la rispota in un oggetto js utilizzabile
      await salvaSessione(data); //permette la persistenza dei token al riavvio
      console.log("Login riuscito, token salvato"); //il token è necessario per una navigazione automatica post login
      router.replace("/(tabs)/home");
    } catch (error) {
      console.log("Errore di rete:", error);
      onErrore(t("errori.rete"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Text variant="headlineMedium" style={styles.title} role="heading">
        {t("login.titolo")}
      </Text>

      <TextInput
        label={t("comune.email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none" //evita che la prima lettera sia scelta in maiuscolo
        autoComplete="email"
        mode="outlined"
        outlineStyle={styles.inputOutline}
        keyboardType="email-address"
        style={styles.input}
      />
      <Text style={styles.linkAction} role="link" onPress={() => router.push("/resetPassword")}>{t("login.dimenticata")}</Text>
      <TextInput
        label={t("comune.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword} //nasconde i caratteri(mostra pallini o asteriscghi)
        autoComplete="current-password"
        mode="outlined"
        outlineStyle={styles.inputOutline}
        style={styles.input}
        //Invio dalla password accede, come in ogni modulo di accesso sul computer
        onSubmitEditing={handleLogin}
        right={
          <TextInput.Icon
            icon={showPassword ? "eye-off" : "eye"}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />
      <Button
        mode="contained"
        onPress={handleLogin}
        style={styles.button}
        labelStyle={styles.buttonLabel}
        loading={loading}
        disabled={loading}
      >
        {t("accesso.accedi")}
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
          {/* dal login, Google crea l'account a chi non ce l'ha: senza avviso
              l'utente si registrerebbe senza aver visto l'informativa */}
          <Text style={styles.legal}>
            {t("accesso.legaleGoogle")}
            <Text style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
              {t("accesso.informativa")}
            </Text>
          </Text>
        </>
      )}

      <Text style={styles.link}>
        {t("accesso.nonHaiAccount")}{" "}
        {onCambia ? (
          <Text style={styles.linkAction} role="link" onPress={onCambia}>{t("accesso.registrati")}</Text>
        ) : (
          <Link href="/register">
            <Text style={styles.linkAction}>{t("accesso.registrati")}</Text>
          </Link>
        )}
      </Text>
    </>
  );
}

/** nella finestra il codice si chiede li'; senza, si apre la pagina /verify_email */
export function ModuloRegistrazione({ onErrore, onCambia, onRegistrato }: Props & { onRegistrato?: (email: string) => void }) {
  const styles = useStili(creaStili);
  const router = useRouter();
  const { t } = useTranslation();
  //l'email con il codice parte subito: deve essere nella lingua scelta qui
  const { lingua } = usePreferenze();
  const [nickname, setnickName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const google = useGoogleLogin({
    onSuccess: () => router.replace("/(tabs)/home"),
    onError: onErrore,
  });

  async function handleRegister() {
    //stesse regole del server (1-50 caratteri): senza, un nome troppo lungo
    //mostrerebbe il messaggio sulla password, che porta fuori strada
    if (nickname.trim() === "") {
      onErrore(t("modificaProfilo.nomeVuoto"));
      return;
    }
    if (nickname.trim().length > 50) {
      onErrore(t("modificaProfilo.nomeLungo"));
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), email, password, language: lingua }),
      });
      if (!response.ok) {
        const messaggio = await messaggioErrore(response, t("registrazione.datiErrati"));
        onErrore(messaggio);
        console.log("Registrazione fallita:", messaggio);
        return;
      }
      const data = await response.json();
      if (onRegistrato) {
        onRegistrato(data.email);
        return;
      }
      router.push({
        pathname: "/verify_email",
        params: { email: data.email },
      });
    } catch (error) {
      console.log("Errore di rete", error);
      onErrore(t("errori.rete"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Text variant="headlineMedium" style={styles.title} role="heading">
        {t("registrazione.titolo")}
      </Text>
      <TextInput
        label={t("registrazione.nome")}
        value={nickname}
        onChangeText={setnickName}
        autoComplete="name"
        mode="outlined"
        outlineStyle={styles.inputOutline}
        style={styles.input}
      />
      <TextInput
        label={t("comune.email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none" //evita che la prima lettera sia scelta in maiuscolo
        autoComplete="email"
        mode="outlined"
        outlineStyle={styles.inputOutline}
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        label={t("comune.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword} //nasconde i caratteri(mostra pallini o asterischi)
        autoComplete="new-password"
        mode="outlined"
        outlineStyle={styles.inputOutline}
        style={styles.input}
        onSubmitEditing={handleRegister}
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
        {onCambia ? (
          <Text style={styles.linkAction} role="link" onPress={onCambia}>{t("accesso.accedi")}</Text>
        ) : (
          <Link href="/?accedi=1">
            <Text style={styles.linkAction}>{t("accesso.accedi")}</Text>
          </Link>
        )}
      </Text>
    </>
  );
}
