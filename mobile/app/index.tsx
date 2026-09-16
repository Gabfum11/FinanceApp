import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { View, ActivityIndicator } from "react-native";
import { API_URL } from "@/config";
export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    async function checkToken() {
      const token = await SecureStore.getItemAsync("token"); //asincrono:richiede un breve momento per leggere dal disco del telefono
      setHasToken(!!token); //se è una stringa hastoken diventa true, se è null diventa false
      console.log("Controllo compleato, hasToken:", !!token);
      if(token) {
        try{
           const response=await fetch(`${API_URL}/auth/me`,{
            method:"GET",
            headers:{
              "Authorization":`Bearer ${token}`
            }
          })
          if(!response.ok){
            await SecureStore.deleteItemAsync("token");
            setHasToken(false)
          }
        }catch(error){
            setHasToken(false)
        }
      }
      setIsLoading(false)
    }
    checkToken();
    }, []);
    if(isLoading) {
        return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            {/*rotellina di caricamento */}
            <ActivityIndicator size="large" />
        </View>
        );
    }

    return <Redirect href={hasToken ? "/(tabs)/home" : "/login"} />;
    }