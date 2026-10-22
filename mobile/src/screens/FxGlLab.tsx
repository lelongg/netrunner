import { useRef, useState } from "preact/hooks";
import { INSTALL, PLAY, REZ } from "../fx/signatures";
import { FX, glEffect } from "../fx/gl";
import { setAim } from "../fx/gl/aim";

const CODES: Record<string, string> = {
  "Sure Gamble": "30030",
  "Hedge Fund": "30075",
  Overclock: "30029",
  "Creative Commission": "30020",
  "Petty Cash": "35081",
  "Predictive Planogram": "30056",
  Jailbreak: "30028",
  Ritual: "35026",
  "Pinhole Threading": "33013",
  "Mutual Favor": "30011",
  "Clean Getaway": "35014",
  "DZMZ Optimizer": "30022",
  Fermenter: "30007",
  "Rising Tide": "35009",
  Echelon: "30025",
  Carmen: "30015",
  "Docklands Pass": "30013",
  "Spin Doctor": "30053",
  Ping: "30055",
  Flyswatter: "35079",
  "Transfer of Wealth": "35017",
  "Daily Casts": "26094",
  "Measured Response": "35078",
  "Event Horizon": "36058",
  Botulus: "30004",
  "Key Performance Indicators": "35077",
  Pharos: "30063",
  Unity: "30026",
  "Seamless Launch": "30040",
  Sleipnir: "36030",
  Conduit: "30024",
  "Humanoid Resources": "35039",
  "Hansei Review": "30048",
  Gourmand: "35007",
  Touchstone: "36021",
  "Wildcat Strike": "30002",
  Tocsin: "36060",
  "Telework Contract": "30027",
  "Nihilo Agent": "36049",
  "Semak-samun": "35054",
};

const ICE = new Set(["Ping", "Flyswatter", "Event Horizon", "Pharos", "Sleipnir", "Tocsin", "Semak-samun"]);

const DEMOS = (Object.keys(FX) as (keyof typeof FX)[]).flatMap((kind) => Object.keys(FX[kind]).map((title) => ({ kind, title, code: CODES[title] })));

export function FxGlLab() {
  const [pick, setPick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [aimed, setAimed] = useState(false);
  const dummy = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const demo = DEMOS[pick];
  const play = async (which: "before" | "after") => {
    if (busy || !img.current) return;
    setBusy(true);
    const rect = img.current.getBoundingClientRect();
    const gone = dummy.current?.querySelector(".fxgl-gone")?.getBoundingClientRect();
    setAim(aimed ? { advanced: ["lab-target"], gone: gone ? [gone] : [], hostOf: new Map([["lab-self", "lab-target"]]), corpLost: 3, gripLost: 2 } : { advanced: [], gone: [], hostOf: new Map(), corpLost: 0, gripLost: 0 });
    if (which === "before") {
      const table = demo.kind === "play" ? PLAY : demo.kind === "install" ? INSTALL : demo.kind === "rez" ? REZ : {};
      table[demo.title]?.(rect);
      await new Promise((r) => setTimeout(r, 2400));
    } else await glEffect(demo.kind, demo.title, rect, demo.code, img.current, "runner");
    setBusy(false);
  };
  return (
    <div class="screen fxgl">
      <header class="screen-head">
        <h1>FX LAB · GL</h1>
      </header>
      <div class="fxgl-stage">
        <img ref={img} data-cid="lab-self" class={`${ICE.has(demo.title) ? "ice" : ""} ${ICE.has(demo.title) && demo.kind === "install" ? "unrezzed" : ""}`} src={`https://card-images.netrunnerdb.com/v2/large/${demo.code}.jpg`} alt={demo.title} crossOrigin="anonymous" />
      </div>
      {aimed && (
        <div class="fxgl-aim" ref={dummy}>
          <div class="playfield">
            <div class="tile" data-cid="lab-target" />
          </div>
          <div class="fxgl-gone" />
          <div data-anchor="runner-hand" class="fxgl-grip" />
          <div data-anchor="corp-credits" class="fxgl-credits" />
          <div data-anchor="runner-panel" class="fxgl-panel" />
        </div>
      )}
      <div class="fxgl-row">
        <button disabled={busy} onClick={() => play("before")}>
          Before
        </button>
        <button class="on" disabled={busy} onClick={() => play("after")}>
          After
        </button>
        <button class={aimed ? "on" : ""} disabled={busy} onClick={() => setAimed(!aimed)}>
          Targets
        </button>
      </div>
      <ul class="fxgl-list">
        {DEMOS.map((d, i) => (
          <li>
            <button class={i === pick ? "on" : ""} disabled={busy} onClick={() => setPick(i)}>
              {d.title} · {d.kind}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
