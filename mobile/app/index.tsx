import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { haSessione, rinnovaSeInScadenza } from "@/utils/session";
import { presentazioneVista } from "@/utils/presentazione";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [vista, setVista] = useState(true);

  useEffect(() => {
    async function checkToken() {
      const sessione = await haSessione(); //asincrono:richiede un breve momento per leggere dal disco del telefono
      setHasToken(sessione);
      //chi ha gia' una sessione non deve rivedere la presentazione: si legge solo senza
      if (!sessione) setVista(await presentazioneVista());
      setIsLoading(false);

      //il rinnovo parte DOPO aver deciso dove andare: verificare il token prima
      //significava tenere l'utente sullo spinner in attesa della rete, e senza
      //connessione mandarlo al login pur avendone uno valido.
      //Se la sessione non fosse più valida, la prima richiesta dà 401 e apiFetch
      //reindirizza al login da sé.
      if (sessione) rinnovaSeInScadenza();
    }
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {/*rotellina di caricamento */}
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasToken) return <Redirect href="/(tabs)/home" />;
  return <Redirect href={vista ? "/login" : "/presentazione"} />;
}
