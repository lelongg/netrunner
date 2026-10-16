const BASE = process.env.RELAY ?? "http://127.0.0.1:8787";
const WS = BASE.replace(/^http/, "ws");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } else console.log("ok:", m); };
const post = async (path) => { const r = await fetch(BASE + path, { method: "POST" }); return { status: r.status, body: await r.json() }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const game = await post("/games");
assert(game.status === 201, "create a game");
const ws = new WebSocket(`${WS}/games/${game.body.code}/ws?token=${game.body.token}&since=0`);
const inbox = [];
ws.onmessage = (m) => m.data !== "pong" && inbox.push(JSON.parse(m.data));
await new Promise((r) => (ws.onopen = r));
for (let i = 0; i < 80; i++) ws.send(JSON.stringify({ t: "append", p: { k: "act", n: i } }));
await wait(800);
const stored = inbox.filter((m) => m.t === "entry").length;
assert(stored === 60 && inbox.some((m) => m.t === "error" && /slow down/.test(m.error)), `a burst is capped (${stored} of 80 kept)`);
ws.close();

const probe = await post("/games/QQQQQ/join");
assert(probe.status === 404, "probing an unknown code is 404");
const seat = await fetch(`${BASE}/games/QQQQQ/seat?token=x`);
assert(seat.status === 404, "unknown code has no seats");

const statuses = [];
for (let i = 0; i < 12; i++) statuses.push((await post("/games")).status);
assert(statuses.includes(429), `creating games in a loop is rate limited (${statuses.join(",")})`);
console.log("limit checks passed");
