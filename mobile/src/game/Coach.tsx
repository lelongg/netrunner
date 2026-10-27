import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { skipTutorial } from "../tutorial";
import type { Side } from "../engine";
import type { Session } from "../session";
import { animate } from "../fx/core";
import { motionOff } from "../settings";
import { withTerms } from "./RichText";
import { iconize } from "./text";
import { findCard, promptOf } from "./actions";
import { type Beat, RESTRICTED, TUTORIALS } from "./coachScript";
import { t } from "../i18n";

interface Step {
  id: string;
  anchor: string;
  text: string;
  when: (view: any, side: Side) => boolean;
}

const prompt = (view: any, side: Side) => promptOf(view, side);
const accessing = (view: any, side: Side) => {
  const p = prompt(view, side);
  return !!p && p["prompt-type"] !== "run" && /access/i.test(JSON.stringify(p.msg ?? ""));
};

const RUNNER: Step[] = [
  { id: "encounter", anchor: ".encounter", text: "Each subroutine you don't break fires. Your icebreaker must match the ice type (barrier, code gate, sentry) and reach its strength before breaking.", when: (v) => !!v.encounters },
  { id: "access", anchor: ".prompt button", text: "Accessed agendas are stolen. Other cards can be trashed by paying their trash cost, or left in place.", when: accessing },
  { id: "tagged", anchor: ".me-bar", text: "You are tagged! While you have a tag, the Corp may spend a click and 2[credit] to trash one of your resources. Remove a tag with a click and 2[credit].", when: (v) => (v.runner?.tag?.total ?? 0) > 0 },
  { id: "discard", anchor: ".prompt", text: "Too many cards: you discard down to your maximum hand size at the end of your turn.", when: (v, s) => /discard/i.test(JSON.stringify(prompt(v, s)?.msg ?? "")) },
];

const CORP: Step[] = [
  { id: "rez", anchor: ".actions .buttons", text: "The Runner approaches face-down ice: rez it now to make it fight, or save your credits and let the Runner pass.", when: (v) => v.run?.phase === "approach-ice" && !!document.querySelector(".actions .buttons") },
  { id: "stolen", anchor: ".opp", text: "The Runner stole an agenda. Protect your servers with more ice, or bait with traps and assets.", when: (v) => (v.runner?.["agenda-point"] ?? 0) > 0 },
  { id: "tagged", anchor: ".opp", text: "The Runner is tagged: you may spend a click and 2[credit] to trash one of its resources.", when: (v) => (v.runner?.tag?.total ?? 0) > 0 },
  { id: "discard", anchor: ".prompt", text: "Too many cards: you discard down to your maximum hand size at the end of your turn.", when: (v, s) => /discard/i.test(JSON.stringify(prompt(v, s)?.msg ?? "")) },
];

const key = (id: string) => `nsg.coach.${id}`;

function loadSeen(id: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key(id)) ?? "[]"));
  } catch {
    return new Set();
  }
}

function loadIndex(id: string): number {
  try {
    return Number(localStorage.getItem(`nsg.coach.${id}.beat`) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function Coach({ session, view, side }: { session: Session; view: any; side: Side }) {
  const id = session.saveId ?? "tutorial";
  const script = TUTORIALS[side];
  const [seen, setSeen] = useState(() => loadSeen(id));
  const [index, setIndex] = useState(() => loadIndex(id));
  const [opened, setOpened] = useState<string | null>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [nudge, setNudge] = useState(0);
  const bubble = useRef<HTMLDivElement>(null);
  const TIPS = side === "corp" ? CORP : RUNNER;
  const beat: Beat | undefined = view.winner ? undefined : script.beats[index];
  const live = !!beat && (opened === beat.id || !beat.when || beat.when(view));
  const tip = !beat && !view.winner ? TIPS.find((s) => !seen.has(s.id) && s.when(view, side) && document.querySelector(s.anchor)) : undefined;
  const acting = live && !!beat?.done;
  const shown = live ? beat : tip;

  const advance = () => {
    const next = index + 1;
    setIndex(next);
    setOpened(null);
    try {
      localStorage.setItem(`nsg.coach.${id}.beat`, String(next));
    } catch {}
  };

  const done = (ids: string[]) => {
    const next = new Set([...seen, ...ids]);
    setSeen(next);
    try {
      localStorage.setItem(key(id), JSON.stringify([...next]));
    } catch {}
  };

  const skip = () => {
    setIndex(script.beats.length);
    try {
      localStorage.setItem(`nsg.coach.${id}.beat`, String(script.beats.length));
    } catch {}
    done(TIPS.map((s) => s.id));
    skipTutorial();
  };

  useEffect(() => {
    if (live && beat && opened !== beat.id) setOpened(beat.id);
    if (live && beat?.done?.(view)) advance();
  });

  useEffect(() => {
    if (!acting || !beat?.allow) {
      session.gate = null;
      return;
    }
    const allow = beat.allow;
    session.gate = (command, args: any) => {
      const v = session.views[side];
      const verdict = allow(command, args?.card ? findCard(v, args.card.cid) : undefined, args, v);
      return verdict ?? (!beat.strict && !RESTRICTED.has(command));
    };
    session.refused = () => setNudge((n) => n + 1);
    return () => {
      session.gate = null;
      session.refused = undefined;
    };
  }, [acting, beat?.id]);

  useEffect(() => {
    session.holdBot(!!shown && !acting);
    return () => session.holdBot(false);
  }, [shown?.id, acting]);

  useLayoutEffect(() => {
    if (!shown) return setBox(null);
    const measure = () => {
      const el = document.querySelector(shown.anchor);
      setBox(el ? el.getBoundingClientRect() : null);
    };
    document.querySelector(shown.anchor)?.scrollIntoView({ block: "nearest" });
    measure();
    const timer = setInterval(measure, 250);
    addEventListener("resize", measure);
    return () => {
      clearInterval(timer);
      removeEventListener("resize", measure);
    };
  }, [shown?.id]);

  useLayoutEffect(() => {
    if (shown && bubble.current && !motionOff()) animate(bubble.current, { opacity: [0, 1], y: [10, 0] }, { duration: 0.25 });
  }, [shown?.id]);

  useLayoutEffect(() => {
    if (nudge && bubble.current && !motionOff()) animate(bubble.current, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.35 });
  }, [nudge]);

  if (!shown || (!box && !acting)) return null;
  const sheetOpen = !!document.querySelector(".sheet");
  const below = !!box && innerHeight - box.bottom >= box.top;
  const style = sheetOpen || !box ? { top: "8px" } : below ? { top: `${Math.min(box.bottom + 12, innerHeight - 220)}px` } : { bottom: `${Math.min(innerHeight - box.top + 12, innerHeight - 220)}px` };
  const total = script.beats.length;
  return (
    <>
      {box && !sheetOpen && <div class={`coach-ring ${acting ? "soft" : ""}`} style={{ left: `${box.left - 4}px`, top: `${box.top - 4}px`, width: `${box.width + 8}px`, height: `${box.height + 8}px` }} />}
      <div ref={bubble} class={`coach panel ${acting ? "acting" : ""}`} style={style} role="dialog" aria-label={t("Tutorial")}>
        <span class="label cyan">{live ? `${t("Tutorial")} · ${index + 1}/${total}` : t("Tip")}</span>
        <p>{withTerms(iconize(t(shown.text)))}</p>
        <div class="coach-actions">
          <button class="ghost" onClick={skip}>
            {t("Skip tutorial")}
          </button>
          {!acting && (
            <button class="primary" onClick={() => (live ? advance() : done([shown.id]))}>
              {t("Got it")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
