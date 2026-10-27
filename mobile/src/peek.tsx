import { useEffect, useState } from "preact/hooks";
import { CardPeek } from "./game/CardImage";
import { HOLD_MS, untilRelease } from "./hold";

const OWN = ".tile, .card-zoom-trigger, .deck-row-id, .card-zoom, .card-peek, .deck-open";

let show: ((card: { code: string; alt: string } | null) => void) | null = null;
let swallow = false;

export function installCardPeek() {
  let timer = 0;
  let start: { x: number; y: number } | null = null;
  const stop = () => {
    clearTimeout(timer);
    start = null;
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      stop();
      const el = (e.target as Element | null)?.closest<HTMLElement>(".card-image[data-code]");
      if (!el || el.closest(OWN)) return;
      const card = { code: el.dataset.code!, alt: el.dataset.alt ?? "" };
      start = { x: e.clientX, y: e.clientY };
      timer = window.setTimeout(() => {
        start = null;
        navigator.vibrate?.(12);
        show?.(card);
        swallow = true;
        untilRelease(() => {
          show?.(null);
          setTimeout(() => (swallow = false), 350);
        });
      }, HOLD_MS);
    },
    true,
  );
  document.addEventListener("pointermove", (e) => start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10 && stop(), { capture: true, passive: true });
  document.addEventListener("pointerup", () => start && stop(), true);
  document.addEventListener("pointercancel", stop, true);
  document.addEventListener(
    "click",
    (e) => {
      if (!swallow) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      swallow = false;
    },
    true,
  );
}

export function PeekHost() {
  const [card, setCard] = useState<{ code: string; alt: string } | null>(null);
  useEffect(() => {
    show = setCard;
    return () => {
      show = null;
    };
  }, []);
  return card ? <CardPeek code={card.code} alt={card.alt} onClose={() => setCard(null)} /> : null;
}
