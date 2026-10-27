import type { View } from "react-native";

//i pulsanti del tour stanno in componenti diversi (home e barra delle schede):
//ognuno si registra qui con un nome, e il tour ne chiede la posizione quando serve
export type Rettangolo = { x: number; y: number; w: number; h: number };

const bersagli = new Map<string, View>();

export function bersaglio(nome: string) {
  return (vista: View | null) => {
    if (vista) bersagli.set(nome, vista);
    else bersagli.delete(nome);
  };
}

//posizione rispetto alla finestra: il velo del tour la copre tutta
export function misuraBersaglio(nome: string): Promise<Rettangolo | null> {
  const vista = bersagli.get(nome);
  if (!vista) return Promise.resolve(null);
  return new Promise((resolve) => {
    vista.measureInWindow((x, y, w, h) => resolve(w > 0 ? { x, y, w, h } : null));
  });
}
