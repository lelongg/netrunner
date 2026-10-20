import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { animate } from "motion";
import { Icon } from "./icons";
import { motionOff } from "./settings";
import { useBackClose } from "./back";
import { uiSound } from "./uisound";

export function Meter({ value, max, tone = "cyan", small, anchor }: { value: number; max: number; tone?: "cyan" | "red" | "yellow"; small?: boolean; anchor?: string }) {
  const count = Math.max(0, Math.min(max, 12));
  return (
    <span class={`meter ${tone} ${small ? "sm" : ""}`} role="img" aria-label={`${value} of ${max}`} data-anchor={anchor}>
      {Array.from({ length: count }, (_, i) => (
        <i class={i < value ? "on" : ""} />
      ))}
    </span>
  );
}

export function Ticker({ children, action, onFeed, feedKey }: { children: ComponentChildren; action?: ComponentChildren; onFeed?: () => void; feedKey?: unknown }) {
  const feed = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  const track = useRef<HTMLSpanElement>(null);
  const fresh = useRef(false);
  useEffect(() => {
    const el = text.current;
    if (!el || motionOff() || !fresh.current) {
      fresh.current = true;
      return;
    }
    const anim = animate(el, { y: ["70%", "0%"], opacity: [0, 1] }, { duration: 0.3, ease: [0.2, 0.8, 0.3, 1] });
    return () => anim.cancel();
  }, [feedKey]);
  useEffect(() => {
    const el = track.current;
    if (!width || !el || motionOff()) return;
    const anim = animate(el, { x: ["0%", "-50%"] }, { duration: Math.max(6, width / 40), repeat: Infinity, ease: "linear", delay: 1.5 });
    return () => {
      anim.cancel();
      el.style.transform = "";
    };
  }, [width, feedKey]);
  useLayoutEffect(() => {
    const measure = () => {
      const box = feed.current,
        inner = text.current;
      if (!box || !inner) return;
      const pad = (el: Element) => {
        const cs = getComputedStyle(el);
        return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      };
      const room = box.clientWidth - pad(box) - (box.classList.contains("scrolling") ? 20 : 0);
      const need = inner.scrollWidth - pad(inner);
      setWidth(need > room + 1 ? inner.scrollWidth : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (feed.current) observer.observe(feed.current);
    if (text.current) observer.observe(text.current);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  });
  return (
    <div class="ticker">
      <span class="live">LIVE FEED</span>
      <span
        class={`feed ${width ? "scrolling" : ""} ${onFeed ? "tappable" : ""}`}
        ref={feed}
        role={onFeed ? "button" : undefined}
        tabIndex={onFeed ? 0 : undefined}
        onClick={onFeed}
        onKeyDown={onFeed && ((e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onFeed()))}
      >
        <span class="feed-track" ref={track}>
          <span class="feed-text" ref={text}>
            {children}
          </span>
          {width > 0 && (
            <span class="feed-text" aria-hidden="true">
              {children}
            </span>
          )}
        </span>
      </span>
      {action}
    </div>
  );
}

export function LogoMark() {
  return (
    <svg class="logo-mark" viewBox="0 0 40 40" fill="none" stroke="#ff3b30" stroke-width="2" aria-hidden="true">
      <path d="M8 4h24l4 4v24l-4 4H8l-4-4V8z" />
      <rect x="14" y="14" width="12" height="12" fill="#ff3b30" />
      <path d="M20 1v6M20 33v6M1 20h6M33 20h6" />
    </svg>
  );
}

export function Cta({ children, onClick, disabled, cmd }: { children: ComponentChildren; onClick?: () => void; disabled?: boolean; cmd?: string }) {
  return (
    <button class="cta" onClick={onClick} disabled={disabled} data-cmd={cmd}>
      <Sheen off={disabled} />
      <span>
        <span class="cta-label">{children}</span>
        <Icon name="arrow-right" class="cta-arrow" />
      </span>
    </button>
  );
}

function Sheen({ off }: { off?: boolean }) {
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    if (off || !el.current || motionOff()) return;
    const anim = animate(el.current, { transform: ["translateX(-150%)", "translateX(450%)"] }, { duration: 1.1, repeat: Infinity, repeatDelay: 2.2, ease: [0.6, 0, 0.3, 1] });
    return () => anim.stop();
  }, [off]);
  return <i ref={el} class="cta-sheen" aria-hidden="true" />;
}

