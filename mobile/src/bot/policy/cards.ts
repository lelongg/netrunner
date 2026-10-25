import { cardWorth, choiceLabel, choiceMove, choices, findChoice, promptFrom, selectMove, selectable } from "./prompts.ts";
import { agendaProgress, iceThreat, strengthOf, tagPunisher } from "./tactics.ts";
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
    const scoringRoot = obs.servers.some((s) => s.remote && s.ices.length > 0 && s.content.some((c: any) => c.type === "Agenda" || !c.rezzed));
    const emptyIced = obs.servers.some((s) => s.remote && s.ices.length > 0 && !s.content.length);
    const fits = (c: any) => c.type === "ICE" || (c.type === "Upgrade" && scoringRoot) || (c.type === "Asset" && emptyIced);
    const pick = [...mine].filter(fits).sort((a, b) => cardWorth(obs, b) - cardWorth(obs, a))[0];
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

const breakerFirst = (a: any, b: any) => (a.subtypes ?? []).includes("Icebreaker") ? -1 : (b.subtypes ?? []).includes("Icebreaker") ? 1 : Number(b.cost ?? 0) - Number(a.cost ?? 0);

function corpHostileSelect(obs: Observation, msg: string): Proposal[] {
  const cards = selectable(obs).filter((c) => c.side === "Runner");
  if (!cards.length) return [];
  let pick: any;
  if (/program/i.test(msg)) pick = [...cards].sort(breakerFirst)[0];
  else if (/resource/i.test(msg)) pick = [...cards].sort((a, b) => Number(b.counter?.credit ?? 0) - Number(a.counter?.credit ?? 0) || Number(b.cost ?? 0) - Number(a.cost ?? 0))[0];
  else pick = [...cards].sort(breakerFirst)[0];
  return pick ? [{ move: selectMove(obs, pick), score: 55, why: `trash ${pick.title}`, kind: "select" }] : [];
}

function installLocation(obs: Observation): Proposal[] {
  const out: Proposal[] = [];
  const labels = choices(obs).map((c) => ({ c, label: choiceLabel(obs, c) }));
  const card = obs.prompt?.card;
  if (card && card.type !== "ICE") {
    const root = card.type === "Upgrade" ? obs.servers.find((s) => s.remote && s.ices.length > 0 && s.content.some((c: any) => c.type === "Agenda" || !c.rezzed) && !s.content.some((c: any) => c.title === card.title)) : obs.servers.find((s) => s.remote && s.ices.length > 0 && !s.content.length);
    const hit = root ? labels.find((l) => l.label === root.label) : undefined;
    if (hit) out.push({ move: choiceMove(obs, hit.c), score: 60, why: `install ${card.title} in ${root!.label}`, kind: "choice" });
    const fresh = labels.find((l) => /new remote/i.test(l.label));
    if (fresh) out.push({ move: choiceMove(obs, fresh.c), score: 50, why: `install ${card.title} on a new remote`, kind: "choice" });
    return out;
  }
  const open = obs.servers.filter((s) => !s.remote && s.ices.length === 0);
  const naked = obs.servers.filter((s) => s.remote && s.ices.length === 0 && s.content.length);
  const scoring = obs.servers.filter((s) => s.remote && s.ices.length > 0 && s.content.some((c: any) => c.type === "Agenda" || !c.rezzed));
  const wanted = [...naked, ...open.filter((s) => s.key === "hq"), ...open, ...scoring].map((s) => s.label);
  for (const label of wanted) {
    const hit = labels.find((l) => l.label === label);
    if (hit) {
      out.push({ move: choiceMove(obs, hit.c), score: 60, why: `install it protecting ${label}`, kind: "choice" });
      return out;
    }
  }
  const remote = labels.find((l) => /new remote/i.test(l.label));
  if (remote) out.push({ move: choiceMove(obs, remote.c), score: 50, why: "install it on a new remote", kind: "choice" });
  return out;
}

