//il detail di FastAPI è una stringa per gli errori nostri, ma con un 422 di
//validazione è un array di oggetti: messo nello Snackbar fa crashare l'app
export async function messaggioErrore(response: Response, predefinito: string): Promise<string> {
  const detail = await response
    .json()
    .then((body) => (typeof body?.detail === "string" ? body.detail : null))
    .catch(() => null);
  return detail ?? predefinito;
}
