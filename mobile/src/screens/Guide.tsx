import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { CardDb } from "../engine";
import { ZoomableCardImage } from "../game/CardImage";
import { Pager } from "../game/Pager";
import { withTerms } from "../game/RichText";
import { useDragPager } from "../game/swipe";
import { iconize } from "../game/text";
import { useBackClose } from "../back";
import { animate } from "../fx/core";
import { Icon } from "../icons";
import { motionOff } from "../settings";
import { Cta, Ticker } from "../ui";

interface Page {
  kicker: string;
  title: string;
  body: string[];
  cards?: string[];
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
      "Tap an icon or an underlined word to see what it means. Tap the line above the buttons to read the full log.",
      "Ready? A guided game against the bot will walk you through your first turns as the Runner.",
    ],
  },
];

export function Guide({ db, onClose, onPlay }: { db: CardDb; onClose: () => void; onPlay: () => void }) {
  const [index, setIndex] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const entering = useRef<-1 | 1 | 0>(0);
  useBackClose(true, onClose);
  const go = (dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= PAGES.length) return;
    entering.current = dir;
    setIndex(next);
  };
  const page = () => body.current?.querySelector<HTMLElement>(".guide-page");
  const drag = useDragPager(page, (dir) => index + dir >= 0 && index + dir < PAGES.length, go);
  useLayoutEffect(() => {
    const dir = entering.current;
    entering.current = 0;
    const el = page();
    if (!dir || !el || motionOff()) return;
    animate(el, { x: [dir * el.getBoundingClientRect().width * 0.6, 0], opacity: [0.3, 1] }, { type: "spring", visualDuration: 0.3, bounce: 0.15 });
  }, [index]);
  const p = PAGES[index];
  const last = index === PAGES.length - 1;
  return (
    <>
      <Ticker>
        How to play <span class="cyan">{index + 1}/{PAGES.length}</span>
      </Ticker>
      <div class="screen guide" ref={body} {...drag}>
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label="Back to home">
            <Icon name="arrow-left" />
          </button>
          <h1>HOW TO PLAY</h1>
        </header>
        <Pager index={index} count={PAGES.length} onStep={go} />
        <section key={index} class="panel section guide-page">
          <span class="label cyan">{p.kicker}</span>
          <h2>{p.title}</h2>
          {p.cards && (
            <div class="guide-cards">
              {p.cards.map((title) => {
                const code = db.byTitle.get(title)?.code;
                return code ? <ZoomableCardImage code={code} alt={title} size="small" /> : null;
              })}
            </div>
          )}
          {p.body.map((t) => (
            <p>{withTerms(iconize(t))}</p>
          ))}
        </section>
        <div class="guide-dots" aria-hidden="true">
          {PAGES.map((_, i) => (
            <i class={i === index ? "on" : ""} />
          ))}
        </div>
        {last ? (
          <Cta onClick={onPlay}>Play a guided game</Cta>
        ) : (
          <button class="primary" onClick={() => go(1)}>
            Next
          </button>
        )}
      </div>
    </>
  );
}
