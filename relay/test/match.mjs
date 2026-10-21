const BASE = process.env.RELAY ?? "http://127.0.0.1:8787";
const ORIGIN = { Origin: "http://localhost:4178", "Content-Type": "application/json" };
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } else console.log("ok:", m); };
const post = async (path, body) => (await fetch(`${BASE}${path}`, { method: "POST", headers: ORIGIN, body: JSON.stringify(body) })).json();
const get = async (path) => (await fetch(`${BASE}${path}`, { headers: ORIGIN })).json();

const a = await post("/match", { name: "Alice", format: "startup", side: "corp" });
assert(a.status === "waiting" && /^[0-9a-f]{16}$/.test(a.id), "a lone seek waits");
assert((await get("/match/open")).open.some((o) => o.id === a.id && o.name === "Alice" && !("secret" in o)), "it is listed without its secret");
assert((await get(`/match/${a.id}?secret=nope`)).status === "expired", "a wrong secret reveals nothing");

const b = await post("/match", { name: "Bob", format: "startup", side: "runner" });
assert(b.status === "matched" && b.side === "runner" && b.seat === 1 && b.opponent === "Alice", "a compatible seek is paired at once");
const as = await get(`/match/${a.id}?secret=${a.secret}`);
assert(as.status === "matched" && as.code === b.code && as.side === "corp" && as.seat === 0 && as.opponent === "Bob", "the waiting player learns its seat and side");
const seat = await get(`/games/${b.code}/seat?token=${as.token}`);
assert(seat.seat === 0, "the host token holds seat 0 of the new game");
assert(!(await get("/match/open")).open.some((o) => o.id === a.id), "a paired seek leaves the list");

const c = await post("/match", { name: "Carol", format: "core", side: "corp" });
const d = await post("/match", { name: "Dan", format: "standard", side: "runner" });
assert(c.status === "waiting" && d.status === "waiting", "different formats do not pair");
const e = await post("/match", { name: "Eve", format: "core", side: "corp" });
assert(e.status === "waiting", "two Corp seekers do not pair");
const f = await post(`/match/${c.id}/accept`, { name: "Frank" });
assert(f.status === "matched" && f.side === "runner" && f.opponent === "Carol", "accepting a listed seek takes the other side");
const again = await fetch(`${BASE}/match/${c.id}/accept`, { method: "POST", headers: ORIGIN, body: JSON.stringify({ name: "Gina" }) });
assert(again.status === 409, "a seek can only be taken once");
await post(`/match/${d.id}/cancel`, { secret: d.secret });
assert((await get(`/match/${d.id}?secret=${d.secret}`)).status === "expired", "a cancelled seek is gone");
await post(`/match/${e.id}/cancel`, { secret: e.secret });
assert((await fetch(`${BASE}/match`, { method: "POST", headers: ORIGIN, body: JSON.stringify({ name: "X", format: "nope", side: "corp" }) })).status === 400, "unknown formats are refused");
console.log("matchmaking checks passed");
