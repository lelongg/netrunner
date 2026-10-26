import { setSetting, settings } from "../settings";
import { listSaves } from "../session";
import { relayUrl, storedTicket } from "./relay";
import { t } from "../i18n";

export const pushSupported = () => typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof PushManager !== "undefined" && typeof Notification !== "undefined";

const keyBytes = (key: string) => Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((key.length + 3) % 4)), (c) => c.charCodeAt(0));

const sameKey = (a: ArrayBuffer | null, b: Uint8Array) => !!a && a.byteLength === b.length && new Uint8Array(a).every((x, i) => x === b[i]);

async function registration() {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
  if (!reg) throw new Error(t("Notifications need the installed app. Reload the page and try again."));
  return reg;
}

export type PushKind = "turn" | "match";

const KIND_SETTING = { turn: "notifyTurn", match: "notifyMatch" } as const;

export const notifying = (kind: PushKind) => settings.notifications && settings[KIND_SETTING[kind]];

export async function currentSub(kind: PushKind): Promise<PushSubscriptionJSON | null> {
  if (!notifying(kind) || !pushSupported() || Notification.permission !== "granted") return null;
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

export async function enablePush(kind?: PushKind): Promise<string | null> {
  if (!pushSupported()) return t("This browser cannot show notifications. On iPhone, add Pocket Rig to your home screen first.");
  const relay = relayUrl();
  if (!relay) return t("Notifications need the online relay.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return t("Notifications are blocked for this site. Allow them in your browser settings, then try again.");
  try {
    const res = await fetch(`${relay}/push-key`);
    if (!res.ok) return t("This relay does not send notifications yet.");
    const key = keyBytes(((await res.json()) as { key: string }).key);
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub.options.applicationServerKey, key)) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    if (kind) setSetting(KIND_SETTING[kind], true);
    setSetting("notifications", true);
    await shareWithGames(settings.notifyTurn ? sub.toJSON() : null);
    return null;
  } catch (e) {
    return t("Could not turn on notifications: {error}", { error: e instanceof Error ? e.message : String(e) });
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

export async function setNotify(kind: PushKind, on: boolean): Promise<string | null> {
  if (on && !settings.notifications) return enablePush(kind);
  setSetting(KIND_SETTING[kind], on);
  if (!settings.notifyTurn && !settings.notifyMatch) {
    await disablePush();
    return null;
  }
  if (kind === "turn") await shareWithGames(await currentSub("turn"));
  return null;
}
