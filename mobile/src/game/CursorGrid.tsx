// Adapted from React Bits CursorGrid, Copyright (c) 2026 David Haz, MIT + Commons Clause License Condition v1.0

import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

export type CursorGridFalloff = 'linear' | 'smooth' | 'sharp';
export type CursorGridHighlight = 'area' | 'cell';
export type CursorGridStyle = 'lines' | 'dashed' | 'dots' | 'crosses';

export interface CursorGridProps {
  cellSize?: number;
  color?: string;
  gridColor?: string;
  radius?: number;
  falloff?: CursorGridFalloff;
  highlight?: CursorGridHighlight;
  holdTime?: number;
  fadeDuration?: number;
  lineWidth?: number;
  maxOpacity?: number;
  fillOpacity?: number;
  gridOpacity?: number;
  gridStyle?: CursorGridStyle;
  cellRadius?: number;
  cellGap?: number;
  spotlight?: number;
  clickPulse?: boolean;
  pulseSpeed?: number;
  ambient?: number;
  fps?: number;
  tempo?: number;
  edgeFade?: number;
  intro?: boolean;
  lightMode?: boolean;
  dpr?: number;
  children?: ComponentChildren;
  className?: string;
  style?: JSX.CSSProperties;
}

type Settings = {
  cellSize: number;
  color: string;
  gridColor: string;
  radius: number;
  falloff: CursorGridFalloff;
  highlight: CursorGridHighlight;
  holdTime: number;
  fadeDuration: number;
  lineWidth: number;
  maxOpacity: number;
  fillOpacity: number;
  gridOpacity: number;
  gridStyle: number;
  cellRadius: number;
  cellGap: number;
  spotlight: number;
  clickPulse: boolean;
  pulseSpeed: number;
  ambient: number;
  fps: number;
  tempo: number;
  edgeFade: number;
  intro: boolean;
  dpr?: number;
};

type Pulse = { x: number; y: number; t0: number; strength: number };

type Walker = { x: number; y: number; dx: number; dy: number; progress: number; speed: number; life: number; strength: number; trail: number[]; drain: number };

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

const INTRO_SECONDS = 1.4;
const STYLES: Record<string, number> = { lines: 0, dashed: 1, dots: 2, crosses: 3 };

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform vec2 uOffset;
uniform float uCellSize;
uniform sampler2D uState;
uniform ivec2 uCells;
uniform vec3 uColor;
uniform vec3 uGridColor;
uniform float uLineWidth;
uniform float uMaxOpacity;
uniform float uFillOpacity;
uniform float uGridOpacity;
uniform float uCellRadius;
uniform float uCellGap;
uniform int uGridStyle;
uniform vec2 uMouse;
uniform float uRadius;
uniform float uSpotlight;
uniform float uPresence;
uniform float uEdgeFade;
uniform float uReveal;
uniform vec4 uPulses[8];
uniform int uPulseCount;
uniform float uBand;
uniform float uTime;
uniform float uField;

out vec4 outColor;

float level(vec2 cell) {
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= float(uCells.x) || cell.y >= float(uCells.y)) return 0.0;
  float v = texelFetch(uState, ivec2(cell), 0).r;
  return v * v * (3.0 - 2.0 * v);
}

