import { byCommand } from "../observe.ts";
import { playOf, proposal, serverValue } from "../generic.ts";
import { choiceLabel, choiceMove, choices, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { registerPolicy } from "../registry.ts";
import { fromCandidate, runnerRun } from "../runs.ts";
import { agendaProgress, coverage, estimateRun, isIcebreaker, playCostOf } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal, ServerInfo } from "../types.ts";
import { GATEWAY_RUNNER_BEGINNER, GATEWAY_RUNNER_INTERMEDIATE } from "./gateway.ts";

const ECONOMY = new Set(["Sure Gamble", "Creative Commission", "Telework Contract", "Smartware Distributor", "Red Team", "Wildcat Strike"]);
const BREAKER_ORDER = ["Cleaver", "Unity", "Carmen"];
const CORP_ICE_TYPES: Record<string, string> = { "Brân 1.0": "Barrier", Palisade: "Barrier", Diviner: "Code Gate", Whitespace: "Code Gate", Funhouse: "Code Gate", Karunā: "Sentry", Tithe: "Sentry" };

const inHand = (obs: Observation, title: string) => obs.hand.find((c) => c.title === title);
const inRig = (obs: Observation, title: string) => obs.rig.find((c) => c.title === title);
const ranSuccessfullyThisTurn = (obs: Observation) => obs.memory.runs.some((r) => r.turn === obs.turn && r.successful && obs.myTurn);
const lastClick = (obs: Observation) => obs.clicks === 1;
const runScore = (t: Target, bonus = 0) => 40 + (t.value + bonus - t.credits * 0.4 - t.damage * 1.5) * 4;

interface Target {
  server: ServerInfo;
  value: number;
  credits: number;
  exact: boolean;
  damage: number;
}

function targets(obs: Observation, extra = 0, includeWorthless = false): Target[] {
  const out: Target[] = [];
  for (const server of obs.servers) {
    const value = serverValue(obs, server);
    if (value <= 0 && !includeWorthless) continue;
    const est = estimateRun(obs, server, 3, obs.credits + extra);
    if (est.blocked) continue;
    out.push({ server, value, credits: est.credits, exact: est.exact, damage: est.damage });
  }
  return out.sort((a, b) => b.value - b.credits * 0.3 - (a.value - a.credits * 0.3));
}

function safeHand(obs: Observation, t: Target) {
  const adv = Math.max(0, ...t.server.content.map((c: any) => agendaProgress(c).have));
  const trapDamage = t.server.remote && t.server.content.some((c: any) => !c.rezzed && !c.title) ? 2 + adv : 0;
  const unrezzed = t.server.ices.filter((i: any) => !i.rezzed).length;
  const corpPoints = Number(obs.opp["agenda-point"] ?? 0);
  const need = Number(obs.opp["agenda-point-req"] ?? 7);
  const desperate = t.server.remote && adv >= 2 && corpPoints + 3 >= need;
  const corpCanRez = Number(obs.opp.credit ?? 0) >= 4;
  const required = desperate ? 2 : t.damage + trapDamage + (unrezzed ? (corpCanRez ? 3 : 2) : 0);
  return obs.hand.length >= 1 && obs.hand.length > required;
}

function plan(obs: Observation, current: Plan | null): Plan {
  const keep = (kind: string, goal: string, detail?: Record<string, unknown>) => (current?.kind === kind ? { ...current, detail: { ...current.detail, ...detail } } : { kind, goal, since: obs.turn, detail });
  const points = Number(obs.me["agenda-point"] ?? 0);
  const need = Number(obs.me["agenda-point-req"] ?? 7);
  const cov = coverage(obs);
  const threat = obs.servers.find((s) => s.remote && s.content.some((c: any) => agendaProgress(c).have >= 1 || (!c.rezzed && !c.title && s.ices.length > 0 && obs.turn >= 3 && cov.size >= 1)));
  if (threat && obs.credits >= 3) return keep("contest", `the Corp is setting up ${threat.label}: get into it before it scores`, { server: threat.label });
  if (points >= need - 2 && obs.credits >= 4) return keep("closing", "two points away: hit R&D and HQ every turn");
  if (obs.credits < 5 || cov.size < 2) return keep("setup", "economy first, then Cleaver, Unity and Carmen");
  return keep("pressure", "run the centrals with Jailbreak and Red Team, keep the remote honest");
}