export interface Ask {
  title: string;
  body?: string;
  ok?: string;
  cancel?: string | null;
  danger?: boolean;
}

let pending: ((a: (Ask & { resolve: (yes: boolean) => void }) | null) => void) | null = null;
const queue: (Ask & { resolve: (yes: boolean) => void })[] = [];

export function ask(a: Ask): Promise<boolean> {
  return new Promise((resolve) => {
    queue.push({ ...a, resolve });
    if (queue.length === 1) pending?.(queue[0]);
  });
}

export const tell = (title: string, body?: string) => ask({ title, body, ok: "OK", cancel: null }).then(() => {});

export function Dialogs() {
  const [current, setCurrent] = useState<(Ask & { resolve: (yes: boolean) => void }) | null>(queue[0] ?? null);
  const box = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pending = setCurrent;
    return () => {
      pending = null;
    };
  }, []);
  useBackClose(!!current, () => close(false));
  useEffect(() => {
    if (!current) return;
    uiSound("ui_open");
    box.current?.querySelector<HTMLButtonElement>("button.dialog-ok")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [current]);
  useLayoutEffect(() => {
    if (!current || motionOff()) return;
    if (backdrop.current) {
      backdrop.current.style.backgroundColor = "rgba(0,0,0,0)";
      animate(backdrop.current, { backgroundColor: ["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"] }, { duration: 0.18 });
    }
    if (box.current) box.current.style.opacity = "0";
    if (box.current) animate(box.current, { opacity: [0, 1], transform: ["translateY(16px) scale(0.96)", "translateY(0px) scale(1)"] }, { type: "spring", visualDuration: 0.28, bounce: 0.2 });
  }, [current]);
  const close = (yes: boolean) => {
    const a = queue.shift();
    if (!a) return;
    a.resolve(yes);
    setCurrent(queue[0] ?? null);
  };
  if (!current) return null;
  return (
    <div ref={backdrop} class="dialog-backdrop" onClick={() => close(false)}>
      <div ref={box} class={`dialog panel ${current.danger ? "" : "cyan"}`} role="alertdialog" aria-modal="true" aria-label={current.title} onClick={(e) => e.stopPropagation()}>
        <h2>{current.title}</h2>
        {current.body && <p>{current.body}</p>}
        <div class="dialog-actions">
          {current.cancel !== null && (
            <button class="ghost" onClick={() => close(false)}>
              {current.cancel ?? "Cancel"}
            </button>
          )}
          <button class={`dialog-ok ${current.danger ? "danger" : "primary"}`} onClick={() => close(true)}>
            {current.ok ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Picker<T extends string>({ value, options, onChange, title, class: className }: { value: T; options: { key: T; label: string; hint?: string }[]; onChange: (v: T) => void; title: string; class?: string }) {
  const [open, setOpen] = useState(false);
  useBackClose(open, () => setOpen(false));
  const current = options.find((o) => o.key === value);
  return (
    <>
      <button type="button" class={`picker-btn ${className ?? ""}`} aria-haspopup="listbox" aria-expanded={open} aria-label={`${title}: ${current?.label ?? value}`} onClick={() => setOpen(true)}>
        <span>{current?.label ?? value}</span>
        <svg class="picker-chevron" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </button>
      {open && (
        <div class="sheet-backdrop" onClick={() => setOpen(false)}>
          <div class="sheet panel picker-sheet" role="listbox" aria-label={title} onClick={(e) => e.stopPropagation()}>
            <div class="row">
              <span class="label">{title}</span>
              <button class="ghost" onClick={() => setOpen(false)} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <ul class="picker-list">
              {options.map((o) => (
                <li>
                  <button
                    role="option"
                    aria-selected={o.key === value}
                    class={o.key === value ? "on" : ""}
                    onClick={() => {
                      setOpen(false);
                      if (o.key !== value) onChange(o.key);
                    }}
                  >
                    <span class="picker-text">
                      <span>{o.label}</span>
                      {o.hint && <span class="picker-hint">{o.hint}</span>}
                    </span>
                    {o.key === value && <Icon name="check" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
