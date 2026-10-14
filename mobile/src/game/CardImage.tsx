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
