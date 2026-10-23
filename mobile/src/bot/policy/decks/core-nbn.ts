import { byCommand } from "../observe.ts";
import { cardAction, playOf, proposal } from "../generic.ts";
import { choiceMove, findChoice, promptFrom, selectMove, selectable } from "../prompts.ts";
import { registerPolicy } from "../registry.ts";
import { agendaProgress, tagged } from "../tactics.ts";
import type { DeckPolicy, Observation, Plan, Proposal } from "../types.ts";
import { CORE_NBN } from "./core.ts";
import { glacier } from "./gateway-corp.ts";

const runnerTags = (obs: Observation) => Number(obs.opp.tag?.base ?? obs.opp.tag?.total ?? 0);
const ranLastTurn = (obs: Observation) => {
  const seen = (obs.memory.notes.runsSeen ?? {}) as Record<string, number[]>;
  return Object.values(seen).some((turns) => turns.includes(obs.turn - 1) || turns.includes(obs.turn));
};
const runnerResources = (obs: Observation): any[] => obs.view.runner?.rig?.resource ?? [];
const runnerRig = (obs: Observation): any[] => [...(obs.view.runner?.rig?.program ?? []), ...(obs.view.runner?.rig?.hardware ?? [])];

function proposals(obs: Observation, plan: Plan, base: Proposal[]): Proposal[] {
  const out = glacier.proposals(obs, plan, base);
  const push = (p: Proposal | null) => p && out.push(p);
  const tags = runnerTags(obs);
  const isTagged = tagged(obs.view) || tags > 0;
  const runnerCredits = Number(obs.opp.credit ?? 0);

  const trail = glacier.inHand(obs, "Public Trail");
  if (trail && obs.credits >= 4 && ranLastTurn(obs) && !isTagged) {
    const bite = runnerCredits < 8 ? 64 : runnerCredits < 12 ? 52 : 30;
    push(proposal(playOf(obs, trail), bite, runnerCredits < 8 ? "Public Trail: the Runner cannot pay eight, the tag sticks" : "Public Trail: tax eight credits or tag", "tag"));
  }
  const retribution = glacier.inHand(obs, "Retribution");
  if (retribution && isTagged && obs.credits >= 1 && runnerRig(obs).length) push(proposal(playOf(obs, retribution), 78, "Retribution: trash a program or hardware while the Runner is tagged", "punish"));
  const picture = glacier.inHand(obs, "Bigger Picture");
  if (picture && isTagged) push(proposal(playOf(obs, picture), runnerCredits >= 5 ? 72 : 50, runnerCredits >= 5 ? `Bigger Picture: ${Math.min(runnerCredits, 5 * tags)} credits change hands` : "Bigger Picture: one more tag", "punish"));
  if (isTagged && obs.credits >= 2 && runnerResources(obs).length) {
    const trash = byCommand(obs, "trash-resource")[0];
    const worth = runnerResources(obs).some((r: any) => Number(r.counter?.credit ?? 0) > 0 || /job|connection/i.test((r.subtypes ?? []).join(" ")));
    if (trash) push(proposal(trash, worth ? 66 : 48, "trash a resource while the Runner is tagged", "punish"));
  }
  const spin = glacier.inHand(obs, "Spin Doctor");
  if (spin && obs.hand.length <= 4 && obs.credits >= 1) push(proposal(playOf(obs, spin, "New remote"), 52, "Spin Doctor: two cards on rez", "install-economy"));
  const idio = glacier.inHand(obs, "Idiosyncresis");
  const bait = glacier.remotes(obs).find((s) => s.ices.length > 0 && !s.content.length);
  if (idio && obs.credits >= 3 && (bait || glacier.remotes(obs).length <= 3)) push(proposal(playOf(obs, idio, bait ? bait.label : "New remote"), bait ? 50 : 42, "Idiosyncresis: advance it as a bluff and cash it later", "install-trap"));
  for (const s of glacier.remotes(obs)) {
    for (const card of s.content) {
      if (card.title === "Idiosyncresis" && agendaProgress(card).have < 2 && obs.credits >= 4 && !obs.hand.some((c) => c.type === "Agenda" && glacier.remotes(obs).some((r) => r.ices.length > 0 && !r.content.length))) push(proposal(cardAction(obs, card, "advance"), 40, "advance Idiosyncresis: looks like an agenda and pays later", "bluff"));
      if (card.title === "Spin Doctor" && !card.rezzed && obs.hand.length <= 4) push(proposal(cardAction(obs, card, "rez"), 56, "rez Spin Doctor: draw two", "rez-economy"));
    }
  }
  const amaze = glacier.inHand(obs, "AMAZE Amusements");
  const scoring = glacier.scoringRemote(obs) ?? bait;
  if (amaze && scoring && obs.credits >= 1 && !scoring.content.some((c: any) => c.title === "AMAZE Amusements")) push(proposal(playOf(obs, amaze, scoring.label), 46, `AMAZE Amusements in ${scoring.label}: a steal costs two tags`, "install-upgrade"));
  for (const p of out) {
    if (p.kind === "install-agenda" && isTagged && obs.hand.some((c) => c.title === "Orbital Superiority" && p.why.includes(c.title))) p.score += 6;
    if (p.kind === "install-ice" && isTagged && /Lamplighter|Doomscroll/.test(p.why)) p.score += 4;
  }
  return out;
}

