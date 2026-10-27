import { useEffect, useState } from "preact/hooks";
import { onSettings, settings } from "./settings";

let french: Record<string, string> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load() {
  loading ??= fetch(new URL("data/cards.fr.json", document.baseURI))
    .then((r) => (r.ok ? r.json() : {}))
    .then((json) => {
      french = json;
      for (const fn of listeners) fn();
    })
    .catch(() => {
      loading = null;
    });
}

export function cardText(card: { code?: unknown; text?: string } | null | undefined): string | undefined {
  if (!card) return undefined;
  if (settings.language === "fr" && card.code != null) {
    if (!french) load();
    const fr = french?.[String(card.code)];
    if (fr) return fr;
  }
  return card.text;
}

export function frenchSubroutines(card: { code?: unknown } | null | undefined): string[] | undefined {
  if (settings.language !== "fr" || card?.code == null) return undefined;
  if (!french) load();
  const fr = french?.[String(card.code)];
  return fr ? fr.split("\n").filter((l) => l.startsWith("[subroutine]")).map((l) => l.replace(/^\[subroutine\]\s*/, "").replace(/<\/?[a-z]+[^>]*>/g, "")) : undefined;
}

export function useLanguage() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    listeners.add(bump);
    const off = onSettings(bump);
    if (settings.language === "fr" && !french) load();
    return () => {
      listeners.delete(bump);
      off();
    };
  }, []);
}
