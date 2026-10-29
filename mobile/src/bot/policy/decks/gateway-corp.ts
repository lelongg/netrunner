import { byCommand, installedThisTurn } from "../observe.ts";
import { cardAction, playOf, proposal } from "../generic.ts";
import { cardWorth, choiceMove, choices, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { registerPolicy } from "../registry.ts";
import { corpRun, fromCandidate, ruinousRez, wastefulRez } from "../runs.ts";
import { agendaProgress, coverage, iceThreat, isTrap, rezCostOf, serverSafety } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE } from "./gateway.ts";
import { knownDeck } from "./known.ts";

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
  if (agendas.length && protectedRemote && protectedRemote.ices.length >= 2 && obs.credits >= 12 && current?.kind === "fortify" && current.since <= obs.turn - 2) return keep("window", `${protectedRemote.label} has waited two turns with the credits in hand: install ${agendas[0].title} and go`);
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

function proposals(obs: Observation, plan: Plan, base: Proposal[], extra?: (out: Proposal[], push: (p: Proposal | null) => void) => void): Proposal[] {
  const out = [...base];
  let push = (p: Proposal | null) => {
    if (p) out.push(p);
  };
  const seamless = inHand(obs, "Seamless Launch");
  const installed = agendaIn(obs);
  const scoring = scoringRemote(obs);
  const runnerCreditsNow = Number(obs.opp.credit ?? 0);
  const agendasHeld = obs.hand.filter((c) => c.type === "Agenda").length;
  const baitTargets = remotes(obs)
    .filter((s) => s.ices.length >= 2 && s.content.every((c: any) => c.type === "Upgrade"))
    .map((s) => ({ server: s, safety: serverSafety(obs, s) }))
    .filter((x) => !x.safety.safe && x.safety.margin < -3 && x.safety.runnerCost >= 3 && runnerCreditsNow >= x.safety.runnerCost + 6)
    .sort((a, b) => b.server.ices.length - a.server.ices.length);
  const baitCards = obs.hand.filter((c) => c.type === "Asset" && Number(c.cost ?? 0) <= obs.credits - 2).sort((a, b) => Number(isTrap(obs.info(b).text)) - Number(isTrap(obs.info(a).text)) || Number(a.cost ?? 0) - Number(b.cost ?? 0));
  const baited = baitTargets.length > 0 && baitCards.length > 0 && !installed && agendasHeld < 3 && Number(obs.me["deck-count"] ?? 0) >= 10;
  if (baited) {
    const { server, safety } = baitTargets[0];
    const card = baitCards[0];
    push(proposal(playOf(obs, card, server.label), isTrap(obs.info(card).text) ? 60 : 57, `bait ${card.title} in ${server.label}: the Runner pays about ${safety.runnerCost} to see it`, "install-bait"));
  }
  const deckLeft = Number(obs.me["deck-count"] ?? 0);
  const openCentral = obs.servers.find((s) => !s.remote && s.key !== "archives" && !s.ices.length);
  const drawsSoFar = ((obs.memory.notes.kinds as string[] | undefined) ?? []).filter((k) => k === "draw").length;
  const hqThin = agendasHeld >= 2 && (obs.servers.find((s) => s.key === "hq")?.ices.length ?? 0) <= 1;
  const noIce = !obs.hand.some((c) => c.type === "ICE");
  if (noIce && !openCentral && !hqThin && deckLeft > 0 && drawsSoFar < 1 && obs.hand.length <= 3 && (obs.credits >= 10 || agendasHeld >= 2)) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, agendasHeld >= 2 ? 46 : 40, `draw: no ice in hand${agendasHeld >= 2 ? ` and ${agendasHeld} agendas waiting` : ""}`, "draw"));
  }
  if ((openCentral || hqThin) && noIce && deckLeft > 0 && drawsSoFar < 3) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, agendasHeld > 0 ? 66 : 60, openCentral ? `draw: ${openCentral.label} is open and no ice is in hand` : `draw: ${agendasHeld} agendas sit behind one ice and no ice is in hand`, "draw"));
  }
  if (deckLeft <= 8) {
    for (const p of out) {
      if (p.kind === "draw" || /draw two|draw 2|draw three|draw 3/i.test(p.why)) {
        p.score = Math.min(p.score, 8);
        p.why += " (R&D is nearly empty)";
      }
    }
  }
  const runnerDeck = knownDeck(String(obs.opp.identity?.title ?? ""));
  const rezTax = obs.memory.opponentTitles.has("Tread Lightly") || (runnerDeck?.cards.some((c) => /rez cost[^.]*increased/i.test(obs.info({ title: c.title }).text ?? "")) ?? false) ? 3 : 1;
  const judged = new WeakSet<Proposal>();
  const judgeAgendaInstall = (p: Proposal) => {
    if (p.kind !== "install-agenda" || judged.has(p)) return;
    judged.add(p);
    if (plan.kind === "window") p.score += 5;
    const card = obs.hand.find((c) => c.type === "Agenda" && p.why.includes(c.title));
    const target = remotes(obs).find((s) => p.why.endsWith(s.label) || p.why.includes(`in ${s.label}`));
    const safety = target ? serverSafety(obs, target) : null;
    const agendasInHand = obs.hand.filter((c) => c.type === "Agenda").length;
    const racing = Number(obs.me["deck-count"] ?? 0) < 12 || agendasInHand >= 2 || obs.hand.length >= 5;
    const points = Number(card?.agendapoints ?? 0);
    const runnerIncome = [...(obs.opp.rig?.resource ?? []), ...(obs.opp.rig?.hardware ?? [])].filter((c: any) => /(gain|take|place) \d+\s*\[credits?\]/i.test(obs.info(c).text ?? "")).length;
    const runnerReady = Number(obs.opp.credit ?? 0) + 4 + Math.min(4, runnerIncome * 1.5) >= 7 && Number(obs.opp["hand-count"] ?? 0) >= 1;
    const thinAndSlow = !!card && !!target && target.ices.length < 2 && agendaProgress(card).need >= 4 && runnerReady && !canScoreNextTurn(obs, card, !!seamless);
    if (safety && !safety.safe) {
      const canRezOne = target!.ices.some((i) => i.rezzed || rezCostOf(i) <= obs.credits - 1);
      const hq = obs.servers.find((s) => s.key === "hq")!;
      const hqSafer = serverSafety(obs, hq).margin > safety.margin + 2 && obs.hand.length < 5 && agendasInHand <= 1;
      const runnerCredits = Number(obs.opp.credit ?? 0);
      const deep = target!.ices.length >= 2;
      const margins = deep ? [-4, -8, 6] : [-1, -4, 3];
      const cheapEntry = safety.runnerCost < 4;
      const contestable = target!.ices.length >= 1 && canRezOne && obs.credits >= 3 && !hqSafer && plan.kind !== "economy" && (safety.margin >= margins[0] || (racing && runnerCredits <= margins[2] && safety.margin >= margins[1]));
      const rich = obs.credits >= Math.max(15, safety.rezCost + 6);
      const fortress = target!.ices.length >= 3 || (target!.ices.length >= 2 && target!.content.some((c: any) => c.type === "Upgrade"));
      const desperate = Number(obs.me["deck-count"] ?? 99) < 10 && target!.ices.length >= 1 && canRezOne;
      const stolenTurn = ((obs.memory.notes.stolenFrom ?? {}) as Record<string, number>)[target!.label];
      const changedTurn = ((obs.memory.notes.iceChanged ?? {}) as Record<string, number>)[target!.label] ?? 0;
      const breached = stolenTurn !== undefined && stolenTurn >= changedTurn;
      const holdable = agendasInHand <= 2 && Number(obs.me["deck-count"] ?? 0) >= 10;
      const taxRace = !contestable && ((rich && fortress && safety.runnerCost >= 6) || desperate);
      const flooded = agendasInHand >= 3;
      const jam = !contestable && !taxRace && flooded && fortress && canRezOne && !cheapEntry && safety.runnerCost >= 7;
      const slow = card ? agendaProgress(card).need >= 5 : false;
      const fast = !!card && deep && canRezOne && !cheapEntry && !breached && agendasInHand <= 2 && obs.credits >= 12 && canScoreNextTurn(obs, card, !!seamless) && !contestable;
      p.score = (breached && holdable && !desperate) || (cheapEntry && !desperate) ? Math.min(p.score, 12) : fast ? Math.min(p.score, 56) - (points >= 3 ? 8 : 0) : contestable ? Math.min(p.score, racing ? 58 : 48) - (points >= 3 ? 10 : 0) - (slow ? 8 : 0) : taxRace ? Math.min(p.score, 55) - (points >= 3 ? 8 : 0) - (slow ? 8 : 0) : jam ? Math.min(p.score, 44) - (points >= 3 ? 8 : 0) - (slow ? 6 : 0) : Math.min(p.score, 15);
      p.why += ` (the Runner can get in: margin ${safety.margin} for ${safety.runnerCost}${breached ? ", and stole from there since the ice last changed" : ""}${cheapEntry ? ", and the run there is nearly free" : ""}${racing ? ", racing" : ""}${taxRace ? (desperate ? ", R&D is running out" : ", rich enough to make every run expensive") : ""}${jam ? ", jamming: too many agendas in hand to wait" : ""}${fast ? ", but it scores next turn and the credits are there" : ""}${canRezOne ? "" : ", no ice can be rezzed"}${hqSafer ? ", HQ is safer" : ""})`;
    } else if (card && target && safety?.safe && obs.clicks < 3 && canScoreNextTurn(obs, card, !!seamless)) p.score = Math.max(p.score, 72);
    if (safety && !safety.safe && card && target && target.ices.length >= 2 && safety.runnerCost >= 4 && Number(card.agendapoints ?? 0) <= 1 && agendasHeld >= 2 && Number(obs.opp.credit ?? 0) - safety.runnerCost < safety.runnerCost && obs.credits >= safety.rezCost + 3) {
      p.score = Math.max(p.score, 52);
      p.why += " (a one-point agenda the Runner must pay to see: the next one scores)";
    }
    if (card && !seamless && agendaProgress(card).need >= 4 && obs.clicks <= 2 && safety && !safety.blocked && safety.margin < 4) {
      p.score = Math.min(p.score, 40);
      p.why += " (two turns to score without Seamless Launch)";
    }
    if (obs.clicks === 3) p.score = Math.min(p.score, 50);
    if (baited && target && baitTargets.some((x) => x.server.label === target.label)) {
      p.score = Math.min(p.score, 30);
      p.why += " (bait first: the Runner is rich enough to get in)";
    }
    if (thinAndSlow) {
      p.score = Math.min(p.score, 38);
      p.why += " (one ice is thin for an agenda that takes two turns)";
    }
    if (card && target && target.ices.length < 2 && obs.credits < Math.max(3, scoringCost(card) - 1)) {
      p.score = Math.min(p.score, 20);
      p.why += ` (too poor to advance it behind one ice: ${scoringCost(card)} needed)`;
    }
    const enders = target ? target.ices.filter((i: any) => !i.rezzed && iceThreat({ ...i, subroutines: [] }, obs.info(i), 99).etr).map((i: any) => rezCostOf(i)) : [];
    const cheapestEnder = enders.length ? Math.min(...enders) : target && target.ices.some((i: any) => !i.rezzed) ? safety?.rezCost ?? 0 : 0;
    if (safety && target && cheapestEnder > 0 && cheapestEnder + rezTax > obs.credits) {
      p.score = Math.min(p.score, 15);
      p.why += ` (cannot rez an ender there with ${rezTax} to spare: ${cheapestEnder} needed)`;
    }
    const corpPoints = Number(obs.me["agenda-point"] ?? 0);
    const corpNeed = Number(obs.me["agenda-point-req"] ?? 7);
    const runnerPoints = Number(obs.opp["agenda-point"] ?? 0);
    const runnerNeed = Number(obs.opp["agenda-point-req"] ?? 7);
    const scoresNow = !!card && canScoreNextTurn(obs, card, !!seamless) && obs.clicks >= 3 && scoringCost(card) <= obs.clicks - 1;
    if (card && target && corpPoints + Number(card.agendapoints ?? 0) >= corpNeed && target.ices.length >= 2 && !(safety && safety.runnerCost < 4) && obs.credits >= Math.min(4, scoringCost(card))) {
      p.score = Math.max(p.score, 62);
      p.why += " (match point: scoring it wins the game)";
    } else if (card && target && safety && !safety.safe && runnerPoints + Number(card.agendapoints ?? 0) >= runnerNeed && !scoresNow) {
      p.score = Math.min(p.score, 10);
      p.why += " (the Runner wins if it steals this, and it can get in)";
    }
    const hqServer = obs.servers.find((s) => s.key === "hq");
    const hqRisk = hqServer ? serverSafety(obs, hqServer) : null;
    const enderOut = cheapestEnder > 0 && cheapestEnder + rezTax > obs.credits;
    if (card && target && safety && !safety.safe && hqRisk && !hqRisk.safe && runnerPoints >= runnerNeed - 2 && !enderOut && target.ices.length >= 2 && safety.runnerCost >= 4 && safety.runnerCost >= hqRisk.runnerCost && agendasInHand >= 2 && agendasInHand * 2 >= obs.hand.length && target.ices.some((i) => i.rezzed || rezCostOf(i) <= obs.credits - 2)) {
      p.score = Math.max(p.score, 46);
      p.why += ` (HQ is no safer: ${agendasInHand} of ${obs.hand.length} cards there are agendas)`;
    }
  };
  for (const p of out) judgeAgendaInstall(p);
  const pushRaw = push;
  push = (p: Proposal | null) => {
    if (p) judgeAgendaInstall(p);
    pushRaw(p);
  };
  const spike = inHand(obs, "Neurospike");
  if (spike && obs.credits >= 3) {
    const points = Number(obs.memory.notes.scoredPointsThisTurn ?? 0);
    const grip = Number(obs.opp["hand-count"] ?? 0);
    const spikes = obs.hand.filter((c) => c.title === "Neurospike").length;
    const reach = points * Math.min(spikes, obs.clicks, Math.floor(obs.credits / 3));
    if (points > 0 && grip <= reach) push(proposal(playOf(obs, spike), 120, `Neurospike: ${points} net damage against a grip of ${grip} flatlines the Runner`, "kill"));
    else if (points >= 2 && grip <= points + 2) push(proposal(playOf(obs, spike), 70, `Neurospike: ${points} net damage leaves the Runner with ${Math.max(0, grip - points)} cards`, "damage"));
  }
  if (spike && installed && !Number(obs.memory.notes.scoredPointsThisTurn ?? 0)) {
    const { have, need } = agendaProgress(installed.card);
    const spikes = obs.hand.filter((c) => c.title === "Neurospike").length;
    const left = need - have - (seamless && !installedThisTurn(obs, installed.card) ? 2 : 0);
    const clicksAfter = obs.clicks - Math.max(0, left) - (seamless && left < need - have ? 1 : 0);
    const reach = Number(installed.card.agendapoints ?? 0) * Math.min(spikes, Math.max(0, clicksAfter), Math.floor((obs.credits - Math.max(0, left)) / 3));
    if (clicksAfter >= 1 && reach >= Number(obs.opp["hand-count"] ?? 0)) {
      for (const p of out) if ((p.kind === "advance" || p.kind === "fast-advance") && p.why.includes(installed.card.title)) p.score = Math.max(p.score, 96);
    }
  }
  const iceCount = (obs.memory.notes.iceCount ??= {}) as Record<string, number>;
  const iceChanged = (obs.memory.notes.iceChanged ??= {}) as Record<string, number>;
  for (const s of remotes(obs)) {
    if (iceCount[s.label] !== s.ices.length) {
      if (iceCount[s.label] !== undefined) iceChanged[s.label] = obs.turn;
      iceCount[s.label] = s.ices.length;
    }
  }

  if (installed && seamless && !installedThisTurn(obs, installed.card) && obs.credits >= 1 && scoringCost(installed.card) >= 2) {
    push(proposal(playOf(obs, seamless), 95, `Seamless Launch: two advancements on ${installed.card.title}`, "fast-advance"));
  }

  const agendasStuck = obs.hand.some((c) => c.type === "Agenda") && !out.some((p) => p.kind === "install-agenda" && p.score > 20);
  const idle = !out.some((p) => p.kind !== "credit" && p.kind !== "draw" && p.score > 32);
  if (idle && obs.credits >= 12 && Number(obs.me["deck-count"] ?? 0) > 8) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 44, "draw: rich and nothing in hand is worth a click, cycle the hand", "draw"));
  }
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
  const hq = obs.servers.find((s) => s.key === "hq");
  const heldPoints = Math.max(0, ...obs.hand.filter((c) => c.type === "Agenda").map((c) => Number(c.agendapoints ?? 0)));
  const hqWins = heldPoints > 0 && Number(obs.opp["agenda-point"] ?? 0) + heldPoints >= Number(obs.opp["agenda-point-req"] ?? 7);
  const hqSafety = hq ? serverSafety(obs, hq) : null;
  if (skunk && hq && hqWins && hqSafety && !hqSafety.safe && !hq.content.some((c: any) => c.title === skunk.title) && obs.credits >= 3 && playOf(obs, skunk, hq.label)) push(proposal(playOf(obs, skunk, hq.label), 84, `Manegarm Skunkworks in HQ: an agenda there wins the game for the Runner and they can get in`, "install-upgrade"));
  else if (skunk && (scoring ?? bait) && (scoring ?? bait)!.ices.length > 0 && obs.credits >= 4) push(proposal(playOf(obs, skunk, (scoring ?? bait)!.label), 46, `Manegarm Skunkworks in ${(scoring ?? bait)!.label}: the Runner pays 2 clicks or 5 credits to get in`, "install-upgrade"));

  for (const s of remotes(obs)) {
    for (const card of s.content) {
      if (card.title === "Regolith Mining License" && card.rezzed) push(proposal(cardAction(obs, card, "ability", /take 3/i), obs.credits < 8 ? 57 : obs.credits < 15 ? 44 : 31, "Regolith Mining License: take 3 credits", "click-economy"));
    }
  }
  const hub = inHand(obs, "Superconducting Hub");
  const office = inHand(obs, "Offworld Office");
  const runnerCanRig = Number(obs.opp.credit ?? 0) >= 4 && Number(obs.opp["hand-count"] ?? 0) >= 1;
  const baitSafe = bait ? serverSafety(obs, bait).safe && (bait.ices.length >= 2 || !runnerCanRig) : false;
  if (hub && bait && baitSafe && obs.clicks >= 1 && obs.credits >= 2 && !installed) push(proposal(playOf(obs, hub, bait.label), 66, `Superconducting Hub in ${bait.label} only needs 3 advancements: cheap to score next turn`, "install-agenda"));
  if (office && bait && baitSafe && obs.credits >= 3 && !installed && obs.clicks <= 2) push(proposal(playOf(obs, office, bait.label), 71, `Offworld Office in ${bait.label} pays 7 when scored: install late in the turn`, "install-agenda"));
  const hqServer = obs.servers.find((s) => s.key === "hq")!;
  const remoteReady = remotes(obs).some((s) => s.ices.length > 0 && s.content.every((c: any) => c.type === "Upgrade"));
  const rdOpen = obs.servers.find((s) => s.key === "rd")!.ices.length === 0;
  const hqCap = rdOpen ? 1 : agendasHeld >= 3 && !remoteReady && obs.hand.some((c) => c.type === "ICE") ? 2 : 3;
  const endsRun = (c: any) => iceThreat({ ...c, subroutines: c.subroutines ?? [] }, obs.info(c), 99).etr;
  if (agendasHeld >= 1 && hqServer.ices.length < hqCap && !serverSafety(obs, hqServer).safe) {
    const iceInHand = obs.hand.filter((c) => c.type === "ICE");
    const spareEnder = iceInHand.some((c) => endsRun(c)) && iceInHand.some((c) => !endsRun(c));
    const ice = iceInHand.sort((a, b) => iceRank(obs, b) - (spareEnder && endsRun(b) ? 20 : 0) - (iceRank(obs, a) - (spareEnder && endsRun(a) ? 20 : 0)))[0];
    const budget = obs.credits - hqServer.ices.length;
    const hqRuns = (((obs.memory.notes.runsSeen ?? {}) as Record<string, number[]>)["HQ"] ?? []).filter((t) => t >= obs.turn - 3).length;
    const quietHq = hqServer.ices.length >= 1 && hqRuns === 0;
    if (ice && budget >= rezCostOf(ice) + 2) push(proposal(playOf(obs, ice, "HQ"), Math.min(quietHq ? 58 : 99, agendasHeld >= 2 ? 72 : 63), `add ${ice.title} to HQ: ${agendasHeld} agenda${agendasHeld > 1 ? "s" : ""} in hand and the Runner can get in${quietHq ? ", though HQ has been quiet" : ""}`, "install-ice"));
  }
  const scoringShell = remotes(obs).find((s) => s.ices.length > 0 && s.content.every((c: any) => c.type === "Upgrade"));
  const weak = installed?.server ?? (obs.hand.some((c) => c.type === "Agenda") ? bait ?? scoringShell : undefined);
  const porous = weak ? !weak.ices.some((i: any) => endsRun(i)) : false;
  if (weak && !serverSafety(obs, weak).safe && (weak.ices.length < 3 || (porous && weak.ices.length < 4))) {
    const ice = obs.hand.filter((c) => c.type === "ICE").sort((a, b) => iceRank(obs, b) + (endsRun(b) ? 5 : 0) - (iceRank(obs, a) + (endsRun(a) ? 5 : 0)))[0];
    const budget = obs.credits - weak.ices.length;
    const pointless = porous && weak.ices.length >= 3 && ice && !endsRun(ice);
    if (ice && !pointless && budget >= rezCostOf(ice) + 2) push(proposal(playOf(obs, ice, weak.label), (installed ? 74 : obs.credits >= 12 ? 70 : 64) + (porous && endsRun(ice) ? 6 : 0), `add ${ice.title} to ${weak.label}: the Runner can still get in${porous ? " and nothing there ends the run" : ""}`, "install-ice"));
    else if (ice) push(proposal(playOf(obs, ice, weak.label), 30, `add ${ice.title} to ${weak.label} later: not enough credits to rez it`, "install-ice"));
  }

  const runnerGrip = Number(obs.opp["hand-count"] ?? 0);
  const clearing = inHand(obs, "Clearinghouse");
  const baitRemote = remotes(obs).find((s) => s.ices.length > 0 && !s.content.length);
  if (clearing && obs.credits >= 2 && remotes(obs).length <= 3 && agendasHeld === 0 && !installed) push(proposal(playOf(obs, clearing, baitRemote ? baitRemote.label : "New remote"), baitRemote ? 48 : 40, "Clearinghouse: a threat that pays to advance", "install-trap"));
  for (const s of remotes(obs)) {
    for (const card of s.content) {
      if (card.title !== "Clearinghouse") continue;
      const have = agendaProgress(card).have;
      if (have === 0 && obs.credits >= 1) push(proposal(cardAction(obs, card, "advance"), 50, "advance Clearinghouse: a threat the Runner has to respect", "advance"));
      else if (have > 0 && have < runnerGrip && obs.credits >= 2 && !installed) push(proposal(cardAction(obs, card, "advance"), 34 + have * 4, `advance Clearinghouse (${have}) towards the Runner's grip of ${runnerGrip}`, "advance"));
      if (!card.rezzed && have >= 3 && have >= runnerGrip - 1 && rezCostOf(card) <= obs.credits) push(proposal(cardAction(obs, card, "rez"), 72, `rez Clearinghouse: ${have} meat damage hangs over a grip of ${runnerGrip}`, "rez"));
    }
  }
  const ambush = obs.hand.find((c) => c.type === "Asset" && /you can advance this asset/i.test(obs.info(c).text ?? "") && /net damage/i.test(obs.info(c).text ?? ""));
  const scoringEmpty = scoring ? null : remotes(obs).find((s) => s.ices.length > 0 && !s.content.some((c: any) => c.type !== "Upgrade"));
  if (ambush && scoringEmpty && obs.credits >= 4 && !installed && agendasHeld === 0) push(proposal(playOf(obs, ambush, scoringEmpty.label), 46, `${ambush.title} in ${scoringEmpty.label}: the next run into the scoring remote hurts`, "install-trap"));

  if (agendasHeld === 0 && !installed && obs.credits >= 12 && obs.hand.length <= 6 && Number(obs.me["deck-count"] ?? 0) > 5) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 48, "draw: no agenda in hand and credits to spare, dig for one", "draw"));
  }
  const sprint = inHand(obs, "Sprint");
  if (sprint && agendasHeld === 0 && obs.hand.length <= 5 && Number(obs.me["deck-count"] ?? 0) > 5) push(proposal(playOf(obs, sprint), obs.credits >= 10 ? 56 : 46, "Sprint: three cards to find an agenda, two back into R&D", "draw"));
  if (sprint && agendasHeld >= 2 && !installed && Number(obs.me["deck-count"] ?? 0) > 5 && !out.some((p) => p.kind === "install-agenda" && p.score > 40)) push(proposal(playOf(obs, sprint), (obs.servers.find((s) => s.key === "hq")?.ices.length ?? 0) >= 2 ? 56 : 44, `Sprint: three cards, and two of ${agendasHeld} agendas back into R&D`, "draw"));
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
    if (p.kind === "economy" && /Hansei Review/.test(p.why) && !obs.hand.some((c) => c.type !== "Agenda" && c.title !== "Hansei Review")) {
      p.score = 5;
      p.why += " (it would trash an agenda)";
    }
    if (plan.kind === "economy" && (p.kind === "economy" || p.kind === "install-economy" || p.kind === "rez-economy" || p.kind === "click-economy")) p.score += 8;
    if (plan.kind === "economy" && p.kind === "install-ice" && !/is open/.test(p.why)) p.score -= 10;
  }
  extra?.(out, push);
  for (const p of out) {
    if (p.kind === "advance" && installed && p.why.includes(installed.card.title)) {
      const { have, need } = agendaProgress(installed.card);
      const finishable = have + obs.clicks + (seamless && !installedThisTurn(obs, installed.card) ? 1 : 0) >= need;
      const nextTurn = need - have - (seamless ? 1 : 0) <= 3;
      const unrezzedCost = Math.max(0, ...installed.server.ices.filter((i: any) => !i.rezzed).map((i: any) => rezCostOf(i)));
      const reserve = unrezzedCost > 0 ? unrezzedCost + rezTax - 1 : 0;
      if (finishable) p.score = Math.max(p.score, 88);
      else if (installed.server.ices.length === 0) p.score = Math.min(p.score, 20);
      else if (installedThisTurn(obs, installed.card) && nextTurn) {
        p.score = Math.min(p.score, 22);
        p.why += " (never advance: it scores next turn from zero)";
      } else if (reserve > 0 && obs.credits - 1 < reserve && obs.credits + obs.clicks >= reserve) {
        p.score = Math.min(p.score, 26);
        p.why += ` (keep ${reserve} credits to rez the ice in front of it)`;
        const credit = byCommand(obs, "credit")[0];
        if (credit) push(proposal(credit, 58, `take a credit: ${reserve} needed to rez the ice in front of ${installed.card.title}`, "credit"));
      }
    }
  }
  return out;
}