float line(float d, float width) {
  float w = max(width, 1.0);
  return clamp(w * 0.5 + 0.5 - d, 0.0, 1.0) * (width / w);
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 pos = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 g = (pos - uOffset) / uCellSize;
  vec2 cell = floor(g);
  vec2 f = g - cell;
  vec2 edge = min(f, 1.0 - f) * uCellSize;

  float vx = line(edge.x, uLineWidth);
  float vy = line(edge.y, uLineWidth);
  if (uGridStyle == 1) {
    float dash = uCellSize / 6.0;
    vx *= step(0.5, fract((pos.y - uOffset.y) / dash + 0.25));
    vy *= step(0.5, fract((pos.x - uOffset.x) / dash + 0.25));
  } else if (uGridStyle == 2) {
    float r = max(uLineWidth * 1.25, 1.2);
    float d = length(edge);
    vx = clamp(r + 0.5 - d, 0.0, 1.0);
    vy = 0.0;
  } else if (uGridStyle == 3) {
    float arm = uCellSize * 0.1 + uLineWidth;
    vx *= step(edge.y, arm);
    vy *= step(edge.x, arm);
  }
  float mark = max(vx, vy);

  float wave = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uPulseCount) break;
    vec4 p = uPulses[i];
    float off = length(pos - p.xy) - p.z;
    float t = off > 0.0 ? off / (uBand * 1.6) : off / (uBand * 2.6);
    wave = max(wave, p.w * exp(-t * t));
  }
  float n = (sin(g.x * 0.55 + uTime * 0.35) + sin(g.y * 0.4 - uTime * 0.27) + sin((g.x + g.y) * 0.3 + uTime * 0.19) + sin(length(g - vec2(uCells) * 0.5 - vec2(sin(uTime * 0.07) * float(uCells.x), 0.0)) * 0.45 - uTime * 0.5)) / 4.0;
  float field = smoothstep(0.15, 1.0, n) * uField;

  vec2 toMouse = pos - uMouse;
  float spot = exp(-dot(toMouse, toMouse) / max(uRadius * uRadius, 1.0) * 1.6) * uSpotlight * uPresence;

  vec2 center = uResolution * 0.5;
  float reach = length(center);
  float shown = smoothstep(uReveal * (reach + uCellSize * 2.0), uReveal * (reach + uCellSize * 2.0) - uCellSize * 2.0, length(pos - center));
  shown = uReveal >= 1.0 ? 1.0 : shown;

  float fade = 1.0;
  if (uEdgeFade > 0.0) {
    vec2 norm = pos / uResolution;
    vec2 a = clamp(norm / uEdgeFade, 0.0, 1.0);
    vec2 b = clamp((1.0 - norm) / uEdgeFade, 0.0, 1.0);
    vec2 sa = a * a * a * (a * (a * 6.0 - 15.0) + 10.0);
    vec2 sb = b * b * b * (b * (b * 6.0 - 15.0) + 10.0);
    fade = sa.x * sa.y * sb.x * sb.y;
  }

  float own = level(cell);
  float gridAlpha = mark * min(uGridOpacity + spot * 0.45, 1.0) * fade * shown;
  float litAlpha = 0.0;
  float fillAlpha = 0.0;

  if (uCellGap <= 0.0 && uCellRadius <= 0.0) {
    vec2 side = step(0.5, f) * 2.0 - 1.0;
    float nx = level(cell + vec2(side.x, 0.0));
    float ny = level(cell + vec2(0.0, side.y));
    float nc = level(cell + side);
    float ex = max(own, nx);
    float ey = max(own, ny);
    float joint = max(max(ex, ey), nc);
    float lit;
    if (uGridStyle == 2) lit = vx * joint;
    else if (uGridStyle == 3) lit = max(vx * (edge.y < uLineWidth ? joint : ex), vy * (edge.x < uLineWidth ? joint : ey));
    else lit = max(vx * (edge.y < uLineWidth ? joint : ex), vy * (edge.x < uLineWidth ? joint : ey));
    litAlpha = lit * uMaxOpacity;
    fillAlpha = own * uFillOpacity;
  } else if (own > 0.0) {
    vec2 local = (f - 0.5) * uCellSize;
    float halfSize = uCellSize * 0.5 - max(uCellGap, 0.0);
    float radius = min(uCellRadius, halfSize);
    float sd = roundBox(local, vec2(halfSize), radius);
    float inside = clamp(0.5 - sd, 0.0, 1.0);
    float border = line(abs(sd + uLineWidth * 0.5), uLineWidth) * inside;
    litAlpha = border * own * uMaxOpacity;
    fillAlpha = inside * own * uFillOpacity;
  }
  litAlpha *= fade;
  fillAlpha *= fade;

  float edgeGlow = mark * max(wave, field) * uMaxOpacity * fade * shown;
  float cellAlpha = clamp(max(max(litAlpha, fillAlpha), edgeGlow), 0.0, 1.0);
  float alpha = cellAlpha + gridAlpha * (1.0 - cellAlpha);
  vec3 premul = uColor * cellAlpha + uGridColor * gridAlpha * (1.0 - cellAlpha);
  outColor = vec4(premul, alpha);
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl: WebGL2RenderingContext): Program | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const colorCache = new Map<string, number[]>();

