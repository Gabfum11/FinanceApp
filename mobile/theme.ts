import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { radius, type Colori } from "./styles/tokens";

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
      error: colors.danger,
      outline: colors.border,
      onSurfaceVariant: colors.textMuted,
    },
  };
}
