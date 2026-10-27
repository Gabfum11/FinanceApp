import { apiFetch } from "@/utils/apiFetch";

//il flag sta sull'account (tutorial_visto in /auth/me), non sul telefono:
//un account nuovo lo vede anche dove qualcun altro l'ha gia' visto.
//Se la chiamata fallisce il tutorial ricompare alla prossima apertura:
//meglio che fermare l'utente con un errore per una cosa del genere
export async function segnaBenvenutoVisto() {
  try {
    await apiFetch("/auth/tutorial-visto", { method: "PUT" });
  } catch {}
}
