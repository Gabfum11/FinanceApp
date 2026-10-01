import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View, AppState } from "react-native";
import { useEffect } from "react";
import { rinnovaSeInScadenza } from "@/utils/session";
import { bersaglio } from "@/utils/tour";
import { sincronizzaDispositivo } from "@/utils/notifications";

export default function TabsLayout() {
  const router=useRouter()

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
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#2ECC71" }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Statistiche",
          tabBarIcon: ({ color, size }) => (
            <View ref={bersaglio("statistiche")} collapsable={false}>
              <MaterialCommunityIcons name="chart-donut" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="add-placeholder"
        options={{
          title: "",
          tabBarButton: () => (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <TouchableOpacity
              ref={bersaglio("aggiungi")}
              onPress={() => router.push("/add_expense")}
              style={{
                top: -20, //sposta il pulsante verso l'alto
                justifyContent: "center",
                alignItems: "center",
                width: 56,
                height: 56,
                borderRadius: 28, //la metà della larghezza/altezza, utile per ottenere un cerchio perfetto
                backgroundColor: "#F5C518",
                //ombra sotto il pulsante su ios
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5, //ombra sotto il pulsante su android
              }}
            >
              <MaterialCommunityIcons name="plus" color="black" size={30} />
            </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
      name="budget"
      options={{
        title: "Abbonamenti",
      tabBarIcon: ({ color, size }) => (
        //il tour misura l'icona e allarga il riquadro a tutta la colonna
        <View ref={bersaglio("abbonamenti")} collapsable={false}>
          <MaterialCommunityIcons name="autorenew" color={color} size={size} />
        </View>
      ),
      }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: ({ color, size }) => (
            <View ref={bersaglio("profilo")} collapsable={false}>
              <MaterialCommunityIcons name="account" color={color} size={size} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
