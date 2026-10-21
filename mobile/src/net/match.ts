import type { Side } from "../engine";
import type { GameFormat } from "../deckrules";
import { currentSub } from "./push";
import { relayUrl, storeTicket } from "./relay";

export type SeekSide = Side | "any";

export interface Seek {
  id: string;
  secret: string;
  format: GameFormat;
  side: SeekSide;
  at: number;
  code?: string;
  public?: boolean;
  spectators?: boolean;
}

export interface GameOptions {
  public: boolean;
  spectators: boolean;
}

export interface OpenSeek {
  id: string;
  name: string;
  format: GameFormat;
  side: SeekSide;
  created: number;
  code: string;
  spectators: boolean;
}

export interface PlayingGame {
  name: string;
  opponent: string;
  format: GameFormat;
  side: Side;
  created: number;
  code: string;
  spectators: boolean;
  watchers: number;
}

export interface Matched {
  status: "matched";
  code: string;
  seat: 0 | 1;
  token: string;
  side: Side;
  format: GameFormat;
  opponent: string;
}

const KEY = "nsg.seek";

export function pendingSeek(): Seek | null {
  try {
    const seek: Seek | null = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return seek && Date.now() - seek.at < 24 * 3600 * 1000 ? seek : null;
  } catch {
    return null;
  }
}

function remember(seek: Seek | null) {
  try {
    if (seek) localStorage.setItem(KEY, JSON.stringify(seek));
    else localStorage.removeItem(KEY);
  } catch {}
}

async function call(path: string, body?: unknown) {
  const relay = relayUrl();
  if (!relay) throw new Error("Finding an opponent needs the online relay.");
  const res = await fetch(`${relay}${path}`, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `The relay answered ${res.status}`);
  return json;
}

function seated(m: Matched) {
  storeTicket({ code: m.code, seat: m.seat, token: m.token });
  remember(null);
  return m;
}

export async function seek(name: string, format: GameFormat, side: SeekSide, options: GameOptions = { public: true, spectators: true }): Promise<Matched | Seek> {
  const old = pendingSeek();
  if (old) await cancelSeek(old).catch(() => {});
  const res = await call("/match", { name, format, side, sub: await currentSub("match"), ...options });
  if (res.status === "matched") return seated(res);
  const mine: Seek = { id: res.id, secret: res.secret, format, side, at: Date.now(), code: res.code, ...options };
  remember(mine);
  return mine;
}

export async function updateSeek(seek: Seek, format: GameFormat, side: SeekSide, options: GameOptions): Promise<Matched | Seek> {
  const res = await call(`/match/${seek.id}/update`, { secret: seek.secret, format, side, sub: await currentSub("match"), ...options });
  if (res.status === "matched") return seated(res);
  const mine: Seek = { ...seek, format, side, code: res.code ?? seek.code, ...options };
  remember(mine);
  return mine;
}

export async function checkSeek(seek: Seek): Promise<Matched | "waiting" | "expired"> {
  const res = await call(`/match/${seek.id}?secret=${seek.secret}`);
  if (res.status === "matched") return seated(res);
  if (res.status === "expired") remember(null);
  return res.status;
}

export async function cancelSeek(seek: Seek) {
  remember(null);
  await call(`/match/${seek.id}/cancel`, { secret: seek.secret });
}

export async function publicGames(): Promise<{ open: OpenSeek[]; playing: PlayingGame[] }> {
  const res = await call("/match/open");
  const mine = pendingSeek()?.id;
  return { open: (res.open as OpenSeek[]).filter((o) => o.id !== mine && o.code), playing: (res.playing ?? []) as PlayingGame[] };
}

export async function openSeeks(): Promise<OpenSeek[]> {
  return (await publicGames()).open;
}