function prompt(obs: Observation, plan: Plan): Proposal | null {
  const from = promptFrom(obs);
  const text = obs.promptText;
  if (from === "Clearinghouse" && /trash/i.test(text) && obs.promptType !== "select") {
    const card = obs.servers.flatMap((s) => s.content).find((c: any) => c.title === "Clearinghouse");
    const have = card ? agendaProgress(card).have : 0;
    const grip = Number(obs.opp["hand-count"] ?? 0);
    const yes = findChoice(obs, /^yes$/i);
    const no = findChoice(obs, /^no$/i);
    if (yes && have >= grip && have > 0) return { move: choiceMove(obs, yes), score: 95, why: `Clearinghouse: ${have} meat damage against a grip of ${grip}`, kind: "choice" };
    if (no) return { move: choiceMove(obs, no), score: 60, why: "Clearinghouse: keep building the threat", kind: "choice" };
  }
  if (from === "Sprint" && obs.promptType === "select") {
    const cards = selectable(obs);
    const pick = [...cards].sort((a, b) => Number(b.type === "Agenda") - Number(a.type === "Agenda") || cardWorth(obs, a) - cardWorth(obs, b))[0];
    if (pick) return { move: selectMove(obs, pick), score: 80, why: pick.type === "Agenda" ? `Sprint: ${pick.title} goes back into R&D` : `Sprint: shuffle ${pick.title} back, the least useful card`, kind: "select" };
  }
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
    const ruin = server ? ruinousRez(obs, cost, server, threat.etr, threat.damage >= Number(obs.opp["hand-count"] ?? 5)) : null;
    if (ruin) return fromCandidate(byCommand(obs, "continue")[0] ?? rez, 30, ruin, "pass");
    const waste = server ? wastefulRez(obs, ice, server) : null;
    if (waste?.wasteful) return fromCandidate(byCommand(obs, "continue")[0] ?? rez, 30, waste.why, "pass");
    if (cost <= obs.credits - reserve && (worth || (!breakable && threat.etr && cost <= 3))) return fromCandidate(rez, 80, `rez ${ice.title} (${cost}): ${breakable ? "taxes the Runner" : "the Runner cannot break it"}`, "rez");
    if (cost <= obs.credits && !breakable && threat.etr && server?.remote && server.content.length) return fromCandidate(rez, 82, `rez ${ice.title}: it ends the run`, "rez");
  }
  return corpRun(obs);
}

export const glacier = { mulligan, plan, proposals, prompt, run, scoringCost, canScoreNextTurn, remotes, scoringRemote, agendaIn, inHand, runnerBreaks, isEconomyCard, iceRank };

export const gatewayCorp: DeckPolicy = registerPolicy({
  id: "gateway-corp-syndicate",
  version: "0.5.0",
  side: "corp",
  decks: [GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE],
  ...glacier,
});

