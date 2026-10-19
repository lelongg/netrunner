import { DurableObject } from "cloudflare:workers";
import { type PushSub, type Vapid, sendPush, validSub } from "./push";

export interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  REPLAYS: DurableObjectNamespace<ReplayStore>;
  CREATE_LIMIT?: RateLimit;
  CREATE_LIMIT_ALL?: RateLimit;
  JOIN_LIMIT?: RateLimit;
  ALLOWED_ORIGINS?: string;
  EXPIRY_DAYS?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  PUSH_ALLOW_LOOPBACK?: string;
  REPLAY_LIMIT?: RateLimit;
  REPLAY_LIMIT_ALL?: RateLimit;
  WATCH_LIMIT?: RateLimit;
  DECKS?: D1Database;
  DECK_LIMIT?: RateLimit;
}

const DECK_FORMATS = new Set(["standard", "startup", "core", "eternal", "system-gateway", "throwback"]);
const DECK_PAGE = 20;

async function listDecklists(env: Env, url: URL) {
  const side = url.searchParams.get("side");
  const format = url.searchParams.get("format") ?? "casual";
  const faction = url.searchParams.get("faction");
  const page = Math.max(1, Math.min(50, Number(url.searchParams.get("page")) || 1));
  if (side !== "corp" && side !== "runner") return null;
  if (format !== "casual" && !DECK_FORMATS.has(format)) return null;
  if (faction && !/^[a-z_]{1,40}$/.test(faction)) return null;
  const offset = (page - 1) * DECK_PAGE;
  const columns = "d.id, d.name, d.user, d.side, d.faction, d.identity, d.created, d.cards";
  const query =
    format === "casual"
      ? env.DECKS!.prepare(`SELECT ${columns} FROM decklists d WHERE d.side = ?1 ${faction ? "AND d.faction = ?2" : ""} ORDER BY d.created DESC LIMIT ${DECK_PAGE + 1} OFFSET ${offset}`)
      : env.DECKS!.prepare(`SELECT ${columns} FROM deck_formats f JOIN decklists d ON d.id = f.id WHERE f.format = ?3 AND f.side = ?1 ${faction ? "AND f.faction = ?2" : ""} ORDER BY f.created DESC LIMIT ${DECK_PAGE + 1} OFFSET ${offset}`);
  const params = format === "casual" ? (faction ? [side, faction] : [side]) : faction ? [side, faction, format] : [side, null, format];
  const { results } = await query.bind(...params).all();
  return { items: results.slice(0, DECK_PAGE), hasMore: results.length > DECK_PAGE };
}

type Seat = 0 | 1;
type Seated = { seat: Seat | null; focus?: boolean };

const MAX_MESSAGE_BYTES = 4096;
const MAX_ENTRIES = 20000;
const BURST_WINDOW_MS = 10000;
const BURST_MAX = 60;
const RESYNC_CHUNK = 400;
const MAX_WATCHERS = 20;
const PUSH_GAP_MS = 20000;
const MAX_REPLAY_BYTES = 300 * 1024;
const REPLAY_DAYS = 180;
const REPLAY_RE = /^[A-HJ-NP-Z2-9]{8}$/;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
const newCode = () => Array.from(crypto.getRandomValues(new Uint32Array(5)), (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");

const vapid = (env: Env): Vapid | null => (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || "https://github.com/lelongg/netrunner" } : null);

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(origin) ? origin : null;
}

function json(body: unknown, status: number, origin: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (status === 429) headers["Retry-After"] = "20";
  if (origin) Object.assign(headers, { "Access-Control-Allow-Origin": origin, "Access-Control-Expose-Headers": "Retry-After", Vary: "Origin" });
  return new Response(JSON.stringify(body), { status, headers });
}

