import { type Room, getRelaySockets, joinRoom } from "trystero";
import { type Entry, type LinkStatus, Outbox, type Payload, type Seat, type Tagged, type Transport, type TransportHandlers, newId } from "./types";

const APP_ID = "nsg-mobile.lelongg.github.io";
const PING_MS = 4000;
const STALE_MS = 15000;
const UNREACHABLE_MS = 20000;
const CHUNK = 200;
const STUN: RTCIceServer = { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] };

type Wire =
  | { t: "hello"; since: number }
  | { t: "append"; p: Tagged }
  | { t: "entries"; list: Entry[] }
  | { t: "synced" }
  | { t: "ping" };

function iceServers(): RTCIceServer[] {
  const extra = import.meta.env.VITE_ICE_SERVERS;
  if (!extra) return [STUN];
  try {
    return [STUN, ...JSON.parse(extra)];
  } catch {
    return [STUN];
  }
}

const relayOpen = () => Object.values((getRelaySockets() ?? {}) as Record<string, WebSocket>).some((ws) => ws?.readyState === WebSocket.OPEN);

export class PeerTransport implements Transport {
  readonly kind = "p2p";
  private room?: Room;
  private channel?: { send: (data: any, options?: { target?: string }) => Promise<void> };
  private remote?: string;
  private lastSeen = 0;
  private outbox = new Outbox();
  private ids: Set<string>;
  private last: number;
  private closed = false;
  private timer: number;
  private status: LinkStatus;
  private wake = () => this.revive();

  constructor(
    private code: string,
    private seat: Seat,
    private log: Entry[],
    private handlers: TransportHandlers,
  ) {
    this.last = log.length ? log[log.length - 1].seq : 0;
    this.ids = new Set(log.map((e) => e.p.id));
    this.status = seat === 0 ? { link: "open", peer: false } : { link: "connecting", peer: false, step: "relay", since: Date.now() };
    this.open();
    this.timer = window.setInterval(() => this.tick(), PING_MS);
    document.addEventListener("visibilitychange", this.wake);
    addEventListener("online", this.wake);
  }

  send(p: Payload) {
    if (this.seat === 0) return this.append({ ...p, id: newId() } as Tagged, 0);
    const tagged = this.outbox.add(p);
    if (this.status.link === "open") this.post({ t: "append", p: tagged });
  }

  close() {
    this.closed = true;
    clearInterval(this.timer);
    document.removeEventListener("visibilitychange", this.wake);
    removeEventListener("online", this.wake);
    this.room?.leave();
  }

  private setStatus(patch: Partial<LinkStatus>) {
    this.status = { ...this.status, ...patch };
    this.handlers.onStatus(this.status);
  }

  private post(msg: Wire) {
    if (this.remote) this.channel?.send(msg, { target: this.remote }).catch(() => {});
  }

  private append(p: Tagged, seat: Seat) {
    if (this.ids.has(p.id)) return;
    this.ids.add(p.id);
    const entry: Entry = { seq: this.log.length + 1, seat, p };
    this.log.push(entry);
    this.handlers.onEntries([entry]);
    this.post({ t: "entries", list: [entry] });
  }

  private open() {
    if (this.closed) return;
    this.room?.leave();
    this.remote = undefined;
    const room = joinRoom({ appId: APP_ID, rtcConfig: { iceServers: iceServers() } }, this.code);
    this.room = room;
    const channel = room.makeAction<any>("msg");
    channel.onMessage = (msg: Wire, { peerId }: { peerId: string }) => this.receive(msg, peerId);
    this.channel = channel;
    room.onPeerJoin = (peerId) => {
      this.lastSeen = Date.now();
      if (this.seat === 1) {
        this.remote = peerId;
        this.post({ t: "hello", since: this.last });
        this.setStatus({ step: "host" });
      }
    };
    room.onPeerLeave = (peerId) => peerId === this.remote && this.lost();
  }

  private receive(msg: Wire, peerId: string) {
    if (this.seat === 0) {
      if (msg.t === "hello") {
        this.remote = peerId;
        this.lastSeen = Date.now();
        for (let i = msg.since; i < this.log.length; i += CHUNK) this.post({ t: "entries", list: this.log.slice(i, i + CHUNK) });
        this.post({ t: "synced" });
        return this.setStatus({ peer: true });
      }
      if (peerId !== this.remote) return;
      this.lastSeen = Date.now();
      if (msg.t === "append") this.append(msg.p, 1);
      return;
    }
    if (peerId !== this.remote) return;
    this.lastSeen = Date.now();
    if (msg.t === "entries") {
      const fresh = msg.list.filter((e) => e.seq > this.last);
      if (!fresh.length) return;
      this.last = fresh[fresh.length - 1].seq;
      this.outbox.settle(fresh);
      this.handlers.onEntries(fresh);
    } else if (msg.t === "synced") {
      this.setStatus({ link: "open", peer: true, step: undefined, hint: undefined, since: undefined });
      for (const p of this.outbox.pending) this.post({ t: "append", p });
    }
  }

  private lost() {
    this.remote = undefined;
    if (this.seat === 0) this.setStatus({ peer: false });
    else this.setStatus({ link: "connecting", peer: false, step: relayOpen() ? "host" : "relay", since: Date.now(), hint: undefined });
  }

  private tick() {
    if (this.closed) return;
    if (this.remote) {
      this.post({ t: "ping" });
      if (document.visibilityState === "visible" && Date.now() - this.lastSeen > STALE_MS) {
        this.lost();
        this.open();
      }
      return;
    }
    if (this.seat === 1) {
      const step = relayOpen() ? "host" : "relay";
      const hint = this.status.since && Date.now() - this.status.since > UNREACHABLE_MS ? "unreachable" : undefined;
      if (step !== this.status.step || hint !== this.status.hint) this.setStatus({ step, hint });
    }
  }

  private revive() {
    if (this.closed || document.visibilityState !== "visible") return;
    if (this.remote && Date.now() - this.lastSeen < STALE_MS) return;
    this.lastSeen = Date.now();
    this.open();
  }
}
