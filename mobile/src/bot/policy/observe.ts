import type { Side } from "../../engine.ts";
import { currentIce, promptOf } from "../../game/actions.ts";
import { type Candidate, candidateActions } from "../../game/candidates.ts";
import { otherSide, remoteKeys, serverName } from "../../game/describe.ts";
import { profileOf } from "./profile.ts";
import type { CardInfo, DeckList, Lookup, Memory, Observation, RunRecord, ServerInfo } from "./types.ts";

const EMPTY_DECK: DeckList = { identity: "", cards: [] };

export function emptyMemory(): Memory {
  return { seen: new Map(), firstSeen: new Map(), installedAt: new Map(), opponentTitles: new Set(), duds: new Set(), runs: [], runsThisTurn: 0, turnKey: "", notes: {} };
}

function walkCards(x: any, zone: string, f: (card: any, zone: string) => void) {
  if (!x || typeof x !== "object") return;
  if (Array.isArray(x)) return x.forEach((c) => walkCards(c, zone, f));
  if (x.cid && (x.zone || x.type === "Identity")) {
    f(x, zone || (x.zone ?? []).join("/"));
    for (const h of x.hosted ?? []) walkCards(h, zone, f);
    return;
  }
  for (const [k, v] of Object.entries(x)) if (v && typeof v === "object" && k !== "log" && k !== "prompt-state" && k !== "basic-action-card") walkCards(v, k, f);
}

const serverLabel = (key: string) => (key === "rd" ? "R&D" : key === "hq" ? "HQ" : key === "archives" ? "Archives" : key.startsWith("remote") ? `Server ${key.slice(6)}` : key);

export function updateMemory(memory: Memory, view: any, side: Side) {
  const turn = Number(view.turn ?? 0);
  const turnKey = `${turn}:${view["active-player"]}`;
  if (turnKey !== memory.turnKey) {
    memory.turnKey = turnKey;
    memory.runsThisTurn = 0;
  }
  const opp = otherSide(side);
  const oppName = opp === "corp" ? "Corp" : "Runner";
  if (side === "corp") {
    const seen = (memory.notes.runsSeen ??= {}) as Record<string, number[]>;
    const lines: any[] = view.log ?? [];
    const start = Number(memory.notes.logSeen ?? 0);
    for (const e of lines.slice(start)) {
      const text = String(e?.text?.["raw-text"] ?? "");
      const m = text.match(/to make a run on (HQ|R&D|Archives|Server \d+)/);
      const effect = (e?.text?.["msg/effect-msgs"] ?? []).find((x: any) => x?.["effect/type"] === "make-a-run-on");
      const label = m ? m[1] : effect ? serverLabel(String(effect["effect/server"] ?? "")) : null;
      if (label) {
        (seen[label] ??= []).push(turn);
        memory.notes.lastRunServer = label;
      }
    }
    memory.notes.logSeen = lines.length;
    const runnerPoints = Number(view.runner?.["agenda-point"] ?? 0);
    if (runnerPoints > Number(memory.notes.runnerPoints ?? 0) && memory.notes.lastRunServer) ((memory.notes.stolenFrom ??= {}) as Record<string, number>)[String(memory.notes.lastRunServer)] = turn;
    memory.notes.runnerPoints = runnerPoints;
  }
  const INSTALLED = new Set(["servers", "rig", "onhost"]);
  walkCards(view[side], "", (card, zone) => {
    if (!memory.firstSeen.has(card.cid)) memory.firstSeen.set(card.cid, turn);
    if (INSTALLED.has(card.zone?.[0]) && !memory.installedAt.has(card.cid)) memory.installedAt.set(card.cid, turn);
  });
  walkCards(view[opp], "", (card, zone) => {
    if (!memory.firstSeen.has(card.cid)) memory.firstSeen.set(card.cid, turn);
    if (card.title && card.side === oppName && (card.rezzed || card.seen || zone === "discard" || zone === "scored" || opp === "runner")) {
      memory.opponentTitles.add(card.title);
      memory.seen.set(card.cid, { cid: card.cid, title: card.title, type: card.type, zone: (card.zone ?? []).join("/"), turn });
    }
  });
}

export function noteRun(memory: Memory, record: RunRecord) {
  memory.runs.push(record);
  if (memory.runs.length > 60) memory.runs.shift();
}

export function serversOf(view: any): ServerInfo[] {
  const servers = view.corp?.servers ?? {};
  return ["hq", "rd", "archives", ...remoteKeys(servers)].map((key) => ({
    key,
    label: serverName(key),
    ices: servers[key]?.ices ?? [],
    content: servers[key]?.content ?? [],
    remote: key.startsWith("remote"),
  }));
}

export function rigOf(view: any): any[] {
  const rig = view.runner?.rig ?? {};
  return [...(rig.program ?? []), ...(rig.hardware ?? []), ...(rig.resource ?? [])];
}

export function observe(view: any, side: Side, memory: Memory, lookup: Lookup, render: (msg: unknown) => string, random: () => number, deck: DeckList | null = null): Observation {
  const me = view[side] ?? {};
  const prompt = promptOf(view, side);
  const promptType = prompt?.["prompt-type"] ?? null;
  const info = (card: any): CardInfo => (card?.title && lookup(card.title)) || {};
  let promptText = "";
  try {
    promptText = prompt ? render(prompt.msg) : "";
  } catch {
    promptText = String(prompt?.msg ?? "");
  }
  return {
    view,
    side,
    me,
    opp: view[otherSide(side)] ?? {},
    turn: Number(view.turn ?? 0),
    active: view["active-player"],
    myTurn: view["active-player"] === side,
    clicks: Number(me.click ?? 0),
    credits: Number(me.credit ?? 0),
    hand: me.hand ?? [],
    prompt,
    promptType,
    promptText,
    run: view.run ?? null,
    encounter: view.encounters ?? null,
    currentIce: currentIce(view),
    servers: serversOf(view),
    rig: rigOf(view),
    candidates: candidateActions(view, side, render),
    memory,
    info,
    deck,
    profile: profileOf(deck ?? EMPTY_DECK, lookup),
    render,
    random,
  };
}

export const byCommand = (obs: Observation, command: string, test?: (c: Candidate) => boolean) => obs.candidates.filter((c) => c.command === command && (!test || test(c)));
export const installedThisTurn = (obs: Observation, card: any) => obs.myTurn && obs.memory.installedAt.get(card.cid) === obs.turn;
