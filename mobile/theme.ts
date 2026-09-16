import { MD3LightTheme } from "react-native-paper";

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2ECC71",       // verde: pulsanti principali, elementi attivi
    secondary: "#F1C40F",     // giallo: accenti, FAB
    background: "#F9F9F9",    // sfondo off-white         
  },
};
