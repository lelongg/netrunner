import { useEffect, useRef } from "preact/hooks";

const stack: { close: () => void; live: boolean }[] = [];

addEventListener("popstate", () => {
  const top = stack.pop();
  if (!top) return;
  if (top.live) top.close();
  else history.back();
});

export function useBackClose(open: boolean, onClose: () => void) {
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    if (!open) return;
    const entry = { close: () => latest.current(), live: true };
    history.pushState({ overlay: true }, "");
    stack.push(entry);
    return () => {
      entry.live = false;
    };
  }, [open]);
}
