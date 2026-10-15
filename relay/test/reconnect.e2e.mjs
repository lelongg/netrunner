import { chromium } from "playwright-core";

const APP = process.env.APP ?? "http://localhost:4178/";
const CHROMIUM = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium";

const assert = (c, m) => {
  if (!c) {
    console.error("FAIL:", m);
    process.exit(1);
  }
  console.log("ok:", m);
};

const browser = await chromium.launch({ executablePath: CHROMIUM, headless: false, args: ["--no-sandbox", "--headless=new"] });
const device = { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true, serviceWorkers: "block" };
const hostCtx = await browser.newContext(device);
const guestCtx = await browser.newContext(device);
const errors = [];
const open = async (ctx, url) => {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  return page;
};
const click = async (page, name) => {
  await page.getByRole("button", { name }).first().click();
  await page.waitForTimeout(500);
};
const publicState = async (page) => {
  await page.locator(".last-log").click();
  const log = await page.locator(".log p").allTextContents();
  await page.locator(".sheet-backdrop").click({ position: { x: 5, y: 5 } });
  const credits = await page.locator(".big").allTextContents();
  return { log, credits: credits.map((c) => c.replace(/\D/g, "")).sort() };
};

const host = await open(hostCtx, APP);
await host.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Host a game/i.test(b.textContent) && !b.disabled), null, { timeout: 30000 });
await host.getByRole("button", { name: /Host a game/i }).click();
await host.waitForFunction(() => /^[A-Z2-9]{5}$/.test(document.querySelector(".invite .code")?.textContent ?? ""), null, { timeout: 20000 });
const code = (await host.locator(".invite .code").textContent()).trim();
assert(true, `host created game ${code}`);

let guest = await open(guestCtx, `${APP}?join=${code}`);
await guest.waitForSelector(".seat .deck-list button", { timeout: 30000 });
await guest.locator(".seat .deck-list button").first().click();
await click(guest, /^Ready/);
await host.waitForSelector(".seat .deck-list button", { timeout: 20000 });
await host.locator(".seat .deck-list button").first().click();
await host.waitForFunction(() => !document.querySelector("button.cta")?.disabled, null, { timeout: 20000 });
await click(host, /Start game/);
await host.waitForSelector(".board", { timeout: 20000 });
await guest.waitForSelector(".board", { timeout: 20000 });
assert(true, "game started on both phones");

await click(host, /^Keep/);
await click(guest, /^Keep/);
await click(host, /Start turn/);
await click(host, "Gain credit");
await click(host, "Gain credit");
await guest.waitForTimeout(800);

await guest.close();
assert(true, "guest closed the app mid-game");
await click(host, "Gain credit");
await click(host, /End turn/);
if (await host.locator(".board.selecting").count()) {
  await host.locator(".dock .hand .tile").first().click();
  await host.waitForTimeout(500);
}
await host.waitForFunction(() => /offline/i.test(document.querySelector(".ticker .feed")?.textContent ?? ""), null, { timeout: 20000 });
assert(true, "host kept playing while the guest was away and sees them offline");

const hostBefore = await publicState(host);
guest = await open(guestCtx, APP);
await guest.waitForSelector(".board", { timeout: 30000 });
await guest.waitForFunction(() => /Start turn/.test(document.body.textContent), null, { timeout: 30000 });
const guestAfter = await publicState(guest);
assert(JSON.stringify(guestAfter.log) === JSON.stringify(hostBefore.log), `guest resumed with the same ${guestAfter.log.length} log lines as the host`);
assert(JSON.stringify(guestAfter.credits) === JSON.stringify(hostBefore.credits), `same credits on both sides (${guestAfter.credits.join(", ")})`);

await click(guest, /Start turn/);
await click(guest, "Gain credit");
await host.waitForTimeout(1500);
const hostFinal = await publicState(host);
const guestFinal = await publicState(guest);
assert(JSON.stringify(hostFinal) === JSON.stringify(guestFinal), "after the guest plays again, both phones show identical state");

await host.reload();
await host.waitForSelector(".board", { timeout: 30000 });
await host.waitForTimeout(1500);
assert(JSON.stringify(await publicState(host)) === JSON.stringify(guestFinal), "host reload rebuilds the same state");

if (process.env.P2P) {
  assert(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
  await browser.close();
  console.log("reconnect test passed (peer-to-peer: the host must stay online, so the host-away step is skipped)");
  process.exit(0);
}
await host.close();
assert(true, "host closed the app");
await click(guest, "Gain credit");
await click(guest, "Draw");
await guest.waitForTimeout(800);
const guestSolo = await publicState(guest);
const host2 = await open(hostCtx, APP);
await host2.waitForSelector(".board", { timeout: 30000 });
await host2.waitForTimeout(1500);
assert(JSON.stringify(await publicState(host2)) === JSON.stringify(guestSolo), "the guest played while the host was away; the host comes back to the same state");

assert(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log("reconnect test passed");
