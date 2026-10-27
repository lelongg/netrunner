import type { Side } from "../engine";
import type { Move } from "../bot/heuristic";
import { cardRef, currentIce, promptOf } from "./actions";

export interface Beat {
  id: string;
  text: string;
  anchor: string;
  when?: (view: any) => boolean;
  done?: (view: any) => boolean;
  allow?: (command: string, card: any, args: any, view: any) => boolean | undefined;
  strict?: boolean;
}

export interface BotScript {
  turns: Record<number, ((view: any) => Move | null)[]>;
  react?: (view: any) => Move | null;
}

export interface TutorialScript {
  stacks: Record<Side, string[]>;
  beats: Beat[];
  bot: BotScript;
}

export const RESTRICTED = new Set(["play", "flashback", "expend", "credit", "draw", "run", "generate-runnable-zones", "generate-install-list", "advance", "score", "rez", "derez", "trash", "purge", "remove-tag", "trash-resource", "end-turn", "jack-out"]);

const hand = (view: any, side: Side): any[] => view?.[side]?.hand ?? [];
const held = (view: any, side: Side, title: string) => hand(view, side).find((c) => c.title === title);
const installed = (view: any): any[] => Object.values<any>(view?.corp?.servers ?? {}).flatMap((s) => [...(s.content ?? []), ...(s.ices ?? [])]);
const corpCard = (view: any, title: string) => installed(view).find((c) => c.title === title);
const inRig = (view: any, title: string) => Object.values<any>(view?.runner?.rig ?? {}).some((cards) => Array.isArray(cards) && cards.some((c) => c?.title === title));
const rigCard = (view: any, title: string) => Object.values<any>(view?.runner?.rig ?? {}).flatMap((cards) => (Array.isArray(cards) ? cards : [])).find((c) => c?.title === title);
const strength = (card: any) => Number(card?.["current-strength"] ?? card?.strength ?? 0);
const subs = (view: any): any[] => currentIce(view)?.subroutines ?? [];
const oneTap = (command: string, _card: any, args: any) => (command === "dynamic-ability" && args?.dynamic === "auto-pump-and-break" ? false : command === "continue" ? false : undefined);
const discarded = (view: any, side: Side, title: string) => (view?.[side]?.discard ?? []).some((c: any) => c.title === title);
const points = (view: any, side: Side) => view?.[side]?.["agenda-point"] ?? 0;
const clicks = (view: any, side: Side) => view?.[side]?.click ?? 0;
const mainPhase = (side: Side) => (view: any) => view?.["active-player"] === side && !view.run && !view["end-turn"] && !view["corp-phase-12"] && !view["runner-phase-12"] && clicks(view, side) > 0 && !promptOf(view, side);
const onTurn = (side: Side, n: number) => (view: any) => view?.turn === n && mainPhase(side)(view);
const mulliganing = (side: Side) => (view: any) => promptOf(view, side)?.["prompt-type"] === "mulligan";
const choiceValue = (view: any, side: Side, args: any) => (promptOf(view, side)?.choices ?? []).find((c: any) => c.uuid === args?.choice?.uuid)?.value;
const runOn = (view: any, server: string) => !!view?.run && (view.run.server ?? []).join("") === server;
const startable = (side: Side) => (view: any) => view?.["active-player"] !== side && !!view?.["end-turn"];
const starting = (command: string) => (command === "start-turn" ? true : undefined);
const endOfTurn = (side: Side) => (view: any) => view?.["active-player"] === side && !view.run && clicks(view, side) === 0 && !view["end-turn"];
const advanced = (card: any) => (card?.["advance-counter"] ?? 0) + (card?.["extra-advance-counter"] ?? 0);

const play = (side: Side, title: string, server?: string) => (view: any): Move | null => {
  const c = held(view, side, title);
  return c ? { command: "play", args: server ? { card: cardRef(c), server } : { card: cardRef(c) } } : null;
};
const rez = (title: string) => (view: any): Move | null => {
  const c = corpCard(view, title);
  return c && !c.rezzed ? { command: "rez", args: { card: cardRef(c) } } : null;
};
const credit = (): Move => ({ command: "credit" });
const run = (server: string) => (): Move => ({ command: "run", args: { server } });

