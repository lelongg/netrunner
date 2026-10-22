import { useRef, useState } from "preact/hooks";
import { INSTALL, PLAY, REZ } from "../fx/signatures";

const GL_DEMOS = [
  { title: "Sure Gamble", code: "30030", kind: "play", fx: "sureGamble" },
  { title: "Hedge Fund", code: "30075", kind: "play", fx: "hedgeFund" },
  { title: "Spin Doctor", code: "30053", kind: "rez", fx: "spinDoctor" },
  { title: "Overclock", code: "30029", kind: "play", fx: "overclock" },
  { title: "DZMZ Optimizer", code: "30022", kind: "install", fx: "dzmzInstall" },
  { title: "Ping", code: "30055", kind: "rez", fx: "pingRez" },
] as const;

export function FxGlLab() {
  const [pick, setPick] = useState(0);
  const [busy, setBusy] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const demo = GL_DEMOS[pick];
  const play = async (which: "before" | "after", i = pick) => {
    if (busy || !img.current) return;
    setBusy(true);
    const d = GL_DEMOS[i];
    const rect = img.current.getBoundingClientRect();
    if (which === "before") {
      const table = d.kind === "play" ? PLAY : d.kind === "install" ? INSTALL : REZ;
      table[d.title]?.(rect);
      await new Promise((r) => setTimeout(r, 2600));
    } else {
      img.current.style.visibility = "hidden";
      const gl = await import("../fx/gl/cards");
      await gl[d.fx](rect, d.code);
      img.current.style.visibility = "";
    }
    setBusy(false);
  };
  return (
    <div class="screen fxgl">
      <header class="screen-head">
        <h1>FX LAB · GL</h1>
      </header>
      <div class="fxgl-stage">
        <img ref={img} src={`https://card-images.netrunnerdb.com/v2/large/${demo.code}.jpg`} alt={demo.title} crossOrigin="anonymous" />
      </div>
      <div class="fxgl-row">
        <button disabled={busy} onClick={() => play("before")}>
          Before
        </button>
        <button class="on" disabled={busy} onClick={() => play("after")}>
          After
        </button>
      </div>
      <ul class="fxgl-list">
        {GL_DEMOS.map((d, i) => (
          <li>
            <button class={i === pick ? "on" : ""} disabled={busy} onClick={() => setPick(i)}>
              {d.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
