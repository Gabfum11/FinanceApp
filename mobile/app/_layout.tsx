import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { PaperProvider } from 'react-native-paper';


import { creaTemaPaper } from '@/theme';
import { InvitoHome } from '@/components/InvitoHome';
import { PreferenzeProvider } from '@/utils/preferenze';
import { View } from 'react-native';
import { LARGHEZZA_MASSIMA, PAGINE_LARGHE, useSchermoLargo } from '@/utils/layout';
import { TemaProvider, useTema } from '@/utils/tema';
import { useEffect, useMemo } from 'react';
import { segnaPaginaPronta } from '@/utils/avvio';
//configura le traduzioni prima che si disegni qualsiasi schermata
import '@/utils/i18n';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <TemaProvider>
      <Contenuto />
    </TemaProvider>
  );
}

//separato da RootLayout: per leggere il tema deve stare dentro TemaProvider
function Contenuto() {
  const { colors, scuro } = useTema();
  //sul computer le schermate gia' adattate prendono tutta la finestra, le altre
  //restano nella colonna centrata. Il percorso decide quale delle due
  const largo = useSchermoLargo();
  const percorso = usePathname();
  //la landing ("/") e' sempre a tutta larghezza, anche sul telefono: viene
  //generata durante la build, quando la larghezza della finestra non si conosce
  const tuttaLarghezza = percorso === "/" || (largo && PAGINE_LARGHE.includes(percorso));
  //fuori dalla pagina principale non c'e' niente da tenere nascosto: la
  //landing la conferma da se' (app/index.tsx), le altre schermate qui
  useEffect(() => {
    if (percorso !== "/") segnaPaginaPronta();
  }, [percorso]);
  const temaPaper = useMemo(() => creaTemaPaper(colors, scuro), [colors, scuro]);
  //lo sfondo delle schermate durante le animazioni di navigazione
  const temaNavigazione = useMemo(() => {
    const base = scuro ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border } };
  }, [colors, scuro]);

  return (
    <PaperProvider theme={temaPaper}>
      {/* valuta e lingua dell'utente, per tutte le schermate */}
      <PreferenzeProvider>
      <ThemeProvider value={temaNavigazione}>
        {/* su tablet e computer l'app resta una colonna centrata: card e pulsanti
            allungati per tutto lo schermo sarebbero scomodi da leggere e da toccare.
            Sui telefoni la colonna e' larga quanto lo schermo e non cambia niente */}
        <View style={{ flex: 1, backgroundColor: colors.surfaceAlt }}>
        <View style={{ flex: 1, width: "100%", maxWidth: tuttaLarghezza ? undefined : LARGHEZZA_MASSIMA, alignSelf: "center" }}>
        <Stack>
          {/*
            stack.screen registra una schermata presso il sistema di navigazione dicendo a expo router
            "questa è una schermata che può essere navigata, e questo è il suo nome"
          */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="presentazione" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{headerShown:false}} />
          {/* sul computer si aprono sopra la pagina, che resta visibile dietro */}
          <Stack.Screen name="add_expense" options={{ presentation: largo ? "transparentModal" : "modal", headerShown: false }} />
          <Stack.Screen name="assistant" options={{ presentation: largo ? "transparentModal" : "modal", headerShown: false }} />
          <Stack.Screen name="import_estratto" options={{ presentation: largo ? "transparentModal" : "modal", headerShown: false }} />
          <Stack.Screen name="verify_email" options={{ headerShown: false }} />
          <Stack.Screen name="resetPassword" options={{ headerShown: false }} />
          <Stack.Screen name="all_expenses" options={{ headerShown: false }} />
          <Stack.Screen name="set_budget" options={{ presentation: largo ? "transparentModal" : "card", headerShown: false }} />
          <Stack.Screen name="modify_profile" options={{ presentation: largo ? "transparentModal" : "card", headerShown: false }} />
          <Stack.Screen name="changePassw" options={{ presentation: largo ? "transparentModal" : "card", headerShown: false }} />
        </Stack>
        {/* fuori dallo Stack: resta sopra qualsiasi schermata, presentazione compresa */}
        <InvitoHome />
        </View>
        </View>
        {/* icone della barra di stato scure sul tema chiaro, chiare sullo scuro */}
        <StatusBar style={scuro ? "light" : "dark"} />
      </ThemeProvider>
      </PreferenzeProvider>
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