const playing = (title: string, server?: string) => (command: string, card: any, args: any) => {
  if (command === "generate-install-list") return card?.title === title;
  if (command === "play") return card?.title === title && (!server || args?.server === server);
  return undefined;
};
const running = (server: string) => (command: string, _card: any, args: any) => {
  if (command === "generate-runnable-zones") return true;
  if (command === "run") return args?.server === server;
  return undefined;
};
const keepHand = (side: Side) => (command: string, _card: any, args: any, view: any) => command === "choice" && /^keep$/i.test(String(choiceValue(view, side, args) ?? ""));
const ending = (command: string) => (command === "end-turn" ? true : undefined);
const continuing = (command: string) => (command === "continue" || command === "start-next-phase" ? true : command === "jack-out" ? false : undefined);

const RUNNER: TutorialScript = {
  stacks: {
    runner: ["Sure Gamble", "Cleaver", "Jailbreak", "Creative Commission", "Unity", "Telework Contract", "VRcation", "Carmen", "Mayfly"],
    corp: ["Offworld Office", "Palisade", "Nico Campaign", "Hedge Fund", "Whitespace", "Regolith Mining License", "Tithe", "Superconducting Hub"],
  },
  bot: {
    turns: {
      1: [play("corp", "Offworld Office", "New remote"), play("corp", "Palisade", "Server 1"), credit],
      2: [play("corp", "Nico Campaign", "New remote"), rez("Nico Campaign"), play("corp", "Whitespace", "R&D"), credit],
      3: [play("corp", "Tithe", "HQ"), credit, credit],
    },
    react: (view) => {
      const ice = currentIce(view);
      const wanted = ({ 1: "Palisade", 3: "Whitespace" } as Record<number, string>)[view.turn];
      return view.run?.phase === "approach-ice" && ice?.title === wanted && !ice.rezzed ? { command: "rez", args: { card: cardRef(ice) } } : null;
    },
  },
  beats: [
    { id: "welcome", anchor: ".me-bar", text: "You are the Runner, a hacker. You win by stealing 7 agenda points from the Corp before it scores 7 of its own. This bar shows your credits [credit], your clicks [click] and your other stats." },
    { id: "corp", anchor: ".opp", text: "Across the table is the Corp, played by the bot: a megacorporation with its credits and its hand, called HQ." },
    { id: "hand", anchor: ".dock .hand", text: "Your hand of 5 cards, called your grip. Tap a card to read it." },
    {
      id: "mulligan",
      anchor: ".prompt button",
      when: mulliganing("runner"),
      done: (v) => !mulliganing("runner")(v),
      strict: true,
      allow: keepHand("runner"),
      text: "Before the game, each player may mulligan once: shuffle their hand back and draw 5 new cards. It is worth it when a hand has nothing to do. Yours has money and icebreakers: keep it.",
    },
    { id: "corp-turn", anchor: ".ticker .feed", when: (v) => v["active-player"] === "corp" && (v.turn ?? 0) >= 1, text: "The Corp always plays first. Watch its moves here; tap this line anytime to read the whole log." },
    {
      id: "start",
      anchor: ".actions .buttons",
      when: startable("runner"),
      done: (v) => v["active-player"] === "runner",
      allow: starting,
      text: "The Corp has ended its turn. Tap Start turn to begin yours.",
    },
    { id: "servers", anchor: ".servers.theirs", when: mainPhase("runner"), text: "The Corp's servers. HQ is its hand, R&D its deck, Archives its discard pile. It just installed a card face down in a new remote server, Server 1, and a piece of ice in front of it to protect it." },
    { id: "unknown", anchor: '[data-server="remote1"]', when: mainPhase("runner"), text: "You can't see face-down cards. That one could be an agenda worth points, or a trap. The only way to know is to run it." },
    { id: "clicks", anchor: '[data-anchor="runner-clicks"]', when: mainPhase("runner"), text: "Your turn: you get 4 clicks [click]. Every action costs one: playing or installing a card, gaining 1[credit], drawing a card, or making a run." },
    {
      id: "sure-gamble",
      anchor: '.hand .tile[aria-label="Sure Gamble"]',
      when: mainPhase("runner"),
      done: (v) => discarded(v, "runner", "Sure Gamble"),
      allow: playing("Sure Gamble"),
      text: "Breaking through ice costs money. Tap Sure Gamble and play it: an event costs 5[credit] and gives you 9[credit]. Events go to your discard pile, the heap, once played.",
    },
    {
      id: "cleaver",
      anchor: '.hand .tile[aria-label="Cleaver"]',
      when: mainPhase("runner"),
      done: (v) => inRig(v, "Cleaver"),
      allow: playing("Cleaver"),
      text: "Now install Cleaver. Programs stay in your rig and use memory [mu]: you have 4. Cleaver is an icebreaker for barriers, the ice that ends runs.",
    },
    {
      id: "run",
      anchor: ".actions .buttons",
      when: mainPhase("runner"),
      done: (v) => runOn(v, "remote1"),
      allow: running("Server 1"),
      text: "Time to find out what is in Server 1. Tap Run, then Server 1.",
    },
    {
      id: "initiation",
      anchor: ".actions .buttons",
      when: (v) => runOn(v, "remote1") && !v.encounters && v.run.phase !== "approach-ice",
      done: (v) => !v.run || v.run.phase === "approach-ice" || !!v.encounters,
      allow: continuing,
      text: "The run begins. You pass the ice protecting the server one at a time, from the outermost in. Tap Approach ice.",
    },
    {
      id: "approach",
      anchor: ".server.running",
      when: (v) => v.run?.phase === "approach-ice" || !!v.encounters,
      text: "You approach the ice. The Corp may rez it now, paying its rez cost to turn it face up. Unrezzed ice does nothing, but the Corp only reveals it when it matters.",
    },
    {
      id: "rezzed",
      anchor: ".actions .buttons",
      when: (v) => !!v.run && !v.encounters && !!currentIce(v)?.rezzed,
      done: (v) => !v.run || !!v.encounters,
      allow: continuing,
      text: "The Corp rezzed it: it's Palisade. Tap Encounter ice to face it.",
    },
    {
      id: "encounter",
      anchor: ".encounter",
      when: (v) => !!v.encounters,
      text: "Palisade is a barrier with one subroutine, End the run. Every subroutine you don't break fires. To break one, you need an icebreaker of the right type, Cleaver for barriers, with at least the ice's strength: Palisade has 4 here (+2 on a remote server), Cleaver only 3.",
    },
    {
      id: "pump",
      anchor: ".encounter, .breakers",
      when: (v) => !!v.encounters,
      done: (v) => strength(rigCard(v, "Cleaver")) >= strength(currentIce(v)) || subs(v).every((s) => s.broken),
      allow: oneTap,
      text: "Let's do it by hand first. Open Other abilities below and use Cleaver's +1 strength (2[credit]). A boost lasts until the end of this encounter.",
    },
    {
      id: "break",
      anchor: ".encounter, .breakers, .prompt button",
      when: (v) => !!v.encounters,
      done: (v) => subs(v).every((s) => s.broken),
      allow: oneTap,
      text: "Cleaver now has strength 4. Use its Break ability (1[credit]) and pick End the run.",
    },
    {
      id: "one-tap",
      anchor: ".encounter",
      when: (v) => !!v.encounters,
      text: "Broken! Next time, the yellow Break button does all of this in one tap: it raises the strength as needed and breaks every subroutine, at the lowest price.",
    },
    {
      id: "breach",
      anchor: ".actions .buttons",
      when: (v) => !!v.run && (!v.encounters || subs(v).every((s) => s.broken)),
      done: (v) => !v.run || !!promptOf(v, "runner")?.choices,
      allow: continuing,
      text: "The only subroutine is broken: nothing stops you. Keep going until you breach the server and access its cards.",
    },
    {
      id: "steal",
      anchor: ".prompt button",
      when: (v) => !!v.run && !!promptOf(v, "runner")?.choices,
      done: (v) => points(v, "runner") >= 2 || !v.run,
      text: "It's an agenda: Offworld Office, worth 2 points. Steal it! Agendas you access are always stolen, for free.",
    },
    {
      id: "jailbreak",
      anchor: '.hand .tile[aria-label="Jailbreak"]',
      when: mainPhase("runner"),
      done: (v) => runOn(v, "rd") || discarded(v, "runner", "Jailbreak"),
      allow: (command, card) => (command === "play" ? card?.title === "Jailbreak" : command === "choice" ? true : undefined),
      text: "Last click. Play Jailbreak to run R&D, the Corp's deck: you will access its top 2 cards instead of 1, and draw a card if the run succeeds. No ice protects R&D yet.",
    },
    {
      id: "rd-run",
      anchor: ".prompt button, .actions .buttons",
      when: (v) => runOn(v, "rd"),
      done: (v) => !v.run,
      allow: (command) => continuing(command) ?? (command === "choice" ? true : undefined),
      text: "No ice protects R&D: go straight to the server and access its top cards. Steal any agenda you find; other cards stay where they are.",
    },
    {
      id: "end-turn",
      anchor: ".actions .buttons",
      when: endOfTurn("runner"),
      done: (v) => v["active-player"] === "corp" || !!v["end-turn"],
      allow: ending,
      text: "No clicks left: end your turn. You may hold up to 5 cards; any extra card is discarded at the end of your turn.",
    },
    { id: "corp-turn-2", anchor: ".opp", when: (v) => v["active-player"] === "corp" && v.turn === 2 && mainPhase("corp")(v), text: "The Corp draws a card at the start of each turn, and has 3 clicks. You do not draw automatically: use the Draw action when you need cards." },
    {
      id: "nico",
      anchor: '[data-server="remote2"]',
      when: (v) => mainPhase("runner")(v) && v.turn === 2 && !!corpCard(v, "Nico Campaign"),
      text: "The Corp installed and rezzed Nico Campaign, an asset that gives it 3[credit] every turn. It is in an unprotected server: when you access it, you may pay its trash cost to destroy it.",
    },
    {
      id: "commission",
      anchor: '.hand .tile[aria-label="Creative Commission"]',
      when: mainPhase("runner"),
      done: (v) => discarded(v, "runner", "Creative Commission"),
      allow: playing("Creative Commission"),
      text: "You only have 3[credit]. Play Creative Commission: +5[credit], but it takes an extra click if you have one left. Cards often trade clicks for credits.",
    },
    {
      id: "unity",
      anchor: '.hand .tile[aria-label="Unity"]',
      when: mainPhase("runner"),
      done: (v) => inRig(v, "Unity"),
      allow: playing("Unity"),
      text: "The Corp put a new ice on R&D. Install Unity, a decoder: it breaks code gates, the ice that taxes you or blocks you with conditions.",
    },
    {
      id: "run-nico",
      anchor: ".actions .buttons",
      when: (v) => mainPhase("runner")(v) && !!corpCard(v, "Nico Campaign"),
      done: (v) => (runOn(v, "remote2") && !!promptOf(v, "runner")?.choices) || discarded(v, "corp", "Nico Campaign"),
      allow: (command, card, args) => running("Server 2")(command, card, args) ?? continuing(command),
      text: "Last click: run Server 2. No ice protects it: go straight to the server.",
    },
    {
      id: "trash",
      anchor: ".prompt button",
      when: (v) => runOn(v, "remote2") && !!promptOf(v, "runner")?.choices,
      done: (v) => !v.run,
      text: "You access Nico Campaign. Pay 2[credit] to trash it: the Corp loses its income and the card goes to Archives.",
    },
    {
      id: "end-turn-2",
      anchor: ".actions .buttons",
      when: endOfTurn("runner"),
      done: (v) => v["active-player"] === "corp" || !!v["end-turn"],
      allow: ending,
      text: "End your turn. Next turn, you will run R&D through its new ice.",
    },
    {
      id: "telework",
      anchor: '.hand .tile[aria-label="Telework Contract"]',
      when: (v) => mainPhase("runner")(v) && v.turn === 3,
      done: (v) => inRig(v, "Telework Contract"),
      allow: playing("Telework Contract"),
      text: "Money first. Install Telework Contract: resources stay in your rig, and this one holds 9[credit].",
    },
    {
      id: "take",
      anchor: '.rig-cards .tile[aria-label="Telework Contract"]',
      when: mainPhase("runner"),
      done: (v) => (rigCard(v, "Telework Contract")?.counter?.credit ?? 9) < 9,
      allow: (command, card) => (command === "ability" ? card?.title === "Telework Contract" : undefined),
      text: "Tap Telework Contract in your rig and use its ability: 1[click] to take 3[credit] from it. Installed cards often have click abilities like this one.",
    },
    {
      id: "run-rd",
      anchor: ".actions .buttons",
      when: mainPhase("runner"),
      done: (v) => runOn(v, "rd"),
      allow: running("R&D"),
      text: "Now run R&D. This time it is protected.",
    },
    {
      id: "rd-approach",
      anchor: ".actions .buttons",
      when: (v) => runOn(v, "rd") && !v.encounters,
      done: (v) => !v.run || !!v.encounters,
      allow: continuing,
      text: "As before: approach the ice, the Corp decides whether to rez it, then encounter it.",
    },
    {
      id: "whitespace",
      anchor: ".encounter",
      when: (v) => !!v.encounters && currentIce(v)?.title === "Whitespace",
      text: "Whitespace, a code gate with two subroutines. They fire in order: first you lose 3[credit], then the run ends if you have 6[credit] or less. Unity has strength 1, more than Whitespace's 0: no boost needed, 1[credit] per subroutine.",
    },
    {
      id: "pick",
      anchor: ".encounter, .breakers",
      when: (v) => !!v.encounters && currentIce(v)?.title === "Whitespace",
      done: (v) => subs(v).some((s) => s.broken),
      allow: (command, card, args, view) => (command === "choice" && /loses/i.test(String(choiceValue(view, "runner", args) ?? "")) ? false : oneTap(command, card, args)),
      text: "You don't have to break everything. Tap the first subroutine to leave it out: the button now offers to break 1 of 2. Break only the one that ends the run.",
    },
    {
      id: "let-fire",
      anchor: ".actions .buttons",
      when: (v) => !!v.encounters && subs(v).some((s) => s.broken),
      done: (v) => !v.encounters,
      allow: (command) => (command === "continue" ? true : command === "jack-out" ? false : undefined),
      text: "Now let the rest fire: you lose 3[credit], but the run goes on since the subroutine that ends it is broken. Saving credits by choosing what to break is a big part of the Runner's game.",
    },
    {
      id: "rd-access",
      anchor: ".prompt button, .actions .buttons",
      when: (v) => runOn(v, "rd") && !v.encounters,
      done: (v) => !v.run,
      allow: (command) => continuing(command) ?? (command === "choice" ? true : undefined),
      text: "You are through: go on to R&D and access its top card.",
    },
    {
      id: "free",
      anchor: ".me-bar",
      when: (v) => mainPhase("runner")(v) || endOfTurn("runner")(v),
      text: "That's the basics! The rest of the game is yours. Carmen breaks sentries like the Tithe now on HQ. Steal 7 points to win. Tips will pop up when something new happens.",
    },
  ],
};

