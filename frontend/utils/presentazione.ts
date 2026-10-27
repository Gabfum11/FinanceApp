import AsyncStorage from "@react-native-async-storage/async-storage";

//la presentazione viene prima di qualsiasi account: il segno sta sul telefono,
//non sul server come tutorial_visto. Chi la chiude non la rivede, anche dopo
//un logout; reinstallando l'app ricompare, ed e' giusto cosi'
const CHIAVE = "presentazione_vista";

export async function presentazioneVista(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CHIAVE)) === "1";
  } catch {
    //archivio illeggibile: meglio mandare al login che bloccare l'avvio
    return true;
  }
}

export async function segnaPresentazioneVista(): Promise<void> {
  try {
    await AsyncStorage.setItem(CHIAVE, "1");
  } catch {}
}
