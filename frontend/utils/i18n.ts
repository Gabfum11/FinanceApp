import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "@/locales/it.json";
import en from "@/locales/en.json";

// Testi dell'app in italiano e in inglese.
//
// Ogni testo ha una chiave (t("lingua.titolo")) e un valore per lingua, in
// locales/it.json e locales/en.json. Si parte in italiano: la lingua la sceglie
// l'utente (selettore all'apertura o Profilo) e la tiene utils/preferenze.tsx,
// che chiama i18n.changeLanguage. Le schermate che usano useTranslation si
// ridisegnano da sole quando cambia.

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: "it",
  //una chiave mancante in inglese mostra il testo italiano invece della chiave
  fallbackLng: "it",
  interpolation: {
    //React protegge gia' i testi: un secondo escape mostrerebbe "&amp;" a schermo
    escapeValue: false,
  },
});

export default i18n;
