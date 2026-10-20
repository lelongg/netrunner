import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { type CardDb, type Side, cardImage } from "../engine";
import { ZoomableCardImage } from "../game/CardImage";
import { Pager } from "../game/Pager";
import { withTerms } from "../game/RichText";
import { type Peek, useDragPager } from "../game/swipe";
import { iconize } from "../game/text";
import { useBackClose } from "../back";
import { animate } from "../fx/core";
import { Icon } from "../icons";
import { motionOff } from "../settings";
import { Ticker } from "../ui";

interface Page {
  kicker: string;
  title: string;
  body: string[];
  cards?: string[];
  choice?: boolean;
}

const PAGES: Page[] = [
  {
    kicker: "The game",
    title: "Corp vs Runner",
    body: [
      "Netrunner is a duel between a megacorporation, the Corp, and a hacker, the Runner.",
      "The Corp scores agendas: secret projects worth agenda points. The Runner breaks into the Corp's servers to steal them.",
      "The first player to 7 agenda points wins. The Corp also wins if the Runner is flatlined, and the Runner wins if the Corp has to draw from an empty R&D.",
    ],
    cards: ["The Syndicate: Profit over Principle", "The Catalyst: Convention Breaker"],
  },
  {
    kicker: "Turns",
    title: "Clicks and credits",
    body: [
      "Players take turns. The Corp gets 3 clicks per turn, the Runner 4. Every action costs a click: [click].",
      "Basic actions are always available: gain 1[credit], draw a card, install a card or play an event or operation.",
      "Credits [credit] pay for cards and abilities. Economy cards like these give more credits than the basic action.",
    ],
    cards: ["Hedge Fund", "Sure Gamble"],
  },
  {
    kicker: "The Corp",
    title: "Servers",
    body: [
      "The Corp's cards live in servers. HQ is its hand, R&D its deck and Archives its discard pile.",
      "Agendas and assets are installed face down in remote servers, so the Runner never knows which is which.",
      "An asset makes money or trouble once the Corp rezzes it; an agenda must be advanced before it can be scored.",
    ],
    cards: ["Nico Campaign", "Offworld Office"],
  },
  {
    kicker: "The Corp",
    title: "Agendas",
    body: [
      "To score an agenda, the Corp advances it: 1[click] and 1[credit] per advancement counter, until it reaches the number on the card.",
      "Scoring gives the agenda points printed on it, and sometimes a bonus.",
      "While it waits in a server, the agenda can be stolen by the Runner. That is the whole tension of the game.",
    ],
    cards: ["Offworld Office", "Superconducting Hub"],
  },
  {
    kicker: "The Corp",
    title: "Ice",
    body: [
      "Ice protects servers. It is installed face down in front of a server and the Corp rezzes it, paying its rez cost, when the Runner approaches it.",
      "Each piece of ice has a strength and subroutines (↳). Barriers and code gates usually end the run; sentries hurt the Runner.",
    ],
    cards: ["Palisade", "Whitespace", "Diviner"],
  },
  {
    kicker: "The Runner",
    title: "The rig",
    body: [
      "The Runner installs programs, hardware and resources in their rig. Programs use memory units ([mu]): 4 to start with.",
      "Icebreakers are the programs that break subroutines. A fracter breaks barriers, a decoder code gates and a killer sentries.",
      "The grip is the Runner's hand, the stack their deck and the heap their discard pile.",
    ],
    cards: ["Cleaver", "Unity", "Carmen"],
  },
  {
    kicker: "The Runner",
    title: "Running",
    body: [
      "A run costs a click. Pick a server: you approach its ice one by one, starting with the outermost.",
      "On each rezzed ice you encounter, break its subroutines with an icebreaker whose strength is at least the ice's, or let them fire.",
      "Get through and you breach the server: you access its cards. Agendas are stolen, other cards can be trashed by paying their trash cost.",
    ],
    cards: ["Jailbreak", "Tread Lightly"],
  },
  {
    kicker: "The Runner",
    title: "Danger",
    body: [
      "Net, meat and core damage each trash a random card from your grip. Take more damage than you have cards and you are flatlined: the Corp wins.",
      "Some Corp cards are traps that hurt you when you access them. Keep a few cards in hand before a risky run.",
      "Tags let the Corp trash your resources. You can remove one for 1[click] and 2[credit].",
    ],
    cards: ["Urtica Cipher", "Tithe"],
  },
  {
    kicker: "Pocket Rig",
    title: "Playing here",
    body: [
      "Tap any card to read it and to see what you can do with it. Your main actions are the buttons above your hand.",
      "Tap an icon or an underlined word to see what it means. Tap the Live ticker at the top of the screen to read the full log.",
    ],
  },
  { kicker: "Your move", title: "Choose your side", body: [], choice: true },
];