export function cardPrompt(obs: Observation): Proposal[] {
  const from = promptFrom(obs);
  const msg = obs.promptText;
  const type = obs.promptType;
  const out: Proposal[] = [];
  const push = (p: Proposal | null) => p && out.push(p);
  if (obs.side === "corp") {
    if (type === "select" && /(program|resource|hardware|installed runner card) to trash|choose a target for (retribution|above the law|ballista)/i.test(msg)) return corpHostileSelect(obs, msg);
    if (type === "select") return corpOwnSelect(obs, msg);
    if (/^choose a location to install/i.test(msg)) return installLocation(obs);
    if (from === "Ballista" && /choose one/i.test(msg)) {
      const server = obs.servers.find((s) => s.key === obs.run?.server?.[0]);
      const programs: any[] = obs.view.runner?.rig?.program ?? [];
      if (server && corpAgendaIn(obs, server)) push(pickChoice(obs, /end the run/i, 70, "Ballista: end the run on the scoring remote"));
      if (programs.length) push(pickChoice(obs, /trash/i, 65, "Ballista: trash a program"));
      push(pickChoice(obs, /end the run/i, 50, "Ballista: end the run"));
      return out;
    }
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
  if (from === "Funhouse" && /choose one/i.test(msg)) {
    const server = obs.servers.find((s) => s.key === obs.run?.server?.[0]);
    const worth = server ? server.content.some((c: any) => c.type === "Agenda" || (!c.rezzed && !c.title)) || ((server.key === "rd" || server.key === "hq") && obs.credits >= 4) : false;
    const tags = Number(obs.me.tag?.base ?? 0);
    const nbn = /nbn/i.test(String(obs.opp.identity?.faction ?? obs.opp.identity?.title ?? ""));
    const scoring = server ? server.content.some((c: any) => c.type === "Agenda" || agendaProgress(c).have > 0) : false;
    const clearable = obs.clicks >= 1 && obs.credits >= 6;
    const safe = !tagPunisher(obs) || clearable || (scoring && obs.hand.length >= 5);
    if (worth && safe && obs.credits >= 2 && (tags === 0 || !nbn)) push(pickChoice(obs, /tag/i, 65, "Funhouse: take the tag, remove it later"));
    push(pickChoice(obs, /end the run/i, 55, tagPunisher(obs) && !safe ? "Funhouse: a tag here gets punished before it can be cleared" : "Funhouse: not worth a tag"));
    return out;
  }
  if (from === "Public Trail" && /choose one/i.test(msg)) {
    if (obs.credits >= 11) push(pickChoice(obs, /pay/i, 70, "Public Trail: pay rather than be tagged"));
    push(pickChoice(obs, /tag/i, 60, "Public Trail: take the tag and clear it next turn"));
    push(pickChoice(obs, /pay/i, 40, "Public Trail: pay"));
    return out;
  }
  if (from === "Mutual Favor" && /choose an icebreaker/i.test(msg)) {
    const covered = new Set(obs.rig.filter((c: any) => (c.subtypes ?? []).includes("Icebreaker")).flatMap((c: any) => c.subtypes ?? []));
    const seenTypes = new Set<string>();
    for (const s of obs.servers) for (const i of s.ices) if (i.rezzed) for (const t of i.subtypes ?? []) seenTypes.add(t);
    for (const title of obs.memory.opponentTitles) for (const t of obs.info({ title }).subtypes ?? []) if (["Barrier", "Code Gate", "Sentry"].includes(t)) seenTypes.add(t);
    const missing = (["Barrier", "Code Gate", "Sentry"] as const).filter((t) => !covered.has(t === "Barrier" ? "Fracter" : t === "Code Gate" ? "Decoder" : "Killer"));
    const ordered = [...missing].sort((a, b) => Number(seenTypes.has(b)) - Number(seenTypes.has(a)));
    for (const type of ordered) {
      for (const c of choices(obs)) {
        const title = choiceLabel(obs, c);
        if (obs.profile.breakers[type].includes(title)) {
          push({ move: choiceMove(obs, c), score: 75, why: `Mutual Favor: ${title} covers ${type}${seenTypes.has(type) ? ", which the Corp has shown" : ""}`, kind: "choice" });
          return out;
        }
      }
    }
    return out;
  }
  if (from === "\"Knickknack\" O'Brian" && type === "select") {
    const cards = selectable(obs).filter((c) => c.side === "Runner" && c.title !== "\"Knickknack\" O'Brian");
    const junk = cards.filter((c) => (c.type === "Resource" && Number(c.counter?.credit ?? 0) === 0 && /job|contract|team|hustle/i.test(c.title)) || c.title === "Mayfly");
    const done = choices(obs).find((c) => c.value === "Done");
    if (junk[0] && Number(junk[0].cost ?? 0) >= 1) push({ move: selectMove(obs, junk[0]), score: 60, why: `Knickknack: sell ${junk[0].title}`, kind: "select" });
    else if (done) push({ move: choiceMove(obs, done), score: 60, why: "Knickknack: nothing worth selling", kind: "select" });
    return out;
  }
  if (from === "GAMEDRAGON™ Pro" && type === "select") {
    const pick = [...selectable(obs)].filter((c) => (c.subtypes ?? []).includes("Icebreaker") && !(c.subtypes ?? []).includes("AI")).sort((a, b) => strengthOf(a) - strengthOf(b))[0];
    if (pick) push({ move: selectMove(obs, pick), score: 60, why: `GAMEDRAGON Pro on ${pick.title}`, kind: "select" });
    return out;
  }
  if (from === "Lie Low" && /choose one/i.test(msg)) {
    const tags = Number(obs.me.tag?.base ?? 0);
    if (tags > 0) push(pickChoice(obs, /tag/i, 70, "Lie Low: shed the tags"));
    push(pickChoice(obs, /draw/i, 60, "Lie Low: draw four"));
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
    if (grip >= 4 && worth) push(pickChoice(obs, /damage/i, 70, "Semak-samun: take the damage, the server is worth it"));
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
