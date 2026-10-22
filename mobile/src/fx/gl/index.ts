import { motionOff } from "../../settings";
import type { Board } from "./kit";
import { aim } from "./aim";

export type Kind = "play" | "install" | "rez" | "use";

export const FX: Record<Kind, Record<string, string>> = {
  play: {
    "Sure Gamble": "sureGamble",
    "Hedge Fund": "hedgeFund",
    Overclock: "overclock",
    "Creative Commission": "creativeCommission",
    "Petty Cash": "pettyCash",
    "Predictive Planogram": "predictivePlanogram",
    Jailbreak: "jailbreak",
    Ritual: "ritual",
    "Pinhole Threading": "pinholeThreading",
    "Mutual Favor": "mutualFavor",
    "Clean Getaway": "cleanGetaway",
    "Transfer of Wealth": "transferOfWealth",
    "Measured Response": "measuredResponse",
    "Key Performance Indicators": "keyPerformanceIndicators",
    "Seamless Launch": "seamlessLaunch",
    "Hansei Review": "hanseiReview",
    "Wildcat Strike": "wildcatStrike",
  },
  install: {
    "DZMZ Optimizer": "dzmzInstall",
    "Docklands Pass": "docklandsPass",
    "Daily Casts": "dailyCasts",
    "Telework Contract": "teleworkContract",
    Touchstone: "touchstone",
    Fermenter: "fermenterPose",
    "Rising Tide": "risingTidePose",
    Echelon: "echelonPose",
    Carmen: "carmenPose",
    Botulus: "botulusPose",
    Unity: "unityPose",
    Conduit: "conduitPose",
    Gourmand: "gourmandPose",
    Ping: "pingPose",
    Flyswatter: "flyswatterPose",
    "Event Horizon": "eventHorizonPose",
    Pharos: "pharosPose",
    Sleipnir: "sleipnirPose",
    Tocsin: "tocsinPose",
    "Semak-samun": "semakPose",
  },
  rez: {
    "Spin Doctor": "spinDoctor",
    Ping: "pingRez",
    Flyswatter: "flyswatter",
    "Event Horizon": "eventHorizon",
    Pharos: "pharos",
    Sleipnir: "sleipnir",
    Tocsin: "tocsin",
    "Semak-samun": "semakSamun",
    "Humanoid Resources": "humanoidResources",
    "Nihilo Agent": "nihiloAgent",
  },
  use: {
    Fermenter: "fermenter",
    "Rising Tide": "risingTide",
    Echelon: "echelon",
    Carmen: "carmen",
    Botulus: "botulus",
    Unity: "unity",
    Conduit: "conduit",
    Gourmand: "gourmand",
    Ping: "pingFire",
    Flyswatter: "flyswatterFire",
    "Event Horizon": "eventHorizonFire",
    Pharos: "pharosFire",
    Sleipnir: "sleipnirFire",
    Tocsin: "tocsinFire",
    "Semak-samun": "semakFire",
  },
};

let ok: boolean | undefined;
const hidden = new WeakMap<HTMLElement, number>();
const LIMIT = 6000;

function glOk() {
  if (ok === undefined) {
    try {
      ok = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      ok = false;
    }
  }
  return ok;
}

const rect = (sel: string) => {
  const r = document.querySelector(sel)?.getBoundingClientRect();
  return r && r.width > 0 ? r : null;
};

function boardFor(owner: string | undefined, self: Element | null | undefined): Board {
  const others = [...document.querySelectorAll(".playfield .tile[data-cid]")].filter((el) => el !== self && !self?.contains(el)).map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.bottom > 0 && r.top < innerHeight);
  const radius = self ? parseFloat(getComputedStyle(self).borderTopLeftRadius) || 0 : 0;
  const a = aim();
  const tile = (cid: string) => rect(`.playfield .tile[data-cid="${CSS.escape(cid)}"]`);
  const cid = (self as HTMLElement | null | undefined)?.dataset?.cid;
  const host = cid ? a.hostOf.get(cid) : undefined;
  return {
    credits: owner ? rect(`[data-anchor="${owner}-credits"]`) : null,
    hand: owner ? rect(`[data-anchor="${owner}-hand"]`) : null,
    others,
    radius,
    dim: !!self?.classList.contains("unrezzed"),
    track: self ? () => self.getBoundingClientRect() : undefined,
    advanced: a.advanced.map(tile).filter((r): r is DOMRect => !!r),
    gone: a.gone,
    host: host ? tile(host) : null,
    drained: a.corpLost > 0 ? rect('[data-anchor="corp-credits"]') : null,
    grip: a.gripLost > 0 ? rect('[data-anchor="runner-hand"]') : null,
    access: rect(".fx-showdown .fx-showcase"),
    runner: rect('[data-anchor="runner-panel"]'),
  };
}

export function glEffect(kind: Kind, title: string | undefined, at: DOMRect, code: string | undefined, hide?: HTMLElement | null, owner?: string): Promise<void> | null {
  const name = title ? FX[kind][title] : undefined;
  if (!name || !code || motionOff() || !glOk()) return null;
  const board = boardFor(owner, hide);
  let restore = () => {};
  const ready = () => {
    if (!hide) return;
    hidden.set(hide, (hidden.get(hide) ?? 0) + 1);
    hide.style.visibility = "hidden";
    restore = () => {
      restore = () => {};
      const n = (hidden.get(hide) ?? 1) - 1;
      if (n > 0) return void hidden.set(hide, n);
      hidden.delete(hide);
      hide.style.visibility = "";
    };
  };
  const play = import("./cards")
    .then((m) => (m as unknown as Record<string, (...a: unknown[]) => Promise<void>>)[name](at, code, ready, board))
    .catch(() => {
      ok = false;
    });
  return Promise.race([play, new Promise<void>((r) => setTimeout(r, (window as any).__fxManual ? 6e5 : LIMIT))]).finally(() => restore());
}

export function warmGl() {
  if (motionOff() || !glOk()) return;
  const go = () => import("./cards").then((m) => m.warm()).catch(() => (ok = false));
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}