async function limited(limiter: RateLimit | undefined, request: Request | null) {
  if (!limiter) return false;
  const key = request ? request.headers.get("CF-Connecting-IP") ?? "unknown" : "all";
  return !(await limiter.limit({ key })).success;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    if (request.headers.get("Origin") && !origin) return new Response("Origin not allowed", { status: 403 });
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin ?? "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });

    if (request.method === "POST" && url.pathname === "/games") {
      if ((await limited(env.CREATE_LIMIT, request)) || (await limited(env.CREATE_LIMIT_ALL, null))) return json({ error: "Too many new games, try again in a minute" }, 429, origin);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = newCode();
        const seat = await env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code)).create();
        if (seat) return json({ code, ...seat }, 201, origin);
      }
      return json({ error: "Could not allocate a game code" }, 503, origin);
    }

    if (request.method === "GET" && url.pathname === "/decklists") {
      if (!env.DECKS) return json({ error: "The decklist index is not configured on this relay" }, 404, origin);
      if (await limited(env.DECK_LIMIT, request)) return json({ error: "Too many requests, try again in a minute" }, 429, origin);
      const found = await listDecklists(env, url);
      if (!found) return json({ error: "Expected side=corp|runner and an optional format, faction and page" }, 400, origin);
      const res = json(found, 200, origin);
      res.headers.set("Cache-Control", "public, max-age=600");
      return res;
    }

    if (request.method === "GET" && url.pathname === "/push-key") {
      const keys = vapid(env);
      return keys ? json({ key: keys.publicKey }, 200, origin) : json({ error: "Push is not configured on this relay" }, 404, origin);
    }

    if (request.method === "POST" && url.pathname === "/replays") {
      if ((await limited(env.REPLAY_LIMIT, request)) || (await limited(env.REPLAY_LIMIT_ALL, null))) return json({ error: "Too many shares, try again in a minute" }, 429, origin);
      const body = await request.text();
      if (body.length > MAX_REPLAY_BYTES) return json({ error: "This game is too long to share" }, 413, origin);
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== "object" || parsed.v !== 1 || !Array.isArray(parsed.entries)) throw new Error();
      } catch {
        return json({ error: "Malformed replay" }, 400, origin);
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = Array.from(crypto.getRandomValues(new Uint32Array(8)), (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
        if (await env.REPLAYS.get(env.REPLAYS.idFromName(code)).put(body)) return json({ code }, 201, origin);
      }
      return json({ error: "Could not allocate a replay code" }, 503, origin);
    }
    const replay = url.pathname.match(/^\/replays\/([^/]+)$/);
    if (replay && request.method === "GET") {
      if (!REPLAY_RE.test(replay[1]) || (await limited(env.JOIN_LIMIT, request))) return json({ error: "Not found" }, 404, origin);
      const body = await env.REPLAYS.get(env.REPLAYS.idFromName(replay[1])).read();
      if (!body) return json({ error: "This replay does not exist or has expired" }, 404, origin);
      const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" });
      if (origin) headers.set("Access-Control-Allow-Origin", origin);
      return new Response(body, { headers });
    }

    const match = url.pathname.match(/^\/games\/([^/]+)\/(join|ws|seat|push)$/);
    if (!match || !CODE_RE.test(match[1])) return json({ error: "Not found" }, 404, origin);
    if (match[2] !== "ws" && (await limited(env.JOIN_LIMIT, request))) return json({ error: "Too many requests, try again in a minute" }, 429, origin);
    if (match[2] === "ws" && url.searchParams.has("watch") && (await limited(env.WATCH_LIMIT, request))) return json({ error: "Too many requests, try again in a minute" }, 429, origin);
    const room = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(match[1]));

    if (match[2] === "join" && request.method === "POST") {
      const result = await room.join();
      if ("error" in result) return json(result, result.error === "full" ? 409 : 404, origin);
      return json({ code: match[1], ...result }, 200, origin);
    }
    if (match[2] === "seat" && request.method === "GET") {
      const seat = await room.seatOf(url.searchParams.get("token") ?? "");
      return seat === null ? json({ error: "Unknown seat" }, 404, origin) : json({ code: match[1], seat }, 200, origin);
    }
    if (match[2] === "push" && request.method === "POST") {
      let body: { token?: string; sub?: unknown };
      try {
        body = await request.json();
      } catch {
        return json({ error: "Malformed body" }, 400, origin);
      }
      if (body.sub !== null && !validSub(body.sub, env.PUSH_ALLOW_LOOPBACK === "1")) return json({ error: "Invalid subscription" }, 400, origin);
      const ok = await room.setPush(String(body.token ?? ""), body.sub as PushSub | null, match[1]);
      return ok ? json({ ok: true }, 200, origin) : json({ error: "Unknown seat" }, 404, origin);
    }
    if (match[2] === "ws" && request.headers.get("Upgrade") === "websocket") return room.fetch(request);
    return json({ error: "Not found" }, 404, origin);
  },
} satisfies ExportedHandler<Env>;

