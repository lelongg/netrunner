import { byCommand, installedThisTurn } from "../observe.ts";
import { cardAction, playOf, proposal } from "../generic.ts";
import { choiceMove, choices, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { registerPolicy } from "../registry.ts";
import { corpRun, fromCandidate } from "../runs.ts";
import { agendaProgress, coverage, iceThreat, rezCostOf, serverSafety } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE } from "./gateway.ts";

const isEconomyCard = (obs: Observation, c: any) => obs.profile.economy.has(c.title);
const iceRank = (obs: Observation, c: any) => {
  const threat = iceThreat({ ...c, subroutines: [] }, obs.info(c));
  return Number((obs.info(c) as any).strength ?? 0) + rezCostOf(c) * 0.5 + (threat.etr ? 2 : 0) + threat.damage;
};

const remotes = (obs: Observation) => obs.servers.filter((s) => s.remote);
const scoringRemote = (obs: Observation) => remotes(obs).find((s) => s.content.some((c) => c.type === "Agenda"));
const agendaIn = (obs: Observation) => remotes(obs).flatMap((s) => s.content.filter((c) => c.type === "Agenda").map((c) => ({ server: s, card: c })))[0];
const inHand = (obs: Observation, title: string) => obs.hand.find((c) => c.title === title);
const runnerBreaks = (obs: Observation, ice: any) => {
  const cov = coverage(obs);
  const types = (ice.subtypes ?? []).filter((t: string) => ["Barrier", "Code Gate", "Sentry"].includes(t));
  return types.some((t: string) => cov.has(t as any));
};

function scoringCost(card: any) {
  const { have, need } = agendaProgress(card);
  return Math.max(0, need - have);
}

function canScoreNextTurn(obs: Observation, card: any, seamless: boolean) {
  const left = scoringCost(card);
  const clicks = seamless ? 1 + Math.max(0, left - 2) : left;
  const credits = seamless ? 1 + Math.max(0, left - 2) : left;
  return clicks <= 3 && credits <= obs.credits;
}

function plan(obs: Observation, current: Plan | null): Plan {
  const keep = (kind: string, goal: string, detail?: Record<string, unknown>) => (current?.kind === kind ? { ...current, detail: { ...current.detail, ...detail } } : { kind, goal, since: obs.turn, detail });
  const runnerPoints = Number(obs.opp["agenda-point"] ?? 0);
  const need = Number(obs.opp["agenda-point-req"] ?? 7);
  const installed = agendaIn(obs);
  if (installed) return keep("score", `score ${installed.card.title} in ${installed.server.label} before the Runner gets in`, { agenda: installed.card.cid });
  const protectedRemote = remotes(obs).find((s) => s.ices.length > 0 && !s.content.length);
  const safeRemote = remotes(obs).find((s) => s.ices.length > 0 && !s.content.length && serverSafety(obs, s).safe);
  const agendas = obs.hand.filter((c) => c.type === "Agenda");
  if (runnerPoints >= need - 2 && obs.servers.some((s) => !s.remote && !s.ices.length)) return keep("defend", "the Runner is close to winning: close the open centrals first");
  if (obs.credits < 5 && !obs.hand.some((c) => isEconomyCard(obs, c) && Number(c.cost ?? 0) <= obs.credits)) return keep("economy", "poor and without a cheap economy card: install assets and click for credits");
  if (agendas.length && safeRemote && obs.credits >= 3) return keep("window", `install ${agendas[0].title} in ${safeRemote.label}: the Runner cannot get in cheaply`);
  if (agendas.length && protectedRemote) return keep("fortify", `${protectedRemote.label} is not safe enough for ${agendas[0].title}: add ice or credits`);
  if (!protectedRemote) return keep("fortify", "build an iced remote and ice the centrals");
  return keep("develop", "grow the economy and the ice while waiting for an agenda");
}

