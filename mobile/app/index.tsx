import { Redirect, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { haSessione, rinnovaSeInScadenza } from "@/utils/session";
import { presentazioneVista } from "@/utils/presentazione";
import { apertaDallaHome, segnaPaginaPronta } from "@/utils/avvio";
import { Landing } from "@/components/Landing";

// La porta d'ingresso: chi ha una sessione va alla home, gli altri vedono
// - nel browser: la landing, ogni volta (e' anche la pagina che legge Google)
// - nell'app installata (telefono o icona sulla Home): la presentazione la
//   prima volta, poi il login. Aprendo l'app ogni giorno una landing darebbe
//   solo fastidio
const NEL_BROWSER = Platform.OS === "web";

export default function Index() {
  const router = useRouter();
  //null finche' non si sa dove andare; "landing" per restare qui
  const [destinazione, setDestinazione] = useState<Href | "landing" | null>(null);

  useEffect(() => {
    async function decidi() {
      const sessione = await haSessione(); //asincrono: sul telefono legge dall'archivio cifrato

      if (sessione) setDestinazione("/(tabs)/home");
      else if (NEL_BROWSER && !apertaDallaHome()) setDestinazione("landing");
      //chi ha gia' visto la presentazione non deve rivederla
      else setDestinazione((await presentazioneVista()) ? "/login" : "/presentazione");

      //il rinnovo parte DOPO aver deciso dove andare: verificare il token prima
      //significava tenere l'utente sullo spinner in attesa della rete, e senza
      //connessione mandarlo al login pur avendone uno valido.
      //Se la sessione non fosse più valida, la prima richiesta dà 401 e apiFetch
      //reindirizza al login da sé.
      if (sessione) rinnovaSeInScadenza();
    }
    decidi();
  }, []);

  //la landing e' confermata: se +html.tsx l'aveva nascosta (tema scuro), ora puo' comparire
  useEffect(() => {
    if (destinazione === "landing") segnaPaginaPronta();
  }, [destinazione]);

  if (destinazione && destinazione !== "landing") return <Redirect href={destinazione} />;

  //nel browser la landing c'e' gia' durante il controllo: e' quella scritta
  //nell'HTML, e chi deve andare altrove non la vede perche' +html.tsx la nasconde.
  //push e non replace: "indietro" nel browser dal login riporta qui
  if (NEL_BROWSER) return <Landing vai={(pagina) => router.push(pagina)} />;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/*rotellina di caricamento */}
      <ActivityIndicator size="large" />
    </View>
  );
}
