import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./icons";

export function Meter({ value, max, tone = "cyan", small }: { value: number; max: number; tone?: "cyan" | "red" | "yellow"; small?: boolean }) {
  const count = Math.max(0, Math.min(max, 12));
  return (
    <span class={`meter ${tone} ${small ? "sm" : ""}`} role="img" aria-label={`${value} of ${max}`}>
      {Array.from({ length: count }, (_, i) => (
        <i class={i < value ? "on" : ""} />
      ))}
    </span>
  );
}

export function Bump({ value, children }: { value: unknown; children: ComponentChildren }) {
  const prev = useRef(value);
  const dir = useRef<string>();
  if (prev.current !== value) {
    dir.current = Number(value) > Number(prev.current) ? "bump-up" : "bump-down";
    prev.current = value;
  }
  return (
    <span key={String(value)} class={dir.current ? `bump ${dir.current}` : undefined}>
      {children}
    </span>
  );
}

export function Ticker({ children, action }: { children: ComponentChildren; action?: ComponentChildren }) {
  const feed = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const box = feed.current, inner = text.current;
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
        <span class="feed-track" style={width ? `animation-duration: ${Math.max(6, width / 40)}s` : undefined}>
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
      <span>
        <span class="cta-label">{children}</span>
        <Icon name="arrow-right" class="cta-arrow" />
      </span>
    </button>
  );
}
