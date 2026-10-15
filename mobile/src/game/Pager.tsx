import { useEffect } from "preact/hooks";

export function Pager({ index, count, onStep }: { index: number; count: number; onStep: (dir: -1 | 1) => void }) {
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
    <div class="pager">
      <button class="ghost" disabled={index <= 0} onClick={() => onStep(-1)} aria-label="Previous card">
        ‹
      </button>
      <span class="label">
        {index + 1} / {count}
      </span>
      <button class="ghost" disabled={index >= count - 1} onClick={() => onStep(1)} aria-label="Next card">
        ›
      </button>
    </div>
  );
}
