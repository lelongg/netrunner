import { type Entry, type LinkStatus, Outbox, type Payload, type Seat, type Transport, type TransportHandlers } from "./types";

export const RELAY_URL: string | undefined = import.meta.env.VITE_RELAY_URL?.replace(/\/$/, "") || undefined;

export interface SeatTicket {
  code: string;
  seat: Seat;
  token: string;
}

const TICKETS = "nsg.seats";
const PING_MS = 15000;
const PONG_TIMEOUT_MS = 8000;
const UNREACHABLE_MS = 20000;

function tickets(): Record<string, SeatTicket> {
  try {
    return JSON.parse(localStorage.getItem(TICKETS) ?? "{}");
  } catch {
    return {};
  }
}

export function storedTicket(code: string): SeatTicket | undefined {
  return tickets()[code];
}

function storeTicket(ticket: SeatTicket) {
  try {
    const all = tickets();
    all[ticket.code] = ticket;
    const recent = Object.fromEntries(Object.entries(all).slice(-20));
    localStorage.setItem(TICKETS, JSON.stringify(recent));
  } catch {}
}

async function call(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${RELAY_URL}${path}`, { method: "POST" });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function createGame(): Promise<SeatTicket> {
  const { status, body } = await call("/games");
  if (status !== 201) throw new Error(body.error ?? `The relay answered ${status}`);
  const ticket = { code: body.code, seat: body.seat, token: body.token };
  storeTicket(ticket);
  return ticket;
}

export async function joinGame(code: string): Promise<SeatTicket> {
  const known = storedTicket(code);
  if (known) return known;
  const { status, body } = await call(`/games/${code}/join`);
  if (status === 404) throw new Error("No game with this code. Check the code with the host.");
  if (status === 409) throw new Error("This game already has two players.");
  if (status !== 200) throw new Error(body.error ?? `The relay answered ${status}`);
  const ticket = { code, seat: body.seat, token: body.token };
  storeTicket(ticket);
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
  private pingTimer?: number;
  private pongTimer?: number;
  private status: LinkStatus = { link: "connecting", peer: false, step: "relay", since: Date.now() };
  private wake = () => this.revive();

  constructor(
    private ticket: SeatTicket,
    since: number,
    private handlers: TransportHandlers,
  ) {
    this.last = since;
    this.connect();
    document.addEventListener("visibilitychange", this.wake);
    addEventListener("online", this.wake);
  }

  send(p: Payload) {
    const tagged = this.outbox.add(p);
    if (this.status.link === "open" && this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "append", p: tagged }));
  }

  close() {
    this.closed = true;
    clearTimeout(this.retryTimer);
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
    const url = `${RELAY_URL!.replace(/^http/, "ws")}/games/${this.ticket.code}/ws?token=${this.ticket.token}&since=${this.last}`;
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
        this.setStatus({ link: "open", step: undefined, hint: undefined, since: undefined, error: undefined });
        for (const p of this.outbox.pending) ws.send(JSON.stringify({ t: "append", p }));
      } else if (msg.t === "presence") {
        this.setStatus({ peer: !!msg.seats?.[1 - this.ticket.seat] });
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
      if (event.code === 4001) return this.setStatus({ link: "connecting", peer: false, error: "This game has expired." });
      this.retry();
    };
  }

  private ping() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send("ping");
    clearTimeout(this.pongTimer);
    this.pongTimer = window.setTimeout(() => this.ws?.close(), PONG_TIMEOUT_MS);
  }

  private retry() {
    if (this.closed) return;
    const since = this.status.since ?? Date.now();
    this.setStatus({ link: "connecting", peer: false, step: "relay", since, hint: Date.now() - since > UNREACHABLE_MS ? "unreachable" : undefined });
    if (document.visibilityState !== "visible") return;
    const delay = Math.min(15000, 500 * 2 ** this.attempt++);
    this.retryTimer = window.setTimeout(() => this.connect(), delay);
  }

  private revive() {
    if (this.closed || document.visibilityState !== "visible") return;
    if (this.ws?.readyState === WebSocket.OPEN) return this.ping();
    this.attempt = 0;
    this.connect();
  }
}
