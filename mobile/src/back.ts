import { useEffect, useRef } from "preact/hooks";

const stack: (() => void)[] = [];
let ignored = 0;

addEventListener("popstate", () => {
  if (ignored > 0) {
    ignored--;
    return;
  }
  stack.pop()?.();
});

export function useBackClose(open: boolean, onClose: () => void) {
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    if (!open) return;
    const close = () => latest.current();
    history.pushState({ overlay: true }, "");
    stack.push(close);
    return () => {
      const i = stack.indexOf(close);
      if (i < 0) return;
      stack.splice(i, 1);
      ignored++;
      history.back();
    };
  }, [open]);
}
