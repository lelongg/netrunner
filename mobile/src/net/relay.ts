import { settings } from "../settings";
import { type Store, browserStore } from "../store";
import { currentSub } from "./push";
import { type Entry, type LinkStatus, Outbox, type Payload, type Seat, type Transport, type TransportHandlers } from "./types";

export const DEFAULT_RELAY: string | undefined = import.meta.env.VITE_RELAY_URL?.replace(/\/$/, "") || undefined;

export const relayUrl = (): string | undefined => settings.relay.trim().replace(/\/$/, "") || DEFAULT_RELAY;

export interface SeatTicket {
  code: string;
  seat: Seat;
  token: string;
}

export type Ticket = SeatTicket | { code: string; seat: null; token?: undefined };

export function watchLink(code: string) {
  return `${location.origin}${location.pathname}?watch=${code}`;
}

const TICKETS = "nsg.seats";
const PING_MS = 15000;
const PONG_TIMEOUT_MS = 8000;
const UNREACHABLE_MS = 20000;
const SLOW_DOWN_MS = 10500;

function tickets(store: Store): Record<string, SeatTicket> {
  try {
    return JSON.parse(store.getItem(TICKETS) ?? "{}");
  } catch {
    return {};
  }
}

export function storedTicket(code: string, store: Store = browserStore()): SeatTicket | undefined {
  return tickets(store)[code];
}

export function forgetTicket(code: string, store: Store = browserStore()) {
  try {
    const all = tickets(store);
    delete all[code];
    store.setItem(TICKETS, JSON.stringify(all));
  } catch {}
}

export function rejoinLink(ticket: SeatTicket) {
  return `${location.origin}${location.pathname}?join=${ticket.code}#seat=${ticket.seat}.${ticket.token}`;
}

export function ticketFromHash(code: string, hash: string): SeatTicket | undefined {
  const m = hash.match(/seat=([01])\.([0-9a-f]{16,})/);
  return m ? { code, seat: Number(m[1]) as Seat, token: m[2] } : undefined;
}

export function storeTicket(ticket: SeatTicket, store: Store = browserStore()) {
  try {
    const all = tickets(store);
    all[ticket.code] = ticket;
    const recent = Object.fromEntries(Object.entries(all).slice(-20));
    store.setItem(TICKETS, JSON.stringify(recent));
  } catch {}
}

const BUSY = "The relay is busy right now. Try again in a minute.";

