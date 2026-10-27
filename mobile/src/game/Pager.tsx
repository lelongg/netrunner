import { useEffect } from "preact/hooks";
import { Icon } from "../icons";
import { t } from "../i18n";

export function Pager({ index, count, onStep, onJump }: { index: number; count: number; onStep: (dir: -1 | 1) => void; onJump?: (to: number) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onStep(-1);
      else if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep]);

  if (count < 2) return null;
  return (
    <div class={`pager ${onJump ? "jumps" : ""}`}>
      {onJump && (
        <button class="ghost" disabled={index <= 0} onClick={() => onJump(0)} aria-label={t("First card")}>
          <Icon name="first" />
        </button>
      )}
      <button class="ghost" disabled={index <= 0} onClick={() => onStep(-1)} aria-label={t("Previous card")}>
        <Icon name="chevron-left" />
      </button>
      <span class="label">
        {index + 1} / {count}
      </span>
      <button class="ghost" disabled={index >= count - 1} onClick={() => onStep(1)} aria-label={t("Next card")}>
        <Icon name="chevron-right" />
      </button>
      {onJump && (
        <button class="ghost" disabled={index >= count - 1} onClick={() => onJump(count - 1)} aria-label={t("Last card")}>
          <Icon name="last" />
        </button>
      )}
    </div>
  );
}
