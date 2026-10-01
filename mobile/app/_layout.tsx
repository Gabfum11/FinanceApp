import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { PaperProvider } from 'react-native-paper';


import { theme } from '@/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          {/*
            stack.screen registra una schermata presso il sistema di navigazione dicendo a expo router
            "questa è una schermata che può essere navigata, e questo è il suo nome"
          */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{headerShown:false}} />
          <Stack.Screen name="add_expense" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="assistant" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="verify_email" options={{ headerShown: false }} />
          <Stack.Screen name="resetPassword" options={{ headerShown: false }} />
          <Stack.Screen name="all_expenses" options={{ headerShown: false }} />
          <Stack.Screen name="set_budget" options={{ headerShown: false }} />
          <Stack.Screen name="modify_profile" options={{ headerShown: false }} />
          <Stack.Screen name="changePassw" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
/*
Una schermata modale appare sopra il flusso normale di navigazione, con un'animazione diversa, e spesso con un modo 
esplicito di chuderla(swipe verso il basso, o un pulsante X) per tornare dov'eri, senza perdere il
tuo posto nella navigazione sottostante

Una modale è appropriata per azioni brevi e mirate, che l'utente fa senza voler abbandonare la schermata
da cui è partito
Pensa a "Aggiungi Spesa": sei sulla Home, vedi la tua lista spese, premi "+", inserisci una spesa velocemente, e torni esattamente dove eri — non stai "navigando altrove" nell'app, stai facendo un'azione rapida e poi rientrando nel flusso principale.

*/