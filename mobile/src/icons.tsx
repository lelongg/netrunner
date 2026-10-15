const PATHS = {
  "arrow-right": { box: "0 0 32 20", d: "M2 10h26M19 2l9 8-9 8" },
  "arrow-left": { box: "0 0 32 20", d: "M30 10H4M13 2l-9 8 9 8" },
  "chevron-left": { box: "0 0 20 20", d: "M13 2 5 10l8 8" },
  "chevron-right": { box: "0 0 20 20", d: "M7 2l8 8-8 8" },
  close: { box: "0 0 20 20", d: "M3 3l14 14M17 3 3 17" },
  menu: { box: "0 0 20 20", d: "M2 4h16M2 10h16M2 16h10" },
  swap: { box: "0 0 24 20", d: "M2 6h18M15 1l5 5-5 5M22 14H4M9 9l-5 5 5 5" },
  plus: { box: "0 0 20 20", d: "M10 2v16M2 10h16" },
  minus: { box: "0 0 20 20", d: "M2 10h16" },
  undo: { box: "0 0 22 20", d: "M7 3 2 8l5 5M2 8h12a6 6 0 0 1 0 12h-4" },
  bolt: { box: "0 0 20 20", d: "M11.5 1.5 4 11h6l-1.5 7.5L16 9h-6z" },
  warning: { box: "0 0 20 20", d: "M10 2 1.5 17.5h17zM10 8v4.5M10 14.5v1" },
  virus: { box: "0 0 20 20", d: "M10 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2.2 2.2M14.3 14.3l2.2 2.2M16.5 3.5l-2.2 2.2M3.5 16.5l2.2-2.2" },
  advance: { box: "0 0 20 20", d: "M3 12l7-7 7 7M3 18l7-7 7 7" },
} as const;

const SYMBOLS = {
  credit: "\ue600",
  link: "\ue601",
  sub: "\ue604",
  trash: "\ue606",
  recurring: "\ue608",
  agenda: "\ue60d",
  rez: "\ue60f",
  mu: "\ue610",
  click: "\ue611",
} as const;

export type IconName = keyof typeof PATHS | keyof typeof SYMBOLS;

export const ICON_SET: Record<string, unknown> = { ...PATHS, ...SYMBOLS };

export function Icon({ name, class: className }: { name: IconName; class?: string }) {
  if (name in SYMBOLS)
    return (
      <span class={`sym sym-${name} ${className ?? ""}`} aria-hidden="true">
        {SYMBOLS[name as keyof typeof SYMBOLS]}
      </span>
    );
  const { box, d } = PATHS[name as keyof typeof PATHS];
  const [, , w, h] = box.split(" ").map(Number);
  return (
    <svg class={`icon icon-${name} ${className ?? ""}`} viewBox={box} style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter">
      <path d={d} />
    </svg>
  );
}