export class GameRoom extends DurableObject<Env> {
  private sql: SqlStorage;
  private bursts = new Map<number, { start: number; n: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private exists() {
    return this.sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'seats'").toArray().length > 0;
  }

  private init() {
    this.sql.exec("CREATE TABLE IF NOT EXISTS seats (seat INTEGER PRIMARY KEY, token TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS pushes (seat INTEGER PRIMARY KEY, sub TEXT NOT NULL, last INTEGER NOT NULL DEFAULT 0)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS entries (seq INTEGER PRIMARY KEY AUTOINCREMENT, seat INTEGER NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL)");
  }

  async create(): Promise<{ seat: Seat; token: string } | null> {
    this.init();
    if (this.sql.exec("SELECT COUNT(*) AS n FROM seats").one().n) return null;
    const t = token();
    this.sql.exec("INSERT INTO seats (seat, token) VALUES (0, ?)", t);
    await this.touch();
    return { seat: 0, token: t };
  }

  async join(): Promise<{ seat: Seat; token: string } | { error: "unknown" | "full" }> {
    if (!this.exists()) return { error: "unknown" };
    const taken = this.sql.exec<{ seat: number }>("SELECT seat FROM seats").toArray().map((r) => r.seat);
    if (!taken.length && !this.lastSeq()) return { error: "unknown" };
    const seat = ([1, 0] as Seat[]).find((s) => !taken.includes(s));
    if (seat === undefined) return { error: "full" };
    const t = token();
    this.sql.exec("INSERT INTO seats (seat, token) VALUES (?, ?)", seat, t);
    await this.touch();
    this.broadcastPresence();
    return { seat, token: t };
  }

  async seatOf(token: string): Promise<Seat | null> {
    if (!this.exists()) return null;
    const row = this.sql.exec<{ seat: number }>("SELECT seat FROM seats WHERE token = ?", token).toArray()[0];
    return row ? (row.seat as Seat) : null;
  }

  async setPush(token: string, sub: PushSub | null, code: string): Promise<boolean> {
    const seat = await this.seatOf(token);
    if (seat === null) return false;
    this.init();
    this.remember(code);
    if (sub) this.sql.exec("INSERT INTO pushes (seat, sub) VALUES (?, ?) ON CONFLICT(seat) DO UPDATE SET sub = excluded.sub", seat, JSON.stringify(sub));
    else this.sql.exec("DELETE FROM pushes WHERE seat = ?", seat);
    return true;
  }

  private remember(code: string) {
    this.sql.exec("INSERT OR IGNORE INTO meta (k, v) VALUES ('code', ?)", code);
  }

  private async nudge(from: Seat, text: string) {
    const keys = vapid(this.env);
    if (!keys) return;
    const target = (1 - from) as Seat;
    if (this.ctx.getWebSockets(String(target)).some((s) => (s.deserializeAttachment() as Seated).focus)) return;
    const row = this.sql.exec<{ sub: string; last: number }>("SELECT sub, last FROM pushes WHERE seat = ?", target).toArray()[0];
    if (!row || Date.now() - row.last < PUSH_GAP_MS) return;
    this.sql.exec("UPDATE pushes SET last = ? WHERE seat = ?", Date.now(), target);
    const code = this.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'code'").toArray()[0]?.v;
    const payload = JSON.stringify({ code, title: "Your move", body: text });
    try {
      const status = await sendPush(JSON.parse(row.sub), payload, keys);
      if (status === 404 || status === 410) this.sql.exec("DELETE FROM pushes WHERE seat = ?", target);
    } catch {}
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!this.exists()) return new Response("Unknown game", { status: 403 });
    this.init();
    const code = url.pathname.match(/^\/games\/([^/]+)\/ws$/)?.[1];
    if (code) this.remember(code);
    const since = Math.max(0, Number(url.searchParams.get("since") ?? 0) || 0);
    let seat: Seat | null = null;
    if (url.searchParams.has("watch")) {
      if (!this.sql.exec("SELECT seat FROM seats").toArray().length && !this.lastSeq()) return new Response("Unknown game", { status: 403 });
      if (this.ctx.getWebSockets("watch").length >= MAX_WATCHERS) return new Response("Too many spectators", { status: 403 });
    } else {
      const row = this.sql.exec<{ seat: number }>("SELECT seat FROM seats WHERE token = ?", url.searchParams.get("token") ?? "").toArray()[0];
      if (!row) return new Response("Unknown seat", { status: 403 });
      seat = row.seat as Seat;
      for (const old of this.ctx.getWebSockets(String(seat))) old.close(4000, "Replaced by a newer connection");
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server, [seat === null ? "watch" : String(seat)]);
    server.serializeAttachment({ seat } satisfies Seated);
    server.send(JSON.stringify({ t: "welcome", seat, last: this.lastSeq() }));
    this.sendSince(server, since);
    server.send(JSON.stringify({ t: "synced", last: this.lastSeq() }));
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const size = typeof message === "string" ? new TextEncoder().encode(message).length : message.byteLength;
    if (typeof message !== "string" || size > MAX_MESSAGE_BYTES) return this.reject(ws, `Messages must be text of at most ${MAX_MESSAGE_BYTES} bytes`);
    let msg: { t?: string; p?: unknown; since?: number };
    try {
      msg = JSON.parse(message);
    } catch {
      return this.reject(ws, "Malformed message");
    }
    const { seat } = ws.deserializeAttachment() as Seated;
    if (msg.t === "sync") {
      this.sendSince(ws, Math.max(0, Number(msg.since) || 0));
      return ws.send(JSON.stringify({ t: "synced", last: this.lastSeq() }));
    }
    if (seat === null) return this.reject(ws, "Spectators cannot play");
    if (msg.t === "focus") return ws.serializeAttachment({ seat, focus: !!(msg as { on?: unknown }).on } satisfies Seated);
    if (msg.t === "subscribe") {
      const sub = (msg as { sub?: unknown }).sub;
      if (sub === null) this.sql.exec("DELETE FROM pushes WHERE seat = ?", seat);
      else if (validSub(sub, this.env.PUSH_ALLOW_LOOPBACK === "1")) this.sql.exec("INSERT INTO pushes (seat, sub) VALUES (?, ?) ON CONFLICT(seat) DO UPDATE SET sub = excluded.sub", seat, JSON.stringify(sub));
      return;
    }
    if (msg.t === "nudge") {
      const name = String((msg as { name?: unknown }).name ?? "")
        .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
        .trim()
        .slice(0, 24);
      const text = name ? `${name} is waiting for you.` : "Your opponent is waiting for you.";
      this.ctx.waitUntil(this.nudge(seat, text));
      return;
    }
    if (msg.t === "release") {
      const other = (1 - seat) as Seat;
      this.sql.exec("DELETE FROM seats WHERE seat = ?", other);
      this.sql.exec("DELETE FROM pushes WHERE seat = ?", other);
      for (const socket of this.ctx.getWebSockets(String(other))) socket.close(4002, "Seat released by the other player");
      this.broadcastPresence();
      return;
    }
    if (msg.t !== "append" || !msg.p || typeof msg.p !== "object") return this.reject(ws, "Unknown message");
    const now = Date.now();
    const burst = this.bursts.get(seat);
    if (!burst || now - burst.start > BURST_WINDOW_MS) this.bursts.set(seat, { start: now, n: 1 });
    else if (++burst.n > BURST_MAX) return this.reject(ws, "Too many messages, slow down");
    if (this.lastSeq() >= MAX_ENTRIES) return this.reject(ws, "This game has reached its size limit");
    const body = JSON.stringify(msg.p);
    const { seq } = this.sql.exec<{ seq: number }>("INSERT INTO entries (seat, body, at) VALUES (?, ?, ?) RETURNING seq", seat, body, now).one();
    const out = `{"t":"entry","e":{"seq":${seq},"seat":${seat},"at":${now},"p":${body}}}`;
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(out);
      } catch {}
    }
    await this.touch();
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code, "Closing");
    } catch {}
    this.broadcastPresence(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.broadcastPresence(ws);
  }

  async alarm() {
    for (const socket of this.ctx.getWebSockets()) socket.close(4001, "Game expired");
    await this.ctx.storage.deleteAll();
  }

  private lastSeq(): number {
    if (!this.exists()) return 0;
    return this.sql.exec<{ seq: number | null }>("SELECT MAX(seq) AS seq FROM entries").one().seq ?? 0;
  }

  private sendSince(ws: WebSocket, since: number) {
    let from = since;
    for (;;) {
      const rows = this.sql
        .exec<{ seq: number; seat: number; body: string; at: number }>("SELECT seq, seat, body, at FROM entries WHERE seq > ? ORDER BY seq LIMIT ?", from, RESYNC_CHUNK)
        .toArray();
      if (!rows.length) return;
      ws.send(`{"t":"entries","list":[${rows.map((r) => `{"seq":${r.seq},"seat":${r.seat},"at":${r.at},"p":${r.body}}`).join(",")}]}`);
      if (rows.length < RESYNC_CHUNK) return;
      from = rows[rows.length - 1].seq;
    }
  }

  private broadcastPresence(leaving?: WebSocket) {
    const open = this.ctx.getWebSockets().filter((s) => s !== leaving && s.readyState === WebSocket.OPEN);
    const seats = [0, 1].map((seat) => open.some((s) => (s.deserializeAttachment() as Seated).seat === seat));
    const watchers = open.filter((s) => (s.deserializeAttachment() as Seated).seat === null).length;
    const taken = this.sql.exec<{ seat: number }>("SELECT seat FROM seats").toArray().map((r) => r.seat);
    const free = [0, 1].map((seat) => !taken.includes(seat));
    const out = JSON.stringify({ t: "presence", seats, watchers, free });
    for (const socket of open) {
      try {
        socket.send(out);
      } catch {}
    }
  }

  private reject(ws: WebSocket, error: string) {
    ws.send(JSON.stringify({ t: "error", error }));
  }

  private async touch() {
    const days = Number(this.env.EXPIRY_DAYS) || 14;
    await this.ctx.storage.setAlarm(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

export class ReplayStore extends DurableObject<Env> {
  async put(body: string): Promise<boolean> {
    const sql = this.ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS replay (id INTEGER PRIMARY KEY CHECK (id = 0), body TEXT NOT NULL)");
    if (sql.exec("SELECT COUNT(*) AS n FROM replay").one().n) return false;
    sql.exec("INSERT INTO replay (id, body) VALUES (0, ?)", body);
    await this.ctx.storage.setAlarm(Date.now() + REPLAY_DAYS * 24 * 60 * 60 * 1000);
    return true;
  }

  async read(): Promise<string | null> {
    const sql = this.ctx.storage.sql;
    if (!sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'replay'").toArray().length) return null;
    return sql.exec<{ body: string }>("SELECT body FROM replay").toArray()[0]?.body ?? null;
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
