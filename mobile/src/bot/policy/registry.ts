import type { Side } from "../../engine.ts";
import type { DeckList, DeckPolicy } from "./types.ts";

export interface AnyDeck {
  identity: string | { title: string };
  cards: ({ qty: number; title?: string; card?: { title: string } | string } | [string, number])[];
}

export function deckList(deck: AnyDeck): DeckList {
  const identity = typeof deck.identity === "string" ? deck.identity : deck.identity.title;
  const cards = deck.cards.map((e) => (Array.isArray(e) ? { qty: Number(e[1]), title: e[0] } : { qty: Number(e.qty), title: e.title ?? (typeof e.card === "string" ? e.card : e.card?.title) ?? "" })).filter((e) => e.title && e.qty > 0);
  return { identity, cards };
}

export function fingerprint(deck: AnyDeck): string {
  const list = deckList(deck);
  const merged = new Map<string, number>();
  for (const { title, qty } of list.cards) merged.set(title, (merged.get(title) ?? 0) + qty);
  const text = [list.identity, ...[...merged.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, q]) => `${t}:${q}`)].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const policies: DeckPolicy[] = [];

export function registerPolicy(policy: DeckPolicy) {
  if (!policies.some((p) => p.id === policy.id)) policies.push(policy);
  return policy;
}

export function listPolicies(): DeckPolicy[] {
  return [...policies];
}

export interface Match {
  policy: DeckPolicy;
  fingerprint: string;
  exact: boolean;
}

const overlap = (a: DeckList, b: DeckList) => {
  const have = new Map<string, number>();
  for (const { title, qty } of a.cards) have.set(title, (have.get(title) ?? 0) + qty);
  let shared = 0;
  for (const { title, qty } of b.cards) shared += Math.min(qty, have.get(title) ?? 0);
  return shared / Math.max(1, a.cards.reduce((n, c) => n + c.qty, 0));
};

export function findPolicy(side: Side, deck: AnyDeck | undefined): Match | null {
  if (!deck) return null;
  const list = deckList(deck);
  const fp = fingerprint(list);
  for (const policy of policies) {
    if (policy.side !== side) continue;
    if (policy.decks.some((d) => fingerprint(d) === fp)) return { policy, fingerprint: fp, exact: true };
  }
  let best: { policy: DeckPolicy; score: number } | null = null;
  for (const policy of policies) {
    if (policy.side !== side) continue;
    for (const d of policy.decks) {
      const score = (d.identity === list.identity ? 1 : 0) + overlap(list, d);
      if (score >= 0.5 && (!best || score > best.score)) best = { policy, score };
    }
  }
  return best ? { policy: best.policy, fingerprint: fp, exact: false } : null;
}

export function policyById(id: string): DeckPolicy | undefined {
  return policies.find((p) => p.id === id);
}
