const BASE = process.env.RELAY ?? "http://127.0.0.1:8787";
const WS = BASE.replace(/^http/, "ws");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } else console.log("ok:", m); };
const post = async (path) => { const r = await fetch(BASE + path, { method: "POST", headers: { Origin: "http://localhost:4178" } }); return { status: r.status, body: await r.json() }; };
function connect(code, tok, since = 0) {
  const ws = new WebSocket(`${WS}/games/${code}/ws?token=${tok}&since=${since}`, { headers: { Origin: "http://localhost:4178" } });
  const inbox = [];
  ws.onmessage = (m) => inbox.push(m.data === "pong" ? "pong" : JSON.parse(m.data));
  return new Promise((res, rej) => { ws.onopen = () => res({ ws, inbox }); ws.onerror = rej; });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const entries = (inbox) => inbox.flatMap((m) => (m.t === "entry" ? [m.e] : m.t === "entries" ? m.list : []));

const created = await post("/games");
assert(created.status === 201 && /^[A-Z2-9]{5}$/.test(created.body.code) && created.body.seat === 0, `create game ${created.body.code}`);
const { code } = created.body;
const joined = await post(`/games/${code}/join`);
assert(joined.status === 200 && joined.body.seat === 1, "second player gets seat 1");
const third = await post(`/games/${code}/join`);
assert(third.status === 409, "third player is refused (409)");
const unknown = await post(`/games/ZZZZZ/join`);
assert(unknown.status === 404, "joining an unknown game is 404");
const badSeat = await connect(code, "nope").then(() => "open", () => "refused");
assert(badSeat === "refused", "unknown seat token is refused");

const a = await connect(code, created.body.token);
const b = await connect(code, joined.body.token);
await wait(200);
for (let i = 0; i < 5; i++) {
  a.ws.send(JSON.stringify({ t: "append", p: { k: "act", n: i } }));
  b.ws.send(JSON.stringify({ t: "append", p: { k: "act", n: 100 + i } }));
}
await wait(500);
const ea = entries(a.inbox), eb = entries(b.inbox);
assert(ea.length === 10 && eb.length === 10, "both players receive all 10 entries");
assert(JSON.stringify(ea) === JSON.stringify(eb), "both see the same order");
assert(ea.every((e, i) => e.seq === i + 1), "sequence numbers are 1..10");
assert(ea.filter((e) => e.seat === 1).length === 5, "entries carry the sender's seat");
a.ws.send(JSON.stringify({ t: "append", p: { k: "big", s: "x".repeat(5000) } }));
await wait(200);
assert(a.inbox.some((m) => m.t === "error"), "messages over 4 KB are rejected");
a.ws.send("ping");
await wait(200);
assert(a.inbox.includes("pong"), "ping is answered (auto-response, no wake-up)");
const presence = a.inbox.filter((m) => m.t === "presence").pop();
assert(presence && presence.seats[0] && presence.seats[1], "presence shows both seats online");

b.ws.close();
await wait(300);
a.ws.send(JSON.stringify({ t: "append", p: { k: "act", n: "while-away" } }));
await wait(300);
assert(a.inbox.filter((m) => m.t === "presence").pop().seats[1] === false, "presence shows seat 1 offline after it disconnects");
const b2 = await connect(code, joined.body.token, 7);
await wait(400);
const resync = entries(b2.inbox);
assert(resync.length === 4 && resync[0].seq === 8 && resync[3].p.n === "while-away", "reconnecting with since=7 returns the 4 missed entries");
const b3 = await connect(code, joined.body.token, 0);
await wait(400);
assert(b2.inbox.some(() => true) && b2.ws.readyState >= 2, "a newer connection for the same seat replaces the old one");
assert(entries(b3.inbox).length === 11, "since=0 returns the full log");
a.ws.close(); b3.ws.close();
console.log("all protocol checks passed");

if (process.env.EXPIRY_TEST) {
  const g = await post("/games");
  const s = await connect(g.body.code, g.body.token);
  s.ws.send(JSON.stringify({ t: "append", p: { k: "act" } }));
  await wait(Number(process.env.EXPIRY_TEST));
  const late = await post(`/games/${g.body.code}/join`);
  assert(late.status === 404, "an inactive game is deleted by its alarm");
}
