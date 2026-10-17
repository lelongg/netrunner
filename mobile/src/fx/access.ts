import { anchor, animate, node, place, rectOf, reduced, tileEl, visible } from "./core";

function originOf(card: any, server?: string): Element | null {
  const at = tileEl(card?.cid);
  if (at) return at;
  if (server === "rd") return anchor("corp-deck");
  if (server === "hq") return anchor("corp-hand");
  if (server === "archives") return anchor("corp-discard");
  return server ? document.querySelector(`[data-server="${server}"]`) : null;
}

export function returnAccessed(card: any, image: Element | null | undefined, server?: string) {
  const from = rectOf(image);
  if (reduced() || !from) return;
  const ghost = node("fx-return");
  place(ghost, from);
  const img = (image as HTMLElement).querySelector("img:last-of-type") ?? (image as HTMLElement).querySelector("img");
  if (img) ghost.appendChild(img.cloneNode(true));
  const label = node("fx-return-label", ghost);
  label.textContent = "Left in place";
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const origin = originOf(card, server);
      const to = rectOf(origin);
      const target = visible(to) ? to : null;
      const dx = target ? target.left + target.width / 2 - (from.left + from.width / 2) : 0;
      const dy = target ? target.top + target.height / 2 - (from.top + from.height / 2) : -from.height * 0.4;
      const scale = target ? Math.max(0.12, Math.min(1, target.height / from.height)) : 0.6;
      animate(label, { opacity: [0, 1, 1, 0] }, { duration: 0.8, times: [0, 0.1, 0.4, 0.55] });
      animate(ghost, { opacity: [1, 1, 0] }, { duration: 0.8, times: [0, 0.82, 1] });
      animate(ghost, { x: [0, 0, dx], y: [0, -6, dy], scale: [1, 1.03, scale] }, { duration: 0.8, times: [0, 0.22, 0.9], ease: ["easeOut", [0.6, 0, 0.3, 1]] }).finished.then(
        () => ghost.remove(),
        () => ghost.remove(),
      );
    }),
  );
}