const parseHex = (hex: string): number[] => {
  let h = String(hex || '#ffffff')
    .replace('#', '')
    .trim();
  if (h.length === 3 || h.length === 4)
    h = h
      .slice(0, 3)
      .split('')
      .map(c => c + c)
      .join('');
  const num = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(num)) return [1, 1, 1];
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
};

const hexToRgb = (hex: string): number[] => {
  const key = String(hex);
  const cached = colorCache.get(key);
  if (cached) return cached;
  const rgb = parseHex(hex);
  if (colorCache.size > 64) colorCache.clear();
  colorCache.set(key, rgb);
  return rgb;
};

const CursorGrid = ({
  cellSize = 60,
  color,
  gridColor,
  radius = 140,
  falloff = 'smooth',
  highlight = 'area',
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1,
  maxOpacity = 1,
  fillOpacity = 0.06,
  gridOpacity = 0.08,
  gridStyle = 'lines',
  cellRadius = 0,
  cellGap = 0,
  spotlight = 0.6,
  clickPulse = true,
  pulseSpeed = 600,
  ambient = 0,
  fps = 0,
  tempo = 1,
  edgeFade = 0.2,
  intro = true,
  lightMode = false,
  dpr,
  children,
  className = '',
  style
}: CursorGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signalRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const ink = lightMode ? '#18181b' : '#ffffff';
  const settings: Settings = {
    cellSize: Math.max(8, cellSize),
    color: color || ink,
    gridColor: gridColor || ink,
    radius: Math.max(1, radius),
    falloff,
    highlight,
    holdTime: Math.max(0, holdTime),
    fadeDuration: Math.max(16, fadeDuration),
    lineWidth: Math.max(0.25, lineWidth),
    maxOpacity: clamp(maxOpacity, 0, 1),
    fillOpacity: clamp(fillOpacity, 0, 1),
    gridOpacity: clamp(gridOpacity, 0, 1),
    gridStyle: STYLES[gridStyle] ?? 0,
    cellRadius: Math.max(0, cellRadius),
    cellGap: Math.max(0, cellGap),
    spotlight: clamp(spotlight, 0, 1),
    clickPulse,
    pulseSpeed: Math.max(1, pulseSpeed),
    ambient: clamp(ambient, 0, 1),
    fps: Math.max(0, fps),
    tempo: Math.max(0.1, tempo),
    edgeFade: clamp(edgeFade, 0, 0.5),
    intro,
    dpr
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const signalCanvas = signalRef.current;
    const pen = signalCanvas?.getContext('2d');
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!container || !canvas || !gl || !signalCanvas || !pen) return undefined;
    const shader = link(gl);
    if (!shader) return undefined;
    const u = shader.uniforms;
    const vao = gl.createVertexArray();
    const stateTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, stateTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const view = { width: 1, height: 1, ratio: 1, cellSize: 0 };
    const grid = { cols: 0, rows: 0, offX: 0, offY: 0 };
    const pointer = { x: 0, y: 0, inside: false };
    const mouse = { x: 0, y: 0 };
    const pulses: Pulse[] = [];
    let levels = new Float32Array(0);
    let targets = new Float32Array(0);
    let touched = new Float32Array(0);
    let pixels = new Uint8Array(0);
    const walkers: Walker[] = [];
    let nextRipple = 2;
    let drawn = 0;
    let pace = 0;
    const pickSpeed = () => {
      const roll = Math.random();
      return roll < 0.45 ? 1.2 + Math.random() * 2 : roll < 0.85 ? 4 + Math.random() * 4 : 11 + Math.random() * 7;
    };
    let presence = 0;
    let clock = 0;
    let introClock = settingsRef.current.intro && !reduce ? 0 : 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let dirty = true;

    const rebuild = () => {
      const s = settingsRef.current;
      view.width = Math.max(1, container.clientWidth);
      view.height = Math.max(1, container.clientHeight);
      view.ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(view.width * view.ratio));
      canvas.height = Math.max(1, Math.round(view.height * view.ratio));
      signalCanvas.width = canvas.width;
      signalCanvas.height = canvas.height;
      const size = s.cellSize;
      const cols = Math.ceil(view.width / size) + 1;
      const rows = Math.ceil(view.height / size) + 1;
      const resized = cols !== grid.cols || rows !== grid.rows || size !== view.cellSize;
      grid.cols = cols;
      grid.rows = rows;
      grid.offX = (view.width - cols * size) / 2;
      grid.offY = (view.height - rows * size) / 2;
      view.cellSize = size;
      if (resized) {
        levels = new Float32Array(cols * rows);
        targets = new Float32Array(cols * rows);
        touched = new Float32Array(cols * rows).fill(-1e9);
        pixels = new Uint8Array(cols * rows);
        walkers.length = 0;
        gl.bindTexture(gl.TEXTURE_2D, stateTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cols, rows, 0, gl.RED, gl.UNSIGNED_BYTE, pixels);
      }
      dirty = true;
    };

    const draw = () => {
      const s = settingsRef.current;
      const ratio = view.ratio;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(shader.program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, stateTexture);
      if (dirty) {
        for (let i = 0; i < levels.length; i++)
          pixels[i] = Math.round(clamp(levels[i], 0, 1) * 255);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid.cols, grid.rows, gl.RED, gl.UNSIGNED_BYTE, pixels);
        dirty = false;
      }
      const lineDevice = s.lineWidth * ratio;
      const snap = Math.round(lineDevice) % 2 === 1 ? 0.5 : 0;
      gl.uniform1i(u.uState, 0);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform2f(u.uOffset, Math.round(grid.offX * ratio) + snap, Math.round(grid.offY * ratio) + snap);
      gl.uniform1f(u.uCellSize, s.cellSize * ratio);
      gl.uniform2i(u.uCells, grid.cols, grid.rows);
      gl.uniform3fv(u.uColor, hexToRgb(s.color));
      gl.uniform3fv(u.uGridColor, hexToRgb(s.gridColor));
      gl.uniform1f(u.uLineWidth, lineDevice);
      gl.uniform1f(u.uMaxOpacity, s.maxOpacity);
      gl.uniform1f(u.uFillOpacity, s.fillOpacity);
      gl.uniform1f(u.uGridOpacity, s.gridOpacity);
      gl.uniform1f(u.uCellRadius, s.cellRadius * ratio);
      gl.uniform1f(u.uCellGap, s.cellGap * ratio);
      gl.uniform1i(u.uGridStyle, s.gridStyle);
      gl.uniform2f(u.uMouse, mouse.x * ratio, mouse.y * ratio);
      gl.uniform1f(u.uRadius, s.radius * ratio);
      gl.uniform1f(u.uSpotlight, s.spotlight);
      gl.uniform1f(u.uPresence, presence);
      gl.uniform1f(u.uEdgeFade, s.edgeFade);
      gl.uniform1f(u.uReveal, introClock >= 1 ? 1 : 1 - Math.pow(1 - introClock, 2.2));
      const far = Math.hypot(view.width, view.height);
      const ring = new Float32Array(32);
      const count = Math.min(pulses.length, 8);
      for (let k = 0; k < count; k++) {
        const pulse = pulses[pulses.length - 1 - k];
        const radius = Math.max(0, (clock - pulse.t0) * s.pulseSpeed);
        ring.set([pulse.x * ratio, pulse.y * ratio, radius * ratio, pulse.strength * Math.pow(Math.max(0, 1 - radius / far), 0.6)], k * 4);
      }
      gl.uniform4fv(u['uPulses[0]'] ?? u.uPulses, ring);
      gl.uniform1i(u.uPulseCount, count);
      gl.uniform1f(u.uBand, s.cellSize * ratio);
      gl.uniform1f(u.uTime, pace);
      gl.uniform1f(u.uField, s.ambient > 0 && !reduce ? 0.45 + 0.45 * s.ambient : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    };

    const TAIL = 3.5;

    const spawn = (from?: Walker) => {
      const { cols, rows } = grid;
      if (from) {
        const turn = Math.random() < 0.5 ? 1 : -1;
        walkers.push({ x: from.x, y: from.y, dx: -from.dy * turn, dy: from.dx * turn, progress: 0, speed: from.speed * (0.8 + Math.random() * 0.4), life: 3 + Math.random() * 8, strength: from.strength * 0.85, trail: [from.x, from.y], drain: TAIL });
        return;
      }
      const side = Math.floor(Math.random() * 4);
      const x = side === 0 ? 0 : side === 1 ? cols : 1 + Math.floor(Math.random() * (cols - 1));
      const y = side === 2 ? 0 : side === 3 ? rows : 1 + Math.floor(Math.random() * (rows - 1));
      const dx = side === 0 ? 1 : side === 1 ? -1 : 0;
      const dy = side === 2 ? 1 : side === 3 ? -1 : 0;
      walkers.push({ x, y, dx, dy, progress: 0, speed: pickSpeed(), life: 10 + Math.random() * 25, strength: 0.6 + Math.random() * 0.4, trail: [x, y], drain: TAIL });
    };

    const paintSignals = (s: Settings) => {
      const size = s.cellSize * view.ratio;
      const ox = Math.round(grid.offX * view.ratio);
      const oy = Math.round(grid.offY * view.ratio);
      const [r, g, b] = hexToRgb(s.color).map(v => Math.round(v * 255));
      pen.clearRect(0, 0, signalCanvas.width, signalCanvas.height);
      pen.lineCap = 'round';
      pen.lineWidth = Math.max(1, s.lineWidth * view.ratio * 1.5);
      for (const w of walkers) {
        const dead = w.life <= 0;
        let hx = w.x + (dead ? 0 : w.dx * w.progress);
        let hy = w.y + (dead ? 0 : w.dy * w.progress);
        let left = dead ? w.drain : TAIL;
        let walked = 0;
        for (let k = w.trail.length - 2; k >= 0 && left > 0; k -= 2) {
          const tx = w.trail[k];
          const ty = w.trail[k + 1];
          const span = Math.hypot(hx - tx, hy - ty);
          if (span === 0) continue;
          const take = Math.min(span, left);
          const ex = hx + ((tx - hx) * take) / span;
          const ey = hy + ((ty - hy) * take) / span;
          const a0 = (1 - walked / TAIL) * w.strength * s.maxOpacity;
          const a1 = (1 - (walked + take) / TAIL) * w.strength * s.maxOpacity;
          const grad = pen.createLinearGradient(ox + hx * size, oy + hy * size, ox + ex * size, oy + ey * size);
          grad.addColorStop(0, `rgba(${r},${g},${b},${a0})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},${Math.max(0, a1)})`);
          pen.strokeStyle = grad;
          pen.beginPath();
          pen.moveTo(ox + hx * size, oy + hy * size);
          pen.lineTo(ox + ex * size, oy + ey * size);
          pen.stroke();
          walked += take;
          left -= take;
          hx = ex;
          hy = ey;
        }
        if (!dead) {
          pen.fillStyle = `rgba(${r},${g},${b},${w.strength * s.maxOpacity})`;
          pen.beginPath();
          pen.arc(ox + (w.x + w.dx * w.progress) * size, oy + (w.y + w.dy * w.progress) * size, pen.lineWidth * 1.1, 0, Math.PI * 2);
          pen.fill();
        }
      }
    };

    const simulate = (dt: number, s: Settings) => {
      const { cols, rows } = grid;
      const want = Math.max(2, Math.round((cols + rows) * 0.3 * s.ambient));
      if (walkers.filter(w => w.life > 0).length < want && Math.random() < dt * 3) spawn();
      for (let k = walkers.length - 1; k >= 0; k--) {
        const w = walkers[k];
        if (w.life <= 0) {
          w.drain -= dt * w.speed * s.tempo;
          if (w.drain <= 0) walkers.splice(k, 1);
          continue;
        }
        w.progress += dt * w.speed * s.tempo;
        while (w.progress >= 1 && w.life > 0) {
          w.progress -= 1;
          w.x += w.dx;
          w.y += w.dy;
          w.trail.push(w.x, w.y);
          if (w.trail.length > 16) w.trail.splice(0, 2);
          w.life -= 1;
          w.speed = clamp(w.speed * (0.8 + Math.random() * 0.4), 0.8, 20);
          const out = w.x <= 0 || w.y <= 0 || w.x >= cols || w.y >= rows;
          if (out && (w.x + w.dx < 0 || w.y + w.dy < 0 || w.x + w.dx > cols || w.y + w.dy > rows)) w.life = 0;
          if (w.life <= 0) {
            w.progress = 0;
            break;
          }
          const roll = Math.random();
          if (roll < 0.07 && walkers.length < want * 3) spawn(w);
          else if (roll < 0.25) {
            const turn = Math.random() < 0.5 ? 1 : -1;
            [w.dx, w.dy] = [-w.dy * turn, w.dx * turn];
            if (w.x + w.dx < 0 || w.y + w.dy < 0 || w.x + w.dx > cols || w.y + w.dy > rows) [w.dx, w.dy] = [-w.dx, -w.dy];
          }
        }
      }
      nextRipple -= dt * s.ambient * s.tempo;
      if (nextRipple <= 0) {
        nextRipple = 3 + Math.random() * 5;
        pulses.push({ x: Math.random() * view.width, y: Math.random() * view.height, t0: clock, strength: 0.5 + 0.3 * s.ambient });
      }
      dirty = true;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const s = settingsRef.current;
      if (s.fps > 0 && last && now - drawn < 1000 / s.fps - 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      drawn = now;
      const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
      last = now;
      clock += dt;
      pace += dt * settingsRef.current.tempo;
      if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);

      const follow = 1 - Math.exp(-dt / 0.07);
      mouse.x += (pointer.x - mouse.x) * follow;
      mouse.y += (pointer.y - mouse.y) * follow;
      const presenceGoal = pointer.inside ? 1 : 0;
      presence += (presenceGoal - presence) * (1 - Math.exp(-dt / 0.25));

      if (s.ambient > 0 && !reduce && levels.length) simulate(dt, s);
      const far = Math.hypot(view.width, view.height) + s.cellSize * 3;
      for (let k = pulses.length - 1; k >= 0; k--) if ((clock - pulses[k].t0) * s.pulseSpeed > far) pulses.splice(k, 1);

      const holdSeconds = s.holdTime / 1000;
      const fadeStep = dt / (s.fadeDuration / 1000);
      const attack = 1 - Math.exp(-dt / 0.045);
      let active = pulses.length > 0 || introClock < 1 || Math.abs(presence - presenceGoal) > 0.002;
      for (let i = 0; i < levels.length; i++) {
        let target = targets[i];
        if (target <= 0 && levels[i] <= 0) continue;
        if (clock - touched[i] > holdSeconds) target = Math.max(0, target - fadeStep);
        targets[i] = target;
        const before = levels[i];
        const next = target > before ? before + (target - before) * attack : target;
        levels[i] = next < 0.002 ? 0 : next;
        if (levels[i] !== before) dirty = true;
        if (levels[i] > 0 || targets[i] > 0) active = true;
      }
      if (Math.abs(mouse.x - pointer.x) + Math.abs(mouse.y - pointer.y) > 0.05 && presence > 0.002) active = true;
      if (s.ambient > 0 && !reduce) active = true;

      draw();
      if (s.ambient > 0 && !reduce) paintSignals(s);
      if (active) raf = requestAnimationFrame(frame);
    };

    function wake() {
      if (!raf && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    const locate = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
    };

    const onPointerMove = (event: PointerEvent) => {
      const { x, y, inside } = locate(event);
      const was = pointer.inside;
      pointer.inside = inside;
      if (!inside) {
        if (was) wake();
        return;
      }
      pointer.x = x;
      pointer.y = y;
      if (!was) {
        mouse.x = x;
        mouse.y = y;
      }
      wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current;
      const { x, y, inside } = locate(event);
      if (!inside || !s.clickPulse || reduce) return;
      pulses.push({ x, y, t0: clock, strength: 0.45 });
      wake();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      pointer.inside = false;
      wake();
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };

    const onVisibility = () => wake();

    const resizeObserver = new ResizeObserver(() => {
      rebuild();
      draw();
      wake();
    });
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) wake();
    });
    intersection.observe(container);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    rebuild();
    if (introClock < 1) pulses.push({ x: view.width / 2, y: view.height / 2, t0: 0.15, strength: 0.6 });
    draw();
    wake();
    wakeRef.current = () => {
      const s = settingsRef.current;
      if (s.cellSize !== view.cellSize) rebuild();
      dirty = true;
      draw();
      wake();
    };

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteTexture(stateTexture);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(shader.program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  useEffect(() => {
    wakeRef.current?.();
  });

  return (
    <div ref={containerRef} class={`cursor-grid${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} class="cursor-grid__canvas" aria-hidden="true" />
      <canvas ref={signalRef} class="cursor-grid__canvas" aria-hidden="true" />
      {children ? <div class="cursor-grid__content">{children}</div> : null}
    </div>
  );
};

export default CursorGrid;
