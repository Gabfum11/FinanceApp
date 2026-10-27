import { Redirect } from "expo-router";

// L'accesso ora e' una finestra sopra la landing: /login resta solo perche'
// i vecchi link e i segnalibri non finiscano su una pagina inesistente
export default function LoginScreen() {
  return <Redirect href="/?accedi=1" />;
}