function SidePick({ side, db, onPick }: { side: Side; db: CardDb; onPick: () => void }) {
  const corp = side === "corp";
  const identity = db.byTitle.get(corp ? "The Syndicate: Profit over Principle" : "The Catalyst: Convention Breaker")?.code;
  return (
    <button class={`side-pick ${side}`} onClick={onPick}>
      {identity && <img class="side-art" crossOrigin="anonymous" src={cardImage(identity, "large")} alt="" />}
      <span class="side-text">
        <span class="side-kicker">{corp ? "Megacorp" : "Hacker"}</span>
        <span class="side-name">{corp ? "Corp" : "Runner"}</span>
        <span class="side-tag">{corp ? "Build. Protect. Score." : "Break in. Steal. Vanish."}</span>
        <span class="side-go">Play a guided game →</span>
      </span>
    </button>
  );
}

export function Guide({ db, onClose, onPlay, firstRun }: { db: CardDb; onClose: () => void; onPlay: (side: Side) => void; firstRun?: boolean }) {
  const [index, setIndex] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const entering = useRef<-1 | 1 | 0>(0);
  useBackClose(true, onClose);
  useEffect(() => {
    for (const page of PAGES)
      for (const title of page.cards ?? []) {
        const code = db.byTitle.get(title)?.code;
        if (!code) continue;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.sizes = "88px";
        img.srcset = `${cardImage(code, "small")} 116w, ${cardImage(code, "medium")} 165w, ${cardImage(code, "large")} 300w`;
      }
  }, []);
  const go = (dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= PAGES.length) return;
    entering.current = dir;
    setIndex(next);
  };
  const page = () => body.current?.querySelector<HTMLElement>(".guide-page.current");
  const peekOf = (dir: -1 | 1) => body.current?.querySelector<HTMLElement>(`.guide-page.peek.${dir === 1 ? "next" : "prev"}`);
  const swiped = useRef(false);
  const peek: Peek = {
    move: (dx) => {
      const w = (page()?.getBoundingClientRect().width ?? 0) + 24;
      const cur = page();
      if (cur) cur.style.opacity = "";
      for (const dir of [-1, 1] as const) {
        const el = peekOf(dir);
        if (!el) {
          if (cur && (dir === 1 ? dx < 0 : dx > 0)) cur.style.opacity = String(1 - (0.7 * Math.min(Math.abs(dx), w)) / w);
          continue;
        }
        el.style.visibility = (dir === 1 ? dx < 0 : dx > 0) ? "visible" : "hidden";
        el.style.transform = `translateX(${dir * w + dx}px)`;
      }
    },
    release: (dir) => {
      if (dir) swiped.current = true;
    },
    gap: 24,
  };
  const drag = useDragPager(page, (dir) => index + dir >= 0 && index + dir < PAGES.length, go, peek);
  useLayoutEffect(() => {
    const dir = entering.current;
    entering.current = 0;
    for (const d of [-1, 1] as const) {
      const el = peekOf(d);
      if (el) el.style.visibility = "hidden";
    }
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const el = page();
    if (!dir || !el || motionOff()) return;
    const from = dir * el.getBoundingClientRect().width * 0.6;
    el.style.transform = `translateX(${from}px)`;
    el.style.opacity = "0.3";
    animate(el, { x: [from, 0], opacity: [0.3, 1] }, { type: "spring", visualDuration: 0.3, bounce: 0.15 }).finished.then(
      () => (el.style.opacity = ""),
      () => {},
    );
  }, [index]);
  useLayoutEffect(() => {
    if (!PAGES[index].choice || motionOff()) return;
    const root = body.current;
    const corp = root?.querySelector<HTMLElement>(".side-pick.corp");
    const runner = root?.querySelector<HTMLElement>(".side-pick.runner");
    const vs = root?.querySelector<HTMLElement>(".versus");
    const slide = (el: HTMLElement, from: number) => {
      el.style.transform = `translateX(${from}px)`;
      animate(el, { transform: [`translateX(${from}px)`, "translateX(0px)"] }, { duration: 0.5, delay: 0.1, ease: [0.2, 1.15, 0.4, 1] }).finished.then(
        () => (el.style.transform = ""),
        () => (el.style.transform = ""),
      );
    };
    if (corp) slide(corp, -innerWidth);
    if (runner) slide(runner, innerWidth);
    if (vs) vs.style.opacity = "0";
    if (vs) animate(vs, { transform: ["translate(-50%, -50%) rotate(-8deg) scale(3)", "translate(-50%, -50%) rotate(-8deg) scale(1)"], opacity: [0, 1] }, { duration: 0.35, delay: 0.5, ease: [0.2, 1.4, 0.4, 1] }).finished.then(
        () => (vs.style.opacity = ""),
        () => (vs.style.opacity = ""),
      );
  }, [index]);
  const renderPage = (i: number, role: string) => {
    const q = PAGES[i];
    return q.choice ? (
          <div key={`${role}:${i}`} class={`guide-page guide-choice ${role}`} aria-hidden={role !== "current" || undefined}>
            <SidePick side="corp" db={db} onPick={() => onPlay("corp")} />
            <span class="versus" aria-hidden="true">
              VS
            </span>
            <SidePick side="runner" db={db} onPick={() => onPlay("runner")} />
          </div>
        ) : (
          <section key={`${role}:${i}`} class={`panel section guide-page ${role}`} aria-hidden={role !== "current" || undefined}>
            <span class="label cyan">{q.kicker}</span>
            <h2>{q.title}</h2>
            {q.cards && (
              <div class="guide-cards">
                {q.cards.map((title) => {
                  const code = db.byTitle.get(title)?.code;
                  return code ? <ZoomableCardImage code={code} alt={title} size="small" width="88px" /> : null;
                })}
              </div>
            )}
            {q.body.map((t) => (
              <p>{withTerms(iconize(t))}</p>
            ))}
          </section>
        );
  };
  const last = index === PAGES.length - 1;
  return (
    <>
      <Ticker>
        How to play{" "}
        <span class="cyan">
          {index + 1}/{PAGES.length}
        </span>
      </Ticker>
      <div class="screen guide" ref={body} {...drag}>
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>HOW TO PLAY</h1>
          {firstRun && (
            <button class="ghost guide-skip" onClick={onClose}>
              Skip
            </button>
          )}
        </header>
        <Pager index={index} count={PAGES.length} onStep={go} />
        <div class="guide-track">
          {index > 0 && !PAGES[index - 1].choice && renderPage(index - 1, "peek prev")}
          {renderPage(index, "current")}
          {index < PAGES.length - 1 && !PAGES[index + 1].choice && renderPage(index + 1, "peek next")}
        </div>
        <div class="guide-dots" aria-hidden="true">
          {PAGES.map((_, i) => (
            <i class={i === index ? "on" : ""} />
          ))}
        </div>
        <button class="primary guide-next" style={last ? { visibility: "hidden" } : undefined} onClick={() => go(1)}>
          Next
        </button>
      </div>
    </>
  );
}
