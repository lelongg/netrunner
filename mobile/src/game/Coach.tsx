import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { Side } from "../engine";
import type { Session } from "../session";
import { animate } from "../fx/core";
import { motionOff } from "../settings";
import { withTerms } from "./RichText";
import { iconize } from "./text";
import { basicCommands, promptOf } from "./actions";

interface Step {
  id: string;
  anchor: string;
  text: string;
  when: (view: any, side: Side) => boolean;
}

const myTurn = (view: any, side: Side) => view["active-player"] === side && !view.run && !view["end-turn"] && (view[side]?.click ?? 0) > 0 && !promptOf(view, side);
const prompt = (view: any, side: Side) => promptOf(view, side);
const accessing = (view: any, side: Side) => {
  const p = prompt(view, side);
  return !!p && p["prompt-type"] !== "run" && /access/i.test(JSON.stringify(p.msg ?? ""));
};

const STEPS: Step[] = [
  { id: "welcome", anchor: ".me-bar", text: "You are the Runner, a hacker. Steal 7 agenda points from the Corp before it scores 7 of its own. This bar shows your credits, clicks and stats.", when: () => true },
  { id: "corp", anchor: ".opp", text: "This is the Corp, played by the bot: its credits, the cards in its hand (HQ) and its clicks while it plays.", when: () => true },
  { id: "servers", anchor: ".servers.theirs", text: "The Corp's servers. HQ is its hand, R&D its deck, Archives its discard. Each card it installs face down opens a remote server, and ice in front of a server protects it.", when: () => true },
  { id: "corp-turn", anchor: ".last-log", text: "The Corp is taking its turn. Follow its moves here, and tap this line to read the whole log.", when: (v, s) => v["active-player"] !== s && !v.run },
  { id: "turn", anchor: '[data-anchor="runner-clicks"]', text: "Your turn! You have 4 clicks [click]. Every action spends one; when they run out, you end your turn.", when: myTurn },
  { id: "hand", anchor: ".dock .hand", text: "Your grip. Tap a card to read it, then play or install it. Events are used once; programs, hardware and resources stay installed in your rig.", when: myTurn },
  { id: "actions", anchor: ".actions .buttons", text: "Basic actions: gain 1[credit], draw a card, or Run a server to break in. Try installing an icebreaker before running into ice.", when: myTurn },
  { id: "help", anchor: ".me-bar .stat", text: "Tap any icon, or any underlined word in a card's text, to see what it means.", when: myTurn },
  { id: "approach", anchor: ".server.running", text: "You are running this server. You pass its ice one piece at a time, from the outermost. The Corp may rez a piece of ice when you approach it.", when: (v) => !!v.run && !v.encounters },
  { id: "encounter", anchor: ".encounter", text: "Encounter! Each subroutine fires unless you break it. The Break it panel lists what your icebreakers can do; their strength must reach the ice's.", when: (v) => !!v.encounters },
  { id: "access", anchor: ".prompt", text: "You are accessing a card. An agenda is stolen for its points; other cards can be trashed by paying their trash cost.", when: accessing },
  { id: "end-turn", anchor: ".actions .buttons", text: "No clicks left: end your turn and the Corp plays again.", when: (v, s) => (v.turn ?? 0) > 0 && basicCommands(v, s).some((c) => c.command === "end-turn") },
];

const key = (id: string) => `nsg.coach.${id}`;

function loadSeen(id: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key(id)) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function Coach({ session, view, side }: { session: Session; view: any; side: Side }) {
  const id = session.saveId ?? "tutorial";
  const [seen, setSeen] = useState(() => loadSeen(id));
  const [box, setBox] = useState<DOMRect | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const step = view.winner ? undefined : STEPS.find((s) => !seen.has(s.id) && s.when(view, side) && document.querySelector(s.anchor));

  const done = (ids: string[]) => {
    const next = new Set([...seen, ...ids]);
    setSeen(next);
    try {
      localStorage.setItem(key(id), JSON.stringify([...next]));
    } catch {}
  };

  useEffect(() => {
    session.holdBot(!!step);
    return () => session.holdBot(false);
  }, [step?.id]);

  useLayoutEffect(() => {
    if (!step) return setBox(null);
    const measure = () => {
      const el = document.querySelector(step.anchor);
      if (el) setBox(el.getBoundingClientRect());
    };
    document.querySelector(step.anchor)?.scrollIntoView({ block: "nearest" });
    measure();
    const timer = setInterval(measure, 250);
    addEventListener("resize", measure);
    return () => {
      clearInterval(timer);
      removeEventListener("resize", measure);
    };
  }, [step?.id]);

  useLayoutEffect(() => {
    if (step && bubble.current && !motionOff()) animate(bubble.current, { opacity: [0, 1], y: [10, 0] }, { duration: 0.25 });
  }, [step?.id]);

  if (!step || !box) return null;
  const below = box.top < innerHeight / 2;
  const style = below ? { top: `${Math.min(box.bottom + 12, innerHeight - 220)}px` } : { bottom: `${Math.min(innerHeight - box.top + 12, innerHeight - 220)}px` };
  return (
    <>
      <div class="coach-ring" style={{ left: `${box.left - 4}px`, top: `${box.top - 4}px`, width: `${box.width + 8}px`, height: `${box.height + 8}px` }} />
      <div ref={bubble} class="coach panel" style={style} role="dialog" aria-label="Tutorial">
        <span class="label cyan">Tutorial · {STEPS.indexOf(step) + 1}/{STEPS.length}</span>
        <p>{withTerms(iconize(step.text))}</p>
        <div class="coach-actions">
          <button class="ghost" onClick={() => done(STEPS.map((s) => s.id))}>
            Skip tutorial
          </button>
          <button class="primary" onClick={() => done([step.id])}>
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
