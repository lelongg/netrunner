import { audio } from "./sound";
import { onSettings, settings } from "./settings";

export type Mood = "off" | "menu" | "calm" | "tension" | "run";
type Layer = "menu" | "base" | "tension" | "run";

const LOOP = 34.909090909;
const ROLL = 0.5;
const FADE = 1.2;
const LAYERS: Layer[] = ["menu", "base", "tension", "run"];
const MIX: Record<Mood, Partial<Record<Layer, number>>> = {
  off: {},
  menu: { menu: 1 },
  calm: { base: 1 },
  tension: { base: 1, tension: 1 },
  run: { base: 1, tension: 0.75, run: 1 },
};

const buffers = new Map<Layer, Promise<AudioBuffer | null>>();
const gains = new Map<Layer, GainNode>();
const sources = new Map<Layer, AudioBufferSourceNode>();
let master: GainNode | null = null;
let mood: Mood = "off";
let stopTimer = 0;
let token = 0;

const enabled = () => settings.music && settings.musicVolume > 0;

function load(layer: Layer) {
  let buffer = buffers.get(layer);
  if (!buffer) {
    const ctx = audio()!;
    buffer = fetch(`music/music_${layer}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
      .catch(() => {
        buffers.delete(layer);
        return null;
      });
    buffers.set(layer, buffer);
  }
  return buffer;
}

function gainOf(ctx: AudioContext, layer: Layer) {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = settings.musicVolume;
    master.connect(ctx.destination);
  }
  let gain = gains.get(layer);
  if (!gain) {
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);
    gains.set(layer, gain);
  }
  return gain;
}

function stop(layers: Layer[]) {
  for (const layer of layers) {
    try {
      sources.get(layer)?.stop();
    } catch {}
    sources.delete(layer);
  }
}

async function start(ctx: AudioContext, layers: Layer[], run: number) {
  const loaded = await Promise.all(layers.map(load));
  if (run !== token || loaded.some((b) => !b)) return;
  const when = ctx.currentTime + 0.05;
  layers.forEach((layer, i) => {
    const source = ctx.createBufferSource();
    source.buffer = loaded[i];
    source.loop = true;
    source.loopStart = ROLL;
    source.loopEnd = ROLL + LOOP;
    source.connect(gainOf(ctx, layer));
    source.start(when, ROLL);
    sources.set(layer, source);
  });
}

function apply() {
  const ctx = audio();
  if (!ctx) return;
  const run = ++token;
  clearTimeout(stopTimer);
  const mix = enabled() ? MIX[mood] : {};
  const game: Layer[] = ["base", "tension", "run"];
  const wantGame = game.some((l) => mix[l]);
  const wantMenu = !!mix.menu;
  if (wantGame && !game.every((l) => sources.has(l))) {
    stop(game);
    start(ctx, game, run);
  }
  if (wantMenu && !sources.has("menu")) start(ctx, ["menu"], run);
  const now = ctx.currentTime;
  for (const layer of LAYERS) {
    const gain = gainOf(ctx, layer).gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(mix[layer] ?? 0, now + FADE);
  }
  stopTimer = window.setTimeout(() => {
    if (!wantGame) stop(game);
    if (!wantMenu) stop(["menu"]);
  }, (FADE + 0.3) * 1000);
}

export function setMood(next: Mood) {
  if (next === mood) return;
  mood = next;
  apply();
}

export function initMusic() {
  onSettings(() => {
    const ctx = audio();
    if (ctx && master) master.gain.setTargetAtTime(settings.musicVolume, ctx.currentTime, 0.1);
    const playing = sources.size > 0;
    if (playing !== (enabled() && mood !== "off")) apply();
  });
  document.addEventListener("visibilitychange", () => {
    const ctx = audio();
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (settings.sound || enabled()) ctx.resume().catch(() => {});
  });
}
