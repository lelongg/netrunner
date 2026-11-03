import { cardAction, playOf, proposal } from "../generic.ts";
import { choiceMove, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { agendaProgress, coverage, iceTypes, isIcebreaker, playCostOf, rezCostOf } from "../tactics.ts";
import type { Observation, Plan, Proposal } from "../types.ts";
import { corpExtra, runnerExtra } from "./extras.ts";
import { glacier } from "./gateway-corp.ts";

type Push = (p: Proposal | null) => void;

const remaining = (card: any) => {
  const { have, need } = agendaProgress(card);
  return Math.max(0, need - have);
};

function corpCards(obs: Observation, plan: Plan, out: Proposal[], push: Push) {
  const cash = glacier.inHand(obs, "Petty Cash");
  const cashPlay = cash && playOf(obs, cash);
  if (cashPlay && obs.credits >= 3) push(proposal(cashPlay, obs.credits <= 4 ? 66 : obs.credits <= 12 ? 56 : 40, "Petty Cash: five credits before any other action", "economy"));

  const installed = glacier.agendaIn(obs);
  const left = installed ? remaining(installed.card) : 99;
  const nano = glacier.inHand(obs, "Nanomanagement");
  if (nano && installed && obs.clicks >= 1 && left > obs.clicks && left <= obs.clicks + 1 && obs.credits - 4 >= left) push(proposal(playOf(obs, nano), 66, `Nanomanagement: two more clicks score ${installed.card.title} this turn`, "fast-advance"));

  const touch = glacier.inHand(obs, "Touch-ups");
  if (touch && installed && installed.server.ices.length > 0 && obs.clicks >= 2 && left >= 2 && obs.credits >= 2) push(proposal(playOf(obs, touch), left - 2 <= obs.clicks - 2 ? 72 : 68, `Touch-ups: two counters on ${installed.card.title} and two cards out of the grip`, "fast-advance"));

  const measured = glacier.inHand(obs, "Measured Response");
  const measuredPlay = measured && playOf(obs, measured);
  if (measuredPlay && obs.credits >= 5) {
    const theirs = Number(obs.opp.credit ?? 0);
    push(proposal(measuredPlay, theirs < 8 ? 74 : theirs < 12 ? 40 : 20, theirs < 8 ? "Measured Response: four meat damage the Runner cannot pay off" : "Measured Response: tax eight credits", "punish"));
  }

  const grid = glacier.inHand(obs, "Mahkota Langit Grid");
  const home = glacier.scoringRemote(obs) ?? glacier.remotes(obs).find((r) => r.ices.length > 0 && r.content.some((c: any) => c.type === "Asset"));
  if (grid && home && home.ices.length > 0 && !home.content.some((c: any) => c.type === "Upgrade") && obs.credits >= 3) push(proposal(playOf(obs, grid, home.label), 40, `Mahkota Langit Grid in ${home.label}: two credits a turn for its rezzes`, "install-upgrade"));
  const mercia = glacier.inHand(obs, "Mercia B4LL4RD");
  if (mercia && obs.hand.some((c) => c.type === "ICE") && obs.credits >= 3 && !obs.servers.some((r) => r.content.some((c: any) => c.title === "Mercia B4LL4RD"))) push(proposal(playOf(obs, mercia, "HQ"), 38, "Mercia B4LL4RD: an extra ice install every turn", "install-upgrade"));
  const topDown = glacier.inHand(obs, "Top-Down Solutions");
  if (topDown && obs.hand.length <= 4 && obs.credits >= 3 && obs.clicks >= 1) push(proposal(playOf(obs, topDown), 44, "Top-Down Solutions: two cards and two installs for one click", "draw"));

  for (const s of obs.servers) {
    for (const card of s.content) {
      if (card.title === "Mahkota Langit Grid" && !card.rezzed && obs.credits >= rezCostOf(card) && [...s.ices, ...s.content].some((c: any) => !c.rezzed && c !== card)) push(proposal(cardAction(obs, card, "rez"), 42, "rez Mahkota Langit Grid: its credits pay for this server", "rez-economy"));
    }
  }
  for (const s of glacier.remotes(obs)) {
    for (const card of s.content) {
      if (card.title === "Otto Campaign" && !card.rezzed && obs.credits >= 2) push(proposal(cardAction(obs, card, "rez"), 50, "rez Otto Campaign: six credits over three turns", "rez-economy"));
    }
  }
}

function corpPrompt(obs: Observation): Proposal | null {
  const from = promptFrom(obs);
  if (from === "Peer Review" && obs.promptType === "select") {
    const pick = [...selectable(obs)].filter((c: any) => c.type === "Asset" || c.type === "Upgrade").sort((a: any, b: any) => (b.type === "Asset" ? 1 : 0) - (a.type === "Asset" ? 1 : 0))[0];
    const done = findChoice(obs, /^done$/i);
    if (pick) return { move: selectMove(obs, pick), score: 60, why: `Peer Review: install ${pick.title} for free`, kind: "select" };
    if (done) return { move: choiceMove(obs, done), score: 55, why: "Peer Review: nothing worth installing blind", kind: "select" };
  }
  if (from === "Touch-ups" && obs.promptType === "select") {
    const options = [...selectable(obs)];
    const pick = options.find((c: any) => c.side === "Corp" && c.type === "Agenda") ?? options.find((c: any) => c.side === "Corp");
    if (pick) return { move: selectMove(obs, pick), score: 70, why: `Touch-ups: advance ${pick.title}`, kind: "select" };
  }
  if (from === "Touch-ups" && obs.promptType !== "select") {
    const type = findChoice(obs, /^event$/i) ?? findChoice(obs, /^program$/i);
    if (type) return { move: choiceMove(obs, type), score: 60, why: `Touch-ups: send ${String(type.value).toLowerCase()}s back`, kind: "choice" };
  }
  if (from === "Top-Down Solutions" && obs.promptType === "select") {
    const options = [...selectable(obs)].filter((c: any) => c.side === "Corp");
    const pick = options.filter((c: any) => c.type === "ICE").sort((a: any, b: any) => glacier.iceRank(obs, b) - glacier.iceRank(obs, a))[0] ?? options.find((c: any) => c.type === "Asset");
    const done = findChoice(obs, /^done$/i);
    if (pick) return { move: selectMove(obs, pick), score: 60, why: `Top-Down Solutions: install ${pick.title}`, kind: "select" };
    if (done) return { move: choiceMove(obs, done), score: 55, why: "Top-Down Solutions: nothing to install", kind: "select" };
  }
  return null;
}

corpExtra(corpCards, corpPrompt);

const memoryLeft = (obs: Observation) => Number(obs.me.memory?.available ?? 4) - Number(obs.me.memory?.used ?? 0);
const inRig = (obs: Observation, title: string) => obs.rig.find((c: any) => c.title === title);

function chromatophoresHost(obs: Observation): any | null {
  const cov = coverage(obs);
  if (!cov.size) return null;
  return obs.servers
    .flatMap((s) => s.ices.map((ice: any) => ({ ice, s })))
    .filter(({ ice }) => ice.rezzed && iceTypes(ice).length > 0 && iceTypes(ice).every((t) => !cov.has(t)) && !(ice.hosted ?? []).some((h: any) => h.title === "Chromatophores"))
    .sort((a, b) => (b.s.key === "rd" || b.s.key === "hq" || b.s.remote ? 1 : 0) - (a.s.key === "rd" || a.s.key === "hq" || a.s.remote ? 1 : 0) || (b.ice.subroutines ?? []).length - (a.ice.subroutines ?? []).length)[0]?.ice ?? null;
}

function runnerCards(obs: Observation, plan: Plan, out: Proposal[], push: Push) {
  const mu = memoryLeft(obs);
  const hand = (title: string) => obs.hand.find((c) => c.title === title);
  const chroma = hand("Chromatophores");
  const host = chroma && mu >= 1 && obs.credits >= 1 ? chromatophoresHost(obs) : null;
  if (chroma && host) push(proposal(playOf(obs, chroma), 52, `Chromatophores on ${host.title}: any breaker can break it`, "install"));
  const pass = hand("Docklands Pass");
  if (pass && !inRig(obs, "Docklands Pass") && obs.credits >= 4) push(proposal(playOf(obs, pass), 40, "Docklands Pass: an extra HQ access every turn", "install"));
  const shaver = hand("Pennyshaver");
  if (shaver && !obs.rig.some((c: any) => (c.subtypes ?? []).includes("Console")) && obs.credits >= 3) push(proposal(playOf(obs, shaver), 46, "Pennyshaver: memory and a credit for every successful run", "install"));
  const scrounge = hand("Scrounge");
  if (scrounge && obs.clicks >= 2) {
    const heap = (obs.me.discard ?? []).filter((c: any) => c.type === "Program" && !inRig(obs, c.title) && Number(obs.info(c).memoryunits ?? 1) <= mu && playCostOf(c) + 1 <= obs.credits);
    const best = heap.sort((a: any, b: any) => (isIcebreaker(b) ? 1 : 0) - (isIcebreaker(a) ? 1 : 0) || playCostOf(b) - playCostOf(a))[0];
    if (best) push(proposal(playOf(obs, scrounge), isIcebreaker(best) ? 58 : 44, `Scrounge: bring back ${best.title}`, "play"));
  }
}

function runnerPrompt(obs: Observation): Proposal | null {
  if (promptFrom(obs) === "Scrounge" && obs.promptType === "select") {
    const mu = memoryLeft(obs);
    const options = [...selectable(obs)].filter((c: any) => c.type === "Program");
    const pick = options.filter((c: any) => !inRig(obs, c.title) && Number(obs.info(c).memoryunits ?? 1) <= mu && playCostOf(c) <= obs.credits).sort((a: any, b: any) => (isIcebreaker(b) ? 1 : 0) - (isIcebreaker(a) ? 1 : 0) || playCostOf(b) - playCostOf(a))[0] ?? options[0];
    if (pick) return { move: selectMove(obs, pick), score: 70, why: `Scrounge: install ${pick.title}`, kind: "select" };
  }
  if (promptFrom(obs) === "Chromatophores" && obs.promptType === "select") {
    const best = chromatophoresHost(obs);
    const pick = [...selectable(obs)].find((c: any) => best && c.cid === best.cid) ?? [...selectable(obs)].find((c: any) => c.rezzed);
    if (pick) return { move: selectMove(obs, pick), score: 70, why: `Chromatophores: host it on ${pick.title}`, kind: "select" };
  }
  return null;
}

runnerExtra(runnerCards, runnerPrompt);
