export interface Aim {
  advanced: string[];
  gone: DOMRect[];
  hostOf: Map<string, string>;
  corpLost: number;
  gripLost: number;
}

let current: Aim = { advanced: [], gone: [], hostOf: new Map(), corpLost: 0, gripLost: 0 };

export const aim = () => current;

export function setAim(next: Aim) {
  current = next;
}
