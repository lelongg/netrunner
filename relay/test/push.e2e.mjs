import { createServer } from "node:http";
import { chromium } from "playwright-core";

const APP = process.env.APP ?? "http://localhost:4178/";
const BASE = process.env.RELAY ?? "http://127.0.0.1:8787";
const CHROMIUM = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } else console.log("ok:", m); };

if ((await fetch(BASE + "/push-key")).status === 404) { console.log("skip: push is not configured on this relay"); process.exit(0); }

const pushes = [];
const server = createServer((req, res) => { req.resume(); req.on("end", () => { pushes.push(Date.now()); res.writeHead(201).end(); }); }).listen(8799, "127.0.0.1");
const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const p256dh = Buffer.from(await crypto.subtle.exportKey("raw", ua.publicKey)).toString("base64url");
const sub = { endpoint: "http://127.0.0.1:8799/push/e2e", keys: { p256dh, auth: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url") } };

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
const device = { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true, serviceWorkers: "block" };
const errors = [];
const open = async (url) => { const page = await (await browser.newContext(device)).newPage(); page.on("pageerror", (e) => errors.push(e.message)); page.on("dialog", (d) => d.accept()); await page.goto(url); return page; };
const click = async (page, name) => { await page.getByRole("button", { name }).first().click(); await page.waitForTimeout(500); };

const host = await open(APP);
await host.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Create a game/i.test(b.textContent) && !b.disabled), null, { timeout: 30000 });
await host.getByRole("button", { name: /Create a game/i }).click();
await host.waitForFunction(() => /^[A-Z2-9]{5}$/.test(document.querySelector(".invite .code")?.textContent ?? ""), null, { timeout: 20000 });
const code = (await host.locator(".invite .code").textContent()).trim();
const guest = await open(`${APP}?join=${code}`);
await guest.waitForSelector(".seat .deck-list button", { timeout: 30000 });
await guest.locator(".seat .deck-list button").first().click();
await click(guest, /^Ready/);
await host.waitForSelector(".seat .deck-list button", { timeout: 20000 });
await host.locator(".seat .deck-list button").first().click();
await host.waitForFunction(() => !document.querySelector("button.cta")?.disabled, null, { timeout: 20000 });
await click(host, /Start game/);
await click(host, /^Keep/);
await click(guest, /^Keep/);
for (const p of [host, guest]) if (await p.getByRole("button", { name: /^Start turn/ }).count()) await click(p, /^Start turn/);
await host.waitForTimeout(800);
const [active, idle] = (await host.getByRole("button", { name: /^Gain 1/ }).count()) ? [host, guest] : [guest, host];

const token = await idle.evaluate((code) => JSON.parse(localStorage.getItem("nsg.seats"))[code].token, code);
const r = await fetch(`${BASE}/games/${code}/push`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:4178" }, body: JSON.stringify({ token, sub }) });
assert(r.status === 200, "the idle player is subscribed");

await click(active, /^Gain 1/);
await active.waitForTimeout(1500);
assert(pushes.length === 0, "no push while the idle player still has the game open");

await idle.goto("about:blank");
await active.waitForTimeout(800);
while (await active.getByRole("button", { name: /^Gain 1/ }).count()) await click(active, /^Gain 1/);
await active.waitForTimeout(1500);
assert(pushes.length === 0, "no push while the active player still owes the end of their turn");
await click(active, /^End turn/);
await active.waitForTimeout(1000);
for (let i = 0; i < 3 && !pushes.length; i++) {
  const tile = active.locator(".dock .hand .tile").first();
  if (!(await tile.count())) break;
  await tile.click();
  await active.waitForTimeout(400);
  const pick = active.locator(".sheet-actions button").filter({ hasText: /select|discard|choose/i }).first();
  if (await pick.count()) await pick.click();
  await active.waitForTimeout(400);
  for (const name of [/^Done/i, /^Close/i]) if (await active.getByRole("button", { name }).count()) await active.getByRole("button", { name }).first().click().catch(() => {});
  await active.waitForTimeout(800);
}
const t0 = Date.now();
while (!pushes.length && Date.now() - t0 < 8000) await active.waitForTimeout(200);
assert(pushes.length === 1, "ending the turn pushes a notification to the absent player");
assert(!errors.length, `no page errors ${errors.join(" | ")}`);
await browser.close();
server.close();
console.log("push e2e passed");
