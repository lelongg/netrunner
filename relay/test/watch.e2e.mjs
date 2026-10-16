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
const errors = [];
const open = async (url) => {
  const page = await (await browser.newContext(device)).newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  return page;
};
const click = async (page, name) => {
  await page.getByRole("button", { name }).first().click();
  await page.waitForTimeout(500);
};
const credits = async (page) => (await page.locator(".opp .big, .me-bar .big").allTextContents()).map((c) => c.replace(/\D/g, "")).sort();

const host = await open(APP);
await host.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Create a game/i.test(b.textContent) && !b.disabled), null, { timeout: 30000 });
await host.getByRole("button", { name: /Create a game/i }).click();
await host.waitForFunction(() => /^[A-Z2-9]{5}$/.test(document.querySelector(".invite .code")?.textContent ?? ""), null, { timeout: 20000 });
const code = (await host.locator(".invite .code").textContent()).trim();
assert(true, `host created game ${code}`);

const early = await open(`${APP}?watch=${code}`);
await early.waitForFunction(() => /Waiting for the players/.test(document.body.textContent), null, { timeout: 20000 });
assert(true, "a spectator who arrives before the start waits in a read-only lobby");

const guest = await open(`${APP}?join=${code}`);
await guest.waitForSelector(".seat .deck-list button", { timeout: 30000 });
await guest.locator(".seat .deck-list button").first().click();
await click(guest, /^Ready/);
await host.waitForSelector(".seat .deck-list button", { timeout: 20000 });
await host.locator(".seat .deck-list button").first().click();
await host.waitForFunction(() => !document.querySelector("button.cta")?.disabled, null, { timeout: 20000 });
await click(host, /Start game/);
await early.waitForSelector(".board", { timeout: 20000 });
assert(true, "the early spectator's board appears when the game starts");
await click(host, /^Keep/);
await click(guest, /^Keep/);

const late = await open(`${APP}?watch=${code}`);
await late.waitForSelector(".board", { timeout: 30000 });
await late.waitForTimeout(1500);
assert(JSON.stringify(await credits(late)) === JSON.stringify(await credits(host)), "a late spectator replays the game to the same state");
assert((await late.getByRole("button", { name: /^Gain 1/ }).count()) === 0 && (await late.locator(".actions.watching").count()) === 1, "the spectator has no actions");
assert((await late.locator(".dock .hand img").count()) === 0 && (await late.locator(".dock .hand .tile.back").count()) === 5, "the spectator sees the hand as card backs");

for (const p of [host, guest]) if (await p.getByRole("button", { name: /^Start turn/ }).count()) await click(p, /^Start turn/);
await host.waitForTimeout(800);
const active = (await host.getByRole("button", { name: /^Gain 1/ }).count()) ? host : guest;
const before = await late.locator(".log, .last-log").first().textContent();
await click(active, /^Gain 1/);
await late.waitForFunction((b) => document.querySelector(".last-log")?.textContent !== b, before, { timeout: 15000 });
await late.waitForTimeout(800);
assert(JSON.stringify(await credits(late)) === JSON.stringify(await credits(active)), "the spectator follows new moves live");

await host.waitForFunction(() => /2 watching/.test(document.querySelector(".ticker")?.textContent ?? ""), null, { timeout: 15000 });
assert(true, "players see how many people are watching");

await late.getByRole("button", { name: "Menu" }).click();
await late.waitForTimeout(300);
const before2 = await late.locator(".me-bar .who-runner, .me-bar .who-corp").first().getAttribute("class");
await late.getByRole("button", { name: /View from the/ }).click();
await late.waitForTimeout(800);
const after2 = await late.locator(".me-bar .who-runner, .me-bar .who-corp").first().getAttribute("class");
assert(before2 !== after2, "the spectator can switch which side is at the bottom");

const third = await open(`${APP}?join=${code}`);
await third.getByRole("button", { name: "Watch this game" }).waitFor({ timeout: 20000 });
await third.getByRole("button", { name: "Watch this game" }).click();
await third.waitForSelector(".board .actions.watching", { timeout: 30000 });
assert(true, "a third player who finds the game full is offered to watch it, and watches");

await guest.getByRole("button", { name: "Menu" }).click();
await guest.waitForTimeout(300);
await guest.getByRole("button", { name: "Watch instead" }).click();
await guest.waitForSelector(".board .actions.watching", { timeout: 30000 });
assert(true, "a player can switch to watching from the game menu");

assert(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
if (process.env.SHOT) await late.screenshot({ path: process.env.SHOT });
await browser.close();
console.log("watch test passed");
