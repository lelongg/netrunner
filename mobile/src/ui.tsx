import type { ComponentChildren } from "preact";

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

export function Ticker({ children }: { children: ComponentChildren }) {
  return (
    <div class="ticker">
      <span class="live">LIVE FEED</span>
      <span class="feed">{children}</span>
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
        {children}
        <span aria-hidden="true">→</span>
      </span>
    </button>
  );
}
