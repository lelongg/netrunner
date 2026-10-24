import { type Application, BlurFilter, ColorMatrixFilter, Container, DisplacementFilter, Filter, GlProgram, Graphics, RenderTexture, Sprite, Texture, defaultFilterVert } from "pixi.js";
import { AdvancedBloomFilter, GlitchFilter, GlowFilter, GodrayFilter, MotionBlurFilter, RGBSplitFilter, ShockwaveFilter, TwistFilter, ZoomBlurFilter } from "pixi-filters";
import { focusFilter, glowTexture } from "./stage";
import { noiseTexture } from "./kit";
import { KEY } from "./revJ";
import { PAINT } from "./revN";

const tinted = (fragment: string, name: string, group: string) =>
  new Filter({
    glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment, name }),
    resources: {
      [group]: {
        uWeights: { value: new Float32Array([1, 0, 0]), type: "vec3<f32>" },
        uThreshold: { value: 0, type: "f32" },
        uGain: { value: 1, type: "f32" },
        uTint: { value: new Float32Array([1, 1, 1]), type: "vec3<f32>" },
      },
    },
  });

const FILTERS: (() => Filter[])[] = [() => [new AdvancedBloomFilter({ threshold: 0.25, bloomScale: 1.4, brightness: 1.05, blur: 6, quality: 6 })], ...[8, 10, 12, 14, 18].map((distance) => () => [new GlowFilter({ distance, outerStrength: 1, innerStrength: 1, quality: 0.3 })]), () => [new GodrayFilter({ alpha: 1 })], () => [new ShockwaveFilter({ center: { x: 4, y: 4 }, radius: -1, time: 0.1 })], () => [new TwistFilter({ radius: 4, angle: 1 })], () => [new ZoomBlurFilter({ strength: 0.1 })], () => [new MotionBlurFilter({ velocity: { x: 2, y: 0 }, kernelSize: 9 })], () => [new RGBSplitFilter()], () => [new GlitchFilter({ slices: 4, offset: 2 })], () => [new ColorMatrixFilter()], () => [new BlurFilter({ strength: 2, quality: 3 })], () => [new DisplacementFilter({ sprite: new Sprite(noiseTexture()), scale: { x: 1, y: 1 } })], () => [focusFilter([0.5, 0.5], 0.1, 0.3, 1)], () => [tinted(KEY, "fx-key", "key")], () => [tinted(PAINT, "fx-paint", "paint")]];

const later = (f: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(f) : setTimeout(f, 50));

export function precompile(app: Application) {
  const target = RenderTexture.create({ width: 16, height: 16 });
  const scene = new Container();
  const sprite = new Sprite(Texture.WHITE);
  sprite.setSize(16, 16);
  const shape = new Graphics().circle(8, 8, 6).fill(0xffffff).moveTo(0, 0).lineTo(16, 16).stroke({ width: 2, color: 0xffffff });
  const heavy = new Graphics();
  for (let k = 0; k < 40; k++) heavy.circle(8, 8, 2 + k).stroke({ width: 1, color: 0xffffff });
  const glow = new Sprite(glowTexture());
  glow.blendMode = "add";
  glow.setSize(16, 16);
  const masked = new Sprite(Texture.WHITE);
  masked.setSize(16, 16);
  const mask = new Graphics().rect(0, 0, 8, 8).fill(0xffffff);
  masked.mask = mask;
  const cut = new Sprite(Texture.WHITE);
  cut.setSize(16, 16);
  const stencil = new Sprite(glowTexture());
  stencil.setSize(16, 16);
  cut.mask = stencil;
  scene.addChild(sprite, shape, heavy, glow, masked, mask, cut, stencil);
  const steps = [() => [] as Filter[], ...FILTERS];
  let i = 0;
  const step = () => {
    if (!app.renderer) return;
    if (app.stage.children.length) return later(step);
    if (i >= steps.length) {
      scene.destroy({ children: true });
      return;
    }
    scene.filters = steps[i++]();
    app.renderer.render({ container: scene, target, clear: true });
    scene.filters = [];
    later(step);
  };
  later(step);
}
