import type { Side } from "../engine";
import { Cta, LogoMark, Ticker } from "../ui";

const LABEL: Record<Side, string> = { corp: "Corp", runner: "Runner" };

export function Handoff({ side, onReady }: { side: Side; onReady: () => void }) {
  return (
    <>
      <Ticker>
        Hand-off <span class={side === "corp" ? "cyan" : ""}>{LABEL[side]}</span>
      </Ticker>
      <div class="screen handoff">
        <LogoMark />
        <span class="label">Pass the device to</span>
        <span class="big">{LABEL[side].toUpperCase()}</span>
        <p class="hint">The board stays hidden until the {LABEL[side]} player is ready.</p>
        <Cta onClick={onReady}>I'm the {LABEL[side]}</Cta>
      </div>
    </>
  );
}
