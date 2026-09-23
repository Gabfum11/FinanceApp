import { MD3LightTheme } from "react-native-paper";
import { colors, radius } from "./styles/tokens";

// Il tema di Paper governa dialoghi, pulsanti e campi: senza allinearlo ai
// token, quei componenti userebbero colori propri e stonerebbero con le
// schermate costruite a mano.
export const theme = {
  ...MD3LightTheme,
  roundness: radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,          // pulsanti principali, elementi attivi
    secondary: colors.accent,         // accenti, FAB
    background: colors.background,
    surface: colors.surface,
    //Paper usa "elevation" per lo sfondo di dialoghi e menu: senza questo
    //restano di un lilla tenue, che è il default di Material 3
    elevation: {
      ...MD3LightTheme.colors.elevation,
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
