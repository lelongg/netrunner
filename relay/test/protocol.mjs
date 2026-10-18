const BASE = process.env.RELAY ?? "http://127.0.0.1:8787";
const WS = BASE.replace(/^http/, "ws");
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } else console.log("ok:", m); };
const post = async (path) => { const r = await fetch(BASE + path, { method: "POST", headers: { Origin: "http://localhost:4178" } }); return { status: r.status, body: await r.json() }; };
function connect(code, tok, since = 0) {
  const ws = new WebSocket(`${WS}/games/${code}/ws?${tok === null ? "watch=1" : `token=${tok}`}&since=${since}`, { headers: { Origin: "http://localhost:4178" } });
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
const watcher = await connect(code, null);
await wait(400);
assert(entries(watcher.inbox).length === 11 && watcher.inbox[0].seat === null, "a spectator connects without a seat and receives the full log");
watcher.ws.send(JSON.stringify({ t: "append", p: { k: "act", n: "spectator" } }));
await wait(300);
assert(watcher.inbox.some((m) => m.t === "error") && entries(watcher.inbox).length === 11, "a spectator cannot append");
a.ws.send(JSON.stringify({ t: "append", p: { k: "act", n: "watched" } }));
await wait(300);
assert(entries(watcher.inbox).pop()?.p.n === "watched", "a spectator receives new entries live");
assert(a.inbox.filter((m) => m.t === "presence").pop().watchers === 1, "players see how many spectators are watching");
const unknownWatch = await connect("ZZZZZ", null).then(() => "open", () => "refused");
assert(unknownWatch === "refused", "watching an unknown game is refused");
watcher.ws.close();
a.ws.close(); b3.ws.close();
const decks = await fetch(`${BASE}/decklists?side=corp&format=standard`, { headers: { Origin: "http://localhost:4178" } });
const deckBody = await decks.json();
assert(decks.status === 200 && Array.isArray(deckBody.items) && typeof deckBody.hasMore === "boolean", "the decklist index answers a format query");
const badDecks = await fetch(`${BASE}/decklists?side=nobody`, { headers: { Origin: "http://localhost:4178" } });
assert(badDecks.status === 400, "the decklist index refuses a bad query");
console.log("all protocol checks passed");

if (process.env.EXPIRY_TEST) {
  const g = await post("/games");
  const s = await connect(g.body.code, g.body.token);
  s.ws.send(JSON.stringify({ t: "append", p: { k: "act" } }));
  await wait(Number(process.env.EXPIRY_TEST));
  const late = await post(`/games/${g.body.code}/join`);
  assert(late.status === 404, "an inactive game is deleted by its alarm");
}

{
  const g = await post("/games");
  const j = await post(`/games/${g.body.code}/join`);
  const seatCheck = await fetch(`${BASE}/games/${g.body.code}/seat?token=${j.body.token}`, { headers: { Origin: "http://localhost:4178" } });
  assert(seatCheck.status === 200 && (await seatCheck.json()).seat === 1, "a seat token can be checked");
  const h = await connect(g.body.code, g.body.token);
  const guest = await connect(g.body.code, j.body.token);
  h.ws.send(JSON.stringify({ t: "append", p: { k: "act", n: 1 } }));
  await wait(300);
  const closed = new Promise((r) => (guest.ws.onclose = (e) => r(e.code)));
  const watcher = await connect(g.body.code, null);
  h.ws.send(JSON.stringify({ t: "release" }));
  assert((await closed) === 4002, "the host frees the guest seat and the old guest is disconnected (4002)");
  const gone = await fetch(`${BASE}/games/${g.body.code}/seat?token=${j.body.token}`, { headers: { Origin: "http://localhost:4178" } });
  assert(gone.status === 404, "the old guest token no longer works");
  await wait(200);
  assert(watcher.inbox.some((m) => m.t === "presence" && m.free?.[1] === true && m.free?.[0] === false), "spectators are told which seat is free");
  const newcomer = await post(`/games/${g.body.code}/join`);
  assert(newcomer.status === 200 && newcomer.body.seat === 1, "someone else can take the freed seat");
  const n = await connect(g.body.code, newcomer.body.token);
  await wait(400);
  assert(entries(n.inbox).length === 1, "the newcomer receives the game so far");
  const hostClosed = new Promise((r) => (h.ws.onclose = (e) => r(e.code)));
  n.ws.send(JSON.stringify({ t: "release" }));
  assert((await hostClosed) === 4002, "a guest can free the host's seat too");
  const takeover = await post(`/games/${g.body.code}/join`);
  assert(takeover.status === 200 && takeover.body.seat === 0, "the freed host seat can be taken");
  const full = await post(`/games/${g.body.code}/join`);
  assert(full.status === 409, "a game with both seats taken is full");
  n.ws.close(); watcher.ws.close();
  console.log("seat release checks passed");
}