async function call(path: string): Promise<{ status: number; body: any }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${relayUrl()}${path}`, { method: "POST" });
    if (res.status !== 429) return { status: res.status, body: await res.json().catch(() => ({})) };
    if (attempt >= 4) return { status: 429, body: { error: BUSY } };
    const hinted = Number(res.headers.get("Retry-After")) * 1000;
    await new Promise((r) => setTimeout(r, Math.min(hinted > 0 ? hinted : Infinity, 2000 * 2 ** attempt)));
  }
}

export async function createGame(store: Store = browserStore()): Promise<SeatTicket> {
  const { status, body } = await call("/games");
  if (status !== 201) throw new Error(body.error ?? `The relay answered ${status}`);
  const ticket = { code: body.code, seat: body.seat, token: body.token };
  storeTicket(ticket, store);
  return ticket;
}

export async function joinGame(code: string, store: Store = browserStore()): Promise<SeatTicket> {
  const known = storedTicket(code, store);
  if (known) return known;
  const { status, body } = await call(`/games/${code}/join`);
  if (status === 404) throw new Error("No game with this code. Check the code with the host.");
  if (status === 409) throw new Error("This game already has two players.");
  if (status !== 200) throw new Error(body.error ?? `The relay answered ${status}`);
  const ticket = { code, seat: body.seat, token: body.token };
  storeTicket(ticket, store);
  return ticket;
}

export class RelayTransport implements Transport {
  readonly kind = "relay";
  private ws?: WebSocket;
  private outbox = new Outbox();
  private last: number;
  private closed = false;
  private attempt = 0;
  private retryTimer?: number;
  private resendTimer?: number;
  private pingTimer?: number;
  private pongTimer?: number;
  private status: LinkStatus = { link: "connecting", peer: false, step: "relay", since: Date.now() };
  private wake = () => {
    this.focus();
    this.revive();
  };
  private dead = false;

  constructor(
    private ticket: Ticket,
    since: number,
    private handlers: TransportHandlers,
    private store: Store = browserStore(),
  ) {
    this.last = since;
    this.connect();
    document.addEventListener("visibilitychange", this.wake);
    addEventListener("online", this.wake);
  }

  send(p: Payload) {
    if (this.ticket.seat === null) return;
    const tagged = this.outbox.add(p);
    if (this.status.link === "open" && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "append", p: tagged }));
  }

  nudge(name: string) {
    if (this.ticket.seat !== null && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "nudge", name }));
  }

  private focus() {
    if (this.ticket.seat !== null && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "focus", on: document.visibilityState === "visible" }));
  }

  release() {
    if (this.ticket.seat !== null && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "release" }));
  }

  get seatTicket(): SeatTicket | undefined {
    return this.ticket.seat === null ? undefined : this.ticket;
  }

  close() {
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearTimeout(this.resendTimer);
    clearInterval(this.pingTimer);
    clearTimeout(this.pongTimer);
    document.removeEventListener("visibilitychange", this.wake);
    removeEventListener("online", this.wake);
    this.ws?.close(1000, "Leaving");
  }

  private setStatus(patch: Partial<LinkStatus>) {
    this.status = { ...this.status, ...patch };
    this.handlers.onStatus(this.status);
  }

  private connect() {
    if (this.closed) return;
    clearTimeout(this.retryTimer);
    const auth = this.ticket.seat === null ? "watch=1" : `token=${this.ticket.token}`;
    const url = `${relayUrl()!.replace(/^http/, "ws")}/games/${this.ticket.code}/ws?${auth}&since=${this.last}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      if (event.data === "pong") return clearTimeout(this.pongTimer);
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.t === "entries" || msg.t === "entry") {
        const entries: Entry[] = msg.t === "entry" ? [msg.e] : msg.list;
        for (const e of entries) this.last = Math.max(this.last, e.seq);
        this.outbox.settle(entries);
        this.handlers.onEntries(entries);
      } else if (msg.t === "synced") {
        this.attempt = 0;
        this.focus();
        if (this.ticket.seat !== null)
          void currentSub().then((sub) => {
            if (sub && this.ws === ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "subscribe", sub }));
          });
        this.setStatus({ link: "open", step: undefined, hint: undefined, since: undefined, error: undefined });
        for (const p of this.outbox.pending) ws.send(JSON.stringify({ t: "append", p }));
      } else if (msg.t === "presence") {
        const seat = this.ticket.seat;
        this.setStatus({ peer: seat === null ? !!(msg.seats?.[0] || msg.seats?.[1]) : !!msg.seats?.[1 - seat], watchers: Number(msg.watchers) || 0, free: Array.isArray(msg.free) ? msg.free.map(Boolean) : undefined });
      } else if (msg.t === "error" && /slow down/i.test(String(msg.error))) {
        clearTimeout(this.resendTimer);
        this.resendTimer = window.setTimeout(() => {
          if (this.ws === ws && ws.readyState === WebSocket.OPEN) for (const p of this.outbox.pending) ws.send(JSON.stringify({ t: "append", p }));
        }, SLOW_DOWN_MS);
      } else if (msg.t === "error") {
        this.setStatus({ error: msg.error });
      }
    };
    ws.onopen = () => {
      clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => this.ping(), PING_MS);
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      clearInterval(this.pingTimer);
      clearTimeout(this.pongTimer);
      if (event.code === 4001) return this.die("This game has expired.");
      if (event.code === 4002) return this.die("The host gave your seat to someone else.");
      this.retry();
    };
  }

  private ping() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send("ping");
    clearTimeout(this.pongTimer);
    this.pongTimer = window.setTimeout(() => this.ws?.close(), PONG_TIMEOUT_MS);
  }

  private die(error: string) {
    this.dead = true;
    if (this.ticket.seat !== null) forgetTicket(this.ticket.code, this.store);
    this.setStatus({ link: "connecting", peer: false, error });
  }

  private async checkSeat() {
    if (this.ticket.seat === null) return;
    try {
      const res = await fetch(`${relayUrl()}/games/${this.ticket.code}/seat?token=${this.ticket.token}`);
      if (res.status === 404) this.die("This game no longer exists, or your seat was given to someone else.");
    } catch {}
  }

  private retry() {
    if (this.closed || this.dead) return;
    if (this.attempt === 2) void this.checkSeat();
    const since = this.status.since ?? Date.now();
    this.setStatus({ link: "connecting", peer: false, step: "relay", since, hint: Date.now() - since > UNREACHABLE_MS ? "unreachable" : undefined });
    if (document.visibilityState !== "visible") return;
    const delay = Math.min(15000, 500 * 2 ** this.attempt++);
    this.retryTimer = window.setTimeout(() => !this.dead && this.connect(), delay);
  }

  private revive() {
    if (this.closed || this.dead || document.visibilityState !== "visible") return;
    if (this.ws?.readyState === WebSocket.OPEN) return this.ping();
    this.attempt = 0;
    this.connect();
  }
}