const CORP: TutorialScript = {
  stacks: {
    corp: ["Palisade", "Offworld Office", "Hedge Fund", "Nico Campaign", "Seamless Launch", "Whitespace", "Tithe", "Superconducting Hub"],
    runner: ["Sure Gamble", "Creative Commission", "Telework Contract", "VRcation", "Tread Lightly", "Cleaver", "Unity", "Carmen"],
  },
  bot: {
    turns: {
      1: [run("Server 1"), play("runner", "Sure Gamble"), play("runner", "Telework Contract"), credit],
    },
  },
  beats: [
    { id: "welcome", anchor: ".me-bar", text: "You are the Corp, a megacorporation. You win by scoring 7 agenda points before the Runner steals 7 from you. This bar shows your credits [credit] and clicks [click]." },
    { id: "runner", anchor: ".opp", text: "Across the table is the Runner, played by the bot: a hacker who will try to break into your servers and steal your agendas." },
    { id: "hand", anchor: ".dock .hand", text: "Your hand of 5 cards, called HQ. Tap a card to read it." },
    {
      id: "mulligan",
      anchor: ".prompt button",
      when: mulliganing("corp"),
      done: (v) => !mulliganing("corp")(v),
      strict: true,
      allow: keepHand("corp"),
      text: "Before the game, each player may mulligan once: shuffle their hand back and draw 5 new cards. It is worth it when a hand has nothing to do. Yours has ice, an agenda and money: keep it.",
    },
    {
      id: "start",
      anchor: ".actions .buttons",
      when: (v) => startable("corp")(v) || (v["active-player"] === "corp" && !!v["corp-phase-12"]),
      done: mainPhase("corp"),
      text: "Tap Start turn to begin. Your turn starts with a mandatory draw.",
    },
    { id: "servers", anchor: ".servers.mine", when: mainPhase("corp"), text: "Your servers. HQ is your hand, R&D your deck, Archives your discard pile. You also create remote servers by installing cards in them." },
    { id: "draw", anchor: '[data-anchor="corp-clicks"]', when: mainPhase("corp"), text: "You play first. Each turn starts with a mandatory draw, then you get 3 clicks [click]: installing a card, playing an operation, gaining 1[credit] or drawing a card each cost one." },
    {
      id: "ice",
      anchor: '.hand .tile[aria-label="Palisade"]',
      when: mainPhase("corp"),
      done: (v) => !!corpCard(v, "Palisade"),
      allow: playing("Palisade", "New remote"),
      text: "Protect a server before putting anything valuable in it. Install Palisade, a barrier, on a New remote. Ice is installed face down; each extra ice on the same server costs 1[credit] more to install.",
    },
    {
      id: "agenda",
      anchor: '.hand .tile[aria-label="Offworld Office"]',
      when: mainPhase("corp"),
      done: (v) => !!corpCard(v, "Offworld Office"),
      allow: playing("Offworld Office", "Server 1"),
      text: "Now install Offworld Office, an agenda, in Server 1, behind Palisade. The Runner only sees a face-down card: it could be anything.",
    },
    {
      id: "hedge",
      anchor: '.hand .tile[aria-label="Hedge Fund"]',
      when: mainPhase("corp"),
      done: (v) => discarded(v, "corp", "Hedge Fund"),
      allow: playing("Hedge Fund"),
      text: "Rezzing ice costs credits. Play Hedge Fund: this operation costs 5[credit] and gives you 9[credit].",
    },
    {
      id: "end-turn",
      anchor: ".actions .buttons",
      when: endOfTurn("corp"),
      done: (v) => v["active-player"] === "runner" || !!v["end-turn"],
      allow: ending,
      text: "No clicks left: end your turn. Your hand size is 5; extra cards are discarded at the end of your turn.",
    },
    { id: "runner-turn", anchor: ".ticker .feed", when: (v) => v["active-player"] === "runner", text: "The Runner has 4 clicks. Watch its moves here; tap this line anytime to read the whole log." },
    {
      id: "run-start",
      anchor: ".actions .buttons",
      when: (v) => !!v.run && v.run.phase !== "approach-ice" && !v.encounters,
      done: (v) => !v.run || v.run.phase === "approach-ice" || !!v.encounters,
      allow: continuing,
      text: "The Runner starts a run on Server 1! It must get past your ice first. Tap Let Runner approach ice.",
    },
    {
      id: "rez",
      anchor: ".actions .buttons",
      when: (v) => v.run?.phase === "approach-ice" && !currentIce(v)?.rezzed,
      done: (v) => !!corpCard(v, "Palisade")?.rezzed || !v.run,
      allow: (command, card) => (command === "rez" ? card?.title === "Palisade" : command === "continue" ? false : undefined),
      text: "The Runner approaches your ice! Rez Palisade now for 3[credit] to turn it face up. Unrezzed, it would let the Runner through.",
    },
    {
      id: "fire",
      anchor: ".encounter, .actions .buttons",
      when: (v) => !!v.run && !!corpCard(v, "Palisade")?.rezzed,
      done: (v) => !v.run,
      text: "Palisade is rezzed. Let the Runner encounter it: without an icebreaker, it cannot break the subroutine. Then fire it: End the run. Your agenda is safe.",
    },
    {
      id: "seamless",
      anchor: '.hand .tile[aria-label="Seamless Launch"]',
      when: (v) => mainPhase("corp")(v) && v.turn === 2,
      done: (v) => advanced(corpCard(v, "Offworld Office")) >= 2 || promptOf(v, "corp")?.["prompt-type"] === "select",
      allow: (command, card) => (command === "play" ? card?.title === "Seamless Launch" : undefined),
      text: "To score an agenda, you advance it: Offworld Office needs 4 advancement counters. Play Seamless Launch to place 2 at once on it, since you installed it last turn.",
    },
    {
      id: "seamless-pick",
      anchor: '[data-server="remote1"]',
      when: (v) => promptOf(v, "corp")?.["prompt-type"] === "select",
      done: (v) => advanced(corpCard(v, "Offworld Office")) >= 2,
      allow: (command, card) => (command === "select" ? card?.title === "Offworld Office" : undefined),
      text: "Now choose where the counters go: tap Offworld Office in Server 1, select it, then confirm.",
    },
    {
      id: "advance",
      anchor: '[data-server="remote1"]',
      when: mainPhase("corp"),
      done: (v) => advanced(corpCard(v, "Offworld Office")) >= 4 || points(v, "corp") >= 2,
      allow: (command, card) => (command === "advance" ? card?.title === "Offworld Office" : undefined),
      text: "Now tap the agenda and advance it twice: 1[click] and 1[credit] per counter.",
    },
    {
      id: "score",
      anchor: '[data-server="remote1"]',
      when: (v) => advanced(corpCard(v, "Offworld Office")) >= 4,
      done: (v) => points(v, "corp") >= 2,
      allow: (command, card) => (command === "score" ? card?.title === "Offworld Office" : undefined),
      text: "4 counters: score it! It is worth 2 points, and Offworld Office also gives you 7[credit]. Scoring costs no click.",
    },
    {
      id: "end-turn-2",
      anchor: ".actions .buttons",
      when: (v) => endOfTurn("corp")(v) && v.turn === 2,
      done: (v) => v["active-player"] === "runner" || !!v["end-turn"],
      allow: ending,
      text: "End your turn. Never leave an agenda unprotected for long: the Runner can steal it from any server it reaches, even from HQ or R&D.",
    },
    {
      id: "nico",
      anchor: '.hand .tile[aria-label="Nico Campaign"]',
      when: (v) => mainPhase("corp")(v) && v.turn === 3 && !!held(v, "corp", "Nico Campaign"),
      done: (v) => !!corpCard(v, "Nico Campaign"),
      allow: playing("Nico Campaign", "New remote"),
      text: "Assets make money or set up tricks. Install Nico Campaign in a New remote.",
    },
    {
      id: "rez-nico",
      anchor: '[data-server="remote2"]',
      when: (v) => !!corpCard(v, "Nico Campaign") && !corpCard(v, "Nico Campaign").rezzed,
      done: (v) => !!corpCard(v, "Nico Campaign")?.rezzed,
      allow: (command, card) => (command === "rez" ? card?.title === "Nico Campaign" : undefined),
      text: "An asset works only once rezzed. Tap it and rez it for 2[credit]: it loads 9[credit] and gives you 3 at the start of each of your turns. Careful, the Runner can trash it if it gets in.",
    },
    {
      id: "free",
      anchor: ".me-bar",
      when: (v) => mainPhase("corp")(v) && v.turn === 3,
      text: "That's the basics! The rest is yours: protect HQ and R&D with ice too, and score 7 points. Tips will pop up when something new happens.",
    },
  ],
};

export const TUTORIALS: Record<Side, TutorialScript> = { runner: RUNNER, corp: CORP };