function mulligan(obs: Observation) {
  const ice = obs.hand.filter((c) => c.type === "ICE").length;
  const econ = obs.hand.filter((c) => isEconomyCard(obs, c)).length;
  const agendas = obs.hand.filter((c) => c.type === "Agenda").length;
  if (ice === 0) return { keep: false, why: "no ice: every server would be open" };
  if (agendas >= 3) return { keep: false, why: "three agendas in hand is too many to protect" };
  if (ice >= 1 && (econ >= 1 || ice >= 2)) return { keep: true, why: `${ice} ice and ${econ} economy cards` };
  return { keep: false, why: "one ice and no economy" };
}

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = [...base];
  const push = (p: Proposal | null) => p && out.push(p);
  const seamless = inHand(obs, "Seamless Launch");
  const installed = agendaIn(obs);
  const scoring = scoringRemote(obs);

  if (installed && seamless && !installedThisTurn(obs, installed.card) && obs.credits >= 1 && scoringCost(installed.card) >= 2) {
    push(proposal(playOf(obs, seamless), 95, `Seamless Launch: two advancements on ${installed.card.title}`, "fast-advance"));
  }
  for (const p of out) {
    if (p.kind === "advance" && installed && p.why.includes(installed.card.title)) {
      const { have, need } = agendaProgress(installed.card);
      const finishable = have + obs.clicks + (seamless && !installedThisTurn(obs, installed.card) ? 1 : 0) >= need;
      if (finishable) p.score = Math.max(p.score, 88);
      else if (installed.server.ices.length === 0) p.score = Math.min(p.score, 20);
    }
    if (p.kind === "install-agenda") {
      const card = obs.hand.find((c) => c.type === "Agenda" && p.why.includes(c.title));
      const target = remotes(obs).find((s) => p.why.endsWith(s.label) || p.why.includes(`in ${s.label}`));
      const safety = target ? serverSafety(obs, target) : null;
      const agendasInHand = obs.hand.filter((c) => c.type === "Agenda").length;
      const racing = Number(obs.me["deck-count"] ?? 0) < 12 || agendasInHand >= 2 || obs.hand.length >= 5;
      const points = Number(card?.agendapoints ?? 0);
      if (safety && !safety.safe) {
        const canRezOne = target!.ices.some((i) => i.rezzed || rezCostOf(i) <= obs.credits - 1);
        const hq = obs.servers.find((s) => s.key === "hq")!;
        const hqSafer = serverSafety(obs, hq).margin > safety.margin + 2 && obs.hand.length < 5 && agendasInHand <= 1;
        const runnerCredits = Number(obs.opp.credit ?? 0);
        const deep = target!.ices.length >= 2;
        const margins = deep ? [-4, -8, 6] : [-1, -4, 3];
        const contestable = target!.ices.length >= 1 && canRezOne && obs.credits >= 3 && !hqSafer && plan.kind !== "economy" && (safety.margin >= margins[0] || (racing && runnerCredits <= margins[2] && safety.margin >= margins[1]));
        const rich = obs.credits >= Math.max(15, safety.rezCost + 6);
        const fortress = target!.ices.length >= 3 || (target!.ices.length >= 2 && target!.content.some((c: any) => c.type === "Upgrade"));
        const desperate = Number(obs.me["deck-count"] ?? 99) < 10 && target!.ices.length >= 1 && canRezOne;
        const taxRace = !contestable && ((rich && fortress) || desperate);
        p.score = contestable ? Math.min(p.score, racing ? 58 : 48) - (points >= 3 ? 10 : 0) : taxRace ? Math.min(p.score, 55) - (points >= 3 ? 8 : 0) : Math.min(p.score, 15);
        p.why += ` (the Runner can get in: margin ${safety.margin}${racing ? ", racing" : ""}${taxRace ? (desperate ? ", R&D is running out" : ", rich enough to make every run expensive") : ""}${canRezOne ? "" : ", no ice can be rezzed"}${hqSafer ? ", HQ is safer" : ""})`;
      } else if (card && target && safety?.safe && obs.clicks < 3 && canScoreNextTurn(obs, card, !!seamless)) p.score = Math.max(p.score, 72);
      if (obs.clicks === 3) p.score = Math.min(p.score, 50);
    }
  }

  const agendasStuck = obs.hand.some((c) => c.type === "Agenda") && !out.some((p) => p.kind === "install-agenda" && p.score > 20);
  const idle = !out.some((p) => p.kind !== "credit" && p.kind !== "draw" && p.score > 32);
  if (agendasStuck && idle && obs.credits >= 6 && (obs.hand.length <= 4 || (obs.credits >= 10 && obs.hand.length <= 6)) && Number(obs.me["deck-count"] ?? 0) > 8) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, obs.hand.length <= 4 ? 45 : 40, "draw: agendas wait in HQ and nothing in hand builds a remote for them", "draw"));
  }

  const urtica = inHand(obs, "Urtica Cipher");
  const bait = remotes(obs).find((s) => s.ices.length > 0 && !s.content.length);
  if (urtica && obs.credits >= 2 && remotes(obs).length <= 3) push(proposal(playOf(obs, urtica, "New remote"), obs.turn <= 3 ? 50 : 40, `install Urtica Cipher in a new remote as a bait`, "install-trap"));
  for (const s of remotes(obs)) {
    for (const card of s.content) {
      if (card.title !== "Urtica Cipher" || obs.credits < 3 || obs.hand.some((c) => c.type === "Agenda")) continue;
      if (agendaProgress(card).have < 2 && s.ices.length > 0 && obs.credits >= 6) push(proposal(cardAction(obs, card, "advance"), 36, "advance Urtica Cipher so it looks like an agenda", "bluff"));
    }
  }

  const skunk = inHand(obs, "Manegarm Skunkworks");
  if (skunk && (scoring ?? bait) && obs.credits >= 4) push(proposal(playOf(obs, skunk, (scoring ?? bait)!.label), 46, `Manegarm Skunkworks in ${(scoring ?? bait)!.label}: the Runner pays 2 clicks or 5 credits to get in`, "install-upgrade"));

  for (const s of remotes(obs)) {
    for (const card of s.content) {
      if (card.title === "Regolith Mining License" && card.rezzed) push(proposal(cardAction(obs, card, "ability", /take 3/i), obs.credits < 8 ? 57 : obs.credits < 15 ? 44 : 31, "Regolith Mining License: take 3 credits", "click-economy"));
    }
  }
  const hub = inHand(obs, "Superconducting Hub");
  const office = inHand(obs, "Offworld Office");
  const baitSafe = bait ? serverSafety(obs, bait).safe : false;
  if (hub && bait && baitSafe && obs.clicks >= 1 && obs.credits >= 2 && !installed) push(proposal(playOf(obs, hub, bait.label), 66, `Superconducting Hub in ${bait.label} only needs 3 advancements: cheap to score next turn`, "install-agenda"));
  if (office && bait && baitSafe && obs.credits >= 3 && !installed && obs.clicks <= 2) push(proposal(playOf(obs, office, bait.label), 71, `Offworld Office in ${bait.label} pays 7 when scored: install late in the turn`, "install-agenda"));
  const hqServer = obs.servers.find((s) => s.key === "hq")!;
  const agendasHeld = obs.hand.filter((c) => c.type === "Agenda").length;
  if (agendasHeld >= 1 && hqServer.ices.length < 3 && !serverSafety(obs, hqServer).safe) {
    const ice = obs.hand.filter((c) => c.type === "ICE").sort((a, b) => iceRank(obs, b) - iceRank(obs, a))[0];
    const budget = obs.credits - hqServer.ices.length;
    if (ice && budget >= rezCostOf(ice) + 2) push(proposal(playOf(obs, ice, "HQ"), agendasHeld >= 2 ? 72 : 63, `add ${ice.title} to HQ: ${agendasHeld} agenda${agendasHeld > 1 ? "s" : ""} in hand and the Runner can get in`, "install-ice"));
  }
  const weak = installed?.server ?? (obs.hand.some((c) => c.type === "Agenda") ? bait : undefined);
  if (weak && !serverSafety(obs, weak).safe && weak.ices.length < 3) {
    const ice = obs.hand.filter((c) => c.type === "ICE").sort((a, b) => iceRank(obs, b) - iceRank(obs, a))[0];
    const budget = obs.credits - weak.ices.length;
    if (ice && budget >= rezCostOf(ice) + 2) push(proposal(playOf(obs, ice, weak.label), installed ? 74 : obs.credits >= 12 ? 70 : 64, `add ${ice.title} to ${weak.label}: the Runner can still get in`, "install-ice"));
    else if (ice) push(proposal(playOf(obs, ice, weak.label), 30, `add ${ice.title} to ${weak.label} later: not enough credits to rez it`, "install-ice"));
  }

  const subsidy = inHand(obs, "Government Subsidy");
  if (subsidy && obs.credits >= 10) push(proposal(playOf(obs, subsidy), 68, "Government Subsidy: +5 net, keeps the scoring budget high", "economy"));
  const planogram = inHand(obs, "Predictive Planogram");
  if (planogram) push(proposal(playOf(obs, planogram), obs.hand.length <= 2 ? 50 : obs.credits < 4 ? 47 : 33, "Predictive Planogram", "economy"));

  const agendaExposed = obs.hand.some((c) => c.type === "Agenda") || !!installed;
  const reserve = agendaExposed ? Math.min(3, ...obs.servers.filter((s) => s.key === "hq" || s.key === installed?.server.key).flatMap((s) => s.ices.filter((i) => !i.rezzed).map((i) => rezCostOf(i)))) : 0;
  for (const p of out) {
    if (p.kind === "install-ice" && reserve > 0 && Number.isFinite(reserve)) {
      const card = obs.hand.find((c) => c.type === "ICE" && p.why.startsWith(`install ${c.title}`));
      const target = obs.servers.find((s) => p.why.includes(`on ${s.label}`));
      const left = obs.credits - (target ? target.ices.length : 0);
      if (card && left < reserve) {
        p.score -= 25;
        p.why += ` (would leave ${left}, below the ${reserve} needed to rez)`;
      }
    }
    if (p.kind === "install-ice") {
      const card = obs.hand.find((c) => c.type === "ICE" && p.why.startsWith(`install ${c.title}`));
      if (card && card.title === "Palisade" && /Server|remote/.test(p.why)) p.score += 4;
      if (card && (card.title === "Karunā" || card.title === "Diviner") && obs.opp["hand-count"] <= 3) p.score += 3;
      if (card && card.title === "Brân 1.0" && obs.credits < 8) p.score -= 6;
    }
    if (plan.kind === "defend" && p.kind === "install-ice" && /(HQ|R&D)/.test(p.why)) p.score += 15;
    if (plan.kind === "economy" && (p.kind === "economy" || p.kind === "install-economy" || p.kind === "rez-economy" || p.kind === "click-economy")) p.score += 8;
    if (plan.kind === "economy" && p.kind === "install-ice" && !/is open/.test(p.why)) p.score -= 10;
    if (plan.kind === "window" && p.kind === "install-agenda") p.score += 5;
  }
  return out;
}

