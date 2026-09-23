import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View, AppState } from "react-native";
import { useEffect } from "react";
import { refreshTokenIfNeeded } from "@/utils/session";

export default function TabsLayout() {
  const router=useRouter()

  //un'app lasciata aperta per settimane non passerebbe mai da index.tsx:
  //il rinnovo va tentato anche al rientro in primo piano
  useEffect(() => {
    const sub = AppState.addEventListener("change", (stato) => {
      if (stato === "active") refreshTokenIfNeeded();
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
            <MaterialCommunityIcons name="chart-donut" color={color} size={size} />
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
              onPress={() => router.push("/add_expense")}
              style={{
                top: -20, //sposta il pulsante verso l'alto
                justifyContent: "center",
                alignItems: "center",
                width: 56,
                height: 56,
                borderRadius: 28, //la metà della larghezza/altezza, utile per ottenere un cerchio perfetto
                backgroundColor: "#F1C40F",
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
        <MaterialCommunityIcons name="autorenew" color={color} size={size} />
      ),
      }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
