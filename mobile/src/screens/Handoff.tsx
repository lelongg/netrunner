import type { Side } from "../engine";
import { Cta, LogoMark, Ticker } from "../ui";
import CursorGrid from "../game/CursorGrid";
import { motionOff } from "../settings";

const LABEL: Record<Side, string> = { corp: "Corp", runner: "Runner" };
const TINT: Record<Side, [string, string]> = { corp: ["#3aa3b5", "#2b8a9a"], runner: ["#ff5a4f", "#b2443c"] };

export function Handoff({ side, onReady }: { side: Side; onReady: () => void }) {
  const still = motionOff();
  return (
    <>
      <Ticker>
        Hand-off <span class={side === "corp" ? "cyan" : ""}>{LABEL[side]}</span>
      </Ticker>
      <div class={`screen handoff handoff-${side}`}>
        <div class="handoff-bg" aria-hidden="true">
          <CursorGrid className="handoff-grid" cellSize={28} color={TINT[side][0]} gridColor={TINT[side][1]} radius={110} holdTime={200} fadeDuration={1400} maxOpacity={0.7} fillOpacity={0} gridOpacity={0.08} spotlight={0.35} ambient={still ? 0 : 0.8} fps={30} tempo={1.4} clickPulse={!still} intro={!still} edgeFade={0.1} />
          <span class="handoff-watermark">{LABEL[side].toUpperCase()}</span>
          {!still && <i class="handoff-scan" />}
        </div>
        <div class="handoff-mark">
          <i class="handoff-ring outer" />
          <i class="handoff-ring inner" />
          <LogoMark />
        </div>
        <span class="label">Pass the device to</span>
        <span class="big">{LABEL[side].toUpperCase()}</span>
        <Cta onClick={onReady}>I'm the {LABEL[side]}</Cta>
      </div>
    </>
  );
}
