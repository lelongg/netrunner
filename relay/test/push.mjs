import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const { subtle } = globalThis.crypto;

const BASE = process.env.RELAY ?? "http://127.0.0.1:8787";
const WS = BASE.replace(/^http/, "ws");
const ORIGIN = { Origin: "http://localhost:4178" };
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } else console.log("ok:", m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b64url = (b) => Buffer.from(b).toString("base64url");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64url"));
const post = async (path, body) => { const r = await fetch(BASE + path, { method: "POST", headers: { ...ORIGIN, "Content-Type": "application/json" }, body: body && JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
const connect = (code, tok) => new Promise((res, rej) => { const ws = new WebSocket(`${WS}/games/${code}/ws?token=${tok}&since=0`, { headers: ORIGIN }); ws.onopen = () => res(ws); ws.onerror = rej; });

const keyRes = await fetch(BASE + "/push-key", { headers: ORIGIN });
if (keyRes.status === 404) { console.log("skip: push is not configured on this relay"); process.exit(0); }
const { key } = await keyRes.json();
assert(unb64(key).length === 65, "relay publishes its VAPID public key");

const ua = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const uaPublic = new Uint8Array(await subtle.exportKey("raw", ua.publicKey));
const auth = crypto.getRandomValues(new Uint8Array(16));
const received = [];
const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => { received.push({ headers: req.headers, body: new Uint8Array(Buffer.concat(chunks)) }); res.writeHead(201).end(); });
}).listen(8799, "127.0.0.1");
const sub = { endpoint: "http://127.0.0.1:8799/push/abc", keys: { p256dh: b64url(uaPublic), auth: b64url(auth) } };

const hmac = async (k, d) => new Uint8Array(await subtle.sign("HMAC", await subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), d));
const cat = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let a = 0; for (const x of p) { o.set(x, a); a += x.length; } return o; };
const te = new TextEncoder();
async function decrypt(body) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const sealed = body.slice(21 + idlen);
  const peer = await subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: peer }, ua.privateKey, 256));
  const ikm = await hmac(await hmac(auth, shared), cat(te.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const plain = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: nonce }, await subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]), sealed));
  assert(plain[plain.length - 1] === 2, "payload ends with the last-record delimiter");
  return JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
}
async function verifyVapid(header) {
  const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert(k === key, "VAPID header carries the relay key");
  const [h, c, s] = jwt.split(".");
  const pub = await subtle.importKey("raw", unb64(k), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, unb64(s), te.encode(`${h}.${c}`)), "VAPID JWT signature verifies");
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  assert(claims.aud === "http://127.0.0.1:8799" && claims.exp > Date.now() / 1000, "VAPID claims name the push service and expire later");
}

const created = await post("/games");
const { code } = created.body;
const joined = await post(`/games/${code}/join`);
assert((await post(`/games/${code}/push`, { token: "nope", sub })).status === 404, "subscribing needs a seat token");
assert((await post(`/games/${code}/push`, { token: joined.body.token, sub: { endpoint: "ftp://x", keys: {} } })).status === 400, "invalid subscriptions are refused");
assert((await post(`/games/${code}/push`, { token: joined.body.token, sub })).status === 200, "guest subscribes over HTTP");

const host = await connect(code, created.body.token);
const guest = await connect(code, joined.body.token);
guest.send(JSON.stringify({ t: "focus", on: true }));
await wait(200);
host.send(JSON.stringify({ t: "nudge", text: "Your move against Host" }));
await wait(800);
assert(received.length === 0, "no push while the guest has the game in front of them");

guest.send(JSON.stringify({ t: "focus", on: false }));
await wait(200);
host.send(JSON.stringify({ t: "nudge", text: "Your move against Host" }));
await wait(1500);
assert(received.length === 1, "push sent once the guest looks away");
const got = received[0];
assert(got.headers["content-encoding"] === "aes128gcm" && Number(got.headers.ttl) > 0, "push uses aes128gcm with a TTL");
await verifyVapid(got.headers.authorization);
const payload = await decrypt(got.body);
assert(payload.code === code && payload.body === "Your move against Host", "payload names the game and the message");

host.send(JSON.stringify({ t: "nudge", text: "again" }));
await wait(800);
assert(received.length === 1, "pushes to the same seat are spaced out");

guest.close();
await wait(300);
{
  const g = await connect(code, joined.body.token);
  g.send(JSON.stringify({ t: "subscribe", sub: null }));
  await wait(200);
  g.close();
}
host.close();
server.close();
console.log("push test passed");
