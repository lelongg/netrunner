import { cardWorth, choiceLabel, choiceMove, choices, findChoice, promptFrom, selectMove, selectable } from "./prompts.ts";
import { agendaProgress, iceThreat, strengthOf } from "./tactics.ts";
import type { Observation, Proposal } from "./types.ts";

const yes = (obs: Observation, score: number, why: string): Proposal | null => {
  const c = findChoice(obs, /^yes$/i);
  return c ? { move: choiceMove(obs, c), score, why, kind: "choice" } : null;
};
const no = (obs: Observation, score: number, why: string): Proposal | null => {
  const c = findChoice(obs, /^no$/i);
  return c ? { move: choiceMove(obs, c), score, why, kind: "choice" } : null;
};
const pickChoice = (obs: Observation, re: RegExp, score: number, why: string): Proposal | null => {
  const c = findChoice(obs, re);
  return c ? { move: choiceMove(obs, c), score, why, kind: "choice" } : null;
};
const runnerGrip = (obs: Observation) => Number((obs.side === "runner" ? obs.me : obs.opp)["hand-count"] ?? (obs.side === "runner" ? obs.hand.length : 0));
const corpAgendaIn = (obs: Observation, server: any) => server?.content?.some((c: any) => c.type === "Agenda" || (!c.rezzed && !c.title));

function corpOwnSelect(obs: Observation, msg: string): Proposal[] {
  const cards = selectable(obs);
  const mine = cards.filter((c) => c.side === "Corp");
  const done = choices(obs).find((c) => c.value === "Done");
  const out: Proposal[] = [];
  const least = (list: any[]) => [...list].sort((a, b) => cardWorth(obs, a) - cardWorth(obs, b))[0];
  if (/in hq to trash|cards? in hq to trash|choose any number of cards in hq/i.test(msg)) {
    const junk = mine.filter((c) => c.type !== "Agenda");
    const pick = least(junk);
    if (/any number/i.test(msg)) {
      if (done) out.push({ move: choiceMove(obs, done), score: 40, why: "keep the hand", kind: "select" });
      return out;
    }
    if (pick) out.push({ move: selectMove(obs, pick), score: 50, why: `trash ${pick.title} rather than an agenda`, kind: "select" });
    else if (mine[0]) out.push({ move: selectMove(obs, mine[0]), score: 30, why: "only agendas to trash", kind: "select" });
    return out;
  }
  if (/keep private/i.test(msg)) {
    const pick = [...mine].sort((a, b) => cardWorth(obs, b) - cardWorth(obs, a))[0];
    if (pick) out.push({ move: selectMove(obs, pick), score: 50, why: `keep ${pick.title} hidden`, kind: "select" });
    return out;
  }
  if (/shuffle|targets for longevity serum|into r&d/i.test(msg)) {
    const pick = mine.find((c) => c.type === "Agenda") ?? mine.find((c) => c.type === "ICE") ?? mine[0];
    if (pick) out.push({ move: selectMove(obs, pick), score: 50, why: `shuffle ${pick.title} back into R&D`, kind: "select" });
    if (done) out.push({ move: choiceMove(obs, done), score: 20, why: "done shuffling", kind: "select" });
    return out;
  }
  if (/install/i.test(msg) && !/ice/i.test(msg)) {
    const safeTypes = ["ICE", "Asset", "Upgrade"];
    const pick = [...mine].filter((c) => safeTypes.includes(c.type)).sort((a, b) => cardWorth(obs, b) - cardWorth(obs, a))[0];
    if (pick) out.push({ move: selectMove(obs, pick), score: 50, why: `install ${pick.title}`, kind: "select" });
    else if (done) out.push({ move: choiceMove(obs, done), score: 40, why: "nothing worth installing", kind: "select" });
    return out;
  }
  if (/add .* to hq|from archives/i.test(msg)) {
    const pick = mine.find((c) => c.type === "ICE") ?? [...mine].sort((a, b) => cardWorth(obs, b) - cardWorth(obs, a))[0];
    if (pick) out.push({ move: selectMove(obs, pick), score: 50, why: `recover ${pick.title}`, kind: "select" });
    if (done) out.push({ move: choiceMove(obs, done), score: 20, why: "recover nothing", kind: "select" });
    return out;
  }
  return out;
}

