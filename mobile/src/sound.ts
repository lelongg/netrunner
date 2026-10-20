import { settings } from "./settings";

export type Sound =
  | "agenda-score"
  | "agenda-steal"
  | "bling"
  | "click-advance"
  | "click-card"
  | "click-credit"
  | "click-remove-tag"
  | "click-run"
  | "echo"
  | "end-of-the-line"
  | "game-end"
  | "install-corp"
  | "install-runner"
  | "play-instant"
  | "pulse"
  | "rez-ice"
  | "rez-other"
  | "run-successful"
  | "run-unsuccessful"
  | "shuffle"
  | "ting"
  | "virus-purge"
  | "wave";

const VARIANTS: Partial<Record<Sound, string[]>> = {
  bling: Array.from({ length: 10 }, (_, i) => `bling-${i + 1}`),
  "click-card": ["click-card", "click-card-2", "click-card-3"],
  "click-credit": ["click-credit", "click-credit-2", "click-credit-3"],
};

let context: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<string, number>();

function audio(): AudioContext | null {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

function load(file: string): Promise<AudioBuffer | null> {
  let buffer = buffers.get(file);
  if (!buffer) {
    buffer = fetch(`sound/${file}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => new Promise<AudioBuffer>((resolve, reject) => audio()!.decodeAudioData(data, resolve, reject)))
      .catch(() => {
        buffers.delete(file);
        return null;
      });
    buffers.set(file, buffer);
  }
  return buffer;
}

export function soundOn() {
  return settings.sound && settings.volume > 0;
}

export function play(name: Sound | string, volume = 1) {
  if (!soundOn()) return;
  const ctx = audio();
  if (!ctx) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? 0) < 90) return;
  lastPlayed.set(name, now);
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const files = VARIANTS[name as Sound] ?? [name];
  const file = files[Math.floor(Math.random() * files.length)];
  load(file).then((buffer) => {
    if (!buffer || !soundOn()) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1, volume * settings.volume);
    source.connect(gain).connect(ctx.destination);
    source.start();
  });
}

export function unlockSound() {
  const resume = () => {
    if (!soundOn()) return;
    const ctx = audio();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  };
  addEventListener("pointerdown", resume, { passive: true });
  addEventListener("keydown", resume);
}
