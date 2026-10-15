import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";
import { cardImage } from "../engine";

interface Props {
  code: string;
  alt: string;
  size: "small" | "medium" | "large";
  class?: string;
  lazy?: boolean;
}

export function CardImage({ code, alt, size, class: className, lazy }: Props) {
  const src = cardImage(code, size)!;
  const img = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    const el = img.current;
    setState(el?.complete && el.naturalWidth > 0 ? "loaded" : "loading");
  }, [src]);

  return (
    <span class={`card-image ${state} ${className ?? ""}`}>
      <img
        ref={img}
        crossOrigin="anonymous"
        src={src}
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

export function CardZoom({ code, alt, onClose }: { code: string; alt: string; onClose: () => void }) {
  const [sharp, setSharp] = useState<"loading" | "loaded" | "error">(Number(code) >= 26000 ? "loading" : "error");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      class="card-zoom"
      role="dialog"
      aria-label={alt}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div class={`card-zoom-frame ${sharp}`}>
        <img class="card-zoom-base" crossOrigin="anonymous" src={cardImage(code, "large")} alt={alt} decoding="async" />
        {sharp !== "error" && (
          <img
            class="card-zoom-sharp"
            crossOrigin="anonymous"
            src={cardImage(code, "xlarge")}
            alt=""
            decoding="async"
            onLoad={() => setSharp("loaded")}
            onError={() => setSharp("error")}
          />
        )}
      </div>
    </div>
  );
}

export function ZoomableCardImage(props: Props) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <button class={`card-zoom-trigger ${props.class ?? ""}`} onClick={() => setZoomed(true)} aria-label={`Enlarge ${props.alt}`}>
        <CardImage {...props} class="" />
      </button>
      {zoomed && createPortal(<CardZoom code={props.code} alt={props.alt} onClose={() => setZoomed(false)} />, document.body)}
    </>
  );
}
