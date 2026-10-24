import { byCommand } from "../observe.ts";
import { playOf, proposal, serverValue } from "../generic.ts";
import { choiceLabel, choiceMove, choices, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { registerPolicy } from "../registry.ts";
import { fromCandidate, labelCost, runServer, runnerRun } from "../runs.ts";
import { agendaProgress, breakerProfile, coverage, estimateRun, iceThreat, isIcebreaker, playCostOf, tagPunisher } from "../tactics.ts";
const ICE_TYPES = new Set(["Barrier", "Code Gate", "Sentry"]);
import type { DeckList, DeckPolicy, Observation, Plan, Proposal, ServerInfo } from "../types.ts";
import { CORE_CORP_DECKS } from "./core.ts";
import { GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE, GATEWAY_RUNNER_BEGINNER, GATEWAY_RUNNER_INTERMEDIATE } from "./gateway.ts";

const isEconomyCard = (obs: Observation, c: any) => obs.profile.economy.has(c.title);
const seenIceTypes = (obs: Observation) => {
  const out = new Set<string>();
  for (const title of obs.memory.opponentTitles) for (const t of obs.info({ title }).subtypes ?? []) if (ICE_TYPES.has(t)) out.add(t);
  return out;
};

const inHand = (obs: Observation, title: string) => obs.hand.find((c) => c.title === title);
const inRig = (obs: Observation, title: string) => obs.rig.find((c) => c.title === title);
const ranSuccessfullyThisTurn = (obs: Observation) => obs.memory.runs.some((r) => r.turn === obs.turn && r.successful && obs.myTurn);
const lastClick = (obs: Observation) => obs.clicks === 1;
const runScore = (t: Target, bonus = 0) => 40 + (t.value + bonus - t.credits * 0.4 - t.damage * 1.5 - t.server.ices.filter((i: any) => !i.rezzed).length * 0.8) * 4;

interface Target {
  server: ServerInfo;
  value: number;
  credits: number;
  exact: boolean;
  damage: number;
  tags: number;
  viaMayfly?: boolean;
}

function targets(obs: Observation, extra = 0, includeWorthless = false): Target[] {
  const out: Target[] = [];
  const mayfly = inHand(obs, "Mayfly");
  const mayflyCost = mayfly ? playCostOf(mayfly) : 0;
  const mayflyProfile = mayfly && Number(obs.me.memory?.available ?? 4) - Number(obs.me.memory?.used ?? 0) >= 1 ? breakerProfile(mayfly, obs.info(mayfly)) : null;
  for (const server of obs.servers) {
    const value = serverValue(obs, server);
    if (value <= 0 && !includeWorthless) continue;
    const corpCredits = Number(obs.opp.credit ?? 0);
    const unrezzedCost = corpCredits < 1 ? 0 : corpCredits < 3 ? 1 : 3;
    const est = estimateRun(obs, server, unrezzedCost, obs.credits + extra);
    if (!est.blocked) {
      out.push({ server, value, credits: est.credits, exact: est.exact, damage: est.damage, tags: est.tags });
      continue;
    }
    const worthMayfly = server.remote ? server.content.some((c: any) => c.type === "Agenda" || agendaProgress(c).have > 0 || (!c.rezzed && !c.title)) : value >= 4;
    if (!mayflyProfile || !worthMayfly || mayflyCost > obs.credits + extra) continue;
    const viaMayfly = estimateRun(obs, server, unrezzedCost, obs.credits + extra - mayflyCost, [mayflyProfile]);
    if (viaMayfly.blocked) continue;
    out.push({ server, value, credits: viaMayfly.credits + mayflyCost, exact: viaMayfly.exact, damage: viaMayfly.damage, tags: viaMayfly.tags, viaMayfly: true });
  }
  return out.sort((a, b) => b.value - b.credits * 0.3 - (a.value - a.credits * 0.3));
}

const TRAP_DAMAGE: Record<string, (adv: number) => number> = { "Urtica Cipher": (adv) => 2 + Math.min(adv, 2), "Byte!": () => 3, "Snare!": () => 3 };
const TRAPS = Object.keys(TRAP_DAMAGE);
const KNOWN_CORP_DECKS: DeckList[] = [GATEWAY_CORP_BEGINNER, GATEWAY_CORP_INTERMEDIATE, ...CORE_CORP_DECKS];
const opponentDeck = (obs: Observation) => {
  const identity = String(obs.opp.identity?.title ?? "");
  return KNOWN_CORP_DECKS.find((d) => d.identity === identity);
};

function trapsLeft(obs: Observation): { count: number; damage: (adv: number) => number } {
  const deck = opponentDeck(obs);
  const none = { count: 0, damage: () => 0 };
  if (!deck) {
    const faction = String(obs.opp.identity?.faction ?? "");
    const seenTrap = [...obs.memory.opponentTitles].some((t) => TRAPS.includes(t));
    if (!/jinteki/i.test(faction) && !seenTrap) return none;
    return { count: 1, damage: (adv) => Math.max(TRAP_DAMAGE["Urtica Cipher"](adv), 3) };
  }
  const inDeck = deck.cards.filter((c) => TRAPS.includes(c.title));
  if (!inDeck.length) return none;
  const total = inDeck.reduce((n, c) => n + c.qty, 0);
  const known = new Set<string>();
  for (const s of obs.servers) for (const c of s.content) if (TRAPS.includes(c.title ?? obs.memory.seen.get(c.cid)?.title ?? "")) known.add(c.cid);
  for (const c of obs.opp.discard ?? []) if (TRAPS.includes(c.title ?? "")) known.add(c.cid);
  const count = Math.max(0, total - known.size);
  const damage = (adv: number) => Math.max(...inDeck.map((c) => TRAP_DAMAGE[c.title](adv)));
  return count ? { count, damage } : none;
}

function fullyCovered(obs: Observation, t: Target) {
  const cov = coverage(obs);
  const unrezzed = t.server.ices.filter((i: any) => !i.rezzed).length;
  if (unrezzed === 0) return t.damage === 0;
  if (cov.size >= 3) return true;
  return unrezzed === 1 && !!inRig(obs, "Mayfly");
}

function trapOdds(obs: Observation): number {
  const traps = trapsLeft(obs).count;
  if (traps === 0) return 0;
  const deck = opponentDeck(obs);
  if (!deck) return 0.5;
  const isAgenda = (title: string) => obs.info({ title }).type === "Agenda";
  const total = deck.cards.filter((c) => isAgenda(c.title)).reduce((n, c) => n + c.qty, 0);
  const gone = (obs.opp.scored ?? []).length + (obs.me.scored ?? []).length + (obs.opp.discard ?? []).filter((c: any) => c.type === "Agenda").length;
  return traps / (traps + Math.max(1, total - gone));
}

const ambushDeck = (obs: Observation) => /jinteki/i.test(String(obs.opp.identity?.faction ?? obs.opp.identity?.title ?? "")) || [...obs.memory.opponentTitles].some((t) => /^(Byte!|Snare!|Urtica Cipher)$/.test(t));

function accessRisk(obs: Observation, t: Target) {
  const adv = Math.max(0, ...t.server.content.map((c: any) => agendaProgress(c).have));
  const hidden = t.server.remote && t.server.content.some((c: any) => !c.rezzed && !c.title && !obs.memory.seen.has(c.cid));
  const traps = trapsLeft(obs);
  if (!t.server.remote && traps.count > 0 && Number(obs.opp.credit ?? 0) >= 4) return t.damage + traps.damage(0);
  if (!hidden) return t.damage;
  const odds = trapOdds(obs);
  if (odds === 0 || (adv >= 2 && odds <= 0.2)) return t.damage;
  return t.damage + traps.damage(adv);
}

function requiredHand(obs: Observation, t: Target, covered = fullyCovered(obs, t)) {
  const unrezzed = t.server.ices.filter((i: any) => !i.rezzed).length;
  const corpCredits = Number(obs.opp.credit ?? 0);
  const hurts = ambushDeck(obs) || [...obs.memory.opponentTitles].some((title) => /net damage/i.test(obs.info({ title }).text ?? "") && (obs.info({ title }).type ?? "") === "ICE");
  const iceDamage = unrezzed && !(covered && obs.credits >= t.credits + 2) ? (hurts ? (corpCredits >= 4 ? 3 : corpCredits >= 1 ? 2 : 0) : corpCredits >= 1 ? 1 : 0) : 0;
  return accessRisk(obs, t) + iceDamage;
}

function readiness(obs: Observation, t: Target): { installs: { title: string; cost: number }[]; draws: number; cost: number } | null {
  const cov = coverage(obs);
  const unrezzed = t.server.ices.filter((i: any) => !i.rezzed).length;
  const memoryLeft = Number(obs.me.memory?.available ?? 4) - Number(obs.me.memory?.used ?? 0);
  let installs: { title: string; cost: number }[] = [];
  const mayflyInHand = inHand(obs, "Mayfly");
  if (t.viaMayfly) {
    if (!mayflyInHand || memoryLeft < 1) return null;
    installs = [{ title: "Mayfly", cost: playCostOf(mayflyInHand) }];
  } else if (unrezzed > 0 && cov.size < 3) {
    const mayfly = inHand(obs, "Mayfly");
    if (mayfly && unrezzed === 1 && memoryLeft >= 1) installs = [{ title: "Mayfly", cost: playCostOf(mayfly) }];
    else {
      const missing = [...ICE_TYPES].filter((type) => !cov.has(type as any));
      const cards = missing.map((type) => obs.profile.breakers[type as "Barrier"].map((t) => inHand(obs, t)).find(Boolean));
      if (cards.some((c) => !c) || missing.length > memoryLeft) return null;
      installs = cards.map((c) => ({ title: c!.title, cost: playCostOf(c!) }));
    }
  } else if (unrezzed === 0 && t.damage > 0) return null;
  const draws = Math.max(0, accessRisk(obs, t) + 1 - (obs.hand.length - installs.length));
  if (draws > 3 || accessRisk(obs, t) >= 7) return null;
  const cost = installs.reduce((n, c) => n + c.cost, 0) + (t.viaMayfly ? t.credits - installs[0].cost : t.credits);
  return { installs, draws, cost };
}

function safeHand(obs: Observation, t: Target) {
  const adv = Math.max(0, ...t.server.content.map((c: any) => agendaProgress(c).have));
  const corpPoints = Number(obs.opp["agenda-point"] ?? 0);
  const need = Number(obs.opp["agenda-point-req"] ?? 7);
  const desperate = t.server.remote && adv >= 2 && corpPoints + 3 >= need;
  const required = desperate ? Math.min(2, requiredHand(obs, t)) : requiredHand(obs, t);
  return obs.hand.length > required;
}

function plan(obs: Observation, current: Plan | null): Plan {
  const keep = (kind: string, goal: string, detail?: Record<string, unknown>) => (current?.kind === kind ? { ...current, detail: { ...current.detail, ...detail } } : { kind, goal, since: obs.turn, detail });
  const points = Number(obs.me["agenda-point"] ?? 0);
  const need = Number(obs.me["agenda-point-req"] ?? 7);
  const cov = coverage(obs);
  const overclock = obs.hand.some((c) => c.title === "Overclock") ? 5 : 0;
  const reach = new Set(targets(obs, overclock, true).filter((t) => t.credits <= obs.credits + overclock + 2).map((t) => t.server.label));
  const threat = obs.servers.find((s) => s.remote && reach.has(s.label) && s.content.some((c: any) => agendaProgress(c).have >= 1 || (!c.rezzed && !c.title && s.ices.length > 0 && obs.turn >= 3 && cov.size >= 1)));
  if (threat && obs.credits >= 3 && (obs.hand.length >= 2 || Number(obs.opp["agenda-point"] ?? 0) + 3 >= need)) return keep("contest", `the Corp is setting up ${threat.label}: get into it before it scores`, { server: threat.label });
  if (points >= need - 2 && obs.credits >= 4) return keep("closing", "two points away: hit R&D and HQ every turn");
  if (obs.credits < 5 || cov.size < 2) return keep("setup", "economy first, then Cleaver, Unity and Carmen");
  return keep("pressure", "run the centrals with Jailbreak and Red Team, keep the remote honest");
}

function mulligan(obs: Observation) {
  const econ = obs.hand.filter((c) => isEconomyCard(obs, c)).length;
  const breakers = obs.hand.filter((c) => isIcebreaker(c) && c.title !== "Mayfly").length;
  const runs = obs.hand.filter((c) => ["Jailbreak", "Overclock", "Tread Lightly"].includes(c.title)).length;
  if (econ >= 1 && (breakers >= 1 || runs >= 1)) return { keep: true, why: `${econ} economy, ${breakers} breakers, ${runs} run events` };
  if (econ >= 2) return { keep: true, why: "two economy cards" };
  return { keep: false, why: "no economy to start with" };
}

function reserve(obs: Observation): number {
  const iced = obs.servers.filter((s) => s.remote && s.ices.length > 0 && s.content.some((c: any) => !c.rezzed || c.type === "Agenda"));
  if (!iced.length) return 4;
  const costs = iced.map((s) => estimateRun(obs, s, 3, 99).credits + 1);
  return Math.min(12, Math.max(4, Math.max(...costs)));
}

function bestServerChoice(obs: Observation, allowed: (label: string) => boolean, extra = 0, paid = 0): { label: string; why: string } | null {
  const list = targets(obs, extra, paid > 0).filter((t) => allowed(t.server.label) && t.credits <= obs.credits + extra && safeHand(obs, t));
  const t = [...list].sort((a, b) => b.value + (b.server.remote ? 0 : paid) - b.credits * 0.4 - (a.value + (a.server.remote ? 0 : paid) - a.credits * 0.4))[0];
  return t ? { label: t.server.label, why: `${t.server.label} is worth ${t.value.toFixed(1)}${paid ? ` plus ${paid} credits` : ""} for ${t.exact ? "" : "about "}${t.credits}` } : null;
}

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = [...base];
  const push = (p: Proposal | null) => p && out.push(p);
  const cov = coverage(obs);
  const ts = targets(obs);

  const gamble = inHand(obs, "Sure Gamble");
  if (gamble && obs.credits >= 5) push(proposal(playOf(obs, gamble), 75, "Sure Gamble: +4", "economy"));
  const commission = inHand(obs, "Creative Commission");
  if (commission && obs.credits >= 1) push(proposal(playOf(obs, commission), lastClick(obs) ? 74 : 40, lastClick(obs) ? "Creative Commission as the last click: +4 without losing a click" : "Creative Commission (loses a click)", "economy"));
  const vrcation = inHand(obs, "VRcation");
  if (vrcation && obs.credits >= 1 && obs.hand.length <= 3) push(proposal(playOf(obs, vrcation), lastClick(obs) ? 60 : 36, "VRcation: draw 4", "draw"));
  const telework = inHand(obs, "Telework Contract");
  if (telework && obs.credits >= 1 && !inRig(obs, "Telework Contract")) push(proposal(playOf(obs, telework), 70, "Telework Contract: 9 credits over three turns", "install-economy"));
  const smartware = inHand(obs, "Smartware Distributor");
  if (smartware && !inRig(obs, "Smartware Distributor")) push(proposal(playOf(obs, smartware), obs.turn <= 4 ? 58 : 36, "Smartware Distributor: free, slow income", "install-economy"));
  const redTeam = inHand(obs, "Red Team");
  if (redTeam && obs.credits >= 7 && cov.size >= 2) push(proposal(playOf(obs, redTeam), 64, "Red Team: paid runs on the centrals", "install-economy"));
  const penny = inHand(obs, "Pennyshaver");
  if (penny && obs.credits >= 8 && !inRig(obs, "Pennyshaver")) push(proposal(playOf(obs, penny), 46, "Pennyshaver: memory and a credit per successful run", "install"));
  const docklands = inHand(obs, "Docklands Pass");
  if (docklands && obs.credits >= 8) push(proposal(playOf(obs, docklands), 38, "Docklands Pass: a second HQ access", "install"));

  const rezzedTypes = new Set<string>();
  for (const s of obs.servers) for (const ice of s.ices) if (ice.rezzed) for (const t of ice.subtypes ?? []) rezzedTypes.add(t);
  const memoryLeft = Number(obs.me.memory?.available ?? 4) - Number(obs.me.memory?.used ?? 0);
  const seenTypes = seenIceTypes(obs);
  for (const type of ["Barrier", "Code Gate", "Sentry"] as const) {
    const title = obs.profile.breakers[type].find((t) => inHand(obs, t) && !inRig(obs, t)) ?? obs.profile.breakers[type].find((t) => inHand(obs, t));
    if (!title) continue;
    const card = inHand(obs, title);
    if (!card || inRig(obs, title) || memoryLeft < 1) continue;
    const discounted = /successful run this turn, this program costs/i.test(obs.info(card).text ?? "") && ranSuccessfullyThisTurn(obs);
    const cost = Math.max(0, playCostOf(card) - (discounted ? 2 : 0));
    if (cost > obs.credits) continue;
    const seen = seenTypes.has(type);
    const blocking = rezzedTypes.has(type) && !cov.has(type as any);
    const reserve = obs.credits - cost;
    const score = (blocking ? 72 : seen ? 66 : 54) + (discounted ? 6 : 0) - (reserve < 2 ? 20 : reserve < 4 ? 8 : 0) + (title === "Cleaver" ? 3 : 0);
    push(proposal(playOf(obs, card), score, `install ${title}${blocking ? ": rezzed ice of its type is in the way" : seen ? ": its ice type is on the board" : ""}${discounted ? " at a discount" : ""}`, "install-breaker"));
  }
  const mayfly = inHand(obs, "Mayfly");

  const favor = inHand(obs, "Mutual Favor");
  if (favor && obs.credits >= 0) {
    const missing = (["Barrier", "Code Gate", "Sentry"] as const).filter((t) => !cov.has(t) && obs.profile.breakers[t].length);
    if (missing.length && !missing.every((t) => obs.profile.breakers[t].some((title) => inHand(obs, title)))) {
      const ran = ranSuccessfullyThisTurn(obs);
      push(proposal(playOf(obs, favor), ran ? 66 : 50, `Mutual Favor: fetch a ${missing[0].toLowerCase()} breaker${ran ? " and install it" : ""}`, "play"));
    }
  }
  const getaway = inHand(obs, "Clean Getaway");
  if (getaway && obs.credits >= 3 && obs.memory.runsThisTurn < 2) {
    const t = targets(obs, 0, true).filter((x) => x.credits <= obs.credits - 3 && x.damage === 0 && safeHand(obs, x)).sort((a, b) => a.credits - b.credits)[0];
    if (t) push(proposal(playOf(obs, getaway), runScore({ ...t, value: t.value + 4 }, 1), `Clean Getaway into ${t.server.label}: +6 credits on success`, "run-event", t.exact));
  }
  const lieLow = inHand(obs, "Lie Low");
  if (lieLow && obs.clicks >= 2 && obs.credits >= 1) {
    if (Number(obs.me.tag?.base ?? 0) > 0) push(proposal(playOf(obs, lieLow), 72, "Lie Low: shed the tags", "play"));
    else if (obs.hand.length <= 2) push(proposal(playOf(obs, lieLow), 52, "Lie Low: draw four", "draw"));
  }
  const access = inHand(obs, "Maintenance Access");
  if (access && obs.clicks >= 2 && obs.memory.runsThisTurn < 2) {
    const hq = obs.servers.find((s) => s.key === "hq")!;
    const archives = obs.servers.find((s) => s.key === "archives")!;
    const viaArchives = estimateRun(obs, archives);
    const direct = estimateRun(obs, hq);
    if (!viaArchives.blocked && viaArchives.damage === 0 && (direct.blocked || direct.credits >= viaArchives.credits + 3) && viaArchives.credits <= obs.credits) push(proposal(playOf(obs, access), 60, `Maintenance Access: reach HQ through Archives for ${viaArchives.credits}`, "run-event", viaArchives.exact));
  }
  const jailbreak = inHand(obs, "Jailbreak");
  if (jailbreak && obs.memory.runsThisTurn < 2) {
    const central = ts.filter((t) => ["HQ", "R&D"].includes(t.server.label) && t.credits <= obs.credits && t.damage === 0 && safeHand(obs, t))[0];
    if (central) push(proposal(playOf(obs, jailbreak), runScore(central, 2.5), `Jailbreak into ${central.server.label}: two accesses and a card`, "run-event", central.exact));
  }
  const overclock = inHand(obs, "Overclock");
  if (overclock && obs.credits >= 1 && obs.memory.runsThisTurn < 2) {
    const t = ts.filter((x) => x.credits <= obs.credits + 4 && x.credits >= 3 && x.damage === 0 && safeHand(obs, x))[0];
    if (t) push(proposal(playOf(obs, overclock), runScore({ ...t, credits: Math.max(0, t.credits - 5) + 1 }, 1), `Overclock into ${t.server.label}: 5 credits pay for the ice`, "run-event", t.exact));
  }
  const tread = inHand(obs, "Tread Lightly");
  if (tread && obs.credits >= 1 && obs.memory.runsThisTurn < 2 && Number(obs.opp.credit ?? 0) <= 7) {
    const t = ts.filter((x) => x.server.ices.some((i: any) => !i.rezzed) && safeHand(obs, x))[0];
    if (t) push(proposal(playOf(obs, tread), runScore({ ...t, credits: 1 }, 1), `Tread Lightly into ${t.server.label}: the Corp cannot afford to rez`, "run-event", false));
  }
  const red = inRig(obs, "Red Team");
  if (red && obs.memory.notes["cancelled:Red Team"] !== obs.turn) {
    const ability = byCommand(obs, "ability", (c) => (c.args as any)?.card?.cid === red.cid)[0];
    const ranThisTurn = new Set(obs.memory.runs.filter((r) => r.turn === obs.turn).map((r) => r.server));
    const central = targets(obs, 0, true).filter((t) => !t.server.remote && !ranThisTurn.has(t.server.label) && t.credits <= obs.credits && t.damage === 0 && safeHand(obs, t)).sort((a, b) => b.value - b.credits * 0.4 - (a.value - a.credits * 0.4))[0];
    if (ability && central) push(proposal(ability, Math.max(runScore(central, 1.5), central.credits === 0 ? 56 : 0), `Red Team run on ${central.server.label}: +3 credits`, "click-economy", central.exact));
  }

  const drawsThisTurn = ((obs.memory.notes.kinds as string[] | undefined) ?? []).filter((k) => k === "draw").length;
  let planned = false;
  if (plan.kind === "contest") {
    const target = ts.find((t) => t.server.label === plan.detail?.server);
    const plan_ = target ? readiness(obs, target) : null;
    if (target && plan_ && plan_.cost <= obs.credits && plan_.installs.length + plan_.draws + 1 <= obs.clicks) {
      planned = true;
      const label = target.server.label;
      for (const inst of plan_.installs) {
        const card = inHand(obs, inst.title)!;
        push(proposal(playOf(obs, card), 76, `install ${inst.title} to get into ${label} this turn`, "install-breaker"));
      }
      if (plan_.draws > 0) {
        const draw = byCommand(obs, "draw")[0];
        if (draw) push(proposal(draw, 75, `draw up to survive the access in ${label} (${plan_.draws} more)`, "draw"));
      }
      if (!plan_.installs.length && !plan_.draws && safeHand(obs, target)) {
        for (const p of out) if (p.kind === "run" && p.why.startsWith(`run ${label}`)) {
          p.score = Math.max(p.score, 78);
          p.why += "; the rig covers every ice there";
        }
      }
    } else if (target) {
      for (const p of out) if (p.kind === "install-breaker" && !p.why.startsWith("install Mayfly") && target.server.ices.some((i: any) => !i.rezzed)) p.score = Math.max(p.score, 68);
      if (drawsThisTurn < 2 && !safeHand(obs, target) && obs.hand.length < 5 && requiredHand(obs, target) <= 5) {
        const draw = byCommand(obs, "draw")[0];
        if (draw) push(proposal(draw, 59, `draw up before contesting ${target.server.label}`, "draw"));
        if (vrcation && obs.credits >= 1) push(proposal(playOf(obs, vrcation), 66, `VRcation to refill the grip before contesting ${target.server.label}`, "draw"));
      }
    }
  }
  if (cov.size < 2 && obs.credits >= 6 && (obs.hand.length <= 4 || obs.credits >= 15) && drawsThisTurn < 3 && (obs.me["deck-count"] ?? 0) > 0) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 48, "draw: rich but the rig is missing breakers", "draw"));
  }
  const guarding = new Set<string>();
  for (const s of obs.servers) {
    if (s.remote && !s.content.length) continue;
    for (const i of s.ices) {
      if (!i.rezzed || (i.hosted ?? []).some((h: any) => h.side === "Runner")) continue;
      for (const t of i.subtypes ?? []) if (ICE_TYPES.has(t) && !cov.has(t as any)) guarding.add(t);
    }
  }
  const missingInDeck = [...guarding].filter((t) => obs.profile.breakers[t as "Barrier"].some((title) => !obs.hand.some((c) => c.title === title) && !inRig(obs, title)));
  if (missingInDeck.length && obs.credits >= 6 && (obs.hand.length <= 4 || obs.credits >= 10) && drawsThisTurn < 2 && (obs.me["deck-count"] ?? 0) > 0 && !obs.hand.some((c) => isIcebreaker(c) && (obs.profile.breakers[missingInDeck[0] as "Barrier"] ?? []).includes(c.title))) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 50, `draw: nothing in the rig breaks the ${missingInDeck.join("/")} ice that guards what matters`, "draw"));
  }
  const coversNewType = (c: any) => isIcebreaker(c) && c.title !== "Mayfly" && playCostOf(c) <= obs.credits && (breakerProfile(c, obs.info(c))?.breaks === "AI" || ((breakerProfile(c, obs.info(c))?.breaks as string[] | undefined) ?? []).some((t) => !cov.has(t as any)));
  const richNoRig = cov.size < 2 && obs.credits >= 12 && !obs.hand.some(coversNewType);
  if ((obs.credits >= 12 || richNoRig) && drawsThisTurn < 3 && obs.hand.length <= 5 && (obs.me["deck-count"] ?? 0) > 0) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, richNoRig ? 60 : obs.credits >= 20 ? 44 : 36, richNoRig ? "draw: rich with no rig, the breakers are the bottleneck" : "draw: credits are not the problem", "draw"));
  }
  if (obs.credits <= 3 && obs.hand.length <= 3 && drawsThisTurn < 2 && !obs.hand.some((c) => isEconomyCard(obs, c) && playCostOf(c) <= obs.credits) && (obs.me["deck-count"] ?? 0) > 0) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 46, "draw: poor and nothing in hand earns credits", "draw"));
  }
  const nothingToPlay = !out.some((p) => p.score >= 40 && p.kind !== "credit" && p.kind !== "draw");
  if (nothingToPlay && obs.credits >= 2 && obs.hand.length <= 5 && drawsThisTurn < 2 && (obs.me["deck-count"] ?? 0) > 0) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 45, "draw: nothing in hand is worth a click, find something", "draw"));
  }
  const punisher = tagPunisher(obs);
  const myTags = Number(obs.me.tag?.base ?? obs.me.tag?.total ?? 0);
  if (punisher && ranSuccessfullyThisTurn(obs) && obs.credits < 8 && Number(obs.opp.credit ?? 0) >= 4 && obs.clicks <= 2) {
    const credit = byCommand(obs, "credit")[0];
    if (credit) push(proposal(credit, 57, "take a credit: eight credits make Public Trail a tax instead of a tag", "credit"));
  }
  if (punisher && myTags > 0 && obs.credits < 2 && obs.hand.length < 5 && drawsThisTurn < 3 && (obs.me["deck-count"] ?? 0) > 0) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 76, "draw: tagged with no credits to clear it, so the grip must absorb meat damage", "draw"));
  }
  const thin = obs.hand.length <= 1;
  const floor = reserve(obs);
  const floorNear = floor - obs.credits <= 6;
  const lockedOut = obs.servers.filter((s) => !s.remote).every((s) => s.ices.some((i: any) => i.rezzed && !(i.subtypes ?? []).some((t: string) => ICE_TYPES.has(t) && cov.has(t as any)) && iceThreat(i, obs.info(i), obs.credits).etr));
  if (lockedOut && obs.credits >= 8) {
    const draw = byCommand(obs, "draw")[0];
    if (draw && obs.hand.length < 5 && drawsThisTurn < 3) push(proposal(draw, 58, "draw: the centrals are locked behind ice no breaker answers", "draw"));
    if (mayfly && memoryLeft >= 2 && obs.credits >= 10) push(proposal(playOf(obs, mayfly), 62, "Mayfly: the only way through the ice right now", "install-breaker"));
  }
  const uncoveredCentral = obs.servers.some((s) => !s.remote && s.ices.some((i: any) => i.rezzed && (i.subtypes ?? []).some((t: string) => ICE_TYPES.has(t)) && !(i.subtypes ?? []).some((t: string) => ICE_TYPES.has(t) && cov.has(t as any))));
  if (plan.kind === "closing" && mayfly && !inRig(obs, "Mayfly") && memoryLeft >= 1 && uncoveredCentral && obs.credits >= 6) {
    push(proposal(playOf(obs, mayfly), 64, "Mayfly: the last points sit behind ice no breaker answers", "install-breaker"));
  }
  const spend = (p: Proposal): number => {
    if (p.kind === "run" || p.kind === "run-event" || p.kind === "click-economy") {
      const t = ts.find((x) => p.why.includes(x.server.label));
      return t ? t.credits : 0;
    }
    if (p.kind.startsWith("install")) {
      const card = obs.hand.find((c) => p.why.includes(c.title));
      return card ? playCostOf(card) : 0;
    }
    return 0;
  };
  for (const p of out) {
    const cost = spend(p);
    if (cost > 0 && floorNear && obs.credits - cost < floor && !(plan.kind === "contest" && p.why.includes(String(plan.detail?.server))) && !(plan.kind === "closing" && (p.kind === "run" || p.kind === "run-event")) && !p.why.startsWith("install Cleaver") && !p.why.startsWith("install Unity") && !p.why.startsWith("install Carmen")) {
      p.score -= 15;
      p.why += ` (would drop below the ${floor} needed for the remote)`;
    }
  }
  if (obs.hand.length <= 2 && drawsThisTurn < 3 && (obs.me["deck-count"] ?? 0) > 0) {
    const safeRun = ts.some((t) => t.credits <= obs.credits && t.value >= 3 && safeHand(obs, t));
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, safeRun ? 52 : 70, safeRun ? "draw: too few cards to survive net damage" : "draw: nothing is safe to run with this grip", "draw"));
    if (vrcation && obs.credits >= 1) push(proposal(playOf(obs, vrcation), 74, "VRcation: refill the grip", "draw"));
  }
  for (const p of out) if (p.kind === "install-breaker" && p.why.startsWith("install Mayfly") && !planned) p.score = 20;
  for (const p of out) {
    if (thin && (p.kind === "install" || p.kind === "install-breaker" || p.kind === "install-economy") && obs.clicks <= 2) p.score -= 20;
    if (p.kind === "credit" && (obs.credits < 8 || (floorNear && obs.credits < floor)) && cov.size >= 2) p.score += 12;
    if (p.kind === "run" || p.kind === "run-event") {
      const t = ts.find((x) => p.why.includes(x.server.label));
      if (t && t.credits > 0 && obs.credits - t.credits < 3 && t.value < 5 && plan.kind !== "closing") p.score -= 22;
    }
    if (p.kind === "remove-tag" && punisher) p.score = 78;
    if (richNoRig && (p.kind === "click-economy" || p.kind === "credit")) p.score -= 15;
    if (obs.credits >= 20 && (p.kind === "economy" || p.kind === "click-economy" || p.kind === "install-economy" || p.kind === "credit")) p.score -= 18;
    if (p.kind === "run-event") {
      const t = ts.find((x) => p.why.includes(` into ${x.server.label}`));
      if (t && t.server.remote && t.server.ices.some((i: any) => !i.rezzed) && !fullyCovered(obs, t) && Number(obs.opp.credit ?? 0) >= 4 && t.value < 8) {
        p.score -= 14;
        p.why += " (an unrezzed ice may be one the rig cannot break)";
      }
    }
    if (p.kind === "run") {
      const t = ts.find((x) => p.why.startsWith(`run ${x.server.label}`));
      if (t && !safeHand(obs, t)) p.score -= 40;
      if (t && t.tags > 0 && punisher && !(obs.clicks >= 2 && obs.credits - t.credits >= 2) && !(plan.kind === "contest" && plan.detail?.server === t.server.label)) {
        p.score -= 30;
        p.why += " (a tag the Corp would punish before it can be cleared)";
      }
      if (t && t.server.ices.some((i: any) => !i.rezzed) && !fullyCovered(obs, t) && Number(obs.opp.credit ?? 0) >= 4 && t.value < 8) {
        p.score -= 12;
        p.why += " (an unrezzed ice may be one the rig cannot break)";
      }
      if (plan.kind === "contest" && t?.server.label === plan.detail?.server) p.score += 20;
      if (plan.kind === "closing" && t && !t.server.remote) p.score += 10;
      if (plan.kind === "setup" && t && t.credits > 0) p.score -= 10;
    }
    if (plan.kind === "setup" && (p.kind === "economy" || p.kind === "install-economy")) p.score += 6;
    if (p.kind === "install" && plan.kind === "contest") p.score -= 10;
  }
  return out;
}

