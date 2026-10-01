import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Intestazione HTML della versione web, generata solo all'export: sull'app
// nativa questo file non viene usato. Il manifest e i meta "apple-" fanno
// aprire l'app a schermo intero, con il logo, quando la si aggiunge alla Home.

//il sito sta in /FinanceApp/ (baseUrl in app.json): i link vanno da li'
const BASE = process.env.EXPO_BASE_URL ?? "";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>TrackIt</title>
        <meta name="description" content="Spese, budget e abbonamenti in un posto solo." />

        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <meta name="theme-color" content="#F9F9F9" />
        <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="TrackIt" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* senza, le ScrollView sul web non scorrerebbero come sul telefono */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
