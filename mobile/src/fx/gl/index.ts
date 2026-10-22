import { motionOff } from "../../settings";
import type { Board } from "./cards";

type Kind = "play" | "install" | "rez";

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
  },
  install: {
    "DZMZ Optimizer": "dzmzInstall",
    Fermenter: "fermenter",
    "Rising Tide": "risingTide",
    Echelon: "echelon",
    Carmen: "carmen",
    "Docklands Pass": "docklandsPass",
  },
  rez: {
    "Spin Doctor": "spinDoctor",
    Ping: "pingRez",
    Flyswatter: "flyswatter",
  },
};

let ok: boolean | undefined;

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
  return { credits: owner ? rect(`[data-anchor="${owner}-credits"]`) : null, hand: owner ? rect(`[data-anchor="${owner}-hand"]`) : null, others };
}

export function glEffect(kind: Kind, title: string | undefined, at: DOMRect, code: string | undefined, hide?: HTMLElement | null, owner?: string): Promise<void> | null {
  const name = title ? FX[kind][title] : undefined;
  if (!name || !code || motionOff() || !glOk()) return null;
  const board = boardFor(owner, hide);
  let restore = () => {};
  const ready = () => {
    if (!hide) return;
    const was = hide.style.visibility;
    hide.style.visibility = "hidden";
    restore = () => (hide.style.visibility = was);
  };
  return import("./cards")
    .then((m) => (m as unknown as Record<string, (...a: unknown[]) => Promise<void>>)[name](at, code, ready, board))
    .catch(() => {
      ok = false;
    })
    .finally(() => restore());
}

export function warmGl() {
  if (motionOff() || !glOk()) return;
  const go = () => import("./stage").then((m) => m.stage()).catch(() => (ok = false));
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}