function prompt(obs: Observation, plan: Plan): Proposal | null {
  const from = promptFrom(obs);
  const list = choices(obs);
  const serverChoices = list.filter((c) => /^(hq|r&d|archives|server \d+)$/i.test(choiceLabel(obs, c)));
  if (serverChoices.length) {
    const allowed = new Set(serverChoices.map((c) => choiceLabel(obs, c)));
    const extra = from === "Overclock" ? 5 : 0;
    const best = bestServerChoice(obs, (label) => allowed.has(label), extra, from === "Red Team" ? 3 : 0);
    if (best) {
      const c = serverChoices.find((x) => choiceLabel(obs, x) === best.label)!;
      return { move: choiceMove(obs, c), score: 80, why: `${from}: ${best.why}`, kind: "choice" };
    }
    const cancel = list.find((c) => /^cancel$/i.test(choiceLabel(obs, c)));
    if (cancel) {
      obs.memory.notes[`cancelled:${from}`] = obs.turn;
      return { move: choiceMove(obs, cancel), score: 75, why: `${from}: no server is safe to run`, kind: "choice" };
    }
    const cheapest = serverChoices.map((c) => ({ c, t: targets(obs, extra, true).find((t) => t.server.label === choiceLabel(obs, c)) })).sort((a, b) => (a.t?.damage ?? 9) - (b.t?.damage ?? 9) || (a.t?.credits ?? 9) - (b.t?.credits ?? 9))[0];
    return { move: choiceMove(obs, cheapest.c), score: 70, why: `${from}: ${choiceLabel(obs, cheapest.c)} is the least dangerous server offered`, kind: "choice" };
  }
  if (from === "Mutual Favor" && obs.promptType === "select") {
    const cov = coverage(obs);
    const missingType = (["Barrier", "Code Gate", "Sentry"] as const).find((t) => !cov.has(t));
    const pick = selectable(obs).find((c) => missingType && obs.profile.breakers[missingType].includes(c.title)) ?? selectable(obs)[0];
    if (pick) return { move: selectMove(obs, pick), score: 80, why: `Mutual Favor: fetch ${pick.title}`, kind: "select" };
  }
  const trash = list.find((c) => /pay (\d+) \[credits?\] to trash/i.test(choiceLabel(obs, c)));
  if (trash) {
    const cost = Number(choiceLabel(obs, trash).match(/pay (\d+)/i)?.[1] ?? 0);
    const card = obs.prompt?.card;
    const worth = card?.title === "Nico Campaign" || card?.title === "Regolith Mining License" || card?.type === "Upgrade" || card?.title === "Urtica Cipher";
    if (worth && obs.credits - cost >= 3) return { move: choiceMove(obs, trash), score: 70, why: `trash ${card.title} for ${cost}`, kind: "choice" };
    const no = findChoice(obs, /^no action$/i);
    if (no) return { move: choiceMove(obs, no), score: 60, why: `leave ${card?.title ?? "it"}: not worth ${cost}`, kind: "choice" };
  }
  if (/(memory|\[mu\])/i.test(obs.promptText) && obs.promptType === "select") {
    const cards = selectable(obs).filter((c) => c.type === "Program");
    const order = (c: any) => (c.title === "Mayfly" ? 0 : isIcebreaker(c) ? 2 : 1);
    const pick = [...cards].sort((a, b) => order(a) - order(b))[0];
    if (pick) return { move: selectMove(obs, pick), score: 70, why: `free memory by trashing ${pick.title}`, kind: "select" };
  }
  if (/discard down/i.test(obs.promptText) && obs.promptType === "select") {
    const cards = selectable(obs);
    const order = (c: any) => (isIcebreaker(c) && !obs.rig.some((r) => r.title === c.title) ? 5 : isEconomyCard(obs, c) ? 4 : c.type === "Hardware" ? 3 : c.title === "Mayfly" ? 1 : 2);
    const pick = [...cards].sort((a, b) => order(a) - order(b))[0];
    if (pick) return { move: selectMove(obs, pick), score: 60, why: `discard ${pick.title}`, kind: "select" };
  }
  return null;
}

