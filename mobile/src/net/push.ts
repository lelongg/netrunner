import { setSetting, settings } from "../settings";
import { listSaves } from "../session";
import { relayUrl, storedTicket } from "./relay";

export const pushSupported = () => typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof PushManager !== "undefined" && typeof Notification !== "undefined";

const keyBytes = (key: string) => Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((key.length + 3) % 4)), (c) => c.charCodeAt(0));

const sameKey = (a: ArrayBuffer | null, b: Uint8Array) => !!a && a.byteLength === b.length && new Uint8Array(a).every((x, i) => x === b[i]);

async function registration() {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
  if (!reg) throw new Error("Notifications need the installed app. Reload the page and try again.");
  return reg;
}

export async function currentSub(): Promise<PushSubscriptionJSON | null> {
  if (!settings.notifications || !pushSupported() || Notification.permission !== "granted") return null;
  try {
    const reg = await registration();
    return (await reg.pushManager.getSubscription())?.toJSON() ?? null;
  } catch {
    return null;
  }
}

async function shareWithGames(sub: PushSubscriptionJSON | null) {
  const relay = relayUrl();
  if (!relay) return;
  await Promise.all(
    listSaves()
      .filter((s) => s.v === 2 && s.transport === "relay" && !s.summary?.winner)
      .map((s) => storedTicket(s.code))
      .filter((t) => !!t)
      .map((t) =>
        fetch(`${relay}/games/${t!.code}/push`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t!.token, sub }) }).catch(() => {}),
      ),
  );
}

export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) return "This browser cannot show notifications. On iPhone, add Pocket Rig to your home screen first.";
  const relay = relayUrl();
  if (!relay) return "Notifications need the online relay.";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "Notifications are blocked for this site. Allow them in your browser settings, then try again.";
  try {
    const res = await fetch(`${relay}/push-key`);
    if (!res.ok) return "This relay does not send notifications yet.";
    const key = keyBytes(((await res.json()) as { key: string }).key);
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub.options.applicationServerKey, key)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    setSetting("notifications", true);
    await shareWithGames(sub.toJSON());
    return null;
  } catch (e) {
    return `Could not turn on notifications: ${e instanceof Error ? e.message : e}`;
  }
}

export async function disablePush() {
  setSetting("notifications", false);
  await shareWithGames(null);
  try {
    const reg = await registration();
    await (await reg.pushManager.getSubscription())?.unsubscribe();
  } catch {}
}
