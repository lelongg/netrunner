import { evaluate } from "./evaluate.ts";
import { agendaProgress, coverage, isIcebreaker, rezCostOf } from "./tactics.ts";
import { stealOdds, threat } from "./threat.ts";
import { CORE_DECKS } from "./decks/core.ts";
import type { Observation } from "./types.ts";

export function deckKeys(obs: Observation): string[] {
  const titles = [obs.me.identity?.title, obs.opp.identity?.title].filter(Boolean);
  return CORE_DECKS.filter((d) => titles.includes(d.identity)).map((d) => d.key);
}

export const FEATURES = [
  "turn",
  "credits",
  "runnerCredits",
  "creditLead",
  "points",
  "runnerPoints",
  "pointsToWin",
  "runnerPointsToWin",
  "hand",
  "agendasInHand",
  "agendaPointsInHand",
  "deck",
  "rdDensity",
  "hqIce",
  "hqUnrezzed",
  "rdIce",
  "rdUnrezzed",
  "remotes",
  "remoteIce",
  "remoteUnrezzed",
  "remoteAgendaPoints",
  "remoteProgress",
  "rezDebt",
  "unfunded",
  "oddsHQ",
  "oddsRD",
  "oddsRemote",
  "threatLoss",
  "threatGain",
  "staticValue",
  "runnerHand",
  "runnerTags",
  "runnerBreakers",
  "runnerCoverage",
  "runnerRig",
  "badPub",
  "economyAssets",
  "archivesAgendas",
] as const;

export type Features = Record<(typeof FEATURES)[number], number>;

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : Number(x) || 0);

export function positionFeatures(obs: Observation): Features {
  const corp = obs.side === "corp";
  const me = obs.me ?? {};
  const runner = obs.view.runner ?? {};
  const hq = obs.servers.find((s) => s.key === "hq")!;
  const rd = obs.servers.find((s) => s.key === "rd")!;
  const remotes = obs.servers.filter((s) => s.remote);
  const scoring = [...remotes].sort((a, b) => b.ices.length - a.ices.length)[0];
  const agendasInHand = obs.hand.filter((c) => c.type === "Agenda");
  const remoteAgendas = remotes.flatMap((s) => s.content.filter((c: any) => c.type === "Agenda"));
  const rezDebt = obs.servers.flatMap((s) => s.ices).filter((i: any) => !i.rezzed).reduce((n: number, i: any) => n + rezCostOf(i), 0);
  const deckAgendas = (obs.deck?.cards ?? []).reduce((n, c) => n + ((obs.info({ title: c.title }) as any).type === "Agenda" ? c.qty : 0), 0);
  const gone = [...(me.scored ?? []), ...(runner.scored ?? []), ...(me.discard ?? []), ...obs.hand, ...remoteAgendas].filter((c: any) => c.type === "Agenda").length;
  const rig = ["program", "hardware", "resource"].flatMap((z) => runner.rig?.[z] ?? []);
  const t = corp ? threat(obs) : { loss: 0, gain: 0 };
  const odds = (s: typeof hq | undefined) => (corp && s ? stealOdds(obs, s) : 0);
  const progress = remoteAgendas.map((a: any) => {
    const { have, need } = agendaProgress(a);
    return need > 0 ? have / need : 0;
  });
  return {
    turn: obs.turn,
    credits: obs.credits,
    runnerCredits: num(runner.credit),
    creditLead: obs.credits - num(runner.credit),
    points: num(me["agenda-point"]),
    runnerPoints: num(runner["agenda-point"]),
    pointsToWin: Math.max(0, num(me["agenda-point-req"] ?? 7) - num(me["agenda-point"])),
    runnerPointsToWin: Math.max(0, num(runner["agenda-point-req"] ?? 7) - num(runner["agenda-point"])),
    hand: obs.hand.length,
    agendasInHand: agendasInHand.length,
    agendaPointsInHand: agendasInHand.reduce((n, c) => n + num(c.agendapoints), 0),
    deck: num(me["deck-count"]),
    rdDensity: Math.max(0, deckAgendas - gone) / Math.max(1, num(me["deck-count"])),
    hqIce: hq.ices.length,
    hqUnrezzed: hq.ices.filter((i: any) => !i.rezzed).length,
    rdIce: rd.ices.length,
    rdUnrezzed: rd.ices.filter((i: any) => !i.rezzed).length,
    remotes: remotes.length,
    remoteIce: scoring?.ices.length ?? 0,
    remoteUnrezzed: scoring?.ices.filter((i: any) => !i.rezzed).length ?? 0,
    remoteAgendaPoints: remoteAgendas.reduce((n: number, c: any) => n + num(c.agendapoints), 0),
    remoteProgress: progress.length ? Math.max(...progress) : 0,
    rezDebt,
    unfunded: Math.max(0, rezDebt - obs.credits),
    oddsHQ: odds(hq),
    oddsRD: odds(rd),
    oddsRemote: remoteAgendas.length ? Math.max(...remotes.filter((s) => s.content.some((c: any) => c.type === "Agenda")).map((s) => odds(s))) : 0,
    threatLoss: t.loss,
    threatGain: t.gain,
    staticValue: evaluate(obs.view, obs.side),
    runnerHand: num(runner["hand-count"] ?? runner.hand?.length),
    runnerTags: num(runner.tag?.total ?? runner.tag?.base),
    runnerBreakers: rig.filter((c: any) => isIcebreaker(c)).length,
    runnerCoverage: coverage(obs).size,
    runnerRig: rig.length,
    badPub: num(me["bad-publicity"]?.base ?? me["bad-publicity"]),
    economyAssets: remotes.flatMap((s) => s.content).filter((c: any) => c.rezzed && c.type === "Asset").length,
    archivesAgendas: (me.discard ?? []).filter((c: any) => c.type === "Agenda").length,
  };
}

export interface Weights {
  features: string[];
  mean: number[];
  scale: number[];
  weights: number[];
  bias: number;
}

export function winProbability(features: Features, w: Weights, decks: string[] = []): number {
  let z = w.bias;
  for (let i = 0; i < w.features.length; i++) {
    const f = w.features[i];
    const x = f.startsWith("deck:") ? (decks.includes(f.slice(5)) ? 1 : 0) : num((features as any)[f]);
    z += ((x - w.mean[i]) / (w.scale[i] || 1)) * w.weights[i];
  }
  return 1 / (1 + Math.exp(-z));
}
