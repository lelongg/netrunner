import { useLayoutEffect, useRef } from "preact/hooks";

const stack: { close: () => void; live: boolean }[] = [];
let ignore = 0;
const waiting: (() => void)[] = [];

const push = () => history.pushState({ overlay: true }, "");

addEventListener("popstate", () => {
  if (ignore > 0) {
    ignore--;
    if (!ignore) waiting.splice(0).forEach((fn) => fn());
    return;
  }
  const top = stack.pop();
  if (!top) return;
  if (top.live) {
    top.live = false;
    top.close();
  } else history.back();
});

export function useBackClose(open: boolean, onClose: () => void) {
  const latest = useRef(onClose);
  latest.current = onClose;
  useLayoutEffect(() => {
    if (!open) return;
    const entry = { close: () => latest.current(), live: true };
    if (ignore) waiting.push(push);
    else push();
    stack.push(entry);
    return () => {
      if (!entry.live) return;
      entry.live = false;
      if (stack[stack.length - 1] !== entry) return;
      let count = 0;
      while (stack.length && !stack[stack.length - 1].live) {
        stack.pop();
        count++;
      }
      const unpushed = Math.min(waiting.length, count);
      waiting.splice(waiting.length - unpushed, unpushed);
      if (count === unpushed) return;
      ignore++;
      history.go(unpushed - count);
    };
  }, [open]);
}
