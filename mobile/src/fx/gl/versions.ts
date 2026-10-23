const sources = import.meta.glob(["./*.ts", "!./versions.ts"], { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;

export function hashText(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, "0").slice(-6);
}

export function versionsOf(text: string) {
  const out: Record<string, string> = {};
  const parts = text.split(/^(?=export (?:async function|const|function) )/m);
  for (const part of parts) {
    const name = part.match(/^export (?:async function|const|function) (\w+)/)?.[1];
    if (name) out[name] = hashText(part.trimEnd());
  }
  return out;
}

export async function fxVersions() {
  const texts = await Promise.all(Object.values(sources).map((load) => load()));
  return Object.assign({}, ...texts.map(versionsOf)) as Record<string, string>;
}