function restOfRun(obs: Observation) {
  const server = runServer(obs);
  const position = Number(obs.run?.position ?? 0);
  if (!server || position <= 1) return 0;
  return estimateRun(obs, { ...server, ices: server.ices.slice(0, position - 1) }, 3, 99).credits;
}

function run(obs: Observation, plan: Plan): Proposal | null {
  const ice = obs.currentIce;
  const unbrokenSubs = (ice?.subroutines ?? []).filter((s: any) => !s.broken && !s.fired).length;
  if (obs.encounter && ice?.rezzed && (ice.subtypes ?? []).includes("Bioroid") && unbrokenSubs > 0) {
    const click = byCommand(obs, "runner-ability", (c) => (c.args as any)?.card?.cid === ice.cid)[0];
    const full = byCommand(obs, "dynamic-ability", (c) => /fully break/i.test(c.label)).map((c) => labelCost(c.label)).sort((a, b) => a - b)[0];
    const rest = restOfRun(obs);
    const poor = full === undefined || obs.credits - full < rest + 1;
    const pricey = full !== undefined && full >= 2 * unbrokenSubs && obs.clicks >= unbrokenSubs;
    if (click && poor && obs.clicks >= unbrokenSubs) return fromCandidate(click, 86, `spend a click on ${ice.title}: paying ${full ?? "to break"} would leave too little for the ${rest} the rest of the run costs`, "break");
    if (click && pricey) return fromCandidate(click, 84, `spend a click on ${ice.title}: ${unbrokenSubs} clicks are cheaper than ${full} credits`, "break");
    if (click && obs.clicks >= 2 && obs.credits < 4) return fromCandidate(click, 82, `spend a click to break a ${ice.title} subroutine instead of credits`, "break");
  }
  return runnerRun(obs);
}

export const centralPressure = { mulligan, plan, proposals, prompt, run, targets, safeHand, requiredHand, accessRisk, readiness, reserve, bestServerChoice, runScore, inHand, inRig, ranSuccessfullyThisTurn, lastClick, isEconomyCard, seenIceTypes, restOfRun };

export const gatewayRunner: DeckPolicy = registerPolicy({
  id: "gateway-runner-catalyst",
  version: "0.5.0",
  side: "runner",
  decks: [GATEWAY_RUNNER_BEGINNER, GATEWAY_RUNNER_INTERMEDIATE],
  ...centralPressure,
});

