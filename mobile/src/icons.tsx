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
  click: { box: "0 0 20 20", d: "M10 3a7 7 0 1 1-6.1 3.6M2.5 2.5v4.5H7" },
  credit: { box: "0 0 20 20", d: "M15.5 5.5a6.5 6.5 0 1 0 0 9M10 1v18" },
  recurring: { box: "0 0 20 20", d: "M16.5 7.5A7 7 0 1 0 17 11M17.5 3v4.5H13M10 6.5v7" },
  trash: { box: "0 0 20 20", d: "M2.5 5h15M7.5 5V2h5v3M4.5 5l1 13h9l1-13M8.5 8.5v6M11.5 8.5v6" },
  link: { box: "0 0 20 20", d: "M7.5 12.5l5-5M6 9.5l-2 2a3.2 3.2 0 0 0 4.5 4.5l2-2M14 10.5l2-2A3.2 3.2 0 0 0 11.5 4l-2 2" },
  bolt: { box: "0 0 20 20", d: "M11.5 1.5 4 11h6l-1.5 7.5L16 9h-6z" },
  warning: { box: "0 0 20 20", d: "M10 2 1.5 17.5h17zM10 8v4.5M10 14.5v1" },
  virus: { box: "0 0 20 20", d: "M10 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2.2 2.2M14.3 14.3l2.2 2.2M16.5 3.5l-2.2 2.2M3.5 16.5l2.2-2.2" },
  star: { box: "0 0 20 20", d: "M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" },
  advance: { box: "0 0 20 20", d: "M3 12l7-7 7 7M3 18l7-7 7 7" },
  sub: { box: "0 0 20 20", d: "M4 2v10h12M11 7l5 5-5 5" },
} as const;

export type IconName = keyof typeof PATHS;

export const ICON_SET: Record<string, unknown> = PATHS;

export function Icon({ name, class: className }: { name: IconName; class?: string }) {
  const { box, d } = PATHS[name];
  const [, , w, h] = box.split(" ").map(Number);
  return (
    <svg class={`icon icon-${name} ${className ?? ""}`} viewBox={box} style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter">
      <path d={d} />
    </svg>
  );
}