function prompt(obs: Observation, plan: Plan): Proposal | null {
  const deck = glacier.prompt(obs, plan);
  if (deck) return deck;
  const from = promptFrom(obs);
  const text = obs.promptText;
  if (from === "Idiosyncresis" && /trash/i.test(text) && obs.promptType !== "select") {
    const card = obs.servers.flatMap((s) => s.content).find((c: any) => c.title === "Idiosyncresis");
    const adv = card ? agendaProgress(card).have : 0;
    const yes = findChoice(obs, /^yes$/i);
    const no = findChoice(obs, /^no$/i);
    if (yes && adv >= 2) return { move: choiceMove(obs, yes), score: 70, why: `Idiosyncresis: cash ${adv * 3} credits and cost the Runner ${adv * 2}`, kind: "choice" };
    if (no) return { move: choiceMove(obs, no), score: 60, why: "Idiosyncresis: keep advancing it", kind: "choice" };
  }
  if (from === "Predictive Planogram" && obs.promptType !== "select") {
    const both = findChoice(obs, /both|gain 3.*draw 3/i);
    if (both) return { move: choiceMove(obs, both), score: 80, why: "Predictive Planogram: credits and cards", kind: "choice" };
  }
  if (from === "NBN: Reality Plus" && obs.promptType !== "select") {
    const want = obs.hand.length <= 3 ? /draw/i : /credit/i;
    const c = findChoice(obs, want) ?? findChoice(obs, /credit|draw/i);
    if (c) return { move: choiceMove(obs, c), score: 70, why: obs.hand.length <= 3 ? "Reality Plus: two cards" : "Reality Plus: two credits", kind: "choice" };
  }
  if (from === "Bigger Picture" && obs.promptType !== "select") {
    const runnerCredits = Number(obs.opp.credit ?? 0);
    const c = findChoice(obs, runnerCredits >= 5 ? /remove|loses/i : /give|tag/i);
    if (c) return { move: choiceMove(obs, c), score: 70, why: runnerCredits >= 5 ? "Bigger Picture: take their credits" : "Bigger Picture: another tag", kind: "choice" };
  }
  if (from === "Next Big Thing" && /shuffle/i.test(text) && obs.promptType === "select") {
    const pick = selectable(obs).find((c: any) => c.type === "Agenda");
    const done = findChoice(obs, /^done$/i);
    if (pick) return { move: selectMove(obs, pick), score: 60, why: `Next Big Thing: shuffle ${pick.title} away from HQ`, kind: "select" };
    if (done) return { move: choiceMove(obs, done), score: 50, why: "Next Big Thing: keep the hand", kind: "select" };
  }
  return null;
}

export const coreNbn: DeckPolicy = registerPolicy({
  id: "core-nbn-tags",
  version: "0.2.0",
  side: "corp",
  decks: [CORE_NBN],
  ...glacier,
  proposals,
  prompt,
});