function mulligan(obs: Observation) {
  const econ = obs.hand.filter((c) => ECONOMY.has(c.title)).length;
  const breakers = obs.hand.filter((c) => isIcebreaker(c) && c.title !== "Mayfly").length;
  const runs = obs.hand.filter((c) => ["Jailbreak", "Overclock", "Tread Lightly"].includes(c.title)).length;
  if (econ >= 1 && (breakers >= 1 || runs >= 1)) return { keep: true, why: `${econ} economy, ${breakers} breakers, ${runs} run events` };
  if (econ >= 2) return { keep: true, why: "two economy cards" };
  return { keep: false, why: "no economy to start with" };
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
  if (penny && obs.credits >= 5 && !inRig(obs, "Pennyshaver")) push(proposal(playOf(obs, penny), 50, "Pennyshaver: memory and a credit per successful run", "install"));
  const docklands = inHand(obs, "Docklands Pass");
  if (docklands && obs.credits >= 4) push(proposal(playOf(obs, docklands), 42, "Docklands Pass: a second HQ access", "install"));

  const rezzedTypes = new Set<string>();
  for (const s of obs.servers) for (const ice of s.ices) if (ice.rezzed) for (const t of ice.subtypes ?? []) rezzedTypes.add(t);
  for (const title of BREAKER_ORDER) {
    const card = inHand(obs, title);
    if (!card || inRig(obs, title)) continue;
    const cost = playCostOf(card);
    const discounted = title === "Carmen" && ranSuccessfullyThisTurn(obs);
    if (cost > obs.credits) continue;
    const type = title === "Cleaver" ? "Barrier" : title === "Unity" ? "Code Gate" : "Sentry";
    const seen = Object.entries(CORP_ICE_TYPES).some(([ice, t]) => obs.memory.opponentTitles.has(ice) && t === type);
    const blocking = rezzedTypes.has(type) && !cov.has(type as any);
    const reserve = obs.credits - cost;
    const score = (blocking ? 72 : seen ? 66 : 54) + (discounted ? 6 : 0) - (reserve < 2 ? 15 : 0) + (title === "Cleaver" ? 3 : 0);
    push(proposal(playOf(obs, card), score, `install ${title}${blocking ? ": rezzed ice of its type is in the way" : seen ? ": its ice type is on the board" : ""}${discounted ? " at a discount" : ""}`, "install-breaker"));
  }
  const mayfly = inHand(obs, "Mayfly");
  if (mayfly && cov.size < 3 && obs.credits >= 6 && plan.kind === "contest") push(proposal(playOf(obs, mayfly), 60, "Mayfly for one decisive run into the remote", "install-breaker"));

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

  if (plan.kind === "contest") {
    const target = ts.find((t) => t.server.label === plan.detail?.server);
    if (target && !safeHand(obs, target) && obs.hand.length < 5) {
      const draw = byCommand(obs, "draw")[0];
      if (draw) push(proposal(draw, 59, `draw up before contesting ${target.server.label}`, "draw"));
      if (vrcation && obs.credits >= 1) push(proposal(playOf(obs, vrcation), 66, `VRcation to refill the grip before contesting ${target.server.label}`, "draw"));
    }
  }
  const thin = obs.hand.length <= 1;
  if (obs.hand.length <= 2 && obs.clicks >= 2 && (obs.me["deck-count"] ?? 0) > 0) {
    const draw = byCommand(obs, "draw")[0];
    if (draw) push(proposal(draw, 52, "draw: too few cards to survive net damage", "draw"));
  }
  for (const p of out) {
    if (thin && (p.kind === "install" || p.kind === "install-breaker" || p.kind === "install-economy") && obs.clicks <= 2) p.score -= 20;
    if (p.kind === "run") {
      const t = ts.find((x) => p.why.startsWith(`run ${x.server.label}`));
      if (t && !safeHand(obs, t)) p.score -= 40;
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
    const want = BREAKER_ORDER.find((t) => !obs.rig.some((c) => c.title === t) && !(t === "Cleaver" ? cov.has("Barrier") : t === "Unity" ? cov.has("Code Gate") : cov.has("Sentry")));
    const pick = selectable(obs).find((c) => c.title === want) ?? selectable(obs)[0];
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
  if (/discard down/i.test(obs.promptText) && obs.promptType === "select") {
    const cards = selectable(obs);
    const order = (c: any) => (isIcebreaker(c) && !obs.rig.some((r) => r.title === c.title) ? 5 : ECONOMY.has(c.title) ? 4 : c.type === "Hardware" ? 3 : c.title === "Mayfly" ? 1 : 2);
    const pick = [...cards].sort((a, b) => order(a) - order(b))[0];
    if (pick) return { move: selectMove(obs, pick), score: 60, why: `discard ${pick.title}`, kind: "select" };
  }
  return null;
}

function run(obs: Observation, plan: Plan): Proposal | null {
  const ice = obs.currentIce;
  const unbroken = (ice?.subroutines ?? []).some((s: any) => !s.broken && !s.fired);
  if (obs.encounter && ice?.rezzed && ice.title === "Brân 1.0" && unbroken && obs.clicks >= 2 && obs.credits < 4) {
    const click = byCommand(obs, "runner-ability", (c) => (c.args as any)?.card?.cid === ice.cid)[0];
    if (click) return fromCandidate(click, 82, "spend a click to break a Brân subroutine instead of credits", "break");
  }
  return runnerRun(obs);
}

export const gatewayRunner: DeckPolicy = registerPolicy({
  id: "gateway-runner-catalyst",
  version: "0.2.0",
  side: "runner",
  decks: [GATEWAY_RUNNER_BEGINNER, GATEWAY_RUNNER_INTERMEDIATE],
  mulligan,
  plan,
  proposals,
  prompt,
  run,
});

