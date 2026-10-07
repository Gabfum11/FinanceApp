import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Intestazione HTML della versione web, generata solo all'export: sull'app
// nativa questo file non viene usato. Il manifest e i meta "apple-" fanno
// aprire l'app a schermo intero, con il logo, quando la si aggiunge alla Home.

//il sito sta in /FinanceApp/ (baseUrl in app.json): i link vanno da li'
const BASE = process.env.EXPO_BASE_URL ?? "";

// La pagina principale e' la landing, gia' scritta nell'HTML. Chi ha gia' fatto
// l'accesso, chi apre dall'icona sulla Home e chi usa il tema scuro non deve
// vederla nemmeno per un attimo: prima che il browser disegni qualcosa si
// controlla localStorage e, se serve, si nasconde la pagina. La fa riapparire
// l'app (utils/avvio.web.ts) quando ha deciso cosa mostrare; dopo 5 secondi
// riappare comunque, cosi' un errore non lascia mai la pagina bianca.
// Google non ha token ne' preferenze: vede sempre la landing.
const SCRIPT_AVVIO = `(function () {
  try {
    var base = ${JSON.stringify(BASE.replace(/\/+$/, ""))};
    var percorso = location.pathname.replace(/\\/index\\.html$/, "").replace(/\\/+$/, "");
    if (percorso !== base) return;
    var s = window.localStorage;
    var nascondi =
      s.getItem("token") || s.getItem("refresh_token") || s.getItem("tema_scuro") === "1" ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
    if (!nascondi) return;
    var stile = document.createElement("style");
    stile.id = "avvio-nascosto";
    stile.textContent = "body{visibility:hidden}";
    document.head.appendChild(stile);
    setTimeout(function () { stile.remove(); }, 5000);
  } catch (e) {}
})();`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>TrackIt · Spese, budget e abbonamenti</title>
        <meta name="description" content="Sai dove finiscono i tuoi soldi? Con TrackIt scrivi le spese come le diresti, vedi quanto ti resta del budget e tieni d'occhio gli abbonamenti. Gratis." />
        {/* prima di qualsiasi disegno: deve nascondere la landing in tempo */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_AVVIO }} />

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