export function cardPrompt(obs: Observation): Proposal[] {
  const from = promptFrom(obs);
  const msg = obs.promptText;
  const type = obs.promptType;
  const out: Proposal[] = [];
  const push = (p: Proposal | null) => p && out.push(p);
  if (obs.side === "corp") {
    if (type === "select") return corpOwnSelect(obs, msg);
    if (from === "Byte!" && /pay \d+/i.test(msg)) {
      const grip = runnerGrip(obs);
      const cost = Number(msg.match(/pay (\d+)/i)?.[1] ?? 4);
      if (obs.credits >= cost && (grip <= 3 || obs.credits >= cost + 4)) push(yes(obs, 80, grip <= 3 ? "Byte!: three net damage could flatline" : "Byte!: tag and three net damage"));
      else push(no(obs, 60, "Byte!: too expensive right now"));
      return out;
    }
    if (from === "Wildcat Strike" && /choose one/i.test(msg)) {
      const grip = runnerGrip(obs);
      push(pickChoice(obs, grip >= 4 ? /gain 6/i : /draw 4/i, 70, grip >= 4 ? "Wildcat Strike: cards would be discarded anyway, deny nothing" : "Wildcat Strike: deny the credits"));
      push(pickChoice(obs, /draw 4/i, 60, "Wildcat Strike: cards rather than credits"));
      return out;
    }
    if (from === "Anoetic Void" && /pay 2|trash 2/i.test(msg)) {
      const server = obs.servers.find((s) => s.key === obs.run?.server?.[0]);
      const junk = obs.hand.filter((c) => c.type !== "Agenda").length;
      if (server && corpAgendaIn(obs, server) && obs.credits >= 2 && obs.hand.length >= 2 && junk >= 1) push(yes(obs, 85, "Anoetic Void: end the run on the scoring remote"));
      else push(no(obs, 60, "Anoetic Void: not worth two cards here"));
      return out;
    }
    if (from === "Sericulture Expansion" && /advancement/i.test(msg) && type !== "select") {
      push(yes(obs, 70, "Sericulture Expansion: two free advancements"));
      return out;
    }
    if (from === "Haas-Bioroid: Precision Design" && /archives/i.test(msg) && type !== "select") {
      push(yes(obs, 60, "Precision Design: take a card back from Archives"));
      return out;
    }
    return out;
  }
  if (from === "Karunā" && /jack out/i.test(msg)) {
    const grip = obs.hand.length;
    const server = obs.servers.find((s) => s.key === obs.run?.server?.[0]);
    const worth = server ? server.content.some((c: any) => c.type === "Agenda" || (!c.rezzed && !c.title && agendaProgress(c).have > 0)) || !server.remote : false;
    if (grip <= 3 || (!worth && grip <= 4)) push(yes(obs, 80, "Karunā: jack out before the second hit"));
    else push(no(obs, 70, "Karunā: take the second hit and get in"));
    return out;
  }
  if (from === "Semak-samun" && /choose one/i.test(msg)) {
    const grip = obs.hand.length;
    const server = obs.servers.find((s) => s.key === obs.run?.server?.[0]);
    const worth = server ? server.content.some((c: any) => c.type === "Agenda" || (!c.rezzed && !c.title)) || server.key === "rd" || server.key === "hq" : false;
    if (grip >= 5 && worth) push(pickChoice(obs, /damage/i, 70, "Semak-samun: take the damage, the server is worth it"));
    push(pickChoice(obs, /end the run/i, 60, "Semak-samun: end the run rather than lose three cards"));
    return out;
  }
  if (from === "Gourmand" && /trash/i.test(msg) && type !== "select") {
    const accessed = obs.prompt?.card;
    push(yes(obs, 65, `Gourmand: trash ${accessed?.title ?? "the card"} for free and draw`));
    return out;
  }
  if (type === "other" && /^choose one$/i.test(msg)) {
    for (const c of choices(obs)) {
      const label = choiceLabel(obs, c);
      if (/damage/i.test(label)) push({ move: choiceMove(obs, c), score: 5, why: "avoid the damage", kind: "choice" });
    }
  }
  return out;
}

export const flatlineThreat = (obs: Observation, ice: any) => iceThreat({ ...ice, subroutines: ice.subroutines ?? [] }, obs.info(ice)).damage >= runnerGrip(obs) && strengthOf(ice) >= 0;
