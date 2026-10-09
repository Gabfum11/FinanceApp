import { Platform } from "react-native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { fontSize, fontWeb, fontWeight, radius, scrim, type Colori } from "./styles/tokens";

// Caratteri di Paper allineati a quelli delle schermate. Sul web Paper usa
// "Roboto, Helvetica Neue, Arial" mentre i testi di React Native usano il font
// di sistema: su Windows pulsanti, campi e titoli uscivano in Arial accanto al
// Segoe UI del resto della pagina. Le misure seguono la scala di tokens.ts,
// e i titoli sono in grassetto come quelli scritti a mano.
const ritocchi: Partial<Record<keyof typeof MD3LightTheme.fonts, object>> = {
  //testo dei Text con variant="bodyMedium" e degli Snackbar: era 14
  bodyMedium: { fontSize: fontSize.md, lineHeight: 22 },
  //etichette dei pulsanti: come quelle dei pulsanti delle finestre
  labelLarge: { fontSize: fontSize.md, lineHeight: 20, fontWeight: fontWeight.semibold },
  //etichette sopra gli importi: era 11, sotto la didascalia piu' piccola
  labelSmall: { fontSize: fontSize.xs, lineHeight: 16 },
  //titoli delle intestazioni
  titleMedium: { fontWeight: fontWeight.bold },
  titleLarge: { fontSize: fontSize.xxl, lineHeight: 30, fontWeight: fontWeight.bold },
  //titoli delle finestre di Paper: come quelli di components/Dialogo
  headlineSmall: { fontSize: fontSize.xl, lineHeight: 28, fontWeight: fontWeight.bold },
  //titoli di schermata
  headlineMedium: { fontWeight: fontWeight.bold },
};

function creaFont(base: typeof MD3LightTheme.fonts) {
  //su Android il medio di Paper e' una famiglia a parte ("sans-serif-medium"):
  //dove lo spessore cambia si torna alla famiglia normale, come nel resto dell'app
  const normale = base.default.fontFamily;
  return Object.fromEntries(
    Object.entries(base).map(([nome, stile]) => {
      const extra = ritocchi[nome as keyof typeof base];
      return [
        nome,
        {
          ...stile,
          ...(extra && "fontWeight" in extra && { fontFamily: normale }),
          ...extra,
          ...(Platform.OS === "web" && { fontFamily: fontWeb }),
        },
      ];
    }),
  ) as typeof base;
}

// Il tema di Paper governa dialoghi, pulsanti e campi: senza allinearlo ai
// token, quei componenti userebbero colori propri e stonerebbero con le
// schermate costruite a mano.
export function creaTemaPaper(colors: Colori, scuro: boolean) {
  //la base scura di Paper sistema i colori che qui non si toccano
  //(testo dei campi, icone, contorni attivi)
  const base = scuro ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: radius.md,
    fonts: creaFont(base.fonts),
    colors: {
      ...base.colors,
      primary: colors.primary,          // pulsanti principali, elementi attivi
      //testo sui pulsanti verdi: la base scura di Paper lo farebbe viola
      onPrimary: colors.textOnPrimary,
      //solo nello scuro: nel chiaro restano i valori di sempre, gia' provati
      ...(scuro && {
        primaryContainer: colors.primarySoft,
        onPrimaryContainer: colors.primaryDark,
        surfaceVariant: colors.surfaceAlt,
      }),
      secondary: colors.accent,         // accenti, FAB
      background: colors.background,
      surface: colors.surface,
      onSurface: colors.text,
      onBackground: colors.text,
      //Paper usa "elevation" per lo sfondo di dialoghi e menu: senza questo
      //restano di un lilla tenue, che è il default di Material 3
      elevation: {
        ...base.colors.elevation,
        level1: colors.surface,
        level2: colors.surface,
        level3: colors.surface,
        level4: colors.surface,
        level5: colors.surface,
      },
      //velo dietro le finestre di Paper: il suo e' viola, come il resto di Material 3
      backdrop: scrim,
      error: colors.danger,
      outline: colors.border,
      onSurfaceVariant: colors.textMuted,
    },
  };
}
