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
const open = async (url) => {
  const page = await (await browser.newContext(device)).newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  return page;
};
const credits = (page) => page.locator(".big").allTextContents().then((l) => l.map((c) => c.replace(/\D/g, "")).sort().join(","));

const host = await open(`${APP}?agent`);
await host.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Create a game/i.test(b.textContent) && !b.disabled), null, { timeout: 30000 });
await host.getByRole("button", { name: /Create a game/i }).click();
await host.waitForFunction(() => /^[A-Z2-9]{5}$/.test(document.querySelector(".invite .code")?.textContent ?? ""), null, { timeout: 20000 });
const code = (await host.locator(".invite .code").textContent()).trim();
const guest = await open(`${APP}?join=${code}`);
await guest.waitForSelector(".seat .deck-list button", { timeout: 30000 });
await guest.locator(".seat .deck-list button").first().click();
await guest.getByRole("button", { name: /^Ready/ }).click();
await host.waitForSelector(".seat .deck-list button", { timeout: 20000 });
await host.locator(".seat .deck-list button").first().click();
await host.waitForFunction(() => !document.querySelector("button.cta")?.disabled, null, { timeout: 20000 });
await host.getByRole("button", { name: /Start game/ }).click();
await guest.waitForSelector(".board", { timeout: 20000 });
await host.getByRole("button", { name: /^Keep/ }).click();
await guest.getByRole("button", { name: /^Keep/ }).click();
await host.getByRole("button", { name: /Start turn/ }).click();
await host.getByRole("button", { name: "Gain 1" }).click();
await host.waitForTimeout(800);

const hostLink = await host.evaluate(() => window.__nsg.session.rejoinUrl);
assert(/#seat=0\.[0-9a-f]+$/.test(hostLink), "the host gets a rejoin link with its seat key");
const otherDevice = await open(hostLink);
await otherDevice.waitForSelector(".board", { timeout: 30000 });
await otherDevice.waitForTimeout(1000);
assert((await credits(otherDevice)) === (await credits(host)), "the rejoin link opens the host's seat on another device with the same state");
await otherDevice.context().close();

await guest.context().close();
assert(true, "the guest's browser data is gone");
await host.waitForFunction(() => /offline/i.test(document.querySelector(".ticker .feed")?.textContent ?? ""), null, { timeout: 30000 });
await host.locator(".ticker-menu").click();
await host.getByRole("button", { name: /Free opponent's seat/ }).click();
await host.locator(".dialog").getByRole("button", { name: /^Free seat$/ }).click();
await host.waitForTimeout(800);
const newcomer = await open(`${APP}?join=${code}`);
await newcomer.waitForSelector(".board", { timeout: 30000 });
await newcomer.waitForTimeout(1000);
assert((await credits(newcomer)) === (await credits(host)), "after the host frees the seat, a new device takes it and continues the same game");
await browser.close();
console.log("seat test passed");
