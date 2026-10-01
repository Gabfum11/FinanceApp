import * as SecureStore from "expo-secure-store";

//sul telefono i token stanno cifrati nel Keychain/Keystore.
//Per il browser c'e' archivio.web.ts: Expo sceglie il file in base alla piattaforma
export const leggi = (chiave: string) => SecureStore.getItemAsync(chiave);
export const scrivi = (chiave: string, valore: string) => SecureStore.setItemAsync(chiave, valore);
export const cancella = (chiave: string) => SecureStore.deleteItemAsync(chiave);