function prompt(obs: Observation, plan: Plan): Proposal | null {
  const from = promptFrom(obs);
  const text = obs.promptText;
  if (from === "Seamless Launch" && obs.promptType === "select") {
    const cards = selectable(obs).filter((c) => !installedThisTurn(obs, c));
    const agenda = cards.filter((c) => c.type === "Agenda").sort((a, b) => scoringCost(a) - scoringCost(b))[0];
    const pick = agenda ?? cards.find((c) => c.title === "Urtica Cipher");
    if (pick) return { move: selectMove(obs, pick), score: 90, why: `Seamless Launch on ${pick.title}`, kind: "fast-advance" };
    const done = choices(obs).find((c) => /^(done|cancel)$/i.test(String(c.value)));
    if (done) return { move: choiceMove(obs, done), score: 50, why: "Seamless Launch: no worthwhile target", kind: "choice" };
  }
  if (from === "Superconducting Hub" && findChoice(obs, /^yes$/i)) return { move: choiceMove(obs, findChoice(obs, /^yes$/i)), score: 80, why: "draw 2 from Superconducting Hub", kind: "choice" };
  if (from === "Send a Message") {
    const yes = findChoice(obs, /^yes$/i);
    if (yes) return { move: choiceMove(obs, yes), score: 80, why: "rez an ice for free", kind: "choice" };
    const ice = selectable(obs).filter((c) => c.type === "ICE" && !c.rezzed).sort((a, b) => rezCostOf(b) - rezCostOf(a))[0];
    if (ice) return { move: selectMove(obs, ice), score: 80, why: `rez ${ice.title} for free`, kind: "select" };
  }
  if (from === "Brân 1.0" && obs.promptType === "select") {
    const ice = selectable(obs).filter((c) => c.type === "ICE").sort((a, b) => iceRank(obs, b) - iceRank(obs, a))[0];
    if (ice) return { move: selectMove(obs, ice), score: 80, why: `install ${ice.title} for free behind Brân`, kind: "select" };
    const done = choices(obs).find((c) => c.value === "Done");
    if (done) return { move: choiceMove(obs, done), score: 70, why: "no ice to install", kind: "choice" };
  }
  if (from === "Predictive Planogram") {
    const draw = findChoice(obs, /draw/i);
    const gain = findChoice(obs, /gain/i);
    const both = findChoice(obs, /both/i);
    const pick = both ?? (obs.hand.length <= 2 && draw ? draw : (gain ?? draw));
    if (pick) return { move: choiceMove(obs, pick), score: 70, why: "Predictive Planogram choice", kind: "choice" };
  }
  if (/discard down/i.test(text) && obs.promptType === "select") {
    const cards = selectable(obs);
    const order = (c: any) => (c.type === "Agenda" ? 5 : c.type === "ICE" ? 3 : isEconomyCard(obs, c) ? 2 : c.type === "Operation" ? 1 : 2);
    const pick = [...cards].sort((a, b) => order(a) - order(b))[0];
    if (pick) return { move: selectMove(obs, pick), score: 60, why: `discard ${pick.title}`, kind: "select" };
  }
  return null;
}

