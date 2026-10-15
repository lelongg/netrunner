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
  sub: { box: "0 0 20 20", d: "M4 2v10h12M11 7l5 5-5 5" },
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, class: className }: { name: IconName; class?: string }) {
  const { box, d } = PATHS[name];
  const [, , w, h] = box.split(" ").map(Number);
  return (
    <svg class={`icon icon-${name} ${className ?? ""}`} viewBox={box} style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter">
      <path d={d} />
    </svg>
  );
}
