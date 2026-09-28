export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// La pagina la serve il backend: lo stesso indirizzo va nella scheda del Play Store
export const PRIVACY_URL = `${API_URL}/privacy`;