function run(obs: Observation, plan: Plan): Proposal | null {
  const ice = obs.currentIce;
  const rez = ice ? byCommand(obs, "rez", (c) => (c.args as any)?.card?.cid === ice.cid)[0] : undefined;
  if (rez && ice && !ice.rezzed) {
    const server = obs.servers.find((s) => s.key === obs.run?.server?.[0]);
    const cost = rezCostOf(ice);
    const installed = agendaIn(obs);
    const reserve = installed && server?.key !== installed.server.key ? Math.min(scoringCost(installed.card), 3) : 0;
    const threat = iceThreat(ice, obs.info(ice), Number(obs.opp.credit ?? 0));
    const subs = (ice.subroutines ?? []).length || 3;
    const clickable = (ice.subtypes ?? []).includes("Bioroid") && Number(obs.opp.click ?? 0) >= subs;
    const breakable = runnerBreaks(obs, ice) || clickable;
    const worth = server && (server.content.length > 0 || server.key === "rd" || (server.key === "hq" && obs.hand.some((c) => c.type === "Agenda")) || (server.key === "archives" && (obs.me.discard ?? []).some((c: any) => c.type === "Agenda")));
    if (clickable && obs.credits < cost + 4) {
      const next = byCommand(obs, "continue")[0];
      if (next) return fromCandidate(next, 30, `leave ${ice.title} unrezzed: the Runner has the clicks to walk through it`, "pass");
    }
    if (cost <= obs.credits - reserve && (worth || (!breakable && threat.etr && cost <= 3))) return fromCandidate(rez, 80, `rez ${ice.title} (${cost}): ${breakable ? "taxes the Runner" : "the Runner cannot break it"}`, "rez");
    if (cost <= obs.credits && !breakable && threat.etr && server?.remote && server.content.length) return fromCandidate(rez, 82, `rez ${ice.title}: it ends the run`, "rez");
  }
  return corpRun(obs);
}

export const glacier = { mulligan, plan, proposals, prompt, run, scoringCost, canScoreNextTurn, remotes, scoringRemote, agendaIn, inHand, runnerBreaks, isEconomyCard, iceRank };

export const gatewayCorp: DeckPolicy = registerPolicy({
  id: "gateway-corp-syndicate",
  version: "0.3.0",
  side: "corp",
  decks: [GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE],
  ...glacier,
});

