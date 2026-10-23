import { createPortal } from "preact/compat";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { type Peek, useDragPager } from "./swipe";
import { useBackClose } from "../back";
import { useHold } from "../hold";
import { cardImage } from "../engine";
import { present } from "../fx/present";

interface Props {
  code: string;
  alt: string;
  size: "small" | "medium" | "large";
  class?: string;
  lazy?: boolean;
  width?: string;
}

const WIDTH: Record<Props["size"], string> = { small: "64px", medium: "120px", large: "220px" };

export function CardImage({ code, alt, size, class: className, lazy, width }: Props) {
  const src = cardImage(code, size)!;
  const srcSet = `${cardImage(code, "small")} 116w, ${cardImage(code, "medium")} 165w, ${cardImage(code, "large")} 300w`;
  const img = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [cached, setCached] = useState(false);

  useLayoutEffect(() => {
    const el = img.current;
    const ready = !!el?.complete && el.naturalWidth > 0;
    setCached(ready);
    setState(ready ? "loaded" : "loading");
  }, [src]);

  return (
    <span class={`card-image ${state} ${cached ? "cached" : ""} ${className ?? ""}`} data-code={code} data-alt={alt}>
      {size !== "small" && state !== "error" && <img class="card-image-low" crossOrigin="anonymous" src={cardImage(code, "small")} alt="" aria-hidden="true" />}
      <img
        ref={img}
        crossOrigin="anonymous"
        src={src}
        srcset={srcSet}
        sizes={width ?? WIDTH[size]}
        alt={alt}
        loading={lazy ? "lazy" : undefined}
        decoding="async"
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
      {state === "error" && <span class="card-image-fallback">{alt}</span>}
    </span>
  );
}

export interface GalleryItem {
  code: string;
  alt: string;
}

function ZoomFrame({ code, alt, role, settled }: { code: string; alt: string; role: "prev" | "current" | "next"; settled: boolean }) {
  const [sharp, setSharp] = useState<"loading" | "loaded" | "error">(Number(code) >= 26000 ? "loading" : "error");
  const [wanted, setWanted] = useState(role === "current");
  if (!wanted && (role === "current" || settled)) setWanted(true);
  return (
    <div class={`card-zoom-frame ${role} ${sharp}`} aria-hidden={role === "current" ? undefined : "true"}>
      <img class="card-zoom-base" crossOrigin="anonymous" src={cardImage(code, "large")} alt={role === "current" ? alt : ""} decoding="async" />
      {wanted && sharp !== "error" && <img class="card-zoom-sharp" crossOrigin="anonymous" src={cardImage(code, "xlarge")} alt="" decoding="async" onLoad={() => setSharp("loaded")} onError={() => setSharp("error")} />}
    </div>
  );
}

export function CardZoom({ items, start, onClose }: { items: GalleryItem[]; start: number; onClose: (index: number) => void }) {
  const [index, setIndex] = useState(Math.max(0, start));
  const stage = useRef<HTMLDivElement>(null);
  const landed = useRef(false);
  const span = useRef(0);
  const [settled, setSettled] = useState(false);
  const frame = (role: "prev" | "current" | "next") => stage.current?.querySelector<HTMLElement>(`.card-zoom-frame.${role}`);
  const peek: Peek = {
    move: (dx) => {
      const c = frame("current");
      if (!c) return;
      const w = (span.current ||= c.offsetWidth + 24);
      for (const d of [-1, 1] as const) {
        const el = frame(d === 1 ? "next" : "prev");
        if (!el) continue;
        el.style.visibility = (d === 1 ? dx < 0 : dx > 0) ? "visible" : "hidden";
        el.style.transform = `translateX(${d * w + dx}px)`;
      }
    },
    release: (dir) => {
      span.current = 0;
      if (dir) landed.current = true;
    },
    gap: 24,
  };
  const swipe = useDragPager(
    () => frame("current"),
    (dir) => !!items[index + dir],
    (dir) => setIndex((i) => i + dir),
    peek,
  );
  useLayoutEffect(() => {
    for (const role of ["prev", "current", "next"] as const) {
      const el = frame(role);
      if (!el) continue;
      el.style.visibility = "";
      el.style.transform = "";
      el.style.opacity = "";
    }
    landed.current = false;
    span.current = 0;
    setSettled(false);
    const t = setTimeout(() => setSettled(true), 350);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(index);
      else if (e.key === "ArrowRight" && items[index + 1]) setIndex(index + 1);
      else if (e.key === "ArrowLeft" && items[index - 1]) setIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose]);

  const shown = ([["prev", index - 1], ["current", index], ["next", index + 1]] as const).filter(([, i]) => items[i]);
  return (
    <div
      class="card-zoom swipeable"
      role="dialog"
      aria-label={items[index]?.alt}
      onClick={(e) => {
        e.stopPropagation();
        onClose(index);
      }}
      {...swipe}
    >
      <div ref={stage} class="card-zoom-stage">
        {shown.map(([role, i]) => (
          <ZoomFrame key={items[i].code + ":" + i} code={items[i].code} alt={items[i].alt} role={role} settled={settled} />
        ))}
      </div>
      {items.length > 1 && (
        <span class="card-zoom-count" aria-hidden="true">
          {index + 1} / {items.length}
        </span>
      )}
    </div>
  );
}

export function useCardPeek(code: string | undefined, alt: string) {
  const [shown, setShown] = useState(false);
  const { handlers, consumed } = useHold(code ? setShown : undefined);
  const view =
    shown && code
      ? createPortal(
          <div class="card-peek">
            <CardZoom items={[{ code, alt }]} start={0} onClose={() => setShown(false)} />
          </div>,
          document.body,
        )
      : null;
  return { handlers, consumed, view };
}

export function ZoomableCardImage(props: Props & { gallery?: GalleryItem[]; galleryStart?: number; onGallery?: (index: number) => void }) {
  const { gallery: _gallery, galleryStart: _start, onGallery: _onGallery, ...image } = props;
  const peek = useCardPeek(props.code, props.alt);
  return (
    <>
      <button
        class={`card-zoom-trigger ${props.class ?? ""}`}
        onClick={(e) => {
          if (peek.consumed()) return;
          const el = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".card-image");
          if (el && props.code) present(el, props.code);
        }}
        aria-label={`Animate ${props.alt}`}
        {...peek.handlers}
      >
        <CardImage {...image} class="" />
      </button>
      {peek.view}
    </>
  );
}
