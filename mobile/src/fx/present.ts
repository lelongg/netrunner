import { layer } from "./core";
import { type Kind, glEffect, hasGl, warmGl } from "./gl";

const ORDER: Kind[] = ["play", "score", "rez", "install", "use"];
const MIN_WIDTH = 110;
let titles: Record<string, string> = {};
let playing = 0;

function kindFor(title: string | undefined) {
  return ORDER.find((k) => hasGl(k, title));
}

function target(e: Event): { el: HTMLElement; code: string } | null {
  const t = e.target as Element | null;
  const zoom = t?.closest<HTMLElement>(".card-zoom-frame.current");
  if (zoom) {
    const code = zoom.closest(".card-zoom")?.querySelector<HTMLElement>("[data-code]")?.dataset.code ?? zoom.querySelector("img")?.getAttribute("src")?.match(/\/(\d{5})\.jpg/)?.[1];
    return code ? { el: zoom, code } : null;
  }
  const img = t?.closest<HTMLElement>(".card-image[data-code]");
  if (!img || img.closest(".tile, .deck-row-id, .fxgl")) return null;
  if (img.getBoundingClientRect().width < MIN_WIDTH) return null;
  const host = img.closest("button, a, [role=button]");
  if (host && !host.classList.contains("card-zoom-trigger")) return null;
  return { el: img, code: img.dataset.code! };
}

export function present(el: HTMLElement, code: string) {
  const title = titles[code];
  const kind = kindFor(title);
  if (!kind) return false;
  const run = glEffect(kind, title, el.getBoundingClientRect(), code, el);
  if (!run) return false;
  const fx = layer();
  playing++;
  fx.classList.add("front");
  run.finally(() => {
    if (--playing === 0) fx.classList.remove("front");
  });
  return true;
}

export function installCardPresent() {
  fetch(new URL("data/codes.json", document.baseURI))
    .then((r) => r.json())
    .then((t: Record<string, string>) => (titles = t))
    .catch(() => {});
  warmGl();
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented) return;
      const hit = target(e);
      if (!hit || !present(hit.el, hit.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
}
