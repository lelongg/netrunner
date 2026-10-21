import { useEffect } from "preact/hooks";
import { motionOff } from "./settings";

let granted = false;

export function useTilt(target: { current: HTMLElement | null }) {
  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined" || motionOff()) return;
    let base: [number, number] | null = null;
    let cur: [number, number] = [0, 0];
    let raf = 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      base ??= [e.beta, e.gamma];
      base = [base[0] * 0.995 + e.beta * 0.005, base[1] * 0.995 + e.gamma * 0.005];
      const want: [number, number] = [clamp((e.gamma - base[1]) / 18), clamp((e.beta - base[0]) / 18)];
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cur = [cur[0] + (want[0] - cur[0]) * 0.35, cur[1] + (want[1] - cur[1]) * 0.35];
        target.current?.style.setProperty("--tx", cur[0].toFixed(3));
        target.current?.style.setProperty("--ty", cur[1].toFixed(3));
      });
    };
    const ask = (DeviceOrientationEvent as any).requestPermission as undefined | (() => Promise<string>);
    const start = () => addEventListener("deviceorientation", onTilt);
    const unlock = () =>
      ask?.().then(
        (r) => {
          if (r !== "granted") return;
          granted = true;
          start();
        },
        () => {},
      );
    if (ask && !granted) addEventListener("pointerdown", unlock, { once: true });
    else start();
    return () => {
      removeEventListener("deviceorientation", onTilt);
      removeEventListener("pointerdown", unlock);
      cancelAnimationFrame(raf);
    };
  }, []);
}
