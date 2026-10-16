import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { animate } from "motion";
import { Icon } from "./icons";

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

export function Ticker({ children, action }: { children: ComponentChildren; action?: ComponentChildren }) {
  const feed = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  const track = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!width || !track.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = animate(track.current, { x: ["0%", "-50%"] }, { duration: Math.max(6, width / 40), repeat: Infinity, ease: "linear" });
    return () => anim.stop();
  }, [width]);
  useLayoutEffect(() => {
    const measure = () => {
      const box = feed.current,
        inner = text.current;
      if (!box || !inner) return;
      setWidth(inner.scrollWidth > box.clientWidth + 1 ? inner.scrollWidth : 0);
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
      <span class={`feed ${width ? "scrolling" : ""}`} ref={feed}>
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

export function Cta({ children, onClick, disabled }: { children: ComponentChildren; onClick?: () => void; disabled?: boolean }) {
  return (
    <button class="cta" onClick={onClick} disabled={disabled}>
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
    if (off || !el.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = animate(el.current, { x: ["-150%", "450%"] }, { duration: 1.1, repeat: Infinity, repeatDelay: 2.2, ease: [0.6, 0, 0.3, 1] });
    return () => anim.stop();
  }, [off]);
  return <i ref={el} class="cta-sheen" aria-hidden="true" />;
}
