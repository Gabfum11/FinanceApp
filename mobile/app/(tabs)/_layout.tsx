import { Tabs } from "expo-router";
import { AppState } from "react-native";
import { useEffect } from "react";
import { rinnovaSeInScadenza } from "@/utils/session";
import { BarraSchede } from "@/components/BarraSchede";
import { sincronizzaDispositivo } from "@/utils/notifications";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
  const { t } = useTranslation();

  //un'app lasciata in background non passa da index.tsx: al rientro in primo
  //piano il token di accesso è quasi sempre scaduto, e conviene rinnovarlo
  //prima che le schermate ripartano con le loro richieste
  useEffect(() => {
    //il push token può cambiare o il permesso essere stato tolto dalle
    //impostazioni: il backend deve saperlo per sapere dove inviare i promemoria
    sincronizzaDispositivo();
    const sub = AppState.addEventListener("change", async (stato) => {
      if (stato === "active") {
        await rinnovaSeInScadenza();
        sincronizzaDispositivo();
      }
    });
    return () => sub.remove();
  }, []);
  return (
    //la barra la disegna BarraSchede: staccata dai bordi, con il "+" in mezzo.
    //Qui restano solo i nomi delle schede, che lei legge da options.title
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarraSchede {...props} />}>
      <Tabs.Screen name="home" options={{ title: t("schede.home") }} />
      <Tabs.Screen name="stats" options={{ title: t("schede.statistiche") }} />
      <Tabs.Screen name="add-placeholder" options={{ title: t("schede.aggiungi") }} />
      <Tabs.Screen name="budget" options={{ title: t("schede.abbonamenti") }} />
      <Tabs.Screen name="profile" options={{ title: t("schede.profilo") }} />
    </Tabs>
  );
}
