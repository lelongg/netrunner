import type { Side } from "../engine";
import type { WireDeck } from "../decks";

export type Seat = 0 | 1;

export type Payload =
  | { k: "join"; name: string }
  | { k: "name"; name: string }
  | { k: "side"; side: Side }
  | { k: "deck"; deck: WireDeck | null }
  | { k: "start"; seed: number[] }
  | { k: "act"; command: string; args: unknown }
  | { k: "say"; text: string }
  | { k: "concede" };

export type Tagged = Payload & { id: string };

export interface Entry {
  seq: number;
  seat: Seat;
  p: Tagged;
}

export interface LinkStatus {
  link: "connecting" | "open";
  peer: boolean;
  step?: "relay" | "host";
  hint?: "unreachable";
  since?: number;
  error?: string;
  watchers?: number;
  free?: boolean[];
}

export interface TransportHandlers {
  onEntries: (entries: Entry[]) => void;
  onStatus: (status: LinkStatus) => void;
}

export interface Transport {
  readonly kind: "relay" | "p2p";
  send(p: Payload): void;
  close(): void;
}

export const newId = () => Array.from(crypto.getRandomValues(new Uint32Array(3)), (n) => n.toString(36)).join("");

export class Outbox {
  private items: Tagged[] = [];

  add(p: Payload): Tagged {
    const tagged = { ...p, id: newId() } as Tagged;
    this.items.push(tagged);
    return tagged;
  }

  settle(entries: Entry[]) {
    if (!this.items.length) return;
    const seen = new Set(entries.map((e) => e.p?.id));
    this.items = this.items.filter((p) => !seen.has(p.id));
  }

  get pending(): readonly Tagged[] {
    return this.items;
  }
}
