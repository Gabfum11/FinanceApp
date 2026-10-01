import AsyncStorage from "@react-native-async-storage/async-storage";

//vale per il dispositivo: chi reinstalla senza aver mai impostato un budget
//rivede il tutorial, chi un budget ce l'ha non lo vede comunque
const CHIAVE = "benvenuto_visto";

export async function benvenutoVisto(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CHIAVE)) === "1";
  } catch {
    //meglio non mostrarlo che riproporlo a ogni apertura
    return true;
  }
}

export async function segnaBenvenutoVisto() {
  try {
    await AsyncStorage.setItem(CHIAVE, "1");
  } catch {}
}
